/* =====================================================================
   TRIBUNA — la brújula corta: dónde está cada alumno, en qué campo, cómo se forman los grupos
   y qué pares de grupos debaten. Lógica pura (sin DOM ni Firestore), probada con Node.
   Spec: docs/superpowers/specs/2026-09-19-brujula-y-grupos-design.md
   ===================================================================== */

const TAM_GRUPO = 5;
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const centroide = xs => ({ x: xs.reduce((s, a) => s + a.pos.x, 0) / xs.length, y: xs.reduce((s, a) => s + a.pos.y, 0) / xs.length });

// Promedio por eje de las opciones elegidas que puntúan en ese eje (como la brújula de ml2).
function posicion(respuestas, preguntas) {
  const ejes = { x: [], y: [] };
  let n = 0;
  for (const p of preguntas || []) {
    const i = respuestas ? respuestas[p.id] : undefined;
    const o = Number.isInteger(i) ? p.opciones[i] : null;
    if (!o) continue;
    n++;
    if (typeof o.x === "number") ejes.x.push(o.x);
    if (typeof o.y === "number") ejes.y.push(o.y);
  }
  if (!n) return null;
  const prom = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return { x: prom(ejes.x), y: prom(ejes.y) };
}

function campoDe(pos, campos) {
  let mejor = null, d = Infinity;
  for (const c of campos || []) { const e = distancia(pos, c.centro); if (e < d - 1e-9) { d = e; mejor = c.id; } }
  return mejor;
}

// Reparte una lista en k grupos de tamaños parejos (difieren a lo más en 1), manteniendo juntos a
// los cercanos: se ordena por posición antes de cortar.
function repartir(xs, k) {
  const orden = [...xs].sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y || String(a.uid).localeCompare(String(b.uid)));
  const base = Math.floor(orden.length / k), extra = orden.length % k, out = [];
  let i = 0;
  for (let g = 0; g < k; g++) { const t = base + (g < extra ? 1 : 0); out.push(orden.slice(i, i + t)); i += t; }
  return out.filter(g => g.length);
}

function formarGrupos(alumnos, campos, tam = TAM_GRUPO) {
  const conPos = (alumnos || []).filter(a => a && a.pos);
  const orden = (campos || []).map(c => c.id);
  let grupos = [];
  const sueltos = [];
  for (const id of orden) {
    const xs = conPos.filter(a => a.campo === id);
    if (xs.length >= 3) for (const g of repartir(xs, Math.ceil(xs.length / tam))) grupos.push({ campo: id, miembros: g });
    else sueltos.push(...xs);
  }
  sueltos.push(...conPos.filter(a => !orden.includes(a.campo)));
  if (!grupos.length && conPos.length) {
    // ningún campo llega a 3: todos juntos, ordenados por ángulo en el plano
    const porAngulo = [...conPos].sort((a, b) => Math.atan2(a.pos.y, a.pos.x) - Math.atan2(b.pos.y, b.pos.x) || String(a.uid).localeCompare(String(b.uid)));
    const k = Math.max(conPos.length >= 2 ? 2 : 1, Math.ceil(conPos.length / tam));
    const base = Math.floor(porAngulo.length / k), extra = porAngulo.length % k;
    let i = 0;
    for (let g = 0; g < k; g++) {
      const t = base + (g < extra ? 1 : 0), m = porAngulo.slice(i, i + t);
      i += t;
      if (m.length) grupos.push({ campo: campoDe(centroide(m), campos) || m[0].campo, miembros: m });
    }
  } else {
    for (const a of sueltos) {
      const g = grupos.reduce((m, x) => (distancia(a.pos, centroide(x.miembros)) < distancia(a.pos, centroide(m.miembros)) ? x : m));
      g.miembros.push(a);
    }
  }
  // para debatir hacen falta dos grupos: si hay uno solo con al menos 2 personas, se parte en dos
  if (grupos.length === 1 && grupos[0].miembros.length >= 2) grupos = repartir(grupos[0].miembros, 2).map(m => ({ campo: grupos[0].campo, miembros: m }));
  const primero = g => g.miembros.map(m => String(m.uid)).sort()[0];
  grupos.sort((a, b) => orden.indexOf(a.campo) - orden.indexOf(b.campo) || b.miembros.length - a.miembros.length || primero(a).localeCompare(primero(b)));
  const de = {};
  const salida = grupos.map((g, i) => {
    g.miembros.forEach(m => { de[m.uid] = i + 1; });
    return { n: i + 1, campo: g.campo, miembros: g.miembros.map(m => m.uid), pos: centroide(g.miembros) };
  });
  return { grupos: salida, de };
}

