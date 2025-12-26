import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/components/button.tsx',
    'src/components/card.tsx',
    'src/components/input.tsx',
    'src/components/container.tsx',
    'src/components/footer.tsx',
    'src/components/layout/index.ts',
    'src/components/layout/app-shell.tsx',
    'src/components/layout/app-header.tsx',
    'src/components/layout/app-main.tsx',
    'src/components/layout/app-logo.tsx',
    'src/components/layout/nav-link.tsx',
    'src/components/layout/nav-group.tsx',
    'src/utils/cn.ts',
    'tailwind.config.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-dom',
    'tailwindcss',
    'lucide-react',
    'next',
    'next/navigation',
    'next/link',
  ],
  treeshake: true,
  minify: false,
  banner: {
    js: '"use client";',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
    // Strip "use client" from source to avoid duplicate warnings
    // The banner above handles adding it to the output
    options.drop = options.drop || [];
  },
  // Suppress "use client" directive warnings - the banner handles this
  onSuccess: async () => {
    console.log('✓ Build complete with "use client" banner applied');
  },
  silent: false,
  // Ignore module level directive warnings since banner handles "use client"
  esbuildPlugins: [
    {
      name: 'strip-use-client',
      setup(build) {
        build.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args) => {
          const fs = await import('fs');
          const contents = fs.readFileSync(args.path, 'utf8');
          // Remove "use client" directive from source - banner will add it
          const stripped = contents.replace(/^['"]use client['"];?\s*/m, '');
          return {
            contents: stripped,
            loader: args.path.endsWith('.tsx')
              ? 'tsx'
              : args.path.endsWith('.ts')
                ? 'ts'
                : args.path.endsWith('.jsx')
                  ? 'jsx'
                  : 'js',
          };
        });
      },
    },
  ],
});
