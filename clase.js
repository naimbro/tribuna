/* =====================================================================
   TRIBUNA — la clase en rotación: un debate tras otro entre grupos fijos.
   propuesta → apertura → réplica → votación → resultado → propuesta …  hasta «Terminar clase».
   Corre solo en la pantalla del profesor. La lógica pura está en rotacion.js; aquí se
   orquesta: reloj, moderadora, jurado, público y lo que se publica a los teléfonos.
   ===================================================================== */

const publicarEstado = () => { if (typeof window.publicarEstado === "function") window.publicarEstado(); };

function gruposDisponibles() {
  if (typeof window.gruposConectados === "function") return window.gruposConectados();
  return Array.from({ length: S.clase.grupos }, (_, i) => i + 1);
}

function publicarDebate({ pregunta, A, B, favor, contra }) {
  const n = S.clase.debates.length + 1;
  const anterior = S.debate;
  S.debate = { n, pregunta: String(pregunta).trim().slice(0, 300), A, B, posturas: posturasDebate({ favor, contra }) };
  S.clase.debates.push({ n, pregunta: S.debate.pregunta, A, B, res: null, votantes: [] });
  S.clase.propuesta = null;
  S.tramo = 0;
  S.ronda = n - 1;
  S.publico = { A: 0, B: 0, n: 0, votantes: [] };
  S.debateAnterior = anterior;
  if (typeof window.alCambiarDebate === "function") window.alCambiarDebate(n);   // online: votos del debate n
  $("propuesta")?.remove();
  pintarRonda(); pintarMarcador();
  empezarPreparacion();
  publicarEstado();
}

// Un minuto antes de abrir el chat: cada grupo ve en el teléfono qué lado defiende y qué sostiene,
// y acuerda su primera frase. En la clase del 24-sep-2026 cada debate perdía dos minutos antes
// del primer mensaje con contenido. Al llegar a cero el chat se abre solo; ▶ ABRIR YA lo adelanta.
function empezarPreparacion() {
  const d = S.debate;
  S.fase = "listo";
  S.finPrep = Date.now() + ROT.SEG_PREPARACION * 1000;
  clearInterval(S.reloj);
  let el = $("preparacion");
  if (!el) { el = document.createElement("div"); el.id = "preparacion"; document.querySelector("main .col").appendChild(el); }
  const lado = k => `<div style="--c:${EQUIPOS[k].color}"><b>${EQUIPOS[k].nombre} · ${esc(nombreGrupo(d[k]))}</b>${esc(d.posturas[k])}</div>`;
  el.innerHTML = `<div class="pr-k">DEBATE ${d.n} · PREPARACIÓN <span class="mono" id="prepReloj"></span></div>
    <div class="prep-q">«${esc(d.pregunta)}»</div>
    <div class="pr-lados">${lado("A")}${lado("B")}</div>
    <div class="pr-porque">Cada grupo ve su postura en el teléfono y acuerda su primera frase. El chat se abre solo al llegar a cero.</div>`;
  const tic = () => {
    if (S.fase !== "listo" || !S.finPrep) return;
    const resta = Math.max(0, Math.ceil((S.finPrep - Date.now()) / 1000));
    $("reloj").textContent = fmt(resta);
    if ($("prepReloj")) $("prepReloj").textContent = fmt(resta);
    if (resta <= 0) abrirRonda();
  };
  S.reloj = setInterval(tic, 500);
  tic();
  $("btnPrincipal").textContent = "▶ ABRIR YA";
  tick(`Debate ${d.n}: un minuto para que los grupos ${d.A} y ${d.B} preparen su primera frase.`);
}

// Lo que escribió cada lado en el debate (para los jueces simulados sin motor).
function textosDelDebate(n) {
  const t = { A: [], B: [] };
  for (const m of S.chat) if (m.tipo === "alumno" && m.debate === n && (m.equipo === "A" || m.equipo === "B")) t[m.equipo].push(m.texto);
  return { A: t.A.join("\n"), B: t.B.join("\n") };
}

