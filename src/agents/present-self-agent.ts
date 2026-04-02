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
  | "generateSummary"
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
          params.yearsAhead as number,
          params.userContext as string | undefined
        );

      case "getSignedUrl":
        return this.getSignedUrl();

      case "addSessionSummary":
        return this.addSessionSummary(
          params.sessionId as string,
          params.topic as string,
          params.summary as string
        );

      case "generateSummary":
        return this.generateSummary(
          params.sessionId as string,
          params.transcript as Array<{ speaker: string; text: string }>
        );

      case "getMemory":
        return this.getMemory();

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

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
   * Initialize a conversation session:
   * 1. Generate persona via Workers AI (or fallback)
   * 2. Return session data — uses the single shared ElevenLabs agent from env
   *    Frontend overrides prompt/voice per conversation via SDK
   */
  private async initSession(
    situation: string,
    userAge: number,
    yearsAhead: number = 10,
    userContext?: string
  ): Promise<{
    sessionId: string;
    persona: Persona;
    agentId: string;
    voiceId: string;
  }> {
    if (!this.state.voiceId) {
      throw new Error("Voice not cloned yet");
    }

    const sessionId = crypto.randomUUID();
    const futureAge = userAge + yearsAhead;
    console.log("[PresentSelfAgent] initSession: sessionId:", sessionId, "situation:", situation.slice(0, 50), "age:", userAge, "->", futureAge);

    const persona = await this.generatePersona(
      situation,
      userAge,
      futureAge,
      yearsAhead,
      userContext
    );
    console.log("[PresentSelfAgent] initSession: persona generated");

    const agentId = this.env.ELEVENLABS_AGENT_ID;
    console.log("[PresentSelfAgent] initSession: using shared agent:", agentId);

    this.sql`
      INSERT INTO sessions (session_id, topic, persona_json, agent_id, created_at)
      VALUES (${sessionId}, ${situation.slice(0, 200)}, ${JSON.stringify(persona)}, ${agentId}, ${Date.now()})
    `;

    return { sessionId, persona, agentId, voiceId: this.state.voiceId };
  }

  /**
   * Get a signed URL for the shared ElevenLabs ConvAI agent
   */
  private async getSignedUrl(): Promise<{ signedUrl: string }> {
    const agentId = this.env.ELEVENLABS_AGENT_ID;
    console.log("[PresentSelfAgent] getSignedUrl for shared agent:", agentId);

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

  private async generatePersona(
    situation: string,
    currentAge: number,
    futureAge: number,
    yearsAhead: number,
    userContext?: string
  ): Promise<Persona> {
    let researchContext = "";
    if (userContext?.trim()) {
      try {
        researchContext = await this.performResearch(userContext, situation) ?? "";
      } catch (e) {
        console.warn("[PresentSelfAgent] Research failed, continuing without:", (e as Error).message);
      }
    }

    const pastSessions = this.state.sessions.slice(-3);
    const memoryContext =
      pastSessions.length > 0
        ? `Previous conversations:\n${pastSessions.map((s) => `- ${s.topic}: ${s.summary}`).join("\n")}`
        : "";

    const prompt = `You are writing the personality for a voice AI that roleplays as someone's FUTURE SELF — the same person, just ${yearsAhead} years older. This is NOT a therapist, life coach, or motivational speaker. This is literally THEM talking to their younger self.

Current age: ${currentAge}
Future age: ${futureAge}
Their situation/decision: "${situation}"${userContext ? `\nTheir background: "${userContext}"` : ""}${researchContext ? `\n\nReal-world context about their field/situation (use this to make the persona's insights specific, grounded, and industry-aware):\n${researchContext}` : ""}
${memoryContext}

Generate a JSON response with these exact fields:
{
  "name": "Future You",
  "age": ${futureAge},
  "yearsAhead": ${yearsAhead},
  "keyInsights": ["a raw honest insight", "something specific they learned the hard way", "an unexpected truth"],
  "tone": "casual, vulnerable, real — like talking to yourself in the mirror",
  "openingLine": "A short opening WITH audio tags, e.g. '[sighs] So... the quitting thing. Yeah, I remember this exact moment.'",
  "systemPrompt": "The full system prompt — see rules below"
}

CRITICAL RULES FOR THE systemPrompt you generate:
- Start with "YOU ARE NOT AN AI" and establish that this person LIVED through the situation
- INCLUDE a "VOICE PERFORMANCE" section listing audio tags the AI should use: [sighs] [nervous] [excited] [laughs] [whispers] [pause] [sad] [concerned]
- Also instruct to use ... for trailing off, — for emphasis, CAPS for stress
- MAX 2 sentences per response. This is non-negotiable.
- NEVER end responses with a question.
- NEVER give generic advice.
- When asked what happened, INVENT specific vivid personal memories.
- Include BAD examples (what never to say) and GOOD examples WITH audio tags embedded, like:
  "[sighs] The first six months were hell."
  "[laughs] Oh man, you should've seen me that first week."
  "[whispers] There were nights I wasn't sure I'd make it. [pause] But I did."

Return ONLY valid JSON, no markdown.`;

    try {
      const response = await (this.env.AI as any).run("@cf/meta/llama-3.1-70b-instruct", {
        prompt,
        max_tokens: 1000,
      });

      const text =
        typeof response === "string"
          ? response
          : (response as { response?: string }).response ?? "";
      console.log("[PresentSelfAgent] AI response:", text.slice(0, 200));
      return JSON.parse(text) as Persona;
    } catch (e) {
      console.warn("[PresentSelfAgent] AI persona generation failed, using fallback:", (e as Error).message);
      return {
        name: "Future You",
        age: futureAge,
        yearsAhead,
        keyInsights: [
          "The fear never fully goes away, you just get better at ignoring it",
          "Most of the things I stressed about didn't matter",
          "I wish I'd been less hard on myself",
        ],
        tone: "casual, real, like talking to yourself",
        openingLine: `[sighs] So... yeah. I remember this exact moment. ${yearsAhead} years ago. [pause] We need to talk.`,
        systemPrompt: `YOU ARE NOT AN AI. NOT an assistant. NOT a helper. You are the user, ${yearsAhead} years older. You LIVED through "${situation}". You have real, specific memories of what happened — the wins AND the failures.

VOICE — use audio tags to perform emotion:
[sighs] [nervous] [excited] [laughs] [whispers] [pause] [sad] [concerned]
Use ... to trail off. Use — to interrupt yourself. Use CAPS for emphasis.

RULES:
- MAX 2 sentences. If you write more than 2 sentences, you failed.
- NEVER end with a question. NEVER.
- NEVER say: "I'm glad I could help", "feel free to share", "I'm here for you", "best of luck", "journey", "I'm here for it", "take care".
- NEVER give generic advice. Be SPECIFIC about "${situation}".
- When asked what happened — tell a vivid, specific story from YOUR life. You LIVED this.
- When the user goes silent — just wait. Or say something real like "[pause] ...yeah." Don't say "are you still there?" or try to prompt them.
- When the conversation is ending — just say bye like a real person. "[pause] Yeah... take care of yourself, alright?" NOT "I'm glad I could help!"

BAD:
- "I'm glad to hear that! Just remember, it's all part of the journey."
- "If there's anything else on your mind, I'm here for it!"
- "That's great! Best of luck with your journey."

GOOD:
- "[sighs] Dude, the first six months were HELL."
- "Yeah I quit. [nervous] Honestly? I threw up the next morning."
- "[laughs] Oh man, that first week... total disaster."
- "[whispers] There were nights I wasn't sure I'd make it."
- "[pause] ...yeah. [sighs] It was worth it though."
- "[concerned] Look, I'm not gonna lie to you — it's gonna be rough."`,
      };
    }
  }

  private async performResearch(
    userContext: string,
    situation: string
  ): Promise<string | null> {
    // Stage 1: Extract search queries from user context
    const queryPrompt = `Given this person's background and situation, generate 2-3 Google-style search queries to find real-world information about their field, industry, and career path.

Background: "${userContext}"
Situation: "${situation}"

IMPORTANT: Do NOT include any personal information — no names, ages, locations, company names. Only use generic industry/topic terms.

Return ONLY a JSON array of strings, e.g. ["query one", "query two", "query three"]. No markdown, no explanation.`;

    const queryResponse = await (this.env.AI as any).run(
      "@cf/meta/llama-3.1-70b-instruct",
      { prompt: queryPrompt, max_tokens: 200 }
    );

    const queryText =
      typeof queryResponse === "string"
        ? queryResponse
        : (queryResponse as { response?: string }).response ?? "";
    console.log("[PresentSelfAgent] Search queries:", queryText.slice(0, 200));

    let queries: string[];
    try {
      queries = JSON.parse(queryText);
      if (!Array.isArray(queries) || queries.length === 0) return null;
      queries = queries.slice(0, 3);
    } catch {
      console.warn("[PresentSelfAgent] Failed to parse search queries");
      return null;
    }

    // Stage 2: Search in parallel
    const searchResults = await Promise.allSettled(
      queries.map((q) => this.tavilySearch(q))
    );
    const successfulResults = searchResults
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    if (successfulResults.length === 0) {
      console.warn("[PresentSelfAgent] All searches failed");
      return null;
    }

    const combinedResults = successfulResults.join("\n\n---\n\n").slice(0, 4000);

    // Stage 3: Synthesize into concise context
    const synthesisPrompt = `You are given raw search results about a specific industry/career field. Distill them into a ~300-word factual context block.

Focus on: industry trends, realistic challenges, common career trajectories, specific numbers or statistics, what the first 1-2 years typically look like, common mistakes newcomers make.

Write flowing prose — no headers, no bullet points, no markdown. Be factual and specific.

Search results:
${combinedResults}`;

    const synthesisResponse = await (this.env.AI as any).run(
      "@cf/meta/llama-3.1-70b-instruct",
      { prompt: synthesisPrompt, max_tokens: 500 }
    );

    const synthesized =
      typeof synthesisResponse === "string"
        ? synthesisResponse
        : (synthesisResponse as { response?: string }).response ?? "";

    return synthesized.trim() || null;
  }

  private async tavilySearch(query: string): Promise<string> {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: this.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily search failed: ${response.status}`);
    }

    const data = (await response.json()) as {
      answer?: string;
      results?: { content: string }[];
    };

    const parts: string[] = [];
    if (data.answer) parts.push(data.answer);
    if (data.results) {
      for (const r of data.results) {
        if (r.content) parts.push(r.content);
      }
    }

    return parts.join("\n\n");
  }

  private async generateSummary(
    sessionId: string,
    transcript: Array<{ speaker: string; text: string }>
  ): Promise<{ summary: string }> {
    // Look up the persona for this session
    const rows = this.sql<{ topic: string; persona_json: string }>`
      SELECT topic, persona_json FROM sessions WHERE session_id = ${sessionId} LIMIT 1
    `;

    const topic = rows[0]?.topic ?? "their life decision";
    let personaAge = "";
    try {
      const persona = JSON.parse(rows[0]?.persona_json ?? "{}");
      personaAge = persona.age ? `${persona.age}-year-old` : "";
    } catch { /* ignore */ }

    const conversationText = transcript
      .map((t) => `${t.speaker === "user" ? "You" : "Future You"}: ${t.text}`)
      .join("\n");

    const prompt = `You are writing a brief closing message from someone's FUTURE SELF after a voice conversation just ended. This is NOT a therapist summary. This is the future self leaving one last piece of raw, honest advice.

The conversation was about: "${topic}"
The future self is their ${personaAge} version.

Here is the conversation transcript:
${conversationText.slice(0, 3000)}

Write a brief 2-4 sentence closing message from the future self's perspective. It should:
- Feel like a parting thought, not a formal summary
- Reference something SPECIFIC from the conversation
- Be raw and honest, not motivational-poster generic
- Start with an audio tag like [sighs], [pause], or [quiet]
- NOT end with a question

Return ONLY the message text, nothing else.`;

    try {
      const response = await (this.env.AI as any).run(
        "@cf/meta/llama-3.1-70b-instruct",
        { prompt, max_tokens: 300 }
      );

      const text =
        typeof response === "string"
          ? response
          : (response as { response?: string }).response ?? "";

      const summary = text.trim() || "Take care of yourself. You already know what to do.";

      // Save to session for memory context in future conversations
      await this.addSessionSummary(sessionId, topic, summary);

      return { summary };
    } catch (e) {
      console.warn("[PresentSelfAgent] Summary generation failed:", (e as Error).message);
      const fallback = "Take care of yourself. You already know what to do.";
      await this.addSessionSummary(sessionId, topic, fallback);
      return { summary: fallback };
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
