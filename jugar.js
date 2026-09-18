/* =====================================================================
   TRIBUNA — el teléfono del alumno.
   Una sola conversación, como un grupo de WhatsApp: A FAVOR a la izquierda, EN CONTRA a la
   derecha, la moderadora (🎙) y el relator (⚖) al centro. Quien debate escribe abajo; si la
   moderadora lo nombra, el teléfono vibra y el mensaje se destaca. El público no escribe:
   marca su posición con un deslizador y no ve notas ni reacciones hasta el veredicto.
   Lee salas/{codigo} (estado del juego) y salas/{codigo}/mensajes (la conversación).
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const J = { uid: null, email: null, codigo: null, nombre: "", equipo: null, sala: null, chat: [], reloj: null, primera: true };
const google = new GoogleAuthProvider();
const colorRigor = t => t >= 14 ? "var(--neon)" : t >= 9 ? "var(--amber)" : "var(--B)";
const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let subs = [];

/* ---------- entrar ---------- */
const guardado = JSON.parse(localStorage.getItem("tribuna_jugador") || "{}");
const params = new URLSearchParams(location.search);
$("inCodigo").value = (params.get("sala") || guardado.codigo || "").toUpperCase();
$("inNombre").value = guardado.nombre || "";

$("btnEntrar").onclick = async () => {
  const codigo = $("inCodigo").value.trim().toUpperCase(), nombre = $("inNombre").value.trim();
  $("errEntrar").textContent = "";
  if (codigo.length !== 4) return $("errEntrar").textContent = "El código tiene 4 letras.";
  if (nombre.length < 2) return $("errEntrar").textContent = "Pon tu nombre: es el que ven los demás en la conversación.";
  if (!J.uid) {
    try { await signInWithPopup(auth, google); } catch (e) { return $("errEntrar").textContent = "No se pudo entrar con Google: " + e.code; }
    return;   // onAuthStateChanged vuelve a pulsar este botón
  }
  try {
    const snap = await getDoc(doc(db, "salas", codigo));
    if (!snap.exists()) return $("errEntrar").textContent = `No existe la sala ${codigo}.`;
    J.codigo = codigo; J.nombre = nombre; J.sala = snap.data();
    localStorage.setItem("tribuna_jugador", JSON.stringify({ codigo, nombre }));
    history.replaceState(null, "", `?sala=${codigo}`);
    const yo = await getDoc(doc(db, "salas", codigo, "jugadores", J.uid));
    if (yo.exists() && yo.data().equipo) { J.equipo = yo.data().equipo; await entrarAlJuego(); }
    else mostrarBancadas();
  } catch (e) { $("errEntrar").textContent = "No se pudo entrar: " + e.message; }
};

function mostrarBancadas() {
  ["pEntrar", "pJuego", "estado", "caja", "voto"].forEach(id => $(id).classList.add("oculto"));
  $("pBancada").classList.remove("oculto");
  $("mocion1").textContent = J.sala.mocion;
  $("btnA").textContent = `${J.sala.equipos.A.bandera} ${J.sala.equipos.A.nombre}`;
  $("btnB").textContent = `${J.sala.equipos.B.bandera} ${J.sala.equipos.B.nombre}`;
  $("btnA").onclick = () => elegir("A");
  $("btnB").onclick = () => elegir("B");
  $("btnP").onclick = () => elegir("P");
}

async function elegir(k) {
  J.equipo = k;
  await setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { nombre: J.nombre, email: J.email, equipo: k, unido: Date.now() });
  if (k === "P") {
    const yo = await getDoc(doc(db, "salas", J.codigo, "publico", J.uid)).catch(() => null);
    if (!yo || !yo.exists()) await guardarPos(0);   // el público parte indeciso y queda contado
  }
  await entrarAlJuego();
}

/* ---------- jugar ---------- */
async function entrarAlJuego() {
  subs.forEach(u => u()); subs = [];
  $("pEntrar").classList.add("oculto"); $("pBancada").classList.add("oculto");
  $("pJuego").classList.remove("oculto"); $("estado").classList.remove("oculto");
  const esPublico = J.equipo === "P";
  document.body.classList.toggle("es-publico", esPublico);
  $("caja").classList.toggle("oculto", esPublico);
  $("voto").classList.toggle("oculto", !esPublico);
  subs.push(onSnapshot(doc(db, "salas", J.codigo), snap => { J.sala = snap.data(); pintarSala(); }));
  subs.push(onSnapshot(query(collection(db, "salas", J.codigo, "mensajes"), orderBy("t")), snap => {
    const antes = new Set(J.chat.map(m => m.id));
    J.chat = []; snap.forEach(d => J.chat.push({ ...d.data(), id: d.id }));
    const nuevos = J.chat.filter(m => !antes.has(m.id));
    pintarChat();
    if (!J.primera) avisarNuevos(nuevos);
    J.primera = false;
  }, e => { $("pJuego").innerHTML = `<div class="sep">No se pudo leer la conversación (${esc(e.code)}).</div>`; }));
  if (esPublico) prepararVoto(); else prepararCaja();
  clearInterval(J.reloj); J.reloj = setInterval(pintarReloj, 500);
}