// Quien llega tarde (o no terminó la brújula): al grupo más chico de su campo; si su campo no
// tiene grupos, al más cercano a su posición; sin posición, al más chico de todos.
function asignarTarde(pos, campo, grupos) {
  if (!grupos || !grupos.length) return null;
  const chico = xs => xs.reduce((m, g) => (g.tam < m.tam || (g.tam === m.tam && g.n < m.n) ? g : m)).n;
  if (!pos) return chico(grupos);
  const delCampo = grupos.filter(g => g.campo === campo);
  if (delCampo.length) return chico(delCampo);
  return grupos.reduce((m, g) => (distancia(pos, g.pos) < distancia(pos, m.pos) ? g : m)).n;
}

// Como emparejar() de rotacion.js (nadie queda dos debates atrás de otro), pero entre los
// candidatos elige el par más lejano en el mapa. Primero los pares que no se han enfrentado.
function emparejarLejanos(disponibles, debates, posDe) {
  const gs = [...new Set(disponibles || [])].filter(g => posDe && posDe[g]).sort((a, b) => a - b);
  if (gs.length < 2) return null;
  const jug = g => debates.filter(d => d.A === g || d.B === g).length;
  const ult = g => { for (let i = debates.length - 1; i >= 0; i--) if (debates[i].A === g || debates[i].B === g) return i; return -1; };
  const yaJugaron = (x, y) => debates.some(d => (d.A === x && d.B === y) || (d.A === y && d.B === x));
  const min1 = Math.min(...gs.map(jug));
  const prim = gs.filter(g => jug(g) === min1);
  const pares = [];
  if (prim.length >= 2) { for (let i = 0; i < prim.length; i++) for (let j = i + 1; j < prim.length; j++) pares.push([prim[i], prim[j]]); }
  else {
    const resto = gs.filter(g => g !== prim[0]);
    const min2 = Math.min(...resto.map(jug));
    for (const b of resto.filter(g => jug(g) === min2)) pares.push([prim[0], b]);
  }
  const nuevos = pares.filter(([a, b]) => !yaJugaron(a, b));
  const cand = nuevos.length ? nuevos : pares;
  cand.sort((p, q) => distancia(posDe[q[0]], posDe[q[1]]) - distancia(posDe[p[0]], posDe[p[1]])
    || (ult(p[0]) + ult(p[1])) - (ult(q[0]) + ult(q[1])) || p[0] - q[0] || p[1] - q[1]);
  return { A: cand[0][0], B: cand[0][1] };
}

function movimiento(antes, despues) {
  return Object.keys(despues || {}).filter(u => antes && antes[u])
    .map(u => ({ uid: u, de: antes[u], a: despues[u], d: distancia(antes[u], despues[u]) }));
}

