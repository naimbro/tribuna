/* =====================================================================
   TRIBUNA — la conversación y sus dos moderadores de IA.

   El debate es UNA conversación, como un grupo de WhatsApp: A FAVOR a la izquierda, EN CONTRA
   a la derecha, los moderadores al centro. Todos leen todo en vivo.

   🎙 MODERADORA: interviene durante el tramo. Pide profundizar, verifica que el alumno sepa de
      dónde sale lo que dice, le pasa la palabra a quien no ha hablado, equilibra bancadas.
   ⚖ RELATOR: al cerrar cada tramo resume las posiciones, dice a los jueces (humanos y
      digitales) qué revisar y con qué criterios, y pide el voto. Sus indicaciones llegan al
      público en los teléfonos y al jurado.

   Solo la pantalla del profesor corre a los moderadores (usa el mismo motor LLM del jurado; sin
   motor, una versión simple con plantillas). Se carga ANTES de app.js: aquí solo hay funciones;
   el estado vive en S (app.js).
   ===================================================================== */

const MOD_NOMBRE = "Moderadora", REL_NOMBRE = "Relator";

/* ---------- mensajes ---------- */
// m = { tipo: "alumno"|"mod"|"relator"|"sistema"|"resultado", nombre, equipo?, uid?, email?, texto, datos? }
function postChat(m) {
  m.id = m.id || ("m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
  m.t = m.t || Date.now();
  m.ronda = m.ronda ?? S.ronda;
  m.debate = m.debate ?? (S.debate ? S.debate.n : 0);
  m.tramo = m.tramo ?? S.tramo;
  if (typeof window.chatRemoto === "function") return window.chatRemoto(m);   // en línea: Firestore
  recibirChat([m]);
}

// Llega uno o varios mensajes (local: al publicar; en línea: desde Firestore).
function recibirChat(lista, inicial = false) {
  const nuevos = [];
  for (const m of lista) {
    const i = S.chat.findIndex(x => x.id === m.id);
    if (i >= 0) S.chat[i] = m; else { S.chat.push(m); nuevos.push(m); }
  }
  S.chat.sort((a, b) => a.t - b.t);
  pintarFeed();
  if (inicial) return;
  for (const m of nuevos) {
    if (m.tipo === "alumno") {
      sonar("pop");
      if (m.ronda === S.ronda && S.fase === "abierta") { S.mod.nuevos++; S.mod.ultimoAlumno = Date.now(); }
    } else if (m.tipo === "mod") sonar("nota", 14);
  }
  if (typeof window.alCambiarChat === "function") window.alCambiarChat();
}

/* ---------- pintar la conversación ---------- */
const conMenciones = t => esc(t).replace(/@([A-Za-zÁÉÍÓÚÑáéíóúñü][\wÁÉÍÓÚÑáéíóúñü.-]*(?:\s[A-ZÁÉÍÓÚÑ][\wáéíóúñü.-]*)?)/g, '<b class="mencion">@$1</b>');

function burbuja(m) {
  const hora = new Date(m.t).toTimeString().slice(0, 5);
  if (m.tipo === "sistema") return `<div class="msg sys">${esc(m.texto)}</div>`;
  if (m.tipo === "noticia") return `<div class="msg noticia"><div class="who">📰 Última hora<span class="hora">${hora}</span></div><div class="tx">${esc(m.texto)}</div></div>`;
  if (m.tipo === "mod") return `<div class="msg mod"><div class="who">🎙 ${MOD_NOMBRE}<span class="hora">${hora}</span></div><div class="tx">${conMenciones(m.texto)}</div></div>`;
  if (m.tipo === "relator") {
    const d = m.datos || {};
    return `<div class="msg rel"><div class="who">📣 ${REL_NOMBRE} · llamado a votar<span class="hora">${hora}</span></div>
      ${d.resumenA ? `<div class="tx"><b style="color:${EQUIPOS.A.color}">${EQUIPOS.A.nombre}:</b> ${esc(d.resumenA)}</div>` : ""}
      ${d.resumenB ? `<div class="tx"><b style="color:${EQUIPOS.B.color}">${EQUIPOS.B.nombre}:</b> ${esc(d.resumenB)}</div>` : ""}
      ${d.disputa ? `<div class="tx"><b>En disputa:</b> ${esc(d.disputa)}</div>` : ""}
      ${d.revisar?.length ? `<div class="tx"><b>Antes de votar, revisen:</b><ul>${d.revisar.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${d.criterios?.length ? `<div class="tx"><b>Criterios:</b><ul>${d.criterios.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${!d.resumenA && m.texto ? `<div class="tx">${esc(m.texto)}</div>` : ""}
      <div class="tx pedido">🗳 Público: mueve tu posición. El jurado está evaluando…</div></div>`;
  }
  if (m.tipo === "resultado") {
    const d = m.datos || {}, e = EQUIPOS[m.equipo];
    const cls = d.deltaVotos > 0 ? "pos" : d.deltaVotos < 0 ? "neg" : "cero";
    return `<div class="msg res" style="--c:${e.color}">
      <div class="res-head"><span>${e.bandera}</span><b>${e.nombre}</b>
        <span class="rol">${esc(d.rondaNombre || "")} · ${d.n} participante${d.n === 1 ? "" : "s"} · jurado <b style="color:${colorRigor(d.rigorMedio)}">${(+d.rigorMedio).toFixed(1)}</b>/20</span>
        ${typeof d.deltaVotos === "number" ? `<span class="delta ${cls}">${conSigno(d.deltaVotos)} votos</span>` : ""}</div>
      <div class="res-alumnos">${(d.alumnos || []).map(a => `<div class="ra"><b>${esc(a.autor)}</b>
        <span class="rg" style="color:${colorRigor(a.total)}">${(+a.total).toFixed(1)}</span>
        ${a.nota ? `<span class="nt">⚖ ${esc(a.nota)}</span>` : ""}
        ${(a.banderas || []).map(b => `<span class="chip bandera">⚑ ${esc(b)}</span>`).join("")}</div>`).join("")}</div>
      ${(d.dicen || []).length ? `<div class="dicen">${d.dicen.map(r => {
        const p = AUDIENCIA.find(x => x.id === r.id);
        return `<div class="dice"><span>${p ? p.emoji : ""}</span><b>${p ? p.nombre.split(" ")[0] : ""}</b>
          <span style="color:${r.delta > 0.4 ? "var(--A)" : r.delta < -0.4 ? "var(--B)" : "var(--dim2)"}">${r.delta > 0 ? "▲" : r.delta < 0 ? "▼" : "·"}${Math.abs(r.delta).toFixed(1)}</span>
          <i>“${r.comentario}”</i></div>`; }).join("")}</div>` : ""}
    </div>`;
  }
  // alumno
  const e = EQUIPOS[m.equipo] || { color: "var(--dim)", nombre: "" };
  return `<div class="msg ${m.equipo}" style="--c:${e.color}"><div class="who">${esc(m.nombre || "?")}<span class="hora">${hora}</span></div><div class="tx">${conMenciones(m.texto)}</div></div>`;
}

/* ---------- quién está en la conversación ---------- */
function participantes() {
  const out = new Map();
  const roster = typeof window.rosterRemoto === "function" ? window.rosterRemoto() : [];
  for (const r of roster) out.set(r.nombre, { nombre: r.nombre, equipo: r.equipo, n: 0 });
  // solo quienes escriben en el debate en curso (en otro debate su grupo pudo tener otro lado)
  for (const m of S.chat) if (m.tipo === "alumno" && (m.equipo === "A" || m.equipo === "B") && (!S.debate || m.debate === S.debate.n)) {
    const p = out.get(m.nombre) || { nombre: m.nombre, equipo: m.equipo, n: 0 };
    if (m.ronda === S.ronda) p.n++;
    out.set(m.nombre, p);
  }
  return [...out.values()];
}

// La conversación como texto para los prompts. Sin los mensajes de resultado (son del juego).
function transcripcionChat(filtro = () => true, max = 40) {
  return S.chat.filter(m => ["alumno", "mod", "relator"].includes(m.tipo) && filtro(m)).slice(-max).map(m =>
    m.tipo === "mod" ? `[🎙 ${MOD_NOMBRE}] ${m.texto}`
    : m.tipo === "relator" ? `[⚖ ${REL_NOMBRE}] ${m.texto}`
    : `[${EQUIPOS[m.equipo]?.nombre || m.equipo} · ${m.nombre}] ${m.texto}`).join("\n");
}

/* ---------- 🎙 la moderadora ---------- */
function abrirTramoChat() {
  const R = tramoActual();
  S.mod = { ultimo: Date.now(), nuevos: 0, enCurso: false, ultimoAlumno: 0, abre: Date.now() };
  const ps = participantes();
  const a = ps.filter(p => p.equipo === "A").map(p => "@" + p.nombre), b = ps.filter(p => p.equipo === "B").map(p => "@" + p.nombre);
  const quien = (arr, def) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : def;
  const d = S.debate;
  if (d && S.tramo === 0) {
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto:
      `Debate ${d.n}: «${d.pregunta}». Grupo ${d.A} defiende ${EQUIPOS.A.nombre}; Grupo ${d.B}, ${EQUIPOS.B.nombre}. ` +
      `${quien(a, "Grupo " + d.A)}, ¿cuál es la tesis de tu grupo? Y ${quien(b, "Grupo " + d.B)}, la del suyo. Tienen ${Math.round(R.seg / 60)} minutos.` });
  } else {
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto:
      `Réplica. ${quien(b, "Grupo " + (d ? d.B : ""))} y ${quien(a, "Grupo " + (d ? d.A : ""))}: respondan lo más fuerte que dijo el otro grupo. Conceder un punto válido suma.` });
  }
}

