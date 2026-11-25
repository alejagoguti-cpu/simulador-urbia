/* ============ ESCENARIOS EN EL TERRITORIO (SIM-01, SIM-02 y SIM-03 con sliders, sobre el mapa) ============
   A = «Kennedy hoy» (sin intervención). B = nodo único con decisión central. C = clúster con decisión rotativa.
   El modelo (data3d/sim_vida.js: SIM-01/02/03 del tablero escritos como regla de paso) corre SIN FIN semana a semana y CADA resultado se ve en el 3D:
   · SIM-01  hogares con huerta  -> huertas de barrio que se abren desde Bavaria hacia afuera (y se cierran si hay abandono)
             dependencia de Corabastos -> menos carros y camiones en la Av. Ciudad de Cali (T3.alivio.KEEP) y el anillo de Corabastos
             promotores formados -> etiqueta en Bavaria Común
   · SIM-02  orgánicos: camiones al relleno Doña Juana (A) / estaciones barriales de compostaje (B) / planta de Bavaria (C),
             con partículas proporcionales a los kilos y la ocupación de cada estación
   · SIM-03  aves -> fracción de aves visibles en la red biótica (T3.bio.ESTADO.fauna); integridad del humedal -> anillo de El Burro;
             trampas ecológicas (luz y vidrio) -> huertas del borde en rojo si no hay medida antitrampa */
import { SEM, AÑO, PAR, SIMST, avisar, correrTodo } from './sim_modelos.js?v=4';
/* SIMULACIÓN SIN FIN (data3d/sim_vida.js): el mapa ya no muestra 10 años precalculados. A, B y C avanzan semana a semana desde su estado,
   con perturbaciones al azar (semilla = SIMST.semilla) y reglas de colapso fijas. La corrida del mapa es la réplica «semilla N» del modo Evaluar. */
