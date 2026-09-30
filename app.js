    // ================================================================
    // THREE.JS US MAP SCENE — career location network
    // ================================================================
    function initThreeJSMap() {
      // ================================================================
      // THREE.JS US MAP SCENE — career location network
      // ================================================================
      (function() {
        'use strict';

        if (typeof THREE === 'undefined') { bail(); return; }
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) { bail(); return; }

        const container = document.getElementById('scene-container');
        // Bail path: keep the readable #career-locations fallback visible (is-bailed
        // flips it from clipped to static) — mirrors the no-js rendering exactly.
        const bail = () => container && container.classList.add('is-bailed');

      // ---- Brand colors sourced from CSS tokens ----
      // Reads the live palette so dark mode + style toggles flow into the map
      // without re-hardcoding hex in JS. DESIGN.md "capture the live terracotta
      // system" rule. Re-resolve on theme/style change.
      function cssVar(name, fallback) {
        const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return v || fallback;
      }
      function hexToInt(hex) {
        return parseInt(hex.replace('#', ''), 16);
      }
      const BRAND = {
        primary: hexToInt(cssVar('--gold', '#c2410c')),
        primaryLight: hexToInt(cssVar('--gold-light', '#e06a3a')),
        secondary: hexToInt(cssVar('--teal', '#0e7490')),
        ink: hexToInt(cssVar('--text', '#1c1917')),
      };

      // ---- Scene setup ----
      // Wrap the map geometry in its own group so parallax/rotation tilt the
      // map only, not any sibling scene content.
      const mapGroup = new THREE.Group();
      const scene = new THREE.Scene();
      scene.add(mapGroup);
      const isMobile = window.innerWidth < 768;
      const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      window.camera = camera;

      // Map lon/lat → 3D coords (Albers-ish projection, simplified)
      // Center on US center (~ -98, 39.5), scale to fit view
      const MAP_CX = -98, MAP_CY = 39.5;
      const SCALE = 1.8; // fits lower-48 nicely in FOV 60 at z=50
      function project(lon, lat) {
        const x = (lon - MAP_CX) * SCALE * Math.cos(lat * Math.PI / 180);
        const y = (lat - MAP_CY) * SCALE;
        return [x, y];
      }

      // Pull camera back on small screens so the map reads ambient, not dominant
      camera.position.set(0, 0, isMobile ? 66 : 50);
      camera.lookAt(0, 0, 0);

      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (e) {
        // No WebGL — bail to the readable locations fallback instead of dying mid-IIFE
        bail();
        return;
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      // Solid page-background clear color (not transparent) — keeps the faint
      // surface tint uniform instead of compositing over varying page content,
      // which caused per-triangle shading seams on concave shapes.
      function updateClearColor() {
        renderer.setClearColor(hexToInt(cssVar('--bg', '#f7f5f0')));
      }
      updateClearColor();
      // Re-sync on theme change
      const themeObserver = new MutationObserver(() => {
        updateClearColor();
        updateBrandColors();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

      // ---- Dark mode tone support ----
      // In dark mode, dim the map so it reads as ambient topology (not a bright signal map)
      function updateBrandColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        // Re-resolve brand colors live so style toggles flow into the map
        const cur = {
          primary: hexToInt(cssVar('--gold', '#c2410c')),
          primaryLight: hexToInt(cssVar('--gold-light', '#e06a3a')),
          secondary: hexToInt(cssVar('--teal', '#0e7490')),
        };
        const primaryC = new THREE.Color(cur.primary);
        const secondaryC = new THREE.Color(cur.secondary);
        const hubC = new THREE.Color(cur.primaryLight);

        if (isDark) {
          // Dark mode: dim opacities, desaturate colors
          if (surfaceMesh) surfaceMesh.material.opacity = 0.02;
          if (mapGroup.children[1] && mapGroup.children[1].material) {
            mapGroup.children[1].material.opacity = 0.1;
          }
          if (pathSegments) pathSegments.material.opacity = 0.2;
          // Dim packet color
          if (packetMat) packetMat.uniforms.uColor.value = new THREE.Color(BRAND.primary).multiplyScalar(0.7);
          // Dim node pulses (handled in animateNodes via isDark flag)
        } else {
          // Light mode: full vibrancy
          if (surfaceMesh) surfaceMesh.material.opacity = 0.05;
          if (mapGroup.children[1] && mapGroup.children[1].material) {
            mapGroup.children[1].material.opacity = 0.22;
          }
          if (pathSegments) pathSegments.material.opacity = 0.45;
          if (packetMat) packetMat.uniforms.uColor.value = new THREE.Color(BRAND.primary);
        }
        // Skill ring: re-derive per-node color from CAT_COLORS so dark mode re-tones
        // ponytail: try/catch, not typeof — typeof THROWS on a TDZ const (SKILLS is
        // declared below this call site), so typeof-guard crashed the whole script.
        // Init-time pass skips ring tones; initRingNodes() re-derives them anyway.
        try {
          SKILLS.forEach(function(s) {
            const base = CAT_COLORS[s.cat];
            s.color = isDark
              ? '#' + new THREE.Color(base).multiplyScalar(0.75).getHexString()
              : base;
          });
        } catch (e) { /* SKILLS not yet declared — skip */ }
      }

      container.appendChild(renderer.domElement);

      // Call initial after surfaceMesh, pathSegments, packetMat are defined
      updateBrandColors();

      // ---------------------------------------------------------------
      // GOOGLE-MAPS-STYLE STATE OUTLINES + LIGHTEST LAND SURFACE
      // US_STATES (from states.js) = { StateName: [ [ring], [ring]... ] }
      // each ring = array of [lon, lat]. Rendered with project().
      // ---------------------------------------------------------------
      const stateLinePts = [];
      (typeof US_STATES === 'object' ? Object.keys(US_STATES) : []).forEach(name => {
        const rings = US_STATES[name];
        rings.forEach(ring => {
          if (ring.length < 3) return;
          const pts = ring.map(([lon, lat]) => {
            const [x, y] = project(lon, lat);
            return new THREE.Vector3(x, y, 0);
          });
          // -- Outline line (segmented, folded into one geometry) --
          for (let i = 0; i < pts.length; i++) {
            stateLinePts.push(pts[i], pts[(i + 1) % pts.length]);
          }
        });
      });

      // Single land-tint plane behind the state outlines.
      // (A single PlaneGeometry renders one uniform color — avoids the
      // per-triangle shading/seam artifacts that ShapeGeometry's earcut
      // triangulation produces on concave state polygons.)
      const surfaceGeo = new THREE.PlaneGeometry(120, 120);
      const surfaceMat = new THREE.MeshBasicMaterial({
        color: BRAND.primary,
        transparent: true,
        opacity: 0.05,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      var surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
      surfaceMesh.rotation.x = -Math.PI / 2; // face the camera (plane normal = +Z by default)
      mapGroup.add(surfaceMesh);

      // State boundary lines — thin, terracotta, Google-Maps subtle
      const stateLineGeo = new THREE.BufferGeometry().setFromPoints(stateLinePts);
      const stateLineMat = new THREE.LineBasicMaterial({
        color: BRAND.primary,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      mapGroup.add(new THREE.LineSegments(stateLineGeo, stateLineMat));

      // ---- Career location nodes ----
      // lon/lat for each city
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

      // Career path (chronological) — parsed from the a11y fallback list (#career-locations)
      // Single source of truth: the HTML list is the authoritative data.
      const careerList = document.querySelectorAll('#career-locations .career-locations__list li');
      const CAREER_PATH = Array.from(careerList).map(li => {
        const rawCity = li.querySelector('.cl-city')?.textContent?.trim() || '';
        // Match against CITIES keys directly (handles multi-word keys like 'DC, MD, VA')
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

      // Additional pin locations (not in career path timeline, but shown as pins)
      const EXTRA_PINS = [
        { city: 'Mobile', label: 'Mobile, AL' },
      ];

      // ---- City nodes: three groups (hub / career / decorative) ----
      // Each group = separate Points, each with pinMat clone + its own uInnerColor.
      // Baseline sizes bumped so pins read as Google-Maps markers, not glow specks.
      const hubPositions = [], hubColors = [], hubSizes = [];
      const careerPositions = [], careerColors = [], careerSizes = [];
      const decoPositions = [], decoColors = [], decoSizes = [];

      const cityNodeData = {}; // key → {pos, pulse, group, idxInGroup}
      const primaryC = new THREE.Color(BRAND.primary);
      const secondaryC = new THREE.Color(BRAND.secondary);
      const hubC = new THREE.Color(BRAND.primaryLight);

      const careerCities = new Set(CAREER_PATH.map(s => s.city));
      const currentCity = CAREER_PATH[CAREER_PATH.length - 1].city;

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
          innerColor = new THREE.Color(0xffffff); // white inner dot
        } else if (inPath) {
          group = 'career';
          col = primaryC;
          sz = 4.0;
          innerColor = new THREE.Color(BRAND.primaryLight); // gold inner
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

      // Add extra pins (non-career-path pins) — decorative group
      EXTRA_PINS.forEach(pin => {
        const c = CITIES[pin.city];
        const [x, y] = project(c.lon, c.lat);
        const idxInGroup = decoPositions.length / 3;
        decoPositions.push(x, y, 0);
        decoColors.push(secondaryC.r, secondaryC.g, secondaryC.b);
        decoSizes.push(3.0);
        cityNodeData[pin.city] = { x, y, baseSize: 3.0, isHub: false, group: 'decorative', idxInGroup, innerColor: new THREE.Color(0xffffff) };
      });

      // ---- Pin marker shader (Google-Maps-style: solid disc + inner dot) ----
      // No glow texture — pins are solid, drawn directly in the fragment shader.
      // NormalBlending gives a crisp opaque marker, not the old additive haze.
      const pinMat = new THREE.ShaderMaterial({
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
            // outer disc (color), inner dot (uInnerColor), transparent outside
            if (d > 0.5) discard;
            vec3 c = (d < 0.18) ? uInnerColor : vColor;
            // crisp edge AA by 1px of the outer ring
            float alpha = smoothstep(0.5, 0.46, d);
            gl_FragColor = vec4(c, alpha);
          }
        `,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
      });

      // Build three Points objects with pinMat clones, each with its own uInnerColor
      function makePinPoints(positions, colors, sizes, innerColorHex) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));
        geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
        const mat = pinMat.clone();
        mat.uniforms.uInnerColor.value.set(innerColorHex);
        return new THREE.Points(geo, mat);
      }

      const hubPoints = makePinPoints(hubPositions, hubColors, hubSizes, 0xffffff);
      const careerPoints = makePinPoints(careerPositions, careerColors, careerSizes, BRAND.primaryLight);
      const decoPoints = makePinPoints(decoPositions, decoColors, decoSizes, 0xffffff);
      mapGroup.add(hubPoints);
      mapGroup.add(careerPoints);
      mapGroup.add(decoPoints);

      // ---- Career path connection lines ----
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
        // Gradient color: terracotta → teal along path
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
      // Compute line distances for dashed lines
      var pathSegments = new THREE.LineSegments(pathGeo, pathMat);
      mapGroup.add(pathSegments);
      pathSegments.computeLineDistances();

      // ---- Data packets traveling along career path ----
      const PACKET_COUNT = 25;
      const packetPositions = new Float32Array(PACKET_COUNT * 3);
      const packetSizes = new Float32Array(PACKET_COUNT);
      const packetData = [];

      for (let i = 0; i < PACKET_COUNT; i++) {
        packetData.push({
          segment: i % (CAREER_PATH.length - 1),
          progress: Math.random(),
          speed: 0.15 + Math.random() * 0.25,
          forward: Math.random() > 0.3,
        });
        packetSizes[i] = 1.5 + Math.random() * 0.8;
      }

      const packetGeo = new THREE.BufferGeometry();
      packetGeo.setAttribute('position', new THREE.BufferAttribute(packetPositions, 3));
      packetGeo.setAttribute('size', new THREE.BufferAttribute(packetSizes, 1));

      // Tiny radial glow texture — used only by data packets (pins are solid)
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

      var packetMat = new THREE.ShaderMaterial({
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

      function animatePackets(time) {
        for (let i = 0; i < PACKET_COUNT; i++) {
          const p = packetData[i];
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
          packetPositions[i * 3]     = ax + (bx - ax) * t;
          packetPositions[i * 3 + 1] = ay + (by - ay) * t;
          packetPositions[i * 3 + 2] = 0.2;
        }
        packetGeo.attributes.position.needsUpdate = true;
      }

      // ---- City node pulse animation ----
      // Hub (current role) holds a higher baseline + slow outer ring; the five
      // prior stops breathe. Keeps a visual hierarchy: present > past.
      // Size arrays live on each group's Points geometry (hub/career/decorative).
      let isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      function animateNodes(time) {
        // Re-check on each frame in case theme changed mid-animation
        isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        Object.keys(cityNodeData).forEach((key, i) => {
          const nd = cityNodeData[key];
          const amp = nd.isHub ? 0.08 : 0.30;
          const pulse = Math.sin(time * 0.8 + i * 0.7) * amp + (nd.isHub ? 0.92 : 0.70);
          // Dark mode: dampen pulse to subtle breathing
          const finalPulse = isDark ? (nd.isHub ? 0.98 : 0.85) : pulse;
          const pts = nd.group === 'hub' ? hubPoints : (nd.group === 'career' ? careerPoints : decoPoints);
          pts.geometry.attributes.size.array[nd.idxInGroup] = nd.baseSize * finalPulse;
          pts.geometry.attributes.size.needsUpdate = true;
        });
      }

      // ---- Mouse parallax disabled — caused unwanted orange tint on page hover ----
      // (map group stays static; scroll parallax via GSAP still applies)
      let mouseX = 0, mouseY = 0;

      // ---- Resize (debounced — mobile URL-bar show/hide fires bursts of events) ----
      let mapResizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(mapResizeTimeout);
        mapResizeTimeout = setTimeout(() => {
          const mobile = window.innerWidth < 768;
          camera.position.z = mobile ? 66 : 50;
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        }, 150);
      });

      // ---- Render loop (IO-gated — pauses when #scene-container is off-screen) ----
      let pageVisible = true;
      let mapVisible = false;
      let threeRAF = null;
      document.addEventListener('visibilitychange', () => {
        pageVisible = !document.hidden;
      });

      // IntersectionObserver to start/stop the Three.js render loop
      const sceneContainer = document.getElementById('scene-container');
      if (sceneContainer) {
        const mapObs = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            mapVisible = e.isIntersecting || e.intersectionRatio > 0;
            if (mapVisible && !threeRAF) threeRAF = requestAnimationFrame(animate);
          });
        }, { rootMargin: '200px', threshold: 0.01 });
        mapObs.observe(sceneContainer);
      }

      let prevTime = performance.now();
      function animate() {
        if (!mapVisible) { threeRAF = null; return; }
        threeRAF = requestAnimationFrame(animate);
        if (!pageVisible) { prevTime = performance.now(); return; }
        const now = performance.now();
        const dt = (now - prevTime) / 1000;
        prevTime = now;
        const time = now * 0.001;

        animateNodes(time);
        animatePackets(time);

        renderer.render(scene, camera);
      }

      // Mark enhanced so the CSS text fallback collapses to the a11y-only strip
      container.classList.add('is-enhanced');
      animate();

      // Cleanup on page unload/hide
      window.addEventListener('pagehide', () => {
        if (threeRAF) cancelAnimationFrame(threeRAF);
        if (renderer) { renderer.dispose(); sceneContainer.innerHTML = ''; }
      });
    })();
  }

  // Execute when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThreeJSMap);
  } else {
    initThreeJSMap();
  }


      // ================================================================
      // SKILL 3D WHEEL (Three.js) — interactive skill constellation
      // ================================================================
      const tooltip = document.getElementById('skill-tooltip');
      const tooltipName = tooltip ? tooltip.querySelector('.tooltip-name') : null;
      const tooltipCategory = tooltip ? tooltip.querySelector('.category') : null;
      const tooltipLevel = tooltip ? tooltip.querySelector('.level') : null;

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

      // ---- 3D wheel state ----
      const wheelReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const wheelCanvas = document.getElementById('skill-wheel');
      let wheelActive = false;
      let wheelRAF = null;
      let wheelScene = null, wheelCamera = null, wheelRenderer = null, wheelGroup = null;
      let wheelNodeMeshes = [];
      let hoveredWheelMesh = null;
      const wheelPointer = { x: -2, y: -2, cx: 0, cy: 0 };
      const wheelRaycaster = new THREE.Raycaster();
      let activeCat = 'all';
      let searchQuery = '';

      // Canvas-texture sprite label (sprites always face the camera, so
      // category names stay readable as the wheel rotates).
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
        if (!wheelCanvas || typeof THREE === 'undefined') return;

        wheelScene = new THREE.Scene();
        wheelCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 60);
        wheelCamera.position.set(0, 2.0, 7.4);
        wheelCamera.lookAt(0, 0, 0);

        wheelRenderer = new THREE.WebGLRenderer({
          canvas: wheelCanvas, antialias: true, alpha: true, powerPreference: 'low-power'
        });
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
        let visible = 0;
        wheelNodeMeshes.forEach(m => {
          const catOk = activeCat === 'all' || m.userData.skill.cat === activeCat;
          const nameOk = !q || m.userData.skill.name.toLowerCase().includes(q);
          m.userData.on = catOk && nameOk;
          if (m.userData.on) visible++;
        });
        const countEl = document.getElementById('skills-count');
        if (countEl) countEl.textContent = (!q && activeCat === 'all')
          ? SKILLS.length + ' skills'
          : visible + ' of ' + SKILLS.length + ' skills';
        filterTagGrid(q);
      }

      function filterTagGrid(q) {
        document.querySelectorAll('.skill-category').forEach(block => {
          const h = (block.querySelector('h3') || {}).textContent || '';
          const catOk = activeCat === 'all' || h === activeCat || h.includes(activeCat);
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
        if (!wheelActive) { wheelRAF = null; return; }
        if (!wheelReducedMotion) wheelGroup.rotation.y = time * 0.00012;
        wheelNodeMeshes.forEach(m => {
          const on = m.userData.on;
          const hovered = m === hoveredWheelMesh;
          const target = on ? (hovered ? 1.0 : 0.9) : 0.08;
          m.material.opacity += (target - m.material.opacity) * 0.2;
          const targetScale = hovered ? 2.0 : 1.0;
          const s = m.scale.x + (targetScale - m.scale.x) * 0.2;
          m.scale.setScalar(s);
        });
        wheelRenderer.render(wheelScene, wheelCamera);
        wheelRAF = requestAnimationFrame(wheelLoop);
      }

      // ---- Pointer hover for 3D wheel (raycast against node spheres) ----
      function updateWheelHover(clientX, clientY) {
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
          tooltip.style.left = (clientX - rect.left + 14) + 'px';
          tooltip.style.top = (clientY - rect.top - 10) + 'px';
          tooltip.classList.add('visible');
          tooltip.setAttribute('aria-hidden', 'false');
          wheelCanvas.style.cursor = 'pointer';
        } else {
          tooltip.classList.remove('visible');
          tooltip.setAttribute('aria-hidden', 'true');
          wheelCanvas.style.cursor = 'default';
        }
      }

      wheelCanvas.addEventListener('pointermove', (e) => {
        if (!wheelActive) return;
        updateWheelHover(e.clientX, e.clientY);
      });
      wheelCanvas.addEventListener('pointerleave', () => {
        hoveredWheelMesh = null;
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
      });

      // ---- Search + filter controls drive both the 3D wheel and the tag grid ----
      const skillSearchInput = document.getElementById('skill-search');
      if (skillSearchInput) {
        skillSearchInput.addEventListener('input', () => {
          searchQuery = skillSearchInput.value;
          applyWheelFilter();
        });
      }
      document.querySelectorAll('.skill-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.skill-filter-btn').forEach(b => {
            b.classList.toggle('active', b === btn);
            b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
          });
          activeCat = btn.dataset.cat;
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
              if (!wheelRAF) wheelRAF = requestAnimationFrame(wheelLoop);
            } else {
              wheelActive = false;
            }
          });
        }, { threshold: 0.3 });
        constObs.observe(constellationAnchor);
      }

      // ================================================================
      // CONTACT FORM VALIDATION
      // ================================================================
      const form = document.querySelector('#contact form');
      const errorMsg = document.getElementById('form-error');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          let valid = true;

          const nameField = document.getElementById('contact-name');
          const emailField = document.getElementById('contact-email');
          const phoneField = document.getElementById('contact-phone');
          const subjectField = document.getElementById('contact-subject');
          const messageField = document.getElementById('contact-message');

          // Per-field error elements (each form-group has a .form-error div)
          const errName    = document.getElementById('err-name');
          const errEmail   = document.getElementById('err-email');
          const errPhone   = document.getElementById('err-phone');
          const errSubject = document.getElementById('err-subject');
          const errMessage = document.getElementById('err-message');

          // Reset errors
          form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));
          [nameField, emailField, phoneField, subjectField, messageField].forEach(f => f.setAttribute('aria-invalid', 'false'));
          [errName, errEmail, errPhone, errSubject, errMessage].forEach(d => { if (d) { d.style.display = 'none'; d.textContent = ''; } });

          // Helper: mark a field invalid and show its inline message
          function fieldError(field, el, msg) {
            field.closest('.form-group').classList.add('error');
            field.setAttribute('aria-invalid', 'true');
            if (el) { el.textContent = msg; el.style.display = 'block'; }
          }

          if (!nameField.value.trim()) {
            fieldError(nameField, errName, 'Please enter your name.');
            valid = false;
          }
          const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRe.test(emailField.value.trim())) {
            fieldError(emailField, errEmail, 'Please enter a valid email address.');
            valid = false;
          }
          // Phone is optional; only validate if the user typed something.
          if (phoneField.value.trim() !== '' && !/^[+]?[\d\s().-]{6,20}$/.test(phoneField.value.trim())) {
            fieldError(phoneField, errPhone, 'Please enter a valid phone number.');
            valid = false;
          }
          if (!subjectField.value.trim()) {
            fieldError(subjectField, errSubject, 'Please enter a subject.');
            valid = false;
          }
          if (!messageField.value.trim()) {
            fieldError(messageField, errMessage, 'Please enter your message.');
            valid = false;
          }

          if (valid) {
            const btn = form.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
            const data = new FormData(form);
            // Formspree: add _format=json for JSON response, _next for redirect target
            data.append('_format', 'json');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            // The form action is already set to Formspree endpoint in HTML
            fetch(form.action, {
              method: 'POST',
              headers: { 'Accept': 'application/json' },
              body: data,
              signal: controller.signal
            })
              .then(async (res) => {
                clearTimeout(timeoutId);
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  throw new Error(body.error || body.errors?.[0]?.message || 'submit-failed');
                }
                // Formspree returns { ok: true } on success with _format=json
                window.location.href = '/thank-you.html';
              })
              .catch((err) => {
                clearTimeout(timeoutId);
                if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
                errorMsg.style.display = 'block';
                errorMsg.textContent = err.name === 'AbortError'
                  ? 'Request timed out. Please check your connection and try again.'
                  : (err.message || 'Something went wrong. Please try again or reach out on LinkedIn.');
                setTimeout(() => { errorMsg.style.display = 'none'; }, 8000);
              });
          }
        });

        // Clear errors on input
        form.querySelectorAll('input, textarea').forEach(function(field) {
          field.addEventListener('input', function() {
            var group = this.closest('.form-group');
            if (group) {
              group.classList.remove('error');
              this.setAttribute('aria-invalid', 'false');
              var err = group.querySelector('.form-error');
              if (err) { err.style.display = 'none'; err.textContent = ''; }
            }
          });
        });
      }

      // ================================================================
      // RESIZE — re-fit the 3D wheel's renderer/camera on viewport change
      // ================================================================
      function sizeWheel() {
        if (!wheelCanvas || !wheelRenderer) return;
        const rect = wheelCanvas.getBoundingClientRect();
        const w = Math.max(rect.width, 1), h = Math.max(rect.height, 1);
        wheelRenderer.setSize(w, h, false);
        wheelCamera.aspect = w / h;
        wheelCamera.updateProjectionMatrix();
      }
      let wheelResizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(wheelResizeTimeout);
        wheelResizeTimeout = setTimeout(sizeWheel, 150);
      });
      window.addEventListener('orientationchange', () => setTimeout(sizeWheel, 300));


    // ================================================================
    // GSAP ANIMATIONS
    // ================================================================
    (function() {
      'use strict';

      if (typeof gsap === 'undefined') {
        return;
      }

      // Respect reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Mobile: GSAP eval costs a 400ms main-thread task (worst FID contributor).
      // Reveals already render visible in CSS; skip scroll-triggered animation there.
      const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;
      if (prefersReducedMotion || isMobileViewport) {
        document.querySelectorAll('.reveal, .hero-label, .hero-name, .hero-title, .hero-tagline, .hero-cta, .stat-card, .timeline-item, .skill-category, .section-label').forEach(el => {
          el.style.opacity = '1';
          el.style.transform = 'none';
        });
        // Show stat counters immediately (no animation) so reduced-motion users
        // don't see a stuck "0".
        document.querySelectorAll('.stat-num').forEach(el => {
          const target = parseInt(el.dataset.target);
          if (!isNaN(target)) el.textContent = target + (target > 1 ? '+' : '');
        });
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      // Zero counter text so the count-up tween starts from 0 for JS users.
      // (The HTML ships the real values, so no-JS visitors never see 0.)
      document.querySelectorAll('.stat-num').forEach(el => { el.textContent = '0'; });

      // ---- Hero entrance ----
      const heroTl = gsap.timeline({ delay: 0.3 });

      heroTl
        .from('.hero-label', { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' })
        .from('.hero-name', { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' }, '-=0.4')
        .from('.hero-title', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.4')
        .from('.hero-tagline', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.3')
        .from('.hero-cta', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.3');

      // ---- Scroll reveals ----
      // One tween per element only — earlier duplicate from() tweens on the
      // same elements (`.timeline-item`/`.skill-category` aggregates) fought
      // over opacity via immediateRender and left cards stuck invisible.
      // immediateRender:false keeps content fully visible until its trigger
      // actually fires, so a misfiring trigger can never hide content.
      const revealEls = gsap.utils.toArray('.reveal');
      const staggeredSelectors = ['.timeline-item', '.skill-category'];
      revealEls.forEach(el => {
        let delay = 0;
        for (const sel of staggeredSelectors) {
          if (el.matches(sel)) {
            delay = Array.from(document.querySelectorAll(sel)).indexOf(el) * 0.05;
            break;
          }
        }
        gsap.fromTo(el,
          { opacity: 0, y: 30 },
          {
            opacity: 1, y: 0,
            duration: 0.6,
            ease: 'power2.out',
            delay,
            immediateRender: false,
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
          }
        );
      });

      // ---- Section labels underline ----
      gsap.utils.toArray('.section-label').forEach(el => {
        gsap.fromTo(el,
          { '--underline-w': '0px' },
          {
            '--underline-w': '60px',
            duration: 0.8,
            delay: 0.3,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 85%' }
          }
        );
      });

      // ---- Stats counter ----
      gsap.utils.toArray('.stat-num').forEach(el => {
        const target = parseInt(el.dataset.target);
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.5,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 80%' },
          onUpdate: () => {
            el.textContent = Math.round(obj.val) + (target > 1 ? '+' : '');
          }
        });
      });

      // ---- Scroll parallax for Three.js camera ----
      ScrollTrigger.create({
        trigger: 'body',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          if (window.camera) {
            window.camera.position.y = self.progress * -5;
          }
        }
      });

      // ---- Refresh on load ----
      ScrollTrigger.refresh();
      // Re-measure trigger positions once webfonts finish loading — the
      // async font swap shifts section positions and can desync the reveals.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
      }
    })();