import { Link } from "react-router-dom";
import { ArrowRight, Mic, Clock, MessageSquare } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 md:px-10">
        <span className="font-mono text-sm tracking-[0.2em] text-[rgb(var(--text-primary))]">
          DOPPEL
        </span>
        <Link 
          to="/setup" 
          className="text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))] transition-colors"
        >
          Begin
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        {/* Hero content - centered vertically in available space */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          <div className="w-full max-w-[720px] text-center">
            {/* Eyebrow */}
            <p className="font-mono text-xs tracking-[0.25em] text-[rgb(var(--text-muted))] mb-6">
              A CONVERSATION ACROSS TIME
            </p>

            {/* Main headline */}
            <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-normal tracking-[-0.03em] leading-[1.05] text-[rgb(var(--foreground))] mb-6">
              Meet Your Future Self
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-[rgb(var(--text-secondary))] leading-relaxed max-w-[540px] mx-auto mb-10">
              Engage in a real-time conversation with an AI persona of your future self, powered by advanced voice synthesis.
            </p>

            {/* CTA Button */}
            <Link 
              to="/setup" 
              className="inline-flex items-center gap-2.5 h-12 px-7 bg-[rgb(var(--foreground))] text-[rgb(var(--background))] rounded-full font-medium text-[15px] hover:opacity-90 transition-opacity"
            >
              Start your conversation
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Waveform */}
          <div className="mt-16 flex items-end justify-center gap-[3px] h-14">
            {Array.from({ length: 64 }).map((_, i) => {
              const center = 32;
              const distFromCenter = Math.abs(i - center);
              const falloff = Math.max(0, 1 - distFromCenter / 32);
              const wave = Math.sin(i * 0.2) * 0.3 + 0.7;
              const height = 4 + falloff * wave * 48;
              const opacity = 0.2 + falloff * 0.4;
              return (
                <div
                  key={i}
                  className="w-[3px] rounded-full bg-[rgb(var(--text-muted))]"
                  style={{
                    height: `${height}px`,
                    opacity,
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* Features Section - fixed at bottom */}
        <section className="px-6 md:px-10 pb-10">
          <div className="w-full max-w-[960px] mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-14 flex items-center justify-center border-t border-[rgb(var(--border))]">
        <p className="text-xs text-[rgb(var(--text-muted))]">
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
    <div className="p-6 rounded-xl bg-[rgb(var(--surface-1)/0.4)] border border-[rgb(var(--border)/0.5)] hover:bg-[rgb(var(--surface-1)/0.6)] hover:border-[rgb(var(--border))] transition-all duration-200">
      <div className="text-[rgb(var(--text-muted))] mb-4">
        {icon}
      </div>
      <h3 className="text-base font-medium text-[rgb(var(--foreground))] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">
        {description}
      </p>
    </div>
  );
}
