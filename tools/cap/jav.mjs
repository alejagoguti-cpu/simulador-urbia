import { createRequire } from 'module'; import fs from 'fs';
const puppeteer = createRequire('C:/Users/aleja/Documents/BACO-OBRA/package.json')('puppeteer-core');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage(); const src = 'data:image/png;base64,' + fs.readFileSync('img_javeriana.png').toString('base64');
const out = await p.evaluate(async (src) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height); for (let i = 0; i < d.data.length; i += 4) { const l = (d.data[i] + d.data[i+1] + d.data[i+2]) / 3; const a = Math.max(0, Math.min(255, (235 - l) * 1.6)) * d.data[i+3] / 255; d.data[i] = 244; d.data[i+1] = 243; d.data[i+2] = 239; d.data[i+3] = a; }
  x.putImageData(d, 0, 0); return c.toDataURL('image/png'); }, src);
fs.writeFileSync('img_javeriana_claro.png', Buffer.from(out.split(',')[1], 'base64')); await b.close(); console.log('ok');
