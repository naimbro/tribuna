/* =====================================================================
   TRIBUNA con un solo micrófono — el escenario (index.html), lo que ve la sala en el proyector.
   Es una función del estado: lee la sala, los párrafos y la voz en vivo, y pinta. No decide nada,
   no llama a la IA y se puede recargar en cualquier momento. Lo único que escribe es la sala nueva,
   al elegir una clase en la portada.
   Todo texto que viene de la voz o de la IA entra con textContent: nunca como HTML.
   ===================================================================== */
import { abrirCanal } from "./canal.js?v=20261111b";

const P = new URLSearchParams(location.search);
const LOCAL = P.has("local");
const EXTRA = LOCAL ? "&local=1" : "";
const $ = id => document.getElementById(id);
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
const coma = n => (typeof n === "number" ? String(n).replace(".", ",") : "–");
const E = { canal: null, yo: null, codigo: (P.get("sala") || "").toUpperCase(), sala: null, parrafos: [], voz: null,
  latido: 0, conectado: false, turno: { t0: null, visto: 0 }, firma: {}, vistos: null, vivo: null,
  // la galería: los documentos del público, lo que se publica, las fotos de cada cierre y los puntos
  publicos: [], agg: null, aggEnviado: "", pregEnviadas: "", fotos: {}, porDuelo: {}, tabla: null };

const fase = f => { $("escena").dataset.fase = f; };
function aviso(texto) {
  const a = el("a", "enlace", "Volver al inicio");
  a.href = "index.html" + (LOCAL ? "?local=1" : "");
  $("vAviso").replaceChildren(el("p", "aviso-txt", texto), a);
  fase("aviso");
}

/* ------------------------------ portada ------------------------------ */
function pintarEntrar() {
  const b = el("button", "boton", "Entrar con Google");
  b.onclick = () => E.canal.entrar().catch(e => aviso(e.code === "auth/popup-blocked"
    ? "El navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio y vuelve a intentar."
    : "No se pudo entrar: " + (e.code || e.message)));
  $("vPortada").replaceChildren(el("h1", "marca", "Tribuna"), el("p", "bajada", "Entra con tu cuenta de Google para abrir una clase."), b);
  fase("portada");
}
function pintarPortada() {
  const v = $("vPortada");
  v.replaceChildren(el("h1", "marca", "Tribuna"), el("p", "bajada", "Elige la clase de hoy."));
  const cursos = new Map();
  for (const x of SESIONES) { if (!cursos.has(x.curso)) cursos.set(x.curso, []); cursos.get(x.curso).push(x); }
  for (const [curso, clases] of cursos) {
    const g = el("section", "curso");
    g.append(el("h2", "", curso));
    for (const x of clases) {
      const a = el("a", "clase", x.tema);
      a.href = `index.html?semana=${x.semana}&nueva=1${EXTRA}`;
      g.append(a);
    }
    v.append(g);
  }
  const pie = el("p", "pie-portada");
  if (LOCAL) pie.append(el("span", "", "Modo ensayo: todo queda en este navegador, sin cuentas."));
  else {
    const viejas = el("a", "enlace", "Partidas anteriores y juego clásico"), salir = el("a", "enlace", "Salir");
    viejas.href = "admin.html";
    salir.href = "#";
    salir.onclick = e => { e.preventDefault(); E.canal.salir(); };
    pie.append(viejas, el("span", "", E.yo.email), salir);
  }
  v.append(pie);
  fase("portada");
}
async function crear() {
  const c = { SESION,
    EQUIPOS: typeof EQUIPOS !== "undefined" ? EQUIPOS : null,
    PERSONAJES: typeof PERSONAJES !== "undefined" ? PERSONAJES : null,
    PREGUNTAS: typeof PREGUNTAS !== "undefined" ? PREGUNTAS : null };
  const duelos = Duelo.duelosDe(c);
  if (!duelos.length) return aviso("Esta clase no tiene preguntas para debatir.");
  try {
    const codigo = await E.canal.crearSala(Duelo.salaNueva(c, duelos, Date.now()));
    location.replace(`index.html?sala=${codigo}${EXTRA}`);
  } catch (e) {
    aviso(e.code === "permission-denied" ? `La cuenta ${E.yo.email} no está autorizada para crear salas.`
      : "No se pudo crear la sala: " + (e.message || e.code));
  }
}

