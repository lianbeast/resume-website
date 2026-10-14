/**
 * Smooth Scroll — Lenis
 *
 * Adds inertial wheel scrolling to the desktop experience. Lenis animates the
 * real document scroll position (it does not transform a wrapper), so
 * `position: sticky` (the hero dock), `window.scrollY` consumers (nav.js
 * scrollspy, hero-pin.js) and ScrollTrigger all keep working unchanged.
 *
 * Progressive enhancement — every bail path leaves the page on native
 * scrolling, which is already correct:
 *   - prefers-reduced-motion  → motion is a stated user preference; respect it
 *   - Lite tier               → that tier is deliberately zero-JS / low-power
 *   - ≤768px viewports        → no wheel to smooth, and native touch momentum
 *                               beats anything a library can emulate
 *   - Lenis or GSAP missing   → offline / CDN blocked / parse error
 *
 * Lenis is vendored at assets/vendor/lenis.min.js (MIT, v1.3.26) rather than
 * pulled from a CDN, so the CSP keeps script-src 'self' and the page has no
 * third-party runtime dependency.
 *
 * Exposes `window.__lenis` so other modules (nav.js back-to-top) can route
 * programmatic scrolling through Lenis instead of fighting it.
 */
(function () {
  'use strict';

  var html = document.documentElement;
  var DESKTOP = '(min-width: 769px)';
  var REDUCED = '(prefers-reduced-motion: reduce)';
  var desktopQuery = window.matchMedia(DESKTOP);
  var reducedQuery = window.matchMedia(REDUCED);

  var lenis = null;
  var teardown = null;

  function shouldRun() {
    if (reducedQuery.matches) return false;
    if (!desktopQuery.matches) return false;
    // Set by assets/tier-switcher.js, which runs earlier in document order.
    if (html.dataset.tier === 'lite') return false;
    if (typeof window.Lenis === 'undefined') return false;
    return true;
  }

  function start() {
    if (lenis || !shouldRun()) return;

    lenis = new window.Lenis({
      // ~1s feels deliberate without dragging; matches the site's calm register.
      duration: 1.0,
      // Exponential ease-out — fast response, long settle. Lenis ships this
      // shape as its default; stated explicitly so it can be tuned in one place.
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      // Touch keeps native momentum — syncing it produces jank on iOS.
      syncTouch: false,
      // We drive the rAF loop ourselves so Lenis and GSAP share one ticker.
      autoRaf: false,
      // Anchor + focus management is handled below.
      anchors: false,
    });

    window.__lenis = lenis;
    html.classList.add('lenis-active');

    var rafId = null;

    if (window.gsap && window.ScrollTrigger) {
      // Single ticker: Lenis advances on GSAP's frame, and ScrollTrigger
      // re-reads position on every Lenis scroll. Without both halves the
      // scroll-linked reveals lag a frame behind the actual scroll.
      lenis.on('scroll', window.ScrollTrigger.update);
      var tick = function (time) { lenis.raf(time * 1000); }; // gsap ticker is seconds
      window.gsap.ticker.add(tick);
      window.gsap.ticker.lagSmoothing(0);
      teardown = function () { window.gsap.ticker.remove(tick); };
    } else {
      var loop = function (time) {
        rafId = requestAnimationFrame(loop);
        lenis.raf(time);
      };
      rafId = requestAnimationFrame(loop);
      teardown = function () { if (rafId) cancelAnimationFrame(rafId); };
    }

    document.addEventListener('click', onAnchorClick);
  }

  function stop() {
    if (!lenis) return;
    document.removeEventListener('click', onAnchorClick);
    if (teardown) teardown();
    lenis.destroy();
    lenis = null;
    teardown = null;
    delete window.__lenis;
    html.classList.remove('lenis-active');
  }

  /**
   * Route in-page anchors through Lenis so they glide instead of jumping.
   *
   * Two deliberate exceptions:
   *  - Keyboard-initiated activation (`event.detail === 0`) falls through to the
   *    browser. Keyboard actions repeat constantly and must stay instant; they
   *    also need the native hash change to move focus for the skip link.
   *  - The skip link always falls through for the same focus reason.
   */
  function onAnchorClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.detail === 0) return; // keyboard-initiated — never animate these

    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.classList.contains('skip-link')) return;

    var href = link.getAttribute('href');
    if (!href || href === '#') return;

    var target;
    try {
      target = document.querySelector(href);
    } catch (error) {
      return; // malformed selector — let the browser try
    }
    if (!target) return;

    event.preventDefault();
    // No `offset` on purpose. Lenis already honours the same
    // `scroll-margin-top` (on the target) and `scroll-padding-top` (on <html>)
    // the browser uses for native anchor scrolling, so passing one here would
    // stack a third time and land the heading too far down. Landing parity with
    // native is the contract: turning Lenis off must not move any anchor.
    lenis.scrollTo(target);
    // Native anchor clicks push a history entry; keep that so Back still works.
    if (window.history && history.pushState) history.pushState(null, '', href);
  }

  // Crossing the mobile breakpoint invalidates the whole premise (there is no
  // wheel), so tear down rather than leave an idle rAF loop running.
  function sync() {
    if (shouldRun()) start();
    else stop();
  }

  reducedQuery.addEventListener('change', sync);
  desktopQuery.addEventListener('change', sync);

  // Deferred scripts execute in document order, so assets/tier-switcher.js has
  // already written data-tier by the time this runs.
  sync();
})();
