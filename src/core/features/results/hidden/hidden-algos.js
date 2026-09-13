import { showToggleAllTooltip } from '~core/features/results/result-row.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

/** The show/hide logic Text and File share: toggling one algorithm or all of them.
 *
 *  `hiddenAlgos` is the section's Set of hidden ids. `setHidden(id, hidden)` does the section's own
 *  work for one algorithm and may return something truthy describing what it did (Text returns the
 *  history item of a row shown again); those are passed to `applied(results)` once all are done.
 *  `afterChange({ resetSpotlight })` follows every change, `getBadge(id)` is the row badge a tooltip
 *  hangs on and `toggleAllBtnId` the "hide all / show all" button. */
export function createHiddenAlgos({
  algorithms,
  hiddenAlgos,
  setHidden,
  applied = () => {},
  afterChange,
  getBadge,
  toggleAllBtnId,
}) {
  return {
    toggleAll({ refreshTooltip = false, resetSpotlight = true } = {}) {
      const allVisible = algorithms.every((a) => !hiddenAlgos.has(a.id));
      const results = [];
      for (const { id } of algorithms) {
        if (allVisible || hiddenAlgos.has(id)) results.push(setHidden(id, allVisible));
      }
      applied(results.filter(Boolean));
      afterChange({ resetSpotlight });
      if (refreshTooltip) showToggleAllTooltip(toggleAllBtnId, hiddenAlgos, algorithms);
    },

    /** Puts the hidden algorithms to `target` (a Set of ids) as one change: whatever it shows again is
     *  handed to `applied` once and `afterChange` follows once, not per algorithm. */
    setHiddenTo(target, { resetSpotlight = true } = {}) {
      const results = [];
      let changed = false;
      for (const { id } of algorithms) {
        if (hiddenAlgos.has(id) === target.has(id)) continue;
        changed = true;
        results.push(setHidden(id, target.has(id)));
      }
      if (!changed) return;
      applied(results.filter(Boolean));
      afterChange({ resetSpotlight });
    },

    toggleAlgo(algoId, { refreshTooltip = false, resetSpotlight = true } = {}) {
      const result = setHidden(algoId, !hiddenAlgos.has(algoId));
      applied([result].filter(Boolean));
      // Refresh the tooltip to reflect the new state while it may still be visible —
      // only for a direct click on this badge, not when driven by AlgoSpotlight.
      if (refreshTooltip) Tooltip.show(getBadge(algoId), hiddenAlgos.has(algoId) ? 'Show' : 'Hide');
      afterChange({ resetSpotlight });
    },
  };
}
