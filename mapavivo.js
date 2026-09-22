/* =====================================================================
   TRIBUNA — la brújula en vivo (pantalla del profesor), como el compás de ml2.
   Un punto por alumno que NO se vuelve a dibujar: cuando su posición cambia (responde otra
   pregunta de la brújula, o la repite al final) el mismo <circle> se desliza a la nueva y deja
   un rastro tenue desde donde estaba. Así la clase ve la nube moverse, no saltar.

   Dos lugares: incrustado en la portada, y a pantalla completa (⛶ / 🧭 MAPA) para proyectar.
   Los datos vienen de window.datosMapa() (online.js), con uid: esto nunca va a los teléfonos.
   ===================================================================== */

const MV = { grande: null };      // el mapa a pantalla completa, si está abierto

// Un plano de −10 a 10 (misma escala que mapaSvg) con una capa de puntos que se actualiza en sitio.
function crearMapaVivo(contenedor, { campos = [], ejes = null, tam = 460 } = {}) {
  contenedor.innerHTML = mapaSvg({ puntos: [], campos, ejes, tam });
  const svg = contenedor.querySelector("svg");
  svg.classList.add("vivo");
  const NS = "http://www.w3.org/2000/svg";
  const capa = n => { const g = document.createElementNS(NS, "g"); g.setAttribute("class", n); svg.appendChild(g); return g; };
  const rastros = capa("rastros"), flechas = capa("flechas"), pts = capa("pts");
  const m = 40, X = v => m + (v + 10) / 20 * (tam - 2 * m), Y = v => tam - m - (v + 10) / 20 * (tam - 2 * m);
  const vivos = new Map();          // uid → { c, r, f, px, py }
  const radio = 6;

  function actualizar(puntos, { flechas: conFlechas = false } = {}) {
    // varias personas en el mismo punto se abren en espiral; el orden por uid la hace estable
    const vistos = {}, ahora = new Set();
    const orden = [...puntos].sort((a, b) => String(a.uid).localeCompare(String(b.uid)));
    for (const p of orden) {
      ahora.add(p.uid);
      const k = p.x.toFixed(1) + "," + p.y.toFixed(1), i = vistos[k] = (vistos[k] ?? -1) + 1;
      const rr = i ? radio * 1.9 * Math.sqrt(i) : 0;
      const px = X(p.x) + rr * Math.cos(i * 2.4), py = Y(p.y) + rr * Math.sin(i * 2.4);
      let v = vivos.get(p.uid);
      if (!v) {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("r", radio);
        c.setAttribute("class", "pv llega");
        c.style.transform = `translate(${px}px,${py}px)`;
        pts.appendChild(c);
        const r = document.createElementNS(NS, "line"); r.setAttribute("class", "rastro"); rastros.appendChild(r);
        const f = document.createElementNS(NS, "line"); f.setAttribute("class", "flecha"); flechas.appendChild(f);
        v = { c, r, f, px, py };
        vivos.set(p.uid, v);
        setTimeout(() => c.classList.remove("llega"), 700);
      } else if (Math.abs(v.px - px) > .5 || Math.abs(v.py - py) > .5) {
        // se movió: rastro desde donde estaba, que se apaga solo
        v.r.setAttribute("x1", v.px); v.r.setAttribute("y1", v.py); v.r.setAttribute("x2", px); v.r.setAttribute("y2", py);
        v.r.setAttribute("stroke", p.color);
        v.r.classList.remove("apaga"); void v.r.getBBox(); v.r.classList.add("apaga");
        v.c.style.transform = `translate(${px}px,${py}px)`;
        v.px = px; v.py = py;
      }
      // quien todavía responde se ve hueco; al terminar, lleno
      v.c.setAttribute("fill", p.parcial ? "none" : p.color);
      v.c.setAttribute("stroke", p.color);
      v.c.setAttribute("stroke-width", p.parcial ? 2.5 : 1.5);
      if (conFlechas && p.desde) {
        v.f.setAttribute("x1", X(p.desde.x)); v.f.setAttribute("y1", Y(p.desde.y));
        v.f.setAttribute("x2", px); v.f.setAttribute("y2", py);
        v.f.setAttribute("stroke", p.color); v.f.style.display = "";
      } else v.f.style.display = "none";
    }
    for (const [uid, v] of vivos) if (!ahora.has(uid)) { v.c.remove(); v.r.remove(); v.f.remove(); vivos.delete(uid); }
  }
  return { svg, actualizar };
}

