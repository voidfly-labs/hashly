import { iconHref } from '~core/lib/icon.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** One row of the random list: its number (shown with `padWidth` digits), the digest, the algorithm
 *  badge (with `tip` as its tooltip) and the Copy and Download buttons. What a click on any of them does
 *  is left to whoever listens: they carry their action and digest in `data-` attributes. */
export function createRandomItem({ hash, algo, number, padWidth, tip }) {
  const item = document.createElement('div');
  item.className = 'random__item';
  item.dataset.action = 'copy';
  item.dataset.hash = hash;
  item.innerHTML = `
            <span class="random__item-index">${String(number).padStart(padWidth, '0')}</span>
            <span class="random__item-hash" data-action="copy" data-hash="${hash}">${hash}<span class="tooltip">Copied!</span></span>
            <span class="algo-badge random__item-badge" data-algo="${algo}" tabindex="0">${algo}</span>
            <div class="random__item-actions">
              <button
                class="random__item-btn"
                data-action="copy"
                data-hash="${hash}"
                aria-label="Copy hash"
              >
                <svg class="icon-action" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                <span class="tooltip">Copied!</span>
              </button>
              <button
                class="random__item-btn"
                data-action="download"
                data-hash="${hash}"
                data-algo="${algo}"
                data-index="${number}"
                aria-label="Download hash"
              >
                <svg class="icon-action" viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                <span class="tooltip">Exported</span>
              </button>
            </div>`;

  const badge = item.querySelector('.algo-badge');
  badge.setAttribute('aria-label', `${algo} — ${tip}`);
  initButtonTooltip(badge, tip);

  // Hover tooltips for icon-only Copy / Download buttons. Their click flashes "Copied!" / "Exported",
  // so it must not hide the tooltip as well.
  item.querySelectorAll('.random__item-btn[data-action]').forEach((btn) => {
    const label = btn.dataset.action === 'copy' ? 'Copy' : 'Download';
    initButtonTooltip(btn, label, { hideOnClick: false });
  });

  return item;
}
