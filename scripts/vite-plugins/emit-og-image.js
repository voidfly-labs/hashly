import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
      const { ogImage } = meta;
      if (width !== ogImage.width || height !== ogImage.height) {
        throw new Error(`emit-og-image: ${source} is ${width}x${height}, expected ${ogImage.width}x${ogImage.height}`);
      }
      this.emitFile({ type: 'asset', fileName: ogImage.file, source: bytes });
    },
  };
}
