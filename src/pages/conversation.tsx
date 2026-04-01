import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Phone, PhoneOff, Mic, MicOff, ArrowLeft } from "lucide-react";
import { cn, getUserId, blobToBase64 } from "../lib/utils";

interface TranscriptEntry {
  speaker: "user" | "future";
  text: string;
  timestamp: number;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function ConversationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<"user" | "future" | null>(
    null
  );
  const [audioLevels, setAudioLevels] = useState({ user: 0, future: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isMutedRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);

  // Keep mute ref in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Play audio queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;
    const audioData = audioQueueRef.current.shift()!;

    try {
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      console.log("[conversation] Decoding audio chunk, size:", audioData.byteLength);
      const audioBuffer =
        await audioContextRef.current.decodeAudioData(audioData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        setActiveSpeaker(null);
        playNextAudio();
      };

      setActiveSpeaker("future");
      source.start();
      console.log("[conversation] Playing audio, duration:", audioBuffer.duration.toFixed(2), "s");
    } catch (e) {
      console.error("[conversation] Audio playback error:", e);
      isPlayingRef.current = false;
      playNextAudio();
    }
  }, []);

  // Connect to agent WebSocket — only depends on sessionId
  useEffect(() => {
    if (!sessionId) return;

    const userId = getUserId();
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/agents/future-self-agent/${sessionId}`;

    console.log("[conversation] Connecting WebSocket:", wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[conversation] WebSocket connected");
      setStatus("connected");

      // Get session config from PresentSelfAgent
      console.log("[conversation] Fetching session config for user:", userId);
      fetch(`/agents/present-self-agent/${userId}?method=getState`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then((r) => r.json())
        .then((state) => {
          console.log("[conversation] Got state, voiceId:", state.voiceId, "sessions:", state.sessions?.length);

          // Look for persona in localStorage (saved during setup)
          const savedPersona = localStorage.getItem(`doppel_persona_${sessionId}`);
          const systemPrompt = savedPersona
            ? JSON.parse(savedPersona).systemPrompt
            : "You are the user's future self, 10 years older. Speak with warmth and earned wisdom.";

          console.log("[conversation] Starting conversation with voiceId:", state.voiceId);
          ws.send(
            JSON.stringify({
              type: "start_conversation",
              config: {
                sessionId,
                voiceId: state.voiceId,
                systemPrompt,
              },
            })
          );
        })
        .catch((e) => {
          console.error("[conversation] Failed to get session config:", e);
          setStatus("error");
        });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("[conversation] WS message:", data.type);

        switch (data.type) {
          case "connected":
            console.log("[conversation] Agent connected, state:", data.state?.status);
            break;

          case "conversation_started":
            console.log("[conversation] Conversation started, beginning mic stream");
            startMicrophoneStream();
            break;

          case "audio": {
            const audioBytes = Uint8Array.from(atob(data.audio), (c) =>
              c.charCodeAt(0)
            );
            console.log("[conversation] Received audio chunk:", audioBytes.length, "bytes");
            audioQueueRef.current.push(audioBytes.buffer);
            playNextAudio();
            break;
          }

          case "transcript":
            console.log("[conversation] Transcript:", data.entry?.speaker, data.entry?.text?.slice(0, 50));
            setTranscript((prev) => [...prev, data.entry]);
            break;

          case "interruption":
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setActiveSpeaker(null);
            break;

          case "conversation_ended":
            console.log("[conversation] Conversation ended, navigating to replay");
            setStatus("disconnected");
            navigate(`/replay/${data.sessionId}`);
            break;

          case "error":
            console.error("[conversation] Agent error:", data.message);
            setStatus("error");
            break;

          case "elevenlabs_event":
            console.log("[conversation] ElevenLabs event:", data.event?.type);
            break;
        }
      } catch (e) {
        console.error("[conversation] WS message parse error:", e);
      }
    };

    ws.onerror = (e) => {
      console.error("[conversation] WebSocket error:", e);
      setStatus("error");
    };

    ws.onclose = (e) => {
      console.log("[conversation] WebSocket closed, code:", e.code, "reason:", e.reason);
      setStatus("disconnected");
    };

    return () => {
      console.log("[conversation] Cleanup: closing WebSocket");
      ws.close();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Start streaming microphone to agent
  const startMicrophoneStream = async () => {
    try {
      console.log("[conversation] Requesting microphone access");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[conversation] Microphone access granted");

      // Setup analyzer for visualization
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new AudioContext();
      }
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);

      // Setup recorder
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      console.log("[conversation] Recording MIME type:", mimeType || "default");

      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
      });

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN && !isMutedRef.current) {
          const base64 = await blobToBase64(e.data);
          wsRef.current.send(
            JSON.stringify({
              type: "audio_chunk",
              audio: base64,
            })
          );
        }
      };

      mediaRecorder.start(100); // Send chunks every 100ms
      mediaRecorderRef.current = mediaRecorder;
      console.log("[conversation] Microphone streaming started");

      // Update audio levels visualization
      const updateLevels = () => {
        if (analyzerRef.current) {
          const dataArray = new Uint8Array(
            analyzerRef.current.frequencyBinCount
          );
          analyzerRef.current.getByteFrequencyData(dataArray);
          const avg =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
          setAudioLevels((prev) => ({ ...prev, user: avg }));
        }
        animFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (e) {
      console.error("[conversation] Microphone access error:", e);
      setStatus("error");
    }
  };

  // End conversation
  const endConversation = () => {
    console.log("[conversation] User ended conversation");
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_conversation" }));
    }
    setStatus("disconnected");
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Exit
        </Link>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "size-2 rounded-full",
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
            )}
          />
          <span className="text-xs text-zinc-400 capitalize">{status}</span>
        </div>
        <div className="font-mono text-sm tracking-widest text-zinc-400">
          DOPPEL
        </div>
      </header>

      {/* Main conversation view */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Split screen: User vs Future */}
        <div className="flex-1 grid grid-cols-2 gap-px bg-zinc-800">
          {/* Present Self */}
          <div className="bg-zinc-950 flex flex-col items-center justify-center p-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
              You — Now
            </p>
            <div
              className={cn(
                "size-32 rounded-full bg-zinc-800 flex items-center justify-center transition-all duration-150",
                activeSpeaker === "user" && "ring-4 ring-violet-500/50"
              )}
              style={{
                transform: `scale(${1 + audioLevels.user * 0.2})`,
              }}
            >
              <div className="size-20 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
                {isMuted ? (
                  <MicOff className="size-8 text-zinc-500" />
                ) : (
                  <Mic className="size-8 text-zinc-300" />
                )}
              </div>
            </div>
          </div>

          {/* Future Self */}
          <div className="bg-zinc-900 flex flex-col items-center justify-center p-8">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-4">
              You — 2035
            </p>
            <div
              className={cn(
                "size-32 rounded-full bg-violet-900/30 flex items-center justify-center transition-all duration-150",
                activeSpeaker === "future" && "ring-4 ring-violet-500"
              )}
              style={{
                transform: `scale(${1 + audioLevels.future * 0.2})`,
              }}
            >
              <div className="size-20 rounded-full bg-violet-800/50 flex items-center justify-center">
                <Phone className="size-8 text-violet-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Transcript sidebar */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-zinc-800 flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-300">Transcript</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64 lg:max-h-none">
            {transcript.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-8">
                {status === "connecting"
                  ? "Connecting to your future self..."
                  : "Start speaking to begin the conversation."}
              </p>
            )}
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "animate-fade-in",
                  entry.speaker === "future" ? "text-right" : "text-left"
                )}
              >
                <p className="text-xs text-zinc-500 mb-1">
                  {entry.speaker === "user" ? "You (Now)" : "You (2035)"}
                </p>
                <p
                  className={cn(
                    "inline-block px-3 py-2 rounded-lg text-sm max-w-[85%]",
                    entry.speaker === "future"
                      ? "bg-violet-900/30 text-violet-100"
                      : "bg-zinc-800 text-zinc-200"
                  )}
                >
                  {entry.text}
                </p>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </aside>
      </main>

      {/* Controls */}
      <footer className="border-t border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMute}
            className={cn(
              "size-12 rounded-full flex items-center justify-center transition-colors",
              isMuted
                ? "bg-zinc-700 text-zinc-400"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
            )}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <MicOff className="size-5" />
            ) : (
              <Mic className="size-5" />
            )}
          </button>

          <button
            onClick={endConversation}
            className="size-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors"
            aria-label="End conversation"
          >
            <PhoneOff className="size-6" />
          </button>
        </div>
      </footer>
    </div>
  );
}
