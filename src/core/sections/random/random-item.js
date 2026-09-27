import { iconHref } from '~core/lib/icon.js';

/** The HTML of one row of the random list: its number (shown with `padWidth` digits), the digest, the
 *  algorithm badge (with `tip` as its tooltip) and the Copy and Download buttons. What a click on any of
 *  them does, and their tooltips, are left to whoever listens on the list: the buttons carry their action
 *  and digest in `data-` attributes, and the tooltips' text in `data-tip`. A string, not a node, so a
 *  list of thousands is parsed once. */
export function randomItemHtml({ hash, algo, number, padWidth, tip }) {
  const check = `<svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>`;
  return `<div class="random__item" data-action="copy" data-hash="${hash}">
<span class="random__item-index">${String(number).padStart(padWidth, '0')}</span>
<span class="random__item-hash" data-action="copy" data-hash="${hash}">${hash}<span class="tooltip">Copied!</span></span>
<span class="algo-badge random__item-badge" data-algo="${algo}" data-tip="${tip}" aria-label="${algo} — ${tip}" tabindex="0">${algo}</span>
<div class="random__item-actions">
<button class="icon-btn random__item-btn" data-action="copy" data-hash="${hash}" data-tip="Copy" aria-label="Copy hash">
<svg class="icon-action" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
${check}
<span class="tooltip">Copied!</span>
</button>
<button class="icon-btn random__item-btn" data-action="download" data-hash="${hash}" data-algo="${algo}" data-index="${number}" data-tip="Download" aria-label="Download hash">
<svg class="icon-action" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
${check}
<span class="tooltip">Exported</span>
</button>
</div>
</div>`;
}
