export function generateSitemap(meta) {
  return {
    name: 'generate-sitemap',
    generateBundle() {
      // lastmod is the date the page content last changed, not the build date:
      // legal pages change only when the legal text does.
      const urls = [
        { loc: meta.canonicalUrl, lastmod: meta.buildDate, priority: '1.0' },
        { loc: meta.legal.privacy.canonicalUrl, lastmod: meta.legalUpdatedOn, priority: '0.3' },
        { loc: meta.legal.terms.canonicalUrl, lastmod: meta.legalUpdatedOn, priority: '0.3' },
      ];

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.flatMap(({ loc, lastmod, priority }) => [
          '\t<url>',
          `\t\t<loc>${loc}</loc>`,
          `\t\t<lastmod>${lastmod}</lastmod>`,
          `\t\t<priority>${priority}</priority>`,
          '\t</url>',
        ]),
        '</urlset>',
        '',
      ].join('\n');

      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}
