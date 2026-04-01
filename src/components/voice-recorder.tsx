import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Check, RotateCcw, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";

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

  const progress = (elapsed / duration) * 100;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      {/* Timer Display */}
      <div className="mb-6 flex flex-col items-center">
        <span className="tabular-nums text-5xl font-light tracking-tight text-foreground">
          {formatTimer(elapsed)}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          / {formatTimer(duration)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 w-full">
        <Progress value={progress} className="h-1" />
      </div>

      {/* Waveform Visualization */}
      <div className="mb-8 flex h-16 w-full items-center justify-center gap-0.5">
        {frequencies.map((freq, i) => {
          const height = status === "recording" 
            ? Math.max(4, freq * 64)
            : 4 + Math.sin(i * 0.3) * 2;
          
          return (
            <motion.div
              key={i}
              animate={{ height }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "w-1 rounded-full transition-colors",
                status === "recording" && freq > 0.3
                  ? "bg-foreground"
                  : "bg-muted-foreground/30"
              )}
            />
          );
        })}
      </div>

      {/* Playback for recorded audio */}
      {status === "recorded" && audioUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
          <Button onClick={togglePlayback} variant="outline" size="sm" className="gap-2">
            {isPlaying ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {isPlaying ? "Pause" : "Play recording"}
          </Button>
        </motion.div>
      )}

      {/* Action Buttons */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Button onClick={startRecording} size="lg" className="h-11 gap-2 px-6">
              <Mic data-icon="inline-start" />
              Start recording
            </Button>
          </motion.div>
        )}

        {status === "recording" && (
          <motion.div
            key="stop"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Button onClick={stopRecording} variant="destructive" size="lg" className="h-11 gap-2 px-6">
              <Square data-icon="inline-start" />
              Stop recording
            </Button>
          </motion.div>
        )}

        {status === "recorded" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex gap-3"
          >
            <Button onClick={resetRecording} variant="outline" className="gap-2">
              <RotateCcw data-icon="inline-start" />
              Re-record
            </Button>
            <Button onClick={confirmRecording} className="gap-2">
              <Check data-icon="inline-start" />
              Use this
            </Button>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center text-center"
          >
            <p className="mb-4 max-w-xs text-sm text-muted-foreground">
              {errorMsg || "Could not access microphone."}
            </p>
            <Button
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
              variant="ghost"
              size="sm"
            >
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      <p className="mt-8 text-center text-xs text-muted-foreground">
        Tip: Read something aloud or talk about your day
      </p>
    </div>
  );
}
