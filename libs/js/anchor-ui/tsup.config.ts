import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/components/button.tsx",
    "src/components/card.tsx",
    "src/components/input.tsx",
    "src/utils/cn.ts",
    "tailwind.config.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "tailwindcss"],
  treeshake: true,
  minify: false,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});

