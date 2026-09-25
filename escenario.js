/* =====================================================================
   TRIBUNA — el modo escenario: el proyector sin botones.
   index.html sigue siendo la pantalla del profesor y el motor sigue corriendo ahí; con
   ⛶ ESCENARIO (o ?escenario=1, o la orden del control) se esconden los controles y la
   conversación se reemplaza por una vista hecha para leerse desde el fondo de la sala:
     · dos podios (A FAVOR a la izquierda, EN CONTRA a la derecha) con las caras, el reloj de
       ajedrez de cada lado y su barra de participación;
     · el subtítulo en vivo de quien habla, bajo su lado;
     · los últimos mensajes al centro, con las reacciones del público que suben flotando y el
       sello «LA TRIBUNA DUDA»;
     · la moderadora como rótulo inferior, el punto de información y el gusano del termómetro.
   Entre debates, una pantalla de espera con el ranking. Las escenas (portada, intro,
   preparación, revelación, entrada, votación, veredictos, resultado, podio) quedan encima.
   Se repinta cada 300 ms sin rehacer el DOM: cada parte guarda qué pintó y solo toca lo que
   cambió. Spec: docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md (B y C).
   Todo nombre global lleva el prefijo escn/ESCN: este archivo comparte globales con los demás.
   ===================================================================== */

const ESCN = {
  timer: null,
  modo: "",              // "debate" | "espera": qué mitad de la vista se ve
  deb: null,             // el debate para el que está armada la vista de debate
  tarjetas: new Map(),   // id del mensaje → su tarjeta (se reusan de un repintado al otro)
  rx: {},                // id del mensaje → las reacciones ya vistas (para saber cuándo subir un emoji)
  caras: { A: "", B: "" },
  rotulo: "", rotuloId: null, punto: "", gusano: "", espera: "",
  vozOk: false,
  errores: 0
};
const ESCN_ROTULO_MS = 12000;   // cuánto dura en pantalla el rótulo de la moderadora
const ESCN_MENSAJES = 4;        // tarjetas al centro

const escnEnModo = () => document.body.classList.contains("escenario");
// Cambia el texto solo si es otro (asignar el mismo texto igual rehace el nodo).
function escnTexto(el, t) { if (el && el.textContent !== t) el.textContent = t; }
function escnClase(el, c) { if (el && el.className !== c) el.className = c; }
const escnColor = k => (S.debate && typeof escColorDe === "function" ? escColorDe(S.debate[k], k) : EQUIPOS[k].color);
const escnPrimerNombre = n => String(n || "?").trim().split(/\s+/)[0];

/* ---------------------------- el modo ---------------------------- */
// on: encender o apagar. avisar: publicar el estado para que el control vea el interruptor
// (al arrancar la página no hace falta: todavía no hay sala).
function modoEscenario(on, avisar = true) {
  on = !!on;
  document.body.classList.toggle("escenario", on);
  try { localStorage.setItem("tribuna_escenario", on ? "1" : "0"); } catch (e) { /* sin almacenamiento: no se recuerda */ }
  clearInterval(ESCN.timer); ESCN.timer = null;
  if (on) {
    escnArmar();
    ESCN.timer = setInterval(pintarEscenario, 300);
    pintarEscenario();
  } else { $("escnAudio")?.remove(); document.body.classList.remove("escn-audio"); }
  if (avisar && typeof window.publicarEstado === "function") window.publicarEstado();
}
window.modoEscenario = modoEscenario;

