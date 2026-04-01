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
      {/* Nav */}
      <nav className="h-14 flex items-center justify-between px-6 md:px-10 border-b border-[#1a1a1a]">
        <Link
          to="/setup"
          className="font-sans text-[13px] text-[#525252] hover:text-white transition-colors duration-200"
        >
          &larr; Back
        </Link>
        <span className="font-sans text-[13px] font-semibold tracking-[0.15em] text-white/90 uppercase">
          Doppel
        </span>
        <div className="w-12" />
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center stagger">
          {/* Processing orb */}
          <div className="relative size-32 mx-auto mb-12">
            <div className="absolute inset-0 rounded-full bg-[#7C3AED]/10 animate-breathe" />
            <div className="absolute inset-4 rounded-full bg-[#7C3AED]/15 animate-breathe" style={{ animationDelay: "300ms" }} />
            <div className="absolute inset-8 rounded-full bg-[#7C3AED]/25 animate-breathe" style={{ animationDelay: "600ms" }} />
            <div className="absolute inset-[44px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] shadow-[0_0_40px_rgba(124,58,237,0.4)]" />
          </div>

          {/* Status */}
          <div>
            <h2 className="font-display text-[36px] text-white mb-3 leading-tight">
              Creating your future self
            </h2>
          </div>

          <div>
            <p className="font-sans text-[15px] text-[#666] mb-10 h-6">
              {LOADING_MESSAGES[messageIndex]}...
            </p>
          </div>

          {/* Progress */}
          <div>
            <div className="w-full h-[2px] bg-[#1a1a1a] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#7C3AED] rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="font-mono text-[11px] tracking-[0.1em] text-[#404040]">{progress}%</p>
          </div>
        </div>
      </div>
    </main>
  );
}
