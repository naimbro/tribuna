/* =====================================================================
   TRIBUNA — panel del profesor (admin.html).
   Todas las partidas que creó esta cuenta, agrupadas por curso (como en ml2). Por partida:
   estado, ganador, quiénes jugaron y el feedback de los alumnos, que se lee aquí y no en la
   pantalla proyectada (con nombre delante del curso cambia lo que la gente se atreve a
   escribir). Desde aquí se abre una partida nueva o se vuelve a una existente.
   Lee salas/{codigo} (lo público), sus jugadores y su feedback; escribe `archivada` y, con
   🏁 TERMINAR, el cierre de una partida que quedó abierta.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, getDoc, setDoc, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const iniciales = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();
const COL = { A: "var(--A)", B: "var(--B)", P: "var(--P)" };
const V = { partidas: [], verArchivadas: false, verVacias: false, abiertas: new Set() };

const cursoDe = s => s.curso || (typeof SESIONES !== "undefined" && SESIONES.find(x => x.semana === s.semana)?.curso) || "Sin curso";
const fecha = s => s.creada || s.actualizado || 0;
const fmtFecha = t => t ? new Date(t).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function estadoDe(s) {
  if (s.etapa === "portada") return ["en portada", "vivo"];
  if (s.etapa === "intro") return ["intro", "vivo"];
  if (s.fase === "fin") return s.veredicto ? ["terminada", "fin"] : ["por revelar", "vivo"];
  if (s.modo === "rotacion") {
    if (s.fase === "fin") return [s.veredicto ? "terminada" : "por revelar", s.veredicto ? "fin" : "vivo"];
    return [s.debate ? `debate ${s.debate.n}` : "sin empezar", s.debate ? "vivo" : ""];
  }
  if (s.fase === "abierta") return [`tramo ${s.ronda + 1} abierto`, "vivo"];
  if (!s.turnos?.length && s.ronda === 0 && s.fase === "listo") return ["sin empezar", ""];
  return [`tramo ${s.ronda + 1}/${s.totalRondas || 3}`, ""];
}

// Rotación: el campeón (o quien va primero). Salas antiguas: se calcula con sus marcadores.
function ganadorDe(s) {
  if (s.modo === "rotacion") return s.veredicto && s.veredicto.campeon ? `Grupo ${s.veredicto.campeon}` : (s.ranking && s.ranking[0] && s.ranking[0].debates ? `Grupo ${s.ranking[0].grupo} (va primero)` : null);
  const v = s.veredicto; if (!v) return null;
  if (v.ganaG) return v.ganaG;
  const noms = [v.ganaP, v.pubN ? v.ganaU : null, v.ganaR].filter(x => x != null);
  const A = s.equipos?.A?.nombre, B = s.equipos?.B?.nombre;
  const a = noms.filter(x => x === A).length, b = noms.filter(x => x === B).length;
  return a > b ? A : b > a ? B : "EMPATE";
}
const colorEquipo = (s, nombre) => nombre === s.equipos?.A?.nombre ? s.equipos.A.color : nombre === s.equipos?.B?.nombre ? s.equipos.B.color : "var(--txt)";

function promedio(fb) {
  const notas = fb.map(f => f.nota).filter(n => typeof n === "number");
  return { prom: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null, n: notas.length, total: fb.length };
}

/* ------------------------------ carga ------------------------------ */
async function cargar(uid) {
  $("main").innerHTML = `<div class="aviso">Cargando tus partidas…</div>`;
  const snap = await getDocs(query(collection(db, "salas"), where("profeUid", "==", uid)));
  const salas = []; snap.forEach(d => salas.push({ codigo: d.id, ...d.data() }));
  // jugadores y feedback de cada sala, en paralelo (son pocos por sala)
  V.partidas = await Promise.all(salas.map(async s => {
    const [js, fb, tl, bj] = await Promise.all([
      getDocs(collection(db, "salas", s.codigo, "jugadores")).catch(() => null),
      getDocs(collection(db, "salas", s.codigo, "feedback")).catch(() => null),
      getDocs(collection(db, "salas", s.codigo, "telemetria")).catch(() => null),
      getDocs(collection(db, "salas", s.codigo, "brujula")).catch(() => null)
    ]);
    const brujula = {}; bj?.forEach(d => brujula[d.id] = d.data());
    const telemetria = []; tl?.forEach(d => telemetria.push(d.data()));
    const jugadores = []; js?.forEach(d => jugadores.push({ uid: d.id, ...d.data(), brujula: brujula[d.id] || null }));
    const feedback = []; fb?.forEach(d => feedback.push({ uid: d.id, ...d.data() }));
    return { s, jugadores, feedback, telemetria };
  }));
  pintar();
}

