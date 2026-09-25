/* =====================================================================
   TRIBUNA — el teléfono del alumno.
   Una sola conversación, como un grupo de WhatsApp: A FAVOR a la izquierda, EN CONTRA a la
   derecha, la moderadora (🎙) y el relator (⚖) al centro. Quien debate escribe abajo; si la
   moderadora lo nombra, el teléfono vibra y el mensaje se destaca. El público no escribe en la
   conversación, pero juega (publico.js): mueve el termómetro, reacciona a los mensajes y deja
   una pregunta para la moderadora. Al final vota quién argumentó mejor y predice a los jueces.
   Lee salas/{codigo} (estado del juego) y salas/{codigo}/mensajes (la conversación).
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, where, writeBatch, deleteField, FieldPath } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const $ = id => document.getElementById(id);
// también las comillas: el texto escapado va igual dentro de atributos (data-m="…", data-n="…")
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;

const J = { gente: [], vistaClasica: false, uid: null, email: null, foto: null, fbListo: false, codigo: null, nombre: "", equipo: null, grupo: null, sala: null, chat: [], reloj: null, primera: true };
const google = new GoogleAuthProvider();
const colorRigor = t => t >= 14 ? "var(--neon)" : t >= 9 ? "var(--amber)" : "var(--B)";
const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
let subs = [];

// Clase con personajes (semana 308): la sala publica la lista; sin ella, todo dice «Grupo N».
const PJ = () => (J.sala && J.sala.personajes) || null;
const nomG = n => rotuloGrupo(n, PJ());

// En la rotación el rol cambia en cada debate: "A" o "B" si mi grupo fue llamado, "P" si voto.
// Con revelación, durante la preparación el par todavía no se publica (A y B en null): nadie tiene
// rol, ni siquiera «P», porque cualquiera puede pasar al frente.
const rolEn = s => {
  if (!s || s.modo !== "rotacion") return J.equipo;
  if (!s.debate || !J.grupo || enSuspenso(s)) return null;
  return J.grupo === s.debate.A ? "A" : J.grupo === s.debate.B ? "B" : "P";
};
// La preparación universal: el par (y con personajes, la moción) se conoce recién al revelar.
// Las salas de antes no traen `revelado` ni `opciones`: para ellas nunca hay suspenso.
const enSuspenso = s => !!(s && s.debate && (s.debate.A == null || s.debate.B == null));


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
    if (yo.exists() && yo.data().grupo > 0) {
      J.grupo = yo.data().grupo;
      // si volvió con otro nombre, su ficha se actualiza: el voto debe llevar el mismo nombre que la ficha
      if (yo.data().nombre !== nombre) await setDoc(doc(db, "salas", codigo, "jugadores", J.uid), { nombre, email: J.email }, { merge: true });
      await entrarAlJuego(); return;
    }
    if (!yo.exists()) await setDoc(doc(db, "salas", codigo, "jugadores", J.uid),
      { nombre, email: J.email, foto: J.foto || "", grupo: 0, equipo: "", unido: Date.now() });
    // con brújula, el grupo lo forma el profesor según la posición; sin ella, se elige a mano
    if (J.sala.brujula && J.sala.brujula.activa) {
      await cargarBrujula();
      await entrarAlJuego();
      if (ofrecerBrujula(J.sala.brujula, !!BJ.mio)) mostrarBrujula("inicio");
    } else if (J.sala.personajes) await entrarAlJuego();     // pintarSala muestra los personajes
    else mostrarBancadas();
  } catch (e) { $("errEntrar").textContent = "No se pudo entrar: " + e.message; }
};

function mostrarBancadas() {
  ["pEntrar", "pJuego", "pVivo", "vvVolver", "estado", "caja", "voto", "espera", "fb", "entre"].forEach(id => $(id)?.classList.add("oculto"));
  VV.visible = false;
  $("pBancada").classList.remove("oculto");
  document.body.classList.remove("sube"); document.body.style.removeProperty("--c");
  $("mocion1").textContent = J.sala.temaGeneral || J.sala.tema;
  if (PJ()) { pintarPersonajes(); return; }
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

/* ---------- clase con personajes: elegir con cupo y por orden de llegada ----------
   El cupo lo hace cumplir firestore.rules: me agrego a salas/{codigo}/cupos/{g}, me quito del
   anterior y cambio mi grupo en un solo lote. Si dos tocan el último lugar a la vez, Firestore
   deja pasar a uno y rechaza entero el lote del otro: a ese le decimos «se llenó, elige otro». */
const PER = { cupos: {}, eligiendo: null, aviso: "", cambiando: false };
const cuantosEn = n => (PER.cupos[n] ?? J.gente.filter(g => g.grupo === n).length);
function pintarPersonajes() {
  const s = J.sala, ps = PJ(), cupo = s.cupo || 4, ins = s.inscripcion;
  $("tituloBancada").textContent = J.grupo && PER.cambiando ? "Cambia de personaje" : "Elige tu personaje";
  const abierta = ins === "abierta";
  // el aviso va arriba de la lista: abajo, con seis botones, «se llenó» quedaba fuera de la pantalla
  const aviso = PER.aviso
    || (ins === "cerrada" ? (J.grupo ? "" : "La inscripción se cerró. Te estamos asignando el personaje con menos gente…")
      : !abierta ? "La inscripción se abre en un momento: mira la pantalla del curso."
      : ps.every(p => cuantosEn(p.n) >= cupo) && !J.grupo ? "Todos los personajes están llenos: avísale al profesor para que suba el cupo."
      : `Cupo ${cupo} por personaje, por orden de llegada. Tu grupo debate una vez, en primera persona.`);
  $("grupos").innerHTML = (aviso ? `<p class="${PER.aviso ? "aviso per-error" : "per-nota"}">${esc(aviso)}</p>` : "") + ps.map(p => {
    const n = cuantosEn(p.n), lleno = n >= cupo, mio = J.grupo === p.n;
    const off = !abierta || PER.eligiendo || (lleno && !mio);
    return `<button class="btn per ${lleno ? "lleno" : ""} ${mio ? "mio" : ""}" data-g="${p.n}" style="--c:${p.color || "var(--txt)"}" ${off ? "disabled" : ""}>
      <b>${esc(p.nombre)}</b><small>${esc(p.cargo || "")} · duelo ${p.duelo} · ${p.lado === "A" ? "a favor" : "en contra"}</small>
      <span class="cu">${PER.eligiendo === p.n ? "confirmando…" : mio ? "✓ el tuyo" : lleno ? `lleno · ${n}/${cupo}` : `${n}/${cupo}`}</span></button>`;
  }).join("") + (PER.cambiando && J.grupo ? `<button class="link" id="perVolver">quedarme con ${esc(nomG(J.grupo))}</button>` : "");
  $("avisoBancada").textContent = "";
  $("grupos").onclick = e => {
    if (e.target.id === "perVolver") { PER.cambiando = false; PER.aviso = ""; pintarSala(); return; }
    const b = e.target.closest("button.per"); const g = b && +b.dataset.g;
    if (g && !b.disabled) elegirPersonaje(g);
  };
}
async function elegirPersonaje(g) {
  const antes = J.grupo || 0;
  if (g === antes) { PER.cambiando = false; pintarSala(); return; }
  PER.eligiendo = g; PER.aviso = ""; pintarPersonajes();
  const ref = doc(db, "salas", J.codigo, "cupos", String(g));
  const b = writeBatch(db);
  b.update(ref, new FieldPath("miembros", J.uid), true);
  if (antes > 0) b.update(doc(db, "salas", J.codigo, "cupos", String(antes)), new FieldPath("miembros", J.uid), deleteField());
  b.set(doc(db, "salas", J.codigo, "jugadores", J.uid), { nombre: J.nombre, email: J.email, foto: J.foto || "", grupo: g, equipo: "" }, { merge: true });
  // sin señal la escritura queda pendiente: a los 8 s se avisa (si después entra, entra igual)
  const lento = setTimeout(() => { if (PER.eligiendo === g) { PER.aviso = "Sin conexión: revisa tu señal y vuelve a tocar."; PER.eligiendo = null; pintarPersonajes(); } }, 8000);
  try {
    await b.commit();
    J.grupo = g; PER.cambiando = false;
    navigator.vibrate?.([60, 40, 60]);
  } catch (e) {
    const s = J.sala, p = (PJ() || []).find(x => x.n === g);
    PER.aviso = e.code !== "permission-denied" ? "No se pudo elegir: " + e.code
      : s.inscripcion !== "abierta" ? "La inscripción ya se cerró."
      : `Se llenó ${p ? p.nombre : "ese personaje"}: elige otro.`;
    navigator.vibrate?.(200);
  } finally {
    clearTimeout(lento);
    PER.eligiendo = null;
  }
  pintarSala();
}

/* ---------- jugar ---------- */
async function entrarAlJuego() {
  subs.forEach(u => u()); subs = [];
  $("pEntrar").classList.add("oculto"); $("pBancada").classList.add("oculto");
  $("pJuego").classList.remove("oculto"); $("estado").classList.remove("oculto");
  subs.push(onSnapshot(doc(db, "salas", J.codigo), snap => { J.sala = snap.data(); pintarSala(); }));
  // con personajes: cuántos hay en cada uno (el botón se apaga en todos los teléfonos al llenarse)
  if (J.sala && J.sala.personajes) subs.push(onSnapshot(collection(db, "salas", J.codigo, "cupos"), snap => {
    PER.cupos = {}; snap.forEach(d => { PER.cupos[+d.id] = Object.keys(d.data().miembros || {}).length; });
    pintarSala();
  }, () => {}));
  // quiénes están en la sala: para sugerir nombres al escribir @
  subs.push(onSnapshot(collection(db, "salas", J.codigo, "jugadores"), snap => {
    J.gente = []; snap.forEach(d => J.gente.push({ uid: d.id, nombre: d.data().nombre || "", grupo: d.data().grupo || 0, escribe: d.data().escribe || null, habla: d.data().habla || null }));
    for (const g of J.gente) if (g.escribe && (!ESCR.visto[g.uid] || ESCR.visto[g.uid].t !== g.escribe.t))
      ESCR.visto[g.uid] = { t: g.escribe.t, en: ESCR.primera ? 0 : Date.now() };   // la primera foto trae marcas viejas
    // el habla, igual: visto es cuándo ESTE teléfono vio cambiar el latido (los relojes no coinciden)
    for (const g of J.gente) {
      if (g.habla && (!VV.hablaVisto[g.uid] || VV.hablaVisto[g.uid].t !== g.habla.t))
        VV.hablaVisto[g.uid] = { t: g.habla.t, en: ESCR.primera ? 0 : Date.now() };
      g.visto = g.habla && VV.hablaVisto[g.uid] ? VV.hablaVisto[g.uid].en : 0;
    }
    ESCR.primera = false;
    pintarBarraTel(); pintarEscribiendo(); pintarVivoParcial();
  }));
  // el profesor puede moverme de grupo: el rol y lo que escribo dependen de mi grupo actual
  subs.push(onSnapshot(doc(db, "salas", J.codigo, "jugadores", J.uid), snap => {
    // lo que todavía no confirma el servidor no cuenta: al elegir personaje, el lote puede volver
    // rechazado (se llenó) y el teléfono alcanzaba a mostrar «entraste» antes del rechazo
    if (snap.metadata.hasPendingWrites) return;
    // también cuando vuelve a 0 (el profesor rehízo los grupos): si no, el teléfono seguiría
    // mostrando un grupo que ya no es el suyo
    const g = snap.data()?.grupo || 0;
    if (g !== (J.grupo || 0)) { J.grupo = g || null; J.debateVisto = null; $("espera").dataset.clave = ""; pintarSala(); }
  }));
  subs.push(onSnapshot(query(collection(db, "salas", J.codigo, "mensajes"), orderBy("t")), snap => {
    const antes = new Set(J.chat.map(m => m.id));
    J.chat = []; snap.forEach(d => J.chat.push({ ...d.data(), id: d.id }));
    const nuevos = J.chat.filter(m => !antes.has(m.id));
    if (!J.primera) for (const m of nuevos) VV.llega[m.id] = Date.now();   // «hace 60 s» con el reloj de este teléfono
    pintarChat();
    pintarVivoParcial();
    pintarBarraTel();
    if (J.sala) pintarVotar(J.sala);                  // el resumen del relator llega con la votación ya abierta
    if (!J.primera) avisarNuevos(nuevos);
    J.primera = false;
  }, e => { $("pJuego").innerHTML = `<div class="sep">No se pudo leer la conversación (${esc(e.code)}).</div>`; }));
  prepararCaja();
  if (!PA.listo) { PA.listo = true; prepararPublicoActivo(); }
  cargarBrujula().then(() => pintarSala());
  // ¿ya dejó su feedback en esta sala? (o lo saltó en este teléfono)
  J.fbListo = localStorage.getItem("tribuna_fb_" + J.codigo) === "1";
  if (!J.fbListo) getDoc(doc(db, "salas", J.codigo, "feedback", J.uid))
    .then(d => { if (d.exists()) { J.fbListo = true; pintarSala(); } }).catch(() => {});
  clearInterval(J.reloj); J.reloj = setInterval(pintarReloj, 500);
}

// me nombran con "@" + mi nombre (o mi primer nombre, si no sigue el apellido de otro) o "@Grupo N"
// de mi grupo: la moderadora le habla a los grupos (ritmo.js)
const meNombran = t => { cargarApellidos(J.gente.map(g => g.nombre)); return mencionaA(t, J.nombre, J.grupo, aliasGrupo(J.grupo, PJ())); };

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
    if (m.tipo === "mod" && m.datos && m.datos.tribuna === "pregunta" && m.datos.uid === J.uid) {
      navigator.vibrate?.([80, 50, 80, 50, 200]);
      $("avisoVoto").textContent = "✋ ¡La moderadora eligió tu pregunta! +1 🔮";
      confeti(["#f5b301", "#ffffff", "#a78bfa"], 2500);
    }
    if (m.tipo === "relator" && rolEn(J.sala) === "P") {
      navigator.vibrate?.(150);
      $("voto").classList.add("pide");
      $("avisoVoto").textContent = "📣 El relator resumió el debate. Ya puedes votar y predecir.";
    }
  }
}

