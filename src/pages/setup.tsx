import { Fragment, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  Loader2,
  Mic,
  Search,
  Sparkles,
} from "lucide-react";
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
  const [userContext, setUserContext] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  const currentStep =
    step === "voice" ? 1 : step === "situation" ? 2 : 3;

  const handleVoiceRecorded = (blob: Blob) => {
    setAudioBlob(blob);
    setStep("situation");
  };

  const hasContext = userContext.trim().length > 0;

  const processingSteps = [
    { icon: AudioLines, label: "Analyzing voice patterns" },
    { icon: Mic, label: "Creating voice clone" },
    ...(hasContext ? [{ icon: Search, label: "Researching your field" }] : []),
    { icon: Sparkles, label: "Generating future persona" },
  ];

  const handleSubmit = async () => {
    if (!audioBlob || !situation.trim()) return;

    setIsProcessing(true);
    setStep("processing");
    setError(null);
    setActiveStep(0);

    try {
      const userId = getUserId();

      // Step 0: Analyzing voice
      const audioBase64 = await blobToBase64(audioBlob);
      setActiveStep(1);

      // Step 1: Creating voice clone
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

      // Step 2 (or final): Research + persona generation happen server-side
      setActiveStep(2);

      // If we have userContext, show the research step briefly before persona step
      if (hasContext) {
        // Research + persona happen in one API call; simulate the sub-step
        setTimeout(() => setActiveStep(3), 4000);
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
            userContext: userContext.trim() || undefined,
          }),
        }
      );

      if (!sessionResponse.ok) {
        throw new Error("Session creation failed. Please try again.");
      }

      // All steps complete
      setActiveStep(processingSteps.length);

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

      navigate(`/conversation/${sessionId}`);
    } catch (caughtError) {
      setError((caughtError as Error).message);
      setStep("situation");
      setIsProcessing(false);
      setActiveStep(0);
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
                        About you{" "}
                        <span className="font-normal text-muted-foreground">
                          (optional)
                        </span>
                      </label>
                      <Textarea
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        placeholder="e.g. I'm a backend developer at a fintech startup, 4 years in tech..."
                        rows={3}
                        maxLength={500}
                        className="resize-none"
                      />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Your role, industry, or background — helps make your
                        future self more realistic
                      </p>
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
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm"
            >
              <div className="mb-8 text-center">
                <h2 className="text-xl font-semibold tracking-tight">
                  Building your future self
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  This usually takes about 30 seconds
                </p>
              </div>

              <div className="rounded-xl border border-border/50 bg-card p-5">
                <div className="flex flex-col gap-4">
                  {processingSteps.map((s, i) => {
                    const isComplete = i < activeStep;
                    const isActive = i === activeStep;
                    const isPending = i > activeStep;
                    const Icon = s.icon;

                    return (
                      <motion.div
                        key={s.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full transition-all duration-500",
                            isComplete &&
                              "bg-foreground text-background",
                            isActive &&
                              "border-2 border-foreground bg-foreground/5",
                            isPending && "border border-border"
                          )}
                        >
                          {isComplete ? (
                            <Check className="size-3.5" />
                          ) : isActive ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Icon
                              className={cn(
                                "size-3.5",
                                isPending && "text-muted-foreground/50"
                              )}
                            />
                          )}
                        </div>

                        <span
                          className={cn(
                            "text-sm transition-colors duration-300",
                            isComplete && "text-muted-foreground",
                            isActive && "font-medium text-foreground",
                            isPending && "text-muted-foreground/50"
                          )}
                        >
                          {s.label}
                          {isActive && (
                            <span className="ml-1 inline-block h-3.5 w-px animate-pulse bg-foreground align-middle" />
                          )}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
