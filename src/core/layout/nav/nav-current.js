const normalize = (path) => path.replace(/(\.html|\/)$/, '') || '/';

/** Marks the nav links that point at the page being read (aria-current + --active), as NavSpy does
 *  for a page's sections: for the pages that have none, like the legal ones. */
export function initNavCurrent() {
  const here = normalize(window.location.pathname);
  document.querySelectorAll('a.header__nav-link').forEach((link) => {
    const current = normalize(new URL(link.href, window.location.href).pathname) === here;
    link.classList.toggle('header__nav-link--active', current);
    if (current) link.setAttribute('aria-current', 'page');
  });
}
