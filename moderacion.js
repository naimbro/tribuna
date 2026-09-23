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
      if (m.ronda === S.ronda && S.fase === "abierta" && S.mod) {
        // le escribieron a ella con @Moderadora: responde de inmediato a esa persona
        if (/@moderadora\b/i.test(norm(m.texto))) { S.mod.pregunta = m; moderadorTalvez(true); }
      }
    } else if (m.tipo === "mod") sonar("nota", 14);
  }
  if (typeof window.alCambiarChat === "function") window.alCambiarChat();
}

/* ---------- pintar la conversación ---------- */
const conMenciones = t => esc(t).replace(/@([Gg]rupo \d+|[A-Za-zÁÉÍÓÚÑáéíóúñü][\wÁÉÍÓÚÑáéíóúñü.-]*(?:\s[A-ZÁÉÍÓÚÑ][\wáéíóúñü.-]*)?)/g, '<b class="mencion">@$1</b>');

function burbuja(m) {
  const hora = new Date(m.t).toTimeString().slice(0, 5);
  if (m.tipo === "sistema") return `<div class="msg sys">${esc(m.texto)}</div>`;
  if (m.tipo === "noticia") return `<div class="msg noticia"><div class="who">📰 Última hora<span class="hora">${hora}</span></div><div class="tx">${esc(m.texto)}</div></div>`;
  if (m.tipo === "mod") return `<div class="msg mod ${m.datos && m.datos.tribuna ? "trib" : ""}"><div class="who">🎙 ${MOD_NOMBRE}${m.datos && m.datos.tribuna ? " · ✋ la tribuna" : ""}<span class="hora">${hora}</span></div><div class="tx">${conMenciones(m.texto)}</div></div>`;
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
  return `<div class="msg ${m.equipo}" style="--c:${e.color}"><div class="who">${esc(conGrupo(m.nombre || "?", grupoDeMensaje(m)))}<span class="hora">${hora}</span></div><div class="tx">${conMenciones(m.texto)}</div>${chipsReacciones(m.id)}</div>`;
}

// 🔥 🤔 🤝 que le puso el público a un mensaje (publico.js); nada si nadie reaccionó.
function chipsReacciones(id) {
  const c = S.reacciones && S.reacciones[id];
  if (!c) return "";
  const xs = PUB.REACCIONES.filter(r => c[r.id]).map(r => `<span title="${r.nombre}">${r.emoji} ${c[r.id]}</span>`);
  return xs.length ? `<div class="rx">${xs.join("")}</div>` : "";
}

// El grupo de quien escribió: viene en el mensaje, o se deduce del lado que le tocó en ese debate.
function grupoDeMensaje(m) {
  if (m.grupo) return m.grupo;
  const d = m.debate && S.clase && S.clase.debates[m.debate - 1];
  return d && (m.equipo === "A" || m.equipo === "B") ? d[m.equipo] : 0;
}

/* ---------- quién está en la conversación ---------- */
function participantes() {
  const out = new Map();
  const roster = typeof window.rosterRemoto === "function" ? window.rosterRemoto() : [];
  for (const r of roster) out.set(r.nombre, { nombre: r.nombre, equipo: r.equipo, grupo: r.grupo || 0, n: 0 });
  // solo quienes escriben en el debate en curso (en otro debate su grupo pudo tener otro lado)
  for (const m of S.chat) if (m.tipo === "alumno" && (m.equipo === "A" || m.equipo === "B") && (!S.debate || m.debate === S.debate.n)) {
    const p = out.get(m.nombre) || { nombre: m.nombre, equipo: m.equipo, grupo: grupoDeMensaje(m), n: 0 };
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
// El ritmo (cuándo entra, a quién nombra, qué no repetir) está en ritmo.js y se prueba con Node.
// Aquí se arma el prompt y se publica.

// Los mensajes del debate (o del tramo, en modo local) en curso, en orden.
const delDebateEnCurso = () => S.chat.filter(m => S.debate ? m.debate === S.debate.n : m.ronda === S.ronda);
function estadoTramo() {
  const ps = participantes();
  cargarApellidos(ps.map(p => p.nombre));
  return leerTramo(delDebateEnCurso(), ps, Date.now());
}
// Cómo se nombra a un grupo: «@Grupo 3»; sin rotación, el nombre de la bancada.
const grupoDe = k => S.debate ? `@Grupo ${S.debate[k]}` : ladoNombre(k);

function abrirTramoChat() {
  const R = tramoActual();
  S.mod = { enCurso: false, abre: Date.now(), pregunta: null };
  // Un solo tramo por debate: la posición de entrada y de ahí libre. Lo que estructura la
  // conversación es ella, interviniendo, no un segundo turno con nombre propio. Llama a los
  // grupos, no a una persona: quien quiera responde por su grupo.
  const d = S.debate;
  postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto: d
    ? `Debate ${d.n}: «${d.pregunta}». Grupo ${d.A} defiende ${EQUIPOS.A.nombre}; Grupo ${d.B}, ${EQUIPOS.B.nombre}. ` +
      `@Grupo ${d.A} y @Grupo ${d.B}: su posición en una frase, cualquiera del grupo, y de ahí seguimos sueltos. Tienen ${Math.round(R.seg / 60)} minutos.`
    : `«${mocionActual()}». ${ladoNombre("A")} y ${ladoNombre("B")}: su posición en una frase, y de ahí seguimos sueltos. Tienen ${Math.round(R.seg / 60)} minutos.` });
}

