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
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, where, writeBatch, deleteField, FieldPath }
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
  const r1 = v => (v === null || v === undefined ? null : +(+v).toFixed(1));
  const U = S.clase.ultimo;
  const orac = rankingOraculos(S.clase.oraculos || {});
  const R = tramoActual();
  // con revelación, durante la preparación nadie sabe quién pasa al frente: el par no se publica
  // (y con personajes, tampoco la moción: la sala ve los duelos que faltan)
  const enSuspenso = S.fase === "listo" && S.revelado === false;
  return {
    profeUid: ON.uid, profeEmail: ON.email, actualizado: Date.now(), creada: ON.creada || null,
    curso: SESION.curso || "", semana: SESION.semana, tema: SESION.tema, mocion: SESION.mocion,
    etapa: S.etapa || null,                                     // "portada" → "intro" → null (debate)
    equipos: { A: { nombre: EQUIPOS.A.nombre, bandera: EQUIPOS.A.bandera, color: EQUIPOS.A.color, lema: EQUIPOS.A.lema || "" },
               B: { nombre: EQUIPOS.B.nombre, bandera: EQUIPOS.B.bandera, color: EQUIPOS.B.color, lema: EQUIPOS.B.lema || "" } },
    modo: "rotacion", grupos: S.clase.grupos, temaGeneral: S.clase.tema || SESION.tema,
    debate: S.debate ? (enSuspenso
      ? { n: S.debate.n, pregunta: PERS ? null : S.debate.pregunta, A: null, B: null, posturas: PERS ? null : S.debate.posturas || null }
      : { n: S.debate.n, pregunta: S.debate.pregunta, A: S.debate.A, B: S.debate.B, posturas: S.debate.posturas || null }) : null,
    revelado: S.revelado !== false,
    finEntrada: S.fase === "entrada" ? S.finEntrada || null : null,   // la entrada al escenario
    duelos: PERS && enSuspenso ? datosPreparacion().duelos : null,
    opciones: { ...OPCIONES_DEFECTO, ...(S.clase.opciones || {}) },
    tramo: S.tramo, finVoto: S.fase === "votando" ? S.finVoto || null : null,
    finPrep: S.fase === "listo" ? S.finPrep || null : null,       // el minuto de preparación
    ranking: (S.clase.ranking || []).map(f => ({ grupo: f.grupo, debates: f.debates, puesto: f.puesto, distincion: f.distincion,
      jurado: f.jurado === null ? null : +f.jurado.toFixed(1), publico: f.publico === null ? null : +f.publico.toFixed(1),
      puntaje: f.puntaje === null ? null : +f.puntaje.toFixed(1) })),
    // el debate en curso tampoco va en la lista mientras está en suspenso
    debates: S.clase.debates.filter((d, i) => !(enSuspenso && i === S.clase.debates.length - 1)).map(d => ({ n: d.n, pregunta: d.pregunta, A: d.A, B: d.B,
      ganador: d.res ? d.res.ganador : null,
      puntajeA: d.res ? r1(d.res.A.puntaje) : null, puntajeB: d.res ? r1(d.res.B.puntaje) : null,
      totalA: d.panel ? r1(d.panel.A.total) : null, totalB: d.panel ? r1(d.panel.B.total) : null,
      votosA: d.publico ? d.publico.A : null, votosB: d.publico ? d.publico.B : null,
      barraA: d.barra ? Math.round(d.barra.A.pct * 100) : null, barraB: d.barra ? Math.round(d.barra.B.pct * 100) : null,
      jueces: (d.jueces || []).map(j => ({ emoji: j.emoji, nombre: j.nombre, A: j.A, B: j.B, fraseA: j.fraseA || "", fraseB: j.fraseB || "" })) })),
    ultimo: U ? { n: U.n, pregunta: U.pregunta, A: U.A, B: U.B, ganador: U.res.ganador,
      resA: { jurado: r1(U.res.A.jurado), publico: r1(U.res.A.publico), puntaje: r1(U.res.A.puntaje) },
      resB: { jurado: r1(U.res.B.jurado), publico: r1(U.res.B.publico), puntaje: r1(U.res.B.puntaje) },
      panel: U.panel ? { A: r1(U.panel.A.total), B: r1(U.panel.B.total), ganador: U.panel.ganador } : null,
      publico: U.publico ? { A: U.publico.A, B: U.publico.B, n: U.publico.n, ganador: U.publico.ganador } : null,
      jueces: (U.jueces || []).map(j => ({ id: j.id, nombre: j.nombre, emoji: j.emoji, A: j.A, B: j.B, fraseA: j.fraseA || "", fraseB: j.fraseB || "" })),
      termo: U.termo || null, frase: U.frase || null } : null,
    conteoVotos: { A: S.publico.A || 0, B: S.publico.B || 0, n: S.publico.n || 0, elegibles: S.publico.elegibles || 0 },
    oraculos: orac.slice(0, 10).map(o => ({ uid: o.uid, nombre: o.nombre, grupo: o.grupo || 0, puntos: o.puntos, aciertos: o.aciertos, predicciones: o.predicciones, puesto: o.puesto })),
    oraculoDe: Object.fromEntries(orac.map(o => [o.uid, { puntos: o.puntos, puesto: o.puesto }])),
    fase: S.fase, ronda: S.ronda, totalRondas: TRAMOS.length,
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
      debate: h.debate || null, grupo: h.grupo || null, rubrica: h.ev.rubrica, banderas: h.ev.banderas, nota: h.ev.nota || null,
      conceptos: h.ev.conceptos.map(c => c.etiqueta)
    })),
    shocks: S.shocks.map(x => ({ titular: x.titular, ronda: x.ronda, swing: x.swing })),
    // el ganador llega a los teléfonos cuando el profesor lo revela, no antes
    veredicto: S.fase === "fin" && S.veredictoRevelado ? resumenFinal() : null,
    // brújula: la definición y la fase (solo si está encendida), el mapa sin uid y los grupos por campo
    brujula: conBrujulaActiva()
      ? { activa: true, fase: S.clase.brujula.fase, ejes: BRUJULA.ejes, campos: BRUJULA.campos,
          preguntas: BRUJULA.preguntas.map(p => ({ id: p.id, texto: p.texto, opciones: p.opciones.map(o => ({ texto: o.texto,
            ...(typeof o.x === "number" ? { x: o.x } : {}), ...(typeof o.y === "number" ? { y: o.y } : {}) })) })) }
      : { activa: false, fase: null },
    mapa: conBrujulaActiva() && ON.brujula ? barajar(window.datosMapa().puntos.filter(p => !p.parcial).map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), campo: p.campo }))) : [],
    mapaMov: conBrujulaActiva() && ON.brujula ? barajar(window.datosMapa().movimiento.filter(m => !m.parcial).map(m => ({ x: m.x, y: m.y, dx: m.desde.x, dy: m.desde.y, campo: m.campo }))) : [],
    gruposInfo: S.clase.gruposInfo || [],
    // clase con personajes: la lista, el cupo y si la inscripción está abierta. firestore.rules hace
    // cumplir el cupo solo si `personajes` está en la sala; las semanas sin personajes no lo publican.
    ...(PERS ? { personajes: PERS, cupo: S.clase.cupo || SESION.cupo || 4, inscripcion: S.clase.inscripcion || null } : {}),
    ticker: $("ticker").textContent, motor: $("modoLbl").textContent
  };
}

