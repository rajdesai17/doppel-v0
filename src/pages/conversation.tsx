import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, Waves } from "lucide-react";
import { Conversation } from "@elevenlabs/client";
import { PageFrame, StatusPill, TopBar } from "../components/chrome";
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

    const startConversation = async () => {
      try {
        const sessionData = localStorage.getItem(`doppel_session_${sessionId}`);
        if (!sessionData) {
          setStatus("error");
          return;
        }

        const { userId, persona, voiceId } = JSON.parse(sessionData);

        const signedUrlResponse = await fetch(
          `/agents/present-self-agent/${userId}?method=getSignedUrl`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }
        );

        if (!signedUrlResponse.ok) {
          throw new Error("Signed URL request failed.");
        }

        const { signedUrl } = (await signedUrlResponse.json()) as { signedUrl: string };

        if (cancelled) return;

        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getTracks().forEach((track) => track.stop());
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
            setTranscript((current) => [
              ...current,
              {
                speaker: message.role === "agent" ? "future" : "user",
                text: message.message,
                timestamp: Date.now(),
              },
            ]);
          },
          onError: () => setStatus("error"),
          onModeChange: (mode) => {
            if (mode.mode === "speaking") {
              setActiveSpeaker("future");
              return;
            }

            if (mode.mode === "listening") {
              setActiveSpeaker("user");
              return;
            }

            setActiveSpeaker(null);
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
  }, [navigate, sessionId]);

  const toggleMute = useCallback(() => {
    setIsMuted((current) => {
      const nextValue = !current;
      conversationRef.current?.setMicMuted(nextValue);
      return nextValue;
    });
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const wholeSeconds = seconds % 60;
    return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}`;
  };

  const statusTone =
    status === "connected"
      ? "live"
      : status === "connecting"
        ? "warning"
        : status === "error"
          ? "danger"
          : "neutral";

  return (
    <main className="min-h-screen">
      <TopBar
        left={
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/78 hover:border-white/16 hover:bg-white/[0.08]"
          >
            Exit
          </Link>
        }
        right={
          <div className="flex items-center gap-3">
            <StatusPill label={status} tone={statusTone} />
            <span className="text-timer text-sm text-[var(--app-muted)]">{formatTime(elapsed)}</span>
          </div>
        }
      />

      <PageFrame className="pb-6 pt-5 sm:pt-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="surface-card rounded-[2rem] p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/8 pb-6">
              <div>
                <p className="eyebrow mb-3">Conversation</p>
                <h1 className="text-[1.2rem] font-semibold tracking-[-0.04em] text-white">
                  Now speaking with you, 10 years later
                </h1>
              </div>
              <StatusPill
                label={
                  activeSpeaker === "future"
                    ? "future speaking"
                    : activeSpeaker === "user"
                      ? "listening"
                      : "waiting"
                }
                tone={activeSpeaker ? "accent" : "neutral"}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <SpeakerCard
                title="You now"
                subtitle={isMuted ? "Muted" : "Present voice"}
                active={activeSpeaker === "user"}
                icon={isMuted ? <MicOff className="size-7" /> : <Mic className="size-7" />}
                note={
                  isMuted
                    ? "Your turns are paused until you unmute."
                    : activeSpeaker === "user"
                      ? "The system is listening to you."
                      : "Waiting for your next turn."
                }
              />
              <SpeakerCard
                title="You later"
                subtitle="Future perspective"
                active={activeSpeaker === "future"}
                accent
                icon={<Waves className="size-7" />}
                note={
                  activeSpeaker === "future"
                    ? "This side currently has the floor."
                    : "Waiting for the next response."
                }
              />
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--app-muted)]">
                  Keep the stage clear. Controls stay here, transcript stays separate.
                </p>
                <span className="text-timer text-sm text-[var(--app-muted)]">{formatTime(elapsed)}</span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={toggleMute}
                  className={cn(
                    "button-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-medium",
                    isMuted
                      ? "border border-rose-300/18 bg-rose-300/10 text-rose-100 hover:bg-rose-300/16"
                      : "border border-white/10 bg-white/[0.04] text-white/84 hover:border-white/16 hover:bg-white/[0.08]"
                  )}
                >
                  {isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  {isMuted ? "Unmute microphone" : "Mute microphone"}
                </button>
                <button
                  onClick={endConversation}
                  className="button-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1rem] bg-rose-300 px-5 py-3 text-sm font-semibold text-[#250d13] hover:bg-rose-200"
                >
                  <PhoneOff className="size-4" />
                  End conversation
                </button>
              </div>
            </div>
          </section>

          <aside className="surface-card flex min-h-[640px] flex-col overflow-hidden rounded-[2rem]">
            <div className="border-b border-white/8 px-5 py-5 sm:px-6">
              <p className="eyebrow mb-3">Transcript</p>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-white">
                  Captured in real time
                </h2>
                <span className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                  {transcript.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {transcript.length === 0 ? (
                <div className="surface-soft flex h-full min-h-[260px] items-center justify-center rounded-[1.45rem] px-6 text-center">
                  <p className="max-w-xs text-sm leading-7 text-[var(--app-muted)]">
                    {status === "connecting"
                      ? "Connecting to the live session."
                      : status === "error"
                        ? "Connection failed. Go back and try again."
                        : "Waiting for the conversation to begin."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transcript.map((entry, index) => (
                    <article
                      key={index}
                      className={cn(
                        "rounded-[1.45rem] border px-4 py-4 sm:px-5",
                        entry.speaker === "future"
                          ? "border-[rgba(217,195,154,0.16)] bg-[rgba(217,195,154,0.08)]"
                          : "border-white/8 bg-white/[0.05]"
                      )}
                    >
                      <p className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                        {entry.speaker === "user" ? "You now" : "You later"}
                      </p>
                      <p className="text-[0.98rem] leading-8 text-white/90">{entry.text}</p>
                    </article>
                  ))}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>
          </aside>
        </div>
      </PageFrame>
    </main>
  );
}

function SpeakerCard({
  title,
  subtitle,
  active,
  icon,
  note,
  accent = false,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  icon: ReactNode;
  note: string;
  accent?: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-[1.7rem] border p-6 sm:p-7",
        active
          ? accent
            ? "border-[rgba(217,195,154,0.2)] bg-[rgba(217,195,154,0.08)]"
            : "border-white/14 bg-white/[0.06]"
          : "border-white/8 bg-white/[0.03]"
      )}
    >
      <p className="eyebrow mb-3">{subtitle}</p>
      <h3 className="text-[1.18rem] font-semibold tracking-[-0.04em] text-white">{title}</h3>

      <div className="flex min-h-[220px] items-center justify-center">
        <div
          className={cn(
            "flex size-28 items-center justify-center rounded-full border sm:size-32",
            active
              ? accent
                ? "border-[rgba(217,195,154,0.22)] bg-[rgba(217,195,154,0.10)] text-[var(--app-accent-strong)]"
                : "border-white/14 bg-white/[0.08] text-white"
              : "border-white/8 bg-white/[0.04] text-white/70"
          )}
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-black/12 sm:size-[4.5rem]">
            {icon}
          </div>
        </div>
      </div>

      <p className="text-sm leading-7 text-[var(--app-muted)]">{note}</p>
    </article>
  );
}