// Se llama cada pocos segundos y cuando llega un mensaje. Decide si la moderadora interviene.
function moderadorTalvez(forzar = false) {
  const M = S.mod;
  if (!M || M.enCurso || S.fase !== "abierta") return;
  // la tribuna: a los 3 minutos, si hay preguntas del público y no salió ninguna, entra una
  // (una vez por minuto como mucho: si la moderadora las descarta todas no se insiste en bucle)
  const T = estadoTribuna();
  if (T.forzar && Date.now() - (M.tribunaForzadaEn || 0) > 60000) { M.tribunaForzadaEn = Date.now(); forzar = true; }
  if (!debeIntervenir(estadoTramo(), { ahora: Date.now(), abre: M.abre, forzar }).toca) return;
  M.enCurso = true;
  intervenirModerador(forzar).finally(() => { M.enCurso = false; });
}

/* ---------- ✋ la tribuna (publico.js): lo que pide el público desde el teléfono ---------- */
// Las preguntas del público que siguen en la fila y si toca ofrecerlas o forzar una.
function estadoTribuna() {
  const reg = S.debate && S.clase.debates[S.debate.n - 1];
  if (!reg || !S.mod) return { pendientes: [], ofrecer: false, forzar: false };
  const pendientes = preguntasPendientes(S.preguntasPub, reg.tribuna).filter(p => limpiaFrase(p.texto));
  const seg = (Date.now() - S.mod.abre) / 1000;
  return { pendientes, ...turnoTribuna({ seg, emitidas: (reg.tribuna || []).length, pendientes: pendientes.length }) };
}
// La moderadora lanza la pregunta elegida con el nombre de quien la hizo: +1 punto de oráculo.
function lanzarPreguntaTribuna(p, destino) {
  const reg = S.debate && S.clase.debates[S.debate.n - 1];
  if (!reg || !p) return;
  (reg.tribuna = reg.tribuna || []).push({ uid: p.uid, nombre: p.nombre || "", grupo: p.grupo || 0, texto: String(p.texto).slice(0, PUB.PREGUNTA_MAX) });
  S.clase.oraculos = sumarPuntoPregunta(S.clase.oraculos, p);
  postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto: textoTribuna(p, destino), datos: { tribuna: "pregunta", uid: p.uid } });
  if (typeof pintarColumna === "function") pintarColumna();
  if (typeof window.publicarEstado === "function") window.publicarEstado();
}
// Un mensaje juntó suficientes 🤔: la moderadora pide la fuente en nombre de la tribuna. Es una
// plantilla fija a propósito: rápida, y dice de quién viene la pregunta.
function pedirFuenteTribuna(msgId) {
  const m = S.chat.find(x => x.id === msgId);
  if (!m || S.fase !== "abierta" || !S.mod) return;
  const cita = String(m.texto || "").replace(/\s+/g, " ").trim();
  const corta = cita.length > 70 ? cita.slice(0, 70).replace(/\s+\S*$/, "") + "…" : cita;
  postChat({ tipo: "mod", nombre: MOD_NOMBRE, datos: { tribuna: "fuente", msg: msgId },
    texto: `🤔 @${String(m.nombre || "").split(" ")[0]}, la tribuna pregunta de dónde sale esto: «${corta}». Un autor o un documento basta.` });
}