// Se llama cada pocos segundos y cuando llega un mensaje. Decide si la moderadora interviene.
function moderadorTalvez(forzar = false) {
  const M = S.mod;
  if (!M || M.enCurso || S.fase !== "abierta") return;
  const ahora = Date.now();
  const hayMensajes = S.chat.some(m => m.tipo === "alumno" && m.ronda === S.ronda);
  const pausa = ahora - M.ultimo;
  const toca = forzar
    || (pausa > 25000 && M.nuevos >= 3)                                   // la conversación avanzó
    || (pausa > 30000 && M.nuevos >= 1 && ahora - M.ultimoAlumno > 15000)   // alguien dijo algo y quedó en el aire
    || (pausa > 45000 && !hayMensajes && ahora - M.abre > 40000);          // silencio: nadie ha escrito
  if (!toca) return;
  M.enCurso = true; M.nuevos = 0;
  intervenirModerador().finally(() => { M.enCurso = false; M.ultimo = Date.now(); });
}

function promptModerador() {
  const R = tramoActual();
  const ps = participantes();
  const lista = k => ps.filter(p => p.equipo === k).map(p => `${p.nombre} (${p.n} mensajes en este tramo)`).join(", ") || "(nadie aún)";
  return `Eres la moderadora de un debate universitario en vivo, en un chat grupal. Curso: "${SESION.curso}", semana ${SESION.semana}: ${SESION.tema}.
MOCIÓN: "${mocionActual()}". ${ladoNombre("A")} la defiende; ${ladoNombre("B")} la rechaza.
TRAMO ACTUAL: ${R.nombre}. Pauta: ${R.pauta}

PARTICIPANTES
- ${ladoNombre("A")}: ${lista("A")}
- ${ladoNombre("B")}: ${lista("B")}

CONCEPTOS Y LECTURAS DEL CURSO (SOLO PARA TI, para juzgar si lo que dicen está bien; NO los nombres en tu intervención si el participante no los nombró antes):
${CONCEPTOS.map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n")}

CONVERSACIÓN (lo último al final):
${transcripcionChat(m => true, 30) || "(todavía nadie ha escrito)"}

TU TAREA: escribe UNA intervención breve que haga avanzar el debate. Elige lo más útil ahora:
- "profundizar": pídele a quien hizo una afirmación gruesa que la desarrolle o la haga concreta.
- "verificar": pregúntale de qué lectura o dato sale lo que dijo, o pídele que explique un concepto que nombró, para ver si de verdad lo sabe.
- "pasar_pelota": dale la palabra a alguien que ha hablado poco o nada (prioriza a quien tiene 0 mensajes), idealmente respondiendo a algo concreto que dijo el otro lado.
- "contrastar": pon a una bancada frente al argumento más fuerte de la otra que todavía no ha respondido.
Reglas: eres neutral, no opinas sobre la moción ni das la respuesta; NUNCA le sugieras a un participante qué concepto, autor, lectura o dato usar (la lista de arriba es para que TÚ verifiques, no para soplarles): pregúntale de dónde lo saca o qué significa lo que dijo, tu trabajo es comprobar que sabe, no enseñarle; nombra a las personas con @Nombre (exactamente como aparecen arriba); máximo 45 palabras; una sola pregunta o encargo; español de Chile, tono de profesora cercana pero exigente; no repitas una pregunta que ya hiciste; sin groserías.

Antes de responder, revisa tu mensaje: si contiene el nombre de un concepto, hallazgo, autor o lectura que la persona a la que le hablas no escribió antes, reescríbelo sin eso (por ejemplo, en vez de "¿qué muestra el Hallazgo 1?", pregunta "¿en qué lectura o dato te basas?").

Responde SOLO un JSON: {"tipo": "profundizar"|"verificar"|"pasar_pelota"|"contrastar", "mensaje": "tu intervención"}`;
}

