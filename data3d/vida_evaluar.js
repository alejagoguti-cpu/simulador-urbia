/* ============ MODO «EVALUAR» · sin cherry picking ============
   Corre en segundo plano (Web Worker: data3d/sim_vida_worker.js; si el navegador no deja, por bloques con setTimeout) 30 corridas con
   semillas FIJAS 1..30 de B, C y A (Kennedy hoy), 100 años cada una, con los parámetros congelados al pulsar y las MISMAS reglas de colapso.
   Muestra TODAS las corridas: supervivencia, mediana y rango de años hasta el colapso, causas, trayectorias tenues + mediana, y la lista
   completa de semillas (cada una se puede ver en el mapa). */
import { REGLAS, EVENTOS, P_RECORTE, P_RESTAURA, ARRANQUE, AÑO, corrida, resumen } from './sim_vida.js?v=2';
const R_CORRIDAS = 30, AÑOS = 100;
const COL = { A: '#8fb0c9', B: '#b07aa1', C: '#D5FF3F' }, NOM = { A: 'Kennedy hoy', B: 'Nodo central', C: 'Clúster rotativo' };
const NREG = Object.fromEntries(REGLAS.map(R => [R.k, R.n.toLowerCase()]));
const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
let el = null, RES = null, CLAVE = '', foco = 'C', trayEsc = 'C', trabajo = 0, cb = null;

const CSS = `
#vev{position:fixed;inset:0;z-index:40;display:none;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;background:rgba(6,8,10,.62);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
#vev.on{display:flex}
#vev .caja{width:min(900px,100%);border-radius:16px;background:#14171b;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px rgba(0,0,0,.45);color:#e9ecee;font:400 12.5px/1.5 var(--ui-sans,Inter,system-ui,sans-serif)}
#vev .cab{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.08)}
#vev .cab h3{flex:1;margin:0;font-weight:600;font-size:15px;letter-spacing:.01em}#vev .cab small{display:block;font-weight:400;color:#949da3;font-size:11.5px}
#vev button{font:inherit}#vev .x{all:unset;cursor:pointer;width:32px;height:32px;display:grid;place-items:center;border-radius:9px;color:#b3bbc0;font-size:18px}#vev .x:hover{background:rgba(255,255,255,.08);color:#fff}
#vev .x:focus-visible,#vev .tabs button:focus-visible,#vev .runs button:focus-visible{outline:2px solid #fff;outline-offset:1px}
#vev .sec{padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.06)}#vev h4{margin:0 0 6px;font:600 10px var(--ui-mono,ui-monospace,monospace);letter-spacing:.14em;text-transform:uppercase;color:#cfd5d9}
#vev .decl{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:6px}#vev .decl div{padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.04);font-size:11.5px;color:#c3cace}#vev .decl b{display:block;color:#fff;font-size:13px;font-variant-numeric:tabular-nums}
#vev details{margin-top:8px}#vev summary{cursor:pointer;color:#dfe4e6;font-weight:600;font-size:11.5px}#vev ol,#vev ul.ev{margin:6px 0 0;padding-left:18px;color:#c3cace;font-size:11.5px}#vev li{margin:2px 0}
#vev .bar{height:6px;border-radius:3px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:6px}#vev .bar i{display:block;height:100%;width:0;background:#D5FF3F;transition:width .2s}
#vev .cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#vev .card{padding:10px 11px;border-radius:11px;background:rgba(255,255,255,.04);border-top:3px solid var(--c)}#vev .card h5{margin:0 0 4px;font-size:12px;font-weight:600}
#vev .card .big{font-size:22px;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.15}#vev .card .big small{font-size:11px;font-weight:400;color:#949da3;margin-left:4px}
#vev .card p{margin:4px 0 0;color:#c3cace;font-size:11.5px}#vev .card p b{color:#fff;font-weight:600}
#vev .graf{position:relative}#vev canvas{display:block;width:100%;height:230px}
#vev .tip{position:absolute;pointer-events:none;display:none;padding:6px 8px;border-radius:8px;background:#0c0e11;border:1px solid rgba(255,255,255,.16);font-size:11px;white-space:nowrap;font-variant-numeric:tabular-nums}
#vev .ley{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px;font-size:11px;color:#c3cace}#vev .ley i{display:inline-block;width:16px;height:0;border-top:2px solid var(--c);vertical-align:3px;margin-right:5px}#vev .ley i.d{border-top-style:dashed}
#vev .tabs{display:inline-flex;gap:3px;padding:3px;border-radius:9px;background:rgba(0,0,0,.3);margin-bottom:6px}#vev .tabs button{all:unset;cursor:pointer;padding:4px 10px;border-radius:7px;font-size:11.5px;color:#b3bbc0}
#vev .tabs button[aria-pressed=true]{background:color-mix(in srgb,var(--c) 25%,transparent);color:#fff;box-shadow:inset 0 0 0 1px var(--c)}
#vev .runs{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px}
#vev .runs button{all:unset;cursor:pointer;box-sizing:border-box;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,.04);font-size:11px;color:#c3cace;border-left:3px solid var(--c)}
#vev .runs button:hover{background:rgba(255,255,255,.09)}#vev .runs button b{color:#fff;font-weight:600}
#vev .leer{color:#c3cace;font-size:12px}#vev .leer p{margin:4px 0}#vev .leer b{color:#fff}
#vev .nota{color:#8d969b;font-size:11px;margin:6px 0 0}
@media (max-width:700px){#vev{padding:8px}#vev .cards{grid-template-columns:1fr}#vev canvas{height:200px}#vev .cab h3{font-size:14px}}`;

