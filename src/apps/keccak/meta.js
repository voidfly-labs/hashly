export default {
  // Brand
  siteName: 'KeccakKit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.keccak.app',
  brandTitleHtml: '<span>Keccak</span>Kit',
  footerLabel: 'Keccak',

  // SEO
  title: 'Keccak-256 Hash Calculator | KeccakKit',
  description:
    'Calculate Keccak-224, Keccak-256, Keccak-384, and Keccak-512 hashes in your browser. Keccak-256 powers Ethereum. No uploads, no tracking.',
  canonicalUrl: 'https://www.keccak.app/',
  ogImage: 'https://www.keccak.app/og-image.png',

  // Page
  pageH1Html: '<span>Keccak-256</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',

  // Accessibility
  skipLinkText: 'Skip to Keccak-256 hash calculator',
  mainAriaLabel: 'Keccak-256 hash calculator',

  // Runtime
  themeStorageKey: 'keccak-theme',

  // Build
  srcDir: 'keccak',
  legal: {
    domain: 'keccak.app',
    libraries: [{ name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' }],
    privacy: {
      title: 'Privacy Policy | KeccakKit',
      description:
        'Privacy policy for KeccakKit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.keccak.app/privacy',
    },
    terms: {
      title: 'Terms of Service | KeccakKit',
      description: 'Terms of service for KeccakKit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.keccak.app/terms',
    },
  },
};