// Los cinco jueces: con motor, cinco llamadas en paralelo; sin motor, simulados y marcados.
function juzgar(d) {
  const reg = S.clase.debates[d.n - 1];
  const ctx = { ronda: "refutacion", pauta: "", dir: 1, conceptosRival: [], previas: [], ecos: [] };
  const p = S.motor.activo ? evaluarConJueces(d)
    : Promise.resolve(juecesSimulados(d, textosDelDebate(d.n), t => evaluarRigor(t, ctx).rubrica.total));
  // si el profesor saltó la deliberación, el panel ya se armó sin ellos: no se reescribe
  return p.then(j => { if (!reg.panel) reg.jueces = j; return j; })
    .catch(e => { console.warn("jueces:", e); return (reg.jueces = juecesDeLaSesion().map(j => ({ ...j, A: null, B: null, fraseA: "", fraseB: "" }))); });
}

function votarDebate() {
  S.fase = "votando";
  const d = S.debate, n = d.n, reg = S.clase.debates[n - 1];
  reg.jueces = null;
  S.finVoto = Date.now() + ROT.SEG_VOTACION * 1000;
  $("btnPrincipal").textContent = "CERRAR VOTACIÓN";
  relatorPideVoto().catch(e => console.warn("relator:", e));     // resume el debate en la conversación
  S.juzgando = juzgar(d);                                          // los jueces evalúan mientras el público vota
  if (typeof prepararPropuesta === "function") prepararPropuesta();
  mostrarVotacion(d);
  clearInterval(S.reloj);
  S.reloj = setInterval(() => {
    const resta = Math.max(0, Math.ceil((S.finVoto - Date.now()) / 1000));
    $("reloj").textContent = fmt(resta);
    actualizarVotacion();
    if (resta <= 0 && S.fase === "votando" && S.debate && S.debate.n === n) cerrarVotacion();
  }, 500);
  tick(`Debate ${n}: el público vota (${ROT.SEG_VOTACION} s) y los jueces deliberan.`);
  publicarEstado();
}

async function cerrarVotacion() {
  if (S.fase !== "votando") return;
  clearInterval(S.reloj);
  const d = S.debate, reg = S.clase.debates[d.n - 1];
  // en línea: si se acaba de restaurar la sala, esperar (hasta 5 s) la primera foto de los votos
  if (typeof window.publicarEstado === "function")
    for (let i = 0; i < 50 && S.votosDe !== d.n; i++) await new Promise(r => setTimeout(r, 100));
  reg.votos = (S.publico.votantes || []).map(v => ({ uid: v.uid, nombre: v.nombre || "", email: v.email || "", grupo: v.grupo || 0,
                                                    voto: v.voto || null, prediccion: v.prediccion || null }));
  // quienes podían votar y no tocaron nada quedan registrados como «no votó»
  const ya = new Set(reg.votos.map(v => v.uid));
  for (const e of (typeof window.listaElegibles === "function" ? window.listaElegibles() : []))
    if (!ya.has(e.uid)) reg.votos.push({ ...e, voto: null, prediccion: null });
  reg.publico = votoPublico(reg.votos.map(v => v.voto));
  if (typeof barraDelDebate === "function") reg.barra = barraDelDebate();   // participación: solo registro, no puntaje
  // el público activo (publico.js): cuánto se movió la sala y la frase con más 🔥. No es puntaje.
  if (S.termo) reg.termo = resumenTermometro(Object.values(S.termo));
  if (S.reacciones) reg.frase = fraseDelDebate(S.chat.filter(m => m.debate === d.n), S.reacciones);
  S.fase = "veredictoPublico";
  $("btnPrincipal").textContent = "SALTAR ▶";
  publicarEstado();
  // si el profesor terminó la clase (o cambió el debate) durante un veredicto, esta cadena se corta
  const vigente = () => S.fase !== "fin" && S.debate === d && S.clase.debates[d.n - 1] === reg;
  await mostrarVeredictoPublico(d, reg.publico);
  if (!vigente()) return;
  S.fase = "veredictoJueces";
  publicarEstado();
  if (!reg.jueces) {
    mostrarDeliberando(d);
    // se puede saltar: los jueces que no alcanzaron se abstienen
    await Promise.race([S.juzgando || (S.juzgando = juzgar(d)), new Promise(r => { ESC.rapido = false; ESC.resolver = r; })]);
    if (!vigente()) return;
    if (!reg.jueces) reg.jueces = juecesDeLaSesion().map(j => ({ ...j, A: null, B: null, fraseA: "", fraseB: "", simulado: false }));
  }
  reg.panel = panelJueces(reg.jueces);
  publicarEstado();
  await mostrarVeredictoJueces(d, reg.jueces, reg.panel);
  if (!vigente()) return;
  mostrarResultado();
}

