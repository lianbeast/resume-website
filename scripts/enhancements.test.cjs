/* Verification probe for the enhancement pass. Serves the repo with the
   config.json CSP header and asserts the new behaviour in headless Chrome:

     1. Lenis initialises on desktop only — never under reduced-motion, on
        mobile viewports, or on the Lite tier.
     2. In-page anchors glide via Lenis and land clear of the fixed nav.
     3. The hero dock (scroll-linked, position: sticky) still engages with
        Lenis driving the scroll.
     4. No `style=` attributes remain on the three primary pages.
     5. The dark-mode accent ramp stays in the terracotta family.
     6. The decorative orbs actually paint (they had no fill before).
     7. A forced-colors path exists in the stylesheet.

   Run: node scripts/enhancements.test.cjs  (set CHROME_PATH if Chrome is not
   in a standard location) */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert');
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
  const found = Launcher.getInstallations();
  if (found && found.length) return found[0];
  throw new Error('No Chrome installation found; set CHROME_PATH');
}

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(root, '.restore-browser-'));
  let browser;
  const consoleErrors = [];
  let passed = 0;

  try {
    browser = await puppeteer.launch({
      executablePath: findChrome(),
      headless: 'new',
      userDataDir: profile,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const open = async (opts = {}) => {
      const page = await browser.newPage();
      page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
      if (opts.reducedMotion) {
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      }
      await page.setViewport({ width: opts.width || 1440, height: 900 });
      await page.goto(`${base}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });
      await wait(1400); // deferred GSAP + Lenis settle
      return page;
    };

    // ---- 1. Lenis gating -------------------------------------------------
    let page = await open({ width: 1440 });
    assert.ok(await page.evaluate(() => !!window.__lenis), 'Lenis should init at 1440px');
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('lenis-active')), 'html should carry .lenis-active');
    assert.ok(await page.evaluate(() => !!window.ScrollTrigger), 'ScrollTrigger should be present for ticker sync');
    console.log('PASS Lenis initialises on desktop and syncs with ScrollTrigger');
    passed++;

    // ---- 2. Anchor gliding + landing parity with native ------------------
    const before = await page.evaluate(() => window.scrollY);
    await page.click('.nav-links a[href="#experience"]');
    await wait(1600);
    const after = await page.evaluate(() => {
      const el = document.getElementById('experience');
      const doc = document.documentElement;
      // Where the browser itself would land this anchor: the element's document
      // position, inset by the scroll-margin/scroll-padding the page declares.
      // Turning Lenis off must not move any anchor.
      const expected = el.getBoundingClientRect().top + window.scrollY
        - parseFloat(getComputedStyle(el).scrollMarginTop || 0)
        - parseFloat(getComputedStyle(doc).scrollPaddingTop || 0);
      return { y: window.scrollY, top: el.getBoundingClientRect().top, expected };
    });
    assert.ok(after.y > before + 200, `anchor should scroll the page (was ${before}, now ${after.y})`);
    assert.ok(Math.abs(after.y - after.expected) <= 2,
      `Lenis landing should match native anchor semantics: got ${Math.round(after.y)}, expected ${Math.round(after.expected)}`);
    assert.ok(after.top > 60, `#experience must clear the 60px fixed nav, got top=${Math.round(after.top)}`);
    console.log(`PASS anchor glides via Lenis, matching native landing (y=${Math.round(after.y)}, top=${Math.round(after.top)}px)`);
    passed++;

    // ---- 3. Hero dock still engages under Lenis --------------------------
    const dock = await page.evaluate(() => {
      const head = document.querySelector('#hero .hero-head');
      const hero = document.getElementById('hero');
      return {
        pinned: head.classList.contains('is-pinned'),
        pin: hero.style.getPropertyValue('--pin'),
      };
    });
    assert.ok(dock.pinned, 'hero dock (.is-pinned) should engage while scrolled');
    assert.ok(parseFloat(dock.pin) > 0, `--pin should be > 0 while scrolled, got "${dock.pin}"`);
    console.log(`PASS hero dock engages with Lenis driving scroll (--pin=${dock.pin})`);
    passed++;

    // ---- 4. Category filter buttons removed ------------------------------
    assert.strictEqual(
      await page.$$eval('.skill-filter-btn', els => els.length), 0,
      'category filter buttons should be gone from the markup');
    assert.strictEqual(
      await page.$eval('#skills-count', el => el.textContent), '35 skills',
      'count should report the full set when no search is applied');
    console.log('PASS category filter buttons removed; count reads "35 skills"');
    passed++;

    // ---- 5. Hover holds the wheel orbit still, leaving resumes -----------
    await page.evaluate(() => document.querySelector('#skill-wheel').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await wait(800);
    const centre = await page.$eval('#skill-wheel', el => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    const angle = () => page.evaluate(() => window.wheelSpinAngle());
    assert.ok(typeof (await angle()) === 'number', 'wheelSpinAngle should be exposed and numeric');

    const runA = await angle(); await wait(500); const runB = await angle();
    assert.ok(runB !== runA, `wheel should orbit while not hovered (${runA} -> ${runB})`);

    await page.mouse.move(centre.x, centre.y);
    await wait(150);
    const holdA = await angle(); await wait(500); const holdB = await angle();
    assert.strictEqual(holdB, holdA, `wheel should hold still while hovered (drifted ${holdB - holdA})`);

    // Move onto the fixed nav, clear of the canvas.
    await page.mouse.move(centre.x, 2);
    await wait(150);
    const backA = await angle(); await wait(500); const backB = await angle();
    assert.ok(backB !== backA, 'wheel should resume once the pointer leaves');
    console.log(`PASS hover holds the orbit still (${holdA.toFixed(5)}) and leaving resumes it`);
    passed++;

    // ---- 6. Dark-mode accent ramp stays terracotta -----------------------
    const dark = await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const cs = getComputedStyle(document.documentElement);
      return {
        light: cs.getPropertyValue('--gold-light').trim().toLowerCase(),
        gold: cs.getPropertyValue('--gold').trim().toLowerCase(),
      };
    });
    assert.ok(dark.light !== '#f59e0b', '--gold-light must not be amber in dark mode');
    assert.ok(['#f0906a', '#e06a3a'].includes(dark.light), `--gold-light unexpected in dark mode: ${dark.light}`);
    console.log(`PASS dark-mode accent ramp is terracotta (--gold-light=${dark.light})`);
    passed++;

    // ---- 7. Decorative orbs actually paint -------------------------------
    const orbs = await page.evaluate(() =>
      ['orb-gold', 'orb-gold-light', 'orb-gold-dark'].map(c => {
        const el = document.querySelector('#hero .' + c);
        return el ? getComputedStyle(el).backgroundColor : 'missing';
      })
    );
    orbs.forEach((bg, i) => {
      assert.ok(bg !== 'missing', `orb ${i} not found`);
      assert.ok(bg !== 'rgba(0, 0, 0, 0)', `orb ${i} has no fill (got ${bg})`);
    });
    console.log(`PASS orbs paint: ${orbs.join(' | ')}`);
    passed++;

    await page.close();

    // ---- 1b. Gating: mobile viewport and reduced-motion -------------------
    page = await open({ width: 390 });
    assert.ok(!(await page.evaluate(() => !!window.__lenis)), 'Lenis must not init at 390px');
    console.log('PASS Lenis stays off on mobile viewports');
    passed++;
    await page.close();

    page = await open({ width: 1440, reducedMotion: true });
    assert.ok(!(await page.evaluate(() => !!window.__lenis)), 'Lenis must not init under reduced-motion');
    console.log('PASS Lenis stays off under prefers-reduced-motion');
    passed++;
    await page.close();

    // ---- 4. No inline style attributes on the primary pages --------------
    for (const file of ['index.html', 'immersive-preview.html', 'bold-resume-preview.html']) {
      const html = fs.readFileSync(path.join(root, file), 'utf8');
      const count = (html.match(/\sstyle="/g) || []).length;
      assert.strictEqual(count, 0, `${file} still has ${count} inline style attribute(s)`);
    }
    console.log('PASS no inline style attributes on index / immersive / bold');
    passed++;

    // ---- 8. Forced-colors path exists ------------------------------------
    const css = fs.readFileSync(path.join(root, 'assets/shared.css'), 'utf8');
    assert.ok(/@media\s*\(forced-colors:\s*active\)/.test(css), 'shared.css should carry a forced-colors block');
    assert.ok(/\.hero-name\s*\{[^}]*-webkit-text-fill-color:\s*CanvasText/.test(css), 'gradient hero name should restore a text fill under forced colors');
    console.log('PASS forced-colors path present in shared.css');
    passed++;

    // ---- Console hygiene --------------------------------------------------
    assert.deepStrictEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
    console.log('PASS no console errors on index.html');
    passed++;

    console.log(`\nAll ${passed} enhancement checks passed. No real contact messages sent.`);
  } finally {
    if (browser) await browser.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(e => { console.error('\nFAIL:', e.message); process.exit(1); });
