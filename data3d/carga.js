/* ============ CAPA: ¿EL PROYECTO ALIVIA O DESPLAZA LA CARGA? (data3d/carga.json, tools/carga_build.js) ============
   Cintas sobre las calles: rojo = gana camiones con el proyecto (la carga que ya no va a Corabastos camino a los mercados de barrio),
   verde azulado = pierde camiones (borde de Corabastos). El ancho crece con los camiones por hora que cambian.
   Marcas: los 8 mercados de barrio y las salidas de la carga desde cada costado de Corabastos. */
export const COL_MAS = '#e0603a', COL_MENOS = '#4fb3a6';
export async function crearCapaCarga({ THREE, T3, lw }) {
  const D = await (window.cargarJSON || ((u) => fetch(u).then(r => r.json())))('data3d/carga.json?v=2');
  const grupo = new THREE.Group(); grupo.name = 'carga'; grupo.visible = false; T3.scene.add(grupo);
  const Y = () => (T3.viaY != null ? T3.viaY : 0.62) + 0.45;
  const P = [], C = [], I = [], cMas = new THREE.Color(COL_MAS), cMenos = new THREE.Color(COL_MENOS);
  for (const t of D.tramos) {
    const pts = t.p.map(p => lw(p[0], p[1])), w = 7 + Math.min(26, Math.abs(t.d) * 1.6), col = t.d > 0 ? cMas : cMenos, n = pts.length;
    const base = P.length / 3;
    for (let k = 0; k < n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const [x, z] = pts[k], y = Y() + (T3.alzaVia ? T3.alzaVia(x, z) : 0);
      P.push(x - dz * w / 2, y, z + dx * w / 2, x + dz * w / 2, y, z - dx * w / 2); for (let r = 0; r < 2; r++) C.push(col.r, col.g, col.b);
      if (k) { const o = base + (k - 1) * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  const cintas = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.88, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8, fog: false, toneMapped: false }));
  cintas.renderOrder = 6; cintas.frustumCulled = false; grupo.add(cintas);
  // marcas con nombre (letrero siempre de frente)
  const letrero = (txt, sub, col) => {
    const c = document.createElement('canvas'), x = c.getContext('2d'), dpr = 2; x.font = `600 ${15 * dpr}px Inter,system-ui,sans-serif`;
    const w = Math.ceil(Math.max(x.measureText(txt).width, sub ? x.measureText(sub).width * 0.8 : 0) + 30 * dpr), h = (sub ? 46 : 30) * dpr; c.width = w; c.height = h;
    x.fillStyle = 'rgba(13,15,18,.88)'; x.beginPath(); x.roundRect(0, 0, w, h, 8 * dpr); x.fill(); x.fillStyle = col; x.beginPath(); x.arc(13 * dpr, 15 * dpr, 4.5 * dpr, 0, 6.283); x.fill();
    x.font = `600 ${15 * dpr}px Inter,system-ui,sans-serif`; x.fillStyle = '#e9ebec'; x.textBaseline = 'middle'; x.fillText(txt, 24 * dpr, 15 * dpr);
    if (sub) { x.font = `400 ${12 * dpr}px Inter,system-ui,sans-serif`; x.fillStyle = '#9aa2a7'; x.fillText(sub, 24 * dpr, 33 * dpr); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false })); s.scale.set(w / h * 0.034, 0.034, 1); s.center.set(0, 0); s.renderOrder = 21; return s;
  };
  const poste = (x, z, alto, col) => { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute([x, Y(), z, x, Y() + alto, z], 3)); const l = new THREE.Line(gg, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthTest: false })); l.renderOrder = 20; grupo.add(l); };
  D.mercados.forEach(m => { const [x, z] = lw(m.p[0], m.p[1]); poste(x, z, 60, 0xe2a55b); const s = letrero(m.n, m.calle || 'tienda de barrio', '#D5FF3F'); s.position.set(x, Y() + 60, z); grupo.add(s); });
  D.salidas.forEach(o => { if (o.cam < 1) return; const [x, z] = lw(o.p[0], o.p[1]); poste(x, z, 40, 0xe0603a); const s = letrero(`Salida ${o.lado}`, `${String(o.cam).replace('.', ',')} camiones/h a los mercados`, COL_MAS); s.position.set(x, Y() + 40, z); grupo.add(s); });
  // encuadre: Corabastos y los mercados
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of D.mercados.map(m => m.p).concat(D.salidas.map(s => s.p))) { const [x, z] = lw(p[0], p[1]); x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const centro = [(x0 + x1) / 2, (z0 + z1) / 2], radio = Math.max(x1 - x0, z1 - z0) / 2;
  return { datos: D, ver(on) { grupo.visible = on; }, get visible() { return grupo.visible; }, centro, radio };
}
