/* =====================================================================
   LA SALA — la testera: el control del equipo docente (testera.html), en teléfono o notebook.
   Tres secciones: Presidente (conduce), Ejecutivo (urgencia, patrocinio, veto) y Secretaría
   (indicaciones, filtraciones, puntaje). La cuenta que creó la sala escribe los cambios; el
   resto del equipo deja órdenes que ejecuta el motor del hemiciclo (sala-comun.js).
   En el teléfono de quien creó la sala, además, es el único micrófono (sala-voz.js).
   ===================================================================== */
import { D, L, LOCAL, $, e, VOTO, ESTADO, TIPO, conectar, urlDe, codigoPedido, recordar, reciente, salaNueva, pintar, nota,
  relojTexto, despachar, iniciarMotor, chip, tablaPuntaje, tablaEscanosHTML } from "./sala-comun.js?v=20261114b";
import { crearVoz } from "./sala-voz.js?v=20261114b";

const S = { canal: null, codigo: codigoPedido(), yo: null, sala: null, jugadores: [], dueno: false, docente: false };
const U = { pestana: "presidente", notas: {}, latido: 0, oyendo: false, ed: {}, edN: 0, avisado: false };
const vista = $("vista");
let motor = null, ultimoSig = 0, voz = null;
const ORIGEN = { partida: "la de partida", dictada: "la que leyó la bancada", secretaria: "corregida por la Secretaría", bancada: "la que la bancada escribió en el teléfono" };

const FASE_NOMBRE = { portada: "Portada", cuenta: "La cuenta del proyecto", general: "Votación en general", generalR: "Resultado en general",
  sorteo: "Sorteo de bancadas", nudos: "Presentación del nudo", redaccion: "Redacción de indicaciones", lectura: "Lectura de la indicación", tarea: "Tarea para el jueves",
  apertura: "Apertura de la Sala", pelea: "La pelea", defensa: "Defensa", respuesta: "Respuesta", votacion: "Votación nominal", resultado: "Resultado de la sala",
  apuesta: "Apuestas", senado: "Senado simulado", cierre: "Cierre del nudo", inadmisible: "Inadmisible", veto: "Veto", insistencia: "Insistencia",
  insistenciaR: "Resultado de la insistencia", final: "La ley despachada" };
const hacer = a => despachar(S, a);
const puedeSeguir = () => !!L.siguiente(S.sala, { D, jugadores: S.jugadores, ahora: Date.now(), azar: Math.random });

/* ---------------- lo de arriba: dónde estamos y el botón principal ---------------- */
function cabecera() {
  const s = S.sala, n = s.nudo ? L.nudoDe(D, s.nudo) : null, k = L.sentados(s, S.jugadores).length;
  const motorVivo = S.dueno || Date.now() - U.latido < 40000;
  let progreso = "";
  const campo = s.fase === "general" ? ["g"] : s.fase === "votacion" ? ["v", s.nudo] : s.fase === "insistencia" ? ["ins", s.vetado] : null;
  if (campo) { const r = L.contar(L.votosDe(s, S.jugadores, campo[0], campo[1]), k); progreso = `Han votado ${r.votaron} de ${k}. ${r.quorum ? "Hay quórum." : "Todavía no hay quórum (" + L.quorumDe(k) + ")."}`; }
  if (s.fase === "apuesta") progreso = `Apuestas: ${Object.keys(L.apuestasDe(s, S.jugadores, s.nudo)).length} de ${k}.`;
  if (s.fase === "redaccion") progreso = "Entregadas: " + D.nudos.filter(x => { const b = L.borradorDe(s, S.jugadores, x.autora); return b && b.lista; }).length + " de " + D.nudos.length + ".";
  if (s.fase === "resultado" && !L.deNudo(s, s.nudo).v.r.quorum) progreso = "No hubo quórum: repite la votación.";
  const etiqueta = L.etiquetaSiguiente(s, D);
  return `<div class="donde"><p class="acto">Acto ${L.actoDe(s.fase)}${n ? `, nudo ${n.n}: ${e(n.titulo)}` : ""}</p><h1>${e(FASE_NOMBRE[s.fase] || s.fase)}</h1>
      <p class="progreso">${e(progreso)} <span class="reloj" id="reloj"></span></p></div>
    ${etiqueta ? `<button class="principal" data-a="sig"${puedeSeguir() ? "" : " disabled"}>${e(etiqueta)}</button>` : '<p class="progreso">La sesión terminó.</p>'}
    ${["resultado", "apuesta"].includes(s.fase) ? '<button class="texto" data-a="reabrir">Repetir la votación</button>' : ""}
    ${motorVivo ? "" : '<p class="alerta">El hemiciclo no está abierto con la cuenta que creó la sala. Sin él, tus órdenes no se ejecutan.</p>'}`;
}

