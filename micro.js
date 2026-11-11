/* =====================================================================
   TRIBUNA con un solo micrófono — el teléfono del profesor (micro.html).
   Es el único cerebro de la sala: cambia el estado (con las transiciones de duelo.js), abre el
   micrófono (oido.js), llama a los jueces y guarda cada párrafo. El escenario solo lee.
   Cada toque se aplica primero aquí y después se escribe en la sala: el teléfono no espera a la red
   para responder.
   Parámetros: sala, semana; local (ensayo), simular (reconocedor de mentira), ia (IA en el ensayo).
   ===================================================================== */
import { abrirCanal } from "./canal.js?v=20261111b";

const P = new URLSearchParams(location.search);
const LOCAL = P.has("local"), SIMULAR = P.has("simular");
const CODIGO = (P.get("sala") || "").toUpperCase();
const $ = id => document.getElementById(id);
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
const espera = ms => new Promise(r => setTimeout(r, ms));
const E = { canal: null, yo: null, sala: null, ia: false, siguiendo: false,
  remotos: [], mios: new Map(), listos: null,                 // párrafos: los de la sala y los recién dichos
  oido: null, probando: false, pruebaOk: false,
  voz: { quien: null, texto: "" }, vozEnviada: "", vozT: 0, vozTimer: null,
  voltear: false, sello: 0, candado: null,
  sugs: [], iSug: 0, sugDuelo: null, sugT: 0, sugPalabras: 0, sugPidiendo: false,
  secretos: {},                                 // por duelo: { jueces, panel, sintesis, quiz }, fuera de la sala hasta revelarlo
  pregs: null, vistas: new Set() };             // las preguntas de la galería y las que ya entraron a la fila
const CLAVE_PRUEBA = "tribuna_prueba_" + CODIGO;
try { E.pruebaOk = sessionStorage.getItem(CLAVE_PRUEBA) === "1"; } catch (e) { /* sin almacenamiento */ }

const FALLOS = {
  "sin-voz": "Este navegador no reconoce voz. Abre esta página en Chrome.",
  "not-allowed": "Chrome no tiene permiso para usar el micrófono. Toca el candado junto a la dirección, permite el micrófono y recarga la página.",
  "service-not-allowed": "Chrome no tiene permiso para usar el micrófono. Toca el candado junto a la dirección, permite el micrófono y recarga la página.",
  "audio-capture": "El teléfono no encontró un micrófono. Cierra otras apps que lo estén usando y toca un lado para reabrir.",
  "network": "El reconocimiento de voz necesita internet. Revisa la conexión y toca un lado para reabrir.",
  "cortado": "El micrófono se cortó. Toca un lado para reabrir."
};
const fallo = codigo => FALLOS[codigo] || FALLOS.cortado;

const vista = v => { $("micro").dataset.vista = v; };
function mensaje(texto, conEntrar = false) {
  $("mensajeTxt").textContent = texto;
  $("btnEntrar").hidden = !conEntrar;
  vista("mensaje");
}
function franja(texto) {
  $("franjaTxt").textContent = texto || "";
  $("franja").hidden = !texto;
}

/* ------------------------------ estado ------------------------------ */
// Aplica los cambios aquí y los escribe en la sala. Devuelve si había algo que aplicar.
function aplicar(cambios) {
  if (!cambios) return false;
  Object.assign(E.sala, cambios);
  pintar();
  E.canal.cambiarSala(CODIGO, cambios).catch(e => franja(e.code === "permission-denied"
    ? "Esta cuenta no puede dirigir esta sala. Entra con la cuenta que la abrió en el notebook."
    : "No se pudo guardar el último cambio. Revisa la conexión."));
  return true;
}
// los párrafos de la sala más los que este teléfono acaba de cerrar y aún no vuelven por el canal
function parrafos() {
  const m = new Map(E.remotos.map(p => [p.id, p]));
  for (const [id, p] of E.mios) if (!m.has(id)) m.set(id, p);
  return [...m.values()];
}
const delDuelo = () => Duelo.delDuelo(parrafos(), E.sala.duelo);
const contexto = () => ({ curso: SESION.curso || "", comun: typeof JUECES_COMUN === "string" ? JUECES_COMUN : "",
  conceptos: typeof CONCEPTOS !== "undefined" ? CONCEPTOS : [] });

