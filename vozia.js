/* =====================================================================
   TRIBUNA — la moderadora y el relator hablan por los parlantes del proyector.
   Si los alumnos debaten en voz alta y la IA solo escribe, el ritmo se rompe. Usa la voz del
   navegador (speechSynthesis): gratis, sin demora y sin claves. Arriba, lo puro (qué se dice y con
   qué voz), probado con Node (pruebas/vozia.test.js); abajo, la cola del navegador.
   ===================================================================== */

const VOZIA = { MAX: 400, IDIOMAS: ["es-cl", "es-us", "es-419", "es-mx", "es-es"] };

// Sin @, emojis, markdown ni barras; cortado en el último fin de frase que cabe en max.
function limpiarParaVoz(texto, max = VOZIA.MAX) {
  let t = String(texto || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/@/g, "").replace(/[*_`#]/g, "")
    .replace(/\s*\|\s*/g, ". ")
    .replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const fin = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("? "), corte.lastIndexOf("! "));
  return fin > 0 ? corte.slice(0, fin + 1) : corte.replace(/\s+\S*$/, "") + "…";
}

// Lo que se dice en voz alta por un mensaje de la conversación ("" = nada).
function textoHablado(m, equipos) {
  if (!m) return "";
  if (m.tipo === "mod") {
    if (m.datos && m.datos.tribuna === "pregunta") {
      const nombre = String(m.datos.nombre || "").trim().split(/\s+/)[0];
      return nombre ? `Pregunta de la tribuna. ${nombre}, léela en voz alta, por favor.` : "Pregunta de la tribuna.";
    }
    return limpiarParaVoz(m.texto);
  }
  if (m.tipo === "relator") {
    const d = m.datos || {};
    if (!d.resumenA && !d.resumenB) return limpiarParaVoz(m.texto);
    return limpiarParaVoz(`${equipos.A.nombre}: ${d.resumenA || ""} ${equipos.B.nombre}: ${d.resumenB || ""} En disputa: ${d.disputa || ""} Público: voten en su teléfono.`);
  }
  return "";
}

// La mejor voz en español: por idioma en el orden de VOZIA.IDIOMAS, y dentro de cada idioma las de
// Google (suenan mejor en Chrome). Si no hay ninguna de esas, cualquier voz «es».
function elegirVoz(voces) {
  const es = (voces || []).filter(v => /^es/i.test(v.lang || ""));
  if (!es.length) return null;
  const idioma = v => { const i = VOZIA.IDIOMAS.indexOf(String(v.lang).toLowerCase().replace("_", "-")); return i < 0 ? 99 : i; };
  const google = v => (/google/i.test(v.name || "") ? 0 : 1);
  return [...es].sort((a, b) => idioma(a) - idioma(b) || google(a) - google(b))[0];
}

/* ---------- en el navegador: una cola, un mensaje a la vez ---------- */
const COLA_VOZ = { voz: null };
function hablarIA(texto) {
  if (!texto || typeof speechSynthesis === "undefined") return;
  if (!COLA_VOZ.voz) COLA_VOZ.voz = elegirVoz(speechSynthesis.getVoices());
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = COLA_VOZ.voz ? COLA_VOZ.voz.lang : "es-CL";
  if (COLA_VOZ.voz) u.voice = COLA_VOZ.voz;
  u.rate = 1.03;
  speechSynthesis.speak(u);            // speechSynthesis ya encola: habla uno tras otro
}
function callarIA() { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }
if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => { COLA_VOZ.voz = elegirVoz(speechSynthesis.getVoices()); };

if (typeof module !== "undefined") module.exports = { VOZIA, limpiarParaVoz, textoHablado, elegirVoz };
