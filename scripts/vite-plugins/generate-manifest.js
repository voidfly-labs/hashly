import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const THEME_COLOR = '#4361ee';
const BACKGROUND_COLOR = '#f4f5f7';

function findAsset(bundle, pattern) {
  const asset = Object.values(bundle).find((chunk) => chunk.type === 'asset' && pattern.test(chunk.fileName));
  if (!asset) throw new Error(`generate-manifest: no bundled asset matches ${pattern}`);
  return asset;
}

// Installable-app icons that no page references, so the bundler would not otherwise emit them.
const INSTALL_ICONS = ['icon-192.png', 'icon-512.png'];
const ICON_DIR = resolve('src/assets/images/icons');

// PNG width/height are big-endian uint32s at byte offsets 16 and 20 (IHDR chunk).
function pngSizes(source) {
  const bytes = Buffer.from(source);
  return `${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`;
}

export function generateManifest(meta) {
  return {
    name: 'generate-manifest',
    generateBundle(_options, bundle) {
      const svgIcon = findAsset(bundle, /^assets\/favicon-.+\.svg$/);
      const installIcons = INSTALL_ICONS.map((name) => {
        const source = readFileSync(resolve(ICON_DIR, name));
        const ref = this.emitFile({ type: 'asset', name, source });
        return { src: `/${this.getFileName(ref)}`, sizes: pngSizes(source), type: 'image/png', purpose: 'any' };
      });

      const manifest = {
        name: meta.siteName,
        short_name: meta.siteName,
        id: '/',
        lang: 'en',
        categories: ['utilities', 'developer tools'],
        description: meta.description,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [{ src: `/${svgIcon.fileName}`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }, ...installIcons],
      };

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(manifest, null, '\t')}\n`,
      });
    },
  };
}
