/* =====================================================================
   TRIBUNA — el público activo: lo que hacen en su teléfono los grupos que no debaten.
   Lógica pura (sin DOM ni Firestore), probada con Node (pruebas/publico.test.js).

   La simulación del 23-sep-2026 (20 alumnos-agente) mostró que el rol de público era lo aburrido
   del juego: 19 de 20 pidieron poder hacer algo mientras debatían otros. Tres herramientas:
     1. TERMÓMETRO: un deslizador A FAVOR ↔ EN CONTRA que el votante mueve cuando quiera. El
        proyector dibuja la curva del público en vivo. No entra en el puntaje: dice cuánto se
        movió la sala.
     2. REACCIONES: 🔥 buen punto, 🤔 ¿fuente?, 🤝 buena concesión, sobre los mensajes de quienes
        debaten. Si un mensaje junta suficientes 🤔, la moderadora pide la fuente en nombre de la
        tribuna. El mensaje con más 🔥 es «la frase del debate».
     3. LA PREGUNTA DE LA TRIBUNA: cada votante puede dejar una pregunta por debate; la moderadora
        elige una y la lanza con el nombre de quien la hizo, que suma un punto de oráculo.
   ===================================================================== */

const PUB = {
  REACCIONES: [
    { id: "fuego", emoji: "🔥", nombre: "buen punto" },
    { id: "fuente", emoji: "🤔", nombre: "¿de dónde sale?" },
    { id: "concede", emoji: "🤝", nombre: "buena concesión" }
  ],
  FUENTE_MIN: 2,          // 🤔 que pide la tribuna, como mínimo…
  FUENTE_PARTE: 0.2,      // …o una quinta parte de quienes votan, lo que sea mayor
  FRASE_MIN: 2,           // 🔥 mínimos para ser «la frase del debate»
  PREGUNTA_MAX: 200,      // caracteres de una pregunta de la tribuna
  TRIBUNA_DESDE: 90,      // segundos de debate antes de ofrecerle preguntas a la moderadora
  TRIBUNA_FORZAR: 180,    // si a esta altura no salió ninguna, la moderadora lanza una
  TRIBUNA_MAX: 2,         // preguntas de la tribuna por debate
  CURVA_PASO: 3,          // segundos entre dos puntos de la curva del termómetro
  CURVA_MAX: 160
};

// Termómetro: pos va de −100 (EN CONTRA) a +100 (A FAVOR); pos0 es donde la persona lo dejó la
// primera vez. Resumen: cuántos lo movieron, dónde partió y dónde terminó la sala (promedios), y
// cuánto se movió hacia A FAVOR (positivo) o EN CONTRA (negativo).
function resumenTermometro(entradas) {
  const xs = (entradas || []).filter(e => e && Number.isFinite(e.pos));
  if (!xs.length) return { n: 0, inicial: null, final: null, mov: null };
  const prom = f => xs.reduce((s, e) => s + f(e), 0) / xs.length;
  const inicial = prom(e => (Number.isFinite(e.pos0) ? e.pos0 : e.pos)), final = prom(e => e.pos);
  const r = v => Math.round(v * 10) / 10;
  return { n: xs.length, inicial: r(inicial), final: r(final), mov: r(final - inicial) };
}

// Agrega un punto a la curva si pasó al menos CURVA_PASO segundos desde el anterior. Pasado el
// máximo, se queda con uno de cada dos puntos (la forma de la curva se conserva).
function muestraCurva(curva, s, media, n) {
  const c = [...(curva || [])];
  if (!Number.isFinite(media) || !n) return c;
  const ult = c[c.length - 1];
  if (ult && s - ult.s < PUB.CURVA_PASO) return c;
  c.push({ s: Math.round(s), m: Math.round(media * 10) / 10, n });
  return c.length > PUB.CURVA_MAX ? c.filter((_, i) => i % 2 === 0 || i === c.length - 1) : c;
}

// Reacciones: una por persona y mensaje (r = null la quita). Devuelve { msg: { fuego, fuente, concede } }.
function contarReacciones(lista) {
  const out = {};
  for (const x of lista || []) {
    if (!x || !x.msg || !PUB.REACCIONES.some(r => r.id === x.r)) continue;
    const c = out[x.msg] = out[x.msg] || { fuego: 0, fuente: 0, concede: 0 };
    c[x.r]++;
  }
  return out;
}

const umbralFuente = elegibles => Math.max(PUB.FUENTE_MIN, Math.ceil((elegibles || 0) * PUB.FUENTE_PARTE));

// Los mensajes que acaban de cruzar el umbral de 🤔 y la moderadora todavía no preguntó.
function pedidosDeFuente(conteos, yaPedidos, elegibles) {
  const u = umbralFuente(elegibles), ya = new Set(yaPedidos || []);
  return Object.entries(conteos || {}).filter(([id, c]) => c.fuente >= u && !ya.has(id)).map(([id]) => id);
}

// La frase del debate: el mensaje de un alumno con más 🔥 (al menos FRASE_MIN); entre empatados,
// el que se escribió primero.
function fraseDelDebate(msgs, conteos) {
  let mejor = null, max = PUB.FRASE_MIN - 1;
  for (const m of msgs || []) {
    if (m.tipo !== "alumno") continue;
    const f = ((conteos || {})[m.id] || {}).fuego || 0;
    if (f > max) { max = f; mejor = m; }
  }
  return mejor ? { id: mejor.id, nombre: mejor.nombre, grupo: mejor.grupo || 0, equipo: mejor.equipo, texto: mejor.texto, fuego: max } : null;
}

// Preguntas de la tribuna que siguen en la fila (no emitidas), en orden de llegada.
function preguntasPendientes(preguntas, emitidas) {
  const ya = new Set((emitidas || []).map(p => p.uid));
  return (preguntas || []).filter(p => p && p.uid && !ya.has(p.uid) && String(p.texto || "").trim())
    .sort((a, b) => (a.t || 0) - (b.t || 0));
}

// ¿Se le ofrecen preguntas a la moderadora ahora? ¿Y hay que forzar una?
function turnoTribuna({ seg, emitidas, pendientes }) {
  const hay = (pendientes || 0) > 0 && (emitidas || 0) < PUB.TRIBUNA_MAX;
  return { ofrecer: hay && seg >= PUB.TRIBUNA_DESDE, forzar: hay && (emitidas || 0) === 0 && seg >= PUB.TRIBUNA_FORZAR };
}

// Cómo se lee en el chat la pregunta que la moderadora eligió: las palabras del alumno, sin tocar.
function textoTribuna(p, destino) {
  const quien = p.grupo ? `${p.nombre} (grupo ${p.grupo})` : p.nombre;
  const a = String(destino || "").trim();
  return `✋ La tribuna pregunta — ${quien}: «${String(p.texto).trim().slice(0, PUB.PREGUNTA_MAX)}»${a ? ` ${a}, ¿qué responden?` : " ¿Qué responden?"}`;
}

if (typeof module !== "undefined") module.exports = { PUB, resumenTermometro, muestraCurva, contarReacciones, umbralFuente, pedidosDeFuente, fraseDelDebate, preguntasPendientes, turnoTribuna, textoTribuna };
