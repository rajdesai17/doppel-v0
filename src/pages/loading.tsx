import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
    <main className="h-screen w-full flex flex-col items-center justify-center text-center px-4 bg-black">
      {/* Breathing circle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={spring}
        className="relative w-32 h-32 mb-12"
      >
        <div className="absolute inset-0 rounded-full border border-white/20 animate-breathe" />
        <div 
          className="absolute inset-4 rounded-full border border-white/30 animate-breathe" 
          style={{ animationDelay: "-0.5s" }} 
        />
        <div 
          className="absolute inset-8 rounded-full border border-white/40 animate-breathe" 
          style={{ animationDelay: "-1s" }} 
        />
      </motion.div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="font-serif text-4xl text-white mb-4"
      >
        Creating your future self
      </motion.h2>

      {/* Status message */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50 mb-10"
      >
        {LOADING_MESSAGES[messageIndex]}...
      </motion.p>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.3 }}
        className="w-48"
      >
        <div className="w-full h-px bg-white/10 rounded-full overflow-hidden mb-3">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full bg-white rounded-full"
          />
        </div>
        <p className="font-mono text-[10px] tracking-[0.3em] text-white/30">{progress}%</p>
      </motion.div>
    </main>
  );
}
