/* ============ ESCENARIO: KENNEDY HOY / CON LA PROPUESTA ============
   Un solo selector arriba al centro (abajo en celular).
   - Hoy: Kennedy como es.
   - Con la propuesta (en revisión): por ahora SOLO un punto por cada lugar de las 5 estrategias, sin polígonos ni redes:
       Bavaria Común · Mercados de abastecimiento (reemplaza Tiendas barriales) · Corabastos · Gestión de residuos ·
       Red de producción alimentaria.
     Lo de la propuesta anterior (estrategias E1-E9 en polígonos, huertas en techos/balcones/Bavaria, naves retiradas, sintaxis con
     pasajes, camiones a furgonetas, fauna de huertas, carga desplazada e indicadores) queda APAGADO con T3.PROP; el código sigue
     en sus módulos por si se retoma. */
export function iniciarEscenario({ T3, say = () => {} }) {
  const CHOY = '#8fb0c9', CPRO = '#e2a55b';
  // qué de la propuesta anterior se usa (todo apagado mientras se redefine)
  // sintaxis con pasajes, fauna de las huertas (interacciones que fomenta la propuesta) e indicadores hoy vs. propuesta: sí; carga desplazada: no
  T3.PROP = { sintaxis: true, camiones: false, fauna: true, carga: false, comparar: true };
  const LC = { x: 5341.33, y: 3161.9 }, lw = (x, y) => [x - LC.x, LC.y - y]; // marco «modelo» -> mundo
  const css = document.createElement('style');
  css.textContent = `
/* ---------- selector de escenario: una sola fila (hoy | propuesta · íconos de las estrategias) ---------- */
#esc{position:fixed;z-index:30;top:14px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 32px);padding:5px;display:flex;align-items:center;gap:6px;
  font-family:var(--ui-sans,Inter,system-ui,sans-serif);color:var(--ui-tx,#e9ebec)}
#esc .sw{position:relative;display:grid;grid-template-columns:1fr 1fr;width:280px;background:rgba(255,255,255,.07);border-radius:12px;padding:3px;flex:none}
#esc .sw i{position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:9px;background:rgba(255,255,255,.2);box-shadow:0 1px 4px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.18);transition:transform .35s cubic-bezier(.3,.7,.2,1)}
#esc[data-e="proyecto"] .sw i{transform:translateX(100%)}
#esc .sw button{position:relative;z-index:1;height:32px;border:0;background:none;color:rgba(255,255,255,.62);cursor:pointer;font:500 13px var(--ui-sans,Inter,system-ui,sans-serif);border-radius:9px;transition:color .25s}
#esc .sw button:hover{color:#fff}#esc .sw button[aria-pressed="true"]{color:#fff}
#esc .sw button:focus-visible{outline:2px solid rgba(255,255,255,.7);outline-offset:1px}
#esc .sw button b,#esc .sw button small,#esc .sw button kbd{display:none}
#esc .sw button span{display:inline}
#esc .ley{display:none;align-items:center;gap:4px;padding:0 2px 0 4px;border-left:1px solid rgba(255,255,255,.12)}
#esc[data-e="proyecto"] .ley{display:flex}
#esc .ley-h{display:none}
#esc .est{position:relative;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s,opacity .2s}
#esc .est .ico{position:relative;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.13);color:rgba(255,255,255,.82);transition:background .2s,border-color .2s,color .2s}
#esc .est .ico::after{content:'';position:absolute;right:1px;bottom:1px;width:6px;height:6px;border-radius:50%;background:var(--c);opacity:.85}
#esc .est .ico svg{width:14px;height:14px}
#esc .est .tx,#esc .est small,#esc .est .nu{display:none}
#esc .est:hover .ico{background:rgba(255,255,255,.14);color:#fff}
#esc .est.on .ico{background:rgba(255,255,255,.22);border-color:rgba(255,255,255,.55);color:#fff}
#esc .est.off{opacity:.45}
#esc .est:focus-visible{outline:2px solid var(--c);outline-offset:2px}
/* nombre de la estrategia: aparece debajo del panel al pasar o al escogerla */
#esc .nom{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);padding:5px 11px;border-radius:9px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;
  font:500 12px var(--ui-sans,Inter,sans-serif);color:#fff;background:rgba(12,14,17,.72);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.12)}
#esc .nom.on{opacity:1}#esc .nom i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:7px;background:var(--c)}/* ---------- marcadores en el mapa: pin con ícono y anillo que late ---------- */
.esc-pt{position:fixed;z-index:6;left:0;top:0;pointer-events:none;display:none;align-items:center;gap:7px;white-space:nowrap;
  font:600 11px var(--ui-sans,Inter,system-ui,sans-serif);color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9),0 0 10px rgba(0,0,0,.6)}
.esc-pt .pin{position:relative;flex:none;width:30px;height:30px;margin:-15px 0 0 -15px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg) translate(10px,-10px);
  display:flex;align-items:center;justify-content:center;background:rgba(14,16,19,.82);
  border:1.5px solid var(--c);box-shadow:0 6px 16px rgba(0,0,0,.45)}
.esc-pt .pin svg{transform:rotate(45deg);color:#fff}
.esc-pt .pin::after{content:'';position:absolute;inset:-6px;border-radius:inherit;border:1.5px solid rgba(255,255,255,.5);opacity:0;animation:escPin 2.6s ease-out infinite}
@keyframes escPin{0%{opacity:.8;transform:scale(.8)}100%{opacity:0;transform:scale(1.6)}}
.esc-pt span{padding:3px 8px;border-radius:7px;background:rgba(10,12,15,.62);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);text-shadow:none;transform:translateY(-14px)}
.esc-pt.chico span{display:none}
.esc-pt.chico .pin{width:22px;height:22px}.esc-pt.chico .pin svg{width:12px;height:12px}
.esc-pt.col .pin{width:20px;height:20px}.esc-pt.col .pin svg{width:11px;height:11px}.esc-pt.col .pin::after{animation-duration:3.2s}
.esc-pt.col span{display:none}.esc-pt.col.cerca span{display:inline}

@media(prefers-reduced-motion:reduce){.esc-pt .pin::after{animation:none}}
/* la propuesta anterior no se ofrece mientras se redefine: botón y lista de estrategias del panel, y la Visión */
body .gs-est, body .gs-sub:has(+ .gs-est), body #gs-cv-b, body #vi-btn{display:none!important}
body .gs-fila:has(> #gs-cv-b){grid-template-columns:1fr!important}
@media(max-width:1100px){#esc{max-width:calc(100vw - 32px);top:auto;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 70px)}}
@media(max-width:760px){#esc{width:calc(100vw - 16px);max-width:none;padding:4px;flex-wrap:wrap;justify-content:center}#esc .sw{width:100%}#esc .ley{border-left:0;justify-content:center;width:100%;padding:4px 0 0}#esc .nom{top:auto;bottom:calc(100% + 6px)}
  body.tb-abierto #esc,body.gs-abierto #esc{display:none} /* con el panel de simulación abierto en celular, el selector no lo tapa */
  body #hid-red{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 196px)!important}}
@media(min-width:761px) and (max-width:1100px){body #hid-red{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 180px)!important}}
@media(prefers-reduced-motion:reduce){#esc .sw i{transition:none}#esc[data-e="proyecto"] .ley{animation:none}.esc-pt.col i{animation:none}}`;
  document.head.appendChild(css);
  const el = document.createElement('section'); el.id = 'esc'; el.setAttribute('aria-label', 'Escenario del territorio'); el.dataset.e = 'hoy';
  el.innerHTML = `<div class="sw" role="group" aria-label="Escenario"><i aria-hidden="true"></i>
      <button type="button" data-e="hoy" aria-pressed="true"><b style="background:${CHOY}"></b><span>Kennedy hoy<small>el territorio actual</small></span><kbd>H</kbd></button>
      <button type="button" data-e="proyecto" aria-pressed="false"><b style="background:${CPRO}"></b><span>Con la propuesta<small>las 5 estrategias</small></span><kbd>P</kbd></button></div>
    <div class="ley" id="esc-ley"></div><div class="nom" id="esc-nom" aria-live="polite"></div>`;
  document.body.appendChild(el);

  /* ---------- las 5 estrategias: un punto en cada lugar ---------- */
  const IC = { // íconos de línea (24 × 24)
    bav: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
    mer: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/>',
    cor: '<path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>',
    res: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/><path d="M12 8c-2 2-2 5 0 8 2-3 2-6 0-8z"/>',
    red: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
    col: '<path d="M12 4 2 9l10 5 10-5-10-5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>'
  };
  const svg = (id, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[id]}</svg>`;
  const EST5 = [
    { id: 'bav', n: 'Bavaria Común', t: 'Distrito de ciencia y alimento', c: '#e15759' },
    { id: 'mer', n: 'Red de mercados de barrio', t: 'Mercados cerca de casa', c: '#4e79a7' },
    { id: 'cor', n: 'Corabastos', t: 'Menos camiones, más humedal', c: '#f28e2b' },
    { id: 'res', n: 'Gestión de residuos', t: 'Los residuos vuelven a la tierra', c: '#b07aa1' },
    { id: 'red', n: 'Red de producción alimentaria', t: 'Huertas de parques y techos en red con Bavaria', c: '#59a14f' },
    { id: 'col', n: 'Colegios', t: 'Colegios en red con huertas', c: '#76b7b2' } // solo se prenden al escogerlas
  ];
  $ley().innerHTML = `<div class="ley-h">Estrategias<small>toca una para verla sola</small></div>` + EST5.map((s, i) => `<button type="button" class="est" data-s="${s.id}" title="Ver solo ${s.n}" aria-label="${s.n}" style="--c:${s.c}"><span class="ico">${svg(s.id)}</span><span class="tx"><b>${s.n}</b><small>${s.t}${s.id === 'col' ? ' · <em id="esc-ncol"></em>' : ''}</small></span><span class="nu">0${i + 1}</span></button>`).join('');
  function $ley() { return el.querySelector('#esc-ley'); }
  const PUNTOS = []; // { s, x, z, d (div), vis }
  let solo = null; // estrategia escogida en la leyenda (solo esa se prende)
  /* ---------- edificios de los colegios resaltados: un volumen de luz que envuelve cada edificio (0,7 m más grande) con aristas brillantes ---------- */
  let COLE = null, GCOL = null; const RMQ = matchMedia('(prefers-reduced-motion: reduce)');
  function armarColegios() {
    const THREE = T3.THREE, P = [], I = [], L = [];
    for (const c of COLE) for (const e of c.ed || []) {
      let W = e.p; if (W.length > 3 && W[0][0] === W[W.length - 1][0] && W[0][1] === W[W.length - 1][1]) W = W.slice(0, -1);
      const n = W.length; if (n < 3) continue;
      let cx = 0, cz = 0; for (const q of W) { cx += q[0]; cz += q[1]; } cx /= n; cz /= n;
      W = W.map(q => { const dx = q[0] - cx, dz = q[1] - cz, d = Math.hypot(dx, dz) || 1; return [q[0] + dx / d * 0.7, q[1] + dz / d * 0.7]; });
      const y0 = 0.2, y1 = Math.max(3, e.h) + 0.7, b = P.length / 3;
      for (const q of W) P.push(q[0], y0, q[1]); for (const q of W) P.push(q[0], y1, q[1]);
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; I.push(b + i, b + j, b + n + i, b + j, b + n + j, b + n + i);
        L.push(W[i][0], y1, W[i][1], W[j][0], y1, W[j][1], W[i][0], y0, W[i][1], W[i][0], y1, W[i][1]); }
      let tri = []; try { tri = THREE.ShapeUtils.triangulateShape(W.map(q => new THREE.Vector2(q[0], q[1])), []); } catch (er) {}
      for (const t of tri) I.push(b + n + t[0], b + n + t[1], b + n + t[2]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I);
    const mv = new THREE.MeshBasicMaterial({ color: '#76b7b2', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const gl = new THREE.BufferGeometry(); gl.setAttribute('position', new THREE.Float32BufferAttribute(L, 3));
    const ml = new THREE.LineBasicMaterial({ color: '#e3f3f2', transparent: true, opacity: 0.95, toneMapped: false });
    GCOL = new THREE.Group(); GCOL.name = 'colegios_resaltados'; const m = new THREE.Mesh(g, mv), li = new THREE.LineSegments(gl, ml);
    m.renderOrder = 8; li.renderOrder = 9; GCOL.add(m, li); GCOL.userData = { mv, ml }; GCOL.visible = false; T3.scene.add(GCOL);
  }
  /* ---------- Bavaria Común: al escogerla se abre el distrito (data3d/bavaria_distrito.js) ---------- */
  let DIST = null, pDist = null;
  addEventListener('bav-cerrar', () => { const sp = $ley().querySelector('[data-s="bav"]'); if (solo === 'bav' && sp) sp.click(); }); // la × del panel vuelve a todas las estrategias
  function distritoBavaria() {
    const pro = T3.escenario === 'proyecto', on = pro && solo === 'bav';
    if (pro && !DIST && !pDist) pDist = Promise.all([import('./bavaria_distrito.js?v=20'), cj('data3d/bavaria.json?v=3'), cj('data3d/bavaria_arboles.json?v=3').then(j => j.arboles).catch(() => []) /* todos los árboles (bosque y sueltos): las huertas no van debajo de ninguno */, cj('data3d/bavaria_distrito_sx.json?v=2').catch(() => null)])
      .then(([m, D, ARB, SX]) => { DIST = m.crearDistritoBavaria({ T3, lw, D, ARB, SX }); /* ARB: bosque denso (las huertas no lo tocan) */ window.KEN_BAV = DIST; distritoBavaria(); }).catch(e => console.warn('distrito Bavaria:', e));
    if (DIST) { DIST.ver(on); if (DIST.verHuertas) DIST.verHuertas(pro && solo !== 'col'); } // las huertas de enseñanza de Bavaria se ven SIEMPRE con la propuesta, aunque se mire otra estrategia
  }
  /* ---------- red de colegios: enlaces entre colegios, parques-huerta de dos pisos y visitas a Bavaria Común (data3d/colegios_red.js) ---------- */
  let RED = null, pRed = null, redOn = false;
  addEventListener('col-cerrar', () => { const sp = $ley().querySelector('[data-s="col"]'); if (solo === 'col' && sp) sp.click(); });
  function redColegios() {
    const on = T3.escenario === 'proyecto' && solo === 'col';
    if (on && !RED && !pRed) pRed = import('./colegios_red.js?v=5').then(m => { RED = m.crearRedColegios({ T3, lw, COLE }); window.KEN_RED = RED; redColegios(); }).catch(e => console.warn('red de colegios:', e));
    if (RED) { RED.ver(on); if (on && !redOn) Promise.resolve(RED.listo).then(() => { if (RED.on) RED.general(); }); if (!RED.pintados) { RED.pintados = true; Promise.resolve(RED.listo).then(() => PUNTOS.filter(p => p.s.id === 'col').forEach((p, i) => { const c = RED.colorDe(i); if (c) p.d.style.setProperty('--c', c); })); } } // cada colegio con el color de su grupo // vista de toda la red cuando llegan los datos
    redOn = on;
  }
  function resaltarColegios() {
    distritoBavaria(); redColegios();
    const on = T3.escenario === 'proyecto' && solo === 'col' && !!COLE;
    if (on && !GCOL) armarColegios();
    if (GCOL) GCOL.visible = on;
  }
  const cj = (u) => (window.cargarJSON ? window.cargarJSON(u) : fetch(u).then(r => r.json()));
  /* ---------- Av. Ciudad de Cali: con la propuesta baja su tráfico (data3d/alivio_cali.js); el conteo corre también en «hoy» ---------- */
  let CALI = null, HBAR = null, pHBar = null;
  /* huertas de barrio (lotes baldíos y parques vecinales): bancales reales, solo con la propuesta (data3d/huertas_barrio.js) */
  const huertasBarrio = (on) => { if (HBAR) { HBAR.ver(on); return; } if (!on || pHBar) return;
    pHBar = Promise.all([import('./huertas_barrio.js?v=7'), cj('data3d/huertas_barrio.json?v=3')]).then(([m, D]) => m.crearHuertasBarrio({ THREE: T3.THREE, T3, D, movil: matchMedia('(pointer:coarse)').matches }))
      .then(h => { HBAR = h; window.KEN_HBAR = h; HBAR.ver(T3.escenario === 'proyecto' && solo !== 'col'); }).catch(e => console.warn('huertas de barrio:', e)); };
  /* parches de árboles nativos en parques y junto a las huertas de parque (data3d/parches_arboles.js): solo con la propuesta */
  let PARCH = null, pParch = null;
  const parchesArboles = (on) => { if (PARCH) { PARCH.ver(on); return; } if (!on || pParch) return;
    pParch = Promise.all([import('./parches_arboles.js?v=7'), cj('data3d/huertas_barrio.json?v=3'), cj('data3d/parques.json')]).then(([m, HB, PQ]) => m.crearParches3D({ T3, P: m.calcularParches(HB, PQ, lw, matchMedia('(pointer:coarse)').matches) }))
      .then(p => { PARCH = p; window.KEN_PARCHES = p; PARCH.ver(T3.escenario === 'proyecto' && solo !== 'col'); }).catch(e => console.warn('parches de árboles:', e)); };
  /* parque humedal de Corabastos: donde se desmontan las bodegas junto al humedal La Vaca (data3d/corabastos_parque.js): solo con la propuesta */
  /* mercados campesinos de barrio en los parques (data3d/mercados_barrio.js): solo con la propuesta */
  let MERC = null, pMerc = null;
  const mercadosBarrio = (on) => { if (MERC) { MERC.ver(on); return; } if (!on || pMerc) return;
    pMerc = import('./mercados_barrio.js?v=1').then(m => m.crearMercados({ T3, cj })).then(mm => { MERC = mm; window.KEN_MERC = mm; if (mm) mm.ver(T3.escenario === 'proyecto' && solo !== 'col'); }).catch(e => console.warn('mercados de barrio:', e)); };
  let PCORA = null, pPCora = null;
  const parqueCorabastos = (on) => { if (PCORA) { PCORA.ver(on); return; } if (!on || pPCora) return;
    pPCora = import('./corabastos_parque.js?v=3').then(m => m.crearParqueCorabastos({ T3, lw, cj })).then(p => { PCORA = p; window.KEN_PCORA = p; if (p) p.ver(T3.escenario === 'proyecto' && solo !== 'col'); }).catch(e => console.warn('parque Corabastos:', e)); };
  import('./escenarios_sim.js?v=28').then(m => m.iniciarEscenariosSim({ T3, cj })).then(S => { window.KEN_ESIM = S; }).catch(e => console.warn('escenarios:', e)); // SIM-01/02/03 con sliders, en el territorio
  Promise.all([import('./alivio_cali.js?v=5'), cj('data3d/alivio_cali.json?v=1')]).then(([m, D]) => { CALI = m.crearAlivioCali({ T3, D }); window.KEN_CALI = CALI; CALI.ver(T3.escenario === 'proyecto' && !solo); }).catch(e => console.warn('Av. Ciudad de Cali:', e));
  /* red de producción alimentaria: huertas de parques, lotes y techos en clústeres de barrio, conectadas a Bavaria (data3d/red_produccion.js) */
  let RPROD = null, pRProd = null;
  const redProduccion = (on) => { if (RPROD) { RPROD.ver(on); return; } if (!on || pRProd) return;
    pRProd = import('./red_produccion.js?v=2').then(m => m.crearRedProduccion({ T3, lw, cj })).then(r => { RPROD = r; window.KEN_RPROD = r; RPROD.ver(T3.escenario === 'proyecto' && solo === 'red'); }).catch(e => console.warn('red de producción:', e)); };
  const centro = (P) => [P.reduce((a, p) => a + p[0], 0) / P.length, P.reduce((a, p) => a + p[1], 0) / P.length];
  const poner = (sid, x, z, n) => { const s = EST5.find(q => q.id === sid), d = document.createElement('div'); d.className = 'esc-pt';
    d.style.setProperty('--c', s.c); d.innerHTML = `<b class="pin">${svg(s.id, 15)}</b><span>${n === undefined ? s.n : n}</span>`; if (sid === 'col') d.classList.add('col'); document.body.appendChild(d); PUNTOS.push({ s, x, z, d, vis: solo ? sid === solo : sid !== 'col' }); };
  Promise.all([
    cj('data3d/bavaria.json?v=3').then(B => { const c = centro(B.sitio), w = lw(c[0], c[1]); poner('bav', w[0], w[1]); }).catch(() => {}),
    cj('data3d/corabastos.json').then(C => { const c = centro(C.poly), w = lw(c[0], c[1]); poner('cor', w[0], w[1]); }).catch(() => {}),
    // mercados de abastecimiento: los 8 lugares de mercado de barrio ya definidos (data3d/carga.json)
    fetch('data3d/carga.json?v=1').then(r => r.json()).then(K => K.mercados.forEach((m, i) => { const w = lw(m.p[0], m.p[1]); poner('mer', w[0], w[1], i ? '' : undefined); })).catch(() => {}),
    // gestión de residuos (lugar de E4, distrito biotecnológico) y red de producción alimentaria (centro de la red E8 de huertas)
    // colegios de Kennedy (OpenStreetMap, tools/colegios_build.py): ya vienen en el marco del mundo
    // solo los que tienen edificio levantado en el 3D; cada uno trae las huellas y alturas de sus edificios (c.ed)
    cj('data3d/colegios.json?v=2').then(C => { COLE = C.colegios; C.colegios.forEach(c => poner('col', c.c[0], c.c[1], c.n)); const ne = el.querySelector('#esc-ncol'); if (ne) ne.textContent = C.colegios.length; resaltarColegios(); }).catch(() => {}),
    new Promise(r => { const mira = (k) => { const E = T3.EST; if (E && E.lugar) { const a = E.lugar('E4'), b = E.lugar('E8'); if (a) poner('res', a.c[0], a.c[1]); if (b) poner('red', b.c[0], b.c[1]); r(); } else if (k < 40) setTimeout(() => mira(k + 1), 500); else r(); }; mira(0); })
  ]).then(() => { PUNTOS.forEach(p => { if (!p.d.querySelector('span').textContent) p.d.classList.add('chico'); }); });
  // los puntos se dibujan en pantalla (siempre del mismo tamaño), sobre la posición 3D a 2 m del suelo
  let raf = 0; const V = new T3.THREE.Vector3();
  function cuadro() {
    raf = requestAnimationFrame(cuadro); const cam = T3.camera, W = innerWidth, H = innerHeight;
    const cp = cam.position;
    if (GCOL && GCOL.visible && !RMQ.matches) GCOL.userData.mv.opacity = 0.34 + 0.14 * Math.sin(performance.now() / 420); // los colegios «respiran»
    for (const p of PUNTOS) { if (!p.vis) { if (p.d.style.display !== 'none') p.d.style.display = 'none'; continue; }
      if (p.s.id === 'col') p.d.classList.toggle('cerca', Math.hypot(cp.x - p.x, cp.y, cp.z - p.z) < 1600); // el nombre del colegio solo de cerca
      V.set(p.x, 2 + (T3.alzaVia ? T3.alzaVia(p.x, p.z) : 0), p.z).project(cam);
      const ok = V.z < 1 && Math.abs(V.x) < 1.05 && Math.abs(V.y) < 1.05; p.d.style.display = ok ? 'flex' : 'none';
      if (ok) p.d.style.transform = `translate(${((V.x + 1) / 2 * W).toFixed(1)}px,${((1 - V.y) / 2 * H).toFixed(1)}px)`; }
  }
  function verPuntos(on) { cancelAnimationFrame(raf); if (on) cuadro(); else PUNTOS.forEach(p => { p.d.style.display = 'none'; }); }
  // tocar una estrategia de la leyenda: se prende SOLO esa y la cámara va a sus puntos; tocarla otra vez vuelve a mostrar todas.
  // Los colegios no se muestran con todas (son más de cien): solo cuando se escogen.
  function filtrar() {
    PUNTOS.forEach(p => { p.vis = solo ? p.s.id === solo : p.s.id !== 'col'; });
    document.body.classList.toggle('esc-solo-col', solo === 'col'); // sin huertas no se muestra el panel de polinización
    resaltarColegios();
    $ley().querySelectorAll('[data-s]').forEach(sp => { sp.classList.toggle('on', sp.dataset.s === solo); sp.classList.toggle('off', !!solo && sp.dataset.s !== solo); sp.setAttribute('aria-pressed', String(sp.dataset.s === solo)); });
  }
  T3.escSolo = () => solo;
  const NOM = () => el.querySelector('#esc-nom'); const verNombre = (id) => { const n = NOM(), s = EST5.find(q => q.id === id); if (!n) return; if (!s) { n.classList.remove('on'); return; } n.style.setProperty('--c', s.c); n.innerHTML = `<i></i>${s.n}`; n.classList.add('on'); };
  $ley().addEventListener('pointerover', (e) => { const b = e.target.closest('[data-s]'); if (b) verNombre(b.dataset.s); });
  $ley().addEventListener('pointerleave', () => verNombre(solo));
  $ley().addEventListener('focusin', (e) => { const b = e.target.closest('[data-s]'); if (b) verNombre(b.dataset.s); });
  $ley().addEventListener('click', (ev) => { const sp = ev.target.closest('[data-s]'); if (!sp) return;
    solo = solo === sp.dataset.s ? null : sp.dataset.s; filtrar(); limpiarAnterior(); verNombre(solo);
    if (solo === 'col') say(`Colegios de Kennedy: ${PUNTOS.filter(p => p.s.id === 'col').length} (OpenStreetMap)`, 3000);
    const L = PUNTOS.filter(p => p.vis); if (!L.length || !T3.orbit || solo === 'bav' || solo === 'col' || solo === 'red') return; // Bavaria, colegios y red de producción: la cámara la mueve su módulo
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of L) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, s = Math.min(4200, Math.max(500, (x1 - x0) * 0.75, (z1 - z0) * 0.75)), o = T3.orbit, THREE = T3.THREE;
    const p0 = T3.camera.position.clone(), t0 = o.target.clone(), p1 = new THREE.Vector3(cx + s * 0.35, s * 0.8, cz + s * 0.6), t1 = new THREE.Vector3(cx, 0, cz), ini = performance.now();
    const vuela = () => { const k = Math.min(1, (performance.now() - ini) / 1400), e2 = k * k * (3 - 2 * k); T3.camera.position.lerpVectors(p0, p1, e2); o.target.lerpVectors(t0, t1, e2); o.update(); if (k < 1) requestAnimationFrame(vuela); };
    vuela(); });
  filtrar();
  /* ---------- apagar lo de la propuesta anterior; las HUERTAS (techos, balcones y Bavaria) sí van con la propuesta ---------- */
  function limpiarAnterior() {
    const pro = T3.escenario === 'proyecto', hu = pro && solo !== 'col'; // con «solo colegios» se apagan las huertas
    const b = document.getElementById('gs-cv-b'); if (b && b.classList.contains('on')) b.click(); // estrategias E1-E9 (polígonos, conexiones, red de huertas)
    const EST = T3.EST; if (EST && EST.hidroponia) EST.hidroponia(hu); T3.conHidro = hu && !!EST; // huertas hidropónicas en techos y balcones con sus polinizadores
    if (T3.huertas && T3.huertas.grupo) T3.huertas.grupo.visible = hu && !EST; // camas de tierra en terrazas solo si no hay hidroponía
    if (T3.torres && T3.torres.huertas) T3.torres.huertas(hu);
    const bv = T3.bavaria; if (bv && bv.userData && bv.userData.mallasHuerta) bv.userData.mallasHuerta.forEach(m => { m.visible = false; }); // las parcelas viejas (en diagonal) ya no: las reemplazan las huertas de enseñanza del distrito
    const co = T3.scene && T3.scene.getObjectByName('corabastos'); if (co && co.userData.quitadas) co.userData.quitadas.visible = !hu; // con la propuesta las bodegas junto al humedal se desmontan
    parqueCorabastos(hu); // y en su lugar queda el parque humedal (agua y árboles nativos)
    mercadosBarrio(hu); // mercados campesinos de barrio en los parques
    if (T3.bio && T3.bio.ESTADO) T3.bio.ESTADO.escenario = pro && T3.PROP.fauna ? 'proyecto' : 'hoy'; // fauna e interacciones de las huertas
    if (T3.sintaxisEscenario) T3.sintaxisEscenario();
    if (CALI) CALI.ver(pro && !solo);
    huertasBarrio(hu); parchesArboles(hu); redProduccion(pro && solo === 'red'); distritoBavaria(); // Av. Ciudad de Cali con menos tráfico (se oculta al mirar una sola estrategia)
  }
  function aplicar(e) {
    T3.escenario = e; el.dataset.e = e; { const nm = el.querySelector('#esc-nom'); if (nm && e !== 'proyecto') nm.classList.remove('on'); } const st = el.querySelector('#esc-st'); if (st) st.textContent = e === 'proyecto' ? 'Con la propuesta' : 'Kennedy hoy';
    el.querySelectorAll('.sw button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.e === e)));
    limpiarAnterior(); verPuntos(e === 'proyecto'); resaltarColegios();
    const re = document.getElementById('ruido-esc'); if (re) re.textContent = nombre();
    window.dispatchEvent(new CustomEvent('escenario', { detail: e }));
  }
  const nombre = () => T3.escenario === 'proyecto' ? 'CON LA PROPUESTA' : 'KENNEDY HOY';
  function cambiar(e) { if (e === T3.escenario) return; el.classList.remove('barre'); void el.offsetWidth; el.classList.add('barre'); aplicar(e); say(e === 'proyecto' ? 'Con la propuesta: las 5 estrategias' : 'Kennedy hoy: el territorio como es', 3000); }
  el.querySelectorAll('.sw button').forEach(b => b.onclick = () => cambiar(b.dataset.e));
  addEventListener('keydown', (ev) => { if (ev.ctrlKey || ev.metaKey || ev.altKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName || '')) return; const k = ev.key.toLowerCase(); if (k === 'h') cambiar('hoy'); else if (k === 'p') cambiar('proyecto'); }); // atajos: H = hoy, P = propuesta
  window.KEN_ESC = { poner: cambiar, nombre, get e() { return T3.escenario; } };
  // arranque en «hoy»; los módulos que terminan de cargar después se vuelven a apagar
  aplicar('hoy');
  let n = 0; const rep = setInterval(() => { n++; limpiarAnterior(); if (n >= 8) clearInterval(rep); }, 2500);
  return window.KEN_ESC;
}
