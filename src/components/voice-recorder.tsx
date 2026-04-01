import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";

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

  // Format time as M:SS
  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Status indicator */}
      <div className="h-10 flex items-center justify-center mb-6">
        {status === "recording" ? (
          <div className="flex items-center gap-2">
            <span className="relative flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-red-500" />
            </span>
            <span className="font-sans text-sm font-medium text-red-500">Recording</span>
          </div>
        ) : status === "recorded" ? (
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-500" />
            <span className="font-sans text-sm font-medium text-emerald-500">Recorded</span>
          </div>
        ) : (
          <Mic className="size-[22px] text-[#444]" />
        )}
      </div>

      {/* Large timer - DM Mono, 96px */}
      <div className="text-timer text-[96px] font-bold text-white leading-none mb-4">
        {formatTimer(elapsed)}
      </div>

      {/* Progress bar - 384px wide, 1px height */}
      <div className="w-full max-w-[384px] mb-12">
        <div className="w-full h-[1px] bg-[#222] overflow-hidden">
          <div
            className="h-full bg-[#7C3AED] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Audio playback (after recording) */}
      {status === "recorded" && audioUrl && (
        <div className="w-full max-w-[384px] mb-6">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button
            onClick={togglePlayback}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#111] border border-[#1C1C1C] font-sans text-white hover:border-[#333] transition-colors duration-150"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? "Pause" : "Play Recording"}
          </button>
        </div>
      )}

      {/* Action buttons - 384px wide, 56px height, 12px radius */}
      <div className="w-full max-w-[384px]">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="w-full h-14 flex items-center justify-center gap-3 bg-[#7C3AED] text-white font-sans font-medium text-[15px] rounded-xl hover:bg-[#6D28D9] hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(124,58,237,0.35)] transition-all duration-150"
          >
            <Mic className="size-5" />
            Start Recording
          </button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full h-14 flex items-center justify-center gap-2 bg-red-600 text-white font-sans font-medium text-[15px] rounded-xl hover:bg-red-700 transition-colors duration-150"
          >
            <Square className="size-4" />
            Stop Recording
          </button>
        )}

        {status === "recorded" && (
          <div className="flex gap-3">
            <button
              onClick={resetRecording}
              className="flex-1 h-14 flex items-center justify-center gap-2 bg-[#1C1C1C] text-white font-sans font-medium text-[15px] rounded-xl border border-[#2a2a2a] hover:bg-[#222] hover:border-[#333] transition-colors duration-150"
            >
              <RotateCcw className="size-4" />
              Re-record
            </button>
            <button
              onClick={confirmRecording}
              className="flex-1 h-14 flex items-center justify-center gap-2 bg-[#7C3AED] text-white font-sans font-medium text-[15px] rounded-xl hover:bg-[#6D28D9] transition-colors duration-150"
            >
              <Check className="size-4" />
              Use this
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="font-sans text-sm text-red-400 mb-6 max-w-sm">
              {errorMsg || "Could not access microphone."}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              className="font-sans text-[#555] hover:text-white text-sm transition-colors duration-150"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