// El esqueleto se arma una sola vez; después solo se actualizan sus partes.
function escnArmar() {
  const v = $("escenarioVista");
  if (!v || v.dataset.armada) return;
  v.dataset.armada = "1";
  const podio = k => `<section class="escn-podio" id="escnPodio${k}" data-k="${k}">
      <div class="escn-lado">${k === "A" ? "A FAVOR" : "EN CONTRA"}</div>
      <div class="escn-nombre"></div><div class="escn-cargo"></div>
      <div class="escn-caras"></div>
      <div class="escn-crono"><b class="mono"></b><small></small></div>
      <div class="escn-part"><div class="bz-barra escn-bz"><div class="bz-llen"></div></div><small></small></div>
    </section>`;
  v.innerHTML = `<div class="escn-debate">
      <div class="escn-cab">
        <div class="escn-marca"><b>TRIBUNA</b><span id="escnDeb"></span></div>
        <div class="escn-mocion" id="escnMocion"></div>
        <div class="escn-reloj" id="escnReloj"><small></small><b class="mono"></b></div>
      </div>
      <div class="escn-medio">
        ${podio("A")}
        <section class="escn-centro"><div class="escn-punto" id="escnPunto"></div><div class="escn-msgs" id="escnMsgs"></div></section>
        ${podio("B")}
      </div>
      <div class="escn-subs" id="escnSubs"><div class="escn-sub vacio" data-k="A"></div><div class="escn-sub vacio" data-k="B"></div></div>
      <div class="escn-rotulo" id="escnRotulo"></div>
      <div class="escn-gusano oculto" id="escnGusano"><div class="escn-gusano-svg" id="escnGusanoSvg"></div><div class="escn-gusano-k" id="escnGusanoK"></div></div>
    </div>
    <div class="escn-espera" id="escnEspera"></div>`;
}

/* ---------------------------- el repintado ---------------------------- */
function pintarEscenario() {
  if (!escnEnModo()) return;
  const v = $("escenarioVista");
  if (!v) return;
  escnArmar();
  escnAvisoAudio();
  // con una escena encima no se pinta nada debajo: sus fondos son casi opacos y se trasluciría
  const tapada = $("escena") || $("resultado") || $("ceremonia") || $("portada") || $("intro");
  const modo = tapada ? "tapada" : S.fase === "abierta" && S.debate ? "debate" : "espera";
  if (ESCN.modo !== modo) { ESCN.modo = modo; v.className = modo; }
  if (tapada) return;
  try { modo === "debate" ? escnPintarDebate() : escnPintarEspera(); }
  catch (e) { if (ESCN.errores++ < 3) console.warn("TRIBUNA: el escenario no se pudo pintar", e); }
}

// Quiénes hablan ahora en el debate en curso (Task 15: window.hablaSala). Sin ella, nadie.
function escnHablan() {
  const d = S.debate;
  if (!d || typeof window.hablaSala !== "function") return [];
  try { return (window.hablaSala() || []).filter(h => h && (h.grupo === d.A || h.grupo === d.B)); }
  catch (e) { return []; }
}

function escnPintarDebate() {
  const d = S.debate, reg = S.clase.debates[d.n - 1] || {}, ahora = Date.now();
  if (ESCN.deb !== d.n) escnNuevoDebate(d);
  escnTexto($("escnDeb"), `DEBATE ${d.n}` + (TRAMOS.length > 1 ? ` · ${tramoActual().nombre.toUpperCase()}` : ""));
  escnTexto($("escnMocion"), `«${d.pregunta}»`);
  escnRelojTramo(ahora);
  const hablan = escnHablan();
  for (const k of ["A", "B"]) escnPodio(k, d, hablan);
  escnRotulo(d, reg, ahora, hablan);  // antes que los mensajes: el del rótulo no se repite al centro
  escnMensajes(d, reg, hablan);
  escnPunto(d, ahora);
  escnGusano(d, reg);
}

// Un debate nuevo: se olvidan las tarjetas, las caras y el rótulo del anterior.
function escnNuevoDebate(d) {
  ESCN.deb = d.n;
  ESCN.tarjetas.forEach(el => el.remove()); ESCN.tarjetas.clear();
  ESCN.rx = {}; ESCN.caras = { A: "", B: "" }; ESCN.rotulo = ""; ESCN.rotuloId = null; ESCN.punto = ""; ESCN.gusano = "";
  const v = $("escenarioVista");
  v.style.setProperty("--cA", escnColor("A")); v.style.setProperty("--cB", escnColor("B"));
  for (const k of ["A", "B"]) {
    const p = $("escnPodio" + k);
    p.style.setProperty("--c", escnColor(k));
    const nombre = nombreG(d[k]);
    escnTexto(p.querySelector(".escn-nombre"), nombre);
    p.querySelector(".escn-nombre").classList.toggle("largo", nombre.length > 10);
    escnTexto(p.querySelector(".escn-cargo"), typeof escSubtitulo === "function" ? escSubtitulo(d[k]) : "");
    p.querySelector(".escn-caras").innerHTML = "";
  }
  for (const s of $("escnSubs").children) { s.replaceChildren(); s.className = "escn-sub vacio"; s.dataset.modo = ""; }
  $("escnRotulo").className = "escn-rotulo";
  $("escnPunto").className = "escn-punto";
  $("escnGusanoSvg").innerHTML = "";
}

