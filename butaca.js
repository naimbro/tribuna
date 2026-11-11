/* =====================================================================
   TRIBUNA — la butaca: el teléfono de un estudiante en la galería (galeria.html).
   Lee la sala, la transcripción, la voz en vivo y los agregados; escribe UN documento, el suyo
   (publico/{uid}), con sus aplausos, su pulso, su pregunta, su apuesta y sus respuestas.
   No decide nada del debate y no ve nada secreto: el veredicto y la alternativa correcta llegan a
   la sala recién cuando el profesor los revela.
   Parámetros: sala; local (ensayo) y yo (quién es esta pestaña en el ensayo).
   ===================================================================== */
import { abrirCanal } from "./canal.js?v=20261111a";

const P = new URLSearchParams(location.search);
const LOCAL = P.has("local"), CODIGO = (P.get("sala") || "").toUpperCase();
const $ = id => document.getElementById(id);
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
const E = { canal: null, yo: null, sala: null, jugador: null, mio: { pos: 0, d: {} }, dentro: false,
  parrafos: [], voz: null, agg: null, puntos: null, firma: {}, vivo: null, pulsoTimer: null, notaTimer: null };

const vista = v => { $("butaca").dataset.vista = v; };
function mensaje(texto, conEntrar = false) {
  $("msgTxt").textContent = texto;
  $("btnEntrar").hidden = !conEntrar;
  vista("mensaje");
}
function nota(texto) {
  $("nota").textContent = texto;
  $("nota").hidden = false;
  clearTimeout(E.notaTimer);
  E.notaTimer = setTimeout(() => { $("nota").hidden = true; }, 3000);
}
function cambio(clave, datos) {
  const f = JSON.stringify(datos);
  if (E.firma[clave] === f) return false;
  E.firma[clave] = f;
  return true;
}
const grupo = () => (E.jugador && E.jugador.grupo) || 0;
const nombre = () => (E.jugador && E.jugador.nombre) || "";
const duelo = () => Duelo.dueloDe(E.sala);
const juega = () => { const d = duelo(); return !!d && Galeria.juega(grupo(), d); };
const puntosMios = () => (E.puntos && E.puntos.porUid && E.puntos.porUid[E.yo.uid]) || { total: 0, duelos: {} };
// lo mío en el duelo en curso
function lo() {
  const n = E.sala.duelo;
  if (!E.mio.d[n]) E.mio.d[n] = { ap: { A: [], B: [] }, pulso: null, apuesta: null, q: "", t: 0, quiz: {} };
  return E.mio.d[n];
}
function guardar() {
  E.canal.escribirPublico(CODIGO, { pos: E.mio.pos || 0, nombre: nombre(), grupo: grupo(), t: Date.now(), d: E.mio.d })
    .catch(() => nota("No se pudo guardar. Revisa tu conexión."));
}

/* ------------------------------ entrar ------------------------------ */
function pintarGrupos(s) {
  const lista = $("grupos");
  lista.replaceChildren();
  for (const g of s.grupos) {
    const b = el("button", "opcion");
    const n = el("b", "", g.nombre);
    n.style.color = g.color;
    b.append(n);
    b.onclick = () => entrar(g.n);
    lista.append(b);
  }
  vista("grupo");
}
async function entrar(g) {
  const n = Galeria.nombreCorto(E.yo.nombre || String(E.yo.email || "").split("@")[0]);
  try { await E.canal.entrarGaleria(CODIGO, { nombre: n, grupo: g }); }
  catch (e) { return mensaje("No se pudo entrar a la galería: " + (e.code || e.message || e)); }
  E.jugador = { nombre: n, grupo: g };
  adentro();
}
async function adentro() {
  const guardado = await E.canal.leerPublico(CODIGO).catch(() => null);
  E.mio = { pos: (guardado && guardado.pos) || 0, d: (guardado && guardado.d) || {} };
  E.dentro = true;
  guardar();                                    // que el escenario lo cuente desde ya
  E.canal.escucharParrafos(CODIGO, l => { E.parrafos = l; pintarFlujo(); });
  E.canal.escucharVoz(CODIGO, v => { E.voz = v; pintarFlujo(); });
  E.canal.escucharGaleria(CODIGO, a => { E.agg = a; pintarFlujo(); });
  E.canal.escucharPuntos(CODIGO, p => { E.puntos = p; pintar(); });
  pintar();
}

