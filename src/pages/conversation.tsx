import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PhoneOff, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Conversation } from "@elevenlabs/client";
import { cn } from "../lib/utils";

interface TranscriptEntry {
  speaker: "user" | "future";
  text: string;
  timestamp: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

const spring = { type: "spring", stiffness: 100, damping: 20 };

export function ConversationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<"user" | "future" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const conversationRef = useRef<Conversation | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  // Timer
  useEffect(() => {
    if (status === "connected") {
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // Scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Typewriter effect for latest AI message
  useEffect(() => {
    const lastFutureMessage = [...transcript].reverse().find(t => t.speaker === "future");
    if (lastFutureMessage && activeSpeaker === "future") {
      setIsTyping(true);
      let index = 0;
      const text = lastFutureMessage.text;
      setDisplayedText("");
      
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
        }
      }, 30);

      return () => clearInterval(typeInterval);
    }
  }, [transcript, activeSpeaker]);

  // Connect to ElevenLabs
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const startConversation = async () => {
      try {
        const sessionData = localStorage.getItem(`doppel_session_${sessionId}`);
        if (!sessionData) {
          setStatus("error");
          return;
        }

        const { userId, persona, voiceId } = JSON.parse(sessionData);

        const signedUrlRes = await fetch(
          `/agents/present-self-agent/${userId}?method=getSignedUrl`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        if (!signedUrlRes.ok) {
          throw new Error("Failed to get signed URL");
        }

        const { signedUrl } = (await signedUrlRes.json()) as { signedUrl: string };

        if (cancelled) return;

        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getTracks().forEach((t) => t.stop());
        } catch {
          setStatus("error");
          return;
        }

        const conversation = await Conversation.startSession({
          signedUrl,
          overrides: {
            agent: {
              prompt: { prompt: persona?.systemPrompt },
              firstMessage: persona?.openingLine,
            },
            tts: {
              voiceId: voiceId,
            },
          },
          onConnect: () => {
            setStatus("connected");
          },
          onDisconnect: () => {
            setStatus("disconnected");
          },
          onMessage: (message) => {
            setTranscript((prev) => [
              ...prev,
              {
                speaker: message.role === "agent" ? "future" : "user",
                text: message.message,
                timestamp: Date.now(),
              },
            ]);
          },
          onError: () => {
            setStatus("error");
          },
          onModeChange: (mode) => {
            if (mode.mode === "speaking") {
              setActiveSpeaker("future");
            } else if (mode.mode === "listening") {
              setActiveSpeaker("user");
            } else {
              setActiveSpeaker(null);
            }
          },
        });

        if (cancelled) {
          await conversation.endSession();
          return;
        }

        conversationRef.current = conversation;
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    startConversation();

    return () => {
      cancelled = true;
      if (conversationRef.current) {
        conversationRef.current.endSession();
        conversationRef.current = null;
      }
    };
  }, [sessionId]);

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setStatus("disconnected");
    navigate(`/replay/${sessionId}`);
  }, [sessionId, navigate]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (conversationRef.current) {
        conversationRef.current.setMicMuted(newMuted);
      }
      return newMuted;
    });
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#020202] relative overflow-hidden">
      {/* SVG filter for liquid metal effect */}
      <svg className="absolute" width="0" height="0">
        <defs>
          <filter id="liquid-metal">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
              result="liquid"
            />
          </filter>
        </defs>
      </svg>

      {/* Breathing background */}
      <motion.div
        animate={{
          scale: activeSpeaker === "future" ? [1, 1.02, 1] : 1,
          opacity: activeSpeaker === "future" ? [0.03, 0.06, 0.03] : 0.03,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 40%, oklch(0.7 0.1 250) 0%, transparent 50%)",
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="shrink-0 h-14 flex items-center justify-between px-6 md:px-10 border-b border-white/[0.04] bg-[#020202]/80 backdrop-blur-xl relative z-10"
      >
        <Link
          to="/"
          className="font-sans text-[13px] text-white/30 hover:text-white px-3.5 py-1.5 rounded-full border border-white/[0.06] hover:border-white/10 transition-all duration-300"
        >
          Exit
        </Link>

        {/* Status + timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-[6px] rounded-full",
                status === "connected" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
                status === "connecting" && "bg-amber-400 animate-pulse",
                (status === "disconnected" || status === "error") && "bg-red-500"
              )}
            />
            <span className="font-mono text-[11px] text-white/30 capitalize tracking-[0.05em]">{status}</span>
          </div>
          {status === "connected" && (
            <span className="font-mono text-[11px] text-white/20 tabular-nums">
              {formatTime(elapsed)}
            </span>
          )}
        </div>

        <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-white/70 uppercase">
          Doppel
        </span>
      </motion.header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-12">
        {/* Center circle - Neural Pulse */}
        <div className="relative mb-8">
          <AnimatePresence>
            {activeSpeaker === "future" && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="absolute -inset-8"
              >
                <div className="size-full rounded-full border border-[oklch(0.7_0.1_250_/_0.2)] animate-pulse" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            animate={{
              scale: activeSpeaker === "future" ? 1.1 : 1,
            }}
            transition={spring}
            className="relative size-40 lg:size-48"
          >
            {/* Neural blob - liquid metal effect */}
            <div
              className={cn(
                "absolute inset-0 neural-blob",
                activeSpeaker === "future" && "neural-blob-active"
              )}
            />
            
            {/* Inner glow */}
            <div className="absolute inset-4 rounded-full bg-[#020202]/80 backdrop-blur-sm flex items-center justify-center">
              <div
                className={cn(
                  "size-4 rounded-full transition-all duration-500",
                  activeSpeaker === "future"
                    ? "bg-[oklch(0.7_0.1_250)] scale-125 shadow-[0_0_20px_oklch(0.7_0.1_250_/_0.6)]"
                    : activeSpeaker === "user"
                      ? "bg-white scale-110"
                      : "bg-white/30"
                )}
              />
            </div>
          </motion.div>
        </div>

        {/* Speaker label */}
        <motion.p
          animate={{ opacity: activeSpeaker ? 1 : 0.5 }}
          className="font-mono text-[11px] tracking-[0.2em] uppercase text-white/40 mb-6"
        >
          {activeSpeaker === "future" ? "Your Future Self" : activeSpeaker === "user" ? "You — Now" : "Waiting..."}
        </motion.p>

        {/* Live transcription with typewriter effect */}
        <AnimatePresence>
          {activeSpeaker === "future" && displayedText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="max-w-lg text-center"
            >
              <p className="font-sans text-[18px] lg:text-[20px] text-white/70 leading-relaxed">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-[2px] h-5 bg-[oklch(0.7_0.1_250)] ml-1 animate-[blink_1s_infinite]" />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User speaking indicator */}
        <AnimatePresence>
          {activeSpeaker === "user" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className="flex items-center gap-2"
            >
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: [8, 20, 8],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                    className="w-1 bg-white/50 rounded-full"
                  />
                ))}
              </div>
              <span className="font-mono text-[11px] text-white/30 ml-2">Listening...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Transcript panel (collapsible on mobile) */}
      <aside className="absolute right-0 top-14 bottom-20 w-[340px] border-l border-white/[0.04] bg-[#020202]/90 backdrop-blur-xl hidden lg:flex flex-col">
        <div className="shrink-0 px-5 py-3.5 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-white/30">Transcript</h3>
          <span className="font-mono text-[10px] text-white/15">
            {transcript.length} {transcript.length === 1 ? "message" : "messages"}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {transcript.length === 0 && (
            <p className="font-sans text-[13px] text-white/20 text-center py-10">
              {status === "connecting"
                ? "Connecting..."
                : status === "error"
                  ? "Connection failed."
                  : "Waiting for conversation..."}
            </p>
          )}
          {transcript.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.1 }}
            >
              <p className="font-mono text-[9px] tracking-[0.1em] text-white/20 mb-1.5 uppercase">
                {entry.speaker === "user" ? "You (Now)" : "You (2035)"}
              </p>
              <div
                className={cn(
                  "px-3.5 py-2.5 rounded-xl font-sans text-[13px] leading-relaxed",
                  entry.speaker === "future"
                    ? "bg-[oklch(0.7_0.1_250_/_0.08)] border-l-2 border-[oklch(0.7_0.1_250_/_0.4)] text-white/70"
                    : "bg-white/[0.02] border border-white/[0.04] text-white/50"
                )}
              >
                {entry.text}
              </div>
            </motion.div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </aside>

      {/* Controls */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="shrink-0 border-t border-white/[0.04] px-6 py-4 bg-[#020202]/80 backdrop-blur-xl relative z-10"
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "size-12 rounded-full flex items-center justify-center transition-all duration-300",
              isMuted
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/15"
                : "bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* End call */}
          <button
            onClick={endConversation}
            className="size-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all duration-150 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
            aria-label="End conversation"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
      </motion.footer>
    </div>
  );
}
