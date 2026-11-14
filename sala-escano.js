/* =====================================================================
   LA SALA — el escaño: el teléfono de cada estudiante (escano.html).
   Entra con el código o el QR, queda en una bancada, lee el expediente de su nudo, vota,
   aplaude lo que se dice en el debate y apuesta. La indicación se redacta en papel (el formulario
   queda como alternativa). Solo escribe su propio documento (jugadores/{uid}).
   ===================================================================== */
import { D, L, LOCAL, $, e, VOTO, ESTADO, conectar, urlDe, codigoPedido, pintar, nota, relojTexto,
  hojaVigente, hojaIndicacion, chip, tablaPuntaje, tablaEscanosHTML, fraseVoto, crearHemiciclo, escanosConVoto } from "./sala-comun.js?v=20261114a";

const S = { canal: null, codigo: codigoPedido(), yo: null, sala: null, jugadores: [], dueno: false, docente: false };
const U = { pestana: "sala", expN: 0, F: null, base: 0, sucio: false, rellenar: false, prensaVista: 0, sentado: false, conForm: false };
const vista = $("vista");
let hemi = null;

const yo = () => S.jugadores.find(j => j.uid === S.yo.uid) || {};
const miB = () => L.bancadaDe(S.sala, S.yo.uid);
const nd = () => L.nudoDe(D, S.sala.nudo);
const miNudo = () => { const b = L.bancada(D, miB()); return b ? L.nudoDe(D, b.autora) : null; };

async function escribir(datos) {
  const j = S.jugadores.find(x => x.uid === S.yo.uid);          // se ve al tiro, antes de que vuelva la red
  if (j) for (const [k, v] of Object.entries(datos)) j[k] = v && typeof v === "object" && k !== "ind" ? { ...(j[k] || {}), ...v } : v;
  render();
  try { await S.canal.escribirMio(S.codigo, datos); }
  catch (x) { console.warn(x); nota("No se guardó. Revisa tu conexión e intenta de nuevo."); }
}

/* ---------------- piezas ---------------- */
const botonesVoto = (campo, n, actual, textos = VOTO) => `<div class="votos">${L.VOTOS.map(v =>
  `<button class="voto v-${v}${actual === v ? " elegido" : ""}" data-a="votar" data-campo="${campo}" data-n="${n}" data-v="${v}">${e(textos[v])}</button>`).join("")}</div>
  <p class="guia">${actual ? "Tu voto quedó registrado. Puedes cambiarlo hasta que cierre la votación." : "Elige una opción."}</p>`;
const conteo = r => `<p class="conteo"><b class="f">${r.f}</b> a favor <b class="c">${r.c}</b> en contra <b class="a">${r.a}</b> ${r.a === 1 ? "abstención" : "abstenciones"}</p>`;
function tarjetaBancada() {
  const b = L.bancada(D, miB());
  if (!b) return `<section class="tarjeta"><h2>Todavía no tienes bancada</h2><p>Las bancadas se sortean en un momento.</p></section>`;
  return `<section class="tarjeta bancada" style="--b:${b.color}"><p class="rot">Tu bancada</p><h2>${e(b.nombre)}</h2><p>${e(b.posicion)}</p>
    <ul><li>Redactan y defienden el nudo ${b.autora}: <b>${e(L.nudoDe(D, b.autora).titulo)}</b></li>
    <li>Responden el nudo ${b.impugna}: <b>${e(L.nudoDe(D, b.impugna).titulo)}</b></li></ul></section>`;
}
function miRol(n) {
  const b = miB();
  return b === n.autora ? "Tu bancada defiende esta indicación." : b === n.impugna ? "Tu bancada responde esta indicación." : "Escucha el debate. Después votas.";
}
function catalogoHTML(n, mod) {
  return `<ul class="catalogo">${L.catalogo(D, n, mod).slice(0, 12).map(c => `<li class="${c.sugerido ? "sug" : ""}"><b>${e(c.nombre)}</b> <span>${e(c.fuente)}, semana ${c.sem}</span></li>`).join("")}</ul>`;
}
const opciones = (n, mod) => {
  const cs = L.catalogo(D, n, mod), grupo = (t, l) => (l.length ? `<optgroup label="${t}">${l.map(c => `<option value="${c.id}">${e(c.nombre)} (${e(c.fuente)})</option>`).join("")}</optgroup>` : "");
  return `<option value="">Elige uno…</option>${grupo("Sugeridos para este nudo", cs.filter(c => c.sugerido))}${grupo("Semanas 9 a 14", cs.filter(c => !c.sugerido && c.sem >= 9))}${grupo("Semanas 2 a 7", cs.filter(c => !c.sugerido && c.sem < 9))}`;
};