// El reloj de la cabecera: el del tramo. Con el reloj de ajedrez los que mandan son los de los
// podios, y este queda chico, como el límite de pared del tramo.
function escnRelojTramo(ahora) {
  const el = $("escnReloj"), conBanco = !!(S.banco && Number.isFinite(+S.banco.A));
  const s = S.finRonda ? Math.max(0, Math.ceil((S.finRonda - ahora) / 1000)) : (S.seg || 0);
  escnTexto(el.lastElementChild, fmt(s));
  escnTexto(el.firstElementChild, conBanco ? "LÍMITE" : "TIEMPO");
  escnClase(el, "escn-reloj" + (conBanco ? " chico" : "") + (!conBanco && s <= 20 ? " urgente" : ""));
}

/* ---------------------------- los podios ---------------------------- */
// Quienes suben al podio: los de la sala con ese grupo (con su foto) y, sin sala, los alumnos
// que el profesor simula desde su compositor.
function escnIntegrantes(k, d) {
  const out = new Map();
  let js = {};
  try { js = typeof window.jugadoresSala === "function" ? window.jugadoresSala() || {} : {}; } catch (e) { js = {}; }
  for (const [uid, j] of Object.entries(js)) if (j && j.grupo === d[k]) out.set(uid, { uid, nombre: j.nombre || "?", foto: j.foto || "" });
  for (const m of S.chat) if (m.tipo === "alumno" && m.debate === d.n && m.equipo === k && m.uid && !out.has(m.uid))
    out.set(m.uid, { uid: m.uid, nombre: m.nombre || "?", foto: "" });
  return [...out.values()].slice(0, 10);
}

function escnPodio(k, d, hablan) {
  const p = $("escnPodio" + k), c = escnColor(k);
  const gente = escnIntegrantes(k, d);
  // las caras caben en una fila (dos si son más de cinco), con holgura para la de quien habla
  const caras = p.querySelector(".escn-caras");
  const porFila = Math.max(1, Math.ceil(gente.length / (gente.length > 5 ? 2 : 1)));
  const ancho = caras.clientWidth || innerWidth * 0.24, hueco = innerWidth * 0.009;
  const tam = Math.max(34, Math.round(Math.min(90, innerHeight * (gente.length > 5 ? 0.058 : 0.078), (ancho - hueco * (porFila - 1)) / (porFila + 0.4))));
  const clave = tam + "|" + gente.map(j => `${j.uid}:${j.nombre}:${j.foto}`).join(",");
  if (ESCN.caras[k] !== clave) {
    ESCN.caras[k] = clave;
    caras.style.setProperty("--tc", tam + "px");
    caras.innerHTML = gente.map(j => `<div class="escn-cara" data-uid="${escHtml(j.uid)}">${avatarHtml({ ...j, equipo: "" }, tam).replace(/--c:[^;]+;/, `--c:${c};`)}<span>${escHtml(escnPrimerNombre(j.nombre))}</span></div>`).join("")
      || `<div class="escn-nadie">nadie en el podio aún</div>`;
  }
  const mios = hablan.filter(h => h.grupo === d[k]), suyos = new Set(mios.map(h => h.uid));
  const pide = S.punto && (S.punto.estado === "pedido" || S.punto.estado === "aceptado") ? S.punto.de : null;
  for (const el of caras.children) {
    if (!el.dataset.uid) continue;
    el.classList.toggle("habla", suyos.has(el.dataset.uid));
    el.classList.toggle("pide", el.dataset.uid === pide);
  }
  p.classList.toggle("habla", mios.length > 0);
  escnCrono(k, p, mios.length > 0);
  escnParticipacion(k, p);
}

// El reloj de ajedrez del lado (S.banco, Task 15): rojo bajo 20 s, gris en cero. Sin banco, el
// reloj va una sola vez, en la cabecera.
function escnCrono(k, p, habla) {
  const cr = p.querySelector(".escn-crono");
  if (!S.banco || !Number.isFinite(+S.banco[k])) { escnClase(cr, "escn-crono sin"); return; }
  const s = Math.max(0, Math.ceil(S.banco[k] / 1000));
  const corre = S.bancoCorre ? !!S.bancoCorre[k] : habla;
  escnTexto(cr.firstElementChild, fmt(s));
  escnTexto(cr.lastElementChild, s <= 0 ? "SIN TIEMPO · solo escribe" : corre ? "● HABLANDO" : "tiempo para hablar");
  escnClase(cr, "escn-crono" + (s <= 0 ? " agotado" : (corre ? " corre" : "") + (s <= 20 ? " urgente" : "")));
}

