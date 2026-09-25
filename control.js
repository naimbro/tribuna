/* =====================================================================
   TRIBUNA — el control del profesor, en su celular (control.html?sala=CODIGO).
   El motor sigue siendo la pantalla del proyector: este control no calcula nada. Lee lo que la
   pantalla le publica en salas/{codigo}/privado/control (la fase, el rótulo del botón principal,
   la propuesta antes de publicarla, los relojes, los interruptores) y le manda órdenes en
   salas/{codigo}/privado/orden como { cmd, arg, t }. La pantalla atiende cada orden una vez y en
   su publicación siguiente devuelve ack = t: hasta entonces los botones esperan, para que un
   segundo toque no se salte un paso.
   Solo el profesor de la sala lee y escribe en privado (firestore.rules): no hacen falta reglas.
   ===================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20260918a";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const HAY_FIREBASE = !!firebaseConfig.apiKey;
const app = HAY_FIREBASE ? initializeApp(firebaseConfig) : null;
const auth = HAY_FIREBASE ? getAuth(app) : null;
const db = HAY_FIREBASE ? getFirestore(app) : null;
const google = new GoogleAuthProvider();

const CODIGO = (new URLSearchParams(location.search).get("sala") || "").trim().toUpperCase();

const FASES = { propuesta: "Próximo debate", listo: "Preparación", revelando: "Revelación", entrada: "Entrada",
  abierta: "Debate", cerrando: "Debate", votando: "Votación", veredictoPublico: "Veredicto", veredictoJueces: "Veredicto",
  resultado: "Resultado", fin: "Clase terminada" };
// los interruptores (rotacion.js, OPCIONES_DEFECTO): apagado = la clase como antes
const INTERRUPTORES = [
  ["revelacion", "Revelación dramática", "todos preparan y al final se revela quién pasa"],
  ["revancha", "Revancha", "a veces vuelve un grupo que ya debatió"],
  ["musica", "Música", "pulso, redoble y música de entrada"],
  ["voz", "Debate en voz alta", "mantener para hablar y subtítulos"],
  ["reloj", "Reloj de ajedrez", "un banco de tiempo por lado"],
  ["punto", "Punto de información", "✋ pedir la palabra al otro lado"],
  ["vozIA", "La IA habla en voz alta", "la moderadora y el relator se escuchan"]
];

const C = { dato: null, recibido: 0, foto: null, cache: true, noResponde: false, error: "" };   // lo que publica la pantalla
// la orden en camino: t, el botón que espera, y la fase, la etapa y el ticker que se veían al tocar.
// enviada sobrevive al «no responde»: si la pantalla vuelve y dice que la ignoró, se avisa igual.
const P = { t: 0, boton: null, texto: "", timer: null, fase: null, etapa: null, ticker: "", enviada: 0 };
const BORR = { base: null, sucio: false };                                                    // la pregunta que escribe el profesor

const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
// Cuánto falta para `fin` (hora del proyector): se mide contra el `t` de la misma foto más lo que
// pasó en ESTE aparato desde que llegó, así no importa que los dos relojes no coincidan.
const restaDe = fin => fin ? Math.max(0, fin - C.dato.t - (Date.now() - C.recibido)) : null;
const nombreDe = n => ((C.dato && C.dato.grupos) || []).find(g => g.n === n)?.nombre || rotuloGrupo(n, null);
const mostrar = (id, si) => $(id).classList.toggle("oculto", !si);

function nota(texto, mal = false) {
  $("nota").textContent = texto;
  $("nota").classList.toggle("mal", mal);
  mostrar("nota", !!texto);
}
function espera(texto) { $("espera").textContent = texto; mostrar("espera", !!texto); }
function error(texto) { $("error").textContent = texto; mostrar("error", !!texto); C.error = texto; pintarConexion(); }

// El proyector reescribe el resumen al menos cada ~10 s (online.js): 20 s sin noticias por este
// aparato = se cerró, se colgó o perdió la red. El punto queda gris (no rojo: puede volver solo).
const MUDO_TRAS = 20000;
const mudo = () => !!C.dato && Date.now() - C.recibido > MUDO_TRAS;
function pintarConexion() {
  const el = $("con");
  el.className = "con " + (C.error || C.noResponde ? "mal" : P.t || C.cache ? "espera" : mudo() ? "muda" : C.dato ? "ok" : "");
  el.title = C.error || (C.noResponde ? "la pantalla no responde" : P.t ? "esperando a la pantalla" : C.cache ? "sin conexión"
    : mudo() ? `la pantalla no da señales hace ${Math.round((Date.now() - C.recibido) / 1000)} s: ¿sigue abierta?` : "conectado");
}
setInterval(pintarConexion, 1000);

/* ---------- mandar una orden y esperar el ack ---------- */
async function mandar(cmd, arg = null, boton = null) {
  if (P.t || !C.dato) return;
  // lo que se ve viene del caché: la fase puede ser vieja, y la orden quedaría en cola para después
  if (C.cache) { nota("Sin conexión: la orden no se envió. Vuelve a tocar cuando vuelva la señal.", true); pintarInterruptores(C.dato); return; }
  // t mayor que el último ack: si otro aparato con el reloj adelantado mandó antes, esta igual cuenta
  const t = Math.max(Date.now(), (C.dato.ack || 0) + 1);
  // la fase y la etapa que se veían al tocar: si la pantalla ya pasó a otra, no la hace (online.js)
  const fase = C.dato.fase, etapa = C.dato.etapa ?? null;
  Object.assign(P, { t, boton, texto: boton && boton.tagName === "BUTTON" ? boton.textContent : "", fase, etapa, ticker: C.dato.ticker || "", enviada: t });
  if (P.texto) boton.textContent = "…";
  nota(""); habilitar(); pintarConexion();
  clearTimeout(P.timer);
  P.timer = setTimeout(() => {
    if (P.t !== t) return;
    soltar(); C.noResponde = true;
    nota("La pantalla no responde: ¿está abierta?", true);
    pintar();
  }, 5000);
  try { await setDoc(doc(db, "salas", CODIGO, "privado", "orden"), { cmd, arg: arg ?? null, t, fase, etapa }); }
  catch (e) { if (P.t === t) { soltar(); nota("No se pudo enviar la orden: " + (e.code || e.message), true); pintar(); } }
}
function soltar() {
  clearTimeout(P.timer);
  if (P.boton && P.texto) P.boton.textContent = P.texto;
  P.t = 0; P.boton = null; P.texto = "";
  habilitar(); pintarConexion();
}
// Mientras una orden está en camino todo queda quieto; la pregunta se puede seguir escribiendo.
function habilitar() {
  for (const el of document.querySelectorAll("#vPanel button, #vPanel select, #vPanel input")) el.disabled = !!P.t;
  $("btnShock").disabled = !!P.t || !$("selShock").value;
}

