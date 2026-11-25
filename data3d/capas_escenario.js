/* ============ LAS CAPAS DE LA IZQUIERDA CAMBIAN CON LA PROPUESTA (y dicen por qué) ============
   · Sintaxis: botón «Ver dónde cambia» (los 20 pasajes de Bavaria Común y las 61 calles vecinas) + por qué.
   · Ruido de carros: el mapa ya sale de los carros de la simulación; aquí se mide la Av. Ciudad de Cali hoy vs. con la propuesta
     (dB con la regla de energía: 10·log10(propuesta/hoy), un camión = 4 carros) y se explica.
   · Usos del suelo: con la propuesta Bavaria pasa de industrial a dotacional/educativo y aparece la agricultura urbana
     (huertas de barrio, techos, Bavaria) con su área; el panel muestra hoy -> propuesta.
   · Indicadores: tabla HOY -> CON LA PROPUESTA en el panel de la derecha, con la razón de cada cambio (escenarios_sim.js).
   Al cambiar a la propuesta sale una tarjeta corta que resume qué cambió en cada capa. */
import { SEM, AÑO, SIMST } from './sim_modelos.js?v=4';
export function iniciarCapasEscenario({ T3, ES }) {
  const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pro = () => T3.escenario === 'proyecto';
  const css = document.createElement('style'); css.textContent = `
#ci-ind{margin:4px 0 6px}#ci-ind .ci-ir{margin:0 0 0 4px;font-size:10px}#ci-ind .h{display:flex;justify-content:space-between;font:500 9.5px var(--ui-mono,monospace);letter-spacing:.14em;color:var(--ui-tx3,#949da3);text-transform:uppercase;margin:6px 0 4px}
#ci-ind .r{display:grid;grid-template-columns:1fr auto auto;gap:0 8px;align-items:baseline;padding:4px 0;border-top:1px solid rgba(255,255,255,.06);font-size:11px}
#ci-ind .r span{color:var(--ui-tx2,#c3cace)}#ci-ind .r b{font-weight:500;color:#9aa4aa;font-variant-numeric:tabular-nums;text-align:right}#ci-ind .r strong{font-weight:600;font-variant-numeric:tabular-nums;text-align:right;min-width:56px}
#ci-ind .br{grid-column:1/-1;display:grid;gap:2px;margin:4px 0 2px}#ci-ind .br b{display:block;height:4px;border-radius:2px;min-width:2px}
#ci-ind .lg{display:inline-block;width:8px;height:8px;border-radius:2px;margin:0 4px 0 2px;vertical-align:-1px}
#ci-ind .r small{grid-column:1/-1;color:var(--ui-tx3,#949da3);font-size:10px;line-height:1.35;margin-top:1px}#ci-ind .bien{color:#8fd18a}#ci-ind .mal{color:#ff8a80}
.ci-por{margin-top:6px;font-size:10.5px;line-height:1.4;color:var(--ui-tx2,#c3cace)}.ci-por b{color:#fff;font-weight:600}
.ci-ir{all:unset;cursor:pointer;display:inline-block;margin-top:6px;font-size:10.5px;font-weight:600;color:#f2c995}.ci-ir:hover{text-decoration:underline}
#ci-toast{position:fixed;left:292px;top:84px;z-index:30;width:min(320px,calc(100vw - 32px));padding:12px 14px;border-radius:14px;color:#eef1f2;font:400 11.5px/1.45 var(--ui-sans,Inter,system-ui,sans-serif);
  background:var(--ui-glass,rgba(14,16,20,.86));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:0 18px 40px rgba(0,0,0,.4);backdrop-filter:var(--ui-glass-fx,blur(24px));-webkit-backdrop-filter:var(--ui-glass-fx,blur(24px));
  opacity:0;transform:translateY(-6px);transition:opacity .35s,transform .35s;pointer-events:none}
#ci-toast.on{opacity:1;transform:none;pointer-events:auto}#ci-toast h4{margin:0 0 6px;font-size:12.5px;font-weight:600}#ci-toast ul{margin:0;padding:0 0 0 14px}#ci-toast li{margin:2px 0}#ci-toast li b{color:#fff}
#ci-toast button{all:unset;cursor:pointer;position:absolute;right:10px;top:8px;color:#b3bbc0;font-size:15px}
@media(max-width:760px){#ci-toast{left:8px;right:8px;width:auto;top:auto;bottom:140px}}
@media(prefers-reduced-motion:reduce){#ci-toast{transition:none}}`;
  document.head.appendChild(css);

  /* ---------- números de las capas ---------- */
  const HA_HUERTAS = () => { const b = window.KEN_BAV; const hb = 2.4; const techos = (13717 + 35268) / 1e4; return { barrio: hb, bavaria: b && b.ha ? b.ha : 2.9, techos }; };
  const ruidoCali = () => { const a = T3.alivio; if (!a || !(a.hoy > 0.5)) return null; const eh = a.hoy + 3 * a.camHoy, ep = a.pro + 3 * a.camPro; return { db: 10 * Math.log10(Math.max(0.05, ep / eh)), veh: (1 - a.pro / a.hoy) * 100 }; };
  const sx = () => { const n = document.getElementById('gs-sx-pro'); const m = n && n.textContent.match(/(\d+) pasajes nuevos.*?\(([\d.]+) m\)/); return m ? { pas: +m[1], m: m[2] } : { pas: 20, m: '4.000' }; };
  const volar = (c, alto) => { const o = T3.orbit; if (!o) return; const THREE = T3.THREE, p0 = T3.camera.position.clone(), t0 = o.target.clone(), p1 = new THREE.Vector3(c[0] + alto * 0.15, alto, c[1] + alto * 0.55), t1 = new THREE.Vector3(c[0], 0, c[1]), ini = performance.now();
    const f = () => { const k = Math.min(1, (performance.now() - ini) / 1500), e = k * k * (3 - 2 * k); T3.camera.position.lerpVectors(p0, p1, e); o.target.lerpVectors(t0, t1, e); o.update(); if (k < 1) requestAnimationFrame(f); }; f(); };

  /* ---------- sintaxis: por qué y dónde ---------- */
  function sintaxis() {
    const n = document.getElementById('gs-sx-pro'); if (!n) return;
    let x = n.parentElement.querySelector('.ci-sx'); if (!x) { x = document.createElement('div'); x.className = 'ci-sx ci-por'; n.after(x); }
    const s = sx();
    x.innerHTML = pro() ? `<b>Por qué cambia:</b> Bavaria hoy es un predio cerrado de casi 40 ha. La propuesta abre ${s.pas} pasajes peatonales que lo atraviesan y lo unen a las calles del barrio: el recorrido más corto entre barrios pasa por dentro, por eso esas calles ganan integración y elección.<br><button type="button" class="ci-ir" data-sx>Ver dónde cambia →</button>`
      : `<b>Hoy:</b> el predio de Bavaria es una barrera de casi 40 ha que obliga a rodearlo. Cambia a «Con la propuesta» para ver los pasajes.`;
    const b = x.querySelector('[data-sx]'); if (b) b.onclick = () => { const bi = document.querySelector('#gs-capa button[data-c="i"]'); if (bi && !bi.classList.contains('on')) bi.click(); volar([4080, 120], 950); };
  }
  /* ---------- MODELO DE RUIDO CON LA PROPUESTA (calles de Kennedy) ----------
     Tres efectos que se suman en energía (dB = 10·log10 de la razón de energía sonora propuesta / hoy), medidos en las celdas de 16 m que tocan una calle:
     1) Menos tráfico hacia Corabastos: los carros y camiones que se quitan (T3.alivio: KEEP, KEEP_CAM, sliders manuales, rampa), con pesos de energía
        carro = 1, camión = 4 (el mismo W_CAM del mapa) y plena hasta 600 m de Corabastos, nula a 2,6 km (el mismo radio de alivio_cali.js).
     2) Viajes largos más cortos: si se compra en mercados de barrio y huertas, también bajan los carros lejos de Corabastos. [SUP] como máximo 35 % de la
        reducción de carros (redCar) se traduce en menos energía en las calles fuera de la zona de Corabastos (con redCar ≈ 40 %: −14 % de energía, −0,6 dB).
     3) Vegetación: árboles de los parches nativos (window.KEN_PARCHES, los que deja ver el slider de densidad) y del parque humedal de Corabastos
        (window.KEN_PCORA). [SUP] densidad de árboles en 112 m a la redonda → como máximo 50 % de reducción de energía (−3 dB, una franja densa de ~20 m de
        árboles y arbustos da 3 a 5 dB; una franja corta da menos), con 14 árboles por cuadro de 112 m para llegar a ~63 % del máximo.
     Todo se precalcula en una rejilla (se rehace solo cuando cambia el número de árboles); el mapa (ruido_cierre.js) y el panel leen esta rejilla. */
  const RM = T3.ruidoMod = { ver: 0, G: null, cs: 16 };
  const CORA_W = [1132.1, 948.6], pwC = (x, z) => { const d = Math.hypot(x - CORA_W[0], z - CORA_W[1]); return d <= 600 ? 1 : d >= 2600 ? 0 : 1 - (d - 600) / 2000; };
  const VEG_MAX = 0.5, VEG_NK = 14, TRIP_MAX = 0.35, R_VEG = 3;
  const caja = (a, nx, nz, r, media) => { const t = new Float32Array(a.length), o = new Float32Array(a.length), w = media ? 1 / (2 * r + 1) : 1;
    for (let j = 0; j < nz; j++) { let s = 0; const b = j * nx; for (let i = 0; i <= Math.min(r, nx - 1); i++) s += a[b + i];
      for (let i = 0; i < nx; i++) { t[b + i] = s * w; const ad = i + r + 1, su = i - r; if (ad < nx) s += a[b + ad]; if (su >= 0) s -= a[b + su]; } }
    for (let i = 0; i < nx; i++) { let s = 0; for (let j = 0; j <= Math.min(r, nz - 1); j++) s += t[j * nx + i];
      for (let j = 0; j < nz; j++) { o[j * nx + i] = s * w; const ad = j + r + 1, su = j - r; if (ad < nz) s += t[ad * nx + i]; if (su >= 0) s -= t[su * nx + i]; } }
    return o; };
  const arbolesMundo = () => { const A = []; const KP = window.KEN_PARCHES, PC = window.KEN_PCORA;
    if (KP && KP.grupo) { for (const im of KP.grupo.children) if (im.isInstancedMesh && im.material && im.material.isMeshBasicMaterial) { const e = im.instanceMatrix.array; for (let i = 0; i < im.count; i++) A.push(e[i * 16 + 12], e[i * 16 + 14]); } } // la «pradera» lleva una instancia por árbol y respeta el slider de densidad
    else if (RM.arbPre) { const d = RM.densPre; for (const t of RM.arbPre) if (t.k < d) A.push(t.x, t.z); } // en «hoy» no hay parches en 3D: se usan los mismos árboles, calculados aparte
    if (PC && PC.listaArboles) for (const t of PC.listaArboles) A.push(t.x, t.z);
    return A; };
  RM.refrescar = () => {
    const CEL = RM.cs;
    if (!RM.G) { const N = T3.net; if (!N || !N.edges || typeof T3.lw !== 'function') return false;
      const E = N.edges.map(e => e[1].map(p => T3.lw(p[0], p[1]))), CL = N.edges.map(e => e[0] === 'major' ? 3 : e[0] === 'mid' ? 2 : 1); let a = 1e9, b = 1e9, c = -1e9, d = -1e9; // clase de vía: 1 local, 2 intermedia, 3 principal
      for (const P of E) for (const p of P) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > d) d = p[1]; }
      if (!(c > a)) return false;
      const x0 = a - CEL, z0 = b - CEL, nx = Math.ceil((c - a) / CEL) + 3, nz = Math.ceil((d - b) / CEL) + 3, pw = new Float32Array(nx * nz), via = new Uint8Array(nx * nz);
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) pw[j * nx + i] = pwC(x0 + (i + 0.5) * CEL, z0 + (j + 0.5) * CEL);
      E.forEach((P, ie) => { const cl = CL[ie]; for (let k = 1; k < P.length; k++) { const A = P[k - 1], B = P[k], n = Math.max(1, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1]) / (CEL * 0.7)));
        for (let q = 0; q <= n; q++) { const x = A[0] + (B[0] - A[0]) * q / n, z = A[1] + (B[1] - A[1]) * q / n, i = Math.floor((x - x0) / CEL), j = Math.floor((z - z0) / CEL); if (i >= 0 && j >= 0 && i < nx && j < nz && cl > via[j * nx + i]) via[j * nx + i] = cl; } } });
      const idx = []; for (let k = 0; k < via.length; k++) if (via[k]) idx.push(k);
      const roads = Int32Array.from(idx);
      RM.G = { x0, z0, nx, nz, cs: CEL, pw, roads, clsR: Uint8Array.from(idx, k => via[k]), pwR: Float32Array.from(idx, k => pw[k]), veg: new Float32Array(nx * nz), vegR: new Float32Array(roads.length), sig: '' };
    }
    RM.flujo(); const G = RM.G, A = arbolesMundo(), sig = String(A.length / 2); if (sig === G.sig) return true; G.sig = sig;
    const cnt = new Float32Array(G.nx * G.nz); for (let k = 0; k < A.length; k += 2) { const i = Math.floor((A[k] - G.x0) / CEL), j = Math.floor((A[k + 1] - G.z0) / CEL); if (i >= 0 && j >= 0 && i < G.nx && j < G.nz) cnt[j * G.nx + i]++; }
    const n112 = caja(cnt, G.nx, G.nz, R_VEG, false), suave = caja(n112, G.nx, G.nz, 2, true);
    for (let k = 0; k < suave.length; k++) G.veg[k] = suave[k] > 0.02 ? VEG_MAX * (1 - Math.exp(-suave[k] / VEG_NK)) : 0;
    for (let k = 0; k < G.roads.length; k++) G.vegR[k] = G.veg[G.roads[k]];
    RM.ver++; return true; };
  const reduccionCora = () => { const A = T3.alivio, M = A && A.manual; return A ? { car: 1 - (M ? M.keep : 1) * A.KEEP, cam: 1 - (M ? M.keepCam : 1) * A.KEEP_CAM } : { car: 0.4, cam: 0.7 }; };
  RM.f = (rampa) => { const r = reduccionCora(); return { ts: TRIP_MAX * r.car * rampa, vs: rampa, rE: (0.92 * r.car + 0.32 * r.cam) / 1.24 * rampa }; }; // 0,92 carros + 0,08 camiones × 4 = 1,24
  const db10 = (v) => 10 * Math.log10(Math.max(1e-6, v));
  RM.calc = (rampa) => { const G = RM.G; if (!G || !G.roads.length) return null; const f = RM.f(rampa), n = G.roads.length; let sV = 0, sT = 0, sG = 0, sA = 0;
    for (let k = 0; k < n; k++) { const p = G.pwR[k], mv = 1 - f.rE * p, mt = 1 - f.ts * (1 - p), mg = 1 - f.vs * G.vegR[k]; sV += mv; sT += mt; sG += mg; sA += mv * mt * mg; }
    let nv = 0, sv = 0; for (let k = 0; k < G.roads.length; k++) if (G.vegR[k] > 0.02) { nv++; sv += G.vegR[k]; }
    return { veh: db10(sV / n), trip: db10(sT / n), veg: db10(sG / n), tot: db10(sA / n), pct: (1 - sA / n) * 100, vegPct: nv / n * 100, vegDb: nv ? db10(1 - f.vs * sv / nv) : 0 }; };
  RM.caja = caja;

  /* ---------- RUIDO EN dB ABSOLUTOS (panel «Ruido en las calles de Kennedy» y mapa de ruido) ----------
     El modelo anterior solo daba cambios relativos. Aquí cada celda de vía de la rejilla de 16 m recibe un nivel en dB(A) de hoy y otro con la propuesta:
     · Nivel de hoy [SUP] = nivel de referencia por tipo de vía + 10·log10(flujo de la celda / flujo típico de su tipo de vía).
       Referencia (orden de magnitud de los mapas de ruido de Bogotá): vía local 60 dB, intermedia 68 dB, principal 74 dB. El flujo sale de la simulación
       de tráfico grabada (todos los vehículos de todos los cuadros que pasan por la celda; un camión = 4 carros), se suaviza en 3×3 celdas y el
       desvío respecto al flujo típico se limita a −8 / +5 dB (calles sin tráfico en la simulación: ~52 dB; las más cargadas: ~65 / 73 / 79 dB).
     · Nivel con la propuesta = nivel de hoy + 10·log10(producto de factores de energía) con los factores de arriba (tráfico a Corabastos, viajes de compra
       más cortos, árboles) más dos de los controles del panel:
         velocidad máxima en calles de barrio (locales e intermedias): factor de energía (v/50)^0,8 → 40 km/h = −0,8 dB, 30 km/h = −1,8 dB. [SUP]
         horario de la carga de Corabastos: la carga de noche (6 a 11 p. m.) se pondera +5 dB (castigo nocturno tipo Lden, norma europea), repartida +2,5 dB,
         de día 0 dB; solo afecta la parte de camiones que sigue entrando, con el peso de cercanía a Corabastos. [SUP]
     · «Ruido promedio» = promedio de los niveles de todas las celdas de vía. Bandas: verde < 55, amarillo 55–65, naranja 65–70, rojo > 70 dB.
     Todo se precalcula una vez (flujo) y se rehace en milisegundos al mover un control; el mapa solo se repinta cuando algo cambia. */
  const LREF = [0, 60, 68, 74], BANDA = [55, 65, 70], BANDA_N = ['Verde · tranquilo', 'Amarillo · moderado', 'Naranja · ruidoso', 'Rojo · muy ruidoso'], BANDA_C = ['#3fbf6f', '#f2d338', '#f28c28', '#e0412f'];
  RM.LREF = LREF; RM.BANDA = BANDA; RM.BANDA_C = BANDA_C; RM.aj = { vel: 50, hor: 0 }; RM.vista = 'auto'; RM.niv = null; RM.fl = null; RM.densPre = 1; RM.arbPre = null;
  let pArb = 0; const precargarArboles = () => { if (pArb || window.KEN_PARCHES || typeof T3.lw !== 'function') return; pArb = 1; // los árboles de los parches se calculan aparte para que el panel dé lo mismo en «hoy» y en «propuesta» (la capa 3D solo se crea con la propuesta)
    Promise.all([import('./parches_arboles.js?v=7'), fetch('data3d/huertas_barrio.json?v=3').then(r => r.json()), fetch('data3d/parques.json').then(r => r.json())]).then(([m, HB, PQ]) => {
      const kA = (t) => { const h = Math.sin(t.x * 12.9898 + t.z * 78.233) * 43758.5453; return h - Math.floor(h); }; // la misma clave de densidad de parches_arboles.js
      RM.arbPre = m.calcularParches(HB, PQ, T3.lw, matchMedia('(pointer:coarse)').matches).flatMap(p => p.arboles).map(t => ({ x: t.x, z: t.z, k: kA(t) })); RM.ver++; }).catch(e => { pArb = 0; console.warn('árboles del ruido:', e); }); };
  RM.vistaEf = () => RM.vista === 'auto' ? (pro() ? 'pro' : 'hoy') : RM.vista;
  RM.flujo = () => { if (RM.fl || !RM.G) return; const TR = T3.TRAF; if (!TR || !TR.steps || !(TR.NS > 0) || typeof T3.lw !== 'function') return;
    const G = RM.G, o = T3.lw(0, 0), ox = o[0], oz = o[1], cnt = new Float32Array(G.nx * G.nz), F = RM.fl = { i: 0, falt: 0 };
    const paso = () => { const t0 = performance.now();
      while (F.i < TR.NS && performance.now() - t0 < 5) { const s = TR.steps[F.i++]; if (!s) { F.falt++; continue; } const ids = s.ids, xs = s.xs, ys = s.ys;
        for (let j = 0; j < ids.length; j++) { const i = Math.floor((xs[j] + ox - G.x0) / G.cs), k = Math.floor((oz - ys[j] - G.z0) / G.cs); if (i >= 0 && k >= 0 && i < G.nx && k < G.nz) cnt[k * G.nx + i] += (((ids[j] * 2654435761) >>> 0) / 4294967296 >= 0.92) ? 4 : 1; } }
      if (F.i < TR.NS) { setTimeout(paso, 12); return; }
      if (F.falt > TR.NS * 0.05) { RM.fl = null; return; } // el tráfico aún no bajó completo: se reintenta en la próxima pasada
      const sm = caja(cnt, G.nx, G.nz, 1, true), n = G.roads.length, por = [[], [], [], []]; for (let k = 0; k < n; k++) { const v = sm[G.roads[k]]; if (v > 0) por[G.clsR[k]].push(v); }
      const med = por.map(a => { if (!a.length) return 1; a.sort((x, y) => x - y); return a[a.length >> 1]; }); G.L0R = new Float32Array(n);
      for (let k = 0; k < n; k++) { const c = G.clsR[k], v = sm[G.roads[k]], d = v > 0 ? Math.max(-8, Math.min(5, 10 * Math.log10(v / med[c]))) : -8; G.L0R[k] = LREF[c] + d; }
      RM.ver++; };
    paso(); };
  // lo que se quita con los controles de Corabastos (mismas fórmulas del panel de flujo de carros, giro_sim.js) × la dependencia del escenario (KEEP)
  /* dependencia de Corabastos de la propuesta AL AÑO 10 (la fórmula de escenarios_sim.js: KEEP = 0,3 + 0,7·dep, KEEP_CAM = 0,1 + 0,9·dep): así el panel da el mismo resultado
     esté el mapa en «hoy» o en «propuesta» y sin depender del año de la línea de tiempo. [SUP] */
  const keepsPro = () => { const S = window.KEN_ESIM, A = T3.alivio; if (!A) return null; const e = SIMST.esc && SIMST.esc !== 'A' ? SIMST.esc : 'C', P = S && S.R && S.R.S1 && S.R.S1[e];
    if (P && P.dep) { const dep = P.dep[SEM - 1]; if (isFinite(dep)) return { KEEP: 0.3 + 0.7 * dep, KEEP_CAM: 0.1 + 0.9 * dep }; } return { KEEP: 0.72, KEEP_CAM: 0.64 }; };
  const redCS = (cs) => { const A = keepsPro(); if (!A) return { car: 0.4, cam: 0.7 }; if (!cs) return reduccionCora();
    const a = cs.cora / 100, b = cs.merc, c = cs.huer / 100;
    const quedaCar = (1 - a * 0.5) * (1 - Math.min(0.6, b * 0.012)) * (1 - c * 0.8), quedaCam = (1 - Math.min(0.85, a * 1.2)) * (1 - Math.min(0.4, b * 0.008)) * (1 - c * 0.3);
    return { car: 1 - quedaCar * A.KEEP, cam: 1 - quedaCam * A.KEEP_CAM }; };
  RM.camionesQueSiguen = (cs) => { const A = keepsPro(), c = cs || T3.coraCS; return c && A ? (1 - Math.min(0.85, c.cora / 100 * 1.2)) * (1 - Math.min(0.4, c.merc * 0.008)) * (1 - c.huer / 100 * 0.3) * A.KEEP_CAM : null; };
  const factores = (cs, aj) => { const r = redCS(cs), sc = 0.32 * (1 - r.cam) / (0.92 * (1 - r.car) + 0.32 * (1 - r.cam) + 1e-9), E = (pen) => (1 - sc) + sc * Math.pow(10, pen / 10);
    return { rE: (0.92 * r.car + 0.32 * r.cam) / 1.24, ts: TRIP_MAX * r.car, rho: E([5, 2.5, 0][aj.hor]) / E(5), esp: Math.pow(aj.vel / 50, 0.8) }; };
  const nivelCelda = (G, k, F, sinVeg) => { const p = G.pwR[k]; let e = (1 - F.rE * p) * (1 - F.ts * (1 - p)); if (!sinVeg) e *= 1 - G.vegR[k]; if (G.clsR[k] < 3) e *= F.esp; e *= 1 - p * (1 - F.rho);
    return G.L0R[k] + 10 * Math.log10(Math.max(1e-4, e)); };
  const mediaP = (G, F, sinVeg) => { let s = 0; const n = G.roads.length; for (let k = 0; k < n; k++) s += nivelCelda(G, k, F, sinVeg); return s / n; };
  const resumen = (G, L) => { const n = L.length, b = [0, 0, 0, 0]; let s = 0, sc = 0, nc = 0; for (let k = 0; k < n; k++) { const v = L[k]; s += v; b[v < BANDA[0] ? 0 : v < BANDA[1] ? 1 : v < BANDA[2] ? 2 : 3]++; if (G.pwR[k] >= 0.8) { sc += v; nc++; } }
    return { mean: s / n, pct: b.map(x => x / n * 100), cora: nc ? sc / nc : null, nCora: nc }; };
  RM.niveles = () => { const G = RM.G; if (!G || !G.L0R) return null; const cs = T3.coraCS, A = keepsPro(), aj = RM.aj;
    const sig = [RM.ver, A ? A.KEEP : 0, A ? A.KEEP_CAM : 0, cs ? cs.cora : '', cs ? cs.merc : '', cs ? cs.huer : '', aj.vel, aj.hor].join('|'); if (RM.niv && RM.niv.sig === sig) return RM.niv;
    const F = factores(cs, aj), n = G.roads.length, Lp = new Float32Array(n); for (let k = 0; k < n; k++) Lp[k] = nivelCelda(G, k, F);
    const hoy = resumen(G, G.L0R), prop = resumen(G, Lp), m = prop.mean, cs0 = cs || {};
    const ef = { cam: m - mediaP(G, factores(Object.assign({}, cs0, { cora: 0 }), aj)), merc: m - mediaP(G, factores(Object.assign({}, cs0, { merc: 0 }), aj)), arb: m - mediaP(G, F, true), vel: m - mediaP(G, factores(cs, Object.assign({}, aj, { vel: 50 }))), hor: m - mediaP(G, factores(cs, Object.assign({}, aj, { hor: 0 }))) };
    if (!cs) { ef.cam = 0; ef.merc = 0; }
    let sa = 0, na = 0; for (let k = 0; k < n; k++) if (G.vegR[k] > 0.02) { sa += nivelCelda(G, k, F) - nivelCelda(G, k, F, true); na++; } ef.arbLoc = na ? sa / na : 0; ef.arbPct = na / n * 100; // efecto de los árboles solo en las calles junto a un parche
    return RM.niv = { sig, Lp, hoy, prop, dif: m - hoy.mean, ef, nCelda: n }; };
  const ruidoZona = () => { RM.refrescar(); const A = T3.alivio, rp = A ? A.rampa : 0, c = RM.calc(pro() ? rp : 0), p = RM.calc(1); if (!c || !p) return null;
    const nv = RM.niveles(); if (nv) { const d = nv.dif; p.tot = d; p.pct = (1 - Math.pow(10, d / 10)) * 100; c.tot = pro() ? d : 0; c.pct = pro() ? p.pct : 0; } // el número total viene del modelo en dB absolutos (el mismo del panel de ruido)
    return { ahora: c, pleno: p }; };

  /* ---------- panel de ruido: calles de Kennedy hoy vs. propuesta, con controles que cambian el mapa ---------- */
  const mas = (v, d = 1) => { const u = d > 1 ? 0.004 : 0.049; return (v < -u ? '−' : v > u ? '+' : '') + fmt(Math.abs(v), d); };
  const traduce = (d) => { const a = Math.abs(d); if (a < 0.05) return 'Sin cambio: las calles suenan igual que hoy.';
    const pct = (1 - Math.pow(10, -a / 10)) * 100, fuerte = Math.pow(2, -a / 10) * 100, que = a < 1 ? 'un cambio casi imperceptible para el oído' : a < 3 ? 'un cambio que se nota poco' : a < 6 ? 'un cambio que se nota con claridad' : 'un cambio muy notorio';
    return d < 0 ? `<b>${mas(d)} dB</b> = ${fmt(pct)} % menos de energía sonora en promedio; al oído suena al ${fmt(fuerte)} % de lo de hoy: ${que}.` : `<b>${mas(d)} dB</b> = ${fmt(pct)} % más de energía sonora en promedio: ${que}.`; };
  const SLIDERS = [
    { k: 'cam', t: 'Camiones que siguen entrando a Corabastos', min: 5, max: 100, step: 1, ter: 'Menos camiones en la Av. Ciudad de Cali y en las vías hasta 2,6 km de Corabastos.', v: () => { const q = RM.camionesQueSiguen(); return q == null ? null : Math.round(q * 100); }, f: (v) => v + ' %' },
    { k: 'merc', t: 'Mercados de barrio', min: 0, max: 40, step: 1, ter: 'Se compra cerca de casa: menos viajes largos de carros en todas las calles.', v: () => T3.coraCS ? T3.coraCS.merc : null, f: (v) => v + ' mercados' },
    { k: 'arb', t: 'Árboles nuevos (densidad de parches)', min: 15, max: 100, step: 5, ter: 'Los parches de árboles y el parque humedal absorben parte del sonido.', v: () => { const K = window.KEN_PARCHES; return Math.round((K && K.dens != null ? K.dens : RM.densPre) * 100); }, f: (v) => v + ' %' },
    { k: 'vel', t: 'Velocidad máxima en calles de barrio', min: 30, max: 50, step: 10, ter: 'Solo calles locales e intermedias; las avenidas no cambian.', v: () => RM.aj.vel, f: (v) => v + ' km/h' },
    { k: 'hor', t: 'Horario de la carga de Corabastos', min: 0, max: 2, step: 1, ter: 'La carga de noche pesa más para el oído que la de día.', v: () => RM.aj.hor, f: (v) => ['De noche (como hoy)', 'Repartida', 'De día'][v] }];
  const setCS = (k, v) => { const i = document.querySelector(`#gs-csl input[data-k="${k}"]`); if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } else if (T3.coraCS) { T3.coraCS[k] = v; dispatchEvent(new Event('cora-cambio')); } };
  const APLICA = {
    cam(v) { const cs = T3.coraCS, A = keepsPro(); if (!cs || !A) return; const x = (v / 100) / (A.KEEP_CAM * (1 - Math.min(0.4, 0.008 * cs.merc)) * (1 - 0.3 * cs.huer / 100)); setCS('cora', Math.max(0, Math.min(60, Math.round((1 - x) / 1.2 * 100)))); }, // se invierte la fórmula de «Corabastos reducido»
    merc(v) { setCS('merc', v); },
    arb(v) { const d = Math.max(0.15, v / 100), K = window.KEN_PARCHES, i = document.querySelector('#esim input[data-k="arboles"]');
      if (pro() && i) { i.value = d; i.dispatchEvent(new Event('input', { bubbles: true })); } // mismo control del panel de escenarios: se mueven juntos
      else { RM.densPre = d; if (K && K.densidad) K.densidad(d); if (i) { i.value = d; const o = document.querySelector('#esim output[data-o="arboles"]'); if (o) o.textContent = fmt(d, 2); } RM.arbPend = d; }
      setTimeout(ruido, 30); },
    vel(v) { RM.aj.vel = v; ruido(); }, hor(v) { RM.aj.hor = v; ruido(); } };
  let cmpT = 0; const paraCmp = () => { clearInterval(cmpT); cmpT = 0; };
  function construirRuido(cu) {
    cu.dataset.ok = '1';
    cu.innerHTML = `<div class="rui-big"><div class="rui-c"><small>Hoy</small><b data-h>–</b><span>dB</span></div><i class="rui-ar">→</i><div class="rui-c p"><small>Con la propuesta</small><b data-p>–</b><span>dB</span></div><div class="rui-d"><small>Cambio</small><b data-d>–</b><span>dB</span></div></div>
      <p class="rui-tr" data-tr>Calculando el tráfico de la simulación…</p>
      <div class="rui-bars"><div><small>Hoy</small><div class="bb" data-bh></div></div><div><small>Propuesta</small><div class="bb" data-bp></div></div></div>
      <div class="rui-ley" data-ley></div>
      <p class="rui-cora" data-cora></p>
      <div class="rui-vis"><span>Ver en el mapa</span><div class="seg" role="group" aria-label="Qué ver en el mapa"><button type="button" data-v="hoy">Hoy</button><button type="button" data-v="pro">Propuesta</button><button type="button" data-v="dif">Diferencia</button></div><button type="button" class="cmp" data-cmp aria-pressed="false">Comparar</button></div>
      <div class="rui-mley" data-mley></div>
      <details class="rui-det" data-dc ${innerWidth > 760 ? 'open' : ''}><summary>Mueve los controles y mira cómo cambia el mapa</summary>${SLIDERS.map(s => `<div class="rui-s" data-s="${s.k}"><div class="t"><span>${s.t}</span><b data-o></b></div><input type="range" min="${s.min}" max="${s.max}" step="${s.step}" aria-label="${s.t}"><div class="e"><span data-ef></span><em>${s.ter}</em></div></div>`).join('')}</details>
      <div class="rui-av" data-av></div>
      <details class="rui-det"><summary>Cómo se calcula</summary><p class="rui-nota">Cada calle recibe un nivel en dB(A): referencia por tipo de vía (local 60, intermedia 68, principal 74) más la diferencia según el tráfico de la simulación en esa calle (un camión = 4 carros). Con la propuesta se suman: menos carros y camiones hacia Corabastos (hasta 2,6 km), viajes de compra más cortos por los mercados de barrio, árboles que absorben sonido, velocidad máxima en calles de barrio (30 km/h: −1,8 dB) y horario de carga (de noche pesa +5 dB). El mapa muestra el promedio del día; no cambia con el reloj. Todas son cifras de trabajo para discutir. [SUP]</p></details>`;
    cu.addEventListener('input', (ev) => { const i = ev.target, b = i.closest('[data-s]'); if (!b) return; const k = b.dataset.s, s = SLIDERS.find(q => q.k === k); b.dataset.mov = '1'; b.querySelector('[data-o]').textContent = s.f(+i.value); APLICA[k](+i.value); });
    cu.addEventListener('change', (ev) => { const b = ev.target.closest('[data-s]'); if (b) delete b.dataset.mov; });
    cu.addEventListener('click', (ev) => { const bt = ev.target.closest('button'); if (!bt) return;
      if (bt.dataset.v) { paraCmp(); RM.vista = bt.dataset.v; ruido(); }
      else if (bt.dataset.cmp !== undefined) { if (cmpT) { paraCmp(); } else { RM.vista = RM.vistaEf() === 'pro' ? 'hoy' : 'pro'; cmpT = setInterval(() => { if (!document.getElementById('ruido-panel')) { paraCmp(); return; } RM.vista = RM.vistaEf() === 'pro' ? 'hoy' : 'pro'; ruido(); }, 1800); } ruido(); }
      else if (bt.dataset.ru !== undefined) { const m = T3.alivio && T3.alivio.mid; if (m) volar(m, 700); } });
  }
  function ruido() {
    const el = document.getElementById('ruido-panel'), cu = el && el.querySelector('.rui-cu'); if (!cu) { paraCmp(); return; }
    if (!cu.dataset.ok) construirRuido(cu);
    precargarArboles(); RM.refrescar(); const nv = RM.niveles(), q = (s) => cu.querySelector(s), ve = RM.vistaEf();
    cu.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.v === ve)); const cb = q('[data-cmp]'); cb.classList.toggle('on', !!cmpT); cb.textContent = cmpT ? 'Detener comparación' : 'Comparar'; cb.setAttribute('aria-pressed', cmpT ? 'true' : 'false');
    const r = ruidoCali(), av = q('[data-av]'); av.innerHTML = r ? `Av. Ciudad de Cali: <b>${mas(r.db)} dB</b> con la propuesta (${fmt(r.veh)} % menos vehículos, medido en la simulación). <button type="button" class="ci-ir" data-ru>Ver la avenida →</button>` : '';
    if (!nv) { const F = RM.fl, N = T3.TRAF && T3.TRAF.NS; q('[data-tr]').textContent = 'Calculando el tráfico de la simulación' + (F && N ? ' · ' + Math.round(F.i / N * 100) + ' %' : '…'); return; }
    q('[data-h]').textContent = fmt(nv.hoy.mean, 1); q('[data-p]').textContent = fmt(nv.prop.mean, 1); const dd = q('[data-d]'); dd.textContent = mas(nv.dif); dd.className = nv.dif < -0.049 ? 'bien' : nv.dif > 0.049 ? 'mal' : '';
    q('[data-tr]').innerHTML = traduce(nv.dif) + ' <span>Guía: −3 dB = la mitad de la energía sonora; −10 dB = se oye la mitad de fuerte.</span>';
    const bar = (st) => st.pct.map((p, i) => `<i style="width:${p.toFixed(1)}%;background:${BANDA_C[i]}" title="${BANDA_N[i]}: ${fmt(p)} %"></i>`).join(''); q('[data-bh]').innerHTML = bar(nv.hoy); q('[data-bp]').innerHTML = bar(nv.prop);
    const RAN = ['menos de 55 dB', '55 a 65 dB', '65 a 70 dB', 'más de 70 dB']; q('[data-ley]').innerHTML = '<div class="h"><span>% de las calles en cada rango</span><span>hoy → propuesta</span></div>' + BANDA_N.map((n, i) => `<div class="f"><i style="background:${BANDA_C[i]}"></i><span>${n.split(' · ')[0]} <small>${RAN[i]}</small></span><b>${fmt(nv.hoy.pct[i])} % → ${fmt(nv.prop.pct[i])} %</b></div>`).join('');
    q('[data-cora]').innerHTML = nv.hoy.cora != null ? `<b>Cerca de Corabastos (hasta 1 km):</b> ${fmt(nv.hoy.cora, 1)} → ${fmt(nv.prop.cora, 1)} dB (${mas(nv.prop.cora - nv.hoy.cora)} dB). Es donde más cambia; el promedio de toda la localidad lo diluye.` : '';
    SLIDERS.forEach(s => { const b = q(`[data-s="${s.k}"]`), i = b.querySelector('input'), v = s.v(), e = nv.ef[s.k]; b.hidden = v == null && s.k !== 'vel' && s.k !== 'hor'; if (v != null && !b.dataset.mov && document.activeElement !== i) { i.value = v; b.querySelector('[data-o]').textContent = s.f(v); }
      const ef = b.querySelector('[data-ef]'); ef.textContent = s.k === 'arb' ? `aporta ${mas(e, 2)} dB en promedio · ${mas(nv.ef.arbLoc)} dB en las ${fmt(nv.ef.arbPct)} % de calles junto a un parche` : Math.abs(e) < 0.05 ? 'sin efecto con este valor' : `aporta ${mas(e)} dB`; const ee = s.k === 'arb' ? nv.ef.arbLoc : e; ef.className = ee < -0.049 ? 'bien' : ee > 0.049 ? 'mal' : ''; });
    const ml = q('[data-mley]'); ml.innerHTML = ve === 'dif' ? '<div class="g d"></div><div class="l"><span>−6 dB o más</span><span>−3</span><span>sin cambio</span></div>' : `<div class="g">${BANDA_C.map(c => `<i style="background:${c}"></i>`).join('')}</div><div class="l"><span>&lt; 55</span><span>55–65</span><span>65–70</span><span>&gt; 70 dB</span></div>`;
  }
  /* ---------- usos: Bavaria cambia de uso y aparece la agricultura urbana ---------- */
  let usosPend = 0;
  async function usos(forzar) {
    const bt = document.getElementById('us-btn'); if (!bt || !bt.classList.contains('on')) return;
    if (forzar) { try { const m = await import('./usos_suelo.js?v=7'); m.pintarModelos({ THREE: T3.THREE, T3, on: true }); } catch (e) { console.warn('usos:', e); } }
    const el = document.getElementById('usos-panel'); if (!el) return;
    let x = el.querySelector('.ci-us'); if (!x) { x = document.createElement('div'); x.className = 'ci-us'; x.style.cssText = 'margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);font-size:11px'; el.appendChild(x); }
    const h = HA_HUERTAS(), tot = h.barrio + h.bavaria + h.techos;
    x.innerHTML = `<div style="letter-spacing:.14em;font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:6px">${pro() ? 'CON LA PROPUESTA CAMBIA' : 'SI SE HACE LA PROPUESTA'}</div>
      <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center">
      <span style="width:10px;height:10px;border-radius:2px;background:#7b2d8e"></span><span>Bavaria: <b>industrial</b> → <b style="color:#7fb3d5">dotacional y educativo</b> (escuela, laboratorios, mercado)</span>
      <span style="width:10px;height:10px;border-radius:2px;background:#59a14f"></span><span><b>Agricultura urbana: +${fmt(tot, 1)} ha</b> (${fmt(h.barrio, 1)} ha en parques y lotes, ${fmt(h.bavaria, 1)} ha en Bavaria, ${fmt(h.techos, 1)} ha en techos)</span>
      <span style="width:10px;height:10px;border-radius:2px;background:#e63946"></span><span>Comercio de barrio: los mercados de barrio reciben lo que antes se compraba en Corabastos</span></div>
      <div class="ci-por"><b>Por qué:</b> el suelo industrial ocioso pasa a enseñar a producir alimento; los parques y techos producen sin quitarle espacio a nadie.</div>`;
  }
  /* ---------- indicadores: hoy -> propuesta ---------- */
  function indicadores() {
    const der = document.querySelector('#esim .cuerpo'), S = window.KEN_ESIM; if (!der || !S || !S.R) return; // un solo panel: los indicadores van en el de escenarios
    let x = document.getElementById('ci-ind'); if (!x) { x = document.createElement('div'); x.id = 'ci-ind'; der.prepend(x); const k = der.querySelector('[data-kpi]'); if (k) k.style.display = 'none'; }
    const R = S.R, e = pro() ? SIMST.esc : 'C', t = Math.max(0, Math.min(SEM - 1, Math.floor(SIMST.t))), A = R.S1.A, P = R.S1[e], A2 = R.S2.A, P2 = R.S2[e], A3 = R.S3.A, P3 = R.S3[e], ru = ruidoCali(), zr = ruidoZona();
    let ii = 0; const IR = ['huertas', 'trafico', 'trafico', 'trafico', 'trafico', 'compost', 'humedal', null];
    const CP = e === 'B' ? '#b07aa1' : '#e2a55b'; // color del escenario de la propuesta (el mismo del tablero)
    // raw = [hoy, propuesta] en números: dos barritas en la misma escala para ver la diferencia de un vistazo
    const fila = (n, hoy, prop, mejor, por, raw) => { const ir = IR[ii++]; let br = '';
      if (raw && pro() && raw.every(v => isFinite(v) && v >= 0)) { const m = Math.max(raw[0], raw[1], 1e-9), w = (v) => Math.max(2, v / m * 100).toFixed(1); br = `<i class="br"><b style="width:${w(raw[0])}%;background:#8fb0c9"></b><b style="width:${w(raw[1])}%;background:${CP}"></b></i>`; }
      return `<div class="r"><span>${n}</span><b>${hoy}</b><strong class="${pro() ? (mejor ? 'bien' : 'mal') : ''}">${pro() ? prop : '–'}</strong>${br}<small>${por}${ir ? ` <button type="button" class="ci-ir" data-ir="${ir}">Ver en el mapa →</button>` : ''}</small></div>`; };
    x.innerHTML = `<div class="h"><span>Indicadores · ${2026 + Math.floor(t / AÑO) + 1}</span><span><i class="lg" style="background:#8fb0c9"></i>hoy → <i class="lg" style="background:${CP}"></i>propuesta ${pro() ? e : ''}</span></div>` +
      fila('Hogares con huerta', fmt(A.act[t]), fmt(P.act[t]), true, 'Bavaria forma promotores que abren y acompañan huertas.', [A.act[t], P.act[t]]) +
      fila('Dependencia de Corabastos', fmt(A.dep[t] * 100) + ' %', fmt(P.dep[t] * 100) + ' %', true, 'Huertas y compras directas a la región abastecen tiendas y comedores.', [A.dep[t], P.dep[t]]) +
      fila('Vehículos en la Av. Ciudad de Cali', '100 %', ru ? fmt(100 - ru.veh) + ' %' : '–', true, 'Menos viajes de carga y de compra hacia Corabastos.', ru ? [100, 100 - ru.veh] : null) +
      fila('Ruido en la Av. Ciudad de Cali', '0 dB', ru ? fmt(ru.db, 1) + ' dB' : '–', true, 'Menos camiones: el ruido baja con el tráfico pesado.') +
      fila('Ruido medio en las calles de Kennedy', '0 dB', zr ? fmt(zr.ahora.tot, 1) + ' dB' : '–', true, 'Menos tráfico a Corabastos, viajes de compra más cortos y más árboles en parques, huertas y parque humedal. [SUP]') +
      fila('Orgánicos que vuelven a la tierra', fmt(A2.pct[t], 1) + ' %', fmt(P2.pct[t], 1) + ' %', true, 'Se compostan en el barrio o en Bavaria en vez de ir a Doña Juana.', [A2.pct[t], P2.pct[t]]) +
      fila('Aves en el humedal El Burro', fmt(A3.aves[t]), fmt(P3.aves[t]), P3.aves[t] >= A3.aves[t], 'Las huertas con corredores unen parches de hábitat.', [A3.aves[t], P3.aves[t]]) +
      fila('Pasajes nuevos (sintaxis)', '0', String(sx().pas), true, 'Abrir Bavaria une barrios que hoy lo rodean.');
  }
  /* ---------- tarjeta al cambiar a la propuesta ---------- */
  let tToast = 0;
  function tarjeta() {
    let el = document.getElementById('ci-toast'); if (!el) { el = document.createElement('div'); el.id = 'ci-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    if (!pro()) { el.classList.remove('on'); return; }
    const ru = ruidoCali(), h = HA_HUERTAS(), s = sx(), zz = ruidoZona();
    el.innerHTML = `<button type="button" aria-label="Cerrar">×</button><h4>Con la propuesta cambia, a la izquierda:</h4><ul>
      <li><b>Sintaxis:</b> ${s.pas} pasajes abren Bavaria; las calles hacia los mercados de barrio y las huertas ganan elección y las de camiones a Corabastos pierden.</li>
      <li><b>Ruido:</b> la Av. Ciudad de Cali ${ru ? `baja ${fmt(Math.abs(ru.db), 1)} dB` : 'baja'} con menos tráfico a Corabastos${zz ? `; las calles de Kennedy ${fmt(Math.abs(zz.pleno.tot), 1)} dB en promedio, con árboles y viajes de compra más cortos` : ''}.</li>
      <li><b>Usos:</b> Bavaria pasa de industrial a educativo y aparecen ${fmt(h.barrio + h.bavaria + h.techos, 1)} ha de agricultura urbana.</li>
      <li><b>Indicadores:</b> la tabla de la derecha compara hoy con la propuesta.</li></ul>`;
    el.style.left = innerWidth > 760 && document.getElementById('ruido-panel') ? '404px' : ''; // si el panel de ruido está abierto, la tarjeta se corre a su derecha
    el.classList.add('on'); el.querySelector('button').onclick = () => el.classList.remove('on'); clearTimeout(tToast); tToast = setTimeout(() => el.classList.remove('on'), 12000);
  }
  const todo = () => { sintaxis(); ruido(); usos(false); indicadores(); };
  addEventListener('escenario', () => { paraCmp(); RM.vista = 'auto'; setTimeout(() => { // al cambiar de escenario el mapa de ruido vuelve a seguirlo; si se movió «árboles» estando en «hoy», se pasa al panel de escenarios
    if (pro() && RM.arbPend != null) { const i = document.querySelector('#esim input[data-k="arboles"]'); if (i) { i.value = RM.arbPend; i.dispatchEvent(new Event('input', { bubbles: true })); } RM.arbPend = null; }
    usos(true); todo(); tarjeta(); }, 400); });
  addEventListener('sim-cambio', () => setTimeout(indicadores, 50));
  addEventListener('cora-cambio', () => setTimeout(() => { ruido(); indicadores(); }, 90)); // sliders de Corabastos / densidad de árboles: el número de ruido baja en vivo
  document.addEventListener('click', (ev) => { if (ev.target.closest('#us-btn,#rc-btn,#gs-capa button')) setTimeout(() => { usos(true); todo(); }, 700); });
  setInterval(todo, 1200);
}
