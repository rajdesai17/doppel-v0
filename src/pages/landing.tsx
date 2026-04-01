import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, Brain, MessageSquare, ShieldCheck, AudioLines, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "../components/ui/button";
import { FeatureCard } from "../components/ui/grid-feature-cards";

const features = [
  {
    title: "Voice Cloning",
    icon: Mic,
    description: "Record a short sample and our AI learns your unique tone, cadence, and speaking patterns.",
  },
  {
    title: "Contextual AI",
    icon: Brain,
    description: "Describe your crossroads and life situation. The AI builds a future perspective around your goals.",
  },
  {
    title: "Live Conversation",
    icon: MessageSquare,
    description: "Speak naturally with your future self in real-time. Ask questions, share doubts, gain clarity.",
  },
  {
    title: "Private & Secure",
    icon: ShieldCheck,
    description: "Your voice and personal data are processed securely and never stored beyond your session.",
  },
  {
    title: "Natural Audio",
    icon: AudioLines,
    description: "Responses are generated in your own cloned voice for an authentic, immersive experience.",
  },
  {
    title: "Save & Replay",
    icon: RotateCcw,
    description: "Revisit past conversations anytime. Reflect on the advice your future self shared with you.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <Link to="/setup">
            <Button variant="outline" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center px-6 pt-32">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          {/* Eyebrow */}
          <p 
            className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            A Conversation Across Time
          </p>

          {/* Headline */}
          <h1 
            className="mb-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-up text-balance"
            style={{ animationDelay: "100ms" }}
          >
            Meet Your Future Self
          </h1>

          {/* Subheadline */}
          <p 
            className="mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-up text-pretty"
            style={{ animationDelay: "200ms" }}
          >
            Clone your voice. Describe your crossroads. Have a real conversation 
            with who you could become — 10 years from now.
          </p>

          {/* Audio visualization */}
          <div 
            className="mb-10 flex h-8 w-48 items-center justify-center gap-1 animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const height = Math.sin((i / 24) * Math.PI) * 100;
              return (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-foreground/30 animate-pulse-subtle"
                  style={{
                    height: `${Math.max(8, height * 0.3)}px`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              );
            })}
          </div>

          {/* CTA */}
          <div 
            className="flex flex-col items-center gap-4 sm:flex-row animate-fade-up"
            style={{ animationDelay: "400ms" }}
          >
            <Link to="/setup">
              <Button size="lg" className="h-11 gap-2 rounded-full px-6 text-sm">
                Start your conversation
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground">
              Free to try · No account needed
            </span>
          </div>
        </div>

        {/* Features Grid */}
        <section className="mx-auto mt-32 w-full max-w-5xl pb-20">
          <AnimatedContainer className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl">
              How It Works
            </h2>
            <p className="text-muted-foreground mt-4 text-sm tracking-wide text-balance">
              Clone your voice, share your story, and talk to who you could become.
            </p>
          </AnimatedContainer>

          <AnimatedContainer
            delay={0.4}
            className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed sm:grid-cols-2 md:grid-cols-3"
          >
            {features.map((feature, i) => (
              <FeatureCard key={i} feature={feature} />
            ))}
          </AnimatedContainer>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs text-muted-foreground">
            Built with AI voice synthesis technology
          </p>
        </div>
      </footer>
    </div>
  );
}

function AnimatedContainer({
  className,
  delay = 0.1,
  children,
}: {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ filter: "blur(4px)", translateY: -8, opacity: 0 }}
      whileInView={{ filter: "blur(0px)", translateY: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