/* ---------------- la redacción ---------------- */
// Se redacta en papel y se lee en voz alta. El formulario del teléfono queda plegado, por si una
// bancada prefiere entregarla escrita.
function redaccion() {
  const n = miNudo();
  if (!n) return tarjetaBancada();
  return `<section class="tarjeta"><p class="rot">Nudo ${n.n}. ${e(n.articulos)}</p><h2>Redacten en papel</h2><p>${e(n.pregunta)}</p>
      <ul>${D.formato.map(x => `<li>${e(x)}</li>`).join("")}</ul>
      <p class="guia">Al terminar, alguien de la bancada la lee en voz alta frente a la sala. Lo que lea queda en el comparado.</p></section>
    ${hojaVigente(n, { mas: true })}
    <details class="tarjeta"><summary>Conceptos para este nudo</summary><p class="rot">Democracia</p>${catalogoHTML(n.n, "dem")}<p class="rot">IA</p>${catalogoHTML(n.n, "ia")}</details>
    <details class="tarjeta en-telefono" id="conForm"${U.conForm ? " open" : ""}><summary>Escribirla también en el teléfono</summary>${formulario()}</details>`;
}
function formulario() {
  const n = miNudo();
  if (!n) return tarjetaBancada();
  const bor = L.borradorDe(S.sala, S.jugadores, n.autora);
  // Si otra persona de la bancada guardó algo más nuevo y aquí nadie ha escrito, se carga solo.
  // Si aquí ya hay algo escrito, se avisa y decide quien escribe.
  let nueva = !!bor && bor.t > U.base && bor.por !== S.yo.uid;
  if (!U.F || (nueva && !U.sucio)) { U.F = bor ? L.limpiarInd(bor) : L.limpiarInd({}); U.base = bor ? bor.t : 0; U.sucio = false; U.rellenar = true; nueva = false; }
  const estado = !bor ? "Tu bancada todavía no guarda nada." : `${bor.lista ? "Entregada" : "Borrador"}. Última versión: ${e(bor.por === S.yo.uid ? "la tuya" : bor.nombre)}.`;
  return `<section class="tarjeta"><p class="rot">Nudo ${n.n}. ${e(n.articulos)}</p><h2>${e(n.titulo)}</h2><p>${e(n.pregunta)}</p>
      <p class="estado ${bor && bor.lista ? "ok" : ""}">${estado}</p>
      ${nueva ? `<p class="alerta">${e(bor.nombre)} guardó una versión más nueva. <button class="texto" data-a="cargar">Cargarla</button></p>` : ""}</section>
    <form class="indicacion" id="fInd" autocomplete="off">
      <fieldset><legend>1. ¿Qué hace la indicación?</legend><div class="tipos">${L.TIPOS.map(t =>
        `<label><input type="radio" name="tipo" value="${t}">${t[0].toUpperCase() + t.slice(1)}</label>`).join("")}</div></fieldset>
      <label for="inTexto">2. Texto propuesto</label>
      <textarea id="inTexto" name="texto" rows="5" maxlength="${L.MAX.texto}" placeholder="Escriban el texto como quedaría en la ley."></textarea>
      <label for="inDem">3. Un concepto del módulo de Democracia</label>
      <select id="inDem" name="dem">${opciones(n.n, "dem")}</select>
      <textarea id="inDemFrase" name="demFrase" rows="3" maxlength="${L.MAX.frase}" placeholder="Aplíquenlo: ¿qué muestra este concepto sobre el artículo?"></textarea>
      <label for="inIa">4. Un concepto o caso del módulo de IA</label>
      <select id="inIa" name="ia">${opciones(n.n, "ia")}</select>
      <textarea id="inIaFrase" name="iaFrase" rows="3" maxlength="${L.MAX.frase}" placeholder="Aplíquenlo: ¿qué enseña este caso sobre el artículo?"></textarea>
      <div class="acciones"><button type="button" class="boton hueco" data-a="guardar">Guardar para mi bancada</button>
        <button type="button" class="boton" data-a="entregar">Entregar a la Secretaría</button></div>
      <ul class="faltas" id="faltas"></ul>
    </form>`;
}
// El formulario se pinta vacío y se llena aparte: así lo que llega de la red no lo repinta
// mientras alguien escribe (en un teléfono, repintar cierra el teclado).
function llenarForm() {
  const f = $("fInd"); if (!f || !U.F) return;
  for (const k of ["texto", "dem", "demFrase", "ia", "iaFrase"]) f.elements[k].value = U.F[k];
  for (const r of f.querySelectorAll('input[name="tipo"]')) r.checked = r.value === U.F.tipo;
  faltas();
}
function faltas() {
  const falta = L.faltaInd(U.F, D);
  $("faltas").innerHTML = falta.map(x => `<li>${e(x)}</li>`).join("");
  vista.querySelector('[data-a="entregar"]').disabled = falta.length > 0;
  for (const l of vista.querySelectorAll(".tipos label")) l.classList.toggle("elegido", l.querySelector("input").checked);
}
function leerForm() {
  const f = $("fInd"); if (!f) return;
  const d = new FormData(f);
  U.F = L.limpiarInd({ tipo: d.get("tipo") || "", texto: d.get("texto"), dem: d.get("dem"), demFrase: d.get("demFrase"), ia: d.get("ia"), iaFrase: d.get("iaFrase") });
}
function guardarInd(lista) {
  leerForm();
  if (lista && L.faltaInd(U.F, D).length) return faltas();
  const t = Date.now();
  U.base = t; U.sucio = false;
  escribir({ ind: { ...U.F, t, lista } });
  nota(lista ? "Entregada a la Secretaría." : "Guardado. Tu bancada ya ve esta versión.");
}

