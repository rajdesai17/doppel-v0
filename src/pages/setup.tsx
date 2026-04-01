import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header - same as landing */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-[#1a1a1a]">
        <Link to="/" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <span className="font-mono text-sm font-medium tracking-[0.2em] text-white uppercase">
          DOPPEL
        </span>
        <div className="w-5" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px]">
          {/* Step Indicator */}
          <nav className="flex items-start justify-center mb-16">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStepIndex === 0
                    ? "bg-[#7C3AED] text-white"
                    : currentStepIndex > 0
                    ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                    : "bg-[#222] text-white"
                }`}
              >
                {currentStepIndex > 0 ? <Check className="size-4" /> : 1}
              </div>
              <span
                className={`text-[13px] mt-3 ${
                  currentStepIndex === 0 ? "text-[#7C3AED]" : "text-zinc-500"
                }`}
              >
                Voice
              </span>
            </div>

            {/* Connector */}
            <div className={`w-[60px] h-[2px] mt-[18px] mx-2 ${
              currentStepIndex >= 1 ? "bg-[#7C3AED]" : "bg-[#333]"
            }`} />

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStepIndex === 1
                    ? "bg-[#7C3AED] text-white"
                    : currentStepIndex > 1
                    ? "bg-[#7C3AED]/20 text-[#7C3AED]"
                    : "bg-[#222] text-white"
                }`}
              >
                {currentStepIndex > 1 ? <Check className="size-4" /> : 2}
              </div>
              <span
                className={`text-[13px] mt-3 ${
                  currentStepIndex === 1 ? "text-[#7C3AED]" : "text-zinc-500"
                }`}
              >
                Situation
              </span>
            </div>

            {/* Connector */}
            <div className={`w-[60px] h-[2px] mt-[18px] mx-2 ${
              currentStepIndex >= 2 ? "bg-[#7C3AED]" : "bg-[#333]"
            }`} />

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStepIndex === 2
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#222] text-white"
                }`}
              >
                3
              </div>
              <span
                className={`text-[13px] mt-3 ${
                  currentStepIndex === 2 ? "text-[#7C3AED]" : "text-zinc-500"
                }`}
              >
                Create
              </span>
            </div>
          </nav>

          {/* Step 1: Voice */}
          {step === "voice" && (
            <div className="animate-fade-up">
              <div className="text-center mb-12">
                <h1 className="text-[32px] font-semibold text-white mb-3">
                  Record your voice
                </h1>
                <p className="text-base text-[#666]">
                  Speak naturally for 30 seconds
                </p>
              </div>

              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />

              <p className="text-[13px] text-[#555] text-center mt-12">
                Tip: Read something aloud or talk about your day.
              </p>
            </div>
          )}

          {/* Step 2: Situation */}
          {step === "situation" && (
            <div className="animate-fade-up">
              <div className="text-center mb-12">
                <h1 className="text-[32px] font-semibold text-white mb-3">
                  What&apos;s on your mind?
                </h1>
                <p className="text-base text-[#666]">
                  Describe a decision, crossroads, or question you&apos;re facing.
                </p>
              </div>

              {error && (
                <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-3 font-medium">
                    Your age
                  </label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                    min={18}
                    max={80}
                    className="w-full h-12 px-4 bg-[#111] border border-[#222] rounded-xl text-white focus:outline-none focus:border-[#7C3AED] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-3 font-medium">
                    Your situation
                  </label>
                  <textarea
                    value={situation}
                    onChange={(e) => setSituation(e.target.value)}
                    placeholder="Describe your situation here. What are you struggling with? What is your crossroads?"
                    rows={5}
                    className="w-full px-4 py-3 bg-[#111] border border-[#222] rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#7C3AED] resize-none transition-colors"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!situation.trim() || isProcessing}
                  className="w-full h-14 flex items-center justify-center gap-2 bg-[#7C3AED] text-white font-medium rounded-[14px] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-2"
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
              <div className="relative w-[140px] h-[140px] mb-12">
                <div className="absolute inset-0 rounded-full bg-[#7C3AED] opacity-10 animate-pulse" />
                <div className="absolute inset-5 rounded-full bg-[#7C3AED] opacity-20 animate-pulse" style={{ animationDelay: "300ms" }} />
                <div className="absolute inset-10 rounded-full bg-[#7C3AED] opacity-30 animate-pulse" style={{ animationDelay: "600ms" }} />
                <div className="absolute inset-[50px] rounded-full bg-gradient-to-br from-[#7C3AED] to-[#8B5CF6] shadow-[0_0_50px_rgba(124,58,237,0.5)]" />
              </div>

              <p className="text-lg text-zinc-300 text-center">
                {processingMessage}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