/* ---------- pintar lo que publica la pantalla ---------- */
function pintar() {
  const c = C.dato;
  if (!c) return;
  mostrar("vPanel", true); mostrar("vEntrar", false); espera("");
  const antes = c.etapa === "portada" || c.etapa === "intro";          // la sala todavía no empieza la rotación
  const f = c.fase;
  $("faseK").textContent = antes ? `Sala ${CODIGO}` : f === "propuesta" ? `Debate ${(c.debate ? c.debate.n : 0) + 1}`
    : c.debate ? `Debate ${c.debate.n}` : `Sala ${CODIGO}`;
  $("faseT").textContent = c.etapa === "portada" ? "Portada" : c.etapa === "intro" ? "Intro" : FASES[f] || f;

  // el debate en curso: la moción y quién va a cada lado (aquí se ve aunque la sala esté en suspenso)
  const d = c.debate, conDebate = !antes && d && !["propuesta", "fin"].includes(f);
  mostrar("deb", conDebate || antes);
  if (antes) $("deb").textContent = c.etapa === "portada" ? "Los alumnos entran con el QR del proyector." : "El proyector muestra la moción de la clase.";
  else if (conDebate) $("deb").innerHTML = `<q>${esc(d.pregunta)}</q><div class="par">
    <span class="tag" style="--c:var(--A)">A FAVOR · ${esc(nombreDe(d.A))}</span><span class="tag" style="--c:var(--B)">EN CONTRA · ${esc(nombreDe(d.B))}</span></div>`;

  // el botón principal: el mismo rótulo que en la pantalla (en la portada y la intro, el de la escena)
  if (P.boton !== $("cp")) $("cp").textContent = c.principal || "…";

  mostrar("sProp", !antes && f === "propuesta");
  if (!antes && f === "propuesta") pintarPropuesta(c);
  mostrar("sDebate", f === "abierta");
  if (f === "abierta") pintarDebate(c);
  mostrar("sVoto", f === "votando");
  if (f === "votando") {
    const v = c.votos || { n: 0, elegibles: 0 };
    $("votos").innerHTML = `${v.n} <small>de ${v.elegibles} ${v.elegibles === 1 ? "votó" : "han votado"}</small>`;
    $("votosBarra").style.width = `${v.elegibles ? Math.min(100, Math.round(100 * v.n / v.elegibles)) : 0}%`;
  }
  pintarInterruptores(c);
  mostrar("btnTerminar", f !== "fin");
  $("pie").innerHTML = `${c.ticker ? `<div>Pantalla: ${esc(c.ticker.replace(/^›\s*/, ""))}</div>` : ""}<div style="margin-top:6px">${esc(auth.currentUser?.email || "")} · <a href="#" id="salir" style="color:var(--dim)">salir</a></div>`;
  $("salir").onclick = e => { e.preventDefault(); signOut(auth).then(() => location.reload()); };
  habilitar(); pintarConexion(); pintarRelojes();
}

