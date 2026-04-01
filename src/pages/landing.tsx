import { Link } from "react-router-dom";
import {
  ArrowRight,
  AudioLines,
  Brain,
  MessageSquare,
  Mic,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedContainer, FeatureCard } from "../components/layout";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice Cloning",
    description:
      "Record a short sample and our AI learns your unique tone, cadence, and speaking patterns.",
  },
  {
    icon: Brain,
    title: "Contextual AI",
    description:
      "Describe your crossroads and life situation. The AI builds a future perspective around your goals.",
  },
  {
    icon: MessageSquare,
    title: "Live Conversation",
    description:
      "Speak naturally with your future self in real-time. Ask questions, share doubts, gain clarity.",
  },
  {
    icon: ShieldCheck,
    title: "Private & Secure",
    description:
      "Your voice and personal data are processed securely and never stored beyond your session.",
  },
  {
    icon: AudioLines,
    title: "Natural Audio",
    description:
      "Responses are generated in your own cloned voice for an authentic, immersive experience.",
  },
  {
    icon: RotateCcw,
    title: "Save & Replay",
    description:
      "Revisit past conversations anytime. Reflect on the advice your future self shared with you.",
  },
];

export function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <Button variant="outline" size="sm" asChild>
            <Link to="/setup">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center pt-32">
        <div className="flex max-w-2xl flex-col items-center text-center">
          <p className="animate-fade-up text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            A Conversation Across Time
          </p>

          <h1
            className="animate-fade-up mb-6 mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "100ms" }}
          >
            Meet Your Future Self
          </h1>

          <p
            className="animate-fade-up mb-10 max-w-lg text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg"
            style={{ animationDelay: "200ms" }}
          >
            Clone your voice. Describe your crossroads. Have a real conversation
            with who you could become — 10 years from now.
          </p>

          {/* Audio visualization */}
          <div
            className="animate-fade-up mb-10 flex h-8 w-48 items-center justify-center gap-1"
            style={{ animationDelay: "300ms" }}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="w-0.5 rounded-full bg-foreground/30 animate-pulse-subtle"
                style={{
                  height: `${Math.max(8, Math.sin((i / 24) * Math.PI) * 28)}px`,
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>

          {/* CTA */}
          <div
            className="animate-fade-up flex flex-col items-center gap-4 sm:flex-row"
            style={{ animationDelay: "400ms" }}
          >
            <Button
              size="lg"
              className="h-11 gap-2 rounded-full px-6 text-sm"
              asChild
            >
              <Link to="/setup">
                Start your conversation
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              Free to try · No account needed
            </span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto mt-32 max-w-5xl px-6 pb-20">
        <AnimatedContainer className="text-center">
          <h2 className="text-3xl font-bold tracking-wide text-balance md:text-4xl">
            How It Works
          </h2>
          <p className="mt-2 text-sm tracking-wide text-pretty text-muted-foreground">
            Three steps to a conversation with your future self
          </p>
        </AnimatedContainer>

        <AnimatedContainer delay={0.4} className="mt-12">
          <div className="grid grid-cols-1 border border-dashed sm:grid-cols-2 md:grid-cols-3 [&>*]:border-b [&>*]:border-r [&>*]:border-dashed">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </AnimatedContainer>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <p className="text-center text-xs text-muted-foreground">
          Built with AI voice synthesis technology
        </p>
      </footer>
    </main>
  );
}
