import { Link } from "react-router-dom";
import { Mic, Clock, MessageSquare, ArrowRight } from "lucide-react";

export function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-10 border-b border-[#1a1a1a] bg-black/80 backdrop-blur-xl">
        <span className="font-sans text-[13px] font-semibold tracking-[0.15em] text-white/90 uppercase">
          Doppel
        </span>
        <Link
          to="/setup"
          className="flex items-center gap-1.5 text-[13px] font-medium text-[#a1a1a1] hover:text-white transition-colors duration-200"
        >
          Begin
          <ArrowRight className="size-3.5" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center pt-14 min-h-screen px-6">
        {/* Subtle radial glow behind heading */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(124,58,237,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative stagger">
          {/* Eyebrow */}
          <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-[#525252] mb-8">
            A conversation across time
          </p>

          {/* Heading */}
          <h1 className="font-display text-[clamp(52px,9vw,96px)] text-white leading-[0.92] max-w-[800px] mb-8 text-balance">
            Meet Your
            <br />
            Future Self
          </h1>

          {/* Subtext */}
          <p className="font-sans text-[16px] md:text-[17px] leading-[1.7] text-[#737373] max-w-[480px] mx-auto mb-14 text-pretty">
            Clone your voice. Describe your crossroads. Have a real
            conversation with who you could become — 10 years from now.
          </p>

          {/* CTA */}
          <div>
            <Link
              to="/setup"
              className="inline-flex items-center justify-center gap-2.5 font-sans text-[15px] font-medium bg-white text-black rounded-full px-8 py-3.5 hover:bg-[#e5e5e5] active:scale-[0.98] transition-all duration-150"
            >
              Start your conversation
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {/* Waveform */}
          <div className="mt-24">
            <div
              className="flex items-end justify-center gap-[3px] h-16"
              style={{
                maskImage:
                  "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)",
              }}
            >
              {Array.from({ length: 48 }).map((_, i) => {
                const center = 24;
                const dist = Math.abs(i - center);
                const bell = Math.exp(-Math.pow(dist / 10, 2));
                const h = 6 + bell * 52;
                const o = 0.08 + bell * 0.25;

                return (
                  <div
                    key={i}
                    className="w-[2px] rounded-full bg-white shrink-0"
                    style={{
                      height: `${h}px`,
                      opacity: o,
                      animation: `wave-bar 2s ease-in-out infinite`,
                      animationDelay: `${i * 60}ms`,
                      transformOrigin: "bottom",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-[#1a1a1a]">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#1a1a1a]">
          <FeatureCard
            icon={<Mic className="size-[18px]" />}
            title="Clone Your Voice"
            description="30 seconds of speech creates your unique voice profile for a seamless experience."
            number="01"
          />
          <FeatureCard
            icon={<Clock className="size-[18px]" />}
            title="Future Persona"
            description="AI generates a grounded persona from your context, informed by your situation."
            number="02"
          />
          <FeatureCard
            icon={<MessageSquare className="size-[18px]" />}
            title="Real Conversation"
            description="Speak naturally. Your future self responds in real-time, in your own voice."
            number="03"
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="h-12 flex items-center justify-center border-t border-[#1a1a1a]">
        <p className="font-mono text-[11px] tracking-[0.08em] text-[#333]">
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  number: string;
}) {
  return (
    <div className="group px-8 md:px-10 py-10 md:py-12 hover:bg-[#0a0a0a] transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="size-10 rounded-xl bg-[#111] border border-[#1a1a1a] flex items-center justify-center text-[#525252] group-hover:text-[#7C3AED] group-hover:border-[#7C3AED]/20 transition-colors duration-300">
          {icon}
        </div>
        <span className="font-mono text-[11px] text-[#333]">{number}</span>
      </div>
      <h3 className="font-sans text-[15px] font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="font-sans text-[13px] leading-[1.7] text-[#666] max-w-[280px]">
        {description}
      </p>
    </div>
  );
}
