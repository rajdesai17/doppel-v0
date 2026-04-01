import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 };

interface ProcessingOrbProps {
  message?: string;
  className?: string;
}

export function ProcessingOrb({ message, className }: ProcessingOrbProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={spring}
      className={cn("flex flex-col items-center", className)}
    >
      <div className="relative size-32 mb-12">
        <div className="absolute inset-0 rounded-full bg-white/20 animate-breathe" />
        <div
          className="absolute inset-4 rounded-full bg-white/30 animate-breathe"
          style={{ animationDelay: "-0.5s" }}
        />
        <div
          className="absolute inset-8 rounded-full bg-white/40 animate-breathe"
          style={{ animationDelay: "-1s" }}
        />
      </div>

      {message && (
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
          {message}
        </p>
      )}
    </motion.div>
  );
}