// La barra de participación: la misma cuenta que la de la pantalla normal (barravista.js).
function escnParticipacion(k, p) {
  const el = p.querySelector(".escn-part");
  if (typeof llenadoLado !== "function" || typeof colorBarra !== "function") { el.style.display = "none"; return; }
  let r;
  try { r = llenadoLado(k); } catch (e) { el.style.display = "none"; return; }
  const pct = Math.round(r.pct * 100);
  const barra = el.firstElementChild;
  escnClase(barra, "bz-barra escn-bz " + colorBarra(r.pct));
  const w = pct + "%";
  if (barra.firstElementChild.style.width !== w) barra.firstElementChild.style.width = w;
  escnTexto(el.lastElementChild, `participación ${pct} %${r.todos ? " · 👥 todos" : ""}`);
}

/* ---------------------------- los mensajes ---------------------------- */
// Al centro, los últimos mensajes del debate (alumnos, moderadora, noticias). Si nadie habla,
// el último mensaje de alumno va más grande bajo su lado, en la franja de los subtítulos.
function escnMensajes(d, reg, hablan) {
  const xs = S.chat.filter(m => m.debate === d.n && m.id !== ESCN.rotuloId && (m.tipo === "alumno" || m.tipo === "mod" || m.tipo === "noticia"));
  let ultimo = null;
  if (!hablan.length) for (let i = xs.length - 1; i >= 0; i--) if (xs[i].tipo === "alumno" && (xs[i].equipo === "A" || xs[i].equipo === "B")) { ultimo = xs[i]; break; }
  const centro = xs.filter(m => m !== ultimo).slice(-ESCN_MENSAJES);
  const vivos = new Set(centro.map(m => m.id));
  if (ultimo) vivos.add(ultimo.id);
  for (const [id, el] of ESCN.tarjetas) if (!vivos.has(id)) { el.remove(); ESCN.tarjetas.delete(id); }
  escnSubtitulos(d, hablan, ultimo, reg);
  const cont = $("escnMsgs");
  centro.forEach((m, i) => {
    const el = escnTarjeta(m, reg);
    if (cont.children[i] !== el) cont.insertBefore(el, cont.children[i] || null);
  });
  while (cont.children.length > centro.length) cont.lastElementChild.remove();
  // la tarjeta de más arriba que no cabe entera no se muestra a medias
  const tope = cont.getBoundingClientRect().top - 2;
  for (const el of cont.children) el.classList.toggle("fuera", el.getBoundingClientRect().top < tope);
}

// La tarjeta de un mensaje: se crea una vez y después solo cambian sus reacciones y el sello.
function escnTarjeta(m, reg) {
  let el = ESCN.tarjetas.get(m.id);
  const base = [m.tipo, m.nombre, m.texto, m.voz ? 1 : 0, m.equipo].join("|");
  if (!el) {
    el = document.createElement("article");
    el.dataset.id = m.id;
    el.className = "escn-tj nueva";
    el.addEventListener("animationend", e => { if (e.target === el) el.classList.remove("nueva"); });
    ESCN.tarjetas.set(m.id, el);
  }
  if (el.dataset.base !== base) {
    el.dataset.base = base;
    const lado = m.tipo === "alumno" ? m.equipo : "";
    el.classList.remove("A", "B", "mod", "noticia", "trib");
    el.classList.add(m.tipo === "alumno" ? lado || "A" : m.tipo);
    if (m.tipo === "mod" && m.datos && m.datos.tribuna) el.classList.add("trib");
    el.style.setProperty("--c", lado ? escnColor(lado) : "");
    const quien = m.tipo === "mod" ? `🎙 ${MOD_NOMBRE.toUpperCase()}${m.datos && m.datos.tribuna ? " · ✋ LA TRIBUNA" : ""}`
      : m.tipo === "noticia" ? "📰 ÚLTIMA HORA" : "";
    const grupo = m.tipo === "alumno" ? grupoDeMensaje(m) : 0;
    el.innerHTML = `<div class="escn-tj-q">${quien ? `<b>${quien}</b>` : `<b>${escHtml(m.nombre || "?")}</b>${grupo ? `<span>${escHtml(nombreG(grupo))}</span>` : ""}`}${m.voz ? `<em title="dicho en voz alta">🎤</em>` : ""}</div>
      <p class="tx">${typeof conMenciones === "function" ? conMenciones(m.texto || "") : escHtml(m.texto || "")}</p>
      <div class="escn-rx"></div><div class="escn-sello">LA TRIBUNA DUDA</div>`;
    ESCN.rx[m.id + "|pintado"] = "";
  }
  escnReacciones(m, el);
  el.classList.toggle("duda", (reg.pedidosFuente || []).includes(m.id));
  return el;
}

