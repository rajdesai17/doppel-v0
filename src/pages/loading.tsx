import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Progress } from "../components/ui/progress";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center"
      >
        {/* Loading spinner */}
        <div className="mb-8 flex size-20 items-center justify-center rounded-full border border-border">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>

        {/* Title */}
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Creating your future self
        </h1>

        {/* Status message */}
        <p className="mb-8 text-sm text-muted-foreground">
          {LOADING_MESSAGES[messageIndex]}...
        </p>

        {/* Progress bar */}
        <div className="w-48">
          <Progress value={progress} className="mb-2 h-1" />
          <p className="text-xs tabular-nums text-muted-foreground">
            {progress}%
          </p>
        </div>
      </motion.div>
    </div>
  );
}
