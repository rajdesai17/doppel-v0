import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PhoneOff, Mic, MicOff } from "lucide-react";
import { Conversation } from "@elevenlabs/client";
import { cn } from "../lib/utils";

interface TranscriptEntry {
  speaker: "user" | "future";
  text: string;
  timestamp: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function ConversationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<"user" | "future" | null>(null);
  const [elapsed, setElapsed] = useState(0);

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
    <div className="min-h-screen h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center justify-between px-6 md:px-10 border-b border-[#1a1a1a] bg-black">
        <Link
          to="/"
          className="font-sans text-[13px] text-[#525252] hover:text-white px-3.5 py-1.5 rounded-full border border-[#1a1a1a] hover:border-[#333] transition-all duration-150"
        >
          Exit
        </Link>

        {/* Status + timer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "size-[6px] rounded-full",
                status === "connected" && "bg-emerald-500",
                status === "connecting" && "bg-amber-400 animate-pulse",
                (status === "disconnected" || status === "error") && "bg-red-500"
              )}
            />
            <span className="font-sans text-[12px] text-[#525252] capitalize">{status}</span>
          </div>
          {status === "connected" && (
            <span className="font-mono text-[12px] text-[#404040] tabular-nums">
              {formatTime(elapsed)}
            </span>
          )}
        </div>

        <span className="font-sans text-[13px] font-semibold tracking-[0.15em] text-white/90 uppercase">
          Doppel
        </span>
      </header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Split screen avatars */}
        <div className="flex-1 grid grid-cols-2 min-h-[260px] lg:min-h-0">
          {/* Present self */}
          <div className="flex flex-col items-center justify-center p-6 relative">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#404040] mb-8">
              You — Now
            </p>
            <div className="relative">
              {/* Speaking ring */}
              {activeSpeaker === "user" && (
                <div className="absolute -inset-4 rounded-full border border-white/10 animate-breathe" />
              )}
              <div
                className={cn(
                  "size-28 lg:size-36 rounded-full flex items-center justify-center transition-all duration-300",
                  activeSpeaker === "user"
                    ? "bg-white/[0.06]"
                    : "bg-[#0a0a0a]"
                )}
              >
                <div
                  className={cn(
                    "size-16 lg:size-20 rounded-full flex items-center justify-center transition-all duration-300",
                    activeSpeaker === "user"
                      ? "bg-[#1a1a1a]"
                      : "bg-[#111]"
                  )}
                >
                  {isMuted ? (
                    <MicOff className="size-6 lg:size-7 text-[#404040]" />
                  ) : (
                    <Mic
                      className={cn(
                        "size-6 lg:size-7 transition-colors duration-300",
                        activeSpeaker === "user" ? "text-white" : "text-[#525252]"
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Future self */}
          <div className="flex flex-col items-center justify-center p-6 border-l border-[#1a1a1a] relative">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#404040] mb-8">
              You — 2035
            </p>
            <div className="relative">
              {/* Speaking ring */}
              {activeSpeaker === "future" && (
                <div className="absolute -inset-4 rounded-full border border-[#7C3AED]/30 shadow-[0_0_30px_rgba(124,58,237,0.15)]" style={{ animation: "breathe 2s ease-in-out infinite" }} />
              )}
              <div
                className={cn(
                  "size-28 lg:size-36 rounded-full flex items-center justify-center transition-all duration-300",
                  activeSpeaker === "future"
                    ? "bg-[#7C3AED]/10"
                    : "bg-[#0a0a0a]"
                )}
              >
                <div
                  className={cn(
                    "size-16 lg:size-20 rounded-full flex items-center justify-center border transition-all duration-300",
                    activeSpeaker === "future"
                      ? "bg-[#7C3AED]/15 border-[#7C3AED]/30"
                      : "bg-[#111] border-[#1a1a1a]"
                  )}
                >
                  <div
                    className={cn(
                      "size-3 rounded-full transition-all duration-300",
                      activeSpeaker === "future"
                        ? "bg-[#7C3AED] scale-125 shadow-[0_0_12px_rgba(124,58,237,0.6)]"
                        : "bg-[#333]"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        <aside className="w-full lg:w-[380px] border-t lg:border-t-0 lg:border-l border-[#1a1a1a] flex flex-col bg-[#050505]">
          <div className="shrink-0 px-5 py-3.5 border-b border-[#1a1a1a] flex items-center justify-between">
            <h3 className="font-sans text-[13px] font-medium text-[#525252]">Transcript</h3>
            <span className="font-mono text-[11px] text-[#333]">
              {transcript.length} {transcript.length === 1 ? "message" : "messages"}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-48 lg:max-h-none">
            {transcript.length === 0 && (
              <p className="font-sans text-[13px] text-[#333] text-center py-10">
                {status === "connecting"
                  ? "Connecting..."
                  : status === "error"
                    ? "Connection failed. Please go back and try again."
                    : "Waiting for conversation to begin..."}
              </p>
            )}
            {transcript.map((entry, i) => (
              <div key={i} className="animate-fade-in">
                <p className="font-mono text-[10px] tracking-[0.08em] text-[#333] mb-1.5 uppercase">
                  {entry.speaker === "user" ? "You (Now)" : "You (2035)"}
                </p>
                <div
                  className={cn(
                    "px-3.5 py-2.5 rounded-xl font-sans text-[14px] leading-relaxed",
                    entry.speaker === "future"
                      ? "bg-[#7C3AED]/8 border-l-2 border-[#7C3AED]/40 text-[#e5e5e5]"
                      : "bg-[#0a0a0a] border border-[#1a1a1a] text-[#a1a1a1]"
                  )}
                >
                  {entry.text}
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </aside>
      </main>

      {/* Controls */}
      <footer className="shrink-0 border-t border-[#1a1a1a] px-6 py-4 bg-black">
        <div className="flex items-center justify-center gap-4">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "size-12 rounded-full flex items-center justify-center transition-all duration-150",
              isMuted
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/15"
                : "bg-[#111] text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          {/* End call */}
          <button
            onClick={endConversation}
            className="size-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all duration-150"
            aria-label="End conversation"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
