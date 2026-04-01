import { Agent, type Connection, type ConnectionContext } from "agents";

interface FutureSelfState {
  sessionId: string;
  personaSystemPrompt: string;
  voiceId: string;
  status: "idle" | "connecting" | "active" | "ended";
  transcript: TranscriptEntry[];
  startedAt: number | null;
  endedAt: number | null;
}

interface TranscriptEntry {
  speaker: "user" | "future";
  text: string;
  timestamp: number;
}

interface ConversationConfig {
  sessionId: string;
  voiceId: string;
  systemPrompt: string;
}

export class FutureSelfAgent extends Agent<Env, FutureSelfState> {
  private elevenLabsWs: WebSocket | null = null;
  private browserConnection: Connection | null = null;

  async onStart(): Promise<void> {
    // Initialize SQL schema for transcripts
    this.sql`
      CREATE TABLE IF NOT EXISTS transcript_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        speaker TEXT NOT NULL,
        text TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `;

    this.sql`
      CREATE TABLE IF NOT EXISTS audio_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_index INTEGER NOT NULL,
        r2_key TEXT NOT NULL,
        duration_ms INTEGER,
        created_at INTEGER NOT NULL
      )
    `;
  }

  initialState: FutureSelfState = {
    sessionId: "",
    personaSystemPrompt: "",
    voiceId: "",
    status: "idle",
    transcript: [],
    startedAt: null,
    endedAt: null,
  };

  onConnect(connection: Connection, _ctx: ConnectionContext): void {
    console.log("[FutureSelfAgent] onConnect, name:", this.name);
    this.browserConnection = connection;
    connection.send(JSON.stringify({ type: "connected", state: this.state }));
  }

  onClose(connection: Connection): void {
    console.log("[FutureSelfAgent] onClose");
    if (this.browserConnection === connection) {
      this.browserConnection = null;
      this.cleanup();
    }
  }

  async onMessage(connection: Connection, message: string): Promise<void> {
    try {
      const data = JSON.parse(message);
      console.log("[FutureSelfAgent] onMessage:", data.type);

      switch (data.type) {
        case "start_conversation":
          console.log("[FutureSelfAgent] Starting conversation, voiceId:", data.config?.voiceId);
          await this.startConversation(data.config as ConversationConfig);
          break;

        case "audio_chunk":
          this.forwardAudioToElevenLabs(data.audio as string);
          break;

        case "end_conversation":
          console.log("[FutureSelfAgent] Ending conversation");
          await this.endConversation();
          break;

        default:
          console.warn("[FutureSelfAgent] Unknown message type:", data.type);
      }
    } catch (e) {
      console.error("[FutureSelfAgent] Error handling message:", e);
      connection.send(
        JSON.stringify({ type: "error", message: (e as Error).message })
      );
    }
  }

  /**
   * Start real-time conversation with ElevenLabs Conversational AI
   */
  private async startConversation(config: ConversationConfig): Promise<void> {
    this.setState({
      ...this.state,
      sessionId: config.sessionId,
      voiceId: config.voiceId,
      personaSystemPrompt: config.systemPrompt,
      status: "connecting",
      startedAt: Date.now(),
    });

    try {
      console.log("[FutureSelfAgent] Connecting to ElevenLabs ConvAI...");
      const wsUrl = new URL(
        "https://api.elevenlabs.io/v1/convai/conversation"
      );
      wsUrl.searchParams.set("agent_id", "custom");

      const response = await fetch(wsUrl.toString(), {
        headers: {
          Upgrade: "websocket",
          "xi-api-key": this.env.ELEVENLABS_API_KEY,
        },
      });

      const ws = (response as any).webSocket as WebSocket;
      if (!ws) {
        throw new Error("Failed to establish WebSocket connection");
      }

      ws.accept();
      this.elevenLabsWs = ws;
      console.log("[FutureSelfAgent] ElevenLabs WebSocket connected");

      // Send conversation initialization config
      ws.send(
        JSON.stringify({
          type: "conversation_initiation_client_data",
          conversation_config_override: {
            agent: {
              prompt: {
                prompt: config.systemPrompt,
              },
              first_message:
                "I've been waiting for this moment. What's on your mind?",
              language: "en",
            },
            tts: {
              voice_id: config.voiceId,
              model_id: "eleven_flash_v2_5",
              optimize_streaming_latency: 3,
            },
            stt: {
              model_id: "scribe_v1",
            },
          },
        })
      );

      // Handle messages from ElevenLabs
      ws.addEventListener("message", (event) => {
        this.handleElevenLabsMessage(event.data as string);
      });

      ws.addEventListener("close", () => {
        this.elevenLabsWs = null;
        if (this.state.status === "active") {
          this.setState({ ...this.state, status: "ended" });
        }
      });

      ws.addEventListener("error", (e) => {
        console.error("ElevenLabs WebSocket error:", e);
        this.browserConnection?.send(
          JSON.stringify({ type: "error", message: "Connection error" })
        );
      });

      this.setState({ ...this.state, status: "active" });
      console.log("[FutureSelfAgent] Conversation started, status: active");
      this.browserConnection?.send(
        JSON.stringify({ type: "conversation_started" })
      );
    } catch (e) {
      console.error("[FutureSelfAgent] Failed to start conversation:", e);
      this.setState({ ...this.state, status: "idle" });
      this.browserConnection?.send(
        JSON.stringify({
          type: "error",
          message: `Failed to start: ${(e as Error).message}`,
        })
      );
    }
  }

