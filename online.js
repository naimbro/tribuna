/* =====================================================================
   TRIBUNA — capa online de la pantalla del profesor.
   El motor sigue siendo app.js, corriendo en ESTE navegador (jurado, audiencia, marcador).
   Esta capa solo hace dos cosas:
     1. publica el estado en Firestore (salas/{codigo}) para que los alumnos lo vean en
        su teléfono (jugar.html), y
     2. recibe de Firestore lo que escriben las bancadas (salas/{codigo}/borradores/{A|B})
        y lo espeja en las cajas de texto, que en modo online son de solo lectura.
   Si la pestaña se cierra, el estado completo está en salas/{codigo}/privado/estado y se
   restaura al volver a abrir index.html?sala=CODIGO.
   Se carga como módulo; los globales de app.js (S, AUDIENCIA, abrirRonda…) son visibles.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection }
  from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const params = new URLSearchParams(location.search);
// Sin proyecto configurado (firebase-config.js vacío) esta capa no hace nada: el juego es local.
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const ON = { codigo: null, uid: null, email: null, jugadores: {}, borradores: {}, timer: null, pendiente: false };
const CODIGO_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nuevoCodigo = () => Array.from({ length: 4 }, () => CODIGO_CHARS[Math.floor(Math.random() * CODIGO_CHARS.length)]).join("");
const urlJugar = () => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}jugar.html?sala=${ON.codigo}`;

/* ---------- lo que ve el alumno: estado público de la sala ---------- */
function estadoPublico() {
  const R = RONDAS[S.ronda];
  return {
    profeUid: ON.uid, profeEmail: ON.email, actualizado: Date.now(),
    semana: SESION.semana, tema: SESION.tema, mocion: SESION.mocion,
    equipos: { A: { nombre: EQUIPOS.A.nombre, bandera: EQUIPOS.A.bandera, color: EQUIPOS.A.color },
               B: { nombre: EQUIPOS.B.nombre, bandera: EQUIPOS.B.bandera, color: EQUIPOS.B.color } },
    fase: S.fase, ronda: S.ronda, totalRondas: RONDAS.length,
    rondaNombre: R.nombre, rol: R.rol, pauta: R.pauta, seg: R.seg,
    abreEn: S.abreEn || null,                                   // epoch ms; el alumno calcula el reloj
    marcador: {
      persuA: $("persuA").textContent, persuB: $("persuB").textContent,
      rigorA: $("rigorA").textContent, rigorB: $("rigorB").textContent,
      conteo: conteo()
    },
    audiencia: AUDIENCIA.map(p => ({ id: p.id, nombre: p.nombre, bloque: p.bloque, emoji: p.emoji, color: p.color,
                                     votos: p.votos, pos: Math.round(p.pos), ultimo: p.ultimo || "" })),
    feed: S.historial.map(h => ({
      equipo: h.equipo, autor: h.autor, ronda: h.ronda, rondaNombre: h.rondaNombre, rolNombre: h.rolNombre,
      texto: h.texto, rubrica: h.ev.rubrica, banderas: h.ev.banderas, nota: h.ev.nota || null,
      conceptos: h.ev.conceptos.map(c => c.etiqueta), deltaVotos: h.deltaVotos,
      dicen: h.reacciones.filter(r => r.comentario).map(r => ({ id: r.id, delta: +r.delta.toFixed(1), comentario: r.comentario }))
    })),
    shocks: S.shocks.map(x => ({ titular: x.titular, ronda: x.ronda, swing: x.swing })),
    veredicto: S.fase === "fin" ? resumenVeredicto() : null,
    ticker: $("ticker").textContent, motor: $("modoLbl").textContent
  };
}

function resumenVeredicto() {
  const movA = persuasion("A"), movB = persuasion("B");
  const rig = k => { const h = S.historial.filter(x => x.equipo === k); return h.length ? h.reduce((s, x) => s + x.ev.rubrica.total, 0) / h.length : 0; };
  const rA = rig("A"), rB = rig("B");
  return {
    movA, movB, rA: +rA.toFixed(1), rB: +rB.toFixed(1),
    ganaP: empatanEnVotos(movA, movB) ? "EMPATE" : movA > movB ? EQUIPOS.A.nombre : EQUIPOS.B.nombre,
    ganaR: Math.abs(rA - rB) < 0.05 ? "EMPATE" : rA > rB ? EQUIPOS.A.nombre : EQUIPOS.B.nombre
  };
}

