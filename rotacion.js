/* =====================================================================
   TRIBUNA — rotación de grupos: la lógica pura (sin DOM ni Firestore).
   Quién debate con quién, cuánto sacó cada grupo en un debate y el ranking de la clase.
   Se carga en el navegador como script clásico (globales) y en Node con require()
   para las pruebas (pruebas/rotacion.test.js).
   Spec: docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md
   ===================================================================== */

const ROT = {
  SEG_APERTURA: 180, SEG_REPLICA: 180, SEG_VOTACION: 60, SEG_RESULTADO: 10, SEG_PROPUESTA: 15,
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

// Votos de un debate. Cada votante parte en 0, así que su posición final es su voto.
function votosSuaves(posiciones) {
  let A = 0, B = 0, n = 0;
  for (const p of posiciones || []) {
    if (typeof p !== "number" || !isFinite(p)) continue;
    n++;
    if (p > ROT.INDECISO) A += Math.tanh(p / ROT.ESCALA);
    else if (p < -ROT.INDECISO) B += Math.tanh(-p / ROT.ESCALA);
  }
  return { A, B, n };
}

const promedio = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

// Puntaje 0–100 de cada lado en un debate: mitad jurado, mitad público.
function puntajeDebate({ notasA, notasB, posiciones }) {
  const mA = promedio(notasA || []), mB = promedio(notasB || []);
  const jA = mA * 5, jB = mB * 5;
  const votos = votosSuaves(posiciones);
  const hayPublico = votos.n > 0;
  const tot = votos.A + votos.B;
  const pA = hayPublico ? (tot > 0 ? 100 * votos.A / tot : 50) : null;
  const pB = hayPublico ? 100 - pA : null;
  const pun = (j, p) => hayPublico ? 0.5 * j + 0.5 * p : j;
  const ganadorJurado = Math.abs(mA - mB) < ROT.EMPATE_JURADO ? null : (mA > mB ? "A" : "B");
  const ganadorPublico = !hayPublico || Math.abs(votos.A - votos.B) < ROT.EMPATE_VOTOS ? null : (votos.A > votos.B ? "A" : "B");
  const ganador = !hayPublico ? ganadorJurado
    : ganadorJurado === ganadorPublico ? ganadorJurado
    : !ganadorJurado ? ganadorPublico : !ganadorPublico ? ganadorJurado : null;
  return {
    A: { jurado: jA, publico: pA, puntaje: pun(jA, pA) },
    B: { jurado: jB, publico: pB, puntaje: pun(jB, pB) },
    ganadorJurado, ganadorPublico, ganador, votos, hayPublico
  };
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
      jurado: mios.length ? promedio(mios.map(x => x.jurado)) : null,
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
    const mejorJ = jugaron.reduce((a, b) => (b.jurado > a.jurado ? b : a));
    const conP = jugaron.filter(f => f.publico !== null);
    const mejorP = conP.length ? conP.reduce((a, b) => (b.publico > a.publico ? b : a)) : null;
    if (mejorJ !== top) mejorJ.distincion = "jurado";
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

if (typeof module !== "undefined") module.exports = { ROT, TRAMOS, emparejar, votosSuaves, puntajeDebate, ranking, proximaPreguntaEscrita, mejorIntervencion };
