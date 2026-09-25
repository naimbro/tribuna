/* =====================================================================
   TRIBUNA — rotación de grupos: la lógica pura (sin DOM ni Firestore).
   Quién debate con quién, cuánto sacó cada grupo en un debate y el ranking de la clase.
   Se carga en el navegador como script clásico (globales) y en Node con require()
   para las pruebas (pruebas/rotacion.test.js).
   Spec: docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md
   ===================================================================== */

const ROT = {
  SEG_DEBATE: 360, SEG_VOTACION: 75, SEG_VEREDICTO_PUBLICO: 6, SEG_JUEZ: 3, SEG_TOTALES: 6, SEG_RESULTADO: 10, SEG_PROPUESTA: 15,
  SEG_PREPARACION: 60,  // antes de abrir el chat, cada grupo ve su postura y acuerda su primera frase
  SEG_ESCRIBIENDO: 6,   // «Grupo N está escribiendo…» dura esto desde la última tecla vista
  GRUPOS_DEFECTO: 6, GRUPOS_MIN: 2, GRUPOS_MAX: 10,
  INDECISO: 8,          // |pos| ≤ 8 es indeciso y no suma votos
  ESCALA: 12,           // voto suave: tanh(|pos| / 12)
  EMPATE_VOTOS: 0.5,    // el público empata bajo medio voto de diferencia
  EMPATE_JURADO: 0.05   // el jurado empata bajo 0,05 puntos (de 20) de diferencia
};

// Un solo tramo abierto por debate: la posición de entrada y después libre. La estructura
// la pone la moderadora en vivo —dando la palabra al que no ha hablado y preguntando por lo
// que leyeron— y no el reloj partido en discursos.
// El id se mantiene en "apertura" porque es la clave con que EJEMPLOS_SESION y el marcador
// local reconocen el tramo; lo que desaparece es el segundo tramo de réplica.
const TRAMOS = [
  { id: "apertura", nombre: "Debate", seg: ROT.SEG_DEBATE, rol: "Debate",
    pauta: "Cada grupo parte diciendo su posición en una frase. De ahí en adelante es libre: responder, preguntar, conceder. Toda afirmación empírica requiere atribución." }
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
    if (v.grupo) x.grupo = v.grupo;
    if (!ganador || (v.prediccion !== "A" && v.prediccion !== "B")) continue;
    x.predicciones++;
    if (v.prediccion === ganador) { x.aciertos++; x.puntos++; }
  }
  return r;
}

function rankingOraculos(registro) {
  // solo quienes han predicho al menos una vez (o sumaron por una pregunta) ocupan un puesto
  return Object.values(registro || {})
    .filter(o => o.predicciones > 0 || o.puntos > 0)
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

// Las preguntas que el profesor dejó escritas en el archivo de la semana se usan primero. Cada una
// es un texto o { texto, afirma }, donde afirma es el id del campo de la brújula cuya posición
// afirma la moción (así A FAVOR le toca al grupo que de verdad piensa eso). Devuelve { texto, afirma }.
const textoPregunta = p => String(p && typeof p === "object" ? p.texto : p ?? "").trim();
function proximaPreguntaEscrita(preguntas, usadas) {
  const ya = new Set((usadas || []).map(x => textoPregunta(x).toLowerCase()));
  const p = (preguntas || []).find(x => textoPregunta(x) && !ya.has(textoPregunta(x).toLowerCase()));
  if (!p) return null;
  const out = { texto: textoPregunta(p), afirma: (typeof p === "object" && p.afirma) || null };
  if (typeof p === "object" && p.favor) out.favor = p.favor;
  if (typeof p === "object" && p.contra) out.contra = p.contra;
  if (typeof p === "object" && p.duelo) out.duelo = p.duelo;     // clase con personajes: { A: id, B: id }
  return out;
}

/* --- Clase con personajes (semana 308) ----------------------------------
   Una semana puede definir PERSONAJES: cada grupo pasa a llamarse como un personaje (Jensen Huang,
   Dario Amodei…), los alumnos se inscriben a mano con cupo y por orden de llegada, y los duelos
   vienen fijos en PREGUNTAS. Por debajo el grupo sigue siendo el número 1..N (el orden de
   PERSONAJES): emparejar, el ranking, los votos y las reglas de Firestore no cambian.
   `ps` es la lista numerada [{ n, id, nombre, corto, … }]; sin ella todo se ve como antes. */
function numerarPersonajes(lista) {
  return Array.isArray(lista) && lista.length ? lista.map((p, i) => ({ ...p, n: i + 1 })) : null;
}
const personajeDe = (n, ps) => (Array.isArray(ps) && ps.length && n > 0 ? ps.find(p => p.n === n) || null : null);
// «Grupo 3» o «Jensen Huang»
const rotuloGrupo = (n, ps) => { const p = personajeDe(n, ps); return p ? p.nombre : `Grupo ${n}`; };
// «G3» o «Huang»: donde no cabe el nombre completo
const rotuloCorto = (n, ps) => { const p = personajeDe(n, ps); return p ? p.corto : `G${n}`; };
// «@Grupo 3» o «@Huang»: cómo la moderadora llama a un grupo
const mencionGrupo = (n, ps) => { const p = personajeDe(n, ps); return p ? `@${p.corto}` : `@Grupo ${n}`; };
// Con qué @ se da por aludido un integrante del grupo, además de «@Grupo N» (ritmo.js)
const aliasGrupo = (n, ps) => {
  const p = personajeDe(n, ps);
  const nm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ0-9 ]/g, "").replace(/\s+/g, " ").trim();
  return p ? [...new Set([nm(p.corto), nm(p.nombre)].filter(Boolean))] : [];
};

