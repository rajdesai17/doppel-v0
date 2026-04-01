import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";

const LOADING_MESSAGES = [
  "Analyzing voice patterns",
  "Creating voice clone",
  "Understanding context",
  "Generating persona",
  "Preparing conversation",
];

const spring = { type: "spring", stiffness: 100, damping: 20 };

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
    <main className="min-h-screen flex flex-col bg-[#020202] relative">
      {/* Radial glow */}
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.7 0.1 250 / 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="h-14 flex items-center justify-between px-6 md:px-10 border-b border-white/[0.04]"
      >
        <Link
          to="/setup"
          className="font-sans text-[13px] text-white/40 hover:text-white transition-colors duration-300"
        >
          &larr; Back
        </Link>
        <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-white/70 uppercase">
          Doppel
        </span>
        <div className="w-12" />
      </motion.nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="max-w-sm w-full text-center"
        >
          {/* Neural blob processing indicator */}
          <div className="relative size-40 mx-auto mb-12">
            <div className="absolute inset-0 neural-blob neural-blob-active" />
            <div className="absolute inset-4 neural-blob neural-blob-active" style={{ animationDelay: "-2s" }} />
            <div className="absolute inset-8 neural-blob neural-blob-active" style={{ animationDelay: "-4s" }} />
          </div>

          {/* Status */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="font-display text-[36px] text-white mb-3 leading-tight text-glow"
          >
            Creating your future self
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="font-mono text-[13px] text-white/30 mb-10 h-6 animate-glitch"
          >
            {LOADING_MESSAGES[messageIndex]}...
          </motion.p>

          {/* Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.3 }}
          >
            <div className="w-full h-[2px] bg-white/[0.06] rounded-full overflow-hidden mb-3">
              <motion.div
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full bg-[oklch(0.7_0.1_250)] rounded-full"
                style={{ boxShadow: "0 0 8px oklch(0.7 0.1 250 / 0.5)" }}
              />
            </div>
            <p className="font-mono text-[11px] tracking-[0.1em] text-white/20">{progress}%</p>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