// 🔥 🤔 🤝 del público (S.reacciones): los conteos, y un emoji que sube cuando uno aumenta.
function escnReacciones(m, el) {
  if (m.tipo !== "alumno" || typeof PUB === "undefined") return;
  const c = (S.reacciones && S.reacciones[m.id]) || {};
  const firma = PUB.REACCIONES.map(r => c[r.id] || 0).join(",");
  const antes = ESCN.rx[m.id];
  if (antes && firma !== antes) {
    const a = antes.split(",").map(Number);
    PUB.REACCIONES.forEach((r, i) => { const sube = (c[r.id] || 0) - a[i]; for (let j = 0; j < Math.min(sube, 3); j++) escnFlota(el, r.emoji, j); });
  }
  ESCN.rx[m.id] = firma;
  if (ESCN.rx[m.id + "|pintado"] === firma) return;
  ESCN.rx[m.id + "|pintado"] = firma;
  el.querySelector(".escn-rx").innerHTML = PUB.REACCIONES.filter(r => c[r.id]).map(r => `<span>${r.emoji} <b>${c[r.id]}</b></span>`).join("");
}

// Un emoji que sube y se desvanece (1,5 s) sobre la tarjeta. Se borra solo: no quedan nodos.
function escnFlota(el, emoji, i) {
  if (el.querySelectorAll(".escn-flota").length >= 9) return;
  const f = document.createElement("span");
  f.className = "escn-flota";
  f.textContent = emoji;
  f.style.left = (12 + Math.random() * 70).toFixed(0) + "%";
  f.style.animationDelay = i * 160 + "ms";
  const quitar = () => f.remove();
  f.addEventListener("animationend", quitar);
  setTimeout(quitar, 1800 + i * 160);
  el.appendChild(f);
}

/* ---------------------------- los subtítulos ---------------------------- */
// Bajo cada lado: lo que dice ahora quien tiene el botón apretado (el texto provisional del
// reconocimiento de voz, con el final siempre a la vista). Si nadie habla, el último mensaje.
function escnSubtitulos(d, hablan, ultimo, reg) {
  for (const s of $("escnSubs").children) {
    const k = s.dataset.k;
    const h = hablan.filter(x => x.grupo === d[k]).sort((a, b) => (b.t0 || 0) - (a.t0 || 0))[0];
    if (h) {
      if (s.dataset.modo !== "vivo") {
        s.dataset.modo = "vivo";
        s.innerHTML = `<div class="escn-sub-q"><i class="escn-envivo">● EN VIVO</i><b></b><span></span></div>
          <div class="escn-sub-t"><p><span></span><i class="escn-cursor"></i></p></div>`;
      }
      escnTexto(s.querySelector(".escn-sub-q b"), h.nombre || "?");
      escnTexto(s.querySelector(".escn-sub-q span"), nombreG(h.grupo));
      escnTexto(s.querySelector(".escn-sub-t span"), escnCola(h.texto));
      escnClase(s, "escn-sub vivo");
    } else if (ultimo && ultimo.equipo === k) {
      const el = escnTarjeta(ultimo, reg);
      if (s.dataset.modo !== "ultimo" || el.parentNode !== s) { s.dataset.modo = "ultimo"; s.replaceChildren(el); }
      escnClase(s, "escn-sub ultimo");
    } else if (s.dataset.modo) {
      s.dataset.modo = ""; s.replaceChildren(); escnClase(s, "escn-sub vacio");
    }
  }
}
// El final de lo que se está diciendo: lo último es lo que importa en un subtítulo.
function escnCola(texto) {
  const t = String(texto || "").replace(/\s+/g, " ").trim();
  return t.length > 230 ? "…" + t.slice(-230).replace(/^\S*\s/, "") : t || "…";
}