import { crear as crearVida, paso as pasoVida, diagnostico, tendencia, REGLAS, NOMBRE_EV, ARRANQUE } from './sim_vida.js?v=2';
export async function iniciarEscenariosSim({ T3, cj }) {
  const THREE = T3.THREE, MOV = innerWidth < 760, RMQ = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HB = await cj('data3d/huertas_barrio.json?v=3').catch(() => ({ huertas: [] }));
  const { P1, P2, P3 } = PAR;
  if (P1.pares == null) P1.pares = 3;
  const R = correrTodo(); // solo para la referencia fija REF (modelo de 10 años del documento, valores por defecto)
  /* ---------- estado vivo: A, B y C con la misma semilla (viven los mismos eventos) ---------- */
  const VIDA = { seed: SIMST.semilla || 1, S: null, vel: 0, maxT: SEM - 1, avisado: {} };
  const reiniciarVida = () => { VIDA.S = { A: crearVida('A', VIDA.seed), B: crearVida('B', VIDA.seed), C: crearVida('C', VIDA.seed) }; VIDA.avisado = {}; };
  const avanzarA = (w) => { w = Math.max(0, Math.floor(w)); if (!VIDA.S || VIDA.S.A.t > w) reiniciarVida(); const S = VIDA.S; while (S.A.t < w) { pasoVida(S.A, PAR); pasoVida(S.B, PAR); pasoVida(S.C, PAR); } if (w > VIDA.maxT) VIDA.maxT = w; };
  // vista compatible con el formato viejo (R.S1[e].act[t] …) para los módulos que lo leen (capas_escenario.js, mejora_tour.js): cualquier semana da el valor vivo
  const vista = (k, key) => new Proxy([], { get: (o, p) => p === 'length' ? SEM : (typeof p === 'string' && /^\d+$/.test(p)) ? VIDA.S[k].o[key] : Reflect.get(o, p) });
  const K1 = ['act', 'dep', 'pers', 'pct', 'prom', 'prod', 'auto', 'merma', 'exc', 'm2p', 'cal', 'espera', 'pc', 'carga', 'retiro', 'reg'], K2 = { relleno: 'relleno', compost: 'compost', hongos: 'hongos', vuelve: 'vuelve', pct: 'pct2', km: 'km', pila: 'pila', desv: 'desv', ocup: 'ocup' }, K3 = ['aves', 'riq', 'hum', 'trampa'];
  const RV = { S1: {}, S2: {}, S3: {} };
  for (const k of 'ABC') { RV.S1[k] = Object.fromEntries(K1.map(q => [q, vista(k, q)])); Object.defineProperty(RV.S1[k], 'N', { get: () => VIDA.S[k].o.N });
    RV.S2[k] = Object.fromEntries(Object.entries(K2).map(([q, q2]) => [q, vista(k, q2)])); Object.defineProperty(RV.S2[k], 'gen', { get: () => VIDA.S[k].o.gen });
    RV.S3[k] = Object.fromEntries(K3.map(q => [q, vista(k, q)])); Object.defineProperty(RV.S3[k], 'conect', { get: () => VIDA.S[k].o.conect }); }
  avanzarA(SIMST.t);
  // referencia FIJA (valores por defecto): huertas del escenario al año 10. Las cubiertas verdes y la fauna se miden contra ella, así los
  // sliders que suben o bajan los hogares con huerta cambian cuántas cubiertas y cuánta fauna se ven (antes siempre llegaba al 100 %)
  const ALC0 = P1.alcance || 0.5; // alcance por defecto
  const REF = {}; for (const k of ['B', 'C']) { const s = R.S1[k]; REF[k] = s ? Math.max(0.01, s.act[s.act.length - 1] / R.S1.C.N) : 1; }
  const NC = R.S1.C.N, NREG = Object.fromEntries(REGLAS.map(Q => [Q.k, Q.n.toLowerCase()]));
  const fmt = (v, d = 0) => (v == null || !isFinite(v)) ? '–' : v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtK = (v) => v >= 1e6 ? fmt(v / 1e6, 1) + ' M' : v >= 1e4 ? fmt(v / 1e3, 0) + ' mil' : fmt(v);
  const Y = T3.sueloY != null ? T3.sueloY : 0.35;
  const esc = () => (T3.escenario === 'proyecto' ? SIMST.esc : 'A');

  /* ---------------- lugares ---------------- */
  const BURRO = [2095.67, -109.06], CORA = [1132.1, 948.6], BAV = [4136, 96], DJ = [5200, 2900]; // Doña Juana queda al sureste, fuera del mapa
  const BAVC = () => (window.KEN_BAV && window.KEN_BAV.compost) || [4185.7, 28.9];
  // estaciones barriales de compostaje (B): 8 huertas de parque bien repartidas (punto más lejano)
  const PQ = HB.huertas.filter(h => h.tipo === 'parque').map(h => h.c);
  const EST = []; if (PQ.length) { EST.push(PQ[0]); while (EST.length < Math.min(8, PQ.length)) { let m = null, md = -1; for (const p of PQ) { const d = Math.min(...EST.map(e => Math.hypot(e[0] - p[0], e[1] - p[1]))); if (d > md) { md = d; m = p; } } EST.push(m); } }
  const BORDE = PQ.filter(p => Math.hypot(p[0] - BURRO[0], p[1] - BURRO[1]) < 1100); // huertas del borde del humedal (trampas)

  /* ---------------- 3D ---------------- */
  const grupo = new THREE.Group(); grupo.name = 'escenarios_sim'; T3.scene.add(grupo);
  const anillo = (r0, r1, c) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 96).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })); m.renderOrder = 7; grupo.add(m); return m; };
  const aHum = anillo(300, 312, '#59a14f'); aHum.visible = false; aHum.position.set(BURRO[0], Y + 1.2, BURRO[1]);
  const aCor = anillo(330, 342, '#e15759'); aCor.visible = false; aCor.position.set(CORA[0], Y + 1.2, CORA[1]);
  // estaciones barriales: caseta + tres pilas de compost cuya altura sigue la ocupación (G12)
  const mMad = new THREE.MeshStandardMaterial({ color: '#7b5a3c', roughness: 0.9 }), mPila = new THREE.MeshStandardMaterial({ color: '#3b2b1f', roughness: 1 }), mTecho = new THREE.MeshStandardMaterial({ color: '#59615c', roughness: 0.6, metalness: 0.3 });
  const ESTM = EST.map(p => { const g = new THREE.Group(); g.position.set(p[0] + 14, Y, p[1] + 10);
    const caseta = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 4).translate(0, 1.3, 0), mMad), techo = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 5).translate(0, 2.8, 0), mTecho);
    const pilas = [-3, 0, 3].map(x => { const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 14, 8, 0, 6.29, 0, 1.4).scale(1.4, 1, 1), mPila); m.position.set(x, 0, 4.2); g.add(m); return m; });
    caseta.castShadow = techo.castShadow = true; g.add(caseta, techo); g.visible = false; grupo.add(g); return { g, pilas }; });
  // rutas de orgánicos (partículas): relleno, estación, Bavaria
  const curva = (a, b, h) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return new THREE.QuadraticBezierCurve3(new THREE.Vector3(a[0], Y + 4, a[1]), new THREE.Vector3((a[0] + b[0]) / 2, Y + 4 + L * h, (a[1] + b[1]) / 2), new THREE.Vector3(b[0], Y + 4, b[1])); };
  const FUENTE = EST.map(p => [p[0] + 160, p[1] - 120]); // barrios que separan sus orgánicos (al lado de cada estación)
  const RUTAS = { rell: EST.map((p, i) => curva(FUENTE[i], DJ, 0.05)), est: EST.map((p, i) => curva(FUENTE[i], p, 0.25)), bav: EST.map((p, i) => curva(FUENTE[i], BAVC(), 0.08)) };
  const NP = MOV ? 260 : 520, PP = new Float32Array(NP * 3), PC = new Float32Array(NP * 3), gp = new THREE.BufferGeometry();
  gp.setAttribute('position', new THREE.BufferAttribute(PP, 3)); gp.setAttribute('color', new THREE.BufferAttribute(PC, 3));
  const puntos = new THREE.Points(gp, new THREE.PointsMaterial({ size: MOV ? 5 : 6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false })); puntos.renderOrder = 11; puntos.visible = false; // (los puntos que viajaban confundían: el cambio de los residuos se lee en las etiquetas)
  const PART = Array.from({ length: NP }, (_, i) => ({ r: 'rell', k: i % Math.max(1, EST.length), f: Math.random(), on: false }));
  const COLR = { rell: new THREE.Color('#9aa1a6'), est: new THREE.Color('#c8a26a'), bav: new THREE.Color('#D5FF3F') };
  // trampas ecológicas: huertas del borde del humedal en rojo (luz y vidrio sin medida antitrampa)
  /* ---------- CAPA DE CAMBIOS: se lee desde lejos (los cambios reales miden metros y desde 1 km no se verían) ----------
     · cada huerta abierta = punto verde con halo que nunca baja de ~9 px (parques y lotes en el orden en que se abren, Bavaria y colegios)
     · Av. Ciudad de Cali = línea de puntos que va de rojo (mucho tráfico hacia Corabastos) a verde (menos) */
  const COLR2 = await cj('data3d/colegios_red.json?v=3').catch(() => null);
  const MK = []; // [x, z, radio m, tipo, orden]
  const parques = HB.huertas.filter(h => h.tipo === 'parque').sort((a, b) => Math.hypot(a.c[0] - BAV[0], a.c[1] - BAV[1]) - Math.hypot(b.c[0] - BAV[0], b.c[1] - BAV[1]));
  parques.forEach((h, i) => MK.push([h.c[0], h.c[1], 22, 'par', i / Math.max(1, parques.length)]));
  HB.huertas.filter(h => h.tipo === 'lote').forEach(h => h.m.forEach(m => MK.push([m.c[0], m.c[1], 16, 'lote', 0.06])));
  (COLR2 && COLR2.huertas || []).forEach(h => MK.push([h.c[0], h.c[1], h.r || 30, 'col', 0.02]));
  const gm = new THREE.BufferGeometry(), mP = new Float32Array(MK.length * 3), mR = new Float32Array(MK.length), mO = new Float32Array(MK.length);
  MK.forEach((m, i) => { mP.set([m[0], Y + 3, m[1]], i * 3); mR[i] = m[2]; });
  gm.setAttribute('position', new THREE.BufferAttribute(mP, 3)); gm.setAttribute('rad', new THREE.BufferAttribute(mR, 1)); gm.setAttribute('on', new THREE.BufferAttribute(mO, 1));
  const UM = { uPx: { value: innerHeight * Math.min(2, devicePixelRatio || 1) }, uT: { value: 0 }, uA: { value: 0 } };
  const marcas = new THREE.Points(gm, new THREE.ShaderMaterial({ uniforms: UM, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: `attribute float rad, on; uniform float uPx, uT; varying float vO; void main(){ vO = on; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
      float px = rad * 2.6 * uPx / max(-mv.z, 1.0) * 0.55; gl_PointSize = on > 0.01 ? clamp(px, 18.0, 110.0) : 0.0; }`,
    fragmentShader: `uniform float uT, uA; varying float vO; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
      float nucleo = smoothstep(0.42, 0.3, d), halo = smoothstep(1.0, 0.45, d) * 0.45, anillo = smoothstep(0.08, 0.0, abs(d - 0.62)) * 0.8;
      vec3 c = mix(vec3(0.3, 0.85, 0.35), vec3(0.85, 1.0, 0.7), nucleo); gl_FragColor = vec4(c, (nucleo * 0.95 + halo + anillo) * vO * uA);
      #include <colorspace_fragment>
    }` }));
  marcas.renderOrder = 12; marcas.frustumCulled = false; grupo.add(marcas);
  // Av. Ciudad de Cali: puntos a lo largo de la vía (de la cinta de data3d/alivio_cali.js)
  let via = null;
  const armarVia = () => { const C = window.KEN_CALI; if (via || !C || !C.cinta) return; const P = C.cinta.geometry.attributes.position, A = [];
    const mid = (i) => [(P.getX(i) + P.getX(i + 1)) / 2, P.getY(i) + 1.5, (P.getZ(i) + P.getZ(i + 1)) / 2];
    for (let i = 0; i + 3 < P.count; i += 2) { const a = mid(i), b = mid(i + 2), L = Math.hypot(b[0] - a[0], b[2] - a[2]); if (L > 400) continue; const n = Math.max(1, Math.ceil(L / 6)); for (let k = 0; k < n; k++) { const t = k / n; A.push(a[0] + (b[0] - a[0]) * t, a[1], a[2] + (b[2] - a[2]) * t); } }
    const gv = new THREE.BufferGeometry(); gv.setAttribute('position', new THREE.Float32BufferAttribute(A, 3));
    via = new THREE.Points(gv, new THREE.PointsMaterial({ size: 9, sizeAttenuation: false, color: '#e15759', transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, toneMapped: false }));
    via.renderOrder = 12; via.frustumCulled = false; grupo.add(via); };
  /* ---------- FRANJA DE TRÁFICO de la Av. Ciudad de Cali: color y grosor = cuántos vehículos van hacia Corabastos ----------
     roja y gruesa = tráfico alto (A, Kennedy hoy) · naranja = medio · verde y delgada = bajo. Ancho en pantalla casi constante: se ve desde lejos. */
  const DC = await cj('data3d/alivio_cali.json?v=1').catch(() => null);
  const UB = { uW: { value: 12 }, uC: { value: new THREE.Color('#e15759') }, uA: { value: 0 } };
  let banda = null;
  if (DC && DC.lineas) { const P = [], N = [], I = [];
    for (const L of DC.lineas) { const b0 = P.length / 3;
      for (let k = 0; k < L.length; k++) { const a = L[Math.max(0, k - 1)], b = L[Math.min(L.length - 1, k + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        const x = L[k][0], z = L[k][1], y = (T3.viaY != null ? T3.viaY : 0.62) + 0.5 + (T3.alzaVia ? T3.alzaVia(x, z) : 0);
        P.push(x, y, z, x, y, z); N.push(-dz, dx, 1, -dz, dx, -1); if (k < L.length - 1) { const v = b0 + k * 2; I.push(v, v + 1, v + 2, v + 1, v + 3, v + 2); } } }
    const gb = new THREE.BufferGeometry(); gb.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); gb.setAttribute('lado', new THREE.Float32BufferAttribute(N, 3)); gb.setIndex(I);
    banda = new THREE.Mesh(gb, new THREE.ShaderMaterial({ uniforms: UB, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, toneMapped: false,
      vertexShader: 'attribute vec3 lado; uniform float uW; varying float vS; void main(){ vS = lado.z; vec3 p = position + vec3(lado.x, 0.0, lado.y) * lado.z * uW; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: `uniform vec3 uC; uniform float uA; varying float vS; void main(){ float s = abs(vS); float a = 1.0 - smoothstep(0.78, 1.0, s); vec3 c = mix(uC, uC * 1.25, smoothstep(0.5, 0.0, s));
        gl_FragColor = vec4(c, uA * 0.78 * a);
        #include <colorspace_fragment>
      }` }));
    banda.renderOrder = 11; banda.frustumCulled = false; banda.name = 'trafico_escenario'; grupo.add(banda); }
  let kTr = 1; // fracción del tráfico de hoy que sigue en la vía (1 = como hoy)
  const C_ROJO = new THREE.Color('#e15759'), C_NAR = new THREE.Color('#f28e2b'), C_VER = new THREE.Color('#59a14f');
  const colorTr = (k) => { const u = Math.max(0, Math.min(1, (k - 0.5) / 0.5)); return u > 0.5 ? C_NAR.clone().lerp(C_ROJO, (u - 0.5) * 2) : C_VER.clone().lerp(C_NAR, u * 2); };
  const nivelTr = (k) => k > 0.85 ? 'alto' : k > 0.65 ? 'medio' : 'bajo';
  /* ---------- COMPOST en el mapa: B = 8 estaciones de barrio · C = una planta grande en Bavaria (A: nada, todo va en camión al relleno) ---------- */
  const CP = [...EST.map(p => [p[0], p[1], 26]), [BAVC()[0], BAVC()[1], 46]];
  const gc = new THREE.BufferGeometry(), cPos = new Float32Array(CP.length * 3), cTam = new Float32Array(CP.length), cOn = new Float32Array(CP.length);
  CP.forEach((c, i) => { cPos.set([c[0], Y + 4, c[1]], i * 3); cTam[i] = c[2]; });
  gc.setAttribute('position', new THREE.BufferAttribute(cPos, 3)); gc.setAttribute('tam', new THREE.BufferAttribute(cTam, 1)); gc.setAttribute('on', new THREE.BufferAttribute(cOn, 1));
  const UC = { uA: { value: 0 }, uR: { value: Math.min(2, devicePixelRatio || 1) } };
  const compostM = new THREE.Points(gc, new THREE.ShaderMaterial({ uniforms: UC, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
    vertexShader: 'attribute float tam, on; uniform float uR; varying float vO; void main(){ vO = on; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = on > 0.01 ? tam * uR : 0.0; }',
    fragmentShader: `uniform float uA; varying float vO; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q) * 2.0; if (d > 1.0) discard;
      float anillo = smoothstep(0.86, 0.8, d) - smoothstep(0.72, 0.66, d); float centro = smoothstep(0.66, 0.6, d);
      vec3 c = mix(vec3(0.55, 0.38, 0.2), vec3(0.85, 0.66, 0.42), smoothstep(0.6, 0.0, d)); c = mix(c, vec3(1.0), anillo);
      gl_FragColor = vec4(c, uA * vO * max(centro * 0.95, anillo) );
      #include <colorspace_fragment>
    }` }));
  compostM.renderOrder = 12; compostM.frustumCulled = false; grupo.add(compostM);
  let fMarcas = 0;
  const TR = BORDE.map(p => { const m = anillo(16, 22, '#ff5a4f'); m.position.set(p[0], Y + 1.5, p[1]); m.visible = false; m.userData.nunca = true; return m; });

  /* ---------------- etiquetas sobre el territorio ---------------- */
  const css = document.createElement('style'); css.textContent = `
.es-et{position:fixed;left:0;top:0;z-index:5;pointer-events:none;display:none;padding:6px 10px;border-radius:10px;font:400 11px/1.3 var(--ui-sans,Inter,system-ui,sans-serif);color:#eef1f2;white-space:nowrap;
  background:var(--ui-glass,rgba(14,16,20,.6));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));backdrop-filter:blur(14px) saturate(1.6);-webkit-backdrop-filter:blur(14px) saturate(1.6);font-variant-numeric:tabular-nums}
