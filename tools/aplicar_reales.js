const fs = require('fs');
const ed = (f, pares) => { let s = fs.readFileSync(f, 'utf8'); for (const [a, b] of pares) { const n = s.split(a).length - 1; if (n < 1) { console.log('NO ENCONTRADO', f, a.slice(0, 70)); continue; } s = s.split(a).join(b); console.log(f, n + '×', a.slice(0, 50)); } fs.writeFileSync(f, s); };
const CAB = "// CIFRAS CON FUENTE (ver fuentes.html / data3d/fuentes.json): POB_K = ASIS Kennedy 2024 (DANE); ORG_PC = 1,1 kg/hab/día (PPC RAS, Superservicios 2023) × 50 % orgánico (UAESP 2026);\n// DIST_DJ = 16,6 km Corabastos–Doña Juana (ruta OSRM); T_COMPAC = 11,5 t por compactador; REND_COMP = 0,23 kg compost/kg (4 plazas distritales, 2016); RIQ_BURRO = 49 especies (OAB-SDA 2021-22); CRECE = 0,4 %/año (ASIS 2024-2030)\n";
ed('data3d/sim_modelos.js', [
  ['export const SEM = 520, AÑO = 52, POB_K = 1034000; // 10 años; población de Kennedy (proyección DANE 2024, aprox.)', CAB + 'export const SEM = 520, AÑO = 52, POB_K = 1037929, ORG_PC = 0.55, DIST_DJ = 16.6, T_COMPAC = 11500, REND_COMP = 0.23, RIQ_BURRO = 49, CRECE = 1.004;'],
  ['P2: { frac: 0.4, cap: 6000, mad: 10,', 'P2: { frac: 0.4, cap: 6000, mad: 17, /* 4 meses de maduración (fuente en fuentes.json) */'],
  ['pob *= Math.pow(1.015, 1 / AÑO)', 'pob *= Math.pow(CRECE, 1 / AÑO)'],
  ['const gen = pobZona * 0.45 * 7,', 'const gen = pobZona * ORG_PC * 7,'],
  ['// 0,45 kg/día por persona [SUP]', '// ORG_PC kg/día por persona (calculado de fuentes)'],
  ["dist = e === 'A' ? 28 : e === 'B' ? P.dist : 4.5; // Doña Juana ~28 km; Bavaria ~4,5 km [SUP]", "dist = e === 'A' ? DIST_DJ : e === 'B' ? P.dist : 4.5; // Doña Juana 16,6 km por vía (OSRM); Bavaria ~4,5 km medido en el mapa"],
  ['comp = madura * 0.5 - sust * 0.5', 'comp = (madura - sust) * REND_COMP'],
  ['out.pct.push(Math.max(0, comp) / gen * 100 * 2)', 'out.pct.push(Math.max(0, comp) / REND_COMP / gen * 100)'],
  ['out.km.push(rell / 8000 * 28 * 2', 'out.km.push(rell / T_COMPAC * DIST_DJ * 2'],
  ['Math.round(42 * (0.45', 'Math.round(RIQ_BURRO * (0.45'],
]);
ed('data3d/sim_vida.js', [
  ['export const AÑO = 52, POB_K = 1034000;', "import { ORG_PC, DIST_DJ, REND_COMP, RIQ_BURRO, CRECE } from './sim_modelos.js?v=4';\nexport const AÑO = 52, POB_K = 1037929; // ASIS Kennedy 2024 (fuentes.json)"],
  ['s.pob *= Math.pow(1.015, 1 / AÑO)', 's.pob *= Math.pow(CRECE, 1 / AÑO)'],
  ['const gen = P1.zona * 0.45 * 7 *', 'const gen = P1.zona * ORG_PC * 7 *'],
  ['comp = Math.max(0, madura * 0.5 - sust * 0.5)', 'comp = Math.max(0, (madura - sust) * REND_COMP)'],
  ["dist = !prop ? 28 : e === 'B'", "dist = !prop ? DIST_DJ : e === 'B'"],
  ['riq: Math.round(42 * (0.45', 'riq: Math.round(RIQ_BURRO * (0.45'],
]);
ed('data3d/propuesta.js', [['kgCamion: 2000,', 'kgCamion: 4640, /* 6.962 t/día ÷ 1.500 vehículos de carga/día (Agronegocios 2024, gerencia Corabastos) */']]);
ed('data3d/mejora_tour.js', [['relleno Doña Juana (28 km)', 'relleno Doña Juana (16,6 km por vía)']]);
ed('data3d/simulaciones.js', [['relleno Doña Juana, a 28 km.', 'relleno Doña Juana, a 16,6 km por vía.'], ['población de Kennedy 1.034.000', 'población de Kennedy 1.037.929 (ASIS 2024)'], ['[SUP] 0,45 kg/día de orgánicos por persona', '0,55 kg/día de orgánicos por persona (1,1 kg PPC × 50 % orgánico, fuentes.json)'], ['el compost pesa la mitad del material que entra', 'el compost pesa el 23 % del material que entra (plazas distritales de Bogotá)']]);
