/* =====================================================================
   TRIBUNA — capa online de la pantalla del profesor.
   El motor sigue siendo app.js, corriendo en ESTE navegador (jurado, audiencia, marcador).
   Esta capa solo hace dos cosas:
     1. publica el estado en Firestore (salas/{codigo}) para que los alumnos lo vean en
        su teléfono (jugar.html), y
     2. recibe de Firestore lo que escribe cada alumno (salas/{codigo}/intervenciones/{uid}):
        todos los integrantes de una bancada intervienen; la pantalla muestra quién va escribiendo
        y al cerrar la ronda junta todos los textos de cada bancada (más la caja del profesor).
   Si la pestaña se cierra, el estado completo está en salas/{codigo}/privado/estado y se
   restaura al volver a abrir index.html?sala=CODIGO.
   Se carga como módulo; los globales de app.js (S, AUDIENCIA, abrirRonda…) son visibles.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection }
  from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const params = new URLSearchParams(location.search);
// Sin proyecto configurado (firebase-config.js vacío) esta capa no hace nada: el juego es local.
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const ON = { codigo: null, uid: null, email: null, jugadores: {}, intervenciones: {}, publico: {}, timer: null, pendiente: false };
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
      publicoA: $("publicoA").textContent, publicoB: $("publicoB").textContent, publicoN: S.publico.n,
      rigorA: $("rigorA").textContent, rigorB: $("rigorB").textContent,
      conteo: conteo()
    },
    audiencia: AUDIENCIA.map(p => ({ id: p.id, nombre: p.nombre, bloque: p.bloque, emoji: p.emoji, color: p.color,
                                     votos: p.votos, pos: Math.round(p.pos), ultimo: p.ultimo || "" })),
    turnos: S.turnos.map(t => ({
      orden: t.orden, equipo: t.equipo, ronda: t.ronda, rondaNombre: t.rondaNombre, n: t.n,
      autores: t.autores, rigorMedio: +t.rigorMedio.toFixed(1), deltaVotos: t.deltaVotos,
      dicen: (t.reacciones || []).filter(r => r.comentario).map(r => ({ id: r.id, delta: +r.delta.toFixed(1), comentario: r.comentario }))
    })),
    feed: S.historial.map(h => ({
      orden: h.orden, turnoOrden: h.turnoOrden,
      equipo: h.equipo, autor: h.autor, autorEmail: h.autorEmail || "", ronda: h.ronda, rondaNombre: h.rondaNombre, rolNombre: h.rolNombre,
      texto: h.texto, rubrica: h.ev.rubrica, banderas: h.ev.banderas, nota: h.ev.nota || null,
      conceptos: h.ev.conceptos.map(c => c.etiqueta)
    })),
    shocks: S.shocks.map(x => ({ titular: x.titular, ronda: x.ronda, swing: x.swing })),
    // el ganador llega a los teléfonos cuando el profesor lo revela, no antes
    veredicto: S.fase === "fin" && S.veredictoRevelado ? resumenVeredicto() : null,
    ticker: $("ticker").textContent, motor: $("modoLbl").textContent
  };
}

function resumenVeredicto() {
  const movA = persuasion("A"), movB = persuasion("B");
  const rA = rigorMedio("A") || 0, rB = rigorMedio("B") || 0;
  const P = S.publico;
  return {
    movA, movB, rA: +rA.toFixed(1), rB: +rB.toFixed(1),
    pubN: P.n, pubA: decima(P.A), pubB: decima(P.B),
    ganaU: !P.n ? null : empatanEnVotos(P.A, P.B) ? "EMPATE" : P.A > P.B ? EQUIPOS.A.nombre : EQUIPOS.B.nombre,
    ganaP: empatanEnVotos(movA, movB) ? "EMPATE" : movA > movB ? EQUIPOS.A.nombre : EQUIPOS.B.nombre,
    ganaR: Math.abs(rA - rB) < 0.05 ? "EMPATE" : rA > rB ? EQUIPOS.A.nombre : EQUIPOS.B.nombre
  };
}

// Estado completo para restaurar la pestaña del profesor (incluye evaluaciones y memorias).
function estadoPrivado() {
  return {
    ronda: S.ronda, fase: S.fase, seq: S.seq, votoInicial: S.votoInicial, iniPos: S.iniPos,
    historial: S.historial, turnos: S.turnos, shocks: S.shocks, abreEn: S.abreEn || null,
    publicoSnaps: S.publicoSnaps || [],
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
  // Las cajas de la mesa quedan para el profesor: lo que escriba ahí entra como una
  // intervención más de esa bancada (útil si una bancada no tiene teléfono).
  ["A", "B"].forEach(k => {
    $("tx" + k).placeholder = "Los alumnos escriben desde su teléfono. Lo que escribas aquí entra como una intervención más de esta bancada. Para varias: un párrafo por alumno, empezando con @Nombre:";
    $("sel" + k).innerHTML = `<option>(profesor)</option>`;
  });
  // lo que entregó cada bancada: los alumnos de esa bancada en esta ronda + la caja del profe
  window.recogerEntregas = () => {
    const out = { A: [], B: [] };
    for (const it of Object.values(ON.intervenciones)) {
      if (it.ronda === S.ronda && ["A", "B"].includes(it.equipo) && (it.texto || "").trim())
        out[it.equipo].push({ autor: it.nombre || "alumno", email: it.email || "", texto: it.texto.trim().slice(0, 4000) });
    }
    for (const k of ["A", "B"]) {
      const t = $("tx" + k).value.trim();
      if (t) out[k].push(...partirCaja(t, "(profesor)", ON.email || ""));
    }
    return out;
  };
  envolver("abrirRonda", () => { S.abreEn = Date.now(); ON.avisoTodos = null; pintarListas(); fotoPublico(); });
  envolver("cerrarRonda", () => {
    S.abreEn = null;
    if (S.fase !== "abierta") tick(`Ronda ${S.ronda + 1} cerrada y revelada. ${S.fase === "fin" ? "Se acabó el debate: el profesor mostrará el veredicto." : "Espera a que el profesor abra la siguiente."}`);
  });
  envolver("siguienteRonda");
  envolver("veredicto");
  envolver("ceremonia", () => fotoPublico());
  envolver("lanzarEvento");
  envolver("pintarMarcador");
  envolver("pintarAudiencia");
  envolver("guardarMotor");

  // Quién va escribiendo en cada bancada (nombre + palabras), en vivo
  let primera = true;
  onSnapshot(collection(db, "salas", ON.codigo, "intervenciones"), snap => {
    const antes = ON.intervenciones;
    ON.intervenciones = {};
    snap.forEach(d => ON.intervenciones[d.id] = d.data());
    // sonido cuando alguien entrega (o su texto supera las 20 palabras por primera vez)
    if (!primera) for (const [uid, it] of Object.entries(ON.intervenciones)) {
      const a = antes[uid], n = (it.texto || "").trim().split(/\s+/).length;
      const nAntes = a && a.ronda === it.ronda ? (a.texto || "").trim().split(/\s+/).length : 0;
      const recienEntrega = it.entregado && !(a && a.entregado && a.ronda === it.ronda);
      if (it.ronda === S.ronda && recienEntrega) {
        sonar("pop");
        tick(`✓ ${it.nombre || "Alguien"} (${EQUIPOS[it.equipo]?.nombre || it.equipo}) entregó su intervención.`);
        break;
      }
      if (it.ronda === S.ronda && n >= 20 && nAntes < 20) { sonar("pop"); break; }
    }
    primera = false;
    pintarListas();
  });

  // El público: sus posiciones en vivo
  onSnapshot(collection(db, "salas", ON.codigo, "publico"), snap => {
    ON.publico = {};
    snap.forEach(d => { const x = d.data(); if (typeof x.pos === "number") ON.publico[d.id] = x; });
    calcPublico(); pintarBarraOnline(); publicar();
  });

  // Quiénes están en la sala
  onSnapshot(collectionJugadores(), snap => {
    ON.jugadores = {};
    snap.forEach(d => ON.jugadores[d.id] = d.data());
    pintarBarraOnline(); pintarListas();
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

// Chips por bancada: cada integrante con sus palabras; verde cuando ya tiene 20+.
function pintarListas() {
  let total = 0, listos = 0;
  for (const k of ["A", "B"]) {
    const miembros = Object.entries(ON.jugadores).filter(([, j]) => j.equipo === k);
    $("lista" + k).innerHTML = miembros.map(([uid, j]) => {
      const it = ON.intervenciones[uid];
      const deRonda = it && it.ronda === S.ronda;
      const n = deRonda ? (it.texto.trim().match(/\S+/g) || []).length : 0;
      const entrego = deRonda && it.entregado;
      total++; if (entrego) listos++;
      return `<span class="${entrego ? "ok" : ""}" title="${(j.email || "").replace(/"/g, "")}">${entrego ? "✓ " : ""}${(j.nombre || "?").replace(/</g, "&lt;")} · ${n} palabras${entrego ? "" : n ? " · escribiendo" : ""}</span>`;
    }).join("") || `<span style="border-style:dashed">nadie en esta bancada</span>`;
  }
  // cuando todos los conectados entregaron, el botón lo dice
  const todos = S.fase === "abierta" && total > 0 && listos === total;
  $("btnPrincipal").classList.toggle("todos-listos", todos);
  if (todos && !ON.avisoTodos) { ON.avisoTodos = S.ronda; tick(`Todos entregaron (${listos}). Puedes CERRAR Y REVELAR.`); }
  if (!todos && ON.avisoTodos === S.ronda && S.fase !== "abierta") ON.avisoTodos = null;
}

const collectionJugadores = () => collection(db, "salas", ON.codigo, "jugadores");

/* ---------- EL PÚBLICO: alumnos que no debaten marcan su posición (−100…+100) ----------
   Se toma una foto de las posiciones al abrir cada ronda y al revelar al ganador. Lo que se
   mueve un votante entre dos fotos es efecto de lo que se reveló entre ellas: si se acerca a
   A FAVOR suma a A, si se acerca a EN CONTRA suma a B. Misma medida que la sala sintética
   (voto suave: tanh(pos/12)), así los dos marcadores de votos son comparables. */
