import {writeFile} from 'node:fs/promises';

const port = process.argv[2] || '9223';
const viewportWidth = Number(process.argv[3] || 390);
const viewportHeight = Number(process.argv[4] || 844);
const screenshotPath = process.argv[5] || '';
const pageUrl = process.argv[6] || 'http://127.0.0.1:4174/preview/';
const targets = await fetch(`http://127.0.0.1:${port}/json`).then((response) => response.json());
const target = targets.find((item) => item.type === 'page' && item.url.includes('127.0.0.1'));

if (!target?.webSocketDebuggerUrl) {
  throw new Error('No browser page target was returned.');
}

const socket = new WebSocket(target.webSocketDebuggerUrl);
let sequence = 0;
const pending = new Map();

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const {resolve, reject} = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, {once: true});
  socket.addEventListener('error', reject, {once: true});
});

function command(method, params = {}) {
  sequence += 1;
  const id = sequence;
  socket.send(JSON.stringify({id, method, params}));
  return new Promise((resolve, reject) => pending.set(id, {resolve, reject}));
}

await command('Runtime.enable');
await command('Page.enable');
await command('Emulation.setDeviceMetricsOverride', {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: viewportWidth,
  screenHeight: viewportHeight
});
await command('Page.navigate', {url: pageUrl});
await new Promise((resolve) => setTimeout(resolve, 1800));

const expression = `(() => {
  const selectors = [
    'html',
    'body',
    '#root',
    '.j-promo',
    '.j-promo-code-message',
    '.page-width',
    '.hero-v2--bg-image > .page-width',
    '.hero-v2__swiper',
    '.hero-v2__layout',
    '.hero-v2__main',
    '.hero-v2__heading',
    '.hero-v2__desc',
    '.ba-results__header',
    '.header'
  ];
  const result = {
    innerWidth: window.innerWidth,
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    elements: {}
  };
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    result.elements[selector] = {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      boxSizing: style.boxSizing,
      overflowX: style.overflowX,
      minWidth: style.minWidth,
      maxWidth: style.maxWidth,
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      fontSize: style.fontSize,
      whiteSpace: style.whiteSpace
    };
  }
  return result;
})()`;

const evaluation = await command('Runtime.evaluate', {
  expression,
  returnByValue: true,
  awaitPromise: true
});

console.log(JSON.stringify(evaluation.result.value, null, 2));

if (screenshotPath) {
  const screenshot = await command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
}

socket.close();
