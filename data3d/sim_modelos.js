/* ============ MODELOS SIM-01, SIM-02, SIM-03 (documento «Modelamiento dinámico y simulación») ============
   Compartidos por el tablero (data3d/simulaciones.js) y el panel de escenarios sobre el mapa (data3d/escenarios_sim.js):
   los dos leen y cambian los MISMOS parámetros (PAR) y el mismo estado (SIMST: escenario y semana), y se avisan con el evento
   'sim-cambio' (detail.origen = quién cambió). Los valores que no da el documento están marcados [SUP]. */
// CIFRAS CON FUENTE (ver fuentes.html / data3d/fuentes.json): POB_K = ASIS Kennedy 2024 (DANE); ORG_PC = 1,1 kg/hab/día (PPC RAS, Superservicios 2023) × 50 % orgánico (UAESP 2026);
// DIST_DJ = 16,6 km Corabastos–Doña Juana (ruta OSRM); T_COMPAC = 11,5 t por compactador; REND_COMP = 0,23 kg compost/kg (4 plazas distritales, 2016); RIQ_BURRO = 49 especies (OAB-SDA 2021-22); CRECE = 0,4 %/año (ASIS 2024-2030)
export const SEM = 520, AÑO = 52, POB_K = 1037929, ORG_PC = 0.55, DIST_DJ = 16.6, T_COMPAC = 11500, REND_COMP = 0.23, RIQ_BURRO = 49, CRECE = 1.004;
export const PAR = {
  P1: { rend: 6, alcance: 0.5, auto: 0.35, merma: 0.1, precio: 2600, acopio: 15000, reac: 0.5, cupos: 12, retardo: 12, c: 1000, rotacion: 12, mu: 6, zona: 50000, sup: 98000, regional: 0.45,
    pares: 3, // [SUP] promotores que forman los propios hogares en C, por cada 10.000 hogares por semana (solo lo usa la simulación sin fin, data3d/sim_vida.js)
    sequia: false, bloqueo: false, crece: false, baldios: false },
  P2: { frac: 0.4, cap: 6000, mad: 17, /* 4 meses de maduración (fuente en fuentes.json) */ sust: 0.2, dist: 1.5 },
  P3: { disp: 400, borde: 20, arboles: 0.4, luz: 0.5, anti: true, rec: 0.02 }
};
// escenario de la propuesta (B o C; «Kennedy hoy» es A) y semana que se mira. En el mapa la simulación ya no termina (data3d/sim_vida.js):
// SIMST.t puede pasar de SEM; los modelos de abajo siguen siendo los de 10 años del documento (los usa el tablero). semilla = réplica que se ve en el mapa
export const SIMST = { esc: 'C', t: SEM - 1, semilla: 1 };
export const avisar = (origen) => dispatchEvent(new CustomEvent('sim-cambio', { detail: { origen } }));

