const THEME_COLOR = '#4361ee';
const BACKGROUND_COLOR = '#f4f5f7';

function findAsset(bundle, pattern) {
  const asset = Object.values(bundle).find((chunk) => chunk.type === 'asset' && pattern.test(chunk.fileName));
  if (!asset) throw new Error(`generate-manifest: no bundled asset matches ${pattern}`);
  return asset;
}

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
      const pngIcon = findAsset(bundle, /^assets\/apple-touch-icon-.+\.png$/);

      const manifest = {
        name: meta.siteName,
        short_name: meta.siteName,
        description: meta.description,
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        icons: [
          { src: `/${svgIcon.fileName}`, sizes: 'any', type: 'image/svg+xml' },
          { src: `/${pngIcon.fileName}`, sizes: pngSizes(pngIcon.source), type: 'image/png' },
        ],
      };

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(manifest, null, '\t')}\n`,
      });
    },
  };
}
