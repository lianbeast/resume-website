/**
 * Skill Wheel Module
 * 3D interactive skill constellation wheel using Three.js
 * Depends on motion.js for visualization-motion-change events
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
    { name: 'ATOMS', cat: 'T-Mobile Tools', color: '#44403c', desc: 'T-Mobile Tools' },
    { name: 'OneTransport', cat: 'T-Mobile Tools', color: '#44403c', desc: 'T-Mobile Tools' },
    { name: 'RIOT', cat: 'T-Mobile Tools', color: '#44403c', desc: 'T-Mobile Tools' },
    { name: 'OneConsole', cat: 'T-Mobile Tools', color: '#44403c', desc: 'T-Mobile Tools' },
    { name: 'CBN Tools', cat: 'T-Mobile Tools', color: '#44403c', desc: 'T-Mobile Tools' },
    { name: 'EAI/Netviewer', cat: 'T-Mobile Tools', color: '#44403c', desc: 'T-Mobile Tools' },
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
    'T-Mobile Tools':          '#44403c',
    'OSS & Scripting':         '#be123c',
    'Leadership':              '#65a30d',
  };

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
  let wheelScene = null, wheelCamera = null, wheelRenderer = null, wheelGroup = null;
  let wheelNodeMeshes = [];
  let hoveredWheelMesh = null;
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

  // Canvas-texture sprite label (sprites always face the camera)
  function buildWheelLabel(text, color, w, h, fontPx) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.font = '600 ' + fontPx + 'px "Outfit", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.scale.set(w / 80, h / 80, 1);
    return sp;
  }

  function initWheel() {
    if (!wheelCanvas || wheelUnavailable) return;
    if (wheelRenderer) { sizeWheel(); return; }

    wheelScene = new THREE.Scene();
    wheelCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
    wheelCamera.position.set(0, 2.0, 7.4);
    wheelCamera.lookAt(0, 0, 0);

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

    wheelGroup = new THREE.Group();
    wheelGroup.rotation.x = -0.5; // carousel tilt
    wheelScene.add(wheelGroup);

    // Category arcs (flat rings in the wheel plane)
    const gap = 0.09;
    const totalArc = Math.PI * 2 - gap * CATS.length;
    let arcAngle = 0;
    CATS.forEach(cat => {
      const arcLen = totalArc / CATS.length;
      const arcGeo = new THREE.RingGeometry(3.0, 3.07, 48, 1, arcAngle, arcLen);
      const arcMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(CAT_COLORS[cat]), transparent: true, opacity: 0.5, side: THREE.DoubleSide
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      arc.rotation.x = -Math.PI / 2;
      wheelGroup.add(arc);
      arcAngle += arcLen + gap;
    });

    // Skill nodes on the wheel
    const sphereGeo = new THREE.SphereGeometry(0.085, 12, 12);
    arcAngle = 0;
    CATS.forEach(cat => {
      const skills = SKILLS.filter(s => s.cat === cat);
      const arcLen = totalArc / CATS.length;
      skills.forEach((s, si) => {
        const a = arcAngle + (si + 0.5) / skills.length * arcLen;
        const tier = si % 2;
        const r = 2.55 * (1 + tier * 0.07);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(s.color), transparent: true, opacity: 0.9
        });
        const mesh = new THREE.Mesh(sphereGeo, mat);
        mesh.position.set(Math.cos(a) * r, tier * 0.16 - 0.08, Math.sin(a) * r);
        mesh.userData = { skill: s, tier: tier, on: true };
        wheelGroup.add(mesh);
        wheelNodeMeshes.push(mesh);
      });

      // Category label at arc midpoint
      const mid = arcAngle + arcLen / 2;
      const label = buildWheelLabel(cat, CAT_COLORS[cat], 256, 56, 20);
      label.position.set(Math.cos(mid) * 3.55, 0.12, Math.sin(mid) * 3.55);
      wheelGroup.add(label);
      arcAngle += arcLen + gap;
    });

    // Center label (static — not part of the rotating wheel)
    const center = buildWheelLabel('TECHNICAL SKILLS', '#6b6964', 320, 64, 24);
    center.position.set(0, 0.25, 0);
    wheelScene.add(center);
    const hint = buildWheelLabel('hover to explore', '#9a968e', 256, 40, 15);
    hint.position.set(0, -0.18, 0);
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
  }

  // 3D wheel render loop — auto-rotates, raycasts for hover, dims
  // non-matching nodes, skips frames while hidden or reduced-motion.
  function wheelLoop(time) {
    if (!wheelActive || !wheelRenderer) {
      wheelRAF = null;
      window.wheelRAF = null;
      return;
    }
    const staticFrame = window.VisualizationMotion?.paused || document.hidden;
    if (!staticFrame) {
      wheelGroup.rotation.y = time * 0.00012;
      wheelNodeMeshes.forEach(m => {
        const on = m.userData.on;
        const hovered = m === hoveredWheelMesh;
        const target = on ? (hovered ? 1.0 : 0.9) : 0.08;
        m.material.opacity += (target - m.material.opacity) * (staticFrame ? 1 : 0.2);
        const targetScale = hovered ? 2.0 : 1.0;
        const s = m.scale.x + (targetScale - m.scale.x) * (staticFrame ? 1 : 0.2);
        m.scale.setScalar(s);
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
      if (tooltipLevel) tooltipLevel.textContent = s.desc || '';
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
          wheelActive = true;
          initWheel();
          applyWheelFilter();
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