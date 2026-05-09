import js from '@eslint/js';
import globals from 'globals';

const browserRules = {
  ...js.configs.recommended.rules,
  'no-redeclare': ['error', { builtinGlobals: false }],
};

export default [
  { ignores: ['dist/', 'vendor/', 'assets/vendor/', 'node_modules/', 'vite.config.js'] },

  // Node.js build scripts (ESM)
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },

  // Browser: shared modules and per-app modules (ES modules)
  {
    files: ['src/shared/**/*.js', 'src/apps/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: browserRules,
  },
];
