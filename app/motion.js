/**
 * Motion Preferences Module
 * Handles prefers-reduced-motion and visualization pause/resume controls
 * Shared across Three.js map and Skill wheel visualizations
 */

(function() {
  'use strict';

  // Shared visualization controls; motion preferences are applied at runtime.
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visualizationsPaused = motionPreference.matches;
  let motionButton = null;

  function updateMotionButton() {
    if (!motionButton) return;
    motionButton.setAttribute('aria-pressed', String(visualizationsPaused));
    motionButton.textContent = visualizationsPaused ? 'Resume Visualizations' : 'Pause Visualizations';
  }

  function setVisualizationMotion(paused) {
    visualizationsPaused = paused;
    updateMotionButton();
    document.dispatchEvent(new Event('visualization-motion-change'));
  }

  // Initialize when DOM is ready
  function initMotion() {
    motionButton = document.getElementById('visualizations-pause');
    if (motionButton) {
      motionButton.addEventListener('click', () => setVisualizationMotion(!visualizationsPaused));
    }
    motionPreference.addEventListener('change', () => setVisualizationMotion(motionPreference.matches));
    updateMotionButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMotion);
  } else {
    initMotion();
  }

  // Export for other modules
  window.VisualizationMotion = {
    get paused() { return visualizationsPaused; },
    set paused(value) { setVisualizationMotion(value); },
    setVisualizationMotion,
  };
})();