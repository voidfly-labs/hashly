import js from '@eslint/js';
import importSort from 'eslint-plugin-simple-import-sort';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

const browserRules = {
  ...js.configs.recommended.rules,
  'no-redeclare': ['error', { builtinGlobals: false }],
};

// Layers of src/core (see CLAUDE.md): lib ← ui ← features ← sections and layout ← app. A layer may
// import only from the layers before it; sections and layout never import each other, and a section
// never imports another section.
const forbidden = {
  lib: ['ui', 'features', 'sections', 'layout', 'app'],
  ui: ['features', 'sections', 'layout', 'app'],
  features: ['sections', 'layout', 'app'],
  sections: ['layout', 'app'],
  layout: ['sections', 'app'],
};
const sections = ['text', 'file', 'random', 'faq'];
const restrict = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});
const layerRules = [
  ...Object.entries(forbidden).map(([layer, others]) =>
    restrict(
      [`src/core/${layer}/**/*.js`],
      [{ group: others.map((l) => `~core/${l}/**`), message: `${layer}/ may not import from ${others.join(', ')}.` }],
    ),
  ),
  ...sections.map((section) =>
    restrict(
      [`src/core/sections/${section}/**/*.js`],
      [
        { group: forbidden.sections.map((l) => `~core/${l}/**`), message: 'sections/ may not import layout or app.' },
        {
          group: sections.filter((s) => s !== section).map((s) => `~core/sections/${s}/**`),
          message: 'A section may not import another section.',
        },
      ],
    ),
  ),
];

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
    plugins: {
      sonarjs,
      'simple-import-sort': importSort,
    },
    rules: {
      ...browserRules,
      ...sonarjs.configs.recommended.rules,
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },

  ...layerRules,
];