async function intervenirModerador() {
  let texto = null;
  if (S.motor.activo) {
    try {
      const j = jsonDe(await pedirLLM(promptModerador(), "jurado"));
      if (typeof j.mensaje === "string" && j.mensaje.trim() && limpiaFrase(j.mensaje)) texto = j.mensaje.trim().slice(0, 400);
    } catch (e) { console.warn("moderadora:", e); }
  }
  if (!texto) texto = moderadorSimple();
  if (texto && S.fase === "abierta") postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto });
}

// Sin motor LLM: plantillas. Pasa la palabra a quien menos ha hablado y pide la fuente de lo último.
function moderadorSimple() {
  const ps = participantes();
  const ult = [...S.chat].reverse().find(m => m.tipo === "alumno" && m.ronda === S.ronda);
  const callado = [...ps].sort((a, b) => a.n - b.n)[0];
  if (ult && !detectarFuentes(ult.texto).length)
    return `@${ult.nombre}, ¿de qué lectura sale eso? Nombra el autor o el dato.${callado && callado.nombre !== ult.nombre ? ` Y @${callado.nombre}, ¿cómo le responde tu bancada?` : ""}`;
  if (callado) return `@${callado.nombre}, todavía no te leemos en este tramo. ¿Qué agregarías a lo que dijo ${ult ? "@" + ult.nombre : "el otro lado"}?`;
  return `¿Quién abre? ${EQUIPOS.A.nombre} y ${EQUIPOS.B.nombre}, necesitamos sus tesis.`;
}

