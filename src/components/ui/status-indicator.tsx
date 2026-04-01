import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 };

type Status = "connecting" | "connected" | "disconnected" | "error" | "idle";

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  className,
}: StatusIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className={cn("flex items-center gap-3", className)}
    >
      <div
        className={cn(
          "size-2 rounded-full",
          status === "connected" && "bg-white",
          status === "connecting" && "bg-white/50 animate-pulse",
          status === "idle" && "bg-white/30",
          (status === "disconnected" || status === "error") && "bg-white/20"
        )}
      />
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
          {label}
        </span>
      )}
    </motion.div>
  );
}