function fotoPublico() {
  S.publicoSnaps = S.publicoSnaps || [];
  S.publicoSnaps.push({ t: Date.now(), ronda: S.ronda, pos: Object.fromEntries(Object.entries(ON.publico).map(([u, d]) => [u, d.pos])) });
  calcPublico();
}
function calcPublico() {
  const fotos = [...(S.publicoSnaps || []), { pos: Object.fromEntries(Object.entries(ON.publico).map(([u, d]) => [u, d.pos])) }];
  const suave = v => Math.tanh(v / ESCALA_VOTO);
  let A = 0, B = 0; const aporte = {}, inicial = {}, final = {};
  for (let i = 0; i + 1 < fotos.length; i++) {
    for (const [u, pos] of Object.entries(fotos[i + 1].pos)) {
      const antes = fotos[i].pos[u];
      if (antes === undefined) continue;                      // entró después: su primera foto es su base
      if (inicial[u] === undefined) inicial[u] = antes;
      final[u] = pos;
      const d = suave(pos) - suave(antes);
      if (d > 0) A += d; else B -= d;
      aporte[u] = (aporte[u] || 0) + d;
    }
  }
  const votantes = Object.entries(ON.publico).map(([u, d]) => ({
    uid: u, nombre: d.nombre, email: d.email, inicial: inicial[u] ?? d.pos, final: final[u] ?? d.pos, aporte: aporte[u] || 0 }));
  S.publico = { A: decima(A), B: decima(B), n: Object.keys(ON.publico).length, votantes };
  pintarMarcador();
}

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
  const nA = js.filter(j => j.equipo === "A").length, nB = js.filter(j => j.equipo === "B").length, nP = js.filter(j => j.equipo === "P").length;
  bar.innerHTML = `<b style="color:var(--neon);letter-spacing:.14em">SALA ${ON.codigo}</b>
    <span title="profesor">${ON.email || ""}</span>
    <span>${js.length} en la sala · <span style="color:var(--A)">${EQUIPOS.A.nombre} ${nA}</span> · <span style="color:var(--B)">${EQUIPOS.B.nombre} ${nB}</span> · <span style="color:#a78bfa">PÚBLICO ${nP}</span></span>
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
    S.publicoSnaps = priv.publicoSnaps || [];
    S.historial = priv.historial; S.turnos = priv.turnos || []; S.votoInicial = priv.votoInicial || S.votoInicial; S.iniPos = priv.iniPos || S.iniPos;
    for (const p of AUDIENCIA) { const a = priv.audiencia?.[p.id]; if (a) { p.pos = a.pos; p.memoria = a.memoria || []; p.ultimo = a.ultimo || ""; } }
    // una ronda que estaba abierta cuando se cerró la pestaña se vuelve a abrir a mano
    S.fase = priv.fase === "abierta" ? "listo" : priv.fase;
    S.abreEn = null;
    pintarRonda(); pintarAudiencia(null); pintarMarcador(); pintarFeed();
    $("btnPrincipal").textContent = { listo: "ABRIR RONDA", resuelta: "SIGUIENTE RONDA", fin: "VER VEREDICTO" }[S.fase] || "ABRIR RONDA";
    ["A", "B"].forEach(k => $("tx" + k).disabled = S.fase !== "abierta");
    tick(`Sala ${codigo} restaurada: ${S.historial.length} intervenciones, ronda ${S.ronda + 1}.`);
    // partidas guardadas con la versión anterior (un texto por bancada, votos en cada entrada)
    if (!S.turnos.length && S.historial.length) S.turnos = S.historial.map(h => ({
      orden: h.orden - 0.5, equipo: h.equipo, ronda: h.ronda, rondaNombre: h.rondaNombre, n: 1,
      autores: [h.autor], rigorMedio: h.ev.rubrica.total, deltaVotos: h.deltaVotos || 0, reacciones: h.reacciones || []
    }));
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
  // motor LLM por el servidor de TRIBUNA (Cloud Function `evaluar`): la key vive en Secret Manager
  const evaluarFn = httpsCallable(getFunctions(app, "us-central1"), "evaluar", { timeout: 130000 });
  // Sondeo sin costo: un prompt vacío. Si la función existe responde "invalid-argument" sin
  // llamar al modelo; si no está desplegada (o no eres profesor) el motor por servidor no se ofrece.
  evaluarFn({ prompt: "" }).catch(e => {
    if (e.code !== "functions/invalid-argument") return;
    window.llmServidor = async (prompt, uso) => {
      try { return (await evaluarFn({ prompt, uso })).data.text; }
      catch (e) { throw new Error(e.message || e.code); }
    };
    tick("El servidor de TRIBUNA tiene el motor LLM disponible (⚙ MOTOR, sin key).");
  });
  const codigo = (params.get("sala") || "").toUpperCase();
  if (codigo && await restaurar(codigo)) activarOnline();
  else botonCrear();
});
