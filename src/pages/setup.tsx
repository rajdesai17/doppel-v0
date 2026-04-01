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
  const [processingMessage, setProcessingMessage] = useState("Analyzing your voice...");

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
      "Generating future persona...",
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setProcessingMessage(messages[msgIndex]);
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
        throw new Error("Failed to clone voice");
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
        throw new Error("Failed to create session");
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

      clearInterval(msgInterval);
      navigate(`/conversation/${sessionId}`);
    } catch (e) {
      clearInterval(msgInterval);
      setError((e as Error).message);
      setStep("situation");
      setIsProcessing(false);
    }
  };

  const currentStepIndex = step === "voice" ? 0 : step === "situation" ? 1 : 2;

  return (
    <div className="min-h-screen flex flex-col bg-[rgb(var(--background))]">
      {/* Header */}
      <header className="header">
        <Link to="/" className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="header-logo">DOPPEL</span>
        <div className="w-10" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex items-center justify-center mb-14">
            <StepItem
              number={1}
              label="Voice"
              status={currentStepIndex === 0 ? "active" : "completed"}
            />
            <div className={`step-line ${currentStepIndex >= 1 ? "step-line-active" : ""}`} />
            <StepItem
              number={2}
              label="Situation"
              status={currentStepIndex === 1 ? "active" : currentStepIndex > 1 ? "completed" : "upcoming"}
            />
            <div className={`step-line ${currentStepIndex >= 2 ? "step-line-active" : ""}`} />
            <StepItem
              number={3}
              label="Create"
              status={currentStepIndex === 2 ? "active" : "upcoming"}
            />
          </div>

          {/* Step 1: Voice */}
          {step === "voice" && (
            <div className="animate-fade-up">
              <div className="text-center mb-10">
                <h1 className="text-title text-[rgb(var(--foreground))] mb-3">
                  Record your voice
                </h1>
                <p className="text-body">
                  Speak naturally for 30 seconds
                </p>
              </div>

              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />

              <p className="text-caption text-center mt-10">
                Tip: Read something aloud or talk about your day.
              </p>
            </div>
          )}

          {/* Step 2: Situation */}
          {step === "situation" && (
            <div className="animate-fade-up">
              <div className="text-center mb-10">
                <h1 className="text-title text-[rgb(var(--foreground))] mb-3">
                  What&apos;s on your mind?
                </h1>
                <p className="text-body">
                  Describe a decision, crossroads, or question you&apos;re facing.
                </p>
              </div>

              {error && (
                <div className="p-4 mb-6 rounded-lg bg-[rgb(var(--error)/0.1)] border border-[rgb(var(--error)/0.2)]">
                  <p className="text-sm text-[rgb(var(--error))]">{error}</p>
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm text-[rgb(var(--text-secondary))] mb-2 font-medium">
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
                  <label className="block text-sm text-[rgb(var(--text-secondary))] mb-2 font-medium">
                    Your situation
                  </label>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="Describe your situation here. What are you struggling with? What is your crossroads?"
                    rows={5}
                    className="input resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="w-full btn btn-primary h-14 text-base disabled:opacity-40"
                >
                  Meet your future self
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="animate-fade-up flex flex-col items-center pt-8">
              {/* Processing orb */}
              <div className="processing-orb mb-10">
                <div className="processing-orb-ring processing-orb-ring-1" />
                <div className="processing-orb-ring processing-orb-ring-2" />
                <div className="processing-orb-ring processing-orb-ring-3" />
                <div className="processing-orb-core" />
              </div>

              <p className="text-body text-center">
                {processingMessage}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StepItem({
  number,
  label,
  status,
}: {
  number: number;
  label: string;
  status: "active" | "completed" | "upcoming";
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`step-circle ${
          status === "active"
            ? "step-circle-active"
            : status === "completed"
              ? "step-circle-completed"
              : "step-circle-upcoming"
        }`}
      >
        {status === "completed" ? <Check className="size-4" /> : number}
      </div>
      <span
        className={`step-label ${
          status === "active" ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--text-tertiary))]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
