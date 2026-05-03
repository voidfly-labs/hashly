'use strict';

const { LEGAL_UPDATED, buildPage } = require('./base.js');

function generatePrivacy(content) {
  const { url, domain, library } = content;
  const canonicalUrl = `${url}/privacy`;

  const mainHtml = `    <main aria-label="Privacy Policy">
      <div class="page-heading">
        <h1><span>Privacy</span> Policy</h1>
        <p class="page-heading__subtitle">// Last updated: ${LEGAL_UPDATED}</p>
      </div>

      <div class="info" role="region" aria-label="Privacy Policy content">
        <div class="info__panel" data-active>

          <p>
            This Privacy Policy governs <a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>, operated by Voidfly Labs.
          </p>

          <h3>What we collect</h3>
          <p>
            We collect nothing on our end. All hashing runs entirely inside your browser. No text you type,
            no file you drop, and no hash output is ever transmitted to our servers or any third party.
          </p>

          <h3>Browser storage</h3>
          <p>
            This tool stores two things locally in your browser using local storage:
          </p>
          <ul>
            <li><strong>Theme preference</strong> — whether you have chosen light or dark mode.</li>
            <li>
              <strong>Hash history</strong> — a log of recent hashes you have computed, including
              the hash value, the algorithm used, the timestamp, and (for file hashes) the filename.
              This data never leaves your device.
            </li>
          </ul>
          <p>You can clear this data at any time by clearing your browser's site data for <a href="${url}" target="_blank" rel="noopener noreferrer">${domain}</a>.</p>

          <h3>Server logs</h3>
          <p>
            Our hosting provider automatically records standard access logs when your browser
            requests a page. These logs may include your IP address, browser type, and the URL
            requested. This is standard infrastructure practice, not targeted data collection.
            Logs are retained according to the hosting provider's retention policy and are used
            solely for operational purposes.
          </p>

          <h3>Cookies</h3>
          <p>We do not set any cookies.</p>

          <h3>Third-party libraries</h3>
          <p>
            We do not use analytics platforms, advertising networks, or any other third-party
            tracking services. All computation runs locally using
            <a href="${library.url}" target="_blank" rel="noopener noreferrer">${library.name}</a>
            by ${library.author}, an open-source library bundled with this tool that makes no
            network requests.
          </p>

          <h3>Contact</h3>
          <p>
            If you have questions about this policy, contact us at
            <a href="mailto:legal@voidfly.com">legal@voidfly.com</a>.
          </p>

        </div>
      </div>
    </main>`;

  return buildPage(content, canonicalUrl, mainHtml);
}

module.exports = { generatePrivacy };