function armar() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  el = document.createElement('div'); el.id = 'vev'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Evaluar sin cherry picking');
  el.innerHTML = `<div class="caja"><div class="cab"><h3>Evaluar sin cherry picking<small>${R_CORRIDAS} corridas por escenario · semillas fijas 1 a ${R_CORRIDAS} · ${AÑOS} años · las mismas reglas para todos</small></h3><button type="button" class="x" data-x aria-label="Cerrar">×</button></div>
  <div class="sec"><h4>Declarado antes de correr</h4><div class="decl" data-decl></div>
    <details><summary>Reglas de colapso (iguales para A, B y C)</summary><ol>${REGLAS.map(R => `<li><b>${R.n}:</b> ${R.txt}, ${R.sem} semanas seguidas.</li>`).join('')}</ol>
      <p class="nota">Las reglas empiezan a contar en el año ${ARRANQUE / AÑO} (tiempo de montaje de la propuesta). Colapsa la primera vez que se cumple alguna.</p></details>
    <details><summary>Perturbaciones al azar y su probabilidad</summary><ul class="ev">${EVENTOS.map(E => `<li><b>${E.n}</b>: ${fmt(E.pAño * 100)} % por año${E.dur ? `, dura ${E.dur[0]} a ${E.dur[1]} semanas` : ''} — ${E.ef}.</li>`).join('')}
      <li><b>Cambio de administración</b> (cada 4 años): ${fmt(P_RECORTE * 100)} % de probabilidad de cortar el programa de formación en B y en C; si se corta, vuelve con ${fmt(P_RESTAURA * 100)} % por año.</li></ul></details>
    <div class="bar" aria-hidden="true"><i data-bar></i></div><p class="nota" data-prog>Preparando…</p></div>
  <div class="sec"><h4>Resultado de todas las corridas</h4><div class="cards" data-cards></div></div>
  <div class="sec"><h4>Supervivencia · % de corridas que siguen funcionando</h4><div class="graf"><canvas data-c="sup" role="img" aria-label="Supervivencia de las corridas por año"></canvas><div class="tip" data-tip="sup"></div></div>
    <div class="ley">${['C', 'B', 'A'].map(k => `<span><i class="${k === 'A' ? 'd' : ''}" style="--c:${COL[k]}"></i>${k} · ${NOM[k]}</span>`).join('')}</div></div>
  <div class="sec"><h4>Hogares con huerta · las ${R_CORRIDAS} corridas y su mediana</h4><div class="tabs" role="group" aria-label="Escenario" data-tabs>${['C', 'B', 'A'].map(k => `<button type="button" data-tr="${k}" style="--c:${COL[k]}">${k} · ${NOM[k]}</button>`).join('')}</div>
    <div class="graf"><canvas data-c="tray" role="img" aria-label="Trayectorias de hogares con huerta"></canvas><div class="tip" data-tip="tray"></div></div>
    <div class="ley"><span><i style="--c:#cfd5d9"></i>mediana</span><span><i style="--c:rgba(207,213,217,.35)"></i>cada corrida</span><span><i class="d" style="--c:#ff8a80"></i>umbral de colapso: 500 hogares</span><span>× = año en que colapsó esa corrida</span></div></div>
  <div class="sec"><h4>Todas las corridas · toca una para verla en el mapa</h4><div class="tabs" role="group" aria-label="Escenario" data-tabs2>${['C', 'B', 'A'].map(k => `<button type="button" data-rr="${k}" style="--c:${COL[k]}">${k}</button>`).join('')}</div><div class="runs" data-runs></div></div>
  <div class="sec leer"><h4>Cómo leerlo y por qué no hay cherry picking</h4>
    <p>Cada corrida es un futuro posible: las sequías, bloqueos, recortes y demás llegan al azar con las probabilidades de arriba. Una sola corrida no dice nada; lo que cuenta es <b>cuántas de las ${R_CORRIDAS} siguen funcionando</b> con el paso de los años.</p>
    <p>No hay cherry picking porque: <b>1)</b> las semillas son fijas y declaradas (1 a ${R_CORRIDAS}), no se escogen las que «salen bien»; <b>2)</b> las reglas de colapso se fijan antes de correr y no cambian; <b>3)</b> se muestran todas las corridas, también las que colapsan; <b>4)</b> Kennedy hoy (A) se mide con las mismas reglas y vive exactamente los mismos eventos (misma semilla).</p>
    <p>Kennedy hoy no «colapsa»: <b>nunca llega a funcionar como red</b> (pocos hogares con huerta, todo depende de Corabastos), por eso no pasa las reglas apenas empiezan a contar. Los parámetros quedan congelados al pulsar «Evaluar»: si mueves un control, vuelve a evaluar.</p>
    <p class="nota">Lo que más pesa en C es un supuesto [SUP]: que con vocerías rotativas los mismos hogares forman nuevos promotores. Se puede bajar en el panel («Formación entre vecinos») para ver desde dónde C deja de sostenerse.</p></div></div>`;
  document.body.appendChild(el);
  el.addEventListener('click', (ev) => { if (ev.target === el || ev.target.closest('[data-x]')) { cerrar(); return; }
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.tr) { trayEsc = b.dataset.tr; pintar(); }
    if (b.dataset.rr) { foco = b.dataset.rr; pintar(); }
    if (b.dataset.seed && cb) { cerrar(); cb(+b.dataset.seed, b.dataset.e); } });
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && el.classList.contains('on')) cerrar(); });
  addEventListener('resize', () => { if (el.classList.contains('on')) pintar(); });
  hover('sup'); hover('tray');
}
const cerrar = () => { el.classList.remove('on'); };

