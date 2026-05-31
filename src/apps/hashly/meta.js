export default {
  // Brand
  siteName: 'Hashly',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.hashly.org',
  brandTitleHtml: '<span>Hash</span>ly',

  // SEO
  title: 'Online Hash Calculator | Hashly',
  description:
    'Calculate MD5, SHA-256, BLAKE3, Keccak-256, RIPEMD-160, and 25 more hash algorithms in your browser. Text and file input. No uploads, no tracking.',
  canonicalUrl: 'https://www.hashly.org/',
  ogImage: 'https://www.hashly.org/og-image.png',

  // Page
  pageH1Html: '<span>Online Hash</span> Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',
  sectionNounPlural: 'hashes',

  // Accessibility
  skipLinkText: 'Skip to hash calculator',
  mainAriaLabel: 'Multi-algorithm hash calculator',

  // Runtime
  themeStorageKey: 'hashly-theme',

  // Build
  srcDir: 'hashly',
  legal: {
    domain: 'hashly.org',
    libraries: [
      { name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' },
      { name: 'crypto-api', url: 'https://github.com/nf404/crypto-api', author: 'nf404' },
    ],
    privacy: {
      title: 'Privacy Policy | Hashly',
      description:
        'Privacy policy for Hashly by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.hashly.org/privacy',
    },
    terms: {
      title: 'Terms of Service | Hashly',
      description: 'Terms of service for Hashly by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.hashly.org/terms',
    },
  },
};