/* ------------------------------ pintar ----------------------------- */
function pintar() {
  const visibles = V.partidas.filter(p => (V.verArchivadas || !p.s.archivada) && (V.verVacias || p.jugadores.length > 0));
  const ocultas = V.partidas.length - visibles.length;
  const cursos = {};
  for (const p of visibles) (cursos[cursoDe(p.s)] = cursos[cursoDe(p.s)] || []).push(p);
  // los cursos del catálogo aparecen aunque no tengan partidas: desde ahí se crea la primera
  for (const x of (typeof SESIONES !== "undefined" ? SESIONES : [])) if (x.curso && !cursos[x.curso]) cursos[x.curso] = [];
  const orden = Object.keys(cursos).sort((a, b) =>
    Math.max(0, ...cursos[b].map(p => fecha(p.s))) - Math.max(0, ...cursos[a].map(p => fecha(p.s))));

  $("main").innerHTML = `
    <div class="barra"><h1>Mis partidas</h1>
      <label class="chk"><input type="checkbox" id="chkVacias" ${V.verVacias ? "checked" : ""}> salas sin jugadores</label>
      <label class="chk"><input type="checkbox" id="chkArch" ${V.verArchivadas ? "checked" : ""}> archivadas</label>
      <button class="btn sm" id="btnRecargar">⟳ actualizar</button></div>
    ${ocultas ? `<p style="color:var(--dim2);font-size:12.5px;margin:-8px 0 14px">${ocultas} sala${ocultas === 1 ? "" : "s"} oculta${ocultas === 1 ? "" : "s"} (vacías o archivadas).</p>` : ""}
    ${orden.length ? orden.map(c => cursoHtml(c, cursos[c])).join("") : `<div class="vacio">Todavía no tienes partidas.</div>`}`;
  $("chkVacias").onchange = e => { V.verVacias = e.target.checked; pintar(); };
  $("chkArch").onchange = e => { V.verArchivadas = e.target.checked; pintar(); };
  $("btnRecargar").onclick = () => cargar(auth.currentUser.uid);
  document.querySelectorAll(".fila").forEach(f => f.onclick = e => {
    if (e.target.closest("a,button")) return;
    const c = f.dataset.cod;
    V.abiertas.has(c) ? V.abiertas.delete(c) : V.abiertas.add(c);
    f.parentElement.classList.toggle("abierta");
  });
  document.querySelectorAll("[data-nueva]").forEach(b => b.onclick = () => {
    const sel = $("sel-" + b.dataset.nueva);
    location.href = `index.html?semana=${sel.value}`;
  });
  document.querySelectorAll("[data-txt]").forEach(b => b.onclick = () => descargarConversacion(b.dataset.txt));
  document.querySelectorAll("[data-tlc]").forEach(b => b.onclick = () => detalleTelemetria(b.dataset.tlc, +b.dataset.tli));
  document.querySelectorAll("[data-fin]").forEach(b => b.onclick = () => terminarPartida(b.dataset.fin, b));
  document.querySelectorAll("[data-arch]").forEach(b => b.onclick = async () => {
    const p = V.partidas.find(x => x.s.codigo === b.dataset.arch);
    const nuevo = !p.s.archivada;
    try { await updateDoc(doc(db, "salas", p.s.codigo), { archivada: nuevo }); p.s.archivada = nuevo; pintar(); }
    catch (e) { alert("No se pudo: " + e.code); }
  });
}

