# Anchor Protocol Documentation

This is the official documentation for the Anchor Protocol - a Bitcoin-native messaging protocol for embedding structured, immutable data on-chain.

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Install Dependencies

```bash
cd anchor/docs
npm install
```

### Start Development Server

```bash
npm run dev
```

The documentation site will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

The static site will be generated in `.vitepress/dist`.

### Preview Production Build

```bash
npm run preview
```

## Structure

```
docs/
├── .vitepress/
│   ├── config.ts       # VitePress configuration
│   └── theme/          # Custom theme
├── protocol/           # Protocol specification
│   ├── overview.md
│   ├── message-format.md
│   ├── carriers.md
│   └── anchoring.md
├── kinds/              # Message types reference
│   ├── index.md
│   ├── generic.md
│   ├── text.md
│   ├── state.md
│   ├── vote.md
│   ├── image.md
│   ├── geomarker.md
│   ├── dns.md
│   ├── proof.md
│   └── token.md
├── sdk/                # SDK documentation
│   ├── getting-started.md
│   ├── installation.md
│   ├── encoding.md
│   ├── parsing.md
│   ├── wallet.md
│   └── api-reference.md
├── examples/           # Code examples
│   ├── create-message.md
│   ├── reply-to-message.md
│   └── parse-transaction.md
├── index.md            # Homepage
└── package.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

### Writing Guidelines

- Use clear, concise language
- Include code examples for all concepts
- Follow the existing documentation structure
- Test all code examples before committing

## Deployment

The documentation is automatically deployed on push to the main branch using GitHub Actions. You can also deploy manually:

### GitHub Pages

```bash
npm run build
# Upload .vitepress/dist to GitHub Pages
```

### Vercel

```bash
vercel deploy --prod
```

### Netlify

```bash
netlify deploy --prod --dir=.vitepress/dist
```

## License

MIT License - see LICENSE file in the root directory for details.

