import { Storage } from '~core/services/storage.js';

export const Theme = {
  init() {
    const meta = document.querySelector('meta[name="theme-storage-key"]');
    const key = meta ? meta.getAttribute('content') : 'hashly-theme';

    const toggle = document.getElementById('themeToggle');
    const syncPressed = () =>
      toggle.setAttribute('aria-pressed', String(document.documentElement.dataset.theme === 'dark'));
    syncPressed();
    // Covers the click below and the OS-driven change handled in theme/init.js.
    new MutationObserver(syncPressed).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    toggle.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      Storage.write(key, next);
    });
  },
};