function cursoHtml(curso, partidas) {
  partidas.sort((a, b) => fecha(b.s) - fecha(a.s));
  const alumnos = new Set(partidas.flatMap(p => p.jugadores.map(j => j.email || j.uid)));
  const fbTodo = partidas.flatMap(p => p.feedback);
  const { prom, n } = promedio(fbTodo);
  const sesiones = (typeof SESIONES !== "undefined" ? SESIONES : []).filter(x => (x.curso || "Sin curso") === curso);
  const id = btoa(unescape(encodeURIComponent(curso))).replace(/[^a-z0-9]/gi, "").slice(0, 16);
  return `<section class="curso">
    <div class="curso-cab"><h2>${esc(curso)}</h2>
      <div class="cifras"><span><b>${partidas.length}</b> partida${partidas.length === 1 ? "" : "s"}</span>
        <span><b>${alumnos.size}</b> alumno${alumnos.size === 1 ? "" : "s"}</span>
        <span>feedback <b>${prom === null ? "—" : prom.toFixed(1)}</b>${n ? `/7 · ${n}` : ""}</span></div>
      ${sesiones.length ? `<div class="nueva"><select id="sel-${id}">${sesiones.map(x => `<option value="${x.semana}">Semana ${x.semana} · ${esc(x.tema)}</option>`).join("")}</select>
        <button class="btn pri" data-nueva="${id}">＋ Nueva partida</button></div>` : ""}
    </div>
    ${partidas.length ? partidas.map(partidaHtml).join("") : `<div class="vacio" style="padding:22px">Sin partidas en este curso todavía.</div>`}
  </section>`;
}

// Puntaje individual (en el título de cada alumno): su grupo en el ranking y sus puntos de oráculo.
function puntajeDe(s, j) {
  if (s.modo !== "rotacion") return "";
  const g = (s.ranking || []).find(f => f.grupo === j.grupo), o = (s.oraculos || []).find(x => x.uid === j.uid);
  return `\nGrupo ${j.grupo || "?"}: ${g && g.puntaje !== null && g.puntaje !== undefined ? g.puntaje + " pts" : "sin debatir"}` + (o ? ` · 🔮 ${o.puntos}` : "");
}

// Antitrampa: cómo escribió cada alumno, como «Cómo se escribió» de ml2. Una huella por mensaje
// (el largo del texto cada 2 s): una rampa es alguien tipeando, un escalón es un bloque que llegó
// entero. Rojo: más de la mitad del texto llegó de una vez. Descriptivo: nunca entra en un puntaje.
const COLOR_TL = { golpe: "#f43f5e", escrito: "#38bdf8", corto: "#4d5f70" };
function telemetriaHtml(telemetria, codigo) {
  if (!telemetria || !telemetria.length) return `<div class="caja" style="margin-top:14px"><h3>CÓMO ESCRIBIERON · antitrampa</h3>
    <p style="color:var(--dim)">Sin registros: nadie escribió desde el teléfono en esta partida.</p></div>`;
  const por = new Map();
  telemetria.forEach((t, i) => {
    const x = por.get(t.uid) || { nombre: t.nombre || "?", grupo: t.grupo || 0, ms: [] };
    x.ms.push({ t, i, clase: clasificarMensaje(t) });
    por.set(t.uid, x);
  });
  const filas = [...por.values()];
  filas.forEach(f => f.ms.sort((a, b) => (a.t.t || 0) - (b.t.t || 0)));
  const rojos = f => f.ms.filter(m => m.clase === "golpe").length;
  filas.sort((a, b) => rojos(b) - rojos(a) || a.nombre.localeCompare(b.nombre));
  const total = telemetria.length, nRojos = telemetria.filter(t => clasificarMensaje(t) === "golpe").length;
  const salieron = resumenTelemetria(telemetria).filter(x => x.salidas > 0);
  const chispa = m => `<button class="tl-c" data-tlc="${codigo}" data-tli="${m.i}" title="Debate ${m.t.debate} · ${m.t.largoFinal} caracteres${m.clase === "golpe" ? " · más de la mitad de una vez" : ""}${m.t.dictado ? " · 🎤 dictado por voz" : ""}">
      <svg viewBox="-2 -2 68 26" width="68" height="26"><polyline points="${puntosHuella(m.t, 64, 22)}" fill="none" stroke="${COLOR_TL[m.clase]}" stroke-width="1.8" stroke-linejoin="round"/></svg>${m.t.dictado ? `<span class="tl-mic">🎤</span>` : ""}</button>`;
  return `<div class="caja tl" style="margin-top:14px"><h3>CÓMO ESCRIBIERON · antitrampa</h3>
    <p class="tl-ley"><b style="color:${COLOR_TL.golpe}">●</b> más de la mitad del texto llegó de una vez (pegado o insertado)
      <b style="color:${COLOR_TL.escrito}">●</b> lo fue tipeando <b style="color:${COLOR_TL.corto}">●</b> muy corto para decir algo.
      Rampa: tipeó. Escalón: llegó entero. Clic en una huella para el detalle. No cambia ningún puntaje.</p>
    <p class="tl-sum"><b>${nRojos}</b> de ${total} mensaje${total === 1 ? "" : "s"} en rojo${salieron.length ? ` · salieron de la app mientras escribían: ${salieron.map(x => `${esc(x.nombre)} (${x.salidas})`).join(", ")}` : ""}</p>
    <table class="tl-grid">${filas.map(f => `<tr><th>${esc(f.nombre)}${f.grupo ? ` <small>G${f.grupo}</small>` : ""}</th>
      <td>${f.ms.map(chispa).join("")}</td></tr>`).join("")}</table>
    <div class="tl-det" id="tlDet-${codigo}"></div>
  </div>`;
}

