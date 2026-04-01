import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
import { formatDuration } from "../lib/utils";

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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

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
        stream.getTracks().forEach((t) => t.stop());
        setStatus("error");
        setErrorMsg("Your microphone is muted. Please unmute and try again.");
        return;
      }

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");
      setElapsed(0);

      const startTime = Date.now();
      intervalRef.current = window.setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(newElapsed);
        if (newElapsed >= duration) {
          stopRecording();
        }
      }, 250);
    } catch {
      setStatus("error");
      setErrorMsg("Could not access microphone. Please check permissions.");
    }
  };

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

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setIsPlaying(false);
    setStatus("idle");
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const confirmRecording = () => {
    if (blobRef.current) {
      onRecordingComplete(blobRef.current);
    }
  };

  const progress = (elapsed / duration) * 100;

  // Format time as M:SS with large monospace digits
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Status indicator */}
      <div className="h-8 flex items-center justify-center mb-8">
        {status === "recording" && (
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[rgb(var(--error))] animate-pulse" />
            <span className="text-sm font-medium text-[rgb(var(--error))]">Recording</span>
          </div>
        )}
        {status === "recorded" && (
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[rgb(var(--success))]" />
            <span className="text-sm font-medium text-[rgb(var(--success))]">Recorded</span>
          </div>
        )}
        {status === "idle" && (
          <Mic className="size-6 text-[rgb(var(--text-muted))]" />
        )}
      </div>

      {/* Large timer */}
      <div className="text-center mb-8">
        <div
          className="font-mono text-7xl font-normal text-[rgb(var(--foreground))] tracking-tight"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formatTimer(elapsed)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md h-1 bg-[rgb(var(--surface-2))] rounded-full mb-10 overflow-hidden">
        <div
          className="h-full bg-[rgb(var(--accent))] transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Audio playback */}
      {status === "recorded" && audioUrl && (
        <div className="w-full max-w-md mb-6">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button
            onClick={togglePlayback}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[rgb(var(--surface-1))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-2))] transition-colors"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? "Pause" : "Play Recording"}
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {status === "idle" && (
          <button onClick={startRecording} className="btn btn-accent h-14 px-8 text-base">
            <Mic className="size-5" />
            Start Recording
          </button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="btn h-14 px-8 text-base rounded-full bg-[rgb(var(--error))] text-white hover:bg-[rgb(var(--error)/0.9)]"
          >
            <Square className="size-4" />
            Stop
          </button>
        )}

        {status === "recorded" && (
          <>
            <button onClick={resetRecording} className="btn btn-secondary h-12 px-5">
              <RotateCcw className="size-4" />
              Re-record
            </button>
            <button onClick={confirmRecording} className="btn btn-accent h-12 px-6">
              <Check className="size-4" />
              Use this recording
            </button>
          </>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-sm text-[rgb(var(--error))] mb-4 max-w-sm">
              {errorMsg || "Could not access microphone."}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--foreground))] text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