/* ------------------------------ la sala ------------------------------ */
function seguir() {
  let primera = true;
  E.canal.escucharSala(E.codigo, s => {
    if (!s) return aviso(`La sala ${E.codigo} no existe, o esta cuenta no puede verla.`);
    // una sala del juego anterior: se abre con su pantalla de siempre
    if (s.modo !== "micro") return location.replace("clasico.html" + location.search);
    const antes = E.sala;
    E.sala = s;
    if (primera) { primera = false; oirResto(); }
    cierres(antes, s);
    pintar();
  });
}
function oirResto() {
  E.canal.escucharParrafos(E.codigo, l => {
    if (!E.vistos) E.vistos = new Set(l.map(p => p.id));        // lo que ya estaba no entra animado
    E.parrafos = l;
    pintarActa();
  });
  E.canal.escucharVoz(E.codigo, v => { E.voz = v; pintarActa(); });
  let inicial = true;
  E.canal.escucharLatido(E.codigo, t => {
    // después del primero se usa la hora de llegada: el reloj del teléfono puede estar corrido
    E.latido = inicial ? t : (t ? Date.now() : 0);
    inicial = false;
    revisarLatido();
  });
  setInterval(revisarLatido, 2000);
  setInterval(pintarTiempos, 500);
  let primerPublico = true;
  E.canal.escucharPublico(E.codigo, l => {
    E.publicos = l;
    if (primerPublico) { primerPublico = false; recuperar(); }
    contar();
  });
  setInterval(publicar, 1500);
}
function revisarLatido() {
  const c = Date.now() - E.latido < 25000;
  if (c === E.conectado) return;
  E.conectado = c;
  if (E.sala && E.sala.fase === "espera") pintar();
}

function pintar() {
  const s = E.sala, d = Duelo.dueloDe(s), raiz = document.documentElement.style;
  raiz.setProperty("--a", d ? d.A.color : "#38bdf8");
  raiz.setProperty("--b", d ? d.B.color : "#fb7185");
  $("escena").dataset.turno = s.fase === "debate" ? s.turno || "" : "";
  const vista = { espera: pintarEspera, debate: pintarDebate, manos: pintarManos, quiz: pintarQuiz, jueces: pintarJueces,
    sintesis: pintarSintesis, fin: pintarFin }[s.fase];
  if (!vista) return aviso("Esta sala quedó en un estado que el escenario no conoce.");
  vista(s, d);
  fase(s.fase);
  if (s.fase === "jueces") ajustarJueces();
}
// solo se rearma una vista cuando cambia lo que muestra
function cambio(vista, datos) {
  const f = JSON.stringify(datos);
  if (E.firma[vista] === f) return false;
  E.firma[vista] = f;
  return true;
}

