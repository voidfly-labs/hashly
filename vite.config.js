import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'node:path';
import { APPS_META, LEGAL_UPDATED_ON, getLegalUpdatedLabel } from './scripts/apps-meta.js';
import { createFontPreloads } from './scripts/vite-plugins/create-font-preloads.js';

const app = process.env.APP;
const injectData = {
  ...APPS_META[app],
  legalUpdatedOn: LEGAL_UPDATED_ON,
  legalUpdatedLabel: getLegalUpdatedLabel(),
};
const ejsOptions = { root: resolve('.') };

export default defineConfig({
  root: '.',
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
    createFontPreloads(),
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
  ],
});
