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
  central: W(4.623167, -74.154738), pt: W(4.6395, -74.1678), alcaldia: W(4.6268, -74.1517), americas: W(4.619142, -74.135191)
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
  { k: 'p1', n: 'Abastecimiento', largo: 'Abastecimiento y producción distribuida', ic: 'camion', lugar: 'cora', dist: 650, distB: 2300,
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
  { k: 'p3', n: 'Residuos', largo: 'Residuos y circularidad', ic: 'residuo', lugar: 'central', dist: 1000, distB: 1600,
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
  { k: 'p4', n: 'Biodiversidad', largo: 'Biodiversidad y conectividad ecológica', ic: 'ave', lugar: 'burro', dist: 900, distB: 1700,
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
  { k: 'p5', n: 'Población', largo: 'Población y presiones sobre el suelo', ic: 'casa', lugar: 'pt', dist: 2600,
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

/* ---------- anillos de % (lo que se lee primero, en los dos modos) ---------- */
const RINGS = {
  p1: (e, P) => [['Comida que llega', e.pct, fmt(e.pct * 100) + '%'], ['Hogares con mercado cerca', e.cob, fmt(e.cob * 100) + '%'], ['Camiones a Corabastos', Math.min(1, e.tru / 1800), fmt(e.tru)]],
  p2: (e, P) => [['Velocidad', Math.min(1, e.v / 40), fmt(e.v, 0) + ' km/h'], ['Ruido', cl((e.dB - 55) / 25, 0, 1), fmt(e.dB, 0) + ' dB', true], ['Carros por hora', Math.min(1, e.V / 6000), fmt(e.V)]],
  p3: (e, P) => [['Orgánicos aprovechados', e.org ? e.proc / e.org : 0, fmt(e.org ? e.proc / e.org * 100 : 0) + '%'], ['Basura al relleno', e.tot ? e.dj / e.tot : 0, fmt(e.tot ? e.dj / e.tot * 100 : 0) + '%', true], ['Basura acumulada', Math.min(1, e.acum / (2 * POB * 1.1 / 1000)), fmt(e.acum) + ' t', true]],
  p4: (e, P) => [['Especies frente a hoy', Math.min(1, e.S / 49), fmt(e.S)], ['Hábitat (ha)', Math.min(1, e.area / 60), fmt(e.area, 0) + ' ha'], ['Conectividad', e.conect, fmt(e.conect * 100) + '%']],
  p5: (e, P) => [['Parque por persona', Math.min(1, e.parque / 4), fmt(e.parque, 1) + ' m²'], ['Niños sin cupo', 1 - Math.min(1, e.deficit / 11300), fmt(e.deficit)], ['Densidad Patio Bonito', Math.min(1, e.pb / 317 / 600), fmt(e.pb / 317) + '/ha', true]],
  p6: (e, P) => [['Necesidades atendidas', e.aten, fmt(e.aten * 100) + '%'], ['Barrios con ayuda', 1 - e.sin / 6, fmt(6 - e.sin) + ' de 6'], ['Decide la comunidad', P.partic / 100, fmt(P.partic) + '%']]
};
const anillo = (v, malo) => { const r = 26, c = 2 * Math.PI * r, f = cl(v || 0, 0, 1), col = malo ? (f > 0.66 ? '#ff6b5e' : f > 0.4 ? '#f2b84b' : '#D5FF3F') : (f < 0.5 ? '#ff6b5e' : f < 0.8 ? '#f2b84b' : '#D5FF3F');
  return `<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="${r}" fill="none" stroke="rgba(244,243,239,.1)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 32 32)"/></svg>`; };

export async function iniciarSeisSims({ getT3 }) {
  const espera = () => new Promise(r => { const f = () => { const T = getT3(); T && T.net && T.lw && T.camera && T.orbit ? r(T) : setTimeout(f, 500); }; f(); });
  const T3 = await espera(), THREE = T3.THREE;
  const PJ = await fetch('data3d/propuesta.json?v=1').then(r => r.json()).catch(() => null);
  const Y = () => (T3.viaY != null ? T3.viaY : 0.62) + 0.4;
  /* ---------- grafo de vías reales (net.json); nodos unidos a 12 m (a 4 m la red queda partida) ---------- */
  const G = (() => {
    const key = new Map(), X = [], Z = [], adj = [];
    const nodo = (x, z) => { const k = Math.round(x / 12) + ',' + Math.round(z / 12); let i = key.get(k); if (i === undefined) { i = X.length; key.set(k, i); X.push(x); Z.push(z); adj.push([]); } return i; };
    for (const [cls, pts0] of T3.net.edges) {
      if (!pts0 || pts0.length < 2) continue;
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
  const enRuta = (r, s) => { let lo = 1, hi = r.cum.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (r.cum[m] < s) lo = m + 1; else hi = m; } const i = lo, a = r.pts[i - 1], b = r.pts[i], f = (s - r.cum[i - 1]) / ((r.cum[i] - r.cum[i - 1]) || 1); return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[0] - a[0], b[1] - a[1])]; };
  const rutasHacia = (dest, rMin, rMax, n, lista = G.mayores) => { const d = G.cercano(dest[0], dest[1]), t = G.arbol(d), cand = lista.filter(i => { const q = Math.hypot(G.X[i] - dest[0], G.Z[i] - dest[1]); return q > rMin && q < rMax; });
    const out = []; for (let k = 0; k < cand.length && out.length < n; k += Math.max(1, Math.floor(cand.length / n))) { const r = G.ruta(t, cand[k]); if (r && r.length > 3) out.push(conCum(r.slice().reverse())); } return out.length ? out : [conCum([[dest[0] - 300, dest[1]], [dest[0], dest[1]]])]; };

  /* ---------- materiales y piezas: todo va en la lista transparente (renderOrder alto) para quedar ENCIMA del velo que apaga la ciudad ---------- */
  const RO = 40;
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.1, transparent: true, opacity: 1, ...o });
  const brillo = (c, op = 0.55) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const borde = (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.95, toneMapped: false });
  function flota(partes, max) {
    const g = new THREE.Group(); const ms = partes.map(([geo, m]) => { const im = new THREE.InstancedMesh(geo, m, max); im.count = 0; im.frustumCulled = false; im.renderOrder = RO + 2; g.add(im); return im; });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3(), E = new THREE.Euler();
    return { g, max, poner(i, x, y, z, ang, esc = 1, sy = esc) { P.set(x, y, z); E.set(0, ang, 0); Q.setFromEuler(E); S.set(esc, sy, esc); M.compose(P, Q, S); for (const im of ms) im.setMatrixAt(i, M); },
      fin(n) { for (const im of ms) { im.count = n; im.instanceMatrix.needsUpdate = true; } } };
  }
  const caja = (w, h, l, y = 0, z = 0) => new THREE.BoxGeometry(w, h, l).translate(0, y + h / 2, z);
  const ruedas = (zs) => { const pos = [], idx = []; let off = 0; for (const z of zs) { const g = new THREE.CylinderGeometry(0.55, 0.55, 2.5, 10).rotateZ(Math.PI / 2).translate(0, 0.55, z); for (const v of g.attributes.position.array) pos.push(v); for (const v of g.index.array) idx.push(v + off); off += g.attributes.position.count; } const r = new THREE.BufferGeometry(); r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); r.setIndex(idx); r.computeVertexNormals(); return r; };
  const mNegro = mat('#15171a', { roughness: 0.9 }), mVidrio = mat('#7fb7d6', { emissive: '#1d3c4c', metalness: 0.5, roughness: 0.15 });
  const camion = (cab, cj) => [[caja(2.4, 2.3, 2.2, 0.8, 3.2), mat(cab, { emissive: cab, emissiveIntensity: 0.35 })], [caja(2.3, 0.8, 0.12, 2.0, 4.31), mVidrio], [caja(2.5, 3.0, 6.0, 0.9, -1.1), mat(cj, { emissive: cj, emissiveIntensity: 0.25 })], [ruedas([3.2, -0.6, -2.8]), mNegro]];
  const furgon = (c) => [[caja(2.0, 1.4, 2.0, 0.6, 1.8), mat(c, { emissive: c, emissiveIntensity: 0.5 })], [caja(2.0, 2.1, 3.4, 0.6, -0.9), mat('#f6f7f1', { emissive: '#3a3d33' })], [ruedas([1.8, -1.6]), mNegro]];
  const carro = () => [[caja(1.8, 0.75, 4.3, 0.35), mat('#ffffff', { emissive: '#666a70', metalness: 0.4 })], [caja(1.6, 0.6, 2.2, 1.1, -0.2), mVidrio], [ruedas([1.3, -1.3]), mNegro]];
  const compactador = () => [[caja(2.4, 2.2, 2.2, 0.8, 3.2), mat('#f2f3ee', { emissive: '#40433a' })], [caja(2.5, 3.1, 6.0, 0.9, -1.1), mat('#3fb36b', { emissive: '#1f6b3c' })], [ruedas([3.2, -0.6, -2.8]), mNegro]];
  // volumen extruido de un polígono (mundo x,z) con contorno brillante: así se resaltan predios y zonas como en la lámina de referencia
  function volumen(poly, h, color, op = 0.42) {
    const sh = new THREE.Shape(poly.map(p => new THREE.Vector2(p[0], -p[1])));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
    const g = new THREE.Group(); const m = new THREE.Mesh(geo, brillo(color, op)); m.renderOrder = RO; g.add(m);
    const ed = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), borde(color)); ed.renderOrder = RO + 1; g.add(ed); g.position.y = Y(); return g;
  }
  const circulo = (c, r, n = 40) => Array.from({ length: n }, (_, i) => [c[0] + Math.cos(i / n * 6.283) * r, c[1] + Math.sin(i / n * 6.283) * r]);
  const rect = (c, w, l, a = 0) => [[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2]].map(([x, z]) => [c[0] + x * Math.cos(a) - z * Math.sin(a), c[1] + x * Math.sin(a) + z * Math.cos(a)]);
  const disco = (c, r, color, op = 0.22) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 64).rotateX(-Math.PI / 2), brillo(color, op)); m.position.set(c[0], Y() + 0.8, c[1]); m.renderOrder = RO; const a = new THREE.Mesh(new THREE.RingGeometry(r - 4, r, 96).rotateX(-Math.PI / 2), brillo(color, 0.9)); a.position.copy(m.position); a.renderOrder = RO + 1; const g = new THREE.Group(); g.add(m, a); return g; };
  function cinta(pts, ancho, color) { const P = [], I = []; for (let k = 0; k < pts.length; k++) { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; P.push(pts[k][0] - dz * ancho / 2, Y() + 4, pts[k][1] + dx * ancho / 2, pts[k][0] + dz * ancho / 2, Y() + 4, pts[k][1] - dx * ancho / 2); if (k < pts.length - 1) { const v = k * 2; I.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); const mt = brillo(color, 0.85); mt.depthTest = false; const m = new THREE.Mesh(g, mt); m.renderOrder = RO + 1; return m; }

  /* ---------- velo: apaga la ciudad para que la simulación resalte (como la lámina de referencia) ---------- */
  const velo = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#04070a', transparent: true, opacity: 0.5, depthTest: false, depthWrite: false, toneMapped: false }));
  velo.renderOrder = RO - 5; velo.position.y = 300; velo.frustumCulled = false;
  const grupo = new THREE.Group(); grupo.name = 'seis_sims'; grupo.visible = false; grupo.add(velo); T3.scene.add(grupo);
  const ESC = {}, ESCALA_VIS = 6; // agentes ×6: se leen desde la vista de barrio (maqueta)
  function agentes(rutas, fl, vel, esc = ESCALA_VIS) {
    const A = []; return { A, ajustar(n) { n = Math.min(n, fl.max); while (A.length < n) { const r = rutas[A.length % rutas.length]; A.push({ r, s: Math.random() * r.L, v: vel * (0.8 + Math.random() * 0.4) }); } A.length = n; },
      mover(dt, kV = 1) { const y = Y(); for (let i = 0; i < A.length; i++) { const a = A[i]; a.s += a.v * kV * dt; if (a.s > a.r.L) a.s = 0; const [x, z, ang] = enRuta(a.r, a.s); fl.poner(i, x, y, z, ang, esc); } fl.fin(A.length); } };
  }
  function construir(k) {
    if (ESC[k]) return ESC[k]; const g = new THREE.Group(); grupo.add(g); const E = { g, etiquetas: [] };
    if (k === 'p1') {
      const polyC = PJ && PJ.corabastos ? PJ.corabastos : circulo(LUG.cora, 330);
      const vC = volumen(polyC, 12, '#ff8a5b', 0.2); g.add(vC);
      const fC = flota(camion('#e0412f', '#f7f7f2'), 300), fV = flota(furgon('#D5FF3F'), 140); g.add(fC.g, fV.g);
      const aC = agentes(rutasHacia(LUG.cora, 900, 4200, 30), fC, 14);
      const cand = G.idx.filter((i, j) => j % 5 === 0 && Math.hypot(G.X[i] - LUG.cora[0], G.Z[i] - LUG.cora[1]) > 700 && Math.hypot(G.X[i] - LUG.cora[0], G.Z[i] - LUG.cora[1]) < 2600);
      const MERC = []; if (cand.length) { MERC.push(cand[0]); while (MERC.length < 20) { let m = null, md = -1; for (const p of cand) { const d = Math.min(...MERC.map(q => Math.hypot(G.X[q] - G.X[p], G.Z[q] - G.Z[p]))); if (d > md) { md = d; m = p; } } MERC.push(m); } }
      const mercs = MERC.map(i => { const c = [G.X[i], G.Z[i]], gg = new THREE.Group(); gg.add(volumen(rect(c, 60, 40), 22, '#D5FF3F', 0.6)); gg.add(disco(c, 300, '#D5FF3F', 0.07));
        for (let h = 0; h < 6; h++) { const a = h * 1.05, hc = [c[0] + Math.cos(a) * 110, c[1] + Math.sin(a) * 110]; gg.add(volumen(rect(hc, 34, 22, a), 3, '#59c25a', 0.7)); } gg.visible = false; g.add(gg); return gg; });
      const rV = MERC.map(i => rutasHacia([G.X[i], G.Z[i]], 1200, 3500, 1)[0]); const aV = agentes(rV, fV, 16);
      E.etiquetas.push({ p: LUG.cora, h: 60, html: (e) => `${ico('camion', 20)}<b>Corabastos</b><span>${fmt(e.tru)} camiones/día · ${fmt(e.tru * 4.64)} t</span>` });
      E.etiquetas.push({ p: () => MERC[0] != null ? [G.X[MERC[0]], G.Z[MERC[0]]] : LUG.cora, h: 40, solo: 'B', html: (e) => `${ico('hoja', 20)}<b>Mercado de barrio + huertas</b><span>compra directa a la región</span>` });
      E.actualizar = (e, P, B, dt, X) => { aC.ajustar(Math.round(e.tru / 5)); aC.mover(dt, e.tru < 1000 ? 0.12 : 1); mercs.forEach((m, i) => { m.visible = B && i < P.merc; });
        aV.ajustar(B ? Math.max(8, Math.round(e.reg * NEED * P.dem / 4.64)) : 0); aV.mover(dt); vC.children[0].material.color.set(e.pct < 0.8 ? '#ff4f45' : '#ff8a5b'); vC.children[1].material.color.set(e.pct < 0.8 ? '#ff4f45' : '#ff8a5b'); };
    }
    if (k === 'p2') {
      const rA = rutasHacia(LUG.bav, 400, 1500, 36); const fA = flota(carro(), 400); g.add(fA.g); const aA = agentes(rA, fA, 14, 5);
      const vias = rA.slice(0, 12).map(r => { const m = cinta(r.pts, 22, '#ff4f45'); g.add(m); return m; });
      const centro = [LUG.bav[0] - 420, LUG.bav[1] + 120]; const ondas = [0, 1, 2].map(i => { const d = disco(centro, 120 + i * 120, '#f2b84b', 0.08); g.add(d); return d; });
      const pas = { visible: false };
      E.etiquetas.push({ p: centro, h: 50, html: (e) => `${ico('auto', 20)}<b>Av. Boyacá con Américas</b><span>${fmt(e.V)} carros/h · ${fmt(e.v, 0)} km/h · ${fmt(e.dB, 0)} dB</span>` });
      let tt = 0; E.actualizar = (e, P, B, dt) => { aA.ajustar(Math.round(e.V / 18)); aA.mover(dt, e.v / 19.9); tt += dt; const col = e.v < 15 ? '#ff4f45' : e.v < 25 ? '#f2b84b' : '#D5FF3F'; vias.forEach(m => m.material.color.set(col)); pas.visible = B;
        ondas.forEach((d, i) => { const s = 1 + ((tt * 0.35 + i / 3) % 1) * (0.5 + (e.dB - 65) / 12); d.scale.set(s, 1, s); d.children.forEach(c => { c.material.opacity = (c.geometry.type === 'RingGeometry' ? 0.8 : 0.1) * (1 - ((tt * 0.35 + i / 3) % 1)); c.material.color.set(e.dB > 70 ? '#ff4f45' : e.dB > 65 ? '#f2b84b' : '#D5FF3F'); }); }); };
    }
    if (k === 'p3') {
      const fK = flota(compactador(), 120), fV = flota(furgon('#D5FF3F'), 100); g.add(fK.g, fV.g);
      const sal = G.mayores.reduce((b, i) => (G.X[i] + G.Z[i] > G.X[b] + G.Z[b] ? i : b), G.mayores[0]);
      const tS = G.arbol(sal), barrios = G.idx.filter((i, j) => j % 37 === 0 && Math.hypot(G.X[i] - LUG.central[0], G.Z[i] - LUG.central[1]) < 1400);
      const rK = barrios.slice(0, 30).map(i => G.ruta(tS, i)).filter(r => r && r.length > 3).map(r => conCum(r.slice().reverse()));
      const aK = agentes(rK.length ? rK : rutasHacia(LUG.central, 300, 1500, 10), fK, 13);
      const est = barrios.filter((_, j) => j % 2 === 0).slice(0, 20).map(i => { const c = [G.X[i] + 25, G.Z[i] + 25], gg = new THREE.Group(); gg.add(volumen(rect(c, 70, 45), 24, '#D5FF3F', 0.55));
        const pila = new THREE.Mesh(new THREE.SphereGeometry(14, 18, 10, 0, 6.29, 0, 1.4).scale(1.6, 1, 1), mat('#6b4a2c', { roughness: 1 })); pila.position.set(c[0], Y(), c[1] + 50); pila.renderOrder = RO + 2; gg.add(pila); gg.visible = false; g.add(gg); return { gg, pila, i }; });
      const rV = est.map(q => rutasHacia([G.X[q.i], G.Z[q.i]], 300, 1100, 1, G.idx.filter((_, j) => j % 11 === 0))[0]); const aV = agentes(rV, fV, 11);
      const focos = barrios.slice(0, 16).map(i => [G.X[i] + 10, G.Z[i] - 10]);
      const pilas = focos.map(f => { const m = new THREE.Mesh(new THREE.CylinderGeometry(22, 26, 1, 20).translate(0, 0.5, 0), brillo('#ff4f45', 0.7)); m.position.set(f[0], Y(), f[1]); m.renderOrder = RO + 1; g.add(m); return m; });
      E.etiquetas.push({ p: LUG.central, h: 60, html: (e) => `${ico('residuo', 20)}<b>Kennedy</b><span>${fmt(e.tot)} t/día · ${fmt(e.cam)} camiones a Doña Juana</span>` });
      E.etiquetas.push({ p: () => est[0] ? [G.X[est[0].i] + 25, G.Z[est[0].i] + 25] : LUG.central, h: 40, solo: 'B', html: (e) => `${ico('hoja', 20)}<b>Estación Circular</b><span>${fmt(e.comp, 1)} t de compost al día</span>` });
      E.actualizar = (e, P, B, dt) => { aK.ajustar(Math.round(e.cam / 2)); aK.mover(dt); est.forEach((q, i) => { q.gg.visible = B && i < P.est; const s = 0.5 + Math.min(1.6, e.proc / Math.max(1, P.est * 12)); q.pila.scale.set(1.6 * s, s, s); });
        aV.ajustar(B ? Math.round(e.proc / 4) : 0); aV.mover(dt); const h = 1 + e.acum / 8; pilas.forEach(m => { m.scale.y = h; }); };
    }
    if (k === 'p4') {
      const ave = new THREE.BufferGeometry(); ave.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 1.6, -2.4, 0, -0.6, 0, 0.25, -0.2, 0, 0, 1.6, 0, 0.25, -0.2, 2.4, 0, -0.6, 0, 0, 1.6, 0, -0.3, -1.2, 0, 0.25, -0.2], 3)); ave.computeVertexNormals();
      const fAv = flota([[ave, mat('#ffffff', { emissive: '#bfc7c2', side: THREE.DoubleSide })]], 100); g.add(fAv.g);
      const HUM = [[LUG.burro, 18.8], [LUG.vaca, 9.95], [LUG.techo, 11.67]];
      const zonas = HUM.map(([c, ha]) => { const d = disco(c, Math.sqrt(ha * 1e4 / Math.PI) * 1.4, '#3fd17a', 0.28); g.add(d); return d; });
      const pts = [LUG.burro, LUG.vaca, LUG.techo, LUG.bav];
      const corr = [[0, 1], [0, 2], [0, 3], [1, 3]].map(([a, b]) => { const A = pts[a], B2 = pts[b], L = 24, line = Array.from({ length: L + 1 }, (_, i) => { const t = i / L; return [A[0] + (B2[0] - A[0]) * t + Math.sin(t * Math.PI) * 60, A[1] + (B2[1] - A[1]) * t]; }); const m = cinta(line, 40, '#D5FF3F'); m.visible = false; g.add(m); return m; });
      const AV = Array.from({ length: 100 }, (_, i) => ({ c: pts[i % 3], r: 60 + Math.random() * 200, a: Math.random() * 6.28, h: 30 + Math.random() * 60, w: 0.2 + Math.random() * 0.3 }));
      E.etiquetas.push({ p: LUG.burro, h: 110, html: (e) => `${ico('ave', 20)}<b>Humedal El Burro</b><span>${fmt(e.S)} especies de aves (hoy 49)</span>` });
      E.actualizar = (e, P, B, dt) => { const n = Math.round(e.S); for (let i = 0; i < n; i++) { const a = AV[i]; a.a += a.w * dt; fAv.poner(i, a.c[0] + Math.cos(a.a) * a.r, Y() + a.h + Math.sin(a.a * 3) * 4, a.c[1] + Math.sin(a.a) * a.r, -a.a, 9); } fAv.fin(n);
        corr.forEach(m => { m.visible = B && P.corr > 0; }); const col = e.S <= 34.3 ? '#ff4f45' : e.S < 45 ? '#f2b84b' : '#3fd17a'; zonas.forEach(z => z.children.forEach(c => c.material.color.set(col))); };
    }
    if (k === 'p5') {
      const torre = (c, area) => { const lado = Math.sqrt(area * 1e4) * 0.3, gg = new THREE.Group(); g.add(gg); return { gg, c, lado, cur: null }; };
      const T = [torre(LUG.patio, 317), torre(LUG.tintal, 343)];
      const ponerT = (t, h, col) => { if (t.cur && Math.abs(t.cur.h - h) < 2) return; t.gg.clear(); const v = volumen(rect(t.c, t.lado, t.lado), h, col, 0.32); t.gg.add(v); t.cur = { h }; };
      const verde = new THREE.Group(); g.add(verde); let verdeR = -1;
      const cols = Array.from({ length: 12 }, (_, i) => { const a = i * 0.52, c = [LUG.patio[0] + 700 + Math.cos(a) * 380, LUG.patio[1] + Math.sin(a) * 380]; const v = volumen(rect(c, 70, 50), 20, '#D5FF3F', 0.7); v.visible = false; g.add(v); return v; });
      E.etiquetas.push({ p: LUG.patio, h: () => 0, alto: (e) => e.pb / 317 * 0.5 + 30, html: (e) => `${ico('casa', 20)}<b>Patio Bonito</b><span>${fmt(e.pb / 317)} personas por hectárea</span>` });
      E.etiquetas.push({ p: LUG.tintal, h: () => 0, alto: (e) => e.tn / 343 * 0.5 + 30, html: (e) => `${ico('casa', 20)}<b>Tintal Norte</b><span>${fmt(e.tn / 343)} personas por hectárea</span>` });
      E.actualizar = (e, P, B) => { ponerT(T[0], e.pb / 317 * 0.5, '#b45cff'); ponerT(T[1], e.tn / 343 * 0.5, '#b45cff');
        const r = Math.round(Math.sqrt(Math.max(0, e.parque) * 6e4 / Math.PI)); if (r !== verdeR) { verdeR = r; verde.clear(); verde.add(disco([LUG.tintal[0] + 500, LUG.tintal[1] - 300], Math.max(20, r), '#3fd17a', 0.3)); }
        cols.forEach((m, i) => { m.visible = B && i < P.eq; }); };
    }
    if (k === 'p6') {
      const fondo = volumen(circulo(LUG.alcaldia, 60, 24), 120, '#f2c94c', 0.65); g.add(fondo);
      const S2 = SECTORES.map(q => { const gg = new THREE.Group(); g.add(gg); return { q, gg, cur: '' }; });
      const fM = flota([[new THREE.CylinderGeometry(7, 7, 2, 16).translate(0, 1, 0), mat('#f2c94c', { emissive: '#7a5a10', metalness: 0.6 })]], 60); g.add(fM.g);
      E.etiquetas.push(...SECTORES.map((q, i) => ({ p: q.p, h: () => 0, alto: (e) => Math.max(e.asig[i] || 0, (e.nec && e.nec[i]) || 0) / 80 + 40, html: (e) => `${ico('moneda', 20)}<b>${q.n}</b><span>${fmt((e.asig[i] || 0) / 1000, 1)} mil M · ${e.nec && e.nec[i] > 0 ? (e.asig[i] >= e.nec[i] * 0.8 ? 'atendido' : 'le falta') : 'sin necesidad'}</span>` })));
      let tt = 0; E.actualizar = (e, P, B, dt) => { tt += dt;
        S2.forEach((s, i) => { const h = (e.asig[i] || 0) / 80, hn = (e.nec && e.nec[i] || 0) / 80, firma = Math.round(h) + '|' + Math.round(hn); if (firma === s.cur) return; s.cur = firma; s.gg.clear();
          const ok = hn > 0 ? h >= hn * 0.8 : true; if (h > 1) s.gg.add(volumen(circulo(s.q.p, 70, 24), h, ok ? '#D5FF3F' : '#ff4f45', 0.6));
          if (hn > 1) { const v = volumen(circulo(s.q.p, 90, 24), hn, '#F4F3EF', 0.0); v.children[0].visible = false; s.gg.add(v); } });
        for (let k2 = 0; k2 < 60; k2++) { const q = SECTORES[k2 % SECTORES.length], f = ((tt * 0.25 + k2 / 60) % 1); fM.poner(k2, LUG.alcaldia[0] + (q.p[0] - LUG.alcaldia[0]) * f, Y() + 130 + Math.sin(f * Math.PI) * 200, LUG.alcaldia[1] + (q.p[1] - LUG.alcaldia[1]) * f, tt * 3, 2.2, 1); } fM.fin(60); };
    }
    ESC[k] = E; return E;
  }

  /* ---------- estado (par A/B) ---------- */
  let VUELO = null;
  const ST = { k: null, modo: (() => { try { return localStorage.getItem('ss-modo') || 'ninos'; } catch (e) { return 'ninos'; } })(), ver: 'A', t: 0, corre: true, vel: 4, A: null, B: null, par: {}, pertOn: false, pertHasta: 0 };
  const sim = () => SIMS.find(s => s.k === ST.k);
  function reiniciar() { const S = sim(); ST.t = 0; ST.A = S.estado(); ST.B = S.estado(); ST.pertOn = false; ST.pertHasta = 0; paso(); }
  function paso() { const S = sim(), X = { pertOn: ST.pertOn }; S.paso(ST.A, ST.par, false, ST.t, X); S.paso(ST.B, ST.par, true, ST.t, X); if (ST.pertOn && ST.t >= ST.pertHasta) ST.pertOn = false; }

  /* ---------- interfaz: barra superior con las 6 simulaciones, interruptor literal SIN/CON, una tarjeta ---------- */
  const css = document.createElement('style'); css.textContent = `
  .ss-i{display:inline-block;vertical-align:middle;flex:none}
  body.ss-simple #cvMarca, body.ss-simple #gs-izq, body.ss-simple #dock, body.ss-simple #dr-btn, body.ss-simple #dr-pan, body.ss-simple #cvMini, body.ss-simple #cvAyuda, body.ss-simple #hud-c, body.ss-simple #toast, body.ss-simple #esc, body.ss-simple #esim, body.ss-simple .es-et, body.ss-simple #gs-cv2, body.ss-simple #gs-der, body.ss-simple #bt-pan, body.ss-simple #hid-red, body.ss-simple .u-fuentes-btn, body.ss-simple #ss-old{display:none!important}
  #ss-top{position:fixed;left:0;right:0;top:0;height:62px;z-index:40;display:flex;align-items:center;gap:14px;padding:0 18px;background:linear-gradient(180deg,rgba(7,10,8,.96),rgba(7,10,8,.86));border-bottom:1px solid rgba(213,255,63,.18);font-family:Manrope,sans-serif;color:#F4F3EF}
  #ss-top .lg{display:flex;align-items:center;gap:12px;flex:none} #ss-top .lg img.u{height:24px} #ss-top .lg img.j{height:28px} #ss-top .lg i{width:1px;height:26px;background:rgba(244,243,239,.22)}
  #ss-tabs{flex:1;display:flex;justify-content:center;gap:4px;overflow-x:auto;scrollbar-width:none} #ss-tabs::-webkit-scrollbar{display:none}
  #ss-tabs button{flex:none;display:flex;align-items:center;gap:8px;padding:8px 13px;background:none;border:1px solid transparent;border-radius:22px;color:#c9cec6;font:700 12.5px Manrope;cursor:pointer;white-space:nowrap}
  #ss-tabs button b{font:600 10px 'JetBrains Mono',monospace;color:#7d877e;letter-spacing:.08em} #ss-tabs button:hover{border-color:rgba(213,255,63,.35)}
  #ss-tabs button.on{border-color:#D5FF3F;color:#F4F3EF;background:rgba(213,255,63,.1)} #ss-tabs button.on b{color:#D5FF3F} #ss-tabs button .ss-i{color:#D5FF3F}
  #ss-modo{flex:none;display:flex;background:rgba(244,243,239,.06);border-radius:22px;padding:3px} #ss-modo button{display:flex;align-items:center;gap:6px;padding:7px 13px;background:none;border:0;border-radius:20px;color:#b5bcb3;font:700 12px Manrope;cursor:pointer} #ss-modo button.on{background:#D5FF3F;color:#08090C}
  #ss-fu{flex:none;color:#b5bcb3;font:600 12px Manrope;text-decoration:none;display:flex;align-items:center;gap:6px} #ss-fu:hover{color:#D5FF3F}
  #ss-sw{position:fixed;top:78px;left:50%;transform:translateX(-50%);z-index:39;display:flex;background:rgba(7,10,8,.9);border:1px solid rgba(213,255,63,.4);border-radius:30px;padding:4px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
  #ss-sw button{padding:11px 22px;border:0;border-radius:26px;background:none;color:#c9cec6;font:800 13px Manrope;letter-spacing:.03em;cursor:pointer;white-space:nowrap}
  #ss-sw button.on[data-v="A"]{background:#F4F3EF;color:#08090C} #ss-sw button.on[data-v="B"]{background:#D5FF3F;color:#08090C}
  #ss-pan{position:fixed;right:16px;top:78px;z-index:38;width:340px;max-height:calc(100vh - 96px);overflow:auto;background:rgba(9,13,11,.9);border:1px solid rgba(244,243,239,.1);border-radius:14px;color:#F4F3EF;font-family:Manrope,sans-serif;backdrop-filter:blur(14px);box-shadow:0 18px 40px rgba(0,0,0,.4);scrollbar-width:thin}
  body.ss-adultos #ss-pan{width:400px}
  .ss-h{display:flex;align-items:flex-start;gap:10px;padding:16px 16px 4px} .ss-h small{display:block;font:600 10px 'JetBrains Mono',monospace;letter-spacing:.14em;color:#D5FF3F;text-transform:uppercase;margin-bottom:4px} .ss-h b{font-size:17px;line-height:1.2}
  .ss-txt{padding:4px 16px 10px;font-size:13px;line-height:1.5;color:#c9cec6}
  .ss-rings{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:6px 10px 10px;border-top:1px solid rgba(244,243,239,.07);border-bottom:1px solid rgba(244,243,239,.07)}
  .ss-rings div{display:flex;flex-direction:column;align-items:center;text-align:center;position:relative} .ss-rings em{position:absolute;top:21px;font:700 12px 'JetBrains Mono',monospace;font-style:normal;width:64px;left:50%;transform:translateX(-50%)} .ss-rings span{font-size:10.5px;color:#b5bcb3;margin-top:4px;line-height:1.25}
  .ss-res{margin:12px 16px 4px;padding:10px 12px;border-radius:10px;display:flex;align-items:center;gap:10px;font-weight:800;font-size:14px} .ss-res.ok{background:rgba(213,255,63,.1);color:#D5FF3F} .ss-res.mal{background:rgba(255,79,69,.14);color:#ff8f87} .ss-res small{display:block;font-weight:500;font-size:11px;color:#c9cec6}
  .ss-ctrl{padding:8px 16px 0} .ss-ctrl label{display:flex;align-items:center;gap:8px;font-size:12px;color:#dfe3dc} .ss-ctrl label b{margin-left:auto;font:700 12px 'JetBrains Mono',monospace;color:#D5FF3F}
  .ss-ctrl input{width:100%;accent-color:#D5FF3F;margin:6px 0 2px}
  .ss-bt{display:grid;grid-template-columns:1fr auto auto;gap:6px;padding:12px 16px 16px}
  .ss-pert{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px 8px;background:rgba(255,79,69,.12);border:1px solid rgba(255,79,69,.55);color:#ffb3ab;font:700 12px Manrope;border-radius:10px;cursor:pointer} .ss-pert.on{background:#ff4f45;color:#fff}
  .ss-bt .r{display:grid;place-items:center;width:42px;background:rgba(213,255,63,.08);border:1px solid rgba(213,255,63,.3);color:#D5FF3F;border-radius:10px;cursor:pointer}
  .ss-tl{padding:0 16px 12px;display:flex;align-items:center;gap:8px;font:500 10.5px 'JetBrains Mono',monospace;color:#7d877e} .ss-tl .bar{flex:1;height:4px;background:rgba(244,243,239,.1);border-radius:2px;overflow:hidden} .ss-tl .bar i{display:block;height:100%;background:#D5FF3F}
  .ss-esc{display:flex;align-items:center;gap:6px;padding:0 16px 12px;font-size:11px;color:#7d877e}
  .ss-tab{margin:4px 16px 10px;border-collapse:collapse;width:calc(100% - 32px);font-size:11.5px} .ss-tab th{font:600 9px 'JetBrains Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#7d877e;text-align:left;padding:6px 4px;border-bottom:1px solid rgba(244,243,239,.12)}
  .ss-tab td{padding:7px 4px;border-bottom:1px solid rgba(244,243,239,.07);vertical-align:top} .ss-tab td.n{font:600 11.5px 'JetBrains Mono',monospace;text-align:right;white-space:nowrap} .ss-tab td.b{color:#D5FF3F} .ss-tab td.f{color:#7d877e;font-size:10.5px}
  .ss-go{margin:8px 16px;padding:10px 12px;border:1px solid #ff4f45;background:rgba(255,79,69,.1);border-radius:10px;font-size:12px;color:#ffc2bd;line-height:1.5}
  .ss-lg{padding:0 16px 16px;font-size:11.5px;color:#c9cec6} .ss-lg b{color:#F4F3EF} .ss-lg a{color:#D5FF3F} .ss-lg ul{margin:6px 0 0;padding-left:16px;line-height:1.45}
  #ss-lbl{position:fixed;inset:0;pointer-events:none;z-index:20} .ss-l{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center}
  .ss-l .c{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(7,10,8,.92);border:1px solid rgba(213,255,63,.55);border-radius:10px;color:#F4F3EF;font:700 13px Manrope;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.4)}
  .ss-l .c .ss-i{color:#D5FF3F} .ss-l .c span{display:block;font:500 11.5px Manrope;color:#c9cec6} .ss-l i{width:1px;height:34px;background:linear-gradient(#D5FF3F,rgba(213,255,63,0))} .ss-l .p{width:9px;height:9px;border-radius:50%;background:#D5FF3F;box-shadow:0 0 0 4px rgba(213,255,63,.25)}
  @media(max-width:860px){#ss-top{height:auto;flex-wrap:wrap;padding:8px 10px;gap:8px}#ss-top .lg img.j,#ss-top .lg i,#ss-fu{display:none}#ss-tabs{order:3;flex-basis:100%;justify-content:flex-start}#ss-tabs button span{display:none}
    #ss-sw{top:auto;bottom:calc(42vh + 14px)}#ss-sw button{padding:9px 12px;font-size:11px}#ss-pan,body.ss-adultos #ss-pan{left:8px;right:8px;width:auto;top:auto;bottom:8px;max-height:42vh}.ss-l .c{font-size:11px;padding:6px 9px}.ss-l .c span{font-size:10px}}`;
  document.head.appendChild(css);
  const top = document.createElement('div'); top.id = 'ss-top';
  top.innerHTML = `<div class="lg"><img class="u" src="urbia_logo.svg" alt="urbia"><i></i><img class="j" src="img_javeriana_claro.png" alt="Pontificia Universidad Javeriana"></div>
    <div id="ss-tabs">${SIMS.map((s, i) => `<button data-k="${s.k}">${ico(s.ic, 18)}<b>SIM ${i + 1}</b><span>${s.n}</span></button>`).join('')}</div>
    <div id="ss-modo"><button data-m="ninos">${ico('nino', 15)}Niños</button><button data-m="adultos">${ico('adulto', 15)}Adultos</button></div>
    <a id="ss-fu" href="fuentes.html" target="_blank" rel="noopener">${ico('tabla', 16)}Fuentes</a>`;
  const sw = document.createElement('div'); sw.id = 'ss-sw';
  const pan = document.createElement('div'); pan.id = 'ss-pan';
  const lbl = document.createElement('div'); lbl.id = 'ss-lbl';
  document.body.append(top, sw, pan, lbl); document.body.classList.add('ss-simple', 'ss-on');
  const pintarModo = () => { top.querySelectorAll('#ss-modo button').forEach(b => b.classList.toggle('on', b.dataset.m === ST.modo)); document.body.classList.toggle('ss-ninos', ST.modo === 'ninos'); document.body.classList.toggle('ss-adultos', ST.modo !== 'ninos'); };
  pintarModo();
  // rendimiento: sin sombras y resolución contenida mientras se simula
  try { T3.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 860 ? 1 : 1.25)); if (T3.renderer.shadowMap) { T3.renderer.shadowMap.enabled = false; } if (T3.sun) T3.sun.castShadow = false; } catch (e) {}

  function volar(p, d) { const cam = T3.camera, t = T3.orbit.target, h = new THREE.Vector3(0.55, 0, 0.83).normalize(), c1 = new THREE.Vector3(p[0], 1, p[1]), p1 = c1.clone().addScaledVector(h, d * 0.75); p1.y = d * 0.72; VUELO = { t: 0, dur: 1.8, p0: cam.position.clone(), p1, c0: t.clone(), c1 }; }
  function abrir(k, v) {
    try { localStorage.setItem('ken-guia-v1', '1'); } catch (er) {} const sal = [...document.querySelectorAll('button.sal')].find(x => /Saltar/.test(x.textContent)); if (sal) sal.click();
    const nuevo = ST.k !== k; ST.k = k; if (v) ST.ver = v; const S = sim();
    if (nuevo) { ST.par = { ...S.par }; for (const [kk, E] of Object.entries(ESC)) E.g.visible = kk === k; construir(k).g.visible = true; grupo.visible = true; reiniciar(); ST.corre = true; volar(LUG[S.lugar], ST.ver === 'B' && S.distB ? S.distB : S.dist); } else if (v && S.distB) volar(LUG[S.lugar], v === 'B' ? S.distB : S.dist);
    pintar(true);
  }
  function pintar(todo) {
    const S = sim(); if (!S) return; const e = ST.ver === 'A' ? ST.A : ST.B, a = ST.A, b = ST.B, ninos = ST.modo === 'ninos', n = SIMS.indexOf(S) + 1;
    top.querySelectorAll('#ss-tabs button').forEach(x => x.classList.toggle('on', x.dataset.k === ST.k));
    sw.innerHTML = `<button data-v="A" class="${ST.ver === 'A' ? 'on' : ''}">SIMULACIÓN ${n} · SIN PROPUESTA</button><button data-v="B" class="${ST.ver === 'B' ? 'on' : ''}">SIMULACIÓN ${n} · CON PROPUESTA</button>`;
    if (todo) {
      pan.innerHTML = `<div class="ss-h">${''}<div><small>Simulación ${n} · ${ninos ? 'modo niños' : 'modo adultos'}</small><b>${S.largo}</b></div></div>
        <div class="ss-txt">${S.nino}</div><div class="ss-rings"></div><div class="ss-vivo"></div>
        ${S.ctrl.map(c => `<div class="ss-ctrl" data-c="${c.k}"><label>${ico(c.ia, 15)}${c.n}<b></b></label><input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${ST.par[c.k]}"></div>`).join('')}
        <div class="ss-bt"><button class="ss-pert" data-a="pert">${ico('rayo', 16)}${S.pert}</button><button class="r" data-a="play" aria-label="Pausa"></button><button class="r" data-a="rein" aria-label="Reiniciar">${ico('reinicio', 16)}</button></div>
        <div class="ss-tl"><div class="bar"><i></i></div><span></span></div><div class="ss-esc">${ico('rayo', 13)}${S.escala}</div><div class="ss-adu"></div>`;
    }
    S.ctrl.forEach(c => { const el = pan.querySelector(`[data-c="${c.k}"]`); if (!el) return; el.querySelector('b').textContent = c.f(ST.par[c.k]); el.style.display = c.soloB && ST.ver === 'A' ? 'none' : ''; });
    pan.querySelector('[data-a="pert"]').classList.toggle('on', ST.pertOn);
    pan.querySelector('[data-a="play"]').innerHTML = ico(ST.corre ? 'pausa' : 'play', 16);
    pan.querySelector('.ss-tl .bar i').style.width = (ST.t / SEM_MAX * 100) + '%';
    pan.querySelector('.ss-tl span').textContent = `año ${Math.floor(ST.t / 52) + 1} de 15 · semana ${ST.t % 52 + 1}`;
    pan.querySelector('.ss-rings').innerHTML = RINGS[S.k](e, ST.par).map(([t, v, txt, malo]) => `<div>${anillo(v, malo)}<em>${txt}</em><span>${t}</span></div>`).join('');
    const go = e.go, bien = S.bueno(e) && !go;
    pan.querySelector('.ss-vivo').innerHTML = `<div class="ss-res ${bien ? 'ok' : 'mal'}">${ico(bien ? 'ok' : 'alerta', 26)}<div>${go ? 'GAME OVER' : bien ? (ninos ? '¡Va bien!' : 'Cumple la meta de diseño') : (ninos ? 'Cuidado: va mal' : 'No cumple la meta')}<small>${ST.ver === 'A' ? 'Sin propuesta' : 'Con propuesta'}${go ? ' · semana ' + (go.sem + 1) + ' · ' + go.ind : ''}</small></div></div>`;
    pan.querySelector('.ss-adu').innerHTML = ninos ? '' : `<table class="ss-tab"><thead><tr><th>Indicador</th><th style="text-align:right">Sin</th><th style="text-align:right">Con</th><th>Referencia</th></tr></thead><tbody>${S.filas(a, b).map(r => `<tr><td>${r[0]}</td><td class="n">${r[1]}</td><td class="n b">${r[2]}</td><td class="f">${r[3]}</td></tr>`).join('')}</tbody></table>`
      + [['sin propuesta', a], ['con propuesta', b]].filter(([, x]) => x.go).map(([nn, x]) => `<div class="ss-go"><b>GAME OVER ${nn}</b> · semana ${x.go.sem + 1} (año ${Math.floor(x.go.sem / 52) + 1})<br>${x.go.ind} · ${x.go.lugar}</div>`).join('')
      + `<div class="ss-lg"><b>Lógica y papers</b><ul>${LOGICA[S.k].map(([q, r, u]) => `<li>${q}<br><a href="${u}" target="_blank" rel="noopener">${r} ↗</a></li>`).join('')}</ul><p style="margin:10px 0 0">Todas las cifras con su URL: <a href="fuentes.html" target="_blank" rel="noopener">matriz de fuentes ↗</a></p></div>`;
  }
  top.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k) abrir(b.dataset.k); if (b.dataset.m) { ST.modo = b.dataset.m; try { localStorage.setItem('ss-modo', ST.modo); } catch (er) {} pintarModo(); pintar(true); } });
  sw.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ST.ver = b.dataset.v; const S = sim(); if (S.distB) volar(LUG[S.lugar], ST.ver === 'B' ? S.distB : S.dist); pintar(); } });
  pan.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const a = b.dataset.a;
    if (a === 'play') { if (ST.t >= SEM_MAX - 1) reiniciar(); ST.corre = !ST.corre; pintar(); }
    if (a === 'rein') { reiniciar(); ST.corre = true; pintar(); }
    if (a === 'pert') { ST.pertOn = !ST.pertOn; ST.pertHasta = ST.pertOn ? ST.t + (ST.k === 'p1' ? ST.par.bloqDur : ST.k === 'p4' ? 52 : 26) : 0; if (ST.k === 'p1') { ST.A.bloq = ST.B.bloq = ST.pertOn ? ST.par.bloqDur : 0; } pintar(); } });
  pan.addEventListener('input', e => { const c = e.target.closest('[data-c]'); if (!c) return; ST.par[c.dataset.c] = +e.target.value; pintar(); });

  /* ---------- bucle ---------- */
  let ult = performance.now(), acc = 0, pintAcc = 0, lblAcc = 0; const V3 = new THREE.Vector3();
  function bucle(now) {
    requestAnimationFrame(bucle); const dt = Math.min(0.1, (now - ult) / 1000); ult = now;
    if (VUELO) { T3.anim = null; const a = VUELO; a.t += dt; const u = Math.min(1, a.t / a.dur), k2 = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; T3.orbit.target.lerpVectors(a.c0, a.c1, k2); T3.camera.position.lerpVectors(a.p0, a.p1, k2); T3.camera.lookAt(T3.orbit.target); if (u >= 1) VUELO = null; }
    if (!ST.k) return; const E = ESC[ST.k];
    if (ST.corre && ST.t < SEM_MAX - 1) { acc += dt * ST.vel; while (acc >= 1) { acc -= 1; ST.t++; paso(); } } else acc = 0;
    if (ST.corre && ST.t >= SEM_MAX - 1) ST.corre = false;
    const e = ST.ver === 'A' ? ST.A : ST.B; E.actualizar(e, ST.par, ST.ver === 'B', dt, { pertOn: ST.pertOn });
    pintAcc += dt; if (pintAcc > 0.3) { pintAcc = 0; pintar(); }
    lblAcc += dt; if (lblAcc < 0.05) return; lblAcc = 0;
    const w = innerWidth, h = innerHeight, cajas = []; let html = '';
    for (const L of E.etiquetas) { if (L.solo && L.solo !== ST.ver) continue; const p = typeof L.p === 'function' ? L.p() : L.p, alto = L.alto ? L.alto(e) : L.h;
      V3.set(p[0], Y() + alto, p[1]).project(T3.camera); if (V3.z > 1) continue; const x = (V3.x + 1) / 2 * w, y = (1 - V3.y) / 2 * h;
      if (x < 40 || x > w - 40 || y < 215 || y > h - 30) continue; if (cajas.some(([cx, cy]) => Math.abs(cx - x) < 230 && Math.abs(cy - y) < 70)) continue; cajas.push([x, y]);
      html += `<div class="ss-l" style="left:${x}px;top:${y}px"><div class="c">${L.html(e).replace(/<b>/, '<div><b>').replace(/<\/span>$/, '</span></div>')}</div><i></i><div class="p"></div></div>`; }
    lbl.innerHTML = html;
  }
  requestAnimationFrame(bucle);
  const arranque = () => { if (T3.anim || T3.llegada) return setTimeout(arranque, 400); if (!ST.k) abrir('p1', 'A'); };
  setTimeout(arranque, 800);
  return { abrir, ST, grupo, ESC, T3, G, rutasHacia };
}