export function abrirEvaluar({ PAR, esc, verCorrida }) {
  if (!el) armar(); cb = verCorrida; foco = trayEsc = esc === 'B' ? 'B' : 'C';
  el.classList.add('on'); el.querySelector('[data-x]').focus();
  const congelado = JSON.parse(JSON.stringify(PAR)), clave = JSON.stringify(congelado);
  el.querySelector('[data-decl]').innerHTML = `<div>Corridas por escenario<b>${R_CORRIDAS}</b></div><div>Semillas (fijas)<b>1 a ${R_CORRIDAS}</b></div><div>Horizonte<b>${AÑOS} años</b></div><div>Reglas de colapso<b>${REGLAS.length}, fijas</b></div>`;
  if (clave === CLAVE && RES && RES.listo) { pintar(); return; }
  CLAVE = clave; RES = { listo: false }; const id = ++trabajo, escs = [foco, foco === 'C' ? 'B' : 'C', 'A'];
  progreso(0, escs.length * R_CORRIDAS); pintar();
  const recibir = (d) => { if (d.id !== id) return; if (d.tipo === 'progreso') progreso(d.hecho, d.total);
    if (d.tipo === 'escenario') { RES[d.e] = { corridas: d.corridas, resumen: d.resumen }; pintar(); }
    if (d.tipo === 'fin') { RES.listo = true; el.querySelector('[data-prog]').textContent = `Listo: ${escs.length * R_CORRIDAS} corridas de ${AÑOS} años con los parámetros de este momento.`; pintar(); } };
  let w = null; try { w = new Worker(new URL('./sim_vida_worker.js?v=2', import.meta.url), { type: 'module' }); } catch (e) { w = null; }
  if (w) { w.onmessage = (ev) => { recibir(ev.data); if (ev.data.tipo === 'fin') w.terminate(); };
    w.onerror = () => { w.terminate(); porBloques(id, escs, congelado, recibir); }; w.postMessage({ id, escs, R: R_CORRIDAS, años: AÑOS, PAR: congelado }); }
  else porBloques(id, escs, congelado, recibir);
}
// respaldo sin Worker: una corrida por bloque, cediendo el hilo entre bloques para no trabar el 3D
function porBloques(id, escs, PAR, recibir) { const total = escs.length * R_CORRIDAS; let i = 0, cs = [];
  const uno = () => { if (id !== trabajo) return; const e = escs[Math.floor(i / R_CORRIDAS)], s = i % R_CORRIDAS + 1; cs.push(corrida(e, s, AÑOS, PAR)); i++; recibir({ id, tipo: 'progreso', hecho: i, total });
    if (s === R_CORRIDAS) { recibir({ id, tipo: 'escenario', e, corridas: cs, resumen: resumen(cs, AÑOS) }); cs = []; }
    if (i < total) setTimeout(uno, 0); else recibir({ id, tipo: 'fin' }); };
  setTimeout(uno, 0); }