/* ---------------- Presidente ---------------- */
function presidente() {
  const s = S.sala, n = s.nudo && L.actoDe(s.fase) === 2 ? s.nudo : 0, sen = n ? L.deNudo(s, n).sen : null;
  const bancadas = f => D.bancadas.map(f).join("");
  const fases = [...L.FASES_1, "apertura", ...D.nudos.flatMap(x => L.FASES_NUDO.map(f => f + ":" + x.n)), "veto", "final"];
  const fund = Object.fromEntries(L.puntaje(s, D).map(p => [p.b, p.fundamentos / D.puntos.fundamento]));
  const oidos = s.nudo ? L.dichoDe(s, s.nudo, L.actoDe(s.fase) === 1 ? ["lectura"] : L.FASES_DEBATE) : [];
  return `${voz ? voz.html() : ""}<section><h2>La palabra</h2><div class="fila">${bancadas(b => `<button class="b${s.palabra === b.n ? " on" : ""}" style="--b:${b.color}" data-a="palabra" data-b="${b.n}">${e(b.nombre)}</button>`)}
      <button data-a="palabra" data-b="0">Nadie</button></div>
      <div class="fila"><span class="lbl">Reloj</span><button data-a="reloj" data-dur="120">2:00</button><button data-a="reloj" data-dur="60">1:00</button><button data-a="reloj" data-dur="30">0:30</button><button data-a="reloj" data-dur="0">Parar</button></div></section>
    ${oidos.length ? `<section><h2>Lo que se oyó en este nudo</h2><p class="ayuda">Si el micrófono tomó algo que no era de la bancada, bórralo: los senadores leen todo lo que queda aquí.</p>
      <div class="lista">${oidos.map(p => `<div class="item alto"><span>${chip(p.b)}<span class="cita">${e(p.texto)}</span></span>
        <span class="botones"><button data-a="borrarDicho" data-id="${e(p.id)}">Borrar</button></span></div>`).join("")}</div></section>` : ""}
    <section><h2>Fundamentos</h2><p class="ayuda">Vale 1 punto, máximo 2 por bancada. Con el micrófono activo, el Senado simulado lo valida solo si la bancada citó un artículo y aplicó un concepto de cada módulo. Con estos botones lo pides, lo sumas o lo quitas a mano.</p>
      ${s.pedido ? `<p class="estado">Pedido a ${chip(s.pedido.b)}: módulo de ${e(D.modulos[s.pedido.mod])}. <button class="texto" data-a="pedir" data-b="0">Retirar</button></p>` : ""}
      <table class="ctl"><tbody>${bancadas(b => `<tr><td>${chip(b.n)}</td>
        <td><button data-a="pedir" data-b="${b.n}" data-mod="dem">Democracia</button><button data-a="pedir" data-b="${b.n}" data-mod="ia">IA</button></td>
        <td class="val"><button data-a="validar" data-b="${b.n}" data-d="-1" aria-label="Quitar un fundamento a ${e(b.nombre)}">−</button><b>${fund[b.n] || 0} de ${D.puntos.maxFundamentos}</b><button data-a="validar" data-b="${b.n}" data-d="1" aria-label="Validar un fundamento de ${e(b.nombre)}">Validar</button></td></tr>`)}</tbody></table></section>
    ${n ? `<section><h2>Nota para el Senado simulado</h2><p class="ayuda">Los cinco senadores leen la indicación, lo que oyó el micrófono y esta nota. Es opcional: sirve si el micrófono no estuvo activo o se perdió algo del debate del nudo ${n}.</p>
      <textarea id="inNota" rows="3" maxlength="${L.MAX.nota}" placeholder="Por ejemplo: la autora citó el artículo 6; la respuesta mostró que nadie fiscaliza.">${e(U.notas[n] ?? L.deNudo(s, n).nota ?? "")}</textarea>
      <div class="fila"><button data-a="nota" data-n="${n}">Guardar la nota</button>
      ${sen && sen.estado === "pedir" ? '<button data-a="senadoEnsayo">Usar votos de ensayo</button>' : ""}</div>
      ${sen ? `<p class="estado">${sen.estado === "listo" ? "Los senadores ya votaron." + ((sen.votos || []).some(v => v.ensayo) ? " Son votos de ensayo." : "") : "Los senadores están leyendo."}</p>` : ""}</section>` : ""}
    <section><h2>Ir a otro momento</h2><div class="fila"><select id="selIr" aria-label="Momento de la sesión">${fases.map(f => { const [x, m] = f.split(":"); return `<option value="${f}"${x === s.fase && (+m || 0) === (m ? s.nudo : 0) ? " selected" : ""}>${e(FASE_NOMBRE[x])}${m ? ", nudo " + m : ""}</option>`; }).join("")}</select>
      <button data-a="ir">Ir</button></div><p class="ayuda">Para corregir o repetir. Ir a una votación la abre de nuevo.</p></section>`;
}

