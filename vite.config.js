import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { APPS_META } from './scripts/apps-meta.js';
import { Format } from './src/core/lib/format.js';
import { LEGAL_UPDATED_ON, getLegalUpdatedLabel, getVendorNotice } from './scripts/legal.js';
import { injectFontPreloads } from './scripts/vite-plugins/inject-font-preloads.js';
import { devRewrites } from './scripts/vite-plugins/dev-rewrites.js';
import { generateSitemap } from './scripts/vite-plugins/generate-sitemap.js';
import { generateRobotsTxt } from './scripts/vite-plugins/generate-robots.js';
import { generateLlmsTxt } from './scripts/vite-plugins/generate-llms.js';
// eslint-disable-next-line no-unused-vars
import { generateManifest } from './scripts/vite-plugins/generate-manifest.js';
import { emitOgImage } from './scripts/vite-plugins/emit-og-image.js';
import { injectCsp } from './scripts/vite-plugins/inject-csp.js';
import { dropOrphanEntries } from './scripts/vite-plugins/drop-orphan-entries.js';
import { minifyJsonLd } from './scripts/vite-plugins/minify-json-ld.js';

const BROWSER_TARGETS = ['es2020', 'chrome87', 'edge88', 'firefox78', 'safari14.1'];

const buildDate = new Date().toISOString().slice(0, 10);
const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

const VALID_APPS = Object.keys(APPS_META);
const app = process.env.APP;

if (!app || !VALID_APPS.includes(app)) {
  throw new Error(`APP env var must be one of: ${VALID_APPS.join(', ')}. Got: ${JSON.stringify(app)}`);
}

const { srcDir } = APPS_META[app];

// The quick-select badges are rendered into the page here, so they are there at first paint.
const { ALGORITHMS, DEFAULT_ALGO, DEFAULT_HIDDEN_ALGOS } = await import(
  pathToFileURL(resolve(`src/apps/${srcDir}/algorithms.js`)).href
);

const injectData = {
  ...APPS_META[app],
  algorithmIds: ALGORITHMS.map(({ id }) => id),
  algorithmSlugs: ALGORITHMS.map(({ id }) => Format.slug(id)),
  defaultAlgo: DEFAULT_ALGO,
  defaultHiddenAlgos: DEFAULT_HIDDEN_ALGOS,
  appName: app,
  buildDate,
  getVendorNotice,
  legalUpdatedLabel: getLegalUpdatedLabel(),
  legalUpdatedOn: LEGAL_UPDATED_ON,
  version,
};
const ejsOptions = { root: resolve('.') };

export default defineConfig({
  resolve: {
    alias: {
      '~assets': resolve('./src/assets'),
      '~core': resolve('./src/core'),
    },
  },
  optimizeDeps: {
    exclude: ['crypto-api'],
  },
  // A worker is bundled on its own and not given `build.target`: without this, newer syntax
  // in a dependency (`||=`, `??=`) ships as it is, and Firefox 78 cannot even parse the worker.
  worker: {
    rollupOptions: { transform: { target: BROWSER_TARGETS } },
  },
  build: {
    target: BROWSER_TARGETS,
    cssTarget: BROWSER_TARGETS,
    rollupOptions: {
      input: {
        main: `src/apps/${srcDir}/index.html`,
        privacy: 'src/core/app/legal/privacy.html',
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
      '/privacy': '/src/core/app/legal/privacy.html',
      '/terms': '/src/core/app/legal/terms.html',
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
          template: 'src/core/app/legal/privacy.html',
          injectOptions: { data: injectData, ejsOptions },
        },
        {
          filename: 'terms.html',
          template: 'src/core/app/legal/terms.html',
          injectOptions: { data: injectData, ejsOptions },
        },
      ],
    }),
    dropOrphanEntries(),
    injectFontPreloads(),
    minifyJsonLd(),
    injectCsp(),
    // PWA manifest disabled for now
    // generateManifest(injectData),
    emitOgImage(injectData),
    generateRobotsTxt(injectData),
    generateLlmsTxt(injectData, ALGORITHMS),
    generateSitemap(injectData),
  ],
});
