/**
 * Career Site — Early Initialization
 * Handles desktop-only GSAP loading and Three.js bail logic.
 * Runs before DOMContentLoaded to prevent CLS from bail states.
 */

(function() {
  'use strict';

  // Early Three.js bail for resume-preview (runs before map.js loads)
  // The bail class is added to #scene-container so CSS shows the
  // career-locations fallback immediately, avoiding CLS.
  function bailThreeJS() {
    const container = document.getElementById('scene-container');
    if (!container) return;
    if (typeof THREE === 'undefined') {
      container.classList.add('is-bailed');
      return;
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      container.classList.add('is-bailed');
    }
  }

  // Desktop-only GSAP + ScrollTrigger loader
  // GSAP eval is ~400ms main-thread task; gate to desktop + non-reduced-motion.
  function loadGSAP() {
    const isDesktop = !window.matchMedia('(max-width: 768px)').matches;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isDesktop && !prefersReducedMotion) {
      const gsapScript = document.createElement('script');
      gsapScript.defer = true;
      gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
      gsapScript.integrity = 'sha384-g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt';
      gsapScript.crossOrigin = 'anonymous';
      document.head.appendChild(gsapScript);

      const stScript = document.createElement('script');
      stScript.defer = true;
      stScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';
      stScript.integrity = 'sha384-Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d';
      stScript.crossOrigin = 'anonymous';
      document.head.appendChild(stScript);
    }
  }

  // Run immediately if DOM is still loading (before map.js fires)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bailThreeJS);
  } else {
    bailThreeJS();
  }

  // GSAP load can run anytime before animations.js needs it
  loadGSAP();

  // CSS-based reveal animations via IntersectionObserver
  // These complement GSAP reveals and work for no-JS / reduced-motion users
  // who get the CSS animation fallbacks defined in assets/index.css
  function initRevealAnimations() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // Skip elements that GSAP will handle (they have inline styles from GSAP)
          if (el.style.opacity === '0' || el.style.transform) return;
          // Add revealed class to trigger CSS animations
          if (el.classList.contains('stat-card')) {
            el.classList.add('revealed');
          }
          // Trigger section label underline animation
          if (el.classList.contains('section-label')) {
            el.classList.add('has-underline');
          }
          observer.unobserve(el);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Observe elements that should animate on scroll.
    // Only add revealed class to stat-cards (timeline/skills get .reveal
    // class that GSAP handles); section-label triggers its ::after underline
    // via .has-underline. This prevents double-animation.
    document.querySelectorAll('.stat-card').forEach(el => {
      observer.observe(el);
    });
    document.querySelectorAll('.section-label').forEach(el => {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRevealAnimations);
  } else {
    initRevealAnimations();
  }
})();