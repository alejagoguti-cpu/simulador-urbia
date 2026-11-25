import { createRequire } from 'module'; const puppeteer = createRequire('C:/Users/aleja/Documents/BACO-OBRA/package.json')('puppeteer-core');
const [url, out, sel, wait = '30000'] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await new Promise(r => setTimeout(r, +wait));
await p.evaluate(() => { const s = [...document.querySelectorAll('button')].find(b => /Saltar/.test(b.textContent)); if (s) s.click(); });
if (sel) { await p.click(sel).catch(e => errs.push('click ' + e.message)); await new Promise(r => setTimeout(r, 1500)); }
await p.screenshot({ path: out }); console.log('errors:', errs.filter(e => !/GPU|WebGL|THREE/.test(e)).slice(0, 8).join(' | ') || 'none'); await b.close();
