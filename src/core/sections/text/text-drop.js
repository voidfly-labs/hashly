import { trackPageDrag } from '~core/features/input/page-drag.js';
import { takesText } from '~core/lib/text-field.js';

// Only text drags are handled; file drags are intentionally ignored so they still route to
// the File section's drop zone.
const hasTextOnly = (dt) => dt?.types?.includes('text/plain') && !dt?.types?.includes('Files');

/** Text dragged in from other windows or documents: accepted by the text card (not just the textarea,
 *  for a larger hit area, as with the file drop zone) or, failing that, anywhere on the page. Each
 *  drop replaces the field's content: `onText(text)`.
 *
 *  The card lights up (`card--text-drag`) while any text drag is over the window. */
export function initTextDrop({ card, onText }) {
  // ── Page-wide text drag highlight ──────────────────────────────────
  // Lights up the text card whenever ANY text/plain drag enters the browser window,
  // regardless of where it lands. Only text drags are handled; Files drags route to
  // the File section.
  trackPageDrag({
    accepts: (dt) => Boolean(hasTextOnly(dt)),
    onChange: (active, { internal }) => {
      card.classList.toggle('card--text-drag', active);
      if (active && !internal) card.closest('.section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  });

  document.addEventListener('dragover', (e) => {
    // Required to allow drops anywhere on the page for text drags (a field takes its own)
    if (hasTextOnly(e.dataTransfer) && !takesText(e.target)) e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    if (!hasTextOnly(e.dataTransfer)) return;
    // Text dropped into another field (the reference hash, the history search) stays there.
    if (takesText(e.target)) return;
    // If the drop landed inside the card, the card's own handler already
    // processed it (and called stopPropagation) — nothing left to do.
    if (card.contains(e.target)) return;
    // Drop landed outside the card: it replaces the textarea's content, like a drop on it.
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    onText(raw);
  });

  // ── Card-level drop: replaces the content ───────────────────────────
  // dragover on the card keeps the dropEffect visible while over the textarea.
  card.addEventListener('dragover', (e) => {
    if (!hasTextOnly(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation(); // don't let document dragover fire redundantly
    e.dataTransfer.dropEffect = 'copy';
  });

  card.addEventListener('drop', (e) => {
    if (!hasTextOnly(e.dataTransfer)) return;
    e.preventDefault();
    // Stop propagation so the document drop handler skips this drop.
    e.stopPropagation();

    const raw = e.dataTransfer.getData('text/plain');
    if (raw) onText(raw);
  });
}