// Reconstruye un <select> solo si cambiaron sus opciones (así no se cierra en la mano del profesor).
function opciones(sel, lista) {
  const firma = JSON.stringify(lista);
  if (sel.dataset.firma === firma) return;
  const v = sel.value;
  sel.innerHTML = lista.map(([valor, texto]) => `<option value="${esc(valor)}">${esc(texto)}</option>`).join("");
  sel.dataset.firma = firma;
  if ([...sel.options].some(o => o.value === v)) sel.value = v;
}

function pintarPropuesta(c) {
  const p = c.propuesta;
  const estado = !p ? "La moderadora está preparando la próxima pregunta…"
    : p.estado === "pensando" ? "La moderadora está pensando la próxima pregunta…"
    : p.estado === "vacia" ? "La moderadora no pudo proponer una pregunta. Escribe la tuya o pide otra."
    : p.estado === "hechos" ? "Los duelos ya se jugaron. Para cerrar, 🏁 Terminar clase; o escribe otra pregunta y elige los grupos." : "";
  $("prEstado").textContent = estado; mostrar("prEstado", !!estado);
  $("prAviso").textContent = (p && p.aviso) || ""; mostrar("prAviso", !!(p && p.aviso));
  // una pregunta nueva de la pantalla reemplaza el borrador, salvo que el profesor esté escribiendo la suya
  const base = p ? p.pregunta || "" : "";
  if (base !== BORR.base) { BORR.base = base; if (!BORR.sucio) $("prTexto").value = base; }
  // la cuenta de «se publica en 15 s» no puede publicar por detrás lo que el profesor escribe aquí:
  // si el «detener» del foco se perdió (o la cuenta arrancó después), se vuelve a mandar
  if (p && p.cuentaHasta && (BORR.sucio || document.activeElement === $("prTexto")) && !P.t) mandar("detener");
  $("prPorQue").textContent = (p && p.porQue) || ""; mostrar("prPorQue", !!(p && p.porQue));
  const gs = (c.grupos || []).map(g => [String(g.n), `${g.nombre} (${g.gente})`]);
  for (const k of ["A", "B"]) {
    const sel = $("pr" + k);
    opciones(sel, gs);
    if (!P.t && document.activeElement !== sel && p && p[k]) sel.value = String(p[k]);
  }
}

