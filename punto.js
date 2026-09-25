/* =====================================================================
   TRIBUNA — el punto de información (como en el debate parlamentario británico): mientras un lado
   habla, alguien del otro lado pide la palabra desde el teléfono; el lado que habla lo acepta o lo
   rechaza. Aceptado, quien lo pidió tiene 15 s (corre el banco de su lado). Un punto a la vez;
   cada lado vuelve a pedir 30 s después de su último pedido. Lógica pura, probada con Node
   (pruebas/punto.test.js). Spec: docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md
   ===================================================================== */

const PUNTO = { ESPERA: 10000, DURA: 15000, ENFRIA: 30000, MUESTRA: 4000 };
const otroLado = k => (k === "A" ? "B" : "A");
const puntoActivo = p => !!p && (p.estado === "pedido" || p.estado === "aceptado");

// pedido: { uid, nombre, grupo, lado, t }. ultimo: { A, B } → cuándo pidió cada lado por última vez.
// Devuelve { punto, ultimo }; si el pedido no vale, el punto de antes y ultimo sin cambios.
function pedirPunto(actual, pedido, { ahora, hablando, ultimo = {} }) {
  const lado = pedido && pedido.lado, para = otroLado(lado);
  const vale = (lado === "A" || lado === "B") && !puntoActivo(actual) && hablando && hablando[para]
    && ahora - (ultimo[lado] ?? -Infinity) >= PUNTO.ENFRIA;
  if (!vale) return { punto: actual, ultimo };
  return {
    punto: { de: pedido.uid, nombre: pedido.nombre || "", grupo: pedido.grupo || 0, lado, para, estado: "pedido", t: pedido.t, fin: ahora + PUNTO.ESPERA, hasta: null },
    ultimo: { ...ultimo, [lado]: ahora }
  };
}

// respuesta: { t, acepta } — t tiene que ser el del pedido en curso.
function responderPunto(actual, respuesta, ahora) {
  if (!actual || actual.estado !== "pedido" || !respuesta || respuesta.t !== actual.t) return actual;
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

const puedeHablarPorPunto = (p, uid, ahora) => !!p && p.estado === "aceptado" && p.de === uid && ahora < p.fin;

if (typeof module !== "undefined") module.exports = { PUNTO, otroLado, puntoActivo, pedirPunto, responderPunto, vencerPunto, puedeHablarPorPunto };
