# DOPPEL

**Have a voice conversation with your future self.**

DOPPEL uses ElevenLabs Instant Voice Cloning + Conversational AI 2.0 + Cloudflare Agents to create an immersive experience where you can talk with who you'll become 10 years from now — in your own voice.

## Features

- **Voice Cloning**: Record 30 seconds of speech to create your unique voice
- **AI Persona Generation**: Workers AI creates a believable "future you" based on your current situation
- **Text-to-Dialogue Opening**: Cinematic introduction in your cloned voice
- **Real-time Conversation**: Live voice chat via ElevenLabs Conversational AI 2.0
- **Shareable Replays**: Save and share your conversations

## Architecture

```
Browser (React + Vite)
  └─ WebSocket ─┬─ PresentSelfAgent (Durable Object)
                │    └─ Voice cloning, persona generation, memory
                │
                └─ FutureSelfAgent (Durable Object)
                     └─ Real-time Conversational AI proxy
```

## Prerequisites

1. **Cloudflare Account** with Workers, Durable Objects, and R2 enabled
2. **ElevenLabs API Key** with access to:
   - Instant Voice Cloning
   - Conversational AI 2.0
   - Text-to-Dialogue

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure Cloudflare

```bash
# Login to Cloudflare
npx wrangler login

# Create R2 bucket
npx wrangler r2 bucket create doppel-audio
```

### 3. Set secrets

```bash
npx wrangler secret put ELEVENLABS_API_KEY
```

### 4. Run development

```bash
# UI only (no Workers)
pnpm dev

# Full stack with Cloudflare Workers
pnpm dev:cf
```

### 5. Deploy

```bash
pnpm deploy
```

## Project Structure

```
src/
├── agents/
│   ├── present-self-agent.ts   # Permanent user agent (voice, sessions, memory)
│   └── future-self-agent.ts    # Per-session conversation agent
├── pages/
│   ├── landing.tsx             # Hero page
│   ├── setup.tsx               # Voice recording + situation input
│   ├── loading.tsx             # Persona generation progress
│   ├── conversation.tsx        # Live voice chat UI
│   └── replay.tsx              # Shareable transcript
├── components/
│   └── voice-recorder.tsx      # 30s audio recording with waveform
├── lib/
│   └── utils.ts                # Helpers
├── server.ts                   # Hono router + agent routing
├── client.tsx                  # React entry point
├── app.tsx                     # App shell
└── styles.css                  # Tailwind + custom styles
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/audio/:key` | Stream audio from R2 |
| `GET /api/replay/:sessionId` | Get session replay data |
| `* /agents/*` | Durable Object agent routing |

## Technologies

- **Frontend**: React 19, Vite, Tailwind CSS, React Router
- **Backend**: Cloudflare Workers, Durable Objects, Hono
- **AI**: Workers AI (Llama 3.1), ElevenLabs (Voice Clone, Conversational AI, Text-to-Dialogue)
- **Storage**: R2 (audio), SQLite in Durable Objects (metadata)

## Hackathon Entry

Built for the Cloudflare + ElevenLabs Hackathon 2025.

**Unique differentiators:**
- First to combine Instant Voice Clone + Conversational AI 2.0 + Text-to-Dialogue
- Persistent user memory across sessions via Durable Objects
- Cinematic opening sequence generated on-demand

---

MIT License
