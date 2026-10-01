/**
 * GSAP Animations Module
 * Handles scroll-triggered reveals, counter animations, and parallax effects
 * Respects prefers-reduced-motion and mobile viewport constraints
 */

(function() {
  'use strict';

  if (typeof gsap === 'undefined') {
    return;
  }

  // Respect reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Mobile: GSAP eval costs a 400ms main-thread task (worst FID contributor).
  // Reveals already render visible in CSS; skip scroll-triggered animation there.
  const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;

  if (prefersReducedMotion || isMobileViewport) {
    document.querySelectorAll('.reveal, .hero-label, .hero-name, .hero-title, .hero-tagline, .hero-cta, .stat-card, .timeline-item, .skill-category, .section-label').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    // Show stat counters immediately (no animation) so reduced-motion users
    // don't see a stuck "0".
    document.querySelectorAll('.stat-num').forEach(el => {
      const target = parseInt(el.dataset.target);
      if (!isNaN(target)) el.textContent = target + (target > 1 ? '+' : '');
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Zero counter text so the count-up tween starts from 0 for JS users.
  // (The HTML ships the real values, so no-JS visitors never see 0.)
  document.querySelectorAll('.stat-num').forEach(el => { el.textContent = '0'; });

  // ---- Hero entrance ----
  const heroTl = gsap.timeline({ delay: 0.3 });

  heroTl
    .from('.hero-name', { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' })
    .from('.hero-title', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.4')
    .from('.hero-tagline', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.3')
    .from('.hero-cta', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.3');

  // ---- Scroll reveals ----
  // One tween per element only — earlier duplicate from() tweens on the
  // same elements (`.timeline-item`/`.skill-category` aggregates) fought
  // over opacity via immediateRender and left cards stuck invisible.
  // immediateRender:false keeps content fully visible until its trigger
  // actually fires, so a misfiring trigger can never hide content.
  const revealEls = gsap.utils.toArray('.reveal');
  const staggeredSelectors = ['.timeline-item', '.skill-category'];

  revealEls.forEach(el => {
    let delay = 0;
    for (const sel of staggeredSelectors) {
      if (el.matches(sel)) {
        delay = Array.from(document.querySelectorAll(sel)).indexOf(el) * 0.05;
        break;
      }
    }
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.6,
        ease: 'power2.out',
        delay,
        immediateRender: false,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
      }
    );
  });

  // ---- Section labels underline ----
  gsap.utils.toArray('.section-label').forEach(el => {
    gsap.fromTo(el,
      { '--underline-w': '0px' },
      {
        '--underline-w': '60px',
        duration: 0.8,
        delay: 0.3,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      }
    );
  });

  // ---- Stats counter ----
  gsap.utils.toArray('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 80%' },
      onUpdate: () => {
        el.textContent = Math.round(obj.val) + (target > 1 ? '+' : '');
      }
    });
  });

  // ---- Scroll parallax for Three.js camera ----
  ScrollTrigger.create({
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      if (window.camera) {
        window.camera.position.y = self.progress * -5;
      }
    }
  });

  // ---- Refresh on load ----
  ScrollTrigger.refresh();
  // Re-measure trigger positions once webfonts finish loading — the
  // async font swap shifts section positions and can desync the reveals.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();