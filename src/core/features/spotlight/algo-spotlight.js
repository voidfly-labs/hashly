import { Preferences } from '~core/features/preferences/preferences.js';
import { Format } from '~core/lib/format.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

// The spotlight is saved with the other preferences (see core/features/preferences/preferences.js).
const PREF_NAME = 'spotlight';

/** Show only `algoId` in `section`, hiding every other algorithm.
 *  resetSpotlight: false — these calls originate from AlgoSpotlight itself,
 *  so they must not immediately clear the very state they're setting. */
function _showOnlyInSection(section, algoId, ALGORITHMS) {
  const hidden = new Set(ALGORITHMS.map(({ id }) => id).filter((id) => id !== algoId));
  section._setHiddenAlgos(hidden, { resetSpotlight: false });
}

/** Puts `section`'s hidden algorithms to `hidden` (a Set of ids). */
function _setHiddenTo(section, hidden) {
  section._setHiddenAlgos(hidden, { resetSpotlight: false });
}

/**
 * Header algo badges act as a spotlight control for the Text/File sections:
 * clicking one spotlights it (hiding every other algorithm in both
 * sections), clicking the spotlighted badge again puts each section back to
 * the app's default view. Both are plain selections, saved like any manual
 * show/hide: what the visitor had hidden before is not remembered.
 * The choice is also kept as its own preference, only to light up the badge; it is
 * honoured on the next visit while the sections still show exactly that algorithm.
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
  // The sections it spotlights in, for saving what they have hidden when it ends.
  _sections: [],

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
    Preferences.set(PREF_NAME, null);
    // Ended by a hand-pick in one section, that section saved what it shows, so the others save
    // theirs too, or a reload would show them disagreeing (a permalink's spotlight was never saved).
    this._sections.forEach((section) => section.saveHidden());
    this._updateBadgeClasses();
    this._onChange?.(null);
  },

  /** The spotlight the visitor left on, if it is still one of `ALGORITHMS`, else null. Nothing
   *  is saved for a permalink view (see Preferences), which shows what the link says. Whether the
   *  sections still agree with it is checked by init(), once they exist. */
  saved(ALGORITHMS) {
    const saved = Preferences.get(PREF_NAME);
    return ALGORITHMS.some((a) => a.id === saved) ? saved : null;
  },

  getSpotlighted() {
    return this._state.spotlightedAlgo;
  },

  /** Marks algoId as the spotlight and tells the badges and the Random section. */
  _setSpotlighted(algoId, persist) {
    this._state.spotlightedAlgo = algoId;
    if (persist) Preferences.set(PREF_NAME, algoId);
    this._updateBadgeClasses();
    this._onChange?.(algoId);
  },

  /** Spotlight algoId: hide every other algorithm in the sections (saved like a hand-pick, unless
   *  persist is false: a permalink's view isn't the visitor's), remember the choice, update badge classes. */
  _apply(algoId, ALGORITHMS, sections, { persist = true } = {}) {
    const hide = () => sections.forEach((section) => _showOnlyInSection(section, algoId, ALGORITHMS));
    if (persist) hide();
    else Preferences.silently(hide);
    this._setSpotlighted(algoId, persist);
  },

  /** Whether every section shows exactly algoId, which is what a spotlight on it leaves behind. */
  _isShownAlone(algoId, ALGORITHMS, sections) {
    return sections.every((section) => ALGORITHMS.every(({ id }) => section.hiddenAlgos.has(id) === (id !== algoId)));
  },

  _toggle(algoId, ALGORITHMS, sections) {
    if (this._state.spotlightedAlgo === algoId) {
      sections.forEach((section) => _setHiddenTo(section, section.defaultHidden()));
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
    this._sections = sections;
    this._container = document.getElementById('algoBadges');
    if (!this._container) return;
    // The badges themselves are in the page already (see quick-select.html); this wires them.
    this._container.querySelectorAll('.algo-badge').forEach((badge) => {
      const algo = ALGORITHMS.find((a) => a.id === badge.dataset.algo);
      this._wireBadge(badge, algo, ALGORITHMS, sections);
    });

    if (permalink) {
      this._applyPermalink(permalink.algorithm, ALGORITHMS, sections);
      return;
    }

    // The sections have put back the hidden algorithms they saved; the spotlight is only still on if
    // they show exactly that algorithm (the saved choice may be older than a hand-pick, or edited).
    const persisted = this.saved(ALGORITHMS);
    if (persisted && this._isShownAlone(persisted, ALGORITHMS, sections)) this._setSpotlighted(persisted, false);
    else if (persisted) {
      Preferences.set(PREF_NAME, null);
      this._onChange?.(null);
    }
    this._updateBadgeClasses();
  },
};
