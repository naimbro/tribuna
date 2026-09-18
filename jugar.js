/* =====================================================================
   TRIBUNA — el teléfono del alumno.
   Lee salas/{codigo} (lo publica la pantalla del profesor) y escribe el borrador de su
   bancada en salas/{codigo}/borradores/{A|B}. Una bancada = un texto por ronda: quien
   pulsa "Tomar el teclado" escribe; el resto ve el borrador crecer en vivo.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const J = { uid: null, email: null, codigo: null, nombre: "", equipo: null, sala: null, borrador: null, reloj: null, escribiendo: null };
const google = new GoogleAuthProvider();
const TECLADO_VENCE = 90_000;      // ms sin escribir tras los cuales otro puede tomar el teclado

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
  $("pEntrar").classList.add("oculto"); $("pJuego").classList.add("oculto");
  $("pBancada").classList.remove("oculto");
  $("mocion1").textContent = J.sala.mocion;
  $("btnA").textContent = `${J.sala.equipos.A.bandera} ${J.sala.equipos.A.nombre}`;
  $("btnB").textContent = `${J.sala.equipos.B.bandera} ${J.sala.equipos.B.nombre}`;
  $("btnA").onclick = () => elegir("A");
  $("btnB").onclick = () => elegir("B");
}

async function elegir(k) {
  J.equipo = k;
  await setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { nombre: J.nombre, email: J.email, equipo: k, unido: Date.now() });
  await entrarAlJuego();
}

/* ---------- jugar ---------- */
async function entrarAlJuego() {
  $("pEntrar").classList.add("oculto"); $("pBancada").classList.add("oculto");
  $("pJuego").classList.remove("oculto");
  $("salaLbl").textContent = `sala ${J.codigo} · ${J.nombre}`;
  $("salaLbl").title = J.email || "";
  onSnapshot(doc(db, "salas", J.codigo), snap => { J.sala = snap.data(); pintarSala(); });
  onSnapshot(doc(db, "salas", J.codigo, "borradores", J.equipo), snap => { J.borrador = snap.data() || {}; pintarBorrador(); });
  $("btnCambiar").onclick = mostrarBancadas;
  $("btnTeclado").onclick = tomarTeclado;
  $("tx").addEventListener("input", alEscribir);
  clearInterval(J.reloj); J.reloj = setInterval(pintarReloj, 500);
}

const soyRedactor = () => J.borrador && J.borrador.redactorUid === J.uid;
const tecladoLibre = () => !J.borrador || !J.borrador.redactorUid || soyRedactor()
  || (Date.now() - (J.borrador.actualizado || 0)) > TECLADO_VENCE;