/* ------------------------------ la galería ------------------------------ */
// El escenario es quien cuenta al público: escucha los documentos de todos (solo la cuenta del
// profesor puede), publica los agregados y guarda la foto de cada cierre. No decide nada: todo
// lo que publica se recalcula de lo guardado, así que se puede recargar.
function contar() {
  const s = E.sala, d = s && Duelo.dueloDe(s), antes = E.agg;
  if (!s) return;
  E.agg = Galeria.agregados(E.publicos, d, s.fase === "quiz" && s.quiz ? s.quiz.i : null);
  // el eco: si un párrafo ganó un aplauso, la luz de su lado respira
  if (antes && d && antes.duelo === E.agg.duelo && s.fase === "debate")
    for (const [id, n] of Object.entries(E.agg.aplausos)) {
      if (n <= (antes.aplausos[id] || 0)) continue;
      const p = E.parrafos.find(x => x.id === id);
      if (p && (p.quien === "A" || p.quien === "B")) eco(p.quien);
    }
  pintarGaleria();
}
function eco(k) {
  const e = $("eco" + k);
  e.classList.remove("late");
  void e.offsetWidth;                          // reinicia la animación
  e.classList.add("late");
}
// cada 1,5 s como mucho, y solo lo que cambió
function publicar() {
  const s = E.sala;
  if (!s || !E.agg) return;
  const f = JSON.stringify(E.agg);
  if (f !== E.aggEnviado) { E.aggEnviado = f; E.canal.publicarGaleria(E.codigo, { ...E.agg, t: Date.now() }).catch(() => {}); }
  const d = Duelo.dueloDe(s);
  if (!d || s.fase !== "debate") return;
  // las preguntas para el profesor van a privado: solo las ve su teléfono, nunca el proyector
  const lista = Galeria.preguntasDe(E.publicos, d, s.grupos), fp = JSON.stringify([d.n, lista]);
  if (fp !== E.pregEnviadas) { E.pregEnviadas = fp; E.canal.guardarPrivado(E.codigo, "preguntas", { duelo: d.n, lista }).catch(() => {}); }
}
// Al cerrarse cada ventana se guarda lo que cada uno tenía: los puntos salen de esa foto, así
// que cambiar la apuesta o la respuesta después no sirve.
function cierres(antes, s) {
  if (!antes) return;
  const d = Duelo.dueloDe(antes) || Duelo.dueloDe(s);
  if (!d) return;
  const n = d.n, f = E.fotos[n] || (E.fotos[n] = {});
  let hubo = false;
  if (antes.fase === "debate" && s.fase === "manos") { f.aplausos = Galeria.fotoAplausos(E.publicos, d); hubo = true; }
  if (antes.fase === "manos" && s.fase === "debate") { delete f.aplausos; hubo = true; }          // se volvió al debate
  if (antes.fase === "manos" && (s.fase === "quiz" || s.fase === "jueces")) { f.apuestas = Galeria.fotoApuestas(E.publicos, d); hubo = true; }
  const q = s.fase === "quiz" ? s.quiz : null;
  if (q && q.estado === "revelada" && !(antes.quiz && antes.quiz.i === q.i && antes.quiz.estado === "revelada")) {
    f.quiz = { ...(f.quiz || {}), [q.i]: Galeria.fotoQuiz(E.publicos, d, q.i) };
    hubo = true;
  }
  if (hubo) E.canal.guardarPrivado(E.codigo, "galeria" + n, f).catch(() => {});
  const ahora = s.duelos.find(x => x.n === n), previo = antes.duelos.find(x => x.n === n);
  if (ahora && ahora.jugado && !(previo && previo.jugado)) puntuar(n).then(publicarTabla);
  contar();
}
// los puntos del duelo n: con su resultado, su foto y lo que el teléfono del profesor guardó aparte
async function puntuar(n) {
  const d = E.sala.duelos.find(x => x.n === n), x = await E.canal.leerPrivado(E.codigo, "duelo" + n).catch(() => null);
  if (!d || !d.jugado || !x) return;
  const datos = { ganador: d.ganador, mejores: x.sintesis ? { A: x.sintesis.mejorA, B: x.sintesis.mejorB } : null,
    usadas: E.sala.usadas || [], claves: (x.quiz || []).map(q => (q ? q.correcta : null)) };
  E.porDuelo[n] = Galeria.puntosDeTodos(E.publicos, d, E.fotos[n], datos);
}
function publicarTabla() {
  if (!Object.keys(E.porDuelo).length) return;
  E.tabla = Galeria.tabla(E.publicos, E.porDuelo, E.sala.grupos);
  E.canal.publicarPuntos(E.codigo, { ...E.tabla, t: Date.now() }).catch(() => {});
  if (E.sala.fase === "espera" || E.sala.fase === "fin") pintar();
}
// al abrir o recargar el escenario: las fotos ya guardadas y los puntos de los duelos jugados
async function recuperar() {
  for (const d of E.sala.duelos) {
    if (!d.jugado && d.n !== E.sala.duelo) continue;
    const f = await E.canal.leerPrivado(E.codigo, "galeria" + d.n).catch(() => null);
    if (f) E.fotos[d.n] = { ...f, ...(E.fotos[d.n] || {}) };
    if (d.jugado) await puntuar(d.n);
  }
  publicarTabla();
}
// lo de la galería que se ve sin rearmar la vista entera
function pintarGaleria() {
  const s = E.sala, a = E.agg;
  if (!s || !a) return;
  if (s.fase !== "debate") { if (s.fase === "espera" || s.fase === "manos" || s.fase === "quiz") pintar(); return; }
  $("gente").textContent = a.n ? `la galería, ${a.n} ${a.n === 1 ? "persona" : "personas"}` : "";
  $("pulso").hidden = a.pulso === null;
  if (a.pulso !== null) {
    $("pulsoPunto").style.left = (50 + a.pulso / 2) + "%";         // −100 es el lado A, a la izquierda
    $("pulsoPunto").dataset.lado = a.pulso < -8 ? "A" : a.pulso > 8 ? "B" : "";
  }
  pintarActa();
}
function tablasEl() {
  const t = E.tabla;
  if (!t || (!t.top.length && !t.grupos.length)) return null;
  const caja = el("div", "tablas");
  const una = (titulo, filas) => {
    if (!filas.length) return;
    const sec = el("section", "tabla");
    sec.append(el("h2", "", titulo));
    for (const [a, b] of filas) { const p = el("p"); p.append(el("span", "", a), el("b", "", b)); sec.append(p); }
    caja.append(sec);
  };
  una("Mejores ojos", t.top.map((x, i) => [`${i + 1}. ${x.nombre}${x.grupo ? ` (${x.grupo})` : ""}`, String(x.total)]));
  una("Mejor grupo en la galería", t.grupos.map((g, i) => [`${i + 1}. ${g.nombre}`, coma(g.promedio)]));
  return caja;
}
function qrDe(url) {
  if (typeof qrcode !== "function") return null;
  const q = qrcode(0, "M");
  q.addData(url); q.make();
  const caja = el("div", "qr");
  caja.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });   // SVG generado aquí, no texto ajeno
  return caja;
}

