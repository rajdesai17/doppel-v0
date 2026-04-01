import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-14">
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
