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
  var form = document.querySelector('form[name="contact"]');
  if (form) {
    var submitBtn = form.querySelector('button[type="submit"]');
    var formError = document.getElementById('form-error');
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var formData = new FormData(form);
      var isValid = true;
      form.querySelectorAll('[required]').forEach(function(field) {
        if (!field.value.trim()) {
          field.setAttribute('aria-invalid', 'true');
          field.closest('.form-group').classList.add('error');
          isValid = false;
        } else {
          field.setAttribute('aria-invalid', 'false');
          field.closest('.form-group').classList.remove('error');
        }
      });
      if (!isValid) return;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      submitBtn.classList.add('loading');
      formError.style.display = 'none';
      formError.textContent = '';
      fetch(form.action, { method: 'POST', body: formData, headers: { 'Accept': 'application/json' } })
        .then(function(response) {
          formError.style.display = 'block';
          if (response.ok) {
            formError.style.color = 'var(--olive)';
            formError.textContent = 'Message sent successfully. Thank you!';
            form.reset();
          } else {
            formError.style.color = 'var(--gold-dark)';
            formError.textContent = 'Something went wrong. Please try again or email directly.';
          }
        })
        .catch(function() {
          formError.style.display = 'block';
          formError.style.color = 'var(--gold-dark)';
          formError.textContent = 'Network error. Please check your connection and try again.';
        })
        .finally(function() {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Message';
          submitBtn.classList.remove('loading');
        });
    });
    form.querySelectorAll('[required]').forEach(function(field) {
      field.addEventListener('input', function() {
        this.setAttribute('aria-invalid', 'false');
        this.closest('.form-group').classList.remove('error');
      });
    });
  }
})();
