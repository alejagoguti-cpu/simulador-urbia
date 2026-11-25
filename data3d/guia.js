/* ============ GUÍA DE BIENVENIDA: cómo se usa el simulador, paso a paso ============
   Sale sola la primera vez (se recuerda en este navegador) y con el botón «?» del panel de escenarios.
   Cada paso resalta la parte de la pantalla de la que habla. */
const PASOS = [
  { sel: null, t: 'Bienvenida al simulador de Kennedy', d: 'Aquí puedes ver Kennedy en 3D <b>hoy</b> y <b>con la propuesta</b>, y simular qué pasa en el territorio durante <b>10 años</b> si cambian las decisiones: cuántas huertas hay, cuánto se depende de Corabastos, a dónde van los residuos y cómo están las aves del humedal.<br><small style="color:#949da3">La base 3D, el marco del mundo y el modelo de agentes se armaron en <b>Unreal Engine 5</b> con Cesium (proyecto en unreal/Kennedy360).</small>' },
  { sel: '#esc .sw', t: '1 · Hoy o con la propuesta', d: 'Cambia entre <b>Kennedy hoy</b> y <b>Con la propuesta</b>. Con la propuesta aparecen las huertas, Bavaria Común y la red de mercados.' },
  { sel: '#esc-ley', t: '2 · Las estrategias', d: 'Cada ícono es una estrategia de la propuesta. Tócalo para verla sola en el mapa; tócalo otra vez para volver a verlas todas.' },
  { sel: '#esim .seg', t: '3 · Escoge un escenario', d: '<b>A</b> es Kennedy como está hoy. <b>B</b> y <b>C</b> son dos formas de hacer la propuesta (un centro que decide todo, o barrios que se turnan la decisión).' },
  { sel: '#esim .tl', t: '4 · Corre los 10 años', d: 'Dale <b>▶</b> o arrastra la barra: el mapa muestra cada año, de 2027 a 2036. Las huertas se van abriendo, el tráfico hacia Corabastos baja y cambian el compost y las aves.' },
  { sel: '#esim [data-kpi]', t: '5 · Mira los resultados en el mapa', d: 'Cada resultado tiene <b>Ver en el mapa</b>: te lleva al lugar donde cambia y prende la capa que lo muestra (por ejemplo, el flujo de carros).', abrir: true },
  { sel: '#esim details', t: '6 · Mueve las variables', d: 'Abre un grupo y mueve un slider (por ejemplo, <b>cupos de formación en Bavaria</b>). Todo se vuelve a calcular y el mapa cambia al instante; un aviso te dice dónde mirar.', abrir: true },
  { sel: '#gs-dial', sube: '.gs-pan', t: '7 · La hora del día no son los años', d: 'Este reloj solo mueve <b>un día cualquiera</b>: los carros y las personas según la hora. Los años de la propuesta se mueven en el panel de escenarios.' },
  { sel: '#b-tablero', t: '8 · Todas las gráficas', d: 'En el <b>Tablero</b> están las gráficas completas de las tres simulaciones, con las mismas variables.' }
];
let abierto = false;
export function abrirGuia(forzar) {
  try { if (!forzar && localStorage.getItem('ken-guia-v1')) return; } catch (e) {}
  if (abierto) return; abierto = true;
  if (!document.getElementById('guia-css')) { const st = document.createElement('style'); st.id = 'guia-css'; st.textContent = `
#guia-velo{position:fixed;inset:0;z-index:40;background:rgba(4,6,8,.35);pointer-events:auto}
#guia-hueco{position:fixed;z-index:41;border-radius:14px;box-shadow:0 0 0 9999px rgba(4,6,8,.55),0 0 0 2px #D5FF3F;pointer-events:none;transition:all .35s cubic-bezier(.2,.8,.2,1)}
#guia{position:fixed;z-index:42;width:min(360px,calc(100vw - 32px));padding:16px 16px 12px;border-radius:16px;color:#eef1f2;font:400 12.5px/1.5 var(--ui-sans,Inter,system-ui,sans-serif);
  background:var(--ui-glass,rgba(14,16,20,.86));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:0 22px 50px rgba(0,0,0,.45);backdrop-filter:var(--ui-glass-fx,blur(24px));-webkit-backdrop-filter:var(--ui-glass-fx,blur(24px));transition:left .35s,top .35s}
#guia h3{margin:0 0 6px;font-weight:600;font-size:15px}#guia p{margin:0;color:#d5dadd}#guia b{color:#fff;font-weight:600}
#guia .pie{display:flex;align-items:center;gap:8px;margin-top:12px}#guia .pie span{flex:1;font-size:11px;color:#949da3}
#guia button{all:unset;cursor:pointer;padding:7px 12px;border-radius:9px;font-weight:600;font-size:12px}#guia .sig{background:#D5FF3F;color:#1a1208}#guia .sal{color:#b3bbc0}#guia .sal:hover{color:#fff}
#guia button:focus-visible{outline:2px solid #fff;outline-offset:2px}
@media(prefers-reduced-motion:reduce){#guia-hueco,#guia{transition:none}}`; document.head.appendChild(st); }
  const velo = document.createElement('div'); velo.id = 'guia-velo';
  const hueco = document.createElement('div'); hueco.id = 'guia-hueco';
  const card = document.createElement('div'); card.id = 'guia'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'guia-t');
  document.body.append(velo, hueco, card);
  const visible = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight; };
  const pasos = PASOS.filter(p => !p.sel || visible(document.querySelector(p.sel)) || (p.abrir && document.querySelector('#esim')));
  let i = 0;
  const cerrar = () => { abierto = false; velo.remove(); hueco.remove(); card.remove(); removeEventListener('keydown', tecla); try { localStorage.setItem('ken-guia-v1', '1'); } catch (e) {} };
  const tecla = (e) => { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight') ir(i + 1); if (e.key === 'ArrowLeft') ir(i - 1); };
  addEventListener('keydown', tecla);
  function ir(k) {
    if (k >= pasos.length) { cerrar(); return; } i = Math.max(0, k); const p = pasos[i];
    if (p.abrir) { const e = document.getElementById('esim'); if (e && e.classList.contains('min')) e.querySelector('[data-min]')?.click(); if (p.sel === '#esim details') { const d = e && e.querySelector('details'); if (d) d.open = true; } }
    let el = p.sel && document.querySelector(p.sel); if (el && p.sube && el.closest(p.sube)) el = el.closest(p.sube);
    card.innerHTML = `<h3 id="guia-t">${p.t}</h3><p>${p.d}</p><div class="pie"><span>${i + 1} de ${pasos.length}</span><button type="button" class="sal">${i ? 'Atrás' : 'Saltar'}</button><button type="button" class="sig">${i === pasos.length - 1 ? 'Empezar' : 'Siguiente'}</button></div>`;
    card.querySelector('.sig').onclick = () => ir(i + 1); card.querySelector('.sal').onclick = () => (i ? ir(i - 1) : cerrar()); card.querySelector('.sig').focus();
    const W = innerWidth, H = innerHeight, cw = Math.min(360, W - 32);
    if (el && visible(el)) { el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(), m = 6;
      Object.assign(hueco.style, { display: 'block', left: r.left - m + 'px', top: r.top - m + 'px', width: r.width + m * 2 + 'px', height: r.height + m * 2 + 'px' }); velo.style.background = 'transparent';
      const ch = card.offsetHeight || 170; let x = r.left + r.width / 2 - cw / 2, y = r.bottom + 14;
      if (y + ch > H - 10) y = r.top - ch - 14; if (y < 10) { y = Math.max(10, Math.min(H - ch - 10, r.top)); x = r.left > W / 2 ? r.left - cw - 14 : r.right + 14; }
      card.style.left = Math.max(16, Math.min(W - cw - 16, x)) + 'px'; card.style.top = Math.max(10, y) + 'px'; }
    else { hueco.style.display = 'none'; velo.style.background = 'rgba(4,6,8,.55)'; card.style.left = (W - cw) / 2 + 'px'; card.style.top = Math.max(16, H / 2 - 110) + 'px'; }
  }
  velo.onclick = () => ir(i + 1);
  ir(0);
}