/* ---------------- la pestaña Sala, fase por fase ---------------- */
const FASES = {
  portada: () => `<section class="tarjeta"><h2>Estás en la sala</h2><p>Mira el proyector. Aquí vas a votar, aplaudir lo que se diga y apostar.</p><p class="idea">${e(D.ideaCentral)}</p></section>`,
  cuenta: () => FASES.portada(),
  general: () => `<section class="tarjeta"><p class="rot">Votación en general</p><h2>¿Se aprueba la idea de legislar?</h2>
    <p>${e(D.reglas.general)}</p>${botonesVoto("g", 0, yo().g)}</section>`,
  generalR() {
    const r = (S.sala.general || {}).r;
    return `<section class="tarjeta"><p class="rot">Votación en general</p><h2>${r && r.aprobada ? "Aprobado en general" : "Rechazado en general"}</h2>
      ${r ? conteo(r) : ""}<p>${yo().g ? "Tu voto: " + VOTO[yo().g].toLowerCase() + "." : "No alcanzaste a votar."}</p></section>`;
  },
  sorteo: () => tarjetaBancada(),
  nudos() {
    const n = nd();
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n} de ${D.nudos.length}. ${e(n.articulos)}</p><h2>${e(n.titulo)}</h2><p>${e(n.pregunta)}</p>
      <p>Redacta ${chip(n.autora)} Responde ${chip(n.impugna)}</p></section>${tarjetaBancada()}`;
  },
  redaccion: () => redaccion(),
  lectura() {
    const n = nd();
    return `<section class="tarjeta"><p class="rot">Lectura de indicaciones</p><h2>Nudo ${n.n}: ${e(n.titulo)}</h2>
      <p>${miB() === n.autora ? "Le toca a tu bancada: lean su indicación en voz alta." : `La lee en voz alta ${chip(n.autora)}`}</p></section>
      ${hojaIndicacion(n, L.indicacionDe(S.sala, S.jugadores, D, n.n))}`;
  },
  tarea() {
    return `<section class="tarjeta"><p class="rot">Para el jueves</p><h2>Preparen la defensa y la respuesta</h2><p>${e(D.tarea)}</p></section>${misIndicaciones()}`;
  },
  apertura: () => `<section class="tarjeta"><p class="rot">Acto 2</p><h2>Se abre la Sala</h2><p>${e(D.reglas.senado)}</p></section>${misIndicaciones()}`,
  pelea: () => enDebate(),
  defensa: () => enDebate(),
  respuesta: () => enDebate(),
  votacion() {
    const n = nd();
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n}: votación nominal</p><h2>${e(n.pregunta)}</h2>${botonesVoto("v", n.n, (yo().v || {})[n.n])}</section>
      ${hojaIndicacion(n, (S.sala.ind || {})[n.n], { fundamentos: false })}${dichos(n)}`;
  },
  resultado() {
    const n = nd(), r = (L.deNudo(S.sala, n.n).v || {}).r, mio = ((L.deNudo(S.sala, n.n).v || {}).votos || {})[S.yo.uid];
    if (!r) return "";
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n}: ${e(n.titulo)}</p><h2>${!r.quorum ? "Sin quórum" : r.aprobada ? "Aprobada" : "Rechazada"}</h2>${conteo(r)}
      <p>${mio ? "Tu voto: " + VOTO[mio].toLowerCase() + "." : "No alcanzaste a votar."}</p>${r.quorum ? "" : `<p>${e(D.reglas.quorum)}</p>`}</section>`;
  },
  apuesta() {
    const n = nd(), mia = (yo().ap || {})[n.n];
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n}: el Senado simulado</p><h2>¿Qué harán los cinco senadores?</h2>
      <p>${e(D.senadoAviso)} Votan la misma indicación, cada uno con su criterio.</p>
      <div class="votos dos"><button class="voto v-f${mia === "ap" ? " elegido" : ""}" data-a="apostar" data-n="${n.n}" data-v="ap">La aprueban</button>
      <button class="voto v-c${mia === "re" ? " elegido" : ""}" data-a="apostar" data-n="${n.n}" data-v="re">La rechazan</button></div>
      <ul class="criterios">${D.senadores.map(s => `<li><b>${e(s.nombre)}</b> valora ${e(s.valora)}.</li>`).join("")}</ul></section>`;
  },
  senado() {
    const n = nd(), x = L.deNudo(S.sala, n.n), s = x.sen || {}, visto = s.estado === "listo" ? s.visto || 0 : 0, mia = ((x.ap || {}).de || {})[S.yo.uid];
    const fila = (sen, i) => { const v = i < visto ? s.votos[i] : null; return `<li class="${v ? "v-" + v.voto : ""}"><b>${e(sen.nombre)}</b>${v ? `<span class="voto-s">${VOTO[v.voto]}</span><p>${e(v.frase)}</p>` : "<span class='tenue'>todavía no vota</span>"}</li>`; };
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n}: el Senado simulado</p>
      <h2>${s.r ? (s.r.aprueba ? "El Senado simulado aprueba" : "El Senado simulado rechaza") : "Los senadores votan uno por uno"}</h2>
      <p>${mia ? `Apostaste que ${mia === "ap" ? "la aprueban" : "la rechazan"}.${s.r ? (s.r.aprueba === (mia === "ap") ? " Acertaste." : " No acertaste.") : ""}` : "No apostaste en este nudo."}</p>
      <ul class="senado-lista">${D.senadores.map(fila).join("")}</ul></section>${s.r ? misPuntos(n) : ""}`;
  },
  inadmisible() {
    const n = nd();
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n}: ${e(n.titulo)}</p><h2>Inadmisible</h2><p>${e(D.reglas.inadmisible)}</p><p>${e(D.reglas.patrocinio)}</p>
      ${miB() === n.autora ? "<p class='alerta'>Tu bancada todavía puede convencer al Ejecutivo de patrocinarla.</p>" : ""}</section>`;
  },
  cierre() {
    const n = nd(), est = L.estadoNudo(S.sala, n.n);
    return `<section class="tarjeta"><p class="rot">Nudo ${n.n}: ${e(n.titulo)}</p><h2>${ESTADO[est]}</h2>
      <p>${L.enLaLey(est) ? "La indicación entra a la ley." : "Queda el texto del Mensaje."}</p>
      <p class="rot">Qué quieren los actores reales</p><p>${e(n.actores)}</p><p class="fte">${e(n.actoresFuente)}</p></section>${misPuntos(n)}`;
  },
  veto: () => `<section class="tarjeta"><p class="rot">El Ejecutivo</p><h2>${S.sala.vetado ? "Veto al nudo " + S.sala.vetado : "¿Promulga o veta?"}</h2><p>${e(D.reglas.veto)}</p><p>${e(D.reglas.insistencia)}</p></section>${leyHTML()}`,
  insistencia() {
    const m = S.sala.vetado, n = L.nudoDe(D, m);
    return `<section class="tarjeta"><p class="rot">Veto al nudo ${m}: ${e(n.titulo)}</p><h2>¿Insiste la sala?</h2><p>${e(D.reglas.insistencia)}</p>
      ${botonesVoto("ins", m, (yo().ins || {})[m], { f: "Insistir", c: "Aceptar el veto", a: "Abstención" })}</section>${hojaIndicacion(n, (S.sala.ind || {})[m], { fundamentos: false })}`;
  },
  insistenciaR() {
    const m = S.sala.vetado, r = (L.deNudo(S.sala, m).ins || {}).r;
    return r ? `<section class="tarjeta"><p class="rot">Veto al nudo ${m}</p><h2>${r.insiste ? "La sala insiste" : "El veto se mantiene"}</h2>${conteo(r)}<p>Hacían falta ${r.necesarios} votos a favor.</p></section>` : "";
  },
  final() {
    const p = L.puntaje(S.sala, D), lugar = p.findIndex(x => x.b === miB()), b = L.bancada(D, miB());
    const t = L.tablaEscanos(S.sala, S.jugadores, D), yoT = t.findIndex(x => x.uid === S.yo.uid);
    return `<section class="tarjeta"><h2>La ley que despachó este curso</h2>${b ? `<p>${e(b.nombre)}: ${p[lugar].total} puntos, lugar ${lugar + 1} de ${p.length}.</p>` : ""}
      ${yoT >= 0 && t[0].total > 0 ? `<p>Tú: ${t[yoT].total} ${t[yoT].total === 1 ? "punto" : "puntos"} por apuestas y aplausos, lugar ${yoT + 1} de ${t.length}.</p>` : ""}</section>
      ${leyHTML()}${tablaPuntaje(S.sala)}${t.length && t[0].total > 0 ? `<h3 class="sep">Quién leyó mejor a la sala</h3>${tablaEscanosHTML(S.sala, S.jugadores, 5)}` : ""}`;
  }
};
function misIndicaciones() {
  const b = L.bancada(D, miB()), ind = S.sala.ind || {};
  if (!b) return tarjetaBancada();
  return `<h3 class="sep">La que defienden (nudo ${b.autora})</h3>${hojaIndicacion(L.nudoDe(D, b.autora), ind[b.autora])}
    <h3 class="sep">La que responden (nudo ${b.impugna})</h3>${hojaIndicacion(L.nudoDe(D, b.impugna), ind[b.impugna])}`;
}
function enDebate() {
  const n = nd(), p = S.sala.pedido, b = miB(), meToca = p && p.b === b;
  const habla = S.sala.fase === "defensa" ? n.autora : S.sala.fase === "respuesta" ? n.impugna : 0;
  return `<section class="tarjeta"><p class="rot">Nudo ${n.n} de ${D.nudos.length}. ${e(n.articulos)}</p><h2>${e(n.titulo)}</h2>
      <p>${e(miRol(n))}</p>${habla ? `<p>Tiene la palabra ${chip(habla)} <span class="reloj" id="reloj"></span></p>` : ""}</section>
    ${meToca ? `<section class="tarjeta pedido"><h2>El presidente les pide un fundamento</h2><p>Funden su posición en un concepto del módulo de ${e(D.modulos[p.mod])}. No basta con nombrarlo: aplíquenlo al artículo.</p>${catalogoHTML(n.n, p.mod)}</section>` : ""}
    ${dichos(n)}${hojaIndicacion(n, (S.sala.ind || {})[n.n])}
    ${meToca ? "" : `<details class="tarjeta"><summary>Conceptos para este nudo</summary><p class="rot">Democracia</p>${catalogoHTML(n.n, "dem")}<p class="rot">IA</p>${catalogoHTML(n.n, "ia")}</details>`}`;
}
// Lo que oyó el micrófono en el debate de este nudo, párrafo por párrafo. Tocar uno lo aplaude:
// tres por bancada, nunca a la propia, hasta que cierra la votación.
function dichos(n) {
  const s = S.sala, ps = L.debateDe(s, n.n);
  if (!ps.length) return "";
  const b = miB(), mias = (yo().apl || {})[n.n] || [], abierta = !L.deNudo(s, n.n).apl;
  const quedan = x => L.quedanAplausos(mias, s, n.n, D, b, x);
  const saldo = [...new Set(ps.map(p => p.b))].filter(x => x !== b).map(x => `<span>${chip(x)}te ${quedan(x) === 1 ? "queda 1" : "quedan " + quedan(x)}</span>`).join("");
  return `<section class="tarjeta dichos"><p class="rot">Lo que se dijo</p><h2>Aplaude lo mejor</h2>
    <p class="guia">${abierta ? `Tres aplausos por bancada. Si aplaudes el párrafo que los senadores elijan como el mejor, sumas ${D.puntos.aplauso} puntos.` : "Los aplausos de este nudo ya se cerraron."}</p>
    ${abierta && saldo ? `<p class="saldo">${saldo}</p>` : ""}
    ${ps.map(p => {
      const mio = mias.includes(p.id), propio = p.b === b, puede = abierta && !propio && (mio || quedan(p.b) > 0);
      return `<button class="dicho${mio ? " elegido" : ""}" style="--b:${L.bancada(D, p.b).color}" data-a="aplaudir" data-id="${e(p.id)}" aria-pressed="${mio}"${puede ? "" : " disabled"}>
        <span class="txt">${e(p.texto)}</span><span class="pie">${chip(p.b)}<b>${mio ? "Aplaudido" : propio ? "Tu bancada" : puede ? "Aplaudir" : ""}</b></span></button>`; }).join("")}</section>`;
}
// Cuando el Senado simulado ya votó: lo mejor de cada bancada y lo que sumaste en este nudo.
function misPuntos(n) {
  const x = L.deNudo(S.sala, n.n), s = x.sen;
  if (!s || !s.r) return "";
  const ps = Object.fromEntries(L.debateDe(S.sala, n.n).map(p => [p.id, p])), mias = ((x.apl || {}).de || {})[S.yo.uid] || [];
  const mejores = [n.autora, n.impugna].map(b => ps[(s.mejores || {})[b]]).filter(Boolean), pts = L.puntosEscano(S.sala, D, S.yo.uid).nudos[n.n] || { apuesta: 0, aplausos: 0 };
  const piso = [n.autora, n.impugna].filter(b => (s.piso || {})[b] === true);
  return `<section class="tarjeta"><p class="rot">Tus puntos en este nudo</p><h2>${pts.apuesta + pts.aplausos} ${pts.apuesta + pts.aplausos === 1 ? "punto" : "puntos"}</h2>
    <p>${pts.apuesta} por la apuesta y ${pts.aplausos} por los aplausos.</p>
    ${mejores.map(p => `<blockquote><p>${e(p.texto)}</p><footer>Lo mejor de ${chip(p.b)}${mias.includes(p.id) ? "<b>Lo aplaudiste.</b>" : ""}</footer></blockquote>`).join("")}
    ${piso.length ? `<p class="guia">El Senado simulado validó el fundamento de ${piso.map(chip).join(" ")}</p>` : ""}</section>`;
}
const leyHTML = () => `<ul class="ley-lista">${L.leyDespachada(S.sala, D).map(x => `<li class="e-${x.estado}"><b>Nudo ${x.n}. ${e(x.titulo)}</b><span>${ESTADO[x.estado]}</span></li>`).join("")}</ul>`;

