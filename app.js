/**
 * Career Site — Main Entry Point
 * This file loads all application modules in dependency order.
 * Modules are IIFEs that self-initialize on DOMContentLoaded.
 */

// Module load order (via script tags in index.html):
// 1. app/motion.js          - Visualization motion controls (no deps)
// 2. app/threejs/map.js     - Three.js scene setup (needs motion)
// 3. app/threejs/pins.js    - Career pins on map (needs map)
// 4. app/skill-wheel.js     - 3D skill wheel (needs motion)
// 5. app/form.js            - Contact form (no deps)
// 6. app/animations.js      - GSAP scroll animations (needs window.camera from map)

// This file exists primarily to document the module architecture
// and can be removed once all modules are loaded directly from HTML.

console.log('Career Site: Core module loaded. Submodules initialize independently.');