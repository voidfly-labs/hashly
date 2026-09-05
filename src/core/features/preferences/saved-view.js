import { Preferences } from './preferences.js';

/** Remembers a radio group's choice: puts the saved one back now (if it is still an
 *  option), and saves each change the visitor makes. Programmatic changes (a
 *  permalink setting the radios) fire no `change` event, so they aren't saved. */
export function rememberRadioGroup(name, prefName) {
  const radios = [...document.querySelectorAll(`input[name="${name}"]`)];
  const saved = Preferences.get(prefName);
  const match = radios.find((radio) => radio.value === saved);
  if (match) match.checked = true;
  radios.forEach((radio) => radio.addEventListener('change', () => Preferences.set(prefName, radio.value)));
}

/** The algorithms a section starts with hidden. The saved list is the complete set, so it can also
 *  show algorithms that start hidden by default (`defaultHiddenAlgos`) when the visitor had turned
 *  them on; with nothing saved it is `defaults`. Known before the rows are built, so they start in
 *  their final state instead of animating into it. */
export function initialHiddenAlgos(prefName, defaults, algorithms) {
  const saved = Preferences.get(prefName);
  if (!Array.isArray(saved)) return new Set(defaults);
  return new Set(algorithms.map(({ id }) => id).filter((id) => saved.includes(id)));
}

export function saveHiddenAlgos(section, prefName) {
  Preferences.set(prefName, [...section.hiddenAlgos]);
}

/** The ids of the sections the visitor collapsed (none when nothing is saved). Only collapsed ones
 *  are kept, so a section added later starts open for everyone. */
export function savedCollapsedSections(prefName) {
  const saved = Preferences.get(prefName);
  return new Set(Array.isArray(saved) ? saved : []);
}

export function saveCollapsedSections(prefName, ids) {
  Preferences.set(prefName, [...ids]);
}