/* ---------------- expediente y prensa ---------------- */
function expediente() {
  const mio = miNudo(), n = L.nudoDe(D, U.expN || (S.sala.nudo && L.actoDe(S.sala.fase) === 2 ? S.sala.nudo : mio ? mio.n : 1));
  const voz = p => `<blockquote><p>${p.textual ? "«" + e(p.cita) + "»" : e(p.cita)}</p><footer><b>${e(p.quien)}</b>, ${e(p.cargo)}. ${e(p.fuente)}</footer></blockquote>`;
  return `<div class="selector">${D.nudos.map(x => `<button data-a="exp" data-n="${x.n}" class="${x.n === n.n ? "elegido" : ""}">Nudo ${x.n}${mio && mio.n === x.n ? " (el tuyo)" : ""}</button>`).join("")}</div>
    <section class="tarjeta"><p class="rot">${e(n.articulos)}</p><h2>${e(n.titulo)}</h2><p>${e(n.pregunta)}</p><p>Redacta ${chip(n.autora)} Responde ${chip(n.impugna)}</p></section>
    ${hojaVigente(n, { mas: true })}
    <section class="tarjeta"><p class="rot">La pelea</p>${n.pelea.map(voz).join("")}</section>
    <section class="tarjeta"><p class="rot">Conceptos de Democracia</p>${catalogoHTML(n.n, "dem")}<p class="rot">Conceptos y casos de IA</p>${catalogoHTML(n.n, "ia")}</section>
    <p class="fte centro">${e(D.avisoTexto)}</p>`;
}
function prensa() {
  const ids = [...(S.sala.filt || [])].reverse();
  if (!ids.length) return `<section class="tarjeta"><h2>Prensa</h2><p>Todavía no hay filtraciones.</p></section>`;
  return ids.map(id => { const f = D.filtraciones.find(x => x.id === id); return `<article class="recorte"><p class="rot">Filtración</p><h3>${e(f.titular)}</h3><p>${e(f.detalle)}</p><span>${e(f.fuente)}</span></article>`; }).join("");
}

