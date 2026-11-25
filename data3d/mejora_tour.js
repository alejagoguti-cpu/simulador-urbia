/* ============ RECORRIDO «¿CÓMO MEJORA KENNEDY?» ============
   Seis paradas. En cada una la cámara vuela al lugar, el mapa muestra primero KENNEDY HOY y a los 3 s cambia solo a CON LA PROPUESTA,
   para ver el antes y el después en el mismo sitio. La tarjeta dice el número de hoy y el de la propuesta (año 10 de la simulación),
   qué mirar en el mapa y por qué mejora. Los números salen del mismo modelo del tablero (data3d/sim_modelos.js) y del
   panel de escenarios (window.KEN_ESIM). Se puede pasar de hoy a propuesta a mano y repetir el cambio. */
import { SEM, SIMST } from './sim_modelos.js?v=4';
export function iniciarMejoraTour({ T3 }) {
  const THREE = T3.THREE, MOV = innerWidth < 760, RMQ = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtK = (v) => v >= 1e4 ? fmt(v / 1e3, 0) + ' mil' : fmt(v);
  const CHOY = '#8fb0c9', CPRO = '#D5FF3F', NE = { B: 'Nodo central', C: 'Clúster rotativo' };
  const BURRO = [2095.67, -109.06], CORA = [1132.1, 948.6], BAV = [3966, 49]; // BAV: centro del predio (data3d/bavaria.json)
  const BAVC = () => (window.KEN_BAV && window.KEN_BAV.compost) || [4185.7, 28.9];
  const MID = () => (T3.alivio && T3.alivio.mid) || [1700, 400];

  /* ---------- números al año 10 ---------- */
  const N = () => { const S = window.KEN_ESIM && window.KEN_ESIM.R; if (!S) return null; const e = SIMST.esc === 'B' ? 'B' : 'C', f = SEM - 1, sem = (a) => a.slice(f - 51).reduce((s, v) => s + v, 0);
    const A1 = S.S1.A, P1 = S.S1[e], A2 = S.S2.A, P2 = S.S2[e], A3 = S.S3.A, P3 = S.S3[e];
    return { e, tr: Math.round((0.3 + 0.7 * P1.dep[f]) * 100), depA: A1.dep[f] * 100, depP: P1.dep[f] * 100, hogA: A1.act[f], hogP: P1.act[f], perA: A1.pers[f], perP: P1.pers[f],
      relA: A2.relleno[f] / 1000, relP: P2.relleno[f] / 1000, abA: sem(A2.vuelve) / 1000, abP: sem(P2.vuelve) / 1000, avA: A3.aves[f], avP: P3.aves[f], spA: A3.riq[f], spP: P3.riq[f] }; };

  /* ---------- las paradas ---------- */
  const PASOS = [
    { tag: 'Tráfico', t: 'Menos carros y camiones hacia Corabastos', lugar: () => CORA, alto: 1500, flujo: true,
      hoy: (n) => ['100 %', 'de los vehículos de hoy en las vías de Corabastos'], pro: (n) => [n.tr + ' %', `de los vehículos de hoy (−${100 - n.tr} %)`],
      mira: 'Con la capa de flujo de carros, las vías alrededor de Corabastos pasan poco a poco de <b style="color:#ff8f8f">rojo</b> (congestión) a <b style="color:#9be38f">verde</b> mientras corre la simulación.',
      por: 'Las huertas del barrio y los mercados de barrio abastecen tiendas y comedores, así que menos gente y menos camiones viajan a Corabastos.' },
    { tag: 'Bavaria', t: 'El predio cerrado de Bavaria se abre al barrio', lugar: () => BAV, alto: 760, solo: 'bav',
      hoy: () => ['Cerrado', '40 ha de industria que obligan a rodearlas'], pro: () => ['20 pasajes', 'escuela de huertas, laboratorios y planta de compost'],
      mira: 'Aparecen los pasajes peatonales que atraviesan el predio, las huertas de enseñanza entre los árboles y los edificios de Bavaria Común.',
      por: 'Bavaria Común enseña a cultivar y forma a los promotores que después abren y acompañan las huertas de los barrios.' },
    { tag: 'Huertas', t: 'Las huertas se abren desde Bavaria hacia los barrios', lugar: () => [(CORA[0] + BAV[0]) / 2 + (MOV ? 0 : 250), (BURRO[1] + CORA[1]) / 2], alto: 2250, crece: true,
      hoy: (n) => [fmt(n.hogA), 'hogares con huerta · ' + fmtK(n.perA) + ' personas comen de ellas'], pro: (n) => [fmt(n.hogP), 'hogares con huerta · ' + fmtK(n.perP) + ' personas comen de ellas'],
      mira: 'Cada <b style="color:#9be38f">punto verde</b> es una huerta que se abre en un parque, un lote o un colegio. Mira cómo aparecen año a año, primero cerca de Bavaria.',
      por: 'Cada trimestre Bavaria forma promotores; cada promotor acompaña huertas cerca de su casa, y los vecinos aprenden unos de otros.' },
    { tag: 'Árboles y fauna', t: 'Parches de árboles nativos: la vida se reparte por todo el barrio', lugar: () => centroParches(), alto: 950, medir: true,
      hoy: () => MED.hoy ? [fmt(MED.hoy.lug), `lugares con relaciones bióticas ocurriendo · ${fmt(MED.hoy.fuera)} % lejos de los humedales`] : ['…', 'midiendo las relaciones que están ocurriendo'],
      pro: () => MED.pro ? [fmt(MED.pro.lug), `lugares con relaciones bióticas ocurriendo · ${fmt(MED.pro.fuera)} % lejos de los humedales`] : ['…', 'se mide cuando el mapa muestra la propuesta'],
      mira: () => { const K = window.KEN_PARCHES; return `Aparecen ${K ? `<b>${K.parches} parches con ${fmt(K.n)} árboles nativos</b>` : 'parches de árboles nativos'} en los parques y junto a las huertas: <b style="color:#f2c230">caucho sabanero, aliso, sauco, chicalá, arrayán</b> y arbustos de flor (chilco, tíbar, raque, mortiño). Llegan colibríes, copetones y mirlas, y las <b>líneas de colores de las relaciones bióticas</b> aparecen lejos del agua.`; },
      por: 'Cada especie se escogió porque alimenta o da refugio a muchas especies de fauna (el caucho sabanero a 13, el sauco a 10, el aliso a 8); el sauce no, porque casi solo da sombra. Los parches cercanos funcionan como corredores entre los humedales.' },
    { tag: 'Residuos', t: 'Los residuos orgánicos vuelven a la tierra', lugar: BAVC, alto: 520,
      hoy: (n) => [fmt(n.relA, 0) + ' t', 'por semana se van en camión al relleno Doña Juana (16,6 km por vía)'], pro: (n) => [fmt(n.abP, 0) + ' t', `de abono al año para las huertas · al relleno ${fmt(n.relP, 0)} t/semana`],
      mira: 'Aparece la planta de compost de Bavaria (círculo café): ahí llegan los orgánicos del barrio y salen abono y hongos.',
      por: 'Compostar cerca evita viajes de camión de 56 km ida y vuelta y devuelve nutrientes a las huertas.' },
    { tag: 'Humedal', t: 'Más aves en el Humedal El Burro', lugar: () => BURRO, alto: 820,
      hoy: (n) => [fmt(n.avA), `aves en el borde del humedal · ${n.spA} especies`], pro: (n) => [fmt(n.avP), `aves en el borde del humedal · ${n.spP} especies`],
      mira: 'Hay más pájaros volando entre los árboles y las huertas alrededor del humedal.',
      por: 'Las huertas con corredores verdes unen los parches de árboles: las aves encuentran comida y refugio para moverse.' },
    { tag: 'Resumen', t: 'Kennedy en 10 años con la propuesta', lugar: () => [(CORA[0] + BAV[0]) / 2 + (MOV ? 0 : 250), (BURRO[1] + CORA[1]) / 2], alto: 2250, resumen: true,
      mira: 'Pasa de <b>Kennedy hoy</b> a <b>Con la propuesta</b> con los botones de abajo y compara todo el sector.', por: '' }
  ];

  /* ---------- medición en vivo de dónde ocurren las relaciones bióticas (data3d/biotica.js) ---------- */
  const MED = { hoy: null, pro: null };
  const medir = () => { const B = T3.bio; if (!B || !B.LINKS) return null; const lug = new Set(); let agua = 0, tot = 0;
    for (const L of B.LINKS.values()) { if (L.al < 0.3 || Math.hypot(L.b.x - L.a.x, L.b.z - L.a.z) >= B.CERCA) continue; tot++; lug.add(L.a.h); if (L.a.h.tipo === 'humedal') agua++; }
    return tot ? { lug: lug.size, tot, fuera: (tot - agua) / tot * 100 } : null; };
  // el lugar del paso de los parches: donde hay más parches juntos, lejos del humedal El Burro
  const centroParches = () => { const P = (T3.bio && T3.bio.PARCHES) || []; let best = null, bn = -1;
    for (const p of P) { if (Math.hypot(p.cx - BURRO[0], p.cz - BURRO[1]) < 700) continue; let n = 0; for (const q of P) if (Math.hypot(q.cx - p.cx, q.cz - p.cz) < 650) n++; if (n > bn) { bn = n; best = p; } }
    return best ? [best.cx, best.cz] : [3200, 300]; };
  let tCambio = 0;

  /* ---------- estilos ---------- */
  const css = document.createElement('style'); css.textContent = `
#mt-btn{all:unset;cursor:pointer;box-sizing:border-box;display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 16px 0 12px;border-radius:12px;background:#D5FF3F;color:#1a1208;font:600 13px var(--ui-sans,Inter,system-ui,sans-serif);white-space:nowrap;box-shadow:0 6px 18px rgba(213,255,63,.3)}
#mt-btn:hover{background:#ecb672}#mt-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}#mt-btn svg{flex:none}
#esim .mt-ir{all:unset;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:8px;margin:2px 12px 8px;width:calc(100% - 24px);height:36px;border-radius:10px;background:#D5FF3F;color:#1a1208;font:600 12.5px var(--ui-sans,Inter,system-ui,sans-serif)}
#esim .mt-ir:hover{background:#ecb672}
body.mt-on #esim,body.mt-on #tb,body.mt-on #ci-toast,body.mt-on #gs-izq,body.mt-on #bt-pan{display:none!important}
#mt{position:fixed;z-index:40;left:50%;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 76px);transform:translateX(-50%);width:min(620px,calc(100vw - 24px));max-height:calc(100vh - 170px);overflow:auto;display:none;
  padding:16px 18px 14px;border-radius:18px;color:#eef1f2;font:400 12.5px/1.5 var(--ui-sans,Inter,system-ui,sans-serif);background:rgba(14,16,20,.86);border:1px solid rgba(255,255,255,.14);
  box-shadow:0 24px 50px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(22px) saturate(1.6);backdrop-filter:blur(22px) saturate(1.6)}
body.mt-on #mt{display:block}
#mt .tp{display:flex;align-items:center;gap:10px;margin:0 0 2px;font:600 10px var(--ui-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:#e3ff86}
#mt .tp span{flex:1}#mt .x{all:unset;cursor:pointer;width:28px;height:28px;display:grid;place-items:center;border-radius:8px;color:#b3bbc0;font-size:18px}#mt .x:hover{background:rgba(255,255,255,.08);color:#fff}
#mt h3{margin:0 0 12px;font:600 19px/1.25 var(--ui-sans,Inter,system-ui,sans-serif);color:#fff}
#mt .vs{display:grid;grid-template-columns:minmax(0,1fr) 28px minmax(0,1fr);align-items:stretch;gap:0;margin:0 0 12px}
#mt .cj{all:unset;cursor:pointer;box-sizing:border-box;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);opacity:.55;transition:opacity .35s,background .35s,border-color .35s,transform .35s}
#mt .cj.on{opacity:1;border-color:var(--c);background:color-mix(in srgb,var(--c) 16%,transparent);transform:scale(1.02)}
#mt .cj:focus-visible{outline:2px solid #fff}
#mt .cj small{display:flex;align-items:center;gap:6px;font:600 9.5px var(--ui-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--c)}#mt .cj small i{width:8px;height:8px;border-radius:2px;background:var(--c)}
#mt .cj b{display:block;margin:4px 0 2px;font:300 30px/1.05 var(--ui-sans,Inter,system-ui,sans-serif);color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
#mt .cj span{display:block;font-size:11px;line-height:1.35;color:#c3cace}
#mt .fl{display:grid;place-items:center;color:#e3ff86;font-size:18px}
#mt .ahora{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:11.5px;color:#d5dadd}#mt .ahora i{width:9px;height:9px;border-radius:50%;background:var(--c);box-shadow:0 0 0 4px color-mix(in srgb,var(--c) 30%,transparent)}
#mt .ahora b{color:#fff}#mt .ahora em{font-style:normal;color:#949da3;margin-left:auto}
#mt .tx{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 10px;margin:0 0 12px;font-size:12px;line-height:1.5;color:#d5dadd}
#mt .tx dt{font:600 9.5px var(--ui-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:#949da3;padding-top:3px}#mt .tx dd{margin:0}#mt .tx b{color:#fff;font-weight:600}
#mt .res{display:grid;gap:6px;margin:0 0 12px}
#mt .res div{display:grid;grid-template-columns:minmax(0,1fr) 80px 16px 80px;gap:8px;align-items:baseline;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);font-size:12px;color:#d5dadd}
#mt .res div b{text-align:right;font-weight:500;color:${CHOY};font-variant-numeric:tabular-nums}#mt .res div strong{text-align:right;color:${CPRO};font-variant-numeric:tabular-nums}#mt .res div i{color:#949da3;font-style:normal;text-align:center}
#mt .nav{display:flex;align-items:center;gap:8px}
#mt .nav button{all:unset;cursor:pointer;box-sizing:border-box;height:34px;padding:0 14px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e9ecee;font:500 12px var(--ui-sans,Inter,system-ui,sans-serif)}
#mt .nav button:hover{background:rgba(255,255,255,.1)}#mt .nav button:focus-visible{outline:2px solid #fff}#mt .nav button.pri{background:#D5FF3F;border-color:#D5FF3F;color:#1a1208;font-weight:600}
#mt .nav button[disabled]{opacity:.35;cursor:default}
#mt .pts{flex:1;display:flex;justify-content:center;gap:5px}#mt .pts i{width:18px;height:4px;border-radius:2px;background:rgba(255,255,255,.15)}#mt .pts i.on{background:#D5FF3F}
@media(max-width:760px){#mt{bottom:calc(max(8px,env(safe-area-inset-bottom)) + 66px);padding:12px 12px 10px;max-height:58vh}#mt h3{font-size:16px;margin-bottom:8px}#mt .cj{padding:8px}#mt .cj b{font-size:22px}#mt .vs{grid-template-columns:minmax(0,1fr) 18px minmax(0,1fr)}
  #mt .tx{grid-template-columns:1fr;gap:2px}#mt .tx dt{padding-top:4px}#mt .nav button{padding:0 10px}#mt .pts i{width:10px}#mt-btn{height:34px;font-size:12px}
  #mt .res div{grid-template-columns:minmax(0,1fr) 62px 12px 62px;font-size:11px}}
@media(prefers-reduced-motion:reduce){#mt .cj{transition:none}}`;
  document.head.appendChild(css);

  const ICO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
  // botón grande arriba, junto al selector hoy / propuesta, y otro en el panel de escenarios
  const ponerBotones = () => {
    const esc = document.getElementById('esc'); if (esc && !document.getElementById('mt-btn')) { const b = document.createElement('button'); b.id = 'mt-btn'; b.type = 'button'; b.innerHTML = ICO + '¿Cómo mejora Kennedy?'; b.title = 'Recorrido de 6 pasos: antes y después en cada lugar'; b.onclick = () => abrir(0); const sw = esc.querySelector('.sw'); sw ? sw.after(b) : esc.prepend(b); }
    const es = document.getElementById('esim'); if (es && !es.querySelector('.mt-ir')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'mt-ir'; b.innerHTML = ICO + 'Ver cómo mejora Kennedy, paso a paso'; b.onclick = () => abrir(0); const sg = es.querySelector('.seg'); sg ? sg.before(b) : es.appendChild(b); }
    return !!(esc && es); };
  if (!ponerBotones()) { const iv = setInterval(() => { if (ponerBotones()) clearInterval(iv); }, 700); }

  const card = document.createElement('section'); card.id = 'mt'; card.setAttribute('aria-label', 'Recorrido: cómo mejora Kennedy'); card.setAttribute('aria-live', 'polite'); document.body.appendChild(card);

  /* ---------- mecánica ---------- */
  let paso = 0, timers = [], vista = 'hoy';
  const limpiar = () => { timers.forEach(clearTimeout); timers = []; };
  const despues = (ms, f) => timers.push(setTimeout(f, ms));
  const volar = (c, alto) => { if (!T3.orbit) return; const dz = alto * (MOV ? 0.42 : 0.3), c1 = new THREE.Vector3(c[0], 0, c[1] + dz), p1 = new THREE.Vector3(c[0] + alto * 0.12, alto, c[1] + dz + alto * 0.42); /* el centro de la vista va más cerca: el lugar queda en la mitad de arriba, sobre la tarjeta */
    T3.anim = { t: 0, dur: RMQ ? 0.01 : 2.2, p0: T3.camera.position.clone(), c0: T3.orbit.target.clone(), p1, c1 }; };
  const quitarSolo = () => { const s = T3.escSolo && T3.escSolo(); if (s) { const b = document.querySelector(`#esc-ley [data-s="${s}"]`); if (b) b.click(); } };
  // muestra hoy o la propuesta; los años de la simulación se saltan al año 10 (salvo las huertas, que se ven crecer)
  function mostrar(v, crecer) {
    vista = v; tCambio = performance.now(); const K = window.KEN_ESC; if (K && K.e !== v) K.poner(v === 'pro' ? 'proyecto' : 'hoy'); else if (K && v === 'hoy' && K.e === 'hoy') {}
    if (!(crecer && v === 'pro')) despues(260, () => { SIMST.t = SEM - 1; const E = window.KEN_ESIM; if (E && E.aplicar) E.aplicar(); });
    // en Bavaria el distrito (edificios, pasajes, huertas de enseñanza) solo se arma con su estrategia escogida: se prende con la propuesta
    const P = PASOS[paso]; if (P.solo && v === 'pro') despues(500, () => { const s = T3.escSolo && T3.escSolo(); if (s !== P.solo) document.querySelector(`#esc-ley [data-s="${P.solo}"]`)?.click(); });
    if (v === 'hoy') quitarSolo();
    if (P.flujo) { const b = document.querySelector('#gs-fc button[data-v="1"]'); if (b && !b.classList.contains('on')) b.click(); } // el tráfico se lee en la capa de flujo de carros
    pintar();
  }
  function pintar() {
    const P = PASOS[paso], n = N(), K = window.KEN_ESC, pro = K ? K.e === 'proyecto' : vista === 'pro';
    const e = n ? n.e : 'C', cab = `<div class="tp"><span>Paso ${paso + 1} de ${PASOS.length} · ${P.tag}</span><button type="button" class="x" data-x aria-label="Salir del recorrido">×</button></div><h3>${P.t}</h3>`;
    const caja = (on, c, et, v) => `<button type="button" class="cj${on ? ' on' : ''}" style="--c:${c}" data-v="${et === 'hoy' ? 'hoy' : 'pro'}" aria-pressed="${on}"><small><i></i>${et === 'hoy' ? 'Kennedy hoy' : 'Con la propuesta'}</small><b>${v[0]}</b><span>${v[1]}</span></button>`;
    let cuerpo = '';
    if (P.resumen) {
      cuerpo = n ? `<div class="res">${[
        ['Vehículos en la Av. Ciudad de Cali', '100 %', n.tr + ' %'], ['Dependencia de Corabastos', fmt(n.depA) + ' %', fmt(n.depP) + ' %'], ['Hogares con huerta', fmt(n.hogA), fmt(n.hogP)],
        ['Personas que comen de las huertas', fmtK(n.perA), fmtK(n.perP)], ['Abono que vuelve a la tierra (t/año)', fmt(n.abA), fmt(n.abP)], ['Aves en el humedal El Burro', fmt(n.avA), fmt(n.avP)], ['Pasajes que abren Bavaria', '0', '20'], ['Árboles nativos nuevos en parques', '0', window.KEN_PARCHES ? fmt(window.KEN_PARCHES.n) : '…']
      ].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b><i>→</i><strong>${r[2]}</strong></div>`).join('')}</div>` : '';
      cuerpo += `<div class="vs">${caja(!pro, CHOY, 'hoy', ['Hoy', 'el territorio como es'])}<div class="fl" aria-hidden="true">→</div>${caja(pro, CPRO, 'pro', ['Propuesta', `escenario ${e} · ${NE[e]}, año 10`])}</div>`;
    } else if (n) cuerpo = `<div class="vs">${caja(!pro, CHOY, 'hoy', P.hoy(n))}<div class="fl" aria-hidden="true">→</div>${caja(pro, CPRO, 'pro', P.pro(n))}</div>`;
    const año = Math.min(10, Math.floor(SIMST.t / 52) + 1);
    const ahora = `<div class="ahora" style="--c:${pro ? CPRO : CHOY}"><i></i>El mapa muestra: <b>${pro ? 'Con la propuesta' : 'Kennedy hoy'}</b>${pro ? `<em>${P.crece ? `año ${año} de 10 · ${2026 + año}` : 'año 10 · 2036'}</em>` : `<em>en ${P.medir ? 6 : 3} s cambia a la propuesta</em>`}</div>`;
    const tx = `<dl class="tx"><dt>Qué mirar</dt><dd>${typeof P.mira === 'function' ? P.mira() : P.mira}</dd>${P.por ? `<dt>Por qué</dt><dd>${P.por}</dd>` : ''}</dl>`;
    const nav = `<div class="nav"><button type="button" data-ant ${paso ? '' : 'disabled'}>Anterior</button><span class="pts" aria-hidden="true">${PASOS.map((_, i) => `<i class="${i === paso ? 'on' : ''}"></i>`).join('')}</span>${P.resumen ? '' : '<button type="button" data-rep title="Ver otra vez el antes y el después">↺ Repetir</button>'}<button type="button" class="pri" data-sig>${paso === PASOS.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>`;
    card.innerHTML = cab + cuerpo + (P.resumen ? '' : ahora) + tx + nav;
  }
  function ir(i) {
    limpiar(); paso = Math.max(0, Math.min(PASOS.length - 1, i)); const P = PASOS[paso]; quitarSolo();
    volar(P.lugar(), P.alto);
    if (P.resumen) { mostrar('pro'); return; }
    mostrar('hoy'); despues(RMQ ? 600 : P.medir ? 6500 : 3200, () => mostrar('pro', P.crece)); // en los parches se deja medir hoy unos segundos
    if (P.crece) for (let k = 1; k < 40; k++) despues(3200 + k * 700, pintar);
    if (P.medir) { MED.hoy = MED.pro = null; for (let k = 1; k < 30; k++) despues(k * 600, () => { const K = window.KEN_ESC; if (performance.now() - tCambio < 1800) return; const m = medir(); if (m) MED[K && K.e === 'proyecto' ? 'pro' : 'hoy'] = m; pintar(); }); } // el año en la tarjeta sigue a las huertas que se abren
  }
  function abrir(i) { document.body.classList.add('mt-on'); ir(i); card.querySelector('[data-sig]')?.focus(); }
  function cerrar() { limpiar(); document.body.classList.remove('mt-on'); }
  card.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.x !== undefined) { cerrar(); return; }
    if (b.dataset.sig !== undefined) { paso === PASOS.length - 1 ? cerrar() : ir(paso + 1); return; }
    if (b.dataset.ant !== undefined) { ir(paso - 1); return; }
    if (b.dataset.rep !== undefined) { ir(paso); return; }
    if (b.dataset.v) { limpiar(); mostrar(b.dataset.v); } });
  addEventListener('keydown', (ev) => { if (!document.body.classList.contains('mt-on')) return; if (ev.key === 'Escape') cerrar(); else if (ev.key === 'ArrowRight') ir(paso + 1); else if (ev.key === 'ArrowLeft') ir(paso - 1); });
  addEventListener('escenario', () => { if (document.body.classList.contains('mt-on')) setTimeout(pintar, 80); });
  return { abrir, cerrar };
}