/* ------------------------------ la voz ------------------------------ */
// frases para ensayar sin hablar (?simular=1)
const GUION = {
  A: ["sostengo que esto es una revolución de la productividad comparable a la electricidad",
      "la estimación es de entre cero coma ocho y uno coma tres puntos por año y es un piso",
      "el desfase ya se está cumpliendo las empresas están reorganizando su trabajo",
      "concedo que al principio las ganancias se concentran pero después se difunden"],
  B: ["no más de cero coma sesenta y seis por ciento en diez años eso dice la misma fórmula",
      "solo una fracción pequeña de las tareas es rentable de automatizar hoy",
      "aunque suba la productividad el carro no está repartiendo a los trabajadores",
      "reconozco que medio punto no es poco pero no es una revolución"],
  P: ["y por qué esta vez el desfase sería distinto", "qué responde el otro lado a esa cifra"],
  prueba: ["probando el micrófono uno dos tres"]
};
const iGuion = { A: 0, B: 0, P: 0, prueba: 0 };
function fraseDeEnsayo() {
  const k = E.probando ? "prueba" : (E.sala && E.sala.turno) || "P";
  return GUION[k][iGuion[k]++ % GUION[k].length];
}
function armarOido() {
  const Rec = SIMULAR ? recSimulado(fraseDeEnsayo) : (window.SpeechRecognition || window.webkitSpeechRecognition || null);
  E.oido = crearOido({ Rec, toma: crearToma, alTexto, alParrafo, alFallo });
  setInterval(() => E.oido.tick(), 200);
}
function alTexto(v) {
  if (E.probando) { if (v.texto) $("pruebaTxt").textContent = v.texto; return; }
  E.voz = v;
  $("oyendo").textContent = v.texto ? "…" + v.texto.slice(-70) : "";
  publicarVoz();
}
// la voz en vivo va al escenario cada 700 ms como mucho; el vaciado (cambio de lado, pausa) no espera
function publicarVoz() {
  const enviar = () => {
    E.vozTimer = null;
    const v = E.voz, clave = (v.quien || "") + "|" + v.texto;
    if (clave === E.vozEnviada || !E.sala) return;
    E.vozEnviada = clave; E.vozT = Date.now();
    E.canal.publicarVoz(CODIGO, { duelo: E.sala.duelo, quien: v.quien, texto: v.texto, t: Date.now() }).catch(() => {});
  };
  if (!E.voz.texto) { clearTimeout(E.vozTimer); return enviar(); }
  if (!E.vozTimer) E.vozTimer = setTimeout(enviar, Math.max(0, 700 - (Date.now() - E.vozT)));
}
function alParrafo(p) {
  const s = E.sala;
  if (E.probando || !s || !s.duelo) return;
  if (E.voltear && (p.quien === "A" || p.quien === "B")) p = { ...p, quien: Duelo.otro(p.quien) };
  const id = "v" + p.t0.toString(36) + Math.random().toString(36).slice(2, 6);
  const dato = { duelo: s.duelo, ...p };
  E.mios.set(id, { id, ...dato });
  E.canal.agregarParrafo(CODIGO, id, dato).catch(() => franja("No se pudo guardar lo último que se dijo. Revisa la conexión."));
  talVezSugerir();
}
function alFallo(codigo) {
  franja(fallo(codigo));
  if (E.probando) { E.probando = false; $("btnProbar").textContent = "Probar el micrófono"; return; }
  if (E.sala) aplicar(Duelo.pausar(E.sala, Date.now()));
}
// el micrófono sigue al turno de la sala
function sincronizarOido() {
  const t = E.sala.fase === "debate" ? E.sala.turno : null;
  if (!t) return E.oido.cerrar();
  if (!E.oido.abrir(t)) aplicar(Duelo.pausar(E.sala, Date.now()));
}