// El mapa: un plano de −10 a 10 con los centros de los campos como círculos tenues y un punto por
// alumno (flecha si trae «desde»). SVG en texto: lo usan el proyector, el teléfono y el panel.
function mapaSvg({ puntos = [], campos = [], ejes = null, tam = 420, chico = false }) {
  const m = chico ? 8 : 40, W = tam, H = tam;
  const X = v => m + (v + 10) / 20 * (W - 2 * m), Y = v => H - m - (v + 10) / 20 * (H - 2 * m);
  const e = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let s = `<svg viewBox="0 0 ${W} ${H}" class="mapa" role="img" aria-label="Mapa de posiciones de la clase">`;
  if (puntos.some(p => p.desde)) s += `<defs><marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#e6edf3"/></marker></defs>`;
  s += `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="#1e2a36"/>`;
  s += `<line x1="${W / 2}" y1="${m}" x2="${W / 2}" y2="${H - m}" stroke="#1e2a36" stroke-dasharray="4 4"/><line x1="${m}" y1="${H / 2}" x2="${W - m}" y2="${H / 2}" stroke="#1e2a36" stroke-dasharray="4 4"/>`;
  for (const c of campos) {
    s += `<circle cx="${X(c.centro.x).toFixed(1)}" cy="${Y(c.centro.y).toFixed(1)}" r="${chico ? 16 : 46}" fill="${c.color || "#7d8fa1"}" opacity=".13"/>`;
    if (!chico) s += `<text x="${X(c.centro.x).toFixed(1)}" y="${(Y(c.centro.y) - 52).toFixed(1)}" text-anchor="middle" fill="${c.color || "#7d8fa1"}" font-size="12" font-weight="700">${e(c.nombre)}</text>`;
  }
  if (ejes && !chico) {
    s += `<text x="${m}" y="${H / 2 - 6}" fill="#7d8fa1" font-size="11">${e(ejes.x.min)}</text><text x="${W - m}" y="${H / 2 - 6}" fill="#7d8fa1" font-size="11" text-anchor="end">${e(ejes.x.max)}</text>`;
    s += `<text x="${W / 2 + 6}" y="${m + 12}" fill="#7d8fa1" font-size="11">${e(ejes.y.max)}</text><text x="${W / 2 + 6}" y="${H - m - 4}" fill="#7d8fa1" font-size="11">${e(ejes.y.min)}</text>`;
  }
  // varias personas con las mismas respuestas caen en el mismo punto: se abren en espiral
  const vistos = {}, radio = chico ? 5 : 11;
  for (const p of puntos) {
    const k = p.x.toFixed(1) + "," + p.y.toFixed(1), i = vistos[k] = (vistos[k] ?? -1) + 1;
    const r = i ? radio * Math.sqrt(i) : 0, dx = r * Math.cos(i * 2.4), dy = r * Math.sin(i * 2.4);
    const px = (X(p.x) + dx).toFixed(1), py = (Y(p.y) + dy).toFixed(1);
    if (p.desde) s += `<line class="mv" x1="${X(p.desde.x).toFixed(1)}" y1="${Y(p.desde.y).toFixed(1)}" x2="${px}" y2="${py}" stroke="${p.color}" stroke-width="2" opacity=".75" marker-end="url(#fl)"/>`;
    s += `<circle class="pt" cx="${px}" cy="${py}" r="${p.yo ? (chico ? 6 : 9) : (chico ? 3.5 : 6)}" fill="${p.color}" stroke="${p.yo ? "#ffffff" : "none"}" stroke-width="2"/>`;
  }
  return s + "</svg>";
}

// El teléfono: qué hacer con la pantalla de la brújula según lo que publica la sala. La pantalla
// solo se muestra mientras la regla deja guardar la respuesta; si no, queda atrapado en ella.
const FASES_INICIO = ["responder", "grupos", "repetir"];
function accionBrujula(bj, { visible, modo, tieneMio, tieneRepeticion }) {
  const activa = !!(bj && bj.activa);
  if (visible) {
    if (!activa) return "cerrar";
    if (modo === "repetir") return bj.fase === "repetir" ? "nada" : "cerrar";
    return FASES_INICIO.includes(bj.fase) ? "nada" : "cerrar";
  }
  return activa && bj.fase === "repetir" && tieneMio && !tieneRepeticion ? "repetir" : "nada";
}
// Ofrecer la brújula a quien no la ha respondido (con o sin grupo) mientras sirve de algo.
function ofrecerBrujula(bj, tieneMio) {
  return !!(bj && bj.activa && !tieneMio && ["responder", "grupos"].includes(bj.fase));
}

if (typeof module !== "undefined") module.exports = { TAM_GRUPO, posicion, campoDe, formarGrupos, asignarTarde, emparejarLejanos, movimiento, mapaSvg, accionBrujula, ofrecerBrujula };
