export default {
  // Brand
  siteName: 'BLAKEKit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.blake3.app',
  brandTitleHtml: '<span>BLAKE</span>Kit',
  footerLabel: 'BLAKE2/3',

  // SEO
  title: 'BLAKE3 Hash Calculator | BLAKEKit',
  description:
    'Calculate BLAKE2b, BLAKE2s, and BLAKE3 hashes in your browser. Text and file input. No uploads, no tracking.',
  canonicalUrl: 'https://www.blake3.app/',
  ogImage: 'https://www.blake3.app/og-image.png',

  // Page
  pageH1Html: '<span>BLAKE3</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',

  // Accessibility
  skipLinkText: 'Skip to BLAKE3 hash calculator',
  mainAriaLabel: 'BLAKE3 hash calculator',

  // Runtime
  themeStorageKey: 'blakekit-theme',

  // Build
  srcDir: 'blake',
  legal: {
    domain: 'blake3.app',
    libraries: [{ name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' }],
    privacy: {
      title: 'Privacy Policy | BLAKEKit',
      description:
        'Privacy policy for BLAKEKit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.blake3.app/privacy',
    },
    terms: {
      title: 'Terms of Service | BLAKEKit',
      description: 'Terms of service for BLAKEKit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.blake3.app/terms',
    },
  },
};