/* ---------------------------- el rótulo de la moderadora ---------------------------- */
// Su último mensaje de los últimos 12 s, abajo y grande, sobre la franja de los subtítulos. La
// pregunta de la tribuna va en ámbar, con la foto y el nombre de quien la escribió, y la pregunta
// tal cual. Si alguien del podio empieza a hablar, el rótulo se retira: manda el subtítulo.
function escnRotulo(d, reg, ahora, hablan) {
  const el = $("escnRotulo");
  let m = null;
  if (!hablan.length) for (let i = S.chat.length - 1; i >= 0; i--) {
    const x = S.chat[i];
    if (x.tipo === "mod" && x.debate === d.n) { if (ahora - (x.t || 0) < ESCN_ROTULO_MS) m = x; break; }
  }
  ESCN.rotuloId = m ? m.id : null;
  if (!m) { if (ESCN.rotulo) { ESCN.rotulo = ""; el.className = "escn-rotulo"; } return; }
  if (ESCN.rotulo === m.id) return;
  ESCN.rotulo = m.id;
  const dt = m.datos || {};
  if (dt.tribuna === "pregunta") {
    const e = [...(reg.tribuna || [])].reverse().find(x => x.uid === dt.uid);
    const q = e ? e.texto : ((String(m.texto).match(/«([^»]+)»/) || [])[1] || m.texto);
    let foto = "";
    try { foto = typeof window.jugadoresSala === "function" ? ((window.jugadoresSala() || {})[dt.uid] || {}).foto || "" : ""; } catch (err) { foto = ""; }
    const nombre = dt.nombre || (e && e.nombre) || "el público";
    const grupo = e && e.grupo ? ` · ${nombreG(e.grupo)}` : "";
    el.innerHTML = `${avatarHtml({ nombre, foto, equipo: "" }, Math.round(Math.min(118, innerHeight * 0.11))).replace(/--c:[^;]+;/, "--c:var(--amber);")}
      <div class="escn-rot-c"><div class="escn-rot-k">✋ PREGUNTA DE LA TRIBUNA · <b>${escHtml(nombre)}</b><span>${escHtml(grupo)}</span></div>
      <div class="escn-rot-q">«${escHtml(String(q).trim())}»</div></div>`;
  } else {
    const k = dt.tribuna === "fuente" ? "🤔 LA TRIBUNA PIDE LA FUENTE" : `🎙 ${MOD_NOMBRE.toUpperCase()}`;
    el.innerHTML = `<div class="escn-rot-c"><div class="escn-rot-k">${k}</div>
      <div class="escn-rot-t">${typeof conMenciones === "function" ? conMenciones(m.texto || "") : escHtml(m.texto || "")}</div></div>`;
  }
  el.className = "escn-rotulo";
  void el.offsetWidth;                                   // para que la entrada se anime otra vez
  el.className = "escn-rotulo on" + (dt.tribuna === "pregunta" ? " trib" : dt.tribuna === "fuente" ? " fuente" : "");
}

/* ---------------------------- el punto de información ---------------------------- */
// S.punto (Task 15): pedido → aceptado → terminado, o rechazado / vencido. Los cerrados se ven
// hasta p.hasta (PUNTO.MUESTRA).
function escnPunto(d, ahora) {
  const el = $("escnPunto"), p = S.punto;
  const ver = !!(p && p.estado && (p.estado === "pedido" || p.estado === "aceptado" || !p.hasta || ahora < p.hasta));
  if (!ver) { if (ESCN.punto) { ESCN.punto = ""; el.className = "escn-punto"; } return; }
  const clave = p.estado + "|" + p.t;
  const quien = typeof conGrupo === "function" ? conGrupo(p.nombre || "Alguien", p.grupo, PERS) : p.nombre || "Alguien";
  const para = d[p.para] ? nombreG(d[p.para]) : "el otro lado";
  const s = p.fin ? Math.max(0, Math.ceil((p.fin - ahora) / 1000)) : 0;
  if (ESCN.punto !== clave) {
    ESCN.punto = clave;
    const t = {
      pedido: ["✋ PUNTO DE INFORMACIÓN", `${escHtml(quien)} pide la palabra`],
      aceptado: ["✋ PUNTO ACEPTADO", `${escHtml(quien)} tiene la palabra`],
      rechazado: ["✋ PUNTO DE INFORMACIÓN", "RECHAZADO"],
      vencido: ["✋ PUNTO DE INFORMACIÓN", "SIN RESPUESTA"],
      terminado: ["✋ PUNTO DE INFORMACIÓN", "TERMINADO"]
    }[p.estado] || ["✋ PUNTO DE INFORMACIÓN", escHtml(p.estado)];
    el.innerHTML = `<div class="escn-pt-k">${t[0]}</div><div class="escn-pt-t">${t[1]}</div><div class="escn-pt-s"></div>`;
    el.style.setProperty("--c", escnColor(p.lado === "B" ? "B" : "A"));
    el.className = "escn-punto on " + p.estado;
  }
  escnTexto(el.lastElementChild, p.estado === "pedido" ? `${para} acepta o rechaza · ${s} s`
    : p.estado === "aceptado" ? `${s} s` : p.estado === "rechazado" ? `${para} no cedió la palabra`
    : p.estado === "vencido" ? `${para} no respondió a tiempo` : `La palabra vuelve a ${para}`);
}

