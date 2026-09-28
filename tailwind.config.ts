import type { Config } from "tailwindcss";

/**
 * Gavl's visual system. Deep warm-ink canvas, auction-gold as the money colour,
 * an electric "arc" for live states, ember for anything counting down.
 * Numerics lean on a tabular mono so prices and timers sit like a trading terminal.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0a0c",
          900: "#0f0f13",
          850: "#14141a",
          800: "#1a1a22",
          750: "#22222c",
          700: "#2b2b37",
          600: "#3a3a48",
        },
        gold: {
          DEFAULT: "#e8b34a",
          soft: "#f3cd7e",
          deep: "#b8842a",
          glow: "#ffcf6b",
        },
        arc: {
          DEFAULT: "#6f6bff",
          soft: "#9a97ff",
          deep: "#4b47d6",
        },
        ember: {
          DEFAULT: "#ff5a4d",
          soft: "#ff8a80",
          deep: "#d83a2e",
        },
        mint: {
          DEFAULT: "#37e0a8",
          deep: "#1fae7f",
        },
        medal: {
          gold: "#f5c451",
          silver: "#c9d1dc",
          bronze: "#d08a4e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        "glow-gold": "0 0 0 1px rgba(232,179,74,0.25), 0 8px 40px -12px rgba(232,179,74,0.4)",
        "glow-arc": "0 0 0 1px rgba(111,107,255,0.3), 0 8px 40px -12px rgba(111,107,255,0.45)",
        "glow-ember": "0 0 0 1px rgba(255,90,77,0.3), 0 8px 40px -12px rgba(255,90,77,0.5)",
        panel: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.9)",
      },
      backgroundImage: {
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.82)" },
        },
        "bid-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "60%": { opacity: "1" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "flash-gold": {
          "0%": { backgroundColor: "rgba(232,179,74,0.28)" },
          "100%": { backgroundColor: "rgba(232,179,74,0)" },
        },
        "rank-rise": {
          "0%": { color: "#37e0a8", transform: "translateY(2px)" },
          "100%": { color: "inherit", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "count-tick": {
          "0%": { transform: "translateY(-40%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "live-pulse": "live-pulse 1.4s ease-in-out infinite",
        "bid-in": "bid-in 0.35s cubic-bezier(0.2,0.9,0.3,1)",
        "flash-gold": "flash-gold 1.1s ease-out",
        "rank-rise": "rank-rise 1.2s ease-out",
        shimmer: "shimmer 1.8s infinite",
        "count-tick": "count-tick 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
