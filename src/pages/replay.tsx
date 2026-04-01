import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Share2, Download, Play, Pause, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
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
      <div className="h-screen w-full flex items-center justify-center bg-black">
        <div className="size-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center text-center px-4 bg-black">
        <h2 className="font-serif text-4xl text-white mb-4">Replay not found</h2>
        <p className="text-white/50 text-sm mb-8">
          This conversation may have expired.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-white text-black font-medium text-sm px-8 py-3 rounded-full hover:scale-105 transition-transform duration-300"
        >
          Start a new conversation
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-white/10"
      >
        <Link
          to="/setup"
          className="text-sm text-white/50 hover:text-white transition-colors duration-300"
        >
          New conversation
        </Link>
        <button
          onClick={handleShare}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-300"
        >
          <Share2 size={14} />
          <span>{copied ? "Copied" : "Share"}</span>
        </button>
      </motion.header>

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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="p-6 mb-12 rounded-2xl border border-white/10"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300 shrink-0"
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-px bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${data.duration ? (currentTime / data.duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[10px] tracking-[0.1em] text-white/30">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>

              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
                className="size-10 rounded-full border border-white/10 text-white/50 flex items-center justify-center hover:text-white hover:border-white/20 transition-all duration-300 shrink-0"
              >
                <Download size={16} />
              </a>
            </div>
          </motion.div>

          {/* Transcript */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.3 }}
          >
            <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 mb-6">
              Transcript
            </h2>

            <div className="space-y-4">
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
                      {formatDuration(entry.timestamp - data.startedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 bg-white text-black font-medium text-sm px-8 py-3 rounded-full hover:scale-105 transition-transform duration-300"
            >
              Have another conversation
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
