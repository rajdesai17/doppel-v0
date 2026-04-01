import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { VoiceRecorder } from "../components/voice-recorder";
import { getUserId, blobToBase64 } from "../lib/utils";

type Step = "voice" | "situation" | "processing";

const STEPS = [
  { id: "voice", label: "Voice" },
  { id: "situation", label: "Situation" },
  { id: "processing", label: "Create" },
] as const;

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
    <main className="min-h-screen flex flex-col bg-black">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-12 border-b border-[#1C1C1C] bg-black">
        <Link
          to="/"
          className="font-sans text-[13px] text-[#555] hover:text-white transition-colors duration-200"
        >
          ← back
        </Link>
        <span className="font-sans text-[13px] font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
        <div className="w-12" />
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-[120px] px-6 pb-16">
        {/* Stepper */}
        <div className="flex items-start justify-center mb-16">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-start">
              {/* Step Node */}
              <div className="flex flex-col items-center">
                <div
                  className={`size-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                    currentStepIndex === index
                      ? "bg-[#7C3AED] text-white"
                      : currentStepIndex > index
                      ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                      : "bg-[#1C1C1C] text-[#555] border border-[#2a2a2a]"
                  }`}
                >
                  {currentStepIndex > index ? <Check className="size-4" /> : index + 1}
                </div>
                <span
                  className={`font-sans text-[11px] tracking-[0.05em] uppercase mt-2 ${
                    currentStepIndex === index ? "text-[#7C3AED]" : "text-[#444]"
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < STEPS.length - 1 && (
                <div
                  className={`w-[72px] h-[1px] mt-[18px] mx-2 ${
                    currentStepIndex > index ? "bg-[#7C3AED]" : "bg-[#2a2a2a]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="w-full max-w-[400px]">
          {/* Step 1: Voice */}
          {step === "voice" && (
            <div className="animate-fade-up">
              <div className="text-center mb-14">
                <h1 className="font-display text-[40px] font-normal text-white mb-3">
                  Record your voice
                </h1>
                <p className="font-sans text-[15px] text-[#555]">
                  Speak naturally for 30 seconds
                </p>
              </div>

              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />

              <p className="font-sans text-[12px] text-[#444] text-center mt-10">
                Tip: Read something aloud or talk about your day.
              </p>
            </div>
          )}

          {/* Step 2: Situation */}
          {step === "situation" && (
            <div className="animate-fade-up">
              <div className="text-center mb-14">
                <h1 className="font-display text-[40px] font-normal text-white mb-3">
                  {"What's on your mind?"}
                </h1>
                <p className="font-sans text-[15px] text-[#555]">
                  {"Describe a decision, crossroads, or question you're facing."}
                </p>
              </div>

              {error && (
                <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-6">
                <div>
                  <label className="block font-sans text-sm text-[#666] mb-3 font-medium">
                    Your age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    min={18}
                    max={80}
                    className="w-full h-12 px-4 bg-[#111] border border-[#222] rounded-xl font-sans text-white focus:outline-none focus:border-[#7C3AED] transition-colors duration-150"
                  />
                </div>

                <div>
                  <label className="block font-sans text-sm text-[#666] mb-3 font-medium">
                    Your situation
                  </label>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="Describe your situation here. What are you struggling with? What is your crossroads?"
                    rows={5}
                    className="w-full px-4 py-3 bg-[#111] border border-[#222] rounded-xl font-sans text-white placeholder:text-[#444] focus:outline-none focus:border-[#7C3AED] resize-none transition-colors duration-150"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="w-full h-14 flex items-center justify-center gap-2 bg-[#7C3AED] text-white font-sans font-medium text-[15px] rounded-xl hover:bg-[#6D28D9] hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(124,58,237,0.35)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none transition-all duration-150 mt-2"
                >
                  Meet your future self
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <div className="animate-fade-up flex flex-col items-center py-12">
              {/* Processing orb */}
              <div className="relative size-[140px] mb-12">
                <div className="absolute inset-0 rounded-full bg-[#7C3AED] opacity-[0.12] animate-breathe" />
                <div className="absolute inset-5 rounded-full bg-[#7C3AED] opacity-20 animate-breathe" style={{ animationDelay: "300ms" }} />
                <div className="absolute inset-10 rounded-full bg-[#7C3AED] opacity-[0.35] animate-breathe" style={{ animationDelay: "600ms" }} />
                <div className="absolute inset-[50px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] shadow-[0_0_50px_rgba(124,58,237,0.5)]" />
              </div>

              <p className="font-sans text-lg text-[#999] text-center">
                {processingMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
