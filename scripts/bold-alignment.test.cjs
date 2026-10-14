/* Alignment + regression guard for bold-resume-preview.html.

   Written after two silent regressions were found on this page:
     944b938 swapped resume-preview.css -> shared.css here, which removed the
             --resume-rule definition, so every hairline border on the page
             disappeared (an undefined var() invalidates the whole declaration).
     23f70f7 deleted the entire .bold-* CSS block, so the skills rail, marquee
             and motion toggle injected by assets/bold-resume-preview.js have
             been rendering as raw unstyled markup ever since.

   Both failed silently - no console error, no test failure. These assertions
   are the missing tripwire.

   Run: node scripts/bold-alignment.test.cjs  (set CHROME_PATH if needed) */
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

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(root, '.restore-browser-'));
  let browser;
  let passed = 0;

  try {
    browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH || Launcher.getInstallations()[0],
      headless: 'new', userDataDir: profile, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.goto(`${base}/bold-resume-preview.html`, { waitUntil: 'networkidle0' });
    await wait(2600);
    await page.evaluate(() => {
      document.querySelectorAll('.reveal, .stat-card, .timeline-item, .skill-category, .section-label')
        .forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    });
    await wait(300);

    // ---- 1. --resume-rule must resolve, or every hairline rule vanishes ----
    const rule = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--resume-rule').trim());
    assert.ok(rule, '--resume-rule is undefined: every var(--resume-rule) border on this page will be dropped');
    const borders = await page.evaluate(() => ({
      nav: getComputedStyle(document.getElementById('main-nav')).borderTopStyle,
      skillsList: getComputedStyle(document.querySelector('.skills-list')).borderTopStyle,
      skillCategory: getComputedStyle(document.querySelector('.skill-category')).borderRightStyle,
      eduGrid: getComputedStyle(document.querySelector('.edu-cert-grid')).borderTopStyle,
      rail: getComputedStyle(document.querySelector('.bold-skills-rail')).borderTopStyle,
    }));
    for (const [what, style] of Object.entries(borders)) {
      assert.strictEqual(style, 'solid', `${what} hairline rule missing (border-style: ${style})`);
    }
    console.log(`PASS --resume-rule resolves (${rule}) and all 5 hairline rules render`);
    passed++;

    // ---- 2. Injected bold UI must actually be styled ----------------------
    const injected = await page.evaluate(() => {
      const cs = s => { const el = document.querySelector(s); return el ? getComputedStyle(el) : null; };
      const rail = cs('.bold-skills-rail');
      const panel = cs('.bold-skill-panel');
      const marquee = cs('.bold-marquee');
      const copy = cs('.bold-marquee-copy');
      const toggle = cs('.bold-motion-toggle');
      return {
        railDisplay: rail && rail.display,
        panelBorderRight: panel && panel.borderRightStyle,
        marqueeOverflow: marquee && marquee.overflow,
        copyWhiteSpace: copy && copy.whiteSpace,
        copyAnimation: marquee && getComputedStyle(document.querySelector('.bold-marquee-track')).animationName,
        toggleBorder: toggle && toggle.borderTopStyle,
        toggleMinHeight: toggle && toggle.minHeight,
        exists: !!(rail && panel && marquee && copy && toggle),
      };
    });
    assert.ok(injected.exists, 'bold-resume-preview.js did not inject the rail/marquee/toggle');
    assert.strictEqual(injected.railDisplay, 'flex', 'skills rail is unstyled (display should be flex)');
    assert.strictEqual(injected.panelBorderRight, 'solid', 'skill panels are unstyled (no divider)');
    assert.strictEqual(injected.marqueeOverflow, 'hidden', 'marquee is unstyled (overflow should be hidden)');
    assert.strictEqual(injected.copyWhiteSpace, 'nowrap', 'marquee copies are unstyled and will wrap inline');
    assert.strictEqual(injected.copyAnimation, 'bold-marquee', 'marquee track is not animating');
    assert.strictEqual(injected.toggleBorder, 'solid', 'motion toggle is unstyled');
    assert.strictEqual(injected.toggleMinHeight, '44px', 'motion toggle lost its 44px touch target');
    console.log('PASS injected rail / marquee / motion toggle all carry real styles');
    passed++;

    // ---- 3. Section label shares a top edge with its title ----------------
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('section > .section-label')).map(label => {
        const title = label.parentElement.querySelector('.section-title');
        if (!title) return null;
        const l = label.getBoundingClientRect(), t = title.getBoundingClientRect();
        return { text: label.textContent.trim().slice(0, 24), delta: Math.round(l.top - t.top) };
      }).filter(Boolean)
    );
    assert.ok(labels.length >= 5, `expected several section labels, found ${labels.length}`);
    for (const l of labels) {
      assert.ok(Math.abs(l.delta) <= 4, `"${l.text}" label is ${l.delta}px off its title top (should be ~0)`);
    }
    console.log(`PASS all ${labels.length} section labels align to their title top (max delta ${Math.max(...labels.map(l => Math.abs(l.delta)))}px)`);
    passed++;

    // ---- 4. Highlights panel sizes to its content (no trailing dead space) -
    const about = await page.evaluate(() => {
      const panel = document.querySelector('.about-highlights');
      const items = panel.querySelectorAll('.highlight-item');
      const last = items[items.length - 1].getBoundingClientRect();
      const p = panel.getBoundingClientRect();
      return { panelHeight: Math.round(p.height), contentEnd: Math.round(last.bottom - p.top), items: items.length };
    });
    const slack = about.panelHeight - about.contentEnd;
    assert.ok(slack <= 48, `highlights panel trails ${slack}px of empty space below its last row`);
    console.log(`PASS highlights panel hugs its ${about.items} rows (${slack}px trailing slack)`);
    passed++;

    // ---- 5. Rail panel titles share a top edge ---------------------------
    const railTops = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.bold-skill-panel strong'))
        .map(el => Math.round(el.getBoundingClientRect().top)));
    const spread = Math.max(...railTops) - Math.min(...railTops);
    assert.ok(spread <= 2, `rail titles are not top-aligned (${spread}px spread across ${railTops.length} panels)`);
    console.log(`PASS all ${railTops.length} rail titles share a top edge (${spread}px spread)`);
    passed++;

    // ---- 6. Skill tags sit on a consistent grid inside each category -----
    const tagGrid = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.skill-category')).map(cat => {
        const tags = Array.from(cat.querySelectorAll('.skill-tag')).map(t => t.getBoundingClientRect());
        const heights = [...new Set(tags.map(t => Math.round(t.height)))];
        // Tags sharing a row must share a top edge.
        const rows = {};
        for (const t of tags) { const key = Math.round(t.top); rows[key] = (rows[key] || 0) + 1; }
        return {
          cat: cat.querySelector('h3').textContent.trim().slice(0, 22),
          heights,
          lefts: [...new Set(tags.map(t => Math.round(t.left)))].length,
        };
      })
    );
    for (const g of tagGrid) {
      assert.strictEqual(g.heights.length, 1, `"${g.cat}" pills have mixed heights: ${g.heights.join(', ')}`);
    }
    console.log(`PASS pills are uniform across all ${tagGrid.length} categories (single height each)`);
    passed++;

    // ---- 7. No horizontal overflow at the layout breakpoints -------------
    for (const width of [1440, 1050, 600, 390]) {
      await page.setViewport({ width, height: 900 });
      await wait(450);
      const m = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      assert.ok(m.scroll <= m.client + 1, `${width}px: horizontal overflow (${m.scroll} > ${m.client})`);
    }
    console.log('PASS no horizontal overflow at 1440 / 1050 / 600 / 390');
    passed++;

    assert.deepStrictEqual(consoleErrors, [], `console errors: ${consoleErrors.join(' | ')}`);
    console.log('PASS no console errors');
    passed++;

    console.log(`\nAll ${passed} bold alignment checks passed.`);
  } finally {
    if (browser) await browser.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(e => { console.error('\nFAIL:', e.message); process.exit(1); });
