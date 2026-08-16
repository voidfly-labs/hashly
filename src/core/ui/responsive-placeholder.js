// The project's main mobile breakpoint (see the `max-width: 630px` rules in styles/).
const MOBILE_QUERY = '(max-width: 630px)';

/** Swaps an input's placeholder for the text in its `data-placeholder-mobile`
 *  attribute while the viewport is at or below the mobile breakpoint, and puts
 *  the original back above it. A placeholder can't be switched from CSS, and the
 *  full text often doesn't fit on a narrow screen. */
export function initResponsivePlaceholder(input) {
  const mobileText = input?.dataset.placeholderMobile;
  if (!mobileText) return;

  const desktopText = input.placeholder;
  const query = window.matchMedia(MOBILE_QUERY);
  const apply = () => {
    input.placeholder = query.matches ? mobileText : desktopText;
  };
  query.addEventListener('change', apply);
  apply();
}