/* ------------------------------ espera y cierre ------------------------------ */
function listaDuelos(s) {
  const ol = el("ol", "duelos");
  for (const d of s.duelos) {
    const li = el("li", d.jugado ? "jugado" : ""), caja = el("div");
    const vs = el("p", "vs"), a = el("span", "", d.A.nombre), b = el("span", "", d.B.nombre);
    a.style.color = d.A.color; b.style.color = d.B.color;
    vs.append(a, el("i", "", "contra"), b);
    caja.append(el("p", "q", d.pregunta), vs);
    if (d.jugado) caja.append(el("p", "res", Duelo.textoResultado(d)));
    li.append(caja);
    ol.append(li);
  }
  return ol;
}
function pintarEspera(s) {
  const gente = E.agg ? E.agg.n : 0;
  if (!cambio("espera", [s.duelos, E.conectado, gente, E.tabla])) return;
  const izq = el("div"), t = tablasEl();
  izq.append(el("h1", "tema", s.tema), el("p", "del-curso", s.curso), listaDuelos(s));
  if (t) izq.append(t);
  const base = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}`;
  const urlMicro = `${base}micro.html?sala=${E.codigo}&semana=${s.semana}${EXTRA}`, urlGaleria = `${base}galeria.html?sala=${E.codigo}${EXTRA}`;
  // primero se empareja el teléfono del profesor; con él conectado, el QR pasa a ser el de la galería
  const der = el("aside", "parear"), qr = qrDe(E.conectado ? urlGaleria : urlMicro);
  if (qr) der.append(qr);
  der.append(el("p", "", E.conectado ? "Entren a la galería con su teléfono" : "Escanea con tu teléfono: va a ser el micrófono"),
    el("div", "codigo", E.codigo));
  if (E.conectado) der.append(el("p", "gente", gente ? `${gente} en la galería` : "Micrófono conectado. Todavía no entra nadie a la galería."));
  if (LOCAL || !qr) {
    const p = el("p");
    const enlace = (texto, url) => { const a = el("a", "enlace", texto); a.href = url; a.target = "_blank"; p.append(a, " "); };
    if (!E.conectado) enlace("Abrir el micrófono en otra pestaña", urlMicro + (LOCAL ? "&simular=1" : ""));
    else if (LOCAL) for (const yo of ["Ana", "Beto", "Caro"]) enlace("Butaca de " + yo, `${urlGaleria}&yo=${yo.toLowerCase()}`);
    else enlace("Abrir la galería", urlGaleria);
    der.append(p);
  }
  $("vEspera").replaceChildren(izq, der);
}
function pintarFin(s) {
  if (!cambio("fin", [s.duelos, E.tabla])) return;
  const t = tablasEl();
  $("vFin").replaceChildren(el("h1", "tema", s.tema), el("p", "del-curso", "Así terminó la clase"), listaDuelos(s), ...(t ? [t] : []));
}

/* ------------------------------ el debate ------------------------------ */
function pintarDebate(s, d) {
  for (const k of ["A", "B"]) {
    const p = $("placa" + k);
    p.querySelector(".nom").textContent = d[k].nombre;
    p.querySelector(".cargo").textContent = d[k].cargo;
    p.classList.toggle("habla", s.turno === k);
  }
  $("mocion").textContent = d.pregunta;
  // la hora en que ESTE navegador vio empezar el turno: los relojes de los dos aparatos no coinciden
  if (E.turno.t0 !== s.t0turno) {
    const dif = Date.now() - (s.t0turno || 0);
    E.turno = { t0: s.t0turno, visto: E.turno.t0 === null && dif >= 0 && dif < 600000 ? s.t0turno : Date.now() };
  }
  pintarGaleria();
  pintarTiempos();
}
// los aplausos de un párrafo se muestran desde dos
const aplausosVisibles = id => { const n = (E.agg && E.agg.aplausos[id]) || 0; return n >= Galeria.CFG.APLAUSO_VISIBLE ? n : 0; };
function parrafoEl(p, d, conNombre) {
  const e = el("p", "par par-" + p.quien), n = p.quien === "P" ? 0 : aplausosVisibles(p.id);
  if (conNombre && p.quien !== "P") e.append(el("span", "quien", d[p.quien].corto));
  if (n && p.quien === "B") e.append(el("span", "aplausos", "👏 " + n));
  e.append(el("span", "dicho", p.texto));
  if (n && p.quien === "A") e.append(el("span", "aplausos", "👏 " + n));
  return e;
}
function pintarActa() {
  const s = E.sala, d = s && Duelo.dueloDe(s);
  if (!d || s.fase !== "debate") return;
  const ps = Duelo.delDuelo(E.parrafos, d.n).filter(p => (p.texto || "").trim()).slice(-14);
  const cont = $("acta");
  if (!E.vivo) E.vivo = el("p", "par vivo");
  if (cambio("acta", [d.n, ps.map(p => [p.id, p.quien, p.texto, aplausosVisibles(p.id)])])) {
    cont.replaceChildren();
    let previo = null;
    for (const p of ps) {
      const e = parrafoEl(p, d, previo !== p.quien);
      if (E.vistos && !E.vistos.has(p.id)) { e.classList.add("nuevo"); E.vistos.add(p.id); }
      cont.append(e);
      previo = p.quien;
    }
    cont.append(E.vivo);
  }
  const v = E.voz, hay = !!(v && v.duelo === d.n && v.quien && v.quien === s.turno && (v.texto || "").trim());
  const ultimo = ps.length ? ps[ps.length - 1].quien : null;
  E.vivo.hidden = !hay;
  if (hay) {
    E.vivo.className = "par vivo par-" + v.quien;
    E.vivo.replaceChildren();
    if (v.quien !== "P" && ultimo !== v.quien) E.vivo.append(el("span", "quien", d[v.quien].corto));
    E.vivo.append(el("span", "dicho", v.texto));
  }
  let vacio = cont.querySelector(".vacio");
  if (!ps.length && !hay) { if (!vacio) cont.prepend(el("p", "vacio", "Lo que se diga va a aparecer aquí.")); }
  else if (vacio) vacio.remove();
}
function pintarTiempos() {
  const s = E.sala;
  if (!s || s.fase !== "debate") return;
  const t = { A: 0, B: 0, P: 0, ...(s.tiempo || {}) };
  if (s.turno) t[s.turno] += Math.max(0, Date.now() - E.turno.visto);
  $("tA").textContent = Duelo.fmtReloj(t.A);
  $("tB").textContent = Duelo.fmtReloj(t.B);
  $("bA").style.width = (t.A + t.B ? (100 * t.A / (t.A + t.B)) : 50) + "%";
}

/* ------------------------------ el veredicto ------------------------------ */
function nombres(d, cls) {
  const p = el("p", cls), a = el("span", "", d.A.nombre), b = el("span", "", d.B.nombre);
  a.style.color = "var(--a)"; b.style.color = "var(--b)";
  return { p, a, b };
}
function pintarManos(s, d) {
  const est = s.veredicto ? s.veredicto.estado : "deliberando";
  // con gente en la galería se apuesta en el teléfono; sin nadie, manos arriba como siempre
  const juegan = E.publicos.filter(x => Galeria.juega(x.grupo || 0, d)).length, apostaron = E.agg ? E.agg.apostaron : 0;
  if (!cambio("manos", [d.n, est, juegan, apostaron])) return;
  const { p, a, b } = nombres(d, "dos");
  p.append(a, el("i", "", "o"), b);
  $("vManos").replaceChildren(el("p", "gran-pregunta", "¿Quién ganó?"), p,
    el("p", "manos", juegan ? "Apuesten en su teléfono." : "Manos arriba."),
    ...(juegan ? [el("p", "cuenta", `${apostaron} de ${juegan} ya ${apostaron === 1 ? "apostó" : "apostaron"}`)] : []),
    el("p", "delib", est === "listo" ? "Los jueces ya tienen su veredicto." : "Los jueces deliberan…"));
}
// la ronda relámpago: la pregunta y sus alternativas; al revelar, la correcta y cuántos acertaron
function pintarQuiz(s, d) {
  const q = s.quiz;
  if (!q) return;
  const revelada = q.estado === "revelada", respondieron = E.agg ? E.agg.respondieron : 0;
  const foto = ((E.fotos[d.n] || {}).quiz || {})[q.i];
  const r = revelada ? Galeria.resumenQuiz(foto || Galeria.fotoQuiz(E.publicos, d, q.i), q.correcta) : null;
  if (!cambio("quiz", [d.n, q, respondieron, r])) return;
  const ol = el("ol", "alternativas");
  q.opciones.forEach((texto, k) => ol.append(el("li", revelada ? (k === q.correcta ? "correcta" : "otra") : "", texto)));
  $("vQuiz").replaceChildren(
    el("p", "quiz-n", q.total > 1 ? `Ronda relámpago, pregunta ${q.numero} de ${q.total}` : "Ronda relámpago"),
    el("h1", "quiz-q", q.texto), ol,
    el("p", "cuenta", !revelada ? `${respondieron} ya ${respondieron === 1 ? "respondió" : "respondieron"}`
      : r.n ? `Acertó el ${r.pct} % de la galería (${r.bien} de ${r.n}).` : "Nadie alcanzó a responder."));
}
function pintarJueces(s, d) {
  const v = s.veredicto, js = v.jueces, n = js.length, panel = v.panel || { A: {}, B: {} };
  if (cambio("jueces", [d.n, js])) {
    const { p, a, b } = nombres(d, "leyenda");
    p.append(a, b);
    const trib = el("div", "tribunal");
    trib.style.setProperty("--n", n);
    for (const j of js) {
      const voto = typeof j.A === "number" && typeof j.B === "number";
      const art = el("article", "juez" + (voto ? "" : " abst")), cab = el("header");
      cab.append(el("span", "emoji", j.emoji), el("span", "quien", j.nombre));
      art.append(cab);
      for (const k of ["A", "B"]) {
        const f = el("div", "fallo fallo-" + k.toLowerCase());
        f.dataset.juez = j.id; f.dataset.lado = k;
        f.append(el("div", "nota", voto ? coma(j[k]) : "–"), el("p", "frase", voto ? j["frase" + k] : (k === "A" ? "Se abstuvo." : "")));
        art.append(f);
      }
      trib.append(art);
    }
    const r = Duelo.resultadoDe(panel), tot = el("footer", "totales");
    const lado = (k, total) => {
      const t = el("div", "total total-" + k.toLowerCase());
      t.append(el("b", "", d[k].nombre), el("span", "num", coma(total)), el("small", "", "de 30"));
      return t;
    };
    tot.append(lado("A", r.totalA), el("p", "ganador", r.ganador === "empate" ? "Empate" : "Gana " + d[r.ganador].nombre), lado("B", r.totalB),
      el("p", "descarte", "De cada lado se descartan la nota más alta y la más baja."), el("p", "galeria-dijo", ""));
    $("vJueces").replaceChildren(el("h1", "mocion", d.pregunta), p, trib, tot);
  }
  // lo que cambia con cada toque: cuántos jueces se dieron vuelta y si ya se muestra el resultado
  const final = s.paso > n;
  $("vJueces").querySelectorAll(".juez").forEach((a, i) => a.classList.toggle("visto", s.paso > i));
  $("vJueces").querySelectorAll(".fallo").forEach(f => {
    const fuera = final && ((panel[f.dataset.lado] || {}).descartadas || []).includes(f.dataset.juez);
    f.classList.toggle("fuera", fuera);
  });
  $("vJueces").querySelector(".totales").classList.toggle("visible", final);
  // lo que había apostado la galería, junto al resultado
  const gano = Duelo.resultadoDe(panel).ganador, ra = final ? Galeria.resumenApuestas((E.fotos[d.n] || {}).apuestas, gano) : null;
  $("vJueces").querySelector(".galeria-dijo").textContent = !ra ? ""
    : `La galería ${ra.favorito ? `apostó ${ra.pct} % por ${d[ra.favorito].nombre}` : "se partió en dos"}.`
      + (gano === "empate" ? " Con empate, nadie acierta." : ` ${ra.acertaron === 1 ? "Acertó 1" : "Acertaron " + ra.acertaron} de ${ra.n}.`);
}
// Las paletas y las frases usan todo el alto disponible: parten grandes y se achican hasta caber
// (una ventana baja, frases largas). Nunca se corta lo que dijo un juez.
function ajustarJueces() {
  const t = $("vJueces").querySelector(".tribunal");
  if (!t) return;
  let k = 1.35;
  t.style.setProperty("--k", k);
  while (k > 0.5 && t.scrollHeight > t.clientHeight + 1) { k -= 0.05; t.style.setProperty("--k", k.toFixed(2)); }
}
const reajustar = () => { if (E.sala && E.sala.fase === "jueces") ajustarJueces(); };
addEventListener("resize", reajustar);
// cada tipografía que termina de cargar cambia las medidas del texto
if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", reajustar);

function pintarSintesis(s, d) {
  const x = s.sintesis || { disputa: "", fraseA: "", fraseB: "" };
  // cuántos de la galería habían aplaudido el párrafo de donde salió cada cita
  const fotos = Object.values((E.fotos[d.n] || {}).aplausos || {});
  const aplaudieron = k => (x["mejor" + k] ? fotos.filter(l => l.includes(x["mejor" + k])).length : 0);
  if (!cambio("sintesis", [d.n, x, aplaudieron("A"), aplaudieron("B")])) return;
  const citas = el("div", "citas");
  for (const k of ["A", "B"]) {
    const texto = x["frase" + k], n = aplaudieron(k);
    if (!texto) { citas.append(el("div")); continue; }
    const q = el("blockquote", "cita-" + k.toLowerCase(), `«${texto}»`);
    q.append(el("cite", "", d[k].nombre));
    if (n) q.append(el("span", "aplaudieron", n === 1 ? "1 persona de la galería lo aplaudió" : `${n} personas de la galería lo aplaudieron`));
    citas.append(q);
  }
  $("vSintesis").replaceChildren(el("h1", "", "Lo que quedó en disputa"), el("p", "disputa", x.disputa), citas);
}

/* ------------------------------ arranque ------------------------------ */
abrirCanal({ local: LOCAL }).then(canal => {
  E.canal = canal;
  canal.alEntrar(yo => {
    E.yo = yo;
    if (!yo) return pintarEntrar();
    if (E.codigo) return seguir();
    if (P.has("nueva") && typeof SESION !== "undefined") return crear();
    pintarPortada();
  });
}).catch(e => aviso("No se pudo conectar: " + (e.message || e) + ". Revisa la conexión y recarga la página."));
