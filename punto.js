/* =====================================================================
   TRIBUNA — el punto de información (como en el debate parlamentario británico): mientras un lado
   habla, alguien del otro lado pide la palabra desde el teléfono; el lado que habla lo acepta o lo
   rechaza. Aceptado, quien lo pidió tiene 15 s (corre el banco de su lado). Un punto a la vez;
   cada lado vuelve a pedir 30 s después de su último pedido. Lógica pura, probada con Node
   (pruebas/punto.test.js). Spec: docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md
   ===================================================================== */

const PUNTO = { ESPERA: 10000, DURA: 15000, ENFRIA: 30000, MUESTRA: 4000, SILENCIO_FIN: 1500 };
const otroLado = k => (k === "A" ? "B" : "A");
const puntoActivo = p => !!p && (p.estado === "pedido" || p.estado === "aceptado");

// pedido: { uid, nombre, grupo, lado, t }. ultimo: { A, B, tA, tB } → cuándo pidió cada lado por
// última vez y el t del último pedido ya atendido de ese lado. El teléfono nunca borra su campo
// punto: {debate, t}, así que ese mismo t sigue llegando después del enfriamiento (fantasma) —
// por eso, además del tiempo, se recuerda el t ya atendido y se ignora si vuelve a aparecer.
// Devuelve { punto, ultimo }; si el pedido no vale, el punto de antes y ultimo sin cambios.
function pedirPunto(actual, pedido, { ahora, hablando, ultimo }) {
  const u = ultimo || {};
  const lado = pedido && pedido.lado, para = otroLado(lado);
  const fantasma = pedido && pedido.t === u["t" + lado];
  const vale = (lado === "A" || lado === "B") && !puntoActivo(actual) && !fantasma && hablando && hablando[para]
    && ahora - (u[lado] ?? -Infinity) >= PUNTO.ENFRIA;
  if (!vale) return { punto: actual, ultimo: u };
  return {
    punto: { de: pedido.uid, nombre: pedido.nombre || "", grupo: pedido.grupo || 0, lado, para, estado: "pedido", t: pedido.t, fin: ahora + PUNTO.ESPERA, hasta: null },
    ultimo: { ...u, [lado]: ahora, ["t" + lado]: pedido.t }
  };
}

// respuesta: { t, acepta, lado? } — t tiene que ser el del pedido en curso; si viene lado, tiene
// que ser el del lado que habla (actual.para): el otro lado no puede aceptar ni rechazar por él.
function responderPunto(actual, respuesta, ahora) {
  if (!actual || actual.estado !== "pedido" || !respuesta || respuesta.t !== actual.t) return actual;
  if (ahora >= actual.fin) return actual;                                   // respuesta tardía: ya venció
  if (respuesta.lado && respuesta.lado !== actual.para) return actual;
  return respuesta.acepta ? { ...actual, estado: "aceptado", fin: ahora + PUNTO.DURA }
    : { ...actual, estado: "rechazado", fin: null, hasta: ahora + PUNTO.MUESTRA };
}

function vencerPunto(actual, ahora) {
  if (!actual) return null;
  if (actual.estado === "pedido" && ahora >= actual.fin) return { ...actual, estado: "vencido", hasta: ahora + PUNTO.MUESTRA };
  if (actual.estado === "aceptado" && ahora >= actual.fin) return { ...actual, estado: "terminado", hasta: ahora + PUNTO.MUESTRA };
  if (!puntoActivo(actual) && ahora >= (actual.hasta || 0)) return null;
  return actual;
}

// Un punto aceptado no tiene por qué durar los 15 s enteros: si quien lo pidió ya habló y lleva
// SILENCIO_FIN callado, terminó y la palabra vuelve al lado que cedió. Si nunca habla, sigue
// valiendo el límite de DURA (vencerPunto). hablo: habló durante el punto; hablandoAhora: habla en
// este momento; silencioDesde: desde cuándo está callado (hora de esta pantalla).
function cerrarPuntoSiTermino(p, { hablo, hablandoAhora, silencioDesde, ahora } = {}) {
  if (!p || p.estado !== "aceptado" || !hablo || hablandoAhora || silencioDesde == null) return p;
  if (ahora - silencioDesde < PUNTO.SILENCIO_FIN) return p;
  return { ...p, estado: "terminado", hasta: ahora + PUNTO.MUESTRA };
}

// En el teléfono, para dejar hablar basta `estado === "aceptado" && de === uid` (el proyector es
// quien publica cuándo termina). `puedeHablarPorPunto`, con `fin`, es para el reloj del proyector.
const puedeHablarPorPunto = (p, uid, ahora) => !!p && p.estado === "aceptado" && p.de === uid && ahora < p.fin;

if (typeof module !== "undefined") module.exports = { PUNTO, otroLado, puntoActivo, pedirPunto, responderPunto, vencerPunto, cerrarPuntoSiTermino, puedeHablarPorPunto };
