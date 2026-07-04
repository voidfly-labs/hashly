// `?no-inline` keeps the sprite a real file: <use> can't target a data: URI.
import spriteUrl from '~assets/images/icons.svg?no-inline';

/** href for an icon in the shared sprite, for markup built in JS. Unlike the
 *  .html templates, Vite doesn't rewrite hard-coded `/src/...` paths inside JS
 *  strings, so they'd 404 in production builds. */
export function iconHref(name) {
  return `${spriteUrl}#icon-${name}`;
}
