/* =====================================================================
   TRIBUNA — el profesor modera desde su control (interruptor «Moderas tú», modProfe).
   Mantener para hablar (dictado.js), como el teléfono de quien debate: mientras aprieta, el latido
   va a salas/{codigo}/vivo/moderador (vozprofe.js) y el proyector y los teléfonos muestran el
   subtítulo; al soltar, lo dicho se publica como mensaje del Moderador (las reglas ya dejan que el
   profesor escriba en mensajes). Sin reconocimiento de voz, un campo para escribir como Moderador.
   La cola de la tribuna la arma el proyector (privado/control → cola); aquí se toca para lanzar.
   Las horas que se publican (t del mensaje y del latido) van en el reloj del PROYECTOR (reloj(),
   que pasa control.js): el escenario las compara con su propio reloj y ordena la conversación por t.
   ===================================================================== */
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const TOPE_APRETON = 5 * 60000;   // tope duro de un apretón: pasado, suelta (publicando lo dicho)
const V = { db: null, codigo: "", dato: () => null, mandar: null, reloj: () => Date.now(), listo: false,
  apretado: false, modera: false, desde: 0, toma: null, pointerId: null, timer: null, ultimo: 0, colaFirma: "", enviando: false };

// El debate en el que se habla: abierto y con número (lo que publica el proyector en privado/control).
function debateAbierto() {
  const c = V.dato();
  return c && c.fase === "abierta" && c.debate && c.debate.n ? c : null;
}
const vivoRef = () => doc(V.db, "salas", V.codigo, "vivo", "moderador");
const callar = () => setDoc(vivoRef(), { habla: null }).catch(() => {});
function aviso(t) { const m = $("profeHabla"); m.textContent = t; m.classList.toggle("aviso", !!t); }
// lo que se dice va en un <bdi>: el contenedor es rtl (así se ve el final del texto largo) pero la
// puntuación («¿», «?», «.») queda del lado correcto
function lo(t) {
  const m = $("profeHabla"), b = document.createElement("bdi");
  b.textContent = t; m.replaceChildren(b); m.classList.remove("aviso");
}
function rotular(on) {
  $("btnHablarProfe").classList.toggle("on", on);
  $("hablarProfeT").textContent = on ? "🎙 TE ESCUCHAN" : "🎙 HABLAR";
}

// Publica lo dicho (o escrito) como mensaje del Moderador en el debate `debate` (si sigue abierto).
// Devuelve el aviso de error, o "".
async function publicarMensaje(texto, { voz = true, debate } = {}) {
  const c = debateAbierto();
  if (!c || c.debate.n !== debate) return String(texto || "").trim() ? "Se cerró el debate: no se publicó." : "";
  const m = mensajeProfe({ texto, voz, debate, ronda: c.ronda ?? 0, tramo: c.tramo ?? 0, ahora: V.reloj() });
  if (!m) return "";
  const { id, ...datos } = m;
  try { await setDoc(doc(V.db, "salas", V.codigo, "mensajes", id), datos); return ""; }
  catch (e) { return `No se publicó (${e.code || e.message}): «${texto.slice(0, 120)}»`; }
}

// El latido: al apretar, con texto nuevo y cada PROFE.CADA ms aunque haya silencio.
function latido(forzar = false) {
  const h = V.toma;
  if (!V.apretado || !h) return;
  const ahora = Date.now();
  if (!forzar && ahora - V.ultimo < PROFE.CADA) return;
  V.ultimo = ahora;
  setDoc(vivoRef(), { habla: { debate: h.debate, t0: h.t0 + (V.reloj() - Date.now()), t: V.reloj(), texto: h.texto().slice(-PROFE.TEXTO) } }).catch(() => {});
}

// Cada 200 ms mientras aprieta: si el debate se cerró se descarta; si no, el corte de 60 s y el latido.
function tick() {
  const h = V.toma;
  if (!V.apretado || !h) return;
  const c = debateAbierto();
  if (!c || c.debate.n !== h.debate) { soltar({ enviar: false, avisar: "Se cerró el debate: no se publicó." }); return; }
  if (Date.now() - V.desde > TOPE_APRETON) { soltar({ avisar: "Pasaron 5 minutos: se soltó solo y se publicó lo dicho." }); return; }
  h.tick();
  latido();
}

