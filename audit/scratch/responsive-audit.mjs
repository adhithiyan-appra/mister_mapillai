import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const projectDir = process.cwd();
const distDir = resolve(projectDir, 'dist');
const outDir = resolve(projectDir, 'audit');
const shotDir = resolve(outDir, 'screenshots');
const port = 4177;
const debugPort = 9450;
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };

const routes = [
  { name: 'home', path: '/' },
  { name: 'collections', path: '/collections' },
  { name: 'about', path: '/about' },
  { name: 'contact', path: '/contact' },
  { name: 'track-order', path: '/track-order' },
  { name: 'ceremonies', path: '/ceremonies' },
  { name: 'not-found', path: '/no-such-page' }
];

const viewports = [
  { name: '320x568', width: 320, height: 568, dpr: 1, mobile: true },
  { name: '360x800', width: 360, height: 800, dpr: 1, mobile: true },
  { name: '390x844', width: 390, height: 844, dpr: 1, mobile: true },
  { name: '430x932', width: 430, height: 932, dpr: 1, mobile: true },
  { name: '600x900', width: 600, height: 900, dpr: 1, mobile: false },
  { name: '768x1024', width: 768, height: 1024, dpr: 1, mobile: false },
  { name: '900x600', width: 900, height: 600, dpr: 1, mobile: false },
  { name: '1024x768', width: 1024, height: 768, dpr: 1, mobile: false },
  { name: '1280x800', width: 1280, height: 800, dpr: 1, mobile: false },
  { name: '1440x900', width: 1440, height: 900, dpr: 1, mobile: false },
  { name: '1600x900', width: 1600, height: 900, dpr: 1, mobile: false },
  { name: '1920x1080', width: 1920, height: 1080, dpr: 1, mobile: false },
  { name: '1280x800-touch', width: 1280, height: 800, dpr: 1, mobile: false, touch: true },
  { name: '2560x1080', width: 2560, height: 1080, dpr: 1, mobile: false },
  { name: '390x844-dpr2', width: 390, height: 844, dpr: 2, mobile: true }
];

const screenshotWidths = new Set([360, 390, 768, 1024, 1440, 1920]);

if (!existsSync(distDir)) throw new Error('dist missing; run npm run build first');