function pintarSala() {
  const s = J.sala; if (!s) return;
  bancoMio(s);                                      // anota cuándo llegó esta foto del reloj de ajedrez
  const rol = rolEn(s);
  const colorRol = { A: s.equipos.A.color, B: s.equipos.B.color, P: "#a78bfa" }[rol] || "var(--dim)";
  $("miBancada").textContent = `${J.grupo ? nomG(J.grupo) : PJ() ? "Sin personaje" : "Grupo ?"}${rol === "A" ? ` · ${s.equipos.A.nombre}` : rol === "B" ? ` · ${s.equipos.B.nombre}` : rol === "P" ? " · votas" : ""}${s.oraculoDe && s.oraculoDe[J.uid] ? ` · 🔮 ${s.oraculoDe[J.uid].puntos}` : ""}`;
  $("miBancada").style.color = colorRol; $("miBancada").style.borderColor = colorRol;
  const d = s.debate;
  $("tramoLbl").textContent = d ? `Debate ${d.n}.` : "Rotación.";
  $("pauta").textContent = !d ? "Esperando la primera pregunta."
    : enSuspenso(s) ? (d.pregunta ? `«${d.pregunta}» — todos preparan; al terminar el minuto se revela quién pasa al frente.` : "Todos preparan: al terminar el minuto se revela qué duelo sigue.")
    : `«${d.pregunta}» — ${nomG(d.A)} a favor, ${nomG(d.B)} en contra.`;
  $("marca").innerHTML = "";
  pintarBarraTel();
  const debatiendo = rol === "A" || rol === "B";
  $("caja").classList.toggle("oculto", !debatiendo);
  $("voto").classList.toggle("oculto", rol !== "P" || s.fase !== "abierta");
  pintarPublicoActivo(s, rol);
  document.body.classList.toggle("es-publico", rol === "P" && !s.veredicto);
  // cambio de debate: mi grupo fue llamado → vibra. En suspenso todavía no se sabe (no se marca
  // como visto); en la revelación y la entrada vibra pintarEntre, una vez.
  if (d && !enSuspenso(s) && J.debateVisto !== d.n) {
    J.debateVisto = d.n;
    if (debatiendo && !["revelando", "entrada"].includes(s.fase)) navigator.vibrate?.([120, 60, 120]);
  }
  // el aviso escrito va al abrirse el debate: antes, pintarCaja lo borra (la caja está cerrada)
  if (d && debatiendo && s.fase === "abierta" && J.avisoAbiertaVisto !== d.n) {
    J.avisoAbiertaVisto = d.n;
    $("notaCaja").textContent = `🎙 Tu grupo debate ${s.equipos[rol].nombre}. ¡Adelante!`; $("notaCaja").classList.add("ati");
  }
  // brújula: la repetición del cierre; y si el profesor la apaga, quien no tiene grupo elige a mano
  const bj = s.brujula;
  const accion = accionBrujula(bj, { visible: !$("brujula").classList.contains("oculto"), modo: BJ.modo,
    tieneMio: !!BJ.mio, tieneRepeticion: !!(BJ.mio && BJ.mio.repeticion && !BJ.mio.repeticion.parcial) });
  if (accion === "cerrar") { $("brujula").classList.add("oculto"); $("espera").dataset.clave = ""; }
  if (accion === "repetir") mostrarBrujula("repetir");
  // con personajes: sin personaje (o cambiándolo) se ve la elección, en cualquier etapa; con uno, el juego
  if (PJ()) {
    if (!J.grupo || PER.cambiando) { mostrarBancadas(); return; }
    if (!$("pBancada").classList.contains("oculto")) {
      $("pBancada").classList.add("oculto");
      $("pJuego").classList.remove("oculto"); $("estado").classList.remove("oculto");
      $("espera").dataset.clave = "";
    }
  }
  if (!J.grupo && !$("pBancada").classList.contains("oculto")) {
    if (!(bj && bj.activa)) return;                                             // eligiendo grupo a mano
    // el profesor volvió a encender la brújula: de los botones de grupo a la espera con su campo
    $("pBancada").classList.add("oculto");
    $("pJuego").classList.remove("oculto"); $("estado").classList.remove("oculto");
    $("espera").dataset.clave = "";
  }
  if (!J.grupo && s.etapa === "portada" && !(bj && bj.activa)) { mostrarBancadas(); return; }
  pintarVotar(s);
  pintarEntre(s);
  pintarEspera(s);
  pintarFeedback(s);
  if (s.veredicto && !J.ceremoniaVista && J.fbListo) { J.ceremoniaVista = true; ceremonia(s, s.veredicto); }
  pintarChat(); pintarCaja(); pintarReloj();
  // la vista de siempre que eligió el alumno dura lo que dura el debate
  const claveVista = [d ? d.n : "", rol, J.grupo].join("#");
  if (s.fase === "votando" || J.vistaDe !== claveVista) { J.vistaClasica = false; J.vistaDe = claveVista; }
  pintarVivo(s);
}

