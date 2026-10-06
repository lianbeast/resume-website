/**
 * Tier switcher — lets a client pick the experience their hardware can carry.
 *
 *   Lite       no WebGL, no animation libraries, static SVG map   (low-end PCs)
 *   Standard   CSS + light JS, Three.js map hero                  (most machines)
 *   Immersive  full 3D US-map career journey                      (high-end PCs)
 *
 * Self-contained: injects its own styles and markup, so each tier page only
 * needs one <script defer> tag. Remembers the visitor's choice, and marks the
 * tier that best fits the current device. Never force-redirects.
 */
(() => {
  'use strict';

  const TIERS = [
    { id: 'lite', label: 'Lite', href: 'lite.html', note: 'Fastest — no 3D' },
    { id: 'standard', label: 'Standard', href: 'index.html', note: 'Balanced — light 3D' },
    { id: 'immersive', label: 'Immersive', href: 'immersive-preview.html', note: 'Full 3D journey' }
  ];
  const STORAGE_KEY = 'career-site-tier';

  // ------------------------------------------------------------- capability
  function hasWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (error) { return false; }
  }

  function recommendedTier() {
    if (!hasWebGL()) return 'lite';
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'lite';
    const cores = navigator.hardwareConcurrency || 0;
    const memory = navigator.deviceMemory || 0;
    if ((cores && cores <= 4) || (memory && memory <= 4)) return 'lite';
    if (cores && cores >= 8 && !window.matchMedia('(max-width: 768px)').matches) return 'immersive';
    return 'standard';
  }

  const currentPage = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const current = TIERS.find(tier => tier.href === currentPage) || TIERS[1];
  const recommended = recommendedTier();

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (error) { /* private mode */ }

  // ----------------------------------------------------------------- styles
  const style = document.createElement('style');
  style.textContent = `
    .tier-switch{
      position:fixed;left:18px;bottom:18px;z-index:9000;
      display:flex;align-items:center;gap:4px;
      padding:4px 6px;border-radius:999px;
      background:rgba(10,14,20,.82);
      border:1px solid rgba(255,255,255,.16);
      box-shadow:0 6px 24px rgba(0,0,0,.35);
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
      font-size:12px;line-height:1;
      -webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
    }
    .tier-switch__label{
      color:rgba(255,255,255,.5);font-size:10px;letter-spacing:.12em;
      text-transform:uppercase;padding:0 8px 0 6px;
    }
    .tier-switch a{
      position:relative;display:inline-flex;align-items:center;gap:5px;
      padding:7px 12px;border-radius:999px;
      color:rgba(255,255,255,.72);text-decoration:none;
      font-weight:600;letter-spacing:.01em;white-space:nowrap;
      transition:background .18s ease,color .18s ease;
    }
    .tier-switch a:hover{background:rgba(255,255,255,.1);color:#fff}
    .tier-switch a:focus-visible{outline:2px solid #ff956b;outline-offset:2px}
    .tier-switch a[aria-current="true"]{background:#c2410c;color:#fff}
    .tier-switch a[aria-current="true"]:hover{background:#c2410c}
    .tier-switch__dot{
      width:6px;height:6px;border-radius:50%;background:#64d7db;
      box-shadow:0 0 0 3px rgba(100,215,219,.22);flex:0 0 auto;
    }
    .tier-switch a[aria-current="true"] .tier-switch__dot{background:#fff;box-shadow:none}
    .tier-switch__advice{
      position:fixed;left:18px;bottom:64px;z-index:9000;max-width:290px;
      padding:12px 14px;border-radius:10px;
      background:rgba(10,14,20,.94);border:1px solid rgba(255,255,255,.16);
      color:rgba(255,255,255,.86);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
      font-size:12.5px;line-height:1.5;box-shadow:0 10px 30px rgba(0,0,0,.4);
    }
    .tier-switch__advice a{color:#ff956b;font-weight:600}
    .tier-switch__advice button{
      position:absolute;top:6px;right:8px;background:none;border:0;
      color:rgba(255,255,255,.5);font-size:15px;cursor:pointer;padding:2px 4px;line-height:1;
    }
    .tier-switch__advice button:hover{color:#fff}
    @media (max-width:640px){
      .tier-switch{left:10px;bottom:10px}
      .tier-switch__label{display:none}
      .tier-switch__advice{left:10px;bottom:56px;max-width:calc(100vw - 20px)}
    }
    @media print{.tier-switch,.tier-switch__advice{display:none!important}}
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------- markup
  const nav = document.createElement('div');
  nav.className = 'tier-switch';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Experience tier');

  const label = document.createElement('span');
  label.className = 'tier-switch__label';
  label.textContent = 'View';
  nav.appendChild(label);

  TIERS.forEach(tier => {
    const link = document.createElement('a');
    link.href = tier.href;
    link.title = tier.note;
    if (tier.id === current.id) link.setAttribute('aria-current', 'true');

    const text = document.createElement('span');
    text.textContent = tier.label;
    if (tier.id === recommended) {
      const dot = document.createElement('span');
      dot.className = 'tier-switch__dot';
      dot.title = 'Recommended for this device';
      link.appendChild(dot);
      link.setAttribute('aria-label', `${tier.label} — recommended for this device`);
    }
    link.appendChild(text);

    link.addEventListener('click', () => {
      try { localStorage.setItem(STORAGE_KEY, tier.id); } catch (error) { /* ignore */ }
    });
    nav.appendChild(link);
  });
  document.body.appendChild(nav);

  // --------------------------------------------------------------- advice
  // Only nudge when the visitor is on a tier their device cannot really run,
  // or when their saved preference differs from the page they landed on.
  function showAdvice(message, actionLabel, actionHref) {
    if (document.querySelector('.tier-switch__advice')) return;
    const box = document.createElement('div');
    box.className = 'tier-switch__advice';
    box.setAttribute('role', 'status');
    box.innerHTML = `${message} <a href="${actionHref}">${actionLabel}</a>`;

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', () => box.remove());
    box.appendChild(close);

    document.body.appendChild(box);
  }

  if (saved && saved !== current.id) {
    const target = TIERS.find(tier => tier.id === saved);
    if (target) showAdvice('You last chose a different view.', `Switch to ${target.label} →`, target.href);
  } else if (current.id === 'immersive' && recommended === 'lite') {
    showAdvice(
      hasWebGL()
        ? 'This device may struggle with the 3D journey.'
        : 'This device has no WebGL, so the 3D journey cannot run.',
      'Use the Lite view →', 'lite.html'
    );
  }

  // Expose for the smoke tests / debugging.
  document.documentElement.dataset.tier = current.id;
  document.documentElement.dataset.tierRecommended = recommended;
})();
