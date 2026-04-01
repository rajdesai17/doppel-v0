import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Share2, Download, Play, Pause, Loader2 } from "lucide-react";
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
  const [currentTime, _setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const response = await fetch(`/api/replay/${sessionId}`);
        if (!response.ok) throw new Error("Replay not found");
        const replayData = (await response.json()) as ReplayData;
        setData(replayData);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchReplay();
  }, [sessionId]);

  const shareUrl = `${window.location.origin}/replay/${sessionId}`;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "DOPPEL Conversation",
        text: "Listen to my conversation with my future self",
        url: shareUrl,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--background))]">
        <Loader2 className="size-6 text-[rgb(var(--text-secondary))] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[rgb(var(--background))]">
        <h2 className="text-title text-[rgb(var(--foreground))] mb-3">Replay not found</h2>
        <p className="text-body mb-8">This conversation may have expired.</p>
        <Link to="/" className="btn btn-secondary">Start a new conversation</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <header className="header">
        <Link to="/setup" className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))] transition-colors">
          New conversation
        </Link>
        <span className="header-logo">DOPPEL</span>
        <button onClick={handleShare} className="btn-ghost flex items-center gap-2">
          <Share2 className="size-4" />
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12">
        <div className="page-container-sm">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-title text-[rgb(var(--foreground))] mb-2">Your Conversation</h1>
            <p className="text-body">
              {new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              — {formatDuration(data.duration)}
            </p>
          </div>

          {/* Audio player */}
          <div className="surface-glass p-6 mb-12">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-14 rounded-full bg-[rgb(var(--accent))] text-white flex items-center justify-center hover:bg-[rgb(var(--accent-hover))] transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-1 bg-[rgb(var(--surface-2))] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[rgb(var(--accent))]"
                    style={{ width: `${(currentTime / data.duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-mono text-[rgb(var(--text-muted))] text-xs">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>

              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
                className="size-10 rounded-lg bg-[rgb(var(--surface-2))] text-[rgb(var(--text-secondary))] flex items-center justify-center hover:bg-[rgb(var(--surface-3))] hover:text-[rgb(var(--foreground))] transition-colors shrink-0"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>

          {/* Transcript */}
          <div className="space-y-5">
            <h2 className="text-mono text-[rgb(var(--text-muted))] mb-6">TRANSCRIPT</h2>
            {data.transcript.map((entry, i) => (
              <div
                key={i}
                className={cn("flex gap-3", entry.speaker === "future" ? "flex-row-reverse" : "")}
              >
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-mono text-xs font-medium shrink-0",
                    entry.speaker === "future"
                      ? "bg-[rgb(var(--accent)/0.2)] text-[rgb(var(--accent))]"
                      : "bg-[rgb(var(--surface-1))] text-[rgb(var(--text-secondary))]"
                  )}
                >
                  {entry.speaker === "user" ? "Now" : "35"}
                </div>
                <div
                  className={cn(
                    "flex-1 p-4 rounded-xl",
                    entry.speaker === "future"
                      ? "bg-[rgb(var(--accent)/0.1)] text-[rgb(var(--foreground))]"
                      : "bg-[rgb(var(--surface-1))] text-[rgb(var(--text-secondary))]"
                  )}
                >
                  <p className="text-sm leading-relaxed">{entry.text}</p>
                  <p className="text-mono text-[rgb(var(--text-muted))] text-xs mt-2">
                    {formatDuration(entry.timestamp - data.startedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link to="/setup" className="btn btn-secondary">
              Have another conversation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
