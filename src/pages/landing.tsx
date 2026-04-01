import { Link } from "react-router-dom";
import { Mic, Clock, MessageSquare, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState, useEffect } from "react";

// Spring physics config
const spring = { type: "spring", stiffness: 100, damping: 20 };

export function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-[#020202] relative overflow-hidden">
      {/* Star field background */}
      <StarField />
      
      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-10 border-b border-white/[0.04] bg-[#020202]/80 backdrop-blur-xl"
      >
        <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-white/70 uppercase">
          Doppel
        </span>
        <Link
          to="/setup"
          className="flex items-center gap-1.5 text-[13px] font-medium text-white/40 hover:text-white transition-colors duration-300"
        >
          Begin
          <ArrowRight className="size-3.5" />
        </Link>
      </motion.nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center pt-14 min-h-screen px-6">
        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, oklch(0.7 0.1 250 / 0.08) 0%, transparent 60%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          {/* Eyebrow */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="font-mono text-[11px] tracking-[0.3em] uppercase text-white/30 mb-8"
          >
            A conversation across time
          </motion.p>

          {/* Heading with glow */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.3 }}
            className="font-display text-[clamp(48px,10vw,100px)] text-white leading-[0.9] max-w-[900px] mb-8 text-glow"
          >
            Meet Your
            <br />
            Future Self
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.4 }}
            className="font-sans text-[16px] md:text-[17px] leading-[1.8] text-white/40 max-w-[480px] mx-auto mb-16 text-pretty"
          >
            Clone your voice. Describe your crossroads. Have a real
            conversation with who you could become — 10 years from now.
          </motion.p>

          {/* Voice Particle Sphere */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.5 }}
            className="mb-16"
          >
            <VoiceParticleSphere />
          </motion.div>

          {/* CTA - Glass pill button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.6 }}
          >
            <Link
              to="/setup"
              className="glass-button inline-flex items-center justify-center gap-3 font-sans text-[15px] font-medium text-white rounded-full px-10 py-4 active:scale-[0.98] transition-transform duration-150"
            >
              Start your conversation
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="border-t border-white/[0.04]"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.04]">
          <FeatureCard
            icon={<Mic className="size-[18px]" />}
            title="Clone Your Voice"
            description="30 seconds of speech creates your unique voice profile for a seamless experience."
            number="01"
            delay={0}
          />
          <FeatureCard
            icon={<Clock className="size-[18px]" />}
            title="Future Persona"
            description="AI generates a grounded persona from your context, informed by your situation."
            number="02"
            delay={0.1}
          />
          <FeatureCard
            icon={<MessageSquare className="size-[18px]" />}
            title="Real Conversation"
            description="Speak naturally. Your future self responds in real-time, in your own voice."
            number="03"
            delay={0.2}
          />
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="h-12 flex items-center justify-center border-t border-white/[0.04]">
        <p className="font-mono text-[11px] tracking-[0.1em] text-white/20">
          Built with Cloudflare Agents + ElevenLabs
        </p>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  number,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  number: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ ...spring, delay }}
      className="group px-8 md:px-10 py-10 md:py-12 hover:bg-white/[0.02] transition-colors duration-500"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="size-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-white/30 group-hover:text-[oklch(0.7_0.1_250)] group-hover:border-[oklch(0.7_0.1_250_/_0.2)] transition-all duration-500">
          {icon}
        </div>
        <span className="font-mono text-[11px] text-white/15">{number}</span>
      </div>
      <h3 className="font-sans text-[15px] font-semibold text-white/90 mb-2">
        {title}
      </h3>
      <p className="font-sans text-[13px] leading-[1.7] text-white/40 max-w-[280px]">
        {description}
      </p>
    </motion.div>
  );
}

// Voice Particle Sphere - 3D-like sphere of dots
function VoiceParticleSphere() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; z: number; size: number }>>([]);

  useEffect(() => {
    // Generate sphere particles
    const newParticles = [];
    const count = 80;
    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const radius = 60;
      
      newParticles.push({
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(phi),
        size: 2 + Math.random() * 2,
      });
    }
    setParticles(newParticles);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative size-[160px] cursor-pointer"
    >
      {/* Glow background */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 ${
          isHovered ? "opacity-100 scale-110" : "opacity-50 scale-100"
        }`}
        style={{
          background: "radial-gradient(circle, oklch(0.7 0.1 250 / 0.15) 0%, transparent 70%)",
        }}
      />
      
      {/* Particles */}
      <div className="absolute inset-0 flex items-center justify-center">
        {particles.map((p, i) => {
          const scale = (p.z + 60) / 120; // 0 to 1 based on z
          const opacity = 0.2 + scale * 0.8;
          const size = p.size * scale;
          
          return (
            <motion.div
              key={i}
              animate={{
                x: p.x + (isHovered ? Math.sin(Date.now() / 500 + i) * 8 : 0),
                y: p.y + (isHovered ? Math.cos(Date.now() / 500 + i) * 8 : 0),
                scale: isHovered ? 1.2 : 1,
              }}
              transition={{ type: "spring", stiffness: 150, damping: 15 }}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                opacity,
                background: isHovered ? "oklch(0.7 0.1 250)" : "white",
                boxShadow: isHovered ? "0 0 8px oklch(0.7 0.1 250 / 0.5)" : "none",
                left: "50%",
                top: "50%",
                marginLeft: -size / 2,
                marginTop: -size / 2,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// Star field background
function StarField() {
  const [stars, setStars] = useState<Array<{ x: number; y: number; size: number; opacity: number }>>([]);

  useEffect(() => {
    const newStars = [];
    for (let i = 0; i < 100; i++) {
      newStars.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
      });
    }
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none">
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}
