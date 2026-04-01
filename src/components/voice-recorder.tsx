import { useState, useRef, useEffect, useCallback } from "react";
import { Check, Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  duration: number;
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
  const [frequencyData, setFrequencyData] = useState<number[]>(() =>
    Array(32).fill(0)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startFrequencyLoop = useCallback((stream: MediaStream) => {
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    audioContextRef.current = context;
    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const barCount = 32;

    const update = () => {
      analyser.getByteFrequencyData(buffer);
      const data = Array.from({ length: barCount }, (_, i) => {
        const index = Math.floor(i * (buffer.length / barCount));
        return buffer[index] / 255;
      });
      setFrequencyData(data);
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
  }, []);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setFrequencyData(Array(32).fill(0));

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
        stream.getTracks().forEach((t) => t.stop());
        setStatus("error");
        setErrorMsg("Your microphone is muted.");
        return;
      }

      startFrequencyLoop(stream);

      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((v) => MediaRecorder.isTypeSupported(v)) ?? "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : {}
      );
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        blobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      setElapsed(0);
      setErrorMsg(null);

      const startedAt = Date.now();
      intervalRef.current = window.setInterval(() => {
        const next = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(next);
        if (next >= duration) stopRecording();
      }, 250);
    } catch {
      setStatus("error");
      setErrorMsg("Microphone access failed. Check permissions.");
    }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setIsPlaying(false);
    setStatus("idle");
    setErrorMsg(null);
    setFrequencyData(Array(32).fill(0));
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

  const confirm = () => {
    if (blobRef.current) onRecordingComplete(blobRef.current);
  };

  const progress = Math.min((elapsed / duration) * 100, 100);

  const formatTimer = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Timer */}
      <div className="text-center">
        <p className="text-5xl font-light tracking-tight tabular-nums">
          {formatTimer(elapsed)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          / {formatTimer(duration)}
        </p>
      </div>

      {/* Progress */}
      <div className="h-1 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-300"
          style={{ width: `${status === "recorded" ? 100 : progress}%` }}
        />
      </div>

      {/* Waveform */}
      <div className="flex h-16 w-full max-w-sm items-end justify-center gap-0.5">
        {frequencyData.map((value, i) => (
          <motion.div
            key={i}
            className={
              status === "recording" && value > 0.3
                ? "w-1 rounded-full bg-foreground"
                : "w-1 rounded-full bg-muted-foreground/30"
            }
            animate={{
              height:
                status === "recording"
                  ? Math.max(4, value * 64)
                  : 4 + Math.sin((i / 32) * Math.PI * 2) * 2,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          />
        ))}
      </div>

      {/* Playback */}
      {status === "recorded" && audioUrl && (
        <>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
          />
          <Button onClick={togglePlayback} variant="outline" size="sm">
            {isPlaying ? (
              <Pause data-icon="inline-start" />
            ) : (
              <Play data-icon="inline-start" />
            )}
            {isPlaying ? "Pause" : "Play recording"}
          </Button>
        </>
      )}

      {/* Error */}
      {status === "error" && (
        <p className="text-sm text-muted-foreground">{errorMsg}</p>
      )}

      {/* Actions */}
      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              size="lg"
              className="h-11 gap-2 px-6"
              onClick={startRecording}
            >
              <Mic data-icon="inline-start" />
              Start recording
            </Button>
          </motion.div>
        )}
        {status === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="destructive"
              size="lg"
              className="h-11 gap-2 px-6"
              onClick={stopRecording}
            >
              <Square data-icon="inline-start" />
              Stop recording
            </Button>
          </motion.div>
        )}
        {status === "recorded" && (
          <motion.div
            key="recorded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-3"
          >
            <Button variant="outline" onClick={reset}>
              <RotateCcw data-icon="inline-start" />
              Re-record
            </Button>
            <Button onClick={confirm}>
              <Check data-icon="inline-start" />
              Use this
            </Button>
          </motion.div>
        )}
        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Button
              variant="ghost"
              onClick={() => {
                setStatus("idle");
                setErrorMsg(null);
              }}
            >
              Try again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip */}
      <p className="text-center text-xs text-muted-foreground">
        Tip: Read something aloud or talk about your day
      </p>
    </div>
  );
}
