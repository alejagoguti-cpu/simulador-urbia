/* ============ SEGUIR UN AGENTE (como el seguimiento de God's Eye) ============
   Clic (sin arrastrar) sobre un carro, una moto, una persona o un animal, o botón "Seguir" en la barra inferior:
   la cámara se engancha al agente y lo acompaña. Tres vistas: Detrás (cámara de persecución), Arriba (dron) y Libre
   (el punto de giro va con el agente y se puede orbitar). Deja una estela con su recorrido y una ficha en vivo.
   Fuentes: vehículos de la simulación SUMO y de giro_sim (vehiculos.js: vistos), personas de giro_sim (T3.giroSim)
   y fauna de la red biótica (T3.bio). Esc o × suelta el agente. */
export function iniciarSeguir({ THREE, T3, say }) {
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const VAR = { sedan: 'Carro sedán', hatch: 'Carro compacto', suv: 'Camioneta SUV', taxi: 'Taxi', pickup: 'Camioneta de platón', van: 'Van', furgon: 'Camión furgón', estacas: 'Camión de estacas', moto: 'Moto', motoChaleco: 'Moto de domicilios', bici: 'Ciclista', biciChaleco: 'Ciclista de domicilios' };
  const PERS = { peaton: 'Peatón', hab: 'Habitante', col: 'Integrante de colectivo ambiental', madre: 'Madre comunitaria', recu: 'Recuperador de Corabastos', joven: 'Joven aprendiz', cocinera: 'Cocinera tradicional', nino: 'Niño de colegio', maestra: 'Maestra', vecino: 'Vecino', huertero: 'Huertero' };
  const ESTX = { posado: 'Posado', vuelo: 'Volando', liba: 'Libando néctar', quieto: 'Quieto', camina: 'Caminando', percha: 'Perchado en un árbol', planea: 'Planeando', picada: 'En picada sobre una presa', sube: 'Subiendo', buceo: 'Buceando', colmena: 'En la colmena' };
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const placa = (o) => { if (!o._pl) { const h = (o._vc || 0) + (o._vl || 0) * 1e6 + Math.random(); const L = 'ABCDEFGHJKLMNPRSTUVWXYZ', r = (k) => hash(h * 13.7 + k); o._pl = L[Math.floor(r(1) * L.length)] + L[Math.floor(r(2) * L.length)] + L[Math.floor(r(3) * L.length)] + ' ' + String(Math.floor(r(4) * 900) + 100); } return o._pl; };

  /* ---------- fuentes de agentes ---------- */
  const ahora = () => performance.now();
  const vehiculos = () => { const L = []; for (const VS of [T3.vehSUMO, T3.vehGiro]) if (VS && VS.vistos) for (const o of VS.vistos) L.push(o); return L; };
  const personas = () => { const G = T3.giroSim; if (!G) return []; return G.A.filter(a => PERS[a.tipo] && a.vis !== false && a.x !== undefined && G.MALLAS[a.tipo] && G.MALLAS[a.tipo].visible !== false); };
  const fauna = () => (T3.bio ? T3.bio.AG.filter(a => a.vis) : []);
  // adaptador: posición, frente (vector en el piso) y textos de cada clase
  const AD = {
    veh: {
      pos: (o, P) => { P.set(o._x, o._y, o._z); return !o._vs || o._ts >= (o._vs.tPrev || 0); }, // sigue en la simulación si se puso en el último cuadro
      frente: (o) => [Math.sin(o._r), Math.cos(o._r)],
      nombre: (o) => VAR[o._vv] || 'Vehículo', clase: (o) => o._tp === 'moto' ? 'Moto' : o._tp === 'camion' ? 'Camión' : o._tp === 'bici' ? 'Bicicleta' : 'Carro',
      cam: (o) => o._tp === 'camion' ? [22, 30, 1.9] : o._tp === 'moto' || o._tp === 'bici' ? [13, 21, 1.1] : [16, 25, 1.2], // por encima de las copas de los árboles de la calle
      extra: (o) => o._tp === 'bici' ? '' : `<span>Placa <b>${placa(o)}</b></span>`
    },
    per: {
      pos: (a, P) => { const G = T3.giroSim; const x = a.x + G.OX, z = a.y + G.OZ; P.set(x, G.Y0 + (T3.alzaVia ? T3.alzaVia(x, z) : 0), z); return a.vis !== false && a.x !== undefined; },
      frente: (a) => [Math.sin(a.rot || 0), Math.cos(a.rot || 0)],
      nombre: (a) => PERS[a.tipo] || 'Persona', clase: () => 'Persona', cam: (a) => [10, 17, a.tipo === 'nino' ? 1.1 : 1.6],
      extra: (a) => a.pausa > 0 ? '<span>Detenido</span>' : '<span>Caminando</span>'
    },
    fau: {
      pos: (a, P) => { P.set(a.x, a.y, a.z); return true; },
      frente: (a) => [Math.cos(a.rot), -Math.sin(a.rot)],
      nombre: (a) => T3.bio.ESP[a.e].n, clase: (a) => { const c = T3.bio.CAT[T3.bio.ESP[a.e].cat]; return c ? c.n : 'Fauna'; },
      cam: (a) => { const e = T3.bio.ESP[a.e]; return e.ave ? [11, 6, 0.4] : [8, 5, 0.15]; },
      extra: (a) => { const est = a.caza ? 'Persiguiendo una presa' : a.huye ? 'Huyendo' : a.duerme && !(a.vel > 0.05) ? 'En reposo' : (ESTX[a.st] || 'Moviéndose'); const nL = (a.links || []).filter(k => T3.bio.LINKS.get(k)).length; return `<span>${esc(est)}</span><span>${esc(a.h.n)}</span><span><b>${nL}</b> ${nL === 1 ? 'relación' : 'relaciones'} ahora</span>`; }
    }
  };

  /* ---------- estado ---------- */
  const S = { obj: null, k: null, modo: 'detras', dist: 0, t0: 0, ult: null, vel: 0, F: [0, 1], camOff: null };
  const P = new THREE.Vector3(), tmp = new THREE.Vector3(), mira = new THREE.Vector3(), deseo = new THREE.Vector3();

  // estela
  const NE = 240, ePos = new Float32Array(NE * 3), eGeo = new THREE.BufferGeometry(); eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3).setUsage(THREE.DynamicDrawUsage)); eGeo.setDrawRange(0, 0);
  const estela = new THREE.Line(eGeo, new THREE.LineBasicMaterial({ color: 0xe2a55b, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
  estela.frustumCulled = false; estela.renderOrder = 11; estela.visible = false; T3.scene.add(estela); let nE = 0;
  // anillo sobre el agente (se ve desde lejos)
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xe2a55b, transparent: true, opacity: 0.9, depthWrite: false, fog: false, side: THREE.DoubleSide }));
  anillo.renderOrder = 11; anillo.visible = false; T3.scene.add(anillo);

  /* ---------- interfaz ---------- */
  const css = document.createElement('style'); css.textContent = `
#sg{position:fixed;z-index:14;left:50%;top:14px;transform:translateX(-50%);width:min(380px,calc(100vw - 24px));display:none;padding:12px 14px 12px;
  font:400 12px var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#e9ebec);background:var(--ui-bg,rgba(13,15,18,.8));border:1px solid var(--ui-bd,rgba(255,255,255,.075));
  border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.28);-webkit-backdrop-filter:blur(16px) saturate(1.1);backdrop-filter:blur(16px) saturate(1.1);font-variant-numeric:tabular-nums}
body.sg-on #sg{display:block}
#sg .t{display:flex;align-items:flex-start;gap:10px}
#sg .t div{flex:1;min-width:0}
#sg .cl{font:500 9.5px var(--ui-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-acc-tx,#e3ff86)}
#sg h4{margin:3px 0 0;font:500 16px/1.2 var(--ui-sans,sans-serif)}
#sg .x{width:26px;height:26px;border:0;border-radius:6px;background:none;color:var(--ui-tx2,#9aa2a7);font:300 18px/1 var(--ui-sans,sans-serif);cursor:pointer}
#sg .x:hover{background:rgba(255,255,255,.06);color:var(--ui-tx,#e9ebec)}
#sg .dat{display:grid;grid-template-columns:repeat(3,1fr);margin:10px 0 8px}
#sg .dat div{padding:0 10px;border-left:1px solid var(--ui-bd,rgba(255,255,255,.075))}#sg .dat div:first-child{padding-left:0;border-left:0}
#sg .dat b{display:block;font:400 18px/1.1 var(--ui-sans,sans-serif)}#sg .dat small{color:var(--ui-tx3,#646c71);font-size:10.5px}
#sg .ex{display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--ui-tx2,#9aa2a7);font-size:11.5px;margin-bottom:10px}
#sg .ex b{color:var(--ui-tx,#e9ebec);font-weight:500}
#sg .fila{display:flex;gap:4px}
#sg .fila button{flex:1;height:28px;border:1px solid var(--ui-bd,rgba(255,255,255,.075));border-radius:7px;background:rgba(255,255,255,.035);color:var(--ui-tx2,#9aa2a7);font:500 11px var(--ui-sans,sans-serif);cursor:pointer}
#sg .fila button:hover{color:var(--ui-tx,#e9ebec)}
#sg .fila button.on{background:var(--ui-acc-bg,rgba(213,255,63,.13));color:var(--ui-acc-tx,#e3ff86);border-color:rgba(213,255,63,.42)}
#sg .fila .sep{flex:none;width:6px;border:0;background:none}
#sg-menu{position:fixed;z-index:14;left:50%;bottom:84px;transform:translateX(-50%);display:none;gap:4px;padding:5px;border-radius:12px;background:var(--ui-bg,rgba(13,15,18,.85));border:1px solid var(--ui-bd,rgba(255,255,255,.075));-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:0 12px 32px rgba(0,0,0,.28)}
#sg-menu.on{display:flex}
#sg-menu button{display:flex;flex-direction:column;align-items:center;gap:5px;width:86px;padding:10px 4px 9px;border:0;border-radius:9px;background:transparent;color:var(--ui-tx2,#9aa2a7);font:500 11px var(--ui-sans,sans-serif);cursor:pointer}
#sg-menu button:hover{background:rgba(255,255,255,.05);color:var(--ui-tx,#e9ebec)}
#sg-menu svg{width:20px;height:20px}
#sg-menu small{display:block;color:var(--ui-tx3,#646c71);font-size:10px;font-weight:400}
@media(max-width:760px){#sg{top:auto;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 64px)}#sg-menu{bottom:calc(max(12px,env(safe-area-inset-bottom)) + 64px)}
  body #hud-c #b-seguir{font-size:0!important;letter-spacing:0!important;padding:10px 12px!important}body #hud-c #b-seguir svg{margin:0!important}}`;
  document.head.appendChild(css);
  const ficha = document.createElement('div'); ficha.id = 'sg'; ficha.setAttribute('role', 'status');
  ficha.innerHTML = `<div class="t"><div><div class="cl" id="sg-cl"></div><h4 id="sg-n"></h4></div><button class="x" id="sg-x" aria-label="Dejar de seguir">×</button></div>
    <div class="dat"><div><b id="sg-v">0</b><small>km/h</small></div><div><b id="sg-d">0 m</b><small>recorrido</small></div><div><b id="sg-t">0:00</b><small>siguiendo</small></div></div>
    <div class="ex" id="sg-ex"></div>
    <div class="fila"><button data-m="detras" class="on">Detrás</button><button data-m="arriba">Arriba</button><button data-m="libre">Libre</button><span class="sep"></span><button id="sg-sig" title="Seguir a otro del mismo tipo, cerca">Otro</button><button id="sg-red" hidden>Su red</button></div>`;
  const ic = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const menu = document.createElement('div'); menu.id = 'sg-menu';
  menu.innerHTML = `<button data-k="veh">${ic('<path d="M5 17h14v-4l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/><path d="M5 13h14"/>')}Vehículo<small>carro, moto, camión</small></button>
    <button data-k="per">${ic('<circle cx="12" cy="5" r="2"/><path d="m9 22 1.5-7L8 12V9l4-1 4 1v3l-2.5 3L15 22"/>')}Persona<small>peatón o actor</small></button>
    <button data-k="fau">${ic('<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.3-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/>')}Especie<small>aves, fauna</small></button>`;
  document.body.append(ficha, menu);
  const $ = (id) => document.getElementById(id);
  const hud = document.getElementById('hud-c'), ref = document.getElementById('b-tablero') || document.getElementById('b-pajaro');
  const btn = document.createElement('button'); btn.id = 'b-seguir'; btn.title = 'Seguir un vehículo, una persona o un animal';
  btn.innerHTML = '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>Seguir';
  if (hud) { if (ref && ref.parentElement === hud) hud.insertBefore(btn, ref); else hud.appendChild(btn); }
  btn.onclick = () => { if (S.obj) { soltar(); return; } menu.classList.toggle('on'); };
  menu.querySelectorAll('button').forEach(b => b.onclick = () => { menu.classList.remove('on'); if (!cercano(b.dataset.k)) aviso(b.dataset.k === 'per' ? 'No hay personas a la vista: acércate a una calle' : b.dataset.k === 'veh' ? 'Los vehículos todavía se están cargando' : 'No hay animales cerca: acércate a un humedal o parque'); });
  $('sg-x').onclick = () => soltar();
  ficha.querySelectorAll('[data-m]').forEach(b => b.onclick = () => modo(b.dataset.m));
  $('sg-sig').onclick = () => { const o = S.obj, k = S.k; if (o) cercano(k, o); };
  $('sg-red').onclick = () => { if (S.k === 'fau' && T3.bio && T3.bio.verRed) T3.bio.verRed(S.obj.e); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.obj) soltar(); });
  const aviso = (t) => { if (say) say(t); };
  const modo = (m) => { S.modo = m; ficha.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === m)); };

  /* ---------- elegir ---------- */
  const lista = (k) => k === 'veh' ? vehiculos() : k === 'per' ? personas() : fauna();
  function cercano(k, salvo) { // el más cercano al punto que se mira (o al agente actual, para "Otro")
    const L = lista(k); if (!L.length) return false; const c = salvo ? (AD[k].pos(salvo, tmp), tmp.clone()) : T3.orbit.target.clone(); let best = null, bd = Infinity;
    for (const o of L) { if (o === salvo || !AD[k].pos(o, P)) continue; const d = Math.hypot(P.x - c.x, P.z - c.z) + (salvo ? Math.random() * 25 : 0); if (d < bd) { bd = d; best = o; } }
    if (!best) return false; seguir(k, best); return true;
  }
  function seguir(k, o) {
    S.obj = o; S.k = k; S.dist = 0; S.t0 = ahora(); S.ult = null; S.vel = 0; nE = 0; eGeo.setDrawRange(0, 0);
    AD[k].pos(o, P); const f = AD[k].frente(o); S.F = [f[0], f[1]];
    modo('detras'); document.body.classList.add('sg-on'); btn.classList.add('on'); estela.visible = anillo.visible = true;
    $('sg-cl').textContent = AD[k].clase(o); $('sg-n').textContent = AD[k].nombre(o); $('sg-red').hidden = k !== 'fau';
    T3.anim = null; T3.siguiendo = true;
  }
  function soltar() {
    if (!S.obj) return; S.obj = null; document.body.classList.remove('sg-on'); btn.classList.remove('on'); estela.visible = anillo.visible = false; T3.siguiendo = false;
  }

  // clic sin arrastrar sobre un agente
  const cv = T3.renderer.domElement; let pd = null;
  cv.addEventListener('pointerdown', (e) => { pd = { x: e.clientX, y: e.clientY, t: ahora() }; if (S.obj && S.modo !== 'libre') S.arr = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointermove', (e) => { if (S.arr && Math.hypot(e.clientX - S.arr.x, e.clientY - S.arr.y) > 8) { S.arr = null; modo('libre'); } }); // arrastrar mientras se sigue: pasa a vista libre
  addEventListener('pointerup', () => { S.arr = null; });
  cv.addEventListener('pointerup', (e) => {
    if (!pd || Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 6 || ahora() - pd.t > 450) return;
    const r = cv.getBoundingClientRect(), cam = T3.camera; let best = null, bk = null, bd = (innerWidth < 760 ? 30 : 22) ** 2;
    const probar = (k, o, alto) => { if (!AD[k].pos(o, P)) return; tmp.copy(P); tmp.y += alto; tmp.project(cam); if (tmp.z > 1) return; const sx = (tmp.x + 1) / 2 * r.width + r.left, sy = (1 - tmp.y) / 2 * r.height + r.top, d = (sx - e.clientX) ** 2 + (sy - e.clientY) ** 2; if (d < bd) { bd = d; best = o; bk = k; } };
    for (const o of vehiculos()) probar('veh', o, 0.8);
    for (const a of personas()) probar('per', a, 0.9);
    for (const a of fauna()) probar('fau', a, 0.4);
    if (best) seguir(bk, best);
  });

  /* ---------- cada cuadro (lo llama el bucle de index.html antes de dibujar) ---------- */
  let tUI = 0;
  function update(dt) {
    if (!S.obj) return;
    const k = S.k, o = S.obj, A = AD[k];
    if (!A.pos(o, P)) { aviso(k === 'veh' ? 'El vehículo salió de la simulación' : 'Se perdió de vista'); soltar(); return; }
    // velocidad y recorrido
    if (S.ult) { const d = Math.hypot(P.x - S.ult.x, P.z - S.ult.z); if (d < 40) { S.dist += d; S.vel += (d / Math.max(dt, 1e-3) * 3.6 - S.vel) * Math.min(1, dt * 2); } } else S.ult = new THREE.Vector3();
    S.ult.copy(P);
    // frente suavizado (las aves cambian de rumbo bruscamente)
    const f = A.frente(o), kf = 1 - Math.exp(-dt * (k === 'fau' ? 2 : 5)); S.F[0] += (f[0] - S.F[0]) * kf; S.F[1] += (f[1] - S.F[1]) * kf; const lf = Math.hypot(S.F[0], S.F[1]) || 1, fx = S.F[0] / lf, fz = S.F[1] / lf;
    const [D, Hc, ojo] = A.cam(o), cam = T3.camera, tg = T3.orbit.target;
    mira.set(P.x + fx * D * 0.35, P.y + ojo, P.z + fz * D * 0.35);
    if (S.modo === 'libre') { const dx = P.x - tg.x, dy = P.y + ojo - tg.y, dz = P.z - tg.z, kk = 1 - Math.exp(-dt * 6); tg.x += dx * kk; tg.y += dy * kk; tg.z += dz * kk; cam.position.x += dx * kk; cam.position.y += dy * kk; cam.position.z += dz * kk; }
    else {
      if (S.modo === 'arriba') { deseo.set(P.x - fx * 0.5, P.y + Math.max(45, D * 5), P.z - fz * 0.5); mira.set(P.x, P.y, P.z); }
      else deseo.set(P.x - fx * D, P.y + Hc + ojo, P.z - fz * D);
      const kc = 1 - Math.exp(-dt * 3.2), kt = 1 - Math.exp(-dt * 7);
      cam.position.lerp(deseo, kc); tg.lerp(mira, kt); cam.lookAt(tg);
    }
    // estela y anillo
    const ult = nE ? [ePos[(nE - 1) * 3], ePos[(nE - 1) * 3 + 2]] : null;
    if (!ult || Math.hypot(ult[0] - P.x, ult[1] - P.z) > (k === 'fau' ? 0.5 : 1.5)) {
      if (nE >= NE) { ePos.copyWithin(0, 3); nE = NE - 1; }
      ePos[nE * 3] = P.x; ePos[nE * 3 + 1] = P.y + 0.25; ePos[nE * 3 + 2] = P.z; nE++; eGeo.setDrawRange(0, nE); eGeo.attributes.position.needsUpdate = true;
    }
    const rr = k === 'veh' ? (o._tp === 'camion' ? 5.5 : o._tp === 'carro' ? 3.6 : 1.8) : k === 'per' ? 1.1 : 0.9, pul = 1 + 0.08 * Math.sin(ahora() / 260);
    anillo.position.set(P.x, P.y + 0.12, P.z); anillo.scale.setScalar(rr * pul);
    // ficha (4 veces por segundo)
    if ((tUI -= dt) <= 0) {
      tUI = 0.25; const s = Math.floor((ahora() - S.t0) / 1000);
      $('sg-v').textContent = Math.round(S.vel); $('sg-d').textContent = S.dist < 1000 ? Math.round(S.dist) + ' m' : (S.dist / 1000).toFixed(2).replace('.', ',') + ' km';
      $('sg-t').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); $('sg-ex').innerHTML = A.extra(o);
    }
  }

  const api = { update, seguir, soltar, cercano, get activo() { return !!S.obj; } };
  T3.seguidor = api; return api;
}
