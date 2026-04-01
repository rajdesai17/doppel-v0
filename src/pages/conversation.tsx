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
    <div className="min-h-screen h-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <header className="header shrink-0">
        <Link to="/" className="btn btn-secondary h-9 px-4 text-sm">
          Exit
        </Link>

        <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[rgb(var(--surface-1))]">
          <div
            className={cn(
              "status-dot",
              status === "connected" && "status-dot-success",
              status === "connecting" && "status-dot-warning",
              (status === "disconnected" || status === "error") && "status-dot-error"
            )}
          />
          <span className="text-sm text-[rgb(var(--text-secondary))]">{status}</span>
        </div>

        <span className="header-logo">DOPPEL</span>
      </header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Split screen avatars */}
        <div className="flex-1 grid grid-cols-2 min-h-[280px] lg:min-h-0">
          {/* Present self - left */}
          <div className="split-left flex flex-col items-center justify-center p-6 relative">
            <p className="text-mono text-[rgb(var(--text-tertiary))] mb-8">
              You — Now
            </p>
            <div
              className={cn(
                "avatar-ring",
                activeSpeaker === "user" && "avatar-ring-active"
              )}
            >
              <div
                className={cn(
                  "size-32 lg:size-40 rounded-full flex items-center justify-center transition-all duration-300",
                  activeSpeaker === "user"
                    ? "bg-[rgb(var(--foreground)/0.15)]"
                    : "bg-[rgb(var(--surface-1))]"
                )}
              >
                <div className="size-20 lg:size-24 rounded-full bg-[rgb(var(--surface-2))] flex items-center justify-center">
                  {isMuted ? (
                    <MicOff className="size-8 text-[rgb(var(--text-muted))]" />
                  ) : (
                    <Mic
                      className={cn(
                        "size-8 transition-colors",
                        activeSpeaker === "user"
                          ? "text-[rgb(var(--foreground))]"
                          : "text-[rgb(var(--text-secondary))]"
                      )}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Future self - right */}
          <div className="split-right flex flex-col items-center justify-center p-6 border-l border-[rgb(var(--border)/0.5)] relative">
            <p className="text-mono text-[rgb(var(--text-tertiary))] mb-8">
              You — 2035
            </p>
            <div
              className={cn(
                "avatar-ring",
                activeSpeaker === "future" && "avatar-ring-speaking"
              )}
            >
              <div
                className={cn(
                  "size-32 lg:size-40 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden",
                  activeSpeaker === "future"
                    ? "ring-2 ring-[rgb(var(--accent))] animate-glow-pulse"
                    : ""
                )}
                style={{
                  background: "linear-gradient(135deg, rgb(var(--accent) / 0.2) 0%, rgb(var(--surface-2)) 100%)",
                }}
              >
                {/* Placeholder for future self avatar - could be an image */}
                <div className="size-20 lg:size-24 rounded-full bg-[rgb(var(--surface-3))] flex items-center justify-center border-2 border-[rgb(var(--accent)/0.3)]">
                  <div
                    className={cn(
                      "size-4 rounded-full transition-all",
                      activeSpeaker === "future"
                        ? "bg-[rgb(var(--accent))] scale-125"
                        : "bg-[rgb(var(--text-tertiary))]"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[rgb(var(--border)/0.5)] flex flex-col bg-[rgb(var(--surface-1)/0.3)]">
          <div className="px-5 py-4 border-b border-[rgb(var(--border)/0.3)]">
            <h3 className="text-sm font-medium text-[rgb(var(--text-secondary))]">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-48 lg:max-h-none">
            {transcript.length === 0 && (
              <p className="text-caption text-center py-8">
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
                    "message-bubble",
                    entry.speaker === "future" ? "message-bubble-future" : "message-bubble-user"
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
      <footer className="shrink-0 border-t border-[rgb(var(--border)/0.5)] px-6 py-5 bg-[rgb(var(--background))]">
        <div className="flex items-center justify-center gap-5">
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              isMuted
                ? "bg-[rgb(var(--surface-2))]"
                : "bg-[rgb(var(--surface-1))]"
            )}
          >
            <div
              className={cn(
                "size-5 rounded-full flex items-center justify-center transition-colors",
                isMuted ? "bg-[rgb(var(--text-muted))]" : "bg-[rgb(var(--foreground))]"
              )}
            >
              <div className="size-2 rounded-full bg-[rgb(var(--background))]" />
            </div>
            <span className="text-sm text-[rgb(var(--text-secondary))]">mute</span>
          </button>

          {/* End call */}
          <button
            onClick={endConversation}
            className="size-16 rounded-full bg-[rgb(var(--error))] text-white flex items-center justify-center hover:bg-[rgb(var(--error)/0.9)] transition-colors"
            aria-label="End conversation"
          >
            <PhoneOff className="size-6" />
          </button>

          {/* Mic indicator */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Mic className="size-5 text-[rgb(var(--text-tertiary))]" />
          </div>
        </div>
      </footer>
    </div>
  );
}
