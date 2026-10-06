/**
 * Immersive 3D career journey — the resume played out ON the United States.
 *
 * Geography is real: every career stop is placed at its actual longitude /
 * latitude and projected onto a flat map plane, the lower-48 outlines come
 * from states.js, and the camera flies city-to-city as the visitor scrolls
 * the chronological resume. Data packets arc along the career path.
 *
 * Graceful degradation: no WebGL / no Three / reduced-motion / context loss
 * falls back to the readable text resume that is already in the DOM.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------- DOM hooks
  const container = document.getElementById('immersive-world');
  const status = document.getElementById('world-status');
  const locationLabel = document.getElementById('journey-location');
  const instruction = document.getElementById('journey-instruction');
  const exploreButton = document.getElementById('world-explore');
  const pauseButton = document.getElementById('world-pause');
  const orbitControls = document.querySelector('.orbit-controls');
  const progressBar = document.getElementById('journey-progress-bar');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 768px)');
  const stops = [...document.querySelectorAll('.career-locations__list li')];
  const articles = [...document.querySelectorAll('.timeline-item')];

  // ----------------------------------------------------------- career geography
  // Real coordinates, keyed by the city text already in the accessible list.
  const CITY_COORDS = {
    'Bethesda, MD':     [-77.09, 39.02],
    'Martinsburg, WV':  [-77.97, 39.55],
    'Spokane, WA':      [-117.43, 47.66],
    'Austin, TX':       [-97.74, 30.27],
    'Miami, FL':        [-80.19, 25.76],
    'Hammond, LA':      [-90.46, 30.50],
    'DC, MD, VA':       [-77.04, 38.90]
  };

  // Equirectangular projection onto the XZ map plane. Matches app/threejs/map.js
  // so both tiers describe the same country at the same scale.
  const MAP_CX = -98, MAP_CY = 39.5, MAP_SCALE = 1.35;
  const MAP_DEPTH = 0.45;

  function project(lon, lat) {
    return new THREE.Vector3(
      (lon - MAP_CX) * MAP_SCALE * Math.cos(lat * Math.PI / 180),
      0,
      -(lat - MAP_CY) * MAP_SCALE
    );
  }

  let renderer, raf = 0, disposed = false, failed = false;
  let paused = reduced.matches, exploring = false, progress = 0, activeHub = -1;
  let orbit = 0.4, orbitTilt = 0.3, dragging = false, pointerStart = null;
  let lastTime = 0, lastDraw = 0, elapsed = 0, scrollDirty = true, resizeDirty = true;

  function fallback() {
    failed = true;
    if (raf) cancelAnimationFrame(raf);
    if (renderer) renderer.dispose();
    document.body.classList.remove('world-exploring');
    const main = document.querySelector('main');
    if (main) main.inert = false;
    document.body.classList.add('world-unavailable');
    status.textContent = 'Reading mode · 3D unavailable';
    instruction.textContent = 'Your complete resume is available below.';
    exploreButton.disabled = true;
    pauseButton.disabled = true;
  }

  if (!container || typeof THREE === 'undefined') { fallback(); return; }

  // -------------------------------------------------------------------- scene
  const BG = 0x080e16;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.FogExp2(BG, 0.0085);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 400);
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !small.matches, powerPreference: 'high-performance' });
  } catch (error) { fallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small.matches ? 1.5 : 2));
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });

  scene.add(new THREE.AmbientLight(0x6f8bab, 0.85));
  const keyLight = new THREE.DirectionalLight(0xffc5a6, 2.1);
  keyLight.position.set(26, 40, 22);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x52cedb, 1.5);
  rimLight.position.set(-30, 18, -34);
  scene.add(rimLight);

  // ------------------------------------------------------- lower-48 US surface
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  const stateFill = new THREE.MeshStandardMaterial({
    color: 0x0d1f30, metalness: 0.5, roughness: 0.55,
    transparent: true, opacity: 0.88, emissive: 0x061019, emissiveIntensity: 0.7
  });
  const edgeWarm = new THREE.LineBasicMaterial({ color: 0xc2410c, transparent: true, opacity: 0.78 });
  const edgeCool = new THREE.LineBasicMaterial({ color: 0x0e7490, transparent: true, opacity: 0.62 });

  function buildUnitedStates() {
    if (typeof US_STATES !== 'object' || !US_STATES) return;
    let index = 0;
    Object.keys(US_STATES).forEach(name => {
      US_STATES[name].forEach(ring => {
        if (!ring || ring.length < 3) return;
        const shape = new THREE.Shape();
        ring.forEach(([lon, lat], i) => {
          const p = project(lon, lat);
          // Shape is authored in XY, then rotated flat onto XZ below.
          if (i === 0) shape.moveTo(p.x, -p.z);
          else shape.lineTo(p.x, -p.z);
        });
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: MAP_DEPTH, bevelEnabled: false, curveSegments: 1
        });
        geometry.rotateX(-Math.PI / 2);
        mapGroup.add(new THREE.Mesh(geometry, stateFill));
        mapGroup.add(new THREE.LineSegments(
          new THREE.EdgesGeometry(geometry, 32),
          index++ % 2 ? edgeCool : edgeWarm
        ));
      });
    });
  }
  buildUnitedStates();

  // --------------------------------------------------------------- career path
  const hubPositions = stops.map(stop => {
    const city = stop.querySelector('.cl-city').textContent.trim();
    const coords = CITY_COORDS[city];
    if (!coords) return new THREE.Vector3(0, MAP_DEPTH, 0);
    const p = project(coords[0], coords[1]);
    p.y = MAP_DEPTH;
    return p;
  });

  const hubs = [], rings = [], beams = [], glows = [], clickable = [], textures = [];

  const sphereGeometry = new THREE.IcosahedronGeometry(0.62, 2);
  const ringGeometry = new THREE.TorusGeometry(1.5, 0.03, 8, 72);
  const beamGeometry = new THREE.CylinderGeometry(0.05, 0.05, 9, 8, 1, true);
  const packetGeometry = new THREE.SphereGeometry(0.09, 8, 8);

  function glowSprite(rgb, size) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${rgb},1)`);
    gradient.addColorStop(0.35, `rgba(${rgb},0.42)`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    textures.push(texture);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    sprite.scale.setScalar(size);
    return sprite;
  }

  function labelSprite(text, subtext) {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,12,20,0.82)';
    ctx.fillRect(0, 0, 768, 180);
    ctx.fillStyle = '#ff956b';
    ctx.fillRect(0, 0, 5, 180);
    ctx.font = '500 46px sans-serif';
    ctx.fillStyle = '#edf3f8';
    ctx.fillText(text, 30, 74);
    ctx.font = '27px monospace';
    ctx.fillStyle = '#8fa6bb';
    ctx.fillText(subtext, 30, 128);
    const texture = new THREE.CanvasTexture(canvas);
    textures.push(texture);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthWrite: false, fog: false
    }));
    sprite.scale.set(8, 1.88, 1);
    return sprite;
  }

  stops.forEach((stop, i) => {
    const position = hubPositions[i];
    const group = new THREE.Group();
    group.position.copy(position);
    const isCurrent = i === stops.length - 1;

    const core = new THREE.Mesh(sphereGeometry, new THREE.MeshStandardMaterial({
      color: isCurrent ? 0xff956b : 0x64d7db,
      metalness: 0.75, roughness: 0.22,
      emissive: isCurrent ? 0x9a3614 : 0x0a6470, emissiveIntensity: 1.1
    }));
    core.userData.hubIndex = i;
    group.add(core);
    clickable.push(core);

    // Glow halo — a cheap bloom substitute, no post-processing pass needed.
    const glow = glowSprite(isCurrent ? '255,149,107' : '100,215,219', 7.5);
    glow.position.y = 0.2;
    group.add(glow);
    glows.push(glow);

    // Vertical light beam so the city reads from across the map.
    const beam = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({
      color: isCurrent ? 0xff956b : 0x64d7db,
      transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    beam.position.y = 4.4;
    group.add(beam);
    beams.push(beam);

    // Ground pulse rings.
    for (let j = 0; j < 2; j++) {
      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
        color: j === 0 ? 0xff956b : 0x64d7db,
        transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide
      }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06 - j * 0.01;
      ring.userData.offset = j * 0.5;
      group.add(ring);
      rings.push(ring);
    }

    const label = labelSprite(
      stop.querySelector('.cl-city').textContent.trim(),
      stop.querySelector('.cl-era').textContent.trim()
    );
    label.position.set(0, 6.4, 0);
    group.add(label);

    mapGroup.add(group);
    hubs.push(group);
  });

  // Arcs + travelling packets along the chronological career path.
  const packets = [];
  for (let i = 0; i < hubPositions.length - 1; i++) {
    const from = hubPositions[i], to = hubPositions[i + 1];
    const mid = from.clone().lerp(to, 0.5);
    mid.y = Math.max(from.y, to.y) + 4.6;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    mapGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, 64, 0.035, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x64d7db, transparent: true, opacity: 0.4 })
    ));
    for (let j = 0; j < 5; j++) {
      const mesh = new THREE.Mesh(packetGeometry, new THREE.MeshBasicMaterial({
        color: 0xffb68f, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending
      }));
      mapGroup.add(mesh);
      packets.push({ mesh, curve, offset: j / 5 });
    }
  }

  // Expanding pulse marking whichever city is currently in focus.
  const focusPulse = new THREE.Mesh(
    new THREE.RingGeometry(1, 1.14, 72),
    new THREE.MeshBasicMaterial({
      color: 0xff956b, transparent: true, opacity: 0.75,
      depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    })
  );
  focusPulse.rotation.x = -Math.PI / 2;
  focusPulse.position.y = 0.1;
  scene.add(focusPulse);

  // Slow sweep band scanning the map — motion without a post-processing pass.
  const sweep = new THREE.Mesh(
    new THREE.PlaneGeometry(150, 3.2),
    new THREE.MeshBasicMaterial({
      color: 0x64d7db, transparent: true, opacity: 0.055,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    })
  );
  sweep.rotation.x = -Math.PI / 2;
  scene.add(sweep);

  // Starfield above the map.
  const starCount = small.matches ? 500 : 1200;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starPositions.length; i += 3) {
    starPositions[i] = Math.sin(i * 12.9898) * 90;
    starPositions[i + 1] = 12 + Math.cos(i * 4.1414) * 34;
    starPositions[i + 2] = Math.sin(i * 7.173) * 90;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0x93b3d1, size: 0.28, transparent: true, opacity: 0.6
  })));

  // ------------------------------------------------------------------ controls
  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const desiredPosition = new THREE.Vector3(), desiredLook = new THREE.Vector3(), smoothedLook = new THREE.Vector3();

  const OVERVIEW_EYE = new THREE.Vector3(0, 46, 40);
  const OVERVIEW_LOOK = new THREE.Vector3(0, 0, -2);

  function updateProgress() {
    const sections = [...document.querySelectorAll('main section[id]')];
    const markers = [document.getElementById('hero'), document.getElementById('about'), ...articles,
      document.getElementById('skills'), document.getElementById('education'), document.getElementById('contact')];
    const sample = window.scrollY + window.innerHeight * 0.4;
    const anchors = markers.map(el => el.getBoundingClientRect().top + window.scrollY);
    let index = 0;
    while (index < anchors.length - 2 && sample > anchors[index + 1]) index++;
    const portion = THREE.MathUtils.clamp(
      (sample - anchors[index]) / Math.max(anchors[index + 1] - anchors[index], 1), 0, 1);
    progress = (index + portion) / (anchors.length - 1);

    // Resume cards are reverse-chronological; map the one in view back to its
    // geographic hub so the camera and the text always agree.
    const currentArticle = articles.find(el => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.35;
    });
    const experienceSection = document.getElementById('experience');
    const experienceTop = experienceSection
      ? experienceSection.getBoundingClientRect().top + window.scrollY
      : null;
    let nextHub;
    if (currentArticle) {
      const city = currentArticle.querySelector('.timeline-loc').textContent;
      nextHub = stops.findIndex(stop => city.includes(stop.querySelector('.cl-city').textContent));
      if (nextHub < 0) nextHub = 3; // Austin's two engagements share one location hub.
    } else if (experienceTop !== null && sample < experienceTop) {
      nextHub = -1; // Still in the hero / about — hold the whole-country view.
    } else {
      nextHub = Math.min(stops.length - 1, Math.floor(progress * stops.length));
    }
    if (!exploring) activeHub = nextHub;

    const label = sections.filter(el => el.getBoundingClientRect().top < window.innerHeight * 0.45).pop();
    if (!exploring && label && !currentArticle) locationLabel.textContent = label.getAttribute('aria-label');
    else if (activeHub >= 0) locationLabel.textContent = stops[activeHub].querySelector('.cl-city').textContent;

    if (progressBar) {
      progressBar.style.transform =
        `scaleX(${Math.min(1, window.scrollY / Math.max(document.documentElement.scrollHeight - innerHeight, 1))})`;
    }
    scrollDirty = false;
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    resizeDirty = false;
  }

  function cameraTarget() {
    if (activeHub < 0) {
      desiredLook.copy(OVERVIEW_LOOK);
      desiredPosition.copy(OVERVIEW_EYE);
      return;
    }
    const hub = hubPositions[activeHub];
    if (exploring) {
      desiredLook.copy(hub);
      desiredPosition.set(
        hub.x + Math.sin(orbit) * 11,
        hub.y + 5 + orbitTilt * 9,
        hub.z + Math.cos(orbit) * 11
      );
    } else {
      // Hover above and slightly south of the city, so the map recedes north.
      desiredLook.set(hub.x, hub.y + 0.4, hub.z);
      desiredPosition.set(hub.x + 3.2, hub.y + 13, hub.z + 15);
    }
  }

  function render(time = 0) {
    if (failed || disposed) return;
    raf = 0;
    // Cap GPU work at 24fps on phones and 30fps on desktop.
    if (!paused && time - lastDraw < (small.matches ? 1000 / 24 : 1000 / 30)) {
      raf = requestAnimationFrame(render);
      return;
    }
    lastDraw = time;
    if (resizeDirty) resize();
    if (scrollDirty) updateProgress();

    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    if (!paused && !document.hidden) elapsed += dt;

    cameraTarget();
    const blend = reduced.matches || paused ? 1 : 1 - Math.exp(-dt * 3.2);
    camera.position.lerp(desiredPosition, blend);
    smoothedLook.lerp(desiredLook, blend);
    camera.lookAt(smoothedLook);

    if (!paused) {
      rings.forEach((ring, i) => {
        ring.rotation.z = elapsed * (i % 2 ? 0.22 : -0.18) + i;
        ring.scale.setScalar(1 + Math.sin(elapsed * 1.6 + ring.userData.offset * 4) * 0.14);
      });
      hubs.forEach((hub, i) => {
        hub.children[0].rotation.y = elapsed * 0.22 + i;
        hub.children[0].position.y = Math.sin(elapsed * 1.1 + i) * 0.16;
      });
      glows.forEach((glow, i) => {
        glow.scale.setScalar(7.5 * (1 + Math.sin(elapsed * 1.9 + i * 0.7) * 0.16));
      });
      beams.forEach((beam, i) => {
        beam.material.opacity = 0.1 + Math.abs(Math.sin(elapsed * 1.4 + i)) * 0.12;
      });
      sweep.position.z = ((elapsed * 9) % 90) - 45;
    }

    packets.forEach(packet => {
      packet.mesh.position.copy(packet.curve.getPoint((elapsed * 0.12 + packet.offset) % 1));
    });

    if (activeHub >= 0) {
      const hub = hubPositions[activeHub];
      focusPulse.visible = true;
      focusPulse.position.x = hub.x;
      focusPulse.position.z = hub.z;
      const cycle = (elapsed * 0.65) % 1;
      focusPulse.scale.setScalar(1 + cycle * 4.5);
      focusPulse.material.opacity = 0.7 * (1 - cycle);
    } else {
      focusPulse.visible = false;
    }

    renderer.render(scene, camera);
    container.dataset.frames = String(Number(container.dataset.frames || 0) + 1);
    container.dataset.camera = camera.position.toArray().map(n => n.toFixed(2)).join(',');
    if (!paused && !document.hidden) raf = requestAnimationFrame(render);
  }

  function invalidate() { if (!raf && !failed && !disposed) raf = requestAnimationFrame(render); }

  function setPaused(value) {
    paused = value;
    pauseButton.setAttribute('aria-pressed', String(value));
    pauseButton.textContent = value ? 'Resume motion' : 'Pause motion';
    status.textContent = value ? '3D map · Motion paused' : 'Live 3D career map';
    lastTime = performance.now();
    invalidate();
  }

  function setExplore(value) {
    exploring = value;
    document.body.classList.toggle('world-exploring', value);
    exploreButton.setAttribute('aria-pressed', String(value));
    exploreButton.textContent = value ? 'Back to resume' : 'Explore 3D';
    orbitControls.hidden = !value;
    instruction.textContent = value
      ? 'Drag to orbit the city. Click a hub to read its experience. Escape returns to the resume.'
      : 'Scroll to travel the map — each stop is a real city.';
    const main = document.querySelector('main');
    if (main) main.inert = value;
    if (value) {
      if (activeHub < 0) activeHub = 0;
      locationLabel.textContent = stops[activeHub].querySelector('.cl-city').textContent;
    }
    scrollDirty = true;
    invalidate();
  }

  exploreButton.disabled = false;
  pauseButton.disabled = false;
  exploreButton.addEventListener('click', () => setExplore(!exploring));
  pauseButton.addEventListener('click', () => setPaused(!paused));

  const cycle = amount => {
    activeHub = (Math.max(0, activeHub) + amount + hubs.length) % hubs.length;
    locationLabel.textContent = stops[activeHub].querySelector('.cl-city').textContent;
    invalidate();
  };
  document.getElementById('world-prev').addEventListener('click', () => cycle(-1));
  document.getElementById('world-next').addEventListener('click', () => cycle(1));
  document.getElementById('world-turn').addEventListener('click', () => {
    orbit += Math.PI / 4;
    invalidate();
  });

  document.querySelectorAll('#main-nav a').forEach(link => {
    link.addEventListener('click', () => { if (exploring) setExplore(false); });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && exploring) { setExplore(false); exploreButton.focus(); }
  });

  container.addEventListener('pointerdown', event => {
    if (!exploring) return;
    dragging = true;
    pointerStart = { x: event.clientX, y: event.clientY, moved: false };
    container.setPointerCapture(event.pointerId);
  });
  container.addEventListener('pointermove', event => {
    if (!exploring || !dragging) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) pointerStart.moved = true;
    orbit -= dx * 0.006;
    orbitTilt = THREE.MathUtils.clamp(orbitTilt + dy * 0.004, -0.2, 0.9);
    pointerStart.x = event.clientX;
    pointerStart.y = event.clientY;
    invalidate();
  });
  container.addEventListener('pointerup', event => {
    dragging = false;
    if (!exploring || !pointerStart || pointerStart.moved) return;
    pointer.set(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(clickable)[0];
    if (hit) {
      const city = stops[hit.object.userData.hubIndex].querySelector('.cl-city').textContent;
      const article = articles.find(el => el.querySelector('.timeline-loc').textContent.includes(city));
      setExplore(false);
      if (article) article.scrollIntoView({
        behavior: reduced.matches ? 'instant' : 'smooth', block: 'center'
      });
    }
  });
  container.addEventListener('pointercancel', () => { dragging = false; });

  window.addEventListener('scroll', () => { scrollDirty = true; invalidate(); }, { passive: true });
  window.addEventListener('resize', () => { resizeDirty = true; scrollDirty = true; invalidate(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
    else { lastTime = performance.now(); invalidate(); }
  });
  reduced.addEventListener('change', () => setPaused(reduced.matches));

  // All meshes are procedural; every label comes from existing career content.
  container.dataset.ready = 'true';
  container.dataset.hubs = String(hubs.length);
  container.dataset.map = typeof US_STATES === 'object' ? 'us-states' : 'missing';

  updateProgress();
  resize();
  cameraTarget();
  camera.position.copy(desiredPosition);
  smoothedLook.copy(desiredLook);
  setPaused(paused);

  window.addEventListener('pagehide', event => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (event.persisted) return;
    disposed = true;
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) {
        (Array.isArray(object.material) ? object.material : [object.material])
          .forEach(material => materials.add(material));
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose());
    renderer.dispose();
  });
  window.addEventListener('pageshow', () => { lastTime = performance.now(); invalidate(); });
})();