// El detalle de un mensaje: la huella grande, los hechos y el texto que envió.
async function detalleTelemetria(codigo, i) {
  const p = V.partidas.find(x => x.s.codigo === codigo), t = p && p.telemetria[i];
  const el = $("tlDet-" + codigo);
  if (!t || !el) return;
  document.querySelectorAll(`[data-tlc="${codigo}"]`).forEach(b => b.classList.toggle("on", +b.dataset.tli === i));
  const clase = clasificarMensaje(t), seg = Math.round((t.huella || []).length * 2);
  el.innerHTML = `<div class="tl-dc"><b>${esc(t.nombre)}</b>${t.grupo ? ` · grupo ${t.grupo}` : ""} · debate ${t.debate} · ${new Date(t.t).toTimeString().slice(0, 5)}</div>
    <svg viewBox="-4 -16 368 98" class="tl-big"><line x1="0" y1="64" x2="360" y2="64" stroke="#1e2a36"/>
      <polyline points="${puntosHuella(t, 360, 64)}" fill="none" stroke="${COLOR_TL[clase]}" stroke-width="2.2" stroke-linejoin="round"/>
      <text x="0" y="-6" fill="#7d8fa1" font-size="9">${t.largoFinal} caracteres</text><text x="360" y="76" fill="#7d8fa1" font-size="9" text-anchor="end">~${seg} s escribiendo</text></svg>
    <ul>${hechosMensaje(t).map(h => `<li>${esc(h)}</li>`).join("")}</ul>
    <div class="tl-tx" id="tlTx-${codigo}">Cargando el mensaje…</div>
    <p class="tl-pie">Nada de esto dice «copió». Dice qué pasó mientras escribía: un bloque pegado puede ser una cita de la lectura, y el dictado por voz también entra de golpe.</p>`;
  try {
    const d = t.msg ? await getDoc(doc(db, "salas", codigo, "mensajes", t.msg)) : null;
    if ($("tlTx-" + codigo)) $("tlTx-" + codigo).innerHTML = d && d.exists() ? `«${esc(d.data().texto)}»` : "";
  } catch { if ($("tlTx-" + codigo)) $("tlTx-" + codigo).textContent = ""; }
}