/* ---------------- pintar ---------------- */
function render() {
  const s = S.sala;
  if (!s || !S.yo) return;
  const b = L.bancada(D, miB());
  document.body.style.setProperty("--b", b ? b.color : "var(--laton)");
  pintar($("cab"), `<span class="marca">La Sala</span>${b ? chip(b.n) : ""}<span class="quien">${e(L.nombreCorto(S.yo.nombre || S.yo.email))}</span>`);
  if (s.fase !== "redaccion") { U.F = null; U.sucio = false; }
  const filt = s.filtVer && s.filtVer.t > U.prensaVista ? D.filtraciones.find(x => x.id === s.filtVer.id) : null;
  const cuerpo = U.pestana === "expediente" ? expediente() : U.pestana === "prensa" ? prensa() : (FASES[s.fase] || (() => ""))();
  const pinto = pintar(vista, (filt && U.pestana !== "prensa" ? `<article class="recorte nuevo"><p class="rot">Filtración</p><h3>${e(filt.titular)}</h3><p>${e(filt.detalle)}</p><span>${e(filt.fuente)}</span><button class="texto" data-a="vistaPrensa">Cerrar</button></article>` : "")
    + (s.aviso && s.aviso.txt && U.pestana === "sala" ? `<p class="regla"><b>Regla</b> ${e(s.aviso.txt)}</p>` : "") + cuerpo
    + (U.pestana === "sala" ? `<svg id="miniHemi" class="mini-hemi" role="img" aria-label="Los escaños de la sala"></svg>` : ""));
  if (pinto || U.rellenar) { U.rellenar = false; llenarForm(); }
  if ($("miniHemi")) { if (!$("miniHemi").firstChild) hemi = crearHemiciclo($("miniHemi")); hemi.pintar(escanosConVoto(S, S.yo.uid)); }
  $("pestanas").hidden = false;
  for (const p of $("pestanas").querySelectorAll("button")) p.classList.toggle("elegido", p.dataset.p === U.pestana);
  $("pPrensa").classList.toggle("hay", (s.filt || []).length > 0 && !!filt);
  relojes();
}
function relojes() { const r = $("reloj"); if (r && S.sala) r.textContent = relojTexto(S.sala.reloj); }
setInterval(relojes, 500);

