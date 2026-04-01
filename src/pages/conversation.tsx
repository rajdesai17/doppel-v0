import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PhoneOff, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Conversation } from "@elevenlabs/client";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";

interface TranscriptEntry {
  speaker: "user" | "future";
  text: string;
  timestamp: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

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
    const lastFutureMessage = [...transcript].reverse().find((t) => t.speaker === "future");
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

  return (
    <div className="flex h-screen flex-col bg-background lg:flex-row">
      {/* Main conversation area */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Status */}
        <div className="mb-8 flex items-center gap-3">
          <div
            className={cn(
              "size-2 rounded-full",
              status === "connected" && "bg-green-500",
              status === "connecting" && "bg-yellow-500 animate-pulse",
              status === "disconnected" && "bg-muted-foreground",
              status === "error" && "bg-destructive"
            )}
          />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {status === "connected" ? formatTime(elapsed) : status}
          </span>
        </div>

        {/* Central visual - breathing circle */}
        <div
          className={cn(
            "mb-8 flex size-32 items-center justify-center rounded-full border transition-all duration-500",
            activeSpeaker === "future"
              ? "scale-110 border-foreground/50 bg-foreground/5"
              : activeSpeaker === "user"
              ? "scale-105 border-foreground/30 bg-foreground/5"
              : "border-border"
          )}
        >
          <div
            className={cn(
              "size-16 rounded-full transition-all duration-500",
              activeSpeaker === "future"
                ? "bg-foreground/20 animate-pulse"
                : activeSpeaker === "user"
                ? "bg-foreground/10"
                : "bg-muted"
            )}
          />
        </div>

        {/* Speaker label */}
        <Badge variant="secondary" className="mb-6">
          {activeSpeaker === "future"
            ? "Your Future Self"
            : activeSpeaker === "user"
            ? "You"
            : "Waiting..."}
        </Badge>

        {/* Live transcription */}
        <AnimatePresence>
          {activeSpeaker === "future" && displayedText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-md text-center"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                {displayedText}
                {isTyping && (
                  <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-foreground" />
                )}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User speaking indicator */}
        {activeSpeaker === "user" && (
          <div className="mt-6 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 24, 8] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1 rounded-full bg-foreground/50"
              />
            ))}
          </div>
        )}
      </main>

      {/* Transcript sidebar */}
      <aside className="hidden w-80 flex-col border-l border-border lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transcript
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {transcript.length === 0 ? (
            <div className="flex flex-col gap-3 py-8">
              {status === "connecting" ? (
                <>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for conversation...
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {transcript.map((entry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {entry.speaker === "user" ? "You" : "Future You"}
                  </p>
                  <p
                    className={cn(
                      "text-sm leading-relaxed",
                      entry.speaker === "future" ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {entry.text}
                  </p>
                </motion.div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
      </aside>

      {/* Controls */}
      <footer className="flex items-center justify-center gap-4 border-t border-border py-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:border-0 lg:py-8">
        <Button
          onClick={toggleMute}
          variant={isMuted ? "secondary" : "outline"}
          size="icon-lg"
          className="rounded-full"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff /> : <Mic />}
        </Button>
        
        <Separator orientation="vertical" className="h-8" />

        <Button
          onClick={endConversation}
          variant="destructive"
          size="icon-lg"
          className="size-14 rounded-full"
          aria-label="End conversation"
        >
          <PhoneOff />
        </Button>
      </footer>
    </div>
  );
}