/* ---------------- SIM-01 · red de huertas, abastecimiento, conocimiento y decisión ---------------- */
export function sim01(e, P) {
  const N = e === 'A' ? 300 : e === 'B' ? 2506 : 5400; // A: huerteros que ya existen sin apoyo [SUP]
  const q = e === 'A' ? 0.0025 : 0.0073, area0 = 50; // m² por huerta (documento)
  const out = { prod: [], auto: [], merma: [], exc: [], pers: [], pct: [], dep: [], act: [], m2p: [], cal: [], prom: [], espera: [], pc: [], carga: [], retiro: [], N };
  let A_ = e === 'A' ? 120 : 60, prom = e === 'A' ? 0 : 6, cola = 0, pob = POB_K, Nef = N; const pipeline = [];
  for (let t = 0; t < SEM; t++) {
    if (P.crece && e !== 'A') pob *= Math.pow(CRECE, 1 / AÑO);
    if (P.baldios && e !== 'A' && t === 300) { Nef = N * 0.65; A_ *= 0.7; } // revocación de baldíos
    const clima = P.sequia && t >= 150 && t < 200 ? 0.55 : 1, bloqueo = P.bloqueo && t >= 260 && t < 290;
    if (e !== 'A') { if (t % 13 === 0) pipeline.push(t + P.retardo); while (pipeline.length && pipeline[0] <= t) { pipeline.shift(); prom += P.cupos; } } // promotores formados por Bavaria
    const area = A_ * area0, m2p = prom ? area / prom : Infinity, cal = e === 'A' ? 0.55 : Math.min(1, P.c / m2p);           // G5
    const p = e === 'A' ? 0.0002 : Math.max(0.00058, (P.cupos / 13) * P.alcance / Nef);                                       // G4 (Bass)
    const adop = Math.max(0, (p + q * A_ / Nef) * (Nef - A_));
    // G7 · abandono por carga: la carga sube cuando cada promotor acompaña más m² de los que puede; la rotación de vocerías (C) la alivia
    const carga = e === 'A' ? 1.2 : Math.max(0, m2p / P.c), alivio = e === 'C' ? Math.max(0.35, 1 - 6 / P.rotacion * 0.6) : 1;
    const retiro = A_ * 0.0018 * (1 + 3 * Math.max(0, carga - 1)) * alivio;                                                  // retiro = activos × h0 × (1 + β (carga − 1))
    A_ = Math.max(0, Math.min(Nef, A_ + adop - retiro));
    // superficies de la propuesta que no son de hogares: huertas de parques y lotes (~2 ha), techos y balcones (~4,9 ha) y Bavaria (~2,9 ha) [SUP]
    // se montan en ~3 años; en B solo el 60 % (sin clústeres que las sostengan)
    const sup = e === 'A' ? 0 : P.sup * Math.min(1, t / 156) * (e === 'B' ? 0.6 : 1);
    const prod = (area + sup) * P.rend / AÑO * clima * cal;                                                                   // G1
    const auto = prod * P.auto; let merma = prod * P.merma; let exc = prod - auto - merma;
    if (e !== 'A' && exc > P.acopio) { merma += exc - P.acopio; exc = P.acopio; } // acopio lleno: sube la merma
    if (e === 'A') { merma += exc * 0.5; exc *= 0.5; } // sin acopio la mitad del excedente se pierde [SUP]
    const pers = prod * AÑO * (1 - 0.1) / (0.4 * 365);                                                                         // G2 (400 g/día, OMS)
    const lam = adop * 0.3 + A_ * 0.002 + (bloqueo ? 3 : 0);                                                                   // G6
    const perdida = Math.min(0.5, 0.15 * 12 / P.rotacion), mu = e === 'A' ? 0 : e === 'B' ? P.mu : 4 * (P.mu * 0.6) * (1 - perdida);
    let espera = null; if (e !== 'A') { cola = Math.max(0, cola + lam - mu); espera = lam < mu && cola < 1 ? 1 / (mu - lam) : (cola + lam) / Math.max(0.1, mu); }
    const pc = 3000 * (bloqueo ? 1.6 : 1) * (1 - P.reac * Math.min(1, pers / P.zona) * 0.25); // precio de Corabastos [SUP]
    out.prod.push(prod); out.auto.push(auto); out.merma.push(merma); out.exc.push(exc); out.pers.push(pers); out.pct.push(pers / pob * 100);
    // compras directas a productores de la región por el acopio de Bavaria y la red de mercados de barrio (circuito corto), en vez de Corabastos [SUP]
    const reg = e === 'A' ? 0 : P.regional * Math.min(1, t / 208) * (e === 'B' ? 0.6 : 1) * (bloqueo ? 1.1 : 1);
    out.dep.push(Math.max(0, 1 - pers / P.zona - reg)); out.reg = out.reg || []; out.reg.push(reg); out.act.push(A_); out.m2p.push(isFinite(m2p) ? m2p : null); out.cal.push(cal); out.prom.push(prom); out.espera.push(espera); out.pc.push(pc);    // G3
    out.carga.push(carga); out.retiro.push(retiro);
  }
  return out;
}
/* ---------------- SIM-02 · orgánicos y compostaje ---------------- */
export function sim02(e, P, pobZona) {
  const gen = pobZona * ORG_PC * 7, out = { relleno: [], compost: [], hongos: [], vuelve: [], pct: [], km: [], pila: [], desv: [], ocup: [], gen }; // ORG_PC kg/día por persona (calculado de fuentes)
  const cap = e === 'A' ? 0 : e === 'B' ? P.cap : P.cap * 3.5, frac = e === 'A' ? 0.02 : P.frac, dist = e === 'A' ? DIST_DJ : e === 'B' ? P.dist : 4.5; // Doña Juana 16,6 km por vía (OSRM); Bavaria ~4,5 km medido en el mapa
  const entra = []; let pila = 0;
  for (let t = 0; t < SEM; t++) {
    const adopc = Math.min(1, 0.15 + t / 156); // la separación en la fuente se aprende en ~3 años [SUP]
    const desv = Math.min(gen * frac * adopc, cap || gen * frac * adopc * (e === 'A' ? 1 : 0)), rell = gen - desv;           // G8
    entra.push(desv); pila += desv; const madura = t >= P.mad ? entra[t - P.mad] : 0; pila -= madura;                         // G9
    const sust = e === 'C' ? madura * P.sust : e === 'B' ? madura * P.sust * 0.3 : 0, comp = (madura - sust) * REND_COMP, hongos = sust * 0.15; // G11
    out.relleno.push(rell); out.compost.push(Math.max(0, comp)); out.hongos.push(hongos); out.vuelve.push(Math.max(0, comp)); out.pct.push(Math.max(0, comp) / REND_COMP / gen * 100); out.pila.push(pila);
    out.km.push(rell / T_COMPAC * DIST_DJ * 2 + desv / 1500 * dist * 2); out.desv.push(desv); out.ocup.push(cap ? Math.min(1.5, pila / (cap * Math.max(1, P.mad) / 4)) : 0); // G12
  }
  return out;
}
/* ---------------- SIM-03 · hábitat y fauna ---------------- */
export function sim03(e, P, anti) {
  const out = { aves: [], riq: [], hum: [], trampa: [], conect: 0 };
  let B = 900, W = 0.55, muertes = 0;
  const huertas = e === 'A' ? 0 : P.borde, conect = e === 'A' ? 0.2 : e === 'B' ? 1 - Math.exp(-P.disp / 600) : 1 - Math.exp(-P.disp / 250); // G15
  out.conect = conect;
  for (let t = 0; t < SEM; t++) {
    const presion = 0.004 + (e === 'A' ? 0 : huertas * 0.00012 * (e === 'B' ? 1.6 : 0.7));                                   // G14
    W = Math.max(0.05, Math.min(1, W + P.rec * (1 - W) * 0.2 - presion * W));
    const K = 900 * (0.6 + 0.6 * W + 0.5 * P.arboles + (e === 'A' ? 0 : 0.4 * conect + huertas * 0.006));
    const m = (e === 'A' ? 0.0004 : huertas / 40 * 0.004 * P.luz * (e === 'B' ? 1 : 0.6)) * (anti ? 0.3 : 1);                // G16 trampa: luz y vidrio
    const r = 0.012; const crece = r * B * (1 - B / K), muere = B * m; muertes += muere; B = Math.max(20, B + crece - muere + conect * 1.5); // G13
    out.aves.push(B); out.riq.push(Math.round(RIQ_BURRO * (0.45 + 0.35 * conect + 0.3 * W))); out.hum.push(W * 100); out.trampa.push(muertes);
  }
  return out;
}
// todo corrido de una vez (lo usan el tablero y el mapa)
export function correrTodo() {
  const { P1, P2, P3 } = PAR, z = P1.zona;
  return {
    S1: { A: sim01('A', P1), B: sim01('B', P1), C: sim01('C', P1) },
    S2: { A: sim02('A', P2, z), B: sim02('B', P2, z), C: sim02('C', P2, z) },
    S3: { A: sim03('A', P3, P3.anti), B: sim03('B', P3, P3.anti), C: sim03('C', P3, P3.anti), Bsin: sim03('B', P3, false), Csin: sim03('C', P3, false) }
  };
}