// me nombran si aparece "@" + mi nombre (o mi primer nombre)
const meNombran = t => {
  const n = norm(t), mi = norm(J.nombre), primero = mi.split(" ")[0];
  return n.includes("@" + mi) || (primero.length > 2 && n.includes("@" + primero));
};

function avisarNuevos(nuevos) {
  for (const m of nuevos) {
    if (m.tipo === "mod" && meNombran(m.texto) && J.equipo !== "P") {
      navigator.vibrate?.([120, 60, 120]);
      $("notaCaja").textContent = "🎙 La moderadora te pregunta a ti. Responde abajo.";
      $("notaCaja").classList.add("ati");
    }
    if (m.tipo === "relator" && J.equipo === "P") {
      navigator.vibrate?.(150);
      $("voto").classList.add("pide");
      $("avisoVoto").textContent = "⚖ El relator pide votar: lee su resumen, revisa lo que indica y ajusta tu posición.";
    }
  }
}

function pintarSala() {
  const s = J.sala; if (!s) return;
  const eq = J.equipo === "P" ? { bandera: "🗳", nombre: "PÚBLICO", color: "#a78bfa" } : s.equipos[J.equipo];
  $("miBancada").textContent = `${eq.bandera} ${eq.nombre}`;
  $("miBancada").style.color = eq.color; $("miBancada").style.borderColor = eq.color;
  $("tramoLbl").textContent = `Tramo ${s.ronda + 1}/${s.totalRondas} · ${s.rondaNombre}.`;
  $("pauta").textContent = s.fase === "abierta" ? s.pauta : s.fase === "fin" ? "Terminó el debate." : "Esperando al profesor.";
  const mk = s.marcador || {};
  $("marca").innerHTML = `<span>Sala <b style="color:${s.equipos.A.color}">${esc(mk.persuA)}</b> · <b style="color:${s.equipos.B.color}">${esc(mk.persuB)}</b></span>
    ${mk.publicoN ? `<span>Público <b style="color:${s.equipos.A.color}">${esc(mk.publicoA)}</b> · <b style="color:${s.equipos.B.color}">${esc(mk.publicoB)}</b></span>` : ""}
    <span>Jurado <b style="color:${s.equipos.A.color}">${esc(mk.rigorA)}</b> · <b style="color:${s.equipos.B.color}">${esc(mk.rigorB)}</b></span>`;
  if (J.equipo === "P") document.body.classList.toggle("es-publico", !s.veredicto);
  if (s.veredicto && !J.ceremoniaVista) { J.ceremoniaVista = true; ceremonia(s, s.veredicto); }
  pintarChat(); pintarCaja(); pintarReloj();
}

