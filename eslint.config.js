'use strict';

const js = require('@eslint/js');
const globals = require('globals');

const browserRules = {
  ...js.configs.recommended.rules,
  'no-redeclare': ['error', { builtinGlobals: false }],
};

module.exports = [
  { ignores: ['dist/', 'vendor/', 'assets/vendor/', 'node_modules/'] },

  // Node.js build scripts
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },

  // Browser: shared module (references globals defined in each app.js)
  {
    files: ['assets/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        APP_CONFIG: 'readonly',
        ALGORITHMS: 'readonly',
        DEFAULT_ALGO: 'readonly',
        ALGO_ORDER: 'readonly',
        Hasher: 'readonly',
      },
    },
    rules: browserRules,
  },

  // Browser: per-app modules (reference Format defined in shared.js)
  {
    files: ['*/app.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        Format: 'readonly',
      },
    },
    rules: browserRules,
  },

  // ripemd app additionally uses CryptoApi from its CDN bundle
  {
    files: ['ripemd/app.js'],
    languageOptions: {
      globals: { CryptoApi: 'readonly' },
    },
  },
];
