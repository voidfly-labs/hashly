export default {
  // Brand
  siteName: 'xxHashKit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.xxhash.dev',
  brandTitleHtml: '<span>xx</span>HashKit',
  footerLabel: 'xxHash',

  // SEO
  title: 'xxHash64 Hash Calculator | xxHashKit',
  description:
    'Calculate xxHash32, xxHash64, xxHash3, and xxHash128 checksums in your browser. Instant non-cryptographic hashing — no uploads, no tracking.',
  canonicalUrl: 'https://www.xxhash.dev/',
  ogImage: 'https://www.xxhash.dev/og-image.png',

  // Page
  pageH1Html: '<span>xxHash64</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',
  sectionNounPlural: 'hashes',

  // Accessibility
  skipLinkText: 'Skip to xxHash64 hash calculator',
  mainAriaLabel: 'xxHash64 hash calculator',

  // Runtime
  themeStorageKey: 'xxhash-theme',

  // Build
  srcDir: 'xxhash',
  legal: {
    domain: 'xxhash.dev',
    libraries: [{ name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' }],
    privacy: {
      title: 'Privacy Policy | xxHashKit',
      description:
        'Privacy policy for xxHashKit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.xxhash.dev/privacy',
    },
    terms: {
      title: 'Terms of Service | xxHashKit',
      description: 'Terms of service for xxHashKit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.xxhash.dev/terms',
    },
  },
};
