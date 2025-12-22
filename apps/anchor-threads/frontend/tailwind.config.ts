import type { Config } from "tailwindcss";
import { anchorPreset } from "@AnchorProtocol/ui/tailwind.config";

export default {
  presets: [anchorPreset as Config],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Include UI library for Tailwind to scan
    "./node_modules/@AnchorProtocol/ui/dist/**/*.js",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
