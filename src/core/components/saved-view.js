import { Preferences } from '~core/services/preferences.js';

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

/** Puts a section's hidden algorithms back as the visitor left them (`section` is a Text/File
 *  section). The saved list is the complete set, so it can also show algorithms that start
 *  hidden by default (`defaultHiddenAlgos`) when the visitor had turned them on. */
export function restoreHiddenAlgos(section, prefName, algorithms) {
  const saved = Preferences.get(prefName);
  if (!Array.isArray(saved)) return;
  Preferences.silently(() => {
    algorithms
      .filter(({ id }) => section.hiddenAlgos.has(id) !== saved.includes(id))
      .forEach(({ id }) => section._toggleAlgo(id, { resetSpotlight: false }));
  });
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
