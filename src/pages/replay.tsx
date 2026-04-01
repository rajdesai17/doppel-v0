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
  const [currentTime, setCurrentTime] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReplay = async () => {
      try {
        const response = await fetch(`/api/replay/${sessionId}`);
        if (!response.ok) {
          throw new Error("Replay not found");
        }
        const replayData = await response.json();
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h2 className="text-xl font-semibold text-zinc-50 mb-2">
          Replay not found
        </h2>
        <p className="text-zinc-400 mb-6">
          This conversation may have expired or doesn&apos;t exist.
        </p>
        <Link
          to="/"
          className="text-violet-400 hover:text-violet-300 transition-colors"
        >
          Start a new conversation
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          New conversation
        </Link>
        <div className="font-mono text-sm tracking-widest text-zinc-400">
          DOPPEL
        </div>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <Share2 className="size-4" />
          {copied ? "Copied!" : "Share"}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-zinc-50 mb-2">
              Your Conversation
            </h1>
            <p className="text-zinc-400 text-sm">
              {new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              — {formatDuration(data.duration)}
            </p>
          </div>

          {/* Audio player */}
          <div className="glass rounded-xl p-6 mb-8">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-14 rounded-full bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="size-6" />
                ) : (
                  <Play className="size-6 ml-1" />
                )}
              </button>

              <div className="flex-1">
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{
                      width: `${(currentTime / data.duration) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-mono">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>

              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
                className="size-10 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>

          {/* Transcript */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
              Transcript
            </h2>
            {data.transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-4",
                  entry.speaker === "future" ? "flex-row-reverse" : ""
                )}
              >
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                    entry.speaker === "future"
                      ? "bg-violet-900/50 text-violet-300"
                      : "bg-zinc-800 text-zinc-400"
                  )}
                >
                  {entry.speaker === "user" ? "Now" : "35"}
                </div>
                <div
                  className={cn(
                    "flex-1 p-4 rounded-xl",
                    entry.speaker === "future"
                      ? "bg-violet-900/20 text-violet-100"
                      : "bg-zinc-800/50 text-zinc-200"
                  )}
                >
                  <p className="text-sm leading-relaxed">{entry.text}</p>
                  <p className="text-xs text-zinc-500 mt-2">
                    {formatDuration(entry.timestamp - data.startedAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 bg-zinc-800 text-zinc-200 px-6 py-3 rounded-full font-medium hover:bg-zinc-700 transition-colors"
            >
              Have another conversation
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