// Estado completo para restaurar la pestaña del profesor (incluye evaluaciones y memorias).
function estadoPrivado() {
  return {
    ronda: S.ronda, fase: S.fase, seq: S.seq, votoInicial: S.votoInicial, iniPos: S.iniPos,
    historial: S.historial, shocks: S.shocks, abreEn: S.abreEn || null,
    audiencia: Object.fromEntries(AUDIENCIA.map(p => [p.id, { pos: p.pos, memoria: p.memoria || [], ultimo: p.ultimo || "" }]))
  };
}

// Firestore no acepta `undefined` ni objetos con prototipo raro: se pasa por JSON.
const limpio = o => JSON.parse(JSON.stringify(o));

let publicando = null;
function publicar() {
  if (!ON.codigo || !ON.uid) return;
  clearTimeout(publicando);
  publicando = setTimeout(async () => {
    try {
      await setDoc(doc(db, "salas", ON.codigo), limpio(estadoPublico()));
      await setDoc(doc(db, "salas", ON.codigo, "privado", "estado"), limpio(estadoPrivado()));
    } catch (e) { tick("No se pudo publicar en la sala: " + e.message); }
  }, 250);
}

/* ---------- envolver el motor: cada cambio de estado se publica ---------- */
function envolver(nombre, despues) {
  const original = window[nombre];
  window[nombre] = async function (...args) {
    const r = await original.apply(this, args);
    if (despues) despues();
    publicar();
    return r;
  };
}

function activarOnline() {
  // Las cajas espejan lo que escriben las bancadas desde Firestore. Si nadie ha tomado el
  // teclado por una bancada, el profesor puede escribir por ella (una bancada sin teléfono,
  // o una prueba con una sola persona).
  ["A", "B"].forEach(k => {
    $("tx" + k).placeholder = "Esperando a la bancada… (escriben desde su teléfono). Si nadie toma el teclado, puedes escribir tú aquí.";
  });
  envolver("abrirRonda", () => {
    S.abreEn = Date.now();
    // el borrador de la ronda anterior no se arrastra
    ["A", "B"].forEach(k => setDoc(doc(db, "salas", ON.codigo, "borradores", k),
      { texto: "", redactorUid: null, redactorNombre: null, actualizado: Date.now(), ronda: S.ronda }).catch(() => {}));
  });
  envolver("cerrarRonda", () => {
    S.abreEn = null;
    // el correo del redactor viaja al historial (y de ahí al CSV); el nombre ya va en `autor`
    for (const h of S.historial) if (h.ronda === RONDAS[S.ronda].id && !h.autorEmail)
      h.autorEmail = ON.borradores[h.equipo]?.redactorEmail || (ON.borradores[h.equipo]?.redactorUid ? "" : ON.email);
    if (S.fase !== "abierta") tick(`Ronda ${S.ronda + 1} cerrada y revelada. ${S.fase === "fin" ? "Se acabó el debate: el profesor mostrará el veredicto." : "Espera a que el profesor abra la siguiente."}`);
  });
  envolver("siguienteRonda");
  envolver("veredicto");
  envolver("lanzarEvento");
  envolver("pintarMarcador");
  envolver("pintarAudiencia");
  envolver("guardarMotor");

  // Lo que escriben las bancadas → cajas (solo lectura) y selector de autor
  ["A", "B"].forEach(k => onSnapshot(doc(db, "salas", ON.codigo, "borradores", k), snap => {
    const b = snap.data() || {};
    ON.borradores[k] = b;
    const alguien = !!b.redactorUid;                      // un alumno tiene el teclado
    $("tx" + k).readOnly = alguien;
    if (alguien && (S.fase === "abierta" || S.fase === "listo")) {
      $("tx" + k).value = b.texto || "";
      contarPal(k);
    }
    const quien = b.redactorNombre || "(profesor)";
    $("sel" + k).innerHTML = `<option>${quien.replace(/</g, "&lt;")}</option>`;
  }));

  // Quiénes están en la sala
  onSnapshot(collectionJugadores(), snap => {
    ON.jugadores = {};
    snap.forEach(d => ON.jugadores[d.id] = d.data());
    pintarBarraOnline();
  });

  pintarBarraOnline();
  $("btnEjemplo").style.display = "none";        // en línea escriben los alumnos, no el botón
  // REINICIAR en línea = sala nueva (la vieja queda en Firestore)
  $("btnReset").onclick = () => { if (confirm("¿Crear una sala nueva? La actual queda guardada pero deja de usarse.")) crearSala(); };
  const selSemana = $("selSemana");
  if (selSemana) selSemana.onchange = () => {
    if (confirm("Cambiar de sesión crea una sala nueva. ¿Seguir?")) location.href = `${location.pathname}?semana=${selSemana.value}`;
    else selSemana.value = SESION.semana;
  };
  publicar();
}