// Lo que muestra el mapa ahora. En la repetición del cierre, cada punto está donde quedó la
// segunda vez y la flecha sale de la primera; si todavía no la repite, se queda donde estaba.
function puntosDelMapa() {
  if (!window.datosMapa || typeof BRUJULA === "undefined") return { puntos: [], repeticion: false, completos: 0 };
  const { puntos, movimiento } = window.datosMapa();
  const color = id => (BRUJULA.campos.find(c => c.id === id) || {}).color || "#7d8fa1";
  const repeticion = !!(S.clase.brujula && S.clase.brujula.fase === "repetir") || movimiento.length > 0;
  const mov = new Map(movimiento.map(m => [m.uid, m]));
  const out = puntos.map(p => {
    const m = repeticion && mov.get(p.uid);
    return m ? { uid: p.uid, x: m.x, y: m.y, campo: m.campo, parcial: m.parcial, desde: m.desde, color: color(m.campo) }
             : { uid: p.uid, x: p.x, y: p.y, campo: p.campo, parcial: p.parcial, color: color(p.campo) };
  });
  return { puntos: out, repeticion, completos: puntos.filter(p => !p.parcial).length, movidos: movimiento.filter(m => !m.parcial).length };
}

/* ---------- a pantalla completa ---------- */
function abrirMapaGrande() {
  if (typeof BRUJULA === "undefined") { tick("Esta sesión no tiene brújula."); return; }
  cerrarMapaGrande();
  const el = document.createElement("div");
  el.id = "mapaGrande";
  const tam = Math.max(420, Math.min(window.innerHeight - 150, window.innerWidth - 380));
  el.innerHTML = `<div class="mg-cab"><span class="mg-k">🧭 LA BRÚJULA DE LA CLASE</span><span class="mg-cuenta" id="mgCuenta"></span>
      <button class="btn" id="mgCerrar" title="Cerrar (Esc)">✕</button></div>
    <div class="mg-cuerpo"><div class="mg-mapa" id="mgMapa"></div><div class="mg-ley" id="mgLey"></div></div>
    <div class="mg-pie">Un punto por persona, sin nombres. Hueco: todavía está respondiendo. Se mueve con cada respuesta.</div>`;
  document.body.appendChild(el);
  // se dibuja en la escala de siempre y se agranda con CSS: etiquetas y puntos crecen juntos
  MV.grande = crearMapaVivo($("mgMapa"), { campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 460 });
  MV.grande.svg.style.width = MV.grande.svg.style.height = Math.round(tam) + "px";
  $("mgCerrar").onclick = cerrarMapaGrande;
  MV.esc = e => { if (e.key === "Escape") cerrarMapaGrande(); };
  document.addEventListener("keydown", MV.esc);
  refrescarMapaVivo();
}
function cerrarMapaGrande() {
  $("mapaGrande")?.remove();
  MV.grande = null;
  if (MV.esc) document.removeEventListener("keydown", MV.esc);
}

// online.js la llama cada vez que llega una respuesta de la brújula o cambia un grupo.
function refrescarMapaVivo() {
  if (!MV.grande) return;
  const { puntos, repeticion, completos, movidos } = puntosDelMapa();
  MV.grande.actualizar(puntos, { flechas: repeticion });
  const n = Object.keys(window.jugadoresSala ? window.jugadoresSala() : {}).length;
  $("mgCuenta").textContent = repeticion ? `${movidos} de ${puntos.length} la repitieron` : `${completos} de ${n} respondieron`;
  const cuenta = id => puntos.filter(p => p.campo === id).length;
  $("mgLey").innerHTML = BRUJULA.campos.map(c => `<div class="mg-c" style="--c:${c.color}"><b>${escHtml(c.nombre)}</b><i>${cuenta(c.id)}</i>
      ${c.afirma ? `<span>${escHtml(c.afirma)}</span>` : ""}</div>`).join("")
    + (repeticion ? `<p class="mg-nota">Flechas: de la primera respuesta a la del cierre.</p>` : "");
}
