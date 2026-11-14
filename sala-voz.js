/* =====================================================================
   LA SALA — la voz: el teléfono del profesor como único micrófono (lo usa la testera).
   Une el oído de Tribuna (oido.js sobre dictado.js) con la sala: activo, el micrófono sigue a la
   palabra. Se abre cuando una bancada tiene la palabra y se cierra cuando no la tiene nadie. Lo
   que se oye se corta en párrafos (30 s o cambio de bancada) y cada párrafo se guarda en la sala
   (acción «dicho»); lo que se está diciendo va a vivo/voz, para el proyector.
   Solo funciona en la cuenta que creó la sala: es la única que puede escribir la sala y vivo/voz.
   Con ?simular=1 no usa el micrófono: «oye» un guion armado con el contenido del nudo.
   ===================================================================== */
import { D, L, P, e, despachar, nota, chip } from "./sala-comun.js?v=20261114a";

export const SIMULAR = P.get("simular") === "1";
const FALLOS = {
  "sin-voz": "Este navegador no reconoce voz. Abre la testera en Chrome, en un teléfono Android.",
  "not-allowed": "Chrome no tiene permiso para usar el micrófono. Toca el candado junto a la dirección, permite el micrófono y recarga la página.",
  "service-not-allowed": "Chrome no tiene permiso para usar el micrófono. Toca el candado junto a la dirección, permite el micrófono y recarga la página.",
  "audio-capture": "El teléfono no encontró un micrófono. Cierra otras apps que lo estén usando y reábrelo.",
  "network": "El reconocimiento de voz necesita internet. Revisa la conexión y reábrelo.",
  "cortado": "El micrófono se cortó. Reábrelo."
};
const PRUEBA = "prueba";