function pintarSala() {
  const s = J.sala; if (!s) return;
  const eq = s.equipos[J.equipo];
  $("tema").textContent = `Semana ${s.semana} · ${s.tema}`;
  $("miBancada").textContent = `${eq.bandera} ${eq.nombre}`;
  $("miBancada").style.color = eq.color;
  $("rondaPill").textContent = `Ronda ${s.ronda + 1}/${s.totalRondas} · ${s.rondaNombre}`;
  $("rolLbl").textContent = s.rol;
  $("pauta").textContent = s.pauta;
  $("lblA").textContent = `${s.equipos.A.nombre} · persuasión`; $("lblB").textContent = `${s.equipos.B.nombre} · persuasión`;
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

  const feed = s.feed.slice().reverse();
  $("feed").innerHTML = feed.length ? feed.map(h => {
    const e = s.equipos[h.equipo], r = h.rubrica;
    return `<div class="int" style="--c:${e.color}">
      <div class="who">${e.bandera} ${esc(h.autor)} <small style="color:var(--dim)">· ${e.nombre} · ${esc(h.rolNombre)}</small>
        <span class="pill" style="float:right;color:${h.deltaVotos > 0 ? "var(--neon)" : h.deltaVotos < 0 ? "var(--B)" : "var(--dim)"}">${h.deltaVotos > 0 ? "+" : ""}${h.deltaVotos.toFixed(1)} votos</span></div>
      <div class="txt">${esc(h.texto)}</div>
      ${h.nota ? `<div class="nota">⚖ ${esc(h.nota)}</div>` : ""}
      <div><span class="chip total">RIGOR ${r.total.toFixed(1)}/20</span>
        <span class="chip">EVIDENCIA ${r.evidencia.toFixed(1)}</span><span class="chip">REFUTACIÓN ${r.refutacion.toFixed(1)}</span>
        <span class="chip">ESTRUCTURA ${r.estructura.toFixed(1)}</span><span class="chip">CONCESIÓN ${r.concesion.toFixed(1)}</span>
        ${h.conceptos.map(c => `<span class="chip">${esc(c)}</span>`).join("")}
        ${h.banderas.map(b => `<span class="chip bandera">⚑ ${esc(b)}</span>`).join("")}</div>
      ${h.dicen.map(d => { const p = s.audiencia.find(x => x.id === d.id); return `<div class="dice">${p ? p.emoji + " " + esc(p.nombre.split(" ")[0]) : ""} (${d.delta > 0 ? "+" : ""}${d.delta}): “${esc(d.comentario)}”</div>`; }).join("")}
    </div>`;
  }).join("") : `<p style="color:var(--dim2)">La sala está en silencio.</p>`;

  const v = s.veredicto, cv = $("cardVeredicto");
  if (v) {
    cv.classList.remove("oculto");
    cv.innerHTML = `<div class="k">Veredicto de la sala</div>
      <div class="ver" style="--c:var(--neon)"><div class="k">Gana en persuasión</div><b style="font-size:18px">${esc(v.ganaP)}</b>
        <div style="color:var(--dim);font-size:13px">votos movidos: <span style="color:var(--A)">${v.movA > 0 ? "+" : ""}${v.movA}</span> / <span style="color:var(--B)">${v.movB > 0 ? "+" : ""}${v.movB}</span></div></div>
      <div class="ver" style="--c:var(--amber)"><div class="k">Gana en rigor</div><b style="font-size:18px">${esc(v.ganaR)}</b>
        <div style="color:var(--dim);font-size:13px">rúbrica: <span style="color:var(--A)">${v.rA}</span> / <span style="color:var(--B)">${v.rB}</span> sobre 20</div></div>`;
  } else cv.classList.add("oculto");

  pintarBorrador(); pintarReloj();
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

function pintarBorrador() {
  const s = J.sala, b = J.borrador || {}; if (!s) return;
  const abierta = s.fase === "abierta";
  const tx = $("tx");
  if (!soyRedactor() || !abierta) {
    if (document.activeElement !== tx || !soyRedactor()) tx.value = b.texto || "";
  }
  tx.readOnly = !(abierta && soyRedactor());
  const n = (tx.value.trim().match(/\S+/g) || []).length;
  $("wc").textContent = n + " palabras";
  $("quienEscribe").textContent = !abierta ? "Ronda cerrada"
    : soyRedactor() ? "Tú tienes el teclado: escribe la intervención de tu bancada"
    : b.redactorNombre ? `Escribe ${b.redactorNombre} — lo ves en vivo` : "Nadie ha tomado el teclado todavía";
  $("estadoTx").textContent = n >= 20 ? "✓ lista" : "";
  const bt = $("btnTeclado");
  bt.style.display = abierta ? "" : "none";
  bt.disabled = !tecladoLibre();
  bt.textContent = soyRedactor() ? "✋ Soltar el teclado" : tecladoLibre() ? "✎ Tomar el teclado" : `✎ Lo tiene ${b.redactorNombre || "otro"}`;
  $("avisoTx").textContent = abierta && !soyRedactor() && b.redactorUid && !tecladoLibre()
    ? "Si quien escribe deja de teclear por un minuto y medio, el teclado se libera." : "";
}

async function tomarTeclado() {
  if (!J.sala || J.sala.fase !== "abierta") return;
  if (soyRedactor()) {
    await setDoc(doc(db, "salas", J.codigo, "borradores", J.equipo), { ...J.borrador, redactorUid: null, redactorNombre: null, actualizado: Date.now() });
    return;
  }
  if (!tecladoLibre()) return;
  await setDoc(doc(db, "salas", J.codigo, "borradores", J.equipo),
    { texto: J.borrador?.texto || "", redactorUid: J.uid, redactorNombre: J.nombre, redactorEmail: J.email, actualizado: Date.now(), ronda: J.sala.ronda });
  $("tx").focus();
}

// Lo escrito viaja a Firestore con un pequeño retraso para no mandar una escritura por tecla.
function alEscribir() {
  if (!soyRedactor()) return;
  $("wc").textContent = ($("tx").value.trim().match(/\S+/g) || []).length + " palabras";
  clearTimeout(J.escribiendo);
  J.escribiendo = setTimeout(() => setDoc(doc(db, "salas", J.codigo, "borradores", J.equipo),
    { texto: $("tx").value.slice(0, 4000), redactorUid: J.uid, redactorNombre: J.nombre, redactorEmail: J.email, actualizado: Date.now(), ronda: J.sala.ronda })
    .catch(e => $("avisoTx").textContent = "No se guardó lo último: " + e.message), 350);
}

/* ---------- arranque ---------- */
if (!HAY_FIREBASE) $("errEntrar").textContent = "Esta copia de TRIBUNA no tiene configurado el proyecto Firebase (firebase-config.js).";
else onAuthStateChanged(auth, user => {
  J.uid = user?.uid || null; J.email = user?.email || null;
  if (!user) { $("btnEntrar").textContent = "Entrar con Google"; return; }
  $("btnEntrar").textContent = "Entrar";
  if (!$("inNombre").value && user.displayName) $("inNombre").value = user.displayName;
  $("errEntrar").innerHTML = `Conectado como <b>${esc(user.email)}</b> · <a href="#" id="salir" style="color:var(--dim)">salir</a>`;
  $("salir").onclick = e => { e.preventDefault(); signOut(auth).then(() => location.reload()); };
  if ($("inCodigo").value.length === 4 && $("inNombre").value) $("btnEntrar").click();
});
