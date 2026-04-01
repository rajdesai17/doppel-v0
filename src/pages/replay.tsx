import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  Pause,
  Play,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    (async () => {
      try {
        const res = await fetch(`/api/replay/${sessionId}`);
        if (!res.ok) throw new Error("Replay not found");
        setData((await res.json()) as ReplayData);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime * 1000);
    const onEnd = () => setIsPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("ended", onEnd);
    };
  }, [data]);

  const handleShare = async () => {
    const url = `${window.location.origin}/replay/${sessionId}`;
    if (navigator.share) {
      await navigator.share({
        title: "Doppel replay",
        text: "Listen to my conversation with my future self.",
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const progress = useMemo(() => {
    if (!data?.duration) return 0;
    return Math.min((currentTime / data.duration) * 100, 100);
  }, [currentTime, data?.duration]);

  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/">
                <ArrowLeft data-icon="inline-start" />
                Back
              </Link>
            </Button>
            <span className="text-sm font-medium tracking-tight">DOPPEL</span>
            <div className="w-16" />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center pt-14">
          <h1 className="text-2xl font-semibold tracking-tight">
            Replay not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This session may have expired or hasn't been archived yet.
          </p>
          <Button asChild className="mt-6">
            <Link to="/setup">Start a new conversation</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft data-icon="inline-start" />
              Back
            </Link>
          </Button>
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <div className="flex items-center gap-2">
            <Button onClick={handleShare} variant="outline" size="sm">
              <Share2 data-icon="inline-start" />
              {copied ? "Copied" : "Share"}
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 pb-20 pt-24">
        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Session Replay
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your conversation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {new Date(data.startedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}{" "}
            · {formatDuration(data.duration)} ·{" "}
            {data.transcript.length} messages
          </p>
        </div>

        {/* Player */}
        <div className="mb-10 rounded-xl border bg-card p-5">
          <audio
            ref={audioRef}
            src={`/api/audio/sessions/${sessionId}/full.mp3`}
            preload="metadata"
          />
          <div className="flex items-center gap-4">
            <Button
              onClick={togglePlay}
              size="icon"
              className="size-12 shrink-0 rounded-full"
            >
              {isPlaying ? (
                <Pause className="size-5" />
              ) : (
                <Play className="ml-0.5 size-5" />
              )}
            </Button>
            <div className="min-w-0 flex-1">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between font-mono text-xs text-muted-foreground">
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(data.duration)}</span>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              size="icon-sm"
              className="shrink-0"
            >
              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
              >
                <Download />
              </a>
            </Button>
          </div>
        </div>

        {/* Transcript */}
        <div>
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Transcript
          </p>
          <div className="flex flex-col gap-6">
            {data.transcript.map((entry, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">
                    {entry.speaker === "user" ? "You" : "Future You"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatDuration(entry.timestamp - data.startedAt)}
                  </p>
                </div>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    entry.speaker === "future"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {entry.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 flex items-center justify-center">
          <Button size="lg" className="h-11 gap-2 rounded-full px-6" asChild>
            <Link to="/setup">
              New conversation
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
