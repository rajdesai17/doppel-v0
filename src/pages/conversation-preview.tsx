import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PhoneOff, Mic, MicOff, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";

const MOCK_TRANSCRIPT = [
  { speaker: "future" as const, text: "Hey. It's strange hearing my own voice like this, but... here we are. Ten years from now. What's on your mind?" },
  { speaker: "user" as const, text: "I've been thinking about whether I should leave my job and start something on my own. It terrifies me." },
  { speaker: "future" as const, text: "I remember that fear. Vividly. The sleepless nights, the spreadsheets trying to make the numbers work. But I want you to know something — the fear doesn't go away. You just learn to walk alongside it." },
  { speaker: "user" as const, text: "So you did it? You actually left?" },
  { speaker: "future" as const, text: "I did. Not right away. I gave myself six months to prepare, saved up a runway, and started building on the side. The leap wasn't blind — it was calculated. And honestly? The hardest part wasn't the risk. It was telling people." },
];

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function ConversationPreviewPage() {
  const navigate = useNavigate();
  const [isMuted, setIsMuted] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<"user" | "future" | null>("future");

  // Cycle active speaker for demo
  const cycleSpeaker = () => {
    setActiveSpeaker((prev) =>
      prev === "future" ? "user" : prev === "user" ? null : "future"
    );
  };

  return (
    <div className="flex h-screen flex-col bg-background lg:flex-row">
      {/* Main conversation area */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Back link */}
        <div className="absolute left-6 top-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft data-icon="inline-start" />
            Back
          </Button>
        </div>

        {/* Preview badge */}
        <Badge variant="outline" className="mb-6 border-dashed text-muted-foreground">
          Preview Mode
        </Badge>

        {/* Status */}
        <div className="mb-8 flex items-center gap-3">
          <div className="size-2 rounded-full bg-green-500" />
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {formatTime(247)}
          </span>
        </div>

        {/* Central visual - breathing circle */}
        <button
          onClick={cycleSpeaker}
          className={cn(
            "mb-8 flex size-32 cursor-pointer items-center justify-center rounded-full border transition-all duration-500",
            activeSpeaker === "future"
              ? "scale-110 border-foreground/50 bg-foreground/5"
              : activeSpeaker === "user"
                ? "scale-105 border-foreground/30 bg-foreground/5"
                : "border-border"
          )}
          aria-label="Cycle active speaker"
        >
          <div
            className={cn(
              "size-16 rounded-full transition-all duration-500",
              activeSpeaker === "future"
                ? "animate-pulse bg-foreground/20"
                : activeSpeaker === "user"
                  ? "bg-foreground/10"
                  : "bg-muted"
            )}
          />
        </button>

        {/* Speaker label */}
        <Badge variant="secondary" className="mb-6">
          {activeSpeaker === "future"
            ? "Your Future Self"
            : activeSpeaker === "user"
              ? "You"
              : "Waiting..."}
        </Badge>

        {/* Live transcription preview */}
        <AnimatePresence>
          {activeSpeaker === "future" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-md text-center"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">
                {MOCK_TRANSCRIPT[4].text}
                <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-foreground" />
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User speaking indicator */}
        {activeSpeaker === "user" && (
          <div className="mt-6 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ height: [8, 24, 8] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
                className="w-1 rounded-full bg-foreground/50"
              />
            ))}
          </div>
        )}

        {/* Hint */}
        <p className="mt-12 text-xs text-muted-foreground/50">
          Click the circle to cycle speaker states
        </p>
      </main>

      {/* Transcript sidebar */}
      <aside className="hidden w-80 flex-col border-l border-border lg:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transcript
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            {MOCK_TRANSCRIPT.map((entry, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
              >
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {entry.speaker === "user" ? "You" : "Future You"}
                </p>
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    entry.speaker === "future"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {entry.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </aside>

      {/* Controls */}
      <footer className="flex items-center justify-center gap-4 border-t border-border py-6 lg:absolute lg:inset-x-0 lg:bottom-0 lg:border-0 lg:py-8">
        <Button
          onClick={() => setIsMuted((p) => !p)}
          variant={isMuted ? "secondary" : "outline"}
          size="icon-lg"
          className="rounded-full"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff /> : <Mic />}
        </Button>

        <Separator orientation="vertical" className="h-8" />

        <Button
          onClick={() => navigate("/")}
          variant="destructive"
          size="icon-lg"
          className="size-14 rounded-full"
          aria-label="End conversation"
        >
          <PhoneOff />
        </Button>
      </footer>
    </div>
  );
}
