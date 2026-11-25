/* ============ SIMULACIONES · SIM-01, SIM-02 y SIM-03 (documento «Modelamiento dinámico y simulación») ============
   Se corren semana a semana durante 10 años (520 semanas) en los escenarios del documento y se dibujan en el tablero.
   «Kennedy hoy» = escenario A (sin intervención). «Con la propuesta» = B o C (por defecto C).
   SIM-01 Red de huertas, abastecimiento, conocimiento y decisión
     A sin intervención · B nodo único con decisión central · C clúster con decisión rotativa
     G1 Producción = Huertas activas × Rendimiento ÷ 52 × Clima × Calidad de manejo; Autoconsumo = P × PAR02; Merma = P × PAR04; Excedente = resto
     G2 Personas alimentadas = Producción anual × (1 − pérdida en huerta) ÷ (frutas y verduras recomendadas × 365) y % de Kennedy
     G3 Dependencia de Corabastos en la zona = máx(0; 1 − Personas alimentadas ÷ Población de la zona); cae al 50 % en zona = 2 × Personas
     G4 Difusión de Bass: Adopciones = (p + q × Activos ÷ N) × (N − Activos); p = cupos × alcance ÷ N; N: B 2.506, C 5.400
     G5 m² por promotor = Área ÷ Promotores; Calidad = mín(1; c ÷ m² por promotor); c = 1.000 m²; 6 promotores al inicio
     G6 Tiempo de espera = 1 ÷ (μ − λ) si λ < μ (si no, crece la cola); μ rotativo = asambleas × μa × (1 − pérdida por relevo)
     Estreses (B y C): sequía, bloqueo del mayorista, crecimiento poblacional, revocación de baldíos por valorización del suelo.
   SIM-02 Orgánicos y compostaje: A ruta actual · B estación de compostaje barrial · C compostaje en Bavaria Común
   SIM-03 Hábitat y fauna: A sin huertas · B huertas sin criterio de ubicación · C huertas con corredores; con y sin medida antitrampa
   Los valores de partida que no da el documento están marcados [SUP] (supuestos para discutir con el grupo). */