/* ------------------------------ acciones ------------------------------ */
function empezar(n) {
  if (!aplicar(Duelo.empezarDuelo(E.sala, n, Date.now()))) return;
  pedirCandado();
}
function darPalabra(k) {
  franja("");
  if (aplicar(Duelo.darPalabra(E.sala, k, Date.now()))) sincronizarOido();
}
function salirDelDuelo() {
  E.oido.cerrar();
  aplicar(Duelo.salirDelDuelo(E.sala, Date.now()));
}
// «Era del otro lado»: lo que se está diciendo (o lo último que se dijo) pasa al otro lado, y si
// un lado tiene la palabra, la palabra pasa también: es el olvido típico de no haber cambiado.
function eraDelOtro() {
  const s = E.sala, t = s.turno;
  // el tiempo de palabra de ese párrafo también era del otro lado
  const pasarTiempo = (de, p) => {
    const dt = Math.max(0, (p.t || 0) - (p.t0 || 0)), tiempo = { A: 0, B: 0, P: 0, ...(E.sala.tiempo || {}) };
    tiempo[Duelo.otro(de)] += Math.min(dt, tiempo[de]);
    tiempo[de] = Math.max(0, tiempo[de] - dt);
    aplicar({ tiempo });
  };
  if (t === "A" || t === "B") {
    const antes = E.mios.size;
    E.voltear = true;
    darPalabra(Duelo.otro(t));                  // cierra el párrafo abierto, que sale ya del otro lado
    E.voltear = false;
    if (E.mios.size > antes) return pasarTiempo(t, [...E.mios.values()].pop());
  }
  const u = Duelo.ultimoDeLados(delDuelo());
  if (!u) return;
  const quien = Duelo.otro(u.quien);
  pasarTiempo(u.quien, u);
  u.quien = quien;
  if (E.mios.has(u.id)) E.mios.get(u.id).quien = quien;
  E.canal.corregirParrafo(CODIGO, u.id, { quien }).catch(() => franja("No se pudo corregir. Revisa la conexión."));
  $("oyendo").textContent = "Corregido: era de " + Duelo.dueloDe(s)[quien].corto;
}
function pedirVeredicto() {
  const s = E.sala;
  if (s.fase !== "debate") return;
  E.oido.cerrar();
  const w = Duelo.palabrasPorLado(delDuelo());
  if (w.A + w.B < Duelo.CFG.MIN_PALABRAS && !confirm("Casi no hay transcripción de este duelo. ¿Pedir el veredicto igual?")) {
    aplicar(Duelo.pausar(s, Date.now()));
    return;
  }
  if (aplicar(Duelo.pedirVeredicto(s, Date.now()))) deliberar();
}
function volverAlDebate() {
  E.sello++;                                    // la deliberación en curso ya no cuenta
  aplicar(Duelo.volverAlDebate(E.sala));
}

