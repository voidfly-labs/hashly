export default {
  // Brand
  siteName: 'SHA2Kit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.sha256.app',
  brandTitleHtml: '<span>SHA2</span>Kit',
  footerLabel: 'SHA-1/2',

  // SEO
  title: 'SHA-256 Hash Calculator | SHA2Kit',
  description:
    'Calculate SHA-224, SHA-256, SHA-384, SHA-512, and SHA-1 hashes in your browser. Text and file input. No uploads, no tracking.',
  canonicalUrl: 'https://www.sha256.app/',
  ogImage: 'https://www.sha256.app/og-image.png',

  // Page
  pageH1Html: '<span>SHA-256</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',
  sectionNounPlural: 'hashes',

  // Accessibility
  skipLinkText: 'Skip to SHA hash calculator',
  mainAriaLabel: 'SHA-256 hash calculator',

  // Runtime
  themeStorageKey: 'sha2kit-theme',

  // Build
  srcDir: 'sha2',
  legal: {
    domain: 'sha256.app',
    libraries: [{ name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' }],
    privacy: {
      title: 'Privacy Policy | SHA2Kit',
      description:
        'Privacy policy for SHA2Kit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.sha256.app/privacy',
    },
    terms: {
      title: 'Terms of Service | SHA2Kit',
      description: 'Terms of service for SHA2Kit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.sha256.app/terms',
    },
  },
};
