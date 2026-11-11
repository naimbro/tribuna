/* =====================================================================
   TRIBUNA con un solo micrófono — el escenario (index.html), lo que ve la sala en el proyector.
   Es una función del estado: lee la sala, los párrafos y la voz en vivo, y pinta. No decide nada,
   no llama a la IA y se puede recargar en cualquier momento. Lo único que escribe es la sala nueva,
   al elegir una clase en la portada.
   Todo texto que viene de la voz o de la IA entra con textContent: nunca como HTML.
   ===================================================================== */
import { abrirCanal } from "./canal.js?v=20261110a";

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
  latido: 0, conectado: false, turno: { t0: null, visto: 0 }, firma: {}, vistos: null, vivo: null };

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
    E.sala = s;
    if (primera) { primera = false; oirResto(); }
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
  const vista = { espera: pintarEspera, debate: pintarDebate, manos: pintarManos, jueces: pintarJueces,
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
  if (!cambio("espera", [s.duelos, E.conectado])) return;
  const izq = el("div");
  izq.append(el("h1", "tema", s.tema), el("p", "del-curso", s.curso), listaDuelos(s));
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}micro.html?sala=${E.codigo}&semana=${s.semana}${EXTRA}`;
  const der = el("aside", "parear" + (E.conectado ? " conectado" : ""));
  if (typeof qrcode === "function") {
    const q = qrcode(0, "M");
    q.addData(url); q.make();
    const caja = el("div", "qr");
    caja.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });   // SVG generado aquí, no texto ajeno
    der.append(caja);
  }
  der.append(el("p", "", E.conectado ? "Micrófono conectado" : "Escanea con tu teléfono: va a ser el micrófono"),
    el("div", "codigo", E.codigo));
  if (LOCAL || typeof qrcode !== "function") {
    const a = el("a", "enlace", "Abrir el micrófono en otra pestaña");
    a.href = url + (LOCAL ? "&simular=1" : ""); a.target = "_blank";
    const p = el("p"); p.append(a); der.append(p);
  }
  $("vEspera").replaceChildren(izq, der);
}
function pintarFin(s) {
  if (!cambio("fin", s.duelos)) return;
  $("vFin").replaceChildren(el("h1", "tema", s.tema), el("p", "del-curso", "Así terminó la clase"), listaDuelos(s));
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
  pintarActa();
  pintarTiempos();
}
function parrafoEl(p, d, conNombre) {
  const e = el("p", "par par-" + p.quien);
  if (conNombre && p.quien !== "P") e.append(el("span", "quien", d[p.quien].corto));
  e.append(el("span", "dicho", p.texto));
  return e;
}
function pintarActa() {
  const s = E.sala, d = s && Duelo.dueloDe(s);
  if (!d || s.fase !== "debate") return;
  const ps = Duelo.delDuelo(E.parrafos, d.n).filter(p => (p.texto || "").trim()).slice(-14);
  const cont = $("acta");
  if (!E.vivo) E.vivo = el("p", "par vivo");
  if (cambio("acta", [d.n, ps.map(p => [p.id, p.quien, p.texto])])) {
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
  if (!cambio("manos", [d.n, est])) return;
  const { p, a, b } = nombres(d, "dos");
  p.append(a, el("i", "", "o"), b);
  $("vManos").replaceChildren(el("p", "gran-pregunta", "¿Quién ganó?"), p, el("p", "manos", "Manos arriba."),
    el("p", "delib", est === "listo" ? "Los jueces ya tienen su veredicto." : "Los jueces deliberan…"));
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
      el("p", "descarte", "De cada lado se descartan la nota más alta y la más baja."));
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
}
// Si las paletas y las frases no caben (una ventana baja, frases largas), se achican hasta que
// quepan: nunca se corta lo que dijo un juez.
function ajustarJueces() {
  const t = $("vJueces").querySelector(".tribunal");
  if (!t) return;
  let k = 1;
  t.style.setProperty("--k", k);
  while (k > 0.5 && t.scrollHeight > t.clientHeight + 1) { k -= 0.05; t.style.setProperty("--k", k.toFixed(2)); }
}
addEventListener("resize", () => { if (E.sala && E.sala.fase === "jueces") ajustarJueces(); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (E.sala && E.sala.fase === "jueces") ajustarJueces(); });

function pintarSintesis(s, d) {
  const x = s.sintesis || { disputa: "", fraseA: "", fraseB: "" };
  if (!cambio("sintesis", [d.n, x])) return;
  const citas = el("div", "citas");
  for (const k of ["A", "B"]) {
    const texto = x["frase" + k];
    if (!texto) { citas.append(el("div")); continue; }
    const q = el("blockquote", "cita-" + k.toLowerCase(), `«${texto}»`);
    q.append(el("cite", "", d[k].nombre));
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
