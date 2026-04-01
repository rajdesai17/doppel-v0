import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 };

interface BreathingCircleProps {
  isActive?: boolean;
  isSpeaking?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "size-24",
  md: "size-32",
  lg: "size-40",
};

export function BreathingCircle({
  isActive = false,
  isSpeaking = false,
  size = "lg",
  className,
}: BreathingCircleProps) {
  return (
    <div className={cn("relative", sizeClasses[size], className)}>
      <motion.div
        animate={{
          scale: isSpeaking ? [1, 1.1, 1] : 1,
          opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.2,
        }}
        transition={{
          duration: 2,
          repeat: isSpeaking ? Infinity : 0,
          ease: "easeInOut",
        }}
        className="absolute inset-0 rounded-full border border-white/20"
        style={{
          boxShadow: isSpeaking
            ? "0 0 40px rgba(255, 255, 255, 0.2)"
            : "none",
        }}
      />

      {/* Inner dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            scale: isActive ? 1.2 : 1,
            opacity: isActive ? 1 : 0.5,
          }}
          transition={spring}
          className="size-3 rounded-full bg-white"
        />
      </div>
    </div>
  );
}
