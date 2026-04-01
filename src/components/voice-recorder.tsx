import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
import { cn, formatDuration } from "../lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  duration: number; // Target duration in seconds
}

export function VoiceRecorder({
  onRecordingComplete,
  duration,
}: VoiceRecorderProps) {
  const [status, setStatus] = useState<
    "idle" | "recording" | "recorded" | "error"
  >("idle");
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
      // Request mic with explicit constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Check audio track health
      const track = stream.getAudioTracks()[0];
      console.log("[recorder] Audio track:", track.label, "enabled:", track.enabled, "muted:", track.muted);
      console.log("[recorder] Track settings:", JSON.stringify(track.getSettings()));

      if (track.muted) {
        console.warn("[recorder] WARNING: Microphone track is MUTED at OS/hardware level!");
        stream.getTracks().forEach((t) => t.stop());
        setStatus("error");
        setErrorMsg(
          `Your microphone "${track.label}" is muted at the system level. ` +
          "Please unmute it in Windows Sound Settings (right-click speaker icon in taskbar > Sound settings > Input) and try again."
        );
        return;
      }

      // Pick MIME type
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      console.log("[recorder] Using MIME type:", mimeType || "default");

      // Create recorder — NO AudioContext, NO timeslice
      // This ensures the stream goes directly to MediaRecorder without interference
      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log("[recorder] data chunk:", e.data.size, "bytes");
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
        console.log("[recorder] Final blob:", blob.size, "bytes, type:", blob.type, "chunks:", chunks.length);

        if (blob.size < 1000) {
          console.warn("[recorder] WARNING: Blob is very small, microphone may not be working!");
          console.warn("[recorder] Check Windows Settings > Privacy > Microphone");
        }

        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = mediaRecorder;
      // start() with NO timeslice — single blob on stop()
      mediaRecorder.start();
      setStatus("recording");
      setElapsed(0);

      // Timer
      const startTime = Date.now();
      intervalRef.current = window.setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(newElapsed);
        if (newElapsed >= duration) {
          stopRecording();
        }
      }, 250);
    } catch (e) {
      console.error("[recorder] Failed:", e);
      setStatus("error");
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

  return (
    <div className="flex flex-col items-center">
      {/* Recording indicator */}
      <div className="h-24 flex items-center justify-center mb-6">
        {status === "recording" ? (
          <div className="flex items-center gap-3">
            <div className="size-4 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Recording</span>
          </div>
        ) : status === "recorded" ? (
          <div className="flex items-center gap-3">
            <div className="size-4 rounded-full bg-green-500" />
            <span className="text-green-400 text-sm font-medium">Recorded</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Mic className="size-8 text-zinc-500" />
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="text-center mb-6">
        <div className="font-mono text-3xl text-zinc-50 tabular-nums">
          {formatDuration(elapsed * 1000)}
        </div>
        <div className="text-sm text-zinc-500">
          {status === "recording"
            ? `Recording... ${duration - elapsed}s left`
            : status === "recorded"
              ? "Recording complete"
              : `Record for ${duration} seconds`}
        </div>
      </div>

      {/* Progress bar */}
      {status === "recording" && (
        <div className="w-full h-1.5 bg-zinc-800/60 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Audio playback — use hidden audio element + custom button */}
      {status === "recorded" && audioUrl && (
        <div className="w-full mb-6">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onError={(e) => console.error("[recorder] Audio playback error:", e)}
          />
          <button
            onClick={togglePlayback}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800/60 text-zinc-200 hover:bg-zinc-700 transition-colors"
          >
            {isPlaying ? <Pause className="size-5" /> : <Play className="size-5" />}
            {isPlaying ? "Pause" : "Play Recording"}
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-violet-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-violet-400 transition-colors"
          >
            <Mic className="size-5" />
            Start Recording
          </button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            <Square className="size-5" />
            Stop
          </button>
        )}

        {status === "recorded" && (
          <>
            <button
              onClick={resetRecording}
              className="flex items-center gap-2 bg-zinc-800/60 text-zinc-300 px-5 py-3 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
            >
              <RotateCcw className="size-4" />
              Re-record
            </button>
            <button
              onClick={confirmRecording}
              className="flex items-center gap-2 bg-violet-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-violet-400 transition-colors"
            >
              <Check className="size-5" />
              Use this recording
            </button>
          </>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-red-400 mb-4 max-w-md">
              {errorMsg ||
                "Could not access microphone. Please allow microphone access and check Windows Settings > Privacy > Microphone."}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              className="text-zinc-400 hover:text-zinc-50 text-sm"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