function mostrarResultado() {
  const d = S.debate, reg = S.clase.debates[d.n - 1];
  reg.res = puntajeDebate({ panel: reg.panel, publico: reg.publico });
  const g = reg.panel ? reg.panel.ganador : null;
  reg.votos.forEach(v => { v.acierto = g && v.prediccion ? v.prediccion === g : null; });
  S.clase.oraculos = acumularOraculos(S.clase.oraculos, reg.votos, g);
  const antes = S.clase.ranking || [];
  S.clase.ranking = ranking(S.clase.grupos, S.clase.debates);
  S.clase.ultimo = { n: d.n, pregunta: d.pregunta, A: d.A, B: d.B, res: reg.res, jueces: reg.jueces, panel: reg.panel, publico: reg.publico,
                     termo: reg.termo || null, frase: reg.frase || null };
  S.fase = "resultado";
  pintarMarcador();
  publicarEstado();
  const seguir = () => {
    if (S.fase !== "resultado") return;
    S.fase = "propuesta";
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto: `Gracias, Grupo ${d.A} y Grupo ${d.B}. Viene el próximo debate.` });
    mostrarPropuesta();
    publicarEstado();
  };
  mostrarResultadoDebate(S.clase.ultimo, antes, S.clase.ranking, seguir, rankingOraculos(S.clase.oraculos));
  $("btnPrincipal").textContent = "SEGUIR ▶";
}

// sinPreguntar: la orden viene del panel (admin.html), que ya pidió confirmación
function terminarClase(sinPreguntar = false) {
  if (["abierta", "listo", "votando", "veredictoPublico", "veredictoJueces"].includes(S.fase)) {
    if (sinPreguntar !== true && !confirm("Hay un debate en curso. ¿Terminar la clase igual? Ese debate no cuenta para el ranking.")) return;
    clearInterval(S.reloj);
    S.finPrep = null;
    $("preparacion")?.remove();
    cerrarEscena();
    const reg = S.debate && S.clase.debates[S.debate.n - 1];
    if (reg && !reg.res) { S.clase.debates.pop(); S.debate = null; }
  }
  // la cuenta de «se publica en 15 s» seguía corriendo y abría un debate nuevo sobre la clase
  // terminada: el podio nunca llegaba (clase del 24-sep-2026, sala 2GUU)
  clearInterval(cuentaPropuesta);
  S.clase.propuesta = null;
  S.fase = "fin";
  if (typeof saltarEscena === "function") saltarEscena();     // corta la espera de cualquier escena en curso
  S.clase.ranking = ranking(S.clase.grupos, S.clase.debates);
  $("propuesta")?.remove();
  pintarMarcador();
  $("btnPrincipal").textContent = "🏆 VER CAMPEÓN";
  tick("Clase terminada. Los teléfonos piden feedback.");
  publicarEstado();
  // desde el botón, directo al podio (desde el panel no hay nadie mirando el proyector)
  if (sinPreguntar !== true && typeof ceremoniaRanking === "function") ceremoniaRanking();
}

// El botón principal hace lo que corresponde a cada momento.
function accionPrincipal() {
  if ($("escena") && $("escena").classList.contains("movimiento")) { window.cerrarRepeticion?.(); cerrarEscena(); return; }
  if (S.fase === "propuesta") { if (typeof publicarPropuestaActual === "function") publicarPropuestaActual(); }
  else if (S.fase === "listo") abrirRonda();                 // tramo restaurado tras cerrar la pestaña
  else if (S.fase === "abierta") cerrarRonda();
  else if (S.fase === "votando") cerrarVotacion();
  else if (S.fase === "veredictoPublico" || S.fase === "veredictoJueces") saltarEscena();
  else if (S.fase === "resultado") $("rsSeguir")?.click();
  else if (S.fase === "fin") { if (typeof ceremoniaRanking === "function") ceremoniaRanking(); }
}

$("btnPrincipal").onclick = accionPrincipal;
$("btnTerminar").onclick = () => terminarClase();

