import { Link } from "react-router-dom";
import { ArrowRight, Mic, Clock, MessageSquare } from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Nav - Fixed top bar */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#1a1a1a]">
        <span className="font-mono text-sm font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
        <Link
          to="/setup"
          className="text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Begin <span className="ml-1">→</span>
        </Link>
      </header>

      {/* Main content area */}
      <main className="flex-1 flex flex-col">
        {/* Hero Section - vertically centered, ~60vh */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 min-h-[60vh]">
          {/* Eyebrow */}
          <p className="text-[11px] font-mono tracking-[0.2em] text-[#666] uppercase mb-6">
            A CONVERSATION ACROSS TIME
          </p>

          {/* H1 */}
          <h1 className="text-[clamp(48px,8vw,80px)] font-normal text-white leading-[1.05] tracking-[-0.03em] text-center mb-6">
            Meet Your Future Self
          </h1>

          {/* Subtext */}
          <p className="text-lg text-[#999] text-center max-w-[560px] leading-relaxed mb-10">
            Engage in a real-time conversation with an AI persona of your future self, powered by advanced voice synthesis. Describe your life&apos;s crossroads and gain grounded wisdom in your own voice from a decade forward.
          </p>

          {/* CTA - white pill button */}
          <Link
            to="/setup"
            className="inline-flex items-center justify-center gap-2 h-[52px] px-7 bg-white text-black font-medium rounded-full hover:scale-[1.02] transition-transform"
          >
            Start your conversation
            <ArrowRight className="size-4" />
          </Link>
        </section>

        {/* Waveform - centered between hero and cards */}
        <div className="flex items-end justify-center gap-[2px] h-[60px] mb-16">
          {Array.from({ length: 80 }).map((_, i) => {
            // Create a wave pattern that fades from center outward
            const center = 40;
            const distanceFromCenter = Math.abs(i - center);
            const centerFactor = 1 - (distanceFromCenter / center) * 0.7;
            const wave = Math.sin(i * 0.2) * 0.4 + 0.6;
            const height = 8 + wave * centerFactor * 44;
            const opacity = 0.15 + centerFactor * 0.35;
            
            return (
              <div
                key={i}
                className="w-[3px] rounded-sm"
                style={{
                  height: `${height}px`,
                  backgroundColor: '#333',
                  opacity,
                }}
              />
            );
          })}
        </div>

        {/* Feature Cards Row - bottom ~30vh */}
        <section className="border-t border-[#1a1a1a]">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <FeatureCard
              icon={<Mic className="size-5 stroke-[1.5]" />}
              title="Clone Your Voice"
              description="30 seconds of speech creates your unique voice profile for a seamless experience."
            />
            <div className="hidden md:block border-l border-[#1a1a1a]">
              <FeatureCard
                icon={<Clock className="size-5 stroke-[1.5]" />}
                title="Future Persona"
                description="AI generates a grounded persona from your context, informed by your situation."
                noBorder
              />
            </div>
            <div className="md:hidden border-t border-[#1a1a1a]">
              <FeatureCard
                icon={<Clock className="size-5 stroke-[1.5]" />}
                title="Future Persona"
                description="AI generates a grounded persona from your context, informed by your situation."
              />
            </div>
            <div className="hidden md:block border-l border-[#1a1a1a]">
              <FeatureCard
                icon={<MessageSquare className="size-5 stroke-[1.5]" />}
                title="Real Conversation"
                description="Speak naturally. Your future self responds in real-time, in your own voice."
                noBorder
              />
            </div>
            <div className="md:hidden border-t border-[#1a1a1a]">
              <FeatureCard
                icon={<MessageSquare className="size-5 stroke-[1.5]" />}
                title="Real Conversation"
                description="Speak naturally. Your future self responds in real-time, in your own voice."
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer note */}
      <footer className="py-6 text-center">
        <p className="text-xs text-[#444]">
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
  noBorder = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  noBorder?: boolean;
}) {
  return (
    <div className={`px-10 py-8 ${!noBorder ? 'md:border-t-0' : ''}`}>
      <div className="text-[#555] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#777] leading-relaxed">{description}</p>
    </div>
  );
}
