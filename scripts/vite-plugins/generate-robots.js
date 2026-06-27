export function generateRobotsTxt(meta) {
  return {
    name: 'generate-robots-txt',
    generateBundle() {
      const origin = new URL(meta.canonicalUrl).origin;
      const robots = `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;

      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
    },
  };
}
