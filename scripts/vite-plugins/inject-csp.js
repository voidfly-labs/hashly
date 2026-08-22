import { createHash } from 'node:crypto';

// Inline scripts that run (not the JSON-LD data blocks, which a CSP does not govern).
const INLINE_SCRIPT = /<script(?![^>]*(?:\bsrc=|ld\+json))[^>]*>([\s\S]*?)<\/script>/g;

const sha256 = (text) => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

// Everything the page loads comes from its own origin; nothing may be sent to any other (`connect-src`,
// `form-action`), which is what "no data leaves your browser" comes down to. `connect-src 'self'` and
// not 'none' so that tools reading the site's own files from the page (Lighthouse fetching robots.txt
// and llms.txt) can; the site has no backend, so its own origin is only static files. Inline styles stay
// allowed: the page sets some through markup it builds. `wasm-unsafe-eval` lets hash-wasm (and the
// WebAssembly support check) compile; it is unknown to Chrome before 95, which then reports WebAssembly
// as unsupported. Workers are not covered by a meta policy; `frame-ancestors` is only valid as a header.
function policy(scriptHashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')} 'wasm-unsafe-eval'`.replace('  ', ' '),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/** Adds a Content-Security-Policy `<meta>` to every built page, with the hash of each inline script.
 *  Done on the finished bundle, last, so the hashes are of the scripts as they ship (the HTML is
 *  minified and rewritten after the transform hooks). Build only: the dev server needs inline
 *  scripts and a websocket of its own. */
export function injectCsp() {
  return {
    name: 'inject-csp',
    apply: 'build',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        for (const file of Object.values(bundle)) {
          if (file.type !== 'asset' || !file.fileName.endsWith('.html')) continue;
          const html = String(file.source);
          const hashes = [...html.matchAll(INLINE_SCRIPT)].map(([, body]) => sha256(body));
          const meta = `<meta http-equiv="Content-Security-Policy" content="${policy(hashes)}" />`;
          file.source = html.replace(/<head>/, `<head>\n    ${meta}`);
        }
      },
    },
  };
}
