import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const spring = { type: "spring", stiffness: 100, damping: 20 };

export function LandingPage() {
  return (
    <main className="h-screen w-full flex flex-col items-center justify-center text-center px-4 bg-black">
      {/* Eyebrow */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
        className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/50 mb-8"
      >
        A Conversation Across Time
      </motion.p>

      {/* H1 - Massive serif headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="font-serif text-6xl md:text-8xl text-white tracking-tighter leading-[1.1] mb-6"
      >
        Meet Your
        <br />
        Future Self
      </motion.h1>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="max-w-md text-white/60 text-sm md:text-base leading-relaxed mb-12"
      >
        Clone your voice. Describe your crossroads. Have a real conversation
        with who you could become — 10 years from now.
      </motion.p>

      {/* Glowing audio line */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ ...spring, delay: 0.3 }}
        className="h-px w-48 bg-white/40 animate-pulse-glow mb-12"
        style={{
          boxShadow: "0 0 15px rgba(255, 255, 255, 0.5)",
        }}
      />

      {/* CTA Button - High contrast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.4 }}
      >
        <Link
          to="/setup"
          className="inline-flex items-center gap-2 bg-white text-black font-medium text-sm px-8 py-3 rounded-full hover:scale-105 transition-transform duration-300"
        >
          Start your conversation
          <ArrowRight size={16} />
        </Link>
      </motion.div>
    </main>
  );
}
