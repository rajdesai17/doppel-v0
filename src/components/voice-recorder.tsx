import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { cn } from "../lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  duration: number;
}

export function VoiceRecorder({ onRecordingComplete, duration }: VoiceRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "recorded" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("recorded");
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      if (track.muted) {
        stream.getTracks().forEach((currentTrack) => currentTrack.stop());
        setStatus("error");
        setErrorMsg("Your microphone is muted. Unmute it and try again.");
        return;
      }

      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((value) => MediaRecorder.isTypeSupported(value)) ?? "";

      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        blobRef.current = blob;
        const nextAudioUrl = URL.createObjectURL(blob);
        setAudioUrl(nextAudioUrl);
        stream.getTracks().forEach((currentTrack) => currentTrack.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");
      setElapsed(0);
      setErrorMsg(null);

      const startedAt = Date.now();
      intervalRef.current = window.setInterval(() => {
        const nextElapsed = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(nextElapsed);
        if (nextElapsed >= duration) {
          stopRecording();
        }
      }, 250);
    } catch {
      setStatus("error");
      setErrorMsg("Microphone access failed. Check permissions and try again.");
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setIsPlaying(false);
    setStatus("idle");
    setErrorMsg(null);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current.play();
    setIsPlaying(true);
  };

  const confirmRecording = () => {
    if (blobRef.current) {
      onRecordingComplete(blobRef.current);
    }
  };

  const progress = Math.min((elapsed / duration) * 100, 100);
  const remaining = Math.max(duration - elapsed, 0);

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const wholeSeconds = seconds % 60;
    return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="surface-card rounded-[2rem] p-6 sm:p-8">
      <div className="grid gap-7 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1fr)] lg:items-center">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="relative mb-6 flex size-32 items-center justify-center">
            <div className="floating-orb absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(217,195,154,0.24),transparent_70%)] blur-2xl" />
            {status === "recording" ? (
              <>
                <div className="absolute inset-2 rounded-full border border-rose-300/18 bg-rose-300/8 animate-breathe" />
                <div
                  className="absolute inset-5 rounded-full border border-rose-200/22 bg-rose-300/10 animate-breathe"
                  style={{ animationDelay: "240ms" }}
                />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-rose-300/14">
                  <span className="size-4 rounded-md bg-rose-200 shadow-[0_0_30px_rgba(253,164,175,0.4)]" />
                </div>
              </>
            ) : status === "recorded" ? (
              <div className="relative flex size-16 items-center justify-center rounded-full bg-emerald-300/14 text-emerald-100 shadow-[0_0_28px_rgba(110,231,183,0.16)]">
                <Check className="size-6" />
              </div>
            ) : (
              <div className="relative flex size-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[var(--app-accent-strong)]">
                <Mic className="size-6" />
              </div>
            )}
          </div>

          <div className="text-timer text-[clamp(3rem,7vw,4.7rem)] font-medium leading-none text-white">
            {formatTimer(elapsed)}
          </div>
          <p className="mt-3 text-sm text-[var(--app-muted)]">
            {status === "recording"
              ? `${remaining}s remaining`
              : status === "recorded"
                ? "Recording ready to review"
                : `Record for ${duration} seconds`}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="surface-soft rounded-[1.6rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[var(--app-soft)]">
                Capture
              </p>
              <p className="text-sm text-white/80">
                {status === "recording"
                  ? "Listening now"
                  : status === "recorded"
                    ? "Review before continuing"
                    : "One clean voice sample"}
              </p>
            </div>

            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  status === "recording" && "bg-rose-300",
                  status === "recorded" && "bg-emerald-300",
                  status === "idle" && "bg-[var(--app-accent)]",
                  status === "error" && "bg-rose-300"
                )}
                style={{ width: `${status === "recorded" ? 100 : progress}%` }}
              />
            </div>

            <p className="text-sm leading-7 text-[var(--app-muted)]">
              Use a normal speaking voice. Read a short paragraph or speak naturally about
              your day. Clear audio leads to a more believable conversation.
            </p>
          </div>

          {status === "recorded" && audioUrl ? (
            <div className="surface-soft rounded-[1.5rem] p-4">
              <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
              <button
                onClick={togglePlayback}
                className="button-lift flex w-full items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/84 hover:border-white/16 hover:bg-white/[0.08]"
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                {isPlaying ? "Pause playback" : "Play back your sample"}
              </button>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="rounded-[1.45rem] border border-rose-300/16 bg-rose-300/8 px-4 py-4">
              <p className="text-sm leading-7 text-rose-100">
                {errorMsg || "Microphone access failed."}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            {status === "idle" ? (
              <button
                onClick={startRecording}
                className="button-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1rem] bg-[var(--app-accent)] px-5 py-3 text-sm font-semibold text-[#17130d] shadow-[0_14px_34px_rgba(217,195,154,0.2)] hover:bg-[var(--app-accent-strong)]"
              >
                <Mic className="size-4" />
                Start recording
              </button>
            ) : null}

            {status === "recording" ? (
              <button
                onClick={stopRecording}
                className="button-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1rem] bg-rose-300 px-5 py-3 text-sm font-semibold text-[#1f0b11] hover:bg-rose-200"
              >
                <Square className="size-4" />
                Stop capture
              </button>
            ) : null}

            {status === "recorded" ? (
              <>
                <button
                  onClick={resetRecording}
                  className="button-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1rem] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/82 hover:border-white/16 hover:bg-white/[0.08]"
                >
                  <RotateCcw className="size-4" />
                  Re-record
                </button>
                <button
                  onClick={confirmRecording}
                  className="button-lift flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[1rem] bg-[var(--app-accent)] px-5 py-3 text-sm font-semibold text-[#17130d] hover:bg-[var(--app-accent-strong)]"
                >
                  <Check className="size-4" />
                  Use this sample
                </button>
              </>
            ) : null}

            {status === "error" ? (
              <button
                onClick={() => {
                  setStatus("idle");
                  setErrorMsg(null);
                }}
                className="button-lift flex min-h-12 flex-1 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/82 hover:border-white/16 hover:bg-white/[0.08]"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