const collectionJugadores = () => collection(db, "salas", ON.codigo, "jugadores");

/* ---------- barra de la sala: código, URL, jugadores ---------- */
function pintarBarraOnline() {
  let bar = $("barraOnline");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "barraOnline";
    bar.style.cssText = "display:flex;gap:14px;align-items:center;padding:7px 18px;background:#0c1319;border-bottom:1px solid var(--line);font-size:12.5px;color:var(--dim)";
    document.querySelector(".marcador").before(bar);
  }
  const js = Object.values(ON.jugadores);
  const nA = js.filter(j => j.equipo === "A").length, nB = js.filter(j => j.equipo === "B").length;
  bar.innerHTML = `<b style="color:var(--neon);letter-spacing:.14em">SALA ${ON.codigo}</b>
    <span title="profesor">${ON.email || ""}</span>
    <span>${js.length} en la sala · <span style="color:var(--A)">${EQUIPOS.A.nombre} ${nA}</span> · <span style="color:var(--B)">${EQUIPOS.B.nombre} ${nB}</span></span>
    <span class="mono" style="color:var(--txt)">${urlJugar()}</span>
    <button class="btn" id="btnCodigo" style="margin-left:auto">⛶ MOSTRAR CÓDIGO</button>`;
  $("btnCodigo").onclick = mostrarCodigo;
}

function mostrarCodigo() {
  // QR con la URL de la sala (como en ml2); si la librería no cargó, queda la URL y el código
  let qr = "";
  if (typeof qrcode === "function") {
    const q = qrcode(0, "M"); q.addData(urlJugar()); q.make();
    qr = `<div style="background:#fff;padding:14px;border-radius:12px;display:inline-block">${q.createSvgTag({ cellSize: 6, margin: 0 })}</div>`;
  }
  abrirModal(`<h2 style="text-align:center">Entra con tu teléfono</h2>
    <div style="display:flex;gap:28px;align-items:center;justify-content:center;flex-wrap:wrap;margin:8px 0 14px">
      ${qr}
      <div style="text-align:center">
        <div style="color:var(--dim);font-size:12px;letter-spacing:.14em">CÓDIGO DE LA SALA</div>
        <div class="mono" style="font-size:96px;letter-spacing:.3em;color:var(--neon);line-height:1.1">${ON.codigo}</div>
        <div style="color:var(--dim)">o abre <b>jugar.html</b> y escribe el código</div>
      </div>
    </div>
    <p class="mono" style="text-align:center;font-size:18px;color:var(--txt);word-break:break-all">${urlJugar()}</p>
    <div style="text-align:center"><button class="btn" onclick="cerrarModal()">Volver</button></div>`);
}

/* ---------- crear o restaurar la sala ---------- */
async function crearSala() {
  ON.codigo = nuevoCodigo();
  await setDoc(doc(db, "salas", ON.codigo), limpio({ ...estadoPublico(), creada: Date.now() }));
  await setDoc(doc(db, "salas", ON.codigo, "privado", "estado"), limpio(estadoPrivado()));
  location.href = `${location.pathname}?sala=${ON.codigo}&semana=${SESION.semana}`;
}

