(() => {
  const meta = document.querySelector('meta[name="theme-storage-key"]');
  const KEY = meta?.content || 'hashly-theme';
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');

  // Storage can throw (blocked site data, sandboxed iframe) — treat as "no saved theme".
  const readSaved = () => {
    try {
      const v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch {
      return null;
    }
  };

  const systemTheme = () => {
    if (mq) return mq.matches ? 'dark' : 'light';
    // No matchMedia: fall back to time of day.
    const h = new Date().getHours();
    return h >= 6 && h < 21 ? 'light' : 'dark';
  };

  const apply = () => {
    document.documentElement.dataset.theme = readSaved() ?? systemTheme();
  };

  apply();
  // Live-sync with the OS; apply() defers to a saved preference if one exists.
  mq?.addEventListener('change', apply);
})();