// 🧭 REPETIR BRÚJULA: solo si la partida formó los grupos con la brújula, y entre debates
function actualizarBotonRepetir() {
  const b = $("btnRepetir");
  if (b) b.style.display = (S.clase.gruposInfo || []).length ? "" : "none";
}
$("btnMapa").onclick = () => abrirMapaGrande();
// 🧭 MAPA: la brújula a pantalla completa, siempre que la sala la use
setInterval(() => { $("btnMapa").style.display = S.clase.brujula && S.clase.brujula.activa && typeof BRUJULA !== "undefined" ? "" : "none"; }, 2000);
$("btnRepetir").onclick = () => {
  if (!["propuesta", "fin"].includes(S.fase)) { tick("Termina el debate en curso antes de repetir la brújula."); return; }
  if (S.fase === "propuesta") clearInterval(cuentaPropuesta);           // que no se publique la pregunta por detrás
  window.repetirBrujula?.();
  mostrarMovimiento();
};

/* ---------------- la propuesta de la moderadora ---------------- */

// «Grupo 2 · Frenar por ley» si la partida formó grupos con la brújula; si no, «Grupo 2».
function nombreGrupo(n) {
  const g = (S.clase.gruposInfo || []).find(x => x.n === n);
  return g ? `Grupo ${n} · ${g.nombre}` : `Grupo ${n}`;
}
const conBrujula = () => (S.clase.gruposInfo || []).length > 0;

// Con brújula, la moción cae sobre lo que separa a los dos campos que debaten.
function bloqueCampos(par) {
  if (!conBrujula() || !par || par.A === null || par.B === null) return "";
  const g = n => S.clase.gruposInfo.find(x => x.n === n);
  if (!g(par.A) || !g(par.B)) return "";
  const c = n => (typeof BRUJULA !== "undefined" ? BRUJULA.campos.find(x => x.id === g(n).campo) : null) || {};
  return `LOS DOS GRUPOS QUE DEBATEN AHORA (se formaron por su posición real):
- Grupo ${par.A}, campo «${g(par.A).nombre}»: ${c(par.A).afirma || ""}
- Grupo ${par.B}, campo «${g(par.B).nombre}»: ${c(par.B).afirma || ""}
La moción tiene que caer justo sobre lo que separa a esos dos campos: debe AFIRMAR la posición de uno de los dos grupos, de modo que el otro la rechace desde la suya. Nadie debe quedar defendiendo algo que no piensa.

`;
}

function promptPropuesta(par) {
  const hechas = S.clase.debates.map(d => `- ${d.pregunta}`).join("\n") || "(ninguna todavía)";
  const disputas = S.chat.filter(m => m.tipo === "relator" && m.datos && m.datos.disputa).map(m => `- ${m.datos.disputa}`).slice(-5).join("\n") || "(ninguna)";
  const flojas = S.clase.debates.flatMap(d => (d.jueces || []).flatMap(j => [[j.A, j.fraseA], [j.B, j.fraseB]]))
    .filter(([n, f]) => n !== null && n <= 4 && f && f !== "(simulado)").map(([, f]) => `- ${f}`).slice(-5).join("\n") || "(nada)";
  const usados = new Set(S.chat.filter(m => m.tipo === "alumno").flatMap(m => detectarConceptos(m.texto).map(c => c.id)));
  const sinUsar = CONCEPTOS.filter(c => !usados.has(c.id)).map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n") || "(todos se han usado)";
  return `Eres la moderadora de una clase de debate en rotación. Curso: "${SESION.curso}", semana ${SESION.semana}.
TEMA GENERAL (lo fijó el profesor): "${S.clase.tema || SESION.tema}"

MATERIAL DE LA SEMANA (conceptos y lecturas):
${CONCEPTOS.map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n")}

YA SE DEBATIÓ (no repitas ni reformules estas preguntas):
${hechas}

LO QUE QUEDÓ EN DISPUTA SEGÚN EL RELATOR:
${disputas}

LO QUE LOS JUECES CRITICARON:
${flojas}

CONCEPTOS QUE NADIE HA USADO TODAVÍA:
${sinUsar}

${bloqueCampos(par)}TU TAREA: propone la próxima pregunta de debate. Tiene que ser una afirmación discutible de una sola línea (máximo 25 palabras), dentro del tema general, que se pueda defender a favor y en contra con el material del curso. Prefiere lo que quedó en disputa o lo que nadie ha tocado. Español de Chile, sin groserías.

Responde SOLO un JSON: {"pregunta": "…", "porQue": "máx. 20 palabras: por qué esta y por qué ahora", "mejorFavor": "máx. 20 palabras", "mejorContra": "máx. 20 palabras", "favor": "máx. 18 palabras: qué sostiene A FAVOR (la postura, no el argumento)", "contra": "máx. 18 palabras: qué sostiene EN CONTRA (la postura, no el argumento)"${bloqueCampos(par) ? ', "afirma": número del grupo cuya posición afirma la moción' : ""}}`;
}

