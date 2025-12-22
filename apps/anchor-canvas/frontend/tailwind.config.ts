import type { Config } from "tailwindcss";
import { anchorPreset } from "@AnchorProtocol/ui";

export default {
  presets: [anchorPreset],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@AnchorProtocol/ui/dist/**/*.{js,mjs}",
  ],
  theme: {
    extend: {
      colors: {
        // Canvas-specific colors
        canvas: {
          bg: "#1a1a1a",
          grid: "#2a2a2a",
          selection: "#f43f5e", // rose-500
        },
        pixel: {
          hover: "rgba(244, 63, 94, 0.5)", // rose-500
          selected: "rgba(0, 217, 255, 0.7)",
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "pixel-blink": "pixel-blink 1s step-end infinite",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(244, 63, 94, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(244, 63, 94, 0.8)" },
        },
        "pixel-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      backgroundImage: {
        "grid-pattern": `
          linear-gradient(rgba(244, 63, 94, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(244, 63, 94, 0.03) 1px, transparent 1px)
        `,
        "gradient-radial": "radial-gradient(circle at 50% 0%, rgba(244, 63, 94, 0.1) 0%, transparent 50%)",
      },
      backgroundSize: {
        "grid": "20px 20px",
      },
    },
  },
  plugins: [],
} satisfies Config;