function pintarDebate(c) {
  const ops = c.opciones || {};
  const conVoz = opcionActiva(ops, "voz");
  $("habla").innerHTML = !conVoz ? "" : (c.hablando || []).length
    ? `🎤 Habla: <b>${esc(c.hablando.join(", "))}</b>` : "Nadie tiene el micrófono.";
  mostrar("habla", conVoz);
  mostrar("bancos", !!c.banco);
  opciones($("selShock"), [["", "⚡ Shock: elige una noticia…"], ...(c.eventos || []).map(e => [e.id, e.titular.length > 70 ? e.titular.slice(0, 68) + "…" : e.titular])]);
}

// Cada 250 ms: el reloj de la fase, la cuenta de la propuesta y los dos bancos.
function pintarRelojes() {
  const c = C.dato;
  if (!c) return;
  const fin = { listo: c.finPrep, entrada: c.finEntrada, abierta: c.banco ? null : c.finRonda, votando: c.finVoto }[c.fase];
  const ms = restaDe(fin);
  const s = ms === null ? null : Math.ceil(ms / 1000);
  $("reloj").textContent = s === null ? "" : fmt(s);
  $("reloj").classList.toggle("urgente", s !== null && s <= 20 && ["abierta", "votando"].includes(c.fase));
  const cuenta = c.fase === "propuesta" && c.propuesta ? restaDe(c.propuesta.cuentaHasta) : null;
  $("prCuenta").textContent = cuenta ? `se publica en ${Math.ceil(cuenta / 1000)} s` : "";
  if (c.fase === "abierta" && C.foto) {
    const r = bancoRestante(C.foto, Date.now());
    const d = c.debate || {};
    $("bancos").innerHTML = ["A", "B"].map(k => {
      const seg = Math.ceil(r[k] / 1000);
      const cl = seg <= 0 ? "cero" : C.foto.corre && C.foto.corre[k] ? "corre" : "";
      return `<div class="banco ${cl}" style="--c:var(--${k})"><div class="n">${k === "A" ? "A FAVOR" : "EN CONTRA"} · ${esc(nombreDe(d[k]))}</div>
        <div class="t mono">${seg <= 0 ? "0:00" : fmt(seg)}</div></div>`;
    }).join("");
  }
}
setInterval(pintarRelojes, 250);

function pintarInterruptores(c) {
  const ops = c.opciones || {};
  if (!$("ops").children.length) {
    $("ops").innerHTML = INTERRUPTORES.map(([k, nombre, que]) =>
      `<label class="sw"><span>${esc(nombre)}<small>${esc(que)}</small></span><input type="checkbox" data-k="${k}"></label>`).join("")
      + `<label class="sw"><span>⛶ Escenario<small>el proyector sin botones, solo el debate</small></span><input type="checkbox" id="swEscenario"></label>`;
    for (const el of $("ops").querySelectorAll("input[data-k]"))
      el.onchange = () => mandar("opcion", { k: el.dataset.k, v: el.checked }, el);
    $("swEscenario").onchange = () => mandar("escenario", $("swEscenario").checked, $("swEscenario"));
  }
  if (P.t) return;                                  // lo que el profesor acaba de tocar no se pisa antes del ack
  for (const el of $("ops").querySelectorAll("input[data-k]")) el.checked = opcionActiva(ops, el.dataset.k);
  $("swEscenario").checked = !!c.escenario;
}

