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
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

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
    } catch (e) {
      console.error("Audio playback error:", e);
      isPlayingRef.current = false;
      playNextAudio();
    }
  }, []);

  // Connect to agent WebSocket
  useEffect(() => {
    const userId = getUserId();
    const wsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/agents/future-self-agent/${sessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");

      // Get session config from PresentSelfAgent and start conversation
      fetch(`/agents/present-self-agent/${userId}?method=getState`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then((r) => r.json())
        .then((state) => {
          // Start conversation with config
          ws.send(
            JSON.stringify({
              type: "start_conversation",
              config: {
                sessionId,
                voiceId: state.voiceId,
                systemPrompt:
                  state.sessions?.find(
                    (s: { sessionId: string }) => s.sessionId === sessionId
                  )?.persona?.systemPrompt ||
                  "You are the user's future self, 10 years older. Speak with warmth and earned wisdom.",
              },
            })
          );
        })
        .catch((e) => {
          console.error("Failed to get session config:", e);
        });
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "conversation_started":
            startMicrophoneStream();
            break;

          case "audio":
            // Decode base64 audio and queue for playback
            const audioBytes = Uint8Array.from(atob(data.audio), (c) =>
              c.charCodeAt(0)
            );
            audioQueueRef.current.push(audioBytes.buffer);
            playNextAudio();
            break;

          case "transcript":
            setTranscript((prev) => [...prev, data.entry]);
            break;

          case "interruption":
            // User interrupted — stop playback
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setActiveSpeaker(null);
            break;

          case "conversation_ended":
            setStatus("disconnected");
            navigate(`/replay/${data.sessionId}`);
            break;

          case "error":
            console.error("Agent error:", data.message);
            setStatus("error");
            break;
        }
      } catch (e) {
        console.error("WebSocket message error:", e);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      if (status !== "disconnected") {
        setStatus("disconnected");
      }
    };

    return () => {
      ws.close();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [sessionId, navigate, playNextAudio, status]);

  // Start streaming microphone to agent
  const startMicrophoneStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup analyzer for visualization
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);

      // Setup recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
          const base64 = await blobToBase64(e.data);
          wsRef.current.send(
            JSON.stringify({
              type: "audio_chunk",
              audio: base64,
            })
          );
          setActiveSpeaker("user");
        }
      };

      mediaRecorder.start(100); // Send chunks every 100ms
      mediaRecorderRef.current = mediaRecorder;

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
        requestAnimationFrame(updateLevels);
      };
      updateLevels();
    } catch (e) {
      console.error("Microphone access error:", e);
      setStatus("error");
    }
  };

  // End conversation
  const endConversation = () => {
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
