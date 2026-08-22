// A burst of updates (typing, say) is announced once, when it settles.
const SETTLE_MS = 600;

let region = null;
let timer = null;

function ensureRegion() {
  if (region) return region;
  region = document.createElement('div');
  region.className = 'announcer';
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', 'polite');
  document.body.appendChild(region);
  return region;
}

/** Tells screen readers `message` (politely, after SETTLE_MS without another one). For results that
 *  change on the page without the focus going to them. */
export const Announcer = {
  say(message) {
    const el = ensureRegion();
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Emptied first, so the same message said twice is announced twice.
      el.textContent = '';
      el.textContent = message;
    }, SETTLE_MS);
  },
};
