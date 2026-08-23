import { Format } from '~core/lib/format.js';
import { iconHref } from '~core/lib/icon.js';
import { copyWithFeedback } from '~core/ui/button/copy-feedback.js';
import { initButtonTooltip } from '~core/ui/tooltip/button-tooltip.js';

const FLASH_CLASS = 'info__question--flash';

/** Gives each question (an `h3`) of the FAQ a "copy link" button. The link is `#<tab>/<question>`,
 *  where the question is the slug of its heading, made unique within its panel. The slug is kept on
 *  the heading as `data-slug` and not as an `id`: the browser would then scroll to it by itself,
 *  which `FaqSection._openFromHash` does on its own terms. The link carries no query string, so it
 *  never takes along the text or formats of the page it was copied from.
 *
 *  `tabs` and `panels` are the FAQ's tabs and their panels, in the same order. */
export function initQuestionLinks({ tabs, panels }) {
  panels.forEach((panel, i) => {
    const taken = new Set();
    for (const heading of panel.querySelectorAll('h3')) {
      const base = Format.slug(heading.textContent) || 'question';
      let slug = base;
      let n = 1;
      while (taken.has(slug)) slug = `${base}-${++n}`;
      taken.add(slug);
      heading.dataset.slug = slug;
      heading.append(createLinkButton(`${tabs[i].dataset.tab}/${slug}`));
    }
  });
}

/** The question of `panel` whose slug is `slug`, if there is one. */
export function findQuestion(panel, slug) {
  return [...panel.querySelectorAll('h3')].find((heading) => heading.dataset.slug === slug);
}

/** Briefly highlights `heading`, a question a permalink has just scrolled to (see faq-links.css). */
export function flashQuestion(heading) {
  heading.classList.remove(FLASH_CLASS);
  // eslint-disable-next-line sonarjs/void-use
  void heading.offsetWidth; // so a link to the same question again restarts the animation
  heading.classList.add(FLASH_CLASS);
  heading.addEventListener('animationend', () => heading.classList.remove(FLASH_CLASS), { once: true });
}

function createLinkButton(hash) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'info__link';
  btn.setAttribute('aria-label', 'Copy link to this question');
  btn.innerHTML = `
    <svg class="icon-action" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('link')}"></use></svg>
    <svg class="icon-check" viewBox="0 0 24 24" aria-hidden="true"><use href="${iconHref('check')}"></use></svg>`;
  initButtonTooltip(btn, 'Copy link', { hideOnClick: false });
  btn.addEventListener('click', () => {
    const { origin, pathname } = window.location;
    copyWithFeedback(`${origin}${pathname}#${hash}`, { button: btn });
  });
  return btn;
}
