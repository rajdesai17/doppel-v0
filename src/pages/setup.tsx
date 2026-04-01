import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
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

      const { sessionId, persona, agentId, voiceId } = (await sessionResponse.json()) as { sessionId: string; persona: any; agentId: string; voiceId: string };

      // Save session data for conversation page
      localStorage.setItem(`doppel_session_${sessionId}`, JSON.stringify({
        persona,
        agentId,
        voiceId,
        userId,
      }));

      navigate(`/conversation/${sessionId}`);
    } catch (e) {
      setError((e as Error).message);
      setStep("situation");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="header">
        <Link
          to="/"
          className="btn-ghost flex items-center gap-2"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Back</span>
        </Link>
        <span className="header-logo">DOPPEL</span>
        <div className="w-16" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <StepIndicator
              number={1}
              label="Voice"
              active={step === "voice"}
              completed={step !== "voice"}
            />
            <div className="w-8 h-px bg-surface-2" />
            <StepIndicator
              number={2}
              label="Context"
              active={step === "situation"}
              completed={step === "processing"}
            />
            <div className="w-8 h-px bg-surface-2" />
            <StepIndicator
              number={3}
              label="Create"
              active={step === "processing"}
              completed={false}
            />
          </div>

          {/* Step 1: Voice Recording */}
          {step === "voice" && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="text-title text-foreground mb-2">
                  Record your voice
                </h2>
                <p className="text-body">
                  Speak naturally for 30 seconds to create your voice clone.
                </p>
              </div>
              
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecorded}
                duration={30}
              />
              
              <p className="text-caption text-center mt-8">
                Tip: Read something aloud or talk about your day.
              </p>
            </div>
          )}

          {/* Step 2: Situation Input */}
          {step === "situation" && (
            <div className="animate-fade-up">
              <div className="text-center mb-8">
                <h2 className="text-title text-foreground mb-2">
                  {"What's on your mind?"}
                </h2>
                <p className="text-body">
                  Describe a decision or question {"you're"} facing.
                </p>
              </div>

              {error && (
                <div className="surface p-4 mb-6 border-error/20 bg-error/5">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-text-secondary mb-2 font-medium">
                    Your age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    min={18}
                    max={80}
                    className="input"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-2 font-medium">
                    Your situation
                  </label>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="I'm trying to decide whether to leave my job and start my own company..."
                    rows={5}
                    className="input resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="w-full btn btn-primary h-12 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating...
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
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="animate-fade-up text-center">
              {/* Animated loader */}
              <div className="relative size-20 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full bg-surface-1 animate-breathe" />
                <div className="absolute inset-2 rounded-full bg-surface-2 animate-breathe" style={{ animationDelay: "150ms" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="size-6 text-text-secondary animate-spin" />
                </div>
              </div>
              
              <h2 className="text-title text-foreground mb-2">
                Creating your future self
              </h2>
              <p className="text-body">
                Cloning voice, generating persona...
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
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`
          size-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200
          ${active 
            ? "bg-foreground text-background" 
            : completed 
              ? "bg-surface-2 text-text-secondary" 
              : "bg-surface-1 text-text-muted"
          }
        `}
      >
        {completed ? <Check className="size-4" /> : number}
      </div>
      <span className={`text-xs font-medium ${active ? "text-foreground" : "text-text-tertiary"}`}>
        {label}
      </span>
    </div>
  );
}
