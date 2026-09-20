import { svgIcon } from '~core/lib/icon.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

/** A ghost icon button (see icon-button.css) built in JS: `icon` is the sprite's name for it, `label` what it
 *  is called to assistive technology, and `tip` what its tooltip says (a string, or a function giving it;
 *  the label by default). `danger` is for a removal (it hovers red), `morph` makes its click turn the icon
 *  into a check (see Checkmark: the caller flashes it), `onClick(button)` is what it does, and `className`
 *  adds the classes of the place it is in, which lay it out. Returns the `<button>`. */
export function createIconButton({ icon, label, tip = label, danger = false, morph = false, onClick, className = '' }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = ['icon-btn', 'icon-btn--flex', danger && 'icon-btn--danger', className].filter(Boolean).join(' ');
  button.setAttribute('aria-label', label);

  const action = svgIcon(icon);
  button.append(action);
  if (morph) {
    action.setAttribute('class', 'icon-action');
    const check = svgIcon('check');
    check.setAttribute('class', 'icon-check');
    button.append(check);
  }

  // A morphing button manages its own tooltip (it flashes "Copied!"): a click must not hide it.
  initButtonTooltip(button, tip, { hideOnClick: !morph });
  if (onClick) button.addEventListener('click', () => onClick(button));
  return button;
}
