import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 };

interface GlowingLineProps {
  className?: string;
  animated?: boolean;
  delay?: number;
}

export function GlowingLine({
  className,
  animated = true,
  delay = 0.3,
}: GlowingLineProps) {
  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ ...spring, delay }}
        className={cn("h-px w-48 bg-white/40", className)}
        style={{
          boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
        }}
      />
    );
  }

  return (
    <div
      className={cn("h-px w-48 bg-white/40", className)}
      style={{
        boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
      }}
    />
  );
}
