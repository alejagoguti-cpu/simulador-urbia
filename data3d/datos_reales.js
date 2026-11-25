/* ============ DATOS REALES · panel urbia dentro del simulador ============
   Lee data3d/fuentes.json (la misma tabla de fuentes.html) y muestra, por cada una de las 6 simulaciones, las cifras con fuente
   (oficial, académica, prensa o calculada) con su enlace. Botón «Datos reales» abajo a la izquierda. */
export async function iniciarDatosReales() {
  const D = await fetch('data3d/fuentes.json?v=1').then(r => r.json()).catch(() => null); if (!D) return;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = v => typeof v === 'number' ? v.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : esc(v);
  const TIP = { oficial: 'Oficial', academica: 'Académica', prensa: 'Prensa', derivado: 'Calculado' };
  const css = document.createElement('style'); css.textContent = `
  #dr-btn{position:fixed;left:150px;bottom:30px;z-index:30;font:600 11px Manrope,sans-serif;color:#D5FF3F;background:rgba(9,14,11,.85);border:1px solid rgba(213,255,63,.45);border-radius:3px;padding:8px 12px;cursor:pointer}
  #dr-pan{position:fixed;left:14px;bottom:72px;z-index:31;width:min(460px,calc(100vw - 28px));max-height:min(70vh,640px);display:none;flex-direction:column;background:rgba(9,14,11,.94);border:1px solid rgba(213,255,63,.22);border-radius:4px;color:#F4F3EF;font-family:Manrope,sans-serif;backdrop-filter:blur(14px);box-shadow:0 18px 40px rgba(0,0,0,.45)}
  #dr-pan.on{display:flex} #dr-pan header{display:flex;align-items:center;gap:8px;padding:12px 14px 8px} #dr-pan header b{font-size:13px;flex:1} #dr-pan header a{font-size:11px;color:#D5FF3F}
  #dr-pan header button{background:none;border:0;color:#b5bcb3;font-size:16px;cursor:pointer}
  #dr-tabs{display:flex;gap:4px;padding:0 14px 10px;flex-wrap:wrap} #dr-tabs button{font:600 10.5px Manrope;color:#b5bcb3;background:rgba(213,255,63,.04);border:1px solid rgba(244,243,239,.1);border-radius:2px;padding:5px 8px;cursor:pointer}
  #dr-tabs button.on{background:#D5FF3F;color:#08090C;border-color:#D5FF3F}
  #dr-list{overflow:auto;padding:0 14px 12px} .dr-r{padding:9px 0;border-top:1px solid rgba(244,243,239,.08)} .dr-r .v{font:600 16px 'JetBrains Mono',monospace;color:#D5FF3F} .dr-r .u{font-size:11px;color:#b5bcb3;margin-left:6px}
  .dr-r .n{font-size:12px;margin-top:2px} .dr-r .f{font-size:10.5px;color:#7d877e;margin-top:3px} .dr-r .f a{color:#b5bcb3} .dr-r .t{font:600 9px Manrope;color:#08090C;background:#D5FF3F;border-radius:2px;padding:1px 5px;margin-right:6px}
  @media(max-width:760px){#dr-btn{left:auto;right:14px;bottom:auto;top:70px}}`;
  document.head.appendChild(css);
  const b = document.createElement('button'); b.id = 'dr-btn'; b.textContent = 'Datos reales'; document.body.appendChild(b);
  const p = document.createElement('div'); p.id = 'dr-pan';
  p.innerHTML = `<header><b>Datos reales por simulación</b><a href="fuentes.html" target="_blank" rel="noopener">Matriz completa ↗</a><button aria-label="Cerrar">×</button></header><div id="dr-tabs"></div><div id="dr-list"></div>`;
  document.body.appendChild(p);
  let act = D.sims[0].k;
  const pintar = () => {
    p.querySelector('#dr-tabs').innerHTML = D.sims.map((s, i) => `<button data-k="${s.k}" class="${s.k === act ? 'on' : ''}" title="${esc(s.n)}">SIM ${i + 1}</button>`).join('');
    const s = D.sims.find(x => x.k === act), F = D.filas.filter(f => f.sim === act && TIP[f.tipo]);
    p.querySelector('#dr-list').innerHTML = `<div style="font-size:11.5px;color:#b5bcb3;margin-bottom:6px">${esc(s.n)} · ${F.length} cifras con fuente</div>` + F.map(f => `<div class="dr-r"><span class="v">${fmt(f.valor)}</span><span class="u">${esc(f.unidad)}</span>
      <div class="n">${esc(f.variable)}</div><div class="f"><span class="t">${TIP[f.tipo]}</span>${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.fuente)}</a>` : esc(f.fuente)} · ${esc(f.año)}</div></div>`).join('');
  };
  p.addEventListener('click', e => { const t = e.target.closest('#dr-tabs button'); if (t) { act = t.dataset.k; pintar(); } if (e.target.closest('header button')) p.classList.remove('on'); });
  b.addEventListener('click', () => { p.classList.toggle('on'); pintar(); });
}
