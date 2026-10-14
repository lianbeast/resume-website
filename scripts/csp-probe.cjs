/* CSP enforcement probe: serves the repo with the config.json CSP header
   (mirroring scripts/*.test.cjs) and loads every page in headless Chrome,
   collecting securitypolicyviolation events, console errors, and failed
   requests. Exits 1 if any page has a CSP violation. Run:
   node scripts/csp-probe.cjs */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const { Launcher } = require('chrome-launcher');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const csp = config['Content-Security-Policy'];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Content-Security-Policy', csp);
    res.end(data);
  });
});

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [bin], { encoding: 'utf8' }).trim(); } catch {}
  }
  // `which` is Unix-only, so on Windows/macOS fall back to the same discovery
  // the other suites use (chrome-launcher) instead of throwing.
  const installed = Launcher.getInstallations();
  if (installed && installed.length) return installed[0];
  throw new Error('No Chrome installation found; set CHROME_PATH');
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(root, '.restore-browser-'));
  let browser;
  let violationsTotal = 0;
  try {
    browser = await puppeteer.launch({ executablePath: findChrome(), headless: 'new', userDataDir: profile, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const file of ['index.html', 'immersive-preview.html', 'bold-resume-preview.html', 'wheel-v2.html', 'thank-you.html', 'lite.html']) {
      const page = await browser.newPage();
      const consoleMsgs = [];
      const failed = [];
      page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`[${m.type()}] ${m.text()}`); });
      page.on('requestfailed', r => failed.push(`${r.url()} :: ${r.failure().errorText}`));
      await page.setViewport({ width: 1440, height: 900 });
      await page.evaluateOnNewDocument(() => {
        window.__cspv = [];
        document.addEventListener('securitypolicyviolation', e => {
          window.__cspv.push(`${e.violatedDirective} blocked ${e.blockedURL || 'inline'}`);
        });
      });
      await page.goto(`${base}/${file}`, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1200)); // let deferred GSAP/glass settle
      const violations = await page.evaluate(() => window.__cspv);
      violationsTotal += violations.length;
      console.log(`\n=== ${file} ===`);
      console.log(violations.length ? violations.map(v => '  CSP: ' + v).join('\n') : '  CSP: clean');
      if (consoleMsgs.length) console.log(consoleMsgs.map(v => '  ' + v).join('\n'));
      if (failed.length) console.log(failed.map(v => '  FAILED: ' + v).join('\n'));
      await page.close();
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  console.log(`\n${violationsTotal === 0 ? 'All pages clean under CSP' : violationsTotal + ' CSP violation(s) found'}`);
  if (violationsTotal > 0) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
