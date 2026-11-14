/* =====================================================================
   LA SALA — el hemiciclo: la pantalla del proyector (sala.html).
   Solo muestra: el comparado, los escaños que se encienden, el triángulo del poder y lo que oye
   el micrófono del profesor (vivo/voz y los párrafos de la sala). Si la abre la cuenta que creó
   la sala, además hace de motor (ver sala-comun.js) y avanza con la flecha →.
   ===================================================================== */
import { D, L, P, LOCAL, $, e, VOTO, ESTADO, conectar, urlDe, codigoPedido, recordar, reciente, salaNueva, pintar, nota,
  relojTexto, relojVencido, qrDe, despachar, motorPrincipal, crearHemiciclo, escanosConVoto, crearTriangulo, repartoTexto,
  hojaVigente, comparado, chip, tablaPuntaje, tablaEscanosHTML, aplausosDelNudo, fraseVoto, vertice } from "./sala-comun.js?v=20261114b";

const S = { canal: null, codigo: codigoPedido(), yo: null, sala: null, jugadores: [], dueno: false, docente: false, voz: null };
let micPintado = false, qrCurso = false;      // qrCurso: quien conduce pidió ver ya el QR del curso
const raiz = $("sala"), escena = $("escena");
let hemi = null, tri = null, motor = null, oyendo = false;
const FOCO_HEMI = ["general", "generalR", "votacion", "resultado", "insistencia", "insistenciaR"];

const nd = () => L.nudoDe(D, S.sala.nudo);
const titulo = n => `<p class="sobre">Nudo ${n.n} de ${D.nudos.length} <span>${e(n.articulos)}</span></p><h2>${e(n.titulo)}</h2>`;
const sello = (txt, cls) => `<p class="veredicto ${cls}">${e(txt)}</p>`;
const conteo = r => `<div class="conteo"><span class="k f"><b>${r.f}</b>${VOTO.f}</span><span class="k c"><b>${r.c}</b>${VOTO.c}</span><span class="k a"><b>${r.a}</b>${VOTO.a}</span></div>`;