/* ------------------------------ los jueces ------------------------------ */
// Un juez: 45 s en total y un reintento. Si no alcanza o responde algo ilegible, se abstiene.
function unJuez(juez, d, ps, ctx) {
  const intentos = (async () => {
    for (let i = 0; i < 2; i++) {
      try {
        const crudo = Duelo.jsonEn(await E.canal.pedirLLM(Duelo.promptJuezVoz(juez, d, ps, ctx), "jurado"));
        const r = Duelo.conFrases(leerJuez(crudo), crudo);
        if (r) return Duelo.fichaJuez(juez, r);
      } catch (e) { console.warn("juez " + juez.id + ":", e); }
    }
    return Duelo.fichaJuez(juez, null);
  })();
  return Promise.race([intentos, espera(45000).then(() => Duelo.fichaJuez(juez, null))]);
}
async function deliberar() {
  await E.listos;                               // al recargar: que ya estén los párrafos de la sala
  const d = Duelo.dueloDe(E.sala), n = d.n, sello = ++E.sello, ps = delDuelo(), jueces = juecesDeLaSesion();
  let fichas, sintesis, quiz;
  if (E.ia) {
    const ctx = contexto();
    const pS = E.canal.pedirLLM(Duelo.promptSintesis(d, ps, ctx), "jurado")
      .then(t => Duelo.leerSintesis(Duelo.jsonEn(t))).catch(e => { console.warn("síntesis:", e); return null; });
    // la ronda relámpago para la galería: si falla o no alcanza, simplemente no hay ronda
    const pQ = E.canal.pedirLLM(Galeria.promptQuiz(d, Duelo.transcripcionDe(ps, d, 28000)), "jurado")
      .then(t => Galeria.leerQuiz(Duelo.jsonEn(t))).catch(e => { console.warn("ronda:", e); return []; });
    [fichas, sintesis, quiz] = await Promise.all([Promise.all(jueces.map(j => unJuez(j, d, ps, ctx))),
      Promise.race([pS, espera(60000).then(() => null)]), Promise.race([pQ, espera(60000).then(() => [])])]);
  } else {                                      // ensayo sin IA: notas de mentira, que lo dicen
    await espera(2500);
    fichas = Duelo.juecesDeEnsayo(jueces, ps);
    sintesis = Duelo.sintesisDeEnsayo(ps, d);
    quiz = Galeria.quizDeEnsayo(ps, d);
  }
  const s = E.sala;
  if (sello !== E.sello || s.fase !== "manos" || s.duelo !== n) return;      // se volvió al debate
  // El veredicto no entra a la sala todavía (la sala la lee cualquier inscrito): se guarda aparte
  // y `siguiente` lo trae cuando ya cerraron las apuestas y la ronda.
  const cambios = Duelo.recibirVeredicto(s, fichas);
  if (cambios && cambios.veredicto.estado === "listo") {
    E.secretos[n] = { jueces: fichas, panel: panelJueces(fichas), sintesis: Duelo.conMejores(sintesis, ps, d), quiz: quiz.map(q => Galeria.barajar(q)) };
    guardarSecreto(n);
  }
  aplicar(cambios);
}
function guardarSecreto(n) {
  const d = E.sala.duelos.find(x => x.n === n);
  E.canal.guardarPrivado(CODIGO, "duelo" + n, { n, pregunta: d.pregunta, ...E.secretos[n], t: Date.now() })
    .catch(() => franja("No se pudo guardar el veredicto. Revisa la conexión."));
}
// El teléfono se recargó con el veredicto ya listo: lo trae de vuelta. Si no está, delibera de nuevo.
async function recuperarSecreto(n) {
  const x = await E.canal.leerPrivado(CODIGO, "duelo" + n).catch(() => null);
  if (x && Array.isArray(x.jueces) && x.panel) {
    E.secretos[n] = { jueces: x.jueces, panel: x.panel, sintesis: x.sintesis || null, quiz: x.quiz || [] };
    return pintar();
  }
  if (E.sala.fase === "manos" && E.sala.duelo === n) { aplicar({ veredicto: { estado: "deliberando" } }); deliberar(); }
}