// El campo de la brújula de cada alumno (y adónde llegó si la repitió), con su grupo.
function campoAlumno(s, j) {
  const b = j.brujula, cs = (s.brujula && s.brujula.campos) || [];
  if (!b || !b.campo) return "";
  const c = id => cs.find(x => x.id === id) || { nombre: id, color: "var(--dim)" };
  const antes = c(b.campo), despues = b.repeticion && b.repeticion.campo ? c(b.repeticion.campo) : null;
  return `<small style="display:block;margin-left:34px">G${j.grupo || "?"} · <b style="color:${antes.color}">${esc(antes.nombre)}</b>${despues ? ` → <b style="color:${despues.color}">${esc(despues.nombre)}</b>` : ""}</small>`;
}

function partidaHtml({ s, jugadores, feedback, telemetria }) {
  const [est, cls] = estadoDe(s);
  const g = ganadorDe(s);
  const n = r => jugadores.filter(j => j.equipo === r).length;
  const { prom, n: nNotas, total } = promedio(feedback);
  const v = s.veredicto, mk = s.marcador || {};
  const A = s.equipos?.A || { nombre: "A FAVOR", color: "var(--A)" }, B = s.equipos?.B || { nombre: "EN CONTRA", color: "var(--B)" };
  const rot = s.modo === "rotacion";
  const colorCampo = id => ((s.brujula && s.brujula.campos || []).find(c => c.id === id) || {}).color || "#7d8fa1";
  const brujulaHtml = (s.mapa || []).length && s.brujula && s.brujula.campos ? `<div class="caja" style="margin-bottom:12px"><h3>LA BRÚJULA</h3>
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
        ${mapaSvg({ puntos: (s.mapaMov || []).length ? s.mapaMov.map(m => ({ x: m.x, y: m.y, desde: { x: m.dx, y: m.dy }, color: colorCampo(m.campo) }))
                     : s.mapa.map(p => ({ ...p, color: colorCampo(p.campo) })), campos: s.brujula.campos, ejes: s.brujula.ejes, tam: 420 })}
        <div>${(s.mapaMov || []).length ? `<p style="color:var(--dim);font-size:12px">Flechas: de la primera respuesta a la del cierre (${s.mapaMov.length}).</p>` : ""}
          ${(s.gruposInfo || []).map(g => `<div>Grupo ${g.n} · <b style="color:${colorCampo(g.campo)}">${esc(g.nombre)}</b> (${g.tam})</div>`).join("")}</div></div></div>` : "";
  const rotHtml = rot ? `${brujulaHtml}<div class="caja" style="margin-bottom:12px"><h3>RANKING</h3>
      ${(s.ranking || []).map(f => `<div class="com"><div class="q"><b>${f.puesto ? "#" + f.puesto : "·"} Grupo ${f.grupo}</b>
        <span style="color:var(--dim)">${f.debates} debate${f.debates === 1 ? "" : "s"} · jurado ${f.jurado ?? "—"} · público ${f.publico ?? "—"}</span>
        <span class="mono" style="margin-left:auto;color:var(--neon)">${f.puntaje ?? "—"}</span></div></div>`).join("")}
      <h3 style="margin-top:12px">DEBATES</h3>
      ${(s.debates || []).map(d => `<div class="com"><div class="q"><b>${d.n}.</b> Grupo ${d.A} vs Grupo ${d.B}
        <span class="mono" style="margin-left:auto">${d.puntajeA ?? "—"} · ${d.puntajeB ?? "—"}</span></div><p>${esc(d.pregunta)}</p>
        ${(d.jueces || []).length ? `<div style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--dim);margin-top:4px">${d.jueces.map(j => `<span title="${esc(j.fraseA)} / ${esc(j.fraseB)}">${j.emoji} ${j.A ?? "—"} · ${j.B ?? "—"}</span>`).join("")}
          <span>· jueces ${d.totalA ?? "—"} / ${d.totalB ?? "—"} · votos ${d.votosA ?? "—"} / ${d.votosB ?? "—"}${d.barraA != null ? ` · barra ${d.barraA} % / ${d.barraB} %` : ""}</span></div>` : ""}</div>`).join("") || `<p style="color:var(--dim)">Sin debates.</p>`}
      <h3 style="margin-top:12px">🔮 ORÁCULOS</h3>
      ${(s.oraculos || []).map(o => `<div class="com"><div class="q"><b>#${o.puesto} ${esc(o.nombre)}${o.grupo ? ` (grupo ${o.grupo})` : ""}</b>
        <span style="color:var(--dim)">${o.aciertos} de ${o.predicciones} aciertos</span><span class="mono" style="margin-left:auto;color:#a78bfa">${o.puntos}</span></div></div>`).join("") || `<p style="color:var(--dim)">Sin predicciones.</p>`}
    </div>` : "";
  const coms = feedback.filter(f => (f.comentario || "").trim() || typeof f.nota === "number").sort((a, b) => (b.t || 0) - (a.t || 0));
  return `<div class="partida ${V.abiertas.has(s.codigo) ? "abierta" : ""}">
    <div class="fila" data-cod="${s.codigo}">
      <span class="f">${fmtFecha(fecha(s))}</span>
      <span class="cod">${s.codigo}</span>
      <span class="tema"><div>Semana ${s.semana} · ${esc(s.tema)}</div><small>${esc(s.mocion)}</small></span>
      <span class="gana" style="color:${g ? colorEquipo(s, g) : "var(--dim2)"}">${g ? (g === "EMPATE" ? "empate" : "🏆 " + esc(g)) : "—"}</span>
      <span class="gente">${rot ? `${jugadores.length} alumno${jugadores.length === 1 ? "" : "s"}` : `<i style="color:${A.color}">${n("A")}</i> · <i style="color:${B.color}">${n("B")}</i> · <i style="color:var(--P)">${n("P")}</i> <span style="color:var(--dim2)">(${jugadores.length})</span>`}</span>
      <span class="fbm">${total ? `💬 <b>${prom === null ? "—" : prom.toFixed(1)}</b>${nNotas ? "/7" : ""} <span style="color:var(--dim2)">· ${total}</span>` : `<span style="color:var(--dim2)">sin feedback</span>`}</span>
      <span class="estado ${cls}">${est}</span>
    </div>
    <div class="detalle">
      ${rot ? rotHtml : `      <div class="marc">
        ${(v && v.movA != null) || mk.persuA != null ? `<div>LA SALA · votos<b><span style="color:${A.color}">${esc(v ? v.movA : mk.persuA)}</span> · <span style="color:${B.color}">${esc(v ? v.movB : mk.persuB)}</span></b></div>` : ""}
        <div>EL PÚBLICO · votos<b><span style="color:${A.color}">${esc(v ? v.pubA : mk.publicoA ?? "—")}</span> · <span style="color:${B.color}">${esc(v ? v.pubB : mk.publicoB ?? "—")}</span></b></div>
        <div>EL JURADO · /20<b><span style="color:${A.color}">${esc(v ? v.rA : mk.rigorA ?? "—")}</span> · <span style="color:${B.color}">${esc(v ? v.rB : mk.rigorB ?? "—")}</span></b></div>
        <div>INTERVENCIONES<b>${(s.feed || []).length}</b></div>
      </div>`}
      <div class="cols">
        <div class="caja"><h3>QUÉ DIJO EL CURSO DEL JUEGO</h3>
          ${coms.length ? coms.map(f => `<div class="com"><div class="q"><b>${esc(f.nombre)}</b>
            <span style="color:${COL[f.equipo] || "var(--dim)"};font-size:11.5px">${f.equipo === "P" ? "público" : f.equipo === "A" ? esc(A.nombre) : f.equipo === "B" ? esc(B.nombre) : ""}</span>
            ${typeof f.nota === "number" ? `<span class="mono" style="margin-left:auto;color:var(--amber)">${f.nota}/7</span>` : ""}</div>
            ${f.comentario ? `<p>${esc(f.comentario)}</p>` : ""}</div>`).join("")
          : `<p style="color:var(--dim)">Nadie dejó feedback en esta partida. El formulario aparece en el teléfono al terminar el debate y se puede saltar.</p>`}
        </div>
        <div class="caja"><h3>QUIÉNES JUGARON</h3>
          <div class="jug">${jugadores.length ? jugadores.sort((a, b) => (a.equipo || "Z").localeCompare(b.equipo || "Z")).map(j =>
            `<div title="${esc(j.email)}${puntajeDe(s, j)}"><span class="av" style="--c:${COL[j.equipo] || "var(--dim2)"}">${j.foto ? `<img src="${esc(j.foto)}" referrerpolicy="no-referrer" alt="">` : iniciales(j.nombre)}</span>${esc(j.nombre)}${s.modo === "rotacion" ? (() => { const g = (s.ranking || []).find(f => f.grupo === j.grupo), o = (s.oraculos || []).find(x => x.uid === j.uid);
              return ` <small style="color:var(--dim)">${g && g.puntaje != null ? g.puntaje : "—"}${o ? ` · 🔮${o.puntos}` : ""}</small>`; })() : ""}${campoAlumno(s, j)}</div>`).join("")
            : `<span style="color:var(--dim)">Nadie entró.</span>`}</div>
        </div>
      </div>
      ${telemetriaHtml(telemetria, s.codigo)}
      <div class="acc">
        <a class="btn" href="index.html?sala=${s.codigo}&semana=${s.semana}" target="_blank">▶ Abrir pantalla</a>
        <button class="btn" data-txt="${s.codigo}">⬇ Conversación (.txt)</button>
        ${rot && cls === "vivo" ? `<button class="btn" data-fin="${s.codigo}" title="Cierra la partida: el debate a medias no cuenta, se calcula el ranking y los teléfonos pasan al feedback y al campeón">🏁 Terminar partida</button>` : ""}
        <button class="btn" data-arch="${s.codigo}">${s.archivada ? "↩ Desarchivar" : "🗄 Archivar"}</button>
      </div>
    </div>
  </div>`;
}

