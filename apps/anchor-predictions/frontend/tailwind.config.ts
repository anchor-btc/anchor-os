import type { Config } from "tailwindcss";
import { anchorPreset } from "@AnchorProtocol/ui/tailwind.config";

export default {
  presets: [anchorPreset as Config],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@AnchorProtocol/ui/dist/**/*.js",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