function promptModerador(est) {
  const R = tramoActual();
  const ahora = Date.now(), abre = S.mod ? S.mod.abre : ahora;
  const minutos = Math.max(0, Math.round((ahora - abre) / 60000));
  const puedeNombrar = nombrables(est, { ahora, abre }).map(p => p.nombre);
  const fila = p => `${p.nombre} (${p.n} mensaje${p.n === 1 ? "" : "s"}${p.ausente ? "; PARECE NO ESTAR: no la nombres" : p.sinResponder ? `; la llamaste ${p.sinResponder} vez sin respuesta` : ""}${p.verificado ? "; ya le preguntaste de dónde saca algo" : ""})`;
  const lista = k => est.alumnos.filter(p => p.equipo === k).map(fila).join(", ") || "(nadie aún)";
  const d = S.debate;
  return `Eres la moderadora de un debate universitario en vivo, en un chat grupal. Curso: "${SESION.curso}", semana ${SESION.semana}: ${SESION.tema}.
MOCIÓN: "${mocionActual()}". ${d ? `Grupo ${d.A}` : ladoNombre("A")} la defiende (${EQUIPOS.A.nombre}); ${d ? `Grupo ${d.B}` : ladoNombre("B")} la rechaza (${EQUIPOS.B.nombre}).
TRAMO: ${R.nombre}. Van ${minutos} de ${Math.round(R.seg / 60)} minutos. Pauta: ${R.pauta}

QUIÉNES DEBATEN
- ${d ? `Grupo ${d.A}` : ladoNombre("A")}: ${lista("A")}
- ${d ? `Grupo ${d.B}` : ladoNombre("B")}: ${lista("B")}

CONCEPTOS Y LECTURAS DEL CURSO (SOLO PARA TI: ésta es la lectura que ellos tienen que hacer, y soplarla arruina el ejercicio):
${CONCEPTOS.map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n")}

PERSONAS Y FUENTES QUE ELLOS TIENEN IMPRESAS (puedes nombrarlas y preguntar por ellas):
${FUENTES.join(", ")}

CONVERSACIÓN DE ESTE DEBATE (lo último al final):
${transcripcionChat(m => (d ? m.debate === d.n : m.ronda === S.ronda), 30) || "(todavía nadie ha escrito)"}

${S.mod && S.mod.pregunta ? `TE ESCRIBIERON DIRECTAMENTE: ${S.mod.pregunta.nombre} te dijo: "${S.mod.pregunta.texto}".
Responde a esa persona (nómbrala con @${S.mod.pregunta.nombre}), en una o dos frases. Puedes aclarar las reglas, el
tiempo, la pregunta del debate o lo que pediste antes. Si dice que no sabe o no tiene la respuesta, no se la vuelvas a
pedir: pásale la pregunta a su grupo o sigue con otra cosa. Si te pide argumentos, datos, lecturas o que le digas quién
tiene la razón, NO se los des: devuélvele la pregunta para que la responda su grupo.

` : ""}CÓMO MODERAS
Sigue el ritmo de la conversación, como una buena moderadora humana: responde a lo que se acaba de decir, no a una lista de tareas. Si los grupos se están respondiendo bien entre ellos, no interrumpas: elige "esperar".
Le hablas a los GRUPOS, no a las personas: "${d ? `@Grupo ${d.A}` : ladoNombre("A")}, ¿qué le responden a…?". Cualquiera del grupo contesta.
${puedeNombrar.length ? `Solo a estas personas, que llevan rato sin escribir nada, puedes nombrarlas con @Nombre (una a la vez, la que tenga más sentido ahora): ${puedeNombrar.join(", ")}.` : "Ahora no nombres a ninguna persona con @: habla a los grupos."}${S.mod && S.mod.pregunta ? ` (Excepción: a ${S.mod.pregunta.nombre}, que te habló.)` : ""}
Si un alumno dice que alguien no está, créele y no vuelvas a nombrar a esa persona.

${tribunaParaPrompt()}TUS INTERVENCIONES ANTERIORES EN ESTE DEBATE (no repitas ninguna, ni con otras palabras):
${est.ultimasMod.map(t => `- ${t}`).join("\n") || "(ninguna)"}

ELIGE UNA:
- "esperar": la conversación avanza sola; no escribes nada.
- "profundizar": pide a un grupo que desarrolle o haga concreta una afirmación gruesa que acaba de hacer.
- "verificar": pregunta de qué lectura o dato sale una afirmación, o qué significa un concepto que usaron. Máximo una vez por persona y nunca dos veces seguidas: no conviertas cada mensaje en "¿de qué texto sale eso?".
- "contrastar": pon a un grupo frente al argumento más fuerte del otro que todavía no ha respondido.
- "pasar_pelota": dale la palabra al grupo que ha hablado menos, o a una persona de la lista de arriba, idealmente sobre algo concreto que dijo el otro lado.
- "examinar": hazle a un grupo una pregunta factual sobre lo que leyó —quién es una de esas personas, qué pide exactamente— para ver si de verdad lo leyó.${estadoTribuna().ofrecer ? `
- "tribuna": lanza una de las PREGUNTAS DE LA TRIBUNA de arriba, tal cual (la escribió el público). En "elegida" pon su número; en "mensaje", solo a quién va dirigida ("@Grupo N" o "@Grupo N y @Grupo M").` : ""}
Reglas: eres neutral, no opinas sobre la moción ni dices quién tiene razón.
PUEDES nombrar a las personas de los documentos que ellos tienen impresos y preguntar qué dijo o qué pide cada una: lo tienen en la mano y preguntarlo no les regala nada. Pero SIEMPRE como pregunta, nunca afirmando el dato, y si contestan mal no los corrijas: pregúntales de dónde lo sacan.
NO puedes entregarles la lectura: no digas a qué lado le sirve un argumento, no cruces los materiales por ellos, no les sugieras qué concepto usar ni les armes la refutación. Máximo 40 palabras; una sola pregunta o encargo; español de Chile, tono de profesora cercana pero exigente; sin groserías.

Responde SOLO un JSON: {"tipo": "esperar"|"profundizar"|"verificar"|"contrastar"|"pasar_pelota"|"examinar"${estadoTribuna().ofrecer ? '|"tribuna"' : ""}, "mensaje": "tu intervención (vacío si esperas)"${estadoTribuna().ofrecer ? ', "elegida": número de la pregunta de la tribuna (solo si tipo es "tribuna")' : ""}}`;
}

