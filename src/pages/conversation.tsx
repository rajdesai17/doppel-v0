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

  const conversationRef = useRef<Conversation | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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

        const { agentId, userId, persona, voiceId } = JSON.parse(sessionData);

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

  return (
    <div className="min-h-screen h-screen flex flex-col bg-black">
      {/* Header */}
      <header className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-[#1C1C1C] bg-black">
        <Link 
          to="/" 
          className="font-sans text-[13px] text-[#555] hover:text-white px-4 py-2 rounded-full bg-[#111] border border-[#1C1C1C] transition-colors duration-150"
        >
          Exit
        </Link>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111]">
          <div
            className={cn(
              "size-2 rounded-full",
              status === "connected" && "bg-emerald-500",
              status === "connecting" && "bg-amber-500 animate-pulse",
              (status === "disconnected" || status === "error") && "bg-red-500"
            )}
          />
          <span className="font-sans text-sm text-[#666]">{status}</span>
        </div>

        <span className="font-sans text-[13px] font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
      </header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Split screen avatars */}
        <div className="flex-1 grid grid-cols-2 min-h-[280px] lg:min-h-0">
          {/* Present self - left */}
          <div className="flex flex-col items-center justify-center p-6 relative bg-gradient-to-br from-black to-[#111]">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#444] mb-8">
              You — Now
            </p>
            <div className="relative">
              <div
                className={cn(
                  "absolute -inset-3 rounded-full border-2 transition-all duration-300",
                  activeSpeaker === "user"
                    ? "border-white/20 animate-breathe"
                    : "border-transparent"
                )}
              />
              <div
                className={cn(
                  "size-32 lg:size-40 rounded-full flex items-center justify-center transition-all duration-300",
                  activeSpeaker === "user"
                    ? "bg-white/10"
                    : "bg-[#111]"
                )}
              >
                <div className="size-20 lg:size-24 rounded-full bg-[#1C1C1C] flex items-center justify-center">
                  {isMuted ? (
                    <MicOff className="size-8 text-[#444]" />
                  ) : (
                    <Mic
                      className={cn(
                        "size-8 transition-colors",
                        activeSpeaker === "user"
                          ? "text-white"
                          : "text-[#666]"
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Future self - right */}
          <div className="flex flex-col items-center justify-center p-6 border-l border-[#1C1C1C] relative bg-gradient-to-br from-[#111] to-[#0a0a0a]">
            <p className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#444] mb-8">
              You — 2035
            </p>
            <div className="relative">
              <div
                className={cn(
                  "absolute -inset-3 rounded-full border-2 transition-all duration-300",
                  activeSpeaker === "future"
                    ? "border-[#7C3AED]/50 shadow-[0_0_30px_rgba(124,58,237,0.3)]"
                    : "border-transparent"
                )}
              />
              <div
                className={cn(
                  "size-32 lg:size-40 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden",
                  activeSpeaker === "future"
                    ? "ring-2 ring-[#7C3AED]"
                    : ""
                )}
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, #111 100%)",
                }}
              >
                <div className="size-20 lg:size-24 rounded-full bg-[#1C1C1C] flex items-center justify-center border-2 border-[#7C3AED]/30">
                  <div
                    className={cn(
                      "size-4 rounded-full transition-all",
                      activeSpeaker === "future"
                        ? "bg-[#7C3AED] scale-125"
                        : "bg-[#444]"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#1C1C1C] flex flex-col bg-[#0a0a0a]">
          <div className="px-5 py-4 border-b border-[#1C1C1C]">
            <h3 className="font-sans text-sm font-medium text-[#666]">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-48 lg:max-h-none">
            {transcript.length === 0 && (
              <p className="font-sans text-sm text-[#444] text-center py-8">
                {status === "connecting"
                  ? "Connecting..."
                  : status === "error"
                    ? "Connection failed"
                    : "Start speaking to begin"}
              </p>
            )}
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "animate-fade-in",
                  entry.speaker === "future" ? "pl-4" : "pr-4"
                )}
              >
                <div
                  className={cn(
                    "p-4 rounded-xl font-sans text-[15px] leading-relaxed",
                    entry.speaker === "future" 
                      ? "bg-[#7C3AED]/10 border-l-[3px] border-[#7C3AED] text-white" 
                      : "bg-[#111] text-[#999]"
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
      <footer className="shrink-0 border-t border-[#1C1C1C] px-6 py-5 bg-black">
        <div className="flex items-center justify-center gap-5">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              isMuted
                ? "bg-[#1C1C1C]"
                : "bg-[#111]"
            )}
          >
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center transition-colors",
                isMuted ? "bg-[#444]" : "bg-white"
              )}
            >
              <div className="size-2 rounded-full bg-black" />
            </div>
            <span className="font-sans text-sm text-[#666]">mute</span>
          </button>

          {/* End call */}
          <button
            onClick={endConversation}
            className="size-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
            aria-label="End conversation"
          >
            <PhoneOff className="size-6" />
          </button>

          {/* Mic indicator */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Mic className="size-5 text-[#444]" />
          </div>
        </div>
      </footer>
    </div>
  );
}