async function prepararPropuesta() {
  // con brújula, el par más lejano en el mapa (entre los que menos han debatido)
  const posDe = Object.fromEntries((S.clase.gruposInfo || []).map(g => [g.n, g.pos]));
  const par = (conBrujula() && emparejarLejanos(gruposDisponibles(), S.clase.debates, posDe)) || emparejar(gruposDisponibles(), S.clase.debates);
  const base = { A: par ? par.A : null, B: par ? par.B : null };
  const escritas = typeof PREGUNTAS !== "undefined" ? PREGUNTAS : [];
  const usadas = [...S.clase.debates.map(d => d.pregunta), ...(S.clase.descartadas || [])];
  const escrita = proximaPreguntaEscrita(escritas, usadas);
  if (escrita) {
    // si la pregunta dice qué campo afirma, A FAVOR va al grupo del par más cercano a ese campo
    const campo = escrita.afirma && typeof BRUJULA !== "undefined" ? BRUJULA.campos.find(c => c.id === escrita.afirma) : null;
    const lados = conBrujula() && campo ? ladoQueAfirma(base, campo.id, BRUJULA.campos, posDe) : base;
    S.clase.propuesta = { ...lados, estado: "lista", pregunta: escrita.texto, favor: escrita.favor || "", contra: escrita.contra || "",
      porQue: "Pregunta escrita por ti en el archivo de la semana." + (conBrujula() && campo ? ` A FAVOR, el grupo más cercano a «${campo.nombre}».` : ""),
      mejorFavor: "", mejorContra: "", fuente: "escrita" };
    if (S.fase === "propuesta") mostrarPropuesta();
    return;
  }
  S.clase.propuesta = { ...base, estado: "pensando", pregunta: "", porQue: "", mejorFavor: "", mejorContra: "", fuente: "ia" };
  if (S.fase === "propuesta") mostrarPropuesta();
  try {
    if (!S.motor.activo) throw new Error("sin motor LLM");
    const j = jsonDe(await pedirLLM(promptPropuesta(base), "jurado"));
    const pregunta = String(j.pregunta || "").trim().slice(0, 300);
    if (!pregunta || !limpiaFrase(pregunta)) throw new Error("pregunta vacía o inválida");
    // el grupo cuya posición afirma la moción defiende A FAVOR; si no lo dice, queda el emparejamiento
    const lados = conBrujula() && +j.afirma === base.B ? { A: base.B, B: base.A } : base;
    S.clase.propuesta = { ...lados, estado: "lista", pregunta, porQue: String(j.porQue || "").slice(0, 200),
      favor: String(j.favor || "").slice(0, 200), contra: String(j.contra || "").slice(0, 200),
      mejorFavor: String(j.mejorFavor || "").slice(0, 200), mejorContra: String(j.mejorContra || "").slice(0, 200), fuente: "ia" };
  } catch (e) {
    console.warn("propuesta:", e);
    S.clase.propuesta = { ...base, estado: "vacia", pregunta: "", porQue: "", mejorFavor: "", mejorContra: "", fuente: "ia" };
  }
  if (S.fase === "propuesta") mostrarPropuesta();
}

let cuentaPropuesta = null;

