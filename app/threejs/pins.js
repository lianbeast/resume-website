/**
 * Three.js Pins Module
 * Handles city nodes (hub/career/decorative), career path lines, and data packets
 * Depends on ThreeJSMap module being initialized first
 */

(function() {
  'use strict';

  // City coordinates
  const CITIES = {
    Bethesda:    { lon: -77.09, lat: 39.02, label: 'Bethesda, MD' },
    Martinsburg: { lon: -77.97, lat: 39.55, label: 'Martinsburg, WV' },
    Austin:      { lon: -97.74, lat: 30.27, label: 'Austin, TX' },
    Spokane:     { lon: -117.43, lat: 47.66, label: 'Spokane, WA' },
    Miami:       { lon: -80.19, lat: 25.76, label: 'Miami, FL' },
    Hammond:     { lon: -90.46, lat: 30.50, label: 'Hammond, LA' },
    Memphis:     { lon: -90.05, lat: 35.15, label: 'Memphis, TN' },
    Birmingham:  { lon: -86.80, lat: 33.52, label: 'Birmingham, AL' },
    Atlanta:     { lon: -84.39, lat: 33.75, label: 'Atlanta, GA' },
    Montgomery:  { lon: -86.30, lat: 32.37, label: 'Montgomery, AL' },
    Mobile:      { lon: -88.04, lat: 30.70, label: 'Mobile, AL' },
    'DC, MD, VA': { lon: -77.04, lat: 38.90, label: 'Washington, DC' },
  };

  // Extra pins (non-career-path)
  const EXTRA_PINS = [
    { city: 'Mobile', label: 'Mobile, AL' },
  ];

  // Private state
  let mapGroup = null;
  let cityNodeData = {};
  let hubPoints = null;
  let careerPoints = null;
  let decoPoints = null;
  let pathSegments = null;
  let packetGeo = null;
  let packetMat = null;
  let packetData = [];
  let pinMat = null;

  // Animation state
  let isDark = false;

  function initPins() {
    if (!window.ThreeJSMap) {
      console.warn('ThreeJSMap not initialized, skipping pins');
      return;
    }

    mapGroup = window.ThreeJSMap.getMapGroup();
    const project = window.ThreeJSMap.getProject();
    const BRAND = window.ThreeJSMap.getBRAND();

    // Parse career path from DOM (single source of truth)
    const careerList = document.querySelectorAll('#career-locations .career-locations__list li');
    const CAREER_PATH = Array.from(careerList).map(li => {
      const rawCity = li.querySelector('.cl-city')?.textContent?.trim() || '';
      let city = rawCity;
      for (const key of Object.keys(CITIES)) {
        if (rawCity.startsWith(key)) {
          city = key;
          break;
        }
      }
      const era = li.querySelector('.cl-era')?.textContent?.trim() || '';
      const role = li.querySelector('.cl-role')?.textContent?.trim() || '';
      return { city, role, era };
    });

    const primaryC = new THREE.Color(BRAND.primary);
    const secondaryC = new THREE.Color(BRAND.secondary);
    const hubC = new THREE.Color(BRAND.primaryLight);

    const careerCities = new Set(CAREER_PATH.map(s => s.city));
    const currentCity = CAREER_PATH[CAREER_PATH.length - 1].city;

    // Build node arrays
    const hubPositions = [], hubColors = [], hubSizes = [];
    const careerPositions = [], careerColors = [], careerSizes = [];
    const decoPositions = [], decoColors = [], decoSizes = [];

    Object.keys(CITIES).forEach(key => {
      const c = CITIES[key];
      const [x, y] = project(c.lon, c.lat);
      const inPath = careerCities.has(key);
      const isHub = key === currentCity;

      let group, col, sz, innerColor;
      if (isHub) {
        group = 'hub';
        col = hubC;
        sz = 6.0;
        innerColor = new THREE.Color(0xffffff);
      } else if (inPath) {
        group = 'career';
        col = primaryC;
        sz = 4.0;
        innerColor = new THREE.Color(BRAND.primaryLight);
      } else {
        group = 'decorative';
        col = secondaryC;
        sz = 3.0;
        innerColor = new THREE.Color(0xffffff);
      }

      let idxInGroup, positions, colors, sizes;
      if (group === 'hub') {
        idxInGroup = hubPositions.length / 3;
        positions = hubPositions; colors = hubColors; sizes = hubSizes;
      } else if (group === 'career') {
        idxInGroup = careerPositions.length / 3;
        positions = careerPositions; colors = careerColors; sizes = careerSizes;
      } else {
        idxInGroup = decoPositions.length / 3;
        positions = decoPositions; colors = decoColors; sizes = decoSizes;
      }

      positions.push(x, y, 0);
      colors.push(col.r, col.g, col.b);
      sizes.push(sz);
      cityNodeData[key] = { x, y, baseSize: sz, isHub, group, idxInGroup, innerColor };
    });

    // Add extra pins
    EXTRA_PINS.forEach(pin => {
      const c = CITIES[pin.city];
      const [x, y] = project(c.lon, c.lat);
      const idxInGroup = decoPositions.length / 3;
      decoPositions.push(x, y, 0);
      decoColors.push(secondaryC.r, secondaryC.g, secondaryC.b);
      decoSizes.push(3.0);
      cityNodeData[pin.city] = { x, y, baseSize: 3.0, isHub: false, group: 'decorative', idxInGroup, innerColor: new THREE.Color(0xffffff) };
    });

    // Create pin shader material
    pinMat = new THREE.ShaderMaterial({
      uniforms: { uInnerColor: { value: new THREE.Color(0xffffff) } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (80.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uInnerColor;
        varying vec3 vColor;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);
          if (d > 0.5) discard;
          vec3 c = (d < 0.18) ? uInnerColor : vColor;
          float alpha = smoothstep(0.5, 0.46, d);
          gl_FragColor = vec4(c, alpha);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    function makePinPoints(positions, colors, sizes, innerColorHex) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
      geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
      const mat = pinMat.clone();
      mat.uniforms.uInnerColor.value.set(innerColorHex);
      return new THREE.Points(geo, mat);
    }

    hubPoints = makePinPoints(hubPositions, hubColors, hubSizes, 0xffffff);
    careerPoints = makePinPoints(careerPositions, careerColors, careerSizes, BRAND.primaryLight);
    decoPoints = makePinPoints(decoPositions, decoColors, decoSizes, 0xffffff);
    mapGroup.add(hubPoints);
    mapGroup.add(careerPoints);
    mapGroup.add(decoPoints);

    // Career path connection lines
    const pathPositions = [];
    const pathColors = [];
    CAREER_PATH.forEach((stop, i) => {
      if (i === 0) return;
      const prev = CAREER_PATH[i - 1];
      const a = cityNodeData[prev.city];
      const b = cityNodeData[stop.city];
      if (!a || !b) return;
      const [ax, ay] = project(CITIES[prev.city].lon, CITIES[prev.city].lat);
      const [bx, by] = project(CITIES[stop.city].lon, CITIES[stop.city].lat);
      pathPositions.push(ax, ay, 0.1);
      pathPositions.push(bx, by, 0.1);
      const t = i / (CAREER_PATH.length - 1);
      const col = new THREE.Color().lerpColors(primaryC, secondaryC, t);
      pathColors.push(col.r, col.g, col.b);
      pathColors.push(col.r, col.g, col.b);
    });

    const pathGeo = new THREE.BufferGeometry();
    pathGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pathPositions), 3));
    pathGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pathColors), 3));

    const pathMat = new THREE.LineDashedMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      dashSize: 1.5,
      gapSize: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    pathSegments = new THREE.LineSegments(pathGeo, pathMat);
    mapGroup.add(pathSegments);
    pathSegments.computeLineDistances();

    // Tell map module about path segments for theme updates
    window.ThreeJSMap.setPathSegments(pathSegments);

    // Data packets
    const PACKET_COUNT = 25;
    const packetPositions = new Float32Array(PACKET_COUNT * 3);
    const packetSizes = new Float32Array(PACKET_COUNT);

    for (let i = 0; i < PACKET_COUNT; i++) {
      packetData.push({
        segment: i % (CAREER_PATH.length - 1),
        progress: Math.random(),
        speed: 0.15 + Math.random() * 0.25,
        forward: Math.random() > 0.3,
      });
      packetSizes[i] = 1.5 + Math.random() * 0.8;
    }

    packetGeo = new THREE.BufferGeometry();
    packetGeo.setAttribute('position', new THREE.BufferAttribute(packetPositions, 3));
    packetGeo.setAttribute('size', new THREE.BufferAttribute(packetSizes, 1));

    function makeGlowTexture() {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(canvas);
    }
    const nodeTex = makeGlowTexture();

    packetMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: nodeTex },
        uColor: { value: new THREE.Color(BRAND.primary) },
      },
      vertexShader: `
        attribute float size;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (80.0 / -mvPos.z);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        void main() {
          gl_FragColor = vec4(uColor, 0.9) * texture2D(uTexture, gl_PointCoord);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    mapGroup.add(new THREE.Points(packetGeo, packetMat));

    // Tell map module about packet mat for theme updates
    window.ThreeJSMap.setPacketMat(packetMat);

    // Surface mesh (land tint plane)
    const surfaceGeo = new THREE.PlaneGeometry(120, 120);
    const surfaceMat = new THREE.MeshBasicMaterial({
      color: BRAND.primary,
      transparent: true,
      opacity: 0.05,
      side: THREE.FrontSide,
      depthWrite: false,
    });
    const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
    surfaceMesh.rotation.x = -Math.PI / 2;
    mapGroup.add(surfaceMesh);
    window.ThreeJSMap.setSurfaceMesh(surfaceMesh);

    // State boundary lines
    const stateLinePts = [];
    (typeof US_STATES === 'object' ? Object.keys(US_STATES) : []).forEach(name => {
      const rings = US_STATES[name];
      rings.forEach(ring => {
        if (ring.length < 3) return;
        const pts = ring.map(([lon, lat]) => {
          const [x, y] = project(lon, lat);
          return new THREE.Vector3(x, y, 0);
        });
        for (let i = 0; i < pts.length; i++) {
          stateLinePts.push(pts[i], pts[(i + 1) % pts.length]);
        }
      });
    });

    const stateLineGeo = new THREE.BufferGeometry().setFromPoints(stateLinePts);
    const stateLineMat = new THREE.LineBasicMaterial({
      color: BRAND.primary,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    mapGroup.add(new THREE.LineSegments(stateLineGeo, stateLineMat));

    // Initial theme sync
    window.ThreeJSMap.updateBrandColors();

    // Mark enhanced
    window.ThreeJSMap.getContainer().classList.add('is-enhanced');

    // Expose for animation module
    window.ThreeJSPins = {
      cityNodeData,
      hubPoints,
      careerPoints,
      decoPoints,
      pathSegments,
      packetGeo,
      packetMat,
      packetData,
      CAREER_PATH,
      CITIES,
      project,
      animateNodes,
      animatePackets,
    };
  }

  function animateNodes(time) {
    isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    Object.keys(cityNodeData).forEach((key, i) => {
      const nd = cityNodeData[key];
      const amp = nd.isHub ? 0.08 : 0.30;
      const pulse = Math.sin(time * 0.8 + i * 0.7) * amp + (nd.isHub ? 0.92 : 0.70);
      const finalPulse = isDark ? (nd.isHub ? 0.98 : 0.85) : pulse;
      const pts = nd.group === 'hub' ? hubPoints : (nd.group === 'career' ? careerPoints : decoPoints);
      pts.geometry.attributes.size.array[nd.idxInGroup] = nd.baseSize * finalPulse;
      pts.geometry.attributes.size.needsUpdate = true;
    });
  }

  function animatePackets(time) {
    const { CAREER_PATH, CITIES, project, packetGeo, packetData: data } = window.ThreeJSPins;
    for (let i = 0; i < data.length; i++) {
      const p = data[i];
      const segIdx = p.segment;
      const a = CAREER_PATH[segIdx];
      const b = CAREER_PATH[segIdx + 1];
      if (!a || !b) continue;
      const [ax, ay] = project(CITIES[a.city].lon, CITIES[a.city].lat);
      const [bx, by] = project(CITIES[b.city].lon, CITIES[b.city].lat);

      p.progress += p.speed * 0.005;
      if (p.progress >= 1) {
        p.progress = 0;
        p.segment = (p.segment + 1) % (CAREER_PATH.length - 1);
      }

      const t = p.forward ? p.progress : (1 - p.progress);
      const positions = packetGeo.attributes.position.array;
      positions[i * 3]     = ax + (bx - ax) * t;
      positions[i * 3 + 1] = ay + (by - ay) * t;
      positions[i * 3 + 2] = 0.2;
    }
    packetGeo.attributes.position.needsUpdate = true;
  }

  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPins);
  } else {
    initPins();
  }
})();