vista.addEventListener("click", ev => {
  const b = ev.target.closest("[data-a]"); if (!b) return;
  const a = b.dataset.a, n = +b.dataset.n || 0;
  if (a === "votar") escribir(b.dataset.campo === "g" ? { g: b.dataset.v } : { [b.dataset.campo]: { [n]: b.dataset.v } });
  else if (a === "apostar") escribir({ ap: { [n]: b.dataset.v } });
  else if (a === "aplaudir") {
    const k = S.sala.nudo, l = L.aplaudir((yo().apl || {})[k], b.dataset.id, S.sala, k, D, miB());
    if (l) escribir({ apl: { [k]: l } });
    else nota("Ya usaste tus aplausos para esa bancada. Toca uno de los tuyos para retirarlo.");
  }
  else if (a === "guardar") guardarInd(false);
  else if (a === "entregar") guardarInd(true);
  else if (a === "cargar") { U.F = null; U.sucio = false; vista.__html = null; render(); }
  else if (a === "exp") { U.expN = n; render(); }
  else if (a === "vistaPrensa") { U.prensaVista = Date.now(); render(); }
});
vista.addEventListener("toggle", ev => { if (ev.target.id === "conForm") U.conForm = ev.target.open; }, true);
// mientras escriben no se repinta: solo se actualiza lo que falta y el botón de entregar
vista.addEventListener("input", ev => {
  if (!ev.target.closest("#fInd")) return;
  leerForm(); faltas(); U.sucio = true;
});
$("pestanas").addEventListener("click", ev => {
  const b = ev.target.closest("button"); if (!b) return;
  if (U.pestana === "sala" && S.sala && S.sala.fase === "redaccion") leerForm();
  U.pestana = b.dataset.p;
  if (U.pestana === "prensa") U.prensaVista = Date.now();
  render(); window.scrollTo(0, 0);
});

