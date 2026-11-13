/* =====================================================================
   LA SALA — lo que comparten las tres pantallas: conexión, despacho de acciones, el motor
   (la pantalla del dueño de la sala que ejecuta órdenes, sienta a quien llega tarde, mueve los
   escaños de ensayo y llama al Senado simulado) y los dibujos: hemiciclo, triángulo y comparado.
   D = el contenido (sala-datos.js); L = la lógica pura (sala-logica.js).
   ===================================================================== */
import { abrirCanal } from "./sala-canal.js?v=20261112a";

export const D = LA_SALA, L = SalaLogica;
export const P = new URLSearchParams(location.search);
export const LOCAL = P.get("local") === "1";
export const $ = id => document.getElementById(id);
export const e = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const VOTO = { f: "A favor", c: "En contra", a: "Abstención" };
export const TIPO = { suprimir: "Suprimir", sustituir: "Sustituir", agregar: "Agregar" };
export const ESTADO = { pendiente: "Pendiente", aprobada: "Aprobada", rechazada: "Rechazada", inadmisible: "Inadmisible", vetada: "Vetada", insistida: "Insistida" };

// los colores de las bancadas viven en el contenido: la hoja de estilos los lee de aquí
for (const b of D.bancadas) document.documentElement.style.setProperty("--b" + b.n, b.color);