/* ---------- ⚖ el relator ---------- */
async function relatorPideVoto() {
  const R = tramoActual();
  const delTramo = m => S.debate ? m.debate === S.debate.n : m.ronda === S.ronda;
  let d = null;
  if (S.motor.activo) {
    const prompt = `Eres el relator de un debate universitario en vivo. Curso: "${SESION.curso}", semana ${SESION.semana}.
MOCIÓN: "${mocionActual()}". ${ladoNombre("A")} la defiende; ${ladoNombre("B")} la rechaza. Acaba de terminar el debate ${S.debate ? S.debate.n : ""}: «${mocionActual()}» (apertura y réplica).

LO QUE SE DIJO EN ESTE TRAMO:
${transcripcionChat(delTramo, 60) || "(nadie escribió)"}

${S.ronda > 0 ? `TRAMOS ANTERIORES (resumen de lo que ya dijiste):
${S.chat.filter(m => m.tipo === "relator" && m.ronda < S.ronda).map(m => m.texto).join("\n") || "—"}
` : ""}
RÚBRICA DEL JURADO: ${RUBRICA.map(r => r.nombre).join(", ")}.

TU TAREA: antes de que voten los jueces —un público de estudiantes y un jurado—, resume con justicia la posición de cada bancada en este tramo, nombra el punto en disputa y diles qué revisar y con qué criterios antes de votar. Eres neutral: no digas quién va ganando. En "revisar" apunta a cosas concretas que se dijeron (por ejemplo, si una afirmación tuvo respaldo o si alguien respondió una objeción). En "criterios", cómo distinguir un buen argumento de uno que solo suena bien. Sin groserías.

Responde SOLO un JSON: {"resumenA": "máx. 35 palabras", "resumenB": "máx. 35 palabras", "disputa": "máx. 25 palabras", "revisar": ["2 o 3 cosas concretas"], "criterios": ["2 o 3 criterios"]}`;
    try {
      const j = jsonDe(await pedirLLM(prompt, "jurado"));
      if (j.resumenA || j.resumenB) d = {
        resumenA: String(j.resumenA || "").slice(0, 300), resumenB: String(j.resumenB || "").slice(0, 300),
        disputa: String(j.disputa || "").slice(0, 200),
        revisar: (j.revisar || []).slice(0, 3).map(x => String(x).slice(0, 200)),
        criterios: (j.criterios || []).slice(0, 3).map(x => String(x).slice(0, 200))
      };
    } catch (e) { console.warn("relator:", e); }
  }
  if (!d) {
    const n = k => S.chat.filter(m => m.tipo === "alumno" && m.equipo === k && delTramo(m)).length;
    d = { resumenA: `${n("A")} mensajes en este tramo.`, resumenB: `${n("B")} mensajes en este tramo.`, disputa: mocionActual(),
          revisar: ["Si las afirmaciones empíricas citaron alguna lectura del curso.", "Si cada bancada respondió el argumento más fuerte del otro lado."],
          criterios: ["Evidencia atribuida por sobre el tono.", "Reconocer lo válido del rival suma."] };
  }
  const texto = `${EQUIPOS.A.nombre}: ${d.resumenA} | ${EQUIPOS.B.nombre}: ${d.resumenB} | En disputa: ${d.disputa} | Revisen: ${d.revisar.join("; ")} | Criterios: ${d.criterios.join("; ")}`;
  postChat({ tipo: "relator", nombre: REL_NOMBRE, texto, datos: d });
  sonar("campana");
  return d;
}

