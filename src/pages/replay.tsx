import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Share2, Download, Play, Pause, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatDuration } from "../lib/utils";
import { Button } from "../../components/ui/button";
import { PageLayout, PageHeader } from "../components/ui";

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

const spring = { type: "spring", stiffness: 100, damping: 20 };

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
      <PageLayout>
        <div className="size-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
      </PageLayout>
    );
  }

  if (error || !data) {
    return (
      <PageLayout className="text-center">
        <PageHeader
          title="Replay not found"
          subtitle="This conversation may have expired."
          className="mb-8"
        />
        <Link to="/">
          <Button size="lg" className="rounded-full px-8">
            <span>Start a new conversation</span>
            <ArrowRight className="size-4" />
          </Button>
        </Link>
      </PageLayout>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <ReplayHeader onShare={handleShare} copied={copied} />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="text-center mb-12"
          >
            <h1 className="font-serif text-4xl text-white mb-3">
              Your Conversation
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
              {new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              &middot; {formatDuration(data.duration)}
            </p>
          </motion.div>

          {/* Audio player */}
          <AudioPlayer
            sessionId={sessionId ?? ""}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            currentTime={currentTime}
            duration={data.duration}
          />

          {/* Transcript */}
          <TranscriptList transcript={data.transcript} startedAt={data.startedAt} />

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <Link to="/setup">
              <Button size="lg" className="rounded-full px-8">
                <span>Have another conversation</span>
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}

// Header Component
function ReplayHeader({
  onShare,
  copied,
}: {
  onShare: () => void;
  copied: boolean;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-white/10"
    >
      <Link to="/setup">
        <Button variant="ghost" className="text-white/50 hover:text-white">
          <span>New conversation</span>
        </Button>
      </Link>
      <Button
        onClick={onShare}
        variant="ghost"
        className="text-white/50 hover:text-white"
      >
        <Share2 className="size-4" />
        <span>{copied ? "Copied" : "Share"}</span>
      </Button>
    </motion.header>
  );
}

// Audio Player Component
function AudioPlayer({
  sessionId,
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
}: {
  sessionId: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.2 }}
      className="p-6 mb-12 rounded-2xl border border-white/10"
    >
      <div className="flex items-center gap-4">
        <Button
          onClick={onTogglePlay}
          size="icon-lg"
          className="rounded-full shrink-0"
        >
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div className="h-px bg-white/10 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] text-white/30">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <a
          href={`/api/audio/sessions/${sessionId}/full.mp3`}
          download
        >
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-white/10 text-white/50 hover:text-white hover:border-white/20 shrink-0"
          >
            <Download className="size-4" />
          </Button>
        </a>
      </div>
    </motion.div>
  );
}

// Transcript List Component
function TranscriptList({
  transcript,
  startedAt,
}: {
  transcript: ReplayData["transcript"];
  startedAt: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.3 }}
    >
      <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 mb-6">
        Transcript
      </h2>

      <div className="space-y-4">
        {transcript.map((entry, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              entry.speaker === "future" ? "flex-row-reverse" : ""
            )}
          >
            <div
              className={cn(
                "size-7 rounded-full flex items-center justify-center font-mono text-[9px] tracking-wider shrink-0 mt-1",
                entry.speaker === "future"
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/50"
              )}
            >
              {entry.speaker === "user" ? "Y" : "F"}
            </div>
            <div
              className={cn(
                "flex-1 px-4 py-3 rounded-xl",
                entry.speaker === "future"
                  ? "bg-white/5 text-white/80"
                  : "border border-white/10 text-white/60"
              )}
            >
              <p className="text-sm leading-relaxed">{entry.text}</p>
              <p className="font-mono text-[9px] tracking-[0.1em] text-white/20 mt-2">
                {formatDuration(entry.timestamp - startedAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
