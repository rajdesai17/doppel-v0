import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw } from "lucide-react";
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
  const [audioLevels, setAudioLevels] = useState<number[]>(
    Array(30).fill(0.1)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const updateAudioLevels = useCallback(() => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    // Sample frequencies across the spectrum
    const levels: number[] = [];
    const step = Math.floor(dataArray.length / 30);
    for (let i = 0; i < 30; i++) {
      const value = dataArray[i * step] / 255;
      levels.push(Math.max(0.1, value));
    }

    setAudioLevels(levels);
    animationRef.current = requestAnimationFrame(updateAudioLevels);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);

      // Setup recording
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
        cleanup();
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setStatus("recording");
      setElapsed(0);

      // Start timer
      const startTime = Date.now();
      intervalRef.current = window.setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(newElapsed);

        // Auto-stop at duration
        if (newElapsed >= duration) {
          stopRecording();
        }
      }, 100);

      // Start visualization
      updateAudioLevels();
    } catch (e) {
      console.error("Failed to start recording:", e);
      setStatus("error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setStatus("recorded");
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setAudioLevels(Array(30).fill(0.1));
    setStatus("idle");
  };

  const confirmRecording = () => {
    if (blobRef.current) {
      onRecordingComplete(blobRef.current);
    }
  };

  const progress = (elapsed / duration) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Waveform visualization */}
      <div className="h-24 flex items-center justify-center gap-0.5 mb-6">
        {audioLevels.map((level, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-full transition-all duration-75",
              status === "recording" ? "bg-violet-500" : "bg-zinc-700"
            )}
            style={{
              height: `${Math.max(8, level * 80)}px`,
            }}
          />
        ))}
      </div>

      {/* Timer / Progress */}
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
        <div className="w-full h-1 bg-zinc-800 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-violet-500 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Audio playback */}
      {status === "recorded" && audioUrl && (
        <audio
          src={audioUrl}
          controls
          className="w-full mb-6 rounded-lg"
          style={{ colorScheme: "dark" }}
        />
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {status === "idle" && (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-full font-medium hover:bg-violet-700 transition-colors"
          >
            <Mic className="size-5" />
            Start Recording
          </button>
        )}

        {status === "recording" && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full font-medium hover:bg-red-700 transition-colors"
          >
            <Square className="size-5" />
            Stop
          </button>
        )}

        {status === "recorded" && (
          <>
            <button
              onClick={resetRecording}
              className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-5 py-3 rounded-full font-medium hover:bg-zinc-700 transition-colors"
            >
              <RotateCcw className="size-4" />
              Re-record
            </button>
            <button
              onClick={confirmRecording}
              className="flex items-center gap-2 bg-violet-600 text-white px-6 py-3 rounded-full font-medium hover:bg-violet-700 transition-colors"
            >
              <Check className="size-5" />
              Use this recording
            </button>
          </>
        )}

        {status === "error" && (
          <div className="text-center">
            <p className="text-red-400 mb-4">
              Could not access microphone. Please allow microphone access.
            </p>
            <button
              onClick={() => setStatus("idle")}
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
