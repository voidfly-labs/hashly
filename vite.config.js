import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'node:path';
import { APPS_META, LEGAL_UPDATED_ON, getLegalUpdatedLabel } from './scripts/apps-meta.js';
import { injectFontPreloads } from './scripts/vite-plugins/inject-font-preloads.js';
import { devRewrites } from './scripts/vite-plugins/dev-rewrites.js';

const VALID_APPS = Object.keys(APPS_META);
const app = process.env.APP;

if (!app || !VALID_APPS.includes(app)) {
  throw new Error(`APP env var must be one of: ${VALID_APPS.join(', ')}. Got: ${JSON.stringify(app)}`);
}

const injectData = {
  ...APPS_META[app],
  legalUpdatedOn: LEGAL_UPDATED_ON,
  legalUpdatedLabel: getLegalUpdatedLabel(),
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
        main: `src/apps/${app}/index.html`,
        privacy: 'src/templates/pages/legal/privacy.html',
        terms: 'src/templates/pages/legal/terms.html',
      },
    },
    outDir: `dist/${app}`,
    emptyOutDir: true,
  },
  server: {
    open: `/src/apps/${app}/`,
  },
  plugins: [
    devRewrites({
      '/': `/src/apps/${app}/index.html`,
      '/privacy': '/src/templates/pages/legal/privacy.html',
      '/terms': '/src/templates/pages/legal/terms.html',
    }),
    createHtmlPlugin({
      pages: [
        {
          filename: 'index.html',
          template: `src/apps/${app}/index.html`,
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