const server = createServer((req, res) => {
  const url = req.url.split('?')[0];
  const file = resolve(distDir, '.' + (url === '/' ? '/index.html' : url));
  const ext = extname(file);
  if (ext && existsSync(file)) {
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(readFileSync(file));
  } else if (!ext) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(resolve(distDir, 'index.html')));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

let chrome;
let chromeProfile;
server.listen(port, '127.0.0.1', async () => {
  try {
    await run();
  } catch (error) {
    console.error('RESPONSIVE AUDIT FAILED:', error);
    process.exitCode = 1;
  } finally {
    chrome?.kill();
    if (chrome) await Promise.race([new Promise(resolve => chrome.once('exit', resolve)), sleep(2000)]);
    if (chromeProfile) {
      try { rmSync(chromeProfile, { recursive: true, force: true }); } catch {}
    }
    server.close();
  }
});

async function run() {
  chromeProfile = resolve(outDir, 'scratch', 'chrome-profile');
  rmSync(chromeProfile, { recursive: true, force: true });
  chrome = spawn(chromePath, ['--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${chromeProfile}`, '--disable-cache', '--disable-gpu', '--no-sandbox', '--disable-extensions', 'about:blank']);
  let version;
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) { version = await res.json(); break; }
    } catch {}
  }
  if (!version) throw new Error('Chrome CDP unavailable');

  const target = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 1;
  const pending = new Map();
  const exceptions = [];
  const consoleErrors = [];
  const networkErrors = [];
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(msg.error) : p.resolve(msg.result);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      exceptions.push(d.exception?.description || d.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.method === 'Network.responseReceived' && msg.params.response.status >= 400) {
      networkErrors.push(`${msg.params.response.status} ${msg.params.response.url}`);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = id++;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async path => {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}${path}` });
    await evaluate(`new Promise(resolve => { if (document.readyState === 'complete') resolve(true); else addEventListener('load', () => resolve(true), { once: true }); })`);
    if (path === '/') {
      await evaluate(`new Promise(resolve => {
        const start = performance.now();
        const check = () => {
          const img = document.querySelector('[data-testi-avatar] img');
          if ((img && img.getAttribute('src')) || performance.now() - start > 6500) resolve(true);
          else setTimeout(check, 100);
        };
        check();
      })`);
    }
    await sleep(300);
    await evaluate(`Promise.race([
      Promise.all(document.getAnimations().filter(a => a.effect && a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))),
      new Promise(resolve => setTimeout(resolve, 1500))
    ])`);
  };
  const setViewport = async vp => {
    const touch = vp.mobile || vp.touch === true || vp.width <= 1100;
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.dpr,
      mobile: vp.mobile
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
  };
  const screenshot = async filename => {
    const res = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(resolve(shotDir, filename), Buffer.from(res.data, 'base64'));
  };
  const measure = () => evaluate(`(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const label = el => {
      const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
      const parent = el.parentElement;
      const parentCls = parent && typeof parent.className === 'string' && parent.className.trim() ? '@' + parent.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
      const text = (el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 36);
      return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + cls + parentCls + (text ? '[' + text + ']' : '');
    };
    const isVisible = el => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.01;
    };
    const hasClippingAncestor = el => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    const clipsSelf = (el, axis) => {
      const value = getComputedStyle(el)[axis === 'x' ? 'overflowX' : 'overflowY'];
      return value === 'hidden' || value === 'clip';
    };
    const all = [...document.querySelectorAll('body *')];
    const offscreen = all.filter(el => {
      if (!isVisible(el) || hasClippingAncestor(el)) return false;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return false;
      const s = getComputedStyle(el);
      if (s.position === 'fixed') return false;
      return r.right > vw + 2 || r.left < -2;
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { el: label(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) };
    }).slice(0, 30);
    const clippedText = all.filter(el => {
      if (!isVisible(el) || el.children.length || !el.textContent.trim() || el.classList.contains('mm-sr')) return false;
      return (clipsSelf(el, 'x') && el.scrollWidth > el.clientWidth + 2) || (clipsSelf(el, 'y') && el.scrollHeight > el.clientHeight + 2);
    }).map(el => ({
      el: label(el),
      clientW: el.clientWidth,
      scrollW: el.scrollWidth,
      clientH: el.clientHeight,
      scrollH: el.scrollHeight,
      text: el.textContent.trim().slice(0, 60)
    })).slice(0, 30);
    const images = [...document.querySelectorAll('img')];
    const isDeferredImage = img => img.hasAttribute('data-image-src') || (!img.getAttribute('src') && Boolean(img.closest('.mm-testi__av')));
    const interactive = [...document.querySelectorAll('button, a, input, select, textarea')].filter(isVisible).map(el => {
      const r = el.getBoundingClientRect();
      return { el: label(el), w: Math.round(r.width), h: Math.round(r.height) };
    }).filter(x => x.w > 0 && x.h > 0 && (x.w < 44 || x.h < 44)).slice(0, 30);
    return {
      viewport: { width: vw, height: vh, dpr: devicePixelRatio, innerWidth },
      overflow: {
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        body: document.body.scrollWidth - document.body.clientWidth
      },
      sections: document.querySelectorAll('section').length,
      h1: document.querySelectorAll('h1').length,
      offscreen,
      clippedText,
      brokenImages: images.filter(img => img.complete && img.naturalWidth === 0 && !isDeferredImage(img)).map(img => label(img)).slice(0, 20),
      pendingImages: images.filter(img => !img.complete).length,
      smallTargets: interactive,
      menuButtonDisplay: document.querySelector('.mm-menu-btn') ? getComputedStyle(document.querySelector('.mm-menu-btn')).display : null,
      navVisible: document.querySelector('.mm-nav__links') ? isVisible(document.querySelector('.mm-nav__links')) : null
    };
  })()`);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  const results = [];
  for (const route of routes) {
    for (const vp of viewports) {
      await setViewport(vp);
      await navigate(route.path);
      const metrics = await measure();
      const record = { route: route.name, path: route.path, viewport: vp.name, ...metrics };
      results.push(record);
      if (screenshotWidths.has(vp.width) && vp.name === `${vp.width}x${vp.height}`) {
        await screenshot(`baseline-${route.name}-${vp.width}.png`);
      }
    }
  }

  const interactions = {};
  await setViewport(viewports[2]);
  await navigate('/');
  await evaluate(`document.querySelector('.mm-menu-btn').click()`);
  await sleep(300);
  interactions.menu = await evaluate(`(() => {
    const nav = document.querySelector('.mm-nav__links');
    const s = getComputedStyle(nav);
    return { open: nav.classList.contains('is-open'), visibility: s.visibility, maxHeight: s.maxHeight, bodyOverflow: getComputedStyle(document.body).overflow, bodyInline: document.body.style.overflow, htmlInline: document.documentElement.style.overflow };
  })()`);
  await screenshot('baseline-interaction-menu-390.png');
  await evaluate(`document.querySelector('.mm-menu-btn').click()`);
  await sleep(300);

  await evaluate(`document.querySelector('.mm-testi__av')?.scrollIntoView({block:'center'})`);
  await sleep(300);
  await evaluate(`document.querySelector('.mm-testi__av')?.click()`);
  await sleep(200);
  interactions.testimonial = await evaluate(`(() => {
    const av = document.querySelector('.mm-testi__av');
    const preview = av?.querySelector('.mm-testi__preview');
    return { pressed: Boolean(av?.classList.contains('is-preview-open')), previewOpen: Boolean(preview?.classList.contains('is-open')), previewVisibility: preview ? getComputedStyle(preview).visibility : null, previewOpacity: preview ? getComputedStyle(preview).opacity : null };
  })()`);
  await screenshot('baseline-interaction-testimonial-390.png');

  await navigate('/collections');
  await evaluate(`document.querySelector('.mm-carousel').scrollIntoView({block:'center'})`);
  await sleep(400);
  interactions.carousel = await evaluate(`(() => ({ before: [...document.querySelectorAll('.mm-item3d')].findIndex(c => c.classList.contains('is-front')) }))()`);
  await evaluate(`document.querySelector('.mm-cctrl button[aria-label="Next look"]').click()`);
  await sleep(900);
  interactions.carousel.after = await evaluate(`[...document.querySelectorAll('.mm-item3d')].findIndex(c => c.classList.contains('is-front'))`);
  await screenshot('baseline-interaction-carousel-390.png');

  await navigate('/track-order');
  await evaluate(`document.querySelector('.mm-track-sample').click()`);
  await sleep(500);
  interactions.trackOrder = await measure();
  await screenshot('baseline-interaction-track-390.png');

  await navigate('/contact');
  await evaluate(`(() => {
    const set = (id, value) => { const el = document.getElementById(id); if (!el) return; const setter = Object.getOwnPropertyDescriptor(el.constructor.prototype, 'value').set; setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set('nm', 'Audit User'); set('ph', '9876543210'); set('ct', 'Chennai');
    document.querySelector('.mm-form-wrap button[type="submit"]').click();
  })()`);
  await sleep(500);
  interactions.booking = { ...(await measure()), step: await evaluate(`document.getElementById('booking-step-title')?.textContent.trim()`) };
  await screenshot('baseline-interaction-booking-390.png');

  const summary = {
    generatedAt: new Date().toISOString(),
    pages: routes.map(r => r.name),
    viewports: viewports.map(v => v.name),
    counts: {
      records: results.length,
      overflowRecords: results.filter(r => r.overflow.document > 0 || r.overflow.body > 0).length,
      offscreenRecords: results.filter(r => r.offscreen.length).length,
      clippedTextRecords: results.filter(r => r.clippedText.length).length,
      brokenImageRecords: results.filter(r => r.brokenImages.length).length,
      smallTargetRecords: results.filter(r => r.smallTargets.length).length
    },
    exceptions,
    consoleErrors,
    networkErrors,
    interactions,
    results
  };
  writeFileSync(resolve(outDir, 'responsive-baseline.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ counts: summary.counts, exceptions: exceptions.length, consoleErrors: consoleErrors.length, networkErrors: networkErrors.length, interactions: {
    menu: interactions.menu,
    testimonial: interactions.testimonial,
    carousel: interactions.carousel,
    bookingStep: interactions.booking.step
  } }, null, 2));
  ws.close();
}
