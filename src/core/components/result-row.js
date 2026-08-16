import { iconHref } from '~core/utils/icon.js';

import { copyWithFeedback } from './copy-feedback.js';
import { HashSelect } from './hash-select.js';
import { setHashEmpty } from './result.js';
import { Tooltip } from './tooltip.js';

// The rows of the Text and File sections, which differ in little but their id prefix and what a row
// says when it has no digest: the markup, wiring and show/hide of a row live here, what a section
// does around them (history, progress, verification) stays with it.

const ICON_CHECKED =
  '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
const ICON_INDETERMINATE =
  '<path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2z"/>';
const ICON_UNCHECKED =
  '<path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>';

/** Builds the result row of `algoId`, whose element ids start with `prefix` ('text', 'file'), and
 *  returns its parts: `{ row, badge, hash, copy, download }`. `emptyText` is what the hash cell says
 *  to begin with; `withStatus` adds the badge's slot for a verification verdict (file rows). The
 *  caller appends `row` where it belongs. */
export function buildResultRow({ prefix, algoId, emptyText, withStatus = false }) {
  const safeId = algoId.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const status = withStatus
    ? '<span class="result__status" aria-hidden="true" hidden><svg class="result__status-icon" viewBox="0 0 24 24"><use href=""></use></svg></span>'
    : '';

  const row = document.createElement('div');
  row.className = 'result result--empty';
  row.dataset.algo = algoId;
  row.innerHTML = `
          <div class="result__inner">
            <span class="algo-badge" data-algo="${algoId}" tabindex="0" role="switch" aria-checked="true" aria-label="${algoId}">${algoId}${status}</span>
            <span class="result__hash result__hash--empty" id="${prefix}Hash-${safeId}">${emptyText}<span class="tooltip">Copied!</span></span>
            <div class="result__actions">
              <button class="btn" id="${prefix}Copy-${safeId}" disabled aria-label="Copy ${algoId} hash to clipboard">
                <svg class="icon-action" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('copy')}"></use></svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                Copy<span class="tooltip">Copied!</span>
              </button>
              <button class="btn" id="${prefix}Download-${safeId}" disabled aria-label="Download ${algoId} hash as text file">
                <svg class="icon-action" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('download')}"></use></svg>
                <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>
                <span class="btn__label">Download</span><span class="tooltip">Exported</span>
              </button>
            </div>
          </div>`;

  return {
    row,
    badge: row.querySelector('.algo-badge'),
    hash: row.querySelector(`#${prefix}Hash-${safeId}`),
    copy: row.querySelector(`#${prefix}Copy-${safeId}`),
    download: row.querySelector(`#${prefix}Download-${safeId}`),
  };
}

/** Wires a row built by `buildResultRow`: its badge shows or hides the algorithm (`onToggle`), its
 *  buttons copy and download (`onCopy`, `onDownload`), and a click on the row copies the digest
 *  (`getHash()`, '' while there is none). */
export function wireResultRow(els, { isHidden, onToggle, onCopy, onDownload, getHash }) {
  const { row, badge, hash, copy, download } = els;
  const tipText = () => (isHidden() ? 'Show' : 'Hide');

  badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText()));
  badge.addEventListener('mouseleave', () => Tooltip.hide());
  badge.addEventListener('focus', () => Tooltip.show(badge, tipText()));
  badge.addEventListener('blur', () => Tooltip.hide());
  badge.addEventListener('click', onToggle);
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  });

  download.addEventListener('click', onDownload);
  copy.addEventListener('click', onCopy);
  row.addEventListener('click', (e) => {
    if (e.target.closest('.algo-badge, .result__actions')) return;
    if (HashSelect.isSelectClick(e)) return; // Ctrl/⌘ is for selecting part of the hash
    const digest = getHash();
    if (digest) copyWithFeedback(digest, { anchor: hash });
  });
}

/** Preserve the child .tooltip span when replacing text content. */
export function setHashText(hashEl, text) {
  const tip = hashEl.querySelector('.tooltip');
  hashEl.textContent = text;
  if (tip) hashEl.appendChild(tip);
}

/** Enables or disables a row's Copy and Download buttons. */
export function setRowActions({ copy, download }, enabled) {
  copy.disabled = !enabled;
  download.disabled = !enabled;
}

function setRowHidden({ row, badge }, hidden) {
  badge.classList.toggle('algo-badge--hidden', hidden);
  row.classList.toggle('result--hidden', hidden);
  badge.setAttribute('aria-checked', String(!hidden));
}

/** Puts a row in its hidden state: collapsed, with nothing to copy. */
export function hideRow(els) {
  setRowHidden(els, true);
  setHashText(els.hash, 'disabled');
  setHashEmpty(els.hash, true);
  setRowActions(els, false);
}

/** Shows a hidden row again, with `digest` if there is one (else `emptyText`). */
export function showRow(els, digest, emptyText) {
  setRowHidden(els, false);
  setHashText(els.hash, digest || emptyText);
  setHashEmpty(els.hash, !digest);
  if (digest) setRowActions(els, true);
}

/** The label of a section's "hide all / show all" button for the current state. */
export function toggleAllLabel(hiddenAlgos, algorithms) {
  return algorithms.every((a) => !hiddenAlgos.has(a.id)) ? 'Hide all' : 'Show all';
}

/** Syncs the "hide all / show all" button (`btnId`) with what is hidden: its checkbox icon and its
 *  accessible name (`noun` is what the section's algorithms are for: 'text', 'file'). */
export function updateToggleAllButton(btnId, hiddenAlgos, algorithms, noun) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const allVisible = algorithms.every((a) => !hiddenAlgos.has(a.id));
  const allHidden = algorithms.every((a) => hiddenAlgos.has(a.id));
  let icon = ICON_INDETERMINATE;
  if (allVisible) icon = ICON_CHECKED;
  else if (allHidden) icon = ICON_UNCHECKED;
  btn.querySelector('svg').innerHTML = icon;
  btn.setAttribute('aria-label', `${allVisible ? 'Hide' : 'Show'} all ${noun} algorithms`);
}

/** Shows the button's tooltip for its current state, as it may be under the pointer. */
export function showToggleAllTooltip(btnId, hiddenAlgos, algorithms) {
  const btn = document.getElementById(btnId);
  if (btn) Tooltip.show(btn, toggleAllLabel(hiddenAlgos, algorithms));
}
