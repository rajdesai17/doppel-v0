/**
 * UI-only Vite config for development without Cloudflare Workers
 * Use this to preview the React UI in isolation
 * 
 * For full Cloudflare Workers development:
 * 1. Run `npx wrangler login` to authenticate
 * 2. Run `pnpm dev:cf` to start with Workers
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: "./index.html",
    },
  },
});
