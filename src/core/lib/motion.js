/** Whether the visitor asked for less motion (the system's reduced-motion setting). */
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The `behavior` for a scroll the page starts itself (`scrollIntoView`, `scrollBy`): smooth, unless the
 *  visitor asked for less motion. A `behavior` named in a call overrides the CSS `scroll-behavior`, which
 *  does honour that setting (see reset.css). */
export const scrollBehavior = () => (prefersReducedMotion() ? 'auto' : 'smooth');
