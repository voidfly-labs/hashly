(function () {
  var meta = document.querySelector('meta[name="theme-storage-key"]');
  var STORAGE_KEY = meta ? meta.getAttribute('content') : 'hashly-theme';
  var saved = localStorage.getItem(STORAGE_KEY);
  var theme;
  if (saved) {
    theme = saved;
  } else if (window.matchMedia) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    var h = new Date().getHours();
    theme = h >= 6 && h < 21 ? 'light' : 'dark';
  }
  document.documentElement.dataset.theme = theme;
  // Live-sync with OS when no manual preference is stored.
  if (!saved && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!localStorage.getItem(STORAGE_KEY)) {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
      }
    });
  }
})();
