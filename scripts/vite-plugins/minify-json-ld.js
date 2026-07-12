const JSON_LD_BLOCK = /(<script\s+type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g;

// Rewrites every JSON-LD <script> in the built HTML as compact JSON. Parsing and
// re-serialising keeps the data identical (only whitespace goes), and invalid JSON
// throws, failing the build instead of shipping a broken schema. "<" is escaped so a
// "</script>" inside a string can never close the tag early.
export function minifyJsonLd() {
  return {
    name: 'minify-json-ld',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(JSON_LD_BLOCK, (_match, open, json, close) => {
          const compact = JSON.stringify(JSON.parse(json)).replaceAll('<', '\\u003c');
          return `${open}${compact}${close}`;
        });
      },
    },
  };
}
