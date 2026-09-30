const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const puppeteer = require('puppeteer-core');
const { Launcher } = require('chrome-launcher');

const root = path.resolve(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const csp = config.match(/Content-Security-Policy = "([^"]+)"/)[1];
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
    for (const file of ['immersive-preview.html']) {
      for (const width of [390, 768, 1440]) {
        const page = await browser.newPage();
        const errors = [], failed = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', req => failed.push(`${req.url()}: ${req.failure().errorText}`));
        await page.setViewport({ width, height: 900 });
        await page.goto(`${base}/${file}`, { waitUntil: 'load', timeout: 30000 });
        assert.deepEqual(errors, [], `${file} ${width}: runtime errors`);
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
          await page.evaluate(() => document.querySelector('[data-cat="Switch & Facility Ops"]').scrollIntoView({ block: 'center', behavior: 'instant' }));
          await page.click('[data-cat="Switch & Facility Ops"]');
          assert.equal(await page.$eval('#skills-count', el => el.textContent), '6 of 35 skills');
          assert.equal(await page.$eval('.skill-category', el => getComputedStyle(el).display), 'block');
          await page.click('[data-cat="all"]');
          await page.type('#skill-search', 'Cisco');
          assert.equal(await page.$eval('#skills-count', el => el.textContent), '1 of 35 skills');
          await page.evaluate(() => {
            const input = document.querySelector('#skill-search'); input.value = ''; input.dispatchEvent(new Event('input'));
            document.querySelector('#contact form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          });
          assert.equal(await page.$eval('#contact-name', el => el.getAttribute('aria-invalid')), 'true');
          await page.waitForFunction(() => document.querySelector('#immersive-world').dataset.ready === 'true');
          assert.equal(await page.$eval('#immersive-world', el => el.dataset.hubs), '7');
          const beforeCamera = await page.$eval('#immersive-world', el => el.dataset.camera);
          await page.evaluate(() => document.querySelector('#hero').scrollIntoView({ behavior: 'instant' }));
          await new Promise(resolve => setTimeout(resolve, 1200));
          const heroCamera = await page.$eval('#immersive-world', el => el.dataset.camera);
          assert.notEqual(beforeCamera, heroCamera, 'Scrolling travels through real 3D space');
          await page.click('#world-explore');
          assert.equal(await page.$eval('main', el => el.inert), true);
          await page.click('#world-next');
          await page.click('#world-turn');
          await new Promise(resolve => setTimeout(resolve, 500));
          assert.notEqual(await page.$eval('#immersive-world', el => el.dataset.camera), heroCamera);
          await page.keyboard.press('Escape');
          assert.equal(await page.$eval('main', el => el.inert), false);
          await page.click('#world-pause');
          await new Promise(resolve => setTimeout(resolve, 150));
          const frames = await page.$eval('#immersive-world', el => el.dataset.frames);
          await new Promise(resolve => setTimeout(resolve, 150));
          assert.equal(await page.$eval('#immersive-world', el => el.dataset.frames), frames, 'Paused scene does not run continuously');
          await page.click('#world-pause');
          // Preserve every main-content word from the backed-up original.
          const original = fs.readFileSync(path.join(root, 'backups/restore-2026-09-30/index.html'), 'utf8');
          // Validation legitimately changes error text; compare after reload instead.
          await page.reload({ waitUntil: 'networkidle0' });
          const preserved = await page.evaluate(html => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const normalize = node => {
              const clone = node.cloneNode(true);
              clone.querySelectorAll('#skills-count, .wheel-fallback, .immersive-kicker, .immersive-scroll-hint, .sr-only, #visualizations-pause, #skills-empty, #form-status').forEach(el => el.remove());
              clone.querySelectorAll('.stat-num').forEach(el => { el.textContent = el.dataset.target + '+'; });
              return clone.textContent.replace(/\s+/g, ' ').trim();
            };
            return normalize(doc.querySelector('main')) === normalize(document.querySelector('main'));
          }, original);
          assert.ok(preserved, `${file}: original main content preserved`);
          assert.deepEqual(errors, [], `${file}: errors after interactions`);
        }
        console.log(`PASS ${file} ${width}px; network failures: ${JSON.stringify(failed)}`);
        await page.close();
      }
    }
    const assets = await browser.newPage();
    await assets.goto(`${base}/immersive-preview.html`, { waitUntil: 'networkidle0' });
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
    assert.equal(await assets.$eval('#career-locations', el => getComputedStyle(el).position), 'relative');
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
      await page.goto(`${base}/immersive-preview.html`, { waitUntil: 'networkidle0' });
      if (mode === 'blocked-cdn') {
        assert.equal(await page.$eval('#career-locations', el => getComputedStyle(el).position), 'relative');
        assert.equal(await page.$eval('#world-explore', el => el.disabled), true);
      } else {
        assert.equal(await page.$eval('#world-pause', el => el.getAttribute('aria-pressed')), 'true');
        await new Promise(resolve => setTimeout(resolve, 150));
        const frames = await page.$eval('#immersive-world', el => el.dataset.frames);
        await new Promise(resolve => setTimeout(resolve, 150));
        assert.equal(await page.$eval('#immersive-world', el => el.dataset.frames), frames);
      }
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
    console.log('All immersive 3D browser tests passed. No real contact messages sent.');
  } finally {
    if (browser) await browser.close();
    server.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
