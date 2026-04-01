import { Fragment, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "../components/voice-recorder";
import { blobToBase64, cn, getUserId } from "../lib/utils";

type Step = "voice" | "situation" | "processing";

const STEP_LABELS = ["Voice", "Details", "Create"];

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

  const currentStep =
    step === "voice" ? 1 : step === "situation" ? 2 : 3;

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
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft data-icon="inline-start" />
              Back
            </Link>
          </Button>
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Step indicator */}
      <div className="fixed inset-x-0 top-14 z-50 flex h-12 items-center justify-center border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-8">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            return (
              <Fragment key={label}>
                {i > 0 && <div className="h-px w-8 bg-border" />}
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      isCompleted &&
                        "bg-foreground text-background",
                      isActive && "border-2 border-foreground",
                      !isActive &&
                        !isCompleted &&
                        "border border-border"
                    )}
                  >
                    {isCompleted && <Check className="size-3" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs",
                      isActive || isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pt-[6.5rem] pb-12">
        <AnimatePresence mode="wait">
          {step === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md text-center"
            >
              <h2 className="mb-2 text-2xl font-semibold tracking-tight">
                Record your voice
              </h2>
              <p className="mb-8 text-sm text-muted-foreground">
                Speak naturally for 30 seconds to create your voice clone
              </p>
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecorded}
                duration={30}
              />
            </motion.div>
          )}

          {step === "situation" && (
            <motion.div
              key="situation"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <Card className="border-border/50">
                <CardHeader className="text-center">
                  <CardTitle>Tell us about yourself</CardTitle>
                  <CardDescription>
                    Describe a decision or crossroads you're facing
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-col gap-5">
                    {error && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Your current age
                      </label>
                      <Input
                        type="number"
                        value={age}
                        onChange={(e) =>
                          setAge(parseInt(e.target.value, 10) || 25)
                        }
                        min={18}
                        max={80}
                        className="h-10 max-w-[100px]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Your situation
                      </label>
                      <Textarea
                        value={situation}
                        onChange={(e) => setSituation(e.target.value)}
                        placeholder="I'm deciding whether to leave my job and start something on my own..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      size="lg"
                      className="mt-2 h-11 w-full gap-2"
                      onClick={handleSubmit}
                      disabled={!situation.trim() || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Meet your future self
                          <ArrowRight data-icon="inline-end" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex size-16 items-center justify-center rounded-full border border-border bg-secondary">
                <Loader2 className="size-6 animate-spin" />
              </div>
              <p className="mt-6 text-lg font-medium">
                {processingMessage}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This usually takes about 30 seconds
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
