import { Preferences } from '~core/features/preferences/preferences.js';
import { Format } from '~core/lib/format.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

// The spotlight is saved with the other preferences (see core/features/preferences/preferences.js).
const PREF_NAME = 'spotlight';

/** Show only `algoId` in `section`, hiding every other algorithm.
 *  resetSpotlight: false — these calls originate from AlgoSpotlight itself,
 *  so they must not immediately clear the very state they're setting. */
function _showOnlyInSection(section, algoId, ALGORITHMS) {
  ALGORITHMS.forEach(({ id }) => {
    const shouldHide = id !== algoId;
    if (section.hiddenAlgos.has(id) !== shouldHide) section._toggleAlgo(id, { resetSpotlight: false });
  });
}

/** Puts `section`'s hidden algorithms back to `hidden` (a Set of ids). */
function _restoreHidden(section, hidden, ALGORITHMS) {
  ALGORITHMS.forEach(({ id }) => {
    if (section.hiddenAlgos.has(id) !== hidden.has(id)) section._toggleAlgo(id, { resetSpotlight: false });
  });
}

/** Re-show every algorithm in `section` if it isn't already fully visible. */
function _showAllInSection(section, ALGORITHMS) {
  const allVisible = ALGORITHMS.every((a) => !section.hiddenAlgos.has(a.id));
  if (!allVisible) section._toggleAll({ resetSpotlight: false });
}

/**
 * Header algo badges act as a spotlight control for the Text/File sections:
 * clicking one spotlights it (hiding every other algorithm in both
 * sections), clicking the spotlighted badge again puts back what each section
 * had hidden before.
 * The choice is remembered in the preferences and restored on the next visit.
 *
 * Any manual show/hide elsewhere (a row's own badge, "show/hide all", the
 * hidden-algorithms summary) clears the spotlight via reset() — once the
 * user hand-picks a combination the spotlight didn't set up, the
 * highlighted header badge no longer reflects what's actually visible.
 * reset() is also where the persisted choice is cleared, so a stale
 * spotlight never resurfaces after a manual override — including
 * un-spotlighting via _toggle() itself, which routes through reset() too.
 */
export const AlgoSpotlight = {
  _state: { spotlightedAlgo: null },
  _container: null,
  _onChange: null,
  // What each section had hidden before the spotlight took over (Map<section, Set<id>>), so
  // ending the spotlight puts that back rather than showing every algorithm.
  _before: null,

  _updateBadgeClasses() {
    this._container.querySelectorAll('.algo-badge').forEach((badge) => {
      const isSpotlighting = this._state.spotlightedAlgo !== null;
      const isActive = badge.dataset.algo === this._state.spotlightedAlgo;
      badge.classList.toggle('algo-badge--hidden', isSpotlighting && !isActive);
      badge.classList.toggle('algo-badge--active', isActive);
      badge.setAttribute('aria-pressed', String(isActive));
    });
  },

  /** Clear the spotlight without touching any section's shown/hidden
   *  state — called whenever that state changes for a reason other than
   *  the spotlight itself. No-ops if nothing is spotlighted. */
  reset() {
    if (this._state.spotlightedAlgo === null) return;
    this._state.spotlightedAlgo = null;
    this._before = null;
    Preferences.set(PREF_NAME, null);
    this._updateBadgeClasses();
    this._onChange?.(null);
  },

  /** The spotlight the visitor left on, if it is still one of `ALGORITHMS`, else null. Nothing
   *  is saved for a permalink view (see Preferences), which shows what the link says. */
  saved(ALGORITHMS) {
    const saved = Preferences.get(PREF_NAME);
    return ALGORITHMS.some((a) => a.id === saved) ? saved : null;
  },

  getSpotlighted() {
    return this._state.spotlightedAlgo;
  },

  /** Spotlight algoId: hide every other algorithm, remember the choice (unless
   *  persist is false), update badge classes. Shared by a direct click and by
   *  restoring a persisted or permalink choice on init. */
  _apply(algoId, ALGORITHMS, sections, { persist = true } = {}) {
    // Taken once, when the spotlight starts, not when it moves from one algorithm to another.
    if (this._state.spotlightedAlgo === null) {
      this._before = new Map(sections.map((section) => [section, new Set(section.hiddenAlgos)]));
    }
    // The spotlight's own hiding is never saved as the visitor's hidden algorithms (their
    // choice stays what it was before it, and is what comes back); a permalink's view isn't theirs either.
    Preferences.silently(() => sections.forEach((section) => _showOnlyInSection(section, algoId, ALGORITHMS)));
    this._state.spotlightedAlgo = algoId;
    if (persist) Preferences.set(PREF_NAME, algoId);
    this._updateBadgeClasses();
    this._onChange?.(algoId);
  },

  _toggle(algoId, ALGORITHMS, sections) {
    if (this._state.spotlightedAlgo === algoId) {
      const before = this._before;
      Preferences.silently(() =>
        sections.forEach((section) => {
          const hidden = before?.get(section);
          if (hidden) _restoreHidden(section, hidden, ALGORITHMS);
          else _showAllInSection(section, ALGORITHMS);
        }),
      );
      this.reset();
      return;
    }
    this._apply(algoId, ALGORITHMS, sections);
  },

  _wireBadge(badge, algo, ALGORITHMS, sections) {
    const tipText = `${algo.bits}-bit · ${algo.hexLen} hex chars`;
    badge.setAttribute('aria-label', `${algo.id} — ${tipText} — click to show only this algorithm`);
    initButtonTooltip(badge, tipText, { hideOnClick: false });
    badge.addEventListener('click', () => this._toggle(algo.id, ALGORITHMS, sections));
  },

  /** A permalink overrides the persisted spotlight; a missing or unknown algorithm shows the default view. */
  _applyPermalink(slug, ALGORITHMS, sections) {
    const target = slug && ALGORITHMS.find((a) => Format.slug(a.id) === Format.slug(slug));
    if (target) this._apply(target.id, ALGORITHMS, sections, { persist: false });
    else this._onChange?.(null);
  },

  init(ALGORITHMS, sections, { onChange, permalink = null } = {}) {
    this._onChange = onChange ?? null;
    this._container = document.getElementById('algoBadges');
    if (!this._container) return;
    this._container.innerHTML = ALGORITHMS.map(
      ({ id }) => `<button class="algo-badge" data-algo="${id}">${id}</button>`,
    ).join('');
    this._container.querySelectorAll('.algo-badge').forEach((badge) => {
      const algo = ALGORITHMS.find((a) => a.id === badge.dataset.algo);
      this._wireBadge(badge, algo, ALGORITHMS, sections);
    });

    if (permalink) {
      this._applyPermalink(permalink.algorithm, ALGORITHMS, sections);
      return;
    }

    const persisted = this.saved(ALGORITHMS);
    if (persisted) this._apply(persisted, ALGORITHMS, sections);
    this._updateBadgeClasses();
  },
};