/* ------------------------------ pintar ------------------------------ */
function pintar() {
  const s = E.sala;
  if (!s || !E.dentro) return;
  const d = duelo(), raiz = document.documentElement.style, pts = puntosMios().total;
  raiz.setProperty("--a", d ? d.A.color : "#38bdf8");
  raiz.setProperty("--b", d ? d.B.color : "#fb7185");
  for (const id of ["pts1", "pts2", "pts3", "pts4"]) $(id).textContent = pts === 1 ? "1 punto" : pts + " puntos";
  if (s.fase === "espera" || s.fase === "fin") { pintarEspera(s); return vista("espera"); }
  if (s.fase === "debate") { pintarDebate(s, d); return vista("debate"); }
  if (juega() && s.fase === "manos") { pintarApuesta(d); return vista("apuesta"); }
  if (juega() && s.fase === "quiz" && s.quiz) { pintarQuiz(s); return vista("quiz"); }
  pintarMirar(s, d);
  vista("mirar");
}
// «+3 por la apuesta», etc.: lo que dio un duelo
function desglose(p) {
  const caja = el("div", "ganado");
  const fila = (texto, n, cls) => { const f = el("p", cls || ""); f.append(el("span", "", texto), el("span", "", "+" + n)); caja.append(f); };
  if (p.apuesta) fila("Acertaste la apuesta", p.apuesta);
  if (p.aplausos) fila("Aplaudiste el mejor argumento", p.aplausos);
  if (p.pregunta) fila("El profesor usó tu pregunta", p.pregunta);
  if (p.quiz) fila("Ronda relámpago", p.quiz);
  fila(p.total ? "Este duelo" : "Este duelo no sumaste", p.total, "total");
  return caja;
}
function tablas() {
  const t = E.puntos, caja = $("tablas");
  caja.replaceChildren();
  if (!t) return;
  const una = (titulo, filas) => {
    if (!filas.length) return;
    const s = el("section", "tabla");
    s.append(el("h2", "", titulo));
    filas.forEach(([a, b], i) => { const p = el("p"); p.append(el("span", "", `${i + 1}. ${a}`), el("b", "", b)); s.append(p); });
    caja.append(s);
  };
  una("Mejores ojos", (t.top || []).map(x => [x.grupo ? `${x.nombre} (${x.grupo})` : x.nombre, String(x.total)]));
  una("Mejor grupo en la galería", (t.grupos || []).map(g => [g.nombre, String(g.promedio).replace(".", ",")]));
}
function pintarEspera(s) {
  const g = (s.grupos || []).find(x => x.n === grupo());
  $("quien").textContent = g ? `${nombre()}, grupo ${g.corto}` : nombre();
  const jugados = s.duelos.filter(d => d.jugado);
  $("esperaTit").textContent = s.fase === "fin" ? "La clase terminó" : jugados.length ? "Viene el próximo duelo" : "Ya estás en la galería";
  $("esperaTxt").textContent = s.fase === "fin" ? "Así quedó la galería." : "Cuando empiece el debate lo vas a ver aquí, lado por lado.";
  const ultimo = jugados.length ? jugados[jugados.length - 1] : null, p = ultimo && puntosMios().duelos[ultimo.n];
  $("ganadoAntes").replaceChildren(...(p ? [desglose(p)] : []));
  tablas();
}
function pintarDebate(s, d) {
  const puede = juega(), x = puede ? lo() : null;
  $("vs").textContent = `${d.A.corto} contra ${d.B.corto}`;
  $("mira").hidden = puede;
  $("acciones").hidden = !puede;
  if (puede) {
    $("quedan").textContent = `Te quedan ${Galeria.quedan(x.ap, "A")} aplausos para ${d.A.corto} y ${Galeria.quedan(x.ap, "B")} para ${d.B.corto}.`;
    $("pA").textContent = d.A.corto;
    $("pB").textContent = d.B.corto;
    if (document.activeElement !== $("pulso")) $("pulso").value = x.pulso === null ? 0 : x.pulso;
    const usada = (s.usadas || []).includes(E.yo.uid + "_" + d.n);
    $("btnPregunta").disabled = !!x.q;
    $("btnPregunta").textContent = usada ? "El profesor usó tu pregunta" : x.q ? "Tu pregunta ya le llegó al profesor" : "Pregunta para el profesor";
    if (x.q) { $("formPregunta").hidden = true; $("btnPregunta").hidden = false; }
  }
  pintarFlujo();
}
function pintarFlujo() {
  const s = E.sala, d = s && duelo();
  if (!E.dentro || !d || s.fase !== "debate") return;
  const puede = juega(), ap = puede ? lo().ap : { A: [], B: [] };
  const cuenta = (E.agg && E.agg.duelo === d.n && E.agg.aplausos) || {};
  const ps = Duelo.delDuelo(E.parrafos, d.n).filter(p => (p.texto || "").trim()).slice(-40);
  const caja = $("flujo"), abajo = caja.scrollHeight - caja.scrollTop - caja.clientHeight < 90;
  if (!E.vivo) E.vivo = el("p", "par vivo");
  if (cambio("flujo", [d.n, puede, ap, ps.map(p => [p.id, p.quien, p.texto, cuenta[p.id] || 0])])) {
    caja.replaceChildren();
    let previo = null;
    for (const p of ps) {
      const e = el("div", "par par-" + p.quien);
      if (p.quien !== "P" && previo !== p.quien) e.append(el("span", "quien", d[p.quien].corto));
      e.append(el("span", "dicho", p.texto));
      if (p.quien !== "P") {
        const n = cuenta[p.id] || 0, dado = ap.A.includes(p.id) || ap.B.includes(p.id);
        e.append(el("br"));
        if (puede) {
          const b = el("button", "aplauso" + (dado ? " dado" : ""), dado ? `👏 aplaudiste${n > 1 ? ` (${n})` : ""}` : `👏 aplaudir${n ? ` (${n})` : ""}`);
          b.setAttribute("aria-pressed", dado);
          b.onclick = () => aplaudir(p);
          e.append(b);
        } else if (n) e.append(el("span", "aplausos-n", "👏 " + n));
      }
      caja.append(e);
      previo = p.quien;
    }
    if (!ps.length) caja.append(el("p", "vacio", "Lo que se diga va a aparecer aquí."));
    caja.append(E.vivo);
  }
  const v = E.voz, hay = !!(v && v.duelo === d.n && v.quien && v.quien === s.turno && (v.texto || "").trim());
  E.vivo.hidden = !hay;
  if (hay) {
    E.vivo.className = "par vivo par-" + v.quien;
    E.vivo.replaceChildren(el("span", "dicho", v.texto));
    const vacio = caja.querySelector(".vacio");
    if (vacio) vacio.remove();
  }
  if (abajo) caja.scrollTop = caja.scrollHeight;
}
function pintarApuesta(d) {
  const x = lo();
  for (const k of ["A", "B"]) {
    const b = $("ap" + k);
    b.textContent = d[k].nombre;
    b.classList.toggle("activo", x.apuesta === k);
    b.setAttribute("aria-pressed", x.apuesta === k);
  }
  $("apTxt").textContent = x.apuesta ? `Apostaste por ${d[x.apuesta].corto}. Puedes cambiar hasta que el profesor cierre las apuestas.`
    : "Toca un lado. Si aciertas, sumas 3 puntos.";
}
function pintarQuiz(s) {
  const q = s.quiz, x = lo(), mia = Number.isInteger(x.quiz[q.i]) ? x.quiz[q.i] : null, revelada = q.estado === "revelada";
  $("quizN").textContent = q.total > 1 ? `Pregunta ${q.numero} de ${q.total}` : "Ronda relámpago";
  $("quizTxt").textContent = q.texto;
  const lista = $("quizOps");
  lista.replaceChildren();
  q.opciones.forEach((texto, k) => {
    const b = el("button", "opcion", texto);
    if (mia === k) b.classList.add("elegida");
    if (revelada) {
      b.disabled = true;
      if (k === q.correcta) b.classList.add("correcta");
      else if (mia === k) b.classList.add("mal");
    } else b.onclick = () => { x.quiz[q.i] = k; guardar(); pintarQuiz(E.sala); };
    lista.append(b);
  });
  $("quizEstado").textContent = revelada
    ? (mia === null ? "No alcanzaste a responder." : mia === q.correcta ? "Acertaste: sumas 1 punto." : "Esta vez no.")
    : (mia === null ? "Toca una alternativa." : "Puedes cambiar hasta que el profesor muestre la respuesta.");
}
function pintarMirar(s, d) {
  const puede = juega(), x = puede ? lo() : null, hecho = d && d.jugado ? puntosMios().duelos[d.n] : null;
  $("mirarTit").textContent = "Mira el proyector";
  $("mirarTxt").textContent = !puede ? "Tu grupo debatió este duelo: aquí no apuestas ni respondes."
    : x.apuesta ? `Apostaste por ${d[x.apuesta].corto}.` : "No alcanzaste a apostar.";
  $("ganado").replaceChildren(...(hecho ? [desglose(hecho)] : []));
}