/* ---------------- Ejecutivo ---------------- */
function ejecutivo() {
  const s = S.sala, n3 = D.nudos.find(x => x.requierePatrocinio), ley = L.leyDespachada(s, D);
  return `<section><h2>Urgencia</h2><p class="ayuda">${e(D.reglas.urgencia)}</p><div class="fila">${D.nudos.map(n =>
      `<button class="${(s.urg || {})[n.n] ? "on" : ""}" data-a="urgencia" data-n="${n.n}" data-on="${(s.urg || {})[n.n] ? "" : "1"}">Nudo ${n.n}${(s.urg || {})[n.n] ? ": con urgencia" : ""}</button>`).join("")}</div></section>
    <section><h2>Patrocinio</h2><p class="ayuda">${e(D.reglas.patrocinio)} La indicación del nudo ${n3.n} (${e(L.bancada(D, n3.autora).nombre)}) crea un organismo: sin tu firma es inadmisible. Si la patrocinas, la bancada gana 1 punto.</p>
      <div class="fila"><button class="${s.pat ? "on" : ""}" data-a="patrocinio" data-on="${s.pat ? "" : "1"}">${s.pat ? "Retirar el patrocinio" : "Patrocinar la indicación del nudo " + n3.n}</button></div>
      ${(s.ind || {})[n3.n] ? `<p class="cita">${e(s.ind[n3.n].texto)}</p>` : ""}</section>
    <section><h2>Veto</h2><p class="ayuda">${e(D.reglas.veto)} ${e(D.reglas.insistencia)}</p>
      ${s.fase !== "veto" ? '<p class="estado">Se decide al final, después del nudo 4.</p>' : `<div class="lista">${ley.map(x => `<div class="item"><span><b>Nudo ${x.n}.</b> ${e(x.titulo)} <i>${ESTADO[x.estado]}</i></span>
        ${x.estado === "aprobada" ? `<button data-a="vetar" data-n="${x.n}">Vetar</button>` : s.vetado === x.n ? '<button class="on" data-a="vetar" data-n="0">Retirar el veto</button>' : ""}</div>`).join("")}</div>
        <p class="estado">${s.vetado ? "Vetaste el nudo " + s.vetado + ". Al avanzar, la sala vota si insiste." : "Si no vetas nada, al avanzar se promulga."}</p>`}</section>`;
}

