'use strict';

const LEGAL_UPDATED = 'May 1, 2026';

const ALL_TOOLS = [
  { name: 'CRCKit', url: 'https://www.crckit.com' },
  { name: 'Keccalc', url: 'https://www.keccalc.com' },
  { name: 'MD5Kit', url: 'https://www.md5kit.com' },
  { name: 'RIPEMD', url: 'https://www.ripemd.com' },
  { name: 'SHA3Kit', url: 'https://www.sha3kit.com' },
  { name: 'SHAFile', url: 'https://www.shafile.com' },
];

function buildPage(content, canonicalUrl, mainHtml) {
  const { brand, url, storageKey, title, description } = content;
  const brandHtml = `<span>${brand.prefix}</span>${brand.suffix}`;
  const otherTools = ALL_TOOLS.filter((t) => t.url !== url);

  return `<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />

    <meta name="theme-storage-key" content="${storageKey}" />
    <script src="/assets/js/theme-init.js"></script>

    <!-- ── Favicons ── -->
    <link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/assets/images/favicon.ico" />
    <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png" />

    <!-- ── Primary SEO ── -->
    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- ── Appearance ── -->
    <meta name="theme-color" content="#4361EE" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#6B8AFF" media="(prefers-color-scheme: dark)" />

    <!-- ── Styles ── -->
    <link rel="preload" href="/vendor/fonts/fonts.css" as="style" />
    <link rel="preload" href="/assets/css/main.css" as="style" />
    <link rel="stylesheet" href="/vendor/fonts/fonts.css" />
    <link rel="stylesheet" href="/assets/css/main.css" />
  </head>
  <body>
    <!-- ========== HEADER ========== -->
    <header class="header">
      <a class="header__brand" href="/" aria-label="${brand.full} — go to homepage">
        <div class="header__logo-icon" aria-hidden="true">
          <img src="/assets/images/logo.svg" alt="${brand.full} logo" width="40" height="40" />
        </div>
        <span class="header__title">${brandHtml}</span>
      </a>
      <div class="header__right">
        <button class="theme-toggle" id="themeToggle" aria-label="Toggle colour theme">
          <svg class="theme-toggle__sun" viewBox="0 0 24 24"><use href="/assets/images/icons.svg#icon-sun"></use></svg>
          <svg class="theme-toggle__moon" viewBox="0 0 24 24"><use href="/assets/images/icons.svg#icon-moon"></use></svg>
        </button>
      </div>
    </header>
    <!-- ========== MAIN ========== -->
${mainHtml}
    <!-- ========== FOOTER ========== -->
    <footer class="footer">
      <div class="footer__inner">
        <div class="footer__grid">

          <div>
            <a class="footer__brand" href="/" aria-label="${brand.full} — go to homepage">
              <div class="footer__brand-logo" aria-hidden="true">
                <img src="/assets/images/logo.svg" alt="" width="33" height="33" />
              </div>
              <span class="footer__brand-title">${brandHtml}</span>
            </a>
            <p class="footer__tagline">built for developers · client-side only · zero tracking</p>
            <div class="footer__social">
              <a class="footer__social-icon" href="https://github.com/voidfly-labs/hashly" target="_blank" rel="noopener noreferrer" aria-label="View source on GitHub">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><use href="/assets/images/icons.svg#icon-github"></use></svg>
              </a>
              <a class="footer__social-icon" href="https://x.com/HashlyIO" target="_blank" rel="noopener noreferrer" aria-label="Follow @HashlyIO on X">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><use href="/assets/images/icons.svg#icon-x"></use></svg>
              </a>
              <a class="footer__social-icon" href="mailto:info@voidfly.com" aria-label="Email Voidfly Labs">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><use href="/assets/images/icons.svg#icon-email"></use></svg>
              </a>
            </div>
          </div>

          <div>
            <span class="footer__col-heading">${brand.full}</span>
            <a class="footer__link" href="/">Home</a>
          </div>

          <div>
            <span class="footer__col-heading">More Tools</span>
${otherTools.map((t) => `            <a class="footer__link" href="${t.url}" target="_blank" rel="noopener noreferrer">${t.name}</a>`).join('\n')}
          </div>

        </div>

        <div class="footer__bar">
          <span>© <span id="footerYear"></span>&ensp;<a href="https://www.github.com/voidfly-labs" target="_blank" rel="noopener noreferrer">Voidfly Labs</a></span>
          <span><a href="/privacy">Privacy Policy</a>&ensp;·&ensp;<a href="/terms">Terms of Service</a></span>
          <div class="footer__bar-right">
            <a href="mailto:legal@voidfly.com">legal@voidfly.com</a>
          </div>
        </div>
      </div>
    </footer>
    <!-- ========== JAVASCRIPT ========== -->
    <script>
      document.getElementById('footerYear').textContent = new Date().getFullYear();
      document.getElementById('themeToggle').addEventListener('click', function () {
        var STORAGE_KEY = '${storageKey}';
        var current = document.documentElement.getAttribute('data-theme');
        var next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_KEY, next);
      });
    </script>
  </body>
</html>
`;
}

module.exports = { LEGAL_UPDATED, ALL_TOOLS, buildPage };
