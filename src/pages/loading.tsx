import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PageLayout, PageHeader, ProcessingOrb } from "../components/ui";

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
  }, [sessionId, navigate]);

  return (
    <PageLayout>
      {/* Breathing orb */}
      <ProcessingOrb />

      {/* Title */}
      <PageHeader
        title="Creating your future self"
        animated={false}
        className="mb-4"
      />

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
      <ProgressBar progress={progress} />
    </PageLayout>
  );
}

// Progress Bar Component
function ProgressBar({ progress }: { progress: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
      className="w-48"
    >
      <div className="w-full h-px bg-white/10 rounded-full overflow-hidden mb-3">
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="h-full bg-white rounded-full"
        />
      </div>
      <p className="font-mono text-[10px] tracking-[0.3em] text-white/30">
        {progress}%
      </p>
    </motion.div>
  );
}