/* ------------------------------ acciones ------------------------------ */
function aplaudir(p) {
  const x = lo(), d = duelo();
  // si ya lo aplaudió, se retira de donde esté (el profesor pudo cambiar el párrafo de lado)
  const lado = x.ap.A.includes(p.id) ? "A" : x.ap.B.includes(p.id) ? "B" : p.quien;
  const nuevo = Galeria.aplaudir(x.ap, lado, p.id);
  if (!nuevo) return nota(`Ya diste tus ${Galeria.CFG.APLAUSOS} aplausos a ${d[lado].corto}. Quita uno para dar otro.`);
  x.ap = nuevo;
  guardar();
  pintarDebate(E.sala, d);
}
function enlazar() {
  $("btnEntrar").onclick = () => E.canal.entrar().catch(e => mensaje("No se pudo entrar: " + (e.code || e.message), true));
  $("pulso").oninput = e => {
    const v = +e.target.value;
    E.mio.pos = v;
    lo().pulso = v;
    if (!E.pulsoTimer) E.pulsoTimer = setTimeout(() => { E.pulsoTimer = null; guardar(); }, 2500);   // no más de una escritura cada 2,5 s
  };
  $("btnPregunta").onclick = () => { $("formPregunta").hidden = false; $("btnPregunta").hidden = true; $("txtPregunta").focus(); };
  $("btnCancelar").onclick = () => { $("formPregunta").hidden = true; $("btnPregunta").hidden = false; };
  $("formPregunta").onsubmit = e => {
    e.preventDefault();
    const texto = $("txtPregunta").value.replace(/\s+/g, " ").trim().slice(0, Galeria.CFG.PREGUNTA_MAX);
    if (!texto) return nota("Escribe la pregunta antes de enviarla.");
    const x = lo();
    x.q = texto;
    x.t = Date.now();
    guardar();
    $("txtPregunta").value = "";
    pintarDebate(E.sala, duelo());
  };
  for (const k of ["A", "B"]) $("ap" + k).onclick = () => { lo().apuesta = k; guardar(); pintarApuesta(duelo()); };
}

/* ------------------------------ arranque ------------------------------ */
function seguir() {
  let primera = true;
  E.canal.escucharSala(CODIGO, async s => {
    if (!s) return mensaje(`La sala ${CODIGO} no existe. Vuelve a escanear el código del proyector.`);
    if (s.modo !== "micro") return mensaje("Esta sala es de otro juego.");
    E.sala = s;
    if (!primera) return pintar();
    primera = false;
    E.jugador = await E.canal.leerJugador(CODIGO).catch(() => null);
    if (E.jugador && E.jugador.equipo === "P") return adentro();
    if ((s.grupos || []).length) return pintarGrupos(s);
    entrar(0);
  });
}

abrirCanal({ local: LOCAL, yo: P.get("yo") || "" }).then(canal => {
  E.canal = canal;
  if (!CODIGO) return mensaje("Abre esta página escaneando el código QR del proyector.");
  enlazar();
  canal.alEntrar(yo => {
    E.yo = yo;
    if (!yo) return mensaje("Entra con tu cuenta de Google para sentarte en la galería.", true);
    seguir();
  });
}).catch(e => mensaje("No se pudo conectar: " + (e.message || e) + ". Revisa tu conexión y recarga la página."));