// S: el estado de la testera ({ canal, codigo, sala, dueno }). alCambio(): hay que repintar el panel.
export function crearVoz(S, alCambio) {
  const E = { armado: false, probando: false, clave: "", caida: "", fallo: "", texto: "", prueba: "",
    enviada: "", vozT: 0, timer: null, candado: null, guion: {} };
  const Rec = SIMULAR ? recSimulado(fraseSimulada, { paso: 90 }) : (window.SpeechRecognition || window.webkitSpeechRecognition || null);
  const oido = crearOido({ Rec, toma: crearToma, alTexto, alParrafo, alFallo, max: SIMULAR ? 7000 : undefined });
  setInterval(() => oido.tick(), 200);
  // el latido: el proyector sabe que el micrófono sigue vivo aunque nadie hable
  setInterval(() => { if (E.armado) publicar(true); }, 5000);

  const partes = clave => { const [b, n, f] = String(clave).split("|"); return { b: +b || 0, n: +n || 0, f: f || "" }; };
  function fraseSimulada() {
    if (E.probando) return "probando el micrófono uno dos tres";
    const x = partes(E.clave), i = E.guion[E.clave] || 0;
    E.guion[E.clave] = i + 1;
    if (x.f === "lectura" && i > 0) return "";           // la indicación se lee una sola vez; después, silencio
    return L.fraseDeEnsayo(D, x.n, x.b, x.f, i);
  }
  const enPantalla = () => { const p = document.getElementById("vozTxt"); if (p) p.textContent = E.probando ? E.prueba : E.texto ? "…" + E.texto.slice(-160) : ""; };

  /* ---------------- lo que llega del oído ---------------- */
  function alTexto(v) {
    if (v.quien === PRUEBA) { if (v.texto) E.prueba = v.texto; return enPantalla(); }
    E.texto = v.quien ? v.texto : "";
    enPantalla();
    publicar(false);
  }
  function alParrafo(p) {
    if (p.quien === PRUEBA || !S.sala) return;
    const x = partes(p.quien), id = "p" + p.t0.toString(36) + Math.random().toString(36).slice(2, 4);
    despachar(S, { t: "dicho", id, n: x.n, f: x.f, b: x.b, texto: p.texto, t0: p.t0 }).then(alCambio);
  }
  function alFallo(codigo) {
    E.fallo = FALLOS[codigo] || FALLOS.cortado;
    E.caida = E.clave; E.clave = ""; E.texto = ""; E.probando = false;
    nota(E.fallo);
    publicar(true);
    alCambio();
  }
  // La voz en vivo va al proyector cada 700 ms como mucho; el vaciado y el latido no esperan.
  function publicar(ya) {
    const enviar = () => {
      E.timer = null;
      if (!S.sala || !S.dueno) return;
      const x = partes(E.clave), texto = E.texto.slice(-320), firma = E.clave + "|" + texto + "|" + E.armado;
      if (!ya && firma === E.enviada) return;
      E.enviada = firma; E.vozT = Date.now();
      S.canal.publicarVoz(S.codigo, { activo: E.armado, b: x.b, n: x.n, f: x.f, texto, t: Date.now() }).catch(() => {});
    };
    if (ya || !E.texto) { clearTimeout(E.timer); return enviar(); }
    if (!E.timer) E.timer = setTimeout(enviar, Math.max(0, 700 - (Date.now() - E.vozT)));
  }

  /* ---------------- el micrófono sigue a la palabra ---------------- */
  function sincronizar() {
    const s = S.sala;
    if (!E.armado || E.probando || !s || !S.dueno) return;
    const clave = s.palabra ? [s.palabra, s.nudo || 0, s.fase].join("|") : "";
    if (clave === E.clave) return;
    if (!clave) { E.clave = ""; E.caida = ""; E.fallo = ""; oido.cerrar(); return alCambio(); }
    if (clave === E.caida) return;                       // se cayó con esta misma palabra: espera a «Reabrir»
    E.caida = ""; E.fallo = "";
    E.clave = clave;                                     // el oído cierra el párrafo anterior con su propia clave
    if (!oido.abrir(clave) && E.clave === clave) { E.caida = clave; E.clave = ""; }
    alCambio();
  }
  async function candado() {
    try {
      if (!navigator.wakeLock || E.candado) return;
      E.candado = await navigator.wakeLock.request("screen");
      E.candado.addEventListener("release", () => { E.candado = null; });
    } catch (x) { /* sin permiso o sin batería: no es grave */ }
  }
  function armar(on) {
    if (!S.dueno) return;
    if (on && !Rec) { E.fallo = FALLOS["sin-voz"]; nota(E.fallo); return alCambio(); }
    if (E.probando) probar(false);
    E.armado = !!on; E.caida = ""; E.fallo = "";
    if (on) { candado(); sincronizar(); }
    else { E.clave = ""; E.texto = ""; oido.cerrar(); if (E.candado) E.candado.release().catch(() => {}); }
    publicar(true);
    alCambio();
  }
  function probar(on) {
    if (on && !Rec) { E.fallo = FALLOS["sin-voz"]; nota(E.fallo); return alCambio(); }
    if (on) {
      E.clave = ""; E.caida = ""; E.fallo = ""; E.prueba = ""; E.probando = true;
      if (!oido.abrir(PRUEBA)) E.probando = false;
    } else { E.probando = false; oido.cerrar(); sincronizar(); }
    alCambio();
  }
  const reabrir = () => { E.caida = ""; E.fallo = ""; sincronizar(); alCambio(); };
  // Con la pantalla apagada o en otra app, Chrome corta el micrófono: se cierra y se reabre al volver.
  document.addEventListener("visibilitychange", () => {
    if (!E.armado) return;
    if (document.visibilityState === "visible") { candado(); sincronizar(); }
    else if (E.clave) { E.clave = ""; E.texto = ""; oido.cerrar(); publicar(true); alCambio(); }
  });

  /* ---------------- el panel de la testera ---------------- */
  function html() {
    if (!S.dueno) return `<section><h2>Micrófono</h2><p class="ayuda">El micrófono va en el teléfono de la cuenta que creó la sala.</p></section>`;
    const x = partes(E.clave);
    const estado = E.probando ? "Probando: di una frase y tiene que aparecer escrita aquí."
      : E.fallo ? e(E.fallo)
      : !E.armado ? "Apagado. Sin micrófono, los senadores juzgan solo lo escrito."
      : x.b ? `Oyendo a ${chip(x.b)}` : "Activo, en espera. Se abre cuando una bancada tiene la palabra.";
    return `<section class="voz${E.armado ? " armado" : ""}${x.b ? " oyendo" : ""}"><h2>Micrófono${SIMULAR ? " (simulado)" : ""}</h2>
      <p class="${E.fallo ? "alerta" : "estado"}">${estado}</p>
      <p class="oyendo" id="vozTxt">${e(E.probando ? E.prueba : E.texto ? "…" + E.texto.slice(-160) : "")}</p>
      <div class="fila"><button class="${E.armado ? "on" : ""}" data-a="vozArmar">${E.armado ? "Apagar el micrófono" : "Activar el micrófono"}</button>
        <button class="${E.probando ? "on" : ""}" data-a="vozProbar">${E.probando ? "Detener la prueba" : "Probar"}</button>
        ${E.caida ? '<button data-a="vozReabrir">Reabrir</button>' : ""}</div>
      <p class="ayuda">Activo, sigue a la palabra: oye a la bancada que la tiene y se cierra con «Nadie». Deja este teléfono cerca de quien habla, con la pantalla encendida y esta página a la vista.</p></section>`;
  }
  return { armar, probar, reabrir, sincronizar, html, estado: () => E };
}
