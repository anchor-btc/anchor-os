import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/components/button.tsx",
    "src/components/card.tsx",
    "src/components/input.tsx",
    "src/components/container.tsx",
    "src/components/footer.tsx",
    "src/components/layout/index.ts",
    "src/components/layout/app-shell.tsx",
    "src/components/layout/app-header.tsx",
    "src/components/layout/app-main.tsx",
    "src/components/layout/app-logo.tsx",
    "src/components/layout/nav-link.tsx",
    "src/components/layout/nav-group.tsx",
    "src/utils/cn.ts",
    "tailwind.config.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom", "tailwindcss", "lucide-react", "next", "next/navigation", "next/link"],
  treeshake: true,
  minify: false,
  banner: {
    js: '"use client";',
  },
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
});
