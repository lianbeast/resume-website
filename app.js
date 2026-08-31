    // ================================================================
    // THREE.JS US MAP SCENE — career location network
    // ================================================================
    function initThreeJSMap() {
      // ================================================================
      // THREE.JS US MAP SCENE — career location network
      // ================================================================
      (function() {
        'use strict';

        if (typeof THREE === 'undefined') return;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) return;

        const container = document.getElementById('scene-container');

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

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
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
        if (typeof SKILLS !== 'undefined') {
          SKILLS.forEach(function(s) {
            const base = CAT_COLORS[s.cat];
            s.color = isDark
              ? '#' + new THREE.Color(base).multiplyScalar(0.75).getHexString()
              : base;
          });
        }
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
      };

      // Career path (chronological) — parsed from the a11y fallback list (#career-locations)
      // Single source of truth: the HTML list is the authoritative data.
      const careerList = document.querySelectorAll('#career-locations .career-locations__list li');
      const CAREER_PATH = Array.from(careerList).map(li => {
        const city = li.querySelector('.cl-city')?.textContent?.split(',')[0]?.trim() || '';
        const era = li.querySelector('.cl-era')?.textContent?.trim() || '';
        const role = li.querySelector('.cl-role')?.textContent?.trim() || '';
        // Map display city name to CITIES key
        const cityKeyMap = {
          'Bethesda': 'Bethesda',
          'Martinsburg': 'Martinsburg',
          'Spokane': 'Spokane',
          'Austin': 'Austin',
          'Miami': 'Miami',
          'Hammond': 'Hammond'
        };
        return { city: cityKeyMap[city] || city, role, era };
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

      // ---- Resize ----
      window.addEventListener('resize', () => {
        const mobile = window.innerWidth < 768;
        camera.position.z = mobile ? 66 : 50;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
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
      // Skill tooltip vars (used by skill ring hover)
      const tooltip = document.getElementById('skill-tooltip');
      const tooltipName = tooltip.querySelector('.tooltip-name');
      const tooltipCat = tooltip.querySelector('.category');

      // Skill canvas + context for the interactive ring
      const skillCanvas = document.getElementById('skill-canvas');
      const skillCtx = skillCanvas.getContext('2d');

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

      // ---- Skill Ring layout ----
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
      let ringNodes = [];
      let crossLinks = [];
      let hoveredRing = null;
      let ringOpacity = 0;
      let ringActive = false;
      // Logical canvas size (CSS px) + DPR so drawing stays crisp on retina.
      let skillW = 0, skillH = 0, skillDPR = Math.min(window.devicePixelRatio || 1, 2);
      // Skill ring rotation respects prefers-reduced-motion (static when set).
      const ringReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Cross-category keyword links
      const LINK_KEYWORDS = ['nokia', 'cisco', 'microsoft', 'sctp', 'ip'];
      function findCrossLinks() {
        const links = [];
        for (let i = 0; i < ringNodes.length; i++) {
          for (let j = i + 1; j < ringNodes.length; j++) {
            if (ringNodes[i].cat === ringNodes[j].cat) continue;
            const a = ringNodes[i].name.toLowerCase(), b = ringNodes[j].name.toLowerCase();
            const shared = LINK_KEYWORDS.some(k => a.includes(k) && b.includes(k));
            if (shared) links.push([i, j]);
          }
        }
        return links;
      }

      function initRingNodes(w, h) {
        const cx = w / 2, cy = h / 2;
        const outerR = Math.min(w, h) * 0.44;
        const gap = 0.04; // gap between arcs in radians
        const totalArc = Math.PI * 2 - gap * CATS.length;
        let angle = -Math.PI / 2; // start top

        ringNodes = [];
        CATS.forEach(cat => {
          const skills = SKILLS.filter(s => s.cat === cat);
          const arcLen = totalArc / CATS.length;
          skills.forEach((s, si) => {
            const a = angle + (si + 0.5) / skills.length * arcLen;
            const r = outerR * (0.72 + 0.12 * (si % 2)); // stagger radius
            ringNodes.push({
              ...s,
              cx, cy, outerR,
              angle: a,
              baseAngle: a,
              radius: r,
              r: 5,
            });
          });
          // Category label position — use CAT_COLORS map
          const midAngle = angle + totalArc / CATS.length / 2;
          ringNodes.push({
            name: cat, cat: cat, color: CAT_COLORS[cat], desc: '',
            cx, cy, outerR,
            angle: midAngle, baseAngle: midAngle,
            radius: outerR + 28,
            r: 0, isLabel: true,
          });
          angle += arcLen + gap;
        });

        // Precompute cross-category links (constant after init — never recompute per frame)
        crossLinks = findCrossLinks();
      }

      function drawSkillRing(time) {
        if (!ringActive && ringOpacity <= 0) return;
        const w = skillW, h = skillH;
        if (ringNodes.length === 0) initRingNodes(w, h);

        skillCtx.clearRect(0, 0, w, h);
        ringOpacity += (ringActive ? 1 : -1) * 0.03;
        ringOpacity = Math.max(0, Math.min(1, ringOpacity));
        const op = ringOpacity;
        const cx = w / 2, cy = h / 2;

        // Slow rotation (static when the user prefers reduced motion)
        const rot = ringReducedMotion ? 0 : time * 0.06;

        // Compute current positions
        const curPos = ringNodes.map(n => {
          const a = n.baseAngle + rot;
          return {
            x: cx + Math.cos(a) * n.radius,
            y: cy + Math.sin(a) * n.radius,
            a,
          };
        });

        // Draw arc tracks per category
        const gap = 0.04;
        const totalArc = Math.PI * 2 - gap * CATS.length;
        let arcAngle = -Math.PI / 2;
        CATS.forEach(cat => {
          const arcLen = totalArc / CATS.length;
          const startA = arcAngle + rot - Math.PI / 2;
          const endA = arcAngle + arcLen + rot - Math.PI / 2;
          const catSkills = SKILLS.filter(s => s.cat === cat);
          const catColor = catSkills[0]?.color || '#c2410c';

          skillCtx.beginPath();
          skillCtx.arc(cx, cy, ringNodes.find(n => n.cat === cat && !n.isLabel)?.outerR || ringNodes[0]?.outerR || 100, startA, endA);
          skillCtx.strokeStyle = catColor + Math.round(op * 30).toString(16).padStart(2, '0');
          skillCtx.lineWidth = 1;
          skillCtx.stroke();
          arcAngle += arcLen + gap;
        });

        // Cross-category links (precomputed)
        crossLinks.forEach(([i, j]) => {
          const pi = curPos[i], pj = curPos[j];
          if (!pi || !pj) return;
          skillCtx.beginPath();
          skillCtx.moveTo(pi.x, pi.y);
          skillCtx.lineTo(pj.x, pj.y);
          skillCtx.strokeStyle = 'rgba(194,65,12,' + (op * 0.25) + ')';
          skillCtx.lineWidth = 1;
          skillCtx.setLineDash([4, 4]);
          skillCtx.stroke();
          skillCtx.setLineDash([]);
        });

        // Draw skill nodes
        ringNodes.forEach((n, i) => {
          if (n.isLabel) {
            // Category label
            const p = curPos[i];
            skillCtx.fillStyle = n.color + Math.round(op * 200).toString(16).padStart(2, '0');
            skillCtx.font = '600 10px "Outfit", sans-serif';
            skillCtx.textAlign = 'center';
            skillCtx.textBaseline = 'middle';
            // Rotate label text to be readable
            const ta = n.baseAngle + rot;
            const flip = Math.abs(ta % (Math.PI * 2)) > Math.PI;
            skillCtx.save();
            skillCtx.translate(p.x, p.y);
            skillCtx.rotate(ta + (flip ? Math.PI : 0));
            skillCtx.fillText(n.name, 0, 0);
            skillCtx.restore();
            return;
          }

          const isHovered = hoveredRing === i;
          const p = curPos[i];
          const r = isHovered ? n.r + 3 : n.r;
          const glow = isHovered ? 0.7 : 0.3;

          // Glow
          const grad = skillCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3);
          grad.addColorStop(0, n.color + Math.round(op * glow * 255).toString(16).padStart(2, '0'));
          grad.addColorStop(1, n.color + '00');
          skillCtx.fillStyle = grad;
          skillCtx.beginPath();
          skillCtx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
          skillCtx.fill();

          // Core
          skillCtx.fillStyle = n.color + Math.round(op * 220).toString(16).padStart(2, '0');
          skillCtx.beginPath();
          skillCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
          skillCtx.fill();

          // Name label on hover
          if (isHovered) {
            skillCtx.fillStyle = n.color + Math.round(op * 255).toString(16).padStart(2, '0');
            skillCtx.font = '500 11px "Outfit", sans-serif';
            skillCtx.textAlign = 'center';
            skillCtx.fillText(n.name, p.x, p.y - r - 10);
          }
        });

        // Center label
        skillCtx.fillStyle = 'rgba(6,182,212,' + (op * 0.5) + ')';
        skillCtx.font = '600 11px "Outfit", sans-serif';
        skillCtx.textAlign = 'center';
        skillCtx.textBaseline = 'middle';
        skillCtx.fillText('TECHNICAL SKILLS', cx, cy - 6);
        skillCtx.font = '400 9px "Outfit", sans-serif';
        skillCtx.fillText('hover to explore', cx, cy + 8);
      }

      // ---- Canvas-local hover for skill ring ----
      skillCanvas.addEventListener('mousemove', (e) => {
        const rect = skillCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let found = -1;
        for (let i = 0; i < ringNodes.length; i++) {
          if (ringNodes[i].isLabel) continue;
          const n = ringNodes[i];
          const a = n.baseAngle + (ringReducedMotion ? 0 : performance.now() * 0.001 * 0.06);
          const nx = n.cx + Math.cos(a) * n.radius;
          const ny = n.cy + Math.sin(a) * n.radius;
          if (Math.hypot(mx - nx, my - ny) < n.r * 3 + 8) {
            found = i;
            break;
          }
        }
        hoveredRing = found >= 0 ? found : null;
        if (hoveredRing !== null) {
          const n = ringNodes[hoveredRing];
          tooltipName.textContent = n.name;
          tooltipCat.textContent = n.desc || n.cat;
          tooltip.style.left = (e.clientX + 14) + 'px';
          tooltip.style.top = (e.clientY - 10) + 'px';
          tooltip.classList.add('visible');
          tooltip.setAttribute('aria-hidden', 'false');
        } else {
          tooltip.classList.remove('visible');
          tooltip.setAttribute('aria-hidden', 'true');
        }
      });

      skillCanvas.addEventListener('mouseleave', () => {
        hoveredRing = null;
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
      });

      // ================================================================
      // INTERSECTION OBSERVER
      // ================================================================

      // Constellation activation — gates ringActive AND the rAF loop
      const constellationAnchor = document.querySelector('.constellation-anchor');
      let ringRAF = null;
      if (constellationAnchor) {
        const constObs = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            ringActive = e.isIntersecting;
            if (ringActive && !ringRAF) ringRAF = requestAnimationFrame(skillRingLoop);
          });
        }, { threshold: 0.3 });
        constObs.observe(constellationAnchor);
      }

      function skillRingLoop() {
        if (!ringActive && ringOpacity <= 0) { ringRAF = null; return; }
        ringRAF = requestAnimationFrame(skillRingLoop);
        if (!pageVisible) { prevTime = performance.now(); return; }
        const now = performance.now();
        prevTime = now;
        drawSkillRing(now * 0.001);
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
          const subjectField = document.getElementById('contact-subject');
          const messageField = document.getElementById('contact-message');

          // Reset errors
          form.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));
          [nameField, emailField, subjectField, messageField].forEach(f => f.setAttribute('aria-invalid', 'false'));

          if (!nameField.value.trim()) {
            nameField.closest('.form-group').classList.add('error');
            nameField.setAttribute('aria-invalid', 'true');
            valid = false;
          }
          const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRe.test(emailField.value.trim())) {
            emailField.closest('.form-group').classList.add('error');
            emailField.setAttribute('aria-invalid', 'true');
            valid = false;
          }
          if (!subjectField.value.trim()) {
            subjectField.closest('.form-group').classList.add('error');
            subjectField.setAttribute('aria-invalid', 'true');
            valid = false;
          }
          if (!messageField.value.trim()) {
            messageField.closest('.form-group').classList.add('error');
            messageField.setAttribute('aria-invalid', 'true');
            valid = false;
          }

          if (valid) {
            const btn = form.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
            const data = new FormData(form);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            fetch('/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(data).toString(),
              signal: controller.signal
            })
              .then((res) => {
                clearTimeout(timeoutId);
                if (!res.ok) throw new Error('submit-failed');
                window.location.href = '/thank-you.html';
              })
              .catch((err) => {
                clearTimeout(timeoutId);
                if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
                errorMsg.style.display = 'block';
                errorMsg.textContent = err.name === 'AbortError'
                  ? 'Request timed out. Please check your connection and try again.'
                  : 'Something went wrong. Please try again or reach out on LinkedIn.';
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
            }
          });
        });
      }

      // ================================================================
      // RESIZE (debounced for skill canvas)
      // The Three.js map owns its own camera/renderer resize in its IIFE;
      // this handler only re-sizes the 2D skill-canvas rings.
      // ================================================================
      function sizeSkillCanvas() {
        const rect = skillCanvas.parentElement.getBoundingClientRect();
        skillDPR = Math.min(window.devicePixelRatio || 1, 2);
        skillW = rect.width;
        skillH = rect.height;
        skillCanvas.width = Math.round(skillW * skillDPR);
        skillCanvas.height = Math.round(skillH * skillDPR);
        skillCtx.setTransform(skillDPR, 0, 0, skillDPR, 0, 0);
        ringNodes = [];
        initRingNodes(skillW, skillH);
      }

      let resizeTimeout;
      window.addEventListener('resize', () => {
        // Debounce skill canvas resize — avoids reinit on every pixel during drag/rotate
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(sizeSkillCanvas, 150);
      });

      // Initial skill canvas size
      setTimeout(sizeSkillCanvas, 100);
      // ================================================================
      // SKILL RING RENDER LOOP (IO-gated — starts when skills section nears viewport)
      // ================================================================
      let prevTime = performance.now();
      var pageVisible = true;
      document.addEventListener('visibilitychange', function() {
        pageVisible = !document.hidden;
      });


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
      if (prefersReducedMotion) {
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