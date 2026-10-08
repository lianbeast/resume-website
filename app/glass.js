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

      // Tuned settings — richer glass without leaving the performance budget.
      // Values sit between the library defaults and the previous trimmed set:
      // enough refraction/edge/fresnel to read as real glass, little enough to
      // stay smooth on mid-range desktop GPUs.
      var options = {
        // Gentle refraction — distortion is visible but not warping
        refraction: 0.45,          // default: 0.69
        // Subtle chromatic aberration — color fringing at the edges only
        chromAberration: 0.035,    // default: 0.05
        // Edge highlight — rim light so panels lift off the page
        edgeHighlight: 0.04,       // default: 0.05
        // Keep specular at 0 (no specular highlights)
        specular: 0,              // default: 0
        // Fresnel rim lighting — stronger than before, still cheap
        fresnel: 0.7,             // default: 1
        // Keep distortion at 0 (no distortion)
        distortion: 0,            // default: 0
        // Slightly opaque — panels read as glass, not fog
        opacity: 0.85,            // default: 1
        // Keep default saturation
        saturation: 0,            // default: 0
        // Keep default tint strength
        tintStrength: 0,          // default: 0
        // Keep default brightness
        brightness: 0,            // default: 0
        // Shadow — deeper than before so glass casts a real shadow
        shadowOpacity: 0.25,      // default: 0.3
        shadowSpread: 8,          // default: 10
        shadowOffsetY: 0.8,       // default: 1
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