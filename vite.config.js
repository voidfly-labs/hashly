import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { APPS_META } from './scripts/apps-meta.js';
import { LEGAL_UPDATED_ON, getLegalUpdatedLabel, getVendorNotice } from './scripts/legal.js';
import { injectFontPreloads } from './scripts/vite-plugins/inject-font-preloads.js';
import { devRewrites } from './scripts/vite-plugins/dev-rewrites.js';

const buildDate = new Date().toISOString().slice(0, 10);
const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

const VALID_APPS = Object.keys(APPS_META);
const app = process.env.APP;

if (!app || !VALID_APPS.includes(app)) {
  throw new Error(`APP env var must be one of: ${VALID_APPS.join(', ')}. Got: ${JSON.stringify(app)}`);
}

const { srcDir } = APPS_META[app];

const injectData = {
  ...APPS_META[app],
  buildDate,
  getVendorNotice,
  legalUpdatedLabel: getLegalUpdatedLabel(),
  legalUpdatedOn: LEGAL_UPDATED_ON,
  version,
};
const ejsOptions = { root: resolve('.') };

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@assets': resolve('./src/assets'),
      '@core': resolve('./src/core'),
      '@styles': resolve('./src/styles'),
    },
  },
  optimizeDeps: {
    exclude: ['crypto-api'],
  },
  build: {
    rollupOptions: {
      input: {
        main: `src/apps/${srcDir}/index.html`,
        privacy: 'src/templates/pages/legal/privacy.html',
        terms: 'src/templates/pages/legal/terms.html',
      },
    },
    outDir: `dist/${app}`,
    emptyOutDir: true,
  },
  server: {
    open: `/src/apps/${srcDir}/`,
  },
  plugins: [
    devRewrites({
      '/': `/src/apps/${srcDir}/index.html`,
      '/privacy': '/src/templates/pages/legal/privacy.html',
      '/terms': '/src/templates/pages/legal/terms.html',
    }),
    createHtmlPlugin({
      pages: [
        {
          filename: 'index.html',
          template: `src/apps/${srcDir}/index.html`,
          injectOptions: { data: injectData, ejsOptions },
        },
        {
          filename: 'privacy.html',
          template: 'src/templates/pages/legal/privacy.html',
          injectOptions: { data: injectData, ejsOptions },
        },
        {
          filename: 'terms.html',
          template: 'src/templates/pages/legal/terms.html',
          injectOptions: { data: injectData, ejsOptions },
        },
      ],
    }),
    injectFontPreloads(),
  ],
});
