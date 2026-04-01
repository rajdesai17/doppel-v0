import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { VoiceRecorder } from "../components/voice-recorder";
import { PageFrame, SectionHeading, StatusPill, TopBar } from "../components/chrome";
import { blobToBase64, getUserId } from "../lib/utils";

type Step = "voice" | "situation" | "processing";

const STEP_LABELS = ["Voice", "Context", "Create"];

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("voice");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [situation, setSituation] = useState("");
  const [age, setAge] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState("Analyzing your voice...");

  const currentStepIndex = step === "voice" ? 0 : step === "situation" ? 1 : 2;

  const handleVoiceRecorded = (blob: Blob) => {
    setAudioBlob(blob);
    setStep("situation");
  };

  const handleSubmit = async () => {
    if (!audioBlob || !situation.trim()) return;

    setIsProcessing(true);
    setStep("processing");
    setError(null);

    const messages = [
      "Analyzing your voice...",
      "Creating voice clone...",
      "Building your future persona...",
    ];

    let messageIndex = 0;
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setProcessingMessage(messages[messageIndex]);
    }, 2000);

    try {
      const userId = getUserId();
      const audioBase64 = await blobToBase64(audioBlob);

      const cloneResponse = await fetch(
        `/agents/present-self-agent/${userId}?method=cloneVoice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64 }),
        }
      );

      if (!cloneResponse.ok) {
        throw new Error("Voice cloning failed. Try a clearer recording.");
      }

      const sessionResponse = await fetch(
        `/agents/present-self-agent/${userId}?method=initSession`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            situation: situation.trim(),
            userAge: age,
            yearsAhead: 10,
          }),
        }
      );

      if (!sessionResponse.ok) {
        throw new Error("Session creation failed. Please try again.");
      }

      const { sessionId, persona, agentId, voiceId } = (await sessionResponse.json()) as {
        sessionId: string;
        persona: unknown;
        agentId: string;
        voiceId: string;
      };

      localStorage.setItem(
        `doppel_session_${sessionId}`,
        JSON.stringify({ persona, agentId, voiceId, userId })
      );

      clearInterval(interval);
      navigate(`/conversation/${sessionId}`);
    } catch (caughtError) {
      clearInterval(interval);
      setError((caughtError as Error).message);
      setStep("situation");
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen">
      <TopBar
        left={
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/78 hover:border-white/16 hover:bg-white/[0.08]"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        }
        right={<StatusPill label={`step ${currentStepIndex + 1} of 3`} tone="neutral" />}
      />

      <PageFrame className="pb-16 pt-8 sm:pt-10">
        <section className="surface-card mx-auto max-w-[1160px] rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="mb-8 flex flex-col gap-6 border-b border-white/8 pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow mb-4">Session setup</p>
              <h1 className="font-display text-[clamp(2.2rem,4.5vw,4rem)] text-white">
                A simpler setup flow.
              </h1>
              <p className="mt-4 text-[0.98rem] leading-8 text-[var(--app-muted)]">
                One action at a time, fewer panels, and enough space to read comfortably.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {STEP_LABELS.map((label, index) => (
                <div
                  key={label}
                  className={[
                    "rounded-full border px-4 py-2 text-sm",
                    index === currentStepIndex
                      ? "border-[rgba(217,195,154,0.22)] bg-[rgba(217,195,154,0.12)] text-[var(--app-accent-strong)]"
                      : "border-white/8 bg-white/[0.03] text-white/60",
                  ].join(" ")}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {step === "voice" ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
              <div className="max-w-[420px]">
                <SectionHeading
                  eyebrow="Voice capture"
                  title="Record one clear sample."
                  description="Speak naturally for 30 seconds. You can listen back before continuing."
                />

                <div className="mt-8 rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="mb-3 flex items-center gap-2 text-[var(--app-accent-strong)]">
                    <LockKeyhole className="size-4" />
                    <span className="text-sm font-medium">Private by default</span>
                  </div>
                  <p className="text-sm leading-7 text-[var(--app-muted)]">
                    Your recording is only used to create the voice and session for this flow.
                  </p>
                </div>
              </div>

              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />
            </div>
          ) : null}

          {step === "situation" ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:items-start">
              <div className="max-w-[420px]">
                <SectionHeading
                  eyebrow="Context"
                  title="What are you trying to decide?"
                  description="Write the decision, the tension, and what feels uncertain."
                />

                <p className="mt-6 text-sm leading-7 text-[var(--app-muted)]">
                  Short, specific context works better than long exposition.
                </p>
              </div>

              <div className="space-y-5">
                {error ? (
                  <div className="rounded-[1.4rem] border border-rose-300/16 bg-rose-300/8 px-4 py-4">
                    <p className="text-sm leading-7 text-rose-100">{error}</p>
                  </div>
                ) : null}

                <label className="block">
                  <span className="mb-3 block text-sm font-medium text-white/90">Your age</span>
                  <input
                    type="number"
                    value={age}
                    onChange={(event) => setAge(parseInt(event.target.value, 10) || 25)}
                    min={18}
                    max={80}
                    className="min-h-[3.25rem] w-full rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 text-base text-white outline-none focus:border-[rgba(217,195,154,0.28)] focus:bg-white/[0.06]"
                  />
                </label>

                <label className="block">
                  <span className="mb-3 block text-sm font-medium text-white/90">
                    Your situation
                  </span>
                  <textarea
                    value={situation}
                    onChange={(event) => setSituation(event.target.value)}
                    placeholder="I am deciding whether to stay where I am, or take the risk and build something of my own."
                    rows={7}
                    className="min-h-[240px] w-full rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-base leading-8 text-white outline-none placeholder:text-white/30 focus:border-[rgba(217,195,154,0.28)] focus:bg-white/[0.06]"
                  />
                </label>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="button-lift flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-[1rem] bg-[var(--app-accent)] px-5 py-3 text-sm font-semibold text-[#17130d] hover:bg-[var(--app-accent-strong)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[var(--app-accent)]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating session
                    </>
                  ) : (
                    <>
                      Meet your future self
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}

          {step === "processing" ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="relative mb-10 flex size-36 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(217,195,154,0.18),transparent_72%)] blur-3xl" />
                <div className="absolute inset-3 rounded-full border border-[rgba(217,195,154,0.16)] bg-[rgba(217,195,154,0.07)] animate-breathe" />
                <div
                  className="absolute inset-7 rounded-full border border-[rgba(217,195,154,0.16)] bg-[rgba(217,195,154,0.08)] animate-breathe"
                  style={{ animationDelay: "220ms" }}
                />
                <div className="relative flex size-[4.5rem] items-center justify-center rounded-full bg-[var(--app-accent)] text-[#17130d]">
                  <Loader2 className="size-6 animate-spin" />
                </div>
              </div>

              <p className="eyebrow mb-4">Preparing the conversation</p>
              <h2 className="font-display text-[clamp(2.2rem,4vw,3.8rem)] text-white">
                Building your future self.
              </h2>
              <p className="mt-5 max-w-xl text-[0.98rem] leading-8 text-[var(--app-muted)]">
                {processingMessage}
              </p>
            </div>
          ) : null}
        </section>
      </PageFrame>
    </main>
  );
}
