(function() {
  'use strict';

  // ========== Hamburger toggle ==========
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    var mobileNav = window.matchMedia('(max-width: 768px)');
    var background = Array.from(document.body.children).filter(function(el) {
      return !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) && el.id !== 'main-nav';
    });
    var previousInert = new Map();
    function setMenu(open) {
      open = open && mobileNav.matches;
      navToggle.setAttribute('aria-expanded', String(open));
      navLinks.classList.toggle('open', open);
      navLinks.inert = mobileNav.matches && !open;
      document.body.classList.toggle('menu-open', open);
      background.forEach(function(el) {
        if (open) {
          if (!previousInert.has(el)) previousInert.set(el, el.inert);
          el.inert = true;
        } else if (previousInert.has(el)) {
          el.inert = previousInert.get(el);
          previousInert.delete(el);
        }
      });
      if (!open && navLinks.contains(document.activeElement) && mobileNav.matches) navToggle.focus();
    }
    mobileNav.addEventListener('change', function() { setMenu(false); });
    setMenu(false);
    navToggle.addEventListener('click', function() {
      setMenu(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    navLinks.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { setMenu(false); });
    });
    navLinks.querySelectorAll('button').forEach(function(b) {
      b.addEventListener('click', function() { setMenu(false); });
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Tab' && navToggle.getAttribute('aria-expanded') === 'true') {
        var focusable = [navToggle].concat(Array.from(navLinks.querySelectorAll('a, button:not(:disabled)')));
        var first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        navToggle.focus();
      }
    });
  }

  // ========== Scrollspy ==========
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a:not(.nav-resume)');
  function updateActiveLink() {
    var scrollY = window.scrollY + 120;
    var current = '';
    sections.forEach(function(s) {
      if (s.offsetTop <= scrollY) current = s.id;
    });
    navAnchors.forEach(function(a) {
      a.classList.toggle('active', a.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

  // ========== Back to top ==========
  var backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    window.addEventListener('scroll', function() {
      backBtn.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    backBtn.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }

  // ========== Theme ==========
  var html = document.documentElement;
  var themeMetas = document.querySelectorAll('meta[name="theme-color"]');
  var themeToggle = document.getElementById('theme-toggle');

  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var isDark = html.getAttribute('data-theme') === 'dark';
      if (isDark) {
        html.removeAttribute('data-theme');
        try { localStorage.setItem('theme', 'light'); } catch(e) {}
        themeMetas.forEach(function(m) { m.content = '#f7f5f0'; });
      } else {
        html.setAttribute('data-theme', 'dark');
        try { localStorage.setItem('theme', 'dark'); } catch(e) {}
        themeMetas.forEach(function(m) { m.content = '#161412'; });
      }
    });
  }

  // ========== Form handling ==========
  // Form submission handled by app.js — this file only owns nav, scrollspy, back-to-top, theme toggle
})();
