export default {
  // Brand
  siteName: 'MD5Kit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.md5kit.com',
  brandTitleHtml: '<span>MD5</span>Kit',
  footerLabel: 'MD4/5',

  // SEO
  title: 'MD5 Hash Calculator | MD5Kit',
  description:
    'Calculate MD2, MD4, and MD5 hashes in your browser. Text and file input, hex/Base64/binary output. No uploads, no tracking.',
  canonicalUrl: 'https://www.md5kit.com/',
  ogImage: 'https://www.md5kit.com/og-image.png',

  // Page
  pageH1Html: '<span>MD5</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',

  // Accessibility
  skipLinkText: 'Skip to MD5 hash calculator',
  mainAriaLabel: 'MD5 hash calculator',

  // Runtime
  themeStorageKey: 'md5kit-theme',

  // Build
  srcDir: 'md5',
  legal: {
    domain: 'md5kit.com',
    libraries: [{ name: 'hash-wasm', url: 'https://github.com/Daninet/hash-wasm', author: 'Daninet' }],
    privacy: {
      title: 'Privacy Policy | MD5Kit',
      description:
        'Privacy policy for MD5Kit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.md5kit.com/privacy',
    },
    terms: {
      title: 'Terms of Service | MD5Kit',
      description: 'Terms of service for MD5Kit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.md5kit.com/terms',
    },
  },
};
