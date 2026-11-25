/* ============ TABLERO · INTERACCIONES BIÓTICAS EN VIVO ============
   Tres gráficas sobre lo que está ocurriendo en la red biótica del simulador (data3d/biotica.js):
   1. Cuerda: quién interactúa con quién AHORA (especies de fauna y árboles alrededor; cintas = encuentros, color = tipo de relación).
   2. Flujo del día: encuentros de cada tipo a lo largo de las 24 h (se va construyendo con el reloj de la simulación).
   3. Pulso: cada encuentro nuevo es un punto en la franja de su tipo; los puntos corren hacia la izquierda (últimos 90 s).
   Encuentro: dos agentes relacionados en la red a menos de 18 m (la interacción está ocurriendo). */
export function iniciarTablero({ T3, bio }) {
  const { AG, ESP, LINKS, TIPOS, CAT, ENC, CERCA, flora, ESTADO } = bio;
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hhmm = (min) => { min = ((Math.floor(min) % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); };
  const num = (v) => Math.round(v).toLocaleString('es-CO');
  const TAU = Math.PI * 2, NT = TIPOS.length;
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const VERBO = { 0: 'caza a', 1: 'se alimenta de', 2: 'dispersa semillas de', 3: 'coopera con', 4: 'se refugia en', 5: 'visita las flores de', 6: 'anida en', 7: 'parasita el nido de', 8: 'compite con' };
  const CHOY = '#8fb0c9', CPRO = '#D5FF3F'; // un color por escenario
  const CORTO = { 0: 'Depredación', 1: 'Herbivoría', 2: 'Dispersión', 3: 'Mutualismo', 4: 'Refugio', 5: 'Polinización', 6: 'Dosel', 7: 'Parasitismo', 8: 'Competencia' };

  /* ---------- nodos de la cuerda: fauna (orden fijo por grupo) + árboles más visitados ---------- */
  const presentes = new Set(AG.map(a => a.e));
  const FAUNA = Object.keys(ESP).filter(k => presentes.has(k)).sort((p, q) => ESP[p].cat - ESP[q].cat || ESP[p].n.localeCompare(ESP[q].n));
  const NODO = new Map(); // id -> { n, c, v (suavizado) }
  for (const k of FAUNA) NODO.set('e:' + k, { n: ESP[k].n, c: CAT[ESP[k].cat].c, v: 0, fauna: true });
  const MAXF = 5, ACUF = new Map(); let FLSET = new Set(); // árboles con nodo propio (los más visitados); el resto va a "Otros árboles"
  const nodoFlora = (f) => { if (FLSET.has(f)) return 'f:' + f; return 'f:otros'; };
  NODO.set('f:otros', { n: 'Otros árboles', c: '#5f7a66', v: 0 });
  const PAR = new Map(); // "src|dst|t" -> { s, d, t, v (suavizado), obj }

  /* ---------- series ---------- */
  let diaAct = -1, primado = false, ahoraEnc = 0;
  const DIA = Array.from({ length: 96 }, () => ({ n: 0, s: new Float32Array(NT) })); // promedio de encuentros por tipo en cada cuarto de hora
  const EV = [], VISTO = new Map(); // pulsos: { tr (ms reales), t, txt, hab }

  /* ---------- estilos ---------- */
  const css = document.createElement('style'); css.textContent = `
#tb{position:fixed;z-index:13;right:14px;top:14px;bottom:84px;width:460px;display:none;flex-direction:column;overflow:hidden;
  font:400 12px var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#e9ebec);background:var(--ui-bg,rgba(13,15,18,.8));
  border:1px solid var(--ui-bd,rgba(255,255,255,.075));border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);
  -webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);font-variant-numeric:tabular-nums}
body.tb-abierto #tb{display:flex}
body.tb-abierto #dock{display:none}
#tb .cab{flex:none;display:flex;align-items:flex-end;gap:14px;padding:14px 12px 12px 18px}
#tb .cab .big{font:300 40px/0.95 var(--ui-sans,sans-serif);letter-spacing:-.02em}
#tb .cab .lbl{flex:1;padding-bottom:2px;font-size:12px;line-height:1.35;color:var(--ui-tx2,#9aa2a7)}
#tb .cab .lbl b{display:block;color:var(--ui-tx,#e9ebec);font-weight:500}
#tb .x{align-self:flex-start;width:26px;height:26px;border:0;border-radius:6px;background:none;color:var(--ui-tx2,#9aa2a7);font:300 18px/1 var(--ui-sans,sans-serif);cursor:pointer}
#tb .x:hover{background:rgba(255,255,255,.06);color:var(--ui-tx,#e9ebec)}
#tb .cuerpo{overflow:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.12) transparent;padding-bottom:6px}
#tb .tabs{display:flex;gap:2px;margin:0 16px 10px;border-bottom:1px solid var(--ui-bd,rgba(255,255,255,.075))}#tb .tabs button{flex:1;height:34px;border:0;border-bottom:2px solid transparent;background:none;color:var(--ui-tx2,#9aa2a7);font:500 12px var(--ui-sans,sans-serif);cursor:pointer;margin-bottom:-1px}#tb .tabs button.on{color:var(--ui-tx,#e9ebec);border-bottom-color:#D5FF3F}#tb [data-tab]:not(.vis){display:none!important}#tb .gr.vis.prim{border-top:0;padding-top:4px}
#tb .chips{display:flex;flex-wrap:wrap;gap:4px;padding:0 16px 12px}
#tb .esc{display:flex;gap:3px;margin:0 16px 12px;padding:3px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
#tb .esc button{flex:1;height:32px;border:0;border-radius:7px;background:transparent;color:var(--ui-tx2,#9aa2a7);font:500 12px var(--ui-sans,sans-serif);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px}
#tb .esc button i{width:8px;height:8px;border-radius:50%}
#tb .esc{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.05);border-radius:11px}
#tb .esc button{height:36px;border-radius:8px;transition:background .3s,color .3s,box-shadow .3s}
#tb .esc button:hover{color:var(--ui-tx,#e9ebec)}
#tb .esc button i{opacity:.45;transition:opacity .3s,box-shadow .3s}
#tb .esc button.on{color:#fff}#tb .esc button.on i{opacity:1}
#tb .esc button[data-e="hoy"].on{background:linear-gradient(180deg,rgba(143,176,201,.24),rgba(143,176,201,.1));box-shadow:inset 0 0 0 1px rgba(143,176,201,.42)}
#tb .esc button[data-e="hoy"].on i{box-shadow:0 0 0 3px rgba(143,176,201,.22),0 0 10px rgba(143,176,201,.6)}
#tb .esc button[data-e="proyecto"].on{background:linear-gradient(180deg,rgba(213,255,63,.26),rgba(213,255,63,.1));box-shadow:inset 0 0 0 1px rgba(213,255,63,.5)}
#tb .esc button[data-e="proyecto"].on i{box-shadow:0 0 0 3px rgba(213,255,63,.22),0 0 10px rgba(213,255,63,.6)}
#tb .cmp{display:grid;gap:9px;margin-top:4px}
#tb .ind{display:grid;grid-template-columns:minmax(0,1fr) 214px;gap:4px 12px;align-items:center}
#tb .ind .n{font-size:11.5px;line-height:1.3}#tb .ind .n small{display:block;color:var(--ui-tx3,#646c71);font-size:10.5px}
#tb .ind .v{display:grid;grid-template-columns:1fr 1fr 92px;gap:6px;text-align:right;font-size:12px;align-items:baseline}#tb .ind .v em{font:normal 500 10.5px var(--ui-sans,sans-serif)}
#tb .ind .v span{color:#9fb6c8}#tb .ind .v b{font-weight:500;color:#f0b56c}
#tb .ind .dif{grid-column:1/3;position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.05)}
#tb .ind .dif i{position:absolute;top:0;bottom:0;border-radius:3px}
#tb .ley2{display:flex;gap:14px;margin:2px 0 8px;font-size:11px;color:var(--ui-tx2,#9aa2a7)}#tb .ley2 span{display:flex;align-items:center;gap:6px}#tb .ley2 i{width:10px;height:10px;border-radius:3px}
#tb .nota2{margin-top:10px;font-size:10.5px;line-height:1.5;color:var(--ui-tx3,#646c71)}
#tb .tour{width:100%;height:34px;margin-top:12px;border:1px solid rgba(213,255,63,.42);border-radius:8px;background:rgba(213,255,63,.13);color:#e3ff86;font:500 12px var(--ui-sans,sans-serif);cursor:pointer}
#tb .tour:hover{background:rgba(213,255,63,.2)}
#tb .kp2{display:grid;grid-template-columns:repeat(3,1fr);margin:6px 0 12px}
#tb .kp2 div{padding:0 10px;border-left:1px solid var(--ui-bd,rgba(255,255,255,.075))}#tb .kp2 div:first-child{padding-left:0;border-left:0}
#tb .kp2 b{display:block;font:400 20px/1.1 var(--ui-sans,sans-serif)}#tb .kp2 small{display:block;margin-top:3px;font-size:10.5px;line-height:1.3;color:var(--ui-tx3,#646c71)}
#tb .calles{display:grid;gap:6px}
#tb .calle{display:grid;grid-template-columns:minmax(0,1fr) 120px 92px;gap:8px;align-items:center;font-size:11.5px}
#tb .calle .n{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tb .calle .b{position:relative;height:6px}#tb .calle .b::before{content:'';position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:rgba(255,255,255,.18)}
#tb .calle .b i{position:absolute;top:0;bottom:0;border-radius:3px}
#tb .calle .v{text-align:right;color:var(--ui-tx2,#9aa2a7);font-size:11px}#tb .calle .v b{font-weight:500}
#tb .fila2{display:flex;gap:4px;margin-top:12px}
#tb .fila2 button{flex:1;height:30px;border:1px solid var(--ui-bd,rgba(255,255,255,.075));border-radius:7px;background:rgba(255,255,255,.035);color:var(--ui-tx2,#9aa2a7);font:500 11px var(--ui-sans,sans-serif);cursor:pointer}
#tb .fila2 button.on{background:rgba(213,255,63,.13);color:#e3ff86;border-color:rgba(213,255,63,.42)}
#tb .sx2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
#tb .sx2 h5{margin:0 0 6px;font:500 11px var(--ui-sans,sans-serif);color:var(--ui-tx2,#9aa2a7)}
#tb .sx2 button{display:flex;justify-content:space-between;gap:6px;width:100%;padding:4px 0;border:0;border-top:1px solid rgba(255,255,255,.05);background:none;color:var(--ui-tx,#e9ebec);font:400 11.5px var(--ui-sans,sans-serif);text-align:left;cursor:pointer}
#tb .sx2 button:hover{color:#e3ff86}#tb .sx2 button small{color:var(--ui-tx3,#646c71);white-space:nowrap}
#tb:not([data-esc="proyecto"]) .solo-pro{display:none!important}
#tb .solo-pro h3{color:#e3ff86}
#tb .fom{display:grid;gap:0;margin:0 0 4px}
#tb .fom .f{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:7px 0;border-top:1px solid rgba(255,255,255,.05)}
#tb .fom .f > i{width:8px;height:8px;border-radius:50%}
#tb .fom .f b{font-weight:500;font-size:11.5px}#tb .fom .f small{display:block;color:var(--ui-tx3,#646c71);font-size:10.5px;line-height:1.35}
#tb .fom .f em{font:normal 500 10px var(--ui-sans,sans-serif);padding:2px 7px;border-radius:5px;white-space:nowrap}
#tb .cali{display:grid;gap:8px;margin:2px 0 4px}
#tb .cali .r{display:grid;grid-template-columns:78px minmax(0,1fr) 64px;gap:8px;align-items:center;font-size:11px;color:var(--ui-tx2,#9aa2a7)}
#tb .cali .t{display:grid;gap:3px}#tb .cali .t i{display:block;height:6px;border-radius:3px;transition:width .6s}
#tb .cali .r b{text-align:right;font-weight:500;color:#6ee7b7}
#tp{position:fixed;z-index:27;left:290px;bottom:84px;width:min(400px,calc(100vw - 24px));display:none;padding:14px 16px 12px;font:400 12px var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#e9ebec);
  background:var(--ui-bg,rgba(13,15,18,.86));border:1px solid var(--ui-bd,rgba(255,255,255,.075));border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.3);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
#tp.on{display:block}
#tp .paso{font:500 9.5px var(--ui-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:#e3ff86}
#tp h4{margin:4px 0 10px;font:500 16px/1.25 var(--ui-sans,sans-serif)}
#tp dl{margin:0;display:grid;grid-template-columns:72px 1fr;gap:6px 10px;font-size:12px;line-height:1.45}
#tp dt{color:var(--ui-tx3,#646c71)}#tp dd{margin:0;color:var(--ui-tx2,#c9ced1)}#tp dd b{color:var(--ui-tx,#e9ebec);font-weight:500}
#tp .nav{display:flex;gap:4px;margin-top:12px;align-items:center}
#tp .nav span{flex:1;display:flex;gap:4px}#tp .nav span i{width:16px;height:3px;border-radius:2px;background:rgba(255,255,255,.12)}#tp .nav span i.on{background:#D5FF3F}
#tp .nav button{height:30px;padding:0 14px;border:1px solid var(--ui-bd,rgba(255,255,255,.075));border-radius:7px;background:rgba(255,255,255,.035);color:var(--ui-tx2,#9aa2a7);font:500 11px var(--ui-sans,sans-serif);cursor:pointer}
#tp .nav button.pri{background:rgba(213,255,63,.13);color:#e3ff86;border-color:rgba(213,255,63,.42)}
#tp .x{position:absolute;right:8px;top:8px;width:26px;height:26px;border:0;border-radius:6px;background:none;color:var(--ui-tx2,#9aa2a7);font:300 18px/1 var(--ui-sans,sans-serif);cursor:pointer}
@media(max-width:760px){#tp{left:12px;right:12px;width:auto;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 64px)}#tb .calle{grid-template-columns:minmax(0,1fr) 70px 84px}}
#tb .chip{display:flex;align-items:center;gap:6px;height:24px;padding:0 9px 0 8px;border:1px solid rgba(255,255,255,.07);border-radius:12px;background:rgba(255,255,255,.03);color:var(--ui-tx2,#9aa2a7);font:400 11px var(--ui-sans,sans-serif);cursor:pointer}
#tb .chip i{width:7px;height:7px;border-radius:50%}
#tb .chip b{font-weight:500;color:var(--ui-tx,#e9ebec)}
#tb .chip.off{opacity:.35}
#tb .chip:hover{border-color:rgba(255,255,255,.18)}
#tb .gr{position:relative;padding:12px 16px 4px;border-top:1px solid var(--ui-bd,rgba(255,255,255,.075))}
#tb .gr h3{display:flex;justify-content:space-between;align-items:baseline;margin:0 0 4px;font:500 12px var(--ui-sans,sans-serif)}
#tb .gr h3 span{font-weight:400;font-size:11px;color:var(--ui-tx3,#646c71)}
#tb canvas{display:block;width:100%;touch-action:none}
#tb .pie{min-height:32px;padding:6px 0 8px;font-size:11.5px;line-height:1.4;color:var(--ui-tx2,#9aa2a7)}
#tb .pie b{color:var(--ui-tx,#e9ebec);font-weight:500}
#tb .ejes{display:flex;justify-content:space-between;font-size:10px;color:var(--ui-tx3,#646c71);margin-top:2px}
#b-tablero svg{opacity:.8}
#tb .escb{display:inline-block;margin-left:8px;padding:1px 7px;border-radius:5px;font:500 9.5px var(--ui-mono,monospace);letter-spacing:.08em;text-transform:uppercase;color:${CHOY};border:1px solid rgba(143,176,201,.4)}
#tb[data-esc="proyecto"] .escb{color:${CPRO};border-color:rgba(213,255,63,.45)}
@media(max-width:760px){
  #tb .ind{grid-template-columns:1fr}#tb .ind .v{grid-template-columns:1fr 1fr 92px}
  #tb{left:8px;right:8px;width:auto;top:auto;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 64px);height:min(76vh,760px);z-index:26}
  #tb .cab .big{font-size:34px}
  body #hud-c{max-width:calc(100vw - 16px);padding:3px!important}
  body #hud-c button{padding:10px 4px!important;letter-spacing:.02em!important;font-size:10px!important}
  body #hud-c #b-pajaro{padding:10px 8px!important;letter-spacing:.08em!important}
  body #hud-c #b-giro,body #hud-c #b-night{font-size:0!important;letter-spacing:0!important;padding:10px 12px!important}body #hud-c #b-giro svg,body #hud-c #b-night svg{margin:0!important}
  body #hud-c #b-tablero{font-size:0!important;letter-spacing:0!important;padding:10px 13px!important}
  body #hud-c #b-tablero svg{margin:0!important}
}`;
  document.head.appendChild(css);

  const tb = document.createElement('section'); tb.id = 'tb'; tb.setAttribute('aria-label', 'Tablero de interacciones bióticas');
  tb.innerHTML = `
  <div class="cab"><div class="big" id="tb-n">0</div><div class="lbl"><b>interacciones ocurriendo</b><span id="tb-h">00:00</span><span class="escb" id="tb-escb">Kennedy hoy</span></div><button class="x" aria-label="Cerrar">×</button></div>
  <div class="cuerpo">
    <div class="tabs" id="tb-tabs" role="tablist"><button data-k="bio" class="on">Relaciones bióticas</button><button data-k="esc">Hoy vs. proyecto</button><button data-k="tra">Tráfico y sintaxis</button></div>
    <div class="esc" id="tb-esc" role="tablist" aria-label="Escenario"><button data-e="hoy" class="on"><i style="background:${CHOY}"></i>Kennedy hoy</button><button data-e="proyecto"><i style="background:${CPRO}"></i>Con el proyecto</button></div>
    <div class="gr" data-tab="esc"><h3>Hoy vs. proyecto<span id="tb-per">mismos lugares, misma hora</span></h3>
      <div class="ley2"><span><i style="background:${CHOY}"></i>Kennedy hoy</span><span><i style="background:${CPRO}"></i>Con el proyecto</span></div>
      <div class="vss" id="tb-cmp"><div class="vacio">Cargando indicadores…</div></div>
      <div class="nota2" id="tb-nota2"></div>
      <button class="tour" id="tb-tour">Ver cómo se implanta el proyecto, paso a paso</button></div>
    <div class="gr" data-tab="tra"><h3>Av. Ciudad de Cali<span>camino a Corabastos · junto al humedal El Burro</span></h3>
      <div class="kp2"><div><b id="tb-caH">–</b><small>vehículos en la vía ahora · hoy</small></div><div><b id="tb-caP" style="color:#6ee7b7">–</b><small>con la propuesta</small></div><div><b id="tb-caD" style="color:#6ee7b7">–</b><small>menos tráfico</small></div></div>
      <div class="cali" id="tb-cab"></div>
      <div class="fila2"><button id="tb-cali">Ver la vía en el mapa</button></div>
      <div class="nota2" id="tb-nota5"></div></div>
    <div class="gr" data-tab="tra"><h3>Carga: ¿alivia o desplaza?<span>camiones por hora que cambian</span></h3>
      <div class="kp2"><div><b id="tb-kmA">–</b><small>km de calles con menos camiones</small></div><div><b id="tb-kmC">–</b><small>km de calles con más camiones</small></div><div><b id="tb-desp">–</b><small>camiones/h hacia los mercados</small></div></div>
      <div class="calles" id="tb-calles"></div>
      <div class="fila2"><button id="tb-vcarga" class="on">Ver en el mapa</button><button id="tb-ircarga">Ir a Corabastos y los mercados</button></div>
      <div class="nota2" id="tb-nota3"></div></div>
    <div class="gr" data-tab="tra"><h3>Carros y sintaxis espacial<span id="tb-rho">¿la forma de la red explica el tráfico?</span></h3>
      <canvas id="tb-sx" aria-label="Flujo de carros de cada calle según su elección angular"></canvas>
      <div class="ejes"><span>elección baja</span><span>elección (sintaxis espacial, percentil)</span><span>alta</span></div>
      <div class="sx2"><div><h5>Más carros de lo que la red explica</h5><div id="tb-sxM"></div></div><div><h5>Menos carros de lo que la red explica</h5><div id="tb-sxm"></div></div></div>
      <div class="fila2"><button id="tb-sxver">Ver la elección en el mapa</button></div>
      <div class="nota2" id="tb-nota4"></div></div>
    <div class="chips" data-tab="bio" id="tb-chips">${TIPOS.map(t => `<button class="chip" data-t="${t.id}" title="${esc(t.n)}: mostrar u ocultar en el territorio"><i style="background:${t.c}"></i>${CORTO[t.id] || esc(t.n)} <b id="tb-c${t.id}">0</b></button>`).join('')}</div>
    <div class="gr" data-tab="bio"><h3>Quién interactúa con quién<span>ahora</span></h3><canvas id="tb-cuerda" aria-label="Diagrama de cuerdas de las interacciones que están ocurriendo"></canvas><div class="pie" id="tb-pie1">Pasa o toca una especie para ver con quién está interactuando.</div></div>
    <div class="gr" data-tab="bio"><h3>Interacciones durante el día<span id="tb-ld">encuentros por tipo</span></h3><canvas id="tb-flujo" aria-label="Encuentros por tipo de relación durante el día"></canvas><div class="ejes"><span>0 h</span><span>6</span><span>12</span><span>18</span><span>24</span></div><div class="pie" id="tb-pie2">Arrastra sobre la gráfica para cambiar la hora de la simulación.</div></div>
    <div class="gr" data-tab="bio"><h3>Pulso<span>cada punto es un encuentro nuevo · últimos 90 s</span></h3><canvas id="tb-pulso" aria-label="Encuentros nuevos por tipo en los últimos 90 segundos"></canvas><div class="pie" id="tb-pie3">Pasa o toca un punto para ver qué ocurrió.</div></div>
  </div>`;
  document.body.appendChild(tb);
  const $ = (id) => tb.querySelector('#' + id);

  // botón en la barra inferior (antes de JUGAR)
  const hud = document.getElementById('hud-c'), pj = document.getElementById('b-pajaro');
  const btn = document.createElement('button'); btn.id = 'b-tablero'; btn.title = 'Tablero de las interacciones bióticas, en vivo';
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/></svg>Tablero';
  if (hud) { if (pj && pj.parentElement === hud) hud.insertBefore(btn, pj); else hud.appendChild(btn); } else { btn.style.cssText = 'position:fixed;z-index:12;right:14px;bottom:20px'; document.body.appendChild(btn); }
  const abierto = () => document.body.classList.contains('tb-abierto');
  const abrir = (on) => { document.body.classList.toggle('tb-abierto', on); btn.classList.toggle('on', on); if (on) { pintarTexto(); setTimeout(dibujarSintaxis, 60); cancelAnimationFrame(raf); tPrev = performance.now(); raf = requestAnimationFrame(cuadro); } };
  btn.onclick = () => abrir(!abierto());
  tb.querySelector('.x').onclick = () => abrir(false);
  // pestañas: Relaciones bióticas (lo primero) · Hoy vs. proyecto · Tráfico y sintaxis; el selector de escenario queda en todas
  let pest = 'bio';
  const verPestana = (k) => {
    pest = k; tb.querySelectorAll('#tb-tabs button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    let prim = true; tb.querySelectorAll('[data-tab]').forEach(el => { const v = el.dataset.tab === k; el.classList.toggle('vis', v); el.classList.toggle('prim', v && prim && el.classList.contains('gr')); if (v && el.classList.contains('gr')) prim = false; });
    tb.querySelector('.cuerpo').scrollTop = 0;
    setTimeout(() => { if (k === 'esc' && typeof pintarComparacion === 'function') pintarComparacion(); if (k === 'tra' && typeof dibujarSintaxis === 'function') dibujarSintaxis(); }, 30);
  };
  tb.querySelectorAll('#tb-tabs button').forEach(b => b.onclick = () => verPestana(b.dataset.k));
  verPestana('bio');
  tb.querySelectorAll('.chip').forEach(b => b.onclick = () => {
    const t = +b.dataset.t; if (ESTADO.tipos.has(t)) ESTADO.tipos.delete(t); else ESTADO.tipos.add(t);
    const off = !ESTADO.tipos.has(t); b.classList.toggle('off', off); const o = document.querySelector(`#bt-pan .bt-tipo[data-t="${t}"]`); if (o) o.classList.toggle('off', off);
  });
  const activo = (t) => ESTADO.tipos.has(t);

  /* ---------- ESCENARIOS: Kennedy hoy / con el proyecto ----------
     El selector cambia el territorio (estrategias E1–E9, Bavaria Común, Corabastos reducido) y la fauna en vivo (sin huertas en "hoy").
     Indicadores (mismos lugares, mismo periodo): tráfico y ruido en el borde de Corabastos, sintaxis espacial de Bavaria y hábitat de
     polinizadores (data3d/escenarios.json, tools/escenarios_build.js), e interacciones bióticas medidas en vivo en cada escenario
     a las mismas horas del día. */
  let ESC = null, escAct = T3.escenario || 'hoy', tCambio = performance.now(); // tras cambiar de escenario se esperan 10 s (la fauna aparece o se va) antes de medir
  const VIVO = { hoy: new Array(96).fill(null), proyecto: new Array(96).fill(null) }; // promedio de encuentros por cuarto de hora en cada escenario
  ESTADO.escenario = escAct;
  fetch('data3d/escenarios.json?v=1').then(r => r.json()).then(d => { ESC = d; pintarComparacion(); }).catch(e => { console.warn('escenarios:', e); $('tb-cmp').innerHTML = '<div class="vacio">No se pudieron cargar los indicadores.</div>'; });
  // el escenario lo manda el selector general (data3d/escenario.js): territorio, huertas, sintaxis, ruido y fauna; aquí solo el tablero
  function aplicarEsc(e) {
    if (e !== escAct) tCambio = performance.now(); escAct = e; ESTADO.escenario = T3.PROP && T3.PROP.fauna ? e : 'hoy'; // propuesta en revisión: sin la fauna de las huertas
    const viejo = T3.PROP && !T3.PROP.comparar; // los indicadores «hoy vs. proyecto» y la carga desplazada eran de la propuesta anterior
    const tp = tb.querySelector('#tb-tabs button[data-k="esc"]'); if (tp) tp.style.display = viejo ? 'none' : '';
    const gc = $('tb-calles') && $('tb-calles').closest('.gr'); if (gc) gc.style.display = T3.PROP && !T3.PROP.carga ? 'none' : ''; // la carga desplazada a mercados era de la propuesta anterior
    if (viejo && pest === 'esc') verPestana('bio');
    tb.querySelectorAll('#tb-esc button').forEach(b => b.classList.toggle('on', b.dataset.e === e));
    tb.dataset.esc = e; const eb = $('tb-escb'); if (eb) eb.textContent = e === 'proyecto' ? 'Con la propuesta' : 'Kennedy hoy';
    if (CAPA) CAPA.ver(e === 'proyecto' && verCarga && !(T3.PROP && !T3.PROP.carga)); // capa de carga desplazada (data3d/carga.js)
    pintarComparacion();
  }
  function ponerEscenario(e) { if (window.KEN_ESC) window.KEN_ESC.poner(e); else { T3.escenario = e; aplicarEsc(e); } }
  window.addEventListener('escenario', (ev) => aplicarEsc(ev.detail));
  tb.querySelectorAll('#tb-esc button').forEach(b => b.onclick = () => ponerEscenario(b.dataset.e));
  const energia = (L) => { let s = 0, q = 0; for (const a of L) { s += a.flujoH * 10 ** (a.dB / 10); q += a.flujoH; } return 10 * Math.log10(s / Math.max(1, q)); }; // ruido promedio ponderado por flujo
  function indicadores() {
    if (!ESC) return [];
    const A = ESC.corabastos.accesos, sx = ESC.sintaxis, po = ESC.polinizadores;
    const sum = (k, f) => A.reduce((s, a) => s + a[k][f], 0);
    // interacciones bióticas: promedio en las horas medidas en los dos escenarios (mismo periodo)
    let h = 0, p = 0, n = 0; for (let i = 0; i < 96; i++) if (VIVO.hoy[i] && VIVO.proyecto[i]) { h += VIVO.hoy[i].v; p += VIVO.proyecto[i].v; n++; }
    const AL = T3.alivio, al = AL && AL.hoy > 0.5;
    return [
      { n: 'Tráfico Av. Ciudad de Cali', s: 'vehículos en la vía ahora, camino a Corabastos', hoy: al ? AL.hoy : null, pro: al ? AL.pro : null, menos: true, u: '' },
      { n: 'Camiones por hora', s: 'vías del borde de Corabastos', hoy: sum('hoy', 'camH'), pro: sum('proyecto', 'camH'), menos: true, u: '' },
      { n: 'Ruido del tráfico', s: 'L10 a 10 m, borde de Corabastos', hoy: energia(A.map(a => a.hoy)), pro: energia(A.map(a => a.proyecto)), menos: true, u: ' dB', d: 1 },
      { n: 'Integración local', s: 'R800, 600 m alrededor de Bavaria', hoy: sx.antes.nain8, pro: sx.despues.nain8, u: '', d: 3 },
      { n: 'Profundidad media', s: 'pasos para llegar, Bavaria', hoy: sx.antes.prof, pro: sx.despues.prof, menos: true, u: '', d: 2 },
      { n: 'Hábitat de polinizadores', s: `% de Kennedy a menos de ${po.radio} m`, hoy: po.hoy, pro: po.proyecto, u: ' %', d: 1 },
      { n: 'Huertas', s: 'm² de huertas y techos productivos', hoy: po.m2Hoy, pro: po.m2Proyecto, u: ' m²', ha: true },
      { n: 'Interacciones bióticas', s: n ? `encuentros ahora, promedio de ${n * 15} min medidos en los dos` : 'corre los dos escenarios a la misma hora', hoy: n ? h / n : null, pro: n ? p / n : null, u: '', vivo: true }
    ];
  }
  const fmt = (v, I) => v === null ? '–' : I.ha ? (v >= 1e4 ? (v / 1e4).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' ha' : Math.round(v).toLocaleString('es-CO') + ' m²') : v.toLocaleString('es-CO', { maximumFractionDigits: I.d || 0, minimumFractionDigits: I.d || 0 }) + I.u;
  function pintarComparacion() {
    if (!ESC) return; const L = indicadores();
    // cada indicador: dos barras en la misma escala (hoy / con el proyecto) y una etiqueta que dice cuánto cambia y si mejora
    $('tb-cmp').innerHTML = L.map(I => {
      const ok = I.hoy !== null && I.pro !== null, m = ok ? Math.max(Math.abs(I.hoy), Math.abs(I.pro), 1e-9) : 1, w = (v) => v === null ? 0 : Math.max(1.5, Math.abs(v) / m * 100).toFixed(1);
      let chip = '<em class="igual">midiendo…</em>';
      if (ok) { if (!I.hoy) chip = '<em class="bien">nuevo · mejor</em>';
        else { const c = (I.pro - I.hoy) / Math.abs(I.hoy) * 100, mejor = I.menos ? c < 0 : c > 0, igual = Math.abs(c) < 0.05;
          chip = igual ? '<em class="igual">igual</em>' : `<em class="${mejor ? 'bien' : 'mal'}">${c > 0 ? '+' : '−'}${Math.abs(c).toLocaleString('es-CO', { maximumFractionDigits: Math.abs(c) < 10 ? 1 : 0 })} % · ${mejor ? 'mejor' : 'peor'}</em>`; } }
      return `<div class="vs"><div class="vs-n"><span>${esc(I.n)}<small>${esc(I.s)}${I.menos ? ' · menos es mejor' : ''}</small></span>${chip}</div>
        <div class="vs-b"><span>Kennedy hoy</span><i><b style="width:${w(I.hoy)}%;background:${CHOY}"></b></i><strong>${fmt(I.hoy, I)}</strong></div>
        <div class="vs-b"><span>Con el proyecto</span><i><b style="width:${w(I.pro)}%;background:${CPRO}"></b></i><strong style="color:${CPRO}">${fmt(I.pro, I)}</strong></div></div>`;
    }).join('');
    $('tb-nota2').innerHTML = `${esc(ESC.periodo)}. Tráfico: grabación SUMO; camión = 8 % de los vehículos, como en el 3D. Proyecto [SUP]: Corabastos reducido retira el ${ESC.corabastos.retiroNaves.toLocaleString('es-CO')} % del área de naves y los viajes de camión bajan en esa proporción (la carga pasa a los mercados de barrio). Ruido: CoRTN a 30 km/h. Sintaxis: integración angular antes y después de los ${(ESC.sintaxis.pasajes_m / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} km de pasajes de Bavaria Común.`;
  }
  let AR = null;
  function dibujarArana(L) {
    if (!AR) AR = lienzo('tb-arana', (w) => Math.min(w, 290)); AR.medir(); const { g, w, h } = AR; g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2 + 6, R = Math.min(w, h) / 2 - 46, n = L.length, ang = (i) => -Math.PI / 2 + i / n * TAU;
    const nota = (I, v) => { if (v === null) return null; if (I.menos) return Math.min(I.hoy, I.pro) / v; const m = Math.max(I.hoy, I.pro); return m ? v / m : 0; }; // 1 = el mejor de los dos
    g.lineWidth = 1;
    for (const k of [0.25, 0.5, 0.75, 1]) { g.beginPath(); for (let i = 0; i <= n; i++) { const a = ang(i % n), x = cx + Math.cos(a) * R * k, y = cy + Math.sin(a) * R * k; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.strokeStyle = `rgba(255,255,255,${k === 1 ? 0.12 : 0.05})`; g.stroke(); }
    g.font = '400 10.5px Inter,system-ui,sans-serif'; g.textBaseline = 'middle';
    L.forEach((I, i) => { const a = ang(i), x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; g.strokeStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
      const lx = cx + Math.cos(a) * (R + 12), ly = cy + Math.sin(a) * (R + 12); g.textAlign = Math.abs(Math.cos(a)) < 0.2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right'; g.fillStyle = '#9aa2a7'; g.fillText(I.n.replace('Hábitat de polinizadores', 'Polinizadores').replace('Interacciones bióticas', 'Interacciones'), lx, ly + (Math.sin(a) < -0.9 ? -4 : Math.sin(a) > 0.9 ? 4 : 0)); });
    for (const [k, col] of [['hoy', CHOY], ['pro', CPRO]]) {
      const pts = L.map((I, i) => { const v = nota(I, I[k]); return v === null ? null : [cx + Math.cos(ang(i)) * R * Math.max(0.02, v), cy + Math.sin(ang(i)) * R * Math.max(0.02, v)]; });
      if (pts.some(p => !p)) { // sin dato en vivo todavía: ese eje se salta
        g.beginPath(); pts.filter(Boolean).forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
      } else { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
      g.fillStyle = rgba(col, 0.16); g.fill(); g.strokeStyle = col; g.lineWidth = 1.8; g.stroke();
      for (const p of pts) if (p) { g.beginPath(); g.arc(p[0], p[1], 3, 0, TAU); g.fillStyle = col; g.fill(); }
    }
  }

  /* ---------- toma de datos (siempre, dos veces por segundo) ---------- */
  const nombreDe = (o, L) => o.id !== undefined ? ESP[o.e].n : ((L && flora[L.f] && flora[L.f].n) || o.n || 'árbol');
  let tFl = 0;
  function tick() {
    const r = T3.reloj, t = r && r.t >= 0 ? r.t : 540, dia = r ? r.dia : 1;
    if (dia !== diaAct) { diaAct = dia; for (const s of DIA) { s.n = 0; s.s.fill(0); } }
    const sl = DIA[Math.floor(t / 15) % 96]; sl.n++; for (let i = 0; i < NT; i++) sl.s[i] += (ENC[i] - sl.s[i]) / Math.min(sl.n, 8); // promedio móvil del cuarto de hora
    // encuentros ocurriendo ahora: pares (especie -> especie o árbol, tipo)
    for (const p of PAR.values()) p.obj = 0;
    const ahora = performance.now(); let n = 0;
    for (const L of LINKS.values()) {
      if (L.al < 0.3 || Math.hypot(L.b.x - L.a.x, L.b.z - L.a.z) >= CERCA) continue;
      n++;
      const s = 'e:' + L.a.e; let d;
      if (L.b.id !== undefined) d = 'e:' + L.b.e; else { const f = L.f || '?'; ACUF.set(f, (ACUF.get(f) || 0) + 1); d = nodoFlora(f); }
      const k = s + '|' + d + '|' + L.t; let p = PAR.get(k); if (!p) PAR.set(k, p = { s, d, t: L.t, v: 0, obj: 0 }); p.obj++;
      // pulso: encuentro nuevo (la misma pareja vuelve a contar solo después de 60 s reales)
      const kv = L.a.id + '|' + (L.b.id !== undefined ? 'a' + L.b.id : 'f' + Math.round(L.b.x) + ',' + Math.round(L.b.z)), u0 = VISTO.get(kv);
      if (primado && (u0 === undefined || ahora - u0 > 60000)) EV.push({ tr: ahora + Math.random() * 500, t: L.t, txt: `${nombreDe(L.a)} ${VERBO[L.t] || '→'} ${nombreDe(L.b, L).toLowerCase()}`, hab: L.a.h.n, y: Math.random() });
      VISTO.set(kv, ahora);
    }
    ahoraEnc = n; primado = true;
    if (ahora - tCambio > 10000) { const sl = Math.floor(t / 15) % 96, V = VIVO[escAct]; if (!V[sl]) V[sl] = { v: n, k: 1 }; else { V[sl].k++; V[sl].v += (n - V[sl].v) / Math.min(V[sl].k, 20); } } // encuentros por cuarto de hora en el escenario activo
    while (EV.length && ahora - EV[0].tr > 92000) EV.shift(); if (EV.length > 1500) EV.splice(0, EV.length - 1500);
    if (VISTO.size > 20000) for (const [k, u0] of VISTO) if (ahora - u0 > 60000) VISTO.delete(k);
    // cada 10 s: qué árboles tienen nodo propio (los más visitados del día)
    if (ahora > tFl) {
      tFl = ahora + 10000; const top = [...ACUF.entries()].filter(([f]) => flora[f]).sort((p, q) => q[1] - p[1]).slice(0, MAXF).map(([f]) => f);
      const nuevo = new Set(top); if ([...nuevo].some(f => !FLSET.has(f)) || nuevo.size !== FLSET.size) {
        FLSET = nuevo; for (const f of top) if (!NODO.has('f:' + f)) NODO.set('f:' + f, { n: flora[f].n, c: CAT[0].c, v: 0 });
        for (const p of [...PAR.values()]) if (p.d.startsWith('f:')) { p.obj = 0; } // los pares de árboles se reacomodan en el siguiente cuadro
      }
    }
    for (const [k, p] of PAR) if (p.obj === 0 && p.v < 0.02) PAR.delete(k);
    ult.t = t; ult.dia = dia;
  }
  const ult = { t: 0, dia: 1 };

  /* ---------- lienzos ---------- */
  const lienzo = (id, alto) => { const c = $(id), g = c.getContext('2d'); const o = { c, g, w: 0, h: 0, dpr: 1, alto };
    o.medir = () => { const w = c.clientWidth || 400, h = typeof alto === 'function' ? alto(w) : alto, dpr = Math.min(2, devicePixelRatio || 1); if (w !== o.w || h !== o.h || dpr !== o.dpr) { o.w = w; o.h = h; o.dpr = dpr; c.width = w * dpr; c.height = h * dpr; c.style.height = h + 'px'; } g.setTransform(dpr, 0, 0, dpr, 0, 0); };
    return o; };
  const CU = lienzo('tb-cuerda', (w) => Math.min(w, 430)), FL = lienzo('tb-flujo', 150), PU = lienzo('tb-pulso', 9 * 18 + 10);

  /* ---------- 1. cuerda ---------- */
  let hoverN = null, geo = null;
  function dibujarCuerda(dt) {
    CU.medir(); const { g, w, h } = CU; g.clearRect(0, 0, w, h);
    const k = Math.min(1, dt * 2.5);
    for (const p of PAR.values()) p.v += ((activo(p.t) ? p.obj : 0) - p.v) * k;
    for (const N of NODO.values()) N.obj = 0;
    for (const p of PAR.values()) { const a = NODO.get(p.s), b = NODO.get(p.d); if (a) a.obj += p.v; if (b && b !== a) b.obj += p.v; else if (b) b.obj += p.v; }
    for (const N of NODO.values()) N.v = N.obj;
    const orden = [...NODO.entries()].filter(([, N]) => N.v > 0.04);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 92, GAP = orden.length > 1 ? 0.022 : 0;
    const tot = orden.reduce((s, [, N]) => s + N.v, 0);
    if (tot < 0.05) { g.fillStyle = '#646c71'; g.font = '12px Inter,system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('Sin encuentros en este momento', cx, cy); geo = null; return; }
    const disp = TAU - GAP * orden.length; let a = -Math.PI / 2; const ARC = new Map();
    for (const [id, N] of orden) { const da = N.v / tot * disp; ARC.set(id, { a0: a, a1: a + da, cur: a, N }); a += da + GAP; }
    geo = { cx, cy, R, ARC };
    // cintas
    const foco = hoverN && ARC.has(hoverN) ? hoverN : null;
    // una cinta por pareja de nodos (suma de todos sus tipos), del color del tipo que más pesa
    const M = new Map(); for (const p of PAR.values()) { if (p.v <= 0.02 || !ARC.has(p.s) || !ARC.has(p.d)) continue; const k = p.s + '|' + p.d; let m = M.get(k); if (!m) M.set(k, m = { s: p.s, d: p.d, v: 0, t: p.t, tv: 0 }); m.v += p.v; if (p.v > m.tv) { m.tv = p.v; m.t = p.t; } }
    const pares = [...M.values()].sort((p, q) => p.t - q.t || q.v - p.v);
    const r = R - 3, P = (ang, rr = r) => [cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr];
    for (const p of pares) {
      const A = ARC.get(p.s), B = ARC.get(p.d), wa = p.v / tot * disp;
      const s0 = A.cur, s1 = s0 + wa; A.cur = s1; let d0, d1;
      if (p.s === p.d) { d0 = s0; d1 = s1; } else { d0 = B.cur; d1 = d0 + wa; B.cur = d1; }
      const on = !foco || foco === p.s || foco === p.d, col = TIPOS[p.t].c;
      g.beginPath(); const [x0, y0] = P(s0); g.moveTo(x0, y0); g.arc(cx, cy, r, s0, s1);
      const [x2, y2] = P(d0); g.quadraticCurveTo(cx, cy, x2, y2); g.arc(cx, cy, r, d0, d1);
      g.quadraticCurveTo(cx, cy, x0, y0); g.closePath();
      g.fillStyle = rgba(col, on ? (foco ? 0.78 : 0.5) : 0.06); g.fill(); g.strokeStyle = rgba(col, on ? 0.9 : 0.08); g.lineWidth = 0.6; g.stroke();
    }
    // arcos de los nodos y nombres
    for (const [id, A] of ARC) {
      const on = !foco || foco === id || pares.some(p => (p.s === foco && p.d === id) || (p.d === foco && p.s === id));
      g.beginPath(); g.arc(cx, cy, R + 4, A.a0, A.a1); g.lineWidth = 7; g.strokeStyle = rgba(A.N.c, on ? 0.95 : 0.25); g.lineCap = 'butt'; g.stroke();
      if (A.a1 - A.a0 > 0.045 || foco === id) {
        const m = (A.a0 + A.a1) / 2, [lx, ly] = P(m, R + 14), der = Math.cos(m) >= 0;
        g.save(); g.translate(lx, ly); g.rotate(der ? m : m + Math.PI); g.textAlign = der ? 'left' : 'right'; g.textBaseline = 'middle';
        g.font = (foco === id ? '500 ' : '400 ') + '10.5px Inter,system-ui,sans-serif'; g.fillStyle = on ? (A.N.fauna ? '#e9ebec' : '#a9bfae') : '#4b5257';
        const nn = A.N.n.split(',')[0].replace(/ \(.*\)/, ''), txt = nn.length > 15 ? nn.slice(0, 14) + '…' : nn; g.fillText(txt, 0, 0); g.restore();
      }
    }
  }
  const nodoEn = (e) => { if (!geo) return null; const r = CU.c.getBoundingClientRect(), x = e.clientX - r.left - geo.cx, y = e.clientY - r.top - geo.cy, d = Math.hypot(x, y); if (d < geo.R - 40 || d > geo.R + 90) return null; let ang = Math.atan2(y, x); for (const [id, A] of geo.ARC) { for (const k of [0, TAU, -TAU]) if (ang + k >= A.a0 - 0.01 && ang + k <= A.a1 + 0.01) return id; } return null; };
  function textoNodo(id) {
    const N = NODO.get(id); if (!N) return; const L = [...PAR.values()].filter(p => p.v > 0.3 && (p.s === id || p.d === id)).sort((p, q) => q.v - p.v).slice(0, 4);
    const tot = Math.round(L.reduce((s, p) => s + p.v, 0));
    $('tb-pie1').innerHTML = `<b>${esc(N.n)}</b> · ${tot} ${tot === 1 ? 'interacción' : 'interacciones'} ahora${L.length ? ': ' + L.map(p => { const o = NODO.get(p.s === id ? p.d : p.s); return `${p.s === id ? esc(VERBO[p.t] || '') : esc(CORTO[p.t]).toLowerCase() + ' con'} <b>${esc(o ? o.n.toLowerCase() : '')}</b> (${Math.round(p.v)})`; }).join(', ') : ''}`;
  }
  CU.c.addEventListener('pointermove', (e) => { const id = nodoEn(e); if (id !== hoverN) { hoverN = id; if (id) textoNodo(id); else $('tb-pie1').textContent = 'Pasa o toca una especie para ver con quién está interactuando.'; } });
  CU.c.addEventListener('pointerleave', () => { hoverN = null; $('tb-pie1').textContent = 'Pasa o toca una especie para ver con quién está interactuando.'; });
  CU.c.addEventListener('pointerdown', (e) => { const id = nodoEn(e); hoverN = id; if (id) textoNodo(id); });

  /* ---------- 2. flujo del día (gráfica de corriente, centrada) ---------- */
  let hovSlot = -1;
  function dibujarFlujo() {
    FL.medir(); const { g, w, h } = FL; g.clearRect(0, 0, w, h);
    const X = (i) => (i + 0.5) / 96 * w, mid = h / 2;
    // noche
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 0, 5.75 / 24 * w, h); g.fillRect(18.75 / 24 * w, 0, w - 18.75 / 24 * w, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; for (const hh of [6, 12, 18]) { const x = Math.round(hh / 24 * w) + 0.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    const tipos = TIPOS.map(t => t.id).filter(activo);
    const tot = DIA.map(s => s.n ? tipos.reduce((a, t) => a + s.s[t], 0) : 0), max = Math.max(10, ...tot);
    const esc_ = (h - 14) / max;
    // suavizado: promedio con los vecinos para que la corriente fluya
    const val = (i, t) => { let s = 0, n = 0; for (let k = -1; k <= 1; k++) { const S = DIA[i + k]; if (S && S.n) { s += S.s[t] * (k ? 1 : 2); n += k ? 1 : 2; } } return DIA[i].n ? s / n : 0; };
    const base = DIA.map((_, i) => -tipos.reduce((a, t) => a + val(i, t), 0) * esc_ / 2);
    const acum = new Float32Array(96);
    for (const t of tipos) {
      const y0 = [], y1 = [];
      for (let i = 0; i < 96; i++) { const v = val(i, t) * esc_; y0.push(mid + base[i] + acum[i]); y1.push(mid + base[i] + acum[i] + v); acum[i] += v; }
      g.beginPath(); curva(g, X, y1, false); curva(g, X, y0, true); g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, rgba(TIPOS[t].c, 0.95)); gr.addColorStop(1, rgba(TIPOS[t].c, 0.7));
      g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(13,15,18,.55)'; g.lineWidth = 0.75; g.stroke();
    }
    // hora actual y lectura
    const cx = ult.t / 1440 * w; g.strokeStyle = 'rgba(233,235,236,.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, h); g.stroke();
    g.fillStyle = '#e9ebec'; g.font = '500 10px Inter,system-ui,sans-serif'; g.textAlign = cx > w - 40 ? 'right' : 'left'; g.fillText(hhmm(ult.t), cx + (cx > w - 40 ? -5 : 5), 11);
    if (hovSlot >= 0) { const x = X(hovSlot); g.strokeStyle = 'rgba(255,255,255,.4)'; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.setLineDash([]); }
  }
  function curva(g, X, Y, rev) { // curva suave (puntos medios) de ida o de vuelta
    const n = Y.length, idx = rev ? [...Array(n).keys()].reverse() : [...Array(n).keys()];
    idx.forEach((i, k) => { const x = X(i), y = Y[i]; if (k === 0) { if (rev) g.lineTo(x, y); else g.moveTo(x, y); return; } const j = idx[k - 1], px = X(j), py = Y[j]; g.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2); if (k === n - 1) g.lineTo(x, y); });
  }
  const slotEn = (e) => { const r = FL.c.getBoundingClientRect(); return Math.max(0, Math.min(95, Math.floor((e.clientX - r.left) / r.width * 96))); };
  const textoSlot = (i) => { const S = DIA[i]; if (!S.n) { $('tb-pie2').innerHTML = `<b>${hhmm(i * 15)}</b> · todavía sin datos a esta hora`; return; } const L = TIPOS.map(t => [t, S.s[t.id]]).filter(([t, v]) => activo(t.id) && v >= 0.5).sort((p, q) => q[1] - p[1]).slice(0, 4); $('tb-pie2').innerHTML = `<b>${hhmm(i * 15)}</b> · ${L.map(([t, v]) => `${CORTO[t.id].toLowerCase()} <b>${num(v)}</b>`).join(' · ') || 'casi sin encuentros'}`; };
  let arrF = false;
  const moverHora = (e) => { const r = FL.c.getBoundingClientRect(), f = Math.max(0, Math.min(0.9999, (e.clientX - r.left) / r.width)); if (T3.reloj) { T3.reloj.t = Math.round(f * 1440 / 5) * 5; ult.t = T3.reloj.t; pintarTexto(); } };
  FL.c.addEventListener('pointerdown', (e) => { arrF = true; FL.c.setPointerCapture(e.pointerId); moverHora(e); });
  FL.c.addEventListener('pointermove', (e) => { hovSlot = slotEn(e); textoSlot(hovSlot); if (arrF) moverHora(e); });
  const soltarF = () => { arrF = false; }; FL.c.addEventListener('pointerup', soltarF); FL.c.addEventListener('pointercancel', soltarF);
  FL.c.addEventListener('pointerleave', () => { hovSlot = -1; $('tb-pie2').textContent = 'Arrastra sobre la gráfica para cambiar la hora de la simulación.'; });

  /* ---------- 3. pulso ---------- */
  const LW = 84, FILA = 18, VENT = 90000; let hovEv = null;
  function dibujarPulso() {
    PU.medir(); const { g, w, h } = PU; g.clearRect(0, 0, w, h);
    const ahora = performance.now(), x0 = LW, ancho = w - LW - 6;
    g.font = '400 10px Inter,system-ui,sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'left';
    TIPOS.forEach((t, i) => { const y = 5 + i * FILA + FILA / 2; g.fillStyle = activo(t.id) ? '#9aa2a7' : '#4b5257'; g.fillText(CORTO[t.id], 0, y); g.strokeStyle = 'rgba(255,255,255,.045)'; g.beginPath(); g.moveTo(x0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); });
    for (const s of [30, 60]) { const x = x0 + ancho - s / 90 * ancho; g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(Math.round(x), 0, 1, h); }
    for (const ev of EV) {
      const edad = ahora - ev.tr; if (edad < 0 || edad > VENT || !activo(ev.t)) continue;
      const x = x0 + ancho * (1 - edad / VENT), y = 5 + ev.t * FILA + FILA / 2 + (ev.y - 0.5) * 12, col = TIPOS[ev.t].c, a = 1 - edad / VENT * 0.75;
      if (edad < 1400) { const k = edad / 1400; g.beginPath(); g.arc(x, y, 3 + k * 9, 0, TAU); g.strokeStyle = rgba(col, (1 - k) * 0.7); g.lineWidth = 1.2; g.stroke(); }
      g.beginPath(); g.arc(x, y, ev === hovEv ? 4.2 : 2, 0, TAU); g.fillStyle = rgba(col, a * 0.7); g.fill();
    }
    g.fillStyle = '#646c71'; g.textAlign = 'right'; g.fillText('ahora', w - 2, h - 3);
  }
  const evEn = (e) => { const r = PU.c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, ahora = performance.now(), ancho = PU.w - LW - 6; let best = null, bd = 10; for (const ev of EV) { const edad = ahora - ev.tr; if (edad < 0 || edad > VENT || !activo(ev.t)) continue; const x = LW + ancho * (1 - edad / VENT), y = 5 + ev.t * FILA + FILA / 2 + (ev.y - 0.5) * 12, d = Math.hypot(x - mx, y - my); if (d < bd) { bd = d; best = ev; } } return best; };
  const textoEv = (ev) => { $('tb-pie3').innerHTML = ev ? `<b>${esc(ev.txt)}</b> · ${esc(TIPOS[ev.t].n)} · ${esc(ev.hab)}` : 'Pasa o toca un punto para ver qué ocurrió.'; };
  PU.c.addEventListener('pointermove', (e) => { hovEv = evEn(e); textoEv(hovEv); });
  PU.c.addEventListener('pointerdown', (e) => { hovEv = evEn(e); textoEv(hovEv); });
  PU.c.addEventListener('pointerleave', () => { hovEv = null; textoEv(null); });

  /* ---------- texto de cabecera ---------- */
  const fase = (h) => h < 4.75 ? 'noche' : h < 5.67 ? 'madrugada' : h < 9 ? 'amanecer' : h < 11.5 ? 'mañana' : h < 14.5 ? 'mediodía' : h < 17 ? 'tarde' : h < 18.6 ? 'atardecer' : h < 20 ? 'anochecer' : 'noche';
  function pintarTexto() {
    if (!abierto()) return;
    const r = T3.reloj; $('tb-n').textContent = num(ahoraEnc);
    $('tb-h').textContent = `${hhmm(ult.t)} · ${fase((ult.t / 60) % 24)} · día ${ult.dia}${r && r.play === false ? ' · en pausa' : ''}`;
    TIPOS.forEach(t => { const el = $('tb-c' + t.id); if (el) el.textContent = ENC[t.id]; tb.querySelector(`.chip[data-t="${t.id}"]`).classList.toggle('off', !activo(t.id)); });
    if (hoverN) textoNodo(hoverN);
  }

  /* ---------- CARGA: ¿alivia o desplaza? (data3d/carga.js + carga.json) ---------- */
  const lwM = window.REN3D && window.REN3D.lw; // marco "modelo" (x este, y norte) -> mundo
  let CAPA = null, verCarga = true;
  const volar = (x, z, dist) => {
    const V = T3.THREE.Vector3, cam = T3.camera, tg = T3.orbit.target, c1 = new V(x, 0, z), dir = cam.position.clone().sub(tg); dir.y = 0; if (dir.lengthSq() < 1) dir.set(0, 0, 1); dir.normalize();
    const p1 = c1.clone().addScaledVector(dir, dist * 0.45); p1.y = dist * 1.05; /* casi en planta: se leen las calles */
    if (T3.seguidor) T3.seguidor.soltar(); T3.anim = { t: 0, dur: 2.4, p0: cam.position.clone(), p1, c0: tg.clone(), c1 };
  };
  if (lwM) import('./carga.js?v=3').then(m => m.crearCapaCarga({ THREE: T3.THREE, T3, lw: lwM }).then(c => { CAPA = c; CAPA.COL = [m.COL_MAS, m.COL_MENOS]; pintarCarga(); pintarSintaxis(); CAPA.ver(escAct === 'proyecto' && verCarga && !(T3.PROP && !T3.PROP.carga)); })).catch(e => console.warn('carga:', e));
  function pintarCarga() {
    if (!CAPA) return; const D = CAPA.datos, [MAS, MENOS] = CAPA.COL, f = (v, d = 1) => v.toLocaleString('es-CO', { maximumFractionDigits: d });
    $('tb-kmA').textContent = f(D.kmAlivia); $('tb-kmC').textContent = f(D.kmCarga); $('tb-desp').textContent = f(D.desplazadosH);
    const L = D.calles.filter(c => c.n !== 'Calle sin nombre'), mx = Math.max(...L.map(c => Math.abs(c.d)), 1);
    $('tb-calles').innerHTML = L.map(c => { const w = Math.abs(c.d) / mx * 50; return `<div class="calle"><span class="n">${esc(c.n)}</span><span class="b"><i style="${c.d > 0 ? 'left:50%' : 'right:50%'};width:${w.toFixed(1)}%;background:${c.d > 0 ? MAS : MENOS}"></i></span><span class="v"><b style="color:${c.d > 0 ? MAS : MENOS}">${c.d > 0 ? '+' : '−'}${f(Math.abs(c.d))}</b> · ${c.ddB > 0 ? '+' : ''}${f(c.ddB)} dB</span></div>`; }).join('');
    $('tb-nota3').innerHTML = `Modelo [SUP]: los camiones que dejan de ir a Corabastos (${f(D.retiro)} %, según el área de naves retirada) siguen desde cada costado del predio hasta ${D.mercados.length} mercados de barrio, por la ruta más corta para un camión en la red de OpenStreetMap. Flujo actual de cada calle: grabación SUMO de hora pico. Ruido: CoRTN. En el mapa: <b style="color:${MAS}">rojo</b> gana camiones, <b style="color:${MENOS}">verde azulado</b> pierde.`;
  }
  /* ---------- carros vs. sintaxis espacial (carga.json · sintaxisTrafico) ---------- */
  let SXL = null;
  function pintarSintaxis() {
    const S = CAPA && CAPA.datos.sintaxisTrafico; if (!S) return; const f = (v, d = 2) => v.toLocaleString('es-CO', { maximumFractionDigits: d });
    $('tb-rho').textContent = `ρ = ${f(S.rhoC)} con la elección · ${f(S.rhoI)} con la integración`;
    const item = (o) => `<button data-x="${o.p[0]}" data-y="${o.p[1]}"><span>${esc(o.n)}</span><small>${f(o.c * 100, 0)} % · ${f(o.q, 0)} veh/h</small></button>`;
    $('tb-sxM').innerHTML = S.masDeLoEsperado.map(item).join(''); $('tb-sxm').innerHTML = S.menosDeLoEsperado.map(item).join('');
    tb.querySelectorAll('.sx2 button').forEach(b => b.onclick = () => { const [x, z] = lwM(+b.dataset.x, +b.dataset.y); volar(x, z, 420); });
    $('tb-nota4').innerHTML = `Cada punto es una calle de Kennedy (${f(S.n, 0)} tramos vehiculares dentro del área con tráfico simulado): su <b>elección angular</b> (cuántos recorridos más cortos la atraviesan, método DepthmapX) contra los vehículos por hora de la grabación SUMO en hora pico. La línea es la mediana de cada décimo de elección y la franja va del cuartil 25 al 75. ρ de Spearman: ${f(S.rhoC)} (0 = no hay relación, 1 = el orden coincide). Las calles que se salen del patrón muestran lo que la forma de la red no explica: destinos como Corabastos, el TransMilenio o los bordes del área simulada.`;
    dibujarSintaxis();
  }
  function dibujarSintaxis() {
    const S = CAPA && CAPA.datos.sintaxisTrafico; if (!S) return; if (!SXL) SXL = lienzo('tb-sx', 190); SXL.medir();
    const { g, w, h } = SXL, pad = 30, Y = (q) => h - 14 - Math.log10(1 + q) / Math.log10(1 + 1000) * (h - 26), X = (c) => pad + c * (w - pad - 4);
    g.clearRect(0, 0, w, h); g.font = '400 10px Inter,system-ui,sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'right';
    for (const q of [0, 10, 100, 1000]) { const y = Y(q); g.strokeStyle = 'rgba(255,255,255,.06)'; g.beginPath(); g.moveTo(pad, y); g.lineTo(w, y); g.stroke(); g.fillStyle = '#646c71'; g.fillText(q === 1000 ? '1.000' : String(q), pad - 5, y); }
    g.save(); g.translate(9, h / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('veh/h', 0, 0); g.restore();
    for (const [c, q] of S.puntos) { const x = X(c) + (Math.random() - 0.5) * 2, y = Y(q) + (Math.random() - 0.5) * (q ? 1 : 6); g.fillStyle = q ? 'rgba(143,176,201,.28)' : 'rgba(143,176,201,.1)'; g.fillRect(x - 1, y - 1, 2, 2); }
    // franja del cuartil 25 al 75 y mediana
    const B = S.bins; g.beginPath(); B.forEach((b, i) => { const x = X(b.c); i ? g.lineTo(x, Y(b.q75)) : g.moveTo(x, Y(b.q75)); }); [...B].reverse().forEach(b => g.lineTo(X(b.c), Y(b.q25))); g.closePath(); g.fillStyle = 'rgba(213,255,63,.16)'; g.fill();
    g.beginPath(); B.forEach((b, i) => { const x = X(b.c); i ? g.lineTo(x, Y(b.q50)) : g.moveTo(x, Y(b.q50)); }); g.strokeStyle = '#D5FF3F'; g.lineWidth = 2; g.stroke();
    for (const b of B) { g.beginPath(); g.arc(X(b.c), Y(b.q50), 3, 0, TAU); g.fillStyle = '#D5FF3F'; g.fill(); }
    const u = B[B.length - 1]; g.fillStyle = '#e3ff86'; g.textAlign = 'right'; g.fillText(`mediana ${u.q50} veh/h`, X(u.c) - 6, Y(u.q50) - 10);
  }
  $('tb-sxver').onclick = () => { const b = document.querySelector('#gs-capa [data-c="c"]'); if (b) b.click(); };
  $('tb-vcarga').onclick = (ev) => { verCarga = !verCarga; ev.currentTarget.classList.toggle('on', verCarga); if (verCarga && escAct !== 'proyecto') ponerEscenario('proyecto'); if (CAPA) CAPA.ver(escAct === 'proyecto' && verCarga); };
  $('tb-ircarga').onclick = () => { if (!CAPA) return; if (escAct !== 'proyecto') ponerEscenario('proyecto'); verCarga = true; $('tb-vcarga').classList.add('on'); CAPA.ver(true); volar(CAPA.centro[0], CAPA.centro[1], CAPA.radio * 2.2); };

  /* ---------- RECORRIDO: cómo se implanta el proyecto (dónde, qué deciden, qué cambia en la simulación) ---------- */
  const tp = document.createElement('div'); tp.id = 'tp'; tp.setAttribute('role', 'dialog'); tp.setAttribute('aria-label', 'Cómo se implanta el proyecto'); document.body.appendChild(tp);
  let paso = 0, PASOS = null;
  const cJSON = (u) => (window.cargarJSON || ((x) => fetch(x).then(r => r.json())))(u);
  async function armarPasos() {
    const [CO, BV, BP, E] = await Promise.all(['data3d/corabastos.json?v=3', 'data3d/bavaria.json?v=3', 'data3d/bavaria_pres.json', 'data3d/estrategias.json'].map(u => cJSON(u).catch(() => null)));
    const centro = (P) => { const s = P.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]); return lwM(s[0] / P.length, s[1] / P.length); };
    const est = (id) => (E && E.estrategias.find(e => e.id === id)) || {};
    const f = (v, d = 0) => Number(v).toLocaleString('es-CO', { maximumFractionDigits: d });
    const A = ESC.corabastos.accesos, camH = (k) => A.reduce((s, a) => s + a[k].camH, 0), sx = ESC.sintaxis, po = ESC.polinizadores, D = CAPA && CAPA.datos;
    const naves = CO ? CO.naves.length : 37, fuera = CO ? CO.naves.filter(n => n.dh < 120) : [], m2f = fuera.reduce((s, n) => s + n.L * n.W, 0);
    const e8 = est('E8'), lot = (e8.capas || []).map(c => [c.n, c.lotes.length, c.techos.length]);
    return [
      { t: 'El problema', h: 'La carga de alimentos se concentra en Corabastos', esc: 'hoy', donde: 'Corabastos, borde con el humedal La Vaca', dec: `Hoy toda la carga llega a un solo predio de ${f(409286 / 1e4, 1)} ha.`, cambia: `En hora pico pasan <b>${f(camH('hoy'))} camiones/h</b> por las vías del borde, con un ruido de <b>${f(energiaHoy(), 1)} dB</b>.`, ir: CO ? [...centro(CO.poly), 1100] : null },
      { t: 'Decisión 1 · E3', h: 'Corabastos reducido', esc: 'proyecto', donde: 'Las naves a menos de 120 m del humedal La Vaca', dec: `Se retiran <b>${fuera.length} de ${naves} naves</b> (${f(m2f)} m², ${f(ESC.corabastos.retiroNaves, 1)} % del área de naves) y esa franja se restaura hacia La Vaca. Las naves que quedan pasan a patio de transferencia, frío, orgánicos, banco de alimentos y mercado.`, cambia: `Camiones en el borde: <b>${f(camH('hoy'))} → ${f(camH('proyecto'))}/h</b>. Ruido: <b>${f(energiaHoy(), 1)} → ${f(energiaPro(), 1)} dB</b>.`, ir: CO ? [...centro(CO.poly), 900] : null },
      D && { t: 'Decisión 2', h: 'Mercados de barrio', esc: 'proyecto', donde: D.mercados.map(m => m.calle).filter(Boolean).slice(0, 4).join(', ') + '…', dec: `La carga que deja Corabastos va a <b>${D.mercados.length} mercados de barrio</b> en tiendas que ya existen, repartidos por Kennedy.`, cambia: `Llegan <b>${f(D.desplazadosH, 1)} camiones/h</b> a los mercados: alivian <b>${f(D.kmAlivia, 1)} km</b> del borde de Corabastos, pero cargan <b>${f(D.kmCarga, 1)} km</b> de calles de barrio (rojo en el mapa). Es el punto a resolver: rutas y horarios de carga.`, ir: CAPA ? [CAPA.centro[0], CAPA.centro[1], CAPA.radio * 2.2] : null, carga: true },
      { t: 'Decisión 3 · E1', h: 'Bavaria Común', esc: 'proyecto', donde: `Predio de la antigua fábrica de Bavaria (${f(BP ? BP.area_ha : 71.2, 1)} ha)`, dec: `Se conserva el bosque (<b>${f(BP && BP.suelo ? BP.suelo.bosque_ha || 22.17 : 22.17, 1)} ha</b>), se abren <b>${f(sx.pasajes_m / 1000, 1)} km de pasajes</b> públicos y el predio produce alimento: ${BP ? f(BP.bancales.length) : '1.187'} bancales y ${BP ? f(BP.techos.length) : 159} techos productivos.`, cambia: `Integración local (R800) alrededor del predio: <b>${f(sx.antes.nain8, 3)} → ${f(sx.despues.nain8, 3)}</b>; profundidad media <b>${f(sx.antes.prof, 2)} → ${f(sx.despues.prof, 2)}</b>.`, ir: BV ? [...centro(BV.sitio), 1300] : null },
      { t: 'Decisión 4 · E8', h: 'Red distribuida de huertas', esc: 'proyecto', donde: lot.map(l => `${l[0].replace('Huertas en ', '')}: ${f(l[1])} lotes${l[2] ? ', ' + f(l[2]) + ' techos' : ''}`).join(' · '), dec: 'Huertas en lotes baldíos y en las cubiertas de las viviendas, con abejas, aves y lombrices.', cambia: `Kennedy a menos de ${po.radio} m de un hábitat de polinizadores: <b>${f(po.hoy, 1)} % → ${f(po.proyecto, 1)} %</b>. En la red biótica aparecen la fauna y las interacciones de las huertas.`, ir: e8.centro ? [...lwM(e8.centro[0], e8.centro[1]), 2600] : null },
      { t: 'Decisión 5 · E5', h: 'Corredor biótico de humedales', esc: 'proyecto', donde: 'Humedales El Burro, La Vaca y Techo', dec: `Los tres humedales (${f((est('E5').area || 256351) / 1e4, 1)} ha) se conectan con las huertas y Bavaria como corredor para la fauna.`, cambia: 'Interacciones bióticas medidas en vivo en los dos escenarios a la misma hora (tablero, «Hoy vs. proyecto»).', ir: [2095.67, -109.06, 900] },
      { t: 'Otras decisiones', h: 'Tiendas, plazas, vivienda y cuidado', esc: 'proyecto', donde: 'Toda la localidad', dec: `E2 ${f(est('E2').n_lotes || 460)} tiendas de barrio · E4 distrito de orgánicos y hongos · E6 ${f(est('E6').n_lotes || 379)} lugares de vivienda y actividad · E7 plazas y conjuntos · E9 ${f(est('E9').n_lotes || 79)} manzanas del cuidado.`, cambia: 'Se ven en el 3D con sus conexiones; todavía no tienen un indicador propio en el tablero.', ir: null }
    ].filter(Boolean);
  }
  const energiaHoy = () => energia(ESC.corabastos.accesos.map(a => a.hoy)), energiaPro = () => energia(ESC.corabastos.accesos.map(a => a.proyecto));
  function mostrarPaso() {
    const P = PASOS[paso]; if (!P) return;
    if (P.esc !== escAct) ponerEscenario(P.esc);
    if (CAPA) CAPA.ver(P.esc === 'proyecto' && (P.carga || verCarga));
    if (P.ir) volar(P.ir[0], P.ir[1], P.ir[2]);
    tp.innerHTML = `<button class="x" aria-label="Cerrar">×</button><div class="paso">${esc(P.t)} · ${paso + 1} de ${PASOS.length}</div><h4>${esc(P.h)}</h4>
      <dl><dt>Dónde</dt><dd>${esc(P.donde)}</dd><dt>Qué deciden</dt><dd>${P.dec}</dd><dt>Qué cambia</dt><dd>${P.cambia}</dd></dl>
      <div class="nav"><span>${PASOS.map((_, i) => `<i class="${i === paso ? 'on' : ''}"></i>`).join('')}</span><button id="tp-a" ${paso ? '' : 'disabled'}>Anterior</button><button id="tp-s" class="pri">${paso < PASOS.length - 1 ? 'Siguiente' : 'Terminar'}</button></div>`;
    tp.querySelector('.x').onclick = () => tp.classList.remove('on');
    tp.querySelector('#tp-a').onclick = () => { if (paso > 0) { paso--; mostrarPaso(); } };
    tp.querySelector('#tp-s').onclick = () => { if (paso < PASOS.length - 1) { paso++; mostrarPaso(); } else tp.classList.remove('on'); };
  }
  $('tb-tour').onclick = async () => {
    if (!ESC) return; PASOS = await armarPasos(); paso = 0; tp.classList.add('on');
    if (innerWidth <= 760) abrir(false); // en celular el recorrido ocupa la parte de abajo
    mostrarPaso();
  };
  addEventListener('keydown', (e) => { if (!tp.classList.contains('on')) return; if (e.key === 'ArrowRight') tp.querySelector('#tp-s')?.click(); if (e.key === 'ArrowLeft') tp.querySelector('#tp-a')?.click(); if (e.key === 'Escape') tp.classList.remove('on'); });

  let raf = 0, tPrev = performance.now(), tFlujo = 0;
  function cuadro() {
    if (!abierto()) return;
    const ahora = performance.now(), dt = Math.min(0.1, (ahora - tPrev) / 1000); tPrev = ahora;
    dibujarCuerda(dt); dibujarPulso(); if ((tFlujo -= dt) <= 0) { tFlujo = 0.5; dibujarFlujo(); }
    raf = requestAnimationFrame(cuadro);
  }
  /* ---------- Av. Ciudad de Cali: tráfico hoy y con la propuesta (data3d/alivio_cali.js, conteo en vivo de la simulación) ---------- */
  function pintarCali() {
    const AL = T3.alivio; if (!AL || !abierto() || pest !== 'tra') return;
    const f = (v) => Math.round(v).toLocaleString('es-CO'), ok = AL.hoy > 0.5;
    $('tb-caH').textContent = ok ? f(AL.hoy) : '–'; $('tb-caP').textContent = ok ? f(AL.pro) : '–'; $('tb-caD').textContent = ok ? '−' + Math.round((1 - AL.pro / AL.hoy) * 100) + ' %' : '–';
    const fila = (n, h, p) => { const m = Math.max(h, 1e-6); return `<div class="r"><span>${n}</span><span class="t"><i style="width:100%;background:${CHOY}"></i><i style="width:${(p / m * 100).toFixed(1)}%;background:#34d399"></i></span><b>${h > 0.05 ? '−' + Math.round((1 - p / m) * 100) + ' %' : '–'}</b></div>`; };
    $('tb-cab').innerHTML = fila('Vehículos', AL.hoy, AL.pro) + fila('Camiones', AL.camHoy, AL.camPro);
    $('tb-nota5').innerHTML = `Conteo en vivo de la simulación SUMO sobre ${f(AL.largo || 1500)} m de la Av. Carrera 86, del humedal El Burro al costado de Corabastos. Barra <b style="color:${CHOY}">azul</b>: hoy; <b style="color:#34d399">verde</b>: con la propuesta. [SUP] Con el abastecimiento en Bavaria Común y en los mercados de barrio dejan de pasar el ${Math.round((1 - AL.KEEP) * 100)} % de los carros y motos y el ${Math.round((1 - AL.KEEP_CAM) * 100)} % de los camiones que hoy van a Corabastos: supuesto de escala para discutir con el grupo.`;
  }
  $('tb-cali').onclick = () => { const AL = T3.alivio; if (escAct !== 'proyecto') ponerEscenario('proyecto'); const b = document.querySelector('#gs-fc [data-v="1"]'); if (b) b.click(); if (AL && AL.mid) volar(AL.mid[0], AL.mid[1], 900); };
  /* ---------- interacciones que fomenta la propuesta (módulos de fauna del distrito, parques-huerta y huertas en techos) ---------- */
  const FOM = [
    ['Abejas nativas y de miel', 'polinizan las huertas', 'Apiario y franjas de flores', 5, '#facc15'], ['Abejorro', 'poliniza fresa y tomate', 'Nido de abejorros', 5, '#f59e0b'],
    ['Colibríes', 'polinizan flores tubulares', 'Franjas de flores', 5, '#22d3ee'], ['Mariposas', 'polinizan; sus orugas viven en nativas', 'Franjas de flores', 5, '#f472b6'],
    ['Aves insectívoras', 'comen orugas y plagas', 'Nidos y perchas', 0, '#a3e635'], ['Cernícalo y lechuza', 'controlan roedores de día y de noche', 'Perchas y caja en los silos', 0, '#fb923c'],
    ['Murciélagos', 'comen polillas y mosquitos', 'Refugios de murciélagos', 0, '#a78bfa'], ['Rana sabanera y libélulas', 'comen mosquitos', 'Charca didáctica', 0, '#60a5fa'],
    ['Mariquitas', 'comen pulgones', 'Hoteles de insectos', 0, '#ef4444'], ['Lombrices', 'vuelven el compost suelo', 'Compostaje del distrito', -1, '#b87c8c']
  ];
  if ($('tb-fom')) $('tb-fom').innerHTML = FOM.map(([n, q, m, t, c]) => `<div class="f"><i style="background:${c}"></i><div><b>${esc(n)}</b><small>${esc(q)} · ${esc(m)}</small></div><em style="color:${TIPOS[t] ? TIPOS[t].c : '#9aa2a7'};background:${rgba(TIPOS[t] ? TIPOS[t].c : '#9aa2a7', 0.12)}">${esc(CORTO[t] || 'Suelo vivo')}</em></div>`).join('');
  if ($('tb-fver')) $('tb-fver').onclick = () => { if (escAct !== 'proyecto') ponerEscenario('proyecto'); const s = document.querySelector('#esc-ley [data-s="bav"]'); if (s && !s.classList.contains('on')) s.click(); if (innerWidth <= 760) abrir(false); };
  if ($('tb-fcol')) $('tb-fcol').onclick = () => { if (escAct !== 'proyecto') ponerEscenario('proyecto'); const s = document.querySelector('#esc-ley [data-s="col"]'); if (s && !s.classList.contains('on')) s.click(); if (innerWidth <= 760) abrir(false); };
  function pintarFomento() {
    if (!$('tb-fPol') || !abierto() || escAct !== 'proyecto' || pest !== 'bio') return; // (bloque quitado: el tablero es igual en los dos escenarios)
    $('tb-fPol').textContent = num(ENC[5] || 0); $('tb-fDep').textContent = num(ENC[0] || 0);
    $('tb-fTot').textContent = num(ahoraEnc);
    let h = 0, n = 0; for (const s of VIVO.hoy) if (s) { h += s.v; n++; } $('tb-fHoy').textContent = n ? num(h / n) : '–';
    $('tb-fPolH').textContent = PROMT.hoy.k ? num(PROMT.hoy.p) : '–'; $('tb-fDepH').textContent = PROMT.hoy.k ? num(PROMT.hoy.d) : '–';
  }
  // promedio de polinizaciones y depredaciones en cada escenario (para comparar con «hoy» sin cambiar de escenario)
  const PROMT = { hoy: { p: 0, d: 0, k: 0 }, proyecto: { p: 0, d: 0, k: 0 } };
  setInterval(() => { if (performance.now() - tCambio < 10000) return; const P = PROMT[escAct]; if (!P) return; P.k++; const a = 1 / Math.min(P.k, 60); P.p += ((ENC[5] || 0) - P.p) * a; P.d += ((ENC[0] || 0) - P.d) * a; }, 1000);
  let nT = 0; tick(); setInterval(() => { tick(); pintarTexto(); pintarCali(); pintarFomento(); if (++nT % 8 === 0 && abierto()) pintarComparacion(); }, 500);
  aplicarEsc(T3.escenario || 'hoy');
  // SIMULACIONES (SIM-01 huertas, SIM-02 orgánicos, SIM-03 fauna): primera pestaña; cambian con Kennedy hoy / Con la propuesta
  import('./simulaciones.js?v=12').then(m => { m.iniciarSimulaciones({ T3, tb, verPestana }); verPestana('sim'); }).catch(e => console.warn('simulaciones:', e));
  return { abrir, tb, verPestana };
}