.es-et b{display:block;font-weight:600;font-size:11.5px}.es-et i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}.es-et em{font-style:normal;color:#e3ff86}
#esim{position:fixed;right:16px;bottom:86px;z-index:8;width:330px;max-height:calc(100vh - 470px);min-height:150px;display:flex;flex-direction:column;border-radius:18px;overflow:hidden;color:#e9ecee;
  font:400 12px/1.4 var(--ui-sans,Inter,system-ui,sans-serif);background:var(--ui-glass,rgba(14,16,20,.62));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:var(--ui-glass-sh,0 20px 40px rgba(0,0,0,.3));
  backdrop-filter:var(--ui-glass-fx,blur(24px) saturate(1.8));-webkit-backdrop-filter:var(--ui-glass-fx,blur(24px) saturate(1.8))}
#esim .cab{display:flex;align-items:center;gap:8px;padding:11px 12px 8px 14px}#esim .cab b{flex:1;font-weight:600;font-size:13px}
#esim .cab button{all:unset;cursor:pointer;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;color:#b3bbc0}#esim .cab button:hover{background:rgba(255,255,255,.08);color:#fff}
#esim .cab button:focus-visible,#esim .seg button:focus-visible,#esim .tl button:focus-visible{outline:2px solid #fff;outline-offset:1px}
#esim .seg{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:0 12px;padding:3px;border-radius:11px;background:rgba(0,0,0,.22)}
#esim .seg button{all:unset;cursor:pointer;text-align:center;padding:6px 4px;border-radius:8px;color:#b3bbc0;font-size:11px;line-height:1.2}#esim .seg button b{display:block;font-size:12px;color:#e9ecee;font-weight:600}
#esim .seg button[aria-pressed=true]{background:color-mix(in srgb,var(--c) 22%,transparent);box-shadow:inset 0 0 0 1px var(--c);color:#fff}
#esim .seg button b::before{content:"";display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:5px;background:var(--c)}
#esim .tl{display:flex;align-items:center;gap:8px;padding:10px 12px 6px}#esim .tl button{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#D5FF3F;color:#1a1208;font-size:12px;flex:none}
#esim .tl input{flex:1;accent-color:#D5FF3F;min-width:0}#esim .tl output{width:58px;text-align:right;font-variant-numeric:tabular-nums;color:#d5dadd;font-size:11px}
#esim .cuerpo{overflow:auto;padding:2px 12px 12px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}
#esim ul{list-style:none;margin:4px 0 8px;padding:0;display:grid;gap:4px}#esim li{display:grid;grid-template-columns:1fr auto;gap:0 8px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.04)}
#esim li span{color:#c3cace;font-size:11px}#esim li strong{font-weight:600;font-size:12.5px;text-align:right;font-variant-numeric:tabular-nums}#esim li small{grid-column:1/-1;color:#949da3;font-size:10.5px}
#esim li small em{font-style:normal;color:#e3ff86}
#esim details{margin-top:6px;border-top:1px solid rgba(255,255,255,.08);padding-top:6px}#esim summary{cursor:pointer;font-weight:600;font-size:11.5px;padding:4px 0;color:#dfe4e6}
#esim label{display:grid;grid-template-columns:1fr auto;gap:2px 8px;margin:7px 0;font-size:11px;color:#c3cace}#esim label output{color:#fff;font-variant-numeric:tabular-nums}
#esim label input[type=range]{grid-column:1/-1;width:100%;accent-color:#D5FF3F}#esim .chk label{display:flex;gap:6px;align-items:center;margin:5px 0}#esim .chk input{accent-color:#D5FF3F}
#esim .nota{color:#8d969b;font-size:10.5px;margin:6px 0 0}#esim .ir{all:unset;cursor:pointer;display:block;text-align:center;margin-top:10px;padding:8px;border-radius:9px;background:rgba(255,255,255,.07);font-weight:500}
#esim .ir:hover{background:rgba(255,255,255,.12)}
#esim.min .cuerpo,#esim.min .exp{display:none}#esim.min{min-height:0}
#esim .exp{margin:0 14px 8px;font-size:11px;line-height:1.45;color:#c3cace}#esim .ley2 i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}
#esim li button{all:unset;cursor:pointer;grid-column:1/-1;justify-self:start;margin-top:4px;font-size:10.5px;font-weight:600;color:#e3ff86}#esim li button:hover{text-decoration:underline}#esim li button:focus-visible{outline:2px solid #fff;outline-offset:2px}
#esim .aviso{margin:6px 12px 0;padding:8px 10px;border-radius:10px;background:rgba(213,255,63,.14);border:1px solid rgba(213,255,63,.35);font-size:11px;line-height:1.4;color:#f3e3cc;display:flex;gap:8px;align-items:center}
#esim .aviso[hidden]{display:none}#esim .aviso span{flex:1}#esim .aviso button{all:unset;cursor:pointer;font-weight:600;color:#fff;padding:4px 8px;border-radius:7px;background:rgba(255,255,255,.12);white-space:nowrap}
#esim .tl .yr{font-size:10px;color:#949da3;display:block;text-align:right}
body.tb-abierto #esim{display:none}
#esim .mapa{margin:6px 12px 2px;padding:8px 10px 6px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.07)}
#esim .mapa h5{display:flex;flex-wrap:wrap;gap:2px 8px;justify-content:space-between;margin:0 0 4px;font:600 9.5px var(--ui-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:#cfd5d9}#esim .mapa h5 span{color:var(--c)}
#esim .mapa button{all:unset;cursor:pointer;box-sizing:border-box;display:grid;grid-template-columns:22px minmax(0,1fr);gap:8px;align-items:center;width:100%;padding:4px 2px;border-radius:7px;font-size:11px;line-height:1.35;color:#d5dadd}
#esim .mapa button:hover{background:rgba(255,255,255,.06)}#esim .mapa button:focus-visible{outline:2px solid #fff}#esim .mapa button b{color:#fff;font-weight:600}
#esim .mapa .sw{justify-self:center;display:block}#esim .mapa .sw.b{width:22px;border-radius:3px}#esim .mapa .sw.p{width:12px;height:12px;border-radius:50%;box-shadow:0 0 0 2px rgba(255,255,255,.7)}
#esim.min .mapa{display:block}
#esim .tl .vel{width:auto;min-width:34px;padding:0 6px;border-radius:15px;background:rgba(255,255,255,.1);color:#e9ecee;font-size:11px;font-weight:600;box-sizing:border-box}
#esim .tl output{width:76px}
#esim .vida{margin:2px 12px 0;padding:7px 10px;border-radius:10px;font-size:11.5px;line-height:1.4;background:rgba(255,255,255,.05);border-left:3px solid var(--c,#59a14f);color:#dfe4e6}
#esim .vida b{color:#fff;font-weight:600}#esim .vida small{display:block;color:#a7b0b5;font-size:10.5px}
#esim .vctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 12px 0;font-size:11px;color:#a7b0b5}
#esim .vctl>button{all:unset;cursor:pointer;padding:4px 9px;border-radius:8px;background:rgba(255,255,255,.08);color:#e9ecee;font-weight:500}#esim .vctl>button:hover{background:rgba(255,255,255,.14)}
#esim .vctl>button[data-eval]{background:rgba(213,255,63,.2);box-shadow:inset 0 0 0 1px rgba(213,255,63,.5)}
#esim .vctl .sem{display:inline-flex;align-items:center;gap:4px;margin-right:auto}#esim .vctl .sem button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;border-radius:6px;background:rgba(255,255,255,.08);color:#e9ecee}
#esim .vctl .sem b{min-width:18px;text-align:center;color:#fff;font-variant-numeric:tabular-nums}
#esim .vctl button:focus-visible{outline:2px solid #fff;outline-offset:1px}
#esim .como{margin:6px 12px 0;padding:8px 10px;border-radius:10px;background:rgba(0,0,0,.25);font-size:11px;line-height:1.45;color:#c3cace}#esim .como[hidden]{display:none}#esim .como ol{margin:0;padding-left:16px}#esim .como li{margin:2px 0}
#esim .reglas .rg{display:grid;grid-template-columns:1fr auto;gap:1px 8px;padding:5px 8px;margin:3px 0;border-radius:8px;background:rgba(255,255,255,.04);font-size:11px;color:#c3cace}
#esim .reglas .rg b{color:#fff;font-weight:600}#esim .reglas .rg strong{font-weight:600;text-align:right;font-variant-numeric:tabular-nums}#esim .reglas .rg small{grid-column:1/-1;color:#8d969b;font-size:10.5px}
#esim .reglas .rg i{grid-column:1/-1;display:block;height:3px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}#esim .reglas .rg i u{display:block;height:100%;background:#ff8a80}
#esim .reglas .rg.ok strong{color:#8fd18a}#esim .reglas .rg.cerca strong{color:#e3ff86}#esim .reglas .rg.mal strong{color:#ff8a80}
#esim .reglas canvas{display:block;width:100%;height:56px;margin:6px 0 2px}
#esim .senales{font-size:11px;color:#c3cace}#esim .senales p{margin:3px 0}#esim .senales b{color:#fff;font-weight:600}
#esim.min .vctl,#esim.min .como{display:none}
@media (max-width:760px){#esim:not(.min){overflow-y:auto;max-height:56vh!important}#esim:not(.min)>*{flex-shrink:0}#esim:not(.min) .cuerpo{overflow:visible}#esim .exp.ley2{display:none}}
@media (max-width:760px){#esim{left:8px;right:8px;width:auto;top:146px;bottom:auto;max-height:40vh}#esim .cab{padding:8px 10px 6px 12px}}`;
  document.head.appendChild(css);
  const chip = (html) => { const d = document.createElement('div'); d.className = 'es-et'; d.innerHTML = html; document.body.appendChild(d); return d; };
  const ET = { via: chip(''), cora: chip(''), hum: chip(''), bav: chip(''), comp: chip(''), dj: chip('') };
  const POS = { via: () => { const m = T3.alivio && T3.alivio.mid; return m ? [m[0], 20, m[1]] : [0, -999, 0]; }, cora: () => [CORA[0], 40, CORA[1]], hum: () => [BURRO[0], 30, BURRO[1]], bav: () => [BAV[0], 70, BAV[1]], comp: () => { const e = esc(); return e === 'C' ? [BAVC()[0], 30, BAVC()[1]] : EST[0] ? [EST[0][0], 20, EST[0][1]] : [0, 0, 0]; }, dj: () => { const f = FUENTE[0] || [0, 0]; return [(f[0] * 2 + DJ[0]) / 3, 50, (f[1] * 2 + DJ[1]) / 3]; } };

  /* ---------------- panel ---------------- */
  const slider = (P, k, n, min, max, paso, f = (v) => fmt(v)) => `<label>${n}<output data-o="${k}">${f(P[k])}</output><input type="range" data-g="${P === P1 ? 1 : P === P2 ? 2 : 3}" data-k="${k}" min="${min}" max="${max}" step="${paso}" value="${P[k]}"></label>`;
  const pct = (v) => fmt(v * 100) + ' %';
  const FMT = { alcance: pct, auto: pct, frac: pct, sust: pct, precio: (v) => '$' + fmt(v), zona: fmtK, reac: (v) => fmt(v, 2), arboles: (v) => fmt(v, 2), luz: (v) => fmt(v, 2), rec: (v) => fmt(v, 3), dist: (v) => fmt(v, 1), pares: (v) => fmt(v, 2) };
  const el = document.createElement('section'); el.id = 'esim'; el.setAttribute('aria-label', 'Escenarios de la simulación');
  el.innerHTML = `<div class="cab"><b>Escenarios · simulación sin fin</b><button type="button" data-guia aria-label="Cómo se usa" title="Cómo se usa">?</button><button type="button" data-min aria-label="Plegar" title="Plegar">–</button></div>
<p class="exp">Escoge un escenario y dale ▶: corre año tras año, sin final, con sequías, bloqueos y recortes que llegan al azar. Las reglas de colapso están fijas antes de correr: mira si la propuesta se sostiene y cuándo se cae.</p>
<p class="exp ley2"><i style="background:#8fd18a"></i>cada punto verde fijo en el mapa es una huerta abierta (se cierran si la red se cae)</p>
<div class="seg" role="group" aria-label="Escenario"><button type="button" data-e="A" style="--c:#8fb0c9"><b>A</b>Kennedy hoy</button><button type="button" data-e="B" style="--c:#b07aa1"><b>B</b>Nodo central</button><button type="button" data-e="C" style="--c:#D5FF3F"><b>C</b>Clúster rotativo</button></div>
<div class="tl"><button type="button" data-play aria-label="Correr o pausar">▶</button><button type="button" class="vel" data-vel aria-label="Velocidad" title="Velocidad">×1</button><input type="range" min="0" max="${SEM - 1}" value="${Math.floor(SIMST.t)}" data-t aria-label="Semana de la simulación"><output data-año></output></div>
<div class="vida" data-vida aria-live="polite"></div>
<div class="vctl"><span class="sem">Semilla<button type="button" data-sd="-1" aria-label="Semilla anterior">‹</button><b data-seed>${VIDA.seed}</b><button type="button" data-sd="1" aria-label="Semilla siguiente">›</button></span><button type="button" data-eval>Evaluar 30 corridas</button><button type="button" data-como aria-expanded="false">Cómo funciona</button></div>
<div class="como" data-como-txt hidden><ol>
<li>Cada semana el estado nuevo sale solo del estado anterior (hogares con huerta, promotores, compost, humedal), como en el juego de la vida. No hay año final.</li>
<li>Las sequías, bloqueos, picos de precio, pérdida de lotes, recortes del programa y daños al humedal llegan al azar con probabilidades fijas, declaradas en «Evaluar».</li>
<li>El azar sale de una semilla: la misma semilla da siempre la misma historia, y A, B y C viven los mismos eventos.</li>
<li>Las 5 reglas de colapso (abajo) se fijaron antes de correr y no cambian. Empiezan a contar en el año 3, cuando la propuesta ya está montada.</li>
<li>Funciona si ninguna regla se cumple y se recupera tras cada golpe; está en riesgo si un indicador está cerca del límite; colapsa cuando una regla se cumple las semanas seguidas que dice.</li>
<li>Una corrida sola no prueba nada: «Evaluar» corre 30 semillas fijas por 100 años y muestra todas, también las que colapsan, comparadas con Kennedy hoy.</li>
<li>Si mueves un control, la corrida vuelve a empezar con la misma semilla y avanza rápido hasta el año en que ibas.</li></ol></div>
<div class="mapa" data-mapa aria-live="polite"></div><div class="aviso" data-aviso hidden></div><div class="cuerpo">
<details class="reglas" open><summary>Reglas de colapso · fijas antes de correr</summary><div data-reglas></div><canvas data-spark height="56" aria-label="Hogares con huerta a lo largo de la corrida" role="img"></canvas><div class="senales" data-senales></div></details>
<ul data-kpi></ul>
<details><summary>Comida · huertas y Corabastos (SIM-01)</summary>
${slider(P1, 'rend', 'Rendimiento (kg/m²·año)', 1, 12, 1)}${slider(P1, 'alcance', 'Alcance sobre lotes y techos', 0.1, 1, 0.05, pct)}${slider(P1, 'auto', 'Autoconsumo', 0.1, 0.7, 0.05, pct)}
${slider(P1, 'precio', 'Precio de excedentes ($/kg)', 1500, 4500, 100, FMT.precio)}${slider(P1, 'acopio', 'Capacidad de acopio (kg/semana)', 2000, 40000, 1000)}${slider(P1, 'reac', 'Reacción de precio de la central', 0, 1, 0.05, FMT.reac)}
${slider(P1, 'cupos', 'Cupos de formación en Bavaria (por trimestre)', 0, 40, 1)}${slider(P1, 'retardo', 'Retardo de aprendizaje (semanas)', 2, 40, 1)}${slider(P1, 'c', 'm² por promotor', 400, 3000, 100)}
${slider(P1, 'rotacion', 'Periodo de rotación (semanas)', 4, 52, 1)}${slider(P1, 'mu', 'Capacidad de decisión central (solicitudes/semana)', 1, 20, 1)}${slider(P1, 'zona', 'Población de la zona de servicio', 10000, 300000, 5000, fmtK)}
${slider(P1, 'sup', 'Huertas de la propuesta: parques, techos y Bavaria (m²)', 0, 200000, 5000, fmtK)}${slider(P1, 'regional', 'Compras directas a productores de la región', 0, 0.8, 0.05, pct)}
${slider(P1, 'pares', 'Formación entre vecinos en C (promotores por 10.000 hogares por semana)', 0, 6, 0.25, FMT.pares)}
<div class="chk">${[['sequia', 'Sequía forzada (años 3-4)'], ['bloqueo', 'Bloqueo forzado del mayorista (año 6)'], ['crece', 'Crecimiento poblacional'], ['baldios', 'Revocación forzada de baldíos (año 6)']].map(([k, n]) => `<label><input type="checkbox" data-b="${k}" ${P1[k] ? 'checked' : ''}>${n}</label>`).join('')}</div>
<p class="nota">Los estreses forzados se suman a los que llegan al azar y afectan a los tres escenarios por igual. [SUP] Las compras directas a productores de la región (acopio de Bavaria y mercados de barrio) también bajan la dependencia de Corabastos. [SUP] «Formación entre vecinos» es la hipótesis del clúster rotativo: bájala para ver desde dónde C deja de sostenerse.</p></details>
<details><summary>Residuos orgánicos y compost (SIM-02)</summary>
${slider(P2, 'frac', 'Fracción desviada', 0.05, 0.9, 0.05, pct)}${slider(P2, 'cap', 'Capacidad de la estación (kg/semana)', 1000, 30000, 500)}${slider(P2, 'mad', 'Semanas de maduración', 4, 24, 1)}
${slider(P2, 'sust', 'Fracción de sustrato al distrito (hongos)', 0, 0.6, 0.05, pct)}${slider(P2, 'dist', 'Distancia estación – huertas (km)', 0.2, 6, 0.1, FMT.dist)}
<p class="nota">B: estaciones de compostaje en los barrios. C: todo va a la planta de Bavaria Común.</p></details>
<details><summary>Aves y humedal (SIM-03)</summary>
${slider(P3, 'disp', 'Alcance de dispersión de las aves (m)', 100, 1500, 50)}${slider(P3, 'borde', 'Huertas en el borde del humedal', 0, 60, 1)}${slider(P3, 'arboles', 'Densidad de árboles', 0, 1, 0.05, FMT.arboles)}
${slider(P3, 'luz', 'Intensidad de luz y vidrio', 0, 1, 0.05, FMT.luz)}${slider(P3, 'rec', 'Tasa de recuperación del humedal', 0, 0.1, 0.005, FMT.rec)}
<div class="chk"><label><input type="checkbox" data-anti ${P3.anti ? 'checked' : ''}>Medida antitrampa</label></div>
<p class="nota">B: huertas sin criterio de ubicación. C: huertas con corredores entre parches.</p></details>
<button type="button" class="ir" data-tab>Ver todas las gráficas en el tablero</button></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  if (MOV) { el.classList.add('min'); $('[data-min]').textContent = '+'; } // en el celular empieza plegado (solo escenario y tiempo)

  /* ---------------- «ver en el mapa»: vuela al lugar donde cambia y prende la capa que lo muestra ---------------- */
  const volar = (c, alto, atras = 0.55) => { if (!T3.orbit) return; const o = T3.orbit, p0 = T3.camera.position.clone(), t0 = o.target.clone(), p1 = new THREE.Vector3(c[0] + alto * 0.2, alto, c[1] + alto * atras), t1 = new THREE.Vector3(c[0], 0, c[1]), ini = performance.now();
    const f = () => { const k = Math.min(1, (performance.now() - ini) / 1500), e2 = k * k * (3 - 2 * k); T3.camera.position.lerpVectors(p0, p1, e2); o.target.lerpVectors(t0, t1, e2); o.update(); if (k < 1) requestAnimationFrame(f); }; f(); };
  // vista general al escoger un escenario: la Av. Ciudad de Cali, Corabastos, El Burro y Bavaria en un solo cuadro (usa el vuelo del simulador, T3.anim)
  const vistaGeneral = () => { if (!T3.orbit) return; const m = (T3.alivio && T3.alivio.mid) || [1700, 400], P = [BURRO, BAV, CORA, m], xs = P.map(p => p[0]), zs = P.map(p => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2 + (MOV ? 0 : 250), cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const alto = 2250, c1 = new THREE.Vector3(cx, 0, cz), p1 = new THREE.Vector3(cx + alto * 0.12, alto, cz + alto * 0.45);
    T3.anim = { t: 0, dur: 2.2, p0: T3.camera.position.clone(), c0: T3.orbit.target.clone(), p1, c1 }; };
  const capaFlujo = (on) => { const b = document.querySelector(`#gs-fc button[data-v="${on ? '1' : ''}"]`); if (b && !b.classList.contains('on')) b.click(); };
  const LUGAR = {
    huertas: { n: 'las huertas que se abren desde Bavaria', ir: () => { capaFlujo(false); volar([3500, 300], 1500, 0.7); } },
    trafico: { n: 'el tráfico de la Av. Ciudad de Cali y Corabastos (capa de flujo de carros)', ir: () => { capaFlujo(true); volar(CORA, 1500, 0.6); } },
    compost: { n: 'el camino de los residuos orgánicos', ir: () => { capaFlujo(false); const e = esc(); volar(e === 'C' ? BAVC() : (EST[0] || BAV), e === 'C' ? 500 : 700, 0.6); } },
    parches: { n: 'los parches de árboles nativos', ir: () => { capaFlujo(false); const P = (T3.bio && T3.bio.PARCHES) || []; const c = P.length ? [P.reduce((s, p) => s + p.cx, 0) / P.length, P.reduce((s, p) => s + p.cz, 0) / P.length] : [3000, 300]; volar(c, 1300, 0.6); } },
    humedal: { n: 'las aves y el estado del Humedal El Burro', ir: () => { capaFlujo(false); volar(BURRO, 750, 0.6); } },
    vaca: { n: 'el Humedal La Vaca, que crece y gana árboles año a año', ir: () => { capaFlujo(false); if (VACA) VACA.ver(); else volar([760, 1160], 650, 0.6); } }
  };
  // Humedal La Vaca: se recupera a lo largo de los 10 años (data3d/humedal_vaca.js)
  let VACA = null;
  import('./humedal_vaca.js?v=1').then(m => m.iniciarHumedalVaca({ T3, cj })).then(v => { VACA = v; window.KEN_VACA = v; aplicar(); }).catch(e => console.warn('La Vaca:', e));
  const GRUPO = { 1: ['huertas', 'trafico'], 2: ['compost'], 3: ['humedal'] };
  let tAviso = 0;
  const avisar2 = (txt, lugar) => { const d = $('[data-aviso]'); d.hidden = false; d.innerHTML = `<span>${txt}: mira ${LUGAR[lugar].n}.</span><button type="button" data-ir="${lugar}">Ver en el mapa</button>`; clearTimeout(tAviso); tAviso = setTimeout(() => { d.hidden = true; }, 9000); };

  /* ---------------- aplicar al territorio ---------------- */
  let ultHB = -1, ultAb = null;
  function aplicar() {
    // la simulación sin fin: el estado vivo se lleva hasta la semana que se mira (si se mira atrás, se repite desde el año 0 con la misma semilla)
    const t = Math.max(0, Math.floor(SIMST.t)); if (!VIDA.S || VIDA.S.A.t !== t) avanzarA(t);
    const e = esc(), sv = VIDA.S[e], o = sv.o, oA = VIDA.S.A.o;
    // SIM-01 · huertas abiertas y Corabastos (si la red colapsa, los hogares bajan y las huertas se cierran)
    const f = e === 'A' ? 0 : o.act / NC; let ab = null;
    const HBAR = window.KEN_HBAR; if (HBAR && HBAR.fraccion && Math.abs(f - ultHB) > 0.004) { ab = HBAR.fraccion(f); ultHB = f; } if (ab) ultAb = ab; else ab = ultAb;
    /* la red crece año a año: las huertas en cubiertas se abren y la fauna de las huertas llega en la misma proporción (al año 10, todas):
       las relaciones bióticas suben de a poco hasta llegar a muchas */
    { const g = e === 'A' ? 0 : Math.max(0.03, Math.min(1, f / (REF[e] || 1) * (P1.alcance / ALC0))); // «Alcance sobre lotes y techos»: cuántas cubiertas tienen huerta
      const HI = window.KEN_HIDRO; if (HI && HI.fraccion) HI.fraccion(g);
      const BIo = T3.bio && T3.bio.ESTADO; if (BIo) BIo.proFrac = g; }
    { const vis = e === 'A' ? 0 : f; if (Math.abs(vis - fMarcas) > 0.002 || e === 'A') { fMarcas = vis; MK.forEach((m, i) => { mO[i] = e === 'A' ? 0 : (m[3] === 'par' ? (m[4] < vis ? 1 : 0) : m[3] === 'lote' ? (vis > 0.06 ? 1 : 0) : 1); }); gm.attributes.on.needsUpdate = true; } }
    const dep = o.dep, al = T3.alivio; if (al) { al.KEEP = e === 'A' ? 1 : 0.3 + 0.7 * dep; al.KEEP_CAM = e === 'A' ? 1 : 0.1 + 0.9 * dep; }
    kTr = e === 'A' ? 1 : 0.3 + 0.7 * dep; UB.uC.value.copy(colorTr(kTr)); // franja de tráfico de la Av. Ciudad de Cali
    aCor.material.color.set(dep > 0.66 ? '#e15759' : dep > 0.33 ? '#f28e2b' : '#59a14f');
    if (via) { const k2 = e === 'A' ? 1 : Math.max(0, Math.min(1, (dep - 0.2) / 0.8)); via.material.color.setRGB(0.35 + 0.53 * k2, 0.63 - 0.29 * k2, 0.31 + 0.04 * k2); } aCor.material.opacity = 0.35 + 0.4 * dep;
    // SIM-02 · orgánicos
    const gen = o.gen, rel = o.relleno / gen, des = o.desv / gen;
    { const bc = BAVC(); cPos[(CP.length - 1) * 3] = bc[0]; cPos[(CP.length - 1) * 3 + 2] = bc[1]; gc.attributes.position.needsUpdate = true;
      const vivo = Math.max(0.08, Math.min(1, des / Math.max(0.01, P2.frac * 0.15))); // [SUP] el círculo de compost se apaga si casi no entra nada (programa cortado o planta caída)
      CP.forEach((c, i) => { cOn[i] = (e === 'B' ? (i < CP.length - 1 ? 1 : 0) : e === 'C' ? (i === CP.length - 1 ? 1 : 0) : 0) * vivo; }); gc.attributes.on.needsUpdate = true; }
    ESTM.forEach(s => { s.g.visible = e === 'B'; const oc = o.ocup; s.pilas.forEach((p, i) => { p.scale.set(1.4, Math.max(0.05, Math.min(1.6, oc * 1.4 - i * 0.25)), 1); p.material.color.set(oc > 1 ? '#5a2a1f' : '#3b2b1f'); }); });
    const nRel = Math.round(NP * Math.min(1, rel) * 0.6), nDes = Math.round(NP * Math.min(1, des) * 1.6);
    PART.forEach((p, i) => { if (i < nRel) { p.r = 'rell'; p.on = true; } else if (i < nRel + nDes && e !== 'A') { p.r = e === 'B' ? 'est' : 'bav'; p.on = true; } else p.on = false;
      const c = COLR[p.r]; PC.set([c.r, c.g, c.b], i * 3); });
    gp.attributes.color.needsUpdate = true;
    // SIM-03 · aves, humedal y trampas
    const BI = T3.bio && T3.bio.ESTADO; if (BI) BI.fauna = Math.max(0.12, Math.min(1, o.aves / 1400));
    const hum = o.hum / 100; aHum.material.color.setRGB(0.88 - 0.55 * hum, 0.35 + 0.45 * hum, 0.3); aHum.material.opacity = 0.4 + 0.3 * hum;
    const nTr = e === 'A' || P3.anti ? 0 : Math.round(TR.length * Math.min(1, P3.borde / 40) * P3.luz * 1.6); TR.forEach((m) => { m.visible = false; });
    // La Vaca sigue su recuperación de 10 años; [SUP] si el humedal cae bajo el límite de colapso (27 %), su avance retrocede
    if (VACA) VACA.aplicar(Math.round(Math.min(SEM - 1, t) * Math.max(0, Math.min(1, (o.hum - 15) / 12))), e, P3);
    // aviso cuando la corrida que se ve colapsa (una vez por escenario y semilla)
    if (sv.colapso && !VIDA.avisado[e] && t >= sv.colapso.t) { VIDA.avisado[e] = true; avisar2(`Colapsó en el año ${fmt(sv.colapso.t / AÑO + 1)} por ${sv.colapso.causas.map(k => NREG[k]).join(', ')}. La simulación sigue`, sv.colapso.causas.includes('humedal') && sv.colapso.causas.length === 1 ? 'humedal' : sv.colapso.causas.includes('residuos') && sv.colapso.causas.length === 1 ? 'compost' : 'huertas'); }
    // los paneles (etiquetas, «lo que ves en el mapa», indicadores) se repintan aparte y, durante la reproducción, a ~4 Hz
    CTX = { e, t, o, oA, sv, dep, hum, ab, al, nTr }; sucioPan = true;
    if (!enPaso) pintarPanel();
  }
  let CTX = null, sucioPan = false, enPaso = false, tPan = 0;
  function pintarPanel() {
    if (!CTX) return; sucioPan = false; tPan = performance.now();
    const { e, t, o, oA, sv, dep, hum, ab, al, nTr } = CTX;
    // etiquetas
    const año = Math.floor(t / AÑO) + 1, dg = diagnostico(sv);
    ET.cora.innerHTML = `<b><i style="background:${aCor.material.color.getStyle()}"></i>Corabastos</b>Dependencia ${fmt(dep * 100)} %${e === 'A' ? '' : ` · <em>vías ${al && al.hoy > 0.5 ? '−' + fmt((1 - al.pro / al.hoy) * 100) + ' % carros' : 'con menos carros'}</em>`}`;
    ET.hum.innerHTML = `<b><i style="background:${aHum.material.color.getStyle()}"></i>Humedal El Burro</b>Integridad ${fmt(hum * 100)} % · ${fmt(o.aves)} aves${nTr ? ` · <em style="color:#ff8a80">${nTr} huertas-trampa</em>` : ''}`;
    ET.bav.innerHTML = e === 'A' ? `<b><i style="background:#9aa1a6"></i>Bavaria</b>Sin intervención` : `<b><i style="background:${dg.estado === 'colapso' ? '#ff8a80' : '#D5FF3F'}"></i>Bavaria Común</b>${fmt(o.prom)} promotores activos · ${fmt(o.act)} hogares con huerta${dg.estado === 'colapso' ? `<br><em style="color:#ff8a80">la red colapsó en el año ${fmt(sv.colapso.t / AÑO + 1)}</em>` : o.prog ? '' : '<br><em>programa de formación cortado</em>'}`;
    ET.comp.innerHTML = e === 'B' ? `<b><i style="background:#c8a26a"></i>Estaciones de compost (${EST.length})</b>Ocupación ${fmt(o.ocup * 100)} %` : e === 'C' ? `<b><i style="background:#D5FF3F"></i>Planta de compost · Bavaria</b>${fmt(o.desv / 1000, 1)} t/semana · ${fmt(o.hongos)} kg de hongos` : '';
    ET.dj.innerHTML = `<b><i style="background:#9aa1a6"></i>Al relleno Doña Juana</b>${fmt(o.relleno / 1000, 1)} t/semana · ${fmtK(o.km)} km de camión`;
    const pctTr = Math.round(kTr * 100), cTr = colorTr(kTr).getStyle();
    ET.via.innerHTML = `<b><i style="background:${cTr}"></i>Av. Ciudad de Cali · tráfico ${nivelTr(kTr)}</b>${e === 'A' ? 'como hoy: todo el abastecimiento pasa hacia Corabastos' : `<em>${pctTr} % de los vehículos de hoy</em> (−${100 - pctTr} %)`}`;
    // «lo que ves en el mapa»: cada cosa que cambia, con su color, su número y un botón para ir
    { const nH = ab ? ab.abiertas : (e === 'A' ? 0 : null), COLE = { A: '#8fb0c9', B: '#b07aa1', C: '#D5FF3F' }, NE = { A: 'Kennedy hoy', B: 'Nodo central', C: 'Clúster rotativo' };
      $('[data-mapa]').innerHTML = `<h5 style="--c:${COLE[e]}">Lo que ves en el mapa<span>${e} · ${NE[e]}</span></h5>
      <button type="button" data-ir="trafico"><i class="sw b" style="height:${(4 + 6 * kTr).toFixed(0)}px;background:${cTr}"></i><span>Franja sobre la <b>Av. Ciudad de Cali</b>: tráfico <b>${nivelTr(kTr)}</b> · ${e === 'A' ? '100 % (hoy)' : `${pctTr} % del de hoy`}</span></button>
      <button type="button" data-ir="huertas"><i class="sw p" style="background:#6fcf6a"></i><span>${e === 'A' ? '<b>Sin huertas nuevas</b>: solo las que ya hay en casas' : `Puntos verdes: <b>${nH != null ? fmt(nH) : '…'} huertas abiertas</b> · ${fmt(o.act)} hogares`}</span></button>
      ${e === 'A' ? '' : (() => { const KP = window.KEN_PARCHES; return `<button type="button" data-ir="parches"><i class="sw p" style="background:#1f6b38"></i><span>Puntos verde oscuro: <b>${KP ? KP.parches + ' parches de árboles nativos' : 'parches de árboles nativos'}</b>${KP ? ` · ${fmt(KP.n)} árboles (caucho sabanero, aliso, sauco, chicalá…)` : ''}</span></button>`; })()}
      <button type="button" data-ir="compost"><i class="sw p" style="background:${e === 'A' ? '#9aa1a6' : '#b8875a'}"></i><span>${e === 'A' ? `<b>Sin compostaje</b>: ${fmt(o.relleno / 1000, 1)} t/semana van en camión a Doña Juana` : e === 'B' ? `Círculos café: <b>${EST.length} estaciones de compost</b> de barrio · ${fmt(o.pct2, 0)} % vuelve a la tierra` : `Círculo café: <b>1 planta de compost</b> en Bavaria · ${fmt(o.pct2, 0)} % vuelve a la tierra`}</span></button>
      ${VACA && VACA.ESTADO.on ? (() => { const V = VACA.ESTADO; return `<button type="button" data-ir="vaca"><i class="sw p" style="background:#8fd18a"></i><span><b>Humedal La Vaca se recupera</b>: +${fmt(V.ha, 1)} ha de humedal · ${fmt(V.arboles)} árboles nativos (${fmt(V.grandes)} grandes) · ${V.especies} especies de aves</span></button>`; })() : ''}
      <button type="button" data-ir="humedal"><i class="sw p" style="background:#7fb3d5"></i><span>Pájaros en el humedal El Burro: <b>${fmt(o.aves)} aves</b>${e === 'A' ? '' : ` (${o.aves >= oA.aves ? '+' : '−'}${fmt(Math.abs(o.aves - oA.aves))} frente a hoy)`}</span></button>`; }
    // panel
    const inp = $('[data-t]'); inp.max = Math.max(SEM - 1, VIDA.maxT); inp.value = t;
    $('[data-año]').innerHTML = `${2026 + año}<span class="yr">año ${año} · sem ${t % AÑO + 1}</span>`;
    pintarVida(e, t, sv, dg);
    const d = (v, a, menos, f2) => { if (e === 'A' || !isFinite(a) || Math.abs(v - a) < 1e-9) return ''; const mej = menos ? v < a : v > a; return ` · <em style="color:${mej ? '#8fd18a' : '#ff8a80'}">${v >= a ? '+' : '−'}${f2(Math.abs(v - a))} frente a hoy</em>`; };
    $('[data-kpi]').innerHTML = [
      ['Hogares con huerta', fmt(o.act), `huertas abiertas en el mapa${ab ? `: ${ab.abiertas} de ${ab.total}` : ''}${d(o.act, oA.act, false, fmt)}`],
      ['Personas que comen de las huertas', fmtK(o.pers), `${fmt(o.pct, 1)} % de Kennedy${d(o.pers, oA.pers, false, fmtK)}`],
      ['Dependencia de Corabastos', fmt(dep * 100) + ' %', `menos tráfico en la Av. Ciudad de Cali${d(dep * 100, oA.dep * 100, true, (v) => fmt(v) + ' pts')}`],
      ['Orgánicos que vuelven a la tierra', fmt(o.pct2, 1) + ' %', `${fmt(o.relleno / 1000, 1)} t/semana siguen al relleno${d(o.pct2, oA.pct2, false, (v) => fmt(v, 1) + ' pts')}`],
      ['Aves en el borde del humedal', fmt(o.aves), `integridad del humedal ${fmt(hum * 100)} %${d(o.aves, oA.aves, false, fmt)}`]
    ].map(([n, v, s2], i) => `<li><span>${n}</span><strong>${v}</strong><small>${s2}</small><button type="button" data-ir="${['huertas', 'huertas', 'trafico', 'compost', 'humedal'][i]}">Ver en el mapa →</button></li>`).join('');
    el.querySelectorAll('.seg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.e === e)));
  }

  /* ---------------- estado de la corrida: funcionando / en riesgo / colapsó, reglas y señales de que funciona ---------------- */
  const VT = { huertas: (v) => fmt(v) + ' hogares', corabastos: (v) => fmt(v, 1) + ' %', residuos: (v) => fmt(v, 1) + ' % al relleno', humedal: (v) => fmt(v, 1) + ' %', red: (v) => fmt(v) + ' promotores' };
  const UT = { huertas: '500 hogares', corabastos: '97 %', residuos: '97 % o compost desbordado', humedal: '27 %', red: '1 promotor' };
  const QUE = { huertas: 'se van cerrando las huertas', corabastos: 'vuelve el tráfico hacia Corabastos', residuos: 'el compost se apaga y los orgánicos vuelven al relleno', humedal: 'el humedal pierde integridad y aves', red: 'sin promotores, las huertas se van cerrando' };
  const LETRA = { A: 'A · Kennedy hoy', B: 'B · Nodo central', C: 'C · Clúster rotativo' };
  const añoDe = (w) => fmt(Math.floor(w / AÑO) + 1);
  function pintarVida(e, t, sv, dg) {
    const o = sv.o, box = $('[data-vida]'); let c, h;
    if (dg.estado === 'colapso') { c = '#ff8a80'; h = `<b>${LETRA[e]} · colapsó en el año ${añoDe(sv.colapso.t)}</b> por ${sv.colapso.causas.map(k => NREG[k]).join(', ')}.<small>La simulación sigue corriendo: en el mapa ${sv.colapso.causas.map(k => QUE[k]).join(', ')}.</small>`; }
    else if (dg.antes) { c = '#8fb0c9'; h = `<b>${LETRA[e]} · montaje, año ${añoDe(t)} de 3</b><small>Las reglas de colapso empiezan a contar en el año 3, cuando la propuesta ya está montada.</small>`; }
    else if (dg.estado === 'riesgo') { const rs = dg.riesgos.slice().sort((a, b) => (b.racha / b.R.sem) - (a.racha / a.R.sem)), r = rs[0]; c = '#e3ff86';
      h = `<b>${LETRA[e]} · en riesgo: ${r.R.n.toLowerCase()}</b> ${VT[r.R.k](r.v)} (límite ${UT[r.R.k]})<small>${r.racha ? `lleva ${r.racha} de ${r.R.sem} semanas seguidas: colapsa en ${r.faltan} semanas si no se recupera` : 'cerca del límite, todavía sin cumplir la regla'}${rs.length > 1 ? ` · también cerca: ${rs.slice(1).map(x => x.R.n.toLowerCase()).join(', ')}` : ''}</small>`; }
    else { c = '#59a14f'; const tr = tendencia(sv); h = `<b>${LETRA[e]} · funcionando, año ${añoDe(t)}</b><small>Ninguna regla de colapso se cumple${tr ? ` · hogares con huerta ${tr.pctAño >= 0 ? '+' : '−'}${fmt(Math.abs(tr.pctAño), 1)} %/año` : ''}.</small>`; }
    box.style.setProperty('--c', c); box.innerHTML = h;
    const det = $('details.reglas'); if (!det) return; { const cu = $('.cuerpo'); if (cu && cu.firstElementChild !== det) cu.prepend(det); } // las reglas van arriba de la tabla de indicadores
    if (!det.open || el.classList.contains('min')) return;
    $('[data-reglas]').innerHTML = REGLAS.map(R => { const v = R.val(o), r = sv.racha[R.k], cerca = dg.riesgos.some(x => x.R.k === R.k), cls = r > 0 || (sv.colapso && sv.colapso.causas.includes(R.k)) ? 'mal' : cerca ? 'cerca' : 'ok';
      return `<div class="rg ${cls}"><span><b>${R.n}</b></span><strong>${VT[R.k](v)}${R.k === 'residuos' && o.rech > 0.3 ? ' · desbordado' : ''}</strong><small>Colapsa si: ${R.txt}, ${R.sem} semanas seguidas${r ? ` · lleva ${r}` : ''}</small><i><u style="width:${Math.min(100, r / R.sem * 100).toFixed(0)}%"></u></i></div>`; }).join('');
    const tr = tendencia(sv), rc = sv.rec, L = [];
    if (tr) L.push(`Tendencia (últimos ${fmt(tr.años)} años): hogares con huerta <b>${tr.pctAño >= 0 ? '+' : '−'}${fmt(Math.abs(tr.pctAño), 1)} %/año</b> · ${Math.abs(tr.pctAño) < 1 ? 'estable' : tr.pctAño > 0 ? 'creciendo' : 'bajando'}`);
    if (rc.pend) L.push(`Recuperándose de <b>${NOMBRE_EV[rc.pend.k]}</b> (año ${añoDe(rc.pend.t0)}): lleva ${t - rc.pend.t0} semanas`);
    else if (rc.ult) L.push(`Tras ${NOMBRE_EV[rc.ult.k].toLowerCase()} del año ${añoDe(rc.ult.t0)}: ${rc.ult.sem != null ? `volvió a su nivel en <b>${rc.ult.sem} semanas</b>` : '<b>no volvió</b> a su nivel en 5 años'}`);
    if (rc.n) L.push(`Capacidad de recuperarse: <b>${fmt(rc.suma / rc.n)} semanas</b> en promedio (${rc.n} golpes${rc.fallidas ? `, ${rc.fallidas} sin recuperarse` : ''})`);
    if (e !== 'A') L.push(`Programa de formación en Bavaria: <b>${o.prog ? 'activo' : 'cortado'}</b> · ${fmt(o.prom)} promotores activos`);
    if (sv.log.length) L.push(`Últimos eventos: ${sv.log.slice(-4).reverse().map(x => `año ${añoDe(x.t)} · ${NOMBRE_EV[x.k].toLowerCase()}`).join('; ')}`);
    $('[data-senales]').innerHTML = L.map(x => `<p>${x}</p>`).join('');
    // gráfica corta: hogares con huerta en toda la corrida (historia submuestreada), con el umbral de 500 y el inicio de las reglas
    const cv = $('[data-spark]'), W = cv.clientWidth, Hh = 56; if (!W) return; const dpr = Math.min(2, devicePixelRatio || 1); cv.width = W * dpr; cv.height = Hh * dpr;
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hh); const H = sv.H, n = H.t.length; if (n < 2) return;
    let max = 600; for (const v of H.act) if (v > max) max = v; const tMax = Math.max(H.t[n - 1], AÑO * 10), X = (w) => 2 + (W - 4) * w / tMax, Yp = (v) => Hh - 10 - (Hh - 16) * v / max;
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(X(ARRANQUE), 4); g.lineTo(X(ARRANQUE), Hh - 10); g.stroke();
    g.strokeStyle = '#ff8a80'; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(2, Yp(500)); g.lineTo(W - 2, Yp(500)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = { A: '#8fb0c9', B: '#b07aa1', C: '#D5FF3F' }[e]; g.lineWidth = 1.8; g.beginPath(); for (let i = 0; i < n; i++) { const x = X(H.t[i]), y = Yp(H.act[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    if (sv.colapso) { const x = X(sv.colapso.t); g.strokeStyle = '#ff8a80'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 4); g.lineTo(x, Hh - 10); g.stroke(); }
    g.fillStyle = '#8d969b'; g.font = '9.5px system-ui, sans-serif'; g.textAlign = 'left'; g.fillText('hogares con huerta · umbral 500', 4, Hh - 1); g.textAlign = 'right'; g.fillText(`año ${añoDe(H.t[n - 1])}`, W - 3, Hh - 1);
  }

  /* ---------------- eventos ---------------- */
  let play = 0, prev = 0;
  const parar = () => { if (play) cancelAnimationFrame(play); play = 0; $('[data-play]').textContent = '▶'; };
  let tEnt = -1; // aplicar() solo cuando cambia el semana entera (los efectos dependen de Math.floor(SIMST.t)); a velocidad alta, una vez por cuadro
  const VEL = [1, 4, 16, 52]; // ×1 = 22 semanas por segundo (≈ 2,4 s por año); ×52 ≈ 22 años por segundo
  const paso = (now) => { const dt = Math.min(0.1, (now - prev) / 1000); prev = now; SIMST.t += dt * 22 * VEL[VIDA.vel]; // sin final: corre hasta que se pausa
    const ent = Math.floor(SIMST.t); if (ent !== tEnt) { tEnt = ent; enPaso = true; try { aplicar(); } finally { enPaso = false; } }
    play = requestAnimationFrame(paso); };
  const arrancar = () => { if (play) cancelAnimationFrame(play); prev = performance.now(); $('[data-play]').textContent = '❚❚'; play = requestAnimationFrame(paso); };
  // un cambio de parámetros: la corrida vuelve a empezar desde el año 0 con la misma semilla y avanza rápido hasta la semana en que iba
  const rehacer = () => { reiniciarVida(); avanzarA(Math.floor(SIMST.t)); };
  const ponerSemilla = (s, e) => { VIDA.seed = SIMST.semilla = Math.max(1, Math.min(999, s)); $('[data-seed]').textContent = VIDA.seed; VIDA.maxT = SEM - 1;
    if (e && e !== 'A') { SIMST.esc = e; avisar('mapa'); if (T3.escenario !== 'proyecto') document.querySelector('.sw button[data-e="proyecto"]')?.click(); }
    else if (e === 'A' && T3.escenario === 'proyecto') document.querySelector('.sw button[data-e="hoy"]')?.click();
    SIMST.t = 0; reiniciarVida(); aplicar(); arrancar(); };
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.ir) { LUGAR[b.dataset.ir].ir(); return; }
    if (b.dataset.guia !== undefined) { import('./guia.js?v=2').then(m => m.abrirGuia(true)); return; }
    if (b.dataset.min !== undefined) { el.classList.toggle('min'); b.textContent = el.classList.contains('min') ? '+' : '–'; pintarPanel(); return; }
    if (b.dataset.play !== undefined) { play ? parar() : arrancar(); return; }
    if (b.dataset.vel !== undefined) { VIDA.vel = (VIDA.vel + 1) % VEL.length; b.textContent = '×' + VEL[VIDA.vel]; return; }
    if (b.dataset.sd) { ponerSemilla(VIDA.seed + +b.dataset.sd); return; }
    if (b.dataset.como !== undefined) { const c = $('[data-como-txt]'); c.hidden = !c.hidden; b.setAttribute('aria-expanded', String(!c.hidden)); return; }
    if (b.dataset.eval !== undefined) { import('./vida_evaluar.js?v=2').then(m => m.abrirEvaluar({ PAR, esc: esc() === 'A' ? 'C' : esc(), verCorrida: (s, e) => ponerSemilla(s, e) })).catch(er => console.warn('evaluar:', er)); return; }
    if (b.dataset.tab !== undefined) { const t = document.getElementById('b-tablero'); if (t) t.click(); return; }
    if (b.dataset.e) { const e = b.dataset.e; setTimeout(vistaGeneral, 250); if (e === 'A') { if (T3.escenario === 'proyecto') document.querySelector('.sw button[data-e="hoy"]')?.click(); }
      else { SIMST.esc = e; avisar('mapa'); if (T3.escenario !== 'proyecto') document.querySelector('.sw button[data-e="proyecto"]')?.click(); }
      SIMST.t = 0; aplicar(); arrancar(); }
  });
  el.addEventListener('input', (ev) => { const i = ev.target;
    if (i.dataset.t !== undefined) { parar(); SIMST.t = +i.value; aplicar(); return; }
    if (i.dataset.k) { const P = i.dataset.g === '1' ? P1 : i.dataset.g === '2' ? P2 : P3; P[i.dataset.k] = +i.value;
      if (esc() === 'A') { SIMST.esc = SIMST.esc && SIMST.esc !== 'A' ? SIMST.esc : 'C'; document.querySelector('.sw button[data-e="proyecto"]')?.click(); } // en «Kennedy hoy» los sliders no cambian nada: se pasa a la propuesta
      // [SIN FIN] ya no salta al año 10: la corrida se rehace desde el año 0 con la misma semilla y avanza rápido hasta la semana en que iba (sigue corriendo si corría)
      if (SIMST.t < 1 && !play) SIMST.t = SEM - 1; // si estaba en la semana 0 y en pausa, se muestra el año 10 para que el cambio se vea
      setTimeout(() => dispatchEvent(new Event('cora-cambio')), 30); // los indicadores en 3D se recalculan con la nueva dependencia de Corabastos
      if (i.dataset.k === 'arboles' && window.KEN_PARCHES && window.KEN_PARCHES.densidad) window.KEN_PARCHES.densidad(Math.max(0.15, +i.value)); /* densidad de árboles: más o menos árboles en los parches */
      const o = el.querySelector(`output[data-o="${i.dataset.k}"]`); if (o) o.textContent = (FMT[i.dataset.k] || fmt)(+i.value); rehacer(); aplicar(); avisar('mapa');
      const lab = i.closest('label').firstChild.textContent.trim(); GRUPO[i.dataset.g].forEach((l, j) => { if (!j) avisar2(`Cambiaste «${lab}»`, i.dataset.g === '1' && /zona|regional|reac|precio/.test(i.dataset.k) ? 'trafico' : l); }); }
  });
  el.addEventListener('change', (ev) => { const i = ev.target;
    if (i.dataset.b) { P1[i.dataset.b] = i.checked; rehacer(); aplicar(); avisar('mapa'); avisar2(i.checked ? 'Activaste un estrés forzado' : 'Quitaste un estrés forzado', 'huertas'); }
    if (i.dataset.anti !== undefined) { P3.anti = i.checked; rehacer(); aplicar(); avisar('mapa'); avisar2(i.checked ? 'Con medida antitrampa' : 'Sin medida antitrampa', 'humedal'); } });
  el.addEventListener('toggle', (ev) => { if (ev.target.classList && ev.target.classList.contains('reglas') && ev.target.open) pintarPanel(); }, true);
  addEventListener('sim-cambio', (ev) => { if (ev.detail && ev.detail.origen === 'mapa') return; rehacer(); el.querySelectorAll('input[data-k]').forEach(i => { const P = i.dataset.g === '1' ? P1 : i.dataset.g === '2' ? P2 : P3; i.value = P[i.dataset.k]; }); aplicar(); });
  addEventListener('escenario', () => setTimeout(() => { SIMST.t = 0; ultHB = -1; aplicar(); arrancar(); }, 60));
  // la huerta de barrio carga después: se aplica cuando aparece
  const espera = setInterval(() => { if (window.KEN_HBAR && window.KEN_HBAR.fraccion) { clearInterval(espera); ultHB = -1; aplicar(); } }, 800);

  /* ---------------- cuadro: partículas y etiquetas ---------------- */
  const V = new THREE.Vector3();
  function cuadro(now) {
    requestAnimationFrame(cuadro);
    if (sucioPan && performance.now() - tPan > 250) pintarPanel(); // paneles a ~4 Hz
    const tt = RMQ ? 0 : now / 1000, e = esc();
    for (let i = 0; i < NP; i++) { const p = PART[i]; if (!p.on || !EST.length) { PP[i * 3 + 1] = -999; continue; }
      const rutas = RUTAS[p.r], cv = rutas[p.k % rutas.length]; const v = p.r === 'rell' ? 0.05 : 0.11; cv.getPoint((p.f + tt * v) % 1, V); PP[i * 3] = V.x; PP[i * 3 + 1] = V.y; PP[i * 3 + 2] = V.z; }
    gp.attributes.position.needsUpdate = true;
    { const y = T3.camera.position.y, lejos = Math.max(0, Math.min(1, (y - 120) / 260)), solo = T3.escSolo && T3.escSolo(); UM.uA.value = solo === 'bav' || solo === 'col' ? 0 : lejos; const lejos2 = Math.max(0, Math.min(1, (y - 70) / 200)), libre = !solo || solo === 'red';
      if (banda) { UB.uA.value = libre ? 0.25 + 0.75 * lejos2 : 0; UB.uW.value = Math.max(6, Math.min(60, y * 0.009)) * (0.2 + 1.1 * kTr); banda.visible = false; } /* sin franja sobre una sola vía: el cambio del tráfico se ve en toda la red con la capa «flujo de carros» (data3d/alivio_cali.js) */
      UC.uA.value = libre ? Math.max(0.4, lejos2) : 0; UC.uR.value = Math.min(2, devicePixelRatio || 1);
      { const ae = document.getElementById('alivio-et'); if (ae) ae.style.display = 'none'; const KC = window.KEN_CALI; if (KC && KC.cinta) KC.cinta.visible = false; } /* la franja y la etiqueta de aqui reemplazan las de alivio_cali.js */ UM.uPx.value = innerHeight * Math.min(2, devicePixelRatio || 1);
      if (via) via.visible = false; }
    const cam = T3.camera, W = innerWidth, H = innerHeight;
    for (const k in ET) { const d = ET[k]; if (!d.innerHTML || (k === 'comp' && e === 'A') || document.body.classList.contains('tb-abierto') || (T3.escSolo && T3.escSolo()) || cam.position.y < 140) { d.style.display = 'none'; continue; }
      const p = POS[k](); V.set(p[0], p[1], p[2]).project(cam); const ok = V.z < 1 && Math.abs(V.x) < 0.92 && Math.abs(V.y) < 0.9; d.style.display = ok ? 'block' : 'none';
      if (ok) d.style.transform = `translate(${((V.x + 1) / 2 * W).toFixed(1)}px,${((1 - V.y) / 2 * H).toFixed(1)}px) translate(-50%,-110%)`; }
  }
  requestAnimationFrame(cuadro);
  aplicar();
  setTimeout(() => import('./guia.js?v=2').then(m => m.abrirGuia(false)).catch(() => {}), 2500); // la primera vez: cómo se usa
  import('./mejora_tour.js?v=7').then(m => { T3.mejora = m.iniciarMejoraTour({ T3 }); }).catch(e => console.warn('recorrido:', e)); // «¿Cómo mejora Kennedy?»: antes y después en cada lugar
  import('./capas_escenario.js?v=6').then(m => m.iniciarCapasEscenario({ T3 })).catch(e => console.warn('capas:', e)); // sintaxis, ruido, usos e indicadores cambian con la propuesta
  // R = vista viva compatible (capas_escenario.js y mejora_tour.js la leen); vida = estado de la simulación sin fin (A, B, C con la semilla actual)
  return { aplicar, arrancar, parar, get R() { return RV; }, get vida() { return VIDA; }, semilla: (s, e) => ponerSemilla(s, e), get via() { return via; }, marcas, mO };
}