/* ---------------- Secretaría ---------------- */
function secretaria() {
  const s = S.sala, pub = s.filt || [], enPantalla = s.filtVer ? s.filtVer.id : "";
  return `<section><h2>Indicaciones</h2><p class="ayuda">Las bancadas redactan en papel y la leen en voz alta en la lectura: con el micrófono activo, lo leído pasa solo al comparado. Aquí puedes corregirlo.</p><div class="lista">${D.nudos.map(n => {
      const of = (s.ind || {})[n.n], bor = L.borradorDe(s, S.jugadores, n.autora), dic = L.indDictada(s, D, n.n), x = of || bor || dic;
      const estado = of ? "En el comparado: " + (ORIGEN[of.origen] || ORIGEN.bancada) : bor ? (bor.lista ? "Entregada por " + bor.nombre : "Borrador de " + bor.nombre) : dic ? "Leída, sin recibir" : "Sin texto";
      const ed = U.ed[n.n] || { tipo: x ? x.tipo : n.partida.tipo, texto: x ? x.texto : "" };
      return `<div class="item alto"><span><b>Nudo ${n.n}.</b> ${chip(n.autora)} <i>${e(estado)}</i>${x ? `<span class="cita">${e(TIPO[x.tipo] || "Sin tipo")}. ${e(x.texto)}</span>` : ""}</span>
        <span class="botones">${dic && !(of && of.origen === "dictada" && of.texto === dic.texto) ? `<button data-a="dictada" data-n="${n.n}">Usar lo que leyeron</button>` : ""}${bor ? `<button data-a="recibir" data-n="${n.n}">Recibir la del teléfono</button>` : ""}<button data-a="partida" data-n="${n.n}">Cargar la de partida</button></span>
        <details class="corregir" data-n="${n.n}"${U.edN === n.n ? " open" : ""}><summary>Corregir el texto</summary>
          <div class="fila"><label class="lbl" for="edTipo${n.n}">Tipo</label><select id="edTipo${n.n}" data-ed="${n.n}">${L.TIPOS.map(t => `<option value="${t}"${ed.tipo === t ? " selected" : ""}>${TIPO[t]}</option>`).join("")}</select></div>
          <textarea id="edTexto${n.n}" data-ed="${n.n}" rows="4" maxlength="${L.MAX.texto}" aria-label="Texto de la indicación del nudo ${n.n}">${e(ed.texto)}</textarea>
          <div class="fila"><button data-a="indicar" data-n="${n.n}">Guardar en el comparado</button></div></details></div>`; }).join("")}</div></section>
    <section><h2>Filtraciones</h2><p class="ayuda">Al publicar una, aparece en el proyector y en los teléfonos.</p><div class="lista">${D.filtraciones.map(f => `<div class="item alto"><span><b>${e(f.titular)}</b>
        <span class="cita">${e(f.detalle)} ${e(f.fuente)}. Sirve para el nudo ${f.nudo}.</span></span>
        <span class="botones">${enPantalla === f.id ? '<button class="on" data-a="filtrar" data-id="">Quitar de la pantalla</button>' : `<button data-a="filtrar" data-id="${f.id}">${pub.includes(f.id) ? "Mostrar otra vez" : "Publicar"}</button>`}</span></div>`).join("")}</div></section>
    <section><h2>Puntaje por bancada</h2>${tablaPuntaje(s)}</section>
    <section><h2>Puntaje por escaño</h2><p class="ayuda">${D.puntos.apuesta} puntos por acertar la apuesta y ${D.puntos.aplauso} por haber aplaudido el párrafo que los senadores eligieron como el mejor de cada bancada.</p>${tablaEscanosHTML(s, S.jugadores, 12)}</section>
    <section><h2>La sala</h2><p class="estado">Código <b>${e(S.codigo)}</b>. ${(k => k === 1 ? "1 escaño ocupado" : k + " escaños ocupados")(L.sentados(s, S.jugadores).length)}.</p>
      <p class="enlaces"><a target="_blank" href="${e(urlDe("sala.html", S.codigo))}">Abrir el hemiciclo</a><a target="_blank" href="${e(urlDe("escano.html", S.codigo, LOCAL ? { yo: "ana" } : {}))}">Abrir un escaño</a></p>
      <div class="fila"><label class="lbl" for="inBots">Escaños de ensayo</label><input id="inBots" type="number" min="0" max="40" value="${s.bots || 0}"><button data-a="bots">Aplicar</button></div>
      <p class="ayuda">Votan y redactan solos, para ensayar. Antes de la clase, déjalos en 0.</p>
      ${S.dueno ? `<label class="lbl" for="inDocentes">Equipo docente (un correo de Google por línea)</label>
        <textarea id="inDocentes" rows="3" placeholder="correo@ejemplo.cl">${e((s.docentes || []).join("\n"))}</textarea>
        <div class="fila"><button data-a="docentes">Guardar el equipo</button></div>
        <p class="ayuda">Con su correo en esta lista pueden usar la testera desde su propia cuenta. El hemiciclo tiene que estar abierto con tu cuenta.</p>` : ""}</section>`;
}

