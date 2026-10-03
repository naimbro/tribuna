/* =====================================================================
   TRIBUNA — mantener para hablar: el reconocimiento de voz del navegador, compartido por el
   teléfono de quien debate (jugar.js) y el control del profesor cuando modera (moderar.js).
   Una «toma» es un apretón del botón, con su propio texto. Usa un reconocedor de una frase a la
   vez: al terminar la frase se cierra y, si el botón sigue apretado, se abre otro y el texto sigue
   sumando en la misma toma. No continuo: en Chrome de Android (probado el 1-oct-2026 en un
   teléfono real) el modo continuo entrega cada pedazo como un resultado final nuevo con todo el
   texto acumulado, y la toma salía «Aló Aló estoy Aló estoy probando…»; en iPhone el modo
   continuo tiene fallas conocidas.
   A los DICTADO.MAX ms la toma se corta (alCorte con lo dicho) y sigue escuchando. Al soltar se
   espera el resultado final DICTADO.ESPERA ms como mucho. Lo que se hace con el texto (latido,
   envío, avisos) queda en cada página: aquí no hay Firestore ni DOM.
   ===================================================================== */
const DICTADO = { LANG: "es-CL", MAX: 60000, ESPERA: 1200, CONTINUO: false, RAPIDO: 500, FALLAS: 4 };

// junta dos trozos reconocidos: después de reiniciar el reconocedor, el primer trozo no trae espacio
const unirTrozos = (a, b) => !a ? b || "" : !b ? a : /\s$/.test(a) || /^\s/.test(b) ? a + b : a + " " + b;

// Rec: el constructor (window.SpeechRecognition || window.webkitSpeechRecognition).
// alTexto(texto): llegó texto (provisional o firme) mientras el botón sigue apretado.
// alFallo(codigo, oyo): un error del reconocedor que obliga a soltar ("not-allowed",
//   "service-not-allowed", "audio-capture", "network", …), o "mudo" (el micrófono se cierra apenas
//   se abre, DICTADO.FALLAS veces seguidas) o "cortado" (no se pudo abrir el siguiente). oyo: si la
//   toma ya tenía texto. no-speech y aborted no son fallas: si sigue apretado, se abre otro.
// alCorte(texto, desde): el corte de los 60 s; desde = cuándo empezó ese trozo.
// Devuelve la toma: { final, interino, t0, debate, texto(), empezar(), tick(), soltar({ inmediato }) }.
// empezar() lanza si el navegador no deja abrir el micrófono. soltar() resuelve { texto, desde }.
function crearToma(Rec, { debate = null, alTexto = () => {}, alFallo = () => {}, alCorte = () => {},
  max = DICTADO.MAX, espera = DICTADO.ESPERA, reloj = () => Date.now() } = {}) {
  const h = { rec: null, final: "", interino: "", t0: reloj(), debate, corte: 0, fallas: 0, inicio: 0, alTerminar: null, soltada: false };
  h.texto = () => unirTrozos(h.final, h.interino).replace(/\s+/g, " ").trim();
  const oyo = () => !!(h.final || h.interino);
  const desenganchar = rec => { rec.onresult = rec.onend = rec.onerror = null; try { rec.abort(); } catch (e) { /* ya cerrado */ } };

  function cortar() {
    const texto = h.texto(), desde = h.t0;
    Object.assign(h, { final: "", interino: "", t0: reloj(), corte: 0 });
    alCorte(texto, desde);
  }
  function escuchar() {
    const rec = new Rec();
    rec.lang = DICTADO.LANG; rec.continuous = DICTADO.CONTINUO; rec.interimResults = true;
    rec.onresult = e => {
      let interino = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) h.final = unirTrozos(h.final, e.results[i][0].transcript);
        else interino += e.results[i][0].transcript;
      }
      h.interino = interino;
      if (!h.soltada) alTexto(h.texto());
    };
    rec.onerror = e => {
      if (h.soltada || e.error === "no-speech" || e.error === "aborted") return;
      alFallo(e.error, oyo());
    };
    rec.onend = () => {
      if (h.rec !== rec) return;                      // un reconocedor ya reemplazado o soltado
      // lo que quedó como interino es lo último que se oyó: pasa a firme, o el próximo reconocedor lo pisa
      if (h.interino) { h.final = unirTrozos(h.final, h.interino); h.interino = ""; }
      if (h.corte) cortar();                          // el corte de los 60 s esperaba este final
      if (h.alTerminar) { h.alTerminar(); return; }   // soltó: la toma esperaba este final
      if (h.soltada) return;
      // un micrófono que se cierra apenas se abre no se reintenta sin fin
      h.fallas = reloj() - h.inicio < DICTADO.RAPIDO ? h.fallas + 1 : 0;
      if (h.fallas >= DICTADO.FALLAS) { alFallo("mudo", oyo()); return; }
      try { escuchar(); } catch (e) { alFallo("cortado", oyo()); }
    };
    h.rec = rec; h.inicio = reloj();
    rec.start();
  }

  h.empezar = () => {
    try { escuchar(); }
    catch (e) { h.soltada = true; if (h.rec) desenganchar(h.rec); h.rec = null; throw e; }
  };
  // Cada ~200 ms mientras se aprieta: el corte de los 60 s.
  h.tick = () => {
    if (h.soltada) return;
    const ahora = reloj();
    if (!h.corte && ahora - h.t0 >= max) {
      h.corte = ahora;
      try { h.rec.stop(); } catch (e) { cortar(); }
    } else if (h.corte && ahora - h.corte > espera) {
      // el reconocedor no terminó a tiempo: se corta igual con lo que hay y se abre otro
      const viejo = h.rec; h.rec = null;
      if (viejo) desenganchar(viejo);
      cortar();
      try { escuchar(); } catch (e) { alFallo("cortado", oyo()); }
    }
  };
  // inmediato: sale ya con lo que hay (sin tiempo, cede la palabra, o se descarta).
  h.soltar = async ({ inmediato = false } = {}) => {
    if (!h.soltada) {
      h.soltada = true;
      const rec = h.rec;
      if (rec && !inmediato) await new Promise(listo => {
        const plazo = setTimeout(listo, espera);
        h.alTerminar = () => { clearTimeout(plazo); listo(); };
        try { rec.stop(); } catch (e) { h.alTerminar(); }
      });
      h.rec = null;
      if (rec) desenganchar(rec);
    }
    return { texto: h.texto(), desde: h.t0 };
  };
  return h;
}

if (typeof module !== "undefined") module.exports = { DICTADO, unirTrozos, crearToma };
