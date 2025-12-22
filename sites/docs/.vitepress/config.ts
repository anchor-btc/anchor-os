import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Anchor Protocol',
  description: 'Bitcoin-native messaging protocol for embedding structured data on-chain',
  
  // Ignore dead links to external files during build
  ignoreDeadLinks: [
    /^\.\.\//, // Ignore relative links to parent directories
  ],

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#f7931a' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Anchor Protocol Documentation' }],
    ['meta', { property: 'og:description', content: 'Bitcoin-native messaging protocol for embedding structured data on-chain' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: 'Protocol', link: '/protocol/overview' },
      { text: 'Kinds', link: '/kinds/' },
      { text: 'SDK', link: '/sdk/getting-started' },
      { text: 'Examples', link: '/examples/create-message' },
      { text: 'Development', link: '/development/' },
      {
        text: 'Apps',
        items: [
          { text: 'Anchor Threads', link: 'https://threads.anchor.dev' },
          { text: 'Anchor Tokens', link: 'https://tokens.anchor.dev' },
          { text: 'Anchor DNS', link: 'https://dns.anchor.dev' },
          { text: 'Anchor Proof', link: 'https://proof.anchor.dev' },
          { text: 'Anchor Map', link: 'https://map.anchor.dev' },
          { text: 'Anchor Pixel', link: 'https://pixel.anchor.dev' },
        ]
      }
    ],

    sidebar: {
      '/protocol/': [
        {
          text: 'Protocol Specification',
          items: [
            { text: 'Overview', link: '/protocol/overview' },
            { text: 'Message Format', link: '/protocol/message-format' },
            { text: 'Carrier Types', link: '/protocol/carriers' },
            { text: 'Anchoring System', link: '/protocol/anchoring' },
          ]
        }
      ],
      '/kinds/': [
        {
          text: 'Kinds Reference',
          items: [
            { text: 'Overview', link: '/kinds/' },
            { text: 'Generic (0)', link: '/kinds/generic' },
            { text: 'Text (1)', link: '/kinds/text' },
            { text: 'State (2)', link: '/kinds/state' },
            { text: 'Vote (3)', link: '/kinds/vote' },
            { text: 'Image (4)', link: '/kinds/image' },
            { text: 'GeoMarker (5)', link: '/kinds/geomarker' },
            { text: 'DNS (10)', link: '/kinds/dns' },
            { text: 'Proof (11)', link: '/kinds/proof' },
            { text: 'Token (20)', link: '/kinds/token' },
          ]
        }
      ],
      '/sdk/': [
        {
          text: 'SDK Documentation',
          items: [
            { text: 'Getting Started', link: '/sdk/getting-started' },
            { text: 'Installation', link: '/sdk/installation' },
            { text: 'Encoding Messages', link: '/sdk/encoding' },
            { text: 'Parsing Messages', link: '/sdk/parsing' },
            { text: 'Wallet Integration', link: '/sdk/wallet' },
            { text: 'API Reference', link: '/sdk/api-reference' },
          ]
        }
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Create a Message', link: '/examples/create-message' },
            { text: 'Reply to a Message', link: '/examples/reply-to-message' },
            { text: 'Parse a Transaction', link: '/examples/parse-transaction' },
          ]
        }
      ],
      '/development/': [
        {
          text: 'Development Guide',
          items: [
            { text: 'Overview', link: '/development/' },
            { text: 'Project Structure', link: '/development/project-structure' },
            { text: 'Docker Setup', link: '/development/docker' },
            { text: 'Scripts', link: '/development/scripts' },
            { text: 'Makefile', link: '/development/makefile' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/AnchorProtocol/anchor' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Anchor Protocol'
    },

    search: {
      provider: 'local'
    },

    outline: {
      level: [2, 3]
    },

    editLink: {
      pattern: 'https://github.com/AnchorProtocol/anchor/edit/main/anchor/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})

