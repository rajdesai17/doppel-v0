import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 200);

    const checkReady = setInterval(async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}/status`);
        if (response.ok) {
          const { status } = (await response.json()) as { status: string };
          if (status === "ready") {
            clearInterval(checkReady);
            setProgress(100);
            setTimeout(() => navigate(`/conversation/${sessionId}`), 500);
          }
        }
      } catch {
        // Will redirect from setup
      }
    }, 2000);

    const timeout = setTimeout(() => navigate(`/conversation/${sessionId}`), 15000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearInterval(checkReady);
      clearTimeout(timeout);
    };
  }, [sessionId, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <header className="header">
        <Link to="/setup" className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="header-logo">DOPPEL</span>
        <div className="w-10" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          {/* Processing orb */}
          <div className="processing-orb mx-auto mb-10">
            <div className="processing-orb-ring processing-orb-ring-1" />
            <div className="processing-orb-ring processing-orb-ring-2" />
            <div className="processing-orb-ring processing-orb-ring-3" />
            <div className="processing-orb-core" />
          </div>

          {/* Status */}
          <h2 className="text-title text-[rgb(var(--foreground))] mb-3">
            Creating your future self
          </h2>
          <p className="text-body mb-10 h-6">{LOADING_MESSAGES[messageIndex]}...</p>

          {/* Progress bar */}
          <div className="w-full h-1 bg-[rgb(var(--surface-1))] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-[rgb(var(--accent))] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-mono text-[rgb(var(--text-muted))]">{progress}%</p>
        </div>
      </main>
    </div>
  );
}
