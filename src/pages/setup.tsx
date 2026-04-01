import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { VoiceRecorder } from "../components/voice-recorder";
import { getUserId, blobToBase64 } from "../lib/utils";

type Step = "voice" | "situation" | "processing";

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("voice");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [situation, setSituation] = useState("");
  const [age, setAge] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVoiceRecorded = (blob: Blob) => {
    setAudioBlob(blob);
    setStep("situation");
  };

  const handleSubmit = async () => {
    if (!audioBlob || !situation.trim()) return;

    setIsProcessing(true);
    setStep("processing");
    setError(null);

    try {
      const userId = getUserId();
      const audioBase64 = await blobToBase64(audioBlob);

      // Step 1: Clone voice
      const cloneResponse = await fetch(
        `/agents/present-self-agent/${userId}?method=cloneVoice`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audioBase64 }),
        }
      );

      if (!cloneResponse.ok) {
        throw new Error("Failed to clone voice");
      }

      // Step 2: Initialize session with persona
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
        throw new Error("Failed to create session");
      }

      const { sessionId } = await sessionResponse.json();

      // Navigate to conversation
      navigate(`/conversation/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setStep("situation");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <div className="font-mono text-sm tracking-widest text-zinc-400">
          DOPPEL
        </div>
        <div className="w-16" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-12">
            <StepIndicator
              number={1}
              label="Voice"
              active={step === "voice"}
              completed={step !== "voice"}
            />
            <div className="w-12 h-px bg-zinc-800" />
            <StepIndicator
              number={2}
              label="Situation"
              active={step === "situation"}
              completed={step === "processing"}
            />
            <div className="w-12 h-px bg-zinc-800" />
            <StepIndicator
              number={3}
              label="Create"
              active={step === "processing"}
              completed={false}
            />
          </div>

          {/* Step 1: Voice Recording */}
          {step === "voice" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-semibold text-zinc-50 text-center mb-2">
                Record your voice
              </h2>
              <p className="text-zinc-400 text-center mb-8">
                Speak naturally for 30 seconds. This creates your voice clone.
              </p>
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecorded}
                duration={30}
              />
              <p className="text-xs text-zinc-500 text-center mt-6">
                Tip: Read something aloud — a paragraph, your favorite quote, or
                just talk about your day.
              </p>
            </div>
          )}

          {/* Step 2: Situation Input */}
          {step === "situation" && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-semibold text-zinc-50 text-center mb-2">
                What&apos;s on your mind?
              </h2>
              <p className="text-zinc-400 text-center mb-8">
                Describe a decision, crossroads, or question you&apos;re facing.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Your age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    min={18}
                    max={80}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">
                    Your situation
                  </label>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="I'm trying to decide whether to leave my job and start my own company. It feels risky, but I can't stop thinking about it..."
                    rows={5}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="w-full flex items-center justify-center gap-2 bg-zinc-50 text-zinc-950 px-6 py-4 rounded-lg font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Creating your future self...
                    </>
                  ) : (
                    <>
                      Meet your future self
                      <ArrowRight className="size-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="animate-fade-in text-center">
              <div className="size-16 mx-auto mb-6 rounded-full bg-zinc-800 flex items-center justify-center">
                <Loader2 className="size-8 text-violet-400 animate-spin" />
              </div>
              <h2 className="text-2xl font-semibold text-zinc-50 mb-2">
                Forming your future self
              </h2>
              <p className="text-zinc-400">
                Cloning voice, generating persona, preparing conversation...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
          active
            ? "bg-violet-600 text-white"
            : completed
              ? "bg-zinc-700 text-zinc-300"
              : "bg-zinc-800 text-zinc-500"
        }`}
      >
        {number}
      </div>
      <span
        className={`text-xs ${active ? "text-zinc-50" : "text-zinc-500"}`}
      >
        {label}
      </span>
    </div>
  );
}