/* ---------------- pintar ---------------- */
function render() {
  const s = S.sala;
  if (!s) return;
  if (!S.dueno && !S.docente) return mensaje(`<h1>La testera</h1><p>La cuenta ${e(S.yo.email)} no es del equipo docente de la sala ${e(S.codigo)}.</p><p>Pide a quien la creó que agregue tu correo en Secretaría.</p>
    <p>¿Vienes a ocupar tu escaño? <a class="boton" href="${e(urlDe("escano.html", S.codigo))}">Entrar como estudiante</a></p>`);
  $("pestanas").hidden = false;
  pintar($("arriba"), cabecera());
  const ancho = window.matchMedia("(min-width: 1000px)").matches;
  const col = (id, nombre, html) => `<div class="col${U.pestana === id ? " activa" : ""}" data-col="${id}"><h2 class="col-tit">${nombre}</h2>${html}</div>`;
  pintar(vista, col("presidente", "Presidente", presidente()) + col("ejecutivo", "Ejecutivo", ejecutivo()) + col("secretaria", "Secretaría", secretaria()));
  document.body.classList.toggle("ancho", ancho);
  for (const p of $("pestanas").querySelectorAll("button")) p.classList.toggle("elegido", p.dataset.p === U.pestana);
  relojes();
}
function relojes() { const r = $("reloj"); if (r && S.sala) r.textContent = S.sala.reloj ? "Reloj " + relojTexto(S.sala.reloj) : ""; }
setInterval(relojes, 500);
setInterval(() => { if (S.sala && !S.dueno) pintar($("arriba"), cabecera()); }, 10000);

document.addEventListener("click", async ev => {
  const b = ev.target.closest("[data-a]"); if (!b || !S.sala) return;
  const a = b.dataset.a, d = b.dataset;
  if (a === "sig") { if (Date.now() - ultimoSig < 600) return; ultimoSig = Date.now(); await hacer({ t: "sig" }); }
  else if (a === "reabrir") await hacer({ t: "reabrir" });
  else if (a === "palabra") await hacer({ t: "palabra", b: +d.b });
  else if (a === "reloj") await hacer({ t: "reloj", dur: +d.dur, b: S.sala.palabra || 0 });
  else if (a === "pedir") await hacer({ t: "pedir", b: +d.b, mod: d.mod });
  else if (a === "validar") await hacer({ t: "validar", b: +d.b, d: +d.d });
  else if (a === "nota") { const txt = $("inNota").value; U.notas[+d.n] = txt; if (await hacer({ t: "nota", n: +d.n, txt })) nota("Nota guardada."); }
  else if (a === "senadoEnsayo") await hacer({ t: "senadoEnsayo" });
  else if (a === "ir") { const [fase, n] = $("selIr").value.split(":"); if (!(await hacer({ t: "ir", fase, nudo: +n || 0 }))) nota("Todavía no se puede ir a ese momento."); }
  else if (a === "urgencia") await hacer({ t: "urgencia", n: +d.n, on: !!d.on });
  else if (a === "patrocinio") await hacer({ t: "patrocinio", on: !!d.on });
  else if (a === "vetar") await hacer({ t: "vetar", n: +d.n });
  else if (a === "recibir") await hacer({ t: "recibir", n: +d.n });
  else if (a === "partida") await hacer({ t: "partida", n: +d.n });
  else if (a === "filtrar") await hacer({ t: "filtrar", id: d.id || null });
  else if (a === "bots") await hacer({ t: "bots", k: +$("inBots").value });
  else if (a === "vozArmar") voz.armar(!voz.estado().armado);
  else if (a === "vozProbar") voz.probar(!voz.estado().probando);
  else if (a === "vozReabrir") voz.reabrir();
  else if (a === "borrarDicho") await hacer({ t: "borrarDicho", id: d.id });
  else if (a === "dictada") { if (await hacer({ t: "dictada", n: +d.n })) { delete U.ed[+d.n]; nota("Lo que leyó la bancada quedó en el comparado."); } }
  else if (a === "indicar") {
    const n = +d.n;
    if (await hacer({ t: "indicar", n, tipo: $("edTipo" + n).value, texto: $("edTexto" + n).value })) { delete U.ed[n]; U.edN = 0; nota("Guardado en el comparado."); }
    else nota("Falta el texto de la indicación.");
  }
  else if (a === "docentes" && S.dueno) {
    const lista = $("inDocentes").value.split(/[\s,;]+/).map(x => x.trim().toLowerCase()).filter(x => x.includes("@")).slice(0, 10);
    try { await S.canal.cambiarSala(S.codigo, { docentes: lista }); nota("Equipo guardado."); } catch (x) { console.warn(x); nota("No se pudo guardar."); }
  }
  if (S.dueno) render();
});
vista.addEventListener("input", ev => {
  if (ev.target.id === "inNota" && S.sala) U.notas[S.sala.nudo] = ev.target.value;
  // lo que la Secretaría va corrigiendo se guarda aparte: un repintado no se lo lleva
  const n = +ev.target.dataset.ed || 0;
  if (n) U.ed[n] = { tipo: $("edTipo" + n).value, texto: $("edTexto" + n).value };
});
vista.addEventListener("toggle", ev => {
  const d = ev.target.closest && ev.target.closest("details.corregir"); if (!d) return;
  const n = +d.dataset.n;
  if (d.open) U.edN = n; else if (U.edN === n) U.edN = 0;
}, true);
$("pestanas").addEventListener("click", ev => { const b = ev.target.closest("button"); if (b) { U.pestana = b.dataset.p; render(); window.scrollTo(0, 0); } });
window.addEventListener("resize", () => S.sala && render());

