import { Link } from "react-router-dom";
import { ArrowRight, Mic, Brain, MessageSquare } from "lucide-react";
import { Button } from "../components/ui/button";

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <Link to="/setup">
            <Button variant="outline" size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center px-6 pt-32">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          {/* Eyebrow */}
          <p 
            className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            A Conversation Across Time
          </p>

          {/* Headline */}
          <h1 
            className="mb-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl animate-fade-up text-balance"
            style={{ animationDelay: "100ms" }}
          >
            Meet Your Future Self
          </h1>

          {/* Subheadline */}
          <p 
            className="mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg animate-fade-up text-pretty"
            style={{ animationDelay: "200ms" }}
          >
            Clone your voice. Describe your crossroads. Have a real conversation 
            with who you could become — 10 years from now.
          </p>

          {/* Audio visualization */}
          <div 
            className="mb-10 flex h-8 w-48 items-center justify-center gap-1 animate-fade-up"
            style={{ animationDelay: "300ms" }}
          >
            {Array.from({ length: 24 }).map((_, i) => {
              const height = Math.sin((i / 24) * Math.PI) * 100;
              return (
                <div
                  key={i}
                  className="w-0.5 rounded-full bg-foreground/30 animate-pulse-subtle"
                  style={{
                    height: `${Math.max(8, height * 0.3)}px`,
                    animationDelay: `${i * 80}ms`,
                  }}
                />
              );
            })}
          </div>

          {/* CTA */}
          <div 
            className="flex flex-col items-center gap-4 sm:flex-row animate-fade-up"
            style={{ animationDelay: "400ms" }}
          >
            <Link to="/setup">
              <Button size="lg" className="h-11 gap-2 rounded-full px-6 text-sm">
                Start your conversation
                <ArrowRight data-icon="inline-end" />
              </Button>
            </Link>
            <span className="text-xs text-muted-foreground">
              Free to try · No account needed
            </span>
          </div>
        </div>

        {/* Bento Grid - How It Works */}
        <section className="mx-auto mt-32 w-full max-w-5xl pb-20">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              How It Works
            </h2>
            <p className="text-sm text-muted-foreground">
              Three simple steps to start your conversation
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Step 1 - Voice Clone */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:border-border">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Mic className="size-5 text-primary" />
              </div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step 1
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Clone Your Voice
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Record a 30-second sample of your voice. Our AI learns your unique tone, 
                cadence, and speaking style.
              </p>
              {/* Mini waveform visualization */}
              <div className="mt-6 flex h-8 items-end justify-center gap-0.5">
                {Array.from({ length: 32 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-primary/20 transition-all group-hover:bg-primary/40"
                    style={{
                      height: `${Math.random() * 24 + 8}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Step 2 - Context */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:border-border">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Brain className="size-5 text-primary" />
              </div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step 2
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Share Your Crossroads
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Tell us about the decision you&apos;re facing. What paths are you considering? 
                What matters most to you?
              </p>
              {/* Context bubbles */}
              <div className="mt-6 flex flex-wrap gap-2">
                {["Career", "Relationships", "Location", "Growth"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition-colors group-hover:border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Step 3 - Conversation */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:border-border sm:col-span-2 lg:col-span-1">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Step 3
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">
                Have the Conversation
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Speak naturally with your future self. Ask questions, share doubts, 
                and gain perspective from who you could become.
              </p>
              {/* Chat preview */}
              <div className="mt-6 space-y-2">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-md bg-primary/20 px-3 py-2 text-xs text-foreground">
                    Should I take the risk?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Let me tell you what I learned...
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features row */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-sm">🔒</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Private & Secure</p>
                <p className="text-xs text-muted-foreground">Your data stays yours</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-sm">⚡</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Real-time AI</p>
                <p className="text-xs text-muted-foreground">Natural conversations</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <span className="text-sm">💾</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Save & Replay</p>
                <p className="text-xs text-muted-foreground">Revisit anytime</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-center text-xs text-muted-foreground">
            Built with AI voice synthesis technology
          </p>
        </div>
      </footer>
    </div>
  );
}
