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
    .replace(/\p{Extended_Pictographic}|\u{FE0F}|\u{200D}/gu, "")
    .replace(/@/g, "").replace(/[*_`#]/g, "")
    // "|" separaba ideas como pausa; si ya venía después de un fin de frase (. ? !) no hay que
    // duplicar la puntuación ("?. " se ve mal) — se conserva esa y solo se pone el espacio.
    .replace(/([.?!])?\s*\|\s*/g, (_, fin) => (fin ? fin + " " : ". "))
    .replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  if (/[.?!]»?$/.test(corte)) return corte;   // el corte cayó justo en un fin de frase: no hay nada que recortar
  const marcas = [[". ", 1], ["? ", 1], ["! ", 1], [".» ", 2], ["?» ", 2], ["!» ", 2]];
  let fin = -1, largo = 1;
  for (const [m, l] of marcas) { const i = corte.lastIndexOf(m); if (i > fin) { fin = i; largo = l; } }
  return fin > 0 ? corte.slice(0, fin + largo) : corte.replace(/\s+\S*$/, "") + "…";
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
    // cada segmento se recorta por su cuenta (no todo el mensaje junto), así un resumen largo no se
    // come el de al lado; y el relator SIEMPRE termina pidiendo el voto, pase lo que pase con el corte.
    const rematar = s => (/[.?!]$/.test(s) || /[.?!]»$/.test(s) ? s : s + ".");
    const segmentos = [];
    if (d.resumenA) segmentos.push(rematar(limpiarParaVoz(`${equipos.A.nombre}: ${d.resumenA}`, 140)));
    if (d.resumenB) segmentos.push(rematar(limpiarParaVoz(`${equipos.B.nombre}: ${d.resumenB}`, 140)));
    if (d.disputa) segmentos.push(rematar(limpiarParaVoz(`En disputa: ${d.disputa}`, 120)));
    return [...segmentos, "Público: voten en su teléfono."].join(" ");
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

// Las voces online de Chrome cortan el audio en silencio pasados ~15 s dentro de un mismo
// utterance. Se parte el texto en oraciones y se agrupan en trozos de a lo más max caracteres,
// sin partir ninguna palabra (salvo que la palabra sola ya sea más larga que max).
function trozosParaVoz(texto, max = 180) {
  const t = String(texto || "").trim();
  if (!t) return [];
  const oraciones = t.match(/[^.?!]+[.?!]+(\s+|$)|[^.?!]+$/g) || [t];
  const trozos = [];
  let actual = "";
  const cerrar = () => { if (actual) { trozos.push(actual); actual = ""; } };
  for (const bruta of oraciones) {
    const o = bruta.trim();
    if (!o) continue;
    if (o.length > max) {
      cerrar();
      let linea = "";
      for (const palabra of o.split(/\s+/)) {
        const cand = linea ? `${linea} ${palabra}` : palabra;
        if (cand.length > max && linea) { trozos.push(linea); linea = palabra; }
        else linea = cand;
      }
      actual = linea;
      continue;
    }
    const cand = actual ? `${actual} ${o}` : o;
    if (cand.length > max) { cerrar(); actual = o; }
    else actual = cand;
  }
  cerrar();
  return trozos;
}

/* ---------- en el navegador: una cola, un mensaje a la vez ---------- */
const COLA_VOZ = { voz: null };
function hablarIA(texto) {
  if (!texto || typeof speechSynthesis === "undefined") return;
  if (!COLA_VOZ.voz) COLA_VOZ.voz = elegirVoz(speechSynthesis.getVoices());
  for (const trozo of trozosParaVoz(texto)) {
    const u = new SpeechSynthesisUtterance(trozo);
    u.lang = COLA_VOZ.voz ? COLA_VOZ.voz.lang : "es-CL";
    if (COLA_VOZ.voz) u.voice = COLA_VOZ.voz;
    u.rate = 1.03;
    speechSynthesis.speak(u);          // speechSynthesis ya encola: habla uno tras otro
  }
}
function callarIA() { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }
if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => { COLA_VOZ.voz = elegirVoz(speechSynthesis.getVoices()); };

if (typeof module !== "undefined") module.exports = { VOZIA, limpiarParaVoz, textoHablado, elegirVoz, trozosParaVoz };