/* ------------------------------ sugerencias ------------------------------ */
function prepararSugerencias(d) {
  if (E.sugDuelo === d.n) return;
  const w = Duelo.palabrasPorLado(delDuelo());
  Object.assign(E, { sugDuelo: d.n, iSug: 0, sugT: Date.now(), sugPalabras: w.A + w.B + w.P, vistas: new Set(),
    sugs: Duelo.sugerenciasDossier(typeof CONCEPTOS !== "undefined" ? CONCEPTOS : [], d) });
  recibirPreguntas(E.pregs);
}
// Las preguntas de la galería (las pasa el escenario por privado/preguntas) entran a la misma
// fila que las sugeridas, justo después de la que el profesor está leyendo: no se la cambian.
function recibirPreguntas(x) {
  const s = E.sala, d = s && Duelo.dueloDe(s);
  if (!x || !d || x.duelo !== d.n || E.sugDuelo !== d.n) return;
  let nuevas = 0;
  for (const q of x.lista || []) {
    if (!q || !q.id || E.vistas.has(q.id)) continue;
    E.vistas.add(q.id);
    E.iSug = E.sugs.length ? E.iSug % E.sugs.length : 0;
    E.sugs.splice(E.sugs.length ? E.iSug + 1 + nuevas : 0, 0, { origen: "galeria", ...q });
    nuevas++;
  }
  if (nuevas) pintarSug();
}
async function talVezSugerir() {
  const s = E.sala, d = s && Duelo.dueloDe(s);
  if (!E.ia || E.sugPidiendo || !d || s.fase !== "debate") return;
  const ps = delDuelo(), w = Duelo.palabrasPorLado(ps), palabras = w.A + w.B + w.P;
  if (!Duelo.tocaSugerir({ palabras, palabrasUltima: E.sugPalabras, ahora: Date.now(), tUltima: E.sugT })) return;
  Object.assign(E, { sugPidiendo: true, sugPalabras: palabras, sugT: Date.now() });
  try {
    const dossier = E.sugs.filter(x => x.origen === "dossier");
    const sug = Duelo.leerSugerencia(Duelo.jsonEn(await E.canal.pedirLLM(Duelo.promptSugerencia(d, ps, dossier), "sociedad")));
    if (sug && E.sugDuelo === d.n) { E.iSug = E.sugs.length ? E.iSug % E.sugs.length : 0; E.sugs.splice(E.iSug, 0, sug); pintarSug(); }
  } catch (e) { console.warn("sugerencia:", e); }
  E.sugPidiendo = false;
}
function pintarSug() {
  const d = Duelo.dueloDe(E.sala), x = E.sugs.length ? E.sugs[E.iSug % E.sugs.length] : null;
  $("sug").hidden = !x || !d;
  if (!x || !d) return;
  const deGaleria = x.origen === "galeria", usada = deGaleria && (E.sala.usadas || []).includes(x.id);
  $("sugTxt").textContent = deGaleria ? `🙋 De ${x.nombre}${x.grupo ? ` (${x.grupo})` : ""}: ${x.texto}`
    : `${x.origen === "dossier" ? "⚡" : "💡"} ${x.para === "ambos" ? "Para los dos" : "Para " + d[x.para].corto}: ${x.texto}`;
  $("btnOtra").hidden = E.sugs.length < 2;
  $("btnLaUso").hidden = !deGaleria;
  $("btnLaUso").disabled = usada;
  $("btnLaUso").textContent = usada ? "Usada" : "La uso";
}

/* ------------------------------ pintar ------------------------------ */
function pintar() {
  const s = E.sala;
  if (!s) return;
  const d = Duelo.dueloDe(s), raiz = document.documentElement.style;
  raiz.setProperty("--a", d ? d.A.color : "#38bdf8");
  raiz.setProperty("--b", d ? d.B.color : "#fb7185");
  if (s.fase === "espera") {
    if (!E.pruebaOk) return vista("prueba");
    pintarDuelos(s);
    return vista("duelos");
  }
  if (s.fase === "debate") { pintarDebate(s, d); return vista("debate"); }
  if (s.fase === "manos" || s.fase === "quiz" || s.fase === "jueces" || s.fase === "sintesis") { pintarVeredicto(s); return vista("veredicto"); }
  if (s.fase === "fin") return vista("fin");
  mensaje("Esta sala quedó en un estado que el teléfono no conoce.");
}
function pintarDuelos(s) {
  $("duelosTema").textContent = s.tema;
  const lista = $("duelosLista");
  lista.replaceChildren();
  for (const d of s.duelos) {
    const b = el("button", "duelo"), vs = el("span", "vs"), a = el("span", "", d.A.corto), c = el("span", "", d.B.corto);
    a.style.color = d.A.color; c.style.color = d.B.color;
    vs.append(a, el("i", "", "contra"), c);
    b.append(vs, el("span", "q", d.pregunta));
    if (d.jugado) {
      b.disabled = true;
      b.append(el("span", "res", Duelo.textoResultado(d)));
    } else {
      b.append(el("span", "ir", d.tiempo ? "Seguir este duelo" : "Empezar este duelo"));
      b.onclick = () => empezar(d.n);
    }
    lista.append(b);
  }
}
function pintarDebate(s, d) {
  prepararSugerencias(d);
  for (const k of ["A", "B"]) {
    const b = $("lado" + k);
    b.querySelector(".nom").textContent = d[k].corto;
    b.querySelector(".est").textContent = s.turno === k ? "tiene la palabra" : "toca para darle la palabra";
    b.classList.toggle("activo", s.turno === k);
    b.setAttribute("aria-pressed", s.turno === k);
  }
  $("btnYo").classList.toggle("activo", s.turno === "P");
  $("btnYo").setAttribute("aria-pressed", s.turno === "P");
  $("btnYo").querySelector(".est").textContent = s.turno === "P" ? "estás preguntando" : s.turno ? "" : "micrófono en pausa";
  pintarSug();
}
function pintarVeredicto(s) {
  const e = Duelo.etiquetaSiguiente(s, E.secretos[s.duelo]);
  $("veredictoQue").textContent = e.texto;
  $("btnSiguiente").disabled = !e.listo;
  $("btnSaltar").hidden = !Number.isInteger(e.pregunta);       // solo antes de lanzar una pregunta
  $("btnVolver").hidden = s.fase !== "manos";
  $("btnReintentar").hidden = !(s.fase === "manos" && s.veredicto && s.veredicto.estado === "sin_quorum");
}

