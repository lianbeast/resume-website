(function() {
  'use strict';

  // ========== Hamburger toggle ==========
  var navToggle = document.getElementById('nav-toggle');
  var navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    function setMenu(open) {
      navToggle.setAttribute('aria-expanded', open);
      navLinks.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    }
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
