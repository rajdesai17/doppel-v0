import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Phone, PhoneOff, Mic, MicOff, ArrowLeft } from "lucide-react";
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
  const [activeSpeaker, setActiveSpeaker] = useState<"user" | "future" | null>(
    null
  );

  const conversationRef = useRef<Conversation | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Connect to ElevenLabs ConvAI directly from browser
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    const startConversation = async () => {
      try {
        // Get session data from localStorage (saved during setup)
        const sessionData = localStorage.getItem(`doppel_session_${sessionId}`);
        if (!sessionData) {
          console.error("[conversation] No session data found for:", sessionId);
          setStatus("error");
          return;
        }

        const { agentId, userId, persona, voiceId } = JSON.parse(sessionData);
        console.log("[conversation] Starting with agentId:", agentId, "voiceId:", voiceId);

        // Get signed URL from server (keeps API key server-side)
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

        // Pre-request microphone so the SDK can use it
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log("[conversation] Microphone access granted, tracks:", micStream.getAudioTracks().map(t => t.label));
          // Stop the stream — SDK will create its own
          micStream.getTracks().forEach(t => t.stop());
        } catch (micErr) {
          console.error("[conversation] Microphone access DENIED:", micErr);
          setStatus("error");
          return;
        }

        // Connect directly to ElevenLabs from browser
        // Override the shared agent's prompt, first message, and voice per conversation
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
            console.log("[conversation] Connected to ElevenLabs:", conversationId);
            setStatus("connected");
          },
          onDisconnect: () => {
            console.log("[conversation] Disconnected from ElevenLabs");
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
            console.error("[conversation] ElevenLabs error:", error);
            setStatus("error");
          },
          onModeChange: (mode) => {
            console.log("[conversation] Mode changed:", mode);
            if (mode.mode === "speaking") {
              setActiveSpeaker("future");
            } else if (mode.mode === "listening") {
              setActiveSpeaker("user");
            } else {
              setActiveSpeaker(null);
            }
          },
          onStatusChange: ({ status }) => {
            console.log("[conversation] Status changed:", status);
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
        console.log("[conversation] Session started successfully");
      } catch (e) {
        console.error("[conversation] Failed to start:", e);
        if (!cancelled) setStatus("error");
      }
    };

    startConversation();

    return () => {
      cancelled = true;
      if (conversationRef.current) {
        console.log("[conversation] Cleanup: ending session");
        conversationRef.current.endSession();
        conversationRef.current = null;
      }
    };
  }, [sessionId]);

  // End conversation
  const endConversation = useCallback(async () => {
    console.log("[conversation] User ended conversation");
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    setStatus("disconnected");
    navigate(`/replay/${sessionId}`);
  }, [sessionId, navigate]);

  // Toggle mute
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
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Exit
        </Link>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full",
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
            )}
          />
          <span className="text-xs text-zinc-400 capitalize">{status}</span>
        </div>
        <div className="font-mono text-sm tracking-widest text-zinc-400">
          DOPPEL
        </div>
      </header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Split screen: User vs Future */}
        <div className="flex-1 grid grid-cols-2 gap-px bg-zinc-800">
          {/* Present Self */}
          <div className="bg-zinc-950 flex flex-col items-center justify-center p-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
              You — Now
            </p>
            <div
              className={cn(
                "size-32 rounded-full bg-zinc-800 flex items-center justify-center transition-all duration-150",
                activeSpeaker === "user" && "ring-4 ring-violet-500/50 scale-105"
              )}
            >
              <div className="size-20 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
                {isMuted ? (
                  <MicOff className="size-8 text-zinc-500" />
                ) : (
                  <Mic className="size-8 text-zinc-300" />
                )}
              </div>
            </div>
          </div>

          {/* Future Self */}
          <div className="bg-zinc-900 flex flex-col items-center justify-center p-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
              You — 2035
            </p>
            <div
              className={cn(
                "size-32 rounded-full bg-violet-900/30 flex items-center justify-center transition-all duration-150",
                activeSpeaker === "future" && "ring-4 ring-violet-500 scale-105"
              )}
            >
              <div className="size-20 rounded-full bg-violet-800/50 flex items-center justify-center">
                <Phone className="size-8 text-violet-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64 lg:max-h-none">
            {transcript.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-8">
                {status === "connecting"
                  ? "Connecting to your future self..."
                  : status === "error"
                    ? "Failed to connect. Please go back and try again."
                    : "Start speaking to begin the conversation."}
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
                <p className="text-xs text-zinc-500 mb-1">
                  {entry.speaker === "user" ? "You (Now)" : "You (2035)"}
                </p>
                <p
                  className={cn(
                    "inline-block px-3 py-2 rounded-lg text-sm max-w-[85%]",
                    entry.speaker === "future"
                      ? "bg-violet-900/30 text-violet-100"
                      : "bg-zinc-800 text-zinc-200"
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
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={cn(
              "size-12 rounded-full flex items-center justify-center transition-colors",
              isMuted
                ? "bg-zinc-700 text-zinc-400"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </button>

          <button
            onClick={endConversation}
            className="size-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
            aria-label="End conversation"
          >
            <PhoneOff className="size-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}
