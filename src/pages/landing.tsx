import { Link } from "react-router-dom";
import { ArrowRight, Mic, Brain, MessageSquare } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="header">
        <span className="header-logo">DOPPEL</span>
        <Link
          to="/setup"
          className="btn-ghost text-sm"
        >
          Get Started
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 gradient-radial pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl mx-auto text-center animate-fade-up">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-1 border border-[rgb(var(--border)/0.1)] mb-8">
              <span className="text-mono text-text-tertiary text-xs">
                Voice AI Experience
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-display text-foreground mb-6 text-balance">
              Meet Your
              <br />
              <span className="text-text-secondary">Future Self</span>
            </h1>

            {/* Subheading */}
            <p className="text-body max-w-lg mx-auto mb-10 text-pretty">
              Clone your voice. Describe your crossroads. Have a real conversation 
              with who you could become — 10 years from now.
            </p>

            {/* CTA */}
            <div className="flex items-center justify-center gap-4">
              <Link
                to="/setup"
                className="btn btn-primary group"
              >
                Start Conversation
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-caption">Free to use</span>
            </div>
          </div>

          {/* Waveform visualization */}
          <div className="mt-20 flex items-center justify-center gap-[3px] opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
            {Array.from({ length: 32 }).map((_, i) => {
              const height = 12 + Math.sin(i * 0.4) * 8 + Math.random() * 6;
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-text-muted"
                  style={{
                    height: `${height}px`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-[rgb(var(--border)/var(--border-opacity))] py-20">
          <div className="page-container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Mic className="size-5" />}
                title="Clone Your Voice"
                description="30 seconds of speech creates your unique voice profile using advanced AI voice synthesis."
                delay={0}
              />
              <FeatureCard
                icon={<Brain className="size-5" />}
                title="Future Persona"
                description="AI generates your future self — informed by your situation, grounded in earned wisdom."
                delay={100}
              />
              <FeatureCard
                icon={<MessageSquare className="size-5" />}
                title="Real Conversation"
                description="Speak naturally. Your future self responds in real-time, in your own voice."
                delay={200}
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgb(var(--border)/var(--border-opacity))] py-5">
        <div className="page-container flex items-center justify-between">
          <span className="text-caption">
            Built with ElevenLabs + Cloudflare
          </span>
          <span className="text-caption">
            2025
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <div 
      className="surface-interactive p-6 opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="size-10 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary mb-4">
        {icon}
      </div>
      <h3 className="text-heading text-foreground mb-2">{title}</h3>
      <p className="text-body text-sm">{description}</p>
    </div>
  );
}
