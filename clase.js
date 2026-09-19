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

function publicarDebate({ pregunta, A, B }) {
  const n = S.clase.debates.length + 1;
  const anterior = S.debate;
  S.debate = { n, pregunta: String(pregunta).trim().slice(0, 300), A, B };
  S.clase.debates.push({ n, pregunta: S.debate.pregunta, A, B, res: null, votantes: [] });
  S.clase.propuesta = null;
  S.tramo = 0;
  S.ronda = (n - 1) * 2;
  S.publico = { A: 0, B: 0, n: 0, votantes: [] };
  S.debateAnterior = anterior;
  if (typeof window.alCambiarDebate === "function") window.alCambiarDebate(n);   // online: votos del debate n
  $("propuesta")?.remove();
  pintarRonda(); pintarMarcador();
  S.fase = "listo";
  abrirRonda();                                          // abre la apertura; abrirTramoChat anuncia
  publicarEstado();
}

function pasarAReplica() {
  S.tramo = 1;
  S.ronda = (S.debate.n - 1) * 2 + 1;
  pintarRonda();
  S.fase = "listo";
  abrirRonda();
  publicarEstado();
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
  return p.then(j => (reg.jueces = j))
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
  reg.votos = (S.publico.votantes || []).map(v => ({ uid: v.uid, nombre: v.nombre || "", email: v.email || "", grupo: v.grupo || 0,
                                                    voto: v.voto || null, prediccion: v.prediccion || null }));
  reg.publico = votoPublico(reg.votos.map(v => v.voto));
  S.fase = "veredictoPublico";
  $("btnPrincipal").textContent = "SALTAR ▶";
  publicarEstado();
  await mostrarVeredictoPublico(d, reg.publico);
  S.fase = "veredictoJueces";
  publicarEstado();
  if (!reg.jueces) { mostrarDeliberando(d); await (S.juzgando || (S.juzgando = juzgar(d))); }
  reg.panel = panelJueces(reg.jueces);
  publicarEstado();
  await mostrarVeredictoJueces(d, reg.jueces, reg.panel);
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
  S.clase.ultimo = { n: d.n, pregunta: d.pregunta, A: d.A, B: d.B, res: reg.res, jueces: reg.jueces, panel: reg.panel, publico: reg.publico };
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

function terminarClase() {
  if (["abierta", "listo", "votando", "veredictoPublico", "veredictoJueces"].includes(S.fase)) {
    if (!confirm("Hay un debate en curso. ¿Terminar la clase igual? Ese debate no cuenta para el ranking.")) return;
    clearInterval(S.reloj);
    cerrarEscena();
    if (S.debate && !S.clase.debates[S.debate.n - 1].res) S.clase.debates.pop();
  }
  S.fase = "fin";
  S.clase.ranking = ranking(S.clase.grupos, S.clase.debates);
  $("propuesta")?.remove();
  pintarMarcador();
  $("btnPrincipal").textContent = "🏆 VER CAMPEÓN";
  tick("Clase terminada. Los teléfonos piden feedback; revela al campeón cuando quieras.");
  publicarEstado();
}

// El botón principal hace lo que corresponde a cada momento.
function accionPrincipal() {
  if (S.fase === "propuesta") { if (typeof publicarPropuestaActual === "function") publicarPropuestaActual(); }
  else if (S.fase === "listo") abrirRonda();                 // tramo restaurado tras cerrar la pestaña
  else if (S.fase === "abierta") cerrarRonda();
  else if (S.fase === "votando") cerrarVotacion();
  else if (S.fase === "veredictoPublico" || S.fase === "veredictoJueces") saltarEscena();
  else if (S.fase === "resultado") $("rsSeguir")?.click();
  else if (S.fase === "fin") { if (typeof ceremoniaRanking === "function") ceremoniaRanking(); }
}

$("btnPrincipal").onclick = accionPrincipal;
$("btnTerminar").onclick = terminarClase;

/* ---------------- la propuesta de la moderadora ---------------- */

function promptPropuesta() {
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

TU TAREA: propone la próxima pregunta de debate. Tiene que ser una afirmación discutible de una sola línea (máximo 25 palabras), dentro del tema general, que se pueda defender a favor y en contra con el material del curso. Prefiere lo que quedó en disputa o lo que nadie ha tocado. Español de Chile, sin groserías.

Responde SOLO un JSON: {"pregunta": "…", "porQue": "máx. 20 palabras: por qué esta y por qué ahora", "mejorFavor": "máx. 20 palabras", "mejorContra": "máx. 20 palabras"}`;
}

async function prepararPropuesta() {
  const par = emparejar(gruposDisponibles(), S.clase.debates);
  const base = { A: par ? par.A : null, B: par ? par.B : null };
  const escritas = typeof PREGUNTAS !== "undefined" ? PREGUNTAS : [];
  const usadas = [...S.clase.debates.map(d => d.pregunta), ...(S.clase.descartadas || [])];
  const escrita = proximaPreguntaEscrita(escritas, usadas);
  if (escrita) {
    S.clase.propuesta = { ...base, estado: "lista", pregunta: escrita, porQue: "Pregunta escrita por ti en el archivo de la semana.", mejorFavor: "", mejorContra: "", fuente: "escrita" };
    if (S.fase === "propuesta") mostrarPropuesta();
    return;
  }
  S.clase.propuesta = { ...base, estado: "pensando", pregunta: "", porQue: "", mejorFavor: "", mejorContra: "", fuente: "ia" };
  if (S.fase === "propuesta") mostrarPropuesta();
  try {
    if (!S.motor.activo) throw new Error("sin motor LLM");
    const j = jsonDe(await pedirLLM(promptPropuesta(), "jurado"));
    const pregunta = String(j.pregunta || "").trim().slice(0, 300);
    if (!pregunta || !limpiaFrase(pregunta)) throw new Error("pregunta vacía o inválida");
    S.clase.propuesta = { ...base, estado: "lista", pregunta, porQue: String(j.porQue || "").slice(0, 200),
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
  if (!p) { prepararPropuesta(); return; }
  let el = $("propuesta");
  if (!el) { el = document.createElement("div"); el.id = "propuesta"; document.querySelector("main .col").appendChild(el); }
  const gs = Array.from({ length: S.clase.grupos }, (_, i) => i + 1);
  const sel = (id, v) => `<select id="${id}">${gs.map(g => `<option value="${g}" ${g === v ? "selected" : ""}>Grupo ${g}</option>`).join("")}</select>`;
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
    <div class="pr-grupos"><span style="color:var(--A)">A FAVOR</span>${sel("prA", defA)}<span style="color:var(--B)">EN CONTRA</span>${sel("prB", defB)}</div>
    <div class="pr-error" id="prError"></div>
    <div class="pr-acc">
      <button class="btn pri" id="prPublicar">Publicar</button>
      <button class="btn" id="prOtra">Pedir otra</button>
      <span class="pr-cuenta" id="prCuenta"></span>
    </div>`;
  const detener = () => { clearInterval(cuentaPropuesta); $("prCuenta").textContent = ""; };
  el.onpointerdown = detener; el.onfocusin = detener;
  $("prPublicar").onclick = publicarPropuestaActual;
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
  const pregunta = ($("prTexto")?.value || S.clase.propuesta?.pregunta || "").trim();
  const A = +($("prA")?.value || S.clase.propuesta?.A), B = +($("prB")?.value || S.clase.propuesta?.B);
  const error = t => { tick(t); if ($("prError")) $("prError").textContent = t; };
  if (!pregunta) { error("Escribe una pregunta o pide otra a la moderadora."); return; }
  if (!A || !B || A === B) { error("Elige dos grupos distintos: uno A FAVOR y otro EN CONTRA."); return; }
  publicarDebate({ pregunta, A, B });
}
