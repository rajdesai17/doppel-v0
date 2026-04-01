import { Link } from "react-router-dom";
import { ArrowRight, Mic, Clock, MessageSquare } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <header className="header">
        <span className="header-logo">DOPPEL</span>
        <Link to="/setup" className="text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors">
          Begin
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-4xl mx-auto text-center animate-fade-up">
          {/* Eyebrow */}
          <p className="text-mono text-[rgb(var(--text-tertiary))] mb-6 tracking-[0.2em]">
            A CONVERSATION ACROSS TIME
          </p>

          {/* Main headline */}
          <h1 className="text-display text-[rgb(var(--foreground))] mb-8">
            Meet Your Future Self
          </h1>

          {/* Subtitle */}
          <p className="text-body text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Engage in a real-time conversation with an AI persona of your future self, powered by advanced voice synthesis. Describe your life&apos;s crossroads and gain grounded wisdom in your own voice from a decade forward.
          </p>

          {/* CTA */}
          <Link to="/setup" className="btn btn-primary group">
            Start your conversation
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Waveform */}
        <div className="mt-20 flex items-end justify-center gap-[3px] h-10 opacity-0 animate-fade-in" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
          {Array.from({ length: 60 }).map((_, i) => {
            const baseHeight = Math.sin(i * 0.15) * 0.5 + 0.5;
            const variation = Math.sin(i * 0.4) * 0.3;
            const height = 8 + (baseHeight + variation) * 28;
            return (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  height: `${height}px`,
                  opacity: 0.4 + baseHeight * 0.4,
                }}
              />
            );
          })}
        </div>

        {/* Features */}
        <div className="w-full max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "700ms", animationFillMode: "forwards" }}>
          <FeatureCard
            icon={<Mic className="size-5" />}
            title="Clone Your Voice"
            description="30 seconds of speech creates your unique voice profile for a seamless experience."
          />
          <FeatureCard
            icon={<Clock className="size-5" />}
            title="Future Persona"
            description="AI generates a grounded persona from your context, informed by your situation."
          />
          <FeatureCard
            icon={<MessageSquare className="size-5" />}
            title="Real Conversation"
            description="Speak naturally. Your future self responds in real-time, in your own voice."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-caption">
          Built with Cloudflare Agents + ElevenLabs
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="surface-interactive p-5">
      <div className="text-[rgb(var(--text-tertiary))] mb-4">
        {icon}
      </div>
      <h3 className="text-heading text-[rgb(var(--foreground))] mb-2">{title}</h3>
      <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{description}</p>
    </div>
  );
}
