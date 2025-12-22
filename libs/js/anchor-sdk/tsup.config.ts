import { defineConfig } from "tsup";

export default defineConfig([
  // Main build (Node.js + Browser compatible core)
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    splitting: false,
    treeshake: true,
  },
  // Browser-only build (no Node.js dependencies)
  {
    entry: ["src/browser.ts"],
    format: ["esm"],
    dts: true,
    sourcemap: true,
    target: "es2022",
    platform: "browser",
    splitting: false,
    treeshake: true,
  },
]);