function empezar(e) {
  if (e) { e.preventDefault(); if (e.button > 0) return; }
  if (V.apretado || !Rec) return;
  const c = debateAbierto();
  if (!c) { aviso("Se habla con el debate abierto."); return; }
  const h = crearToma(Rec, {
    debate: c.debate.n,
    alTexto: t => { if (V.toma === h) { lo(t); latido(); } },
    // el corte de los 60 s: lo dicho hasta ahí sale y la toma sigue escuchando
    alCorte: texto => { publicarMensaje(texto, { debate: h.debate }).then(err => err && aviso(err)); },
    alFallo: (codigo, oyo) => {
      if (V.toma !== h) return;
      const t = codigo === "not-allowed" || codigo === "service-not-allowed" ? "🎤 Permite el micrófono para este sitio y vuelve a apretar."
        : codigo === "audio-capture" ? "🎤 No encontramos el micrófono."
        : codigo === "network" ? "🎤 Sin conexión para reconocer la voz."
        : codigo === "mudo" ? "🎤 El micrófono no responde." : "🎤 Se cortó el micrófono. Vuelve a apretar.";
      soltar({ enviar: oyo, avisar: t });
    }
  });
  // si no abre, dictado.js deja la toma soltada (su reconocedor no reabre otro por su cuenta)
  try { h.empezar(); } catch { aviso("🎤 No se pudo abrir el micrófono. Vuelve a apretar."); return; }
  try { e && e.currentTarget && e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  Object.assign(V, { apretado: true, toma: h, ultimo: 0, desde: Date.now(), pointerId: e ? e.pointerId : null });
  navigator.vibrate?.(20);
  rotular(true);
  lo("");
  latido(true);
  clearInterval(V.timer); V.timer = setInterval(tick, 200);
}

// Al soltar: habla: null en el acto (los alumnos recuperan el botón), luego el final y el mensaje.
// enviar: false descarta (se cerró el debate, se apagó «Moderas tú»).
async function soltar({ enviar = true, avisar = "" } = {}) {
  if (!V.apretado) return;
  const h = V.toma;
  V.apretado = false;
  clearInterval(V.timer); V.timer = null;
  callar();
  rotular(false);
  const { texto } = await h.soltar({ inmediato: !enviar });
  // lo que llegó mientras esperaba el final se ve mientras se publica
  if (enviar && V.toma === h && !V.apretado) lo(texto);
  const err = enviar ? await publicarMensaje(texto, { debate: h.debate }) : "";
  if (V.apretado) { if (err) aviso(err); return; }   // ya volvió a apretar: la toma nueva manda, pero el error se ve
  if (V.toma === h) V.toma = null;
  aviso(err || avisar || (enviar && !texto ? "🎤 No te escuché: mantén apretado mientras hablas." : ""));
}

// La cola de la tribuna (la arma el proyector): tocar lanza, ✕ descarta.
function pintarCola(c) {
  const xs = c.cola || [];
  const firma = JSON.stringify(xs);
  if (firma === V.colaFirma) return;
  V.colaFirma = firma;
  $("colaK").textContent = `✋ Tribuna${xs.length ? ` (${xs.length})` : ""}`;
  const que = { pregunta: "pregunta", fuente: "🤔 la tribuna duda de", mencion: "💬 te habla" };
  $("cola").innerHTML = xs.length ? xs.map(x => `<div class="cola-i">
      <button type="button" class="lanzar" data-id="${esc(x.id)}"><b>${esc(x.nombre || "Alguien")}</b> · ${que[x.tipo] || ""}<small>${esc(x.texto)}</small></button>
      <button type="button" class="b x" data-x="${esc(x.id)}" aria-label="Descartar">✕</button></div>`).join("")
    : `<div class="cola-vacia">Nada por ahora. Aquí llegan las preguntas ✋ del público, los 🤔 y las menciones al moderador.</div>`;
}

// Lo llama control.js en cada foto del proyector.
export function pintarModerar(c, modera) {
  if (modera && !V.modera && !V.apretado) aviso("");   // un aviso viejo no pasa al próximo debate
  V.modera = modera;
  document.body.classList.toggle("modera", modera);
  $("sModera").classList.toggle("oculto", !modera);
  $("sCola").classList.toggle("oculto", !modera);
  if (!modera && V.apretado) soltar({ enviar: false, avisar: c && c.fase === "abierta" ? "Se apagó «Moderas tú»: no se publicó." : "Se cerró el debate: no se publicó." });
  if (modera) pintarCola(c);
}

// Una sola vez por página (conectar puede correr de nuevo al cambiar de cuenta): los listeners no se
// duplican; una segunda llamada solo actualiza la sala y las funciones.
export function prepararModerar({ db, codigo, dato, mandar, reloj }) {
  Object.assign(V, { db, codigo, dato, mandar, ...(reloj ? { reloj } : {}) });
  if (V.listo) return;
  V.listo = true;
  const b = $("btnHablarProfe");
  if (!Rec) {
    b.classList.add("oculto");
    $("sModera").classList.add("sin-voz");
    $("profeEscribe").classList.remove("oculto");
    const enviar = async () => {
      const t = $("profeTx").value.trim(), c = debateAbierto();
      if (!t || V.enviando) return;
      if (!c) { aviso("Se escribe con el debate abierto."); return; }
      V.enviando = true;
      const err = await publicarMensaje(t, { voz: false, debate: c.debate.n });
      V.enviando = false;
      if (!err) $("profeTx").value = "";
      aviso(err);
    };
    $("profeEnviar").onclick = enviar;
    $("profeTx").onkeydown = e => { if (e.key === "Enter" && !e.isComposing) enviar(); };
  } else {
    b.addEventListener("pointerdown", empezar);
    // solo suelta el dedo que apretó (un segundo dedo que se levanta no corta la toma)
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(ev, e => { if (e.pointerId === V.pointerId) soltar(); });
    b.addEventListener("contextmenu", e => e.preventDefault());   // apretar largo no abre menús
    // red de seguridad: el dedo que apretó suelta al levantarse en cualquier parte; el micrófono
    // nunca queda abierto a ciegas
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      document.addEventListener(ev, e => { if (V.apretado && e.pointerId === V.pointerId) soltar(); }, true);
    // se oculta la pestaña: suelta (habla: null en el acto) y publica lo dicho
    document.addEventListener("visibilitychange", () => { if (document.hidden && V.apretado) soltar(); });
    // si cierra la pestaña hablando, lo mejor posible: que nadie se quede con su subtítulo
    window.addEventListener("pagehide", () => { if (V.apretado || V.toma) callar(); });
  }
  $("cola").addEventListener("click", e => {
    const l = e.target.closest("[data-id]"), x = e.target.closest("[data-x]");
    // sin botón: mandar() reescribe el textContent del botón que espera y aplastaría su <b>/<small>.
    // Con otra orden en camino, mandar() no hace nada (P.t).
    if (l) V.mandar("tribuna", l.dataset.id);
    else if (x) V.mandar("descartar", x.dataset.x);
  });
}