function mostrarPropuesta() {
  clearInterval(cuentaPropuesta);
  const p = S.clase.propuesta;
  // una propuesta armada antes de que hubiera grupos (la sala la prepara al abrirse, en la
  // portada) llega sin par: con los grupos ya formados se rehace. Si no, el primer debate caía en
  // «Grupo 1 contra Grupo 2» por defecto: sin el par más lejano de la brújula ni el lado que
  // afirma la pregunta (encontrado en la prueba de punta a punta del 23-sep-2026).
  if (!p || ((p.A === null || p.B === null) && gruposDisponibles().length >= 2)) { S.clase.propuesta = null; prepararPropuesta(); return; }
  let el = $("propuesta");
  if (!el) { el = document.createElement("div"); el.id = "propuesta"; document.querySelector("main .col").appendChild(el); }
  const gs = Array.from({ length: S.clase.grupos }, (_, i) => i + 1);
  const sel = (id, v) => `<select id="${id}">${gs.map(g => `<option value="${g}" ${g === v ? "selected" : ""}>${esc(nombreGrupo(g))}</option>`).join("")}</select>`;
  const faltan = p.A === null || p.B === null;
  // sin emparejamiento (menos de dos grupos con gente) los selectores igual proponen dos grupos
  // distintos: el conectado primero, y el profesor puede simular al otro desde su pantalla
  const con = gruposDisponibles();
  const defA = p.A ?? (con[0] || 1);
  const defB = p.B ?? (gs.find(g => g !== defA) || 2);
  el.innerHTML = `
    <div class="pr-k">PRÓXIMO DEBATE · lo ves solo tú</div>
    ${p.estado === "pensando" ? `<div class="pr-pensando">La moderadora está pensando la próxima pregunta…</div>` : ""}
    ${p.estado === "vacia" ? `<div class="pr-aviso">La moderadora no pudo proponer una pregunta. Escribe la tuya o pide otra.</div>` : ""}
    ${faltan ? `<div class="pr-aviso">Faltan grupos con alumnos conectados: se necesitan al menos dos.</div>` : ""}
    <textarea id="prTexto" rows="2" maxlength="300" placeholder="Escribe la pregunta del debate">${esc(p.pregunta || "")}</textarea>
    ${p.porQue ? `<div class="pr-porque">${esc(p.porQue)}</div>` : ""}
    ${p.mejorFavor || p.mejorContra ? `<div class="pr-lados"><div style="--c:var(--A)"><b>A favor</b>${esc(p.mejorFavor)}</div><div style="--c:var(--B)"><b>En contra</b>${esc(p.mejorContra)}</div></div>` : ""}
    <div class="pr-grupos"><span style="color:var(--A)">A FAVOR</span>${sel("prA", defA)}<span style="color:var(--B)">EN CONTRA</span>${sel("prB", defB)}<button class="btn sm" id="prCambiar" title="Intercambiar A FAVOR y EN CONTRA">⇄ lados</button></div>
    <div class="pr-error" id="prError"></div>
    <div class="pr-acc">
      <button class="btn pri" id="prPublicar">Publicar</button>
      <button class="btn" id="prOtra">Pedir otra</button>
      <span class="pr-cuenta" id="prCuenta"></span>
    </div>`;
  const detener = () => { clearInterval(cuentaPropuesta); $("prCuenta").textContent = ""; };
  el.onpointerdown = detener; el.onfocusin = detener;
  $("prPublicar").onclick = publicarPropuestaActual;
  $("prCambiar").onclick = () => { const a = $("prA").value; $("prA").value = $("prB").value; $("prB").value = a; };
  $("prOtra").onclick = () => {
    if (p.pregunta) (S.clase.descartadas = S.clase.descartadas || []).push(p.pregunta);   // no volver a proponerla
    S.clase.propuesta = null; prepararPropuesta();
  };
  const listo = p.estado === "lista" && !faltan;
  $("btnPrincipal").textContent = "PUBLICAR PREGUNTA";
  if (listo) {
    let resta = ROT.SEG_PROPUESTA;
    $("prCuenta").textContent = `se publica en ${resta} s`;
    cuentaPropuesta = setInterval(() => {
      resta--;
      if (resta <= 0) { clearInterval(cuentaPropuesta); publicarPropuestaActual(); return; }
      if ($("prCuenta")) $("prCuenta").textContent = `se publica en ${resta} s`;
    }, 1000);
  }
}

function publicarPropuestaActual() {
  clearInterval(cuentaPropuesta);
  if (S.fase !== "propuesta") return;                        // p. ej., la clase ya terminó
  const pregunta = ($("prTexto")?.value || S.clase.propuesta?.pregunta || "").trim();
  const A = +($("prA")?.value || S.clase.propuesta?.A), B = +($("prB")?.value || S.clase.propuesta?.B);
  const error = t => { tick(t); if ($("prError")) $("prError").textContent = t; };
  if (!pregunta) { error("Escribe una pregunta o pide otra a la moderadora."); return; }
  if (!A || !B || A === B) { error("Elige dos grupos distintos: uno A FAVOR y otro EN CONTRA."); return; }
  // la postura escrita de cada lado vale solo si el profesor no reescribió la pregunta
  const p = S.clase.propuesta, igual = p && (p.pregunta || "").trim() === pregunta;
  publicarDebate({ pregunta, A, B, favor: igual ? p.favor : "", contra: igual ? p.contra : "" });
}
