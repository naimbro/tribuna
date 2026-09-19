/* =====================================================================
   TRIBUNA — rotación de grupos: la lógica pura (sin DOM ni Firestore).
   Quién debate con quién, cuánto sacó cada grupo en un debate y el ranking de la clase.
   Se carga en el navegador como script clásico (globales) y en Node con require()
   para las pruebas (pruebas/rotacion.test.js).
   Spec: docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md
   ===================================================================== */

const ROT = {
  SEG_APERTURA: 180, SEG_REPLICA: 180, SEG_VOTACION: 45, SEG_VEREDICTO_PUBLICO: 6, SEG_JUEZ: 3, SEG_TOTALES: 6, SEG_RESULTADO: 10, SEG_PROPUESTA: 15,
  GRUPOS_DEFECTO: 6, GRUPOS_MIN: 2, GRUPOS_MAX: 10,
  INDECISO: 8,          // |pos| ≤ 8 es indeciso y no suma votos
  ESCALA: 12,           // voto suave: tanh(|pos| / 12)
  EMPATE_VOTOS: 0.5,    // el público empata bajo medio voto de diferencia
  EMPATE_JURADO: 0.05   // el jurado empata bajo 0,05 puntos (de 20) de diferencia
};

// Los dos tramos de cada debate. "refutacion" es el id que el jurado ya conoce para la réplica.
const TRAMOS = [
  { id: "apertura", nombre: "Apertura", seg: ROT.SEG_APERTURA, rol: "Apertura",
    pauta: "Tesis y argumentos principales. Toda afirmación empírica requiere atribución a la bibliografía." },
  { id: "refutacion", nombre: "Réplica", seg: ROT.SEG_REPLICA, rol: "Réplica",
    pauta: "Responde lo más fuerte que dijo el otro grupo. Conceder un punto válido suma." }
];

// Quién debate ahora. Siempre los dos grupos que menos han debatido (así nadie queda dos
// debates atrás de otro); entre los empatados, el que debatió hace más tiempo. El rival se
// busca entre los de menos debates que todavía no se enfrentaron con el primero. A FAVOR le
// toca al que menos veces lo ha tenido.
function emparejar(disponibles, debates) {
  const gs = [...new Set(disponibles || [])].sort((a, b) => a - b);
  if (gs.length < 2) return null;
  const jugados = g => debates.filter(d => d.A === g || d.B === g).length;
  const ultimo = g => { for (let i = debates.length - 1; i >= 0; i--) if (debates[i].A === g || debates[i].B === g) return i; return -1; };
  const orden = [...gs].sort((a, b) => jugados(a) - jugados(b) || ultimo(a) - ultimo(b) || a - b);
  const primero = orden[0];
  const minRival = jugados(orden[1]);
  const candidatos = orden.slice(1).filter(g => jugados(g) === minRival);
  const yaJugaron = (x, y) => debates.some(d => (d.A === x && d.B === y) || (d.A === y && d.B === x));
  const rival = candidatos.find(g => !yaJugaron(primero, g)) ?? candidatos[0];
  const vecesA = g => debates.filter(d => d.A === g).length;
  return vecesA(primero) <= vecesA(rival) ? { A: primero, B: rival } : { A: rival, B: primero };
}


const promedio = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

// El panel de jueces, como en los clavados: de cada grupo se descartan la nota más alta y la más
// baja y se suman las tres del medio (sobre 30). Si algún juez no respondió, se escala.
function panelJueces(notas) {
  const lado = k => {
    const validas = (notas || []).map((j, i) => ({ id: j.id, i, v: j[k] }))
      .filter(x => typeof x.v === "number" && isFinite(x.v));
    if (!validas.length) return { total: null, descartadas: [] };
    if (validas.length <= 3) return { total: validas.reduce((a, x) => a + x.v, 0) / validas.length * 3, descartadas: [] };
    // entre notas iguales: la alta es la de menor índice y la baja la de mayor índice (determinista)
    const alta = validas.reduce((m, x) => (x.v > m.v ? x : m));
    const baja = validas.reduce((m, x) => (x.v < m.v || (x.v === m.v && x.i > m.i) ? x : m));
    const medio = validas.filter(x => x !== alta && x !== baja);
    return { total: medio.reduce((a, x) => a + x.v, 0) * 3 / medio.length, descartadas: [alta.id, baja.id] };
  };
  const A = lado("A"), B = lado("B");
  const ganador = A.total === null || B.total === null || Math.abs(A.total - B.total) < 1e-9 ? null : (A.total > B.total ? "A" : "B");
  return { A, B, ganador };
}

// El voto del público: una respuesta por votante («¿quién te convenció?»); null = no votó.
function votoPublico(votos) {
  const A = (votos || []).filter(v => v === "A").length, B = (votos || []).filter(v => v === "B").length, n = A + B;
  const parteA = n ? 100 * A / n : 50;
  return { A, B, n, parteA, parteB: 100 - parteA, ganador: A > B ? "A" : B > A ? "B" : null };
}

