/* =====================================================================
   TRIBUNA — el profesor modera a viva voz desde su control (control.html, moderar.js).
   Con el interruptor «Moderas tú» (modProfe) la moderadora de IA se calla. Mientras el profesor
   aprieta HABLAR, el control escribe en salas/{codigo}/vivo/moderador
   habla: { debate, t0, t, texto } (un latido cada PROFE.CADA ms) y habla: null al soltar; el
   proyector y los teléfonos lo leen para el subtítulo en vivo y para que los alumnos le cedan la
   palabra. Al soltar, el control publica lo dicho como un mensaje del Moderador.
   Como con los alumnos, cuenta cuándo llegó cada latido a ESTE aparato (los relojes no coinciden):
   sin latido hace más de AJ.LATIDO (2,5 s), el moderador está callado (su celular se apagó a mitad).
   ===================================================================== */
const PROFE = { NOMBRE: "Moderador", CADA: 800, TEXTO: 300 };

// Cada foto de vivo/moderador. antes: lo anotado con la foto anterior. primera: la primera foto
// trae un latido viejo (de antes de abrir esta página): no cuenta como «ahora».
function notarProfe(antes, doc, ahora, primera = false) {
  const h = doc && doc.habla;
  if (!h) return { habla: null, visto: 0 };
  if (antes && antes.habla && antes.habla.t === h.t) return { habla: h, visto: antes.visto };
  return { habla: h, visto: primera ? 0 : ahora };
}

// { texto, t0 } si el moderador está hablando en el debate `debate`, o null.
function profeHabla(estado, debate, ahora, latido = (typeof AJ !== "undefined" ? AJ.LATIDO : 2500)) {
  const h = estado && estado.habla;
  if (!h || !debate || h.debate !== debate || !estado.visto || ahora - estado.visto > latido) return null;
  return { texto: String(h.texto || "").slice(-PROFE.TEXTO), t0: h.t0 || 0 };
}

// El mensaje que publica el control al soltar (o al escribir, voz: false). null si no hay nada
// que publicar. Una sola palabra sí sale: «Tiempo.» es una intervención del moderador.
function mensajeProfe({ texto, voz = true, debate, ronda = 0, tramo = 0, ahora = Date.now(), azar = Math.random }) {
  texto = String(texto || "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!texto || !debate) return null;
  return { id: "p" + ahora.toString(36) + azar().toString(36).slice(2, 7), tipo: "mod", nombre: PROFE.NOMBRE, texto,
    debate, ronda, tramo, t: ahora, datos: { profe: true }, ...(voz ? { voz: true } : {}) };
}

if (typeof module !== "undefined") module.exports = { PROFE, notarProfe, profeHabla, mensajeProfe };
