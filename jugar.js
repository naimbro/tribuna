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

const J = { gente: [], uid: null, email: null, foto: null, fbListo: false, codigo: null, nombre: "", equipo: null, grupo: null, sala: null, chat: [], reloj: null, primera: true };
const google = new GoogleAuthProvider();
const colorRigor = t => t >= 14 ? "var(--neon)" : t >= 9 ? "var(--amber)" : "var(--B)";
const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let subs = [];

// En la rotación el rol cambia en cada debate: "A" o "B" si mi grupo fue llamado, "P" si voto.
const rolEn = s => {
  if (!s || s.modo !== "rotacion") return J.equipo;
  if (!s.debate || !J.grupo) return null;
  return J.grupo === s.debate.A ? "A" : J.grupo === s.debate.B ? "B" : "P";
};


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
    // llegó: aparece en la portada del profesor (foto y nombre) mientras elige su grupo
    if (yo.exists() && yo.data().grupo > 0) { J.grupo = yo.data().grupo; await entrarAlJuego(); return; }
    if (!yo.exists()) await setDoc(doc(db, "salas", codigo, "jugadores", J.uid),
      { nombre, email: J.email, foto: J.foto || "", grupo: 0, equipo: "", unido: Date.now() });
    mostrarBancadas();
  } catch (e) { $("errEntrar").textContent = "No se pudo entrar: " + e.message; }
};

function mostrarBancadas() {
  ["pEntrar", "pJuego", "estado", "caja", "voto", "espera", "fb", "entre"].forEach(id => $(id)?.classList.add("oculto"));
  $("pBancada").classList.remove("oculto");
  $("mocion1").textContent = J.sala.temaGeneral || J.sala.tema;
  const N = J.sala.grupos || 6;
  $("grupos").innerHTML = Array.from({ length: N }, (_, i) => i + 1)
    .map(g => `<button class="btn" data-g="${g}" style="flex:1 0 30%">Grupo ${g}</button>`).join("");
  $("grupos").onclick = e => { const g = +e.target.dataset?.g; if (g) elegirGrupo(g); };
}

async function elegirGrupo(g) {
  try {
    await setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid),
      { nombre: J.nombre, email: J.email, foto: J.foto || "", grupo: g, equipo: "" }, { merge: true });
    J.grupo = g;
  } catch (e) {
    // fuera de la portada ya no se puede cambiar de grupo: se vuelve al que tiene en el servidor
    const yo = await getDoc(doc(db, "salas", J.codigo, "jugadores", J.uid)).catch(() => null);
    const actual = yo && yo.exists() ? yo.data().grupo : 0;
    if (actual > 0) { J.grupo = actual; alert(`El debate ya empezó: solo el profesor puede cambiarte de grupo. Sigues en el Grupo ${actual}.`); }
    else { alert("No se pudo elegir el grupo: " + e.code); return; }
  }
  await entrarAlJuego();
}

/* ---------- jugar ---------- */
async function entrarAlJuego() {
  subs.forEach(u => u()); subs = [];
  $("pEntrar").classList.add("oculto"); $("pBancada").classList.add("oculto");
  $("pJuego").classList.remove("oculto"); $("estado").classList.remove("oculto");
  subs.push(onSnapshot(doc(db, "salas", J.codigo), snap => { J.sala = snap.data(); pintarSala(); }));
  // quiénes están en la sala: para sugerir nombres al escribir @
  subs.push(onSnapshot(collection(db, "salas", J.codigo, "jugadores"), snap => {
    J.gente = []; snap.forEach(d => J.gente.push({ uid: d.id, nombre: d.data().nombre || "", grupo: d.data().grupo || 0 }));
  }));
  // el profesor puede moverme de grupo: el rol y lo que escribo dependen de mi grupo actual
  subs.push(onSnapshot(doc(db, "salas", J.codigo, "jugadores", J.uid), snap => {
    const g = snap.data()?.grupo;
    if (g > 0 && g !== J.grupo) { J.grupo = g; J.debateVisto = null; pintarSala(); }
  }));
  subs.push(onSnapshot(query(collection(db, "salas", J.codigo, "mensajes"), orderBy("t")), snap => {
    const antes = new Set(J.chat.map(m => m.id));
    J.chat = []; snap.forEach(d => J.chat.push({ ...d.data(), id: d.id }));
    const nuevos = J.chat.filter(m => !antes.has(m.id));
    pintarChat();
    if (!J.primera) avisarNuevos(nuevos);
    J.primera = false;
  }, e => { $("pJuego").innerHTML = `<div class="sep">No se pudo leer la conversación (${esc(e.code)}).</div>`; }));
  prepararCaja(); prepararVoto();
  // ¿ya dejó su feedback en esta sala? (o lo saltó en este teléfono)
  J.fbListo = localStorage.getItem("tribuna_fb_" + J.codigo) === "1";
  if (!J.fbListo) getDoc(doc(db, "salas", J.codigo, "feedback", J.uid))
    .then(d => { if (d.exists()) { J.fbListo = true; pintarSala(); } }).catch(() => {});
  clearInterval(J.reloj); J.reloj = setInterval(pintarReloj, 500);
}