/* ---------- el compositor del profesor (escribe por una bancada o simula alumnos) ---------- */
function prepararCompositor() {
  let banca = "A";
  const pinta = () => ["A", "B"].forEach(k => $("chatBanca" + k).classList.toggle("on", banca === k));
  ["A", "B"].forEach(k => $("chatBanca" + k).onclick = () => { banca = k; pinta(); $("chatTx").focus(); });
  pinta();
  const enviar = () => {
    const t = $("chatTx").value.trim();
    if (!t) return;
    if (S.fase !== "abierta") { tick("Publica una pregunta y abre el tramo para que la conversación cuente."); return; }
    // "@Nombre: texto" simula a un alumno del grupo que está en el lado elegido
    const grupo = S.debate ? S.debate[banca] : null;
    for (const p of partirCaja(t, "(profesor)"))
      postChat({ tipo: "alumno", nombre: p.autor, equipo: banca, grupo, uid: "sim:" + p.autor, texto: p.texto });
    $("chatTx").value = "";
  };
  $("chatEnviar").onclick = enviar;
  $("chatTx").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
  $("btnModerar").onclick = () => { if (S.fase === "abierta") moderadorTalvez(true); else tick("La moderadora interviene con el tramo abierto."); };
  $("btnMasMin").onclick = () => { if (S.fase === "abierta") { S.finRonda += 60000; tick("+1 minuto."); } };
  setInterval(() => moderadorTalvez(false), 6000);
}