// Puntaje 0–100 de cada grupo en un debate: mitad jueces, mitad público.
// `jurado` guarda el porcentaje de los jueces (el nombre se mantiene: lo leen ranking y el panel).
function puntajeDebate({ panel, publico }) {
  const hayJueces = !!panel && panel.A.total !== null && panel.B.total !== null;
  const hayPublico = !!publico && publico.n > 0;
  const lado = k => {
    const jurado = hayJueces ? panel[k].total / 30 * 100 : null;
    const pub = hayPublico ? (k === "A" ? publico.parteA : publico.parteB) : null;
    const puntaje = hayJueces && hayPublico ? 0.5 * jurado + 0.5 * pub : hayJueces ? jurado : hayPublico ? pub : 50;
    return { jurado, publico: pub, puntaje };
  };
  const ganadorJueces = hayJueces ? panel.ganador : null, ganadorPublico = hayPublico ? publico.ganador : null;
  const ganador = ganadorJueces && ganadorPublico ? (ganadorJueces === ganadorPublico ? ganadorJueces : null)
    : ganadorJueces || ganadorPublico || null;
  return { A: lado("A"), B: lado("B"), ganadorJueces, ganadorPublico, ganador, hayJueces, hayPublico };
}

// Oráculos: 1 punto por predecir al ganador de los jueces. Si los jueces empatan, esa predicción
// no cuenta (ni punto ni intento). El registro es por uid y se acumula toda la clase.
function acumularOraculos(registro, votantes, ganador) {
  const r = { ...(registro || {}) };
  for (const v of votantes || []) {
    if (!v || !v.uid) continue;
    const x = r[v.uid] = { uid: v.uid, nombre: v.nombre || "", puntos: 0, predicciones: 0, aciertos: 0, ...(r[v.uid] || {}) };
    if (v.nombre) x.nombre = v.nombre;
    if (!ganador || (v.prediccion !== "A" && v.prediccion !== "B")) continue;
    x.predicciones++;
    if (v.prediccion === ganador) { x.aciertos++; x.puntos++; }
  }
  return r;
}

function rankingOraculos(registro) {
  return Object.values(registro || {})
    .map(o => ({ ...o, tasa: o.predicciones ? o.aciertos / o.predicciones : 0 }))
    .sort((a, b) => b.puntos - a.puntos || b.tasa - a.tasa || String(a.nombre).localeCompare(String(b.nombre)))
    .map((o, i) => ({ ...o, puesto: i + 1 }));
}

// El ranking de la clase: promedio por debate de cada grupo (no suma: algunos grupos
// debaten una vez más que otros). Desempata el jurado. Quien no ha debatido va al final.
function ranking(grupos, debates) {
  const filas = [];
  for (let g = 1; g <= grupos; g++) {
    const mios = [];
    for (const d of debates || []) {
      if (!d.res) continue;
      if (d.A === g) mios.push(d.res.A); else if (d.B === g) mios.push(d.res.B);
    }
    const conPublico = mios.filter(x => x.publico !== null && x.publico !== undefined);
    filas.push({
      grupo: g, debates: mios.length,
      jurado: (() => { const j = mios.filter(x => x.jurado !== null && x.jurado !== undefined); return j.length ? promedio(j.map(x => x.jurado)) : null; })(),
      publico: conPublico.length ? promedio(conPublico.map(x => x.publico)) : null,
      puntaje: mios.length ? promedio(mios.map(x => x.puntaje)) : null,
      puesto: null, distincion: null
    });
  }
  filas.sort((x, y) => (y.debates > 0) - (x.debates > 0) || (y.puntaje ?? 0) - (x.puntaje ?? 0)
    || (y.jurado ?? 0) - (x.jurado ?? 0) || x.grupo - y.grupo);
  const jugaron = filas.filter(f => f.debates > 0);
  jugaron.forEach((f, i) => f.puesto = i + 1);
  if (jugaron.length > 1) {
    const top = jugaron[0];
    const conP = jugaron.filter(f => f.publico !== null);
    const mejorP = conP.length ? conP.reduce((a, b) => (b.publico > a.publico ? b : a)) : null;
    const conJ = jugaron.filter(f => f.jurado !== null);
    const mejorJ = conJ.length ? conJ.reduce((a, b) => (b.jurado > a.jurado ? b : a)) : null;
    if (mejorJ && mejorJ !== top) mejorJ.distincion = "jurado";
    if (mejorP && mejorP !== top) mejorP.distincion = mejorP.distincion ? "ambos" : "publico";
  }
  return filas;
}

// Las preguntas que el profesor dejó escritas en el archivo de la semana se usan primero.
function proximaPreguntaEscrita(preguntas, usadas) {
  const ya = new Set((usadas || []).map(x => String(x).trim().toLowerCase()));
  return (preguntas || []).find(p => !ya.has(String(p).trim().toLowerCase())) || null;
}

function mejorIntervencion(historial) {
  return (historial || []).reduce((m, h) => (!m || h.total > m.total ? h : m), null);
}

if (typeof module !== "undefined") module.exports = { ROT, TRAMOS, emparejar, panelJueces, votoPublico, acumularOraculos, rankingOraculos, puntajeDebate, ranking, proximaPreguntaEscrita, mejorIntervencion };
