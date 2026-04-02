import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "../lib/utils";

interface TranscriptEntry {
  speaker: "user" | "future";
  text: string;
  timestamp: number;
}

export function ReplayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [transcript, setTranscript] = useState<TranscriptEntry[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const stored = localStorage.getItem(`doppel_transcript_${sessionId}`);
    if (!stored) {
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(stored) as TranscriptEntry[];
    setTranscript(parsed);

    // Get userId from session data to call the agent
    const sessionData = localStorage.getItem(`doppel_session_${sessionId}`);
    if (!sessionData || parsed.length === 0) {
      setLoading(false);
      return;
    }

    const { userId } = JSON.parse(sessionData);

    (async () => {
      try {
        const res = await fetch(
          `/agents/present-self-agent/${userId}?method=generateSummary`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              transcript: parsed.map((t) => ({
                speaker: t.speaker,
                text: t.text,
              })),
            }),
          }
        );

        if (res.ok) {
          const data = (await res.json()) as { summary: string };
          setSummary(data.summary);
        }
      } catch {
        // Summary generation failed — page still works without it
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  const handleShare = async () => {
    const url = `${window.location.origin}/replay/${sessionId}`;
    if (navigator.share) {
      await navigator.share({
        title: "Doppel conversation",
        text: "My conversation with my future self.",
        url,
      });
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // No transcript found — session doesn't exist or was never saved
  if (!loading && !transcript) {
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
            Session not found
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This session may have expired or was opened on another device.
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
        {/* Summary card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            A word from your future self
          </p>
          <div className="mt-4 rounded-xl border border-border/50 bg-card p-6">
            {loading ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Your future self is reflecting...</span>
              </div>
            ) : summary ? (
              <p className="text-base leading-relaxed italic text-foreground">
                "{summary}"
              </p>
            ) : (
              <p className="text-base leading-relaxed italic text-foreground">
                "Take care of yourself. You already know what to do."
              </p>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              — Future You
            </p>
          </div>
        </motion.div>

        {/* Transcript */}
        {transcript && transcript.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Transcript · {transcript.length} messages
            </p>
            <div className="flex flex-col gap-6">
              {transcript.map((entry, i) => (
                <div key={i}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    {entry.speaker === "user" ? "You" : "Future You"}
                  </p>
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
          </motion.div>
        )}

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
