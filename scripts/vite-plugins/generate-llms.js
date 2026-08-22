// Emits /llms.txt in the structure llmstxt.org recommends: an H1 with the site's name, a blockquote
// summary, a little plain detail, then H2 sections of `[name](url): note` links. "Optional" is the
// section a reader may skip when short of context.
export function generateLlmsTxt(meta, algorithms) {
  return {
    name: 'generate-llms-txt',
    generateBundle() {
      const link = (name, url, note) => `- [${name}](${url}): ${note}`;
      const sections = [
        [
          'Tool',
          [
            link(meta.siteName, meta.canonicalUrl, 'text, file and random-value hashing in the browser'),
            link(
              'About & FAQ',
              `${meta.canonicalUrl}#about-section`,
              'what the algorithms are and how to use the tool',
            ),
          ],
        ],
        [
          'Legal',
          [
            link('Privacy Policy', meta.legal.privacy.canonicalUrl, meta.legal.privacy.description),
            link('Terms of Service', meta.legal.terms.canonicalUrl, meta.legal.terms.description),
          ],
        ],
        [
          'Optional',
          meta.moreToolsLinks.map(({ text, href }) =>
            link(`${text} calculator`, href, `a sibling tool from ${meta.author}`),
          ),
        ],
      ];

      const lines = [
        `# ${meta.siteName}`,
        '',
        `> ${meta.description}`,
        '',
        `${meta.siteName} is a static web app with no backend. Hashing runs in the visitor's browser (Web Workers and WebAssembly); text and files are never uploaded, and there are no accounts. It takes text or a file, as UTF-8, hex, Base64 or binary, and shows the digests as hex, Base64 or binary. It is free to use.`,
        '',
        `Supported algorithms (${algorithms.length}): ${algorithms.map(({ id }) => id).join(', ')}.`,
        '',
        ...sections.flatMap(([title, links]) => (links.length ? [`## ${title}`, '', ...links, ''] : [])),
      ];

      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: lines.join('\n') });
    },
  };
}
