import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { PageFrame, TopBar } from "../components/chrome";

const LOADING_MESSAGES = [
  "Analyzing voice patterns",
  "Creating voice clone",
  "Understanding context",
  "Generating persona",
  "Preparing conversation",
];

export function LoadingPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
    }, 2500);

    const progressInterval = setInterval(() => {
      setProgress((current) => Math.min(current + 2, 95));
    }, 200);

    const checkReady = setInterval(async () => {
      try {
        const response = await fetch(`/api/session/${sessionId}/status`);
        if (!response.ok) return;

        const { status } = (await response.json()) as { status: string };
        if (status === "ready") {
          clearInterval(checkReady);
          setProgress(100);
          setTimeout(() => navigate(`/conversation/${sessionId}`), 500);
        }
      } catch {
        // Setup page already handles the main session flow.
      }
    }, 2000);

    const timeout = setTimeout(() => navigate(`/conversation/${sessionId}`), 15000);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
      clearInterval(checkReady);
      clearTimeout(timeout);
    };
  }, [navigate, sessionId]);

  return (
    <main className="min-h-screen">
      <TopBar
        left={
          <Link
            to="/setup"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/78 hover:border-white/16 hover:bg-white/[0.08]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        }
      />

      <PageFrame className="flex min-h-[calc(100vh-72px)] items-center py-10">
        <section className="surface-card mx-auto w-full max-w-[760px] rounded-[2rem] px-6 py-10 text-center sm:px-10 sm:py-14">
          <div className="relative mx-auto mb-10 flex size-36 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(217,195,154,0.18),transparent_70%)] blur-3xl" />
            <div className="absolute inset-4 rounded-full border border-[rgba(217,195,154,0.16)] bg-[rgba(217,195,154,0.08)] animate-breathe" />
            <div
              className="absolute inset-8 rounded-full border border-[rgba(217,195,154,0.16)] bg-[rgba(217,195,154,0.06)] animate-breathe"
              style={{ animationDelay: "240ms" }}
            />
            <div className="relative flex size-[4.5rem] items-center justify-center rounded-full bg-[var(--app-accent)] text-[#17130d] shadow-[0_16px_40px_rgba(217,195,154,0.22)]">
              <Loader2 className="size-6 animate-spin" />
            </div>
          </div>

          <p className="eyebrow mb-4">Processing</p>
          <h1 className="font-display text-[clamp(2.4rem,5vw,4.2rem)] text-white">
            Creating your future self.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[0.98rem] leading-8 text-[var(--app-muted)]">
            {LOADING_MESSAGES[messageIndex]}...
          </p>

          <div className="mx-auto mt-10 max-w-[440px]">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-[var(--app-accent)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-4 font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
              {progress}% complete
            </p>
          </div>
        </section>
      </PageFrame>
    </main>
  );
}
