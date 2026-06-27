export function generateSitemap(meta) {
  return {
    name: 'generate-sitemap',
    generateBundle() {
      const urls = [meta.canonicalUrl, meta.legal.privacy.canonicalUrl, meta.legal.terms.canonicalUrl];

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.flatMap((loc) => [
          '\t<url>',
          `\t\t<loc>${loc}</loc>`,
          `\t\t<lastmod>${meta.buildDate}</lastmod>`,
          '\t</url>',
        ]),
        '</urlset>',
        '',
      ].join('\n');

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}
