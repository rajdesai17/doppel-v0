import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceRecorder } from "../components/voice-recorder";
import { getUserId, blobToBase64 } from "../lib/utils";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { PageLayout, PageHeader, ProcessingOrb } from "../components/ui";

type Step = "voice" | "situation" | "processing";

const spring = { type: "spring", stiffness: 100, damping: 20 };

export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("voice");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [situation, setSituation] = useState("");
  const [age, setAge] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState(
    "Analyzing your voice..."
  );

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

      const { sessionId, persona, agentId, voiceId } =
        (await sessionResponse.json()) as {
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

  return (
    <PageLayout>
      <AnimatePresence mode="wait">
        {/* Step 1: Voice Recording */}
        {step === "voice" && (
          <motion.section
            key="voice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
            className="flex flex-col items-center text-center"
          >
            <PageHeader
              title="Record your voice"
              subtitle="Speak naturally for 30 seconds to create your clone."
              animated={false}
              className="mb-16"
            />
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecorded}
              duration={30}
            />
          </motion.section>
        )}

        {/* Step 2: Situation */}
        {step === "situation" && (
          <motion.section
            key="situation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring}
            className="flex flex-col items-center w-full max-w-md text-center"
          >
            <PageHeader
              title="What's on your mind?"
              subtitle="Describe a decision or crossroads you're facing."
              animated={false}
              className="mb-12"
            />

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-white/60 mb-6 p-4 bg-white/5 rounded-lg border border-white/10 w-full"
              >
                {error}
              </motion.p>
            )}

            {/* Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="w-full flex flex-col gap-6 mb-8"
            >
              <div className="text-left">
                <Label htmlFor="age" className="text-white/50 mb-2 block">
                  Your age
                </Label>
                <Input
                  id="age"
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                  min={18}
                  max={80}
                />
              </div>

              <div className="text-left">
                <Label htmlFor="situation" className="text-white/50 mb-2 block">
                  Your situation
                </Label>
                <Textarea
                  id="situation"
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="I'm trying to decide whether to leave my job and start my own company..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={!situation.trim() || isProcessing}
                size="lg"
                className="rounded-full px-8 mx-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>Meet your future self</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </form>
          </motion.section>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <ProcessingOrb key="processing" message={processingMessage} />
        )}
      </AnimatePresence>
    </PageLayout>
  );
}
