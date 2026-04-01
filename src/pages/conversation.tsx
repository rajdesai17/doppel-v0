import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    <div className="h-screen w-full flex flex-col bg-black">
      {/* Main conversation area - perfectly centered */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
        {/* Status indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-12"
        >
          <div
            className={cn(
              "size-2 rounded-full",
              status === "connected" && "bg-white",
              status === "connecting" && "bg-white/50 animate-pulse",
              (status === "disconnected" || status === "error") && "bg-white/30"
            )}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
            {status === "connected" ? formatTime(elapsed) : status}
          </span>
        </motion.div>

        {/* Central visual - Simple breathing circle */}
        <div className="relative mb-12">
          <motion.div
            animate={{
              scale: activeSpeaker === "future" ? [1, 1.1, 1] : 1,
              opacity: activeSpeaker === "future" ? [0.3, 0.6, 0.3] : 0.2,
            }}
            transition={{ duration: 2, repeat: activeSpeaker === "future" ? Infinity : 0, ease: "easeInOut" }}
            className="w-40 h-40 rounded-full border border-white/20"
            style={{
              boxShadow: activeSpeaker === "future" ? "0 0 40px rgba(255, 255, 255, 0.2)" : "none",
            }}
          />
          
          {/* Inner dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{
                scale: activeSpeaker ? 1.2 : 1,
                opacity: activeSpeaker ? 1 : 0.5,
              }}
              transition={spring}
              className="size-3 rounded-full bg-white"
            />
          </div>
        </div>

        {/* Speaker label */}
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/50 mb-6">
          {activeSpeaker === "future" ? "Your Future Self" : activeSpeaker === "user" ? "You" : "Waiting"}
        </p>

        {/* Live transcription */}
        <AnimatePresence>
          {activeSpeaker === "future" && displayedText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="max-w-md"
            >
              <p className="text-white/60 text-sm md:text-base leading-relaxed">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-px h-4 bg-white ml-1 animate-pulse" />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User speaking waveform */}
        <AnimatePresence>
          {activeSpeaker === "user" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={spring}
              className="flex items-center justify-center gap-1 h-8"
            >
              {[...Array(7)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [8, 24, 8],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.08,
                  }}
                  className="w-1 bg-white/30 rounded-full"
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Transcript sidebar - desktop only */}
      <aside className="fixed right-0 top-0 bottom-0 w-80 border-l border-white/10 bg-black hidden lg:flex flex-col">
        <div className="shrink-0 px-6 py-4 border-b border-white/10">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
            Transcript
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {transcript.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">
              {status === "connecting" ? "Connecting..." : "Waiting for conversation..."}
            </p>
          )}
          {transcript.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: 0.05 }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 mb-1">
                {entry.speaker === "user" ? "You" : "Future You"}
              </p>
              <p className={cn(
                "text-sm leading-relaxed",
                entry.speaker === "future" ? "text-white/70" : "text-white/40"
              )}>
                {entry.text}
              </p>
            </motion.div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </aside>

      {/* Controls - Bottom */}
      <motion.footer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="shrink-0 py-8 flex items-center justify-center gap-6"
      >
        {/* Mute button */}
        <button
          onClick={toggleMute}
          className={cn(
            "size-14 rounded-full flex items-center justify-center transition-all duration-300",
            isMuted
              ? "bg-white/10 text-white/50"
              : "bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50"
          )}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {/* End call button */}
        <button
          onClick={endConversation}
          className="size-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300"
          aria-label="End conversation"
        >
          <PhoneOff size={20} />
        </button>
      </motion.footer>
    </div>
  );
}
