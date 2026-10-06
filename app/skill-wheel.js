/**
 * Skill Wheel Module
 * 3D interactive skill constellation wheel using Three.js
 * Depends on motion.js for visualization-motion-change events
 *
 * Presentation notes
 *   The container is much wider than it is tall (roughly 2.5:1), so a circular
 *   ring wastes most of the width and forces the category labels off the edges.
 *   The ring is therefore spread into an ellipse (WHEEL_SPREAD) and the camera
 *   is fitted from the live canvas aspect rather than a hard-coded distance.
 */

(function() {
  'use strict';

  // Skills data — mirrors the HTML skill categories for the interactive ring
  const SKILLS = [
    // Switch & Facility Operations
    { name: 'Switch Maintenance', cat: 'Switch & Facility Ops', color: '#c2410c', desc: 'Switch & Facility Operations' },
    { name: 'Facility Checks', cat: 'Switch & Facility Ops', color: '#c2410c', desc: 'Switch & Facility Operations' },
    { name: 'Power/BMS (EcoStruxure)', cat: 'Switch & Facility Ops', color: '#c2410c', desc: 'Switch & Facility Operations' },
    { name: 'Disaster Recovery', cat: 'Switch & Facility Ops', color: '#c2410c', desc: 'Switch & Facility Operations' },
    { name: 'Alarm Management', cat: 'Switch & Facility Ops', color: '#c2410c', desc: 'Switch & Facility Operations' },
    { name: 'ITIL Change Mgmt', cat: 'Switch & Facility Ops', color: '#c2410c', desc: 'Switch & Facility Operations' },
    // 5G/4G RAN & Core
    { name: '5G NR', cat: '5G/4G RAN & Core', color: '#0e7490', desc: '5G/4G RAN & Core' },
    { name: 'eNodeB/gNodeB', cat: '5G/4G RAN & Core', color: '#0e7490', desc: '5G/4G RAN & Core' },
    { name: 'NSD, DAS', cat: '5G/4G RAN & Core', color: '#0e7490', desc: '5G/4G RAN & Core' },
    { name: 'Emergency COWs', cat: '5G/4G RAN & Core', color: '#0e7490', desc: '5G/4G RAN & Core' },
    { name: 'Call Servers', cat: '5G/4G RAN & Core', color: '#0e7490', desc: '5G/4G RAN & Core' },
    { name: 'BSC/RNC', cat: '5G/4G RAN & Core', color: '#0e7490', desc: '5G/4G RAN & Core' },
    // Routing & Transport
    { name: 'Cisco Catalyst', cat: 'Routing & Transport', color: '#4d7c0f', desc: 'Routing & Transport' },
    { name: 'SAS/MAD Routers', cat: 'Routing & Transport', color: '#4d7c0f', desc: 'Routing & Transport' },
    { name: 'BGP/OSPF/MPLS', cat: 'Routing & Transport', color: '#4d7c0f', desc: 'Routing & Transport' },
    { name: 'Fiber/Microwave', cat: 'Routing & Transport', color: '#4d7c0f', desc: 'Routing & Transport' },
    { name: '1G/10G/100G', cat: 'Routing & Transport', color: '#4d7c0f', desc: 'Routing & Transport' },
    { name: 'L2/L3 Switching', cat: 'Routing & Transport', color: '#4d7c0f', desc: 'Routing & Transport' },
    // T-Mobile Tools
    { name: 'ATOMS', cat: 'T-Mobile Tools', color: '#a8a29e', desc: 'T-Mobile Tools' },
    { name: 'OneTransport', cat: 'T-Mobile Tools', color: '#a8a29e', desc: 'T-Mobile Tools' },
    { name: 'RIOT', cat: 'T-Mobile Tools', color: '#a8a29e', desc: 'T-Mobile Tools' },
    { name: 'OneConsole', cat: 'T-Mobile Tools', color: '#a8a29e', desc: 'T-Mobile Tools' },
    { name: 'CBN Tools', cat: 'T-Mobile Tools', color: '#a8a29e', desc: 'T-Mobile Tools' },
    { name: 'EAI/Netviewer', cat: 'T-Mobile Tools', color: '#a8a29e', desc: 'T-Mobile Tools' },
    // OSS & Scripting
    { name: 'Nokia NetAct', cat: 'OSS & Scripting', color: '#be123c', desc: 'OSS & Scripting' },
    { name: 'Ericsson ENM', cat: 'OSS & Scripting', color: '#be123c', desc: 'OSS & Scripting' },
    { name: 'AMOS', cat: 'OSS & Scripting', color: '#be123c', desc: 'OSS & Scripting' },
    { name: 'Shell/Bash', cat: 'OSS & Scripting', color: '#be123c', desc: 'OSS & Scripting' },
    { name: 'JavaScript', cat: 'OSS & Scripting', color: '#be123c', desc: 'OSS & Scripting' },
    { name: 'Batch', cat: 'OSS & Scripting', color: '#be123c', desc: 'OSS & Scripting' },
    // Leadership
    { name: 'Technical Mentorship', cat: 'Leadership', color: '#65a30d', desc: 'Leadership' },
    { name: 'Junior Tech Onboarding', cat: 'Leadership', color: '#65a30d', desc: 'Leadership' },
    { name: 'MOP Development', cat: 'Leadership', color: '#65a30d', desc: 'Leadership' },
    { name: 'War-Room Command', cat: 'Leadership', color: '#65a30d', desc: 'Leadership' },
    { name: 'E911 / CBN Audits', cat: 'Leadership', color: '#65a30d', desc: 'Leadership' },
  ];

  // ---- Skill Wheel layout ----
  const CATS = [...new Set(SKILLS.map(s => s.cat))];

  // Category color map (Terracotta/teal palette)
  const CAT_COLORS = {
    'Switch & Facility Ops':   '#c2410c',
    '5G/4G RAN & Core':        '#0e7490',
    'Routing & Transport':     '#4d7c0f',
    'T-Mobile Tools':          '#a8a29e',
    'OSS & Scripting':         '#be123c',
    'Leadership':              '#65a30d',
  };

  // ---- Wheel geometry ----
  // The ring lives in the XY plane (facing the camera) rather than XZ. A ring in
  // XZ viewed from a low camera is seen almost edge-on — which is why the old
  // wheel collapsed into a flat band. Leaning the whole group a little gives the
  // 3D read without destroying the shape.
  //
  // A label pill is LABEL_W/80 wide in world units, so its half-width is
  // LABEL_W/160. LABEL_RADIUS must exceed RING_RADIUS by at least that much or
  // the pills sit on top of the outer nodes.
  const WHEEL_LEAN = 0.32;      // group lean, radians
  const CAMERA_ELEV = 0.10;     // camera elevation, radians
  const WHEEL_SPREAD = 1.25;    // horizontal stretch so the ring uses the wide canvas
  const RING_RADIUS = 2.72;     // node ring
  const ARC_INNER = 2.98;       // category arc band
  const ARC_OUTER = 3.16;
  const LABEL_RADIUS = 4.50;    // outside the arc band, clear of the nodes
  const LABEL_W = 288, LABEL_H = 62;
  const NODE_RADIUS = 0.135;
  const CAMERA_FOV = 34;        // long lens: keeps perspective distortion off the ring

  // Fitted extent, recomputed whenever the canvas resizes.
  let wheelFitRadius = 5.2;

  // DOM elements
  const tooltip = document.getElementById('skill-tooltip');
  const tooltipName = tooltip ? tooltip.querySelector('.tooltip-name') : null;
  const tooltipCategory = tooltip ? tooltip.querySelector('.category') : null;
  const tooltipLevel = tooltip ? tooltip.querySelector('.level') : null;

  // ---- 3D wheel state ----
  const wheelReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wheelCanvas = document.getElementById('skill-wheel');
  let wheelActive = false;
  let wheelRAF = null;
  let wheelScene = null, wheelCamera = null, wheelRenderer = null, wheelGroup = null, wheelSpin = null;
  let wheelNodeMeshes = [];
  let wheelGlows = [];
  let wheelArcs = [];
  let hoveredWheelMesh = null;
  let wheelRevealAt = 0;
  const wheelPointer = { x: -2, y: -2, cx: 0, cy: 0 };
  const wheelRaycaster = typeof THREE !== 'undefined' ? new THREE.Raycaster() : null;
  let wheelUnavailable = !wheelRaycaster;

  function showWheelFallback() {
    wheelUnavailable = true;
    if (!wheelCanvas) return;
    const wrap = wheelCanvas.parentElement;
    if (wrap.querySelector('.wheel-fallback')) return;
    const message = document.createElement('p');
    message.className = 'wheel-fallback';
    message.textContent = 'Interactive visualization unavailable. All technical skills remain listed below; search and category filters still work.';
    message.style.cssText = 'position:absolute;inset:0;display:grid;place-content:center;padding:32px;color:var(--text);text-align:center;';
    wrap.appendChild(message);
  }

  if (wheelUnavailable) showWheelFallback();

  // Filter state
  const initialFilters = new URL(window.location.href).searchParams;
  let activeCat = CATS.includes(initialFilters.get('skillCategory')) ? initialFilters.get('skillCategory') : 'all';
  let searchQuery = initialFilters.get('skillSearch') || '';

  function syncFilterUrl() {
    const url = new URL(window.location.href);
    if (activeCat === 'all') url.searchParams.delete('skillCategory');
    else url.searchParams.set('skillCategory', activeCat);
    if (searchQuery) url.searchParams.set('skillSearch', searchQuery);
    else url.searchParams.delete('skillSearch');
    window.history.replaceState(window.history.state, '', url);
  }

  // Canvas-texture sprite label (sprites always face the camera). A dark pill is
  // drawn behind the text so category names stay readable over the ring and the
  // node halos instead of dissolving into them.
  function buildWheelLabel(text, color, w, h, fontPx, withPill) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.font = '600 ' + fontPx + 'px "IBM Plex Sans", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';

    if (withPill) {
      const textW = Math.min(g.measureText(text).width + 40, w);
      const pad = 7;
      const pillH = h - pad * 2;
      g.fillStyle = 'rgba(8,10,14,0.74)';
      g.beginPath();
      if (typeof g.roundRect === 'function') {
        g.roundRect((w - textW) / 2, pad, textW, pillH, pillH / 2);
      } else {
        g.rect((w - textW) / 2, pad, textW, pillH);
      }
      g.fill();
    }

    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(w / 80, h / 80, 1);
    return sp;
  }

  // Soft radial halo, used as a cheap bloom substitute behind each node.
  function buildGlowTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255,255,255,0.95)');
    grad.addColorStop(0.32, 'rgba(255,255,255,0.34)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  // Position on the spread ring. `depth` pushes a node toward or away from the
  // camera so the alternating tiers read as layers rather than a flat line.
  function wheelPoint(angle, radius, depth) {
    return new THREE.Vector3(
      Math.cos(angle) * radius * WHEEL_SPREAD,
      Math.sin(angle) * radius,
      depth
    );
  }

  // Fit the camera from the live canvas aspect so the whole ring — including the
  // category labels hanging off the sides — is always in frame. The old code
  // hard-coded a camera distance that only framed correctly at one canvas size.
  function fitWheelCamera() {
    if (!wheelCamera || !wheelCanvas) return;
    const rect = wheelCanvas.getBoundingClientRect();
    const aspect = Math.max(rect.width, 1) / Math.max(rect.height, 1);
    const vFov = wheelCamera.fov * Math.PI / 180;
    // Vertical extent is compressed by both the group lean and the camera's own
    // elevation, so both are folded into the fit.
    const halfW = LABEL_RADIUS * WHEEL_SPREAD + LABEL_W / 160;
    const halfH = LABEL_RADIUS * Math.cos(WHEEL_LEAN + CAMERA_ELEV) + LABEL_H / 160;
    // The lean tips the bottom of the ring toward the camera, so the nearest
    // label sits `nearZ` closer and projects larger than its world size. Solving
    // for that (rather than padding the result) is what keeps the bottom label
    // from spilling out of the canvas.
    const nearZ = LABEL_RADIUS * Math.sin(WHEEL_LEAN);
    const distV = halfH / Math.tan(vFov / 2) + nearZ;
    const distH = halfW / (Math.tan(vFov / 2) * aspect);
    const dist = Math.max(distV, distH) * 1.07;
    wheelFitRadius = Math.max(halfW, halfH);
    wheelCamera.position.set(0, dist * Math.sin(CAMERA_ELEV), dist * Math.cos(CAMERA_ELEV));
    wheelCamera.lookAt(0, 0, 0);
  }

  function initWheel() {
    if (!wheelCanvas || wheelUnavailable) return;
    if (wheelRenderer) { sizeWheel(); return; }

    wheelScene = new THREE.Scene();
    wheelCamera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 120);

    try {
      wheelRenderer = new THREE.WebGLRenderer({
        canvas: wheelCanvas, antialias: true, alpha: true, powerPreference: 'low-power'
      });
    } catch (error) {
      showWheelFallback();
      return;
    }
    wheelRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wheelRenderer.setClearColor(0x000000, 0);

    // wheelGroup carries the lean; wheelSpin carries the in-plane rotation. Kept
    // as separate nodes so the spin is unambiguously about the ring's own axis.
    wheelGroup = new THREE.Group();
    wheelGroup.rotation.x = -WHEEL_LEAN;
    wheelScene.add(wheelGroup);
    wheelSpin = new THREE.Group();
    wheelGroup.add(wheelSpin);

    const gap = 0.10;
    const totalArc = Math.PI * 2 - gap * CATS.length;

    // Category arcs — thicker than before so the grouping actually reads, and
    // they brighten when their category is the active filter.
    wheelArcs.length = 0;
    let arcAngle = 0;
    CATS.forEach(cat => {
      const arcLen = totalArc / CATS.length;
      const arcGeo = new THREE.RingGeometry(ARC_INNER, ARC_OUTER, 64, 1, arcAngle, arcLen);
      const arcMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(CAT_COLORS[cat]), transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, depthWrite: false
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.scale.set(WHEEL_SPREAD, 1, 1);
      arc.userData = { cat, target: 0.3 };
      wheelSpin.add(arc);
      wheelArcs.push(arc);
      arcAngle += arcLen + gap;
    });

    // Skill nodes, each with a soft halo behind it.
    const sphereGeo = new THREE.SphereGeometry(NODE_RADIUS, 16, 16);
    const glowTex = buildGlowTexture();
    // Clear in place — window.wheelNodeMeshes holds a reference to this array
    // (the tests read it), so reassigning would orphan it.
    wheelNodeMeshes.length = 0;
    wheelGlows.length = 0;
    arcAngle = 0;
    CATS.forEach(cat => {
      const skills = SKILLS.filter(s => s.cat === cat);
      const arcLen = totalArc / CATS.length;
      skills.forEach((s, si) => {
        const a = arcAngle + (si + 0.5) / skills.length * arcLen;
        const tier = si % 2;
        const r = RING_RADIUS * (1 + tier * 0.075);
        const pos = wheelPoint(a, r, tier * 0.22 - 0.11);

        const mesh = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({
          color: new THREE.Color(s.color), transparent: true, opacity: 0.95
        }));
        mesh.position.copy(pos);
        mesh.userData = { skill: s, tier: tier, on: true, index: wheelNodeMeshes.length };
        wheelSpin.add(mesh);
        wheelNodeMeshes.push(mesh);

        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, color: new THREE.Color(s.color), transparent: true,
          opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending
        }));
        glow.scale.setScalar(1.05);
        glow.position.copy(pos);
        wheelSpin.add(glow);
        wheelGlows.push({ sprite: glow, node: mesh });
      });

      // Category label at the arc midpoint, on a dark pill.
      const mid = arcAngle + arcLen / 2;
      const label = buildWheelLabel(cat, CAT_COLORS[cat], LABEL_W, LABEL_H, 22, true);
      label.position.copy(wheelPoint(mid, LABEL_RADIUS, 0.14));
      wheelSpin.add(label);
      arcAngle += arcLen + gap;
    });

    // Centre caption lives outside the rotating group so it stays put. Kept
    // narrow enough to sit inside the ring without touching the inner nodes.
    const center = buildWheelLabel('TECHNICAL SKILLS', '#8d8880', 320, 56, 22, false);
    center.position.set(0, 0.46, 0);
    wheelScene.add(center);
    const hint = buildWheelLabel('hover a node to inspect', '#6f6b64', 320, 44, 17, false);
    hint.position.set(0, -0.04, 0);
    wheelScene.add(hint);

    sizeWheel();
    if (wheelReducedMotion) wheelRenderer.render(wheelScene, wheelCamera);
  }

  function applyWheelFilter() {
    const q = searchQuery.trim().toLowerCase();
    const visible = SKILLS.filter(s =>
      (activeCat === 'all' || s.cat === activeCat) &&
      (!q || s.name.toLowerCase().includes(q))
    ).length;
    wheelNodeMeshes.forEach(m => {
      const catOk = activeCat === 'all' || m.userData.skill.cat === activeCat;
      const nameOk = !q || m.userData.skill.name.toLowerCase().includes(q);
      m.userData.on = catOk && nameOk;
    });
    // Active category's arc reads as selected; the rest recede.
    wheelArcs.forEach(arc => {
      arc.userData.target = (activeCat === 'all' || arc.userData.cat === activeCat) ? 0.3 : 0.07;
    });
    const countEl = document.getElementById('skills-count');
    if (countEl) countEl.textContent = (!q && activeCat === 'all')
      ? SKILLS.length + ' skills'
      : visible + ' of ' + SKILLS.length + ' skills';
    filterTagGrid(q);
    const empty = document.getElementById('skills-empty');
    if (empty) empty.hidden = visible > 0;
    if (wheelRenderer && window.VisualizationMotion?.paused) {
      if (wheelRAF) cancelAnimationFrame(wheelRAF);
      wheelRAF = null;
      wheelLoop(performance.now());
    }
  }

  function filterTagGrid(q) {
    document.querySelectorAll('.skill-category').forEach(block => {
      const h = (block.querySelector('h3') || {}).textContent || '';
      const category = h === 'Switch & Facility Operations' ? 'Switch & Facility Ops' : h;
      const catOk = activeCat === 'all' || category === activeCat;
      let any = false;
      block.querySelectorAll('.skill-tag').forEach(tag => {
        const on = catOk && (!q || tag.textContent.toLowerCase().includes(q));
        tag.style.display = on ? '' : 'none';
        if (on) any = true;
      });
      block.style.display = any ? '' : 'none';
    });
  }

  function sizeWheel() {
    if (!wheelCanvas || !wheelRenderer) return;
    const rect = wheelCanvas.getBoundingClientRect();
    const w = Math.max(rect.width, 1), h = Math.max(rect.height, 1);
    wheelRenderer.setSize(w, h, false);
    wheelCamera.aspect = w / h;
    wheelCamera.updateProjectionMatrix();
    fitWheelCamera();
  }

  // 3D wheel render loop — staggered reveal, gentle orbit, per-node breathing,
  // hover bloom, and dimming of non-matching nodes. Skips frames while hidden
  // or reduced-motion.
  function wheelLoop(time) {
    if (!wheelActive || !wheelRenderer) {
      wheelRAF = null;
      window.wheelRAF = null;
      return;
    }
    const staticFrame = window.VisualizationMotion?.paused || document.hidden;

    if (!staticFrame) {
      if (!wheelRevealAt) wheelRevealAt = time;
      const reveal = Math.min((time - wheelRevealAt) / 1500, 1);

      wheelSpin.rotation.z = time * 0.00009;

      wheelNodeMeshes.forEach((m, i) => {
        const on = m.userData.on;
        const hovered = m === hoveredWheelMesh;
        // Stagger the reveal across the ring so it assembles rather than pops.
        const stagger = Math.min(Math.max((reveal - (i / wheelNodeMeshes.length) * 0.55) / 0.45, 0), 1);
        const eased = 1 - Math.pow(1 - stagger, 3);
        const breathe = 1 + Math.sin(time * 0.0013 + i * 0.7) * 0.055;

        const target = on ? (hovered ? 1.0 : 0.92) : 0.06;
        m.material.opacity += (target - m.material.opacity) * 0.18;

        const targetScale = (hovered ? 2.1 : 1) * eased * breathe;
        const s = m.scale.x + (targetScale - m.scale.x) * 0.18;
        m.scale.setScalar(s);
      });

      wheelGlows.forEach(({ sprite, node }) => {
        const hovered = node === hoveredWheelMesh;
        const target = !node.userData.on ? 0.02 : (hovered ? 0.95 : 0.4);
        sprite.material.opacity += (target - sprite.material.opacity) * 0.18;
        const glowScale = (hovered ? 2.2 : 1.05) * Math.max(node.scale.x, 0.2);
        sprite.scale.setScalar(glowScale);
      });

      wheelArcs.forEach(arc => {
        arc.material.opacity += (arc.userData.target - arc.material.opacity) * 0.12;
      });

      wheelRenderer.render(wheelScene, wheelCamera);
      wheelRAF = requestAnimationFrame(wheelLoop);
      window.wheelRAF = wheelRAF;
    } else {
      wheelRenderer.render(wheelScene, wheelCamera);
      window.wheelRAF = null;
    }
  }

  // ---- Pointer hover for 3D wheel (raycast against node spheres) ----
  function updateWheelHover(clientX, clientY) {
    if (!wheelRaycaster || !wheelCamera) return;
    const rect = wheelCanvas.getBoundingClientRect();
    wheelPointer.cx = ((clientX - rect.left) / rect.width) * 2 - 1;
    wheelPointer.cy = -((clientY - rect.top) / rect.height) * 2 + 1;
    wheelRaycaster.setFromCamera(wheelPointer, wheelCamera);
    const hits = wheelRaycaster.intersectObjects(wheelNodeMeshes);
    const hit = hits.find(h => h.object.userData.on) || null;
    hoveredWheelMesh = hit ? hit.object : null;
    if (hoveredWheelMesh) {
      const s = hoveredWheelMesh.userData.skill;
      if (tooltipName) tooltipName.textContent = s.name;
      if (tooltipCategory) tooltipCategory.textContent = s.cat;
      // Was repeating the category text verbatim; group size is actually useful.
      if (tooltipLevel) {
        const inGroup = SKILLS.filter(x => x.cat === s.cat).length;
        tooltipLevel.textContent = inGroup + ' skills in this group';
      }
      if (tooltip) {
        tooltip.style.left = Math.max(8, Math.min(clientX + 14, window.innerWidth - 280)) + 'px';
        tooltip.style.top = Math.max(8, clientY - 10) + 'px';
        tooltip.classList.add('visible');
        tooltip.setAttribute('aria-hidden', 'false');
      }
      wheelCanvas.style.cursor = 'pointer';
    } else {
      if (tooltip) {
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
      }
      wheelCanvas.style.cursor = 'default';
    }
  }

  document.addEventListener('visualization-motion-change', () => {
    if (wheelRAF) cancelAnimationFrame(wheelRAF);
    wheelRAF = null;
    if (wheelActive && wheelRenderer) wheelLoop(performance.now());
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && wheelRAF) { cancelAnimationFrame(wheelRAF); wheelRAF = null; }
    else if (wheelActive && wheelRenderer && !wheelRAF) wheelLoop(performance.now());
  });

  wheelCanvas.addEventListener('pointermove', (e) => {
    if (!wheelActive) return;
    updateWheelHover(e.clientX, e.clientY);
    if (window.VisualizationMotion?.paused && wheelRenderer) wheelLoop(performance.now());
  });

  wheelCanvas.addEventListener('pointerleave', () => {
    hoveredWheelMesh = null;
    if (tooltip) {
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden', 'true');
    }
    if (window.VisualizationMotion?.paused && wheelRenderer) wheelLoop(performance.now());
  });

  // ---- Search + filter controls drive both the 3D wheel and the tag grid ----
  const skillSearchInput = document.getElementById('skill-search');
  if (skillSearchInput) {
    skillSearchInput.value = searchQuery;
    skillSearchInput.addEventListener('input', () => {
      searchQuery = skillSearchInput.value;
      syncFilterUrl();
      applyWheelFilter();
    });
  }

  document.querySelectorAll('.skill-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === activeCat);
    btn.setAttribute('aria-pressed', String(btn.dataset.cat === activeCat));
    btn.addEventListener('click', () => {
      document.querySelectorAll('.skill-filter-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      activeCat = btn.dataset.cat;
      syncFilterUrl();
      applyWheelFilter();
    });
  });

  // ================================================================
  // INTERSECTION OBSERVER — activates the 3D wheel when it nears the viewport
  // ================================================================
  const constellationAnchor = document.querySelector('.constellation-anchor');
  if (constellationAnchor && wheelCanvas) {
    const constObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const firstActivation = !wheelActive;
          wheelActive = true;
          initWheel();
          applyWheelFilter();
          // Replay the assembly animation each time the section is re-entered.
          if (firstActivation) wheelRevealAt = 0;
          if (wheelRenderer && !wheelRAF && !window.VisualizationMotion?.paused) wheelRAF = requestAnimationFrame(wheelLoop);
        } else {
          wheelActive = false;
        }
      });
    }, { threshold: 0.3 });
    constObs.observe(constellationAnchor);
  }

  window.addEventListener('popstate', () => {
    const params = new URL(window.location.href).searchParams;
    activeCat = CATS.includes(params.get('skillCategory')) ? params.get('skillCategory') : 'all';
    searchQuery = params.get('skillSearch') || '';
    if (skillSearchInput) skillSearchInput.value = searchQuery;
    document.querySelectorAll('.skill-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === activeCat);
      btn.setAttribute('aria-pressed', String(btn.dataset.cat === activeCat));
    });
    applyWheelFilter();
  });

  applyWheelFilter();

  // Expose for other modules
  window.SkillWheel = {
    initWheel,
    applyWheelFilter,
    sizeWheel,
    SKILLS,
    CATS,
    CAT_COLORS,
  };
  // Also expose SKILLS directly for use by map section
  window.SKILLS = SKILLS;
  // Expose wheelNodeMeshes and wheelRAF for testing
  window.wheelNodeMeshes = wheelNodeMeshes;
  window.wheelRAF = wheelRAF;
})();
