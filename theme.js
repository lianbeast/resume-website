    (function() {
      // JS is alive — drop the .no-js class so its fallback CSS never applies
      document.documentElement.classList.remove('no-js');

      var theme;
      try { theme = localStorage.getItem('theme'); } catch(e) {}
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
        var tm = document.querySelector('meta[name="theme-color"][media*="dark"]');
        if (tm) tm.content = '#161412';
      }

  // Async font stylesheet (non-blocking, no inline handlers — CSP forbids them)
  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=optional';
  document.head.appendChild(fonts);
})();