function resumenFinal() {
  const r = S.clase.ranking || [];
  const ors = rankingOraculos(S.clase.oraculos || {}).slice(0, 3);
  return { campeon: r[0] && r[0].debates ? r[0].grupo : null,
           ranking: r.map(f => ({ grupo: f.grupo, puesto: f.puesto, puntaje: f.puntaje === null ? null : +f.puntaje.toFixed(1) })),
           oraculos: ors.map(o => ({ nombre: o.nombre, grupo: o.grupo || 0, puntos: o.puntos, puesto: o.puesto })) };
}

// Estado completo para restaurar la pestaña del profesor (incluye evaluaciones y memorias).
function estadoPrivado() {
  return {
    ronda: S.ronda, fase: S.fase, etapa: S.etapa || null, seq: S.seq, votoInicial: S.votoInicial, iniPos: S.iniPos,
    historial: S.historial, turnos: S.turnos, shocks: S.shocks, abreEn: S.abreEn || null,
    clase: S.clase, debate: S.debate, tramo: S.tramo, finVoto: S.finVoto || null, veredictoRevelado: !!S.veredictoRevelado,
    revelado: S.revelado !== false,
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
  let primeraCarga = true;
  onSnapshot(query(collection(db, "salas", ON.codigo, "mensajes"), orderBy("t")), snap => {
    const lista = []; snap.forEach(d => lista.push({ ...d.data(), id: d.id }));
    recibirChat(lista, primeraCarga); primeraCarga = false;
  });
  envolver("abrirRonda", () => { S.abreEn = Date.now(); });   // el teléfono calcula el reloj desde abreEn
  envolver("cerrarRonda");
  window.publicarEstado = publicar;
  window.jugadoresSala = () => ON.jugadores;
  window.gruposConectados = () => [...new Set(Object.values(ON.jugadores).map(j => j.grupo).filter(g => g > 0))].sort((a, b) => a - b);
  window.rosterRemoto = () => !S.debate ? [] : Object.values(ON.jugadores)
    .filter(j => j.grupo === S.debate.A || j.grupo === S.debate.B)
    .map(j => ({ nombre: j.nombre, equipo: j.grupo === S.debate.A ? "A" : "B", grupo: j.grupo }));
  window.moverAlumno = (uid, grupo) => (PERS ? moverPersonaje(uid, grupo)
    : setDoc(doc(db, "salas", ON.codigo, "jugadores", uid), { grupo }, { merge: true }))
    .then(() => true).catch(e => { tick("No se pudo mover al alumno: " + e.code); return false; });
  window.alCambiarDebate = n => { suscribirVotos(n); suscribirPublicoActivo(n); };
  envolver("lanzarEvento");
  envolver("pintarMarcador");
  envolver("guardarMotor");

  // Quiénes están en la sala
  onSnapshot(collectionJugadores(), snap => {
    ON.jugadores = {};
    snap.forEach(d => ON.jugadores[d.id] = d.data());
    notarEscribiendo(ON.jugadores);
    asignarRezagados();
    asignarAtrasados();
    if (S.publico) S.publico.elegibles = elegibles();
    pintarBarraOnline(); pintarFeed(); actualizarPortada(ON.jugadores);
    if (typeof refrescarMapaVivo === "function") refrescarMapaVivo();
  });

  // El feedback de los alumnos (se pide en el teléfono al terminar). Aquí solo se cuenta:
  // los comentarios con nombre se leen en el panel (admin.html), no frente al curso.
  onSnapshot(collection(db, "salas", ON.codigo, "feedback"), snap => { ON.feedback = snap.size; pintarBarraOnline(); },
    () => {});

  // Brújula: las respuestas de cada alumno. De aquí salen el mapa anónimo y los grupos.
  ON.brujula = {};
  onSnapshot(collection(db, "salas", ON.codigo, "brujula"), snap => {
    ON.brujula = {};
    snap.forEach(d => ON.brujula[d.id] = d.data());
    asignarRezagados();
    if (typeof actualizarMapaPortada === "function") actualizarMapaPortada();
    if (typeof refrescarMovimiento === "function") refrescarMovimiento();
    if (typeof refrescarMapaVivo === "function") refrescarMapaVivo();
    publicar();
  }, () => {});
  // 🏁 Terminar partida desde el panel (admin.html): si esta pantalla sigue abierta, termina ella,
  // porque su próxima publicación pisaría el cierre que escribió el panel.
  let ordenVista = null;
  onSnapshot(doc(db, "salas", ON.codigo, "privado", "orden"), snap => {
    const t = snap.exists() ? snap.data().terminar || 0 : 0;
    if (ordenVista === null) { ordenVista = t; return; }          // la que ya estaba al abrir no cuenta
    if (t <= ordenVista) return;
    ordenVista = t;
    if (S.fase === "fin") { S.veredictoRevelado = true; publicar(); return; }
    terminarClase(true);
    S.veredictoRevelado = true;
    publicar();
    tick("La partida se terminó desde el panel.");
  }, () => {});
  // quien llegó tarde y no responde la brújula en 90 s queda en el grupo más chico
  setInterval(asignarRezagados, 10000);
  // con personajes: quien llega con la inscripción cerrada entra al personaje más chico
  setInterval(asignarAtrasados, 10000);

  // Las escenas: portada (QR y quién va entrando) → intro → debate
  $("btnIntro").onclick = () => irA("intro");
  if (S.etapa === "portada") irA("portada");
  // recargó la pestaña durante la repetición: la escena vuelve (y LISTO ▶ la cierra)
  if (S.clase.brujula && S.clase.brujula.fase === "repetir" && typeof mostrarMovimiento === "function") mostrarMovimiento();
  else if (S.etapa === "intro") irA("intro");
  else if (S.fase === "propuesta") mostrarPropuesta();     // se recargó con una propuesta pendiente
  else if (S.fase === "votando" && S.debate) mostrarVotacion(S.debate);   // se recargó a mitad de la votación
  // restaurar corre antes que activarOnline: la suscripción a los votos del debate en curso va aquí
  if (S.debate) { suscribirVotos(S.debate.n); suscribirPublicoActivo(S.debate.n); }
  // la curva del termómetro: un punto cada pocos segundos mientras el debate está abierto
  setInterval(muestrearTermometro, PUB.CURVA_PASO * 1000);

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

/* ---------- «Grupo N está escribiendo…» ----------
   El teléfono marca en su ficha de jugador escribe: { debate, t } mientras teclea (t = 0 al
   enviar). Aquí se anota cuándo llegó cada marca nueva y se muestra por grupo, nunca por nombre:
   con el nombre, sus compañeros se quedan esperando a que termine (como en WhatsApp). */
const ESCRIBE = {};                       // uid → { t, visto }
let escribePrimera = true;                // la primera foto trae marcas viejas: no cuentan como «ahora»
function notarEscribiendo(jugadores) {
  for (const [uid, j] of Object.entries(jugadores)) {
    const e = j.escribe;
    if (!e) continue;
    if (!ESCRIBE[uid] || ESCRIBE[uid].t !== e.t) ESCRIBE[uid] = { t: e.t, visto: escribePrimera ? 0 : Date.now() };
  }
  escribePrimera = false;
  pintarEscribiendo();
}
function pintarEscribiendo() {
  const el = $("escribiendo"); if (!el) return;
  const d = S.fase === "abierta" && S.debate;
  const xs = Object.entries(ON.jugadores).map(([uid, j]) => ({ uid, grupo: j.grupo, debate: j.escribe && j.escribe.debate,
    t: j.escribe && j.escribe.t, visto: ESCRIBE[uid] ? ESCRIBE[uid].visto : 0 }));
  const gs = d ? gruposEscribiendo(xs, { debate: d.n, ahora: Date.now() }) : [];
  el.innerHTML = gs.map(g => { const k = g === d.A ? "A" : "B";
    return `<span style="color:${EQUIPOS[k].color}">✍ ${esc(nombreG(g))} está escribiendo<i>…</i></span>`; }).join("");
}
setInterval(pintarEscribiendo, 1000);

// Cambia de escena y la publica: los teléfonos muestran lo mismo (espera en la portada,
// la moción durante la intro, la conversación en el debate).
function irA(etapa) {
  S.etapa = etapa;
  // salir de la portada cierra la inscripción: quien no eligió entra al personaje más chico
  if (PERS && etapa !== "portada" && S.clase.inscripcion === "abierta") window.cerrarInscripcion();
  cerrarPortada();
  if (etapa === "portada") { mostrarPortada(urlJugar(), ON.codigo, () => irA("intro")); actualizarPortada(ON.jugadores); }
  if (etapa === "intro") mostrarIntro(() => irA(null));
  if (etapa === null) {
    tick("Comienza la rotación: revisa la primera pregunta de la moderadora.");
    if (S.fase === "propuesta" && !S.debate) mostrarPropuesta();
  }
  publicar();
}

/* ---------- EL PÚBLICO: alumnos que no debaten marcan su posición (−100…+100) ----------
   Se toma una foto de las posiciones al abrir cada ronda y al revelar al ganador. Lo que se
   mueve un votante entre dos fotos es efecto de lo que se reveló entre ellas: si se acerca a
   A FAVOR suma a A, si se acerca a EN CONTRA suma a B. Misma medida que la sala sintética
   (voto suave: tanh(pos/12)), así los dos marcadores de votos son comparables. */
// El voto del debate n: una respuesta binaria y una predicción por votante.
// quienes pueden votar en el debate en curso, con nombre (para registrar «no votó» al cerrar)
window.listaElegibles = () => !S.debate ? [] : Object.entries(ON.jugadores)
  .filter(([, j]) => j.grupo > 0 && j.grupo !== S.debate.A && j.grupo !== S.debate.B)
  .map(([uid, j]) => ({ uid, nombre: j.nombre || "", email: j.email || "", grupo: j.grupo }));
const elegibles = () => !S.debate ? 0 : Object.values(ON.jugadores)
  .filter(j => j.grupo > 0 && j.grupo !== S.debate.A && j.grupo !== S.debate.B).length;
let desuscribirVotos = null;
function suscribirVotos(n) {
  desuscribirVotos?.();
  desuscribirVotos = onSnapshot(query(collection(db, "salas", ON.codigo, "votos"), where("debate", "==", n)), snap => {
    const votantes = [];
    snap.forEach(d => { const x = d.data(); votantes.push({ uid: x.uid, nombre: x.nombre, email: x.email, grupo: x.grupo, voto: x.voto ?? null, prediccion: x.prediccion ?? null }); });
    const v = votoPublico(votantes.map(x => x.voto));
    S.publico = { A: v.A, B: v.B, n: v.n, elegibles: elegibles(), votantes };
    S.votosDe = n;                                   // la foto de votos de este debate ya llegó
    pintarMarcador(); if (typeof actualizarVotacion === "function") actualizarVotacion(); publicar();
  });
}

/* ---------- EL PÚBLICO ACTIVO (publico.js): termómetro, reacciones y preguntas ----------
   Lo escriben los votantes desde el teléfono, por debate; aquí se lee para el proyector y la
   moderadora. S.termo: { uid: { pos, pos0 } }; S.reacciones: { msg: { fuego, fuente, concede } };
   S.preguntasPub: las preguntas de la tribuna del debate en curso. */
let desuscribirActivo = [];
function suscribirPublicoActivo(n) {
  desuscribirActivo.forEach(u => u()); desuscribirActivo = [];
  S.termo = {}; S.reacciones = {}; S.preguntasPub = [];
  const del = c => query(collection(db, "salas", ON.codigo, c), where("debate", "==", n));
  desuscribirActivo.push(onSnapshot(del("termometro"), snap => {
    S.termo = {}; snap.forEach(d => { const x = d.data(); S.termo[x.uid] = { pos: x.pos, pos0: x.pos0 }; });
    if (typeof pintarTermometro === "function") pintarTermometro();
  }, () => {}));
  desuscribirActivo.push(onSnapshot(del("reacciones"), snap => {
    const xs = []; snap.forEach(d => xs.push(d.data()));
    S.reacciones = contarReacciones(xs);
    pintarFeed();
    // 🤔 de la tribuna: si un mensaje cruza el umbral, la moderadora pide la fuente
    const reg = S.clase.debates[n - 1];
    if (!reg || S.fase !== "abierta" || !S.debate || S.debate.n !== n) return;
    for (const id of pedidosDeFuente(S.reacciones, reg.pedidosFuente, elegibles())) {
      (reg.pedidosFuente = reg.pedidosFuente || []).push(id);
      if (typeof pedirFuenteTribuna === "function") pedirFuenteTribuna(id);
    }
  }, () => {}));
  desuscribirActivo.push(onSnapshot(del("preguntas"), snap => {
    S.preguntasPub = []; snap.forEach(d => S.preguntasPub.push(d.data()));
    if (typeof pintarTermometro === "function") pintarTermometro();
  }, () => {}));
}
function muestrearTermometro() {
  if (S.fase !== "abierta" || !S.debate || !S.termo) return;
  const reg = S.clase.debates[S.debate.n - 1];
  if (!reg) return;
  const r = resumenTermometro(Object.values(S.termo));
  const seg = S.abreEn ? (Date.now() - S.abreEn) / 1000 : tramoActual().seg - (S.seg || 0);
  reg.curva = muestraCurva(reg.curva, seg, r.final, r.n);
  if (typeof pintarTermometro === "function") pintarTermometro();
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
  const nG = new Set(js.map(j => j.grupo).filter(g => g > 0)).size;
  bar.innerHTML = `<b style="color:var(--neon);letter-spacing:.14em">SALA ${ON.codigo}</b>
    <span title="profesor">${ON.email || ""}</span>
    <span>${js.length} en la sala · ${nG} de ${S.clase.grupos} ${PERS ? "personajes" : "grupos"} con gente${PERS ? ` · cupo ${S.clase.cupo || SESION.cupo || 4} · inscripción ${S.clase.inscripcion === "abierta" ? "abierta" : S.clase.inscripcion === "cerrada" ? "cerrada" : "sin abrir"}` : ""}</span>
    <span class="mono" style="color:var(--txt)">${urlJugar()}</span>
    ${ON.feedback ? `<span title="Feedback recibido; se lee en MIS PARTIDAS">💬 ${ON.feedback} feedback</span>` : ""}
    <a class="btn" href="admin.html" target="_blank" style="margin-left:auto;text-decoration:none;color:inherit">📋 MIS PARTIDAS</a>
    <button class="btn" id="btnPortada" title="Volver a la portada con el QR y quién entró">⛶ PORTADA</button>`;
  $("btnPortada").onclick = () => irA("portada");
}

/* ---------- brújula: mapa, grupos y rezagados ---------- */
const barajar = xs => xs.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
const conBrujulaActiva = () => !!(S.clase.brujula && S.clase.brujula.activa && typeof BRUJULA !== "undefined");
window.datosMapa = () => {
  const r = Object.entries(ON.brujula || {}).filter(([uid, b]) => b.pos && ON.jugadores && ON.jugadores[uid]).map(([uid, b]) => ({ ...b, uid }));
  return {
    // uid solo en la pantalla del profesor; «parcial»: todavía respondiendo (el punto se mueve en vivo)
    puntos: r.map(b => ({ uid: b.uid, x: b.pos.x, y: b.pos.y, campo: b.campo, parcial: !!b.parcial, grupo: ON.jugadores[b.uid].grupo || 0 })),
    movimiento: r.filter(b => b.repeticion && b.repeticion.pos).map(b => ({ uid: b.uid, x: b.repeticion.pos.x, y: b.repeticion.pos.y, desde: b.pos, campoAntes: b.campo, campo: b.repeticion.campo, parcial: !!b.repeticion.parcial }))
  };
};
// Una formación a la vez: el 22-sep-2026 (sala 42RT) dos corridas se cruzaron en el mismo segundo;
// Firestore quedó con una mezcla de las dos y la pantalla con la otra, y los teléfonos decían un
// grupo y el proyector otro durante toda la clase. Las corridas se encadenan y la última manda.
let formando = Promise.resolve();
window.formarGruposBrujula = () => (formando = formando.catch(() => {}).then(formarGruposAhora));
async function formarGruposAhora() {
  const alumnos = Object.entries(ON.brujula || {}).filter(([uid, b]) => b.pos && !b.parcial && ON.jugadores[uid]).map(([uid, b]) => ({ uid, pos: b.pos, campo: b.campo }));
  if (alumnos.length < 2) return { ok: false, motivo: "Faltan alumnos: se necesitan al menos 2 con la brújula respondida." };
  const { grupos, de } = formarGruposEnK(alumnos, BRUJULA.campos, S.clase.grupos);
  S.clase.gruposInfo = grupos.map(g => ({ n: g.n, campo: g.campo, nombre: (BRUJULA.campos.find(c => c.id === g.campo) || {}).nombre || g.campo,
                                          pos: { x: +g.pos.x.toFixed(2), y: +g.pos.y.toFixed(2) }, tam: g.miembros.length }));
  S.clase.grupos = grupos.length;
  S.clase.brujula.fase = "grupos";
  S.clase.brujula.formadoEn = Date.now();
  // la propuesta del primer debate se arma con los grupos nuevos, no con los de antes
  if (!S.clase.debates.length) S.clase.propuesta = null;
  // quienes no respondieron pero ya estaban en un grupo elegido a mano vuelven a quedar sin grupo
  const sinPos = Object.keys(ON.jugadores).filter(uid => !de[uid]);
  ON.asignando = {};
  const oks = await Promise.all([...Object.entries(de).map(([uid, n]) => window.moverAlumno(uid, n)),
                     ...sinPos.filter(uid => ON.jugadores[uid].grupo > 0).map(uid => window.moverAlumno(uid, 0))]);
  // ON.jugadores NO se toca a mano: lo reescribe el listener con lo que quedó en Firestore, que
  // es lo mismo que ven los teléfonos. Una copia local «optimista» fue la que se desincronizó.
  asignarRezagados();                                    // quienes no terminaron la brújula
  publicar();
  const fallos = oks.filter(x => !x).length;
  return fallos ? { ok: false, motivo: `No se pudo asignar a ${fallos} alumno${fallos === 1 ? "" : "s"}: vuelve a pulsar FORMAR GRUPOS.` } : { ok: true };
}
// Después de formar los grupos: quien no tiene grupo entra al más chico de su campo. Quien llegó
// después de formarlos tiene 90 s para responder la brújula; si no, va al más chico de todos.
function asignarRezagados() {
  if (!S.clase.brujula || S.clase.brujula.fase === "responder" || !S.clase.brujula.activa || !(S.clase.gruposInfo || []).length) return;
  ON.asignando = ON.asignando || {};
  // el tamaño de cada grupo se cuenta en vivo (incluye movimientos a mano y asignaciones en curso)
  const tamDe = n => Object.entries(ON.jugadores || {}).filter(([u, j]) => j.grupo === n || ON.asignando[u] === n).length;
  const antes = S.clase.gruposInfo.map(g => g.tam).join();
  S.clase.gruposInfo.forEach(g => { g.tam = tamDe(g.n); });
  for (const [uid, j] of Object.entries(ON.jugadores || {})) {
    if (j.grupo > 0) { delete ON.asignando[uid]; continue; }
    if (ON.asignando[uid]) continue;
    const b = ON.brujula && ON.brujula[uid];
    const tarde = (j.unido || 0) > (S.clase.brujula.formadoEn || 0);
    if (!(b && b.pos) && tarde && Date.now() - (j.unido || 0) < 90000) continue;
    if (b && b.parcial && Date.now() - (b.t || 0) < 90000) continue;     // está respondiendo: se espera a que termine
    const n = asignarTarde(b && b.pos, b && b.campo, S.clase.gruposInfo);
    if (!n) continue;
    ON.asignando[uid] = n;
    S.clase.gruposInfo.find(g => g.n === n).tam++;
    // si la escritura falla, el próximo repaso (≤ 10 s) lo vuelve a intentar
    window.moverAlumno(uid, n).then(ok => { if (!ok) delete ON.asignando[uid]; });
  }
  if (S.clase.gruposInfo.map(g => g.tam).join() !== antes) publicar();
}
window.repetirBrujula = () => { S.clase.brujula.fase = "repetir"; publicar(); };

/* ---------- clase con personajes: inscripción con cupo (semana 308) ----------
   El cupo lo hace cumplir firestore.rules: salas/{codigo}/cupos/{g} guarda los uid inscritos en el
   personaje g, y el alumno cambia su grupo y su lugar en el cupo en un solo lote (jugar.js). Esta
   pantalla abre y cierra la inscripción, fija el cupo, y mueve a alguien con el mismo lote. */
const cupoRef = g => doc(db, "salas", ON.codigo, "cupos", String(g));
function moverPersonaje(uid, grupo) {
  const antes = (ON.jugadores[uid] && ON.jugadores[uid].grupo) || 0;
  const b = writeBatch(db);
  if (grupo > 0) b.update(cupoRef(grupo), new FieldPath("miembros", uid), true);
  if (antes > 0 && antes !== grupo) b.update(cupoRef(antes), new FieldPath("miembros", uid), deleteField());
  b.set(doc(db, "salas", ON.codigo, "jugadores", uid), { grupo }, { merge: true });
  return b.commit();
}
async function crearCupos() {
  const b = writeBatch(db);
  for (const p of PERS) b.set(cupoRef(p.n), { miembros: {} });
  await b.commit();
}
const cupoValido = n => Math.max(1, Math.min(30, Math.round(+n) || SESION.cupo || 4));
window.abrirInscripcion = cupo => {
  S.clase.cupo = cupoValido(cupo);
  S.clase.inscripcion = "abierta";
  tick(`Inscripción abierta: cupo ${S.clase.cupo} por personaje, por orden de llegada.`);
  publicar(); pintarBarraOnline();
};
window.cerrarInscripcion = () => {
  S.clase.inscripcion = "cerrada";
  tick("Inscripción cerrada: quien llegue ahora entra al personaje con menos gente.");
  publicar(); pintarBarraOnline();
  setTimeout(asignarAtrasados, 800);      // después de que la sala publicó el cierre
};
window.fijarCupo = cupo => {
  S.clase.cupo = cupoValido(cupo);
  tick(`Cupo: ${S.clase.cupo} por personaje.`);
  publicar(); pintarBarraOnline();
};
// Con la inscripción cerrada, quien no tiene personaje entra al que tiene menos gente entre los
// que todavía no debaten (rotacion.js). Uno a la vez por alumno; si falla, el próximo repaso
// (≤ 10 s) lo vuelve a intentar.
function asignarAtrasados() {
  if (!PERS || S.clase.inscripcion !== "cerrada") return;
  ON.asignandoP = ON.asignandoP || {};
  const conteo = conteoPersonajes(ON.jugadores, PERS);
  for (const uid of Object.keys(ON.asignandoP)) if (ON.jugadores[uid] && ON.jugadores[uid].grupo > 0) delete ON.asignandoP[uid];
  for (const n of Object.values(ON.asignandoP)) conteo[n] = (conteo[n] || 0) + 1;
  for (const [uid, j] of Object.entries(ON.jugadores)) {
    if (j.grupo > 0 || ON.asignandoP[uid]) continue;
    const n = personajeParaAtrasado(PERS, conteo, S.clase.debates);
    if (!n) return;
    ON.asignandoP[uid] = n; conteo[n]++;
    window.moverAlumno(uid, n).then(ok => { if (!ok) delete ON.asignandoP[uid]; });
  }
}
window.cerrarRepeticion = () => { S.clase.brujula.fase = "cerrada"; publicar(); };

/* ---------- crear o restaurar la sala ---------- */
async function crearSala() {
  ON.codigo = nuevoCodigo();
  ON.creada = Date.now();
  S.etapa = "portada";                  // toda sala nueva parte en la portada
  S.clase = { grupos: SESION.grupos || ROT.GRUPOS_DEFECTO, tema: SESION.tema, debates: [], propuesta: null, evaluado: 0 };
  // brújula corta: encendida por defecto si la semana la define; el profesor la apaga en la portada
  S.clase.brujula = { activa: typeof BRUJULA !== "undefined", fase: typeof BRUJULA !== "undefined" ? "responder" : null };
  S.clase.gruposInfo = [];
  // con personajes: un grupo por personaje, el cupo que propone la semana y la inscripción sin abrir
  if (PERS) Object.assign(S.clase, { grupos: PERS.length, cupo: SESION.cupo || 4, inscripcion: null });
  S.clase.opciones = { ...OPCIONES_DEFECTO };     // los interruptores del debate en vivo (rotacion.js)
  S.fase = "propuesta";
  await setDoc(doc(db, "salas", ON.codigo), limpio({ ...estadoPublico(), creada: Date.now() }));
  await setDoc(doc(db, "salas", ON.codigo, "privado", "estado"), limpio(estadoPrivado()));
  if (PERS) await crearCupos();
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
  // salas del formato anterior (un solo debate): se ven en el panel, no se dirigen desde aquí
  if (pub.data().modo !== "rotacion") {
    alert(`La sala ${codigo} es del formato anterior (un solo debate). Se puede revisar en MIS PARTIDAS; para jugar, crea una sala nueva.`);
    history.replaceState(null, "", location.pathname); return false;
  }
  if (priv && priv.historial) {
    if (priv.clase) S.clase = { ...S.clase, ...priv.clase };
    S.debate = priv.debate || null; S.tramo = priv.tramo || 0;
    // un debate a medias descartado al terminar la clase ya no está en la lista: no se retoma
    if (S.debate && S.debate.n > S.clase.debates.length) S.debate = null;
    // un tramo abierto vuelve pausado (se reanuda con el botón); una votación, sin reloj. La
    // revelación o la entrada vuelven a la preparación ya revelada: ▶ REANUDAR abre el debate.
    S.fase = ["abierta", "revelando", "entrada"].includes(priv.fase) ? "listo"
      : ["cerrando", "veredictoPublico", "veredictoJueces"].includes(priv.fase) ? "votando"
      : priv.fase || "propuesta";
    S.revelado = ["revelando", "entrada"].includes(priv.fase) ? true : priv.revelado !== false;
    S.ronda = priv.ronda; S.seq = priv.seq || 0; S.shocks = priv.shocks || [];
    S.veredictoRevelado = !!priv.veredictoRevelado;       // si no, al reabrir se «des-revelaría» el campeón
    S.historial = priv.historial; S.turnos = priv.turnos || []; S.votoInicial = priv.votoInicial || S.votoInicial; S.iniPos = priv.iniPos || S.iniPos;
    S.abreEn = null;
    pintarRonda(); pintarMarcador(); pintarFeed();
    $("btnPrincipal").textContent = { propuesta: "PUBLICAR PREGUNTA", listo: "▶ REANUDAR TRAMO", votando: "CERRAR VOTACIÓN",
      resultado: "SEGUIR ▶", fin: "🏆 VER CAMPEÓN" }[S.fase] || "PUBLICAR PREGUNTA";
    if (S.fase === "listo" && !S.revelado) $("btnPrincipal").textContent = "REVELAR ▶";   // se cerró en plena preparación
    if (S.fase === "resultado") S.fase = "propuesta";
    tick(`Sala ${codigo} restaurada: ${S.clase.debates.length} debate${S.clase.debates.length === 1 ? "" : "s"}, ${S.historial.length} intervenciones.`);
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
    // Encendido por defecto: el 22-sep-2026 (sala 42RT) una clase entera corrió con el heurístico
    // porque nadie abrió ⚙ MOTOR, y la moderadora repetía plantillas. Solo queda apagado si el
    // profesor eligió «Usar heurístico» a propósito.
    if (!S.motor.activo && localStorage.getItem("tribuna_motor_eleccion") !== "heuristico") {
      Object.assign(S.motor, { prov: "anthropic", key: "", proxy: false, funcion: true, activo: true, modelo: "claude-sonnet-5", sociedad: false });
      pintarModo(); publicar();
      tick("Motor LLM del servidor de TRIBUNA activado: moderadora, relator y jueces con claude-sonnet-5.");
    } else if (!S.motor.activo) tick("El servidor de TRIBUNA tiene el motor LLM disponible, pero elegiste el heurístico (⚙ MOTOR para cambiarlo).");
  });
  const codigo = (params.get("sala") || "").toUpperCase();
  if (codigo && await restaurar(codigo)) activarOnline();
  else botonCrear();
});
