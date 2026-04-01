import { Link } from "react-router-dom";
import { ArrowRight, Mic, MessageCircle, Clock } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <div className="font-mono text-sm tracking-widest text-zinc-400">
          DOPPEL
        </div>
        <Link
          to="/setup"
          className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          Begin
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          {/* Eyebrow */}
          <p className="font-mono text-xs tracking-[0.3em] text-zinc-500 uppercase mb-6">
            A conversation across time
          </p>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-zinc-50 leading-[1.1] text-balance mb-8">
            Meet Your
            <br />
            Future Self
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed max-w-xl mx-auto mb-12 text-pretty">
            Clone your voice. Describe your crossroads. Have a real conversation
            with who you could become — 10 years from now.
          </p>

          {/* CTA */}
          <Link
            to="/setup"
            className="inline-flex items-center gap-3 bg-zinc-50 text-zinc-950 px-8 py-4 rounded-full font-medium text-lg hover:bg-zinc-200 transition-colors group"
          >
            Start your conversation
            <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* Visual element - abstract waveform */}
          <div className="mt-20 flex items-center justify-center gap-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-zinc-700 rounded-full animate-pulse-glow"
                style={{
                  height: `${20 + Math.sin(i * 0.3) * 15 + Math.random() * 10}px`,
                  animationDelay: `${i * 50}ms`,
                  opacity: 0.3 + Math.sin(i * 0.2) * 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-zinc-800/50 px-6 py-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Mic className="size-5" />}
            title="Clone Your Voice"
            description="30 seconds of speech creates your unique voice profile using ElevenLabs Instant Voice Clone."
          />
          <FeatureCard
            icon={<Clock className="size-5" />}
            title="Future Persona"
            description="AI generates your future self — informed by your situation, grounded in earned wisdom."
          />
          <FeatureCard
            icon={<MessageCircle className="size-5" />}
            title="Real Conversation"
            description="Speak naturally. Your future self responds in real-time, in your own voice."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-500">
          <span>Built with Cloudflare Agents + ElevenLabs</span>
          <span>Hackathon 2025</span>
        </div>
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
    <div className="p-6 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
      <div className="size-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-zinc-50 mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}
