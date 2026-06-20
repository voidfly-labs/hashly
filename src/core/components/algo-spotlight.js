import { Storage } from '../services/storage.js';
import { Tooltip } from './tooltip.js';

/** Show only `algoId` in `section`, hiding every other algorithm.
 *  resetSpotlight: false — these calls originate from AlgoSpotlight itself,
 *  so they must not immediately clear the very state they're setting. */
function _showOnlyInSection(section, algoId, ALGORITHMS) {
  ALGORITHMS.forEach(({ id }) => {
    const shouldHide = id !== algoId;
    if (section.hiddenAlgos.has(id) !== shouldHide) section._toggleAlgo(id, { resetSpotlight: false });
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
 * sections), clicking the spotlighted badge again re-shows all of them.
 * The choice is remembered in localStorage and restored on the next visit.
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
  _SPOTLIGHT_KEY: 'spotlight-algo',
  _onChange: null,

  _updateBadgeClasses() {
    this._container.querySelectorAll('.algo-badge').forEach((badge) => {
      const isSpotlighting = this._state.spotlightedAlgo !== null;
      const isActive = badge.dataset.algo === this._state.spotlightedAlgo;
      badge.classList.toggle('algo-badge--hidden', isSpotlighting && !isActive);
      badge.classList.toggle('algo-badge--active', isActive);
    });
  },

  /** Clear the spotlight without touching any section's shown/hidden
   *  state — called whenever that state changes for a reason other than
   *  the spotlight itself. No-ops if nothing is spotlighted. */
  reset() {
    if (this._state.spotlightedAlgo === null) return;
    this._state.spotlightedAlgo = null;
    Storage.remove(this._SPOTLIGHT_KEY);
    this._updateBadgeClasses();
    this._onChange?.(null);
  },

  /** Spotlight algoId: hide every other algorithm, remember the choice,
   *  update badge classes. Shared by a direct click and by restoring a
   *  persisted choice on init. */
  _apply(algoId, ALGORITHMS, sections) {
    sections.forEach((section) => _showOnlyInSection(section, algoId, ALGORITHMS));
    this._state.spotlightedAlgo = algoId;
    Storage.write(this._SPOTLIGHT_KEY, algoId);
    this._updateBadgeClasses();
    this._onChange?.(algoId);
  },

  _toggle(algoId, ALGORITHMS, sections) {
    if (this._state.spotlightedAlgo === algoId) {
      sections.forEach((section) => _showAllInSection(section, ALGORITHMS));
      this.reset();
      return;
    }
    this._apply(algoId, ALGORITHMS, sections);
  },

  _wireBadge(badge, algo, ALGORITHMS, sections) {
    const tipText = `${algo.bits}-bit · ${algo.hexLen} hex chars`;
    badge.setAttribute('aria-label', `${algo.id} — ${tipText} — click to show only this algorithm`);
    badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText));
    badge.addEventListener('mouseleave', () => Tooltip.hide());
    badge.addEventListener('focus', () => Tooltip.show(badge, tipText));
    badge.addEventListener('blur', () => Tooltip.hide());
    badge.addEventListener('click', () => this._toggle(algo.id, ALGORITHMS, sections));
  },

  init(ALGORITHMS, sections, { onChange } = {}) {
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

    const persisted = Storage.read(this._SPOTLIGHT_KEY);
    if (persisted && ALGORITHMS.some((a) => a.id === persisted)) {
      this._apply(persisted, ALGORITHMS, sections);
    }
  },
};
