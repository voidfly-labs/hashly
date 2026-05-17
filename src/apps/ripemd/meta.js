export default {
  // Brand
  siteName: 'RIPEMDKit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.ripemd.com',
  brandTitleHtml: '<span>RIPEMD</span>Kit',
  footerLabel: 'RIPEMD',

  // SEO
  title: 'RIPEMD-160 Hash Calculator | RIPEMDKit',
  description:
    'Calculate RIPEMD-128, RIPEMD-160, RIPEMD-256, and RIPEMD-320 hashes in your browser. Used in Bitcoin and OpenPGP. No uploads, no tracking.',
  canonicalUrl: 'https://www.ripemd.com/',
  ogImage: 'https://www.ripemd.com/og-image.png',

  // Page
  pageH1Html: '<span>RIPEMD-160</span> Hash Calculator',
  pageSubtitle: '// instant hashing — no data leaves your browser',
  sectionNoun: 'hash',

  // Accessibility
  skipLinkText: 'Skip to RIPEMD-160 hash calculator',
  mainAriaLabel: 'RIPEMD-160 hash calculator',

  // Runtime
  themeStorageKey: 'ripemd-theme',

  // Build
  srcDir: 'ripemd',
  legal: {
    domain: 'ripemd.com',
    libraries: [{ name: 'crypto-api', url: 'https://github.com/nf404/crypto-api', author: 'nf404' }],
    privacy: {
      title: 'Privacy Policy | RIPEMDKit',
      description:
        'Privacy policy for RIPEMDKit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.ripemd.com/privacy',
    },
    terms: {
      title: 'Terms of Service | RIPEMDKit',
      description: 'Terms of service for RIPEMDKit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.ripemd.com/terms',
    },
  },
};