/* ---------- los botones ---------- */
function publicarDesdeAqui(boton) {
  const pregunta = $("prTexto").value.trim(), A = +$("prA").value, B = +$("prB").value;
  if (!pregunta) { nota("Escribe una pregunta o pide otra a la moderadora."); return; }
  if (!A || !B || A === B) { nota("Elige dos grupos distintos: uno A FAVOR y otro EN CONTRA."); return; }
  BORR.sucio = false;
  mandar("publicar", { pregunta, A, B }, boton);
}
$("cp").onclick = () => {
  const c = C.dato;
  if (!c) return;
  if (c.etapa === "portada" || c.etapa === "intro") mandar("etapa", null, $("cp"));
  // en la propuesta el botón publica lo que se ve AQUÍ (la pregunta pudo editarse en el celular)
  else if (c.fase === "propuesta") publicarDesdeAqui($("cp"));
  else mandar("principal", null, $("cp"));
};
$("prPublicar").onclick = () => publicarDesdeAqui($("prPublicar"));
$("prOtra").onclick = () => { BORR.sucio = false; mandar("otra", null, $("prOtra")); };
$("prLados").onclick = () => mandar("lados", null, $("prLados"));
for (const k of ["A", "B"]) $("pr" + k).onchange = () => mandar("grupos", { A: +$("prA").value, B: +$("prB").value }, $("pr" + k));
$("prTexto").oninput = () => {
  BORR.sucio = true;
  if (C.dato && C.dato.propuesta && C.dato.propuesta.cuentaHasta && !P.t) mandar("detener");
};
// escribir la propia detiene la cuenta de «se publica en 15 s», como tocar la propuesta en la pantalla
$("prTexto").onfocus = () => { if (C.dato && C.dato.propuesta && C.dato.propuesta.cuentaHasta) mandar("detener"); };
$("btnMas30").onclick = () => mandar("mas30", null, $("btnMas30"));
$("btnModera").onclick = () => mandar("moderadora", null, $("btnModera"));
$("selShock").onchange = habilitar;
$("btnShock").onclick = () => {
  const id = $("selShock").value, ev = (C.dato.eventos || []).find(e => e.id === id);
  if (!ev || !confirm(`¿Lanzar esta noticia al debate?\n\n${ev.titular}`)) return;
  $("selShock").value = "";
  mandar("shock", id, $("btnShock"));
};
$("btnTerminar").onclick = () => {
  if (!confirm("¿Terminar la clase? Si hay un debate en curso, no cuenta para el ranking. Los teléfonos pasan al feedback.")) return;
  mandar("terminar", null, $("btnTerminar"));
};

// El celular del profesor no se apaga en plena clase (si el navegador lo permite). Se pide al
// volver a la pestaña y en cada toque mientras no se tenga: si el primer intento falla (sin
// gesto, batería baja), el próximo toque lo reintenta.
let candado = null, pidiendoCandado = false;
async function pantallaEncendida() {
  if (candado || pidiendoCandado || !navigator.wakeLock || document.visibilityState !== "visible") return;
  pidiendoCandado = true;
  try {
    const c = await navigator.wakeLock.request("screen");
    candado = c;
    c.addEventListener("release", () => { if (candado === c) candado = null; }, { once: true });
  } catch (e) { /* sin permiso: no pasa nada, se reintenta con el próximo toque */ }
  finally { pidiendoCandado = false; }
}
document.addEventListener("visibilitychange", pantallaEncendida);
document.addEventListener("pointerdown", pantallaEncendida);

/* ---------- entrar ---------- */
function pedirEntrar(texto, conGoogle = true, conCodigo = false) {
  mostrar("vPanel", false); mostrar("vEntrar", true);
  if (texto) $("entrarTxt").textContent = texto;
  mostrar("btnGoogle", conGoogle); mostrar("vCodigo", conCodigo);
}
$("btnGoogle").onclick = () => signInWithPopup(auth, google)
  .catch(e => error("No se pudo entrar: " + e.code + (e.code === "auth/popup-blocked" ? " — permite ventanas emergentes para este sitio." : "")));
$("btnCodigo").onclick = () => {
  const c = $("inCodigo").value.trim().toUpperCase();
  if (c.length === 4) location.search = `?sala=${c}`;
};
$("inCodigo").onkeydown = e => { if (e.key === "Enter") $("btnCodigo").click(); };

