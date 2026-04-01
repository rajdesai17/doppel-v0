import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PhoneOff, Mic, MicOff, ArrowLeft } from "lucide-react";
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

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Connect to ElevenLabs ConvAI
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const startConversation = async () => {
      try {
        const sessionData = localStorage.getItem(`doppel_session_${sessionId}`);
        if (!sessionData) {
          console.error("[conversation] No session data found for:", sessionId);
          setStatus("error");
          return;
        }

        const { agentId, userId, persona, voiceId } = JSON.parse(sessionData);
        console.log("[conversation] Starting with agentId:", agentId, "voiceId:", voiceId);

        console.log("[conversation] Fetching signed URL...");
        const signedUrlRes = await fetch(
          `/agents/present-self-agent/${userId}?method=getSignedUrl`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        if (!signedUrlRes.ok) {
          const errData = await signedUrlRes.text();
          throw new Error(errData || "Failed to get signed URL");
        }

        const { signedUrl } = (await signedUrlRes.json()) as { signedUrl: string };
        console.log("[conversation] Got signed URL, connecting...");

        if (cancelled) return;

        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("[conversation] Microphone access granted");
          micStream.getTracks().forEach(t => t.stop());
        } catch (micErr) {
          console.error("[conversation] Microphone access DENIED:", micErr);
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
          onConnect: ({ conversationId }) => {
            console.log("[conversation] Connected:", conversationId);
            setStatus("connected");
          },
          onDisconnect: () => {
            console.log("[conversation] Disconnected");
            setStatus("disconnected");
          },
          onMessage: (message) => {
            console.log("[conversation] Message:", message.role, message.message);
            setTranscript((prev) => [
              ...prev,
              {
                speaker: message.role === "agent" ? "future" : "user",
                text: message.message,
                timestamp: Date.now(),
              },
            ]);
          },
          onError: (error) => {
            console.error("[conversation] Error:", error);
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
          onStatusChange: ({ status }) => {
            console.log("[conversation] Status:", status);
          },
          onDebug: (props) => {
            console.log("[conversation] Debug:", props);
          },
        });

        if (cancelled) {
          await conversation.endSession();
          return;
        }

        conversationRef.current = conversation;
      } catch (e) {
        console.error("[conversation] Failed:", e);
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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="header">
        <Link to="/" className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Exit</span>
        </Link>
        
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "status-dot",
              status === "connected" && "status-dot-success",
              status === "connecting" && "status-dot-warning",
              (status === "disconnected" || status === "error") && "status-dot-error"
            )}
          />
          <span className="text-caption font-medium capitalize">{status}</span>
        </div>
        
        <span className="header-logo">DOPPEL</span>
      </header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Visual indicators - split screen */}
        <div className="flex-1 grid grid-cols-2 min-h-[300px] lg:min-h-0">
          {/* Present Self */}
          <div className="bg-background flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-surface-1/50 to-transparent pointer-events-none" />
            <p className="text-mono text-text-muted text-xs mb-4 relative z-10">
              YOU — NOW
            </p>
            <div
              className={cn(
                "relative size-28 rounded-full bg-surface-1 flex items-center justify-center transition-all duration-300",
                activeSpeaker === "user" && "ring-2 ring-foreground/20 scale-105"
              )}
            >
              <div className="size-16 rounded-full bg-surface-2 flex items-center justify-center">
                {isMuted ? (
                  <MicOff className="size-6 text-text-muted" />
                ) : (
                  <Mic className={cn(
                    "size-6 transition-colors",
                    activeSpeaker === "user" ? "text-foreground" : "text-text-secondary"
                  )} />
                )}
              </div>
              {activeSpeaker === "user" && (
                <div className="absolute inset-0 rounded-full bg-foreground/5 animate-breathe" />
              )}
            </div>
          </div>

          {/* Future Self */}
          <div className="bg-surface-1 flex flex-col items-center justify-center p-8 border-l border-[rgb(var(--border)/var(--border-opacity))] relative">
            <p className="text-mono text-text-muted text-xs mb-4 relative z-10">
              YOU — 2035
            </p>
            <div
              className={cn(
                "relative size-28 rounded-full bg-surface-2 flex items-center justify-center transition-all duration-300",
                activeSpeaker === "future" && "ring-2 ring-foreground/30 scale-105"
              )}
            >
              <div className="size-16 rounded-full bg-surface-3 flex items-center justify-center">
                <div className={cn(
                  "size-3 rounded-full bg-text-secondary transition-all",
                  activeSpeaker === "future" && "bg-foreground scale-125"
                )} />
              </div>
              {activeSpeaker === "future" && (
                <div className="absolute inset-0 rounded-full bg-foreground/5 animate-breathe" />
              )}
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-[rgb(var(--border)/var(--border-opacity))] flex flex-col bg-background">
          <div className="px-5 py-3.5 border-b border-[rgb(var(--border)/var(--border-opacity))]">
            <h3 className="text-sm font-medium text-text-secondary">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-64 lg:max-h-none">
            {transcript.length === 0 && (
              <p className="text-caption text-center py-8">
                {status === "connecting"
                  ? "Connecting to your future self..."
                  : status === "error"
                    ? "Connection failed. Please try again."
                    : "Start speaking to begin."}
              </p>
            )}
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "animate-fade-in",
                  entry.speaker === "future" ? "text-right" : "text-left"
                )}
              >
                <p className="text-mono text-text-muted text-xs mb-1.5">
                  {entry.speaker === "user" ? "You (Now)" : "You (2035)"}
                </p>
                <p
                  className={cn(
                    "inline-block px-3.5 py-2.5 rounded-xl text-sm max-w-[85%] leading-relaxed",
                    entry.speaker === "future"
                      ? "bg-surface-2 text-foreground"
                      : "bg-surface-1 text-text-secondary"
                  )}
                >
                  {entry.text}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </aside>
      </main>

      {/* Controls */}
      <footer className="border-t border-[rgb(var(--border)/var(--border-opacity))] px-6 py-5 bg-background">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={cn(
              "size-12 rounded-full flex items-center justify-center transition-all",
              isMuted
                ? "bg-surface-2 text-text-muted"
                : "bg-surface-1 text-foreground hover:bg-surface-2"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          <button
            onClick={endConversation}
            className="size-14 rounded-full bg-error text-white flex items-center justify-center hover:bg-error/90 transition-colors"
            aria-label="End conversation"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
