import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceRecorder } from "../components/voice-recorder";
import { getUserId, blobToBase64 } from "../lib/utils";

type Step = "voice" | "situation" | "processing";

const STEPS = [
  { id: "voice", label: "Voice" },
  { id: "situation", label: "Context" },
  { id: "processing", label: "Create" },
] as const;

const spring = { type: "spring", stiffness: 100, damping: 20 };

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
    <main className="min-h-screen flex flex-col bg-[#020202] relative">
      {/* Subtle radial glow */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, oklch(0.7 0.1 250 / 0.05) 0%, transparent 60%)",
        }}
      />

      {/* Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-10 border-b border-white/[0.04] bg-[#020202]/80 backdrop-blur-xl"
      >
        <Link
          to="/"
          className="font-sans text-[13px] text-white/40 hover:text-white transition-colors duration-300"
        >
          &larr; Back
        </Link>
        <span className="font-mono text-[12px] font-medium tracking-[0.2em] text-white/70 uppercase">
          Doppel
        </span>
        <div className="w-12" />
      </motion.nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center pt-[112px] px-6 pb-16 relative z-10">
        {/* Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.1 }}
          className="flex items-center gap-0 mb-16"
        >
          {STEPS.map((s, index) => (
            <div key={s.id} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2">
                <motion.div
                  animate={{
                    scale: currentStepIndex === index ? 1.1 : 1,
                    backgroundColor:
                      currentStepIndex === index
                        ? "oklch(0.7 0.1 250)"
                        : currentStepIndex > index
                          ? "rgba(255, 255, 255, 0.1)"
                          : "rgba(255, 255, 255, 0.03)",
                  }}
                  transition={spring}
                  className={`size-8 rounded-full flex items-center justify-center text-[12px] font-medium border ${
                    currentStepIndex === index
                      ? "border-transparent text-white shadow-[0_0_20px_oklch(0.7_0.1_250_/_0.4)]"
                      : currentStepIndex > index
                        ? "border-transparent text-white"
                        : "border-white/[0.06] text-white/30"
                  }`}
                >
                  {currentStepIndex > index ? <Check className="size-3.5" /> : index + 1}
                </motion.div>
                <span
                  className={`font-mono text-[10px] tracking-[0.1em] uppercase transition-colors duration-300 ${
                    currentStepIndex === index
                      ? "text-white"
                      : currentStepIndex > index
                        ? "text-white/40"
                        : "text-white/20"
                  }`}
                >
                  {s.label}
                </span>
              </div>

              {/* Connector */}
              {index < STEPS.length - 1 && (
                <div className="relative w-16 md:w-20 mx-3 mt-[-18px]">
                  <div className="h-px bg-white/[0.06]" />
                  <motion.div
                    animate={{ width: currentStepIndex > index ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-px bg-[oklch(0.7_0.1_250)]"
                    style={{ boxShadow: "0 0 8px oklch(0.7 0.1 250 / 0.5)" }}
                  />
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Step content */}
        <div className="w-full max-w-[420px]">
          <AnimatePresence mode="wait">
            {/* Step 1: Voice */}
            {step === "voice" && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={spring}
              >
                <div className="text-center mb-12">
                  <h1 className="font-display text-[40px] text-white mb-3 leading-[1.1] text-glow">
                    Record your voice
                  </h1>
                  <p className="font-sans text-[15px] text-white/40 leading-relaxed">
                    Speak naturally for 30 seconds to create your voice clone.
                  </p>
                </div>

                <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />

                <p className="font-mono text-[11px] text-white/20 text-center mt-10 leading-relaxed">
                  Tip: Read something aloud, recite a quote, or talk about your day.
                </p>
              </motion.div>
            )}

            {/* Step 2: Situation */}
            {step === "situation" && (
              <motion.div
                key="situation"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={spring}
              >
                <div className="text-center mb-12">
                  <h1 className="font-display text-[40px] text-white mb-3 leading-[1.1] text-glow">
                    {"What's on your mind?"}
                  </h1>
                  <p className="font-sans text-[15px] text-white/40 leading-relaxed">
                    {"Describe a decision or crossroads you're facing."}
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 p-4 mb-8 rounded-xl bg-red-500/5 border border-red-500/10"
                  >
                    <p className="font-sans text-[13px] text-red-400 leading-relaxed">{error}</p>
                  </motion.div>
                )}

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block font-mono text-[11px] text-white/40 mb-2 tracking-[0.05em] uppercase">
                      Your age
                    </label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                      min={18}
                      max={80}
                      className="w-full h-11 px-4 bg-white/[0.02] border border-white/[0.06] rounded-xl font-sans text-[15px] text-white focus:outline-none focus:border-[oklch(0.7_0.1_250_/_0.5)] focus:ring-1 focus:ring-[oklch(0.7_0.1_250_/_0.3)] transition-all duration-300"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] text-white/40 mb-2 tracking-[0.05em] uppercase">
                      Your situation
                    </label>
                    <textarea
                      value={situation}
                      onChange={(e) => setSituation(e.target.value)}
                      placeholder="I'm trying to decide whether to leave my job and start my own company..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.06] rounded-xl font-sans text-[15px] text-white placeholder:text-white/20 focus:outline-none focus:border-[oklch(0.7_0.1_250_/_0.5)] focus:ring-1 focus:ring-[oklch(0.7_0.1_250_/_0.3)] resize-none transition-all duration-300 leading-relaxed"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!situation.trim() || isProcessing}
                    className="glass-button w-full h-12 flex items-center justify-center gap-2 text-white font-sans font-medium text-[14px] rounded-full disabled:opacity-30 disabled:cursor-not-allowed mt-2"
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
              </motion.div>
            )}

            {/* Step 3: Processing */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={spring}
                className="flex flex-col items-center py-12"
              >
                {/* Neural pulse blob */}
                <div className="relative size-40 mb-12">
                  <div className="absolute inset-0 neural-blob neural-blob-active" />
                  <div className="absolute inset-4 neural-blob neural-blob-active" style={{ animationDelay: "-2s" }} />
                  <div className="absolute inset-8 neural-blob neural-blob-active" style={{ animationDelay: "-4s" }} />
                </div>

                <p className="font-mono text-[13px] text-white/40 text-center animate-glitch">
                  {processingMessage}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
