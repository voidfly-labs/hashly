export function injectFontPreloads() {
  return {
    name: 'inject-font-preloads',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return [];

        const fontFiles = Object.values(ctx.bundle)
          .filter((chunk) => chunk.type === 'asset' && chunk.fileName.endsWith('.woff2'))
          .map((chunk) => chunk.fileName);

        return fontFiles.map((fileName) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: true, href: fileName },
          injectTo: 'head',
        }));
      },
    },
  };
}