// me nombran si aparece "@" + mi nombre (o mi primer nombre)
const meNombran = t => {
  const n = norm(t), mi = norm(J.nombre), primero = mi.split(" ")[0];
  return n.includes("@" + mi) || (primero.length > 2 && n.includes("@" + primero));
};

function avisarNuevos(nuevos) {
  for (const m of nuevos) {
    if (m.tipo === "mod" && meNombran(m.texto) && (rolEn(J.sala) === "A" || rolEn(J.sala) === "B")) {
      navigator.vibrate?.([120, 60, 120]);
      $("notaCaja").textContent = "🎙 La moderadora te pregunta a ti. Responde abajo.";
      $("notaCaja").classList.add("ati");
    }
    // otro alumno me nombró con @
    if (m.tipo === "alumno" && m.uid !== J.uid && meNombran(m.texto)) {
      navigator.vibrate?.([80, 50, 80]);
      const aviso = `💬 ${m.nombre} te mencionó en la conversación.`;
      if (rolEn(J.sala) === "P") $("avisoVoto").textContent = aviso;
      else { $("notaCaja").textContent = aviso + " Puedes responderle con @."; $("notaCaja").classList.add("ati"); }
    }
    if (m.tipo === "relator" && rolEn(J.sala) === "P") {
      navigator.vibrate?.(150);
      $("voto").classList.add("pide");
      $("avisoVoto").textContent = "⚖ El relator pide votar: lee su resumen, revisa lo que indica y ajusta tu posición.";
    }
  }
}

function pintarSala() {
  const s = J.sala; if (!s) return;
  const rol = rolEn(s);
  const colorRol = { A: s.equipos.A.color, B: s.equipos.B.color, P: "#a78bfa" }[rol] || "var(--dim)";
  $("miBancada").textContent = `Grupo ${J.grupo || "?"}${rol === "A" ? ` · ${s.equipos.A.nombre}` : rol === "B" ? ` · ${s.equipos.B.nombre}` : rol === "P" ? " · votas" : ""}`;
  $("miBancada").style.color = colorRol; $("miBancada").style.borderColor = colorRol;
  const d = s.debate;
  $("tramoLbl").textContent = d ? `Debate ${d.n} · ${s.tramo === 1 ? "Réplica" : "Apertura"}.` : "Rotación.";
  $("pauta").textContent = d ? `«${d.pregunta}» — Grupo ${d.A} a favor, Grupo ${d.B} en contra.` : "Esperando la primera pregunta.";
  $("marca").innerHTML = "";
  const debatiendo = rol === "A" || rol === "B";
  $("caja").classList.toggle("oculto", !debatiendo);
  $("voto").classList.toggle("oculto", rol !== "P");
  document.body.classList.toggle("es-publico", rol === "P" && !s.veredicto);
  // cambio de debate: mi grupo fue llamado → aviso; si voto → deslizador al centro
  if (d && J.debateVisto !== d.n) {
    J.debateVisto = d.n;
    if (debatiendo) { navigator.vibrate?.([120, 60, 120]); $("notaCaja").textContent = `🎙 Tu grupo debate ${s.equipos[rol].nombre}. Escribe cuando se abra el tramo.`; $("notaCaja").classList.add("ati"); }
    if (rol === "P") { $("rngPos").value = 0; $("lblPos").textContent = "indeciso"; J.votoDe = null; }
  }
  if (rol === "P" && d && J.votoDe !== d.n && (s.fase === "abierta" || s.fase === "votando")) { J.votoDe = d.n; guardarVoto(0); }
  pintarEntre(s);
  pintarEspera(s);
  pintarFeedback(s);
  if (s.veredicto && !J.ceremoniaVista && J.fbListo) { J.ceremoniaVista = true; ceremonia(s, s.veredicto); }
  pintarChat(); pintarCaja(); pintarReloj();
}

