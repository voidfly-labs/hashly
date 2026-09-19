import { autoThreads } from '~core/features/hashing/workers/auto-threads.js';
import { chunkCeiling } from '~core/features/hashing/workers/chunk-ceiling.js';
import { History } from '~core/features/history/history.js';
import { initConfirmClear } from '~core/features/history/popover/confirm-clear.js';
import { createPopover } from '~core/ui/popover.js';
import { Tooltip } from '~core/ui/tooltip/tooltip.js';

import { clearSavedData, savedBytes } from './saved-data.js';
import { CHUNK_OPTIONS_MIB, HISTORY_LIMITS, MAX_FILES_OPTIONS, Settings, THREAD_OPTIONS } from './settings.js';

const MIB = 1024 * 1024;

const byId = (id) => document.getElementById(id);

// What sits under each row's label. Here and not in the markup: a hint in an EJS include's
// arguments would be broken over lines by the formatter, and its string with it.
const HINTS = {
  settingsHistoryEnabled: 'Keeps a local record of computed hashes.',
  settingsHistoryLimit: 'Entries kept per history type (text and file each).',
  settingsHistoryFilenames: 'Keeps a filename alongside each hash.',
  settingsHistoryPreviews: 'Keeps a text preview alongside each hash.',
  settingsRememberView: 'Formats, hidden algorithms, collapsed sections and more.',
  settingsMaxThreads: 'Parallel hashing. Helps with multiple algorithms enabled.',
  settingsMaxChunk:
    'Largest part of a file read at a time. Bigger is faster but uses more memory (threads × 2 × size).',
  settingsMaxFiles: 'Files accepted from one drop.',
};

const fillSelect = (select, options) => {
  select.replaceChildren(...options.map(([value, label]) => new Option(label, String(value))));
};

const count = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

// A non-breaking space keeps the number with its unit when the line wraps.
const sizeLabel = (bytes) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))}\u00A0KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}\u00A0MB`;

/** The settings popover (see settings-popover.html), opened by `trigger`: what each control shows
 *  comes from `Settings`, and a change is saved as it is made. `appConfig.appName` and `themeKey` say
 *  what "Clear all data" removes. Returns the popover's controller, or null when the page has none. */
export function createSettingsPopover({ trigger, appConfig, themeKey, onRememberViewChange }) {
  const el = byId('settingsPopover');
  if (!trigger || !el) return null;

  const toggles = {
    historyEnabled: byId('settingsHistoryEnabled'),
    historyFilenames: byId('settingsHistoryFilenames'),
    historyPreviews: byId('settingsHistoryPreviews'),
    rememberView: byId('settingsRememberView'),
  };
  const threads = byId('settingsMaxThreads');
  const chunk = byId('settingsMaxChunk');
  const files = byId('settingsMaxFiles');
  const limit = byId('settingsHistoryLimit');
  const trim = byId('settingsTrim');
  const trimText = byId('settingsTrimText');
  const usage = byId('settingsUsage');

  for (const [id, text] of Object.entries(HINTS)) byId(`${id}Hint`).textContent = text;
  fillSelect(threads, [[0, `Auto (${autoThreads()}x)`], ...THREAD_OPTIONS.map((n) => [n, String(n)])]);
  fillSelect(chunk, [[0, `Auto (${chunkCeiling(0) / MIB} MiB)`], ...CHUNK_OPTIONS_MIB.map((n) => [n, `${n} MiB`])]);
  fillSelect(
    files,
    MAX_FILES_OPTIONS.map((n) => [n, String(n)]),
  );
  fillSelect(
    limit,
    HISTORY_LIMITS.map((n) => [n, n.toLocaleString('en-US')]),
  );

  const dim = (input, disabled) => {
    input.disabled = disabled;
    const row = input.closest('.toggle, .setting');
    row.classList.toggle(row.classList.contains('toggle') ? 'toggle--disabled' : 'setting--disabled', disabled);
  };

  function showUsage() {
    const entries = History.entries('text').length + History.entries('file').length;
    const size = sizeLabel(savedBytes(appConfig.appName, themeKey));
    usage.textContent = `Saved in this browser: ${count(entries, 'history entry', 'history entries')} · ${size}`;
  }

  /** Brings every control in line with the saved settings. */
  function sync() {
    for (const [name, input] of Object.entries(toggles)) input.checked = Settings.get(name);
    threads.value = String(Settings.get('maxThreads'));
    chunk.value = String(Settings.get('maxChunkMiB'));
    files.value = String(Settings.get('maxFiles'));
    limit.value = String(Settings.get('historyLimit'));
    const saving = Settings.get('historyEnabled');
    dim(limit, !saving);
    dim(toggles.historyFilenames, !saving);
    dim(toggles.historyPreviews, !saving);
    trim.hidden = true;
    showUsage();
  }

  // Entries that a smaller size would drop, over both histories.
  const droppedBy = (size) =>
    ['text', 'file'].reduce((sum, ns) => sum + Math.max(0, History.entries(ns).length - size), 0);

  const closeTrim = () => {
    if (trim.hidden) return false;
    limit.value = String(Settings.get('historyLimit'));
    trim.hidden = true;
    return true;
  };

  for (const [name, input] of Object.entries(toggles)) {
    input.addEventListener('change', () => {
      Settings.set(name, input.checked);
      if (name === 'historyEnabled') sync();
      if (name === 'rememberView') onRememberViewChange(input.checked);
      showUsage();
    });
  }

  for (const [name, select] of [
    ['maxThreads', threads],
    ['maxChunkMiB', chunk],
    ['maxFiles', files],
  ]) {
    select.addEventListener('change', () => {
      Settings.set(name, Number(select.value));
    });
  }

  limit.addEventListener('change', () => {
    const size = Number(limit.value);
    const dropped = droppedBy(size);
    // Making room never loses anything, and nor does a size the histories still fit in.
    if (!dropped) {
      Settings.set('historyLimit', size);
      trim.hidden = true;
      return;
    }
    trimText.textContent = `Removes the ${count(dropped, 'oldest entry', 'oldest entries')}.`;
    trim.hidden = false;
  });

  byId('settingsTrimConfirm').addEventListener('click', () => {
    Settings.set('historyLimit', Number(limit.value));
    History.applyLimit();
    trim.hidden = true;
    showUsage();
  });
  byId('settingsTrimCancel').addEventListener('click', () => {
    closeTrim();
    limit.focus();
  });

  const clearBtn = byId('settingsClearAll');
  const disarm = initConfirmClear(
    clearBtn,
    () => clearSavedData(appConfig.appName, themeKey),
    'Press again to delete all saved data',
  );

  const popover = createPopover({
    trigger,
    el,
    visibleClass: 'help-popover--visible',
    onOpen: sync,
    onClose() {
      disarm();
      closeTrim();
    },
    // Escape backs out of an armed Clear, or a pending size change, before it closes the popover.
    onEscape: () => disarm() || closeTrim(),
  });

  trigger.addEventListener('mouseenter', () => Tooltip.show(trigger, 'Settings'));
  trigger.addEventListener('mouseleave', () => Tooltip.hide());

  // Another tab changed the settings while this one is open.
  Settings.onExternalChange(() => {
    if (popover.isOpen()) sync();
  });

  return popover;
}