/* ---------------------------- el gusano ---------------------------- */
// La curva del termómetro al pie, A FAVOR arriba y EN CONTRA abajo (svgTermometro, app.js),
// al tamaño real de la franja. Solo en línea: el termómetro lo mueven los teléfonos.
function escnGusano(d, reg) {
  const el = $("escnGusano"), curva = reg.curva || [];
  const ver = !!(S.termo || curva.length) && typeof svgTermometro === "function";
  el.classList.toggle("oculto", !ver);
  if (!ver) return;
  const caja = $("escnGusanoSvg"), W = caja.clientWidth, H = caja.clientHeight;
  if (!W || !H) return;
  const u = curva[curva.length - 1];
  const firma = [W, H, d.n, curva.length, u && u.s, u && u.m].join("|");
  if (ESCN.gusano === firma) return;
  ESCN.gusano = firma;
  caja.innerHTML = svgTermometro(W, H, { letra: Math.round(Math.max(12, Math.min(20, H * 0.17))), cA: escnColor("A"), cB: escnColor("B"), clase: "" });
  const n = S.termo ? Object.keys(S.termo).length : 0;
  $("escnGusanoK").innerHTML = `🌡 LA SALA${n ? ` · ${n} moviéndolo` : ""}`;
}

/* ---------------------------- entre debates ---------------------------- */
// Sin debate abierto (y sin escena encima): la preparación sin revelación, la espera de la
// votación o, entre debates, «EN UN MOMENTO, EL PRÓXIMO DEBATE» con el ranking.
function escnPintarEspera() {
  const el = $("escnEspera"), d = S.debate;
  const rk = (S.clase.ranking || []).filter(f => f.debates > 0).slice(0, 5);
  const firmaRk = rk.map(f => `${f.grupo}:${f.puntaje}`).join(",");
  let clave, html;
  if (S.fase === "listo" && d) {
    clave = "prep|" + d.n;
    const lado = k => `<div class="escn-es-lado" style="--c:${escnColor(k)}"><b>${k === "A" ? "A FAVOR" : "EN CONTRA"} · ${escHtml(nombreGrupo(d[k]))}</b><span>${escHtml((d.posturas || {})[k] || "")}</span></div>`;
    html = `<div class="escn-es-k">DEBATE ${d.n} · PREPARACIÓN</div><div class="escn-es-reloj mono" id="escnPrepReloj"></div>
      <div class="escn-es-q">«${escHtml(d.pregunta)}»</div><div class="escn-es-lados">${lado("A")}${lado("B")}</div>
      <div class="escn-es-pie">Cada grupo acuerda su primera frase. El debate se abre al llegar a cero.</div>`;
  } else if (["votando", "veredictoPublico", "veredictoJueces"].includes(S.fase) && d) {
    clave = "vota|" + d.n;
    html = `<div class="escn-es-k">DEBATE ${d.n}</div><div class="escn-es-t">🗳 VOTEN EN SU TELÉFONO</div><div class="escn-es-q">«${escHtml(d.pregunta)}»</div>`;
  } else {
    const fin = S.fase === "fin";
    clave = (fin ? "fin|" : "espera|") + firmaRk;
    html = `<div class="escn-es-k">TRIBUNA · ${escHtml(S.clase.tema || SESION.tema || "")}</div>
      <div class="escn-es-t">${fin ? "FIN DE LA CLASE" : "EN UN MOMENTO, EL PRÓXIMO DEBATE"}</div>
      ${rk.length ? `<div class="escn-rk"><div class="escn-rk-k">RANKING DE ${PERS ? "PERSONAJES" : "GRUPOS"}</div>${rk.map(f => {
        const c = (personajeDe(f.grupo, PERS) || {}).color || "var(--neon)";
        return `<div class="escn-rk-f" style="--c:${c}"><span class="mono">#${f.puesto}</span><b>${escHtml(nombreGrupo(f.grupo))}</b><i class="mono">${f.puntaje === null ? "—" : f.puntaje.toFixed(1)}</i></div>`;
      }).join("")}</div>` : `<div class="escn-es-pie">Miren su teléfono: ahí verán qué les toca.</div>`}`;
  }
  if (ESCN.espera !== clave) { ESCN.espera = clave; el.innerHTML = html; }
  if (S.fase === "listo" && S.finPrep) escnTexto($("escnPrepReloj"), fmt(Math.max(0, Math.ceil((S.finPrep - Date.now()) / 1000))));
}

