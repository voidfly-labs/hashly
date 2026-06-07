export default {
  // Brand
  siteName: 'SHA3Kit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.sha3.app',
  brandTitleHtml: '<span>SHA3</span>Kit',
  footerLabel: 'SHA-3',

  // SEO
  title: 'SHA3-256 Hash Calculator',
  description:
    'Calculate SHA3-224, SHA3-256, SHA3-384, and SHA3-512 hashes in your browser. Text and file input. No uploads, no tracking.',
  canonicalUrl: 'https://www.sha3.app/',
  ogImage: 'https://www.sha3.app/og-image.png',

  // Page
  pageH1Html: '<span>SHA3-256</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',
  sectionNounPlural: 'hashes',

  // Accessibility
  skipLinkText: 'Skip to SHA3-256 hash calculator',
  mainAriaLabel: 'SHA3-256 hash calculator',

  // Runtime
  themeStorageKey: 'sha3kit-theme',

  // Build
  srcDir: 'sha3',
  legal: {
    domain: 'sha3.app',
    libraries: [{ name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' }],
    privacy: {
      title: 'Privacy Policy | SHA3Kit',
      description:
        'Privacy policy for SHA3Kit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.sha3.app/privacy',
    },
    terms: {
      title: 'Terms of Service | SHA3Kit',
      description: 'Terms of service for SHA3Kit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.sha3.app/terms',
    },
  },
};
