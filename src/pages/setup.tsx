import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceRecorder } from "../components/voice-recorder";
import { getUserId, blobToBase64 } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>
          <span className="text-sm font-medium tracking-tight">DOPPEL</span>
          <div className="w-16" />
        </div>
      </header>

      {/* Progress Steps */}
      <div className="fixed inset-x-0 top-14 z-40 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-md items-center justify-center gap-8 px-6">
          <StepIndicator step={1} label="Voice" active={step === "voice"} completed={step !== "voice"} />
          <div className="h-px w-8 bg-border" />
          <StepIndicator step={2} label="Details" active={step === "situation"} completed={step === "processing"} />
          <div className="h-px w-8 bg-border" />
          <StepIndicator step={3} label="Create" active={step === "processing"} completed={false} />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-32 pb-12">
        <AnimatePresence mode="wait">
          {/* Step 1: Voice Recording */}
          {step === "voice" && (
            <motion.div
              key="voice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex w-full max-w-md flex-col items-center"
            >
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-2xl font-semibold tracking-tight">Record your voice</h1>
                <p className="text-sm text-muted-foreground">
                  Speak naturally for 30 seconds to create your voice clone
                </p>
              </div>
              <VoiceRecorder onRecordingComplete={handleVoiceRecorded} duration={30} />
            </motion.div>
          )}

          {/* Step 2: Situation Details */}
          {step === "situation" && (
            <motion.div
              key="situation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <Card className="border-border/50">
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">Tell us about yourself</CardTitle>
                  <CardDescription>
                    Describe a decision or crossroads you&apos;re facing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSubmit();
                    }}
                    className="flex flex-col gap-5"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="age">Your current age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value) || 25)}
                        min={18}
                        max={80}
                        className="h-10"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="situation">Your situation</Label>
                      <Textarea
                        id="situation"
                        value={situation}
                        onChange={(e) => setSituation(e.target.value)}
                        placeholder="I'm trying to decide whether to leave my job and start my own company..."
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={!situation.trim() || isProcessing}
                      size="lg"
                      className="mt-2 h-11 w-full gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" data-icon="inline-start" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Meet your future self
                          <ArrowRight data-icon="inline-end" />
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Processing */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-border bg-secondary">
                <Loader2 className="size-6 animate-spin text-foreground" />
              </div>
              <h2 className="mb-2 text-lg font-medium">{processingMessage}</h2>
              <p className="text-sm text-muted-foreground">
                This usually takes about 30 seconds
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function StepIndicator({ 
  step, 
  label, 
  active, 
  completed 
}: { 
  step: number; 
  label: string; 
  active: boolean; 
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
          completed
            ? "bg-foreground text-background"
            : active
            ? "border-2 border-foreground text-foreground"
            : "border border-border text-muted-foreground"
        }`}
      >
        {completed ? <Check className="size-3" /> : step}
      </div>
      <span className={`text-xs ${active || completed ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}