/* --------------------- terminar una partida --------------------- */
// Lo mismo que 🏁 TERMINAR CLASE + revelar al campeón en la pantalla del profesor, pero desde aquí:
// sirve cuando la pantalla ya se cerró y la sala quedó «en curso». Si la pantalla sigue abierta,
// recibe la orden (privado/orden) y termina ella misma, para no pisar este cierre al publicar.
async function terminarPartida(codigo, boton) {
  const p = V.partidas.find(x => x.s.codigo === codigo);
  if (!confirm(`¿Terminar la partida ${codigo}? El debate que esté a medias no cuenta para el ranking. Los teléfonos pasan al feedback y al campeón.`)) return;
  boton.disabled = true; boton.textContent = "Terminando…";
  try {
    const refPriv = doc(db, "salas", codigo, "privado", "estado");
    const priv = (await getDoc(refPriv)).data();
    if (!priv || !priv.clase) throw new Error("la sala no tiene estado guardado");
    const clase = priv.clase;
    const reg = priv.debate && clase.debates[priv.debate.n - 1];
    if (reg && !reg.res) clase.debates.pop();
    clase.ranking = ranking(clase.grupos, clase.debates);
    clase.propuesta = null;
    Object.assign(priv, { fase: "fin", debate: null, etapa: null, finVoto: null, veredictoRevelado: true });
    await setDoc(refPriv, JSON.parse(JSON.stringify(priv)));
    const r1 = v => (v === null || v === undefined ? null : +(+v).toFixed(1));
    const r = clase.ranking;
    const ors = rankingOraculos(clase.oraculos || {}).filter(o => o.predicciones).slice(0, 3);
    const publico = {
      fase: "fin", debate: null, etapa: null, finVoto: null, actualizado: Date.now(), terminadaDesdePanel: Date.now(),
      ranking: r.map(f => ({ grupo: f.grupo, debates: f.debates, puesto: f.puesto, distincion: f.distincion ?? null,
        jurado: r1(f.jurado), publico: r1(f.publico), puntaje: r1(f.puntaje) })),
      debates: (p.s.debates || []).filter(d => d.n <= clase.debates.length),
      veredicto: { campeon: r[0] && r[0].debates ? r[0].grupo : null,
        ranking: r.map(f => ({ grupo: f.grupo, puesto: f.puesto, puntaje: r1(f.puntaje) })),
        oraculos: ors.map(o => ({ nombre: o.nombre, grupo: o.grupo || 0, puntos: o.puntos, puesto: o.puesto })) }
    };
    await updateDoc(doc(db, "salas", codigo), JSON.parse(JSON.stringify(publico)));
    await setDoc(doc(db, "salas", codigo, "privado", "orden"), { terminar: Date.now() });
    Object.assign(p.s, publico);
    pintar();
  } catch (e) {
    alert("No se pudo terminar: " + (e.code || e.message));
    boton.disabled = false; boton.textContent = "🏁 Terminar partida";
  }
}

