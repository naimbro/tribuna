/* =====================================================================
   TRIBUNA — el teléfono del alumno.
   Lee salas/{codigo} (lo publica la pantalla del profesor) y escribe la intervención propia en
   salas/{codigo}/intervenciones/{uid}. Todos los integrantes de una bancada intervienen: cada uno
   escribe la suya en cada ronda; el jurado puntúa a cada uno y la sala oye a la bancada entera.
   El hilo del debate va arriba; la caja de escritura queda fija abajo, como un chat.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, where } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const J = { uid: null, email: null, codigo: null, nombre: "", equipo: null, sala: null, mia: null, companeros: {}, reloj: null, escribiendo: null, rondaVista: null };
const google = new GoogleAuthProvider();
const palabras = t => (t.trim().match(/\S+/g) || []).length;
const colorRigor = t => t >= 14 ? "var(--neon)" : t >= 9 ? "var(--amber)" : "var(--B)";

/* ---------- entrar ---------- */
const guardado = JSON.parse(localStorage.getItem("tribuna_jugador") || "{}");
const params = new URLSearchParams(location.search);
$("inCodigo").value = (params.get("sala") || guardado.codigo || "").toUpperCase();
$("inNombre").value = guardado.nombre || "";

$("btnEntrar").onclick = async () => {
  const codigo = $("inCodigo").value.trim().toUpperCase(), nombre = $("inNombre").value.trim();
  $("errEntrar").textContent = "";
  if (codigo.length !== 4) return $("errEntrar").textContent = "El código tiene 4 letras.";
  if (nombre.length < 2) return $("errEntrar").textContent = "Pon tu nombre: es el que sale en el registro de la sesión.";
  if (!J.uid) {
    // La cuenta Google identifica al alumno de clase a clase; el popup necesita un clic.
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
  $("pEntrar").classList.add("oculto"); $("pJuego").classList.add("oculto"); $("composer").classList.add("oculto"); $("voto").classList.add("oculto");
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
  // el público parte indeciso si no había marcado nada: así queda contado desde el inicio
  if (k === "P") {
    const yo = await getDoc(doc(db, "salas", J.codigo, "publico", J.uid)).catch(() => null);
    if (!yo || !yo.exists()) await guardarPos(0);
  }
  await entrarAlJuego();
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

/* ---------- jugar ---------- */
let subs = [];
async function entrarAlJuego() {
  subs.forEach(u => u()); subs = [];
  $("pEntrar").classList.add("oculto"); $("pBancada").classList.add("oculto");
  $("pJuego").classList.remove("oculto");
  const esPublico = J.equipo === "P";
  document.body.classList.toggle("es-publico", esPublico);
  $("composer").classList.toggle("oculto", esPublico);
  $("voto").classList.toggle("oculto", !esPublico);
  $("salaLbl").textContent = `sala ${J.codigo} · ${J.nombre}`;
  $("salaLbl").title = J.email || "";
  subs.push(onSnapshot(doc(db, "salas", J.codigo), snap => { J.sala = snap.data(); pintarSala(); }));
  if (esPublico) prepararVoto();
  else {
    subs.push(onSnapshot(doc(db, "salas", J.codigo, "intervenciones", J.uid), snap => { J.mia = snap.data() || null; pintarComposer(); }));
    // los de mi bancada (las reglas no dejan leer a la rival): nombre y palabras, en vivo
    subs.push(onSnapshot(query(collection(db, "salas", J.codigo, "intervenciones"), where("equipo", "==", J.equipo)), snap => {
      J.companeros = {}; snap.forEach(d => J.companeros[d.id] = d.data()); pintarCompaneros();
    }));
  }
  $("btnCambiar").onclick = mostrarBancadas;
  $("tx").addEventListener("input", alEscribir);
  $("btnEntregar").onclick = entregar;
  clearInterval(J.reloj); J.reloj = setInterval(pintarReloj, 500);
}

function pintarSala() {
  const s = J.sala; if (!s) return;
  const eq = J.equipo === "P" ? { bandera: "🗳", nombre: "PÚBLICO", color: "#a78bfa" } : s.equipos[J.equipo];
  $("tema").textContent = `Semana ${s.semana} · ${s.tema}`;
  $("miBancada").textContent = `${eq.bandera} ${eq.nombre}`;
  $("miBancada").style.color = eq.color;
  if (J.equipo === "P") {
    // al terminar se ve todo; mientras tanto el público no ve notas ni reacciones
    document.body.classList.toggle("es-publico", !s.veredicto);
    $("tickerP").textContent = "› " + (s.ticker || "").replace(/^›\s*/, "");
    const nT = (s.turnos || []).length;
    if (J.turnosVistos !== undefined && nT > J.turnosVistos) {
      $("voto").classList.add("pide");
      $("avisoVoto").textContent = "Se revelaron intervenciones nuevas: ¿te movieron? Ajusta tu posición.";
    }
    J.turnosVistos = nT;
    $("votoTitulo").textContent = s.fase === "fin" && s.veredicto ? "Tu posición final" : "¿Dónde estás frente a la moción? Muévete cuando algo te convenza.";
  }
  $("rondaPill").textContent = `Ronda ${s.ronda + 1}/${s.totalRondas} · ${s.rondaNombre}`;
  $("rolLbl").textContent = s.rol;
  $("pauta").textContent = s.pauta;
  $("mocion").textContent = s.mocion;
  $("lblA").textContent = `${s.equipos.A.nombre}`; $("lblB").textContent = `${s.equipos.B.nombre}`;
  $("persuA").textContent = s.marcador.persuA; $("persuB").textContent = s.marcador.persuB;
  $("rigorA").textContent = s.marcador.rigorA; $("rigorB").textContent = s.marcador.rigorB;
  const c = s.marcador.conteo, t = c.total || 1;
  $("vA").style.width = 100 * c.a / t + "%"; $("vN").style.width = 100 * c.n / t + "%"; $("vB").style.width = 100 * c.b / t + "%";
  $("cA").textContent = `${c.a} a favor`; $("cN").textContent = `${c.n} indecisos`; $("cB").textContent = `${c.b} en contra`;
  $("ticker").textContent = "› " + (s.ticker || "").replace(/^›\s*/, "");

  $("gente").innerHTML = s.audiencia.map(p => `<div class="p" style="--c:${p.color}">
    <span>${p.emoji}</span><span style="min-width:120px"><b>${esc(p.nombre.split(" ")[0])}</b> <small style="color:var(--dim2)">${p.bloque}</small></span>
    <div class="eje"><div class="dot" style="left:${(p.pos + 100) / 2}%"></div></div></div>
    ${p.ultimo ? `<div class="dice" style="margin:-2px 0 4px 34px">“${esc(p.ultimo)}”</div>` : ""}`).join("");

  // hilo: turnos (bancada × ronda) con sus intervenciones debajo, en orden; lo más nuevo al final
  const turnos = (s.turnos || []).slice().sort((a, b) => a.orden - b.orden);
  const feed = s.feed || [];
  let html = "", ronda = null;
  for (const t of turnos) {
    if (t.ronda !== ronda) { ronda = t.ronda; html += `<div class="sep">${esc(t.rondaNombre)}</div>`; }
    const e = s.equipos[t.equipo];
    html += `<div class="turno" style="--c:${e.color}">
      <div class="th"><b style="color:${e.color}">${e.bandera} ${e.nombre}</b>
        <span>${t.n} intervenci${t.n === 1 ? "ón" : "ones"} · rigor <b style="color:${colorRigor(t.rigorMedio)}">${t.rigorMedio.toFixed(1)}</b></span>
        <span class="pill" style="margin-left:auto;font-size:15px;color:${t.deltaVotos > 0 ? "var(--neon)" : t.deltaVotos < 0 ? "var(--B)" : "var(--dim)"}">${t.deltaVotos > 0 ? "+" : ""}${t.deltaVotos.toFixed(1)} votos</span></div>
      ${(t.dicen || []).map(d => { const p = s.audiencia.find(x => x.id === d.id); return `<div class="dice">${p ? p.emoji + " " + esc(p.nombre.split(" ")[0]) : ""} (${d.delta > 0 ? "+" : ""}${d.delta}): “${esc(d.comentario)}”</div>`; }).join("")}
    </div>`;
    for (const h of feed.filter(h => h.turnoOrden === t.orden).sort((a, b) => a.orden - b.orden)) {
      const r = h.rubrica, mia = h.autorEmail && h.autorEmail === J.email;
      html += `<div class="int ${mia ? "mia" : ""}" style="--c:${e.color}">
        <div class="who">${esc(h.autor)}${mia ? " (tú)" : ""}<span class="pill" style="float:right;color:${colorRigor(r.total)}">rigor ${r.total.toFixed(1)}/20</span></div>
        <div class="txt">${esc(h.texto)}</div>
        ${h.nota ? `<div class="nota">⚖ ${esc(h.nota)}</div>` : ""}
        <div><span class="chip">EVIDENCIA ${r.evidencia.toFixed(1)}</span><span class="chip">REFUTACIÓN ${r.refutacion.toFixed(1)}</span>
          <span class="chip">ESTRUCTURA ${r.estructura.toFixed(1)}</span><span class="chip">CONCESIÓN ${r.concesion.toFixed(1)}</span>
          ${h.conceptos.map(c => `<span class="chip">${esc(c)}</span>`).join("")}
          ${h.banderas.map(b => `<span class="chip bandera">⚑ ${esc(b)}</span>`).join("")}</div>
      </div>`;
    }
  }
  const f = $("feed");
  const alFinal = f.scrollHeight - f.scrollTop - f.clientHeight < 80;
  f.innerHTML = html || `<p style="color:var(--dim2);padding:20px 0">La sala está en silencio. Cuando el profesor abra la ronda, escribe abajo.</p>`;
  if (alFinal || turnos.length !== J.rondaVista) window.scrollTo(0, document.body.scrollHeight);
  J.rondaVista = turnos.length;

  const v = s.veredicto, cv = $("cardVeredicto");
  if (v && !J.ceremoniaVista) { J.ceremoniaVista = true; ceremonia(s, v); }
  if (v) {
    cv.classList.remove("oculto");
    cv.innerHTML = `<div class="k">Veredicto de la sala</div>
      <div class="ver" style="--c:var(--neon)"><div class="k">Gana en persuasión</div><b style="font-size:18px">${esc(v.ganaP)}</b>
        <div style="color:var(--dim);font-size:13px">votos movidos: <span style="color:var(--A)">${v.movA > 0 ? "+" : ""}${v.movA}</span> / <span style="color:var(--B)">${v.movB > 0 ? "+" : ""}${v.movB}</span></div></div>
      <div class="ver" style="--c:var(--amber)"><div class="k">Gana en rigor</div><b style="font-size:18px">${esc(v.ganaR)}</b>
        <div style="color:var(--dim);font-size:13px">rúbrica: <span style="color:var(--A)">${v.rA}</span> / <span style="color:var(--B)">${v.rB}</span> sobre 20</div></div>`;
  } else cv.classList.add("oculto");

  if (J.equipo !== "P") pintarComposer();
  pintarReloj();
}

// El ganador, en grande, cuando el profesor lo revela (misma secuencia que el proyector).
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

function pintarReloj() {
  const s = J.sala; if (!s) return;
  const el = $("reloj");
  if (s.fase === "abierta" && s.abreEn) {
    const resta = Math.max(0, s.seg - Math.floor((Date.now() - s.abreEn) / 1000));
    el.textContent = `${String(Math.floor(resta / 60)).padStart(2, "0")}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 20);
  } else {
    el.textContent = { listo: "espera", resuelta: "revelado", fin: "fin" }[s.fase] || "--:--";
    el.classList.remove("urgente");
  }
}

/* ---------- mi intervención (caja fija abajo) ---------- */
const miaDeEstaRonda = () => J.mia && J.sala && J.mia.ronda === J.sala.ronda;

function pintarComposer() {
  const s = J.sala; if (!s) return;
  const abierta = s.fase === "abierta";
  const tx = $("tx");
  // al cambiar de ronda la caja parte vacía; mientras la ronda está abierta no piso lo que escribe
  if (!abierta || document.activeElement !== tx) tx.value = miaDeEstaRonda() ? (J.mia.texto || "") : (abierta ? tx.value : "");
  if (abierta && J.mia && J.mia.ronda !== s.ronda && document.activeElement !== tx) tx.value = "";
  tx.readOnly = !abierta;
  const n = palabras(tx.value);
  $("wc").textContent = n + " palabras";
  const entregada = miaDeEstaRonda() && J.mia.entregado;
  $("estadoTx").textContent = !abierta ? (miaDeEstaRonda() ? "enviada" : "") : entregada ? "✓ entregada" : n >= 5 ? "guardado" : "";
  $("avisoTx").textContent = abierta && entregada ? "✓ Tu intervención llegó al profesor. Puedes seguir editándola hasta que cierre la ronda; el jurado la lee al revelar." : $("avisoTx").textContent.startsWith("✓") ? "" : $("avisoTx").textContent;
  $("avisoTx").style.color = abierta && entregada ? "var(--neon)" : "";
  $("compTitulo").textContent = !abierta ? "Ronda cerrada" : `${s.rol} · ${s.pauta}`;
  $("btnEntregar").style.display = abierta ? "" : "none";
  $("btnEntregar").disabled = n < 5 || entregada;
  $("btnEntregar").textContent = entregada ? "✓ Entregada" : "Entregar";
  if (entregada) $("btnEntregar").style.background = "#1b3a2a";
  tx.placeholder = abierta ? "Escribe tu intervención. Se guarda mientras escribes; al cerrar la ronda entra lo que haya." : "Espera a que el profesor abra la ronda.";
}

function pintarCompaneros() {
  const s = J.sala; if (!s) return;
  const otros = Object.entries(J.companeros).filter(([uid]) => uid !== J.uid && J.companeros[uid].ronda === s.ronda);
  $("companeros").innerHTML = otros.length
    ? "Tu bancada: " + otros.map(([, c]) => `<span class="pill ${c.entregado ? "ok" : ""}">${esc(c.nombre)} · ${palabras(c.texto || "")}</span>`).join(" ")
    : "";
}

async function guardar(entregado) {
  if (!J.sala || J.sala.fase !== "abierta") return;
  // editar después de entregar mantiene la entrega
  if (!entregado && miaDeEstaRonda() && J.mia.entregado) entregado = true;
  const texto = $("tx").value.slice(0, 4000);
  await setDoc(doc(db, "salas", J.codigo, "intervenciones", J.uid),
    { equipo: J.equipo, ronda: J.sala.ronda, texto, nombre: J.nombre, email: J.email, actualizado: Date.now(), entregado: !!entregado });
}

// Lo escrito viaja a Firestore con un pequeño retraso para no mandar una escritura por tecla.
function alEscribir() {
  $("wc").textContent = palabras($("tx").value) + " palabras";
  $("btnEntregar").disabled = palabras($("tx").value) < 5;
  clearTimeout(J.escribiendo);
  J.escribiendo = setTimeout(() => guardar(false).catch(e => $("avisoTx").textContent = "No se guardó lo último: " + e.code), 400);
}

async function entregar() {
  clearTimeout(J.escribiendo);
  try { await guardar(true); $("avisoTx").textContent = ""; }
  catch (e) { $("avisoTx").textContent = "No se pudo entregar: " + e.code; }
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
