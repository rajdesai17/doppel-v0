import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Share2, Download, Play, Pause, ArrowRight } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="size-5 border-2 border-[#262626] border-t-[#666] rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-black">
        <h2 className="font-display text-[36px] text-white mb-3">Replay not found</h2>
        <p className="font-sans text-[15px] text-[#666] mb-8">
          This conversation may have expired.
        </p>
        <Link
          to="/"
          className="font-sans text-[14px] font-medium text-black bg-white px-5 py-2.5 rounded-full hover:bg-[#e5e5e5] transition-colors duration-150"
        >
          Start a new conversation
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-6 md:px-10 border-b border-[#1a1a1a]">
        <Link
          to="/setup"
          className="font-sans text-[13px] text-[#525252] hover:text-white transition-colors duration-200"
        >
          &larr; New conversation
        </Link>
        <span className="font-sans text-[13px] font-semibold tracking-[0.15em] text-white/90 uppercase">
          Doppel
        </span>
        <button
          onClick={handleShare}
          className="font-sans text-[13px] text-[#525252] hover:text-white flex items-center gap-1.5 transition-colors duration-150"
        >
          <Share2 className="size-3.5" />
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 px-6 py-12 md:py-16">
        <div className="max-w-[520px] mx-auto stagger">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="font-display text-[40px] text-white mb-2 leading-tight">
              Your Conversation
            </h1>
            <p className="font-sans text-[15px] text-[#666]">
              {new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              &middot; {formatDuration(data.duration)}
            </p>
          </div>

          {/* Audio player */}
          <div className="p-5 mb-12 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#e5e5e5] active:scale-95 transition-all duration-150 shrink-0"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-white/80 rounded-full transition-all"
                    style={{ width: `${data.duration ? (currentTime / data.duration) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[11px] tracking-[0.05em] text-[#404040]">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>

              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
                className="size-10 rounded-xl bg-[#111] border border-[#1a1a1a] text-[#525252] flex items-center justify-center hover:text-white hover:border-[#262626] transition-all duration-150 shrink-0"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>

          {/* Transcript */}
          <div>
            <h2 className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#333] mb-6">
              Transcript
            </h2>

            <div className="space-y-4">
              {data.transcript.map((entry, i) => (
                <div
                  key={i}
                  className={cn("flex gap-3", entry.speaker === "future" ? "flex-row-reverse" : "")}
                >
                  <div
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center font-mono text-[9px] tracking-wider font-medium shrink-0 mt-1",
                      entry.speaker === "future"
                        ? "bg-[#7C3AED]/15 text-[#7C3AED]"
                        : "bg-[#111] text-[#525252]"
                    )}
                  >
                    {entry.speaker === "user" ? "N" : "F"}
                  </div>
                  <div
                    className={cn(
                      "flex-1 px-4 py-3 rounded-xl",
                      entry.speaker === "future"
                        ? "bg-[#7C3AED]/8 text-[#e5e5e5]"
                        : "bg-[#0a0a0a] border border-[#1a1a1a] text-[#a1a1a1]"
                    )}
                  >
                    <p className="font-sans text-[14px] leading-[1.7]">{entry.text}</p>
                    <p className="font-mono text-[10px] tracking-[0.05em] text-[#333] mt-2">
                      {formatDuration(entry.timestamp - data.startedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 font-sans text-[14px] font-medium text-black bg-white px-6 py-3 rounded-full hover:bg-[#e5e5e5] active:scale-[0.98] transition-all duration-150"
            >
              Have another conversation
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