/* --------------------- conversación como texto --------------------- */
async function descargarConversacion(codigo) {
  const p = V.partidas.find(x => x.s.codigo === codigo), s = p.s;
  const snap = await getDocs(query(collection(db, "salas", codigo, "mensajes"), orderBy("t")));
  const nom = k => s.equipos?.[k]?.nombre || k;
  let ronda = null;
  const lineas = [`TRIBUNA · sala ${codigo} · ${cursoDe(s)}`, `Semana ${s.semana}: ${s.tema}`, `Moción: ${s.mocion}`, ""];
  snap.forEach(d => {
    const m = d.data();
    if (m.ronda !== ronda) { ronda = m.ronda; lineas.push("", `=== Tramo ${ronda + 1} ===`); }
    const h = new Date(m.t).toTimeString().slice(0, 5);
    if (m.tipo === "alumno") lineas.push(`[${h}] ${m.nombre} (${nom(m.equipo)}): ${m.texto}`);
    else if (m.tipo === "mod") lineas.push(`[${h}] 🎙 Moderadora: ${m.texto}`);
    else if (m.tipo === "relator") lineas.push(`[${h}] ⚖ Relator: ${m.texto}`);
    else if (m.tipo === "resultado") {
      const x = m.datos || {};
      lineas.push(`[${h}] RESULTADO ${nom(m.equipo)}: jurado ${x.rigorMedio}/20, ${x.deltaVotos > 0 ? "+" : ""}${(+x.deltaVotos || 0).toFixed(1)} votos en la sala`);
      (x.alumnos || []).forEach(a => lineas.push(`    ${a.autor}: ${a.total}/20${a.nota ? " — " + a.nota : ""}`));
    } else if (m.texto) lineas.push(`[${h}] ${m.texto}`);
  });
  const g = ganadorDe(s);
  if (g) lineas.push("", `GANADOR: ${g}`);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lineas.join("\n")], { type: "text/plain;charset=utf-8" }));
  a.download = `tribuna_${codigo}_semana${s.semana}.txt`;
  a.click();
}

/* ------------------------------ entrar ----------------------------- */
onAuthStateChanged(auth, user => {
  if (!user || user.isAnonymous) {
    $("yo").textContent = "";
    $("main").innerHTML = `<div class="entrar"><h2 style="margin-top:0">Panel del profesor</h2>
      <p style="color:var(--dim)">Entra con la misma cuenta de Google con que creas las salas.</p>
      <button class="btn pri" id="btnG">🔑 Entrar con Google</button></div>`;
    $("btnG").onclick = () => signInWithPopup(auth, new GoogleAuthProvider()).catch(e => alert("No se pudo entrar: " + e.code));
    return;
  }
  $("yo").innerHTML = `${esc(user.email)} · <a href="index.html?semana=${(typeof SESIONES !== "undefined" && SESIONES.length) ? SESIONES[SESIONES.length - 1].semana : 7}">pantalla del profesor</a> · <a href="#" id="salir">salir</a>`;
  $("salir").onclick = e => { e.preventDefault(); signOut(auth); };
  cargar(user.uid).catch(e => $("main").innerHTML = `<div class="aviso">No se pudieron cargar las partidas: ${esc(e.message)}</div>`);
});
