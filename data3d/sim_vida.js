/* ============ SIMULACIÓN SIN FIN («juego de la vida» de la propuesta) ============
   Los mismos modelos SIM-01 (comida), SIM-02 (orgánicos) y SIM-03 (aves y humedal) de data3d/sim_modelos.js, pero escritos como una
   REGLA DE PASO: el estado de la semana siguiente sale SOLO del estado de esta semana, de los parámetros (PAR) y del azar. No hay año final:
   se puede correr 10, 100 o 1000 años. La memoria no crece sin límite: la historia se guarda submuestreada (cuando pasa de 600 puntos se
   queda con uno de cada dos).
   · AZAR HONESTO: todas las perturbaciones salen de un generador con semilla (mulberry32). Con la misma semilla, A, B y C viven EXACTAMENTE
     las mismas sequías, bloqueos y recortes (el «mundo» usa su propio generador, con el mismo número de sorteos por semana en los tres).
   · REGLAS DE COLAPSO: fijas (REGLAS), declaradas antes de correr y las mismas para A, B y C.
   Este archivo no toca el DOM: lo usan el panel del mapa (escenarios_sim.js) y el trabajador del modo «Evaluar» (sim_vida_worker.js).
   Cada supuesto que no viene del documento está marcado [SUP]. */
import { ORG_PC, DIST_DJ, REND_COMP, RIQ_BURRO, CRECE } from './sim_modelos.js?v=4';
export const AÑO = 52, POB_K = 1037929; // ASIS Kennedy 2024 (fuentes.json)
export const ARRANQUE = 156; // [SUP] las reglas empiezan a contar en el año 3: es el tiempo de montaje del documento (superficies en ~3 años)

