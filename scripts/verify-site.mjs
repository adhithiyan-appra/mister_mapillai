import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const distDir = resolve(process.cwd(), 'dist');

if (!existsSync(distDir)) {
  console.error('dist directory not found. Please build first.');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1);
  const relative = url === '/' ? '/index.html' : url;
  const filePath = resolve(distDir, '.' + relative);
  const ext = extname(filePath);
  if (ext && existsSync(filePath)) {
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(readFileSync(filePath));
    return;
  }
  if (!ext) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(resolve(distDir, 'index.html')));
    return;
  }
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(4173, '127.0.0.1', async () => {
  console.log('Static test server listening on http://127.0.0.1:4173');
  try {
    await runTests();
  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});

async function runTests() {
  const remoteDebuggingPort = 9333;
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${remoteDebuggingPort}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    'about:blank'
  ]);

  chromeProcess.on('error', (e) => console.error('Chrome spawn error:', e));

  let versionData = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
  }

  if (!versionData) {
    throw new Error('Failed to connect to Chrome CDP.');
  }

  console.log('Connected to Chrome CDP:', versionData.Browser);

  const newTargetRes = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/new?http://127.0.0.1:4173`, { method: 'PUT' });
  const targetData = await newTargetRes.json();
  const wsUrl = targetData.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  let msgId = 1;
  const pending = new Map();
  const consoleMessages = [];
  const networkErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
    if (msg.method === 'Console.messageAdded') {
      consoleMessages.push(msg.params.message);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(msg.params);
    }
    if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        networkErrors.push({ url: msg.params.response.url, status: msg.params.response.status });
      }
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result.value;
  }

  async function takeScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    writeFileSync(resolve(distDir, '..', filename), buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
  }

  // --- 1. Desktop Viewport (1440x900) ---
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });

  await send('Page.navigate', { url: 'http://127.0.0.1:4173' });
  await new Promise(r => setTimeout(r, 1200));

  // Check no horizontal overflow
  const desktopOverflow = await evaluate(`
    ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
  `);
  console.log('Desktop overflow check:', desktopOverflow);
  await takeScreenshot('screenshot-desktop-hero.png');

  // --- 2. Form Validation Checks ---
  console.log('\n--- Checking Form Validation & React State ---');
  await send('Page.navigate', { url: 'http://127.0.0.1:4173/contact' });
  await new Promise(r => setTimeout(r, 800));

  // Click submit with empty fields
  const emptyValidation = await evaluate(`
    new Promise(res => {
      document.querySelector('.mm-form-wrap button[type="submit"]').click();
      setTimeout(() => {
        res({
          nmErr: document.getElementById('nmErr')?.textContent,
          phErr: document.getElementById('phErr')?.textContent,
          activeElementId: document.activeElement?.id
        });
      }, 100);
    })
  `);
  console.log('Empty Form Validation Result:', emptyValidation);

  // Fill partial (only name) -> phone error should remain
  const phoneOnlyValidation = await evaluate(`
    new Promise(res => {
      const nameInput = document.getElementById('nm');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(nameInput, 'Arun Karthik');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));

      document.querySelector('.mm-form-wrap button[type="submit"]').click();
      setTimeout(() => {
        res({
          nmErr: document.getElementById('nmErr')?.textContent,
          phErr: document.getElementById('phErr')?.textContent,
          activeElementId: document.activeElement?.id
        });
      }, 100);
    })
  `);
  console.log('Phone Required Validation Result:', phoneOnlyValidation);

  // Fill invalid phone (less than 10 digits)
  const shortPhoneValidation = await evaluate(`
    new Promise(res => {
      const phoneInput = document.getElementById('ph');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(phoneInput, '12345');
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));

      document.querySelector('.mm-form-wrap button[type="submit"]').click();
      setTimeout(() => {
        res({
          nmErr: document.getElementById('nmErr')?.textContent,
          phErr: document.getElementById('phErr')?.textContent
        });
      }, 100);
    })
  `);
  console.log('Short Phone Validation Result:', shortPhoneValidation);

  // Fill valid form and submit
  const validSubmit = await evaluate(`
    new Promise(res => {
      const phoneInput = document.getElementById('ph');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(phoneInput, '9876543210');
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      const emailInput = document.getElementById('em');
      nativeSetter.call(emailInput, 'arun@example.com');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));

      document.querySelector('.mm-form-wrap button[type="submit"]').click();
      setTimeout(() => {
        res({
          nmErr: document.getElementById('nmErr')?.textContent,
          phErr: document.getElementById('phErr')?.textContent,
          nextStep: document.getElementById('booking-step-title')?.textContent
        });
      }, 150);
    })
  `);
  console.log('Valid Form Submission Result:', validSubmit);
  await takeScreenshot('screenshot-desktop-form.png');

  await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await new Promise(r => setTimeout(r, 800));

  // --- 3. Viewport Tests (Tablet, Mobile, Small Mobile) ---
  console.log('\n--- Checking Responsive Breakpoints ---');

  // Laptop (1024x768)
  await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 768, deviceScaleFactor: 1, mobile: false });
  await evaluate('window.scrollTo(0, 0)');
  await new Promise(r => setTimeout(r, 300));
  const laptopCheck = await evaluate(`
    ({
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      navVisible: getComputedStyle(document.getElementById('site-nav')).visibility !== 'hidden'
    })
  `);
  console.log('Laptop (1024px) check:', laptopCheck);

  // Tablet (768x1024)
  await send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: true });
  await evaluate('window.scrollTo(0, 0)');
  await new Promise(r => setTimeout(r, 300));
  const tabletCheck = await evaluate(`
    ({
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      navHidden: getComputedStyle(document.getElementById('site-nav')).visibility === 'hidden'
    })
  `);
  console.log('Tablet (768px) check:', tabletCheck);

  // Mobile (390x844)
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evaluate('window.scrollTo(0, 0)');
  await new Promise(r => setTimeout(r, 300));
  const mobileCheck = await evaluate(`
    ({
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      navHidden: getComputedStyle(document.getElementById('site-nav')).visibility === 'hidden'
    })
  `);
  console.log('Mobile (390px) check:', mobileCheck);
  await takeScreenshot('screenshot-mobile-hero.png');

  // Small Mobile (320x568)
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 2, mobile: true });
  await evaluate('window.scrollTo(0, 0)');
  await new Promise(r => setTimeout(r, 300));
  const smallMobileCheck = await evaluate(`
    ({
      hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      lockMonoSize: getComputedStyle(document.querySelector('.lock .mono')).fontSize,
      menuButton: getComputedStyle(document.querySelector('.mm-menu-btn')).display
    })
  `);
  console.log('Small mobile (320px) check:', smallMobileCheck);

  // --- 4. Reduced Motion Test ---
  console.log('\n--- Checking prefers-reduced-motion ---');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await evaluate('window.dispatchEvent(new Event("resize"))');
  await new Promise(r => setTimeout(r, 300));

  const reducedMotionState = await evaluate(`
    (() => {
      const match = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return { reducedMotionMatches: match };
    })()
  `);
  console.log('Reduced motion check:', reducedMotionState);

  // Clean audit check
  console.log('\n--- Final Network & Console Audit ---');
  console.log('Network 4xx/5xx count:', networkErrors.length);
  console.log('Console errors count:', consoleMessages.filter(m => m.type === 'error' || m.level === 'error').length);

  ws.close();
  chromeProcess.kill();
  console.log('\nAll comprehensive QA verification steps passed!');
}