function tribunaParaPrompt() {
  const T = estadoTribuna();
  if (!T.ofrecer) return "";
  return `PREGUNTAS DE LA TRIBUNA (las escribió el público, los grupos que no debaten; quien hizo la elegida gana un punto):
${T.pendientes.map((p, i) => `${i + 1}. ${p.nombre} (grupo ${p.grupo}): "${p.texto}"`).join("\n")}
Elige la que más haga avanzar el debate ahora, si alguna lo hace: una pregunta de verdad, sobre la moción y que el otro lado no haya contestado. Descarta las ofensivas o las que no son preguntas.${T.forzar ? " ESTA VEZ elige \"tribuna\": el público lleva rato esperando (salvo que ninguna sirva)." : ""}

`;
}

async function intervenirModerador(forzar = false) {
  const est = estadoTramo();
  const pregunta = S.mod && S.mod.pregunta;
  let texto = null, espera = false;
  const T = estadoTribuna();
  if (S.motor.activo) {
    try {
      const j = jsonDe(await pedirLLM(promptModerador(est), "jurado"));
      const elegida = j.tipo === "tribuna" && T.ofrecer ? T.pendientes[(+j.elegida || 0) - 1] : null;
      if (elegida && S.fase === "abierta") {
        if (S.mod && S.mod.pregunta === pregunta) S.mod.pregunta = null;
        const destino = String(j.mensaje || "").match(/@Grupo \d+(?:\s*y\s*@Grupo \d+)?/i);
        lanzarPreguntaTribuna(elegida, destino ? destino[0] : `@Grupo ${S.debate.A} y @Grupo ${S.debate.B}`);
        return;
      }
      // el profesor la llamó o le hablaron: no se queda callada
      if (j.tipo === "esperar" && !forzar && !pregunta) espera = true;
      else if (j.tipo !== "tribuna" && typeof j.mensaje === "string" && j.mensaje.trim() && limpiaFrase(j.mensaje)) texto = j.mensaje.trim().slice(0, 400);
    } catch (e) { console.warn("moderadora:", e); }
  } else if (T.forzar && S.fase === "abierta") {
    // sin motor: la primera pregunta de la fila, a los dos grupos
    lanzarPreguntaTribuna(T.pendientes[0], `@Grupo ${S.debate.A} y @Grupo ${S.debate.B}`);
    return;
  }
  if (S.mod && S.mod.pregunta === pregunta) S.mod.pregunta = null;   // si llegó otra mientras pensaba, queda para la próxima
  if (espera || S.fase !== "abierta") return;
  if (texto && esRepetida(texto, est.ultimasMod)) texto = null;
  if (!texto) texto = moderadorSimple(est, pregunta);
  if (texto) postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto });
}

