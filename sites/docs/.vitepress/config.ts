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
      { text: 'Quickstart', link: '/quickstart' },
      { text: 'Concepts', link: '/concepts/' },
      { text: 'SDK', link: '/sdk/' },
      { text: 'Kinds', link: '/kinds/' },
      { text: 'Tutorials', link: '/tutorials/' },
    ],

    sidebar: {
      '/concepts/': [
        { text: 'Overview', link: '/concepts/' },
        { text: 'Message Format', link: '/concepts/message-format' },
        { text: 'Carriers', link: '/concepts/carriers' },
        { text: 'Threading', link: '/concepts/threading' },
      ],
      '/kinds/': [
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
      ],
      '/sdk/': [
        { text: 'Getting Started', link: '/sdk/' },
        { text: 'Wallet', link: '/sdk/wallet' },
        { text: 'Encoding', link: '/sdk/encoding' },
        { text: 'Parsing', link: '/sdk/parsing' },
        { text: 'API Reference', link: '/sdk/api-reference' },
      ],
      '/tutorials/': [
        { text: 'Hello World', link: '/tutorials/hello-world' },
        { text: 'Threaded Messages', link: '/tutorials/threaded-messages' },
        { text: 'Reading Messages', link: '/tutorials/reading-messages' },
      ],
      '/contributing/': [
        { text: 'Getting Started', link: '/contributing/' },
      ],
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
      pattern: 'https://github.com/AnchorProtocol/anchor/edit/main/sites/docs/:path',
      text: 'Edit this page on GitHub'
    }
  }
})