// Cuántos inscritos tiene cada personaje: { 1: 3, 2: 4, … } (jugadores: { uid: { grupo } })
function conteoPersonajes(jugadores, ps) {
  const c = {};
  for (const p of ps || []) c[p.n] = 0;
  for (const j of Object.values(jugadores || {})) if (j && j.grupo > 0 && j.grupo in c) c[j.grupo]++;
  return c;
}
const personajeLleno = (n, conteo, cupo) => (conteo[n] || 0) >= cupo;
const todosLlenos = (conteo, cupo, ps) => (ps || []).every(p => personajeLleno(p.n, conteo, cupo));
// Lo que sugiere la portada: con 24 presentes y seis personajes, cupo 4
const cupoSugerido = (presentes, k) => Math.max(1, Math.ceil((presentes || 0) / Math.max(1, k || 1)));

// Quien llega con la inscripción cerrada: al personaje con menos gente entre los que todavía no
// han debatido (así no cae en un duelo que ya pasó); a igual tamaño, el de número menor. Si ya
// debatieron todos, al más chico de todos.
function personajeParaAtrasado(ps, conteo, debates) {
  if (!ps || !ps.length) return null;
  const jugo = n => (debates || []).some(d => d.A === n || d.B === n);
  const pendientes = ps.filter(p => !jugo(p.n));
  const pool = pendientes.length ? pendientes : ps;
  return pool.reduce((m, p) => ((conteo[p.n] || 0) < (conteo[m.n] || 0) ? p : m)).n;
}

// El duelo de una pregunta escrita, en números de grupo; null si falta alguno de los dos.
function dueloEnGrupos(duelo, ps) {
  if (!duelo || !ps) return null;
  const n = id => (ps.find(p => p.id === id) || {}).n;
  return n(duelo.A) && n(duelo.B) ? { A: n(duelo.A), B: n(duelo.B) } : null;
}
// Los personajes del duelo que no tienen a nadie inscrito (A primero)
const faltanEnDuelo = (par, conteo, ps) => ["A", "B"].map(k => par[k]).filter(n => !(conteo[n] > 0)).map(n => rotuloGrupo(n, ps));

// Lo que sostiene cada lado, en una frase, para el minuto de preparación. Es la postura, no el
// argumento: los argumentos los buscan ellos en las lecturas. Sin postura escrita, una genérica.
function posturasDebate(p) {
  const f = x => String(x || "").replace(/\s+/g, " ").trim().slice(0, 240);
  return {
    A: f(p && p.favor) || "Ustedes defienden la afirmación tal como está: tienen que mostrar por qué es cierta.",
    B: f(p && p.contra) || "Ustedes la rechazan: tienen que mostrar por qué no se sostiene."
  };
}

// «Grupo N está escribiendo…»: los grupos del debate con alguien que tecleó hace poco. Cada
// registro es { uid, grupo, debate, t, visto }: t lo pone el teléfono (0 = ya envió) y visto es
// cuándo lo vio llegar ESTE aparato, para no depender de que los relojes coincidan.
function gruposEscribiendo(xs, { debate, ahora, yo = null }) {
  if (!debate) return [];
  const gs = new Set((xs || []).filter(x => x.uid !== yo && x.debate === debate && x.t > 0 && x.grupo > 0
    && ahora - (x.visto || 0) < ROT.SEG_ESCRIBIENDO * 1000).map(x => x.grupo));
  return [...gs].sort((a, b) => a - b);
}

// La pregunta de la tribuna que la moderadora eligió: un punto de oráculo para quien la hizo.
// No cuenta como predicción (no mueve la tasa de aciertos).
function sumarPuntoPregunta(registro, v) {
  const r = { ...(registro || {}) };
  if (!v || !v.uid) return r;
  const x = r[v.uid] = { uid: v.uid, nombre: v.nombre || "", puntos: 0, predicciones: 0, aciertos: 0, preguntas: 0, ...(r[v.uid] || {}) };
  if (v.grupo) x.grupo = v.grupo;
  x.puntos++; x.preguntas = (x.preguntas || 0) + 1;
  return r;
}

// Cómo se muestra una persona en pantalla: su nombre y su grupo, «Naim (grupo 1)»; con
// personajes, «Naim (Huang)».
const conGrupo = (nombre, grupo, ps) => {
  if (!grupo) return String(nombre || "");
  const p = personajeDe(grupo, ps);
  return `${nombre} (${p ? p.corto : `grupo ${grupo}`})`;
};

function mejorIntervencion(historial) {
  return (historial || []).reduce((m, h) => (!m || h.total > m.total ? h : m), null);
}

if (typeof module !== "undefined") module.exports = { ROT, TRAMOS, emparejar, panelJueces, votoPublico, acumularOraculos, rankingOraculos, puntajeDebate, ranking, proximaPreguntaEscrita, posturasDebate, gruposEscribiendo, sumarPuntoPregunta, mejorIntervencion, conGrupo,
  numerarPersonajes, personajeDe, rotuloGrupo, rotuloCorto, mencionGrupo, aliasGrupo, conteoPersonajes, personajeLleno, todosLlenos,
  cupoSugerido, personajeParaAtrasado, dueloEnGrupos, faltanEnDuelo };
