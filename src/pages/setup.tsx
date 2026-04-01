import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { VoiceRecorder } from "../components/voice-recorder";
import { getUserId, blobToBase64 } from "../lib/utils";

type Step = "voice" | "situation" | "processing";

const STEPS = [
  { id: "voice", label: "Voice" },
  { id: "situation", label: "Context" },
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
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-10 border-b border-[#1a1a1a] bg-black/80 backdrop-blur-xl">
        <Link
          to="/"
          className="font-sans text-[13px] text-[#525252] hover:text-white transition-colors duration-200"
        >
          &larr; Back
        </Link>
        <span className="font-sans text-[13px] font-semibold tracking-[0.15em] text-white/90 uppercase">
          Doppel
        </span>
        <div className="w-12" />
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-[112px] px-6 pb-16">
        {/* Stepper */}
        <div className="flex items-center gap-0 mb-16">
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`size-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-300 ${
                    currentStepIndex === index
                      ? "bg-white text-black"
                      : currentStepIndex > index
                        ? "bg-white/10 text-white"
                        : "bg-[#111] text-[#525252] border border-[#262626]"
                  }`}
                >
                  {currentStepIndex > index ? <Check className="size-3.5" /> : index + 1}
                </div>
                <span
                  className={`font-sans text-[11px] tracking-[0.05em] uppercase transition-colors duration-300 ${
                    currentStepIndex === index
                      ? "text-white"
                      : currentStepIndex > index
                        ? "text-[#666]"
                        : "text-[#404040]"
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {/* Connector */}
              {index < STEPS.length - 1 && (
                <div className="relative w-16 md:w-20 mx-3 mt-[-18px]">
                  <div className="h-px bg-[#1a1a1a]" />
                  <div
                    className="absolute top-0 left-0 h-px bg-white/20 transition-all duration-500"
                    style={{ width: currentStepIndex > index ? "100%" : "0%" }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="w-full max-w-[420px]">
          {/* Step 1: Voice */}
          {step === "voice" && (
            <div className="animate-fade-up">
              <div className="text-center mb-12">
                <h1 className="font-display text-[40px] text-white mb-3 leading-[1.1]">
                  Record your voice
                </h1>
                <p className="font-sans text-[15px] text-[#666] leading-relaxed">
                  Speak naturally for 30 seconds to create your voice clone.
                </p>
              </div>

              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />

              <p className="font-sans text-[12px] text-[#404040] text-center mt-10 leading-relaxed">
                Tip: Read something aloud, recite a quote, or talk about your day.
              </p>
            </div>
          )}

          {/* Step 2: Situation */}
          {step === "situation" && (
            <div className="animate-fade-up">
              <div className="text-center mb-12">
                <h1 className="font-display text-[40px] text-white mb-3 leading-[1.1]">
                  {"What's on your mind?"}
                </h1>
                <p className="font-sans text-[15px] text-[#666] leading-relaxed">
                  {"Describe a decision or crossroads you're facing."}
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 mb-8 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="font-sans text-[13px] text-red-400 leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block font-sans text-[13px] text-[#737373] mb-2 font-medium">
                    Your age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    min={18}
                    max={80}
                    className="w-full h-11 px-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl font-sans text-[15px] text-white focus:outline-none focus:border-[#404040] focus:ring-1 focus:ring-[#404040] transition-all duration-150"
                  />
                </div>

                <div>
                  <label className="block font-sans text-[13px] text-[#737373] mb-2 font-medium">
                    Your situation
                  </label>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="I'm trying to decide whether to leave my job and start my own company..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl font-sans text-[15px] text-white placeholder:text-[#333] focus:outline-none focus:border-[#404040] focus:ring-1 focus:ring-[#404040] resize-none transition-all duration-150 leading-relaxed"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="w-full h-12 flex items-center justify-center gap-2 bg-white text-black font-sans font-medium text-[14px] rounded-xl hover:bg-[#e5e5e5] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all duration-150 mt-2"
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
            <div className="animate-fade-up flex flex-col items-center py-12">
              <div className="relative size-32 mb-12">
                <div className="absolute inset-0 rounded-full bg-[#7C3AED]/10 animate-breathe" />
                <div className="absolute inset-4 rounded-full bg-[#7C3AED]/15 animate-breathe" style={{ animationDelay: "300ms" }} />
                <div className="absolute inset-8 rounded-full bg-[#7C3AED]/25 animate-breathe" style={{ animationDelay: "600ms" }} />
                <div className="absolute inset-[44px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] shadow-[0_0_40px_rgba(124,58,237,0.4)]" />
              </div>

              <p className="font-sans text-[15px] text-[#737373] text-center">
                {processingMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
