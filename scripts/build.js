#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { minify: htmlMinify } = require('html-minifier-terser');
const { minify: terserMinify } = require('terser');
const { transform: lightningTransform } = require('lightningcss');
const { APPS, VENDOR_SCRIPTS, LOCAL_SCRIPTS, FONTS } = require('./build.config.js');

const ROOT = path.resolve(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'vendor'); // dev source; gitignored
const DIST_DIR = path.join(ROOT, 'dist');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function download(url, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    console.log(`  cached   ${path.relative(ROOT, dest)}`);
    return;
  }
  console.log(`  fetch    ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

async function copyJs(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const code = fs.readFileSync(src, 'utf8');
  const result = await terserMinify(code, { ecma: 2015, compress: true, mangle: true });
  fs.writeFileSync(dest, result.code);
}

function copyCss(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const css = fs.readFileSync(src);
  const { code } = lightningTransform({ filename: src, code: css, minify: true });
  fs.writeFileSync(dest, code);
}

// ---------------------------------------------------------------------------
// Font CSS generator
// ---------------------------------------------------------------------------

function buildFontsCss() {
  return (
    FONTS.families
      .flatMap((family) =>
        FONTS.weights.map((weight) => {
          const file = `${family.prefix}-${FONTS.version}-latin-${weight}.woff2`;
          return (
            `@font-face {\n` +
            `  font-family: '${family.cssName}';\n` +
            `  font-style: normal;\n` +
            `  font-weight: ${weight};\n` +
            `  font-display: swap;\n` +
            `  src: url('./${file}') format('woff2');\n` +
            `}`
          );
        }),
      )
      .join('\n\n') + '\n'
  );
}

// ---------------------------------------------------------------------------
// Download all vendor assets → vendor/ (used by both `download` and `build`)
// ---------------------------------------------------------------------------

async function ensureVendors(apps) {
  fs.mkdirSync(VENDOR_DIR, { recursive: true });

  for (const app of apps) {
    for (const s of VENDOR_SCRIPTS[app] ?? []) {
      await download(s.url, path.join(VENDOR_DIR, 'js', s.name));
    }
  }

  for (const family of FONTS.families) {
    for (const weight of FONTS.weights) {
      const file = `${family.prefix}-${FONTS.version}-latin-${weight}.woff2`;
      const url = [
        `https://cdn.jsdelivr.net/npm/@fontsource/${family.pkg}@${FONTS.version}`,
        `files/${family.prefix}-latin-${weight}-normal.woff2`,
      ].join('/');
      await download(url, path.join(VENDOR_DIR, 'fonts', file));
    }
  }

  const fontsCssPath = path.join(VENDOR_DIR, 'fonts', 'fonts.css');
  if (!fs.existsSync(fontsCssPath)) {
    fs.writeFileSync(fontsCssPath, buildFontsCss());
    console.log('  generated vendor/fonts/fonts.css');
  } else {
    console.log('  cached   vendor/fonts/fonts.css');
  }
}

// ---------------------------------------------------------------------------
// HTML minification options
// ---------------------------------------------------------------------------

const HTML_MINIFY_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
};

// ---------------------------------------------------------------------------
// Per-app build
// ---------------------------------------------------------------------------

async function buildApp(app) {
  console.log(`\n[${app}]`);
  const appDir = path.join(ROOT, 'apps', app);
  const distDir = path.join(DIST_DIR, app);
  const scripts = VENDOR_SCRIPTS[app] ?? [];

  // Ensure vendor assets are present (downloads only what's missing)
  await ensureVendors([app]);

  // App-specific files
  await copyJs(path.join(appDir, 'app.js'), path.join(distDir, 'app.js'));
  copyCss(path.join(appDir, 'app.css'), path.join(distDir, 'app.css'));

  // Shared assets
  copyCss(path.join(ROOT, 'assets/css/main.css'), path.join(distDir, 'assets/css/main.css'));
  copy(path.join(ROOT, 'assets/images/favicon.svg'), path.join(distDir, 'assets/images/favicon.svg'));
  copy(path.join(ROOT, 'assets/images/favicon.ico'), path.join(distDir, 'assets/images/favicon.ico'));
  copy(path.join(ROOT, 'assets/images/logo.svg'), path.join(distDir, 'assets/images/logo.svg'));
  copy(path.join(ROOT, 'assets/images/icons.svg'), path.join(distDir, 'assets/images/icons.svg'));
  await copyJs(path.join(ROOT, 'assets/js/shared.js'), path.join(distDir, 'assets/js/shared.js'));

  // App-specific local scripts
  for (const rel of LOCAL_SCRIPTS[app] ?? []) {
    await copyJs(path.join(ROOT, rel), path.join(distDir, rel));
  }

  // Vendor JS — already minified, copy as-is
  for (const s of scripts) {
    copy(path.join(VENDOR_DIR, 'js', s.name), path.join(distDir, 'vendor/js', s.name));
  }

  // Vendor fonts
  for (const family of FONTS.families) {
    for (const weight of FONTS.weights) {
      const file = `${family.prefix}-${FONTS.version}-latin-${weight}.woff2`;
      copy(path.join(VENDOR_DIR, 'fonts', file), path.join(distDir, 'vendor/fonts', file));
    }
  }
  copyCss(path.join(VENDOR_DIR, 'fonts', 'fonts.css'), path.join(distDir, 'vendor/fonts/fonts.css'));

  // index.html
  const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
  fs.writeFileSync(path.join(distDir, 'index.html'), await htmlMinify(html, HTML_MINIFY_OPTIONS));

  console.log(`  ✓  dist/${app}/`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2];

  if (!arg || arg === '--help') {
    console.log('Usage: node scripts/build.js <download|app|all>');
    console.log(`Apps:  ${APPS.join(', ')}`);
    process.exit(arg ? 0 : 1);
  }

  if (arg === 'download') {
    console.log('Downloading all vendor assets → vendor/\n');
    await ensureVendors(APPS);
    console.log('\nDone. Run `npm run dev` to serve locally.');
    return;
  }

  const targets = arg === 'all' ? APPS : [arg];
  for (const app of targets) {
    if (!APPS.includes(app)) {
      console.error(`Unknown app "${app}". Available: ${APPS.join(', ')}`);
      process.exit(1);
    }
  }

  for (const app of targets) await buildApp(app);
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
