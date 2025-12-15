import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme inspired by Zapin.me
        background: "#0a0a0f",
        foreground: "#e8e8e8",
        primary: {
          DEFAULT: "#FF6B35",
          foreground: "#ffffff",
          dark: "#cc5429",
        },
        secondary: {
          DEFAULT: "#12121a",
          foreground: "#9ca3af",
        },
        accent: {
          DEFAULT: "#00d9ff",
          dark: "#00a8c4",
        },
        bitcoin: {
          DEFAULT: "#f7931a",
          dark: "#c47614",
        },
        // Category colors
        category: {
          general: "#FF6B35",
          tourism: "#3B82F6",
          commerce: "#10B981",
          event: "#8B5CF6",
          warning: "#EF4444",
          historic: "#F59E0B",
        },
        // Map related
        map: {
          bg: "#1a1a24",
          popup: "#1e1e2a",
          border: "#2a2a3a",
        },
      },
      fontFamily: {
        heading: ["Archivo Black", "Impact", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "bounce-in": "bounce-in 0.5s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(255, 107, 53, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(255, 107, 53, 0.8)" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(circle at 50% 0%, rgba(255, 107, 53, 0.1) 0%, transparent 50%)",
        "gradient-dark": "linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

