/* =====================================================================
   TRIBUNA — capa online de la pantalla del profesor.
   El motor sigue siendo app.js, corriendo en ESTE navegador (jurado, audiencia, marcador).
   Esta capa solo hace dos cosas:
     1. publica el estado en Firestore (salas/{codigo}) para que los alumnos lo vean en
        su teléfono (jugar.html), y
     2. comparte la conversación (salas/{codigo}/mensajes): alumnos, moderadora, relator y
        resultados, en un solo hilo que todos ven en vivo.
   Si la pestaña se cierra, el estado completo está en salas/{codigo}/privado/estado y se
   restaura al volver a abrir index.html?sala=CODIGO.
   Se carga como módulo; los globales de app.js (S, AUDIENCIA, abrirRonda…) son visibles.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy }
  from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const params = new URLSearchParams(location.search);
// Sin proyecto configurado (firebase-config.js vacío) esta capa no hace nada: el juego es local.
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const ON = { codigo: null, uid: null, email: null, creada: null, jugadores: {}, intervenciones: {}, publico: {}, feedback: 0, timer: null, pendiente: false };
const CODIGO_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nuevoCodigo = () => Array.from({ length: 4 }, () => CODIGO_CHARS[Math.floor(Math.random() * CODIGO_CHARS.length)]).join("");
const urlJugar = () => `${location.origin}${location.pathname.replace(/[^/]*$/, "")}jugar.html?sala=${ON.codigo}`;

/* ---------- lo que ve el alumno: estado público de la sala ---------- */
function estadoPublico() {
  const R = RONDAS[S.ronda];
  return {
    profeUid: ON.uid, profeEmail: ON.email, actualizado: Date.now(), creada: ON.creada || null,
    curso: SESION.curso || "", semana: SESION.semana, tema: SESION.tema, mocion: SESION.mocion,
    etapa: S.etapa || null,                                     // "portada" → "intro" → null (debate)
    equipos: { A: { nombre: EQUIPOS.A.nombre, bandera: EQUIPOS.A.bandera, color: EQUIPOS.A.color, lema: EQUIPOS.A.lema || "" },
               B: { nombre: EQUIPOS.B.nombre, bandera: EQUIPOS.B.bandera, color: EQUIPOS.B.color, lema: EQUIPOS.B.lema || "" } },
    fase: S.fase, ronda: S.ronda, totalRondas: RONDAS.length,
    rondaNombre: R.nombre, rol: R.rol, pauta: R.pauta, seg: R.seg,
    abreEn: S.abreEn || null,                                   // epoch ms; el alumno calcula el reloj
    marcador: {
      publicoA: $("publicoA").textContent, publicoB: $("publicoB").textContent, publicoN: S.publico.n,
      rigorA: $("rigorA").textContent, rigorB: $("rigorB").textContent,
      conteo: conteo()
    },
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
  const { rA, rB, P, gG, a, b, n } = marcadores();
  return {
    rA: +rA.toFixed(1), rB: +rB.toFixed(1),
    ganaG: gG ? EQUIPOS[gG].nombre : "EMPATE", marcA: a, marcB: b, marcN: n,
    pubN: P.n, pubA: decima(P.A), pubB: decima(P.B),
    ganaU: !P.n ? null : empatanEnVotos(P.A, P.B) ? "EMPATE" : P.A > P.B ? EQUIPOS.A.nombre : EQUIPOS.B.nombre,
    ganaR: Math.abs(rA - rB) < 0.05 ? "EMPATE" : rA > rB ? EQUIPOS.A.nombre : EQUIPOS.B.nombre
  };
}

// Estado completo para restaurar la pestaña del profesor (incluye evaluaciones y memorias).
function estadoPrivado() {
  return {
    ronda: S.ronda, fase: S.fase, etapa: S.etapa || null, seq: S.seq, votoInicial: S.votoInicial, iniPos: S.iniPos,
    historial: S.historial, turnos: S.turnos, shocks: S.shocks, abreEn: S.abreEn || null,
    publicoSnaps: S.publicoSnaps || [], publicoBase: S.publicoBase || {},
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
  // La conversación vive en salas/{codigo}/mensajes: el profesor publica ahí (moderadora,
  // relator, resultados y lo que escriba por una bancada) y los alumnos desde el teléfono.
  window.chatRemoto = m => setDoc(doc(db, "salas", ON.codigo, "mensajes", m.id), limpio(m))
    .catch(e => tick("No se pudo publicar en la conversación: " + e.code));
  window.rosterRemoto = () => Object.values(ON.jugadores).filter(j => j.equipo === "A" || j.equipo === "B")
    .map(j => ({ nombre: j.nombre, equipo: j.equipo }));
  let primeraCarga = true;
  onSnapshot(query(collection(db, "salas", ON.codigo, "mensajes"), orderBy("t")), snap => {
    const lista = []; snap.forEach(d => lista.push({ ...d.data(), id: d.id }));
    recibirChat(lista, primeraCarga); primeraCarga = false;
  });
  envolver("abrirRonda", () => { S.abreEn = Date.now(); fotoPublico(); });
  envolver("cerrarRonda", () => {
    S.abreEn = null;
    if (S.fase !== "abierta") tick(`Ronda ${S.ronda + 1} cerrada y revelada. ${S.fase === "fin" ? "Se acabó el debate: el profesor mostrará el veredicto." : "Espera a que el profesor abra la siguiente."}`);
  });
  envolver("siguienteRonda");
  envolver("veredicto");
  envolver("ceremonia", () => fotoPublico());
  envolver("lanzarEvento");
  envolver("pintarMarcador");
  envolver("guardarMotor");

  // El público: sus posiciones en vivo
  onSnapshot(collection(db, "salas", ON.codigo, "publico"), snap => {
    ON.publico = {};
    S.publicoBase = S.publicoBase || {};
    snap.forEach(d => {
      const x = d.data(); if (typeof x.pos !== "number") return;
      ON.publico[d.id] = x;
      // la base de cada votante: la que guardó al entrar (quienes entraron antes de este cambio partieron en 0)
      if (!S.publicoBase[d.id]) S.publicoBase[d.id] = { t: x.desde || Date.now(), pos: typeof x.inicial === "number" ? x.inicial : 0 };   // todos entran en 0 (indeciso)
    });
    calcPublico(); pintarBarraOnline(); publicar();
  });

  // Quiénes están en la sala
  onSnapshot(collectionJugadores(), snap => {
    ON.jugadores = {};
    snap.forEach(d => ON.jugadores[d.id] = d.data());
    pintarBarraOnline(); pintarFeed(); actualizarPortada(ON.jugadores);
  });

  // El feedback de los alumnos (se pide en el teléfono al terminar). Aquí solo se cuenta:
  // los comentarios con nombre se leen en el panel (admin.html), no frente al curso.
  onSnapshot(collection(db, "salas", ON.codigo, "feedback"), snap => { ON.feedback = snap.size; pintarBarraOnline(); },
    () => {});

  // Las escenas: portada (QR y quién va entrando) → intro → debate
  $("btnIntro").onclick = () => irA("intro");
  if (S.etapa === "portada") irA("portada");
  else if (S.etapa === "intro") irA("intro");

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

// Cambia de escena y la publica: los teléfonos muestran lo mismo (espera en la portada,
// la moción durante la intro, la conversación en el debate).
function irA(etapa) {
  S.etapa = etapa;
  cerrarPortada();
  if (etapa === "portada") { mostrarPortada(urlJugar(), ON.codigo, () => irA("intro")); actualizarPortada(ON.jugadores); }
  if (etapa === "intro") mostrarIntro(() => irA(null));
  if (etapa === null) tick("Comienza el debate. Abre el primer tramo cuando estén listos.");
  publicar();
}

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
  const suave = v => Math.tanh(v / ESCALA_VOTO);
  let A = 0, B = 0; const aporte = {}, inicial = {}, final = {};
  // por votante: su base (al entrar) → sus posiciones en cada foto posterior → la de ahora
  for (const [u, d] of Object.entries(ON.publico)) {
    const base = S.publicoBase?.[u];
    const seq = [];
    if (base) seq.push(base.pos);
    for (const f of S.publicoSnaps || []) if (f.pos[u] !== undefined && (!base || f.t > base.t)) seq.push(f.pos[u]);
    seq.push(d.pos);
    inicial[u] = seq[0]; final[u] = d.pos;
    for (let i = 0; i + 1 < seq.length; i++) {
      const dd = suave(seq[i + 1]) - suave(seq[i]);
      if (dd > 0) A += dd; else B -= dd;
      aporte[u] = (aporte[u] || 0) + dd;
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
    ${ON.feedback ? `<span title="Feedback recibido; se lee en MIS PARTIDAS">💬 ${ON.feedback} feedback</span>` : ""}
    <a class="btn" href="admin.html" target="_blank" style="margin-left:auto;text-decoration:none;color:inherit">📋 MIS PARTIDAS</a>
    <button class="btn" id="btnPortada" title="Volver a la portada con el QR y quién entró">⛶ PORTADA</button>`;
  $("btnPortada").onclick = () => irA("portada");
}

/* ---------- crear o restaurar la sala ---------- */
async function crearSala() {
  ON.codigo = nuevoCodigo();
  ON.creada = Date.now();
  S.etapa = "portada";                  // toda sala nueva parte en la portada
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
  ON.creada = pub.data().creada || null;
  S.etapa = priv?.etapa ?? null;
  if (priv && priv.historial) {
    S.ronda = priv.ronda; S.seq = priv.seq || 0; S.shocks = priv.shocks || [];
    S.publicoSnaps = priv.publicoSnaps || []; S.publicoBase = priv.publicoBase || {};
    S.historial = priv.historial; S.turnos = priv.turnos || []; S.votoInicial = priv.votoInicial || S.votoInicial; S.iniPos = priv.iniPos || S.iniPos;
    for (const p of AUDIENCIA) { const a = priv.audiencia?.[p.id]; if (a) { p.pos = a.pos; p.memoria = a.memoria || []; p.ultimo = a.ultimo || ""; } }
    // una ronda que estaba abierta cuando se cerró la pestaña se vuelve a abrir a mano
    S.fase = priv.fase === "abierta" ? "listo" : priv.fase;
    S.abreEn = null;
    pintarRonda(); pintarMarcador(); pintarFeed();
    $("btnPrincipal").textContent = { listo: "ABRIR TRAMO", resuelta: "SIGUIENTE TRAMO", fin: S.veredictoRevelado ? "VER VEREDICTO" : "🏆 REVELAR GANADOR" }[S.fase] || "ABRIR TRAMO";
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
    <a class="btn" href="admin.html" style="margin-left:auto;text-decoration:none;color:inherit">📋 MIS PARTIDAS</a>
    <button class="btn pri" id="btnOnline">🌐 CREAR SALA ONLINE</button>
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