export const conectar = () => abrirCanal({ local: LOCAL, yo: P.get("yo") || "", ia: P.get("ia") === "1" });
export function urlDe(pagina, codigo, extra = {}) {
  const u = new URL(pagina, location.href);
  u.search = ""; u.hash = "";
  if (LOCAL) u.searchParams.set("local", "1");
  if (codigo) u.searchParams.set("sala", codigo);
  for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
  return u.href;
}
export const codigoPedido = () => (P.get("sala") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
const RECIENTE = LOCAL ? "lasala_reciente_local" : "lasala_reciente";
export const recordar = c => { try { localStorage.setItem(RECIENTE, c); } catch (x) {} };
export const reciente = () => { try { return localStorage.getItem(RECIENTE) || ""; } catch (x) { return ""; } };
// `creada` y `curso` son para el panel de tribuna (admin.html), que lista todas las salas del profesor
export const salaNueva = () => ({ modo: "sala", titulo: D.titulo, curso: D.curso, creada: Date.now(), fase: "portada", nudo: 0, t: Date.now(),
  bots: LOCAL ? 12 : 0, docentes: LOCAL ? ["roberto@ensayo", "max@ensayo"] : [] });

// Pinta solo si cambió: así no se reinician las animaciones ni se pierde lo que alguien escribe.
export function pintar(nodo, html) {
  if (nodo.__html === html) return false;
  const a = document.activeElement, id = a && nodo.contains(a) ? a.id : "", ini = id ? a.selectionStart : null, fin = id ? a.selectionEnd : null;
  nodo.innerHTML = html; nodo.__html = html;
  if (id && $(id)) { $(id).focus(); try { if (ini !== null) $(id).setSelectionRange(ini, fin); } catch (x) {} }
  return true;
}
let notaT = 0;
export function nota(msg) {
  const n = $("nota"); if (!n) return;
  n.textContent = msg; n.hidden = false;
  clearTimeout(notaT); notaT = setTimeout(() => { n.hidden = true; }, 4500);
}
export function relojTexto(reloj, ahora = Date.now()) {
  if (!reloj) return "";
  const s = Math.round(reloj.dur - (ahora - reloj.ini) / 1000), a = Math.abs(s);
  return (s < 0 ? "−" : "") + Math.floor(a / 60) + ":" + String(a % 60).padStart(2, "0");
}
export const relojVencido = (reloj, ahora = Date.now()) => !!reloj && ahora - reloj.ini > reloj.dur * 1000;
export function qrDe(url) {
  if (typeof qrcode !== "function") return "";
  try { const q = qrcode(0, "M"); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (x) { return ""; }
}

/* ---------------- acciones ---------------- */
// S = { canal, codigo, yo, sala, jugadores, dueno, docente }
const ctx = S => ({ D, jugadores: S.jugadores || [], ahora: Date.now(), azar: Math.random });
// El dueño de la sala escribe el cambio. El resto del equipo docente deja una orden en su propio
// documento y la ejecuta el motor (así cabe en las reglas: solo el dueño escribe la sala).
export async function despachar(S, a) {
  try {
    if (S.dueno) {
      const r = L.aplicar(S.sala, a, ctx(S));
      if (!r) return false;
      S.sala = L.aplicarRutas(S.sala, r.cambios);
      await S.canal.cambiarSala(S.codigo, r.cambios);
      return true;
    }
    if (!S.docente) return false;
    await S.canal.escribirMio(S.codigo, { rol: "docente", orden: { id: Date.now(), a } }, "");
    return true;
  } catch (x) { console.warn("despachar:", x); nota("No se pudo guardar. Revisa la conexión."); return false; }
}

/* ---------------- el motor ---------------- */
// principal: el hemiciclo. La testera del dueño lo reemplaza solo si el hemiciclo no late.
export function iniciarMotor(S, { principal }) {
  const hechas = {}, botsPend = new Set();
  let ocupado = false, senT = 0, miLatido = 0, latidoAjeno = 0;
  if (!principal) S.canal.escucharLatido(S.codigo, t => { latidoAjeno = t; });
  const dos = i => String(i).padStart(2, "0");

  async function ordenes() {
    const equipo = (S.sala.docentes || []).map(x => String(x).toLowerCase().trim());
    for (const j of S.jugadores) {
      if (j.rol !== "docente" || !j.orden || !equipo.includes(String(j.email || "").toLowerCase())) continue;
      const id = +j.orden.id || 0, ya = Math.max((S.sala.hechas || {})[j.uid] || 0, hechas[j.uid] || 0);
      if (id <= ya) continue;
      hechas[j.uid] = id;
      const fresca = Math.abs(Date.now() - id) < 120000;        // una orden vieja no se ejecuta al volver
      const r = fresca ? L.aplicar(S.sala, j.orden.a, ctx(S)) : null;
      const cambios = { ...(r ? r.cambios : {}), ["hechas." + j.uid]: id };
      S.sala = L.aplicarRutas(S.sala, cambios);
      await S.canal.cambiarSala(S.codigo, cambios);
    }
  }
  async function tardios() {
    const s = S.sala.sorteo || {};
    if (!Object.keys(s).length) return;
    const nuevos = L.escanos(S.jugadores).map(j => j.uid).filter(u => !s[u]);
    if (!nuevos.length) return;
    const s2 = L.sortear(nuevos, s), cambios = Object.fromEntries(nuevos.map(u => ["sorteo." + u, s2[u]]));
    S.sala = L.aplicarRutas(S.sala, cambios);
    await S.canal.cambiarSala(S.codigo, cambios);
  }
  async function bots() {
    const quiero = S.sala.bots || 0, hay = S.jugadores.filter(j => j.bot);
    for (let i = 1; i <= quiero; i++) {
      const uid = "bot" + dos(i), j = hay.find(x => x.uid === uid);
      if (!j || j.fuera) await S.canal.escribirEscano(S.codigo, uid, { nombre: "Ensayo-" + dos(i), email: "ensayo", equipo: "P", bot: true, fuera: false });
    }
    for (const j of hay) if (+j.uid.slice(3) > quiero && !j.fuera) await S.canal.escribirEscano(S.codigo, j.uid, { fuera: true });
    for (const j of S.jugadores.filter(x => x.bot && !x.fuera)) {
      const x = L.botHace(S.sala, j, S.jugadores, D, Date.now());
      if (!x) continue;
      const k = [j.uid, S.sala.fase, S.sala.nudo, S.sala.t || 0].join("|");
      if (botsPend.has(k)) continue;
      botsPend.add(k);
      setTimeout(() => S.canal.escribirEscano(S.codigo, j.uid, x).catch(err => console.warn("escaño de ensayo:", err)), 300 + Math.random() * 2200);
    }
  }
  async function unSenador(sen, n, ind, apunte) {
    const abst = { id: sen.id, voto: "a", frase: "No alcanzó a votar.", falla: true };
    const intentos = (async () => {
      for (let i = 0; i < 2; i++) {
        try {
          const r = L.leerSenador(L.jsonDe(await S.canal.pedirLLM(L.promptSenador(sen, n, ind, D, apunte), "jurado")));
          if (r) return { id: sen.id, ...r };
        } catch (x) { console.warn("senador " + sen.id + ":", x); }
      }
      return abst;
    })();
    return Promise.race([intentos, new Promise(r => setTimeout(() => r(abst), 45000))]);
  }
  async function senado() {
    const n = S.sala.nudo, s = L.deNudo(S.sala, n).sen;
    if (!s || s.estado !== "pedir" || senT === s.t) return;
    senT = s.t;
    const ind = (S.sala.ind || {})[n];
    let votos = null;
    if (ind && await S.canal.conIA()) {
      votos = await Promise.all(D.senadores.map(sen => unSenador(sen, n, ind, L.deNudo(S.sala, n).nota || "")));
      if (votos.every(v => v.falla)) votos = null;
    }
    if (!votos) votos = L.senadoresDeEnsayo(n, D);
    const ahora = L.deNudo(S.sala, n).sen;
    if (!ahora || ahora.t !== s.t) return;                       // se repitió la votación mientras leían
    await S.canal.cambiarSala(S.codigo, { ["n." + n + ".sen.estado"]: "listo", ["n." + n + ".sen.votos"]: votos });
  }
  async function paso() {
    if (!S.dueno || !S.sala || ocupado) return;
    if (!principal && Date.now() - latidoAjeno < 40000) return;  // el hemiciclo está haciendo de motor
    ocupado = true;
    try {
      if (principal && Date.now() - miLatido > 15000) { miLatido = Date.now(); S.canal.latido(S.codigo).catch(() => {}); }
      await ordenes(); await tardios(); await bots();
      senado().catch(x => console.warn("senado:", x));
    } catch (x) { console.warn("motor:", x); }
    finally { ocupado = false; }
  }
  setInterval(paso, 1000);
  return paso;
}
// Un solo motor principal por navegador, aunque el hemiciclo esté abierto en dos pestañas.
export function motorPrincipal(S) {
  let paso = () => {};
  const partir = () => { paso = iniciarMotor(S, { principal: true }); };
  if (navigator.locks && navigator.locks.request) navigator.locks.request("lasala-motor-" + S.codigo, () => new Promise(() => partir()));
  else partir();
  return () => paso();
}

/* ---------------- el hemiciclo ---------------- */
const NS = "http://www.w3.org/2000/svg";
const s = (tag, attrs = {}) => { const x = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) x.setAttribute(k, v); return x; };
// lista: [{ uid, x, y, r, b, voto }]
export function crearHemiciclo(svg) {
  svg.setAttribute("viewBox", "-6 -4 212 118");
  const capa = s("g"), mesa = s("rect", { x: 86, y: 100, width: 28, height: 7, rx: 2, class: "mesa" });
  svg.append(mesa, capa);
  const nodos = new Map();
  return { pintar(lista) {
    const vistos = new Set();
    for (const a of lista) {
      vistos.add(a.uid);
      let c = nodos.get(a.uid);
      if (!c) { c = s("circle", { cx: a.x, cy: a.y, r: 0 }); capa.append(c); nodos.set(a.uid, c); }
      c.setAttribute("cx", a.x); c.setAttribute("cy", a.y); c.setAttribute("r", a.r);
      c.setAttribute("class", "esc b" + (a.b || 0) + (a.voto ? " v-" + a.voto : "") + (a.yo ? " yo" : ""));
    }
    for (const [uid, c] of nodos) if (!vistos.has(uid)) { c.remove(); nodos.delete(uid); }
  } };
}
// los escaños con el voto que se muestra en esta fase
export function escanosConVoto(S, miUid = "") {
  const sala = S.sala, n = sala.nudo, f = sala.fase;
  let de = null;
  if (f === "general") de = L.votosDe(sala, S.jugadores, "g");
  else if (f === "generalR") de = (sala.general || {}).votos;
  else if (f === "votacion") de = L.votosDe(sala, S.jugadores, "v", n);
  else if (["resultado", "apuesta", "senado", "cierre"].includes(f)) de = (L.deNudo(sala, n).v || {}).votos;
  else if (f === "insistencia") de = L.votosDe(sala, S.jugadores, "ins", sala.vetado);
  else if (f === "insistenciaR") de = (L.deNudo(sala, sala.vetado).ins || {}).votos;
  return L.ubicar(sala, S.jugadores).map(a => ({ ...a, voto: de ? de[a.uid] || "" : "", yo: a.uid === miUid }));
}

/* ---------------- el triángulo del poder ---------------- */
const VERT = { estado: [100, 22], empresas: [22, 158], ciudadanos: [178, 158] };
export function crearTriangulo(svg) {
  svg.setAttribute("viewBox", "0 0 200 180");
  const pts = Object.values(VERT).map(p => p.join(",")).join(" "), c0 = L.aXY(L.CENTRO, VERT);
  svg.append(s("polygon", { points: pts, class: "tri-fondo" }));
  for (const k of Object.keys(VERT)) svg.append(s("line", { x1: VERT[k][0], y1: VERT[k][1], x2: c0[0], y2: c0[1], class: "tri-eje" }));
  const rot = { estado: [100, 13, "middle"], empresas: [20, 174, "start"], ciudadanos: [180, 174, "end"] };
  for (const v of D.vertices) { const t = s("text", { x: rot[v.id][0], y: rot[v.id][1], "text-anchor": rot[v.id][2], class: "tri-rot" }); t.textContent = v.nombre; svg.append(t); }
  const ruta = s("polyline", { class: "tri-ruta", points: "" }), inicio = s("circle", { cx: c0[0], cy: c0[1], r: 4, class: "tri-inicio" });
  const marca = s("g", { class: "tri-marca" });
  marca.append(s("circle", { r: 9, class: "tri-halo" }), s("circle", { r: 5.5, class: "tri-punto" }));
  svg.append(ruta, inicio, marca);
  return { pintar(sala) {
    const t = L.triangulo(sala, D), xy = t.ruta.map(p => L.aXY(p, VERT)), fin = xy[xy.length - 1];
    ruta.setAttribute("points", xy.map(p => p.join(",")).join(" "));
    marca.style.transform = `translate(${fin[0]}px, ${fin[1]}px)`;
    return t;
  } };
}
// en palabras: hacia dónde se movió el reparto
export function repartoTexto(sala) {
  const t = L.triangulo(sala, D), nom = id => D.vertices.find(v => v.id === id).nombre.toLowerCase();
  if (!t.pasos.length) return "El reparto sigue donde lo dejó el Mensaje.";
  const d = k => t.pos[k] - L.CENTRO[k], orden = Object.keys(L.CENTRO).sort((a, b) => d(b) - d(a));
  const gana = orden.filter(k => d(k) > 0.01), pierde = orden.filter(k => d(k) < -0.01);
  if (!gana.length) return "Las indicaciones aprobadas se compensan: el reparto volvió al punto de partida.";
  const lista = ks => ks.map(k => k === "estado" ? "el Estado" : "los " + nom(k)).join(" y ");
  return `Esta ley mueve poder hacia ${lista(gana)}${pierde.length ? ". Lo saca de " + lista(pierde) : ""}.`;
}

/* ---------------- el comparado ---------------- */
const conceptoHTML = (id, frase) => {
  const c = L.concepto(D, id);
  return c ? `<li><b>${e(c.nombre)}</b> <span class="fte">${e(c.fuente)}, semana ${c.sem}</span>${L.plano(frase) ? `<span class="aplica">${e(frase)}</span>` : ""}</li>` : "";
};
export function hojaVigente(nd, { mas = false, breve = false } = {}) {
  return `<article class="hoja vigente">
    <p class="rot">${e(D.rotuloTexto)}</p>
    <h3>${e(nd.vigente.rotulo)}</h3>
    ${breve ? "" : `<p class="ley">${e(nd.vigente.texto)}</p>`}
    <p class="simple">${e(nd.vigente.simple)}</p>
    ${mas ? `<ul class="mas">${nd.vigente.mas.map(m => `<li>${e(m)}</li>`).join("")}</ul>` : ""}
  </article>`;
}
export function hojaIndicacion(nd, ind, { estado = "", fundamentos = true } = {}) {
  const b = L.bancada(D, nd.autora);
  if (!ind) return `<article class="hoja indicacion vacia" style="--b:${b.color}">
    <p class="rot">Indicación de ${e(b.nombre)}</p><p class="falta">Todavía no llega a la Secretaría.</p></article>`;
  const sello = estado && estado !== "pendiente" ? `<span class="sello s-${estado}">${ESTADO[estado]}</span>` : "";
  const origen = ind.origen === "partida" ? "Indicación de partida, cargada por la Secretaría" : ind.origen === "borrador" ? `Borrador de ${e(b.nombre)}` : `Indicación de ${e(b.nombre)}`;
  const fund = fundamentos ? conceptoHTML(ind.dem, ind.demFrase) + conceptoHTML(ind.ia, ind.iaFrase) : "";
  return `<article class="hoja indicacion ${estado ? "e-" + estado : ""}" style="--b:${b.color}">
    <p class="rot">${origen}</p>
    <h3>${e(TIPO[ind.tipo] || "Sin tipo")}</h3>
    <p class="ley">${e(ind.texto) || "<i>Sin texto.</i>"}</p>
    ${fund ? `<ul class="fund">${fund}</ul>` : ""}
    ${sello}
  </article>`;
}
export const comparado = (nd, ind, op = {}) => `<div class="comparado">${hojaVigente(nd, op)}${hojaIndicacion(nd, ind, op)}</div>`;
export const chip = b => { const x = L.bancada(D, b); return x ? `<span class="chip" style="--b:${x.color}">${e(x.nombre)}</span>` : ""; };
export function tablaPuntaje(sala) {
  return `<table class="puntaje"><thead><tr><th>Bancada</th><th>Sala</th><th>Senado</th><th>Patrocinio</th><th>Fundamentos</th><th>Total</th></tr></thead><tbody>${
    L.puntaje(sala, D).map(p => `<tr><td>${chip(p.b)}</td><td>${p.sala}</td><td>${p.senado}</td><td>${p.patrocinio}</td><td>${p.fundamentos}</td><td class="tot">${p.total}</td></tr>`).join("")}</tbody></table>`;
}
export const fraseVoto = r => `${r.f} a favor, ${r.c} en contra, ${r.a} ${r.a === 1 ? "abstención" : "abstenciones"}`;
