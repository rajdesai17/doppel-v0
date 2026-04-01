import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";

const LOADING_MESSAGES = [
  "Analyzing your voice patterns...",
  "Creating your voice clone...",
  "Understanding your situation...",
  "Generating future persona...",
  "Preparing conversation...",
  "Almost ready...",
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

    // Check if session is ready (poll status)
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

    // Fallback: redirect after max time
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <Link
          to="/setup"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div className="font-mono text-sm tracking-widest text-zinc-400">
          DOPPEL
        </div>
        <div className="w-16" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          {/* Animated orb */}
          <div className="relative size-32 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-violet-600/20 animate-pulse-glow" />
            <div className="absolute inset-4 rounded-full bg-violet-600/30 animate-pulse-glow" style={{ animationDelay: "200ms" }} />
            <div className="absolute inset-8 rounded-full bg-violet-600/40 animate-pulse-glow" style={{ animationDelay: "400ms" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-8 text-violet-400 animate-spin" />
            </div>
          </div>

          {/* Status message */}
          <h2 className="text-2xl font-semibold text-zinc-50 mb-3">
            Forming your future self
          </h2>
          <p className="text-zinc-400 mb-8 h-6 transition-all duration-300">
            {LOADING_MESSAGES[messageIndex]}
          </p>

          {/* Progress bar */}
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-violet-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{progress}% complete</p>
        </div>
      </main>
    </div>
  );
}
