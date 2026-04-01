import { Agent, type Connection, type ConnectionContext } from "agents";

interface PresentSelfState {
  userId: string;
  voiceId: string | null;
  voiceName: string | null;
  sessions: SessionSummary[];
  createdAt: number;
  lastSeenAt: number;
}

interface SessionSummary {
  sessionId: string;
  topic: string;
  summary: string;
  createdAt: number;
}

interface Persona {
  name: string;
  age: number;
  yearsAhead: number;
  keyInsights: string[];
  tone: string;
  openingLine: string;
  systemPrompt: string;
}

type CallableMethod =
  | "getState"
  | "cloneVoice"
  | "initSession"
  | "getSignedUrl"
  | "addSessionSummary"
  | "getMemory";

export class PresentSelfAgent extends Agent<Env, PresentSelfState> {
  async onStart(): Promise<void> {
    console.log("[PresentSelfAgent] onStart, name:", this.name);
    this.sql`
      CREATE TABLE IF NOT EXISTS voice_clones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voice_id TEXT NOT NULL,
        voice_name TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `;

    this.sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL UNIQUE,
        topic TEXT,
        summary TEXT,
        persona_json TEXT,
        agent_id TEXT,
        opening_audio_key TEXT,
        created_at INTEGER NOT NULL
      )
    `;

    // Migrate: add agent_id column if missing (from earlier schema)
    try {
      this.sql`ALTER TABLE sessions ADD COLUMN agent_id TEXT`;
    } catch {
      // Column already exists — ignore
    }
  }

  initialState: PresentSelfState = {
    userId: "",
    voiceId: null,
    voiceName: null,
    sessions: [],
    createdAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  onStateUpdate(
    state: PresentSelfState,
    _source: Connection | "server"
  ): PresentSelfState {
    return { ...state, lastSeenAt: Date.now() };
  }

  onConnect(connection: Connection, ctx: ConnectionContext): void {
    const url = new URL(ctx.request.url);
    const userId = url.searchParams.get("userId") ?? this.name;
    console.log("[PresentSelfAgent] onConnect, userId:", userId);

    if (!this.state.userId) {
      this.setState({ ...this.state, userId });
    }

    connection.send(JSON.stringify({ type: "connected", state: this.state }));
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = url.searchParams.get("method") as CallableMethod;
    console.log("[PresentSelfAgent] onRequest, method:", method);

    if (request.method === "POST" && method) {
      try {
        const body = (await request.json()) as Record<string, unknown>;
        console.log("[PresentSelfAgent] Calling:", method);
        const result = await this.handleCall(method, body);
        console.log("[PresentSelfAgent]", method, "completed successfully");
        return Response.json(result);
      } catch (e) {
        console.error("[PresentSelfAgent]", method, "failed:", (e as Error).message);
        return Response.json({ error: (e as Error).message }, { status: 500 });
      }
    }

    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  private async handleCall(
    method: CallableMethod,
    params: Record<string, unknown>
  ): Promise<unknown> {
    switch (method) {
      case "getState":
        return this.state;

      case "cloneVoice":
        return this.cloneVoice(params.audioBase64 as string);

      case "initSession":
        return this.initSession(
          params.situation as string,
          params.userAge as number,
          params.yearsAhead as number
        );

      case "getSignedUrl":
        return this.getSignedUrl(params.agentId as string);

      case "addSessionSummary":
        return this.addSessionSummary(
          params.sessionId as string,
          params.topic as string,
          params.summary as string
        );

      case "getMemory":
        return this.getMemory();

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  /**
   * Clone user's voice from audio recording
   */
  private async cloneVoice(audioBase64: string): Promise<{ voiceId: string }> {
    console.log("[PresentSelfAgent] cloneVoice: audio base64 length:", audioBase64.length);
    const audioBuffer = Uint8Array.from(atob(audioBase64), (c) =>
      c.charCodeAt(0)
    );
    console.log("[PresentSelfAgent] cloneVoice: decoded audio size:", audioBuffer.length, "bytes");
    const voiceName = `DOPPEL_${this.state.userId}_${Date.now()}`;

    const formData = new FormData();
    formData.append("name", voiceName);
    formData.append(
      "files",
      new Blob([audioBuffer], { type: "audio/webm" }),
      "recording.webm"
    );
    formData.append("remove_background_noise", "true");

    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": this.env.ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Voice cloning failed: ${error}`);
    }

    const data = (await response.json()) as { voice_id: string };
    const voiceId = data.voice_id;
    console.log("[PresentSelfAgent] cloneVoice: success, voiceId:", voiceId);

    this.sql`
      INSERT INTO voice_clones (voice_id, voice_name, created_at)
      VALUES (${voiceId}, ${voiceName}, ${Date.now()})
    `;

    this.setState({ ...this.state, voiceId, voiceName });

    return { voiceId };
  }

  /**
   * Initialize a new conversation session:
   * 1. Generate persona via Workers AI
   * 2. Create an ElevenLabs Conversational AI agent
   * 3. Return session data + agentId for browser-direct connection
   */
  private async initSession(
    situation: string,
    userAge: number,
    yearsAhead: number = 10
  ): Promise<{
    sessionId: string;
    persona: Persona;
    agentId: string;
  }> {
    if (!this.state.voiceId) {
      throw new Error("Voice not cloned yet");
    }

    const sessionId = crypto.randomUUID();
    const futureAge = userAge + yearsAhead;
    console.log("[PresentSelfAgent] initSession: sessionId:", sessionId, "situation:", situation.slice(0, 50), "age:", userAge, "->", futureAge);

    // Step 1: Generate persona with Workers AI
    const persona = await this.generatePersona(
      situation,
      userAge,
      futureAge,
      yearsAhead
    );
    console.log("[PresentSelfAgent] initSession: persona generated, creating ElevenLabs agent...");

    // Step 2: Create ElevenLabs Conversational AI agent
    const agentId = await this.createElevenLabsAgent(persona, situation);
    console.log("[PresentSelfAgent] initSession: ElevenLabs agent created:", agentId);

    // Store session in SQL
    this.sql`
      INSERT INTO sessions (session_id, topic, persona_json, agent_id, created_at)
      VALUES (${sessionId}, ${situation.slice(0, 200)}, ${JSON.stringify(persona)}, ${agentId}, ${Date.now()})
    `;

    return { sessionId, persona, agentId };
  }

  /**
   * Create an ElevenLabs Conversational AI agent with the cloned voice + persona
   */
  private async createElevenLabsAgent(
    persona: Persona,
    situation: string
  ): Promise<string> {
    const response = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
      method: "POST",
      headers: {
        "xi-api-key": this.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: persona.systemPrompt,
            },
            first_message: persona.openingLine,
            language: "en",
          },
          tts: {
            voice_id: this.state.voiceId,
          },
        },
        name: `DOPPEL_${situation.slice(0, 30)}_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[PresentSelfAgent] createElevenLabsAgent failed:", error);
      throw new Error(`Failed to create ElevenLabs agent: ${error}`);
    }

    const data = (await response.json()) as { agent_id: string };
    return data.agent_id;
  }

  /**
   * Get a signed URL for browser-direct connection to ElevenLabs ConvAI
   */
  private async getSignedUrl(agentId: string): Promise<{ signedUrl: string }> {
    console.log("[PresentSelfAgent] getSignedUrl for agent:", agentId);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": this.env.ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get signed URL: ${error}`);
    }

    const data = (await response.json()) as { signed_url: string };
    console.log("[PresentSelfAgent] getSignedUrl: success");
    return { signedUrl: data.signed_url };
  }

  /**
   * Generate future-self persona using Workers AI
   */
  private async generatePersona(
    situation: string,
    currentAge: number,
    futureAge: number,
    yearsAhead: number
  ): Promise<Persona> {
    const pastSessions = this.state.sessions.slice(-3);
    const memoryContext =
      pastSessions.length > 0
        ? `Previous conversations:\n${pastSessions.map((s) => `- ${s.topic}: ${s.summary}`).join("\n")}`
        : "";

    const prompt = `You are creating a persona for someone's future self, ${yearsAhead} years from now.

Current age: ${currentAge}
Future age: ${futureAge}
Their situation/decision: "${situation}"
${memoryContext}

Generate a JSON response with these exact fields:
{
  "name": "Future [their implied name or 'You']",
  "age": ${futureAge},
  "yearsAhead": ${yearsAhead},
  "keyInsights": ["insight1", "insight2", "insight3"],
  "tone": "warm but direct / contemplative / encouraging-with-edge",
  "openingLine": "A 1-2 sentence opening that references their situation with wisdom",
  "systemPrompt": "A detailed system prompt for the future self character (2-3 paragraphs)"
}

The future self should:
- Have made it through the decision they're facing
- Speak with earned wisdom, not condescension
- Reference specific details from their situation
- Be emotionally authentic — this IS them, just older

Return ONLY valid JSON, no markdown.`;

    const response = await (this.env.AI as any).run("@cf/meta/llama-3.1-70b-instruct", {
      prompt,
      max_tokens: 1000,
    });

    try {
      const text =
        typeof response === "string"
          ? response
          : (response as { response?: string }).response ?? "";
      return JSON.parse(text) as Persona;
    } catch {
      return {
        name: "Future You",
        age: futureAge,
        yearsAhead,
        keyInsights: [
          "Trust your instincts",
          "The fear passes",
          "You're stronger than you think",
        ],
        tone: "warm but direct",
        openingLine: `I remember being exactly where you are now, ${yearsAhead} years ago. Let me tell you something...`,
        systemPrompt: `You are the user's future self, ${yearsAhead} years older. You've lived through the decision they're facing about "${situation}". Speak with warmth and earned wisdom. You ARE them — same voice, same quirks, just with more perspective. Be emotionally authentic, not preachy.`,
      };
    }
  }

  private async addSessionSummary(
    sessionId: string,
    topic: string,
    summary: string
  ): Promise<void> {
    this.sql`
      UPDATE sessions SET summary = ${summary} WHERE session_id = ${sessionId}
    `;

    const sessions = [
      ...this.state.sessions,
      { sessionId, topic, summary, createdAt: Date.now() },
    ].slice(-10);

    this.setState({ ...this.state, sessions });
  }

  private getMemory(): SessionSummary[] {
    return this.state.sessions;
  }
}
