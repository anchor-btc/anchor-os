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
        // Retro pixel art palette
        background: "#0d0d0d",
        foreground: "#e0e0e0",
        primary: {
          DEFAULT: "#ff6b35",
          foreground: "#ffffff",
          dark: "#cc5429",
        },
        secondary: {
          DEFAULT: "#1a1a2e",
          foreground: "#a0a0a0",
        },
        accent: {
          DEFAULT: "#00d9ff",
          dark: "#00a8c4",
        },
        bitcoin: {
          DEFAULT: "#f7931a",
          dark: "#c47614",
        },
        canvas: {
          bg: "#1a1a1a",
          grid: "#2a2a2a",
          selection: "#ff6b35",
        },
        pixel: {
          hover: "rgba(255, 107, 53, 0.5)",
          selected: "rgba(0, 217, 255, 0.7)",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "pixel-blink": "pixel-blink 1s step-end infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(255, 107, 53, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(255, 107, 53, 0.8)" },
        },
        "pixel-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      backgroundImage: {
        "grid-pattern": `
          linear-gradient(rgba(255, 107, 53, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 107, 53, 0.03) 1px, transparent 1px)
        `,
        "gradient-radial": "radial-gradient(circle at 50% 0%, rgba(255, 107, 53, 0.1) 0%, transparent 50%)",
      },
      backgroundSize: {
        "grid": "20px 20px",
      },
    },
  },
  plugins: [],
} satisfies Config;