/* ---------------- entrada ---------------- */
function mensaje(html) { $("pestanas").hidden = true; pintar($("arriba"), ""); pintar(vista, `<div class="entrada">${html}</div>`); }
function inicio() {
  mensaje(`<h1>La testera</h1><p>El control del equipo docente: Presidente, Ejecutivo y Secretaría.</p>
    <form id="fAbrir"><label for="inCodigo">Código de la sala</label><input id="inCodigo" maxlength="8" autocomplete="off" value="${e(reciente())}"><button class="boton">Abrir</button></form>
    <p><button class="boton hueco" id="btnCrear">Crear una sala nueva</button></p>
    <p class="ayuda">Entraste como ${e(S.yo.email)}. La cuenta que crea la sala es la que la conduce.</p>`);
  $("fAbrir").onsubmit = ev => { ev.preventDefault(); const c = $("inCodigo").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c) location.href = urlDe("testera.html", c, yoExtra()); };
  $("btnCrear").onclick = async () => {
    try { const c = await S.canal.crearSala(salaNueva()); recordar(c); location.href = urlDe("testera.html", c); }
    catch (x) { console.warn(x); nota("No se pudo crear la sala. Solo las cuentas de profesor autorizadas pueden crear salas."); }
  };
}
const yoExtra = () => (LOCAL && S.yo && S.yo.uid !== "ensayo" ? { yo: S.yo.uid } : {});
function abrir() {
  if (!S.codigo) return inicio();
  if (U.oyendo) return;
  U.oyendo = true;
  S.canal.escucharSala(S.codigo, sala => {
    if (!sala || sala.modo !== "sala") { S.sala = null; return mensaje(`<h1>La testera</h1><p>No existe la sala ${e(S.codigo)}.</p><p><a class="boton" href="${e(urlDe("testera.html", "", yoExtra()))}">Volver</a></p>`); }
    S.sala = sala;
    S.dueno = sala.profeUid === S.yo.uid;
    S.docente = S.dueno || (sala.docentes || []).map(x => String(x).toLowerCase()).includes(String(S.yo.email).toLowerCase());
    if (S.dueno) { recordar(S.codigo); if (!motor) motor = iniciarMotor(S, { principal: false }); }
    // la testera de quien conduce, abierta en un teléfono: la portada del proyector ya puede mostrar el QR del curso
    if (S.dueno && !sala.telefono && !U.avisado && window.matchMedia("(pointer: coarse)").matches) { U.avisado = true; hacer({ t: "telefono" }); }
    if (!voz) voz = crearVoz(S, () => S.sala && render());
    render();
    voz.sincronizar();
    if (motor) motor();
  });
  S.canal.escucharEscanos(S.codigo, lista => { S.jugadores = lista; if (S.sala) { render(); if (motor) motor(); } });
  S.canal.escucharLatido(S.codigo, t => { U.latido = t; });
}
(async function partir() {
  mensaje("<p>Conectando…</p>");
  try { S.canal = await conectar(); }
  catch (x) { console.warn(x); return mensaje("<h1>La testera</h1><p>No se pudo conectar. Revisa la conexión y recarga.</p>"); }
  S.canal.alEntrar(u => {
    S.yo = u;
    if (!u) {
      mensaje(`<h1>La testera</h1><p>Entra con tu cuenta de Google.</p><button class="boton" id="btnEntrar">Entrar con Google</button>`);
      $("btnEntrar").onclick = () => S.canal.entrar().catch(x => { console.warn(x); nota("No se pudo entrar. Permite las ventanas emergentes e intenta de nuevo."); });
      return;
    }
    abrir();
  });
})();