function pintarReloj() {
  const s = J.sala; if (!s) return;
  const el = $("reloj");
  pintarEscribiendo();
  pintarBotonHablar(s);                             // el banco llega a cero o termina el punto: el botón se apaga
  if (s.fase === "listo" && s.finPrep) {
    const resta = Math.max(0, Math.ceil((s.finPrep - Date.now()) / 1000));
    el.textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.remove("urgente");
    if ($("prepReloj")) $("prepReloj").textContent = el.textContent;
    $("prepReloj")?.classList.toggle("urgente", resta <= 10);
  } else if (s.fase === "entrada" && s.finEntrada) {
    // lo que queda para caminar al frente
    const resta = Math.max(0, Math.ceil((s.finEntrada - Date.now()) / 1000));
    el.textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.remove("urgente");
    if ($("entReloj")) $("entReloj").textContent = el.textContent;
  } else if (s.fase === "abierta" && s.abreEn) {
    const resta = Math.max(0, s.seg - Math.floor((Date.now() - s.abreEn) / 1000));
    el.textContent = `${String(Math.floor(resta / 60)).padStart(2, "0")}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 20);
  } else if (s.fase === "votando" && s.finVoto) {
    const resta = Math.max(0, Math.ceil((s.finVoto - Date.now()) / 1000));
    el.textContent = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 10);
    if ($("vtReloj")) $("vtReloj").textContent = el.textContent;
  } else {
    el.textContent = ""; el.classList.remove("urgente");
    if ($("prepReloj")) { $("prepReloj").textContent = "…"; $("prepReloj").classList.remove("urgente"); }
  }
}

/* ---------- la conversación ---------- */
function menciones(t) {
  return esc(t).replace(/@([Gg]rupo \d+|[A-Za-zÁÉÍÓÚÑáéíóúñü][\wÁÉÍÓÚÑáéíóúñü.-]*(?:\s[A-ZÁÉÍÓÚÑ][\wáéíóúñü.-]*)?)/g,
    (x, n) => `<b class="mencion ${meNombran("@" + n) ? "yo" : ""}">@${n}</b>`);
}

function burbuja(m, s) {
  const hora = new Date(m.t).toTimeString().slice(0, 5);
  if (m.tipo === "sistema") return `<div class="msg sys">${esc(m.texto)}</div>`;
  if (m.tipo === "noticia") return `<div class="msg mod" style="--c:var(--amber);border-color:var(--amber);background:#1f1508"><div class="who">📰 Última hora<span class="hora">${hora}</span></div><div class="tx">${esc(m.texto)}</div></div>`;
  if (m.tipo === "mod") return `<div class="msg mod ${meNombran(m.texto) && rolEn(J.sala) !== "P" ? "ati" : ""} ${m.datos && m.datos.tribuna ? "trib" : ""}"><div class="who">🎙 Moderadora${m.datos && m.datos.tribuna ? " · ✋ la tribuna" : ""}<span class="hora">${hora}</span></div><div class="tx">${menciones(m.texto)}</div></div>`;
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
  return `<div class="msg ${m.equipo} ${mia ? "mia" : ""}" style="--c:${e.color}"><div class="who">${esc(conGrupo(m.nombre, grupoDeMensaje(m), PJ()))}${mia ? " (tú)" : ""}<span class="hora">${hora}</span></div><div class="tx">${menciones(m.texto)}</div>${reaccionesDe(m, s)}</div>`;
}

/* ---------- el público activo (publico.js) ----------
   Reacciones: el público las pone (una por mensaje: tocar la misma la quita); todos ven cuántas
   hay. Termómetro: −100 (EN CONTRA) … +100 (A FAVOR); en el deslizador A FAVOR queda a la
   izquierda, como en la conversación. Pregunta: una por debate, se puede cambiar. */
const PA = { debate: null, subs: [], conteos: {}, mias: {}, tm: null, tmEnvio: null, preg: null };
function reaccionesDe(m, s) {
  if (!s.debate || m.debate !== s.debate.n) return "";
  const c = PA.conteos[m.id] || {}, mia = PA.mias[m.id];
  if (rolEn(s) === "P" && s.fase === "abierta")
    return `<div class="rx">${PUB.REACCIONES.map(r => `<button class="rxb ${mia === r.id ? "on" : ""}" data-m="${esc(m.id)}" data-r="${r.id}" title="${r.nombre}">${r.emoji}${c[r.id] ? " " + c[r.id] : ""}</button>`).join("")}</div>`;
  const xs = PUB.REACCIONES.filter(r => c[r.id]).map(r => `<span class="rxv">${r.emoji} ${c[r.id]}</span>`);
  return xs.length ? `<div class="rx">${xs.join("")}</div>` : "";
}
function suscribirPublicoActivo(n) {
  if (PA.debate === n) return;
  PA.subs.forEach(u => u()); PA.subs = [];
  Object.assign(PA, { debate: n, conteos: {}, mias: {}, tm: null, preg: null });
  if (!n) return;
  PA.subs.push(onSnapshot(query(collection(db, "salas", J.codigo, "reacciones"), where("debate", "==", n)), snap => {
    const xs = []; PA.mias = {};
    snap.forEach(d => { const x = d.data(); xs.push(x); if (x.uid === J.uid && x.r) PA.mias[x.msg] = x.r; });
    PA.conteos = contarReacciones(xs);
    pintarChat(); pintarVivoParcial();
  }, () => {}));
  // tras recargar: el termómetro y la pregunta vuelven a donde estaban
  getDoc(doc(db, "salas", J.codigo, "termometro", `${n}_${J.uid}`)).then(d => {
    if (d.exists() && PA.debate === n && !PA.tm) { PA.tm = { pos: d.data().pos, pos0: d.data().pos0 }; pintarPublicoActivo(J.sala, rolEn(J.sala)); }
  }).catch(() => {});
  getDoc(doc(db, "salas", J.codigo, "preguntas", `${n}_${J.uid}`)).then(d => {
    if (d.exists() && PA.debate === n && !PA.preg) { PA.preg = d.data().texto; pintarPublicoActivo(J.sala, rolEn(J.sala)); }
  }).catch(() => {});
}
function pintarPublicoActivo(s, rol) {
  const d = s.debate;
  suscribirPublicoActivo(d ? d.n : null);
  if (!d || rol !== "P" || s.fase !== "abierta") return;
  $("tmA").innerHTML = `◀ <span style="color:${s.equipos.A.color}">A FAVOR · ${esc(rotuloCorto(d.A, PJ()))}</span>`;
  $("tmB").innerHTML = `<span style="color:${s.equipos.B.color}">EN CONTRA · ${esc(rotuloCorto(d.B, PJ()))}</span> ▶`;
  const tm = $("tm");
  if (document.activeElement !== tm) tm.value = PA.tm ? -PA.tm.pos : 0;
  tm.classList.toggle("nuevo", !PA.tm);
  const v = PA.tm ? PA.tm.pos : null;
  $("tmVal").textContent = v === null ? "muévelo cuando algo te convenza" : Math.abs(v) < 8 ? "parejo"
    : `${Math.abs(v) >= 60 ? "muy " : ""}${v > 0 ? "a favor" : "en contra"}`;
  $("tmVal").classList.toggle("on", v !== null);
  $("btnPreg").textContent = PA.preg ? "✋ Tu pregunta está en la fila · cambiarla" : "✋ Preguntar al debate";
}
function guardarTermometro() {
  const s = J.sala, d = s && s.debate;
  if (!d || rolEn(s) !== "P" || s.fase !== "abierta") return;
  const pos = -Math.round(+$("tm").value);
  PA.tm = { pos, pos0: PA.tm ? PA.tm.pos0 : pos };
  pintarPublicoActivo(s, "P");
  clearTimeout(PA.tmEnvio);
  PA.tmEnvio = setTimeout(() => setDoc(doc(db, "salas", J.codigo, "termometro", `${d.n}_${J.uid}`),
    { uid: J.uid, debate: d.n, grupo: J.grupo, pos: PA.tm.pos, pos0: PA.tm.pos0, t: Date.now() })
    .catch(e => { $("avisoVoto").textContent = "🌡 No se guardó: " + e.code; }), 600);
}
// Una reacción por mensaje: tocar la misma la quita. La usan la conversación y la vista en vivo.
async function reaccionar(msg, rid) {
  const s = J.sala, d = s && s.debate;
  if (!msg || !d || rolEn(s) !== "P" || s.fase !== "abierta") return;
  const r = PA.mias[msg] === rid ? null : rid;
  PA.mias[msg] = r;                                   // se ve al tiro; el conteo llega del servidor
  navigator.vibrate?.(20);
  pintarChat(); pintarVivoParcial();
  try { await setDoc(doc(db, "salas", J.codigo, "reacciones", `${msg}_${J.uid}`), { uid: J.uid, msg, debate: d.n, r, t: Date.now() }); }
  catch (err) { $("avisoVoto").textContent = "No se guardó la reacción: " + err.code; }
}
function prepararPublicoActivo() {
  $("tm").oninput = guardarTermometro;
  $("pJuego").addEventListener("click", e => {
    const b = e.target.closest("button.rxb");
    if (b) reaccionar(b.dataset.m, b.dataset.r);
  });
  $("btnPreg").onclick = () => {
    $("pregCaja").classList.toggle("oculto");
    if (!$("pregCaja").classList.contains("oculto")) { $("pregTx").value = PA.preg || ""; $("pregTx").focus(); }
  };
  $("pregEnviar").onclick = async () => {
    const s = J.sala, d = s && s.debate, texto = $("pregTx").value.trim().slice(0, PUB.PREGUNTA_MAX);
    if (!texto || !d || rolEn(s) !== "P" || s.fase !== "abierta") return;
    try {
      await setDoc(doc(db, "salas", J.codigo, "preguntas", `${d.n}_${J.uid}`),
        { uid: J.uid, nombre: J.nombre, grupo: J.grupo, debate: d.n, texto, t: Date.now() });
      PA.preg = texto;
      $("pregCaja").classList.add("oculto");
      $("avisoVoto").textContent = "✋ Tu pregunta quedó en la fila. Si la moderadora la elige, la lanza con tu nombre y sumas +1 🔮.";
      pintarPublicoActivo(s, "P");
    } catch (err) { $("avisoVoto").textContent = "No se envió la pregunta: " + err.code; }
  };
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

/* ---------- la barra de participación (barra.js) ----------
   Quien debate ve la barra de su grupo y cuánto le falta a su parte; el público, las dos en chico.
   Se calcula aquí con los mensajes y la lista de la sala, igual que en el proyector. Cada
   celebración va una vez por debate (lo ya celebrado se guarda en este teléfono). */
const JB = { debate: null, antes: {}, hechos: new Set() };
function llenadoTel(d, k) {
  const ints = new Map();
  for (const x of J.gente) if (x.grupo === d[k]) ints.set(claveBarra({ uid: x.uid }), { uid: x.uid, nombre: x.nombre });
  for (const m of J.chat) if (m.tipo === "alumno" && m.debate === d.n && m.equipo === k && !ints.has(claveBarra(m))) ints.set(claveBarra(m), { uid: m.uid, nombre: m.nombre });
  return llenadoGrupo(J.chat.filter(m => m.debate === d.n && m.equipo === k), [...ints.values()]);
}
function pintarBarraTel() {
  const el = $("barraTel"), s = J.sala;
  if (!el) return;
  const d = s && s.debate;
  if (!d || s.etapa != null || !["abierta", "votando"].includes(s.fase)) { el.innerHTML = ""; return; }
  if (JB.debate !== d.n) {
    JB.debate = d.n; JB.antes = {};
    try { JB.hechos = new Set(JSON.parse(localStorage.getItem(`tribuna_barra_${J.codigo}_${d.n}`) || "[]")); } catch { JB.hechos = new Set(); }
  }
  const rol = rolEn(s);
  const barra = (k, r, chica) => `<div class="bt ${chica ? "chica" : ""}" style="--c:${s.equipos[k].color}">
      <div class="bt-cab"><b>${esc(nomG(d[k]))}${chica ? "" : " · tu grupo"}</b>${r.todos ? `<span class="bt-sello">👥 todos</span>` : ""}<span class="bt-pct">${Math.round(r.pct * 100)} %</span></div>
      <div class="bt-barra ${colorBarra(r.pct)}"><i style="width:${Math.round(r.pct * 100)}%"></i></div></div>`;
  if (rol === "A" || rol === "B") {
    const r = llenadoTel(d, rol), mi = r.personas.find(p => p.clave === claveBarra({ uid: J.uid }));
    el.innerHTML = barra(rol, r, false) + `<div class="bt-yo ${mi && mi.pct >= 1 ? "lleno" : ""}">${mi && mi.pct >= 1 ? "✓ ¡Tu parte está llena!"
      : `Tu parte: <b>${mi ? mi.palabras : 0}</b> de ${BARRA.META_PERSONA} palabras`}</div>`;
    celebrarTel(rol, r);
  } else {
    el.innerHTML = `<div class="bt-dos">${barra("A", llenadoTel(d, "A"), true)}${barra("B", llenadoTel(d, "B"), true)}</div>`;
  }
}
function celebrarTel(k, r) {
  const antes = JB.antes[k] || null;
  JB.antes[k] = r;
  const yo = claveBarra({ uid: J.uid });
  for (const h of hitosNuevos(antes, r)) {
    if (h.tipo === "parte" && h.clave !== yo) continue;
    const id = h.tipo + "|" + (h.clave || "");
    if (JB.hechos.has(id)) continue;
    JB.hechos.add(id);
    try { localStorage.setItem(`tribuna_barra_${J.codigo}_${JB.debate}`, JSON.stringify([...JB.hechos])); } catch {}
    if (h.tipo === "parte") {
      navigator.vibrate?.([60, 40, 60]);
      $("notaCaja").textContent = "✓ ¡Tu parte de la barra está llena! Sigue: ayuda a los que faltan.";
      $("notaCaja").classList.add("ati");
      confeti([J.sala.equipos[k].color, "#ffffff"], 1800);
    } else if (h.tipo === "lleno") {
      navigator.vibrate?.([100, 60, 100, 60, 220]);
      confeti([J.sala.equipos[k].color, "#ffffff", "#ffb020"], 3500);
      const c = document.createElement("div");
      c.className = "bt-cartel"; c.style.setProperty("--c", J.sala.equipos[k].color);
      c.textContent = "🎉 ¡Tu grupo llenó la barra!";
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }
}

/* ---------- escribir (bancadas) ---------- */
/* ---------- telemetría de escritura (antitrampa, como en ml2) ----------
   Por mensaje: pegados y su largo, salidas de la app mientras se escribe, inserciones de golpe
   (teclados que no avisan el pegado), cuánto tardó y una huella del largo cada 2 s. Se guarda
   aparte (salas/{codigo}/telemetria), solo lo lee el profesor y nunca entra en un puntaje. */
const TEL = { r: null };
function registroNuevo() {
  return { abre: Date.now(), primera: null, pegados: [], salidas: 0, msFuera: 0, ocultoDesde: null, maxInsercion: 0, largoPrev: 0, huella: [], tipos: new Set() };
}
function registro() { return TEL.r || (TEL.r = registroNuevo()); }
setInterval(() => {
  const tx = $("tx");
  if (!TEL.r || !tx || tx.disabled) return;
  if (TEL.r.huella.length < 300) TEL.r.huella.push(tx.value.length);
}, 2000);
document.addEventListener("visibilitychange", () => {
  const tx = $("tx");
  const escribiendo = tx && !tx.disabled && !$("caja").classList.contains("oculto");
  if (!escribiendo) return;
  const r = registro();
  if (document.hidden) { r.salidas++; r.ocultoDesde = Date.now(); }
  else if (r.ocultoDesde) { r.msFuera += Date.now() - r.ocultoDesde; r.ocultoDesde = null; }
});

function prepararCaja() {
  const tx = $("tx");
  tx.addEventListener("paste", e => {
    const txt = (e.clipboardData && e.clipboardData.getData("text")) || "";
    registro().pegados.push({ ms: Date.now() - registro().abre, chars: txt.length });
  });
  tx.addEventListener("beforeinput", e => { if (e.inputType) registro().tipos.add(e.inputType); });
  tx.addEventListener("input", () => {
    marcarEscribiendo(tx.value.trim() ? Date.now() : 0);
    cortarDictado();                                // empezó a tipear: el dictado termina donde está
    const r = registro(), largo = tx.value.length;
    if (r.primera === null && largo > 0) r.primera = Date.now();
    r.maxInsercion = Math.max(r.maxInsercion, largo - r.largoPrev);
    r.largoPrev = largo;
  });
  tx.oninput = () => { tx.style.height = "auto"; tx.style.height = Math.min(140, tx.scrollHeight) + "px"; pintarCaja(); sugerir(); };
  prepararDictado();
  tx.onclick = tx.onkeyup = sugerir;
  tx.onblur = () => setTimeout(() => { $("sugiere").innerHTML = ""; $("sugiere").classList.remove("on"); }, 200);
  $("btnEnviar").onclick = enviar;
  pintarCaja();
}
/* ---------- «Grupo N está escribiendo…» ----------
   Mientras tecleo, mi ficha de jugador lleva escribe: { debate, t } (una escritura cada 3 s como
   mucho; t = 0 al enviar). Se muestra por grupo y nunca por nombre, y no me cuento a mí: con el
   nombre, los compañeros se quedan esperando a que termine, como en WhatsApp. */
const ESCR = { ultimo: 0, visto: {}, primera: true };
function marcarEscribiendo(t) {
  const s = J.sala, rol = s && rolEn(s);
  if (!s || s.fase !== "abierta" || !s.debate || (rol !== "A" && rol !== "B")) return;
  if (t && Date.now() - ESCR.ultimo < 3000) return;
  if (!t && !ESCR.ultimo) return;                   // nada que limpiar
  ESCR.ultimo = t ? Date.now() : 0;
  setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { escribe: { debate: s.debate.n, t } }, { merge: true }).catch(() => {});
}
function pintarEscribiendo() {
  const el = $("escribiendo"), s = J.sala;
  if (!el || !s) return;
  const d = s.fase === "abierta" && s.debate;
  const xs = J.gente.map(g => ({ uid: g.uid, grupo: g.grupo, debate: g.escribe && g.escribe.debate, t: g.escribe && g.escribe.t,
    visto: ESCR.visto[g.uid] ? ESCR.visto[g.uid].en : 0 }));
  const gs = d ? gruposEscribiendo(xs, { debate: d.n, ahora: Date.now(), yo: J.uid }) : [];
  const html = gs.map(g => { const k = g === d.A ? "A" : "B";
    return `<span style="color:${s.equipos[k].color}">✍ ${esc(nomG(g))} está escribiendo<i>…</i></span>`; }).join("");
  if (el.innerHTML !== html) el.innerHTML = html;
}

/* ---------- @menciones: al escribir @ se sugieren nombres de la sala ----------
   Primero los del debate en curso (a quienes tiene sentido responder), después el resto.
   Se inserta nombre y primer apellido: así la mención se destaca entera y la persona la recibe. */
const corto = n => String(n || "").trim().split(/\s+/).slice(0, 2).join(" ");
// El grupo de quien escribió: viene en el mensaje, o se deduce del lado que le tocó en ese debate.
function grupoDeMensaje(m) {
  if (m.grupo) return m.grupo;
  const d = J.sala && (J.sala.debates || []).find(x => x.n === m.debate);
  return d && (m.equipo === "A" || m.equipo === "B") ? d[m.equipo] : 0;
}
function sugerir() {
  const tx = $("tx"), caja = $("sugiere");
  const antes = tx.value.slice(0, tx.selectionStart ?? tx.value.length);
  const m = antes.match(/(^|\s)@([^\s@]{0,20})$/);
  if (!m || tx.disabled) { caja.innerHTML = ""; caja.classList.remove("on"); return; }
  const q = norm(m[2]), d = J.sala && J.sala.debate;
  // la gente de la sala, más quienes escribieron en la conversación (por si alguien no tiene ficha)
  const por = new Map();
  for (const g of J.gente) if (g.nombre && g.uid !== J.uid) por.set(norm(g.nombre), { nombre: g.nombre, grupo: g.grupo });
  for (const x of J.chat) if (x.tipo === "alumno" && x.nombre && x.uid !== J.uid && !por.has(norm(x.nombre))) por.set(norm(x.nombre), { nombre: x.nombre, grupo: grupoDeMensaje(x) });
  const enDebate = g => d && (g.grupo === d.A || g.grupo === d.B);
  const lado = g => !d ? "" : g.grupo === d.A ? "A FAVOR" : g.grupo === d.B ? "EN CONTRA" : "";
  const color = g => !d ? "#6b7a8a" : g.grupo === d.A ? J.sala.equipos.A.color : g.grupo === d.B ? J.sala.equipos.B.color : "#6b7a8a";
  // la moderadora siempre se puede mencionar: si le escribes, te responde
  const lista = [{ nombre: "Moderadora", grupo: 0, mod: true }, ...por.values()]
    .filter(g => !q || norm(g.nombre).split(/\s+/).some(w => w.startsWith(q)))
    .sort((a, b) => ((b.mod ? 2 : 0) + enDebate(b)) - ((a.mod ? 2 : 0) + enDebate(a)) || a.nombre.localeCompare(b.nombre))
    .slice(0, 8);
  caja.classList.add("on");
  caja.innerHTML = lista.length ? lista.map(g => `<button type="button" class="sg" data-n="${esc(corto(g.nombre))}">
      <span class="sg-av" style="--c:${g.mod ? "#b4a6ff" : color(g)}">${g.mod ? "🎙" : iniciales(g.nombre)}</span>
      <span class="sg-n">${esc(g.nombre)}<small>${g.mod ? "moderadora de IA · te responde" : (g.grupo ? (PJ() ? rotuloCorto(g.grupo, PJ()) : "grupo " + g.grupo) : "") + (lado(g) ? " · " + lado(g) : "")}</small></span></button>`).join("")
    : `<div class="sg-vacio">Nadie se llama así en la sala.</div>`;
  // pointerdown (no click): así el teclado no se cierra antes de elegir
  caja.onpointerdown = e => {
    const b = e.target.closest("button.sg"); if (!b) return;
    e.preventDefault();
    const ini = antes.length - m[2].length - 1;              // dónde está la @
    const resto = tx.value.slice(antes.length);
    tx.value = tx.value.slice(0, ini) + "@" + b.dataset.n + " " + resto;
    const pos = ini + b.dataset.n.length + 2;
    tx.focus(); tx.setSelectionRange(pos, pos);
    caja.innerHTML = ""; caja.classList.remove("on"); pintarCaja();
  };
}

function pintarCaja() {
  if (!J.sala) return;
  const abierta = J.sala.fase === "abierta" && (rolEn(J.sala) === "A" || rolEn(J.sala) === "B");
  $("tx").disabled = !abierta;
  $("tx").placeholder = abierta ? "Escribe a la conversación…" : "La conversación se abre cuando el profesor abra el tramo.";
  if ($("btnMic")) $("btnMic").disabled = !abierta;
  if (!abierta) cortarDictado();
  if (!abierta && HABLA.apretado) soltarHablar({ enviar: false });   // se cerró el tramo mientras hablaba: no se envía
  $("btnEnviar").disabled = !abierta || !$("tx").value.trim();
  if (!abierta) { $("notaCaja").textContent = ""; $("notaCaja").classList.remove("ati"); }
}
// Publica un mensaje del alumno y su telemetría. Lo usan la caja (teclado o dictado) y el botón de
// mantener para hablar (voz: true, se ve con 🎤). Lo hablado no pasa por la caja: su telemetría no
// toca el registro de lo que se está tecleando y cuenta entero como dictado. desde: cuándo empezó
// a hablar. Devuelve false si el tramo ya no está abierto; si Firestore rechaza, lanza el error.
async function enviarTexto(texto, { voz = false, desde = 0 } = {}) {
  texto = String(texto || "").trim().slice(0, 1500);
  if (!texto || !J.sala || J.sala.fase !== "abierta" || !J.sala.debate) return false;
  const id = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  await setDoc(doc(db, "salas", J.codigo, "mensajes", id),
    { tipo: "alumno", uid: J.uid, nombre: J.nombre, email: J.email, grupo: J.grupo, equipo: rolEn(J.sala),
      debate: J.sala.debate.n, tramo: J.sala.tramo, ronda: J.sala.ronda, texto, t: Date.now(), ...(voz ? { voz: true } : {}) });
  // la telemetría del mensaje va aparte y solo la lee el profesor; si falla, el mensaje igual salió
  const ahora = Date.now();
  const r = voz ? { ...registroNuevo(), primera: desde || ahora, dictado: texto.length } : registro();
  setDoc(doc(db, "salas", J.codigo, "telemetria", id), {
    uid: J.uid, nombre: J.nombre, grupo: J.grupo, debate: J.sala.debate.n, msg: id, t: ahora,
    largoFinal: texto.length, msComposicion: r.primera ? ahora - r.primera : 0,
    pegados: r.pegados.slice(0, 30), maxInsercion: r.maxInsercion,
    salidas: r.salidas, msFuera: r.msFuera + (r.ocultoDesde ? ahora - r.ocultoDesde : 0),
    huella: r.huella, tipos: [...r.tipos].slice(0, 12), dictado: Math.min(r.dictado || 0, texto.length), ...(voz ? { voz: true } : {})
  }).catch(() => {});
  if (!voz) TEL.r = null;
  return true;
}
async function enviar() {
  cortarDictado();                                  // si envía hablando, va lo que se ve en la caja
  const texto = $("tx").value.trim();
  if (!texto || !J.sala || J.sala.fase !== "abierta") return;
  $("btnEnviar").disabled = true;
  try {
    if (await enviarTexto(texto)) {
      marcarEscribiendo(0);
      $("tx").value = ""; $("tx").style.height = "auto"; $("sugiere").innerHTML = "";
      $("notaCaja").textContent = ""; $("notaCaja").classList.remove("ati");
      $("pJuego").scrollTop = $("pJuego").scrollHeight;
    }
  } catch (e) { $("notaCaja").textContent = "No se envió: " + e.code; }
  pintarCaja();
}

/* ---------- dictado por voz (botón 🎤) ----------
   El reconocimiento de voz del propio navegador (Chrome en Android, Safari en iPhone) escribe en
   la caja; el alumno revisa y envía. Gratis y sin servidor. En la telemetría queda aparte
   («dictado»): el texto dictado entra de a frases enteras y no debe leerse como pegado. Como el
   texto se pone por código (sin evento input), no mueve maxInsercion; por eso largoPrev se
   actualiza a mano después de cada frase. */
const Reconocedor = window.SpeechRecognition || window.webkitSpeechRecognition;
const VOZ = { rec: null, base: "", final: "" };
function prepararDictado() {
  const b = $("btnMic");
  if (!b) return;
  if (!Reconocedor) { b.remove(); return; }     // navegador sin reconocimiento de voz: no se ofrece
  b.classList.remove("oculto");
  b.onclick = () => (VOZ.rec ? VOZ.rec.stop() : empezarDictado());
}
function ponerTexto(valor) {
  const tx = $("tx");
  tx.value = valor.slice(0, 1500);
  registro().largoPrev = tx.value.length;
  tx.style.height = "auto"; tx.style.height = Math.min(140, tx.scrollHeight) + "px";
  pintarCaja();
}
function empezarDictado() {
  const tx = $("tx");
  if (tx.disabled || HABLA.apretado || HABLA.toma) return;   // un solo micrófono: mientras habla (o su toma aún se envía), no se dicta
  const rec = new Reconocedor();
  rec.lang = "es-CL"; rec.continuous = true; rec.interimResults = true;
  VOZ.rec = rec; VOZ.final = "";
  VOZ.base = tx.value && !/\s$/.test(tx.value) ? tx.value + " " : tx.value;
  const r = registro();
  if (r.primera === null) r.primera = Date.now();
  rec.onresult = e => {
    let interino = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) VOZ.final += e.results[i][0].transcript;
      else interino += e.results[i][0].transcript;
    }
    ponerTexto(VOZ.base + VOZ.final + interino);
  };
  rec.onerror = e => {
    $("notaCaja").textContent = e.error === "not-allowed" || e.error === "service-not-allowed"
      ? "🎤 Para dictar, permite el micrófono en el navegador." : e.error === "no-speech" ? "🎤 No te escuché. Aprieta de nuevo y habla." : "🎤 No se pudo dictar: " + e.error;
  };
  rec.onend = () => cortarDictado(false);
  try { rec.start(); } catch { VOZ.rec = null; return; }
  $("btnMic").classList.add("on");
  $("notaCaja").textContent = "🎤 Te escucho… aprieta de nuevo para terminar. Revisa el texto antes de enviar.";
}
// Termina el dictado y anota en la telemetría cuánto se dictó. Si terminó solo, queda en la caja
// lo reconocido en firme; si se corta (envía, tipea o se cierra el tramo), queda lo que se ve.
function cortarDictado(abortar = true) {
  if (!VOZ.rec) return;
  const rec = VOZ.rec;
  VOZ.rec = null;
  rec.onend = null; rec.onresult = null; rec.onerror = null;
  if (abortar) try { rec.abort(); } catch {}
  else if ($("tx").value !== VOZ.base + VOZ.final) ponerTexto(VOZ.base + VOZ.final);
  registro().dictado = (registro().dictado || 0) + Math.max(0, $("tx").value.length - VOZ.base.length);
  VOZ.final = "";
  $("btnMic")?.classList.remove("on");
}

/* ---------- mantener para hablar (viva voz) ----------
   Quien debate al frente aprieta el botón, habla con el teléfono cerca de la boca y suelta: al
   soltar, lo dicho entra solo a la conversación con voz: true (🎤), sin revisar antes, porque
   tiene que sentirse en vivo. Solo transcribe el teléfono que se está apretando: así los teléfonos
   de la sala no se transcriben entre ellos. Mientras aprieta, su ficha lleva
   habla: { debate, t0, t, texto } (una escritura cada 800 ms como mucho: el límite sostenido de
   Firestore por documento es una por segundo); con eso el proyector pone los subtítulos y corre el
   reloj de ajedrez de su lado. Al soltar, habla: null. Cada apretón es una «toma» con su propio
   reconocedor y su propio texto: si vuelve a apretar mientras la anterior todavía espera el
   resultado final, las dos no se mezclan. */
const HABLA = { apretado: false, toma: null, pointerId: null, ultimoLatido: 0, timer: null, CADA: 800, MAX: 60000, ESPERA: 1200 };
const palabras = t => (String(t || "").match(/\S+/g) || []).length;
// junta dos trozos reconocidos: después de reiniciar el reconocedor, el primer trozo no trae espacio
const unir = (a, b) => !a ? b || "" : !b ? a : /\s$/.test(a) || /^\s/.test(b) ? a + b : a + " " + b;
const textoToma = h => unir(h.final, h.interino).replace(/\s+/g, " ").trim();
const miLado = s => { const r = s && rolEn(s); return r === "A" || r === "B" ? r : null; };

// El banco que publica el proyector, contado hacia atrás aquí. La hora de la foto es cuando ESTE
// teléfono la recibió (no el reloj del proyector): cada foto nueva de la sala trae otro objeto
// banco, así que basta compararlo con el último visto. pintarSala la llama en cada foto.
function bancoMio(s) {
  if (!s || !s.banco) { J.bancoDe = null; J.bancoFoto = null; return null; }
  if (J.bancoDe !== s.banco) { J.bancoDe = s.banco; J.bancoFoto = { ...s.banco, t: Date.now() }; }
  return bancoRestante(J.bancoFoto, Date.now());
}
// Sin reloj (apagado, o un proyector que no publica banco) nadie se queda sin tiempo.
function sinTiempo(s) {
  const lado = miLado(s);
  if (!lado || !opcionActiva(s.opciones, "reloj")) return false;
  const r = bancoMio(s);
  return !!r && r[lado] <= 0;
}
// Con un punto de información aceptado para mí, tengo la palabra aunque a mi lado no le quede
// tiempo. No se compara `fin` con el reloj de este teléfono: el proyector publica cuándo termina.
const hablaPorPunto = s => !!(s && s.punto && s.punto.estado === "aceptado" && s.punto.de === J.uid);

// Un integrante del lado que recibe un punto aceptado no queda bloqueado: decide su banco.
function puedoHablar(s) {
  if (!s || !Reconocedor || !opcionActiva(s.opciones, "voz") || s.fase !== "abierta" || !s.debate || !miLado(s)) return false;
  return !sinTiempo(s) || hablaPorPunto(s);
}

function avisoHabla(txt) { const m = $("miHabla"); if (m) { m.textContent = txt; m.classList.toggle("aviso", !!txt); } }
function pintarMiHabla(txt) { const m = $("miHabla"); if (m) { m.textContent = txt; m.classList.remove("aviso"); } }

// Un reconocedor para la toma h. Chrome corta solo tras unos segundos de silencio: si el botón
// sigue apretado se abre otro y el texto sigue sumando en la misma toma.
function escuchar(h) {
  const rec = new Reconocedor();
  rec.lang = "es-CL"; rec.continuous = true; rec.interimResults = true;
  rec.onresult = e => {
    let interino = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) h.final = unir(h.final, e.results[i][0].transcript);
      else interino += e.results[i][0].transcript;
    }
    h.interino = interino;
    if (HABLA.toma === h) { pintarMiHabla(textoToma(h)); latido(); }
  };
  rec.onerror = e => {
    if (HABLA.toma !== h) return;
    if (e.error === "not-allowed" || e.error === "service-not-allowed") {
      // si ya había oído algo (el rechazo llegó al reabrir el reconocedor), lo dicho no se pierde
      const primera = !h.final && !h.interino;
      if (primera) {
        J.micListo = false;
        try { localStorage.removeItem("tribuna_mic_ok"); } catch {}
      }
      soltarHablar({ enviar: !primera, aviso: "🎤 Permite el micrófono para este sitio (candado de la barra de direcciones) y vuelve a apretar." });
    } else if (e.error === "audio-capture") soltarHablar({ aviso: "🎤 No encontramos el micrófono de este teléfono: escribe tu mensaje abajo." });
    else if (e.error === "network") soltarHablar({ aviso: "🎤 Sin conexión para reconocer la voz: escribe tu mensaje abajo." });
    // no-speech y aborted no son fallas: si sigue apretado, onend abre otro reconocedor
  };
  rec.onend = () => {
    if (h.rec !== rec) return;                      // un reconocedor ya reemplazado o soltado
    // lo que quedó como interino es lo último que se oyó: pasa a firme, o el próximo reconocedor lo pisa
    if (h.interino) { h.final = unir(h.final, h.interino); h.interino = ""; }
    if (h.corte) cortarToma(h);                     // el corte de los 60 s esperaba este final
    if (h.alTerminar) { h.alTerminar(); return; }   // soltó: la toma esperaba este final para enviar
    if (!HABLA.apretado || HABLA.toma !== h) return;
    // un micrófono que se cierra apenas se abre no se reintenta sin fin
    h.fallas = Date.now() - h.inicio < 500 ? h.fallas + 1 : 0;
    if (h.fallas >= 4) { soltarHablar({ aviso: "🎤 El micrófono no responde: escribe tu mensaje abajo." }); return; }
    try { escuchar(h); } catch { soltarHablar({ aviso: "🎤 Se cortó el micrófono. Vuelve a apretar." }); }
  };
  h.rec = rec; h.inicio = Date.now();
  rec.start();
  return rec;
}

// A los 60 s de una toma, lo dicho se envía y se sigue escuchando si el botón sigue apretado.
function cortarToma(h) {
  const texto = textoToma(h), desde = h.t0;
  Object.assign(h, { final: "", interino: "", t0: Date.now(), corte: 0 });
  if (palabras(texto) >= 2) mandarVoz(texto, desde).then(err => err && avisoHabla(err));
}
// Devuelve el aviso de error, o "" si salió.
async function mandarVoz(texto, desde) {
  try { await enviarTexto(texto, { voz: true, desde }); return ""; }
  catch (e) { return `🎤 No se envió lo que dijiste (${e.code || e.message}): «${texto.slice(0, 140)}${texto.length > 140 ? "…" : ""}»`; }
}

function latido(forzar = false) {
  const h = HABLA.toma;
  if (!HABLA.apretado || !h || !J.codigo || !J.uid) return;
  const ahora = Date.now();
  if (!forzar && ahora - HABLA.ultimoLatido < HABLA.CADA) return;
  HABLA.ultimoLatido = ahora;
  setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid),
    { habla: { debate: h.debate, t0: h.t0, t: ahora, texto: textoToma(h).slice(-300) } }, { merge: true }).catch(() => {});
}

// Cada 200 ms mientras aprieta: el latido aunque no llegue texto (así el proyector sabe que sigue
// hablando en un silencio), el corte de los 60 s y lo que obliga a soltar.
function tickHabla() {
  const h = HABLA.toma, s = J.sala;
  if (!HABLA.apretado || !h) return;
  // se cerró el tramo (o cambió el debate, o ya no está en un lado): se descarta, no se envía
  if (!s || s.fase !== "abierta" || !s.debate || s.debate.n !== h.debate || !miLado(s)) { soltarHablar({ enviar: false }); return; }
  // se le acabó el tiempo a su lado, o terminó su punto de información: lo dicho hasta ahí sale
  // sin tiempo: sale ya con lo que hay (sin esperar el final), antes de que el proyector cierre el tramo
  if (!puedoHablar(s)) {
    const agotado = sinTiempo(s);
    soltarHablar({ aviso: agotado ? "⏱ Tu lado se quedó sin tiempo: solo puedes escribir." : "", inmediato: agotado });
    return;
  }
  const ahora = Date.now();
  if (!h.corte && ahora - h.t0 >= HABLA.MAX) {
    h.corte = ahora;
    try { h.rec.stop(); } catch { cortarToma(h); }
  } else if (h.corte && ahora - h.corte > HABLA.ESPERA) {
    // el reconocedor no terminó a tiempo: se corta igual con lo que hay y se abre otro
    const viejo = h.rec; h.rec = null;
    if (viejo) { viejo.onresult = viejo.onend = viejo.onerror = null; try { viejo.abort(); } catch {} }
    cortarToma(h);
    try { escuchar(h); } catch { soltarHablar({ aviso: "🎤 Se cortó el micrófono. Vuelve a apretar." }); return; }
  }
  latido();
}

function empezarHablar(e) {
  if (e) { e.preventDefault(); if (e.button > 0) return; }
  if (HABLA.apretado) return;
  const s = J.sala;
  if (!puedoHablar(s)) {
    avisoHabla(s && sinTiempo(s) ? "⏱ Tu lado se quedó sin tiempo: solo puedes escribir." : "Podrás hablar cuando se abra el tramo.");
    return;
  }
  cortarDictado();                                  // un solo micrófono: el dictado de la caja termina
  const h = { rec: null, final: "", interino: "", t0: Date.now(), debate: s.debate.n, corte: 0, fallas: 0, inicio: 0, alTerminar: null };
  try { escuchar(h); } catch { avisoHabla("🎤 No se pudo abrir el micrófono. Vuelve a apretar."); return; }
  try { e && e.currentTarget && e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  Object.assign(HABLA, { apretado: true, toma: h, ultimoLatido: 0, pointerId: e ? e.pointerId : null });
  navigator.vibrate?.(20);
  pintarMiHabla("");
  latido(true);
  clearInterval(HABLA.timer); HABLA.timer = setInterval(tickHabla, 200);
  pintarBotonHablar(s);
}

// Al soltar (o si el teléfono se oculta): espera el resultado final (1,2 s como mucho) y, si dijo
// al menos dos palabras, lo envía. enviar: false descarta (se cerró el tramo, no dio permiso);
// inmediato: envía ya lo que hay, sin esperar el final (se acabó el tiempo de su lado).
async function soltarHablar({ enviar = true, aviso = "", inmediato = false } = {}) {
  if (!HABLA.apretado) return;
  const h = HABLA.toma, rec = h.rec;
  HABLA.apretado = false;
  clearInterval(HABLA.timer); HABLA.timer = null;
  pintarBotonHablar(J.sala);
  if (enviar && rec && !inmediato) {
    await new Promise(listo => {
      const plazo = setTimeout(listo, HABLA.ESPERA);
      h.alTerminar = () => { clearTimeout(plazo); listo(); };
      try { rec.stop(); } catch { h.alTerminar(); }
    });
  }
  h.rec = null;
  if (rec) { rec.onresult = rec.onend = rec.onerror = null; try { rec.abort(); } catch {} }
  let error = "";
  if (enviar) {
    const s = J.sala, texto = textoToma(h);
    const vigente = s && s.fase === "abierta" && s.debate && s.debate.n === h.debate;
    if (vigente && palabras(texto) >= 2) error = await mandarVoz(texto, h.t0);
    else if (vigente && !aviso && !texto) aviso = "🎤 No te escuché: mantén apretado mientras hablas.";
    else if (vigente && !aviso) aviso = "🎤 Muy corto: di al menos dos palabras.";
  }
  if (HABLA.apretado) { if (error) avisoHabla(error); return; }   // ya volvió a apretar: la toma nueva manda, pero el error se ve
  setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { habla: null }, { merge: true }).catch(() => {});
  if (HABLA.toma === h) HABLA.toma = null;
  avisoHabla(error || aviso);
}
document.addEventListener("visibilitychange", () => { if (document.hidden && HABLA.apretado) soltarHablar(); });
// Red de seguridad: si el botón salió del documento o perdió la captura sin avisarle, el dedo que
// apretó igual suelta al levantarse en cualquier parte. El micrófono nunca queda abierto a ciegas.
for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
  document.addEventListener(ev, e => { if (HABLA.apretado && e.pointerId === HABLA.pointerId) soltarHablar(); }, true);
// si cierra la pestaña hablando, lo mejor posible: que el proyector no se quede con sus subtítulos
window.addEventListener("pagehide", () => {
  if (HABLA.toma && J.codigo && J.uid) setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { habla: null }, { merge: true }).catch(() => {});
});

// El botón y lo que voy diciendo, dentro de `contenedor` (el centro de la vista en vivo). Si ya
// existen, se mueven ahí; mientras se aprieta no se tocan, para
// no perder la captura del dedo. Sin reconocimiento de voz no hay botón: queda el teclado.
function montarBotonHablar(contenedor) {
  if (!contenedor || !Reconocedor) return null;
  let b = $("btnHablar");
  if (!b) {
    b = document.createElement("button");
    b.type = "button"; b.id = "btnHablar"; b.className = "hablar"; b.innerHTML = "MANTÉN<br>PARA HABLAR";
    b.addEventListener("pointerdown", empezarHablar);
    // solo suelta el dedo que apretó (un segundo dedo que se levanta no corta la toma)
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(ev, e => { if (e.pointerId === HABLA.pointerId) soltarHablar(); });
    b.addEventListener("contextmenu", e => e.preventDefault());   // apretar largo no abre menús
  }
  let m = $("miHabla");
  if (!m) { m = document.createElement("div"); m.id = "miHabla"; m.className = "mi-habla"; m.setAttribute("aria-live", "polite"); }
  if (!HABLA.apretado) {
    if (b.parentNode !== contenedor) contenedor.appendChild(b);
    if (m.parentNode !== contenedor) contenedor.appendChild(m);
  }
  pintarBotonHablar(J.sala);
  return b;
}

function pintarBotonHablar(s) {
  const b = $("btnHablar");
  if (!b || !s) return;
  const puede = puedoHablar(s), agotado = s.fase === "abierta" && sinTiempo(s);
  const estado = HABLA.apretado ? "apretado" : puede ? (agotado ? "punto" : "listo") : agotado ? "agotado" : "cerrado";
  if (b.dataset.estado === estado) return;
  b.dataset.estado = estado;
  b.disabled = !HABLA.apretado && !puede;
  b.classList.toggle("on", HABLA.apretado);
  b.innerHTML = { apretado: "TE ESCUCHO<br><small>suelta para enviar</small>", punto: "TIENES LA PALABRA<br><small>mantén para hablar</small>",
    agotado: "SIN TIEMPO<br><small>solo puedes escribir</small>" }[estado] || "MANTÉN<br>PARA HABLAR";
  b.setAttribute("aria-label", { apretado: "Te escucho: suelta para enviar", agotado: "Sin tiempo: solo puedes escribir" }[estado] || "Mantén apretado para hablar");
}

/* ---------- la vista en vivo (viva voz, con el debate abierto) ----------
   Con la voz encendida el teléfono deja de ser un chat. Quien debate ve su reloj, el botón de
   hablar enorme y lo que le toca atender (la moderadora que lo nombra, un punto de información);
   el público ve lo que se está diciendo ahora, en grande, y reacciona a eso. «⌨ escribir» y «ver
   conversación» vuelven a la vista de siempre (J.vistaClasica) y la franja «🎙 volver al vivo» la
   deshace. El armazón se arma una vez por debate y rol; cada 300 ms se repinta solo lo que cambia
   (reloj, subtítulos, punto), porque el botón de hablar no se puede rehacer mientras se aprieta:
   perdería la captura del dedo. Quien debate sin reconocimiento de voz (algunos iPhone) se queda
   con la vista de siempre: sin botón, lo suyo es el teclado. */
const VV = { visible: false, clave: "", debate: null, llega: {}, hablaVisto: {}, pedido: null, enfria: 0, ladoVisto: null,
  respondido: null, avisado: null, palabra: null, aviso: null, modClave: "", modLista: [], rxClave: "", medir: false };
const mmss = ms => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
const ladoDe = (g, d) => (g === d.A ? "A" : g === d.B ? "B" : null);
// Los acentos van con el color del lado (el mismo del chip de la cabecera, la conversación y el
// termómetro); el del personaje, solo como un punto junto a su nombre.
const colorLado = (k, s) => (k && s.equipos[k] ? s.equipos[k].color : "var(--dim)");
const puntoPj = g => { const p = personajeDe(g, PJ()); return p && p.color ? `<i class="vv-pj" style="--p:${p.color}"></i>` : ""; };
// el final de un texto largo (el subtítulo muestra lo último que se dijo)
const cola = (t, n) => { t = String(t || "").trim(); return t.length > n ? "…" + t.slice(-n).replace(/^\S*\s/, "") : t; };
// innerHTML solo si cambió: un botón rehecho entre el pointerdown y el pointerup pierde el toque
const poner = (el, html) => { if (!el || el._h === html) return false; el._h = html; el.innerHTML = html; return true; };
const texto = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
addEventListener("resize", () => { VV.medir = true; });

function tocaVivo(s) {
  if (!s || s.etapa != null || !opcionActiva(s.opciones, "voz") || s.fase !== "abierta" || !s.debate || enSuspenso(s)) return false;
  const rol = rolEn(s);
  return rol === "P" || ((rol === "A" || rol === "B") && !!Reconocedor);
}
// Quienes hablan ahora (sin contarme): ficha con habla de este debate y un latido que este
// teléfono vio llegar hace menos de AJ.LATIDO (un teléfono que se apagó a mitad cuenta como callado).
function quienesHablan(s) {
  const d = s.debate, ahora = Date.now();
  return J.gente.filter(g => g.uid !== J.uid && g.habla && g.habla.debate === d.n && g.visto
    && ahora - g.visto <= AJ.LATIDO && ladoDe(g.grupo, d));
}
// El reloj de un lado: el banco (contado aquí desde la última foto) o, sin reloj de ajedrez, el tramo.
function relojVivo(s) {
  const banco = opcionActiva(s.opciones, "reloj") ? bancoMio(s) : null;
  const corre = k => !!(banco && J.bancoFoto && J.bancoFoto.corre && J.bancoFoto.corre[k] && banco[k] > 0);
  const tramo = s.abreEn ? s.seg * 1000 - (Date.now() - s.abreEn) : null;
  return { banco, corre, tramo };
}

function pintarVivo(s) {
  // lo del punto (pedido, enfriamiento, respuesta, avisos) es de un debate: no pasa al siguiente
  const n = s && s.debate ? s.debate.n : null;
  if (VV.debate !== n) { VV.debate = n; Object.assign(VV, { pedido: null, enfria: 0, aviso: null, respondido: null }); }
  const ver = tocaVivo(s) && !J.vistaClasica;
  const volver = $("vvVolver");
  volver.classList.toggle("oculto", !(tocaVivo(s) && J.vistaClasica));
  if (!volver.classList.contains("oculto")) {
    const lado = miLado(s);
    volver.style.setProperty("--c", lado ? colorLado(lado, s) : "#a78bfa");
  }
  $("pVivo").classList.toggle("oculto", !ver);
  document.body.classList.toggle("en-vivo", ver);
  // con el banco a la vista, el reloj del tramo de la cabecera confunde (el tramo lo cierran los bancos)
  document.body.classList.toggle("vv-banco", ver && !!s.banco && opcionActiva(s.opciones, "reloj"));
  if (ver) ["pJuego", "estado", "caja"].forEach(id => $(id).classList.add("oculto"));
  else if (VV.visible) { $("pJuego").classList.remove("oculto"); $("estado").classList.remove("oculto"); }   // solo si los escondí yo
  VV.visible = ver;
  if (!ver) return;
  const rol = rolEn(s), d = s.debate;
  const clave = [rol, d.n, d.A, d.B, J.grupo, (PJ() || []).length].join("#");
  if (VV.clave !== clave) { VV.clave = clave; armarVivo(s, rol); }
  pintarVivoParcial();
}

function armarVivo(s, rol) {
  const el = $("pVivo"), d = s.debate;
  // Cambió el rol, el debate o el grupo: si estaba hablando, se suelta sin enviar (sacar el botón
  // del documento le quita la captura del dedo y el micrófono quedaría abierto sin botón a la vista).
  if (HABLA.apretado) soltarHablar({ enviar: false });
  // el botón y lo que voy diciendo se sacan antes del innerHTML (si no, se destruyen) y se vuelven a montar
  for (const id of ["btnHablar", "miHabla"]) { const x = $(id); if (x && el.contains(x)) x.remove(); }
  const pie = b => `<div class="vv-pie">${b ? `<button type="button" class="vv-pie-b" data-acc="escribir">⌨ escribir</button>` : ""}<button type="button" class="vv-pie-b" data-acc="conv">ver conversación</button></div>`;
  if (rol === "P") {
    el.className = "vivo publico";
    el.style.setProperty("--c", "#a78bfa");
    const lado = k => `<div class="vv-ld ${k === "B" ? "der" : ""}" style="--l:${colorLado(k, s)}">
        <b>${puntoPj(d[k])}${esc(nomG(d[k]))}</b><small>${esc(s.equipos[k].nombre)}</small><span class="vv-rc mono" id="vvR${k}"></span></div>`;
    el.innerHTML = `<div class="vv-duelo">${lado("A")}<i>vs</i>${lado("B")}</div>
      <div class="vv-pp" id="vvPuntoP"></div>
      <div class="vv-escena" id="vvEscena" aria-live="polite"></div>
      <div class="vv-rx" id="vvRx"></div>${pie(false)}`;
    return;
  }
  el.className = "vivo debate";
  el.style.setProperty("--c", colorLado(rol, s));
  el.innerHTML = `<div class="vv-cab">
      <div class="vv-rol"><b>${puntoPj(J.grupo)}${esc(nomG(J.grupo))}</b><span>${esc(s.equipos[rol].nombre)}</span></div>
      <div class="vv-reloj mono" id="vvReloj"></div><div class="vv-rnota" id="vvRNota"></div></div>
    <div class="vv-mod oculto" id="vvMod"></div>
    <div class="vv-comp" id="vvComp"></div>
    <div class="vv-centro"><div class="vv-boton" id="vvBoton"></div></div>
    <div class="vv-punto" id="vvPunto"></div>${pie(true)}`;
  montarBotonHablar($("vvBoton"));
}

function pintarVivoParcial() {
  const s = J.sala;
  if (!VV.visible || !s || !s.debate) return;
  const rol = rolEn(s);
  if (rol === "P") parcialPublico(s);
  else if (rol === "A" || rol === "B") parcialDebate(s, rol);
}

// La última línea de la moderadora que me nombra (a mí o a mi grupo) en este debate, de hace
// menos de un minuto. meNombran es caro: se recalcula solo cuando cambia la conversación.
function modParaMi(s, ahora) {
  const ult = J.chat[J.chat.length - 1];
  const clave = s.debate.n + "|" + J.chat.length + "|" + (ult ? ult.id : "") + "|" + J.grupo;
  if (VV.modClave !== clave) {
    VV.modClave = clave;
    VV.modLista = J.chat.slice(-40).filter(m => m.tipo === "mod" && m.debate === s.debate.n && m.texto && meNombran(m.texto));
  }
  for (let i = VV.modLista.length - 1; i >= 0; i--) {
    const m = VV.modLista[i];
    if (ahora - (VV.llega[m.id] || m.t) <= 60000) return m;
  }
  return null;
}

function parcialDebate(s, lado) {
  const d = s.debate, ahora = Date.now(), el = $("pVivo");
  if (!HABLA.apretado && $("vvBoton") && (!$("btnHablar") || $("btnHablar").parentNode !== $("vvBoton"))) montarBotonHablar($("vvBoton"));
  // mi reloj: el banco de mi lado, o el tramo si no hay reloj de ajedrez
  const { banco, corre, tramo } = relojVivo(s);
  const ms = banco ? banco[lado] : tramo;
  const agotado = !!banco && banco[lado] <= 0;
  const reloj = $("vvReloj"), nota = $("vvRNota");
  texto(reloj, ms == null ? "" : mmss(ms));
  reloj.classList.toggle("bajo", ms != null && ms < 20000 && !agotado);
  reloj.classList.toggle("cero", agotado);
  const porPunto = hablaPorPunto(s);
  texto(nota, agotado ? (porPunto ? "sin tiempo · hablas por tu punto" : "SIN TIEMPO · solo puedes escribir")
    : banco ? (corre(lado) ? "tu tiempo · corriendo" : "el tiempo de tu lado") : "queda del tramo");
  nota.classList.toggle("sin", agotado);
  nota.classList.toggle("corre", !agotado && corre(lado));
  el.classList.toggle("agotado", agotado && !porPunto);
  // la moderadora me habla (mientras me piden un punto, la tarjeta manda: tiene 10 s)
  const pide = !!(s.punto && s.punto.estado === "pedido" && s.punto.para === lado);
  const m = pide ? null : modParaMi(s, ahora), mod = $("vvMod");
  mod.classList.toggle("oculto", !m);
  poner(mod, m ? `<b class="q">🎙 La moderadora te pregunta</b><span class="vv-mod-tx">${menciones(m.texto)}</span>` : "");
  // quién de mi lado está hablando (para no pisarse) y quién del otro lado
  const hablan = quienesHablan(s);
  const mios = hablan.filter(g => ladoDe(g.grupo, d) === lado), otros = hablan.filter(g => ladoDe(g.grupo, d) !== lado);
  poner($("vvComp"), mios.map(g => `<div class="vv-cmp">🎙 <b>${esc(corto(g.nombre))}</b> está hablando${g.habla.texto ? `<span>${esc(cola(g.habla.texto, 90))}</span>` : ""}</div>`).join(""));
  poner($("vvPunto"), puntoDebate(s, lado, otros, ahora));
}

// Lo del punto de información en el teléfono de quien debate (ver punto.js). El proyector decide;
// aquí solo se pide, se responde y se muestra lo que publicó.
function puntoDebate(s, lado, otros, ahora) {
  const p = s.punto, conPunto = opcionActiva(s.opciones, "punto");
  if (VV.aviso && ahora > VV.aviso.hasta) VV.aviso = null;
  // un pedido de mi lado (mío o de un compañero) enfría el botón 30 s, como en el proyector
  if (p && p.lado === lado && VV.ladoVisto !== p.t) { VV.ladoVisto = p.t; VV.enfria = Math.max(VV.enfria, ahora); }
  if (VV.pedido && p && p.t === VV.pedido.t) VV.pedido = null;                   // ya lo refleja la sala
  if (VV.pedido && ahora - VV.pedido.en > 6000) {
    VV.enfria = VV.pedido.enfriaAntes;                   // no entró: no cuenta como pedido
    VV.pedido = null;
    VV.aviso = { txt: "✋ El punto no entró: pídelo de nuevo cuando vuelvan a hablar.", hasta: ahora + 4000 };
  }
  const aviso = VV.aviso ? `<div class="vv-nota">${esc(VV.aviso.txt)}</div>` : "";
  const quien = x => `<b>${esc(x.nombre || "Alguien")}</b>${x.grupo && x.grupo !== J.grupo ? ` (${esc(nomG(x.grupo))})` : ""}`;
  if (p && p.estado === "pedido" && p.para === lado) {
    if (VV.avisado !== p.t) { VV.avisado = p.t; navigator.vibrate?.([90, 50, 90]); }
    if (VV.respondido && VV.respondido.t === p.t)
      return `<div class="vv-card"><div class="vv-card-t">✋ ${quien(p)} pide un punto</div><div class="vv-card-s">${VV.respondido.acepta ? "Aceptaste" : "Rechazaste"}: esperando la pantalla…</div></div>`;
    return `<div class="vv-card"><div class="vv-card-t">✋ ${quien(p)} pide un punto</div>
      <div class="vv-card-s">Si aceptas, tiene 15 s y corre el reloj de su lado.</div>
      <div class="vv-2"><button type="button" class="vv-si" data-acc="acepta">Aceptar</button><button type="button" class="vv-no" data-acc="rechaza">Rechazar</button></div></div>`;
  }
  if (p && p.estado === "aceptado" && p.de === J.uid) {
    if (!VV.palabra || VV.palabra.t !== p.t) { VV.palabra = { t: p.t, desde: ahora }; navigator.vibrate?.([60, 40, 220]); }
    const n = Math.max(0, Math.ceil((PUNTO.DURA - (ahora - VV.palabra.desde)) / 1000));
    return `<div class="vv-palabra">✋ Tienes la palabra: <b class="mono">${n}</b> s<small>Mantén el botón y haz tu punto.</small></div>`;
  }
  if (p && p.estado === "aceptado") return `<div class="vv-estado">✋ ${quien(p)} tiene la palabra: punto de información.</div>`;
  if (p && p.estado === "pedido" && p.de === J.uid) return `<div class="vv-estado">✋ Pediste un punto: esperando que respondan…</div>`;
  if (p && p.estado === "pedido") return `<div class="vv-estado">✋ ${quien(p)} pidió un punto.</div>`;
  if (p && p.estado === "rechazado") return `<div class="vv-estado apagado">✋ Punto rechazado.</div>` + aviso;
  if (p && p.estado === "vencido") return `<div class="vv-estado apagado">✋ Nadie respondió el punto.</div>` + aviso;
  if (!otros.length) return aviso;
  const g = otros[0];
  const habla = `<div class="vv-otro">🎙 <b>${esc(corto(g.nombre))}</b> · ${esc(nomG(g.grupo))} está hablando</div>`;
  if (!conPunto || puntoActivo(p)) return habla + aviso;
  if (VV.pedido) return habla + `<button type="button" class="vv-pto" disabled>Pedido…</button>`;
  const falta = PUNTO.ENFRIA - (ahora - VV.enfria);
  if (falta > 0) return habla + `<button type="button" class="vv-pto" disabled>✋ PUNTO<small>de nuevo en ${Math.ceil(falta / 1000)} s</small></button>` + aviso;
  return habla + `<button type="button" class="vv-pto" data-acc="punto">✋ PUNTO<small>pide la palabra 15 s</small></button>` + aviso;
}

function pedirPuntoTel(s) {
  const lado = miLado(s);
  if (!lado || !s.debate || puntoActivo(s.punto) || VV.pedido || !opcionActiva(s.opciones, "punto")) return;
  const t = Date.now();
  VV.pedido = { t, en: t, enfriaAntes: VV.enfria }; VV.enfria = t;
  navigator.vibrate?.(30);
  setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { punto: { debate: s.debate.n, t } }, { merge: true })
    .catch(e => { if (VV.pedido && VV.pedido.t === t) { VV.enfria = VV.pedido.enfriaAntes; VV.pedido = null; } VV.aviso = { txt: "✋ No se pidió el punto: " + e.code, hasta: Date.now() + 4000 }; });
  pintarVivoParcial();
}
function responderPuntoTel(s, acepta) {
  const p = s && s.punto, lado = miLado(s);
  if (!p || p.estado !== "pedido" || p.para !== lado || (VV.respondido && VV.respondido.t === p.t)) return;
  VV.respondido = { t: p.t, acepta };
  navigator.vibrate?.(30);
  setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { respondePunto: { t: p.t, acepta, lado } }, { merge: true })
    .catch(e => { VV.respondido = null; VV.aviso = { txt: "✋ No se envió tu respuesta: " + e.code, hasta: Date.now() + 4000 }; });
  pintarVivoParcial();
}

function parcialPublico(s) {
  const d = s.debate;
  const { banco, corre } = relojVivo(s);
  for (const k of ["A", "B"]) {
    const r = $("vvR" + k);
    texto(r, banco ? mmss(banco[k]) : "");
    r.classList.toggle("corre", corre(k));
    r.classList.toggle("bajo", !!banco && banco[k] < 20000);
  }
  // el punto de información, en una línea
  const p = s.punto, quien = p ? `<b>${esc(p.nombre || "Alguien")}</b> (${esc(nomG(p.grupo))})` : "";
  const pp = !p ? "" : p.estado === "pedido" ? `✋ ${quien} pide un punto de información`
    : p.estado === "aceptado" ? `✋ Punto de información: ${quien} tiene la palabra`
    : p.estado === "rechazado" ? "✋ Punto rechazado" : p.estado === "vencido" ? "✋ Nadie respondió el punto" : "";
  poner($("vvPuntoP"), pp);
  // quien habla, grande; en silencio, el último mensaje de alumno del debate
  // a lo más uno por lado (el que empezó primero): dos del mismo lado no son «los dos lados»
  const todos = quienesHablan(s).sort((a, b) => (a.habla.t0 || 0) - (b.habla.t0 || 0));
  const hablan = ["A", "B"].map(k => todos.find(g => ladoDe(g.grupo, d) === k)).filter(Boolean);
  const msgs = J.chat.filter(m => m.tipo === "alumno" && m.debate === d.n);
  const k0 = hablan.length ? ladoDe(hablan[0].grupo, d) : null;
  const obj = [...msgs].reverse().find(m => !k0 || m.equipo === k0);          // al que se reacciona
  let escena;
  if (hablan.length) {
    // los dos lados a la vez (una interrupción): cada uno en su mitad, más compactos
    escena = (hablan.length > 1 ? `<div class="vv-en vv-dos"><i></i>Hablan los dos lados</div>` : "") + hablan.map(g => { const k = ladoDe(g.grupo, d);
      return `<div class="vv-hab" style="--l:${colorLado(k, s)}"><div class="vv-en"><i></i>Habla ahora</div>
        <div class="vv-nom">${esc(g.nombre)}</div><div class="vv-gr">${puntoPj(g.grupo)}${esc(nomG(g.grupo))} · ${esc(s.equipos[k].nombre)}</div>
        <div class="vv-tx"><span>${g.habla.texto ? esc(cola(g.habla.texto, hablan.length > 1 ? 140 : 280)) : `<i class="vv-pts">…</i>`}</span></div></div>`; }).join("");
  } else if (msgs.length) {
    const m = msgs[msgs.length - 1], g = grupoDeMensaje(m);
    escena = `<div class="vv-hab quieto" style="--l:${colorLado(m.equipo, s)}"><div class="vv-en">${m.voz ? "🎤 " : ""}Lo último que se dijo</div>
      <div class="vv-nom">${esc(m.nombre)}</div><div class="vv-gr">${g ? puntoPj(g) + esc(nomG(g)) : ""}${m.equipo && s.equipos[m.equipo] ? " · " + esc(s.equipos[m.equipo].nombre) : ""}</div>
      <div class="vv-tx"><span>${esc(m.texto)}</span></div></div>`;
  } else escena = `<div class="vv-vacio">Todavía no habla nadie.<small>Cuando alguien apriete su botón, lo que dice aparece aquí.</small></div>`;
  const esc0 = $("vvEscena");
  if (poner(esc0, escena) || VV.medir) {
    VV.medir = false;
    esc0.classList.toggle("dos", hablan.length > 1);
    // si el texto no cabe, se desvanece por donde se corta (arriba en vivo, abajo en silencio)
    for (const tx of esc0.querySelectorAll(".vv-tx")) tx.classList.toggle("corta", tx.firstElementChild.offsetHeight > tx.clientHeight + 2);
  }
  // 🔥🤔🤝 para ese mensaje (mientras alguien habla: lo último que dijo ese lado)
  const mia = obj ? PA.mias[obj.id] : null;
  const rxClave = obj ? [obj.id, mia || "", hablan.length ? 1 : 0].join("|") : "";
  if (VV.rxClave !== rxClave) {
    VV.rxClave = rxClave;
    poner($("vvRx"), !obj ? "" : `<div class="vv-rx-q">${hablan.length ? `Reacciona a lo último de <b>${esc(corto(obj.nombre))}</b>: «${esc(obj.texto.slice(0, 60))}${obj.texto.length > 60 ? "…" : ""}»` : "Reacciona a este mensaje"}</div>
      <div class="vv-rxs">${PUB.REACCIONES.map(r => `<button type="button" class="vv-rxb ${mia === r.id ? "on" : ""}" data-acc="rx" data-m="${esc(obj.id)}" data-r="${r.id}" aria-pressed="${mia === r.id}">
        <span>${r.emoji}</span><small>${esc(r.nombre)}</small><b></b></button>`).join("")}</div>`);
  }
  if (obj) {
    const c = PA.conteos[obj.id] || {};
    for (const b of $("vvRx").querySelectorAll(".vv-rxb")) texto(b.querySelector("b"), c[b.dataset.r] ? String(c[b.dataset.r]) : "");
  }
}

function verClasica(escribir) {
  J.vistaClasica = true;
  pintarSala();
  const p = $("pJuego"); p.scrollTop = p.scrollHeight;
  if (escribir && !$("tx").disabled) $("tx").focus();
}
$("pVivo").addEventListener("click", e => {
  const b = e.target.closest("[data-acc]");
  if (!b || b.disabled) return;
  const acc = b.dataset.acc, s = J.sala;
  if (acc === "escribir" || acc === "conv") verClasica(acc === "escribir");
  else if (acc === "punto") pedirPuntoTel(s);
  else if (acc === "acepta" || acc === "rechaza") responderPuntoTel(s, acc === "acepta");
  else if (acc === "rx") reaccionar(b.dataset.m, b.dataset.r);
});
$("vvVolver").onclick = () => { cortarDictado(); $("tx").blur(); J.vistaClasica = false; pintarSala(); };
setInterval(pintarVivoParcial, 300);

/* ---------- votar: quién argumentó mejor y a quién elegirá el jurado ---------- */
// El resumen del relator de este debate, compacto, sobre las preguntas: es lo que pide revisar antes de votar.
function relatorDe(n) {
  const m = [...J.chat].reverse().find(x => x.tipo === "relator" && x.debate === n);
  if (!m || !m.datos) return "";
  const x = m.datos;
  return `<div class="vt-rel">📣 <b>Relator:</b> ${esc(x.disputa || "")}${x.revisar && x.revisar.length ? `<br><b>Revisen:</b> ${x.revisar.map(esc).join(" · ")}` : ""}</div>`;
}
const VOTO = {};                        // por debate: { voto, prediccion } de este teléfono
// Tras recargar el teléfono, el voto guardado se recupera del servidor (si no, el próximo toque
// borraría la otra respuesta y no se sabría si acertó).
const cargando = {};
function cargarVoto(n) {
  if (VOTO[n] || cargando[n]) return;
  cargando[n] = true;
  getDoc(doc(db, "salas", J.codigo, "votos", `${n}_${J.uid}`)).then(d => {
    const x = d.exists() ? d.data() : {};
    VOTO[n] = { voto: x.voto ?? null, prediccion: x.prediccion ?? null, ...(VOTO[n] || {}) };
    pintarSala();
  }).catch(() => { VOTO[n] = VOTO[n] || { voto: null, prediccion: null }; });
}
function pintarVotar(s) {
  const el = $("votar"), d = s.debate;
  const toca = s.modo === "rotacion" && d && s.fase === "votando" && rolEn(s) === "P";
  el.classList.toggle("oculto", !toca);
  if (!toca) return;
  if (J.votarVisto !== d.n) { J.votarVisto = d.n; navigator.vibrate?.([120, 60, 120]); }
  if (!VOTO[d.n]) { cargarVoto(d.n); el.innerHTML = `<h1>Cargando tu voto…</h1>`; return; }
  const mio = VOTO[d.n];
  const boton = (campo, k) => `<button class="vt ${mio[campo] === k ? "on" : ""}" data-c="${campo}" data-k="${k}" style="--c:${s.equipos[k].color}">${esc(s.equipos[k].nombre)}<small>${esc(nomG(d[k]))}</small></button>`;
  el.innerHTML = `<div class="k">Debate ${d.n} · vota</div>
    <div class="es-mocion" style="font-size:17px">«${esc(d.pregunta)}»</div>
    ${relatorDe(d.n)}
    <div class="vt-q">🗳 Tu voto: ¿quién argumentó mejor, aunque no pienses como él?</div><div class="vt-f">${boton("voto", "A")}${boton("voto", "B")}</div>
    <div class="vt-or">
      <div class="vt-q">🔮 Oráculo: ¿a quién elegirán los 5 jueces de IA?</div>
      <div class="vt-or-e">No es tu opinión: es tu apuesta. Si aciertas, +1 punto de oráculo. Al final de la clase se premia al mejor oráculo.</div>
      <div class="vt-f">${boton("prediccion", "A")}${boton("prediccion", "B")}</div>
    </div>
    <div class="vt-pie"><span>${mio.voto && mio.prediccion ? "✓ Listo" : ""}</span><span class="mono" id="vtReloj"></span></div>
    <div class="aviso" id="vtError">${esc(mio.error || "")}</div>`;
  el.onclick = async e => {
    const b = e.target.closest("button.vt"); if (!b) return;
    mio[b.dataset.c] = b.dataset.k;
    navigator.vibrate?.(30);
    pintarVotar(J.sala);
    try {
      await setDoc(doc(db, "salas", J.codigo, "votos", `${d.n}_${J.uid}`),
        { uid: J.uid, debate: d.n, voto: mio.voto, prediccion: mio.prediccion, nombre: J.nombre, email: J.email, grupo: J.grupo, t: Date.now() }, { merge: true });
      mio.error = "";
    } catch (err) { mio.error = "No se guardó: " + err.code; if ($("vtError")) $("vtError").textContent = mio.error; }
  };
  pintarReloj();
}

/* ---------- brújula corta ----------
   Una pregunta por pantalla. Al terminar: el campo, la frase del campo y el mini-mapa con el punto
   propio. Se guarda en salas/{codigo}/brujula/{uid}; en la repetición del cierre, en «repeticion». */
const BJ = { respuestas: {}, i: 0, modo: "inicio", mio: null, cargada: false };
async function cargarBrujula() {
  if (BJ.cargada) return;
  BJ.cargada = true;
  const d = await getDoc(doc(db, "salas", J.codigo, "brujula", J.uid)).catch(() => null);
  // una brújula a medio responder (se guarda tras cada pregunta) no cuenta como respondida
  if (d && d.exists() && !d.data().parcial) BJ.mio = d.data();
}
function mostrarBrujula(modo = "inicio") {
  const b = J.sala && J.sala.brujula;
  if (!b || !b.preguntas) return;
  if (BJ.modo !== modo) { BJ.modo = modo; BJ.respuestas = {}; BJ.i = 0; }
  const el = $("brujula");
  el.classList.remove("oculto");
  const p = b.preguntas[BJ.i];
  el.innerHTML = `<div class="k">${modo === "repetir" ? "Brújula · otra vez, al final" : "Brújula · antes de debatir"}</div>
    <div class="bj-prog">${b.preguntas.map((_, k) => `<i class="${k <= BJ.i ? "on" : ""}"></i>`).join("")}</div>
    <div class="bj-q">${esc(p.texto)}</div>
    ${p.opciones.map((o, k) => `<button class="bj-op" data-k="${k}">${esc(o.texto)}</button>`).join("")}
    ${BJ.i > 0 ? `<button class="link" id="bjAtras">‹ volver</button>` : ""}`;
  el.onclick = e => {
    if (e.target.id === "bjAtras") { BJ.i--; mostrarBrujula(modo); return; }
    const op = e.target.closest(".bj-op");
    if (!op) return;
    BJ.respuestas[p.id] = +op.dataset.k;
    navigator.vibrate?.(20);
    if (BJ.i < b.preguntas.length - 1) { BJ.i++; mostrarBrujula(modo); guardarParcial(modo); } else guardarBrujula(modo);
  };
}
// Tras cada respuesta, la posición provisional: en el proyector el punto aparece y se va moviendo
// mientras el alumno responde (como el compás de ml2). Si falla no pasa nada: la final se guarda igual.
function datoBrujula(parcial) {
  const b = J.sala.brujula;
  const pos = posicion(BJ.respuestas, b.preguntas);
  if (!pos) return null;
  return { respuestas: { ...BJ.respuestas }, pos: { x: +pos.x.toFixed(2), y: +pos.y.toFixed(2) }, campo: campoDe(pos, b.campos), t: Date.now(), parcial };
}
function guardarParcial(modo) {
  const dato = datoBrujula(true);
  if (!dato) return;
  const ref = doc(db, "salas", J.codigo, "brujula", J.uid);
  (modo === "repetir" ? (BJ.mio ? setDoc(ref, { uid: J.uid, ...BJ.mio, repeticion: dato }, { merge: true }) : Promise.resolve())
    : setDoc(ref, { uid: J.uid, ...dato })).catch(() => {});
}
async function guardarBrujula(modo) {
  const dato = datoBrujula(false);
  try {
    if (modo === "repetir") await setDoc(doc(db, "salas", J.codigo, "brujula", J.uid), { uid: J.uid, ...BJ.mio, repeticion: dato }, { merge: true });
    else await setDoc(doc(db, "salas", J.codigo, "brujula", J.uid), { uid: J.uid, ...dato });
    BJ.mio = modo === "repetir" ? { ...BJ.mio, repeticion: dato } : { uid: J.uid, ...dato };
    $("brujula").classList.add("oculto");
    $("espera").dataset.clave = "";
    if (modo === "inicio" && !J.grupo && $("pJuego").classList.contains("oculto")) await entrarAlJuego();
    else pintarSala();
  } catch (e) {
    $("brujula").insertAdjacentHTML("beforeend", `<p class="aviso">No se guardó: ${esc(e.code || e.message)}</p>`);
    if (!$("pJuego").classList.contains("oculto")) pintarSala();
  }
}
// el mapa público es anónimo y ya trae mi punto: se quita uno igual para no dibujarlo dos veces
function sinMiPunto(mapa, mio) {
  const i = mapa.findIndex(p => p.campo === mio.campo && Math.abs(p.x - mio.pos.x) < .01 && Math.abs(p.y - mio.pos.y) < .01);
  return i < 0 ? mapa : mapa.filter((_, k) => k !== i);
}
function resultadoBrujula(s) {
  const b = s.brujula, mio = BJ.mio;
  if (!b || !mio) return "";
  const c = b.campos.find(x => x.id === mio.campo) || {};
  return `<div class="k">Tu campo</div><div class="bj-campo" style="color:${c.color}">${esc(c.nombre || mio.campo)}</div>
    <p style="color:var(--dim);max-width:340px">${esc(c.afirma || "")}</p>
    ${mapaSvg({ puntos: [...sinMiPunto(s.mapa || [], mio).map(p => ({ ...p, color: (b.campos.find(x => x.id === p.campo) || {}).color || "#7d8fa1" })),
      { ...mio.pos, color: c.color || "#fff", yo: true }], campos: b.campos, ejes: b.ejes, tam: 320, chico: true })}`;
}

/* ---------- espera: portada e intro ---------- */
const iniciales = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();
function miRol(s) {
  const p = personajeDe(J.grupo, PJ());
  if (p) return { nombre: p.nombre.toUpperCase(), color: p.color || "#22e58a", bandera: "🎭" };
  return { nombre: `GRUPO ${J.grupo || "?"}`, color: "#22e58a", bandera: "👥" };
}
function pintarEspera(s) {
  const el = $("espera");
  if (s.etapa !== "portada" && s.etapa !== "intro") { el.classList.add("oculto"); el.dataset.clave = ""; return; }
  el.classList.remove("oculto");
  if (!J.grupo && s.brujula && s.brujula.activa) {
    const clave2 = "bj|" + (BJ.mio ? BJ.mio.campo : "") + "|" + (s.mapa || []).length + "|" + s.brujula.fase;
    if (el.dataset.clave === clave2) return;
    el.dataset.clave = clave2;
    const espera = s.brujula.fase === "responder" ? "Espera: el profesor va a formar los grupos." : "Te estamos asignando un grupo…";
    el.innerHTML = BJ.mio ? resultadoBrujula(s) + `<p style="color:var(--dim)">${espera}</p>
        ${s.brujula.fase === "responder" ? `<button class="link" id="bjRehacer">rehacer la brújula</button>` : ""}`
      : ofrecerBrujula(s.brujula, false) ? `<h1>Falta tu brújula</h1><button class="btn pri" id="bjHacer">Responder (1 minuto)</button>`
      : `<p style="color:var(--dim)">${espera}</p>`;
    const r = $("bjRehacer") || $("bjHacer");
    if (r) r.onclick = () => { BJ.modo = ""; mostrarBrujula("inicio"); };
    return;
  }
  const r = miRol(s);
  const gi = (s.gruposInfo || []).find(g => g.n === J.grupo);
  const ofrecer = ofrecerBrujula(s.brujula, !!BJ.mio);
  const clave = s.etapa + "|" + J.grupo + "|" + (gi ? gi.nombre : "") + "|" + ofrecer;
  if (el.dataset.clave === clave) return;           // no repintar en cada cambio de la sala
  el.dataset.clave = clave;
  const av = `<div class="av" style="--c:${r.color};--t:92px">${J.foto ? `<img src="${esc(J.foto)}" referrerpolicy="no-referrer" alt="">` : `<span>${iniciales(J.nombre)}</span>`}</div>`;
  const per = personajeDe(J.grupo, PJ());
  const papel = per ? `Eres <b>${esc(per.nombre)}</b> (${esc(per.cargo || "")}). Debates una vez, en el duelo ${per.duelo}, ${per.lado === "A" ? "A FAVOR" : "EN CONTRA"} de la moción, y hablas en primera persona, como tu personaje: los jueces premian que lo diría y que puedas decir dónde lo dijo. Mientras debaten otros, juegas desde el teléfono: mueves el termómetro, reaccionas a los mensajes y puedes mandar una pregunta; al final votas quién argumentó mejor y predices a los jueces.`
    : `Estás en el <b>Grupo ${J.grupo}</b>. Cuando la moderadora lo llame, tu grupo debate A FAVOR o EN CONTRA de la pregunta: escribe en la conversación y responde lo que te pregunten, con argumentos y lecturas del curso. Mientras debaten otros, juegas desde el teléfono: mueves el termómetro, reaccionas a los mensajes y puedes mandar una pregunta; al final votas quién argumentó mejor y predices a los jueces.`;
  el.innerHTML = s.etapa === "portada"
    ? `${av}<h1 style="margin-top:14px">¡Estás dentro, ${esc(J.nombre.split(" ")[0])}!</h1>
       <span class="chip" style="--c:${r.color}">${r.bandera} ${esc(r.nombre)}${gi ? " · " + esc(gi.nombre) : ""}</span>
       <p style="color:var(--dim);margin-top:18px;max-width:340px">Mira la pantalla del curso. El debate empieza cuando el profesor lo diga.</p>
       ${ofrecer ? `<button class="btn pri" id="bjOfrecer" style="margin-top:14px">Responder la brújula (1 minuto)</button>` : ""}
       ${gi || (PJ() && s.inscripcion !== "abierta") ? "" : `<button class="link" id="esCambiar">${PJ() ? "cambiar de personaje" : "cambiar de rol"}</button>`}`
    : `<div class="k">Semana ${s.semana} · tema general</div>
       <div class="es-mocion">«${esc(s.temaGeneral || s.tema)}»</div>
       <div class="es-lados">
         <div style="--c:${s.equipos.A.color}"><b>${s.equipos.A.bandera} ${esc(s.equipos.A.nombre)}</b>${esc(s.equipos.A.lema || "Defiende la moción.")}</div>
         <div style="--c:${s.equipos.B.color}"><b>${s.equipos.B.bandera} ${esc(s.equipos.B.nombre)}</b>${esc(s.equipos.B.lema || "Rechaza la moción.")}</div>
       </div>
       <div class="es-papel">${papel}</div>`;
  if ($("bjOfrecer")) $("bjOfrecer").onclick = () => { BJ.modo = ""; mostrarBrujula("inicio"); };
  const b = $("esCambiar"); if (b) b.onclick = () => {
    el.dataset.clave = "";
    // con personajes la elección vive dentro del juego: no se cortan las suscripciones
    if (PJ()) { PER.cambiando = true; PER.aviso = ""; pintarSala(); return; }
    subs.forEach(u => u()); subs = []; mostrarBancadas();
  };
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
  const rol = rolEn(s), d = s.debate;
  const fases = ["propuesta", "listo", "revelando", "entrada", "resultado", "veredictoPublico", "veredictoJueces", "votando"];
  const toca = s.modo === "rotacion" && s.etapa == null && fases.includes(s.fase) && !(s.fase === "votando" && rol === "P");
  el.classList.toggle("oculto", !toca);
  const revela = toca && d && ["revelando", "entrada"].includes(s.fase) && !enSuspenso(s);
  // el color del escenario solo mientras dura la revelación: al abrirse el debate, el teléfono vuelve a lo de siempre
  if (!(revela && (rol === "A" || rol === "B"))) { document.body.classList.remove("sube"); document.body.style.removeProperty("--c"); }
  const prep = toca && s.fase === "listo" && d && s.revelado === false;
  // .pv se centra con margin:auto: así, si no cabe, se desplaza desde arriba en vez de cortarse
  el.classList.toggle("con-pv", !!(prep || revela));
  if (!toca) { el.dataset.clave = ""; return; }
  if (prep) { vistaPreparacion(el, s, d); return; }
  if (revela) { vistaRevelacion(el, s, d, rol); return; }
  el.dataset.clave = "";
  const orac = s.oraculoDe && s.oraculoDe[J.uid];
  const pie = (J.grupo ? (() => { const mio = (s.ranking || []).find(f => f.grupo === J.grupo);
      return mio && mio.puesto ? `<div class="es-papel">Tu grupo va <b>#${mio.puesto}</b> con ${mio.puntaje} puntos.</div>` : ""; })() : "")
    + (orac ? `<div class="es-papel">🔮 Oráculo: <b>${orac.puntos}</b> punto${orac.puntos === 1 ? "" : "s"} · #${orac.puesto} de la clase<br><small style="color:var(--dim)">+1 por acertar a los jueces, +1 si la moderadora elige tu pregunta</small></div>` : "");
  if (s.fase === "listo" && d) {
    const pos = d.posturas || {};
    const lado = k => `<div style="--c:${s.equipos[k].color}"><b>${esc(s.equipos[k].nombre)} · ${esc(nomG(d[k]))}</b>${esc(pos[k] || "")}</div>`;
    const reloj = `<div class="prep-reloj mono" id="prepReloj">${s.finPrep ? "" : "…"}</div>`;
    el.innerHTML = rol === "A" || rol === "B"
      ? `<div class="k">Debate ${d.n} · preparación</div>
         <h1 style="color:${s.equipos[rol].color}">Tu grupo defiende ${esc(s.equipos[rol].nombre)}</h1>
         <div class="es-mocion" style="font-size:17px">«${esc(d.pregunta)}»</div>
         <div class="prep-postura" style="--c:${s.equipos[rol].color}"><b>Lo que ustedes sostienen</b>${esc(pos[rol] || "")}</div>${reloj}
         <div class="es-papel">Júntense con su grupo y acuerden la primera frase. Cuando se abra el chat, escríbanla de inmediato: cualquiera del grupo puede partir.</div>`
      : `<div class="k">Debate ${d.n} · preparación</div><h1>${PJ() ? `${esc(nomG(d.A))} y ${esc(nomG(d.B))} se preparan` : `Los grupos ${d.A} y ${d.B} se preparan`}</h1>
         <div class="es-mocion" style="font-size:17px">«${esc(d.pregunta)}»</div>
         <div class="es-lados">${lado("A")}${lado("B")}</div>${reloj}
         <div class="es-papel">Cuando se abra el chat: mueve el termómetro, reacciona a los mensajes y manda una pregunta. Al final votas quién argumentó mejor y apuestas a quién eligen los jueces 🔮.</div>` + pie;
    pintarReloj();
    return;
  }
  if (s.fase === "votando") {
    const c = s.conteoVotos || {};
    el.innerHTML = `<div class="k">Debate ${d.n}</div><h1>La sala está votando tu debate</h1>
      <p style="color:var(--dim)">${(c.A || 0) + (c.B || 0)} de ${c.elegibles ?? "?"} votaron.</p>` + pie;
    return;
  }
  if (s.fase === "veredictoPublico" || s.fase === "veredictoJueces") {
    if (d && rol === "P" && !VOTO[d.n]) cargarVoto(d.n);
    const mio = d && VOTO[d.n];
    el.innerHTML = `<div class="k">Debate ${d.n}</div><h1>Mira la pantalla</h1>
      ${mio && mio.prediccion ? `<p style="color:var(--dim)">Tu predicción: los jueces eligen ${PJ() ? "a" : "al"} <b>${esc(nomG(d[mio.prediccion]))}</b>.</p>` : ""}` + pie;
    return;
  }
  const u = s.ultimo;
  if (u && s.fase === "resultado") {
    if (rol === "P" && !VOTO[u.n]) cargarVoto(u.n);
    const mio = VOTO[u.n];
    let acierto = "";
    if (mio && mio.prediccion && u.panel) {
      const ok = u.panel.ganador && mio.prediccion === u.panel.ganador;
      acierto = !u.panel.ganador ? `<h1>Los jueces empataron</h1>` : ok ? `<h1 style="color:var(--neon)">🔮 ¡Acertaste a los jueces! +1</h1>` : `<h1>🔮 Esta vez los jueces eligieron al otro</h1>`;
      if (J.aciertoVisto !== u.n) { J.aciertoVisto = u.n; navigator.vibrate?.(ok ? [60, 40, 60, 40, 200] : 150); }
    }
    const res = (g, r) => `<div style="--c:${g === u.A ? s.equipos.A.color : s.equipos.B.color}"><b>${esc(nomG(g))}</b>${r.puntaje ?? "—"} pts<br><small>jueces ${r.jurado ?? "—"} · público ${r.publico ?? "—"}</small></div>`;
    el.innerHTML = `<div class="k">Debate ${u.n} · resultado</div>${acierto}
      <div class="es-mocion" style="font-size:17px">«${esc(u.pregunta)}»</div>
      <div class="es-lados">${res(u.A, u.resA)}${res(u.B, u.resB)}</div>
      <h2 style="margin-top:12px">${u.ganador ? `Gana ${PJ() ? "" : "el "}${esc(nomG(u.ganador === "A" ? u.A : u.B))}` : "Empate"}</h2>` + pie;
    return;
  }
  el.innerHTML = `<div class="k">Rotación</div><h1>La moderadora prepara la próxima pregunta…</h1>` + pie;
}

/* ---------- la preparación universal y la revelación ----------
   Con revelación, el minuto de preparación es de todos: nadie sabe quién pasa al frente. Sin
   personajes se ven la moción y las dos posturas (se preparan los dos lados); con personajes, los
   duelos que faltan, con el mío destacado. Al revelar, a quienes suben al escenario la pantalla se
   les tiñe con el color de su lado y vibra; los demás son tribuna. Estas vistas no se repintan en
   cada cambio de la sala (dataset.clave): la animación del título no se repite y el botón del
   micrófono conserva lo que dijo. */
const SIN_GRUPO = "Todavía no tienes grupo: mira la pantalla y prepárate para votar.";
function vistaPreparacion(el, s, d) {
  const duelos = Array.isArray(s.duelos) && s.duelos.length ? s.duelos : null;
  const voz = opcionActiva(s.opciones, "voz") && !!Reconocedor;
  const clave = ["prep", d.n, J.grupo, d.pregunta, JSON.stringify(d.posturas || null), duelos ? duelos.map(x => x.texto).join("|") : "", voz, !!s.finPrep].join("#");
  if (el.dataset.clave === clave) { pintarReloj(); return; }
  el.dataset.clave = clave;
  const reloj = `<div class="prep-reloj mono" id="prepReloj">${s.finPrep ? "" : "…"}</div>`;
  const mic = `<button class="btn mic-probar ${voz ? "" : "oculto"}" id="btnProbarMic">${micListo() ? "✓ Micrófono listo" : "🎤 Probar micrófono"}</button>
    <div class="mic-nota" id="micNota"></div>`;
  let cuerpo;
  if (duelos) {
    const ps = PJ(), yo = personajeDe(J.grupo, ps);
    const mio = duelos.find(x => x.A === J.grupo || x.B === J.grupo);
    const cara = n => { const p = personajeDe(n, ps); return `<b style="color:${p && p.color ? p.color : "var(--txt)"}">${esc(p ? p.corto : nomG(n))}</b>`; };
    const lado = mio && yo ? (yo.lado === "A" ? mio.favor : mio.contra) : "";
    const aviso = mio && lado
      ? `<div class="pr-tuyo" style="--c:${yo.color || "var(--neon)"}"><span>Si sale tu duelo, defiendes esto</span>${esc(lado)}</div>`
      : !mio && yo ? `<div class="pr-tuyo pr-jugado"><span>Tu duelo ya se jugó</span>Hoy eres tribuna: prepara una pregunta para los que suban.</div>` : "";
    cuerpo = `<div class="k">Debate ${d.n} · preparación</div>
      <h1 class="pv-t">${duelos.length === 1 ? "Último duelo" : "¿Qué duelo sigue?"}</h1>
      ${aviso}
      <div class="pr-duelos">${duelos.map(x => `<div class="pr-duelo ${x === mio ? "mio" : ""}">
        <div class="pr-par">${cara(x.A)}<i>vs</i>${cara(x.B)}${x === mio ? `<em>tu duelo</em>` : ""}</div>
        <div class="pr-q">«${esc(x.texto)}»</div></div>`).join("")}</div>
      ${reloj}
      <div class="es-papel">${!J.grupo ? SIN_GRUPO : duelos.length === 1 ? "Queda uno solo: al terminar el minuto, sus dos personajes pasan al frente."
        : "Nadie sabe qué duelo sigue: al terminar el minuto se revela. Repasa tu dossier: puede ser el tuyo."}</div>`;
  } else {
    const pos = d.posturas || {};
    const postura = k => `<div class="prep-postura" style="--c:${s.equipos[k].color}"><b>${esc(s.equipos[k].nombre)}</b>${esc(pos[k] || s.equipos[k].lema || "")}</div>`;
    cuerpo = `<div class="k">Debate ${d.n} · preparación</div>
      <h1 class="pv-t">Prepara los dos lados</h1>
      ${d.pregunta ? `<div class="es-mocion pv-q">«${esc(d.pregunta)}»</div>` : ""}
      <div class="pv-lados">${postura("A")}${postura("B")}</div>
      ${reloj}
      <div class="es-papel">${J.grupo ? "Nadie sabe quién pasa al frente: al terminar el minuto se revela. Puedes ser tú, de cualquiera de los dos lados." : SIN_GRUPO}</div>`;
  }
  el.innerHTML = `<div class="pv">${cuerpo}${mic}</div>`;
  prepararProbarMic();
  pintarReloj();
}

function vistaRevelacion(el, s, d, rol) {
  const sube = rol === "A" || rol === "B";
  const clave = ["rev", s.fase, d.n, J.grupo, d.A, d.B].join("#");
  if (el.dataset.clave === clave) { pintarReloj(); return; }
  el.dataset.clave = clave;
  const color = k => { const p = personajeDe(d[k], PJ()); return p && p.color ? p.color : s.equipos[k].color; };
  const mocion = d.pregunta ? `<div class="es-mocion pv-q">«${esc(d.pregunta)}»</div>` : "";
  const entrada = s.fase === "entrada";
  const reloj = entrada ? `<div class="ent-reloj mono" id="entReloj"></div>` : "";
  if (sube) {
    document.body.style.setProperty("--c", color(rol));
    document.body.classList.add("sube");
    if (J.subeVisto !== d.n) { J.subeVisto = d.n; navigator.vibrate?.([200, 80, 200, 80, 400]); }
    const pos = d.posturas && d.posturas[rol];
    el.innerHTML = `<div class="pv">
      <div class="k">Debate ${d.n}</div>
      <h1 class="sube-t">¡SUBEN AL ESCENARIO!</h1>
      <div class="sube-lado">${esc(nomG(J.grupo))} · tu grupo defiende <b>${esc(s.equipos[rol].nombre)}</b></div>
      ${mocion}
      ${pos ? `<div class="prep-postura" style="--c:${color(rol)}"><b>Lo que ustedes sostienen</b>${esc(pos)}</div>` : ""}
      ${entrada ? `<div class="sube-ya">Pasen al frente con el teléfono: el debate es en voz alta.</div>${reloj}`
        : `<div class="sube-ya suave">Mira la pantalla: en un momento pasan al frente.</div>`}
    </div>`;
  } else {
    el.innerHTML = `<div class="pv">
      <div class="k">Debate ${d.n} · ${entrada ? "entran al escenario" : "la revelación"}</div>
      <h1 class="pv-t">Eres tribuna</h1>
      <div class="tri-par"><b style="color:${color("A")}">${esc(nomG(d.A))}</b><i>contra</i><b style="color:${color("B")}">${esc(nomG(d.B))}</b></div>
      ${mocion}${reloj}
      <div class="es-papel">Mientras debaten: mueve el termómetro, reacciona y manda una pregunta. Al final votas quién argumentó mejor y apuestas a quién eligen los jueces 🔮.</div>
    </div>`;
  }
  pintarReloj();
}

// Probar el micrófono en la preparación: el permiso se pide ahora y no cuando ya estén hablando al
// frente. Solo lo abre y lo cierra; el mantener para hablar del debate lo usa después. Queda
// recordado en este teléfono (el permiso del navegador también queda).
const micListo = () => { if (J.micListo) return true; try { return localStorage.getItem("tribuna_mic_ok") === "1"; } catch { return false; } };
function prepararProbarMic() {
  const b = $("btnProbarMic");
  if (!b || b.classList.contains("oculto")) return;
  b.classList.toggle("ok", micListo());
  b.onclick = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { $("micNota").textContent = "Este navegador no deja usar el micrófono."; return; }
    b.disabled = true; b.textContent = "🎤 Pidiendo permiso…"; $("micNota").textContent = "";
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      st.getTracks().forEach(t => t.stop());
      J.micListo = true;
      try { localStorage.setItem("tribuna_mic_ok", "1"); } catch {}
      b.textContent = "✓ Micrófono listo"; b.classList.add("ok");
    } catch (e) {
      J.micListo = false;
      try { localStorage.removeItem("tribuna_mic_ok"); } catch {}
      b.textContent = "🎤 Probar micrófono"; b.classList.remove("ok");
      $("micNota").textContent = e && e.name === "NotFoundError" ? "No encontramos un micrófono en este teléfono."
        : e && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "Permite el micrófono para este sitio (candado de la barra de direcciones)."
        : `No se pudo abrir el micrófono: ${(e && e.name) || "error"}.`;
    }
    b.disabled = false;
  };
}

