(function() {
  var doc = document.documentElement;

  // JS is alive — drop the .no-js class so its fallback CSS never applies
  doc.classList.remove('no-js');

  var theme;
  try { theme = localStorage.getItem('theme'); } catch(e) {}
  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    doc.setAttribute('data-theme', 'dark');
  }

  // Async font stylesheet (non-blocking, no inline handlers — CSP forbids them)
  var fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=optional';
  document.head.appendChild(fonts);

  // Sync theme-color meta with the current theme (fixes M14)
  function syncThemeColor() {
    var isDark = doc.getAttribute('data-theme') === 'dark';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = isDark ? '#161412' : '#f7f5f0';
  }
  syncThemeColor();

  // Observe data-theme changes (e.g., from nav theme toggle) and sync meta
  var observer = new MutationObserver(syncThemeColor);
  observer.observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
})();