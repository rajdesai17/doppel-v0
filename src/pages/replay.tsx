import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Pause, Play, Share2 } from "lucide-react";
import { PageFrame, SectionHeading, StatusPill, TopBar } from "../components/chrome";
import { cn, formatDuration } from "../lib/utils";

interface ReplayData {
  sessionId: string;
  transcript: Array<{
    speaker: "user" | "future";
    text: string;
    timestamp: number;
  }>;
  startedAt: number;
  endedAt: number;
  duration: number;
}

export function ReplayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [data, setData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const response = await fetch(`/api/replay/${sessionId}`);
        if (!response.ok) throw new Error("Replay not found");
        const replayData = (await response.json()) as ReplayData;
        setData(replayData);
      } catch (caughtError) {
        setError((caughtError as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchReplay();
  }, [sessionId]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleTimeUpdate = () => setCurrentTime(audioElement.currentTime * 1000);
    const handleEnded = () => setIsPlaying(false);

    audioElement.addEventListener("timeupdate", handleTimeUpdate);
    audioElement.addEventListener("ended", handleEnded);

    return () => {
      audioElement.removeEventListener("timeupdate", handleTimeUpdate);
      audioElement.removeEventListener("ended", handleEnded);
    };
  }, [data]);

  const shareUrl = `${window.location.origin}/replay/${sessionId}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Doppel conversation replay",
        text: "Listen to my conversation with my future self.",
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = useMemo(() => {
    if (!data?.duration) return 0;
    return Math.min((currentTime / data.duration) * 100, 100);
  }, [currentTime, data?.duration]);

  const togglePlayback = async () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
      return;
    }

    await audioElement.play();
    setIsPlaying(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="surface-card rounded-full p-6">
          <div className="size-6 rounded-full border-2 border-white/12 border-t-[var(--app-accent)] animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen">
        <TopBar />
        <PageFrame className="flex min-h-[calc(100vh-72px)] items-center py-10">
          <section className="surface-card mx-auto max-w-[700px] rounded-[2rem] p-8 text-center sm:p-10">
            <h1 className="font-display text-[clamp(2.4rem,5vw,4rem)] text-white">
              Replay not found.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-[0.98rem] leading-8 text-[var(--app-muted)]">
              This session may have expired or has not been archived yet.
            </p>
            <Link
              to="/setup"
              className="button-lift mt-8 inline-flex items-center justify-center rounded-full bg-[var(--app-accent)] px-6 py-3 text-sm font-semibold text-[#17130d] hover:bg-[var(--app-accent-strong)]"
            >
              Start a new conversation
            </Link>
          </section>
        </PageFrame>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <TopBar
        left={
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/78 hover:border-white/16 hover:bg-white/[0.08]"
          >
            New conversation
          </Link>
        }
        right={
          <button
            onClick={handleShare}
            className="button-lift inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/84 hover:border-white/16 hover:bg-white/[0.08]"
          >
            <Share2 className="size-4" />
            {copied ? "Copied" : "Share"}
          </button>
        }
      />

      <PageFrame className="pb-16 pt-8 sm:pt-10">
        <div className="mx-auto max-w-[980px] space-y-5">
          <section className="surface-card rounded-[2rem] p-6 sm:p-8">
            <SectionHeading
              eyebrow="Replay"
              title="Review the conversation clearly."
              description={`Recorded ${new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}. Playback and transcript are kept on one readable column.`}
            />

            <div className="mt-8 flex flex-wrap gap-3">
              <StatusPill label={formatDuration(data.duration)} tone="neutral" />
              <StatusPill label={`${data.transcript.length} messages`} tone="neutral" />
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-8">
            <audio
              ref={audioRef}
              src={`/api/audio/sessions/${sessionId}/full.mp3`}
              preload="metadata"
            />

            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <button
                onClick={togglePlayback}
                className="button-lift flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--app-accent)] text-[#17130d] hover:bg-[var(--app-accent-strong)]"
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="text-[1rem] font-semibold tracking-[-0.03em] text-white">
                    Full session playback
                  </p>
                  <a
                    href={`/api/audio/sessions/${sessionId}/full.mp3`}
                    download
                    className="button-lift inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/84 hover:border-white/16 hover:bg-white/[0.08]"
                  >
                    <Download className="size-4" />
                    Download
                  </a>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-[var(--app-accent)] transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="surface-card rounded-[2rem] p-6 sm:p-8">
            <div className="mb-6">
              <p className="eyebrow mb-3">Transcript</p>
              <h2 className="text-[1.15rem] font-semibold tracking-[-0.04em] text-white">
                Ordered by speaker and time
              </h2>
            </div>

            <div className="space-y-4">
              {data.transcript.map((entry, index) => (
                <article
                  key={index}
                  className={cn(
                    "rounded-[1.45rem] border px-4 py-4 sm:px-5",
                    entry.speaker === "future"
                      ? "border-[rgba(217,195,154,0.16)] bg-[rgba(217,195,154,0.08)]"
                      : "border-white/8 bg-white/[0.05]"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                      {entry.speaker === "user" ? "You now" : "You later"}
                    </p>
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                      {formatDuration(entry.timestamp - data.startedAt)}
                    </p>
                  </div>
                  <p className="text-[0.98rem] leading-8 text-white/90">{entry.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </PageFrame>
    </main>
  );
}
