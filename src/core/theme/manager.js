export const Theme = {
  init() {
    const meta = document.querySelector('meta[name="theme-storage-key"]');
    const key = meta ? meta.getAttribute('content') : 'hashly-theme';

    document.getElementById('themeToggle').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem(key, next);
    });
  },
};
