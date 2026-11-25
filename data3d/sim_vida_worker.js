/* Trabajador del modo «Evaluar» (data3d/vida_evaluar.js): corre en segundo plano, sin trabar el 3D, R corridas con semillas FIJAS 1..R
   de cada escenario pedido, con los parámetros congelados al momento de pulsar «Evaluar» y las mismas reglas de colapso (data3d/sim_vida.js). */
import { corrida, resumen } from './sim_vida.js?v=2';
self.onmessage = (ev) => {
  const { id, escs, R, años, PAR } = ev.data, total = escs.length * R; let hecho = 0;
  for (const e of escs) { const cs = [];
    for (let s = 1; s <= R; s++) { cs.push(corrida(e, s, años, PAR)); hecho++; self.postMessage({ id, tipo: 'progreso', hecho, total }); }
    self.postMessage({ id, tipo: 'escenario', e, corridas: cs, resumen: resumen(cs, años) }); }
  self.postMessage({ id, tipo: 'fin' });
};