// onAuthStateChanged puede avisar dos veces por la misma cuenta (al refrescar el token): una sola
// suscripción por cuenta.
let conectadoA = null;
async function conectar(user) {
  if (conectadoA === user.uid) return;
  conectadoA = user.uid;
  $("sala").textContent = CODIGO;
  let pub;
  // la red del aula falla al entrar: se reintenta solo, cada vez más espaciado (hasta 10 s)
  for (let i = 1; !pub; i++) {
    try { pub = await getDoc(doc(db, "salas", CODIGO)); }
    catch (e) {
      if (e.code === "permission-denied") { error("No se pudo leer la sala: " + e.code); return; }
      error(`No se pudo leer la sala (${e.code}): reintentando…`);
      await new Promise(r => setTimeout(r, Math.min(10000, 1500 * i)));
      if (conectadoA !== user.uid) return;
    }
  }
  if (C.error) error("");
  if (!pub.exists()) { error(`La sala ${CODIGO} no existe.`); pedirEntrar("Revisa el código: está en la barra de la sala, en el proyector.", false, true); return; }
  if (pub.data().profeUid !== user.uid) {
    error(`Esta cuenta (${user.email}) no es la del profesor de la sala.`);
    pedirEntrar("Entra con la cuenta con que abriste la sala en el proyector.", false);
    $("btnGoogle").textContent = "Cambiar de cuenta"; mostrar("btnGoogle", true);
    $("btnGoogle").onclick = () => signOut(auth).then(() => signInWithPopup(auth, google)).catch(e => error("No se pudo entrar: " + e.code));
    return;
  }
  espera("Conectando con la pantalla…");
  onSnapshot(doc(db, "salas", CODIGO, "privado", "control"), { includeMetadataChanges: true }, snap => {
    C.cache = snap.metadata.fromCache;
    if (!snap.exists()) {
      if (!C.cache) { mostrar("vPanel", false); espera(`Esperando a la pantalla: abre la sala ${CODIGO} en el proyector.`); }
      pintarConexion(); return;
    }
    const d = snap.data();
    if (C.dato && d.t === C.dato.t) { pintarConexion(); return; }         // solo cambió la conexión
    C.dato = d; C.recibido = Date.now();
    // bancoRestante (ajedrez.js) mide desde que ESTE aparato recibió la foto, no desde el reloj del proyector
    C.foto = d.banco ? { ...d.banco, t: C.recibido } : null;
    if (!C.cache && C.noResponde) { C.noResponde = false; nota(""); }
    if (P.enviada && d.ignorada === P.enviada) {
      // la pantalla se recargó con la orden ya escrita: la vio, pero no la hizo
      if (P.t) soltar();
      P.enviada = 0;
      nota("La pantalla se recargó: vuelve a tocar.", true);
    } else if (P.t && (d.ack || 0) >= P.t) {
      // la pantalla la atendió. Si la fase no cambió, lo que dijo el ticker es la respuesta
      // («+30 s.», «Orden vieja del control: no se hizo.», un error): se copia aquí
      const mismaFase = d.fase === P.fase && (d.etapa ?? null) === P.etapa;
      const tk = String(d.ticker || "").replace(/^›\s*/, ""), antes = String(P.ticker || "").replace(/^›\s*/, "");
      const conBoton = !!P.boton;
      soltar(); P.enviada = 0;
      if (mismaFase && conBoton && tk && tk !== antes) nota(tk);
    } else if (P.enviada && (d.ack || 0) >= P.enviada) P.enviada = 0;
    pintar();
  }, e => error(e.code === "permission-denied" ? "Esta cuenta no es la del profesor de la sala." : "Se perdió la conexión con la sala: " + e.code));
}

if (!HAY_FIREBASE) error("Este TRIBUNA no tiene un proyecto de Firebase configurado: el control necesita una sala en línea.");
else onAuthStateChanged(auth, async user => {
  if (!user) { pedirEntrar("", true, false); return; }
  if (user.isAnonymous || !user.email) { await signOut(auth); return; }
  if (!CODIGO) { pedirEntrar("¿Qué sala diriges? El código está en la barra de la sala, en el proyector.", false, true); return; }
  conectar(user);
});
