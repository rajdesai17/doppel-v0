import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
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
  const remaining = duration - elapsed;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Recording orb / status */}
      <div className="relative size-24 flex items-center justify-center mb-8">
        {status === "recording" ? (
          <>
            <div className="absolute inset-0 rounded-full bg-red-500/10 animate-breathe" />
            <div className="absolute inset-3 rounded-full bg-red-500/15 animate-breathe" style={{ animationDelay: "300ms" }} />
            <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <div className="size-3 rounded-full bg-red-500 animate-pulse" />
            </div>
          </>
        ) : status === "recorded" ? (
          <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Check className="size-5 text-emerald-500" />
          </div>
        ) : (
          <div className="size-12 rounded-full bg-[#111] border border-[#1a1a1a] flex items-center justify-center">
            <Mic className="size-5 text-[#525252]" />
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="text-timer text-[56px] font-medium text-white leading-none mb-2">
        {formatTimer(elapsed)}
      </div>

      {/* Status text */}
      <p className="font-sans text-[13px] text-[#525252] mb-8">
        {status === "recording"
          ? `${remaining}s remaining`
          : status === "recorded"
            ? "Recording complete"
            : `Record for ${duration} seconds`}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-[360px] mb-10">
        <div className="w-full h-[2px] bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-200",
              status === "recording" ? "bg-red-500" : status === "recorded" ? "bg-emerald-500" : "bg-[#262626]"
            )}
            style={{ width: `${status === "recorded" ? 100 : progress}%` }}
          />
        </div>
      </div>

      {/* Audio playback */}
      {status === "recorded" && audioUrl && (
        <div className="w-full max-w-[360px] mb-6">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button
            onClick={togglePlayback}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#111] border border-[#1a1a1a] font-sans text-[14px] text-[#a1a1a1] hover:text-white hover:border-[#262626] transition-all duration-150"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? "Pause" : "Play recording"}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="w-full max-w-[360px]">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="w-full h-12 flex items-center justify-center gap-2.5 bg-white text-black font-sans font-medium text-[14px] rounded-xl hover:bg-[#e5e5e5] active:scale-[0.98] transition-all duration-150"
          >
            <Mic className="size-[18px]" />
            Start recording
          </button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full h-12 flex items-center justify-center gap-2 bg-red-600 text-white font-sans font-medium text-[14px] rounded-xl hover:bg-red-700 transition-colors duration-150"
          >
            <Square className="size-4" />
            Stop recording
          </button>
        )}

        {status === "recorded" && (
          <div className="flex gap-3">
            <button
              onClick={resetRecording}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-[#111] text-[#a1a1a1] font-sans font-medium text-[14px] rounded-xl border border-[#1a1a1a] hover:text-white hover:border-[#262626] transition-all duration-150"
            >
              <RotateCcw className="size-4" />
              Re-record
            </button>
            <button
              onClick={confirmRecording}
              className="flex-1 h-12 flex items-center justify-center gap-2 bg-white text-black font-sans font-medium text-[14px] rounded-xl hover:bg-[#e5e5e5] active:scale-[0.98] transition-all duration-150"
            >
              <Check className="size-4" />
              Use this
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="font-sans text-[13px] text-red-400 mb-4 max-w-sm mx-auto leading-relaxed">
              {errorMsg || "Could not access microphone."}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              className="font-sans text-[13px] text-[#525252] hover:text-white transition-colors duration-150"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