// Sin motor LLM (o si el modelo repitió): plantillas. Le habla a los grupos, pregunta de dónde
// sale algo una sola vez por persona, y si todo lo que tiene para decir ya lo dijo, se calla.
function moderadorSimple(est = estadoTramo(), pregunta = null) {
  const ahora = Date.now(), abre = S.mod ? S.mod.abre : ahora;
  const alumnos = delDebateEnCurso().filter(m => m.tipo === "alumno");
  const ult = alumnos[alumnos.length - 1];
  const n = k => est.alumnos.filter(p => p.equipo === k).reduce((a, p) => a + p.n, 0);
  const menos = n("A") <= n("B") ? "A" : "B";
  const otro = k => (k === "A" ? "B" : "A");
  const corto = x => String(x || "").split(" ")[0];
  const callado = nombrables(est, { ahora, abre })[0];
  const candidatos = [];
  if (pregunta) {
    const eq = pregunta.equipo === "A" || pregunta.equipo === "B" ? pregunta.equipo : null;
    candidatos.push(eq ? `@${pregunta.nombre}, anotado. ${grupoDe(eq)}, ¿alguien le ayuda a ${corto(pregunta.nombre)} con eso?`
                       : `@${pregunta.nombre}, esa se la devuelvo a los grupos: ¿qué opinan?`);
  }
  if (!ult) candidatos.push(`${grupoDe("A")} y ${grupoDe("B")}: ¿quién parte? Una frase con su posición basta.`,
                            `${grupoDe(menos)}, los estamos esperando: ¿cuál es su posición?`);
  if (ult && (ult.equipo === "A" || ult.equipo === "B")) {
    const yo = est.alumnos.find(p => p.nombre === ult.nombre);
    if (!detectarFuentes(ult.texto).length && yo && !yo.verificado && ult.texto.length > 60)
      candidatos.push(`@${ult.nombre}, ¿de dónde sale eso? Un autor o un dato basta.`);
    candidatos.push(`${grupoDe(otro(ult.equipo))}, ¿qué le responden a ${corto(ult.nombre)}?`,
                    `${grupoDe(otro(ult.equipo))}, ¿en qué parte de eso no están de acuerdo?`,
                    `${grupoDe(ult.equipo)}, ¿qué ejemplo concreto tienen de lo que dice ${corto(ult.nombre)}?`);
  }
  if (callado) candidatos.push(`@${callado.nombre}, todavía no te leemos. ¿Con qué parte de lo que se ha dicho no estás de acuerdo?`);
  candidatos.push(`${grupoDe(menos)}, ¿cuál es el argumento del otro lado que más les cuesta responder?`);
  return candidatos.find(t => !esRepetida(t, est.ultimasMod)) || null;
}

