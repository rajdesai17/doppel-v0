import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
        mono: ["DM Mono", "Geist Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fade-in 400ms ease-out forwards",
        "fade-up": "fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        breathe: "breathe 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