import { SEM, AÑO, POB_K, PAR, SIMST, avisar, sim03, correrTodo } from './sim_modelos.js?v=4';
export function iniciarSimulaciones({ T3, tb, verPestana }) {
  const { P1, P2, P3 } = PAR; // los mismos parámetros que el panel de escenarios del mapa (data3d/sim_modelos.js)
  // colores fijos de los escenarios (los mismos en el mapa): A hoy azul grisáceo, B morado, C ámbar (la propuesta)
  const COL = { A: '#8fb0c9', B: '#b07aa1', C: '#D5FF3F' }, NOMBRE = { A: 'A · Kennedy hoy', B: 'B · Nodo central', C: 'C · Clúster rotativo' };
  const CORTO = { A: 'Kennedy hoy', B: 'Nodo central', C: 'Clúster rotativo' };
  // qué significa cada escenario en cada simulación, en una frase
  const ESCD = {
    S1: { A: 'Nada cambia: unas pocas huertas caseras, sin apoyo.', B: 'Bavaria forma promotores y una sola oficina central decide todo.', C: 'Bavaria forma promotores y los barrios, agrupados en clústeres, se turnan las decisiones.' },
    S2: { A: 'Los orgánicos se van en camión al relleno Doña Juana, a 16,6 km por vía.', B: 'Cada barrio composta en una estación pequeña, cerca de sus huertas.', C: 'Todo se composta en la planta grande de Bavaria Común.' },
    S3: { A: 'Sin huertas nuevas cerca del humedal.', B: 'Huertas donde haya espacio, sin pensar en las aves.', C: 'Huertas unidas por corredores verdes entre parches de hábitat.' } };
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtK = (v) => v >= 1e6 ? fmt(v / 1e6, 1) + ' M' : v >= 1e4 ? fmt(v / 1e3, 0) + ' mil' : fmt(v);


  /* ---------------- estilos ---------------- */
  const css = document.createElement('style'); css.textContent = `
#tb .sim{padding:2px 16px 8px}
#tb .sim-sub{display:flex;gap:3px;margin:0 0 10px;padding:3px;border-radius:10px;background:rgba(255,255,255,.05)}
#tb .sim-sub button{flex:1;height:30px;border:0;border-radius:7px;background:none;color:var(--ui-tx2,#9aa2a7);font:500 11.5px var(--ui-sans,Inter,sans-serif);cursor:pointer}
#tb .sim-sub button.on{background:rgba(255,255,255,.12);color:#fff}
#tb .sim-q{margin:0 0 10px;font-size:12px;line-height:1.5;color:#d6dbde}#tb .sim-q b{color:#fff;font-weight:600}
#tb .sim-esc{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 10px}
#tb .sim-esc span{font:500 9.5px var(--ui-mono,monospace);letter-spacing:.12em;color:var(--ui-tx3,#7d868c);text-transform:uppercase;margin-right:2px}
#tb .sim-esc button{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:var(--ui-tx2,#b9c1c6);font:500 11px var(--ui-sans,Inter,sans-serif);cursor:pointer}
#tb .sim-esc button i{width:8px;height:8px;border-radius:50%}
#tb .sim-esc button.on{color:#fff;border-color:var(--c);background:color-mix(in srgb,var(--c) 20%,transparent)}
#tb .sim-esc button:disabled{opacity:.35;cursor:default}
#tb .sim-kpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0 0 10px}
#tb .sim-kpi div{padding:9px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
#tb .sim-kpi b{display:block;font:300 22px/1.1 var(--ui-sans,Inter,sans-serif);color:#fff}
#tb .sim-kpi small{display:block;margin-top:3px;font-size:10.5px;line-height:1.3;color:var(--ui-tx2,#b9c1c6)}
#tb .sim-kpi em{font-style:normal;font-size:10.5px;color:var(--ui-tx3,#8e979d)}
#tb .sim-g{margin:0 0 12px;padding:10px 10px 6px;border-radius:12px;background:rgba(0,0,0,.18);border:1px solid rgba(255,255,255,.06)}
#tb .sim-g h4{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:0 0 2px;font:600 12px var(--ui-sans,Inter,sans-serif);color:#fff}
#tb .sim-g h4 span{font:400 10.5px var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#8e979d);text-align:right}
#tb .sim-g p{margin:0 0 6px;font-size:10.5px;line-height:1.4;color:var(--ui-tx2,#aeb6bb)}
#tb .sim-g canvas{display:block;width:100%;height:150px;cursor:crosshair}
#tb .sim-ley{display:flex;flex-wrap:wrap;gap:4px 12px;margin:4px 0 0;font-size:10.5px;color:var(--ui-tx2,#b9c1c6)}
#tb .sim-ley span{display:inline-flex;align-items:center;gap:5px}#tb .sim-ley i{width:12px;height:3px;border-radius:2px}
#tb .sim-tip{position:fixed;z-index:40;pointer-events:none;display:none;padding:7px 9px;border-radius:8px;background:rgba(10,12,15,.92);border:1px solid rgba(255,255,255,.14);font:400 11px var(--ui-sans,Inter,sans-serif);color:#e9ebec;white-space:nowrap}
#tb .sim-tip b{font-weight:600}#tb .sim-tip i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px}
#tb .sim-var{margin:4px 0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025)}
#tb .sim-var summary{cursor:pointer;padding:9px 12px;font:600 11.5px var(--ui-sans,Inter,sans-serif);color:#fff;list-style:none}
#tb .sim-var summary::-webkit-details-marker{display:none}#tb .sim-var summary::after{content:' +';color:var(--ui-tx3,#8e979d)}#tb .sim-var[open] summary::after{content:' –'}
#tb .sim-var .cv{display:grid;gap:9px;padding:2px 12px 12px}
#tb .sim-var label{display:grid;grid-template-columns:minmax(0,1fr) 64px;gap:2px 10px;align-items:center;font-size:11px;color:var(--ui-tx2,#c0c7cb)}
#tb .sim-var label input[type=range]{grid-column:1/-1;width:100%;accent-color:#D5FF3F}
#tb .sim-var label output{text-align:right;font:500 11px var(--ui-mono,monospace);color:#fff}
#tb .sim-var .chk{display:flex;flex-wrap:wrap;gap:6px}
#tb .sim-var .chk label{display:inline-flex;gap:6px;padding:5px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.1);cursor:pointer}
#tb .sim-play{display:flex;align-items:center;gap:8px;margin:0 0 10px}
#tb .sim-play button{height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font:500 11.5px var(--ui-sans,Inter,sans-serif);cursor:pointer}
#tb .sim-play input{flex:1;accent-color:#D5FF3F}#tb .sim-play output{font:500 11px var(--ui-mono,monospace);color:#fff;min-width:64px;text-align:right}
#tb .sim-frase{margin:0 0 12px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);border-left:3px solid #D5FF3F;font:400 14px/1.45 var(--ui-sans,Inter,sans-serif);color:#e9eef0}#tb .sim-frase b{color:#fff;font-weight:600}
#tb .sim-cmp{display:grid;gap:10px;margin:0 0 12px}
#tb .cmp{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
#tb .cmp .cn{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 7px;font:600 12px var(--ui-sans,Inter,sans-serif);color:#fff}
#tb .cmp .cn em{font:600 11px var(--ui-sans,Inter,sans-serif);font-style:normal;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,.08);color:#cfd5d9}
#tb .cmp .cn em.up{background:rgba(213,255,63,.16);color:#e3ff86}#tb .cmp .cn em.dn{background:rgba(255,255,255,.08);color:#b9c1c6}
#tb .cmp .cb{display:grid;grid-template-columns:104px minmax(0,1fr) 74px;gap:8px;align-items:center;font-size:11px;color:var(--ui-tx2,#b9c1c6);margin-top:4px}
#tb .cmp .cb i{display:block;height:10px;border-radius:5px;background:rgba(255,255,255,.05);overflow:hidden}#tb .cmp .cb i b{display:block;height:100%;border-radius:5px;transition:width .4s}
#tb .cmp .cb strong{text-align:right;font:600 12px var(--ui-sans,Inter,sans-serif);color:#fff;font-variant-numeric:tabular-nums}
#tb .sim-gp canvas{height:200px}
#tb .sim-tec{margin:4px 0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}
#tb .sim-tec > summary{cursor:pointer;padding:10px 12px;font:500 11.5px var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c0c7cb);list-style:none}#tb .sim-tec > summary::-webkit-details-marker{display:none}
#tb .sim-tec > summary::before{content:'+ ';color:#D5FF3F}#tb .sim-tec[open] > summary::before{content:'– '}
#tb .sim-tec-c{padding:0 10px 4px}
#tb .sim-nota{font-size:10px;line-height:1.45;color:var(--ui-tx3,#8e979d);margin:4px 0 6px}
#tb .sim-h{display:flex;align-items:center;gap:8px;margin:16px 0 8px;font:600 10px var(--ui-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:#cfd5d9}
#tb .sim-h::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.1)}
#tb .sim-lead{margin:0 0 10px;font-size:11.5px;line-height:1.45;color:var(--ui-tx2,#b9c1c6)}#tb .sim-lead b{color:#fff;font-weight:600}
#tb .sim-lead i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 2px;vertical-align:-1px}
/* filas hoy vs. propuesta (también las usa la pestaña «Hoy vs. proyecto») */
#tb .vss{display:grid;gap:8px;margin:0 0 12px}
#tb .vs{padding:10px 12px 9px;border-radius:12px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07)}
#tb .vs-n{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin:0 0 7px;font:600 12px/1.3 var(--ui-sans,Inter,sans-serif);color:#fff}
#tb .vs-n small{display:block;font:400 10px var(--ui-sans,Inter,sans-serif);color:#959ea4;margin-top:1px}
#tb .vs-n em{flex:none;font:600 10.5px var(--ui-sans,Inter,sans-serif);font-style:normal;padding:3px 8px;border-radius:10px;white-space:nowrap}
#tb .vs-n em.bien{background:rgba(143,209,138,.15);color:#a9e0a5}#tb .vs-n em.mal{background:rgba(255,138,128,.14);color:#ffa59d}#tb .vs-n em.igual{background:rgba(255,255,255,.07);color:#b9c1c6}
#tb .vs-b{display:grid;grid-template-columns:92px minmax(0,1fr) 78px;gap:8px;align-items:center;margin-top:4px;font-size:11px;color:var(--ui-tx2,#b9c1c6)}
#tb .vs-b i{display:block;height:12px;border-radius:3px;background:rgba(255,255,255,.05);overflow:hidden}#tb .vs-b i b{display:block;height:100%;border-radius:3px;transition:width .4s}
#tb .vs-b strong{text-align:right;font:600 12.5px var(--ui-sans,Inter,sans-serif);font-variant-numeric:tabular-nums;color:#fff}
/* los 3 escenarios lado a lado */
#tb .esd{display:grid;gap:4px;margin:0 0 10px}
#tb .esd button{all:unset;cursor:pointer;display:grid;grid-template-columns:26px minmax(0,1fr);gap:2px 10px;align-items:center;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025)}
#tb .esd button:hover{background:rgba(255,255,255,.05)}#tb .esd button:focus-visible{outline:2px solid #fff;outline-offset:1px}
#tb .esd button.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent)}
#tb .esd button > b{grid-row:span 2;width:26px;height:26px;border-radius:7px;display:grid;place-items:center;font:700 12px var(--ui-sans,Inter,sans-serif);color:#15171a;background:var(--c)}
#tb .esd button span{font:600 11.5px var(--ui-sans,Inter,sans-serif);color:#fff}#tb .esd button span em{font:400 10px var(--ui-sans,Inter,sans-serif);font-style:normal;color:var(--c);margin-left:6px}
#tb .esd button small{font-size:10.5px;line-height:1.35;color:var(--ui-tx2,#b9c1c6)}
#tb .abc{display:grid;gap:0;margin:0 0 12px;border-radius:12px;border:1px solid rgba(255,255,255,.07);overflow:hidden}
#tb .abc-r{display:grid;grid-template-columns:minmax(0,1.25fr) repeat(3,minmax(0,1fr));align-items:stretch}
#tb .abc-r + .abc-r{border-top:1px solid rgba(255,255,255,.06)}
#tb .abc-r > *{padding:7px 8px;min-width:0}
#tb .abc-r .n{font-size:11px;line-height:1.3;color:#e3e7e9;align-self:center}#tb .abc-r .n small{display:block;font-size:9.5px;color:var(--ui-tx3,#8e979d)}
#tb .abc-h{background:rgba(255,255,255,.04)}#tb .abc-h div{display:flex;align-items:center;gap:5px;font:600 11px var(--ui-sans,Inter,sans-serif);color:#fff}
#tb .abc-h div i{width:9px;height:9px;border-radius:2px;flex:none}#tb .abc-h div{flex-wrap:wrap;align-content:center}#tb .abc-h div small{flex-basis:100%;font-weight:400;color:var(--ui-tx3,#8e979d);font-size:9.5px;line-height:1.2}
#tb .abc-r .c{display:flex;flex-direction:column;justify-content:center;gap:4px;font-variant-numeric:tabular-nums}
#tb .abc-r .c strong{font:500 12px var(--ui-sans,Inter,sans-serif);color:#cfd5d9}
#tb .abc-r .c i{display:block;height:5px;border-radius:3px;background:rgba(255,255,255,.05);overflow:hidden}#tb .abc-r .c i b{display:block;height:100%;border-radius:3px}
#tb .abc-r .c.best{background:rgba(143,209,138,.07)}#tb .abc-r .c.best strong{color:#fff;font-weight:700}#tb .abc-r .c.best strong::after{content:' ▲';font-size:8.5px;color:#a9e0a5;vertical-align:1px}
#tb .abc-nota{margin:-6px 0 12px;font-size:10px;color:var(--ui-tx3,#8e979d)}#tb .abc-nota b{color:#a9e0a5;font-weight:600}
@media(max-width:760px){#tb .vs-b{grid-template-columns:70px minmax(0,1fr) 66px}#tb .abc-r{grid-template-columns:minmax(0,1.1fr) repeat(3,minmax(0,1fr))}#tb .abc-r > *{padding:6px 5px}#tb .abc-h div small{font-size:9px}}`;
  document.head.appendChild(css);

  /* ---------------- estructura en el tablero ---------------- */
  const tabs = tb.querySelector('#tb-tabs'); const bt = document.createElement('button'); bt.dataset.k = 'sim'; bt.textContent = 'Simulación'; tabs.insertBefore(bt, tabs.firstChild);
  bt.onclick = () => verPestana('sim');
  const cont = document.createElement('div'); cont.className = 'gr sim'; cont.dataset.tab = 'sim';
  const ancla = tb.querySelector('.cuerpo .gr'); ancla.parentNode.insertBefore(cont, ancla);
  const tip = document.createElement('div'); tip.className = 'sim-tip'; tb.appendChild(tip);
  let sim = 'S1', escP = SIMST.esc, t = SEM - 1, play = null;
  const escAct = () => (T3.escenario === 'proyecto' ? escP : 'A');

  /* ---------------- gráfica de líneas o áreas apiladas (un solo eje) ---------------- */
  // brecha: [i, j] sombrea el espacio entre dos series (lo que gana la propuesta); fin: rótulo con nombre y valor al final de cada línea
  function grafica(cv, { series, y, yfmt, apilar, x, brecha, fin }) {
    const dpr = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth || 400, H = cv.clientHeight || 150; cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = 44, R = 8, Tp = 10, B = 20, n = series[0].data.length, X = x || ((i) => L + i / (n - 1) * (W - L - R));
    let max = 0; if (apilar) { for (let i = 0; i < n; i++) { let s = 0; for (const se of series) s += se.data[i] || 0; max = Math.max(max, s); } } else for (const se of series) for (const v of se.data) if (v != null && isFinite(v)) max = Math.max(max, v);
    if (y && y.max != null) max = y.max; else { const m0 = max * 1.05 || 1, p10 = Math.pow(10, Math.floor(Math.log10(m0))); max = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(k => k * p10 >= m0) * p10; } /* tope redondo: las marcas del eje quedan en números limpios */ const Y = (v) => H - B - v / max * (H - B - Tp);
    g.clearRect(0, 0, W, H); g.font = '400 10px Inter,system-ui,sans-serif'; g.fillStyle = '#8e979d'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (const k of [0, 0.5, 1]) { const v = max * k, yy = Math.round(Y(v)) + 0.5; g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1; g.beginPath(); g.moveTo(L, yy); g.lineTo(W - R, yy); g.stroke(); g.fillText(yfmt(v), L - 5, yy); }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; if (!x) { for (let a = 0; a <= 8; a += 2) { g.textAlign = a === 0 ? 'left' : 'center'; g.fillText(String(2027 + a), X(a * AÑO), H - 5); } g.textAlign = 'right'; g.fillText('2036', X(n - 1), H - 5); } g.textAlign = 'center';
    const lim = x ? n : t + 1;
    if (brecha && !apilar) { const s0 = series[brecha[0]].data, s1 = series[brecha[1]].data, yy = (v) => Y(Math.min(Math.max(v || 0, 0), max)); g.beginPath();
      for (let i = 0; i < lim; i++) g.lineTo(X(i), yy(s1[i])); for (let i = lim - 1; i >= 0; i--) g.lineTo(X(i), yy(s0[i])); g.closePath(); g.fillStyle = series[brecha[1]].color; g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1; }
    if (apilar) { const base = new Float32Array(n);
      for (const se of series) { g.beginPath(); for (let i = 0; i < lim; i++) g.lineTo(X(i), Y(base[i] + (se.data[i] || 0))); for (let i = lim - 1; i >= 0; i--) g.lineTo(X(i), Y(base[i])); g.closePath(); g.fillStyle = se.color; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
        g.strokeStyle = '#141619'; g.lineWidth = 1.5; g.beginPath(); for (let i = 0; i < lim; i++) g.lineTo(X(i), Y(base[i] + (se.data[i] || 0))); g.stroke(); for (let i = 0; i < n; i++) base[i] += se.data[i] || 0; } }
    else for (const se of series) { g.beginPath(); let on = false; for (let i = 0; i < lim; i++) { const v = se.data[i]; if (v == null || !isFinite(v)) { on = false; continue; } const px = X(i), py = Y(Math.min(v, max)); on ? g.lineTo(px, py) : g.moveTo(px, py); on = true; }
      g.strokeStyle = se.color; g.lineWidth = se.w || 2; g.globalAlpha = se.alfa || 1; g.setLineDash(se.dash || []); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
    if (!x && t < n - 1) { const xx = Math.round(X(t)) + 0.5; g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(xx, Tp); g.lineTo(xx, H - B); g.stroke(); }
    if (fin && !apilar) { // rótulos directos: punto al final de cada línea y «nombre: valor» sin que se monten
      const i = Math.min(n, lim) - 1, xx = X(i), izq = xx > W * 0.5;
      const P = series.map(s => ({ s, v: s.data[i] })).filter(o => o.v != null && isFinite(o.v)).map(o => ({ ...o, y: Y(Math.min(o.v, max)) })).sort((a, b) => a.y - b.y);
      let prev = -1e9; for (const o of P) { o.ly = Math.max(o.y - (izq ? 9 : 0), prev + 14, Tp + 6); prev = o.ly; }
      const sobra = prev - (H - B - 4); if (sobra > 0) P.forEach(o => { o.ly -= sobra; });
      g.font = '600 11px Inter,system-ui,sans-serif'; g.textBaseline = 'middle'; g.textAlign = izq ? 'right' : 'left';
      for (const o of P) { g.fillStyle = o.s.color; g.beginPath(); g.arc(xx, o.y, 3.8, 0, 6.29); g.fill(); g.strokeStyle = '#15171a'; g.lineWidth = 1.5; g.stroke();
        const txt = `${o.s.corto || o.s.name}: ${yfmt(o.v)}`, tx = izq ? xx - 9 : xx + 9; g.lineWidth = 3; g.strokeStyle = 'rgba(16,18,21,.85)'; g.strokeText(txt, tx, o.ly); g.fillText(txt, tx, o.ly); } }
    cv._g = { X, Y, n, L, R, W, series, yfmt, x: !!x };
  }
  function hover(cv, xlabel) {
    if (!cv || cv._hov) return; cv._hov = 1;
    cv.addEventListener('pointermove', (ev) => { const G = cv._g; if (!G) return; const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left; const i = Math.max(0, Math.min(G.n - 1, Math.round((mx - G.L) / (G.W - G.L - G.R) * (G.n - 1))));
      tip.innerHTML = `<b>${xlabel(i)}</b><br>` + G.series.map(s => `<i style="background:${s.color}"></i>${esc(s.name)}: <b>${G.yfmt(s.data[i])}</b>`).join('<br>');
      tip.style.display = 'block'; tip.style.left = Math.min(innerWidth - 220, ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY + 12) + 'px'; });
    cv.addEventListener('pointerleave', () => { tip.style.display = 'none'; });
  }
  const semLabel = (i) => `Año ${2027 + Math.floor(i / AÑO)}, semana ${i % AÑO + 1}`;
  const ley = (L) => `<div class="sim-ley">${L.map(([c, n, d]) => `<span><i style="background:${c};${d ? 'background:repeating-linear-gradient(90deg,' + c + ' 0 4px,transparent 4px 7px)' : ''}"></i>${esc(n)}</span>`).join('')}</div>`;
  const slider = (P, k, n, min, max, paso, f = (v) => v) => `<label>${esc(n)}<output data-o="${k}">${f(P[k])}</output><input type="range" data-k="${k}" min="${min}" max="${max}" step="${paso}" value="${P[k]}"></label>`;

  /* ---------------- pintar cada simulación ---------------- */
  function cabecera(q, escs) {
    const e = escAct(), pro = T3.escenario === 'proyecto';
    return `<div class="sim-esc"><span>Escenario</span>${escs.map(k => `<button data-e="${k}" style="--c:${COL[k]}" class="${k === e ? 'on' : ''}" ${(!pro && k !== 'A') || (pro && k === 'A') ? 'disabled' : ''}><i style="background:${COL[k]}"></i>${esc(NOMBRE[k])}</button>`).join('')}</div>
`;
  }
  const S = { S1: null, S2: null, S3: null };
  function correr() { Object.assign(S, correrTodo()); }
  function pintar() {
    if (!S.S1) correr(); const e = escAct();
    const sub = `<div class="sim-sub" role="tablist">${[['S1', 'Comida'], ['S2', 'Residuos'], ['S3', 'Aves y humedal']].map(([k, n]) => `<button data-s="${k}" class="${k === sim ? 'on' : ''}">${n}</button>`).join('')}</div>`;
    let h = '';
    if (sim === 'S1') {
      const R = S.S1, r = R[e], a = R.A;
      h = cabecera('¿Cuánto baja la <b>dependencia de Corabastos</b> cuando Bavaria forma promotores, las huertas abastecen a tiendas y comedores, y cambia quién decide cómo se reparten los recursos?', ['A', 'B', 'C']) +
        `        <div class="sim-g"><h4>G1 · Producción y destino semanal<span>kg por semana · escenario ${e}</span></h4><canvas data-c="g1"></canvas>${ley([['#D5FF3F', 'Autoconsumo'], ['#a87a44', 'Excedente al acopio'], ['#5c636a', 'Merma']])}</div>
        <div class="sim-g"><h4>G2 · Personas alimentadas<span>A · B · C</span></h4><canvas data-c="g2"></canvas>${ley([[COL.A, 'A sin intervención'], [COL.B, 'B nodo central'], [COL.C, 'C clúster rotativo']])}</div>
        <div class="sim-g"><h4>G3 · Dependencia de Corabastos según la zona<span>al año 10, % de dependencia</span></h4><p>Más grande la zona de servicio, más depende. Cae al 50 % en una zona de ${fmtK(2 * r.pers[SEM - 1])} habitantes.</p><canvas data-c="g3"></canvas>${ley([[COL.A, 'A'], [COL.B, 'B'], [COL.C, 'C']])}</div>
        <div class="sim-g"><h4>G4 · Difusión de huertas (curva de Bass)<span>hogares activos</span></h4><canvas data-c="g4"></canvas>${ley([[COL.A, 'A'], [COL.B, 'B (techo 2.506)'], [COL.C, 'C (techo 5.400)']])}</div>
        <div class="sim-g"><h4>G5 · Saturación del acompañamiento<span>m² por promotor · escenario ${e}</span></h4><p>Por encima de ${fmt(P1.c)} m² por promotor baja la calidad de manejo y suben los cierres.</p><canvas data-c="g5"></canvas>${ley([[COL[e === 'A' ? 'C' : e], 'm² por promotor'], ['#D5FF3F', 'Capacidad c', true]])}</div>
        <div class="sim-g"><h4>G6 · Cola y tiempo de decisión<span>semanas de espera</span></h4><p>B: una institución central decide. C: asambleas rotativas (más capacidad, con pérdida por relevo).</p><canvas data-c="g6"></canvas>${ley([[COL.B, 'B decisión central'], [COL.C, 'C decisión rotativa']])}</div>
        <details class="sim-var"><summary>Variables (sliders) y estreses</summary><div class="cv">
          ${slider(P1, 'rend', 'Rendimiento (kg/m²·año)', 1, 12, 1)}${slider(P1, 'alcance', 'Alcance sobre lotes y techos', 0.1, 1, 0.05, v => fmt(v * 100) + ' %')}
          ${slider(P1, 'auto', 'Autoconsumo (PAR02)', 0.1, 0.7, 0.05, v => fmt(v * 100) + ' %')}${slider(P1, 'precio', 'Precio de excedentes ($/kg)', 1500, 4500, 100, v => '$' + fmt(v))}
          ${slider(P1, 'acopio', 'Capacidad de acopio (kg/semana)', 2000, 40000, 1000, v => fmt(v))}${slider(P1, 'reac', 'Reacción de precio de la central', 0, 1, 0.05, v => fmt(v, 2))}
          ${slider(P1, 'cupos', 'Cupos de formación (por trimestre)', 0, 40, 1)}${slider(P1, 'retardo', 'Retardo de aprendizaje (semanas)', 2, 40, 1)}
          ${slider(P1, 'c', 'm² por promotor (capacidad c)', 400, 3000, 100, v => fmt(v))}${slider(P1, 'rotacion', 'Periodo de rotación (semanas)', 4, 52, 1)}
          ${slider(P1, 'mu', 'Capacidad de decisión central (solicitudes/semana)', 1, 20, 1)}${slider(P1, 'zona', 'Población de la zona de servicio', 10000, 300000, 5000, v => fmtK(v))}
          ${slider(P1, 'sup', 'Huertas de la propuesta: parques, techos y Bavaria (m²)', 0, 200000, 5000, v => fmtK(v))}${slider(P1, 'regional', 'Compras directas a productores de la región', 0, 0.8, 0.05, v => fmt(v * 100) + ' %')}
          <div class="chk">${[['sequia', 'Sequía (años 3-4)'], ['bloqueo', 'Bloqueo del mayorista (año 6)'], ['crece', 'Crecimiento poblacional'], ['baldios', 'Revocación de baldíos (año 6)']].map(([k, n]) => `<label><input type="checkbox" data-b="${k}" ${P1[k] ? 'checked' : ''}>${n}</label>`).join('')}</div>
          <p class="sim-nota">Fórmulas del documento (G1-G6). [SUP]: A parte de 120 hogares sin apoyo; población de Kennedy 1.037.929 (ASIS 2024); 400 g/día de frutas y verduras por persona; 10 % de pérdida en huerta.</p></div></details>`;
    } else if (sim === 'S2') {
      const R = S.S2, r = R[e], a = R.A, año = (arr) => arr.slice(Math.max(0, t - 51), t + 1).reduce((s, v) => s + v, 0);
      h = cabecera('¿Cuánta <b>materia orgánica vuelve al suelo</b> en vez de salir del barrio?', ['A', 'B', 'C']) +
        `        <div class="sim-g"><h4>Destino de los orgánicos<span>kg por semana · escenario ${e}</span></h4><canvas data-c="o1"></canvas>${ley([['#5c636a', 'Al relleno (Doña Juana)'], ['#D5FF3F', 'Compost que vuelve al suelo'], ['#c9b08a', 'Hongos (proteína)']])}</div>
        <div class="sim-g"><h4>% de los orgánicos que vuelve al suelo<span>A · B · C</span></h4><canvas data-c="o2"></canvas>${ley([[COL.A, 'A ruta actual'], [COL.B, 'B estación barrial'], [COL.C, 'C Bavaria Común']])}</div>
        <div class="sim-g"><h4>Material en maduración<span>kg en las pilas</span></h4><canvas data-c="o3"></canvas>${ley([[COL.B, 'B'], [COL.C, 'C']])}</div>
        <div class="sim-g"><h4>Kilómetros de transporte<span>km por semana</span></h4><canvas data-c="o4"></canvas>${ley([[COL.A, 'A'], [COL.B, 'B'], [COL.C, 'C']])}</div>
        <details class="sim-var"><summary>Variables (sliders)</summary><div class="cv">
          ${slider(P2, 'frac', 'Fracción desviada', 0.05, 0.9, 0.05, v => fmt(v * 100) + ' %')}${slider(P2, 'cap', 'Capacidad de la estación (kg/semana)', 1000, 30000, 500, v => fmt(v))}
          ${slider(P2, 'mad', 'Semanas de maduración', 4, 24, 1)}${slider(P2, 'sust', 'Fracción de sustrato al distrito', 0, 0.6, 0.05, v => fmt(v * 100) + ' %')}
          ${slider(P2, 'dist', 'Distancia estación – huertas (km)', 0.2, 6, 0.1, v => fmt(v, 1))}
          <p class="sim-nota">0,55 kg/día de orgánicos por persona (1,1 kg PPC × 50 % orgánico, fuentes.json) en la zona de servicio (de SIM-01); el compost pesa el 23 % del material que entra (plazas distritales de Bogotá); Bavaria procesa 3,5 veces la capacidad de una estación; Doña Juana a ~28 km.</p></div></details>`;
    } else {
      const R = S.S3, r = R[e], a = R.A;
      h = cabecera('¿Dónde y con qué especies las huertas <b>ayudan al hábitat</b> y dónde crean <b>trampas ecológicas</b>?', ['A', 'B', 'C']) +
        `        <div class="sim-g"><h4>Aves en el borde del humedal<span>individuos · A · B · C</span></h4><canvas data-c="f1"></canvas>${ley([[COL.A, 'A sin huertas'], [COL.B, 'B sin criterio'], [COL.C, 'C con corredores']])}</div>
        <div class="sim-g"><h4>Con y sin medida antitrampa<span>aves · escenario ${e === 'A' ? 'C' : e}</span></h4><canvas data-c="f2"></canvas>${ley([[COL[e === 'A' ? 'C' : e], 'con antitrampa'], [COL[e === 'A' ? 'C' : e], 'sin antitrampa', true]])}</div>
        <div class="sim-g"><h4>Integridad del humedal<span>% · A · B · C</span></h4><canvas data-c="f3"></canvas>${ley([[COL.A, 'A'], [COL.B, 'B'], [COL.C, 'C']])}</div>
        <details class="sim-var"><summary>Variables (sliders)</summary><div class="cv">
          ${slider(P3, 'disp', 'Alcance de dispersión de las aves (m)', 100, 1500, 50)}${slider(P3, 'borde', 'Número de huertas en el borde', 0, 60, 1)}
          ${slider(P3, 'arboles', 'Densidad de árboles', 0, 1, 0.05, v => fmt(v, 2))}${slider(P3, 'luz', 'Intensidad de luz y vidrio', 0, 1, 0.05, v => fmt(v, 2))}
          ${slider(P3, 'rec', 'Tasa de recuperación del humedal', 0, 0.1, 0.005, v => fmt(v, 3))}
          <div class="chk"><label><input type="checkbox" data-b3="anti" ${P3.anti ? 'checked' : ''}>Medida antitrampa</label></div>
          <p class="sim-nota">[SUP] Crecimiento logístico de las aves con capacidad de carga según el humedal, los árboles, la conectividad entre parches (mayor en C por los corredores) y las huertas; la trampa ecológica es mortalidad por luz y vidrio en las huertas del borde, que la medida antitrampa reduce al 30 %.</p></div></details>`;
    }
    cont.innerHTML = sub + resumen() + `<details class="sim-tec"${abiertoTec ? ' open' : ''}><summary>Detalle técnico · gráficas del modelo, escenarios B y C y variables</summary><div class="sim-tec-c">${h}</div></details>`;
    dibujar(); conectar();
  }
  /* ---------- resumen: una frase, la comparación hoy / con la propuesta y una sola gráfica ---------- */
  const proK = () => (escP === 'A' || !escP ? 'C' : escP); // la propuesta que se compara con hoy: B o C (por defecto C)
  const año10 = () => Math.floor(t / AÑO) + 1;
  // indicadores de cada simulación para un escenario k, en la semana t (los de residuos suman el último año)
  function IND(k) {
    const ti = Math.floor(t), sem = (arr) => arr.slice(Math.max(0, ti - 51), ti + 1).reduce((s, v) => s + v, 0);
    if (sim === 'S1') { const r = S.S1[k]; return [
      { n: 'Hogares con huerta', v: r.act[t], f: (v) => fmt(v) },
      { n: 'Personas que comen de las huertas', v: r.pers[t], f: fmtK },
      { n: 'Dependencia de Corabastos', s: `zona de ${fmtK(P1.zona)} habitantes`, v: r.dep[t] * 100, f: (v) => fmt(v) + ' %', menos: true },
      { n: 'Comida producida por semana', v: r.prod[t], f: (v) => fmtK(v) + ' kg' }]; }
    if (sim === 'S2') { const r = S.S2[k]; return [
      { n: 'Abono que vuelve a la tierra', s: 'toneladas al año', v: sem(r.vuelve) / 1000, f: (v) => fmt(v) + ' t' },
      { n: 'Residuos que se van al relleno', s: 'toneladas al año', v: sem(r.relleno) / 1000, f: (v) => fmtK(v) + ' t', menos: true },
      { n: 'Km que viajan los residuos', s: 'en camión, al año', v: sem(r.km), f: (v) => fmtK(v) + ' km', menos: true },
      { n: 'Hongos para comer', s: 'kg al año', v: sem(r.hongos), f: (v) => fmtK(v) + ' kg' }]; }
    const r = S.S3[k]; return [
      { n: 'Aves en el borde del humedal', v: r.aves[t], f: (v) => fmt(v) },
      { n: 'Especies de aves', v: r.riq[t], f: (v) => fmt(v) },
      { n: 'Estado del humedal', s: 'integridad', v: r.hum[t], f: (v) => fmt(v) + ' %' },
      { n: 'Aves muertas por luz y vidrio', s: 'acumulado', v: r.trampa[t], f: (v) => fmt(v), menos: true }];
  }
  // una fila «hoy vs. propuesta»: dos barras en la misma escala y una etiqueta que dice cuánto cambia y si es mejor o peor
  function filaVs(I, hoy, pro, kP, nHoy = 'Hoy', nPro = 'Propuesta ' + kP, cHoy = COL.A, cPro = COL[kP]) {
    const m = Math.max(Math.abs(hoy), Math.abs(pro), 1e-9), igual = Math.abs(pro - hoy) < 0.005 * m, mejor = I.menos ? pro < hoy : pro > hoy;
    const veces = (a, b) => fmt(a / b, a / b < 10 ? 1 : 0) + ' veces';
    const cambio = igual ? 'igual' : hoy > 0 && pro / hoy >= 2 ? veces(pro, hoy) + ' más' : pro > 0 && hoy / pro >= 2 ? veces(hoy, pro) + ' menos' : !hoy ? 'nuevo' : (pro >= hoy ? '+' : '−') + fmt(Math.abs(pro - hoy) / Math.abs(hoy) * 100) + ' %';
    const w = (v) => Math.max(1.5, Math.abs(v) / m * 100).toFixed(1);
    return `<div class="vs"><div class="vs-n"><span>${esc(I.n)}${I.s || I.menos ? `<small>${esc([I.s, I.menos ? 'menos es mejor' : ''].filter(Boolean).join(' · '))}</small>` : ''}</span><em class="${igual ? 'igual' : mejor ? 'bien' : 'mal'}">${cambio}${igual ? '' : mejor ? ' · mejor' : ' · peor'}</em></div>
      <div class="vs-b"><span>${esc(nHoy)}</span><i><b style="width:${w(hoy)}%;background:${cHoy}"></b></i><strong>${I.f(hoy)}</strong></div>
      <div class="vs-b"><span>${esc(nPro)}</span><i><b style="width:${w(pro)}%;background:${cPro}"></b></i><strong style="color:${cPro}">${I.f(pro)}</strong></div></div>`;
  }
  // tabla A · B · C: mismo indicador en los tres escenarios, el mejor marcado
  function tablaABC() {
    const T = { A: IND('A'), B: IND('B'), C: IND('C') };
    return `<div class="abc"><div class="abc-r abc-h"><span></span>${['A', 'B', 'C'].map(k => `<div><i style="background:${COL[k]}"></i>${k}<small>${CORTO[k]}</small></div>`).join('')}</div>` +
      T.A.map((I, j) => { const vals = ['A', 'B', 'C'].map(k => T[k][j].v), m = Math.max(...vals.map(Math.abs), 1e-9), best = I.menos ? Math.min(...vals) : Math.max(...vals), empate = vals.every(v => Math.abs(v - best) < 0.005 * m);
        return `<div class="abc-r"><span class="n">${esc(I.n)}${I.menos ? '<small>menos es mejor</small>' : ''}</span>${['A', 'B', 'C'].map((k, q) => { const v = vals[q], b = !empate && Math.abs(v - best) < 0.005 * m;
          return `<div class="c${b ? ' best' : ''}"><strong>${I.f(v)}</strong><i><b style="width:${Math.max(2, Math.abs(v) / m * 100).toFixed(1)}%;background:${COL[k]}"></b></i></div>`; }).join('')}</div>`; }).join('') + '</div>';
  }
  function resumen() {
    const p = proK(), A = IND('A'), P = IND(p), a2 = año10(), año = 2026 + a2;
    let q = '', frase = '', gtit = '';
    if (sim === 'S1') { const sA = S.S1.A, sP = S.S1[p];
      q = '¿Cuánto deja Kennedy de depender de Corabastos si las huertas del barrio abastecen tiendas y comedores?';
      frase = `En ${año}, con la propuesta, <b>${fmtK(sP.pers[t])} personas</b> comen frutas y verduras de las huertas del barrio y la dependencia de Corabastos baja a <b>${fmt(sP.dep[t] * 100)} %</b>. Si Kennedy sigue como hoy: <b>${fmtK(sA.pers[t])} personas</b> y <b>${fmt(sA.dep[t] * 100)} %</b>.`;
      gtit = 'Personas que comen de las huertas';
    } else if (sim === 'S2') {
      q = '¿Cuánta basura orgánica vuelve a la tierra como abono en vez de irse al relleno?';
      frase = `En ${año}, con la propuesta, <b>${P[0].f(P[0].v)}</b> de residuos orgánicos al año vuelven a la tierra como abono. Si Kennedy sigue como hoy: <b>${A[0].f(A[0].v)}</b>.`;
      gtit = '% de los orgánicos que vuelve a la tierra';
    } else { const sA = S.S3.A, sP = S.S3[p];
      q = '¿Las huertas ayudan a las aves y al humedal, o les ponen trampas?';
      frase = `En ${año}, con la propuesta, hay <b>${fmt(sP.aves[t])} aves</b> y <b>${fmt(sP.riq[t])} especies</b> en el borde del humedal. Si Kennedy sigue como hoy: <b>${fmt(sA.aves[t])}</b> aves y <b>${fmt(sA.riq[t])}</b> especies.`;
      gtit = 'Aves en el borde del humedal';
    }
    const gana = A.reduce((s, I, j) => s + ((I.menos ? P[j].v < I.v : P[j].v > I.v) ? 1 : 0), 0);
    return `<div class="sim-res"><p class="sim-q">${q}</p><div class="sim-frase">${frase}</div>
      <div class="sim-play"><button data-play>${play ? 'Pausa' : '▶ Correr 10 años'}</button><input type="range" min="0" max="${SEM - 1}" value="${t}" data-t aria-label="Tiempo de la simulación"><output>${año}<br><small style="color:#8e979d">año ${a2} de 10</small></output></div>
      <div class="sim-h">1 · Kennedy hoy vs. la propuesta</div>
      <p class="sim-lead"><i style="background:${COL.A}"></i><b>Hoy</b>: Kennedy sigue igual 10 años. <i style="background:${COL[p]}"></i><b>Propuesta ${p}</b>: (${CORTO[p].toLowerCase()}) ${esc(ESCD[sim][p])} La propuesta mejora <b>${gana} de ${A.length}</b> indicadores.</p>
      <div class="vss">${A.map((I, j) => filaVs(I, I.v, P[j].v, p)).join('')}</div>
      <div class="sim-g sim-gp"><h4>${esc(gtit)}<span>la franja de color es lo que gana la propuesta</span></h4><canvas data-c="res"></canvas></div>
      <div class="sim-h">2 · Los tres escenarios</div>
      <p class="sim-lead">Toca B o C para escoger cuál se compara con hoy (también cambia el mapa).</p>
      <div class="esd">${['A', 'B', 'C'].map(k => `<button type="button" data-e2="${k}" style="--c:${COL[k]}" class="${k === p ? 'on' : ''}" ${k === 'A' ? 'aria-disabled="true"' : `aria-pressed="${k === p}"`}><b>${k}</b><span>${CORTO[k]}${k === 'A' ? '<em>sin intervención</em>' : k === p ? '<em>comparando con hoy</em>' : ''}</span><small>${esc(ESCD[sim][k])}</small></button>`).join('')}</div>
      ${tablaABC()}<p class="abc-nota"><b>▲</b> el mejor de los tres en ${año}.</p>
      <div class="sim-g sim-gp"><h4>${esc(gtit)}<span>A · B · C</span></h4><canvas data-c="abc"></canvas></div></div>`;
  }
  function dibujarResumen() {
    const cv = cont.querySelector('canvas[data-c="res"]'); if (!cv) return; const p = proK();
    const key = sim === 'S1' ? ['S1', 'pers', fmtK] : sim === 'S2' ? ['S2', 'pct', (v) => fmt(v, 1) + ' %'] : ['S3', 'aves', (v) => fmt(v)];
    grafica(cv, { series: [{ name: 'Hoy', corto: 'Hoy', color: COL.A, data: S[key[0]].A[key[1]], w: 2.4 }, { name: 'Propuesta ' + p, corto: 'Propuesta ' + p, color: COL[p], data: S[key[0]][p][key[1]], w: 3 }], yfmt: key[2], brecha: [0, 1], fin: true });
    hover(cv, (k) => `${2027 + Math.floor(k / AÑO)}`);
    const c2 = cont.querySelector('canvas[data-c="abc"]'); if (!c2) return;
    grafica(c2, { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: S[key[0]][k][key[1]], w: k === p || k === 'A' ? 2.6 : 2, dash: k === 'A' ? [5, 4] : null })), yfmt: key[2], fin: true });
    hover(c2, (k) => `${2027 + Math.floor(k / AÑO)}`);
  }
  function dibujar() {
    dibujarResumen();
    if (!cont.querySelector('.sim-tec') || !cont.querySelector('.sim-tec').open) return; // lo técnico solo se dibuja abierto
    const e = escAct(), c = (k) => cont.querySelector(`canvas[data-c="${k}"]`), kg = (v) => fmtK(v), pct = (v) => fmt(v, 1) + ' %';
    if (sim === 'S1') { const R = S.S1, r = R[e];
      grafica(c('g1'), { apilar: true, series: [{ name: 'Autoconsumo', color: '#D5FF3F', data: r.auto }, { name: 'Excedente', color: '#a87a44', data: r.exc }, { name: 'Merma', color: '#5c636a', data: r.merma }], yfmt: kg });
      grafica(c('g2'), { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].pers, w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, yfmt: kg });
      const zs = Array.from({ length: 61 }, (_, i) => 5000 + i * 5000), xz = (i) => 40 + i / 60 * ((c('g3').clientWidth || 400) - 48);
      grafica(c('g3'), { x: xz, series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: zs.map(z => Math.max(0, 1 - R[k].pers[SEM - 1] / z) * 100), w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, y: { max: 100 }, yfmt: (v) => fmt(v) + ' %' });
      grafica(c('g4'), { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].act, w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, yfmt: (v) => fmt(v) });
      const k5 = e === 'A' ? 'C' : e; grafica(c('g5'), { series: [{ name: 'm² por promotor', color: COL[k5], data: R[k5].m2p }, { name: 'Capacidad c', color: '#D5FF3F', data: R[k5].m2p.map(() => P1.c), dash: [4, 3], w: 1.5 }], yfmt: (v) => fmt(v) + ' m²' });
      grafica(c('g6'), { series: [{ name: 'B central', color: COL.B, data: R.B.espera }, { name: 'C rotativa', color: COL.C, data: R.C.espera }], yfmt: (v) => fmt(v, 1) + ' sem' });
      for (const k of ['g1', 'g2', 'g4', 'g5', 'g6']) hover(c(k), semLabel); hover(c('g3'), (i) => `Zona de ${fmtK(zs[i])} habitantes`);
    } else if (sim === 'S2') { const R = S.S2, r = R[e];
      grafica(c('o1'), { apilar: true, series: [{ name: 'Relleno', color: '#5c636a', data: r.relleno }, { name: 'Compost', color: '#D5FF3F', data: r.compost }, { name: 'Hongos', color: '#c9b08a', data: r.hongos }], yfmt: kg });
      grafica(c('o2'), { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].pct, w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, yfmt: pct });
      grafica(c('o3'), { series: ['B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].pila })), yfmt: kg });
      grafica(c('o4'), { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].km, w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, yfmt: (v) => fmt(v) + ' km' });
      for (const k of ['o1', 'o2', 'o3', 'o4']) hover(c(k), semLabel);
    } else { const R = S.S3, k2 = e === 'A' ? 'C' : e;
      grafica(c('f1'), { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].aves, w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, yfmt: (v) => fmt(v) });
      grafica(c('f2'), { series: [{ name: 'con antitrampa', color: COL[k2], data: sim03(k2, P3, true).aves }, { name: 'sin antitrampa', color: COL[k2], data: R[k2 + 'sin'].aves, dash: [4, 3] }], yfmt: (v) => fmt(v) });
      grafica(c('f3'), { series: ['A', 'B', 'C'].map(k => ({ name: NOMBRE[k], corto: k, color: COL[k], data: R[k].hum, w: k === e ? 2.6 : 1.5, alfa: k === e ? 1 : 0.55 })), fin: true, y: { max: 100 }, yfmt: (v) => fmt(v) + ' %' });
      for (const k of ['f1', 'f2', 'f3']) hover(c(k), semLabel);
    }
  }
  function conectar() {
    cont.querySelectorAll('.sim-sub button').forEach(b => b.onclick = () => { sim = b.dataset.s; pintar(); animar(); });
    cont.querySelectorAll('.sim-esc button').forEach(b => b.onclick = () => { escP = SIMST.esc = b.dataset.e; avisar('tablero'); pintar(); animar(); });
    const det = cont.querySelector('.sim-var'); if (det) { det.open = !!abiertoVar; det.ontoggle = () => { abiertoVar = det.open; }; }
    const tec = cont.querySelector('.sim-tec'); if (tec) tec.ontoggle = () => { abiertoTec = tec.open; if (tec.open) dibujar(); };
    cont.querySelectorAll('input[data-k]').forEach(inp => { const P = sim === 'S1' ? P1 : sim === 'S2' ? P2 : P3, o = cont.querySelector(`output[data-o="${inp.dataset.k}"]`);
      inp.oninput = () => { P[inp.dataset.k] = +inp.value; if (o) o.textContent = inp.value; correr(); dibujar(); avisar('tablero'); }; inp.onchange = () => pintar(); });
    cont.querySelectorAll('input[data-b]').forEach(inp => inp.onchange = () => { P1[inp.dataset.b] = inp.checked; correr(); pintar(); avisar('tablero'); });
    cont.querySelectorAll('input[data-b3]').forEach(inp => inp.onchange = () => { P3.anti = inp.checked; correr(); pintar(); avisar('tablero'); });
  }
  let abiertoVar = false, abiertoTec = false;
  function refrescar() { const r = cont.querySelector('.sim-res'); if (r) r.outerHTML = resumen(); dibujar(); }
  function parar() { if (play) { cancelAnimationFrame(play); play = null; } }
  function arrancar(desde0 = true) { parar(); if (desde0 || t >= SEM - 1) t = 0; let prev = performance.now(), tf = t;
    const paso = (now) => { const dt = Math.min(0.1, (now - prev) / 1000); prev = now; tf = Math.min(SEM - 1, tf + dt * 66); t = Math.floor(tf); /* ~8 s los 10 años; t siempre entero */
      if (t >= SEM - 1) { t = SEM - 1; play = null; refrescar(); return; } play = requestAnimationFrame(paso); refrescar(); };
    play = requestAnimationFrame(paso); }
  cont.addEventListener('click', (e) => { const e2 = e.target.closest('[data-e2]'); if (e2) { const k = e2.dataset.e2; if (k !== 'A' && k !== escP) { escP = SIMST.esc = k; avisar('tablero'); pintar(); } return; }
    if (e.target.closest('[data-play]')) { if (play) { parar(); refrescar(); } else arrancar(t >= SEM - 1); } });
  cont.addEventListener('input', (e) => { const ts = e.target.closest('[data-t]'); if (!ts) return; parar(); t = +ts.value; const o = ts.nextElementSibling; if (o) o.innerHTML = `${2026 + año10()}<br><small style="color:#8e979d">año ${año10()} de 10</small>`; dibujar(); });
  cont.addEventListener('change', (e) => { if (e.target.closest('[data-t]')) refrescar(); });
  // el panel de escenarios del mapa cambió algo: mismo escenario y mismos parámetros aquí
  addEventListener('sim-cambio', (ev) => { if (ev.detail && ev.detail.origen === 'tablero') return; escP = SIMST.esc; correr(); if (cont.classList.contains('vis')) pintar(); });
  const RMQ = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = () => cont.classList.contains('vis') && document.body.classList.contains('tb-abierto');
  const animar = () => { if (RMQ) { t = SEM - 1; refrescar(); return; } if (visible()) arrancar(true); };
  const btnTab = document.getElementById('b-tablero'); if (btnTab) btnTab.addEventListener('click', () => setTimeout(animar, 120));
  bt.addEventListener('click', () => setTimeout(animar, 60));
  addEventListener('escenario', () => { if (T3.escenario !== 'proyecto') escP = escP === 'A' ? 'C' : escP; pintar(); animar(); });
  addEventListener('resize', () => { if (cont.classList.contains('vis')) dibujar(); });
  correr(); pintar();
  return { pintar, S };
}