/* ---------- generador con semilla ---------- */
export function prng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mezcla = (s, k) => (Math.imul(s >>> 0, 2654435761) ^ Math.imul(k + 1, 40503) ^ 0x9E3779B9) >>> 0;
const normal = (r) => { const u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const ruido = (r, sd) => Math.max(0, 1 + sd * normal(r));
const poisson = (r, m) => { if (m <= 0) return 0; if (m > 30) return Math.max(0, Math.round(m + Math.sqrt(m) * normal(r))); let L = Math.exp(-m), k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
const binom = (r, n, p) => { n = Math.round(n); if (n <= 0 || p <= 0) return 0; if (n < 60) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; } const m = n * p; return Math.max(0, Math.min(n, Math.round(m + Math.sqrt(m * (1 - p)) * normal(r)))); };
const haz = (pAño) => 1 - Math.pow(1 - pAño, 1 / AÑO); // probabilidad por año -> por semana
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- PERTURBACIONES AL AZAR (probabilidad por año, declaradas) ----------
   dur = semanas que dura (se sortea entre los dos números); sin dur = golpe de una vez con fuerza sorteada. */
export const EVENTOS = [
  { k: 'sequia', n: 'Sequía (año seco, también para el humedal)', pAño: 0.15, dur: [16, 40], ef: 'rinde 55 %, el doble de abandono, el humedal se recupera menos' }, // [SUP] El Niño ~1 de cada 5-7 años en la Sabana
  { k: 'bloqueo', n: 'Bloqueo o paro del mayorista', pAño: 0.10, dur: [2, 8], ef: 'precio de Corabastos ×1,6 y más solicitudes a la red' }, // [SUP] paros 2021, bloqueos de vías
  { k: 'pico', n: 'Pico de precios de los alimentos', pAño: 0.12, dur: [13, 39], ef: 'más hogares quieren sembrar (adopción ×1,6)' }, // [SUP]
  { k: 'falla', n: 'Falla de la planta o de las estaciones de compost', pAño: 0.10, dur: [4, 16], ef: 'capacidad al 30 % en C (una sola planta) y al 85 % en B (8 estaciones)' }, // [SUP]
  { k: 'baldios', n: 'Pérdida de lotes (revocación de baldíos)', pAño: 0.04, ef: 'se pierde entre 15 % y 35 % de los lotes; solo B y C (los huerteros de hoy siembran en su casa)' }, // [SUP]
  { k: 'abandono', n: 'Ola de abandono (mudanzas, desempleo)', pAño: 0.08, ef: 'se va entre 5 % y 20 % de los hogares con huerta' }, // [SUP]
  { k: 'vertido', n: 'Relleno o vertimiento ilegal en el humedal', pAño: 0.06, ef: 'la integridad del humedal cae entre 3 y 10 puntos' }, // [SUP]
  { k: 'promotores', n: 'Llegan promotores de fuera (universidad, ONG)', pAño: 0.08, ef: 'una cohorte extra de formación en Bavaria' } // [SUP]
];
export const P_RECORTE = 0.30;  // [SUP] cada cambio de administración (cada 4 años) puede cortar el programa de formación: igual para B y C
export const P_RESTAURA = 0.25; // [SUP] probabilidad por año de que el programa cortado vuelva (presión de la comunidad)
export const NOMBRE_EV = Object.fromEntries([...EVENTOS.map(E => [E.k, E.n]), ['recorte', 'Recorte del programa (cambio de administración)'], ['restaura', 'El programa vuelve'],
  ['sequia_f', 'Sequía forzada (estrés del panel)'], ['bloqueo_f', 'Bloqueo forzado (estrés del panel)'], ['baldios_f', 'Revocación de baldíos forzada (estrés del panel)']]);
const DISRUPTIVOS = { sequia: 'act', sequia_f: 'act', baldios: 'act', baldios_f: 'act', abandono: 'act', recorte: 'act', falla: 'desv', vertido: 'W' }; // qué indicador mide la recuperación

/* ---------- REGLAS DE COLAPSO (fijas, iguales para A, B y C; no se editan durante la corrida) ---------- */
export const REGLAS = [
  { k: 'huertas', n: 'Huertas', txt: 'menos de 500 hogares con huerta', sem: 26, malo: (o) => o.act < 500, val: (o) => o.act, umbral: 500, sentido: -1 }, // [SUP] hoy hay ~300 huerteros sin apoyo
  { k: 'corabastos', n: 'Corabastos', txt: 'dependencia de Corabastos de 97 % o más (hoy ≈ 99,8 %)', sem: 26, malo: (o) => o.dep >= 0.97, val: (o) => o.dep * 100, umbral: 97, sentido: 1 },
  { k: 'residuos', n: 'Residuos', txt: '97 % o más de los orgánicos al relleno, o el compost se desborda (rechaza más del 30 %)', sem: 26, malo: (o) => o.relleno / o.gen >= 0.97 || o.rech > 0.3, val: (o) => o.relleno / o.gen * 100, umbral: 97, sentido: 1 },
  { k: 'humedal', n: 'Humedal', txt: 'integridad del humedal El Burro por debajo de 27 % (la mitad de la de hoy)', sem: 52, malo: (o) => o.hum < 27, val: (o) => o.hum, umbral: 27, sentido: -1 },
  { k: 'red', n: 'Red de promotores', txt: 'ningún promotor activo: la red no se reproduce', sem: 52, malo: (o) => o.prom < 1, val: (o) => o.prom, umbral: 1, sentido: -1 }
];

const BASE = { A: { N: 300, q: 0.0025, A0: 120, p0: 0 }, B: { N: 2506, q: 0.0073, A0: 60, p0: 6 }, C: { N: 5400, q: 0.0073, A0: 60, p0: 6 } };

export function crear(e, seed) {
  const b = BASE[e];
  return { e, seed, t: -1, mundo: prng(mezcla(seed, 1)), loc: prng(mezcla(seed, 11 + 'ABC'.indexOf(e))),
    A: b.A0, prom: b.p0, pipe: [], cola: 0, pob: POB_K, Nef: b.N, supF: 0, regF: 0, prog: e !== 'A', baldF: false,
    ev: { sequia: 0, bloqueo: 0, pico: 0, falla: 0 }, log: [],
    adopc: 0.15, buf: new Float64Array(64), W: 0.55, B: 900, muertes: 0,
    o: {}, racha: Object.fromEntries(REGLAS.map(R => [R.k, 0])), colapso: null,
    ema: { act: b.A0, desv: 0, W: 0.55 }, rec: { pend: null, n: 0, suma: 0, ult: null, fallidas: 0 },
    H: { paso: 13, t: [], act: [], dep: [], pers: [], hum: [], prom: [], rell: [] } };
}

const anotar = (s, k, extra) => { s.log.push({ t: s.t, k, extra }); if (s.log.length > 12) s.log.shift();
  const ind = DISRUPTIVOS[k]; if (ind && !s.rec.pend && s.t >= 8) { const pre = s.ema[ind]; if (pre > (ind === 'W' ? 0.05 : 5)) s.rec.pend = { t0: s.t, k, ind, pre }; } };

/* ---------- UNA SEMANA: estado -> estado ---------- */
export function paso(s, PAR) {
  const { P1, P2, P3 } = PAR, e = s.e, t = ++s.t, prop = e !== 'A', b = BASE[e], o = s.o, M = s.mundo, L = s.loc;
  // 1 · el mundo: mismo número de sorteos cada semana (así A, B y C con la misma semilla viven los mismos eventos)
  for (const E of EVENTOS) { const u = M(), v = M(); if (u >= haz(E.pAño)) continue;
    if (E.dur) { if (!s.ev[E.k]) { s.ev[E.k] = Math.round(E.dur[0] + v * (E.dur[1] - E.dur[0])); anotar(s, E.k, s.ev[E.k]); } continue; }
    if (E.k === 'baldios') { if (prop) { const x = 0.15 + 0.2 * v; s.Nef *= 1 - x; s.A = Math.min(s.A, s.Nef) * (1 - x * 0.5); s.supF *= 1 - x; anotar(s, 'baldios', x); } }
    else if (E.k === 'abandono') { const x = 0.05 + 0.15 * v; s.A *= 1 - x; anotar(s, 'abandono', x); }
    else if (E.k === 'vertido') { const x = 0.03 + 0.07 * v; s.W = Math.max(0.05, s.W - x); anotar(s, 'vertido', x); }
    else if (E.k === 'promotores') { if (prop) { s.pipe.push([t + P1.retardo, P1.cupos]); anotar(s, 'promotores', P1.cupos); } } }
  const ug = M(), ur = M();
  if (prop) { if (t % 208 === 207 && s.prog && ug < P_RECORTE) { s.prog = false; anotar(s, 'recorte'); } else if (!s.prog && ur < haz(P_RESTAURA)) { s.prog = true; anotar(s, 'restaura'); } }
  // estreses forzados del panel (además del azar; iguales para los tres escenarios)
  if (P1.sequia && t === 150) { s.ev.sequia = Math.max(s.ev.sequia, 50); anotar(s, 'sequia_f', 50); }
  if (P1.bloqueo && t === 260) { s.ev.bloqueo = Math.max(s.ev.bloqueo, 30); anotar(s, 'bloqueo_f', 30); }
  if (P1.baldios && t === 300 && prop) { s.Nef *= 0.65; s.A *= 0.7; s.supF *= 0.7; anotar(s, 'baldios_f', 0.35); }
  const seco = s.ev.sequia > 0, bloq = s.ev.bloqueo > 0, pico = s.ev.pico > 0, falla = s.ev.falla > 0;
  if (P1.crece) s.pob *= Math.pow(CRECE, 1 / AÑO);
  if (prop && s.prog && s.Nef < b.N) s.Nef = Math.min(b.N, s.Nef + b.N * 0.05 / AÑO); // [SUP] con programa se negocian lotes nuevos (5 %/año)

  /* ---- SIM-01 · promotores, hogares, comida ---- */
  if (prop) { if (s.prog && t % 13 === 0) s.pipe.push([t + P1.retardo, P1.cupos]); // Bavaria forma una cohorte por trimestre si hay programa
    while (s.pipe.length && s.pipe[0][0] <= t) s.prom += s.pipe.shift()[1]; }
  let m2p = s.prom >= 1 ? s.A * 50 / s.prom : Infinity;
  const cal = !prop ? 0.55 : isFinite(m2p) ? Math.max(0.45, Math.min(1, P1.c / m2p)) : 0.45; // G5 · sin acompañamiento rinde como hoy [SUP]
  const carga = !prop ? 1.2 : isFinite(m2p) ? Math.min(3, m2p / P1.c) : 3;
  const alivio = e === 'C' ? Math.max(0.35, 1 - 6 / P1.rotacion * 0.6) : 1;
  if (prop) {
    // [SUP] HIPÓTESIS DE C: con vocerías rotativas, los hogares forman a otros promotores (P1.pares, por defecto 3 por cada 10.000 hogares por semana); en B casi no (0,8)
    const nuevos = poisson(L, s.A * (e === 'C' ? (P1.pares != null ? P1.pares : 3) : 0.8) / 1e4 * cal * (s.prom >= 1 ? 1 : 0.5));
    const h = (1 / 260) * (1 + 1.5 * Math.max(0, carga - 1)) * (e === 'C' ? (0.6 + 0.4 * alivio) : 1); // [SUP] un promotor dura ~5 años; se quema si acompaña demasiados m²
    s.prom = Math.max(0, s.prom + nuevos - binom(L, s.prom, Math.min(1, h)));
    m2p = s.prom >= 1 ? s.A * 50 / s.prom : Infinity;
  }
  const Nef = Math.max(1, s.Nef);
  const p = !prop ? 0.0002 : s.prom >= 1 ? Math.max(0.00058, (P1.cupos / 13) * P1.alcance / Nef) : 0.0002;   // G4 (Bass)
  const adop = Math.max(0, (p + b.q * s.A / Nef) * (Nef - s.A)) * (pico ? 1.6 : 1) * (seco ? 0.5 : 1) * ruido(L, 0.3);
  const lam = adop * 0.3 + s.A * 0.002 + (bloq ? 3 : 0);                                                         // G6
  const perdida = Math.min(0.5, 0.15 * 12 / P1.rotacion), mu = !prop ? 0 : (e === 'B' ? P1.mu : 4 * (P1.mu * 0.6) * (1 - perdida)) * (s.prom >= 1 ? 1 : 0.2);
  let espera = null; if (prop) { s.cola = Math.max(0, s.cola + lam - mu); espera = lam < mu && s.cola < 1 ? 1 / (mu - lam) : (s.cola + lam) / Math.max(0.1, mu); }
  const fEsp = prop && espera > 12 ? 1 + Math.min(1, (espera - 12) / 24) : 1; // [SUP] si la decisión tarda más de 3 meses, la gente se cansa
  const retiro = s.A * 0.0018 * (1 + 3 * Math.max(0, carga - 1)) * alivio * (seco ? 2 : 1) * fEsp * ruido(L, 0.3); // G7
  s.A = cl(s.A + adop - retiro, 0, Nef);
  if (prop) { s.supF = s.prom >= 1 ? Math.min(1, s.supF + 1 / 156) : Math.max(0, s.supF - 1 / 104); // [SUP] parques, techos y Bavaria: se montan en 3 años, sin promotores se abandonan en 2
    const acopio = s.prom >= 5 || s.A >= 1000; s.regF = acopio ? Math.min(1, s.regF + 1 / 208) : Math.max(0, s.regF - 1 / 104); } // [SUP] compras a la región: 4 años en armarse, 2 en deshacerse
  const sup = prop ? P1.sup * s.supF * (e === 'B' ? 0.6 : 1) : 0;
  const prod = (s.A * 50 + sup) * P1.rend / AÑO * (seco ? 0.55 : 1) * cal;                                      // G1
  const auto = prod * P1.auto; let merma = prod * P1.merma, exc = prod - auto - merma;
  if (prop && exc > P1.acopio) { merma += exc - P1.acopio; exc = P1.acopio; }
  if (!prop) { merma += exc * 0.5; exc *= 0.5; }
  const pers = prod * AÑO * 0.9 / (0.4 * 365);                                                                    // G2
  const reg = prop ? P1.regional * s.regF * (e === 'B' ? 0.6 : 1) * (bloq ? 1.1 : 1) : 0;
  const dep = Math.max(0, 1 - pers / P1.zona - reg);                                                              // G3
  const pc = 3000 * (bloq ? 1.6 : 1) * (pico ? 1.3 : 1) * (1 - P1.reac * Math.min(1, pers / P1.zona) * 0.25);
  /* ---- SIM-02 · orgánicos ---- */
  const gen = P1.zona * ORG_PC * 7 * (s.pob / POB_K);
  const cap0 = !prop ? 0 : e === 'B' ? P2.cap : P2.cap * 3.5;
  const oper = !prop ? 0 : s.prog ? 1 : e === 'C' ? Math.min(1, s.prom / 20) : 0.3; // [SUP] sin programa: B queda con voluntarios (30 %), en C la planta la operan los promotores
  const capEf = cap0 * oper * (falla ? (e === 'C' ? 0.3 : 0.85) : 1);
  const intento = gen * (prop ? P2.frac : 0.02) * s.adopc, desv = prop ? Math.min(intento, capEf) : intento, rech = intento > 0 ? 1 - desv / intento : 0;
  s.adopc = rech < 0.05 ? Math.min(1, s.adopc + 1 / 156) : Math.max(0.05, s.adopc - rech / 52); // [SUP] la separación se aprende en 3 años y se pierde si el compost rechaza
  const mad = cl(Math.round(P2.mad), 1, 60), madura = t >= mad ? s.buf[(t - mad) & 63] : 0; s.buf[t & 63] = desv;
  let pila = 0; for (let i = 0; i < mad && i <= t; i++) pila += s.buf[(t - i) & 63];
  const sust = e === 'C' ? madura * P2.sust : e === 'B' ? madura * P2.sust * 0.3 : 0, comp = Math.max(0, (madura - sust) * REND_COMP), hongos = sust * 0.15;
  const rell = gen - desv, dist = !prop ? DIST_DJ : e === 'B' ? P2.dist : 4.5;
  /* ---- SIM-03 · humedal y aves ---- */
  const huertas = prop ? P3.borde * s.supF : 0, conect0 = !prop ? 0.2 : e === 'B' ? 1 - Math.exp(-P3.disp / 600) : 1 - Math.exp(-P3.disp / 250);
  const conect = prop ? conect0 * (0.4 + 0.6 * s.supF) : conect0; // [SUP] los corredores se pierden si se abandonan las huertas
  const presion = 0.004 + (prop ? huertas * 0.00012 * (e === 'B' ? 1.6 : 0.7) : 0);
  s.W = cl(s.W + P3.rec * (1 - s.W) * 0.2 * (seco ? 0.3 : 1) - presion * s.W - (seco ? 0.0015 * s.W : 0), 0.05, 1); // [SUP] año seco: el humedal se recupera menos y pierde agua
  const K = 900 * (0.6 + 0.6 * s.W + 0.5 * P3.arboles + (prop ? 0.4 * conect + huertas * 0.006 : 0)) * (seco ? 0.85 : 1);
  const m = (!prop ? 0.0004 : huertas / 40 * 0.004 * P3.luz * (e === 'B' ? 1 : 0.6)) * (P3.anti ? 0.3 : 1);
  const muere = s.B * m; s.muertes += muere; s.B = Math.max(20, s.B + 0.012 * s.B * (1 - s.B / K) - muere + conect * 1.5);
  for (const k in s.ev) if (s.ev[k] > 0) s.ev[k]--;
  Object.assign(o, { t, act: s.A, N: b.N, prom: s.prom, prod, auto, merma, exc, pers, pct: pers / s.pob * 100, dep, reg, m2p: isFinite(m2p) ? m2p : null, cal, espera, pc, carga, retiro, prog: s.prog,
    gen, relleno: rell, desv, rech, compost: comp, vuelve: comp, hongos, pct2: comp / REND_COMP / gen * 100, pila, km: rell / 11500 * DIST_DJ * 2 + desv / 1500 * dist * 2, ocup: cap0 ? Math.min(1.5, pila / (Math.max(capEf, cap0 * 0.1) * Math.max(1, mad) / 4)) : 0,
    aves: s.B, riq: Math.round(RIQ_BURRO * (0.45 + 0.35 * conect + 0.3 * s.W)), hum: s.W * 100, trampa: s.muertes, conect, seco, bloq, pico, falla });
  /* ---- reglas de colapso ---- */
  if (t >= ARRANQUE) { for (const R of REGLAS) s.racha[R.k] = R.malo(o) ? s.racha[R.k] + 1 : 0;
    if (!s.colapso) { const c = REGLAS.filter(Q => s.racha[Q.k] >= Q.sem).map(Q => Q.k); if (c.length) s.colapso = { t, causas: c }; } }
  /* ---- capacidad de recuperarse: semanas en volver al 95 % del nivel previo a la perturbación ---- */
  const val = { act: s.A, desv, W: s.W }; for (const k in s.ema) s.ema[k] += (val[k] - s.ema[k]) / 8;
  const pd = s.rec.pend; if (pd) { const sem = t - pd.t0; if (sem > 2 && val[pd.ind] >= pd.pre * 0.95) { s.rec.n++; s.rec.suma += sem; s.rec.ult = { k: pd.k, t0: pd.t0, sem }; s.rec.pend = null; } else if (sem > 260) { s.rec.fallidas++; s.rec.ult = { k: pd.k, t0: pd.t0, sem: null }; s.rec.pend = null; } }
  /* ---- historia submuestreada (memoria acotada) ---- */
  const H = s.H; if (t % H.paso === 0) { H.t.push(t); H.act.push(s.A); H.dep.push(dep); H.pers.push(pers); H.hum.push(s.W * 100); H.prom.push(s.prom); H.rell.push(rell / gen * 100);
    if (H.t.length > 600) { for (const k of ['t', 'act', 'dep', 'pers', 'hum', 'prom', 'rell']) H[k] = H[k].filter((_, i) => i % 2 === 0); H.paso *= 2; } }
  return o;
}

/* estado de las reglas para mostrar: funcionando / en riesgo / colapsó */
export function diagnostico(s) {
  const o = s.o, riesgos = [];
  if (s.t >= 0) for (const R of REGLAS) { const v = R.val(o), r = s.racha[R.k];
    const cerca = R.sentido < 0 ? v < R.umbral * 1.25 + (R.k === 'red' ? 4 : 0) : v > R.umbral - 3;
    if (r > 0 || cerca) riesgos.push({ R, v, racha: r, faltan: Math.max(0, R.sem - r), cumple: r > 0 }); }
  const estado = s.colapso ? 'colapso' : riesgos.length ? 'riesgo' : 'ok';
  return { estado, riesgos, colapso: s.colapso, antes: s.t < ARRANQUE };
}
/* tendencia de los hogares con huerta en los últimos 5 años (%/año) */
export function tendencia(s) { const H = s.H, n = H.t.length; if (n < 3) return null; const t1 = H.t[n - 1]; let i = n - 1; while (i > 0 && t1 - H.t[i] < 5 * AÑO) i--;
  const a0 = H.act[i], a1 = H.act[n - 1], años = (t1 - H.t[i]) / AÑO; if (años < 1) return null; return { pctAño: a0 > 1 ? ((a1 / a0) ** (1 / años) - 1) * 100 : (a1 > 1 ? 100 : 0), años }; }

/* ---------- MODO «EVALUAR»: R corridas con semillas FIJAS 1..R, mismas reglas, horizonte largo ---------- */
export function corrida(e, seed, años, PAR) {
  const s = crear(e, seed), n = años * AÑO, act = new Float32Array(años), dep = new Float32Array(años), hum = new Float32Array(años);
  for (let w = 0; w < n; w++) { const o = paso(s, PAR); if (w % AÑO === AÑO - 1) { const y = (w / AÑO) | 0; act[y] = o.act; dep[y] = o.dep; hum[y] = o.hum; } }
  return { seed, colapso: s.colapso ? { año: s.colapso.t / AÑO, causas: s.colapso.causas } : null, act, dep, hum, rec: s.rec.n ? s.rec.suma / s.rec.n : null, recN: s.rec.n, recF: s.rec.fallidas };
}
export function resumen(corridas, años) {
  const R = corridas.length, sup = []; for (let y = 0; y <= años; y++) sup.push(corridas.filter(c => !c.colapso || c.colapso.año > y).length / R * 100);
  const col = corridas.filter(c => c.colapso).map(c => c.colapso.año).sort((a, b) => a - b), causas = {};
  corridas.forEach(c => c.colapso && c.colapso.causas.forEach(k => { causas[k] = (causas[k] || 0) + 1; }));
  const tAll = corridas.map(c => c.colapso ? c.colapso.año : Infinity).sort((a, b) => a - b), med = tAll[Math.floor((R - 1) / 2)];
  const mediana = (arr) => { const v = arr.slice().sort((a, b) => a - b), n = v.length; return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2; };
  const medAct = []; for (let y = 0; y < años; y++) medAct.push(mediana(corridas.map(c => c.act[y])));
  return { R, sup, colapsan: col.length, mediana: med, min: col.length ? col[0] : null, max: col.length ? col[col.length - 1] : null, causas, medAct };
}
