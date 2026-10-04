(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1051px)');
  const skills = [...document.querySelectorAll('.skill-category')];
  const skillSection = document.getElementById('skills');
  const controls = document.querySelector('.skill-controls');
  const rail = document.createElement('div');
  rail.className = 'bold-skills-rail';
  rail.setAttribute('aria-label', 'Explore technical skill categories');
  skills.forEach((category, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bold-skill-panel';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `bold-skill-detail-${i}`);
    const title = document.createElement('strong');
    title.textContent = category.querySelector('h3').textContent;
    const detail = document.createElement('span');
    detail.className = 'bold-panel-detail';
    detail.id = `bold-skill-detail-${i}`;
    detail.textContent = [...category.querySelectorAll('.skill-tag')].map(tag => tag.textContent).join(' · ');
    button.append(title, detail);
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') === 'true';
      rail.querySelectorAll('button').forEach(other => other.setAttribute('aria-expanded', 'false'));
      button.setAttribute('aria-expanded', String(!expanded));
    });
    rail.appendChild(button);
  });
  controls.before(rail);
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
