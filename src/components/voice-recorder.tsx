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
      {/* Microphone icon - centered, 48px below subtitle as per spec */}
      <div className="h-12 flex items-center justify-center mb-8">
        {status === "recording" ? (
          <div className="flex items-center gap-2">
            <span className="relative flex size-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-3 bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-500">Recording</span>
          </div>
        ) : status === "recorded" ? (
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-emerald-500" />
            <span className="text-sm font-medium text-emerald-500">Recorded</span>
          </div>
        ) : (
          <Mic className="size-6 text-[#555] stroke-[1.5]" />
        )}
      </div>

      {/* Large timer display - 96px monospace as per spec */}
      <div className="font-mono text-[96px] font-bold text-white leading-none tracking-tight mb-8">
        {formatTimer(elapsed)}
      </div>

      {/* Progress bar - full width, thin (1px bg, purple fill) */}
      <div className="w-full max-w-[380px] mb-10">
        <div className="w-full h-[2px] bg-[#333] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#7C3AED] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Audio playback (after recording) */}
      {status === "recorded" && audioUrl && (
        <div className="w-full max-w-[380px] mb-6">
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button
            onClick={togglePlayback}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#111] border border-[#222] text-white hover:bg-[#1a1a1a] transition-colors"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? "Pause" : "Play Recording"}
          </button>
        </div>
      )}

      {/* CTA Button - full width ~380px, 56px height, 14px radius as per spec */}
      <div className="w-full max-w-[380px]">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="w-full h-14 flex items-center justify-center gap-2 bg-[#7C3AED] text-white font-medium rounded-[14px] hover:bg-[#6D28D9] transition-colors"
          >
            <Mic className="size-5" />
            Start Recording
          </button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="w-full h-14 flex items-center justify-center gap-2 bg-red-600 text-white font-medium rounded-[14px] hover:bg-red-700 transition-colors"
          >
            <Square className="size-4" />
            Stop Recording
          </button>
        )}

        {status === "recorded" && (
          <div className="flex gap-3">
            <button
              onClick={resetRecording}
              className="flex-1 h-14 flex items-center justify-center gap-2 bg-[#222] text-white font-medium rounded-[14px] hover:bg-[#333] transition-colors"
            >
              <RotateCcw className="size-4" />
              Re-record
            </button>
            <button
              onClick={confirmRecording}
              className="flex-1 h-14 flex items-center justify-center gap-2 bg-[#7C3AED] text-white font-medium rounded-[14px] hover:bg-[#6D28D9] transition-colors"
            >
              <Check className="size-4" />
              Use this
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-sm text-red-400 mb-6 max-w-sm">
              {errorMsg || "Could not access microphone."}
            </p>
            <button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
