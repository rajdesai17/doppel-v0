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

          {/* Hackathon tagline */}
          <a
            href="https://elevenlabs.io/hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="animate-fade-up mt-14 flex items-center gap-2.5 rounded-full border border-border/50 bg-card/50 px-5 py-2 transition-colors hover:border-foreground/20"
            style={{ animationDelay: "500ms" }}
          >
            <span className="text-xs text-muted-foreground">Built for</span>
            <svg fill="currentColor" fillRule="evenodd" className="h-3.5 w-auto text-foreground" viewBox="0 0 175 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 1h4.537v21.636H2V1zM11.013 1h4.537v21.636h-4.537V1zM20.025 1h13.428v3.606h-8.89v5.152h8.281v3.606h-8.282v5.666h8.891v3.606H20.025V1zM36.224 1h4.293v21.636h-4.294V1zM43.105 14.515c0-5.909 2.954-8.454 7.551-8.454 4.598 0 7.217 2.515 7.217 8.515v.97H47.338c.152 3.515 1.217 4.696 3.258 4.696 1.613 0 2.618-.94 2.8-2.575h4.294C57.416 21.242 54.432 23 50.596 23c-4.872 0-7.491-2.576-7.491-8.485zm10.535-1.788c-.213-2.97-1.248-3.94-3.044-3.94-1.797 0-2.924 1-3.228 3.94h6.272zM63.171 6.424h-4.385l5.298 16.213h4.72l5.298-16.213h-4.385L66.4 18.637 63.17 6.424zM74.924 14.515c0-5.909 2.954-8.454 7.552-8.454 4.597 0 7.216 2.515 7.216 8.515v.97H79.157c.152 3.515 1.218 4.696 3.258 4.696 1.614 0 2.618-.94 2.801-2.575h4.293C89.235 21.242 86.251 23 82.415 23c-4.872 0-7.49-2.576-7.49-8.485zm10.536-1.788c-.213-2.97-1.249-3.94-3.045-3.94-1.797 0-2.923 1-3.228 3.94h6.273zM96.635 13.09c0-2.545 1.217-3.939 3.105-3.939 1.553 0 2.436.97 2.436 3.061v10.424h4.294v-11.09c0-3.758-2.132-5.485-5.238-5.485-2.1 0-3.836 1.06-4.597 2.454v-2.09H92.28v16.211h4.355v-9.545zM110.031 1h4.537v18.03h8.526v3.606h-13.063V1z" /><path clipRule="evenodd" d="M124.16 14.515c0-6.182 2.862-8.454 6.546-8.454 1.827 0 3.502 1.03 4.172 2.12V6.425h4.384v16.212H135v-1.909C134.36 22 132.564 23 130.584 23c-3.897 0-6.424-2.485-6.424-8.485zm7.673-5.273c2.131 0 3.288 1.606 3.288 5.273s-1.157 5.303-3.288 5.303c-2.132 0-3.35-1.636-3.35-5.303s1.218-5.273 3.35-5.273zM146.844 20.727v1.91h-4.263V1h4.294v7.182c.73-1.121 2.436-2.121 4.263-2.121 3.593 0 6.455 2.272 6.455 8.454S154.791 23 151.046 23c-1.979 0-3.593-1-4.202-2.273zm3.076-11.454c2.131 0 3.349 1.575 3.349 5.242s-1.218 5.303-3.349 5.303c-2.132 0-3.289-1.636-3.289-5.303s1.157-5.242 3.289-5.242z" /><path d="M159.359 17.818h4.293c.061 1.697.975 2.515 2.588 2.515 1.614 0 2.528-.727 2.528-2 0-1.151-.701-1.575-2.223-1.94l-1.31-.332c-3.714-.94-5.572-1.94-5.572-5 0-3.061 2.863-5 6.516-5 3.654 0 6.425 1.424 6.547 4.787h-4.293c-.092-1.484-1.005-2.12-2.314-2.12-1.31 0-2.223.636-2.223 1.848 0 1.12.731 1.545 2.009 1.848l1.34.334c3.532.878 5.755 1.757 5.755 5.03 0 3.273-2.923 5.212-6.881 5.212-4.294 0-6.669-1.606-6.76-5.182z" /></svg>
            <span className="text-xs text-muted-foreground">x</span>
            <svg className="h-4 w-auto" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.493 17.4c.135-.52.08-.983-.161-1.338-.215-.328-.592-.519-1.05-.519l-8.663-.109a.148.148 0 01-.135-.082c-.027-.054-.027-.109-.027-.163.027-.082.108-.164.189-.164l8.744-.11c1.05-.054 2.153-.9 2.556-1.937l.511-1.31c.027-.055.027-.11.027-.164C17.92 8.91 15.66 7 12.942 7c-2.503 0-4.628 1.638-5.381 3.903a2.432 2.432 0 00-1.803-.491c-1.21.109-2.153 1.092-2.287 2.32-.027.328 0 .628.054.9C1.56 13.688 0 15.326 0 17.319c0 .19.027.355.027.545 0 .082.08.137.161.137h15.983c.08 0 .188-.055.215-.164l.107-.437" fill="#F38020" /><path d="M19.238 11.75h-.242c-.054 0-.108.054-.135.109l-.35 1.2c-.134.52-.08.983.162 1.338.215.328.592.518 1.05.518l1.855.11c.054 0 .108.027.135.082.027.054.027.109.027.163-.027.082-.108.164-.188.164l-1.91.11c-1.05.054-2.153.9-2.557 1.937l-.134.355c-.027.055.026.137.107.137h6.592c.081 0 .162-.055.162-.137.107-.41.188-.846.188-1.31-.027-2.62-2.153-4.777-4.762-4.777" fill="#FCAD32" /></svg>
            <span className="text-xs font-medium text-muted-foreground">
              #ElevenHacks
            </span>
          </a>
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
          Built with ElevenLabs voice AI & Cloudflare Workers
        </p>
      </footer>
    </main>
  );
}
