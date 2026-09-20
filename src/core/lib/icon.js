// `?no-inline` keeps the sprite a real file: <use> can't target a data: URI.
import spriteUrl from '~assets/images/icons.svg?no-inline';

/** href for an icon in the shared sprite, for markup built in JS. Unlike the
 *  .html templates, Vite doesn't rewrite hard-coded `/src/...` paths inside JS
 *  strings, so they'd 404 in production builds. */
export function iconHref(name) {
  return `${spriteUrl}#icon-${name}`;
}

/** An icon of the shared sprite as an `<svg>` element, for markup built with the DOM (the `<svg><use>` pair
 *  that the .html templates write out). It is `aria-hidden`: whatever holds it is named another way. */
export function svgIcon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', iconHref(name));
  svg.appendChild(use);
  return svg;
}
