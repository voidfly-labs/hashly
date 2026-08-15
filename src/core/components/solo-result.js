/** Gives the one visible row of a results container a "solo" treatment (`.result--solo`, see
 *  components/result.css): larger hash, labelled primary Copy, and a line describing the digest.
 *  Derived from the rows' own hidden state, so it holds however the other algorithms got
 *  hidden — the spotlight, the row badges, "hide all", a saved view. Call `update()` after
 *  any change to which rows are hidden. */
export function createSoloResult({ resultsEl, algorithms }) {
  const byId = new Map(algorithms.map((algo) => [algo.id, algo]));

  const meta = document.createElement('span');
  meta.className = 'result__meta';

  /** "128-bit · 32 hex characters" — what the digest is, independent of the output format. */
  const describe = ({ bits, hexLen } = {}) => (bits && hexLen ? `${bits}-bit · ${hexLen} hex characters` : '');

  return {
    update() {
      const rows = [...resultsEl.querySelectorAll('.result')];
      const visible = rows.filter((row) => !row.classList.contains('result--hidden'));
      const solo = visible.length === 1 ? visible[0] : null;

      rows.forEach((row) => row.classList.toggle('result--solo', row === solo));
      if (!solo) {
        meta.remove();
        return;
      }
      meta.textContent = describe(byId.get(solo.dataset.algo));
      solo.querySelector('.algo-badge').after(meta);
    },
  };
}
