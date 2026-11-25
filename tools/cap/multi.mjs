import { createRequire } from 'module'; const puppeteer = createRequire('C:/Users/aleja/Documents/BACO-OBRA/package.json')('puppeteer-core');
const [dir, ...casos] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 170000, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 }); const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => { localStorage.setItem('ken-guia-v1', '1'); localStorage.setItem('ss-modo', 'ninos'); });
await p.goto('http://localhost:4377/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 }); await new Promise(r => setTimeout(r, 32000));
for (const c of casos) { const [k, v, m] = c.split(':'); await p.evaluate((k, v, m) => window.KEN_SEIS.then(S => { if (m) { document.querySelector(`#ss-modo button[data-m="${m}"]`).click(); } S.abrir(k, v); }), k, v, m || ''); await new Promise(r => setTimeout(r, 9000)); await p.screenshot({ path: `${dir}/${k}${v}${m || ''}.png` }); console.log(c, 'ok'); }
console.log('errors:', errs.slice(0, 5).join(' | ') || 'none'); await b.close();