/* ------------------------------ aparato ------------------------------ */
// la pantalla no se apaga durante un duelo
async function pedirCandado() {
  try {
    if (!navigator.wakeLock || E.candado) return;
    E.candado = await navigator.wakeLock.request("screen");
    E.candado.addEventListener("release", () => { E.candado = null; });
  } catch (e) { /* sin permiso o sin batería: no es grave */ }
}
// Un botón que hay que mantener apretado: para lo que no se debe tocar sin querer.
function mantener(boton, ms, hecho) {
  let t = null;
  const soltar = () => { clearTimeout(t); t = null; boton.classList.remove("apretado"); };
  boton.addEventListener("pointerdown", e => {
    e.preventDefault();
    boton.classList.add("apretado");
    t = setTimeout(() => { soltar(); hecho(); }, ms);
  });
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) boton.addEventListener(ev, soltar);
  boton.addEventListener("contextmenu", e => e.preventDefault());
  boton.addEventListener("keydown", e => { if (e.key === "Enter") hecho(); });       // con teclado, directo
}
function enlazar() {
  $("franjaCerrar").onclick = () => franja("");
  $("btnEntrar").onclick = () => E.canal.salir().then(() => E.canal.entrar())
    .catch(e => mensaje("No se pudo entrar: " + (e.code || e.message), true));
  $("btnProbar").onclick = () => {
    if (E.probando) { E.oido.cerrar(); E.probando = false; $("btnProbar").textContent = "Probar el micrófono"; return; }
    franja("");
    $("pruebaTxt").textContent = "";
    E.probando = true;
    if (E.oido.abrir("P")) $("btnProbar").textContent = "Detener la prueba";
    else E.probando = false;
  };
  $("btnSeOye").onclick = () => {
    if (E.probando) { E.oido.cerrar(); E.probando = false; $("btnProbar").textContent = "Probar el micrófono"; }
    E.pruebaOk = true;
    try { sessionStorage.setItem(CLAVE_PRUEBA, "1"); } catch (e) { /* sin almacenamiento */ }
    pintar();
  };
  $("btnCerrar").onclick = () => aplicar(Duelo.cerrarClase(E.sala));
  $("btnReabrir").onclick = () => aplicar(Duelo.reabrirClase(E.sala));
  $("btnSalir").onclick = salirDelDuelo;
  $("ladoA").onclick = () => darPalabra("A");
  $("ladoB").onclick = () => darPalabra("B");
  $("btnYo").onclick = () => darPalabra("P");
  $("btnOtra").onclick = () => { E.iSug++; pintarSug(); };
  $("btnOtroLado").onclick = eraDelOtro;
  mantener($("btnVeredicto"), 1000, pedirVeredicto);
  $("btnSiguiente").onclick = () => aplicar(Duelo.siguiente(E.sala, E.secretos[E.sala.duelo]));
  $("btnSaltar").onclick = () => {
    const n = E.sala.duelo, x = E.secretos[n], e = Duelo.etiquetaSiguiente(E.sala, x);
    if (!x || !Number.isInteger(e.pregunta)) return;
    x.quiz[e.pregunta] = null;                  // saltada: no se lanza y no da puntos
    guardarSecreto(n);
    pintar();
  };
  $("btnLaUso").onclick = () => {
    const x = E.sugs.length ? E.sugs[E.iSug % E.sugs.length] : null;
    if (x && x.origen === "galeria") aplicar(Duelo.usarPregunta(E.sala, x.id));
  };
  $("btnVolver").onclick = volverAlDebate;
  $("btnReintentar").onclick = () => { if (aplicar(Duelo.reintentar(E.sala))) deliberar(); };
  const red = () => { $("sinRed").hidden = navigator.onLine; };
  addEventListener("online", red); addEventListener("offline", red); red();
  document.addEventListener("visibilitychange", () => {
    const s = E.sala;
    if (!s) return;
    if (document.visibilityState === "visible") { if (s.fase !== "espera" && s.fase !== "fin") pedirCandado(); return; }
    // con la pantalla apagada o en otra app, Chrome corta el micrófono: mejor dejarlo en pausa a la vista
    if (s.turno) { E.oido.cerrar(); aplicar(Duelo.pausar(s, Date.now())); }
  });
}

