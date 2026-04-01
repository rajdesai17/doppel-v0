import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Share2, Download, Play, Pause, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn, formatDuration } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Skeleton } from "../components/ui/skeleton";

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
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border px-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-20" />
        </header>
        <main className="flex flex-1 flex-col items-center px-6 py-12">
          <div className="w-full max-w-lg">
            <Skeleton className="mb-8 h-8 w-48 mx-auto" />
            <Skeleton className="mb-4 h-4 w-32 mx-auto" />
            <Skeleton className="mb-12 h-24 w-full rounded-xl" />
            <Skeleton className="mb-4 h-4 w-20" />
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">
          Replay not found
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          This conversation may have expired.
        </p>
        <Link to="/">
          <Button className="gap-2">
            Start a new conversation
            <ArrowRight data-icon="inline-end" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <Link
          to="/setup"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          New conversation
        </Link>
        <Button onClick={handleShare} variant="outline" size="sm" className="gap-2">
          <Share2 data-icon="inline-start" />
          {copied ? "Copied" : "Share"}
        </Button>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">
              Your Conversation
            </h1>
            <p className="text-sm text-muted-foreground">
              {new Date(data.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · {formatDuration(data.duration)}
            </p>
          </motion.div>

          {/* Audio player */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mb-12">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    size="icon-lg"
                    className="shrink-0 rounded-full"
                  >
                    {isPlaying ? <Pause /> : <Play className="ml-0.5" />}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <Progress
                      value={data.duration ? (currentTime / data.duration) * 100 : 0}
                      className="mb-2 h-1"
                    />
                    <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
                      <span>{formatDuration(currentTime)}</span>
                      <span>{formatDuration(data.duration)}</span>
                    </div>
                  </div>

                  <a href={`/api/audio/sessions/${sessionId}/full.mp3`} download>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Download />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Transcript */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Transcript
            </h2>

            <div className="flex flex-col gap-3">
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
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                      entry.speaker === "future"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {entry.speaker === "user" ? "Y" : "F"}
                  </div>
                  <div
                    className={cn(
                      "flex-1 rounded-xl px-4 py-3",
                      entry.speaker === "future"
                        ? "bg-secondary"
                        : "border border-border"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                      {formatDuration(entry.timestamp - data.startedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <Separator className="my-12" />

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <Link to="/setup">
              <Button size="lg" className="gap-2">
                Have another conversation
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
