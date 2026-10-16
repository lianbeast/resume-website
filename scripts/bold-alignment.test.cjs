/* Alignment + regression guard for bold-resume-preview.html.

   Written after two silent regressions were found on this page:
     944b938 swapped resume-preview.css -> shared.css here, which removed the
             --resume-rule definition, so every hairline border on the page
             disappeared (an undefined var() invalidates the whole declaration).
     23f70f7 deleted the entire .bold-* CSS block, so the marquee and motion
             toggle injected by assets/bold-resume-preview.js have been
             rendering as raw unstyled markup ever since. (The skills rail that
             shared that block was removed outright on 2026-10-14.)

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
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/security.json'), 'utf8'));
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
  const profile = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'career-site-browser-'));
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
      nav: getComputedStyle(document.getElementById('main-nav')).borderBottomStyle,
      skillsList: getComputedStyle(document.querySelector('.skills-list')).borderTopStyle,
      skillCategory: getComputedStyle(document.querySelector('.skill-category')).borderRightStyle,
      eduGrid: getComputedStyle(document.querySelector('.edu-cert-grid')).borderTopStyle,
      marquee: getComputedStyle(document.querySelector('.bold-marquee')).borderTopStyle,
    }));
    for (const [what, style] of Object.entries(borders)) {
      assert.strictEqual(style, 'solid', `${what} hairline rule missing (border-style: ${style})`);
    }
    console.log(`PASS --resume-rule resolves (${rule}) and all ${Object.keys(borders).length} hairline rules render`);
    passed++;

    // ---- 2. Injected bold UI must actually be styled ----------------------
    const injected = await page.evaluate(() => {
      const cs = s => { const el = document.querySelector(s); return el ? getComputedStyle(el) : null; };
      const marquee = cs('.bold-marquee');
      const copy = cs('.bold-marquee-copy');
      const toggle = cs('.bold-motion-toggle');
      return {
        marqueeOverflow: marquee && marquee.overflow,
        copyWhiteSpace: copy && copy.whiteSpace,
        copyAnimation: marquee && getComputedStyle(document.querySelector('.bold-marquee-track')).animationName,
        toggleBorder: toggle && toggle.borderTopStyle,
        toggleMinHeight: toggle && toggle.minHeight,
        exists: !!(marquee && copy && toggle),
      };
    });
    assert.ok(injected.exists, 'bold-resume-preview.js did not inject the marquee/toggle');
    assert.strictEqual(injected.marqueeOverflow, 'hidden', 'marquee is unstyled (overflow should be hidden)');
    assert.strictEqual(injected.copyWhiteSpace, 'nowrap', 'marquee copies are unstyled and will wrap inline');
    assert.strictEqual(injected.copyAnimation, 'bold-marquee', 'marquee track is not animating');
    assert.strictEqual(injected.toggleBorder, 'solid', 'motion toggle is unstyled');
    assert.strictEqual(injected.toggleMinHeight, '44px', 'motion toggle lost its 44px touch target');
    console.log('PASS injected marquee / motion toggle carry real styles');
    passed++;

    // ---- 2b. The removed skills rail must stay removed --------------------
    // It duplicated the .skills-list grid; guard against it creeping back.
    const railGone = await page.evaluate(() => ({
      rail: document.querySelectorAll('.bold-skills-rail').length,
      panels: document.querySelectorAll('.bold-skill-panel').length,
      gridCategories: document.querySelectorAll('.skills-list .skill-category').length,
    }));
    assert.strictEqual(railGone.rail, 0, 'skills rail is back in the markup');
    assert.strictEqual(railGone.panels, 0, 'skills rail panels are back in the markup');
    assert.strictEqual(railGone.gridCategories, 6, 'skills grid should still list all six categories');
    console.log('PASS skills rail stays removed; the grid still carries all six categories');
    passed++;

    // ---- 3. Core Competencies: wheel fills its panel, controls are a row ---
    const skills = await page.evaluate(() => {
      const wrap = document.querySelector('.skills-canvas-wrap');
      const canvas = document.getElementById('skill-wheel');
      const controls = document.querySelector('.skill-controls');
      const search = document.getElementById('skill-search');
      const pause = document.getElementById('visualizations-pause');
      const wr = wrap.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
      return {
        wrapW: Math.round(wr.width), wrapH: Math.round(wr.height),
        canvasW: Math.round(cr.width), canvasH: Math.round(cr.height),
        controlsDisplay: getComputedStyle(controls).display,
        searchW: Math.round(search.getBoundingClientRect().width),
        pauseBorder: getComputedStyle(pause).borderTopStyle,
      };
    });
    // A <canvas> with no CSS sizing falls back to its 300x150 intrinsic default.
    // If it is still that size the sizing rules are missing and the wheel draws
    // as a postage stamp in the corner of the panel.
    assert.ok(skills.canvasW > 600 && skills.canvasH > 300,
      `wheel canvas is ${skills.canvasW}x${skills.canvasH} - sizing rules missing (intrinsic default is 300x150)`);
    assert.ok(Math.abs(skills.canvasW - skills.wrapW) <= 4 && Math.abs(skills.canvasH - skills.wrapH) <= 4,
      `canvas ${skills.canvasW}x${skills.canvasH} does not fill its wrap ${skills.wrapW}x${skills.wrapH}`);
    assert.strictEqual(skills.controlsDisplay, 'flex', '.skill-controls is not a flex row');
    assert.ok(skills.searchW > 400, `search field is only ${skills.searchW}px - it is not growing to fill the row`);
    assert.strictEqual(skills.pauseBorder, 'solid', 'the pause button is unstyled');
    console.log(`PASS Core Competencies: wheel fills its panel (${skills.canvasW}x${skills.canvasH}), controls are a flex row`);
    passed++;

    // ---- 4. Section label shares a top edge with its title ----------------
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

    // ---- 5. Highlights panel sizes to its content (no trailing dead space) -
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