function pintarReloj() {
  const s = J.sala; if (!s) return;
  const el = $("reloj");
  if (s.fase === "abierta" && s.abreEn) {
    const resta = Math.max(0, s.seg - Math.floor((Date.now() - s.abreEn) / 1000));
    el.textContent = `${String(Math.floor(resta / 60)).padStart(2, "0")}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 20);
  } else { el.textContent = ""; el.classList.remove("urgente"); }
}

/* ---------- la conversación ---------- */
function menciones(t) {
  return esc(t).replace(/@([A-Za-zÁÉÍÓÚÑáéíóúñü][\wÁÉÍÓÚÑáéíóúñü.-]*(?:\s[A-ZÁÉÍÓÚÑ][\wáéíóúñü.-]*)?)/g,
    (x, n) => `<b class="mencion ${meNombran("@" + n) ? "yo" : ""}">@${n}</b>`);
}

function burbuja(m, s) {
  const hora = new Date(m.t).toTimeString().slice(0, 5);
  if (m.tipo === "sistema") return `<div class="msg sys">${esc(m.texto)}</div>`;
  if (m.tipo === "mod") return `<div class="msg mod ${meNombran(m.texto) && J.equipo !== "P" ? "ati" : ""}"><div class="who">🎙 Moderadora<span class="hora">${hora}</span></div><div class="tx">${menciones(m.texto)}</div></div>`;
  if (m.tipo === "relator") {
    const d = m.datos || {};
    return `<div class="msg rel"><div class="who">⚖ Relator · llamado a votar<span class="hora">${hora}</span></div>
      ${d.resumenA ? `<div class="tx"><b style="color:${s.equipos.A.color}">${s.equipos.A.nombre}:</b> ${esc(d.resumenA)}</div>` : ""}
      ${d.resumenB ? `<div class="tx"><b style="color:${s.equipos.B.color}">${s.equipos.B.nombre}:</b> ${esc(d.resumenB)}</div>` : ""}
      ${d.disputa ? `<div class="tx"><b>En disputa:</b> ${esc(d.disputa)}</div>` : ""}
      ${d.revisar?.length ? `<div class="tx"><b>Antes de votar, revisen:</b><ul>${d.revisar.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${d.criterios?.length ? `<div class="tx"><b>Criterios:</b><ul>${d.criterios.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}</div>`;
  }
  if (m.tipo === "resultado") {
    const d = m.datos || {}, e = s.equipos[m.equipo];
    return `<div class="msg res" style="--c:${e.color}"><div class="res-head"><b style="color:${e.color}">${e.bandera} ${e.nombre}</b>
        <span style="color:var(--dim);font-size:12px">jurado <b style="color:${colorRigor(d.rigorMedio)}">${(+d.rigorMedio).toFixed(1)}</b>/20</span>
        <span class="delta" style="color:${d.deltaVotos > 0 ? "var(--neon)" : d.deltaVotos < 0 ? "var(--B)" : "var(--dim)"}">${d.deltaVotos > 0 ? "+" : ""}${(+d.deltaVotos).toFixed(1)} votos</span></div>
      ${(d.alumnos || []).map(a => `<div class="ra"><b>${esc(a.autor)}</b> <span style="color:${colorRigor(a.total)};font-weight:700">${(+a.total).toFixed(1)}</span>${a.nota ? `<span class="nt">⚖ ${esc(a.nota)}</span>` : ""}</div>`).join("")}
      ${(d.dicen || []).map(r => `<div class="dice">“${r.comentario}” (${r.delta > 0 ? "+" : ""}${r.delta})</div>`).join("")}</div>`;
  }
  const e = s.equipos[m.equipo] || { color: "var(--dim)" };
  const mia = m.uid === J.uid;
  return `<div class="msg ${m.equipo} ${mia ? "mia" : ""}" style="--c:${e.color}"><div class="who">${esc(m.nombre)}${mia ? " (tú)" : ""}<span class="hora">${hora}</span></div><div class="tx">${menciones(m.texto)}</div></div>`;
}

function pintarChat() {
  const s = J.sala; if (!s) return;
  const p = $("pJuego");
  const abajo = p.scrollHeight - p.scrollTop - p.clientHeight < 140;
  let html = "", ronda = null;
  for (const m of J.chat) {
    if (m.ronda !== ronda) { ronda = m.ronda; html += `<div class="sep">tramo ${m.ronda + 1}</div>`; }
    html += burbuja(m, s);
  }
  p.innerHTML = html || `<div class="sep" style="margin-top:40px">La conversación empieza cuando el profesor abra el primer tramo.</div>`;
  if (abajo || J.primera) p.scrollTop = p.scrollHeight;
}

/* ---------- escribir (bancadas) ---------- */
function prepararCaja() {
  const tx = $("tx");
  tx.oninput = () => { tx.style.height = "auto"; tx.style.height = Math.min(140, tx.scrollHeight) + "px"; pintarCaja(); };
  $("btnEnviar").onclick = enviar;
  pintarCaja();
}
function pintarCaja() {
  if (J.equipo === "P" || !J.sala) return;
  const abierta = J.sala.fase === "abierta";
  $("tx").disabled = !abierta;
  $("tx").placeholder = abierta ? "Escribe a la conversación…" : "La conversación se abre cuando el profesor abra el tramo.";
  $("btnEnviar").disabled = !abierta || !$("tx").value.trim();
  if (!abierta) { $("notaCaja").textContent = ""; $("notaCaja").classList.remove("ati"); }
}
async function enviar() {
  const texto = $("tx").value.trim();
  if (!texto || !J.sala || J.sala.fase !== "abierta") return;
  $("btnEnviar").disabled = true;
  const id = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  try {
    await setDoc(doc(db, "salas", J.codigo, "mensajes", id),
      { tipo: "alumno", uid: J.uid, nombre: J.nombre, email: J.email, equipo: J.equipo, texto: texto.slice(0, 1500), t: Date.now(), ronda: J.sala.ronda });
    $("tx").value = ""; $("tx").style.height = "auto";
    $("notaCaja").textContent = ""; $("notaCaja").classList.remove("ati");
    $("pJuego").scrollTop = $("pJuego").scrollHeight;
  } catch (e) { $("notaCaja").textContent = "No se envió: " + e.code; }
  pintarCaja();
}

/* ---------- público: posición frente a la moción ---------- */
const describePos = v => { const a = Math.abs(v); if (a <= 8) return "indeciso"; const lado = v > 0 ? "a favor" : "en contra"; return (a > 60 ? "muy " : a > 25 ? "" : "algo ") + lado; };
async function guardarPos(v) {
  await setDoc(doc(db, "salas", J.codigo, "publico", J.uid), { pos: Math.round(v), nombre: J.nombre, email: J.email, actualizado: Date.now() });
}
function prepararVoto() {
  const r = $("rngPos");
  const pinta = () => { $("lblPos").textContent = describePos(+r.value); };
  r.oninput = () => {
    pinta();
    clearTimeout(J.guardandoPos);
    J.guardandoPos = setTimeout(() => guardarPos(+r.value).then(() => { $("avisoVoto").textContent = "✓ guardado"; $("voto").classList.remove("pide"); })
      .catch(e => $("avisoVoto").textContent = "No se guardó: " + e.code), 300);
  };
  subs.push(onSnapshot(doc(db, "salas", J.codigo, "publico", J.uid), snap => {
    const d = snap.data(); if (d && document.activeElement !== r) { r.value = d.pos; pinta(); }
  }));
  pinta();
}

/* ---------- el ganador, en grande ---------- */
function ceremonia(s, v) {
  const col = n => n === s.equipos.A.nombre ? s.equipos.A.color : n === s.equipos.B.nombre ? s.equipos.B.color : "var(--txt)";
  const band = n => n === s.equipos.A.nombre ? s.equipos.A.bandera + " " : n === s.equipos.B.nombre ? s.equipos.B.bandera + " " : "";
  const el = document.createElement("div");
  el.id = "ceremonia";
  el.innerHTML = `<div class="k" style="color:var(--amber);font-size:14px">EL VEREDICTO</div>
    <div class="cb" id="c1"><div class="k">La sala · votos ganados</div><div class="cg" style="color:${col(v.ganaP)}">${band(v.ganaP)}${esc(v.ganaP)}</div>
      <div class="cs">${v.movA > 0 ? "+" : ""}${v.movA} · ${v.movB > 0 ? "+" : ""}${v.movB}</div></div>
    ${v.pubN ? `<div class="cb" id="cP"><div class="k">El público · ${v.pubN} alumnos</div><div class="cg" style="color:${col(v.ganaU)}">${band(v.ganaU)}${esc(v.ganaU)}</div>
      <div class="cs">${v.pubA > 0 ? "+" : ""}${v.pubA} · ${v.pubB > 0 ? "+" : ""}${v.pubB}</div></div>` : ""}
    <div class="cb" id="c2"><div class="k">El jurado · rigor /20</div><div class="cg" style="color:${col(v.ganaR)}">${band(v.ganaR)}${esc(v.ganaR)}</div>
      <div class="cs">${v.rA} · ${v.rB}</div></div>
    <button class="btn cb" id="c3" style="max-width:240px">Cerrar</button>`;
  document.body.appendChild(el);
  const ids = v.pubN ? ["c1", "cP", "c2"] : ["c1", "c2"];
  ids.forEach((id, i) => setTimeout(() => $(id)?.classList.add("on"), 2600 + i * 3000));
  setTimeout(() => $("c3")?.classList.add("on"), 2600 + ids.length * 3000 - 200);
  $("c3").onclick = () => el.remove();
}

/* ---------- arranque ---------- */
if (!HAY_FIREBASE) $("errEntrar").textContent = "Esta copia de TRIBUNA no tiene configurado el proyecto Firebase (firebase-config.js).";
else onAuthStateChanged(auth, user => {
  if (user && (user.isAnonymous || !user.email)) { signOut(auth); return; }   // sesión anónima vieja
  J.uid = user?.uid || null; J.email = user?.email || null;
  if (!user) { $("btnEntrar").textContent = "Entrar con Google"; return; }
  $("btnEntrar").textContent = "Entrar";
  if (!$("inNombre").value && user.displayName) $("inNombre").value = user.displayName;
  $("errEntrar").innerHTML = `Conectado como <b>${esc(user.email)}</b> · <a href="#" id="salir" style="color:var(--dim)">salir</a>`;
  $("salir").onclick = e => { e.preventDefault(); signOut(auth).then(() => location.reload()); };
  if ($("inCodigo").value.length === 4 && $("inNombre").value) $("btnEntrar").click();
});