function progreso(h, t) { el.querySelector('[data-bar]').style.width = (h / t * 100).toFixed(1) + '%'; if (h < t) el.querySelector('[data-prog]').textContent = `Corriendo en segundo plano: ${h} de ${t} corridas…`; }

/* ---------- pintar ---------- */
function pintar() {
  el.querySelectorAll('[data-tr]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tr === trayEsc)));
  el.querySelectorAll('[data-rr]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rr === foco)));
  el.querySelector('[data-cards]').innerHTML = ['C', 'B', 'A'].map(k => { const r = RES && RES[k] && RES[k].resumen; if (!r) return `<div class="card" style="--c:${COL[k]}"><h5>${k} · ${NOM[k]}</h5><p>calculando…</p></div>`;
    const top = Object.entries(r.causas).sort((a, b) => b[1] - a[1]), c = RES[k].corridas, rec = c.filter(x => x.rec != null), recM = rec.length ? rec.reduce((s, x) => s + x.rec, 0) / rec.length : null;
    return `<div class="card" style="--c:${COL[k]}"><h5>${k} · ${NOM[k]}</h5><div class="big">${fmt(r.sup[AÑOS])} %<small>sigue funcionando a los ${AÑOS} años</small></div>
      <p>Colapsan <b>${r.colapsan} de ${r.R}</b>${r.colapsan ? ` · entre el año <b>${fmt(r.min, 1)}</b> y el <b>${fmt(r.max, 1)}</b>` : ''}</p>
      <p>Mediana de años hasta el colapso: <b>${isFinite(r.mediana) ? fmt(r.mediana, 1) : `más de ${AÑOS}`}</b></p>
      <p>Causa más frecuente: <b>${top.length ? top.slice(0, 2).map(([q, n]) => `${NREG[q]} (${n})`).join(', ') : 'ninguna'}</b></p>
      ${recM != null && k !== 'A' ? `<p>Tras una perturbación vuelve a su nivel en <b>${fmt(recM)} semanas</b> en promedio</p>` : ''}</div>`; }).join('');
  graficaSup(); graficaTray(); runs();
}
function lienzo(k) { const c = el.querySelector(`canvas[data-c="${k}"]`), r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
  const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height); return { c, g, W: r.width, H: r.height }; }
const M = { l: 44, r: 92, t: 10, b: 24 };
function ejes(g, W, H, yMax, yfmt, nY = 4) {
  g.font = '10.5px system-ui, sans-serif'; g.fillStyle = '#949da3'; g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
  for (let i = 0; i <= nY; i++) { const v = yMax * i / nY, y = M.t + (H - M.t - M.b) * (1 - i / nY); g.beginPath(); g.moveTo(M.l, y + 0.5); g.lineTo(W - M.r, y + 0.5); g.stroke(); g.textAlign = 'right'; g.fillText(yfmt(v), M.l - 6, y + 3.5); }
  g.textAlign = 'center'; for (let a = 0; a <= AÑOS; a += 20) g.fillText(a === 0 ? 'año 0' : String(a), M.l + (W - M.l - M.r) * a / AÑOS, H - 7);
}
const X = (W, a) => M.l + (W - M.l - M.r) * a / AÑOS, Yv = (H, v, max) => M.t + (H - M.t - M.b) * (1 - v / max);
function graficaSup() { const { g, W, H } = lienzo('sup'); ejes(g, W, H, 100, (v) => fmt(v) + ' %');
  const etq = [];
  for (const k of ['A', 'B', 'C']) { const r = RES && RES[k] && RES[k].resumen; if (!r) continue; g.strokeStyle = COL[k]; g.lineWidth = 2; g.setLineDash(k === 'A' ? [5, 4] : []); g.beginPath();
    r.sup.forEach((v, a) => { const x = X(W, a), y = Yv(H, v, 100); if (!a) g.moveTo(x, y); else { g.lineTo(x, Yv(H, r.sup[a - 1], 100)); g.lineTo(x, y); } }); g.stroke(); g.setLineDash([]);
    etq.push([k, Yv(H, r.sup[AÑOS], 100), r.sup[AÑOS]]); }
  etq.sort((a, b) => a[1] - b[1]); for (let i = 1; i < etq.length; i++) if (etq[i][1] - etq[i - 1][1] < 13) etq[i][1] = etq[i - 1][1] + 13;
  g.textAlign = 'left'; g.font = '600 11px system-ui, sans-serif'; etq.forEach(([k, y, v]) => { g.fillStyle = COL[k]; g.fillRect(W - M.r + 6, y - 4, 8, 2); g.fillStyle = '#e9ecee'; g.fillText(`${k} ${fmt(v)} %`, W - M.r + 18, y + 4); });
}
function graficaTray() { const { g, W, H } = lienzo('tray'), d = RES && RES[trayEsc]; let max = 600;
  if (d) for (const c of d.corridas) for (const v of c.act) if (v > max) max = v; max = Math.ceil(max / 500) * 500;
  ejes(g, W, H, max, (v) => fmt(v)); if (!d) return;
  g.strokeStyle = '#ff8a80'; g.setLineDash([4, 4]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(M.l, Yv(H, 500, max)); g.lineTo(W - M.r, Yv(H, 500, max)); g.stroke(); g.setLineDash([]);
  g.lineWidth = 1; g.strokeStyle = 'rgba(207,213,217,.22)';
  for (const c of d.corridas) { g.beginPath(); c.act.forEach((v, a) => { const x = X(W, a + 1), y = Yv(H, v, max); a ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
  g.strokeStyle = '#ff8a80'; g.lineWidth = 1.4; for (const c of d.corridas) if (c.colapso) { const a = c.colapso.año, i = Math.min(AÑOS - 1, Math.max(0, Math.floor(a))), x = X(W, a), y = Yv(H, c.act[i], max); g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke(); }
  g.strokeStyle = COL[trayEsc]; g.lineWidth = 2.4; g.beginPath(); d.resumen.medAct.forEach((v, a) => { const x = X(W, a + 1), y = Yv(H, v, max); a ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
  const ym = Yv(H, d.resumen.medAct[AÑOS - 1], max); g.fillStyle = '#e9ecee'; g.font = '600 11px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText(`mediana ${fmt(d.resumen.medAct[AÑOS - 1])}`, W - M.r + 6, ym + 4);
  g.fillStyle = '#ff8a80'; g.font = '10.5px system-ui, sans-serif'; g.fillText('umbral 500', W - M.r + 6, Yv(H, 500, max) + (Math.abs(Yv(H, 500, max) - ym) < 14 ? 16 : 4));
}
function hover(k) { const c = el.querySelector(`canvas[data-c="${k}"]`), tip = el.querySelector(`[data-tip="${k}"]`);
  const mover = (ev) => { if (!RES) return; const r = c.getBoundingClientRect(), x = ev.clientX - r.left, a = Math.round((x - M.l) / (r.width - M.l - M.r) * AÑOS); if (a < 0 || a > AÑOS) { tip.style.display = 'none'; return; }
    let h = `<b>Año ${a}</b>`;
    if (k === 'sup') ['C', 'B', 'A'].forEach(q => { const s = RES[q] && RES[q].resumen; if (s) h += `<br><span style="color:${COL[q]}">■</span> ${q}: ${fmt(s.sup[a])} % funcionando`; });
    else { const d = RES[trayEsc]; if (!d) return; const i = Math.max(0, a - 1), vs = d.corridas.map(c2 => c2.act[i]).sort((p, q) => p - q); h += `<br>mediana ${fmt(d.resumen.medAct[i])} hogares<br>rango ${fmt(vs[0])} – ${fmt(vs[vs.length - 1])}<br>${d.corridas.filter(c2 => !c2.colapso || c2.colapso.año > a).length} de ${d.corridas.length} funcionando`; }
    tip.innerHTML = h; tip.style.display = 'block'; const tw = tip.offsetWidth; tip.style.left = Math.min(r.width - tw - 4, Math.max(4, x + 12)) + 'px'; tip.style.top = '8px'; };
  c.addEventListener('pointermove', mover); c.addEventListener('pointerdown', mover); c.addEventListener('pointerleave', () => { tip.style.display = 'none'; }); }
function runs() { const d = RES && RES[foco], box = el.querySelector('[data-runs]'); if (!d) { box.innerHTML = '<p class="nota">calculando…</p>'; return; }
  box.innerHTML = d.corridas.map(c => `<button type="button" data-seed="${c.seed}" data-e="${foco}" style="--c:${c.colapso ? '#ff8a80' : COL[foco]}"><b>Semilla ${c.seed}</b> · ${c.colapso ? `colapsó en el año ${fmt(c.colapso.año, 1)} (${c.colapso.causas.map(q => NREG[q]).join(', ')})` : `sigue a los ${AÑOS} años`}</button>`).join(''); }
