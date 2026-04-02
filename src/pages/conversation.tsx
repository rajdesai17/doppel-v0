import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mic, MicOff, PhoneOff } from "lucide-react";
import { Conversation } from "@elevenlabs/client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [activeSpeaker, setActiveSpeaker] = useState<
    "user" | "future" | null
  >(null);
  const [elapsed, setElapsed] = useState(0);

  const conversationRef = useRef<Conversation | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "connected") return;
    const startedAt = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    const start = async () => {
      try {
        const sessionData = localStorage.getItem(
          `doppel_session_${sessionId}`
        );
        if (!sessionData) {
          setStatus("error");
          return;
        }

        const { userId, persona, voiceId } = JSON.parse(sessionData);

        const res = await fetch(
          `/agents/present-self-agent/${userId}?method=getSignedUrl`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        if (!res.ok) throw new Error("Signed URL request failed.");

        const { signedUrl } = (await res.json()) as { signedUrl: string };
        if (cancelled) return;

        try {
          const mic = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          mic.getTracks().forEach((t) => t.stop());
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
            tts: { voiceId },
          },
          onConnect: () => setStatus("connected"),
          onDisconnect: () => setStatus("disconnected"),
          onMessage: (message) => {
            setTranscript((t) => [
              ...t,
              {
                speaker: message.role === "agent" ? "future" : "user",
                text: message.message,
                timestamp: Date.now(),
              },
            ]);
          },
          onError: () => setStatus("error"),
          onModeChange: (mode) => {
            if (mode.mode === "speaking") setActiveSpeaker("future");
            else if (mode.mode === "listening") setActiveSpeaker("user");
            else setActiveSpeaker(null);
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

    start();

    return () => {
      cancelled = true;
      conversationRef.current?.endSession();
      conversationRef.current = null;
    };
  }, [sessionId]);

  const endConversation = useCallback(async () => {
    if (conversationRef.current) {
      await conversationRef.current.endSession();
      conversationRef.current = null;
    }
    // Persist transcript before navigating so the summary page can use it
    localStorage.setItem(
      `doppel_transcript_${sessionId}`,
      JSON.stringify(transcript)
    );
    setStatus("disconnected");
    navigate(`/replay/${sessionId}`);
  }, [navigate, sessionId, transcript]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      conversationRef.current?.setMicMuted(next);
      return next;
    });
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  const lastFutureMessage =
    transcript.length > 0 &&
    transcript[transcript.length - 1].speaker === "future"
      ? transcript[transcript.length - 1].text
      : null;

  return (
    <main className="flex h-screen flex-col lg:flex-row">
      {/* Main panel */}
      <div className="relative flex flex-1 flex-col items-center px-6 pb-24 pt-12">
        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="absolute left-6 top-6"
        >
          <Link to="/">
            <ArrowLeft data-icon="inline-start" />
            Back
          </Link>
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Center content */}
        <div className="flex flex-col items-center">
          {/* Status */}
          <div className="mb-8 flex items-center gap-3">
            {status === "connected" && (
              <div className="size-2 rounded-full bg-green-500" />
            )}
            <span className="text-xs uppercase tracking-wider tabular-nums text-muted-foreground">
              {formatTime(elapsed)}
            </span>
          </div>

          {/* Breathing circle */}
          <div
            className={cn(
              "flex size-32 items-center justify-center rounded-full border-2 transition-all duration-500",
              activeSpeaker === "future" &&
                "scale-110 border-foreground/50 bg-foreground/5",
              activeSpeaker === "user" &&
                "scale-105 border-foreground/30 bg-foreground/5",
              !activeSpeaker && "border-border"
            )}
          >
            <div
              className={cn(
                "size-16 rounded-full transition-all duration-500",
                activeSpeaker === "future" &&
                  "animate-pulse bg-foreground/20",
                activeSpeaker === "user" && "bg-foreground/10",
                !activeSpeaker && "bg-muted"
              )}
            />
          </div>

          {/* Speaker badge */}
          <Badge variant="secondary" className="mt-6">
            {activeSpeaker === "future"
              ? "Your Future Self"
              : activeSpeaker === "user"
                ? "You"
                : "Waiting..."}
          </Badge>

          {/* Live transcription */}
          <AnimatePresence>
            {activeSpeaker === "future" && lastFutureMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground"
              >
                {lastFutureMessage}
                <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-foreground" />
              </motion.p>
            )}
          </AnimatePresence>

          {/* User speaking indicator */}
          <AnimatePresence>
            {activeSpeaker === "user" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 flex items-center gap-1"
              >
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-foreground/50"
                    animate={{ height: [8, 24, 8] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Controls */}
        <div className="flex items-center gap-4 border-t border-border py-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:justify-center lg:border-0 lg:py-8">
          <Button
            variant={isMuted ? "secondary" : "outline"}
            size="icon-lg"
            className="rounded-full"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </Button>
          <div className="h-8 w-px bg-border" />
          <Button
            variant="destructive"
            size="icon-lg"
            className="size-14 rounded-full"
            onClick={endConversation}
          >
            <PhoneOff />
          </Button>
        </div>
      </div>

      {/* Transcript sidebar */}
      <div className="hidden w-80 flex-col border-l border-border lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transcript
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {transcript.length === 0 ? (
            <p className="pt-8 text-center text-sm text-muted-foreground">
              {status === "connecting"
                ? "Connecting..."
                : status === "error"
                  ? "Connection failed."
                  : "Waiting for conversation..."}
            </p>
          ) : (
            transcript.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {entry.speaker === "user" ? "You" : "Future You"}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm leading-relaxed",
                    entry.speaker === "future"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {entry.text}
                </p>
              </motion.div>
            ))
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </main>
  );
}
