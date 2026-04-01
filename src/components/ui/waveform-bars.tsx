import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

const spring = { type: "spring", stiffness: 100, damping: 20 };

interface WaveformBarsProps {
  isActive?: boolean;
  barCount?: number;
  className?: string;
}

export function WaveformBars({
  isActive = false,
  barCount = 7,
  className,
}: WaveformBarsProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={spring}
          className={cn("flex items-center justify-center gap-1 h-8", className)}
        >
          {[...Array(barCount)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: [8, 24, 8],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.08,
              }}
              className="w-1 bg-white/30 rounded-full"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
