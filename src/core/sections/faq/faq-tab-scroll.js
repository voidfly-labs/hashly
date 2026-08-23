import { iconHref } from '~core/lib/icon.js';

// How far a chevron click scrolls the strip, as a share of its visible width: far enough to
// uncover new tabs, short enough that the last one in view stays in view as an anchor.
const PAGE_SHARE = 0.7;

// What one wheel "line" is worth in pixels: Firefox reports a notch of a mouse wheel as ~3 lines, not pixels.
const LINE_PX = 16;
const PAGE_PX = 400;

// How long after the strip last scrolled the wheel stays with it. A flick that carries on past the
// end of the strip is swallowed rather than handed to the page, which would suddenly scroll.
const HOLD_MS = 300;

/** Makes a scrolling tab strip show that it scrolls. `wrap` is the strip's container and
 *  `tablist` the strip itself. `wrap` gets `data-can-left` / `data-can-right` while there is more
 *  to scroll to in that direction, which fade the edge and show a chevron button (see
 *  faq-tab-scroll.css). The wheel scrolls the strip sideways while it is over it and has room to go
 *  that way, and otherwise (once a flick has died down, see HOLD_MS) scrolls the page as usual. */
export function initTabScroll(wrap, tablist) {
  const button = (dir) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `info__tabs-btn info__tabs-btn--${dir}`;
    btn.tabIndex = -1; // the arrow keys already move through the tabs
    btn.setAttribute('aria-hidden', 'true');
    btn.innerHTML = `<svg viewBox="0 0 24 24"><use href="${iconHref('chevron-right')}"></use></svg>`;
    btn.addEventListener('click', () => {
      const sign = dir === 'next' ? 1 : -1;
      tablist.scrollBy({ left: sign * tablist.clientWidth * PAGE_SHARE, behavior: 'smooth' });
    });
    return btn;
  };
  wrap.append(button('prev'), button('next'));

  const canScroll = (sign) => {
    const { scrollLeft, scrollWidth, clientWidth } = tablist;
    return sign < 0 ? scrollLeft > 1 : scrollLeft + clientWidth < scrollWidth - 1;
  };

  const update = () => {
    wrap.toggleAttribute('data-can-left', canScroll(-1));
    wrap.toggleAttribute('data-can-right', canScroll(1));
  };
  tablist.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', update, { passive: true });
  } else {
    new ResizeObserver(update).observe(tablist);
  }
  update();

  let heldUntil = 0;
  wrap.addEventListener(
    'wheel',
    (e) => {
      // A trackpad's sideways swipe already scrolls the strip; only a vertical wheel is turned.
      if (e.deltaX || !e.deltaY || e.ctrlKey) return;
      const room = canScroll(Math.sign(e.deltaY));
      if (!room && e.timeStamp > heldUntil) return;
      e.preventDefault();
      if (!room) return;
      heldUntil = e.timeStamp + HOLD_MS;
      const unit = [1, LINE_PX, PAGE_PX][e.deltaMode] ?? 1;
      tablist.scrollLeft += e.deltaY * unit;
    },
    { passive: false },
  );
}