  /**
   * Handle messages from ElevenLabs Conversational AI
   */
  private handleElevenLabsMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log("[FutureSelfAgent] ElevenLabs msg:", message.type);

      switch (message.type) {
        case "audio":
          // Forward audio to browser
          this.browserConnection?.send(
            JSON.stringify({
              type: "audio",
              audio: message.audio_event?.audio_base_64 ?? message.audio,
            })
          );
          break;

        case "user_transcript":
          // User's speech transcribed
          this.addTranscriptEntry("user", message.user_transcription_event?.user_transcript ?? message.text);
          break;

        case "agent_response":
          // Agent's text response
          this.addTranscriptEntry("future", message.agent_response_event?.agent_response ?? message.text);
          break;

        case "interruption":
          // User interrupted
          this.browserConnection?.send(
            JSON.stringify({ type: "interruption" })
          );
          break;

        case "ping":
          // Respond to keepalive
          this.elevenLabsWs?.send(JSON.stringify({ type: "pong" }));
          break;

        default:
          // Forward other events to browser for debugging
          this.browserConnection?.send(
            JSON.stringify({ type: "elevenlabs_event", event: message })
          );
      }
    } catch (e) {
      console.error("Error parsing ElevenLabs message:", e);
    }
  }

  /**
   * Forward user audio to ElevenLabs
   */
  private forwardAudioToElevenLabs(audioBase64: string): void {
    if (this.elevenLabsWs?.readyState === WebSocket.OPEN) {
      this.elevenLabsWs.send(
        JSON.stringify({
          type: "audio",
          audio: audioBase64,
        })
      );
    }
  }

  /**
   * Add entry to transcript
   */
  private addTranscriptEntry(speaker: "user" | "future", text: string): void {
    const entry: TranscriptEntry = {
      speaker,
      text,
      timestamp: Date.now(),
    };

    // Store in SQL
    this.sql`
      INSERT INTO transcript_entries (speaker, text, timestamp)
      VALUES (${speaker}, ${text}, ${entry.timestamp})
    `;

    // Update state
    const transcript = [...this.state.transcript, entry];
    this.setState({ ...this.state, transcript });

    // Send to browser
    this.browserConnection?.send(
      JSON.stringify({ type: "transcript", entry })
    );
  }

  /**
   * End conversation and save to R2
   */
  private async endConversation(): Promise<void> {
    // Close ElevenLabs connection
    this.elevenLabsWs?.close();
    this.elevenLabsWs = null;

    this.setState({ ...this.state, status: "ended", endedAt: Date.now() });

    // Save session metadata to R2
    const metadata = {
      sessionId: this.state.sessionId,
      transcript: this.state.transcript,
      startedAt: this.state.startedAt,
      endedAt: this.state.endedAt,
      duration: this.state.endedAt! - this.state.startedAt!,
    };

    await this.env.AUDIO_BUCKET.put(
      `sessions/${this.state.sessionId}/metadata.json`,
      JSON.stringify(metadata),
      { httpMetadata: { contentType: "application/json" } }
    );

    // Generate summary for memory
    const summary = await this.generateSummary();

    this.browserConnection?.send(
      JSON.stringify({
        type: "conversation_ended",
        sessionId: this.state.sessionId,
        summary,
      })
    );
  }

  /**
   * Generate conversation summary using Workers AI
   */
  private async generateSummary(): Promise<string> {
    const transcriptText = this.state.transcript
      .map((e) => `${e.speaker === "user" ? "Present" : "Future"}: ${e.text}`)
      .join("\n");

    const response = await (this.env.AI as any).run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: `Summarize this conversation between someone and their future self in 2-3 sentences. Focus on the key insights and emotional moments.\n\n${transcriptText}`,
      max_tokens: 200,
    });

    const text =
      typeof response === "string"
        ? response
        : (response as { response?: string }).response ?? "";
    return text || "A meaningful conversation took place.";
  }

  /**
   * Cleanup on disconnect
   */
  private cleanup(): void {
    if (this.elevenLabsWs) {
      this.elevenLabsWs.close();
      this.elevenLabsWs = null;
    }
  }
}
