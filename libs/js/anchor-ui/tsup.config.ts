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
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  // Strip "use client" during build, add it back in onSuccess
  esbuildPlugins: [
    {
      name: 'strip-directives',
      setup(build) {
        build.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (args) => {
          const fs = await import('fs');
          const contents = fs.readFileSync(args.path, 'utf8');
          // Remove "use client" directive - will be added in onSuccess
          const stripped = contents.replace(/^['"]use client['"];?\s*\n?/gm, '');
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
  // Add "use client" to output files AFTER bundling (avoids rollup warnings)
  async onSuccess() {
    const fs = await import('fs');
    const path = await import('path');

    const addUseClient = (filePath: string) => {
      if (filePath.endsWith('.js') || filePath.endsWith('.cjs')) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.startsWith('"use client"')) {
          fs.writeFileSync(filePath, '"use client";\n' + content);
        }
      }
    };

    const walkDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          walkDir(fullPath);
        } else {
          addUseClient(fullPath);
        }
      }
    };

    walkDir('./dist/src');
    console.log('✓ Added "use client" to output files');
  },
});
