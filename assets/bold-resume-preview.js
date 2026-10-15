(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1051px)');
  const skillSection = document.getElementById('skills');
  // The click-to-expand skills rail that used to be injected here is gone. It
  // was a compact index of the six categories, but .skills-list below already
  // lists every tag, so it duplicated content and sat as six mostly-empty
  // panels between the wheel and the controls.
  const marquee = document.createElement('div');
  marquee.className = 'bold-marquee';
  marquee.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div');
  track.className = 'bold-marquee-track';
  const text = ['5G NR', 'Cisco Catalyst', 'Nokia NetAct', 'Ericsson ENM', 'BGP/OSPF/MPLS', 'Disaster Recovery'].join('  /  ') + '  /  ';
  for (let i = 0; i < 2; i++) {
    const copy = document.createElement('span'); copy.className = 'bold-marquee-copy'; copy.textContent = text; track.appendChild(copy);
  }
  marquee.appendChild(track);
  skillSection.querySelector('.section-title').after(marquee);
  const pause = document.createElement('button');
  pause.type = 'button'; pause.className = 'bold-motion-toggle';
  pause.id = 'bold-motion-toggle';
  document.querySelector('.hero-cta').after(pause);
  let paused = reduced.matches, context = null;
  const summary = document.querySelector('.about-text p');
  const originalSummary = summary.textContent;
  // Static fallback for the proof-strip counters. Called whenever motion is off
  // (reduced-motion / mobile / paused) and on context.revert(), so the numbers
  // never freeze mid-count when the scene is torn down.
  function finalizeStats() {
    document.querySelectorAll('.stat-num').forEach(el => { el.textContent = (el.dataset.target || '0') + '+'; });
  }

  // This isolated preview replaces the shared reveal choreography, not its content.
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill(true));
    gsap.killTweensOf(document.querySelectorAll('.reveal, .hero-name, .hero-title, .hero-tagline, .hero-cta, .stat-num'));
    document.querySelectorAll('.reveal, .hero-name, .hero-title, .hero-tagline, .hero-cta').forEach(el => {
      el.style.opacity = '1'; el.style.transform = 'none';
    });
    document.querySelectorAll('.stat-num').forEach(el => { el.textContent = el.dataset.target + '+'; });
  }
  function refreshMotion() {
    if (context) { context.revert(); context = null; }
    finalizeStats();
    summary.textContent = originalSummary;
    marquee.classList.toggle('is-paused', paused || reduced.matches);
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? 'Resume Editorial Motion' : 'Pause Editorial Motion';
    if (paused || reduced.matches || !desktop.matches || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    context = gsap.context(() => {
      const title = document.querySelector('#experience > .section-title');
      ScrollTrigger.create({
        id: 'bold-experience-pin', trigger: '#experience', start: 'top 120px',
        end: 'bottom bottom', pin: title, pinSpacing: false, invalidateOnRefresh: true
      });
      const fragment = document.createDocumentFragment();
      originalSummary.split(/(\s+)/).forEach(part => {
        if (/^\s+$/.test(part)) fragment.appendChild(document.createTextNode(part));
        else { const span = document.createElement('span'); span.className = 'bold-word'; span.textContent = part; fragment.appendChild(span); }
      });
      summary.replaceChildren(fragment);
      gsap.fromTo(summary.querySelectorAll('.bold-word'), { opacity: 0.18 }, {
        opacity: 1, stagger: 0.06, ease: 'none',
        scrollTrigger: { id: 'bold-summary-scrub', trigger: summary, start: 'top 85%', end: 'bottom 48%', scrub: true }
      });

      // --- Motion kit wired into the bold page. Runs only when desktop, non-reduced-
      //     motion, and unpaused; reverted wholesale by context.revert() otherwise. ---

      // 1. Proof strip — staggered card entrance + count-up, fired on first view.
      const statCards = gsap.utils.toArray('.stat-card');
      if (statCards.length) {
        gsap.from(statCards, {
          opacity: 0, y: 24, duration: 0.6, ease: 'power2.out', stagger: 0.12,
          scrollTrigger: { trigger: '.proof-strip', start: 'top 82%', once: true }
        });
        gsap.utils.toArray('.stat-num').forEach(num => {
          const end = Number(num.dataset.target || 0);
          const counter = { v: 0 };
          num.textContent = '0+';
          gsap.to(counter, {
            v: end, duration: 1.2, ease: 'power1.out',
            onUpdate: () => { num.textContent = Math.round(counter.v) + '+'; },
            scrollTrigger: { trigger: num, start: 'top 88%', once: true }
          });
        });
      }

      // 2. Hero constellation — continuous slow orbit (transform only; the scroll
      //    parallax lives on a different element, so the two never fight).
      const heroBg = document.querySelector('.hero-constellation');
      if (heroBg) {
        gsap.fromTo(heroBg, { rotate: 0, scale: 1.3 }, {
          rotate: 360, duration: 220, repeat: -1, ease: 'none', transformOrigin: '50% 50%'
        });
      }

      // 3. Career-path map — gentle counter-scroll parallax.
      const mapBg = document.querySelector('.career-map-bg');
      if (mapBg) {
        gsap.fromTo(mapBg, { yPercent: -7 }, {
          yPercent: 7, ease: 'none',
          scrollTrigger: { trigger: '.career-path', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
    });
    if (document.fonts) document.fonts.ready.then(() => { if (context) ScrollTrigger.refresh(); });
  }
  pause.addEventListener('click', () => { paused = !paused; refreshMotion(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; refreshMotion(); });
  desktop.addEventListener('change', refreshMotion);
  refreshMotion();

  // Wait for GSAP to load if not already loaded
  function waitForGSAP() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      refreshMotion();
    } else {
      // Check again after a short delay
      setTimeout(waitForGSAP, 100);
    }
  }
  waitForGSAP();

  document.documentElement.dataset.boldReady = 'true';
})();