function pintarReloj() {
  const s = J.sala; if (!s) return;
  const el = $("reloj");
  if (s.fase === "abierta" && s.abreEn) {
    const resta = Math.max(0, s.seg - Math.floor((Date.now() - s.abreEn) / 1000));
    el.textContent = `${String(Math.floor(resta / 60)).padStart(2, "0")}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 20);
  } else if (s.fase === "votando" && s.finVoto) {
    const resta = Math.max(0, Math.ceil((s.finVoto - Date.now()) / 1000));
    el.textContent = `0:${String(resta).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 10);
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
  if (m.tipo === "noticia") return `<div class="msg mod" style="--c:var(--amber);border-color:var(--amber);background:#1f1508"><div class="who">📰 Última hora<span class="hora">${hora}</span></div><div class="tx">${esc(m.texto)}</div></div>`;
  if (m.tipo === "mod") return `<div class="msg mod ${meNombran(m.texto) && rolEn(J.sala) !== "P" ? "ati" : ""}"><div class="who">🎙 Moderadora<span class="hora">${hora}</span></div><div class="tx">${menciones(m.texto)}</div></div>`;
  if (m.tipo === "relator") {
    const d = m.datos || {};
    return `<div class="msg rel"><div class="who">📣 Relator · llamado a votar<span class="hora">${hora}</span></div>
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
        ${typeof d.deltaVotos === "number" ? `<span class="delta" style="color:${d.deltaVotos > 0 ? "var(--neon)" : d.deltaVotos < 0 ? "var(--B)" : "var(--dim)"}">${d.deltaVotos > 0 ? "+" : ""}${(+d.deltaVotos).toFixed(1)} votos</span>` : ""}</div>
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
  tx.oninput = () => { tx.style.height = "auto"; tx.style.height = Math.min(140, tx.scrollHeight) + "px"; pintarCaja(); sugerir(); };
  tx.onclick = tx.onkeyup = sugerir;
  $("btnEnviar").onclick = enviar;
  pintarCaja();
}
/* ---------- @menciones: al escribir @ se sugieren nombres de la sala ----------
   Primero los del debate en curso (a quienes tiene sentido responder), después el resto.
   Se inserta nombre y primer apellido: así la mención se destaca entera y la persona la recibe. */
const corto = n => String(n || "").trim().split(/\s+/).slice(0, 2).join(" ");
function sugerir() {
  const tx = $("tx"), caja = $("sugiere");
  const antes = tx.value.slice(0, tx.selectionStart ?? tx.value.length);
  const m = antes.match(/(^|\s)@([^\s@]{0,20})$/);
  if (!m || tx.disabled) { caja.innerHTML = ""; return; }
  const q = norm(m[2]), d = J.sala && J.sala.debate;
  // la gente de la sala, más quienes escribieron en la conversación (por si alguien no tiene ficha)
  const por = new Map();
  for (const g of J.gente) if (g.nombre && g.uid !== J.uid) por.set(norm(g.nombre), { nombre: g.nombre, grupo: g.grupo });
  for (const x of J.chat) if (x.tipo === "alumno" && x.nombre && x.uid !== J.uid && !por.has(norm(x.nombre))) por.set(norm(x.nombre), { nombre: x.nombre, grupo: x.grupo || 0 });
  const enDebate = g => d && (g.grupo === d.A || g.grupo === d.B);
  const lista = [...por.values()]
    .filter(g => !q || norm(g.nombre).split(/\s+/).some(w => w.startsWith(q)))
    .sort((a, b) => (enDebate(b) - enDebate(a)) || corto(a.nombre).localeCompare(corto(b.nombre)))
    .slice(0, 8);
  caja.innerHTML = lista.map(g => `<button type="button" data-n="${esc(corto(g.nombre))}">@${esc(corto(g.nombre))}${g.grupo ? `<small>G${g.grupo}</small>` : ""}</button>`).join("");
  caja.onclick = e => {
    const b = e.target.closest("button"); if (!b) return;
    const ini = antes.length - m[2].length - 1;              // dónde está la @
    const resto = tx.value.slice(antes.length);
    tx.value = tx.value.slice(0, ini) + "@" + b.dataset.n + " " + resto;
    const pos = ini + b.dataset.n.length + 2;
    tx.focus(); tx.setSelectionRange(pos, pos);
    caja.innerHTML = ""; pintarCaja();
  };
}

function pintarCaja() {
  if (!J.sala) return;
  const abierta = J.sala.fase === "abierta" && (rolEn(J.sala) === "A" || rolEn(J.sala) === "B");
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
      { tipo: "alumno", uid: J.uid, nombre: J.nombre, email: J.email, grupo: J.grupo, equipo: rolEn(J.sala),
        debate: J.sala.debate.n, tramo: J.sala.tramo, ronda: J.sala.ronda, texto: texto.slice(0, 1500), t: Date.now() });
    $("tx").value = ""; $("tx").style.height = "auto"; $("sugiere").innerHTML = "";
    $("notaCaja").textContent = ""; $("notaCaja").classList.remove("ati");
    $("pJuego").scrollTop = $("pJuego").scrollHeight;
  } catch (e) { $("notaCaja").textContent = "No se envió: " + e.code; }
  pintarCaja();
}

/* ---------- público: posición frente a la moción ---------- */
const describePos = v => { const a = Math.abs(v); if (a <= 8) return "indeciso"; const lado = v > 0 ? "a favor" : "en contra"; return (a > 60 ? "muy " : a > 25 ? "" : "algo ") + lado; };
async function guardarVoto(v) {
  const s = J.sala; if (!s || !s.debate) return;
  const n = s.debate.n;
  await setDoc(doc(db, "salas", J.codigo, "votos", `${n}_${J.uid}`),
    { uid: J.uid, debate: n, pos: Math.round(v), nombre: J.nombre, email: J.email, grupo: J.grupo, t: Date.now() });
}
function prepararVoto() {
  const r = $("rngPos");
  const pinta = () => { $("lblPos").textContent = describePos(+r.value); };
  r.oninput = () => {
    pinta();
    clearTimeout(J.guardandoPos);
    J.guardandoPos = setTimeout(() => guardarVoto(+r.value)
      .then(() => { $("avisoVoto").textContent = "✓ guardado"; $("voto").classList.remove("pide"); })
      .catch(e => $("avisoVoto").textContent = "No se guardó: " + e.code), 300);
  };
  pinta();
}

/* ---------- espera: portada e intro ---------- */
const iniciales = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();
function miRol(s) {
  return { nombre: `GRUPO ${J.grupo || "?"}`, color: "#22e58a", bandera: "👥" };
}
function pintarEspera(s) {
  const el = $("espera");
  if (s.etapa !== "portada" && s.etapa !== "intro") { el.classList.add("oculto"); el.dataset.clave = ""; return; }
  el.classList.remove("oculto");
  const r = miRol(s);
  const clave = s.etapa + "|" + J.grupo;
  if (el.dataset.clave === clave) return;           // no repintar en cada cambio de la sala
  el.dataset.clave = clave;
  const av = `<div class="av" style="--c:${r.color};--t:92px">${J.foto ? `<img src="${esc(J.foto)}" referrerpolicy="no-referrer" alt="">` : `<span>${iniciales(J.nombre)}</span>`}</div>`;
  const papel = `Estás en el <b>Grupo ${J.grupo}</b>. Cuando la moderadora lo llame, tu grupo debate A FAVOR o EN CONTRA de la pregunta: escribe en la conversación y responde lo que te pregunten, con argumentos y lecturas del curso. Mientras debaten otros, lees y mueves tu deslizador cuando algo te convenza.`;
  el.innerHTML = s.etapa === "portada"
    ? `${av}<h1 style="margin-top:14px">¡Estás dentro, ${esc(J.nombre.split(" ")[0])}!</h1>
       <span class="chip" style="--c:${r.color}">${r.bandera} ${esc(r.nombre)}</span>
       <p style="color:var(--dim);margin-top:18px;max-width:340px">Mira la pantalla del curso. El debate empieza cuando el profesor lo diga.</p>
       <button class="link" id="esCambiar">cambiar de rol</button>`
    : `<div class="k">Semana ${s.semana} · tema general</div>
       <div class="es-mocion">«${esc(s.temaGeneral || s.tema)}»</div>
       <div class="es-lados">
         <div style="--c:${s.equipos.A.color}"><b>${s.equipos.A.bandera} ${esc(s.equipos.A.nombre)}</b>${esc(s.equipos.A.lema || "Defiende la moción.")}</div>
         <div style="--c:${s.equipos.B.color}"><b>${s.equipos.B.bandera} ${esc(s.equipos.B.nombre)}</b>${esc(s.equipos.B.lema || "Rechaza la moción.")}</div>
       </div>
       <div class="es-papel">${papel}</div>`;
  const b = $("esCambiar"); if (b) b.onclick = () => { subs.forEach(u => u()); subs = []; el.dataset.clave = ""; mostrarBancadas(); };
}

/* ---------- feedback: al terminar, antes del veredicto (como en ml2) ----------
   1 a 7 porque es la escala de notas y no hay que explicarla; el comentario es corto porque
   se escribe con el pulgar. Se puede saltar: obligar sube la tasa y baja la calidad. No es
   anónimo (el documento lleva el uid) y en ninguna parte se dice que lo sea. */
const FB = { nota: null };
function pintarFeedback(s) {
  const el = $("fb");
  const toca = s.fase === "fin" && !J.fbListo && s.etapa == null;
  el.classList.toggle("oculto", !toca);
  if (!toca) return;
  if (!$("fbNotas").children.length) {
    $("fbNotas").innerHTML = [1, 2, 3, 4, 5, 6, 7].map(n => `<button data-n="${n}">${n}</button>`).join("");
    $("fbNotas").onclick = e => {
      const n = +e.target.dataset?.n; if (!n) return;
      FB.nota = n; [...$("fbNotas").children].forEach(b => b.classList.toggle("on", +b.dataset.n === n)); fbBoton();
    };
    $("fbTx").oninput = () => { $("fbCuenta").textContent = `${$("fbTx").value.length}/300`; fbBoton(); };
    $("fbEnviar").onclick = enviarFeedback;
    $("fbSaltar").onclick = () => listoFeedback();
  }
  $("fbAviso").textContent = s.veredicto ? "🏆 El veredicto ya está en la pantalla: envía o salta para verlo aquí." : "";
}
const fbBoton = () => { $("fbEnviar").disabled = FB.nota === null && !$("fbTx").value.trim(); };
async function enviarFeedback() {
  $("fbEnviar").disabled = true; $("fbEnviar").textContent = "Enviando…";
  try {
    await setDoc(doc(db, "salas", J.codigo, "feedback", J.uid), {
      nota: FB.nota, comentario: $("fbTx").value.trim().slice(0, 300),
      nombre: J.nombre, email: J.email, grupo: J.grupo, equipo: "", t: Date.now()
    });
    listoFeedback();
  } catch (e) { $("fbAviso").textContent = "No se envió: " + e.code; $("fbEnviar").textContent = "Enviar y ver el veredicto"; fbBoton(); }
}
function listoFeedback() {
  J.fbListo = true;
  localStorage.setItem("tribuna_fb_" + J.codigo, "1");
  $("fb").classList.add("oculto");
  pintarSala();
}

// Entre dos debates: la moderadora prepara la pregunta, o el resultado del que terminó.
function pintarEntre(s) {
  const el = $("entre");
  const toca = s.modo === "rotacion" && s.etapa == null && (s.fase === "propuesta" || s.fase === "resultado" || s.fase === "cerrando");
  el.classList.toggle("oculto", !toca);
  if (!toca) return;
  const u = s.ultimo, mio = (s.ranking || []).find(f => f.grupo === J.grupo);
  const res = (g, r) => `<div style="--c:${g === u.A ? s.equipos.A.color : s.equipos.B.color}"><b>Grupo ${g}</b>${r.puntaje} pts<br><small>jurado ${r.jurado} · público ${r.publico ?? "—"}</small></div>`;
  el.innerHTML = (u && s.fase !== "propuesta" ? `
      <div class="k">Debate ${u.n} · resultado</div>
      <div class="es-mocion" style="font-size:17px">«${esc(u.pregunta)}»</div>
      <div class="es-lados">${res(u.A, u.resA)}${res(u.B, u.resB)}</div>
      <h1 style="margin-top:14px">${u.ganador ? `Gana el Grupo ${u.ganador === "A" ? u.A : u.B}` : "Empate"}</h1>`
    : `<div class="k">Rotación</div><h1>La moderadora prepara la próxima pregunta…</h1>`) +
    (mio && mio.puesto ? `<div class="es-papel">Tu grupo va <b>#${mio.puesto}</b> con ${mio.puntaje} puntos.</div>`
      : J.grupo ? `<div class="es-papel">Tu grupo todavía no debate.</div>` : "");
}

/* ---------- el ganador, en grande ---------- */
function ceremonia(s, v) {
  if (!v.ranking) return;                      // salas antiguas sin ranking: no hay ceremonia de rotación
  const el = document.createElement("div");
  el.id = "ceremonia";
  const mio = v.ranking.find(f => f.grupo === J.grupo);
  el.innerHTML = `<div class="k" style="color:var(--amber);font-size:14px">EL RANKING DE LA CLASE</div>
    <div class="cb" id="cG"><div class="cg" style="color:var(--amber)">${v.campeon ? `🏆 Grupo ${v.campeon}` : "Sin debates"}</div>
      <div class="cs">${mio && mio.puesto ? `Tu grupo terminó #${mio.puesto} con ${mio.puntaje} puntos` : "Tu grupo no alcanzó a debatir"}</div>
      ${v.mejor ? `<div class="cmini">Mejor intervención: <b>${esc(v.mejor.autor)}</b> · Grupo ${v.mejor.grupo} · ${v.mejor.total}/20</div>` : ""}</div>
    <button class="btn cb" id="c3" style="max-width:240px">Cerrar</button>`;
  document.body.appendChild(el);
  setTimeout(() => { $("cG")?.classList.add("on"); navigator.vibrate?.([80, 60, 200]); confeti(["#f5b301", "#ffffff", "#38bdf8"]); }, 1500);
  setTimeout(() => $("c3")?.classList.add("on"), 3500);
  $("c3").onclick = () => el.remove();
}

function confeti(colores, ms = 4500) {
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;z-index:30;pointer-events:none";
  c.width = innerWidth; c.height = innerHeight; document.body.appendChild(c);
  const x = c.getContext("2d");
  const ps = Array.from({ length: 140 }, () => ({ x: c.width / 2, y: c.height * .4, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
    r: Math.random() * 6 + 3, a: Math.random() * 6, va: (Math.random() - .5) * .4, col: colores[Math.floor(Math.random() * colores.length)] }));
  const t0 = performance.now();
  (function paso(t) {
    x.clearRect(0, 0, c.width, c.height);
    const vida = 1 - (t - t0) / ms;
    for (const p of ps) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += p.va;
      x.save(); x.globalAlpha = Math.max(0, Math.min(1, vida * 2)); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.col; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (vida > 0) requestAnimationFrame(paso); else c.remove();
  })(t0);
}

/* ---------- arranque ---------- */
if (!HAY_FIREBASE) $("errEntrar").textContent = "Esta copia de TRIBUNA no tiene configurado el proyecto Firebase (firebase-config.js).";
else onAuthStateChanged(auth, user => {
  if (user && (user.isAnonymous || !user.email)) { signOut(auth); return; }   // sesión anónima vieja
  J.uid = user?.uid || null; J.email = user?.email || null; J.foto = user?.photoURL || null;
  if (!user) { $("btnEntrar").textContent = "Entrar con Google"; return; }
  $("btnEntrar").textContent = "Entrar";
  if (!$("inNombre").value && user.displayName) $("inNombre").value = user.displayName;
  $("errEntrar").innerHTML = `Conectado como <b>${esc(user.email)}</b> · <a href="#" id="salir" style="color:var(--dim)">salir</a>`;
  $("salir").onclick = e => { e.preventDefault(); signOut(auth).then(() => location.reload()); };
  if ($("inCodigo").value.length === 4 && $("inNombre").value) $("btnEntrar").click();
});
