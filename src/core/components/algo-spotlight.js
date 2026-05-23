import { Tooltip } from './tooltip.js';

/** Enable only `algoId` in `section`, disabling every other algorithm. */
function _selectOnlyInSection(section, algoId, ALGORITHMS) {
  ALGORITHMS.forEach(({ id }) => {
    const shouldDisable = id !== algoId;
    if (section.disabledAlgos.has(id) !== shouldDisable) section._toggleAlgo(id);
  });
}

/** Re-enable every algorithm in `section` if it isn't already fully selected. */
function _selectAllInSection(section, ALGORITHMS) {
  const allSelected = ALGORITHMS.every((a) => !section.disabledAlgos.has(a.id));
  if (!allSelected) section._toggleAll();
}

/**
 * Header algo badges act as a spotlight control for the Text/File sections:
 * clicking one spotlights it (disabling every other algorithm in both
 * sections), clicking the spotlighted badge again re-selects all of them.
 */
export const AlgoSpotlight = {
  _state: { spotlightedAlgo: null },

  _updateBadgeClasses(container) {
    container.querySelectorAll('.algo-badge').forEach((badge) => {
      const isSpotlighting = this._state.spotlightedAlgo !== null;
      const isActive = badge.dataset.algo === this._state.spotlightedAlgo;
      badge.classList.toggle('algo-badge--disabled', isSpotlighting && !isActive);
      badge.classList.toggle('algo-badge--active', isActive);
    });
  },

  _toggle(algoId, ALGORITHMS, sections, container) {
    if (this._state.spotlightedAlgo === algoId) {
      sections.forEach((section) => _selectAllInSection(section, ALGORITHMS));
      this._state.spotlightedAlgo = null;
    } else {
      sections.forEach((section) => _selectOnlyInSection(section, algoId, ALGORITHMS));
      this._state.spotlightedAlgo = algoId;
    }
    this._updateBadgeClasses(container);
  },

  _wireBadge(badge, algo, ALGORITHMS, sections, container) {
    const tipText = `${algo.bits}-bit · ${algo.hexLen} hex chars`;
    badge.setAttribute('aria-label', `${algo.id} — ${tipText} — click to select only this algorithm`);
    badge.addEventListener('mouseenter', () => Tooltip.show(badge, tipText));
    badge.addEventListener('mouseleave', () => Tooltip.hide());
    badge.addEventListener('focus', () => Tooltip.show(badge, tipText));
    badge.addEventListener('blur', () => Tooltip.hide());
    badge.addEventListener('click', () => this._toggle(algo.id, ALGORITHMS, sections, container));
  },

  init(ALGORITHMS, sections) {
    const container = document.getElementById('algoBadges');
    if (!container) return;
    container.innerHTML = ALGORITHMS.map(
      ({ id }) => `<button class="algo-badge" data-algo="${id}">${id}</button>`,
    ).join('');
    container.querySelectorAll('.algo-badge').forEach((badge) => {
      const algo = ALGORITHMS.find((a) => a.id === badge.dataset.algo);
      this._wireBadge(badge, algo, ALGORITHMS, sections, container);
    });
  },
};
