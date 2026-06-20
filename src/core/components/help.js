import { Tooltip } from './tooltip.js';

const DURATION_MS = 15000;

/** Wire a .help-btn's hover/click to a fixed-duration tooltip. */
export function initHelpAction(buttonId, lines) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  const text = lines.join('\n');
  const trigger = () => Tooltip.showXl(btn, text, DURATION_MS);
  btn.addEventListener('mouseenter', trigger);
  btn.addEventListener('click', trigger);
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target)) Tooltip.hide();
  });
}
