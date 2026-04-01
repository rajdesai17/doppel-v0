import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  duration: number;
}

const spring = { type: "spring", stiffness: 100, damping: 20 };

export function VoiceRecorder({ onRecordingComplete, duration }: VoiceRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "recorded" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [frequencies, setFrequencies] = useState<number[]>(Array(32).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const updateFrequencies = useCallback(() => {
    if (!analyzerRef.current) return;
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    // Sample 32 frequency bands
    const bands = [];
    const bandSize = Math.floor(dataArray.length / 32);
    for (let i = 0; i < 32; i++) {
      const start = i * bandSize;
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += dataArray[start + j];
      }
      bands.push(sum / bandSize / 255);
    }
    
    setFrequencies(bands);
    animationRef.current = requestAnimationFrame(updateFrequencies);
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
        stream.getTracks().forEach((t) => t.stop());
        setStatus("error");
        setErrorMsg("Your microphone is muted. Please unmute and try again.");
        return;
      }

      // Set up audio analyzer for waveform
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

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
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setFrequencies(Array(32).fill(0));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");
      setElapsed(0);

      // Start frequency visualization
      updateFrequencies();

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

  const progress = elapsed / duration;
  const remaining = duration - elapsed;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Circular Progress Ring with Timer */}
      <div className="relative size-[220px] flex items-center justify-center mb-8">
        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 progress-ring" viewBox="0 0 220 220">
          {/* Background ring */}
          <circle
            className="progress-ring-bg"
            cx="110"
            cy="110"
            r="90"
            strokeWidth="2"
          />
          {/* Progress ring */}
          <circle
            className={cn(
              "progress-ring-fill transition-all duration-300",
              status === "recorded" && "stroke-emerald-500"
            )}
            cx="110"
            cy="110"
            r="90"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={status === "recorded" ? 0 : strokeDashoffset}
          />
        </svg>

        {/* Center content */}
        <div className="relative flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {status === "recording" ? (
              <motion.div
                key="recording"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="flex flex-col items-center"
              >
                <div className="relative mb-3">
                  <div className="size-3 rounded-full bg-red-500 animate-pulse" />
                  <div className="absolute inset-0 size-3 rounded-full bg-red-500 animate-ping opacity-75" />
                </div>
                <span className="text-timer text-[48px] font-medium text-white leading-none">
                  {formatTimer(elapsed)}
                </span>
              </motion.div>
            ) : status === "recorded" ? (
              <motion.div
                key="recorded"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="flex flex-col items-center"
              >
                <Check className="size-8 text-emerald-500 mb-2" />
                <span className="text-timer text-[32px] font-medium text-white leading-none">
                  {formatTimer(elapsed)}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="flex flex-col items-center"
              >
                <Mic className="size-8 text-white/30 mb-2" />
                <span className="text-timer text-[32px] font-medium text-white/50 leading-none">
                  0:00
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Real-time Waveform Visualizer (center-aligned, symmetrical) */}
      <div className="w-full max-w-[360px] h-16 mb-6 flex items-center justify-center gap-[2px]">
        {frequencies.map((freq, i) => {
          const mirrorIndex = Math.abs(i - 15.5);
          const centerWeight = 1 - mirrorIndex / 16;
          const height = status === "recording" 
            ? Math.max(4, freq * 60 * (0.5 + centerWeight * 0.5))
            : 4;
          
          return (
            <motion.div
              key={i}
              animate={{ height }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "w-[6px] rounded-full",
                status === "recording"
                  ? "bg-[oklch(0.7_0.1_250)]"
                  : "bg-white/10"
              )}
              style={{
                boxShadow: status === "recording" && freq > 0.3
                  ? "0 0 8px oklch(0.7 0.1 250 / 0.5)"
                  : "none",
              }}
            />
          );
        })}
      </div>

      {/* Glitching instruction text */}
      <p className={cn(
        "font-mono text-[13px] text-white/30 mb-8 h-5",
        status === "recording" && "animate-glitch"
      )}>
        {status === "recording"
          ? `Extracting voice... ${remaining}s remaining`
          : status === "recorded"
            ? "Voice extraction complete"
            : `Speak naturally for ${duration} seconds...`}
      </p>

      {/* Audio playback */}
      {status === "recorded" && audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="w-full max-w-[360px] mb-6"
        >
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <button
            onClick={togglePlayback}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-white/[0.03] border border-white/[0.06] font-sans text-[14px] text-white/60 hover:text-white hover:border-white/10 transition-all duration-300"
          >
            {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? "Pause" : "Play recording"}
          </button>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="w-full max-w-[360px]">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <motion.button
              key="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              onClick={startRecording}
              className="glass-button w-full h-12 flex items-center justify-center gap-2.5 text-white font-sans font-medium text-[14px] rounded-full"
            >
              <Mic className="size-[18px]" />
              Start recording
            </motion.button>
          )}

          {status === "recording" && (
            <motion.button
              key="stop"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              onClick={stopRecording}
              className="w-full h-12 flex items-center justify-center gap-2 bg-red-600 text-white font-sans font-medium text-[14px] rounded-full hover:bg-red-700 transition-colors duration-150"
            >
              <Square className="size-4" />
              Stop recording
            </motion.button>
          )}

          {status === "recorded" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="flex gap-3"
            >
              <button
                onClick={resetRecording}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-white/[0.03] text-white/60 font-sans font-medium text-[14px] rounded-full border border-white/[0.06] hover:text-white hover:border-white/10 transition-all duration-300"
              >
                <RotateCcw className="size-4" />
                Re-record
              </button>
              <button
                onClick={confirmRecording}
                className="flex-1 h-12 flex items-center justify-center gap-2 bg-[oklch(0.7_0.1_250)] text-white font-sans font-medium text-[14px] rounded-full hover:bg-[oklch(0.75_0.1_250)] active:scale-[0.98] transition-all duration-150"
              >
                <Check className="size-4" />
                Use this
              </button>
            </motion.div>
          )}

          {status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={spring}
              className="text-center"
            >
              <p className="font-sans text-[13px] text-red-400 mb-4 max-w-sm mx-auto leading-relaxed">
                {errorMsg || "Could not access microphone."}
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setErrorMsg(null);
                }}
                className="font-sans text-[13px] text-white/40 hover:text-white transition-colors duration-300"
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
