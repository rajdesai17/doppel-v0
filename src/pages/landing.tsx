import { Link } from "react-router-dom";
import { Mic, Clock, MessageSquare, ArrowRight } from "lucide-react";

export function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-12 border-b border-[#1C1C1C] bg-black">
        <span className="font-sans text-[13px] font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
        <Link
          to="/setup"
          className="flex items-center gap-2 text-[13px] text-white px-5 py-2 border border-[#333] rounded-md hover:border-white transition-colors duration-200"
        >
          Begin
          <ArrowRight className="size-3.5" />
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center pt-14 min-h-screen max-h-[776px] px-6">
        {/* Eyebrow */}
        <p className="font-sans text-[11px] tracking-[0.25em] uppercase text-[#555] mb-6">
          A CONVERSATION ACROSS TIME
        </p>

        {/* H1 */}
        <h1 className="font-display text-[clamp(48px,10vw,88px)] font-normal text-white leading-[0.95] max-w-[800px] mb-8 text-balance">
          Meet Your Future Self
        </h1>

        {/* Subtext */}
        <p className="font-sans text-base md:text-[17px] leading-relaxed text-[#666] max-w-[540px] mb-12 text-pretty">
          Engage in a real-time conversation with an AI persona of your future self,
          powered by advanced voice synthesis. Describe your crossroads — hear wisdom
          from a decade forward.
        </p>

        {/* CTA Button */}
        <Link
          to="/setup"
          className="inline-flex items-center justify-center gap-2 font-sans text-[15px] font-medium bg-white text-black rounded-full px-10 py-4 hover:bg-[#e5e5e5] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 mb-20"
        >
          Start your conversation
          <ArrowRight className="size-4" />
        </Link>

        {/* Waveform Strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[72px] flex items-end justify-center overflow-hidden">
          <div 
            className="flex items-end justify-center gap-1"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
            }}
          >
            {Array.from({ length: 60 }).map((_, i) => {
              const center = 30;
              const distance = Math.abs(i - center);
              const bellCurve = Math.exp(-Math.pow(distance / 12, 2));
              const height = 8 + bellCurve * 48;
              const opacity = 0.04 + bellCurve * 0.21;
              
              return (
                <div
                  key={i}
                  className="w-0.5 rounded-sm bg-white"
                  style={{
                    height: `${height}px`,
                    opacity,
                  }}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-[#1C1C1C]">
        <div className="grid grid-cols-1 md:grid-cols-3">
          <FeatureCard
            icon={<Mic className="size-[18px]" />}
            title="Clone Your Voice"
            description="30 seconds of speech creates your unique voice profile for a seamless experience."
          />
          <FeatureCard
            icon={<Clock className="size-[18px]" />}
            title="Future Persona"
            description="AI generates a grounded persona from your context, informed by your situation."
            hasBorder
          />
          <FeatureCard
            icon={<MessageSquare className="size-[18px]" />}
            title="Real Conversation"
            description="Speak naturally. Your future self responds in real-time, in your own voice."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="h-12 flex items-center justify-center border-t border-[#1C1C1C]">
        <p className="font-mono text-[11px] tracking-[0.1em] text-[#333]">
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
  hasBorder = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  hasBorder?: boolean;
}) {
  return (
    <div 
      className={`px-8 md:px-12 py-10 ${hasBorder ? 'md:border-x border-y md:border-y-0 border-[#1C1C1C]' : ''}`}
    >
      <div className="text-[#444] mb-5">
        {icon}
      </div>
      <h3 className="font-sans text-base font-semibold text-white mb-3">
        {title}
      </h3>
      <p className="font-sans text-[13px] leading-relaxed text-[#666] max-w-[280px]">
        {description}
      </p>
    </div>
  );
}
