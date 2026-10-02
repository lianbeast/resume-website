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
})();