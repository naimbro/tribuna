/* =====================================================================
   TRIBUNA — panel del profesor (admin.html).
   Todas las partidas que creó esta cuenta, agrupadas por curso (como en ml2). Por partida:
   estado, ganador, quiénes jugaron y el feedback de los alumnos, que se lee aquí y no en la
   pantalla proyectada (con nombre delante del curso cambia lo que la gente se atreve a
   escribir). Desde aquí se abre una partida nueva o se vuelve a una existente.
   Lee salas/{codigo} (lo público), sus jugadores y su feedback; escribe solo `archivada`.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
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
  if (s.fase === "abierta") return [`tramo ${s.ronda + 1} abierto`, "vivo"];
  if (!s.turnos?.length && s.ronda === 0 && s.fase === "listo") return ["sin empezar", ""];
  return [`tramo ${s.ronda + 1}/${s.totalRondas || 3}`, ""];
}

// Salas anteriores a la declaración final no traen `ganaG`: se calcula con los marcadores.
function ganadorDe(s) {
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
    const [js, fb] = await Promise.all([
      getDocs(collection(db, "salas", s.codigo, "jugadores")).catch(() => null),
      getDocs(collection(db, "salas", s.codigo, "feedback")).catch(() => null)
    ]);
    const jugadores = []; js?.forEach(d => jugadores.push({ uid: d.id, ...d.data() }));
    const feedback = []; fb?.forEach(d => feedback.push({ uid: d.id, ...d.data() }));
    return { s, jugadores, feedback };
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

function partidaHtml({ s, jugadores, feedback }) {
  const [est, cls] = estadoDe(s);
  const g = ganadorDe(s);
  const n = r => jugadores.filter(j => j.equipo === r).length;
  const { prom, n: nNotas, total } = promedio(feedback);
  const v = s.veredicto, mk = s.marcador || {};
  const A = s.equipos?.A || { nombre: "A FAVOR", color: "var(--A)" }, B = s.equipos?.B || { nombre: "EN CONTRA", color: "var(--B)" };
  const coms = feedback.filter(f => (f.comentario || "").trim() || typeof f.nota === "number").sort((a, b) => (b.t || 0) - (a.t || 0));
  return `<div class="partida ${V.abiertas.has(s.codigo) ? "abierta" : ""}">
    <div class="fila" data-cod="${s.codigo}">
      <span class="f">${fmtFecha(fecha(s))}</span>
      <span class="cod">${s.codigo}</span>
      <span class="tema"><div>Semana ${s.semana} · ${esc(s.tema)}</div><small>${esc(s.mocion)}</small></span>
      <span class="gana" style="color:${g ? colorEquipo(s, g) : "var(--dim2)"}">${g ? (g === "EMPATE" ? "empate" : "🏆 " + esc(g)) : "—"}</span>
      <span class="gente"><i style="color:${A.color}">${n("A")}</i> · <i style="color:${B.color}">${n("B")}</i> · <i style="color:var(--P)">${n("P")}</i> <span style="color:var(--dim2)">(${jugadores.length})</span></span>
      <span class="fbm">${total ? `💬 <b>${prom === null ? "—" : prom.toFixed(1)}</b>${nNotas ? "/7" : ""} <span style="color:var(--dim2)">· ${total}</span>` : `<span style="color:var(--dim2)">sin feedback</span>`}</span>
      <span class="estado ${cls}">${est}</span>
    </div>
    <div class="detalle">
      <div class="marc">
        ${(v && v.movA != null) || mk.persuA != null ? `<div>LA SALA · votos<b><span style="color:${A.color}">${esc(v ? v.movA : mk.persuA)}</span> · <span style="color:${B.color}">${esc(v ? v.movB : mk.persuB)}</span></b></div>` : ""}
        <div>EL PÚBLICO · votos<b><span style="color:${A.color}">${esc(v ? v.pubA : mk.publicoA ?? "—")}</span> · <span style="color:${B.color}">${esc(v ? v.pubB : mk.publicoB ?? "—")}</span></b></div>
        <div>EL JURADO · /20<b><span style="color:${A.color}">${esc(v ? v.rA : mk.rigorA ?? "—")}</span> · <span style="color:${B.color}">${esc(v ? v.rB : mk.rigorB ?? "—")}</span></b></div>
        <div>INTERVENCIONES<b>${(s.feed || []).length}</b></div>
      </div>
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
            `<div title="${esc(j.email)}"><span class="av" style="--c:${COL[j.equipo] || "var(--dim2)"}">${j.foto ? `<img src="${esc(j.foto)}" referrerpolicy="no-referrer" alt="">` : iniciales(j.nombre)}</span>${esc(j.nombre)}</div>`).join("")
            : `<span style="color:var(--dim)">Nadie entró.</span>`}</div>
        </div>
      </div>
      <div class="acc">
        <a class="btn" href="index.html?sala=${s.codigo}&semana=${s.semana}" target="_blank">▶ Abrir pantalla</a>
        <button class="btn" data-txt="${s.codigo}">⬇ Conversación (.txt)</button>
        <button class="btn" data-arch="${s.codigo}">${s.archivada ? "↩ Desarchivar" : "🗄 Archivar"}</button>
      </div>
    </div>
  </div>`;
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
  $("yo").innerHTML = `${esc(user.email)} · <a href="index.html">pantalla del profesor</a> · <a href="#" id="salir">salir</a>`;
  $("salir").onclick = e => { e.preventDefault(); signOut(auth); };
  cargar(user.uid).catch(e => $("main").innerHTML = `<div class="aviso">No se pudieron cargar las partidas: ${esc(e.message)}</div>`);
});
