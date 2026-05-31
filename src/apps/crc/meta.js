export default {
  // Brand
  siteName: 'CRCKit',
  author: 'Voidfly Labs',
  brandUrl: 'https://www.crckit.com',
  brandTitleHtml: '<span>CRC</span>Kit',
  footerLabel: 'CRC',

  // SEO
  title: 'CRC-32 Checksum Calculator | CRCKit',
  description:
    'Calculate CRC-8, CRC-16, CRC-24, CRC-32, CRC-64, CRC-82, and more checksum variants in your browser. No uploads, no tracking.',
  canonicalUrl: 'https://www.crckit.com/',
  ogImage: 'https://www.crckit.com/og-image.png',

  // Page
  pageH1Html: '<span>CRC-32</span> Checksum Calculator',
  pageSubtitle: '// instant checksums — no data leaves your browser',
  sectionNoun: 'checksum',
  sectionNounPlural: 'checksums',

  // Accessibility
  skipLinkText: 'Skip to CRC-32 checksum calculator',
  mainAriaLabel: 'CRC-32 checksum calculator',

  // Runtime
  themeStorageKey: 'crckit-theme',

  // Build
  srcDir: 'crc',
  legal: {
    domain: 'crckit.com',
    libraries: [{ name: 'js-crc', url: 'https://github.com/emn178/js-crc', author: 'emn178' }],
    privacy: {
      title: 'Privacy Policy | CRCKit',
      description:
        'Privacy policy for CRCKit by Voidfly Labs. All hashing runs in your browser — no data is ever transmitted.',
      canonicalUrl: 'https://www.crckit.com/privacy',
    },
    terms: {
      title: 'Terms of Service | CRCKit',
      description: 'Terms of service for CRCKit by Voidfly Labs. Free to use, no account required, provided as-is.',
      canonicalUrl: 'https://www.crckit.com/terms',
    },
  },
};
