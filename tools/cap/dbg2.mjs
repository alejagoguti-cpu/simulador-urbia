import { createRequire } from 'module'; const puppeteer = createRequire('C:/Users/aleja/Documents/BACO-OBRA/package.json')('puppeteer-core');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 170000, args: ['--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const p = await b.newPage(); await p.setViewport({ width: 1600, height: 900 });
await p.evaluateOnNewDocument(() => { localStorage.setItem('ken-guia-v1', '1'); });
await p.goto('http://localhost:4377/index.html', { waitUntil: 'domcontentloaded', timeout: 60000 }); await new Promise(r => setTimeout(r, 35000));
await p.evaluate(() => document.querySelector('#ss-bar button[data-k="p1"][data-v="B"]').click()); await new Promise(r => setTimeout(r, 8000));
console.log(await p.evaluate(async () => { const S = await window.KEN_SEIS, G = S.G; const xs = G.idx.map(i => G.X[i]), zs = G.idx.map(i => G.Z[i]); return JSON.stringify({ nodos: G.X.length, comp: G.idx.length, mayores: G.mayores.length, bx: [Math.min(...xs), Math.max(...xs)].map(Math.round), bz: [Math.min(...zs), Math.max(...zs)].map(Math.round), rutas: S.rutasHacia([1130, 950], 1800, 5200, 24).length, rutas2: S.rutasHacia([1130, 950], 300, 9000, 24).length }); }));
await b.close();
