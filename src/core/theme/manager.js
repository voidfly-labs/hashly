let _STORAGE_KEY;

export const Theme = {
  init(APP_CONFIG) {
    _STORAGE_KEY = APP_CONFIG.appName + '-theme';
    const saved = localStorage.getItem(_STORAGE_KEY);
    const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', theme);

    document.getElementById('themeToggle').addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(_STORAGE_KEY, next);
    });
  },
};