/* ---------------------------- el sonido ---------------------------- */
// Chrome no deja sonar nada (ni la música ni la voz de la moderadora) hasta el primer clic o
// tecla en la página. En el escenario nadie toca la pantalla: un aviso discreto lo pide.
function escnFaltaAudio() {
  const quiere = (typeof sonidoActivo === "function" && sonidoActivo()) || opcionActiva(S.clase.opciones, "vozIA");
  if (!quiere) return false;
  const activada = navigator.userActivation ? navigator.userActivation.hasBeenActive : ESCN.vozOk;
  const ac = typeof _ac !== "undefined" ? _ac : null;
  return !activada || !ESCN.vozOk || !!(ac && ac.state === "suspended");
}
function escnAvisoAudio() {
  const falta = escnEnModo() && escnFaltaAudio();
  let a = $("escnAudio");
  if (document.body.classList.contains("escn-audio") !== falta) document.body.classList.toggle("escn-audio", falta);
  if (!falta) { a?.remove(); return; }
  if (a) return;
  a = document.createElement("div");
  a.id = "escnAudio";
  a.textContent = "🔊 Toca la pantalla para activar el sonido";
  document.body.appendChild(a);
}
// Con el primer gesto: el AudioContext (app.js) y una frase vacía para la voz (speechSynthesis
// también exige un gesto antes de hablar por primera vez).
function escnDesbloquear() {
  if (typeof audioCtx === "function") audioCtx();
  if (!ESCN.vozOk) {
    ESCN.vozOk = true;
    try { if (typeof speechSynthesis !== "undefined") { const u = new SpeechSynthesisUtterance(""); u.volume = 0; speechSynthesis.speak(u); } } catch (e) { /* sin voz */ }
  }
  $("escnAudio")?.remove();
  document.body.classList.remove("escn-audio");
}
document.addEventListener("pointerdown", escnDesbloquear, true);
document.addEventListener("keydown", escnDesbloquear, true);

/* ---------------------------- arranque ---------------------------- */
// Esc sale del modo, salvo que una escena, un modal, el mapa o la intro estén abiertos (esos
// usan Esc para cerrarse ellos).
document.addEventListener("keydown", e => {
  if (e.key !== "Escape" || !escnEnModo()) return;
  if ($("escena") || document.querySelector(".modal") || $("mapaGrande") || $("intro")) return;
  modoEscenario(false);
});
(function () {
  const pedido = new URLSearchParams(location.search).get("escenario");
  let on = pedido === "1" ? true : pedido === "0" ? false : null;
  if (on === null) { try { on = localStorage.getItem("tribuna_escenario") === "1"; } catch (e) { on = false; } }
  const b = $("btnEscenario");
  if (b) b.onclick = () => modoEscenario(true);
  // la conversación cambió: repintar ya, sin esperar el próximo tic
  const antes = window.alCambiarChat;
  window.alCambiarChat = function () { if (typeof antes === "function") antes(); pintarEscenario(); };
  window.addEventListener("resize", () => { ESCN.caras = { A: "", B: "" }; ESCN.gusano = ""; pintarEscenario(); });
  if (on) modoEscenario(true, false);
})();