/* ------------------------------ arranque ------------------------------ */
function seguir() {
  if (E.siguiendo) return;
  E.siguiendo = true;
  let listo;
  E.listos = new Promise(r => { listo = r; });
  E.canal.escucharParrafos(CODIGO, l => { E.remotos = l; listo(); });
  E.canal.escucharPrivado(CODIGO, "preguntas", x => { E.pregs = x; recibirPreguntas(x); });
  let primera = true;
  E.canal.escucharSala(CODIGO, s => {
    if (!s) return mensaje(`La sala ${CODIGO} no existe, o esta cuenta no puede verla.`, !E.canal.local);
    if (s.modo !== "micro") return mensaje("Esta sala es del juego clásico y se dirige desde su propio control.");
    if (!E.canal.local && s.profeUid !== E.yo.uid)
      return mensaje("Esta sala la abrió otra cuenta. Entra con la misma cuenta de Google que usaste en el notebook.", true);
    if (s.semana !== SESION.semana) return mensaje("La dirección no corresponde a esta sala. Vuelve a escanear el código QR del escenario.");
    E.sala = s;
    if (primera) {
      primera = false;
      if (s.turno) aplicar(Duelo.pausar(s, s.t0turno));          // al recargar, el micrófono vuelve en pausa
      if (s.fase === "manos" && s.veredicto && s.veredicto.estado === "deliberando") deliberar();
      if ((s.fase === "manos" || s.fase === "quiz") && s.veredicto && s.veredicto.estado === "listo") recuperarSecreto(s.duelo);
      if (s.fase !== "espera" && s.fase !== "fin") pedirCandado();
    }
    pintar();
  });
  const latir = () => E.canal.latido(CODIGO).catch(() => {});
  latir();
  setInterval(latir, 10000);
}

abrirCanal({ local: LOCAL, ia: P.has("ia") }).then(async canal => {
  E.canal = canal;
  if (!CODIGO) return mensaje("Abre esta página escaneando el código QR del escenario.");
  if (typeof SESION === "undefined") return mensaje("Falta la clase en la dirección. Vuelve a escanear el código QR del escenario.");
  E.ia = await canal.conIA();
  armarOido();
  enlazar();
  canal.alEntrar(yo => {
    E.yo = yo;
    if (!yo) return mensaje("Entra con la misma cuenta de Google que abrió la clase en el notebook.", true);
    seguir();
  });
}).catch(e => mensaje("No se pudo conectar: " + (e.message || e) + ". Revisa la conexión y recarga la página."));
