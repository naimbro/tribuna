/* =====================================================================
   TRIBUNA con un solo micrófono — el oído: del reconocedor de voz a los párrafos.
   El teléfono del profesor es el único micrófono. Mientras un lado tiene la palabra, lo que se oye
   se acumula en un párrafo; el párrafo se cierra al cambiar de lado, al pausar o a los 30 s.
   Al cambiar de lado no se espera el resultado final del reconocedor: el párrafo se cierra con lo
   que hay y el micrófono reabre de inmediato, para no perder el comienzo del que sigue.
   Usa crearToma (dictado.js) tal cual: un reconocedor de una frase a la vez, que es lo que
   funcionó en un Android real. Aquí no hay Firestore ni DOM: si este motor no convence en la sala,
   se reemplaza este archivo por uno que hable con un servidor y el resto no cambia.
   ===================================================================== */
const OIDO = { PARRAFO_MS: 30000 };

// Rec: window.SpeechRecognition || window.webkitSpeechRecognition (o null si no existe).
// toma: crearToma. alTexto({ quien, texto }): cambió el párrafo abierto ({ quien: null } = nadie).
// alParrafo({ quien, texto, t0, t }): se cerró un párrafo. alFallo(codigo): el micrófono se cayó.
function crearOido({ Rec, toma, alTexto = () => {}, alParrafo = () => {}, alFallo = () => {},
  max = OIDO.PARRAFO_MS, reloj = () => Date.now() } = {}) {
  let h = null, quien = null;
  const emitir = (q, texto, t0) => {
    texto = String(texto || "").replace(/\s+/g, " ").trim();
    if (texto) alParrafo({ quien: q, texto, t0, t: reloj() });
  };
  function cerrar() {
    if (!h) return;
    const vieja = h, q = quien;
    h = null; quien = null;
    const texto = vieja.texto(), t0 = vieja.t0;
    vieja.soltar({ inmediato: true });
    emitir(q, texto, t0);
    alTexto({ quien: null, texto: "" });
  }
  // Le da la palabra a `q` ("A", "B" o "P"). Devuelve si el micrófono quedó abierto.
  function abrir(q) {
    if (h && quien === q) return true;
    cerrar();
    if (!Rec) { alFallo("sin-voz"); return false; }
    const nueva = toma(Rec, { max, reloj,
      alTexto: texto => { if (h === nueva) alTexto({ quien: q, texto }); },
      alCorte: (texto, desde) => { if (h !== nueva) return; emitir(q, texto, desde); alTexto({ quien: q, texto: "" }); },
      alFallo: codigo => { if (h !== nueva) return; cerrar(); alFallo(codigo); } });
    try { nueva.empezar(); } catch (e) { alFallo("no-abre"); return false; }
    h = nueva; quien = q;
    return true;
  }
  return { abrir, cerrar, tick: () => { if (h) h.tick(); }, quien: () => quien };
}

// Un reconocedor de mentira para ensayar sin hablar (micro.html?simular=1) y para las pruebas:
// cada vez que se abre «oye» la frase que devuelve dame(), palabra por palabra, y se cierra como
// lo hace el de verdad al terminar una frase. Con una frase vacía, calla un rato.
function recSimulado(dame, { paso = 130, pausa = 450 } = {}) {
  return class {
    start() {
      const frase = String(dame() || "").split(/\s+/).filter(Boolean);
      let n = 0;
      this._vivo = true;
      const sigue = () => {
        if (!this._vivo) return;
        if (!frase.length) { this._t = setTimeout(() => this._fin(), 1500); return; }
        n++;
        const fin = n >= frase.length;
        if (this.onresult) this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: frase.slice(0, n).join(" ") }], { isFinal: fin })] });
        this._t = setTimeout(fin ? () => this._fin() : sigue, fin ? pausa : paso);
      };
      this._t = setTimeout(sigue, paso);
    }
    _fin() { if (!this._vivo) return; this._vivo = false; if (this.onend) this.onend(); }
    stop() { clearTimeout(this._t); this._t = setTimeout(() => this._fin(), 0); }
    abort() { this._vivo = false; clearTimeout(this._t); }
  };
}

if (typeof module !== "undefined") module.exports = { OIDO, crearOido, recSimulado };