/* ---------------- las escenas ---------------- */
const ESCENAS = {
  portada() {
    // primero el QR de quien conduce (abre la testera en su teléfono); después, el del curso
    // (en el ensayo local no hay teléfono que escanee: solo se ve con &qr=profe, para revisar la pantalla)
    const profe = L.qrDePortada(S.sala, { dueno: S.dueno, local: LOCAL && P.get("qr") !== "profe", saltar: qrCurso }) === "profe";
    const url = urlDe(profe ? "testera.html" : "escano.html", S.codigo), qr = qrDe(url), corta = url.replace(/^https?:\/\//, "").replace(/\?.*$/, "");
    return `<div class="e-portada">
      <div class="txt">
        <h1>La Sala</h1>
        <p class="bajada">Hoy el curso es el Senado. Se discute, artículo por artículo, la ley de inteligencia artificial.</p>
        <p class="idea">${e(D.ideaCentral)}</p>
      </div>
      <div class="entra${profe ? " profe" : ""}">
        ${profe ? '<p class="para">Para quien conduce</p>' : ""}
        ${qr ? `<div class="qr">${qr}</div>` : ""}
        ${profe ? `<p class="dir">Escanéalo con tu teléfono: abre la testera y el micrófono de esta sala.</p>
          <p class="dir">Cuando tu teléfono entre, aquí aparece el QR del curso. <button class="texto" data-a="qrCurso">Mostrarlo ya (tecla Q)</button></p>`
          : `<p class="dir">${e(corta)}</p>
        <p class="cod">Código <b>${e(S.codigo)}</b></p>`}
        ${LOCAL ? `<p class="ensayo"><a target="_blank" href="${e(urlDe("testera.html", S.codigo, { simular: 1 }))}">Abrir la testera (micrófono simulado)</a><a target="_blank" href="${e(urlDe("escano.html", S.codigo, { yo: "ana" }))}">Abrir un escaño</a></p>` : ""}
      </div>
    </div>`;
  },
  cuenta() {
    return `<div class="e-lista"><p class="sobre">Boletín ${e(D.boletin)}</p><h2>La cuenta: dónde está el proyecto</h2>
      <ol class="pasos">${D.cuenta.map(x => `<li>${e(x)}</li>`).join("")}</ol><p class="fte">${e(D.cuentaFuente)}</p></div>`;
  },
  general() {
    const r = L.contar(L.votosDe(S.sala, S.jugadores, "g"), L.sentados(S.sala, S.jugadores).length);
    return `<div class="e-voto"><p class="sobre">Votación en general</p><h2>¿Se aprueba la idea de legislar?</h2>
      <p class="guia">Vota desde tu teléfono, a mano alzada.</p>${conteo(r)}<p class="van">Han votado ${r.votaron} de ${r.escanos}</p></div>`;
  },
  generalR() {
    const r = (S.sala.general || {}).r || L.contar({}, 0);
    return `<div class="e-voto"><p class="sobre">Votación en general</p>
      ${sello(r.aprobada ? "Aprobado en general" : "Rechazado en general", r.aprobada ? "si" : "no")}
      ${conteo(r)}
      <p class="guia">${r.aprobada ? "Ahora viene la discusión en particular: artículo por artículo." : "En el Senado, el proyecto terminaría aquí. En este taller seguimos con el articulado."}</p></div>`;
  },
  sorteo() {
    const c = L.porBancada(S.sala.sorteo);
    return `<div class="e-bancadas"><h2>Las cuatro bancadas</h2><div class="bancadas">${D.bancadas.map(b => `
      <article style="--b:${b.color}"><h3>${e(b.nombre)}</h3><p class="pos">${e(b.posicion)}</p>
        <p class="rol">Redacta el nudo ${b.autora}: ${e(L.nudoDe(D, b.autora).titulo)}</p>
        <p class="rol">Responde el nudo ${b.impugna}: ${e(L.nudoDe(D, b.impugna).titulo)}</p>
        <p class="cuantos">${c[b.n]} ${c[b.n] === 1 ? "escaño" : "escaños"}</p></article>`).join("")}</div></div>`;
  },
  nudos() {
    const n = nd();
    return `<div class="e-nudo">${titulo(n)}<div class="dos">
      <div class="lado"><p class="pregunta">${e(n.pregunta)}</p>
        <p class="quien">Redacta la indicación ${chip(n.autora)}</p><p class="quien">La responde ${chip(n.impugna)}</p></div>
      ${hojaVigente(n)}</div></div>`;
  },
  redaccion() {
    return `<div class="e-redaccion"><div class="cab"><div><h2>Las bancadas redactan en papel</h2><p class="guia">${e(D.reglas.papel)}</p></div><span class="reloj" id="reloj"></span></div>
      <div class="filas">${D.nudos.map(n => {
        const ind = L.indicacionDe(S.sala, S.jugadores, D, n.n), lista = ind && (ind.origen !== "borrador");
        return `<article class="${lista ? "lista" : ""}" style="--b:${L.bancada(D, n.autora).color}">
          <div class="quien"><b>Nudo ${n.n}</b>${e(n.titulo)}${chip(n.autora)}</div>
          <p class="hoy">${e(n.vigente.simple)}</p>
          <p class="ind">${ind ? `<b>${e(ind.tipo ? ind.tipo[0].toUpperCase() + ind.tipo.slice(1) : "Borrador")}.</b> ${e(ind.texto)}` : `<i>La lee en voz alta ${e(L.bancada(D, n.autora).nombre)}.</i>`}</p>
          <span class="estado">${lista ? "Entregada" : ind ? "Redactando" : "En papel"}</span></article>`; }).join("")}</div></div>`;
  },
  lectura() {
    const n = nd();
    return `<div class="e-comparado"><div class="cab"><div>${titulo(n)}</div><p class="quien">Lee su indicación ${chip(n.autora)}</p></div>
      ${comparado(n, L.indicacionDe(S.sala, S.jugadores, D, n.n))}${oido(n, false)}</div>`;
  },
  tarea() {
    return `<div class="e-lista"><p class="sobre">Fin del acto 1</p><h2>Para el jueves</h2><p class="guia">${e(D.tarea)}</p>
      <table class="roles"><tbody>${D.bancadas.map(b => `<tr><td>${chip(b.n)}</td><td>defiende el nudo ${b.autora}</td><td>responde el nudo ${b.impugna}</td></tr>`).join("")}</tbody></table></div>`;
  },
  apertura() {
    return `<div class="e-lista"><p class="sobre">Acto 2</p><h2>Se abre la Sala</h2>
      <table class="orden"><tbody>${D.nudos.map(n => `<tr><td class="num">${n.n}</td><td><b>${e(n.titulo)}</b></td><td>${chip(n.autora)} defiende</td><td>${chip(n.impugna)} responde</td>
        <td>${(S.sala.urg || {})[n.n] ? '<span class="marca-regla">Urgencia</span>' : ""}${n.requierePatrocinio ? `<span class="marca-regla">${S.sala.pat ? "Con patrocinio" : "Necesita patrocinio"}</span>` : ""}</td></tr>`).join("")}</tbody></table>
      <p class="guia">${e(D.reglas.senado)}</p></div>`;
  },
  pelea() {
    const n = nd(), voz = (p, lado) => `<blockquote class="voz ${lado}"><p class="cita">${p.textual ? "«" + e(p.cita) + "»" : e(p.cita)}</p>
      <footer><b>${e(p.quien)}</b> ${e(p.cargo)}<span>${e(p.fuente)}</span></footer></blockquote>`;
    return `<div class="e-pelea">${titulo(n)}<div class="voces">${voz(n.pelea[0], "izq")}${voz(n.pelea[1], "der")}</div>
      <p class="pregunta">Se vota: ${e(n.pregunta)}</p></div>`;
  },
  defensa() { return debate("Defiende", nd().autora); },
  respuesta() { return debate("Responde", nd().impugna); },
  votacion() {
    const n = nd(), r = L.contar(L.votosDe(S.sala, S.jugadores, "v", n.n), L.sentados(S.sala, S.jugadores).length);
    return `<div class="e-voto"><p class="sobre">Nudo ${n.n}: votación nominal</p><h2>${e(n.pregunta)}</h2>
      ${conteo(r)}<p class="van">Han votado ${r.votaron} de ${r.escanos}</p></div>`;
  },
  resultado() {
    const n = nd(), r = (L.deNudo(S.sala, n.n).v || {}).r || L.contar({}, 0);
    if (!r.quorum) return `<div class="e-voto"><p class="sobre">Nudo ${n.n}</p>${sello("Sin quórum", "no")}${conteo(r)}<p class="guia">${e(D.reglas.quorum)}</p></div>`;
    return `<div class="e-voto"><p class="sobre">Nudo ${n.n}: ${e(n.titulo)}</p>${sello(r.aprobada ? "Aprobada" : "Rechazada", r.aprobada ? "si" : "no")}
      ${conteo(r)}<p class="guia">${r.f === r.c ? "Con empate no se aprueba. " : ""}Gana la sala ${chip(r.aprobada ? n.autora : n.impugna)}</p></div>`;
  },
  apuesta() {
    const n = nd(), k = Object.keys(L.apuestasDe(S.sala, S.jugadores, n.n)).length;
    return `<div class="e-senado"><p class="sobre">Nudo ${n.n}: el Senado simulado</p><h2>¿Sobreviviría fuera de esta sala?</h2>
      <p class="guia">Cinco senadores simulados votan la misma indicación. Apuesta en tu teléfono: ¿la aprueban o la rechazan?</p>
      ${senadores(n.n, 0)}<p class="van">${k} ${k === 1 ? "apuesta" : "apuestas"}. ${e(D.senadoAviso)}</p></div>`;
  },
  senado() {
    const n = nd(), x = L.deNudo(S.sala, n.n), s = x.sen || {}, listo = s.estado === "listo", visto = listo ? s.visto || 0 : 0;
    let pie = `<p class="van">${listo ? "" : "Los senadores están leyendo la indicación…"}</p>`;
    if (s.r) {
      const sala = x.v.r.aprobada, ap = L.resumenApuestas((x.ap || {}).de, s.r.aprueba);
      const contraste = sala === s.r.aprueba ? "La sala y el Senado simulado coinciden."
        : sala ? "La sala la aprobó, pero fuera de esta sala no sobreviviría." : "La sala la rechazó, pero el Senado simulado la habría aprobado.";
      pie = `<div class="fallo">${sello(s.r.aprueba ? "El Senado simulado aprueba" : "El Senado simulado rechaza", s.r.aprueba ? "si" : "no")}
        <p class="guia">${s.r.f} a favor, ${s.r.c} en contra.${s.r.f === s.r.c ? " Con empate no se aprueba." : ""} ${contraste}${ap.n ? ` Acertaron ${ap.acertaron} de ${ap.n} apuestas.` : ""}</p>${delDebate(n, s)}</div>`;
    }
    return `<div class="e-senado"><p class="sobre">Nudo ${n.n}: el Senado simulado</p>${senadores(n.n, visto, s.votos)}${pie}</div>`;
  },
  inadmisible() {
    const n = nd();
    return `<div class="e-voto ancho"><p class="sobre">Nudo ${n.n}: ${e(n.titulo)}</p>${sello("Inadmisible", "no")}
      <p class="guia">${e(D.reglas.inadmisible.replace("Inadmisible: la", "La"))}</p><p class="guia">${e(D.reglas.patrocinio)}</p>
      <p class="van">La bancada ${e(L.bancada(D, n.autora).nombre)} todavía puede conseguir el patrocinio del Ejecutivo.</p></div>`;
  },
  cierre() {
    const n = nd(), x = L.deNudo(S.sala, n.n), est = L.estadoNudo(S.sala, n.n);
    const linea = x.inadm ? "No se votó: faltó el patrocinio del Ejecutivo."
      : `Sala: ${x.v.r.aprobada ? "aprobada" : "rechazada"}, ${x.v.r.f} a ${x.v.r.c}.${x.sen && x.sen.r ? ` Senado simulado: ${x.sen.r.aprueba ? "aprueba" : "rechaza"}, ${x.sen.r.f} a ${x.sen.r.c}.` : ""}`;
    return `<div class="e-comparado cierre">${titulo(n)}${comparado(n, (S.sala.ind || {})[n.n], { estado: est, fundamentos: false, breve: true })}
      <p class="linea">${e(linea)} ${L.enLaLey(est) ? `El poder se mueve hacia ${e(vert(n.mueve.hacia))}, desde ${e(vert(n.mueve.desde))}.` : "El texto del Mensaje queda como estaba."}</p>
      <div class="actores"><b>Qué quieren los actores reales</b><p>${e(n.actores)}</p><span>${e(n.actoresFuente)}</span></div></div>`;
  },
  veto() {
    const v = S.sala.vetado;
    return `<div class="e-lista"><p class="sobre">El Ejecutivo</p><h2>${v ? "El Ejecutivo veta una indicación" : "¿Promulga o veta?"}</h2>
      ${filasLey()}<p class="guia">${e(D.reglas.veto)} ${e(D.reglas.insistencia)}</p></div>`;
  },
  insistencia() {
    const m = S.sala.vetado, r = L.dosTercios(L.votosDe(S.sala, S.jugadores, "ins", m));
    return `<div class="e-voto"><p class="sobre">Veto al nudo ${m}: ${e(L.nudoDe(D, m).titulo)}</p><h2>¿Insiste la sala?</h2>
      <p class="guia">Para mantener la indicación hacen falta dos tercios.</p>${conteo(r)}<p class="van">Han votado ${r.votaron}</p></div>`;
  },
  insistenciaR() {
    const m = S.sala.vetado, r = (L.deNudo(S.sala, m).ins || {}).r || L.dosTercios({});
    return `<div class="e-voto"><p class="sobre">Veto al nudo ${m}</p>${sello(r.insiste ? "La sala insiste" : "El veto se mantiene", r.insiste ? "si" : "no")}
      ${conteo(r)}<p class="guia">Hacían falta ${r.necesarios} votos a favor. Hubo ${r.f}.</p></div>`;
  },
  final() {
    const ley = L.leyDespachada(S.sala, D), dif = ley.filter(x => x.distinto).length;
    return `<div class="e-final"><h2>La ley que despachó este curso</h2>${filasLey()}
      <p class="linea">${e(repartoTexto(S.sala))}${dif ? ` En ${dif} ${dif === 1 ? "nudo" : "nudos"}, la sala y el Senado simulado votaron distinto.` : ""}</p>
      ${L.tablaEscanos(S.sala, S.jugadores, D).some(x => x.total > 0)
        ? `<div class="tablas"><div>${tablaPuntaje(S.sala)}</div><div><p class="sobre">Quién leyó mejor a la sala</p>${tablaEscanosHTML(S.sala, S.jugadores, 5)}</div></div>`
        : tablaPuntaje(S.sala)}</div>`;
  }
};
const vert = vertice;
function debate(verbo, b) {
  const n = nd(), p = S.sala.pedido;
  return `<div class="e-debate"><div class="cab"><div>${`<p class="sobre">Nudo ${n.n}: ${e(n.titulo)}</p>`}<h2>${verbo} ${chip(b)}</h2></div><span class="reloj" id="reloj"></span></div>
    ${(S.sala.urg || {})[n.n] ? '<p class="marca-regla suelta">Con urgencia: la mitad del tiempo</p>' : ""}
    ${p ? `<p class="pedido">El presidente pide a ${chip(p.b)} fundar su posición en un concepto del módulo de ${e(D.modulos[p.mod])}.</p>` : ""}
    ${comparado(n, (S.sala.ind || {})[n.n], { breve: micVivo() || L.debateDe(S.sala, n.n).length > 0 })}${oido(n, true)}</div>`;
}
// ¿está vivo el micrófono del profesor? (late cada 5 s mientras está activo)
const micVivo = () => !!(S.voz && S.voz.activo && Date.now() - (S.voz.t || 0) < 16000);
// Lo que se oye: los últimos párrafos cerrados, con sus aplausos, y la línea que se está diciendo.
// La línea viva se escribe aparte (vivo()), para no repintar la escena cada 700 ms.
function oido(n, conParrafos) {
  const ps = conParrafos ? L.debateDe(S.sala, n.n).slice(-3) : [], c = ps.length ? aplausosDelNudo(S, n.n) : {};
  if (!micVivo() && !ps.length) return "";
  return `<div class="oido">${ps.length ? `<div class="dichos">${ps.map(p => `<article style="--b:${L.bancada(D, p.b).color}"><p>${e(p.texto)}</p>
      <footer>${chip(p.b)}<span>${c[p.id] || 0} ${c[p.id] === 1 ? "aplauso" : "aplausos"}</span></footer></article>`).join("")}</div>` : ""}
    <div class="vivo${micVivo() ? "" : " pausa"}"><b>${micVivo() ? "Se oye" : "Micrófono apagado"}</b><p><span id="vivoTxt"></span></p></div></div>`;
}
function vivo() {
  const p = $("vivoTxt"), s = S.sala, v = S.voz;
  if (!p || !s) return;
  p.textContent = micVivo() && v.texto && v.b === s.palabra ? v.texto : "";
}
// Después del último voto: qué fundamentos validó el Senado y cuál fue el mejor párrafo de cada bancada.
function delDebate(n, s) {
  const ps = Object.fromEntries(L.debateDe(S.sala, n.n).map(p => [p.id, p])), bs = [n.autora, n.impugna];
  const mejores = bs.map(b => ps[(s.mejores || {})[b]]).filter(Boolean);
  if (!mejores.length) return "";
  const piso = bs.filter(b => (s.piso || {})[b] === true);
  return `<div class="del-debate">${mejores.map(p => `<blockquote style="--b:${L.bancada(D, p.b).color}"><p>${e(p.texto)}</p><footer>Lo mejor de ${chip(p.b)}</footer></blockquote>`).join("")}</div>
    ${Object.keys(s.piso || {}).length ? `<p class="van">${piso.length ? "Fundamento validado: " + piso.map(chip).join(" ") : "Ninguna bancada cumplió el piso: citar un artículo y aplicar un concepto de cada módulo."}</p>` : ""}`;
}
function senadores(n, visto, votos) {
  return `<div class="senadores">${D.senadores.map((sen, i) => {
    const v = votos && i < visto ? votos.find(x => x.id === sen.id) || votos[i] : null;
    return v ? `<article class="visto v-${v.voto}"><h3>${e(sen.nombre)}</h3><p class="sv">${VOTO[v.voto]}</p><p class="frase">${e(v.frase)}</p>${v.ensayo ? '<span class="ens">ensayo</span>' : ""}</article>`
      : `<article><h3>${e(sen.nombre)}</h3><p class="valora">Valora ${e(sen.valora)}.</p></article>`; }).join("")}</div>`;
}
function filasLey() {
  return `<div class="ley-filas">${L.leyDespachada(S.sala, D).map(x => `<article class="e-${x.estado}${S.sala.vetado === x.n && S.sala.fase === "veto" ? " en-veto" : ""}">
    <span class="num">${x.n}</span><div><b>${e(x.titulo)}</b>
    <p>${x.queda ? `Queda la indicación de ${e(L.bancada(D, L.nudoDe(D, x.n).autora).nombre)}: ${e((x.ind || {}).texto || "")}` : "Queda el texto del Mensaje."}</p></div>
    <span class="sello s-${x.estado}">${ESTADO[x.estado]}</span></article>`).join("")}</div>`;
}

/* ---------------- lo que rodea a la escena ---------------- */
function cinta() {
  const s = S.sala, f = s.fase, acto = L.actoDe(f), n = s.nudo ? L.nudoDe(D, s.nudo) : null;
  const donde = f === "portada" ? "" : acto === 1 ? "Acto 1: la comisión" : n ? `Acto 2: la Sala. Nudo ${n.n} de ${D.nudos.length}` : "Acto 2: la Sala";
  const k = L.sentados(s, S.jugadores).length;
  $("cintaFase").textContent = donde;
  $("cintaDer").innerHTML = `${micVivo() ? '<span class="mic-on">Micrófono activo</span>' : ""}Código <b>${e(S.codigo)}</b><span>${k} ${k === 1 ? "escaño" : "escaños"}</span>${S.dueno ? "" : '<span class="solo-mira" title="Esta pantalla no es la que creó la sala: solo muestra">solo muestra</span>'}`;
}
function pies() {
  const s = S.sala, c = L.porBancada(s.sorteo), hay = Object.keys(s.sorteo || {}).length;
  pintar($("hemiPie"), hay ? D.bancadas.map(b => `<span class="chip${s.palabra === b.n ? " habla" : ""}" style="--b:${b.color}">${e(b.nombre)} <i>${c[b.n]}</i></span>`).join("")
    : '<span class="tenue">Los escaños se ocupan a medida que entran.</span>');
  const t = L.triangulo(salaVisible(), D), u = t.pasos[t.pasos.length - 1];
  pintar($("triPie"), u ? `Nudo ${u.n}: hacia ${e(vert(u.hacia))}, desde ${e(vert(u.desde))}.` : "Punto de partida: el texto del Mensaje.");
}
function avisos() {
  const s = S.sala, a = s.aviso, f = s.filtVer ? D.filtraciones.find(x => x.id === s.filtVer.id) : null;
  pintar($("aviso"), a && a.txt ? `<b>Regla</b><span>${e(a.txt)}</span>` : "");
  $("aviso").hidden = !(a && a.txt);
  pintar($("prensa"), f ? `<p class="rot">Filtración</p><h3>${e(f.titular)}</h3><p>${e(f.detalle)}</p><span>${e(f.fuente)}</span>` : "");
  $("prensa").hidden = !f;
}
function relojes() {
  const r = $("reloj"), s = S.sala;
  if (!r || !s) return;
  r.textContent = relojTexto(s.reloj);
  r.classList.toggle("vencido", relojVencido(s.reloj));
}
function render() {
  const s = S.sala;
  if (!s) return;
  raiz.dataset.fase = s.fase;
  raiz.dataset.foco = FOCO_HEMI.includes(s.fase) ? "hemi" : "escena";
  raiz.dataset.acto = L.actoDe(s.fase);
  micPintado = micVivo();
  pintar(escena, (ESCENAS[s.fase] || (() => ""))());
  cinta(); pies(); avisos(); relojes(); vivo();
  hemi.pintar(escanosConVoto(S));
  tri.pintar(salaVisible());
}
// El triángulo se mueve en el cierre del nudo, no antes: mientras la sala vota, apuesta y oye
// al Senado simulado, el marcador sigue donde estaba.
function salaVisible() {
  const s = S.sala;
  if (!["resultado", "apuesta", "senado"].includes(s.fase)) return s;
  return { ...s, n: { ...(s.n || {}), [s.nudo]: {} } };
}

/* ---------------- entrada ---------------- */
function mensaje(html) {
  raiz.dataset.fase = "mensaje"; raiz.dataset.foco = "ancho";
  pintar(escena, `<div class="e-mensaje">${html}</div>`);
}
function inicio() {
  const r = reciente();
  mensaje(`<h1>La Sala</h1><p class="bajada">Esta es la pantalla del proyector.</p>
    <form id="fAbrir"><label for="inCodigo">Código de la sala</label><input id="inCodigo" maxlength="8" autocomplete="off" value="${e(r)}"><button class="boton">Abrir</button></form>
    <p><button class="boton hueco" id="btnCrear">Crear una sala nueva</button></p>
    <p class="tenue">Entraste como ${e(S.yo.email)}. La cuenta que crea la sala es la que la conduce: abre con ella esta pantalla y la testera.</p>`);
  $("fAbrir").onsubmit = ev => { ev.preventDefault(); const c = $("inCodigo").value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (c) location.href = urlDe("sala.html", c); };
  $("btnCrear").onclick = crear;
}
async function crear() {
  try { const c = await S.canal.crearSala(salaNueva()); recordar(c); location.href = urlDe("sala.html", c); }
  catch (x) { console.warn(x); nota("No se pudo crear la sala. Solo las cuentas de profesor autorizadas pueden crear salas."); }
}
function abrir() {
  if (!S.codigo) return LOCAL ? crear() : inicio();
  if (oyendo) return;
  oyendo = true;
  S.canal.escucharSala(S.codigo, sala => {
    if (!sala) return mensaje(`<h1>La Sala</h1><p class="bajada">No existe la sala ${e(S.codigo)}.</p><p><a class="boton" href="${e(urlDe("sala.html", ""))}">Volver</a></p>`);
    if (sala.modo !== "sala") return mensaje(`<h1>La Sala</h1><p class="bajada">El código ${e(S.codigo)} es de otro juego de Tribuna.</p>`);
    S.sala = sala;
    S.dueno = sala.profeUid === S.yo.uid;
    if (S.dueno) { recordar(S.codigo); if (!motor) motor = motorPrincipal(S); }
    render();
    if (motor) motor();
  });
  S.canal.escucharEscanos(S.codigo, lista => { S.jugadores = lista; if (S.sala) { render(); if (motor) motor(); } });
  // la voz en vivo: solo se repinta la escena si el micrófono se prendió o se apagó
  S.canal.escucharVoz(S.codigo, v => { S.voz = v; if (S.sala && micVivo() !== micPintado) render(); else vivo(); });
  setInterval(() => { if (S.sala && micVivo() !== micPintado) render(); }, 4000);
}
escena.addEventListener("click", ev => { if (ev.target.closest('[data-a="qrCurso"]')) { qrCurso = true; render(); } });
let ultimaTecla = 0;
document.addEventListener("keydown", ev => {
  if (!S.dueno || !S.sala || (ev.target.closest && ev.target.closest("input, textarea"))) return;
  if (ev.key === "q" || ev.key === "Q") { qrCurso = !qrCurso; return render(); }
  if (!["ArrowRight", "PageDown"].includes(ev.key) || Date.now() - ultimaTecla < 450) return;
  ultimaTecla = Date.now();
  despachar(S, { t: "sig" });
});
setInterval(relojes, 500);

(async function partir() {
  hemi = crearHemiciclo($("hemiSvg")); tri = crearTriangulo($("triSvg"));
  mensaje("<p class='bajada'>Conectando…</p>");
  try { S.canal = await conectar(); }
  catch (x) { console.warn(x); return mensaje("<h1>La Sala</h1><p class='bajada'>No se pudo conectar. Revisa la conexión y recarga la página.</p>"); }
  S.canal.alEntrar(yo => {
    S.yo = yo;
    if (!yo) {
      mensaje(`<h1>La Sala</h1><p class="bajada">Esta es la pantalla del proyector. Entra con la cuenta que conduce la sala.</p><p><button class="boton" id="btnEntrar">Entrar con Google</button></p>`);
      $("btnEntrar").onclick = () => S.canal.entrar().catch(x => { console.warn(x); nota("No se pudo entrar. Permite las ventanas emergentes e intenta de nuevo."); });
      return;
    }
    abrir();
  });
})();
