import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const MESSAGES = [
  "Analyzing voice patterns",
  "Creating voice clone",
  "Understanding context",
  "Generating persona",
  "Preparing conversation",
];

export function LoadingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 95));
    }, 200);

    const checkReady = setInterval(async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}/status`);
        if (!response.ok) return;
        const { status } = (await response.json()) as { status: string };
        if (status === "ready") {
          clearInterval(checkReady);
          setProgress(100);
          setTimeout(() => navigate(`/conversation/${sessionId}`), 500);
        }
      } catch {
        // Setup page handles the main flow.
      }
    }, 2000);

    const timeout = setTimeout(
      () => navigate(`/conversation/${sessionId}`),
      15000
    );

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearInterval(checkReady);
      clearTimeout(timeout);
    };
  }, [navigate, sessionId]);

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link
              to="/setup"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft data-icon="inline-start" />
              Back
            </Link>
          </Button>
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center pt-14">
        <div className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary">
          <Loader2 className="size-6 animate-spin" />
        </div>

        <p className="mt-6 text-lg font-medium">{MESSAGES[messageIndex]}...</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This usually takes about 30 seconds
        </p>

        <div className="mx-auto mt-8 w-full max-w-[280px]">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
            {progress}%
          </p>
        </div>
      </div>
    </main>
  );
}