/* ---------- ⚖ el relator ---------- */
async function relatorPideVoto() {
  const R = tramoActual();
  const delTramo = m => S.debate ? m.debate === S.debate.n : m.ronda === S.ronda;
  let d = null;
  if (S.motor.activo) {
    const prompt = `Eres el relator de un debate universitario en vivo. Curso: "${SESION.curso}", semana ${SESION.semana}.
MOCIÓN: "${mocionActual()}". ${ladoNombre("A")} la defiende; ${ladoNombre("B")} la rechaza. Acaba de terminar el debate ${S.debate ? S.debate.n : ""}: «${mocionActual()}».

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
  prepararMenciones($("chatTx"), $("chatSugiere"));
  $("chatTx").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
  $("btnModerar").onclick = () => { if (S.fase === "abierta") moderadorTalvez(true); else tick("La moderadora interviene con el tramo abierto."); };
  $("btnMasMin").onclick = () => { if (S.fase === "abierta") { S.finRonda += 60000; tick("+1 minuto."); } };
  setInterval(() => moderadorTalvez(false), 6000);
}

/* ---------- @menciones en el compositor del profesor ----------
   Como en las redes sociales: al escribir @ se despliega la lista de la sala (primero quienes
   debaten ahora), con su grupo; se elige con clic, flechas y Enter o Tab. */
function genteParaMencionar() {
  const por = new Map();
  const js = typeof window.jugadoresSala === "function" ? window.jugadoresSala() : {};
  for (const j of Object.values(js)) if (j.nombre) por.set(norm(j.nombre), { nombre: j.nombre, grupo: j.grupo || 0 });
  for (const x of S.chat) if (x.tipo === "alumno" && x.nombre && !por.has(norm(x.nombre))) por.set(norm(x.nombre), { nombre: x.nombre, grupo: grupoDeMensaje(x) });
  return [{ nombre: MOD_NOMBRE, grupo: 0, mod: true }, ...por.values()];
}
function prepararMenciones(tx, caja) {
  let lista = [], elegida = 0, token = null;
  const corto = n => String(n || "").trim().split(/\s+/).slice(0, 2).join(" ");
  const cerrar = () => { lista = []; token = null; caja.classList.remove("on"); caja.innerHTML = ""; };
  const pintar = () => {
    const d = S.debate;
    const lado = g => d && g.grupo === d.A ? "A FAVOR" : d && g.grupo === d.B ? "EN CONTRA" : "";
    caja.innerHTML = lista.length ? lista.map((g, i) => `<div class="sg ${i === elegida ? "on" : ""}" data-i="${i}">
        <span class="sg-n">${esc(g.nombre)}</span><span class="sg-g">${g.mod ? "🎙 moderadora de IA" : (g.grupo ? "grupo " + g.grupo : "") + (lado(g) ? " · " + lado(g) : "")}</span></div>`).join("")
      : `<div class="sg-vacio">Nadie se llama así en la sala.</div>`;
    caja.classList.add("on");
  };
  const insertar = g => {
    const antes = tx.value.slice(0, tx.selectionStart);
    const ini = antes.length - token.length - 1;
    const texto = "@" + corto(g.nombre) + " ";
    tx.value = tx.value.slice(0, ini) + texto + tx.value.slice(antes.length);
    tx.focus(); tx.setSelectionRange(ini + texto.length, ini + texto.length);
    cerrar();
  };
  const actualizar = () => {
    const antes = tx.value.slice(0, tx.selectionStart ?? tx.value.length);
    const m = antes.match(/(^|\s)@([^\s@:]{0,20})$/);
    if (!m) return cerrar();
    token = m[2];
    const q = norm(token), d = S.debate;
    const enDebate = g => d && (g.grupo === d.A || g.grupo === d.B);
    lista = genteParaMencionar().filter(g => !q || norm(g.nombre).split(/\s+/).some(w => w.startsWith(q)))
      .sort((a, b) => ((b.mod ? 2 : 0) + enDebate(b)) - ((a.mod ? 2 : 0) + enDebate(a)) || a.nombre.localeCompare(b.nombre)).slice(0, 8);
    elegida = 0; pintar();
  };
  tx.addEventListener("input", actualizar);
  tx.addEventListener("click", actualizar);
  tx.addEventListener("blur", () => setTimeout(cerrar, 150));
  // con la lista abierta, flechas eligen y Enter/Tab inserta (antes de que Enter envíe el mensaje)
  tx.addEventListener("keydown", e => {
    if (!caja.classList.contains("on") || !lista.length) { if (e.key === "Escape") cerrar(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); elegida = (elegida + 1) % lista.length; pintar(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); elegida = (elegida - 1 + lista.length) % lista.length; pintar(); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); e.stopImmediatePropagation(); insertar(lista[elegida]); }
    else if (e.key === "Escape") cerrar();
  }, true);
  caja.addEventListener("pointerdown", e => { const el = e.target.closest(".sg"); if (!el) return; e.preventDefault(); insertar(lista[+el.dataset.i]); });
}
