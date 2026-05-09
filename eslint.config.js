import js from '@eslint/js';
import globals from 'globals';
import sonarjs from 'eslint-plugin-sonarjs';

const browserRules = {
  ...js.configs.recommended.rules,
  'no-redeclare': ['error', { builtinGlobals: false }],
};

export default [
  { ignores: ['dist/', 'vendor/', 'assets/vendor/', 'node_modules/'] },

  // Node.js build scripts and Vite config (ESM)
  {
    files: ['scripts/**/*.js', 'vite.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },

  // Browser: shared modules and per-app modules (ES modules)
  {
    files: ['src/core/**/*.js', 'src/apps/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: { sonarjs },
    rules: {
      ...browserRules,
      ...sonarjs.configs.recommended.rules,
    },
  },
];
