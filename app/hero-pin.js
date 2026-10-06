/**
 * Hero title pin — as the visitor scrolls through the hero, the name + title
 * block shrinks and docks just under the nav instead of scrolling away, while
 * the tagline and buttons recede so the two never collide.
 *
 * Transform-and-opacity only: the shrunk title never reflows the hero, so there
 * is no layout thrash on scroll. The sticky positioning lives in CSS behind
 * `.is-pinned`, which this module adds — so no-JS and reduced-motion visitors
 * get plain static layout and never see a floating title.
 *
 * Writes two custom properties on #hero, which CSS reads:
 *   --pin   0 → 1  drives the shrink and the glass pane behind the title
 *   --fade  0 → 1  drives the hero tail (tagline + buttons) receding
 * --fade is deliberately steeper than --pin so the space clears before the
 * title finishes docking.
 *
 * Accessibility:
 *   - Bails entirely under prefers-reduced-motion, and re-checks on change.
 *   - Once the tail is fully faded it is invisible, so it is dropped from the
 *     tab order (.is-hidden → visibility:hidden). Keyboard users can no longer
 *     land on a button they cannot see; the hero CTAs are duplicated in the nav
 *     and footer, so nothing becomes unreachable.
 *   - The title never shrinks below a legible size (see MIN_READABLE_PX).
 *   - print styles in shared.css undo the pin so paper never gets a floating,
 *     half-size title.
 */
(function () {
  'use strict';

  const hero = document.getElementById('hero');
  const head = hero && hero.querySelector('.hero-head');
  if (!hero || !head) return;

  const tail = hero.querySelector('.hero-tail');
  const titleEl = head.querySelector('.hero-title') || head;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  const ABS_MIN_SCALE = 0.55;
  const MIN_READABLE_PX = 12;
  const HIDE_TAIL_AT = 0.98;
  const FADE_WINDOW = 200; // px before the dock at which the tail starts receding

  let minScale = ABS_MIN_SCALE;
  let travel = 1;
  let dockPx = 74;
  let ticking = false;

  function measure() {
    // Never shrink the title below a legible size. On a 390px phone .hero-title
    // renders at 18px, so a flat 0.55 would leave it at ~10px — too small.
    // Reading the live font-size keeps the floor at MIN_READABLE_PX everywhere.
    const px = parseFloat(getComputedStyle(titleEl).fontSize) || 16;
    minScale = Math.max(ABS_MIN_SCALE, Math.min(1, MIN_READABLE_PX / px));

    // Distance the title travels before reaching its docked position, measured
    // from its own layout position rather than from the hero's height. The
    // heroes are wildly different sizes (index is exactly one viewport, the
    // immersive and bold ones run to ~1600-1800px), so a height-proportional
    // progress made the shrink drag on for nearly two viewports there. This
    // way the shrink always completes exactly as the title docks.
    head.classList.add('is-pinned'); // so the docked `top` resolves
    dockPx = parseFloat(getComputedStyle(head).top) || 74;
    const heroDocTop = hero.getBoundingClientRect().top + window.scrollY;
    travel = Math.max(heroDocTop + head.offsetTop - dockPx, 1);
  }

  function reset() {
    head.classList.remove('is-pinned');
    head.style.removeProperty('transform');
    hero.style.removeProperty('--pin');
    hero.style.removeProperty('--fade');
    if (tail) tail.classList.remove('is-hidden');
  }

  function update() {
    ticking = false;

    if (reduced.matches) { reset(); return; }
    head.classList.add('is-pinned');

    const raw = window.scrollY / travel;
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;

    const eased = 1 - Math.pow(1 - p, 2); // ease-out, so it settles gently
    const scale = 1 - (1 - minScale) * eased;

    // Fade the tail by how close the title is to its dock, not by scroll
    // progress. Progress is proportional to how far the title travels, and that
    // differs a lot between pages — tying the fade to it made the tagline
    // vanish while the title was still halfway down the viewport on the taller
    // immersive and bold heroes.
    const remaining = head.getBoundingClientRect().top - dockPx;
    const fade = remaining <= 0 ? 1 : Math.max(0, 1 - remaining / FADE_WINDOW);

    hero.style.setProperty('--pin', p.toFixed(3));
    hero.style.setProperty('--fade', fade.toFixed(3));
    head.style.transform = `scale(${scale.toFixed(4)})`;
    if (tail) tail.classList.toggle('is-hidden', fade >= HIDE_TAIL_AT);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  function onResize() {
    measure();
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  reduced.addEventListener('change', () => { measure(); update(); });

  // Webfonts are injected asynchronously by theme.js, and a swap changes both the
  // title's rendered size and its layout position. Re-measure once they land, or
  // `travel` and the readable-size floor are computed against fallback metrics.
  // This also keeps things correct if the brand font is changed later.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measure(); update(); });
  }

  // The hero is 100vh and its type is fluid, so both the span and the
  // readable-size floor are re-measured after a viewport resize.
  measure();
  update();
})();
