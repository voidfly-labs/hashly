'use strict';

const { LEGAL_UPDATED, buildPage } = require('./base.js');

function generateTerms(content) {
  const { url, domain } = content;
  const canonicalUrl = `${url}/terms`;

  const mainHtml = `    <main aria-label="Terms of Service">
      <div class="page-heading">
        <h1><span>Terms</span> of Service</h1>
        <p class="page-heading__subtitle">// Last updated: ${LEGAL_UPDATED}</p>
      </div>

      <div class="info" role="region" aria-label="Terms of Service content">
        <div class="info__panel" data-active>

          <p>
            These Terms of Service govern your use of <a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>, operated by
            Voidfly Labs.
          </p>

          <h3>Use of the tool</h3>
          <p>
            This tool is provided free of charge for personal and professional use.
            You may use it without creating an account.
          </p>

          <h3>No warranty</h3>
          <p>
            The tool is provided <strong>as-is</strong>, without warranty of any kind. While we
            take care to use well-tested cryptographic libraries, we make no guarantee as to the
            correctness, completeness, or fitness for a particular purpose of any hash output. Do
            not rely solely on this tool for security-critical applications without independent
            verification.
          </p>

          <h3>Limitation of liability</h3>
          <p>
            To the extent permitted by applicable law, Voidfly Labs shall not be liable for any
            damages arising from your use of, or inability to use, this tool.
          </p>

          <h3>Acceptable use</h3>
          <p>
            You agree not to use this tool for any unlawful purpose. You also agree not to attempt
            to disrupt, overload, or compromise the availability of
            <a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>.
          </p>

          <h3>Changes and availability</h3>
          <p>
            We may modify or discontinue this tool at any time without notice. We may also update
            these terms; continued use after an update constitutes acceptance of the revised terms.
          </p>

          <h3>Contact</h3>
          <p>
            If you have questions about these terms, contact us at
            <a href="mailto:legal@voidfly.com">legal@voidfly.com</a>.
          </p>

        </div>
      </div>
    </main>`;

  return buildPage(content, canonicalUrl, mainHtml);
}

module.exports = { generateTerms };
