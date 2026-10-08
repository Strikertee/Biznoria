/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Cascadia Mono", "Consolas", "ui-monospace", "monospace"],
      },
      colors: {
        /** Obsidian / deep-charcoal surface scale for the dark shell. */
        ink: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          850: "#151C2C",
          900: "#111827",
          950: "#0B0F19",
        },
        /** Retained for Wema brand accents. */
        wema: {
          50: "#f5f0fa",
          100: "#ede4f6",
          200: "#d9c8ec",
          300: "#bda0dd",
          400: "#9a72c8",
          500: "#7a4fb0",
          600: "#5c2d91",
          700: "#4a2375",
          800: "#3e1c63",
          900: "#2f1549",
        },
      },
      boxShadow: {
        card: "0 1px 1px rgba(0,0,0,.4), 0 10px 26px -16px rgba(0,0,0,.7)",
        "card-hover": "0 2px 4px rgba(0,0,0,.45), 0 18px 36px -20px rgba(0,0,0,.8)",
        "glow-emerald":
          "0 0 0 1px rgba(16,185,129,.38), 0 5px 18px -12px rgba(16,185,129,.55)",
        "glow-risk": "0 0 0 1px rgba(239,68,68,.42), 0 5px 18px -12px rgba(239,68,68,.55)",
      },
      backgroundImage: {
        "card-sheen":
          "linear-gradient(160deg, rgba(255,255,255,.045) 0%, rgba(255,255,255,0) 42%, rgba(0,0,0,.12) 100%)",
      },
      keyframes: {
        "pulse-risk": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 0 0 rgba(239,68,68,.35)" },
          "50%": { opacity: ".92", boxShadow: "0 0 0 6px rgba(239,68,68,0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "pulse-risk": "pulse-risk 2.4s ease-in-out infinite",
        "fade-up": "fade-up .35s cubic-bezier(.22,1,.36,1) both",
        shimmer: "shimmer 1.6s infinite",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(.22,1,.36,1)",
      },
    },
  },
  plugins: [],
};
