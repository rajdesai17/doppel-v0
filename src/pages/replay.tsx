import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Download, Play, Pause, Loader2 } from "lucide-react";
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
        if (!response.ok) {
          throw new Error("Replay not found");
        }
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-6 text-text-secondary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <h2 className="text-title text-foreground mb-2">
          Replay not found
        </h2>
        <p className="text-body mb-8">
          This conversation may have expired.
        </p>
        <Link to="/" className="btn btn-secondary">
          Start a new conversation
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="header">
        <Link to="/" className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <span className="header-logo">DOPPEL</span>
        <button onClick={handleShare} className="btn-ghost flex items-center gap-2">
          <Share2 className="size-4" />
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-10">
        <div className="page-container-sm">
          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-title text-foreground mb-2">
              Your Conversation
            </h1>
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
          <div className="surface p-5 mb-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-12 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-90 transition-opacity flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="size-5" />
                ) : (
                  <Play className="size-5 ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-foreground transition-all"
                    style={{
                      width: `${(currentTime / data.duration) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-mono text-text-muted text-xs">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>

              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
                className="size-10 rounded-lg bg-surface-2 text-text-secondary flex items-center justify-center hover:bg-surface-3 hover:text-foreground transition-colors flex-shrink-0"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>

          {/* Transcript */}
          <div className="space-y-5">
            <h2 className="text-mono text-text-muted text-xs tracking-wider">
              TRANSCRIPT
            </h2>
            {data.transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  entry.speaker === "future" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-mono text-xs font-medium shrink-0",
                    entry.speaker === "future"
                      ? "bg-surface-2 text-foreground"
                      : "bg-surface-1 text-text-secondary"
                  )}
                >
                  {entry.speaker === "user" ? "N" : "F"}
                </div>
                <div
                  className={cn(
                    "flex-1 p-4 rounded-xl",
                    entry.speaker === "future"
                      ? "bg-surface-2 text-foreground"
                      : "bg-surface-1 text-text-secondary"
                  )}
                >
                  <p className="text-sm leading-relaxed">{entry.text}</p>
                  <p className="text-mono text-text-muted text-xs mt-2">
                    {formatDuration(entry.timestamp - data.startedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link to="/setup" className="btn btn-secondary">
              Start another conversation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
