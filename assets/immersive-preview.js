(() => {
  'use strict';
  const container = document.getElementById('immersive-world');
  const status = document.getElementById('world-status');
  const locationLabel = document.getElementById('journey-location');
  const instruction = document.getElementById('journey-instruction');
  const exploreButton = document.getElementById('world-explore');
  const pauseButton = document.getElementById('world-pause');
  const orbitControls = document.querySelector('.orbit-controls');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 768px)');
  const stops = [...document.querySelectorAll('.career-locations__list li')];
  const articles = [...document.querySelectorAll('.timeline-item')];
  let renderer, raf = 0, disposed = false, failed = false;
  let paused = reduced.matches, exploring = false, progress = 0, activeHub = -1;
  let orbit = 0.4, orbitTilt = 0.3, dragging = false, pointerStart = null;
  let lastTime = 0, lastDraw = 0, elapsed = 0, scrollDirty = true, resizeDirty = true;
  function fallback() {
    failed = true;
    if (raf) cancelAnimationFrame(raf);
    if (renderer) renderer.dispose();
    document.body.classList.remove('world-exploring');
    document.querySelector('main').inert = false;
    document.body.classList.add('world-unavailable');
    status.textContent = 'Reading mode · 3D unavailable';
    instruction.textContent = 'Your complete resume is available below.';
    exploreButton.disabled = true;
    pauseButton.disabled = true;
  }
  if (!container || typeof THREE === 'undefined') { fallback(); return; }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080e16);
  scene.fog = new THREE.FogExp2(0x080e16, 0.015);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !small.matches, powerPreference: 'low-power' });
  } catch (error) { fallback(); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small.matches ? 1.25 : 1.75));
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });
  scene.add(new THREE.AmbientLight(0x8ba5c4, 0.7));
  const keyLight = new THREE.DirectionalLight(0xffc5a6, 1.8);
  keyLight.position.set(12, 22, 18);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x52cedb, 1.1);
  fillLight.position.set(-18, 10, -30);
  scene.add(fillLight);

  const network = new THREE.Group();
  scene.add(network);
  const hubPositions = stops.map((_, i) => new THREE.Vector3(Math.sin(i * 1.3) * 11, Math.cos(i * 0.8) * 3, -i * 18));
  const hubs = [], rings = [], clickable = [], textures = [];
  const sphereGeometry = new THREE.IcosahedronGeometry(1.15, 1);
  const ringGeometry = new THREE.TorusGeometry(2.35, 0.035, 8, 64);
  const towerGeometry = new THREE.BoxGeometry(0.5, 3.5, 0.5);
  const satelliteGeometry = new THREE.OctahedronGeometry(0.28);
  function labelSprite(text, subtext) {
    const canvas = document.createElement('canvas');
    canvas.width = 768; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(5,12,20,0.85)'; ctx.fillRect(0, 0, 768, 180);
    ctx.fillStyle = '#64d7db'; ctx.fillRect(0, 0, 4, 180);
    ctx.font = '500 44px sans-serif'; ctx.fillStyle = '#edf3f8'; ctx.fillText(text, 28, 72);
    ctx.font = '26px monospace'; ctx.fillStyle = '#a9bacb'; ctx.fillText(subtext, 28, 126);
    const texture = new THREE.CanvasTexture(canvas); textures.push(texture);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(12, 2.8, 1); return sprite;
  }
  stops.forEach((stop, i) => {
    const group = new THREE.Group(); group.position.copy(hubPositions[i]);
    const material = new THREE.MeshStandardMaterial({ color: i === stops.length - 1 ? 0xff956b : 0x64d7db, metalness: 0.7, roughness: 0.28, emissive: i === stops.length - 1 ? 0x9a3614 : 0x0a6470, emissiveIntensity: 0.75 });
    const core = new THREE.Mesh(sphereGeometry, material); core.userData.hubIndex = i;
    group.add(core); clickable.push(core);
    const wire = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0xffc5a6, wireframe: true, transparent: true, opacity: 0.3 }));
    wire.scale.setScalar(1.04); group.add(wire);
    for (let j = 0; j < 3; j++) {
      const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: j === 0 ? 0xff956b : 0x64d7db, transparent: true, opacity: 0.55 }));
      ring.rotation.set(j * 0.65 + 0.6, j * 0.9, 0.4); group.add(ring); rings.push(ring);
    }
    for (let j = 0; j < 6; j++) {
      const angle = j / 6 * Math.PI * 2;
      const tower = new THREE.Mesh(towerGeometry, new THREE.MeshStandardMaterial({ color: 0x203d54, metalness: 0.6, roughness: 0.5 }));
      tower.position.set(Math.cos(angle) * 4.8, -2.7, Math.sin(angle) * 4.8);
      group.add(tower);
      const satellite = new THREE.Mesh(satelliteGeometry, new THREE.MeshBasicMaterial({ color: 0x64d7db }));
      satellite.position.copy(tower.position); satellite.position.y += 2.2; group.add(satellite);
      const connection = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), satellite.position]);
      group.add(new THREE.Line(connection, new THREE.LineBasicMaterial({ color: 0x64d7db, transparent: true, opacity: 0.22 })));
    }
    const city = stop.querySelector('.cl-city').textContent;
    const era = stop.querySelector('.cl-era').textContent;
    const label = labelSprite(city, era); label.position.set(0, 4.5, 0); group.add(label);
    network.add(group); hubs.push(group);
  });

  const packets = [];
  const packetGeometry = new THREE.SphereGeometry(0.12, 6, 6);
  for (let i = 0; i < hubPositions.length - 1; i++) {
    const from = hubPositions[i], to = hubPositions[i + 1];
    const mid = from.clone().lerp(to, 0.5); mid.y += 5;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    network.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.045, 5, false), new THREE.MeshBasicMaterial({ color: 0x64d7db, transparent: true, opacity: 0.45 })));
    for (let j = 0; j < 4; j++) {
      const mesh = new THREE.Mesh(packetGeometry, new THREE.MeshBasicMaterial({ color: 0xffb68f }));
      network.add(mesh); packets.push({ mesh, curve, offset: j / 4 });
    }
  }
  const grid = new THREE.GridHelper(240, 80, 0x26465c, 0x162b3c);
  grid.position.set(0, -6, -50); grid.material.transparent = true; grid.material.opacity = 0.6; scene.add(grid);
  const starPositions = new Float32Array((small.matches ? 400 : 1000) * 3);
  for (let i = 0; i < starPositions.length; i += 3) {
    starPositions[i] = Math.sin(i * 12.9898) * 65;
    starPositions[i + 1] = Math.cos(i * 4.1414) * 35;
    starPositions[i + 2] = -((i * 7.173) % 180) + 25;
  }
  const stars = new THREE.BufferGeometry(); stars.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0x93b3d1, size: 0.085, transparent: true, opacity: 0.65 })));

  const pointer = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const desiredPosition = new THREE.Vector3(), desiredLook = new THREE.Vector3(), smoothedLook = new THREE.Vector3();
  function updateProgress() {
    const sections = [...document.querySelectorAll('main section[id]')];
    const markers = [document.getElementById('hero'), document.getElementById('about'), ...articles, document.getElementById('skills'), document.getElementById('education'), document.getElementById('contact')];
    const sample = window.scrollY + window.innerHeight * 0.4;
    const anchors = markers.map(el => el.getBoundingClientRect().top + window.scrollY);
    let index = 0;
    while (index < anchors.length - 2 && sample > anchors[index + 1]) index++;
    const portion = THREE.MathUtils.clamp((sample - anchors[index]) / Math.max(anchors[index + 1] - anchors[index], 1), 0, 1);
    progress = (index + portion) / (anchors.length - 1);
    // Reverse chronological resume cards map back to their matching career hubs.
    const currentArticle = [...document.querySelectorAll('.timeline-item')].find(el => {
      const rect = el.getBoundingClientRect(); return rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.35;
    });
    let nextHub;
    if (currentArticle) {
      const city = currentArticle.querySelector('.timeline-loc').textContent;
      nextHub = stops.findIndex(stop => city.includes(stop.querySelector('.cl-city').textContent));
      if (nextHub < 0) nextHub = 3; // Austin's two engagements share one location hub.
    } else {
      nextHub = Math.min(stops.length - 1, Math.floor(progress * stops.length));
    }
    if (!exploring) activeHub = nextHub;
    const label = sections.filter(el => el.getBoundingClientRect().top < window.innerHeight * 0.45).pop();
    if (!exploring && label && !currentArticle) locationLabel.textContent = label.getAttribute('aria-label');
    else if (activeHub >= 0) locationLabel.textContent = stops[activeHub].querySelector('.cl-city').textContent;
    document.getElementById('journey-progress-bar').style.transform = `scaleX(${Math.min(1, window.scrollY / Math.max(document.documentElement.scrollHeight - innerHeight, 1))})`;
    scrollDirty = false;
  }
  function resize() {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); resizeDirty = false;
  }
  function cameraTarget() {
    const hub = hubPositions[Math.max(0, activeHub)];
    if (exploring) {
      desiredLook.copy(hub);
      desiredPosition.set(hub.x + Math.sin(orbit) * 15, hub.y + 4 + orbitTilt * 8, hub.z + Math.cos(orbit) * 15);
    } else {
      // Career hubs become spatial waypoints as their original resume entries enter view.
      desiredLook.copy(hub).add(new THREE.Vector3(small.matches ? 0 : -7, 0, 0));
      desiredPosition.copy(hub).add(new THREE.Vector3(small.matches ? 4 : 1, 5, small.matches ? 30 : 22));
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
    const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time;
    if (!paused && !document.hidden) elapsed += dt;
    cameraTarget();
    const blend = reduced.matches || paused ? 1 : 1 - Math.exp(-dt * 5);
    camera.position.lerp(desiredPosition, blend);
    smoothedLook.lerp(desiredLook, blend); camera.lookAt(smoothedLook);
    if (!paused) {
      rings.forEach((ring, i) => { ring.rotation.z = elapsed * (i % 2 ? 0.15 : -0.12) + i; });
      hubs.forEach((hub, i) => { hub.children[0].rotation.y = elapsed * 0.15 + i; });
    }
    packets.forEach(packet => packet.mesh.position.copy(packet.curve.getPoint((elapsed * 0.14 + packet.offset) % 1)));
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
    status.textContent = value ? '3D network · Motion paused' : 'Live 3D career network';
    lastTime = performance.now(); invalidate();
  }
  function setExplore(value) {
    exploring = value;
    document.body.classList.toggle('world-exploring', value);
    exploreButton.setAttribute('aria-pressed', String(value));
    exploreButton.textContent = value ? 'Back to resume' : 'Explore 3D';
    orbitControls.hidden = !value;
    instruction.textContent = value ? 'Drag to orbit. Click a hub to read its experience. Escape returns to the resume.' : 'Scroll to travel through the network.';
    const main = document.querySelector('main');
    main.inert = value;
    if (value) locationLabel.textContent = stops[Math.max(0, activeHub)].querySelector('.cl-city').textContent;
    scrollDirty = true; invalidate();
  }
  exploreButton.disabled = false; pauseButton.disabled = false;
  exploreButton.addEventListener('click', () => setExplore(!exploring));
  pauseButton.addEventListener('click', () => setPaused(!paused));
  const cycle = amount => {
    activeHub = (Math.max(0, activeHub) + amount + hubs.length) % hubs.length;
    locationLabel.textContent = stops[activeHub].querySelector('.cl-city').textContent; invalidate();
  };
  document.getElementById('world-prev').addEventListener('click', () => cycle(-1));
  document.getElementById('world-next').addEventListener('click', () => cycle(1));
  document.getElementById('world-turn').addEventListener('click', () => { orbit += Math.PI / 4; invalidate(); });
  document.querySelectorAll('#main-nav a').forEach(link => {
    link.addEventListener('click', () => { if (exploring) setExplore(false); });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && exploring) { setExplore(false); exploreButton.focus(); }
  });
  container.addEventListener('pointerdown', event => {
    if (!exploring) return;
    dragging = true; pointerStart = { x: event.clientX, y: event.clientY, moved: false };
    container.setPointerCapture(event.pointerId);
  });
  container.addEventListener('pointermove', event => {
    if (!exploring || !dragging) return;
    const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) pointerStart.moved = true;
    orbit -= dx * 0.006; orbitTilt = THREE.MathUtils.clamp(orbitTilt + dy * 0.004, -0.2, 0.9);
    pointerStart.x = event.clientX; pointerStart.y = event.clientY; invalidate();
  });
  container.addEventListener('pointerup', event => {
    dragging = false;
    if (!exploring || !pointerStart || pointerStart.moved) return;
    pointer.set(event.clientX / innerWidth * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(clickable)[0];
    if (hit) {
      const city = stops[hit.object.userData.hubIndex].querySelector('.cl-city').textContent;
      const article = [...document.querySelectorAll('.timeline-item')].find(el => el.querySelector('.timeline-loc').textContent.includes(city));
      setExplore(false);
      if (article) article.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'center' });
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
  // All meshes are procedural and all labels come from existing career content.
  container.dataset.ready = 'true';
  container.dataset.hubs = String(hubs.length);
  updateProgress(); resize(); cameraTarget(); camera.position.copy(desiredPosition); smoothedLook.copy(desiredLook);
  setPaused(paused);
  window.addEventListener('pagehide', event => {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (event.persisted) return;
    disposed = true;
    const geometries = new Set(), materials = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
    });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    textures.forEach(texture => texture.dispose()); renderer.dispose();
  });
  window.addEventListener('pageshow', () => { lastTime = performance.now(); invalidate(); });
})();
