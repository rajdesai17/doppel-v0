import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mic, Sparkles, Waves } from "lucide-react";
import { PageFrame, SectionHeading, StatusPill, TopBar } from "../components/chrome";

const STEPS = [
  {
    icon: <Mic className="size-4" />,
    title: "Record your voice",
    body: "A short, clean sample is enough.",
  },
  {
    icon: <Sparkles className="size-4" />,
    title: "Describe the moment",
    body: "Give the system the decision you are facing.",
  },
  {
    icon: <Waves className="size-4" />,
    title: "Start the conversation",
    body: "Speak with a future version of yourself in real time.",
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen">
      <TopBar
        left={<StatusPill label="voice prototype" tone="accent" />}
        right={
          <Link
            to="/setup"
            className="button-lift inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/85 hover:border-white/16 hover:bg-white/[0.08]"
          >
            Begin
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      <PageFrame className="pb-16 pt-10 sm:pt-16 lg:pb-20">
        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.05fr)_420px] xl:items-center">
          <div className="max-w-[760px]">
            <SectionHeading
              eyebrow="A quieter interface for a personal conversation"
              title="Speak with the version of you that has already lived through this."
              description="Doppel turns one short recording and one real dilemma into a focused voice conversation."
            />

            <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
              <Link
                to="/setup"
                className="button-lift inline-flex items-center justify-center gap-2 rounded-full bg-[var(--app-accent)] px-6 py-3.5 text-sm font-semibold text-[#17130d] hover:bg-[var(--app-accent-strong)]"
              >
                Start your conversation
                <ArrowRight className="size-4" />
              </Link>
              <p className="max-w-md text-sm leading-7 text-[var(--app-muted)]">
                30 seconds to record. A few lines of context. Then the conversation begins.
              </p>
            </div>
          </div>

          <div className="surface-card rounded-[2rem] p-6 sm:p-7">
            <p className="eyebrow mb-4">Session preview</p>
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.04em] text-white">
              One clear path in
            </h2>

            <div className="mt-6 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-white/88">Voice sample</span>
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                  step 1
                </span>
              </div>

              <div className="flex gap-2">
                {Array.from({ length: 22 }).map((_, index) => (
                  <span
                    key={index}
                    className="audio-wave-bar block w-1 rounded-full bg-[rgba(217,195,154,0.85)]"
                    style={{
                      height: `${24 + Math.abs(10 - index) * 2.5}px`,
                      animationDelay: `${index * 80}ms`,
                      opacity: 0.48,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                Future response
              </p>
              <p className="mt-3 text-sm leading-7 text-white/88">
                Calm, direct, and grounded in the context you actually shared.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-white/8 bg-black/10 p-5 sm:p-7">
          <div className="mb-6 max-w-lg">
            <p className="eyebrow mb-4">How it works</p>
            <h2 className="font-display text-[clamp(2rem,4vw,3.2rem)] text-white">
              Minimal flow, readable surfaces.
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <StepCard key={step.title} {...step} />
            ))}
          </div>
        </section>
      </PageFrame>
    </main>
  );
}

function StepCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="surface-soft rounded-[1.5rem] p-5 sm:p-6">
      <div className="mb-4 flex size-10 items-center justify-center rounded-2xl bg-white/[0.05] text-[var(--app-accent-strong)]">
        {icon}
      </div>
      <h3 className="text-[1.02rem] font-semibold tracking-[-0.03em] text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--app-muted)]">{body}</p>
    </article>
  );
}