/* ---------------- entrada ---------------- */
function mensaje(html) { $("pestanas").hidden = true; pintar(vista, `<section class="tarjeta entrada">${html}</section>`); }
function pedirCodigo() {
  mensaje(`<h1>La Sala</h1><p>Escribe el código que aparece en el proyector.</p>
    <form id="fCod"><input id="inCod" maxlength="8" autocomplete="off" autocapitalize="characters" aria-label="Código de la sala"><button class="boton">Entrar</button></form>`);
  $("fCod").onsubmit = ev => { ev.preventDefault(); const c = $("inCod").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c) location.href = urlDe("escano.html", c, LOCAL && S.yo ? { yo: S.yo.uid } : {}); };
}
function abrir() {
  if (!S.codigo) return pedirCodigo();
  S.canal.escucharSala(S.codigo, async sala => {
    if (!sala || sala.modo !== "sala") { S.sala = null; return mensaje(`<h1>La Sala</h1><p>No existe la sala ${e(S.codigo)}. Revisa el código del proyector.</p><p><a class="boton" href="${e(urlDe("escano.html", ""))}">Probar otro código</a></p>`); }
    S.sala = sala;
    if (!U.sentado) {
      U.sentado = true;
      try { await S.canal.escribirMio(S.codigo, {}); }
      catch (x) { console.warn(x); U.sentado = false; return mensaje("<h1>La Sala</h1><p>No se pudo ocupar tu escaño. Recarga la página.</p>"); }
    }
    render();
  });
  S.canal.escucharEscanos(S.codigo, lista => { S.jugadores = lista; render(); });
}
(async function partir() {
  mensaje("<p>Conectando…</p>");
  try { S.canal = await conectar(); }
  catch (x) { console.warn(x); return mensaje("<h1>La Sala</h1><p>No se pudo conectar. Revisa tu conexión y recarga.</p>"); }
  S.canal.alEntrar(u => {
    S.yo = u;
    if (!u) {
      mensaje(`<h1>La Sala</h1><p>Entra con tu cuenta de Google para ocupar tu escaño.</p><button class="boton" id="btnEntrar">Entrar con Google</button>`);
      $("btnEntrar").onclick = () => S.canal.entrar().catch(x => { console.warn(x); nota("No se pudo entrar. Permite las ventanas emergentes e intenta de nuevo."); });
      return;
    }
    abrir();
  });
})();
