import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

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
    <main className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <nav className="h-14 flex items-center justify-between px-12 border-b border-[#1C1C1C]">
        <Link 
          to="/setup" 
          className="font-sans text-[13px] text-[#555] hover:text-white transition-colors duration-200"
        >
          ← back
        </Link>
        <span className="font-sans text-[13px] font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
        <div className="w-12" />
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center">
          {/* Processing orb */}
          <div className="relative size-[140px] mx-auto mb-10">
            <div className="absolute inset-0 rounded-full bg-[#7C3AED] opacity-[0.12] animate-breathe" />
            <div className="absolute inset-5 rounded-full bg-[#7C3AED] opacity-20 animate-breathe" style={{ animationDelay: "300ms" }} />
            <div className="absolute inset-10 rounded-full bg-[#7C3AED] opacity-[0.35] animate-breathe" style={{ animationDelay: "600ms" }} />
            <div className="absolute inset-[50px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] shadow-[0_0_50px_rgba(124,58,237,0.5)]" />
          </div>

          {/* Status */}
          <h2 className="font-display text-[36px] font-normal text-white mb-3">
            Creating your future self
          </h2>
          <p className="font-sans text-[17px] text-[#666] mb-10 h-6">
            {LOADING_MESSAGES[messageIndex]}...
          </p>

          {/* Progress bar */}
          <div className="w-full h-[1px] bg-[#222] overflow-hidden mb-3">
            <div
              className="h-full bg-[#7C3AED] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="font-mono text-[11px] tracking-[0.1em] text-[#444]">{progress}%</p>
        </div>
      </div>
    </main>
  );
}
