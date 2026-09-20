import { initialHiddenAlgos, saveHiddenAlgos } from '~core/features/preferences/saved-view.js';
import { AlgoSpotlight } from '~core/features/spotlight/algo-spotlight.js';
import { Format } from '~core/lib/format.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { flashDone } from '~core/ui/button/flash-done.js';

import { downloadDigest } from './export/download-digest.js';
import { createHiddenAlgos } from './hidden/hidden-algos.js';
import { createHiddenSummary } from './hidden/hidden-summary.js';
import { updateToggleAllButton } from './result-row.js';
import { createSoloResult } from './solo-result.js';

/** What the Text and File sections share around their result rows: which algorithms are hidden (kept
 *  in the preferences under `hiddenPref`, starting from `defaults`, a Set), the "Showing X of N" line
 *  and the solo row that follow it, the "hide all" button, the output format the digests are shown
 *  in (the radio group `formatName`) and what a row's Copy and Download do.
 *
 *  `createRows({ isHidden, handlers })` builds the section's rows, wired to the panel by those
 *  (`handlers` are `onToggle`, `onDownload`, `onCopy` and `getHash`); `getDigests()` is the section's `Map<algoId, hex>`
 *  and `getFileName()` the name a download is called after ('' for text). `applied(results)` gets what
 *  `setHidden` returned for the algorithms a change showed again (see hidden-algos.js), and
 *  `afterChange({ resetSpotlight })` is the section's own follow-up to every change, run before the
 *  spotlight is reset. `noun` ('text', 'file') is what the "hide all" button says it hides.
 *
 *  Returns `{ hiddenAlgos, rows, toggleAll, toggleAlgo, setHiddenTo, saveHidden, selectedFormat,
 *  formattedHash, reformat }`. `hiddenAlgos` is the Set the section keeps, shared, never replaced. */
export function createResultsPanel({
  algorithms,
  appConfig,
  resultsEl,
  noun,
  hiddenPref,
  defaults,
  formatName,
  toggleAllBtnId,
  createRows,
  getDigests,
  getFileName = () => '',
  applied,
  afterChange = () => {},
}) {
  const hiddenAlgos = initialHiddenAlgos(hiddenPref, defaults, algorithms);
  const saveHidden = () => saveHiddenAlgos({ hiddenAlgos }, hiddenPref);

  const selectedFormat = () => document.querySelector(`input[name="${formatName}"]:checked`).value;

  /** The digest of `algoId` in the shown output format, or '' if there is none. */
  function formattedHash(algoId) {
    const hex = getDigests().get(algoId);
    return hex ? Format.applyFormat(hex, selectedFormat()) : '';
  }

  /** Hides or shows one algorithm's row (showing puts back its digest, if there is one). Returns the
   *  history item `{ hash, algo }` of a row just shown with a digest, else null. */
  function setHidden(algoId, hidden) {
    if (hidden) {
      hiddenAlgos.add(algoId);
      rows.hide(algoId);
      return null;
    }
    hiddenAlgos.delete(algoId);
    const hash = formattedHash(algoId);
    rows.show(algoId, hash);
    return hash ? { hash, algo: algoId } : null;
  }

  /** Brings the "hide all" button, the hidden-algorithms line and the solo row in line with `hiddenAlgos`. */
  function sync() {
    updateToggleAllButton(toggleAllBtnId, hiddenAlgos, algorithms, noun);
    hiddenSummary.update(hiddenAlgos.size);
    soloResult.update();
  }

  const hidden = createHiddenAlgos({
    algorithms,
    hiddenAlgos,
    setHidden,
    applied,
    afterChange(options) {
      sync();
      saveHidden();
      afterChange(options);
      if (options.resetSpotlight) AlgoSpotlight.reset();
    },
    getBadge: (algoId) => rows.get(algoId).badge,
    toggleAllBtnId,
  });

  async function onCopy(algoId) {
    const hash = formattedHash(algoId);
    if (!hash) return;
    await copyWithFeedback(hash, { button: rows.get(algoId).copy });
  }

  function onDownload(algoId) {
    const hash = formattedHash(algoId);
    if (!hash) return;
    downloadDigest(hash, algoId, getFileName(), appConfig);
    flashDone(rows.get(algoId).download);
  }

  // One result row per algorithm.
  const rows = createRows({
    isHidden: (algoId) => hiddenAlgos.has(algoId),
    handlers: {
      onToggle: (algoId) => hidden.toggleAlgo(algoId, { refreshTooltip: true }),
      onDownload,
      onCopy,
      getHash: formattedHash,
    },
  });
  const hiddenSummary = createHiddenSummary({
    resultsEl,
    total: algorithms.length,
    onShowAll: () => hidden.toggleAll(),
  });
  const soloResult = createSoloResult({ resultsEl, algorithms });
  sync();

  return {
    hiddenAlgos,
    rows,
    toggleAll: hidden.toggleAll,
    toggleAlgo: hidden.toggleAlgo,
    setHiddenTo: hidden.setHiddenTo,
    saveHidden,
    selectedFormat,
    formattedHash,
    /** Rewrites every row's digest in the (changed) output format. */
    reformat: () => rows.reformat(getDigests(), selectedFormat()),
  };
}
