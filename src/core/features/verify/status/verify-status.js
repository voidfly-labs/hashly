/** The notice under the reference field (markup: ./verify-status.html).
 *  `set({ text, lead?, hint?, kind? })` shows it; an empty `text` collapses it.
 *  `lead` is a prefix of `text` to emphasise. It keeps its last text and tone
 *  while collapsing so the content doesn't flash. */
export function createVerifyStatus(root) {
  const wrap = root.querySelector('.verify__status-wrap');
  const status = root.querySelector('.verify__status');
  const lead = root.querySelector('.verify__status-lead');
  const rest = root.querySelector('.verify__status-rest');
  const hint = root.querySelector('.verify__status-hint');

  return {
    /** `kind`: 'match' | 'mismatch' | 'warn', or undefined for a neutral note. */
    set(message) {
      if (message.text) {
        const emphasis = message.lead ?? '';
        lead.textContent = emphasis;
        rest.textContent = message.text.slice(emphasis.length);
        hint.textContent = message.hint ?? '';
        hint.hidden = !message.hint;
        status.dataset.tone = message.kind ?? 'info';
      }
      wrap.classList.toggle('verify__status-wrap--open', Boolean(message.text));
    },
  };
}