/* ---------- el ganador, en grande ---------- */
function ceremonia(s, v) {
  if (!v.ranking) return;                      // salas antiguas sin ranking: no hay ceremonia de rotación
  const el = document.createElement("div");
  el.id = "ceremonia";
  const mio = v.ranking.find(f => f.grupo === J.grupo);
  el.innerHTML = `<div class="k" style="color:var(--amber);font-size:14px">EL RANKING DE LA CLASE</div>
    <div class="cb" id="cG"><div class="cg" style="color:var(--amber)">${v.campeon ? `🏆 ${esc(nomG(v.campeon))}` : "Sin debates"}</div>
      <div class="cs">${mio && mio.puesto ? `Tu grupo terminó #${mio.puesto} con ${mio.puntaje} puntos` : "Tu grupo no alcanzó a debatir"}</div>
      ${v.oraculos && v.oraculos.length ? `<div class="cmini">🔮 Oráculos: ${v.oraculos.map(o => `<b>${esc(conGrupo(o.nombre, o.grupo, PJ()))}</b> (${o.puntos})`).join(" · ")}</div>` : ""}
      ${s.oraculoDe && s.oraculoDe[J.uid] ? `<div class="cmini">Tus predicciones: ${s.oraculoDe[J.uid].puntos} punto(s), #${s.oraculoDe[J.uid].puesto}</div>` : ""}</div>
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
