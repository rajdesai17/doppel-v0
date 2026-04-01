import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Button } from "../../components/ui/button";

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
  const [frequencies, setFrequencies] = useState<number[]>(Array(24).fill(0));

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
    
    const bands = [];
    const bandSize = Math.floor(dataArray.length / 24);
    for (let i = 0; i < 24; i++) {
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
        setFrequencies(Array(24).fill(0));
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setStatus("recording");
      setElapsed(0);

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
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center">
      {/* Extraction Ring - Massive centered circle */}
      <div className="relative size-64 flex items-center justify-center mb-8">
        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 progress-ring" viewBox="0 0 256 256">
          {/* Base ring */}
          <circle
            className="progress-ring-bg"
            cx="128"
            cy="128"
            r="120"
            strokeWidth="1"
          />
          {/* Progress ring with glow */}
          <circle
            className={cn(
              "progress-ring-fill",
              status === "recorded" && "stroke-white"
            )}
            cx="128"
            cy="128"
            r="120"
            strokeWidth="2"
            strokeDasharray={circumference}
            strokeDashoffset={status === "recorded" ? 0 : strokeDashoffset}
          />
        </svg>

        {/* Center content - Timer */}
        <div className="relative flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {status === "recording" ? (
              <motion.span
                key="recording"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="font-mono text-5xl text-white tracking-widest"
              >
                {formatTimer(elapsed)}
              </motion.span>
            ) : status === "recorded" ? (
              <motion.div
                key="recorded"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="flex flex-col items-center"
              >
                <Check className="size-8 text-white mb-2" />
                <span className="font-mono text-3xl text-white tracking-widest">
                  {formatTimer(elapsed)}
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={spring}
                className="font-mono text-5xl text-white tracking-widest"
              >
                0:00
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Waveform - Simple flex row of vertical bars */}
      <div className="flex items-end justify-center gap-1 h-12 mb-8">
        {frequencies.map((freq, i) => {
          const height = status === "recording" 
            ? Math.max(8, freq * 48)
            : 8 + Math.sin(i * 0.5) * 4;
          
          return (
            <motion.div
              key={i}
              animate={{ height }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "waveform-bar",
                status === "recording" && freq > 0.3 && "active"
              )}
            />
          );
        })}
      </div>

      {/* Audio playback */}
      {status === "recorded" && audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="mb-6"
        >
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <Button
            onClick={togglePlayback}
            variant="outline"
            size="lg"
            className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
          >
            {isPlaying ? <Pause /> : <Play />}
            {isPlaying ? "Pause" : "Play recording"}
          </Button>
        </motion.div>
      )}

      {/* Action Button */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            <Button
              onClick={startRecording}
              variant="outline"
              size="lg"
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
            >
              <Mic />
              Start recording
            </Button>
          </motion.div>
        )}

        {status === "recording" && (
          <motion.div
            key="stop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            <Button
              onClick={stopRecording}
              size="lg"
              className="rounded-full"
            >
              <Square />
              Stop recording
            </Button>
          </motion.div>
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
            <Button
              onClick={resetRecording}
              variant="outline"
              size="lg"
              className="rounded-full border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
            >
              <RotateCcw />
              Re-record
            </Button>
            <Button
              onClick={confirmRecording}
              size="lg"
              className="rounded-full"
            >
              <Check />
              Use this
            </Button>
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
            <p className="text-sm text-white/60 mb-4 max-w-sm leading-relaxed">
              {errorMsg || "Could not access microphone."}
            </p>
            <Button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              variant="ghost"
              className="text-white/40 hover:text-white"
            >
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer tip */}
      <p className="mt-8 font-mono text-[10px] tracking-widest text-white/30 uppercase">
        Tip: Read something aloud or talk about your day
      </p>
    </div>
  );
}
