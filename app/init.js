/**
 * App Initialization Module
 * Wires together all application modules in the correct dependency order
 */

(function() {
  'use strict';

  // Module initialization order matters due to dependencies:
  // 1. motion.js - sets up visualization-motion-change event (no deps)
  // 2. threejs/map.js - sets up Three.js scene, exposes window.camera (needs motion)
  // 3. threejs/pins.js - builds pins on top of map scene (needs map)
  // 4. skill-wheel.js - separate Three.js canvas (needs motion)
  // 5. form.js - contact form validation (no deps)
  // 6. animations.js - GSAP scroll animations (needs window.camera from map)

  // The modules self-initialize on DOMContentLoaded via their own listeners
  // This file ensures load order by being loaded first

  console.log('Career Site: Modules loading...');

  // Track initialization for debugging
  const initStatus = {
    motion: false,
    map: false,
    pins: false,
    skillWheel: false,
    form: false,
    animations: false,
  };

  // Listen for module ready events (if modules emit them)
  document.addEventListener('DOMContentLoaded', () => {
    console.log('Career Site: DOM ready, modules initializing...');
  });
})();