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
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="size-6 text-[#666] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-black">
        <h2 className="font-display text-[36px] font-normal text-white mb-3">Replay not found</h2>
        <p className="font-sans text-[17px] text-[#666] mb-8">This conversation may have expired.</p>
        <Link 
          to="/" 
          className="font-sans text-[15px] font-medium text-white px-6 py-3 rounded-full bg-[#1C1C1C] border border-[#2a2a2a] hover:border-[#333] transition-colors duration-150"
        >
          Start a new conversation
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <nav className="h-14 flex items-center justify-between px-12 border-b border-[#1C1C1C]">
        <Link 
          to="/setup" 
          className="font-sans text-[13px] text-[#555] hover:text-white transition-colors duration-200"
        >
          New conversation
        </Link>
        <span className="font-sans text-[13px] font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
        <button 
          onClick={handleShare} 
          className="font-sans text-[13px] text-[#555] hover:text-white flex items-center gap-2 transition-colors duration-150"
        >
          <Share2 className="size-4" />
          <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 px-6 py-12">
        <div className="max-w-[520px] mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="font-display text-[40px] font-normal text-white mb-2">Your Conversation</h1>
            <p className="font-sans text-[17px] text-[#666]">
              {new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              — {formatDuration(data.duration)}
            </p>
          </div>

          {/* Audio player */}
          <div className="p-6 mb-12 rounded-2xl bg-[#0a0a0a] border border-[#1C1C1C]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="size-14 rounded-full bg-[#7C3AED] text-white flex items-center justify-center hover:bg-[#6D28D9] transition-colors shrink-0"
              >
                {isPlaying ? <Pause className="size-5" /> : <Play className="size-5 ml-0.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="h-[2px] bg-[#222] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#7C3AED]"
                    style={{ width: `${(currentTime / data.duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between font-mono text-[11px] tracking-[0.1em] text-[#444]">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(data.duration)}</span>
                </div>
              </div>

              <a
                href={`/api/audio/sessions/${sessionId}/full.mp3`}
                download
                className="size-10 rounded-lg bg-[#1C1C1C] text-[#666] flex items-center justify-center hover:bg-[#222] hover:text-white transition-colors shrink-0"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>

          {/* Transcript */}
          <div className="space-y-5">
            <h2 className="font-mono text-[11px] tracking-[0.15em] uppercase text-[#444] mb-6">TRANSCRIPT</h2>
            {data.transcript.map((entry, i) => (
              <div
                key={i}
                className={cn("flex gap-3", entry.speaker === "future" ? "flex-row-reverse" : "")}
              >
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center font-mono text-[10px] tracking-[0.1em] font-medium shrink-0",
                    entry.speaker === "future"
                      ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                      : "bg-[#111] text-[#666]"
                  )}
                >
                  {entry.speaker === "user" ? "Now" : "35"}
                </div>
                <div
                  className={cn(
                    "flex-1 p-4 rounded-xl",
                    entry.speaker === "future"
                      ? "bg-[#7C3AED]/10 text-white"
                      : "bg-[#111] text-[#999]"
                  )}
                >
                  <p className="font-sans text-[15px] leading-relaxed">{entry.text}</p>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#444] mt-2">
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
              className="inline-flex font-sans text-[15px] font-medium text-white px-6 py-3 rounded-full bg-[#1C1C1C] border border-[#2a2a2a] hover:border-[#333] transition-colors duration-150"
            >
              Have another conversation
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
