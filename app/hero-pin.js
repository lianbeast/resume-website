/**
 * Hero title pin — as the visitor scrolls through the hero, the name + title
 * block shrinks and docks just under the nav instead of scrolling away, while
 * the tagline and buttons recede so the two never collide.
 *
 * Deliberately transform-and-opacity only: the shrunk title never reflows the
 * hero, so there is no layout thrash on scroll. The sticky positioning itself
 * lives in CSS behind `.is-pinned`, which this module adds — so no-JS and
 * reduced-motion visitors get plain static layout and never see a floating
 * title.
 *
 * Writes two custom properties on #hero, which CSS reads:
 *   --pin   0 → 1  drives the shrink and the glass chip behind the title
 *   --fade  0 → 1  drives the hero tail (tagline + buttons) receding
 * --fade is deliberately steeper than --pin so the space is clear before the
 * title finishes docking.
 */
(function () {
  'use strict';

  const hero = document.getElementById('hero');
  const head = hero && hero.querySelector('.hero-head');
  if (!hero || !head) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MIN_SCALE = 0.55; // name 72px → ~40px, title 24px → ~13px: still legible

  let ticking = false;

  function reset() {
    head.classList.remove('is-pinned');
    hero.style.removeProperty('--pin');
    hero.style.removeProperty('--fade');
    head.style.removeProperty('transform');
  }

  function update() {
    ticking = false;

    if (reduced.matches) { reset(); return; }
    head.classList.add('is-pinned');

    // Progress across the hero's own scroll span: 0 while the title is centred,
    // 1 once the hero has been scrolled past. The 0.35 factor stops the shrink
    // finishing before the title has actually reached its docked position.
    const span = Math.max(hero.offsetHeight - window.innerHeight * 0.35, 1);
    const raw = window.scrollY / span;
    const p = raw < 0 ? 0 : raw > 1 ? 1 : raw;

    const eased = 1 - Math.pow(1 - p, 2); // ease-out, so it settles gently
    const scale = 1 - (1 - MIN_SCALE) * eased;
    const fade = Math.min(p * 1.8, 1);

    hero.style.setProperty('--pin', p.toFixed(3));
    hero.style.setProperty('--fade', fade.toFixed(3));
    head.style.transform = `scale(${scale.toFixed(4)})`;
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  reduced.addEventListener('change', update);

  // The hero is 100vh, so its height must be re-read after a viewport resize —
  // hence update() rather than a cached span.
  update();
})();
