/* ============ LAS 6 SIMULACIONES · modo NIÑOS y modo ADULTOS ============
   Cada simulación es un PAR: «sin propuesta» y «con propuesta» corren juntas, con las mismas condiciones iniciales y la misma
   perturbación. 1 tick = 1 semana, horizonte de 15 años (780 semanas). Game Over: la condición crítica se cumple 4 semanas seguidas.
   Todo lo que se ve en 3D sale del modelo: si el modelo dice 1.500 camiones al día, se ven camiones (cada camión 3D = ESC camiones reales).
   Las cifras vienen de data3d/fuentes.json (fuentes.html). Las que son decisión de diseño o supuesto lo dicen en la tabla de adultos. */
const SEM_MAX = 780, RACHA_GO = 4;
// lat/lng -> mundo (ajustado con El Burro; error ~100 m, suficiente para ubicar escenas)
const W = (lat, lng) => [2095.67 + (lng + 74.149576) * 110960, -109.06 - (lat - 4.641417) * 110600];
const LUG = {
  cora: [1130, 950], burro: [2095.67, -109.06], vaca: W(4.628701, -74.161978), techo: W(4.645179, -74.141652), bav: [4136, 96],
  patio: W(4.6335, -74.1755), tintal: W(4.6455, -74.1600), timiza: W(4.610461, -74.156535), carvajal: W(4.6115, -74.1395),
  central: W(4.623167, -74.154738), alcaldia: W(4.6268, -74.1517), americas: W(4.619142, -74.135191)
};
/* ---------------- íconos planos (SVG, sin emojis) ---------------- */
const I = {
  camion: '<path d="M2 7h11v9H2zM13 10h4l3 3v3h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  auto: '<path d="M4 15l1.5-5h13L20 15v3H4z"/><circle cx="7.5" cy="18" r="1.6"/><circle cx="16.5" cy="18" r="1.6"/><path d="M7 10l1.5-3h7L17 10"/>',
  residuo: '<path d="M5 7h14l-1.2 13H6.2z"/><path d="M3 7h18M9 7V4h6v3M10 11v6M14 11v6"/>',
  ave: '<path d="M3 13c3-1 5-4 9-4 2 0 3 1 4 2l5-1-3 3c0 4-4 6-8 6-3 0-5-1-7-3l3-1z"/><circle cx="14.5" cy="11" r=".8"/>',
  casa: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  moneda: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  hoja: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l8-8"/>',
  play: '<path d="M7 4l13 8-13 8z"/>', pausa: '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>', reinicio: '<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/>',
  ok: '<circle cx="12" cy="12" r="9"/><path d="M7.5 12.5l3 3 6-6.5"/>', alerta: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  rayo: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', tabla: '<path d="M3 5h18v14H3zM3 10h18M3 15h18M9 5v14"/>', nino: '<circle cx="12" cy="7" r="3.2"/><path d="M6 21v-5a6 6 0 0 1 12 0v5"/>',
  adulto: '<circle cx="12" cy="6" r="3"/><path d="M7 21v-8a5 5 0 0 1 10 0v8M10 21v-5h4v5"/>', cerrar: '<path d="M6 6l12 12M18 6L6 18"/>', ruido: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'
};
const ico = (k, s = 22, cl = '') => `<svg class="ss-i ${cl}" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;
const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const rampa = (t, sem) => Math.min(1, t / sem);

/* ================= MODELOS (paso semanal; A = sin propuesta, B = con propuesta) ================= */
const POB = 1037929;
const NEED = POB * 347.1 / 365 / 1000; // t/día de alimentos que necesita Kennedy (SDDE 2025: 347,1 kg/hab/año)
const SIMS = [
  { k: 'p1', n: 'Abastecimiento', largo: 'Abastecimiento y producción distribuida', ic: 'camion', lugar: 'cora', dist: 650,
    nino: 'Todos los días llegan camiones con comida a Corabastos. ¿Qué pasa si se bloquea la vía? ¿Y si los barrios cultivan y tienen mercados cerca?',
    escala: '1 camión 3D = 5 camiones reales',
    par: { dem: 1, merc: 12, bloqDur: 6 },
    ctrl: [{ k: 'dem', n: 'Comida que necesita Kennedy', min: 1, max: 1.5, step: 0.05, f: v => '+' + fmt((v - 1) * 100) + ' %', ia: 'casa' },
      { k: 'merc', n: 'Mercados de barrio nuevos', min: 0, max: 20, step: 1, f: v => fmt(v), soloB: true, ia: 'hoja' },
      { k: 'bloqDur', n: 'Semanas de bloqueo', min: 1, max: 8, step: 1, f: v => fmt(v) + ' sem', ia: 'rayo' }],
    pert: 'Bloquear la vía a Corabastos',
    estado: () => ({ racha: 0, go: null, bloq: 0, pct: 1, tru: 0, cob: 0, local: 0, reg: 0 }),
    paso(s, P, B, t) {
      const coraF = s.bloq > 0 ? 0.4 : 1; if (s.bloq > 0) s.bloq--;                 // [supuesto] en un bloqueo entra el 40 % de la carga
      const dem = NEED * P.dem;
      const local = B ? (5400 * 50 + 98000) * 6 / 365 / 1000 * rampa(t, 156) : 0;  // huertas: m² de diseño × 6 kg/m²/año
      const reg = B ? Math.min(0.3, 0.2 * P.merc / 12) * rampa(t, 208) : 0;        // [diseño] compra directa a la región por mercados de barrio
      const otros = 0.06 * NEED;                                                       // 94 % entra por Corabastos (SDDE 2025)
      const sum = (0.94 - reg) * dem * coraF + reg * dem * (s.bloq > 0 || coraF < 1 ? 0.8 : 1) + local + otros;
      s.pct = Math.min(1, sum / dem); s.local = local; s.reg = reg;
      s.tru = (1500 + (P.dem - 1) * 0.94 * NEED / 4.64 - reg * dem / 4.64) * coraF;  // camiones de carga/día a Corabastos
      s.cob = B ? 0.63 + 0.37 * (1 - Math.exp(-P.merc / 8)) : 0.63;                   // cobertura de mercados ≤1 km (63 % hoy)
      s.racha = s.pct < 0.8 ? s.racha + 1 : 0; if (s.racha >= RACHA_GO && !s.go) s.go = { sem: t, ind: 'Comida recibida < 80 % de la necesaria', lugar: 'Kennedy (abasto por Corabastos)' };
    },
    filas: (a, b) => [
      ['Comida que recibe Kennedy', fmt(a.pct * 100) + ' %', fmt(b.pct * 100) + ' %', 'Meta ≥ 80 %', 'p1'],
      ['Camiones de carga a Corabastos', fmt(a.tru) + '/día', fmt(b.tru) + '/día', '1.500/día hoy (Agronegocios 2024)', 'p1'],
      ['Toneladas que mueve Corabastos', fmt(a.tru * 4.64) + ' t/día', fmt(b.tru * 4.64) + ' t/día', '6.962 t/día · 4,64 t por camión', 'p1'],
      ['Producción de huertas', '0 t/día', fmt(b.local, 1) + ' t/día', '6 kg/m²/año · 368.000 m² (diseño)', 'p1'],
      ['Compra directa a la región', '0 %', fmt(b.reg * 100) + ' %', 'Decisión de diseño', 'p1'],
      ['Hogares con mercado a ≤ 1 km', fmt(a.cob * 100) + ' %', fmt(b.cob * 100) + ' %', '63 % hoy (red de problemas)', 'p1']],
    nino3: (a, b, e) => [['camion', fmt(e.tru), 'camiones al día'], ['casa', fmt(e.pct * 100) + '%', 'de la comida llega'], ['hoja', fmt(e.local, 1) + ' t', 'de las huertas al día']],
    bueno: e => e.pct >= 0.8 },
  { k: 'p2', n: 'Movilidad', largo: 'Movilidad y accesibilidad', ic: 'auto', lugar: 'bav', dist: 600,
    nino: 'Por la Av. Boyacá pasan miles de carros en hora pico. Si se cierra un carril, todo va más lento y hace más ruido. Con mercados cerca, la gente viaja menos.',
    escala: '1 carro 3D = 25 vehículos reales por hora',
    par: { cierre: 0, corto: 8 },
    ctrl: [{ k: 'cierre', n: 'Carriles cerrados', min: 0, max: 50, step: 5, f: v => fmt(v) + ' %', ia: 'rayo' },
      { k: 'corto', n: 'Viajes que se acortan con la propuesta', min: 0, max: 20, step: 1, f: v => fmt(v) + ' %', soloB: true, ia: 'hoja' }],
    pert: 'Cerrar un carril (−30 %)',
    estado: () => ({ racha: 0, go: null, V: 0, v: 0, tmin: 0, dB: 0 }),
    paso(s, P, B, t, X) {
      const V = 5252 * (B ? 1 - P.corto / 100 * rampa(t, 156) : 1);                 // aforo hora pico Av. Boyacá × Américas (SDM 2023)
      const C = 2947 * (1 - (P.cierre + (X.pertOn ? 30 : 0)) / 100);                   // capacidad calibrada para que hoy v = 19,9 km/h (BPR)
      const v = 50 / (1 + 0.15 * Math.pow(V / Math.max(300, C), 4));
      s.V = V; s.v = Math.max(3, v); s.tmin = 2 / s.v * 60; s.dB = 72 + 10 * Math.log10(V / 5252) + (s.v < 10 ? 1 : 0); // [supuesto] 72 dB(A) hoy (>70 medido, UNAL)
    },
    filas: (a, b) => [
      ['Vehículos en hora pico (Av. Boyacá)', fmt(a.V) + '/h', fmt(b.V) + '/h', '5.252/h (SDM, aforo 2023)', 'p2'],
      ['Velocidad media', fmt(a.v, 1) + ' km/h', fmt(b.v, 1) + ' km/h', '19,9 km/h hoy (SDM 2022)', 'p2'],
      ['Tiempo para recorrer 2 km', fmt(a.tmin, 1) + ' min', fmt(b.tmin, 1) + ' min', 'BPR calibrado', 'p2'],
      ['Ruido junto a la vía', fmt(a.dB, 1) + ' dB', fmt(b.dB, 1) + ' dB', 'Norma residencial 65 dB (Res. 627/2006)', 'p2']],
    nino3: (a, b, e) => [['auto', fmt(e.V), 'carros por hora'], ['reinicio', fmt(e.v, 0) + ' km/h', 'velocidad'], ['ruido', fmt(e.dB, 0) + ' dB', 'de ruido']],
    bueno: e => e.dB <= 72.5 && e.v >= 12 },
  { k: 'p3', n: 'Residuos', largo: 'Residuos y circularidad', ic: 'residuo', lugar: 'central', dist: 900,
    nino: 'Kennedy bota mucha basura cada día. La mitad es comida y cáscaras. Si se separa, las Estaciones Circulares la vuelven abono para las huertas.',
    escala: '1 camión 3D = 4 camiones compactadores reales',
    par: { gen: 1, est: 10, sep: 40 },
    ctrl: [{ k: 'gen', n: 'Basura que se genera', min: 1, max: 1.5, step: 0.05, f: v => '+' + fmt((v - 1) * 100) + ' %', ia: 'residuo' },
      { k: 'est', n: 'Estaciones Circulares', min: 0, max: 20, step: 1, f: v => fmt(v), soloB: true, ia: 'hoja' },
      { k: 'sep', n: 'Hogares que separan', min: 0, max: 80, step: 5, f: v => fmt(v) + ' %', soloB: true, ia: 'casa' }],
    pert: 'Subir la basura de golpe (+30 %)',
    estado: () => ({ racha: 0, go: null, tot: 0, org: 0, dj: 0, cam: 0, proc: 0, comp: 0, acum: 0, cap: 0 }),
    paso(s, P, B, t, X) {
      const g = P.gen * (X.pertOn ? 1.3 : 1);
      const tot = POB * 1.1 / 1000 * g, org = tot * 0.5;                              // PPC 1,1 kg (Superservicios) · 50 % orgánico (UAESP)
      const recolecta = POB * 1.1 / 1000 * 1.1;                                       // [supuesto] la recolección aguanta un 10 % por encima de hoy
      let llega = tot, proc = 0, exceso = 0;
      if (B) { const sep = org * P.sep / 100 * rampa(t, 156), cap = P.est * 12; proc = Math.min(sep, cap); exceso += sep - proc; llega = tot - sep; s.cap = cap; } // [diseño] 12 t/día por estación
      exceso += Math.max(0, llega - recolecta);
      s.acum = Math.max(0, s.acum * 0.6 + exceso * 7 - (B ? 0 : 0));                  // lo que no se procesa se acumula en calles y estaciones
      const almacen = 2 * POB * 1.1 / 1000;                                           // [supuesto] 2 días de generación de almacenamiento
      s.tot = tot; s.org = org; s.dj = Math.min(llega, recolecta); s.cam = s.dj / 11.5; s.proc = proc; s.comp = proc * 0.23;
      s.racha = s.acum > almacen ? s.racha + 1 : 0; if (s.racha >= RACHA_GO && !s.go) s.go = { sem: t, ind: 'Acumulación mayor que el almacenamiento', lugar: B ? 'Estaciones Circulares y calles' : 'Calles y puntos críticos (71 focos)' };
    },
    filas: (a, b) => [
      ['Basura que genera Kennedy', fmt(a.tot) + ' t/día', fmt(b.tot) + ' t/día', '1,1 kg/hab/día (Superservicios)', 'p3'],
      ['Va al relleno Doña Juana', fmt(a.dj) + ' t/día', fmt(b.dj) + ' t/día', 'a 16,6 km por vía', 'p3'],
      ['Camiones compactadores', fmt(a.cam) + '/día', fmt(b.cam) + '/día', '11,5 t por camión', 'p3'],
      ['Orgánicos aprovechados', '0 t/día', fmt(b.proc) + ' t/día', 'Estaciones: 12 t/día c/u (diseño)', 'p3'],
      ['Compost que vuelve a las huertas', '0 t/día', fmt(b.comp, 1) + ' t/día', '0,23 kg/kg (plazas de Bogotá)', 'p3'],
      ['Basura acumulada sin recoger', fmt(a.acum) + ' t', fmt(b.acum) + ' t', 'Game Over si supera 2 días de generación', 'p3']],
    nino3: (a, b, e) => [['residuo', fmt(e.cam), 'camiones al relleno'], ['hoja', fmt(e.comp, 0) + ' t', 'de abono al día'], ['alerta', fmt(e.acum) + ' t', 'basura acumulada']],
    bueno: e => e.acum < 2 * POB * 1.1 / 1000 },
  { k: 'p4', n: 'Biodiversidad', largo: 'Biodiversidad y conectividad ecológica', ic: 'ave', lugar: 'burro', dist: 800,
    nino: 'En el humedal El Burro viven 49 especies de aves. Si se daña el humedal, se van. Con jardines y corredores verdes pueden moverse entre humedales.',
    escala: '1 ave 3D = 1 especie que sigue presente',
    par: { dano: 40, corr: 6 },
    ctrl: [{ k: 'dano', n: 'Daño al humedal', min: 0, max: 90, step: 5, f: v => fmt(v) + ' %', ia: 'rayo' },
      { k: 'corr', n: 'Corredores y jardines (ha)', min: 0, max: 20, step: 1, f: v => fmt(v) + ' ha', soloB: true, ia: 'hoja' }],
    pert: 'Dañar el humedal',
    estado: () => ({ racha: 0, go: null, S: 49, area: 40.42, conect: 0.2, dano: 0 }),
    paso(s, P, B, t, X) {
      s.dano = X.pertOn ? Math.min(P.dano / 100, s.dano + 0.02) : Math.max(0, s.dano - 0.002); // el daño entra en semanas y se recupera lento
      const area0 = 18.8 + 9.95 + 11.67;                                               // El Burro + La Vaca + Techo (SDA)
      const area = 18.8 * (1 - s.dano) + 9.95 + 11.67 + (B ? P.corr * rampa(t, 260) : 0);
      const conect = B ? 0.2 + 0.5 * Math.min(1, P.corr / 12) * rampa(t, 260) : 0.2;   // [diseño] corredores
      s.area = area; s.conect = conect;
      s.S = 49 * Math.pow((area * (0.8 + conect)) / (area0 * 1.0), 0.25);             // especie-área z = 0,25 (Rosenzweig)
      s.S = Math.min(80, s.S);                                                         // tope: 80 especies registradas en Madre de Agua
      s.racha = s.S <= 49 * 0.7 ? s.racha + 1 : 0; if (s.racha >= RACHA_GO && !s.go) s.go = { sem: t, ind: 'Especies −30 % o más', lugar: 'Humedal El Burro' };
    },
    filas: (a, b) => [
      ['Especies de aves', fmt(a.S), fmt(b.S), '49 hoy en El Burro (OAB-SDA)', 'p4'],
      ['Hábitat de humedal y corredores', fmt(a.area, 1) + ' ha', fmt(b.area, 1) + ' ha', '40,4 ha: El Burro 18,8 · La Vaca 9,95 · Techo 11,67', 'p4'],
      ['Conectividad entre parches', fmt(a.conect * 100) + ' %', fmt(b.conect * 100) + ' %', 'Índice del modelo (supuesto)', 'p4'],
      ['Cambio frente a hoy', fmt((a.S / 49 - 1) * 100) + ' %', fmt((b.S / 49 - 1) * 100) + ' %', 'Game Over: −30 % o más', 'p4']],
    nino3: (a, b, e) => [['ave', fmt(e.S), 'especies de aves'], ['hoja', fmt(e.area, 0) + ' ha', 'de hábitat'], ['alerta', fmt((e.S / 49 - 1) * 100) + '%', 'frente a hoy']],
    bueno: e => e.S > 49 * 0.7 },
  { k: 'p5', n: 'Población', largo: 'Población y presiones sobre el suelo', ic: 'casa', lugar: 'patio', dist: 1700,
    nino: 'En Patio Bonito vive muchísima gente junta. En Tintal Norte hay más espacio. Si llega más gente, ¿alcanzan los parques y los colegios?',
    escala: '1 piso de la torre = 10.000 habitantes',
    par: { crece: 0.4, eq: 6, prot: 20 },
    ctrl: [{ k: 'crece', n: 'Crecimiento de la población por año', min: 0.4, max: 3, step: 0.1, f: v => fmt(v, 1) + ' %', ia: 'casa' },
      { k: 'eq', n: 'Colegios y centros nuevos', min: 0, max: 12, step: 1, f: v => fmt(v), soloB: true, ia: 'hoja' },
      { k: 'prot', n: 'Suelo verde protegido (ha)', min: 0, max: 40, step: 2, f: v => fmt(v) + ' ha', soloB: true, ia: 'hoja' }],
    pert: 'Llega una ola de vivienda nueva',
    estado: () => ({ racha: 0, go: null, pb: 137768, tn: 30784, pob: POB, parque: 2.9, deficit: 1568 }),
    paso(s, P, B, t, X) {
      const r = Math.pow(1 + P.crece / 100, 1 / 52) - 1, ola = X.pertOn ? 4452 / 13 : 0; // ola: viviendas iniciadas en un trimestre (Hábitat 2023) × 1 hogar
      const nuevos = s.pob * r + ola * 3.36;
      s.pob += nuevos; s.pb += nuevos * (B ? 0.25 : 0.35); s.tn += nuevos * (B ? 0.3 : 0.45); // [supuesto] dónde cae el crecimiento: Tintal tiene suelo libre
      const parques = 298e4 + (B ? P.prot * 1e4 * rampa(t, 156) : -nuevos * 0);       // 298 ha de parques (SDP 2023)
      const perdida = B ? 0 : Math.max(0, (s.tn - 30784) * 0.4);                       // [supuesto] sin protección el crecimiento ocupa suelo verde (m²)
      s.parque = (parques - perdida) / s.pob;
      s.deficit = Math.max(0, 1568 + (s.pob - POB) * 0.109 - (B ? P.eq * 1200 * rampa(t, 208) : 0)); // 10,9 % son estudiantes; 1.200 cupos por colegio [diseño]
    },
    filas: (a, b) => [
      ['Habitantes de Kennedy', fmt(a.pob), fmt(b.pob), '1.037.929 hoy (ASIS 2024)', 'p5'],
      ['Patio Bonito', fmt(a.pb / 317) + ' hab/ha', fmt(b.pb / 317) + ' hab/ha', '434,6 hab/ha hoy', 'p5'],
      ['Tintal Norte', fmt(a.tn / 343) + ' hab/ha', fmt(b.tn / 343) + ' hab/ha', '89,75 hab/ha hoy', 'p5'],
      ['Parque por habitante', fmt(a.parque, 2) + ' m²', fmt(b.parque, 2) + ' m²', '2,9 m²/hab hoy (SDP)', 'p5'],
      ['Cupos escolares que faltan', fmt(a.deficit), fmt(b.deficit), '1.568 hoy (SED 2024)', 'p5']],
    nino3: (a, b, e) => [['casa', fmt(e.pob / 1e6, 2) + ' M', 'habitantes'], ['hoja', fmt(e.parque, 1) + ' m²', 'de parque por persona'], ['nino', fmt(e.deficit), 'niños sin cupo']],
    bueno: e => e.deficit < 1568 && e.parque >= 2.8 },
  { k: 'p6', n: 'Recursos', largo: 'Distribución de recursos', ic: 'moneda', lugar: 'alcaldia', dist: 1900,
    nino: 'Kennedy tiene una bolsa de dinero para sus barrios. ¿A quién le llega? Hoy le llega más a quien está más organizado. Con la federación, le llega a quien más lo necesita.',
    escala: '1 moneda 3D = 1.000 millones de pesos',
    par: { necesitan: 4, partic: 50 },
    ctrl: [{ k: 'necesitan', n: 'Sectores con necesidades a la vez', min: 2, max: 6, step: 1, f: v => fmt(v), ia: 'casa' },
      { k: 'partic', n: 'Presupuesto que decide la comunidad', min: 10, max: 60, step: 5, f: v => fmt(v) + ' %', ia: 'moneda' }],
    pert: 'Emergencia en Tintal Norte',
    estado: () => ({ racha: 0, go: null, asig: [], aten: 0, sin: 0 }),
    paso(s, P, B, t, X) {
      const bolsa = 193000 * P.partic / 100;                                           // millones COP: FDL 2025 × % participativo (SDP)
      const SEC = SECTORES, n = P.necesitan;
      const nec = SEC.map((q, i) => (i < n || (X.pertOn && q.k === 'tintal')) ? bolsa / n * (X.pertOn && q.k === 'tintal' ? 1.5 : 1) : 0);
      const peso = SEC.map((q, i) => B ? nec[i] : q.org * (nec[i] > 0 ? 1 : 0.3));     // sin federación: según capacidad organizativa (IDPAC)
      const sp = peso.reduce((a, b) => a + b, 0) || 1;
      s.asig = peso.map(p => bolsa * p / sp);
      const totNec = nec.reduce((a, b) => a + b, 0) || 1;
      s.aten = s.asig.reduce((a, v, i) => a + Math.min(v, nec[i]), 0) / totNec; s.sin = nec.filter((v, i) => v > 0 && s.asig[i] < v * 0.3).length; s.nec = nec;
    },
    filas: (a, b) => [
      ['Necesidades atendidas', fmt(a.aten * 100) + ' %', fmt(b.aten * 100) + ' %', 'FDL 193.000 M COP (2025)', 'p6'],
      ['Sectores casi sin recursos', fmt(a.sin), fmt(b.sin), 'Recibe < 30 % de lo que necesita', 'p6'],
      ...SECTORES.map((q, i) => [q.n + ' (' + q.org + ' org.)', fmt((a.asig[i] || 0) / 1000, 1) + ' mil M', fmt((b.asig[i] || 0) / 1000, 1) + ' mil M', 'IDPAC 2017-2021', 'p6'])],
    nino3: (a, b, e) => [['moneda', fmt(e.aten * 100) + '%', 'de lo que se necesita'], ['alerta', fmt(e.sin), 'barrios sin ayuda'], ['casa', fmt(SECTORES.length), 'sectores']],
    bueno: e => e.aten >= 0.8 }
];
const LOGICA = {
  p1: [['Balance oferta–demanda de alimentos (flujo semanal)', 'SDDE 2026: 347,1 kg/hab/año y 94 % por Corabastos', 'https://bogota.gov.co/mi-ciudad/desarrollo-economico/ruta-de-alimentos-en-bogota-logistica-que-deja-huella-en-la-tierra'], ['Camiones y toneladas de Corabastos', 'Agronegocios 2024 (gerencia Corabastos)', 'https://www.agronegocios.co/agricultura/estamos-trabajando-en-crear-una-app-para-corabastos-estara-lista-para-final-de-ano-3951469'], ['Perfil diario de toneladas', 'DANE-SIPSA boletín diario', 'https://www.dane.gov.co/files/operaciones/SIPSA/bol-SIPSADiario-15sep2025.pdf'], ['Rendimiento máximo de huertas urbanas', 'FAO 1999', 'https://sswm.info/sites/default/files/reference_attachments/FAO%201999%20Two%20thirds%20of%20city%20and%20peri%20urban%20households%20involved%20in%20farming.pdf']],
  p2: [['Velocidad según volumen/capacidad: función BPR v = v0 / (1 + 0,15 (V/C)^4)', 'Bureau of Public Roads (1964), Traffic Assignment Manual · discutida en NCHRP 716 (TRB)', 'https://nap.nationalacademies.org/read/13678/chapter/122'], ['Ruido: +3 dB por cada duplicación del tráfico (10·log10 del flujo)', 'Kephalopoulos, Paviotti y Anfosso-Lédée (2012), CNOSSOS-EU, JRC EUR 25379', 'https://publications.jrc.ec.europa.eu/repository/handle/JRC72550'], ['Aforos y velocidad de hoy', 'SDM – Encuesta de Movilidad 2023', 'https://www.simur.gov.co/sites/www.simur.gov.co/files/2024-05-21/basico/2.PublicacionSIMUR-20240521T211042Z-001.zip']],
  p3: [['Balance de masa de residuos (generación – recolección – aprovechamiento)', 'Superservicios 2023: PPC 1,1 kg/hab/día', 'https://superservicios.gov.co/sites/default/files/inline-files/Informe-Sectorial-de-la-Actividad-de-Aprovechamiento-2023.pdf'], ['Fracción orgánica', 'UAESP 2026', 'https://bogota.gov.co/mi-ciudad/habitat/bogota-avanza-en-el-reciclaje-de-miles-de-toneladas-de-residuos'], ['Rendimiento del compost 0,23 kg/kg', 'Alcaldía de Bogotá: 4 plazas distritales', 'https://bogota.gov.co/mi-ciudad/ambiente/plazas-distritales-de-mercado-aprovechan-sus-residuos-organicos']],
  p4: [['Relación especie–área S = c·A^z con z ≈ 0,25', 'Rosenzweig (1995), Species Diversity in Space and Time, Cambridge Univ. Press', 'https://doi.org/10.1017/CBO9780511623387.004'], ['z ≈ 0,25 para parches separados', 'IPBES, glosario (con base en Rosenzweig 1995)', 'https://ipbes.net/ru/taxonomy/term/25418'], ['Especies de hoy por humedal', 'OAB-SDA, indicador RERDH', 'https://oab.ambientebogota.gov.co/descargar/34112']],
  p5: [['Proyección geométrica de población', 'ASIS Kennedy 2024 (proyecciones DANE)', 'https://saludata.saludcapital.gov.co/osb/wp-content/uploads/2026/01/8.-ASIS_Kennedy_2024.pdf'], ['Parques por habitante y suelo', 'Observatorio del Hábitat (SDP 2023)', 'https://observatorio.habitatbogota.gov.co/wp-content/uploads/2023/09/Kennedy.pdf'], ['Déficit de cupos escolares', 'SED Kennedy 2024', 'https://www.educacionbogota.edu.co/portal_institucional/sites/default/files/inline-files/2022/08%20Boleti%CC%81n%20Kennedy%202024.pdf']],
  p6: [['Reparto proporcional: según capacidad organizativa (hoy) o según necesidad (federación)', 'Organizaciones por UPZ: IDPAC', 'https://www.participacionbogota.gov.co/sites/idpac/files/2023-12/infografia_digital_kennedy.pdf'], ['Bolsa del Fondo de Desarrollo Local', 'Alcaldía Local de Kennedy 2025', 'https://bogota.gov.co/mi-ciudad/gobierno/en-kennedy-bogota-se-han-invertido-166-mil-millones-en-proyectos-2025'], ['% de presupuestos participativos', 'SDP', 'https://www.sdp.gov.co/sites/default/files/19._ciudad_bolivar_informe_ejecucion_presupuestos_participativos_septiembre_30_2022.pdf']]
};
const SECTORES = [
  { k: 'tintal', n: 'Tintal Norte', org: 1, p: LUG.tintal }, { k: 'patio', n: 'Patio Bonito', org: 48, p: LUG.patio }, { k: 'timiza', n: 'Timiza', org: 50, p: LUG.timiza },
  { k: 'central', n: 'Kennedy Central', org: 67, p: LUG.central }, { k: 'carvajal', n: 'Carvajal', org: 25, p: LUG.carvajal }, { k: 'americas', n: 'Américas', org: 20, p: LUG.americas }
];

export async function iniciarSeisSims({ getT3 }) {
  const espera = () => new Promise(r => { const f = () => { const T = getT3(); T && T.net && T.lw && T.camera && T.orbit ? r(T) : setTimeout(f, 500); }; f(); });
  const T3 = await espera(), THREE = T3.THREE;
  const Y = () => (T3.viaY != null ? T3.viaY : 0.62) + 0.4;
  /* ---------- grafo de vías reales (net.json) ---------- */
  const G = (() => {
    const key = new Map(), X = [], Z = [], adj = [];
    const nodo = (x, z) => { const k = Math.round(x / 12) + ',' + Math.round(z / 12); let i = key.get(k); if (i === undefined) { i = X.length; key.set(k, i); X.push(x); Z.push(z); adj.push([]); } return i; };
    for (const [cls, pts0] of T3.net.edges) {
      if (!pts0 || pts0.length < 2 || cls === 'path' || cls === 'foot') continue;
      const pts = pts0.map(p => T3.lw(p[0], p[1])); let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      const a = nodo(pts[0][0], pts[0][1]), b = nodo(pts[pts.length - 1][0], pts[pts.length - 1][1]); if (a === b) continue;
      const e = { a, b, L: L * (cls === 'major' ? 0.6 : cls === 'mid' ? 0.85 : 1), pts, cls }; adj[a].push(e); adj[b].push(e);
    }
    const comp = new Int32Array(X.length).fill(-1); let best = -1, bestN = 0;
    for (let s0 = 0; s0 < X.length; s0++) { if (comp[s0] >= 0) continue; const pila = [s0]; comp[s0] = s0; let n = 0; while (pila.length) { const u = pila.pop(); n++; for (const e of adj[u]) { const v = e.a === u ? e.b : e.a; if (comp[v] < 0) { comp[v] = s0; pila.push(v); } } } if (n > bestN) { bestN = n; best = s0; } }
    const idx = []; for (let i = 0; i < X.length; i++) if (comp[i] === best) idx.push(i);
    const mayores = idx.filter(i => adj[i].some(e => e.cls === 'major'));
    const cercano = (x, z, lista = idx) => { let bi = -1, bd = 1e18; for (const i of lista) { const d = (X[i] - x) ** 2 + (Z[i] - z) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
    function arbol(f) { const dist = new Float64Array(X.length).fill(Infinity), prev = new Array(X.length).fill(null), h = [[0, f]]; dist[f] = 0;
      const push = (it) => { h.push(it); let i = h.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (h[p][0] <= h[i][0]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; } };
      const pop = () => { const top = h[0], last = h.pop(); if (h.length) { h[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < h.length && h[l][0] < h[m][0]) m = l; if (r < h.length && h[r][0] < h[m][0]) m = r; if (m === i) break; [h[m], h[i]] = [h[i], h[m]]; i = m; } } return top; };
      while (h.length) { const [d, u] = pop(); if (d > dist[u]) continue; for (const e of adj[u]) { const v = e.a === u ? e.b : e.a, nd = d + e.L; if (nd < dist[v]) { dist[v] = nd; prev[v] = e; push([nd, v]); } } }
      return { f, dist, prev }; }
    function ruta(t, d) { if (!isFinite(t.dist[d])) return null; const tr = []; let u = d; while (u !== t.f) { const e = t.prev[u]; if (!e) return null; const de = e.a === u ? e.b : e.a; tr.push(e.a === de ? e.pts : e.pts.slice().reverse()); u = de; }
      const out = [[X[t.f], Z[t.f]]]; for (let k = tr.length - 1; k >= 0; k--) for (const p of tr[k]) { const q = out[out.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5) out.push(p); } return out; }
    return { X, Z, idx, mayores, cercano, arbol, ruta };
  })();
  const conCum = (pts) => { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; };
  const enRuta = (r, s) => { let i = 1; while (i < r.cum.length - 1 && r.cum[i] < s) i++; const a = r.pts[i - 1], b = r.pts[i], f = (s - r.cum[i - 1]) / ((r.cum[i] - r.cum[i - 1]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[0] - a[0], b[1] - a[1])]; };
  // rutas hacia un destino desde nodos mayores a cierta distancia (entradas)
  const rutasHacia = (dest, rMin, rMax, n, lista = G.mayores) => { const d = G.cercano(dest[0], dest[1]), t = G.arbol(d), cand = lista.filter(i => { const q = Math.hypot(G.X[i] - dest[0], G.Z[i] - dest[1]); return q > rMin && q < rMax; });
    const out = []; for (let k = 0; k < cand.length && out.length < n; k += Math.max(1, Math.floor(cand.length / n))) { const r = G.ruta(t, cand[k]); if (r && r.length > 3) out.push(conCum(r.slice().reverse())); } return out; };

  /* ---------- modelos 3D (geometrías propias, instanciadas) ---------- */
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.1, ...o });
  function flota(partes, max) { // partes: [[geom, material]] -> conjunto instanciado que comparte matrices
    const g = new THREE.Group(); const ms = partes.map(([geo, m]) => { const im = new THREE.InstancedMesh(geo, m, max); im.count = 0; im.frustumCulled = false; im.castShadow = true; g.add(im); return im; });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
    return { g, max, poner(i, x, y, z, ang, esc = 1) { P.set(x, y, z); E.set(0, ang, 0); Q.setFromEuler(E); S.set(esc, esc, esc); M.compose(P, Q, S); for (const im of ms) im.setMatrixAt(i, M); },
      fin(n) { for (const im of ms) { im.count = n; im.instanceMatrix.needsUpdate = true; } } };
  }
  const caja = (w, h, l, y = 0, z = 0) => new THREE.BoxGeometry(w, h, l).translate(0, y + h / 2, z);
  const rueda = (z) => { const g = new THREE.CylinderGeometry(0.55, 0.55, 2.5, 12).rotateZ(Math.PI / 2).translate(0, 0.55, z); return g; };
  const ruedas = (zs) => { const gs = zs.map(rueda); const pos = []; let off = 0; const idx = []; for (const g of gs) { const p = g.attributes.position.array, ix = g.index.array; for (const v of p) pos.push(v); for (const v of ix) idx.push(v + off); off += p.length / 3; } const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setIndex(idx); r.computeVertexNormals(); return r; };
  const mNegro = mat('#1d1f1c', { roughness: 0.9 }), mVidrio = mat('#20303a', { metalness: 0.6, roughness: 0.2 });
  // camión de carga (furgón blanco, cabina roja) ~ 9 m
  const camion = (cab, caja_) => [[caja(2.4, 2.3, 2.2, 0.8, 3.2), mat(cab)], [caja(2.3, 0.8, 0.12, 2.0, 4.31), mVidrio], [caja(2.5, 3.0, 6.0, 0.9, -1.1), mat(caja_)], [ruedas([3.2, -0.6, -2.8]), mNegro]];
  const furgon = (c) => [[caja(2.0, 1.4, 2.0, 0.6, 1.8), mat(c)], [caja(2.0, 2.1, 3.4, 0.6, -0.9), mat('#f1f2ec')], [ruedas([1.8, -1.6]), mNegro]];
  const carro = () => [[caja(1.8, 0.75, 4.3, 0.35), mat('#c9ccd1', { metalness: 0.5, roughness: 0.35 })], [caja(1.6, 0.6, 2.2, 1.1, -0.2), mVidrio], [ruedas([1.3, -1.3]), mNegro]];
  const compactador = () => [[caja(2.4, 2.2, 2.2, 0.8, 3.2), mat('#e9ece6')], [caja(2.5, 3.1, 6.0, 0.9, -1.1), mat('#2f7d4f')], [caja(2.52, 0.4, 6.02, 2.6, -1.1), mat('#e9ece6')], [ruedas([3.2, -0.6, -2.8]), mNegro]];

  /* ---------- escenas por simulación ---------- */
  const grupo = new THREE.Group(); grupo.name = 'seis_sims'; grupo.visible = false; T3.scene.add(grupo);
  const ESC = {}; // k -> { g, actualizar(estado, dt), etiquetas: [{p:[x,z], h, html()}] }
  const ESCALA_VIS = 3.2; // los agentes se dibujan ×3,2 para que se lean desde la vista de barrio
  function agentes(rutas, flotaObj, vel) { // agentes que recorren rutas en bucle
    const A = []; return { A, ajustar(n) { while (A.length < Math.min(n, flotaObj.max)) { const r = rutas[A.length % rutas.length]; A.push({ r, s: Math.random() * r.L, v: vel * (0.8 + Math.random() * 0.4) }); } A.length = Math.min(A.length, n); },
      mover(dt, kV = 1) { const y = Y(); A.forEach((a, i) => { a.s += a.v * kV * dt; if (a.s > a.r.L) a.s = 0; const [x, z, ang] = enRuta(a.r, a.s); flotaObj.poner(i, x, y, z, ang, ESCALA_VIS); }); flotaObj.fin(A.length); } };
  }
  function anilloMesh(r0, r1, c, op = 0.6) { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.renderOrder = 8; return m; }
  function construir(k) {
    if (ESC[k]) return ESC[k]; const g = new THREE.Group(); grupo.add(g); const E = { g, etiquetas: [] };
    if (k === 'p1') {
      const fC = flota(camion('#b6382f', '#f3f3ee'), 260), fV = flota(furgon('#D5FF3F'), 120); g.add(fC.g, fV.g);
      const rC = rutasHacia(LUG.cora, 1800, 5200, 24); const aC = agentes(rC.length ? rC : [conCum([[0, 0], [1, 1]])], fC, 9);
      // mercados de barrio: nodos repartidos (punto más lejano) a 1,5–3,5 km de Corabastos
      const cand = G.idx.filter((i, j) => j % 7 === 0 && Math.hypot(G.X[i] - LUG.cora[0], G.Z[i] - LUG.cora[1]) > 900 && Math.hypot(G.X[i] - LUG.burro[0], G.Z[i] - LUG.burro[1]) < 3200);
      const MERC = []; if (cand.length) { MERC.push(cand[0]); while (MERC.length < 20) { let m = null, md = -1; for (const p of cand) { const d = Math.min(...MERC.map(q => Math.hypot(G.X[q] - G.X[p], G.Z[q] - G.Z[p]))); if (d > md) { md = d; m = p; } } MERC.push(m); } }
      const marc = MERC.map(i => { const m = anilloMesh(14, 26, '#D5FF3F', 0.9); m.position.set(G.X[i], Y() + 0.6, G.Z[i]); m.visible = false; g.add(m); const pin = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 24, 16).translate(0, 12, 0), mat('#D5FF3F', { emissive: '#3d4a10' })); pin.position.copy(m.position); pin.visible = false; g.add(pin); return { m, pin }; });
      const rV = MERC.slice(0, 20).map(i => { const rs = rutasHacia([G.X[i], G.Z[i]], 1500, 4000, 1); return rs[0]; }).filter(Boolean); const aV = agentes(rV.length ? rV : [conCum([[0, 0], [1, 1]])], fV, 11);
      const aro = anilloMesh(360, 380, '#e15759', 0.7); aro.position.set(LUG.cora[0], Y() + 0.5, LUG.cora[1]); g.add(aro);
      E.etiquetas.push({ p: LUG.cora, h: 60, html: (e) => `${ico('camion', 18)}<b>Corabastos</b><span>${fmt(e.tru)} camiones/día · ${fmt(e.tru * 4.64)} t</span>` });
      E.actualizar = (e, P, B, dt, X) => { aC.ajustar(Math.round(e.tru / 5)); aC.mover(dt, X.pertOn && e.tru < 1000 ? 0.15 : 1); const nM = B ? P.merc : 0; marc.forEach((q, i) => { q.m.visible = q.pin.visible = i < nM; });
        aV.ajustar(B ? Math.round(e.reg * NEED * P.dem / 4.64 / 2) : 0); aV.mover(dt); aro.material.color.set(e.pct < 0.8 ? '#e15759' : '#D5FF3F'); };
    }
    if (k === 'p2') {
      const fA = flota(carro(), 320); g.add(fA.g); const rA = rutasHacia(LUG.bav, 500, 1600, 30); const aA = agentes(rA.length ? rA : [conCum([[0, 0], [1, 1]])], fA, 12);
      const ondas = [0, 1, 2].map(i => { const m = anilloMesh(80 + i * 90, 92 + i * 90, '#f28e2b', 0.35); m.position.set(LUG.bav[0] - 420, Y() + 0.5, LUG.bav[1] + 120); g.add(m); return m; });
      E.etiquetas.push({ p: [LUG.bav[0] - 420, LUG.bav[1] + 120], h: 40, html: (e) => `${ico('auto', 18)}<b>Av. Boyacá</b><span>${fmt(e.V)} carros/h · ${fmt(e.v, 0)} km/h · ${fmt(e.dB, 0)} dB</span>` });
      let tt = 0; E.actualizar = (e, P, B, dt) => { aA.ajustar(Math.round(e.V / 25)); aA.mover(dt, e.v / 19.9); tt += dt; ondas.forEach((m, i) => { const s = 1 + ((tt * 0.4 + i / 3) % 1) * (0.6 + (e.dB - 65) / 15); m.scale.set(s, 1, s); m.material.opacity = 0.45 * (1 - ((tt * 0.4 + i / 3) % 1)); m.material.color.set(e.dB > 70 ? '#e15759' : e.dB > 65 ? '#f28e2b' : '#D5FF3F'); }); };
    }
    if (k === 'p3') {
      const fK = flota(compactador(), 80), fV = flota(furgon('#D5FF3F'), 80); g.add(fK.g, fV.g);
      // salida hacia Doña Juana: nodo mayor más al sur-oriente
      const sal = G.mayores.reduce((b, i) => (G.X[i] + G.Z[i] > G.X[b] + G.Z[b] ? i : b), G.mayores[0]);
      const tS = G.arbol(sal), barrios = G.idx.filter((i, j) => j % 41 === 0 && Math.hypot(G.X[i] - LUG.central[0], G.Z[i] - LUG.central[1]) < 2600);
      const rK = barrios.slice(0, 30).map(i => G.ruta(tS, i)).filter(r => r && r.length > 3).map(r => conCum(r.slice().reverse()));
      const aK = agentes(rK.length ? rK : [conCum([[0, 0], [1, 1]])], fK, 10);
      const est = barrios.filter((_, j) => j % 3 === 0).slice(0, 20).map(i => { const gg = new THREE.Group(); gg.position.set(G.X[i] + 20, Y(), G.Z[i] + 20);
        const nave = new THREE.Mesh(caja(30, 9, 20), mat('#d8d5cc')), techo = new THREE.Mesh(caja(34, 1.2, 24, 9), mat('#D5FF3F', { emissive: '#2c3608' })); const pila = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 10, 0, 6.29, 0, 1.4).scale(1.5, 1, 1), mat('#4a3423', { roughness: 1 })); pila.position.set(0, 0, 20);
        gg.add(nave, techo, pila); gg.visible = false; g.add(gg); return { gg, pila, i }; });
      const rV = est.map(q => { const rs = rutasHacia([G.X[q.i], G.Z[q.i]], 400, 1400, 1, G.idx.filter((_, j) => j % 13 === 0)); return rs[0]; }).filter(Boolean); const aV = agentes(rV.length ? rV : [conCum([[0, 0], [1, 1]])], fV, 8);
      // bolsas de basura acumulada (puntos críticos)
      const fB = flota([[new THREE.SphereGeometry(1.1, 10, 8).scale(1, 0.85, 1).translate(0, 0.9, 0), mat('#202326', { roughness: 0.4 })]], 900); g.add(fB.g);
      const focos = barrios.slice(0, 18).map(i => [G.X[i] + 8, G.Z[i] - 8]);
      E.etiquetas.push({ p: LUG.central, h: 50, html: (e) => `${ico('residuo', 18)}<b>Kennedy</b><span>${fmt(e.tot)} t/día · ${fmt(e.cam)} camiones al relleno</span>` });
      E.actualizar = (e, P, B, dt) => { aK.ajustar(Math.round(e.cam / 4)); aK.mover(dt); est.forEach((q, i) => { q.gg.visible = B && i < P.est; const s = 0.5 + Math.min(1.6, e.proc / Math.max(1, P.est * 12)); q.pila.scale.set(1.5 * s, s, s); });
        aV.ajustar(B ? Math.round(e.proc / 6) : 0); aV.mover(dt);
        const nb = Math.min(900, Math.round(e.acum / 4)); for (let i = 0; i < nb; i++) { const f = focos[i % focos.length], a = i * 2.39996, r = 3 + Math.sqrt(i / focos.length) * 3.2; fB.poner(i, f[0] + Math.cos(a) * r, Y() + Math.floor(i / (focos.length * 12)) * 1.2, f[1] + Math.sin(a) * r, a, ESCALA_VIS * 0.9); } fB.fin(nb); };
    }
    if (k === 'p4') {
      // aves: una por especie, volando en círculos sobre el humedal; corredores verdes con la propuesta
      const ave = new THREE.BufferGeometry(); ave.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.6, -2.4, 0, -0.6, 0, 0.25, -0.2, 0, 0, 1.6, 0, 0.25, -0.2, 2.4, 0, -0.6, 0, 0, 1.6, 0, -0.3, -1.2, 0, 0.25, -0.2], 3)); ave.computeVertexNormals();
      const fAv = flota([[ave, mat('#2b2f2c', { side: THREE.DoubleSide })]], 90); g.add(fAv.g);
      const pts = [LUG.burro, LUG.vaca, LUG.techo, LUG.bav];
      const corr = [[0, 1], [0, 2], [0, 3]].map(([a, b]) => { const A = pts[a], B2 = pts[b], c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(A[0], Y() + 2, A[1]), new THREE.Vector3((A[0] + B2[0]) / 2, Y() + 2, (A[1] + B2[1]) / 2 + 80), new THREE.Vector3(B2[0], Y() + 2, B2[1]));
        const m = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 14, 6), new THREE.MeshBasicMaterial({ color: '#59a14f', transparent: true, opacity: 0.75, toneMapped: false })); m.visible = false; g.add(m); return m; });
      const hum = anilloMesh(260, 285, '#59a14f', 0.8); hum.position.set(LUG.burro[0], Y() + 0.5, LUG.burro[1]); g.add(hum);
      const AV = Array.from({ length: 90 }, (_, i) => ({ c: pts[i % 3], r: 80 + Math.random() * 220, a: Math.random() * 6.28, h: 25 + Math.random() * 50, w: 0.15 + Math.random() * 0.25 }));
      E.etiquetas.push({ p: LUG.burro, h: 90, html: (e) => `${ico('ave', 18)}<b>Humedal El Burro</b><span>${fmt(e.S)} especies de aves</span>` });
      E.actualizar = (e, P, B, dt) => { const n = Math.round(e.S); for (let i = 0; i < n; i++) { const a = AV[i]; a.a += a.w * dt; fAv.poner(i, a.c[0] + Math.cos(a.a) * a.r, Y() + a.h + Math.sin(a.a * 3) * 3, a.c[1] + Math.sin(a.a) * a.r, -a.a, 3.4); } fAv.fin(n);
        corr.forEach(m => { m.visible = B && P.corr > 0; m.scale.setScalar(1); }); hum.material.color.set(e.S <= 34.3 ? '#e15759' : e.S < 45 ? '#f28e2b' : '#59a14f'); };
    }
    if (k === 'p5') {
      // torres de población: 1 piso = 10.000 habitantes; parques verdes; colegios nuevos
      const torre = (p) => { const gg = new THREE.Group(); gg.position.set(p[0], Y(), p[1]); g.add(gg); const pisos = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(caja(110, 11, 110, i * 13), mat(i % 2 ? '#c9c4b8' : '#b7b1a4')); m.visible = false; gg.add(m); pisos.push(m); } return pisos; };
      const PB = torre(LUG.patio), TN = torre(LUG.tintal);
      const verde = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#59a14f', transparent: true, opacity: 0.55, depthWrite: false })); verde.position.set(LUG.tintal[0] + 380, Y() + 0.4, LUG.tintal[1] - 200); g.add(verde);
      const cols = Array.from({ length: 12 }, (_, i) => { const m = new THREE.Mesh(caja(40, 14, 40), mat('#D5FF3F', { emissive: '#2c3608' })); const a = i * 0.52; m.position.set(LUG.patio[0] + 500 + Math.cos(a) * 260, Y(), LUG.patio[1] + Math.sin(a) * 260); m.visible = false; g.add(m); return m; });
      E.etiquetas.push({ p: LUG.patio, h: 360, html: (e) => `${ico('casa', 18)}<b>Patio Bonito</b><span>${fmt(e.pb)} hab · ${fmt(e.pb / 317)} hab/ha</span>` });
      E.etiquetas.push({ p: LUG.tintal, h: 120, html: (e) => `${ico('casa', 18)}<b>Tintal Norte</b><span>${fmt(e.tn)} hab · ${fmt(e.tn / 343)} hab/ha</span>` });
      E.actualizar = (e, P, B) => { const a = Math.round(e.pb / 1e4), b = Math.round(e.tn / 1e4); PB.forEach((m, i) => { m.visible = i < a; }); TN.forEach((m, i) => { m.visible = i < b; });
        const r = Math.sqrt(Math.max(0, e.parque) * 3e4 / Math.PI); verde.scale.set(r, 1, r); cols.forEach((m, i) => { m.visible = B && i < P.eq; }); };
    }
    if (k === 'p6') {
      const mon = new THREE.CylinderGeometry(9, 9, 2.4, 24).translate(0, 1.2, 0), fM = flota([[mon, mat('#e2b13c', { metalness: 0.8, roughness: 0.3 })]], 800); g.add(fM.g);
      const vuelo = []; E.etiquetas.push(...SECTORES.map((q, i) => ({ p: q.p, h: 70, html: (e) => `${ico('moneda', 18)}<b>${q.n}</b><span>${fmt((e.asig[i] || 0) / 1000, 1)} mil M · ${e.nec && e.nec[i] > 0 ? (e.asig[i] >= e.nec[i] * 0.8 ? 'atendido' : 'le falta') : 'sin necesidad'}</span>` })));
      E.etiquetas.push({ p: LUG.alcaldia, h: 40, html: () => `${ico('moneda', 18)}<b>Fondo de Desarrollo Local</b><span>193.000 millones (2025)</span>` });
      let tt = 0; E.actualizar = (e, P, B, dt) => { tt += dt; let n = 0; SECTORES.forEach((q, i) => { const m = Math.round((e.asig[i] || 0) / 1000); for (let j = 0; j < m && n < 760; j++, n++) { const col = j % 4, piso = Math.floor(j / 4); fM.poner(n, q.p[0] + (col % 2) * 22 - 11, Y() + piso * 2.6, q.p[1] + (col >> 1) * 22 - 11, 0, 1); } });
        for (let k2 = 0; k2 < 30 && n < 800; k2++, n++) { const q = SECTORES[k2 % SECTORES.length], f = ((tt * 0.25 + k2 / 30) % 1), x = LUG.alcaldia[0] + (q.p[0] - LUG.alcaldia[0]) * f, z = LUG.alcaldia[1] + (q.p[1] - LUG.alcaldia[1]) * f; fM.poner(n, x, Y() + 20 + Math.sin(f * Math.PI) * 160, z, tt, 1); }
        fM.fin(n); };
    }
    ESC[k] = E; return E;
  }

  /* ---------- estado de la corrida (par A/B) ---------- */
  let VUELO = null;
  const ST = { k: null, modo: (() => { try { return localStorage.getItem('ss-modo') || 'ninos'; } catch (e) { return 'ninos'; } })(), ver: 'B', t: 0, corre: false, vel: 4, A: null, B: null, par: {}, pertOn: false, pertHasta: 0 };
  const sim = () => SIMS.find(s => s.k === ST.k);
  function reiniciar() { const S = sim(); ST.t = 0; ST.A = S.estado(); ST.B = S.estado(); ST.pertOn = false; ST.pertHasta = 0; paso(); }
  function paso() { const S = sim(), X = { pertOn: ST.pertOn }; if (S.k === 'p1' && ST.pertOn && ST.A.bloq === 0 && ST.t === ST.pertIni) { ST.A.bloq = ST.B.bloq = ST.par.bloqDur; }
    S.paso(ST.A, ST.par, false, ST.t, X); S.paso(ST.B, ST.par, true, ST.t, X); if (ST.pertOn && ST.t >= ST.pertHasta) ST.pertOn = false; }

  /* ---------- interfaz ---------- */
  const css = document.createElement('style'); css.textContent = `
  .ss-i{display:inline-block;vertical-align:middle;flex:none}
  #ss-bar{position:fixed;left:14px;top:84px;bottom:20px;z-index:32;width:262px;overflow:auto;display:flex;flex-direction:column;gap:6px;padding:8px;background:rgba(9,14,11,.9);border:1px solid rgba(213,255,63,.22);border-radius:4px;backdrop-filter:blur(12px)}
  .ss-row{padding:8px;border:1px solid rgba(244,243,239,.08);border-radius:3px} .ss-row.on{border-color:#D5FF3F;background:rgba(213,255,63,.06)}
  .ss-row .t{display:flex;align-items:center;gap:8px;font:800 12px Manrope,sans-serif;color:#F4F3EF;letter-spacing:.02em;margin-bottom:7px} .ss-row .t .ss-i{color:#D5FF3F} .ss-row .t small{display:block;font:600 11px Manrope;color:#b5bcb3;letter-spacing:0}
  .ss-row .b{display:grid;grid-template-columns:1fr 1fr;gap:5px} .ss-row .b button{padding:9px 4px;background:rgba(244,243,239,.04);border:1px solid rgba(244,243,239,.16);border-radius:2px;color:#dfe3dc;font:800 10.5px Manrope;letter-spacing:.03em;cursor:pointer}
  .ss-row .b button:hover{border-color:#D5FF3F} .ss-row .b button.on{background:#D5FF3F;color:#08090C;border-color:#D5FF3F} .ss-row .b button[data-v="A"].on{background:#F4F3EF;border-color:#F4F3EF}
  .ss-mas{margin-top:auto;padding:9px;background:none;border:1px dashed rgba(244,243,239,.2);border-radius:3px;color:#b5bcb3;font:600 11px Manrope;cursor:pointer}
  #ss-modo{position:fixed;top:14px;right:300px;z-index:40;display:flex;background:rgba(9,14,11,.86);border:1px solid rgba(213,255,63,.3);border-radius:3px;overflow:hidden}
  #ss-modo button{display:flex;align-items:center;gap:6px;padding:9px 13px;background:none;border:0;color:#b5bcb3;font:700 12px Manrope,sans-serif;cursor:pointer} #ss-modo button.on{background:#D5FF3F;color:#08090C}
  #ss-pan{position:fixed;right:14px;top:84px;bottom:20px;z-index:33;width:min(400px,calc(100vw - 28px));display:none;flex-direction:column;background:rgba(9,14,11,.94);border:1px solid rgba(213,255,63,.22);border-radius:4px;color:#F4F3EF;font-family:Manrope,sans-serif;backdrop-filter:blur(14px);overflow:auto}
  body.ss-on #ss-pan{display:flex} body.ss-simple #gs-izq, body.ss-simple #dock, body.ss-simple #dr-btn, body.ss-simple #dr-pan, body.ss-simple #cvMini, body.ss-simple #cvAyuda, body.ss-simple #hud-c, body.ss-simple #toast, body.ss-simple #esc, body.ss-simple #esim, body.ss-simple .es-et, body.ss-simple #gs-cv2, body.ss-simple #gs-der, body.ss-simple #bt-pan, body.ss-simple #hid-red{display:none!important} body.ss-simple .u-fuentes-btn{left:auto;right:14px;bottom:auto;top:60px;display:none} body.ss-simple:not(.ss-ninos) .u-fuentes-btn{display:none}
  body.ss-ninos #gs-der, body.ss-ninos #bt-pan, body.ss-ninos #hid-red{display:none!important}
  .ss-h{display:flex;align-items:center;gap:10px;padding:16px 16px 6px} .ss-h .ic{width:46px;height:46px;display:grid;place-items:center;background:#D5FF3F;color:#08090C;border-radius:3px}
  .ss-h b{font-size:17px;line-height:1.15} .ss-h small{display:block;font:500 9.5px 'JetBrains Mono',monospace;letter-spacing:.14em;color:#D5FF3F;text-transform:uppercase;margin-bottom:3px}
  .ss-h .x{margin-left:auto;background:none;border:0;color:#b5bcb3;cursor:pointer}
  .ss-txt{padding:4px 16px 8px;font-size:14px;line-height:1.5;color:#dfe3dc} .ss-esc{margin:0 16px 10px;font:500 11px 'JetBrains Mono',monospace;color:#b5bcb3;display:flex;gap:6px;align-items:center}
  .ss-sw{display:grid;grid-template-columns:1fr 1fr;margin:4px 16px 12px;border:1px solid rgba(213,255,63,.35);border-radius:3px;overflow:hidden}
  .ss-sw button{padding:13px 6px;background:none;border:0;color:#b5bcb3;font:800 13px Manrope;cursor:pointer;letter-spacing:.02em} .ss-sw button.on{background:#D5FF3F;color:#08090C}
  .ss-ctrl{padding:6px 16px} .ss-ctrl label{display:flex;align-items:center;gap:8px;font-size:12.5px;color:#dfe3dc} .ss-ctrl label b{margin-left:auto;font:600 13px 'JetBrains Mono',monospace;color:#D5FF3F}
  .ss-ctrl input{width:100%;accent-color:#D5FF3F;height:26px} body.ss-ninos .ss-ctrl input{height:34px}
  .ss-pert{margin:8px 16px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;background:#2a1513;border:1px solid #e15759;color:#ffb3ab;font:700 13px Manrope;border-radius:3px;cursor:pointer} .ss-pert.on{background:#e15759;color:#fff}
  .ss-tiempo{display:flex;align-items:center;gap:8px;margin:6px 16px;padding:8px 10px;border:1px solid rgba(244,243,239,.1);border-radius:3px}
  .ss-tiempo button{display:grid;place-items:center;width:38px;height:38px;background:rgba(213,255,63,.08);border:1px solid rgba(213,255,63,.3);color:#D5FF3F;border-radius:3px;cursor:pointer}
  .ss-tiempo .bar{flex:1;height:6px;background:rgba(244,243,239,.1);border-radius:3px;overflow:hidden} .ss-tiempo .bar i{display:block;height:100%;background:#D5FF3F}
  .ss-tiempo span{font:500 11px 'JetBrains Mono',monospace;color:#b5bcb3;min-width:92px;text-align:right}
  .ss-res{margin:8px 16px;padding:12px;border-radius:3px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:14px} .ss-res.ok{background:rgba(89,161,79,.16);border:1px solid #59a14f;color:#bfe8b6} .ss-res.mal{background:rgba(225,87,89,.16);border:1px solid #e15759;color:#ffc2bd}
  .ss-k3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 16px} .ss-k3 div{background:rgba(213,255,63,.05);border:1px solid rgba(244,243,239,.1);border-radius:3px;padding:10px 8px;text-align:center}
  .ss-k3 b{display:block;font:700 20px 'JetBrains Mono',monospace;color:#F4F3EF;margin-top:6px} .ss-k3 span{font-size:11px;color:#b5bcb3} .ss-k3 .ss-i{color:#D5FF3F}
  .ss-tab{margin:8px 16px 14px;border-collapse:collapse;width:calc(100% - 32px);font-size:11.5px} .ss-tab th{font:500 9px 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#7d877e;text-align:left;padding:6px 4px;border-bottom:1px solid rgba(244,243,239,.12)}
  .ss-tab td{padding:7px 4px;border-bottom:1px solid rgba(244,243,239,.07);vertical-align:top} .ss-tab td.n{font:600 11.5px 'JetBrains Mono',monospace;text-align:right;white-space:nowrap} .ss-tab td.b{color:#D5FF3F} .ss-tab td.f{color:#7d877e;font-size:10.5px}
  .ss-go{margin:8px 16px;padding:10px 12px;border:1px solid #e15759;background:rgba(225,87,89,.12);border-radius:3px;font-size:12px;color:#ffc2bd;line-height:1.5}
  .ss-link{margin:0 16px 16px;font-size:11.5px} .ss-link a{color:#D5FF3F}
  #ss-lbl{position:fixed;inset:0;pointer-events:none;z-index:20} .ss-l{position:absolute;transform:translate(-50%,-100%);display:flex;align-items:center;gap:7px;padding:7px 11px;background:rgba(9,14,11,.88);border:1px solid rgba(213,255,63,.45);border-radius:3px;color:#F4F3EF;font:600 12px Manrope;white-space:nowrap}
  .ss-l .ss-i{color:#D5FF3F} .ss-l span{font-weight:500;color:#b5bcb3;margin-left:4px} body.ss-ninos .ss-l{font-size:14px;padding:9px 13px}
  @media(max-width:760px){#ss-bar{top:auto;bottom:8px;left:8px;right:8px;width:auto;flex-direction:row;overflow-x:auto;padding:6px}.ss-row{min-width:200px}.ss-mas{display:none}#ss-modo{right:8px;top:70px}#ss-pan{left:8px;right:8px;width:auto;top:auto;bottom:128px;max-height:46vh}}`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.id = 'ss-bar';
  bar.innerHTML = SIMS.map((s, i) => `<div class="ss-row" data-k="${s.k}"><div class="t">${ico(s.ic, 22)}<div>SIMULACIÓN ${i + 1}<small>${s.largo}</small></div></div><div class="b"><button data-k="${s.k}" data-v="A">SIN PROPUESTA</button><button data-k="${s.k}" data-v="B">CON PROPUESTA</button></div></div>`).join('') + '<button class="ss-mas" data-a="mas">Herramientas avanzadas</button>';
  const modo = document.createElement('div'); modo.id = 'ss-modo'; modo.innerHTML = `<button data-m="ninos">${ico('nino', 16)}Niños</button><button data-m="adultos">${ico('adulto', 16)}Adultos</button>`;
  const pan = document.createElement('div'); pan.id = 'ss-pan';
  const lbl = document.createElement('div'); lbl.id = 'ss-lbl';
  document.body.append(bar, modo, pan, lbl);
  const marcarMenu = () => { bar.querySelectorAll('.ss-row').forEach(r => r.classList.toggle('on', r.dataset.k === ST.k)); bar.querySelectorAll('.ss-row .b button').forEach(x => x.classList.toggle('on', x.dataset.k === ST.k && x.dataset.v === ST.ver)); };
  const pintarModo = () => { modo.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === ST.modo)); document.body.classList.toggle('ss-ninos', ST.modo === 'ninos'); };
  pintarModo();

  function volar(p, d) { const cam = T3.camera, t = T3.orbit.target; const h = new THREE.Vector3(0.55, 0, 0.83).normalize(); const c1 = new THREE.Vector3(p[0], 1, p[1]), p1 = c1.clone().addScaledVector(h, d * 0.62); p1.y = d * 0.62; VUELO = { t: 0, dur: 1.8, p0: cam.position.clone(), p1, c0: t.clone(), c1 }; }
  function abrir(k) {
    if (ST.k === k) { cerrar(); return; }
    try { localStorage.setItem('ken-guia-v1', '1'); } catch (er) {} const sal = [...document.querySelectorAll('button.sal')].find(x => /Saltar/.test(x.textContent)); if (sal) sal.click();
    ST.k = k; const S = sim(); ST.par = { ...S.par }; ST.ver = 'B'; ST.corre = true; ST.pertIni = -1;
    
    for (const [kk, E] of Object.entries(ESC)) E.g.visible = kk === k; construir(k).g.visible = true; grupo.visible = true;
    document.body.classList.add('ss-on'); reiniciar(); volar(LUG[S.lugar], S.dist); pintar(true); marcarMenu();
  }
  function cerrar() { ST.k = null; grupo.visible = false; document.body.classList.remove('ss-on'); bar.querySelectorAll('.on').forEach(b => b.classList.remove('on')); lbl.innerHTML = ''; }
  function pintar(todo) {
    const S = sim(); if (!S) return; const e = ST.ver === 'A' ? ST.A : ST.B, a = ST.A, b = ST.B, ninos = ST.modo === 'ninos';
    const go = e.go, bien = S.bueno(e) && !go;
    if (todo) {
      pan.innerHTML = `<div class="ss-h"><div class="ic">${ico(S.ic, 28)}</div><div><small>SIM ${SIMS.indexOf(S) + 1} · ${ninos ? 'modo niños' : 'modo adultos'}</small><b>${S.largo}</b></div><button class="x" data-a="cerrar" aria-label="Cerrar">${ico('cerrar', 18)}</button></div>
        <div class="ss-txt">${S.nino}</div><div class="ss-esc">${ico('rayo', 14)}${S.escala}</div>
        <div class="ss-ver" style="margin:0 16px 10px;padding:9px 12px;border-radius:3px;font:800 13px Manrope;letter-spacing:.03em"></div>
        ${S.ctrl.filter(c => !(ninos && c.soloB && false)).map(c => `<div class="ss-ctrl" data-c="${c.k}"><label>${ico(c.ia, 16)}${c.n}${c.soloB ? ' <em style="color:#7d877e;font-style:normal;font-size:10.5px">(propuesta)</em>' : ''}<b></b></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${ST.par[c.k]}"></div>`).join('')}
        <button class="ss-pert" data-a="pert">${ico('rayo', 18)}${S.pert}</button>
        <div class="ss-tiempo"><button data-a="play" aria-label="Pausa">${ico('pausa', 18)}</button><button data-a="rein" aria-label="Reiniciar">${ico('reinicio', 18)}</button><div class="bar"><i></i></div><span></span></div>
        <div class="ss-vivo"></div>`;
    }
    const vv = pan.querySelector('.ss-ver'); if (vv) { vv.textContent = 'SIMULACIÓN ' + (SIMS.indexOf(S) + 1) + ' · ' + (ST.ver === 'A' ? 'SIN PROPUESTA' : 'CON PROPUESTA'); vv.style.background = ST.ver === 'A' ? '#F4F3EF' : '#D5FF3F'; vv.style.color = '#08090C'; }
    pan.querySelectorAll('[data-c]').forEach(c => { const cc = S.ctrl.find(q => q.k === c.dataset.c); c.style.display = cc && cc.soloB && ST.ver === 'A' ? 'none' : ''; });
    S.ctrl.forEach(c => { const el = pan.querySelector(`[data-c="${c.k}"] b`); if (el) el.textContent = c.f(ST.par[c.k]); });
    pan.querySelector('[data-a="pert"]').classList.toggle('on', ST.pertOn);
    pan.querySelector('[data-a="play"]').innerHTML = ico(ST.corre ? 'pausa' : 'play', 18);
    pan.querySelector('.ss-tiempo .bar i').style.width = (ST.t / SEM_MAX * 100) + '%';
    pan.querySelector('.ss-tiempo span').textContent = `año ${Math.floor(ST.t / 52) + 1} · sem ${ST.t % 52 + 1}`;
    const vivo = pan.querySelector('.ss-vivo');
    const res = `<div class="ss-res ${bien ? 'ok' : 'mal'}">${ico(bien ? 'ok' : 'alerta', 30)}<div>${go ? 'GAME OVER' : bien ? (ninos ? '¡Va bien!' : 'Cumple la meta de diseño') : (ninos ? 'Cuidado, va mal' : 'No cumple la meta')}<div style="font-weight:500;font-size:11.5px;opacity:.85">${ST.ver === 'A' ? 'Sin propuesta' : 'Con propuesta'}</div></div></div>`;
    const goTxt = (n, x) => x.go ? `<div class="ss-go"><b>GAME OVER ${n}</b> · semana ${x.go.sem + 1} (año ${Math.floor(x.go.sem / 52) + 1})<br>${x.go.ind}<br>Lugar: ${x.go.lugar}</div>` : '';
    vivo.innerHTML = res + (ninos ? `<div class="ss-k3">${S.nino3(a, b, e).map(([ic, v, t]) => `<div>${ico(ic, 22)}<b>${v}</b><span>${t}</span></div>`).join('')}</div>`
      : `<table class="ss-tab"><thead><tr><th>Indicador</th><th style="text-align:right">Sin</th><th style="text-align:right">Con</th><th>Referencia</th></tr></thead><tbody>${S.filas(a, b).map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n b">${r[2]}</td><td class="f">${r[3]}</td></tr>`).join('')}</tbody></table>`)
      + goTxt('sin propuesta', a) + goTxt('con propuesta', b)
      + (ninos ? '' : `<div class="ss-link"><b style="color:#F4F3EF">Lógica y papers</b><ul style="margin:6px 0 10px;padding-left:16px;line-height:1.45">${LOGICA[S.k].map(([q, r, u]) => `<li>${q}<br><a href="${u}" target="_blank" rel="noopener">${r} ↗</a></li>`).join('')}</ul></div><div class="ss-link">Fuentes, supuestos y decisiones de diseño de cada cifra: <a href="fuentes.html" target="_blank" rel="noopener">matriz de fuentes ↗</a></div>`);
  }
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'mas') { document.body.classList.toggle('ss-simple'); b.textContent = document.body.classList.contains('ss-simple') ? 'Herramientas avanzadas' : 'Interfaz simple'; return; } if (ST.k !== b.dataset.k) abrir(b.dataset.k); ST.ver = b.dataset.v; marcarMenu(); pintar(); });
  document.body.classList.add('ss-simple');
  modo.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ST.modo = b.dataset.m; try { localStorage.setItem('ss-modo', ST.modo); } catch (er) {} pintarModo(); if (ST.k) pintar(true); });
  pan.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.v) { ST.ver = b.dataset.v; pintar(); return; }
    const a = b.dataset.a; if (a === 'cerrar') cerrar(); if (a === 'play') { if (ST.t >= SEM_MAX - 1) reiniciar(); ST.corre = !ST.corre; pintar(); }
    if (a === 'rein') { reiniciar(); ST.corre = true; pintar(); }
    if (a === 'pert') { ST.pertOn = !ST.pertOn; ST.pertIni = ST.t; ST.pertHasta = ST.pertOn ? ST.t + (ST.k === 'p1' ? ST.par.bloqDur : ST.k === 'p4' ? 52 : 26) : 0; if (ST.k === 'p1' && ST.pertOn) { ST.A.bloq = ST.B.bloq = ST.par.bloqDur; } pintar(); } });
  pan.addEventListener('input', e => { const c = e.target.closest('[data-c]'); if (!c) return; ST.par[c.dataset.c] = +e.target.value; pintar(); });

  /* ---------- bucle ---------- */
  let ult = performance.now(), acc = 0, pintAcc = 0; const V3 = new THREE.Vector3();
  function bucle(now) {
    requestAnimationFrame(bucle); const dt = Math.min(0.1, (now - ult) / 1000); ult = now;
    if (VUELO) { T3.anim = null; const a = VUELO; a.t += dt; const u = Math.min(1, a.t / a.dur), k2 = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.orbit.target.lerpVectors(a.c0, a.c1, k2); T3.camera.position.lerpVectors(a.p0, a.p1, k2); T3.camera.lookAt(T3.orbit.target); if (u >= 1) VUELO = null; }
    if (!ST.k) return; const S = sim(), E = ESC[ST.k];
    if (ST.corre && ST.t < SEM_MAX - 1) { acc += dt * ST.vel; while (acc >= 1) { acc -= 1; ST.t++; paso(); } }
    if (!ST.corre) acc = 0;
    if (ST.corre && ST.t >= SEM_MAX - 1) ST.corre = false;
    const e = ST.ver === 'A' ? ST.A : ST.B; E.actualizar(e, ST.par, ST.ver === 'B', dt, { pertOn: ST.pertOn });
    pintAcc += dt; if (pintAcc > 0.25) { pintAcc = 0; pintar(); }
    // etiquetas 3D
    const w = innerWidth, h = innerHeight; let html = '';
    for (const L of E.etiquetas) { V3.set(L.p[0], Y() + L.h, L.p[1]).project(T3.camera); if (V3.z > 1 || Math.abs(V3.x) > 1.1 || Math.abs(V3.y) > 1.1) continue; html += `<div class="ss-l" style="left:${(V3.x + 1) / 2 * w}px;top:${(1 - V3.y) / 2 * h}px">${L.html(e)}</div>`; }
    lbl.innerHTML = html;
  }
  requestAnimationFrame(bucle);
  const arranque = () => { if (T3.anim || T3.llegada) return setTimeout(arranque, 500); if (!ST.k) { abrir('p1'); ST.ver = 'A'; marcarMenu(); pintar(); } }; setTimeout(arranque, 1500);
  return { abrir, cerrar, ST, grupo, ESC, T3, G, rutasHacia };
}
