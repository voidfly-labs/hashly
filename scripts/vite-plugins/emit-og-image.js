import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// What every app's package serves as its social-preview image, at the package root. The size is
// advertised in the og:image:* tags, so the build checks each PNG against it.
export const OG_IMAGE = { file: 'og-image.png', type: 'image/png', width: 1200, height: 630 };

const OG_DIR = resolve('src/assets/images/og/png');

// PNG width/height are big-endian uint32s at byte offsets 16 and 20 (IHDR chunk).
function pngSize(bytes) {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// No page references the OG images, so the bundler would not emit them. Each app ships only its own,
// rendered from og/svg/<srcDir>.svg (the SVG is a source and is not shipped).
export function emitOgImage(meta) {
  const source = resolve(OG_DIR, `${meta.srcDir}.png`);
  return {
    name: 'emit-og-image',
    generateBundle() {
      let bytes;
      try {
        bytes = readFileSync(source);
      } catch {
        throw new Error(`emit-og-image: missing OG image ${source}`);
      }
      const { width, height } = pngSize(bytes);
      if (width !== OG_IMAGE.width || height !== OG_IMAGE.height) {
        throw new Error(
          `emit-og-image: ${source} is ${width}x${height}, expected ${OG_IMAGE.width}x${OG_IMAGE.height}`,
        );
      }
      this.emitFile({ type: 'asset', fileName: OG_IMAGE.file, source: bytes });
    },
  };
}
