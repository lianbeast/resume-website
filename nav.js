    (function() {
      // --- Hamburger toggle ---
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
        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(function(a) {
          a.addEventListener('click', function() {
            setMenu(false);
          });
        });
        // Close on Escape and return focus to the toggle
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
            setMenu(false);
            navToggle.focus();
          }
        });
      }

      // --- Scrollspy ---
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

      // --- Back to top ---
      var backBtn = document.getElementById('back-to-top');
      if (backBtn) {
        window.addEventListener('scroll', function() {
          backBtn.classList.toggle('visible', window.scrollY > 500);
        }, { passive: true });
        backBtn.addEventListener('click', function() {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // --- Theme toggle + Style switcher ---
      var toggle = document.getElementById('theme-toggle');
      var styleToggle = document.getElementById('style-toggle');
      var styleDropdown = document.querySelector('.nav-style-dropdown');
      var styleMenuItems = document.querySelectorAll('.style-menu li');
      var html = document.documentElement;
      var themeMeta = document.querySelector('meta[name="theme-color"]');

      // --- Style label helpers ---
      function styleAbbr(name) {
        return name === 'oxblood-editorial' ? 'CD' :
               name === 'solar-graphite' ? 'GR' : 'IO';
      }

      function setActiveMenuItem(name) {
        styleMenuItems.forEach(function(i) {
          i.classList.toggle('active', i.getAttribute('data-style') === name);
        });
      }

      function switchStyle(name) {
        html.setAttribute('data-style', name);
        try { localStorage.setItem('themeStyle', name); } catch(e) {}
        if (styleToggle) styleToggle.querySelector('.style-label').textContent = styleAbbr(name);
        setActiveMenuItem(name);
      }

      // Load persisted state
      var savedStyle;
      try { savedStyle = localStorage.getItem('themeStyle'); } catch (e) {}
      savedStyle = savedStyle || 'oxblood-editorial';
      html.setAttribute('data-style', savedStyle);
      if (styleToggle) styleToggle.querySelector('.style-label').textContent = styleAbbr(savedStyle);
      setActiveMenuItem(savedStyle);

      // --- Dropdown toggle (click, not hover) ---
      if (styleToggle && styleDropdown) {
        styleToggle.addEventListener('click', function(e) {
          e.stopPropagation();
          var isOpen = styleDropdown.classList.toggle('open');
          styleToggle.setAttribute('aria-expanded', isOpen);
        });

        // Close dropdown when a style is picked
        styleMenuItems.forEach(function(item) {
          item.addEventListener('click', function(e) {
            e.stopPropagation();
            var styleName = this.getAttribute('data-style');
            if (styleName) {
              switchStyle(styleName);
              styleDropdown.classList.remove('open');
              styleToggle.setAttribute('aria-expanded', 'false');
            }
          });
        });

        // Close dropdown on outside click
        document.addEventListener('click', function() {
          styleDropdown.classList.remove('open');
          styleToggle.setAttribute('aria-expanded', 'false');
        });
      }

      if (toggle) {
        toggle.addEventListener('click', function() {
          var isDark = html.getAttribute('data-theme') === 'dark';
          if (isDark) {
            html.removeAttribute('data-theme');
            try { localStorage.setItem('theme', 'light'); } catch(e) {}
            if (themeMeta) themeMeta.content = '#f7f5f0';
          } else {
            html.setAttribute('data-theme', 'dark');
            try { localStorage.setItem('theme', 'dark'); } catch(e) {}
            if (themeMeta) themeMeta.content = '#161412';
          }
        });
      }
    })();