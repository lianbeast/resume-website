/**
 * Three.js Map Module
 * Sets up the Three.js scene, camera, renderer, and projection for the US career map
 * Reads brand colors from CSS custom properties for theme-aware rendering
 */

(function() {
  'use strict';

  // Configuration constants
  const MAP_CX = -98, MAP_CY = 39.5;
  const SCALE = 1.8;

  // Private state
  let scene = null;
  let mapGroup = null;
  let camera = null;
  let renderer = null;
  let container = null;
  let surfaceMesh = null;
  let pathSegments = null;
  let packetMat = null;

  // Helper functions
  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function hexToInt(hex) {
    return parseInt(hex.replace('#', ''), 16);
  }

  function project(lon, lat) {
    const x = (lon - MAP_CX) * SCALE * Math.cos(lat * Math.PI / 180);
    const y = (lat - MAP_CY) * SCALE;
    return [x, y];
  }

  function getBrandColors() {
    return {
      primary: hexToInt(cssVar('--gold', '#c2410c')),
      primaryLight: hexToInt(cssVar('--gold-light', '#e06a3a')),
      secondary: hexToInt(cssVar('--teal', '#0e7490')),
      ink: hexToInt(cssVar('--text', '#1c1917')),
    };
  }

  // Public API
  const ThreeJSMap = {
    init() {
      container = document.getElementById('scene-container');
      const bail = () => container && container.classList.add('is-bailed');

      if (!container) return false;
      if (typeof THREE === 'undefined') { bail(); return false; }

      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) { bail(); return false; }

      const BRAND = getBrandColors();
      const isMobile = window.innerWidth < 768;

      // Scene setup
      mapGroup = new THREE.Group();
      scene = new THREE.Scene();
      scene.add(mapGroup);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      window.camera = camera; // Expose for GSAP parallax
      camera.position.set(0, 0, isMobile ? 66 : 50);
      camera.lookAt(0, 0, 0);

      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (e) {
        bail();
        return false;
      }

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      function updateClearColor() {
        renderer.setClearColor(hexToInt(cssVar('--bg', '#f7f5f0')), 1);
      }
      updateClearColor();

      const themeObserver = new MutationObserver(() => {
        updateClearColor();
        ThreeJSMap.updateBrandColors();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      container.appendChild(renderer.domElement);

      // Successfully initialized — mark as enhanced so fallback hides immediately
      // (prevents CLS gap between is-bailed removal and is-enhanced addition)
      container.classList.add('is-enhanced');

      // Store references for other modules
      ThreeJSMap.scene = scene;
      ThreeJSMap.mapGroup = mapGroup;
      ThreeJSMap.camera = camera;
      ThreeJSMap.renderer = renderer;
      ThreeJSMap.container = container;
      ThreeJSMap.project = project;
      ThreeJSMap.BRAND = BRAND;

      return true;
    },

    updateBrandColors() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const cur = getBrandColors();
      const primaryC = new THREE.Color(cur.primary);
      const secondaryC = new THREE.Color(cur.secondary);

      if (isDark) {
        if (surfaceMesh) surfaceMesh.material.opacity = 0.02;
        if (mapGroup.children[1] && mapGroup.children[1].material) {
          mapGroup.children[1].material.opacity = 0.1;
        }
        if (pathSegments) pathSegments.material.opacity = 0.2;
        if (packetMat) packetMat.uniforms.uColor.value = new THREE.Color(cur.primary).multiplyScalar(0.7);
      } else {
        if (surfaceMesh) surfaceMesh.material.opacity = 0.05;
        if (mapGroup.children[1] && mapGroup.children[1].material) {
          mapGroup.children[1].material.opacity = 0.22;
        }
        if (pathSegments) pathSegments.material.opacity = 0.45;
        if (packetMat) packetMat.uniforms.uColor.value = new THREE.Color(cur.primary);
      }
    },

    setSurfaceMesh(mesh) { surfaceMesh = mesh; },
    setPathSegments(segments) { pathSegments = segments; },
    setPacketMat(mat) { packetMat = mat; },

    getScene() { return scene; },
    getMapGroup() { return mapGroup; },
    getCamera() { return camera; },
    getRenderer() { return renderer; },
    getContainer() { return container; },
    getProject() { return project; },
    getBRAND() { return getBrandColors(); },
  };

  // Self-initialize when DOM is ready
  let initialized = false;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initialized = ThreeJSMap.init();
      if (initialized) {
        window.ThreeJSMap = ThreeJSMap;
      } else {
        window.ThreeJSMap = null;
      }
    });
  } else {
    initialized = ThreeJSMap.init();
    if (initialized) {
      window.ThreeJSMap = ThreeJSMap;
    } else {
      window.ThreeJSMap = null;
    }
  }
})();