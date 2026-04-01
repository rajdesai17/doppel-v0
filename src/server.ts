import { routeAgentRequest } from "agents";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { PresentSelfAgent } from "./agents/present-self-agent";
import { FutureSelfAgent } from "./agents/future-self-agent";

// Re-export agents for Durable Object bindings
export { PresentSelfAgent, FutureSelfAgent };

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for development
app.use("*", cors());

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));

// Serve audio from R2
app.get("/api/audio/:key", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.AUDIO_BUCKET.get(key);

  if (!object) {
    return c.json({ error: "Audio not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType ?? "audio/mpeg");
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});

// Get session replay data
app.get("/api/replay/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");

  // Get metadata from R2
  const metadata = await c.env.AUDIO_BUCKET.get(`sessions/${sessionId}/metadata.json`);
  if (!metadata) {
    return c.json({ error: "Session not found" }, 404);
  }

  const data = await metadata.json();
  return c.json(data);
});

// Route agent requests (WebSocket connections)
app.all("/agents/*", async (c) => {
  const url = new URL(c.req.url);
  console.log("[server] Agent request:", c.req.method, url.pathname + url.search);
  const response = await routeAgentRequest(c.req.raw, c.env);
  if (response) {
    console.log("[server] Agent response status:", response.status);
    return response;
  }
  console.warn("[server] No agent matched for:", url.pathname);
  return c.json({ error: "Agent not found" }, 404);
});

// Fallback for SPA routing
app.get("*", async (c) => {
  // Let Vite handle static files in development
  return c.notFound();
});

export default app;
