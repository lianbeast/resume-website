/**
 * Glass Effects Module
 * Initializes LiquidGlass with optimized settings for performance
 * Only loads on non-touch devices with WebGL support and not reduced motion
 */

(function() {
  'use strict';

  // Check conditions: must be non-touch (width >= 768px), not reduced motion, and WebGL available
  if (window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof WebGLRenderingContext === 'undefined') {
    // Do not initialize LiquidGlass on mobile or when reduced motion is preferred
    return;
  }

  // Function to load LiquidGlass as an ES module and initialize it
  function initLiquidGlass() {
    // Dynamically import LiquidGlass as an ES module
    import('../assets/liquidglass.js').then(module => {
      const LiquidGlass = module.LiquidGlass;

      if (typeof LiquidGlass === 'undefined') {
        console.warn('Glass: LiquidGlass not found in imported module');
        return;
      }

      if (typeof gsap === 'undefined') {
        console.warn('Glass: GSAP not found');
        return;
      }

      var root = document.getElementById('main-content');
      if (!root) {
        console.warn('Glass: root element not found');
        return;
      }

      // LiquidGlass requires glass elements to be direct children of root.
      // Our .glass elements are nested in sections/grids, so filter to only
      // those that are direct children. The CSS .glass class (shared.css)
      // already provides excellent glassmorphism via backdrop-filter for all others.
      var allGlassEls = root ? Array.from(root.querySelectorAll('.glass')) : [];
      var glassEls = allGlassEls.filter(function(el) {
        return el.parentElement === root;
      });

      if (glassEls.length === 0) {
        // No direct-child glass elements - LiquidGlass not needed, CSS handles it
        return;
      }

      // Optimized settings for performance
      // These values are tuned to reduce GPU load while maintaining visual appeal
      var options = {
        // Reduced refraction for less distortion computation
        refraction: 0.3,          // default: 0.69
        // Reduced chromatic aberration for less color fringing computation
        chromAberration: 0.02,    // default: 0.05
        // Reduced edge highlight for less edge computation
        edgeHighlight: 0.02,      // default: 0.05
        // Keep specular at 0 (no specular highlights)
        specular: 0,              // default: 0
        // Reduced fresnel for less rim lighting computation
        fresnel: 0.5,             // default: 1
        // Keep distortion at 0 (no distortion)
        distortion: 0,            // default: 0
        // Keep default corner radius
        // Keep default zRadius (bevel depth)
        // Reduced opacity for less blending
        opacity: 0.8,             // default: 1
        // Keep default saturation
        saturation: 0,            // default: 0
        // Keep default tint strength
        tintStrength: 0,          // default: 0
        // Keep default brightness
        brightness: 0,            // default: 0
        // Reduced shadow opacity
        shadowOpacity: 0.2,       // default: 0.3
        // Reduced shadow spread
        shadowSpread: 5,          // default: 10
        // Reduced shadow offset Y
        shadowOffsetY: 0.5,       // default: 1
        // Keep default floating and button behavior
        // Keep default bevel mode
      };

      LiquidGlass.init({
        root: root,
        glassElements: glassEls,
        defaults: options
      });
    }).catch(function(err) {
      console.error('Failed to load LiquidGlass module:', err);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiquidGlass);
  } else {
    initLiquidGlass();
  }
})();