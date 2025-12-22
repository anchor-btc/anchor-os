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
        // Category colors for markers
        category: {
          general: "#3B82F6", // blue-500
          tourism: "#06B6D4", // cyan-500
          commerce: "#10B981", // emerald-500
          event: "#8B5CF6", // violet-500
          warning: "#EF4444", // red-500
          historic: "#F59E0B", // amber-500
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
          "0%": { boxShadow: "0 0 5px rgba(59, 130, 246, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.8)" },
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
        "gradient-radial": "radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
        "gradient-dark": "linear-gradient(180deg, #0a0a0f 0%, #12121a 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
