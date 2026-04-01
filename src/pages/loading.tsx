import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";

const LOADING_MESSAGES = [
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
    // Cycle through messages
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    // Animate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 200);

    // Check if session is ready
    const checkReady = setInterval(async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}/status`);
        if (response.ok) {
          const { status } = (await response.json()) as { status: string };
          if (status === "ready") {
            clearInterval(checkReady);
            setProgress(100);
            setTimeout(() => {
              navigate(`/conversation/${sessionId}`);
            }, 500);
          }
        }
      } catch {
        // Session API not ready, will redirect from setup page
      }
    }, 2000);

    // Fallback redirect
    const timeout = setTimeout(() => {
      navigate(`/conversation/${sessionId}`);
    }, 15000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearInterval(checkReady);
      clearTimeout(timeout);
    };
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="header">
        <Link to="/setup" className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="header-logo">DOPPEL</span>
        <div className="w-16" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          {/* Animated loader */}
          <div className="relative size-24 mx-auto mb-10">
            <div className="absolute inset-0 rounded-full bg-surface-1 animate-breathe" />
            <div className="absolute inset-3 rounded-full bg-surface-2 animate-breathe" style={{ animationDelay: "150ms" }} />
            <div className="absolute inset-6 rounded-full bg-surface-3 animate-breathe" style={{ animationDelay: "300ms" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-5 text-text-secondary animate-spin" />
            </div>
          </div>

          {/* Status */}
          <h2 className="text-title text-foreground mb-3">
            Creating your future self
          </h2>
          <p className="text-body mb-10 h-6">
            {LOADING_MESSAGES[messageIndex]}...
          </p>

          {/* Progress bar */}
          <div className="w-full h-1 bg-surface-1 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-foreground transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-mono text-text-muted text-xs">{progress}%</p>
        </div>
      </main>
    </div>
  );
}
