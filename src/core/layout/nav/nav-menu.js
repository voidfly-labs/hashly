export const NavMenu = {
  init() {
    const toggle = document.getElementById('navToggle');
    const header = toggle?.closest('.header');
    const nav = document.getElementById('navMenu');
    if (!toggle || !header || !nav) return;

    toggle.addEventListener('click', () => {
      const isOpen = header.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      nav.setAttribute('aria-hidden', String(!isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    const close = () => {
      header.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    };

    nav.querySelectorAll('.header__nav-link').forEach((link) => {
      link.addEventListener('click', close);
    });

    document.addEventListener('click', (e) => {
      if (header.classList.contains('is-open') && !header.contains(e.target)) {
        close();
      }
    });
  },
};