async function restaurar(codigo) {
  const pub = await getDoc(doc(db, "salas", codigo));
  if (!pub.exists()) { alert(`La sala ${codigo} no existe.`); history.replaceState(null, "", location.pathname); return false; }
  if (pub.data().profeUid !== ON.uid) {
    alert("Esta sala la creó otro navegador. Solo la pantalla que la creó puede dirigirla; crea una sala nueva.");
    history.replaceState(null, "", location.pathname); return false;
  }
  // la sala se creó con una sesión: si la URL trae otra, se recarga con la correcta
  if (pub.data().semana && pub.data().semana !== SESION.semana) {
    location.href = `${location.pathname}?sala=${codigo}&semana=${pub.data().semana}`;
    return false;
  }
  const priv = (await getDoc(doc(db, "salas", codigo, "privado", "estado"))).data();
  ON.codigo = codigo;
  if (priv && priv.historial) {
    S.ronda = priv.ronda; S.seq = priv.seq || 0; S.shocks = priv.shocks || [];
    S.historial = priv.historial; S.votoInicial = priv.votoInicial || S.votoInicial; S.iniPos = priv.iniPos || S.iniPos;
    for (const p of AUDIENCIA) { const a = priv.audiencia?.[p.id]; if (a) { p.pos = a.pos; p.memoria = a.memoria || []; p.ultimo = a.ultimo || ""; } }
    // una ronda que estaba abierta cuando se cerró la pestaña se vuelve a abrir a mano
    S.fase = priv.fase === "abierta" ? "listo" : priv.fase;
    S.abreEn = null;
    pintarRonda(); pintarAudiencia(null); pintarMarcador(); pintarFeed();
    $("btnPrincipal").textContent = { listo: "ABRIR RONDA", resuelta: "SIGUIENTE RONDA", fin: "VER VEREDICTO" }[S.fase] || "ABRIR RONDA";
    ["A", "B"].forEach(k => $("tx" + k).disabled = S.fase !== "abierta");
    tick(`Sala ${codigo} restaurada: ${S.historial.length} intervenciones, ronda ${S.ronda + 1}.`);
  }
  return true;
}

/* ---------- arranque: el profesor entra con Google ---------- */
const google = new GoogleAuthProvider();

// Arriba, a la vista: el primer intento de uso real no encontró el botón en la barra inferior.
function botonEntrar() {
  const bar = document.createElement("div");
  bar.id = "barraEntrar";
  bar.style.cssText = "display:flex;gap:14px;align-items:center;padding:8px 18px;background:#0c1319;border-bottom:1px solid var(--line);font-size:13px;color:var(--dim)";
  bar.innerHTML = `<span>Para que las bancadas escriban desde sus teléfonos, entra con tu cuenta y crea una sala.</span>
    <button class="btn pri" id="btnEntrarGoogle" style="margin-left:auto">🔑 ENTRAR CON GOOGLE</button>`;
  document.querySelector(".marcador").before(bar);
  $("btnEntrarGoogle").onclick = () => signInWithPopup(auth, google)
    .catch(e => alert("No se pudo entrar: " + e.code + (e.code === "auth/popup-blocked" ? " — el navegador bloqueó la ventana de Google; permite ventanas emergentes para este sitio." : "")));
}

// Misma barra de arriba que el login: la primera vez nadie encontró el botón abajo.
function botonCrear() {
  const bar = document.createElement("div");
  bar.id = "barraEntrar";
  bar.style.cssText = "display:flex;gap:14px;align-items:center;padding:8px 18px;background:#0c1319;border-bottom:1px solid var(--line);font-size:13px;color:var(--dim)";
  bar.innerHTML = `<span>Conectado como <b style="color:var(--txt)">${ON.email}</b>. Crea una sala para que las bancadas escriban desde sus teléfonos.</span>
    <button class="btn pri" id="btnOnline" style="margin-left:auto">🌐 CREAR SALA ONLINE</button>
    <button class="btn" id="btnSalir" title="Salir">⎋ salir</button>`;
  document.querySelector(".marcador").before(bar);
  $("btnOnline").onclick = () => crearSala().catch(e => alert(e.code === "permission-denied"
    ? `La cuenta ${ON.email} no está autorizada para crear salas. El administrador la agrega en la colección "profesores".`
    : "No se pudo crear la sala: " + e.message));
  $("btnSalir").onclick = () => signOut(auth).then(() => location.href = location.pathname);
}

if (HAY_FIREBASE) onAuthStateChanged(auth, async user => {
  $("barraEntrar")?.remove();
  if (!user) { botonEntrar(); return; }
  // sesiones anónimas de la versión anterior: se cierran y se pide Google
  if (user.isAnonymous || !user.email) { await signOut(auth); return; }
  ON.uid = user.uid; ON.email = user.email;
  const codigo = (params.get("sala") || "").toUpperCase();
  if (codigo && await restaurar(codigo)) activarOnline();
  else botonCrear();
});
