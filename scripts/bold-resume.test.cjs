const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer-core');
const { Launcher } = require('chrome-launcher');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const csp = config['Content-Security-Policy'];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.pdf': 'application/pdf' };
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

(async () => {
  assert.deepEqual(fs.readFileSync(path.join(root, 'SRA-Resume.pdf')), fs.readFileSync(path.join(root, 'SRA-Resume-072926.pdf')));
  assert.match(csp, /connect-src 'self' https:\/\/formspree.io/);
  assert.match(csp, /form-action 'self' https:\/\/formspree.io/);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const profile = fs.mkdtempSync(path.join(root, '.restore-browser-'));
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath: Launcher.getInstallations()[0], headless: 'new', userDataDir: profile, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const file of ['bold-resume-preview.html']) {
      for (const width of [390, 768, 1440]) {
        const page = await browser.newPage();
        const errors = [], failed = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', req => failed.push(`${req.url()}: ${req.failure().errorText}`));
        await page.setViewport({ width, height: 900 });
        await page.goto(`${base}/${file}`, { waitUntil: 'networkidle0', timeout: 30000 });
        assert.deepEqual(errors, [], `${file} ${width}: runtime errors`);
        await page.waitForFunction(() => document.documentElement.dataset.boldReady === 'true');
        const lines = await page.$eval('.hero-name', el => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
        assert.ok(lines <= 3, `Hero must not wrap beyond three lines: ${lines}`);
        assert.equal(await page.$$eval('.bold-skill-panel', els => els.length), 6);
        await page.evaluate(() => document.querySelector('.bold-skill-panel').click());
        assert.equal(await page.$eval('.bold-skill-panel', el => el.getAttribute('aria-expanded')), 'true');
        if (width === 1440) {
          await page.waitForFunction(() => Boolean(ScrollTrigger.getById('bold-experience-pin')));
          await page.waitForFunction(() => Boolean(ScrollTrigger.getById('bold-summary-scrub')));
          await page.click('#bold-motion-toggle');
          assert.equal(await page.evaluate(() => Boolean(ScrollTrigger.getById('bold-experience-pin'))), false);
          await page.click('#bold-motion-toggle');
        }
        await page.evaluate(() => document.querySelector('#hero').scrollIntoView({ behavior: 'instant' }));
        const layout = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, btn: getComputedStyle(document.querySelector('.btn')).display }));
        assert.ok(layout.scroll <= layout.width + 1, `${file} ${width}: horizontal overflow ${JSON.stringify(layout)}`);
        assert.ok(['flex', 'inline-flex'].includes(layout.btn), `${file}: button styles must be global`);
        if (file !== 'thank-you.html') {
          assert.equal(await page.$eval('.stats-grid', el => getComputedStyle(el).display), 'grid');
          await page.evaluate(() => document.querySelector('#skill-wheel').scrollIntoView({ block: 'center', behavior: 'instant' }));
          await new Promise(resolve => setTimeout(resolve, 500));
          const nodeCount = await page.evaluate(() => wheelNodeMeshes.length);
          assert.equal(nodeCount, 35, `${file}: wheel initialized once`);
          await page.evaluate(() => document.querySelector('#hero').scrollIntoView({ behavior: 'instant' }));
          await new Promise(resolve => setTimeout(resolve, 250));
          await page.evaluate(() => document.querySelector('#skill-wheel').scrollIntoView({ block: 'center', behavior: 'instant' }));
          await new Promise(resolve => setTimeout(resolve, 250));
          assert.equal(await page.evaluate(() => wheelNodeMeshes.length), nodeCount, `${file}: wheel re-entry must not duplicate nodes`);
          await page.click('[data-cat="Switch & Facility Ops"]');
          assert.equal(await page.$eval('#skills-count', el => el.textContent), '6 of 35 skills');
          assert.equal(await page.$eval('.skill-category', el => getComputedStyle(el).display), 'block');
          await page.click('[data-cat="all"]');
          await page.type('#skill-search', 'Cisco');
          assert.equal(await page.$eval('#skills-count', el => el.textContent), '1 of 35 skills');
          assert.equal(new URL(page.url()).searchParams.get('skillSearch'), 'Cisco');
          await page.evaluate(() => {
            const input = document.querySelector('#skill-search'); input.value = ''; input.dispatchEvent(new Event('input'));
            document.querySelector('#contact form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          });
          assert.equal(await page.$eval('#contact-name', el => el.getAttribute('aria-invalid')), 'true');
          assert.equal(await page.evaluate(() => document.activeElement.id), 'contact-name');
          assert.equal(new URL(page.url()).searchParams.has('skillSearch'), false);
          await page.evaluate(() => { const input = document.querySelector('#skill-search'); input.value = ''; input.dispatchEvent(new Event('input')); });
          if (width <= 768) {
            assert.equal(await page.$eval('.nav-links', el => el.inert), true);
            await page.click('#nav-toggle');
            assert.equal(await page.$eval('main', el => el.inert), true);
            await page.keyboard.press('Escape');
            assert.equal(await page.$eval('main', el => el.inert), false);
            assert.equal(await page.$eval('.nav-links', el => el.inert), true);
          }
          // Preserve every main-content word from the backed-up original.
          const original = fs.readFileSync(path.join(root, 'backups/restore-2026-09-30/index.html'), 'utf8');
          // Validation legitimately changes error text; compare after reload instead.
          await page.reload({ waitUntil: 'networkidle0' });
          const preserved = await page.evaluate(html => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const normalize = node => {
              const clone = node.cloneNode(true);
              clone.querySelectorAll('#skills-count, .wheel-fallback, .sr-only:not(.section-label), #visualizations-pause, #skills-empty, #form-status, .bold-skills-rail, .bold-marquee, .bold-motion-toggle').forEach(el => el.remove());
              clone.querySelectorAll('.stat-num').forEach(el => { el.textContent = el.dataset.target + '+'; });
              return clone.textContent.replace(/\s+/g, '');
            };
            return normalize(doc.querySelector('main')) === normalize(document.querySelector('main'));
          }, original);
          assert.ok(preserved, `${file}: original main content preserved`);
          if (width === 1440) {
            await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
            for (const theme of ['light', 'dark']) {
              await page.evaluate(theme => {
                document.documentElement.setAttribute('data-theme', theme);
                document.querySelector('#hero').scrollIntoView({ behavior: 'instant' });
              }, theme);
              for (const variant of ['primary', 'secondary']) {
                await page.hover(`.hero-cta .btn-${variant}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                const colors = await page.$eval(`.hero-cta .btn-${variant}`, (el, variant) => {
                  const css = getComputedStyle(el);
                  const probe = document.createElement('span');
                  probe.style.color = variant === 'primary' ? 'var(--gold-dark)' : 'var(--gold)';
                  document.body.appendChild(probe);
                  const accent = getComputedStyle(probe).color;
                  probe.remove();
                  return { background: css.backgroundColor, text: css.color, border: css.borderTopColor, accent };
                }, variant);
                if (variant === 'primary') {
                  assert.equal(colors.background, colors.accent, `${file} ${theme}: primary hover accent`);
                  assert.equal(colors.text, 'rgb(255, 255, 255)', `${file} ${theme}: primary hover text`);
                } else {
                  assert.equal(colors.text, colors.accent, `${file} ${theme}: secondary hover text`);
                  assert.equal(colors.border, colors.accent, `${file} ${theme}: secondary hover border`);
                  assert.notEqual(colors.background, 'rgb(8, 145, 178)', 'Secondary must not turn teal');
                }
              }
            }
            assert.equal(await page.$eval('meta[name="robots"]', el => el.content), file === 'index.html' ? 'index, follow' : 'noindex, follow');
          }
          assert.deepEqual(errors, [], `${file}: errors after interactions`);
        }
        console.log(`PASS ${file} ${width}px; network failures: ${JSON.stringify(failed)}`);
        await page.close();
      }
    }
    const guidelines = await browser.newPage();
    await guidelines.goto(`${base}/bold-resume-preview.html?skillCategory=Routing%20%26%20Transport&skillSearch=Cisco`, { waitUntil: 'networkidle0' });
    assert.equal(await guidelines.$eval('#skill-search', el => el.value), 'Cisco');
    assert.equal(await guidelines.$eval('#skills-count', el => el.textContent), '1 of 35 skills');
    assert.equal(await guidelines.$eval('[data-cat="Routing & Transport"]', el => el.getAttribute('aria-pressed')), 'true');
    await guidelines.evaluate(() => {
      const search = document.querySelector('#skill-search'); search.value = 'no-matching-skill'; search.dispatchEvent(new Event('input'));
    });
    assert.equal(await guidelines.$eval('#skills-empty', el => el.hidden), false);
    await guidelines.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await guidelines.evaluate(() => document.querySelector('#skill-wheel').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(await guidelines.evaluate(() => wheelRAF), null, 'Reduced motion stops continuous wheel frames');
    await guidelines.setRequestInterception(true);
    guidelines.on('request', req => {
      if (req.url().startsWith('https://formspree.io/')) req.respond({ status: 500, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"error":"sensitive-server-detail"}' });
      else req.continue();
    });
    await guidelines.evaluate(() => {
      for (const [id, value] of Object.entries({ 'contact-name': 'Local test', 'contact-email': 'test@example.com', 'contact-subject': 'Mock error', 'contact-message': 'Never sent.' })) document.getElementById(id).value = value;
      document.querySelector('#contact form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await guidelines.waitForFunction(() => document.querySelector('#form-error').style.display === 'block');
    assert.match(await guidelines.$eval('#form-error', el => el.textContent), /try again or reach out on LinkedIn/);
    assert.equal(await guidelines.$eval('#contact-message', el => el.value), 'Never sent.');
    assert.equal(await guidelines.$eval('#contact form', el => el.getAttribute('aria-busy')), 'false');
    assert.equal(await guidelines.$eval('button[type="submit"]', el => el.disabled), false);
    const warning = await guidelines.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented;
    });
    assert.equal(warning, true, 'Unsent messages trigger a navigation warning');
    console.log('PASS URL filter restoration, empty results, static reduced-motion rendering, actionable mocked errors, and unsent-message warning');
    await guidelines.close();
    const assets = await browser.newPage();
    await assets.goto(`${base}/bold-resume-preview.html`, { waitUntil: 'networkidle0' });
    assert.ok(await assets.evaluate(async () => {
      const image = new Image(); image.src = '/assets/og-image.png'; await image.decode();
      return image.naturalWidth > 0 && image.naturalHeight > 0;
    }), 'Social preview image decodes');
    await assets.emulateMediaType('print');
    assert.equal(await assets.$eval('#skill-wheel', el => getComputedStyle(el.parentElement.parentElement).display), 'none');
    await assets.setJavaScriptEnabled(false);
    await assets.emulateMediaType('screen');
    await assets.reload({ waitUntil: 'networkidle0' });
    assert.equal(await assets.$eval('.stats-grid', el => getComputedStyle(el).display), 'grid');
    assert.equal(await assets.$eval('#career-locations', el => getComputedStyle(el).position), 'static');
    console.log('PASS social image decoding, print visualization handling, and no-JavaScript content');
    await assets.close();
    for (const mode of ['blocked-cdn', 'reduced-motion']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      let submissions = 0;
      page.on('request', req => {
        if (req.url().startsWith('https://formspree.io/')) {
          submissions++;
          req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true}' });
        } else if (mode === 'blocked-cdn' && req.url().startsWith('https://cdnjs.cloudflare.com/')) req.abort();
        else req.continue();
      });
      if (mode === 'reduced-motion') await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.goto(`${base}/bold-resume-preview.html`, { waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('#career-locations', el => getComputedStyle(el).position), 'static');
      await page.evaluate(() => {
        for (const [id, value] of Object.entries({ 'contact-name': 'Local test', 'contact-email': 'test@example.com', 'contact-subject': 'Mock only', 'contact-message': 'Intercepted locally; never sent.' })) document.getElementById(id).value = value;
        document.querySelector('#contact form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await page.waitForFunction(() => location.pathname === '/thank-you.html');
      assert.equal(submissions, 1);
      assert.deepEqual(errors, []);
      console.log(`PASS ${mode}: readable map fallback and mocked form submission`);
      await page.close();
    }
    console.log('All bold resume preview browser tests passed. No real contact messages sent.');
  } finally {
    if (browser) await browser.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
