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

function votarDebate() {
  S.fase = "votando";
  const fin = Date.now() + ROT.SEG_VOTACION * 1000;
  S.finVoto = fin;
  $("btnPrincipal").textContent = "CERRAR VOTACIÓN";
  const n = S.debate.n;
  // en paralelo: el relator llama a votar, el jurado evalúa y la moderadora piensa la próxima pregunta
  S.jurando = relatorPideVoto().then(rel => evaluarDebate(rel)).catch(e => { console.warn("evaluación:", e); });
  if (typeof prepararPropuesta === "function") prepararPropuesta();
  clearInterval(S.reloj);
  S.reloj = setInterval(() => {
    const resta = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    $("reloj").textContent = fmt(resta);
    if (resta <= 0 && S.fase === "votando" && S.debate && S.debate.n === n) cerrarVotacion();
  }, 500);
  tick(`Debate ${n}: votación abierta, ${ROT.SEG_VOTACION} segundos.`);
  publicarEstado();
}

async function cerrarVotacion() {
  if (S.fase !== "votando") return;
  S.fase = "cerrando";
  clearInterval(S.reloj);
  $("btnPrincipal").disabled = true; $("btnPrincipal").textContent = "EL JURADO TERMINA…";
  await (S.jurando || evaluarDebate());
  if (S.clase.evaluado !== S.debate.n) await evaluarDebate();
  $("btnPrincipal").disabled = false;
  mostrarResultado();
}

// Todo lo que escribió cada alumno en el debate (los dos tramos) es su intervención.
function entregasDelDebate(n) {
  const out = { A: [], B: [] }, por = new Map();
  for (const m of S.chat) if (m.tipo === "alumno" && m.debate === n && (m.equipo === "A" || m.equipo === "B")) {
    const k = m.equipo + "|" + (m.uid || m.nombre);
    if (!por.has(k)) por.set(k, { equipo: m.equipo, autor: m.nombre, email: m.email || "", textos: [] });
    por.get(k).textos.push(m.texto);
  }
  for (const v of por.values()) out[v.equipo].push({ autor: v.autor, email: v.email, texto: v.textos.join("\n").slice(0, 6000) });
  return out;
}

async function evaluarDebate(relator = null) {
  const d = S.debate;
  if (!d || S.clase.evaluado === d.n) return;
  const entregas = entregasDelDebate(d.n);
  const chatTramo = transcripcionChat(m => m.debate === d.n, 80);
  const pauta = TRAMOS.map(t => `${t.nombre}: ${t.pauta}`).join(" ");
  const trabajos = ["A", "B"].map(async k => {
    const ctx = { ronda: "refutacion", rondaNombre: `Debate ${d.n} (apertura y réplica)`, pauta, dir: EQUIPOS[k].dir,
                  conceptosRival: [], previas: [], ecos: [], chatTramo, relator };
    const evs = await Promise.all(entregas[k].map(t => S.motor.activo ? evaluarConLLM(t.texto, ctx, k) : Promise.resolve(evaluarRigor(t.texto, ctx))));
    return { k, evs };
  });
  const res = await Promise.all(trabajos);
  if (S.clase.evaluado === d.n) return;                 // otra llamada terminó primero
  for (const { k, evs } of res) {
    const textos = entregas[k];
    const turnoOrden = S.seq++;
    textos.forEach((t, i) => S.historial.push({
      orden: S.seq++, turnoOrden, debate: d.n, grupo: d[k], equipo: k, autor: t.autor, autorEmail: t.email || "",
      ronda: "debate", rondaNombre: `Debate ${d.n}`, rolNombre: EQUIPOS[k].nombre, texto: t.texto, ev: evs[i]
    }));
    const rig = evs.length ? evs.reduce((a, ev) => a + ev.rubrica.total, 0) / evs.length : 0;
    postChat({ tipo: "resultado", equipo: k, nombre: "resultado", texto: "", datos: {
      rondaNombre: `Debate ${d.n} · Grupo ${d[k]}`, grupo: d[k], n: textos.length, rigorMedio: +rig.toFixed(1),
      alumnos: textos.map((t, i) => ({ autor: t.autor, total: evs[i].rubrica.total, nota: evs[i].nota || "", banderas: evs[i].banderas }))
    } });
    if (!textos.length) tick(`El Grupo ${d[k]} no escribió en este debate: su parte de jurado vale 0.`);
  }
  S.clase.evaluado = d.n;
  pintarMarcador();
  publicarEstado();
}

function mostrarResultado() {
  const d = S.debate, reg = S.clase.debates[d.n - 1];
  const notas = k => S.historial.filter(h => h.debate === d.n && h.equipo === k).map(h => h.ev.rubrica.total);
  const posiciones = (S.publico.votantes || []).map(v => v.final);
  reg.res = puntajeDebate({ notasA: notas("A"), notasB: notas("B"), posiciones });
  reg.votantes = (S.publico.votantes || []).map(v => ({ ...v }));
  const antes = S.clase.ranking || [];
  S.clase.ranking = ranking(S.clase.grupos, S.clase.debates);
  S.clase.ultimo = { n: d.n, pregunta: d.pregunta, A: d.A, B: d.B, res: reg.res };
  pintarMarcador();                                     // la columna derecha muestra el ranking nuevo
  S.fase = "resultado";
  sonar(reg.res.ganador ? "fanfarria" : "whoosh");
  publicarEstado();
  const seguir = () => {
    if (S.fase !== "resultado") return;
    S.fase = "propuesta";
    // la moderadora agradece y la propuesta siguiente ya se generó durante la votación
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto: `Gracias, Grupo ${d.A} y Grupo ${d.B}. Viene el próximo debate.` });
    if (typeof mostrarPropuesta === "function") mostrarPropuesta();
    publicarEstado();
  };
  if (typeof mostrarResultadoDebate === "function") mostrarResultadoDebate(S.clase.ultimo, antes, S.clase.ranking, seguir);
  else setTimeout(seguir, ROT.SEG_RESULTADO * 1000);
  $("btnPrincipal").textContent = "SEGUIR ▶";
}

function terminarClase() {
  if (S.fase === "abierta" || S.fase === "votando") {
    if (!confirm("Hay un debate en curso. ¿Terminar la clase igual? Ese debate no cuenta para el ranking.")) return;
    clearInterval(S.reloj);
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
  else if (S.fase === "resultado") $("rsSeguir")?.click();
  else if (S.fase === "fin") { if (typeof ceremoniaRanking === "function") ceremoniaRanking(); }
}

$("btnPrincipal").onclick = accionPrincipal;
$("btnTerminar").onclick = terminarClase;

/* ---------------- la propuesta de la moderadora ---------------- */

function promptPropuesta() {
  const hechas = S.clase.debates.map(d => `- ${d.pregunta}`).join("\n") || "(ninguna todavía)";
  const disputas = S.chat.filter(m => m.tipo === "relator" && m.datos && m.datos.disputa).map(m => `- ${m.datos.disputa}`).slice(-5).join("\n") || "(ninguna)";
  const flojas = S.historial.filter(h => h.ev && h.ev.nota && h.ev.rubrica.total < 10).map(h => `- ${h.ev.nota}`).slice(-5).join("\n") || "(nada)";
  const usados = new Set(S.historial.flatMap(h => (h.ev.conceptos || []).map(c => c.id || c)));
  const sinUsar = CONCEPTOS.filter(c => !usados.has(c.id)).map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n") || "(todos se han usado)";
  return `Eres la moderadora de una clase de debate en rotación. Curso: "${SESION.curso}", semana ${SESION.semana}.
TEMA GENERAL (lo fijó el profesor): "${S.clase.tema || SESION.tema}"

MATERIAL DE LA SEMANA (conceptos y lecturas):
${CONCEPTOS.map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n")}

YA SE DEBATIÓ (no repitas ni reformules estas preguntas):
${hechas}

LO QUE QUEDÓ EN DISPUTA SEGÚN EL RELATOR:
${disputas}

LO QUE EL JURADO MARCÓ COMO FLOJO:
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
  const escrita = proximaPreguntaEscrita(escritas, S.clase.debates.map(d => d.pregunta));
  if (escrita) { S.clase.propuesta = { ...base, estado: "lista", pregunta: escrita, porQue: "Pregunta escrita por ti en el archivo de la semana.", mejorFavor: "", mejorContra: "", fuente: "escrita" }; return; }
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
  el.innerHTML = `
    <div class="pr-k">PRÓXIMO DEBATE · lo ves solo tú</div>
    ${p.estado === "pensando" ? `<div class="pr-pensando">La moderadora está pensando la próxima pregunta…</div>` : ""}
    ${p.estado === "vacia" ? `<div class="pr-aviso">La moderadora no pudo proponer una pregunta. Escribe la tuya o pide otra.</div>` : ""}
    ${faltan ? `<div class="pr-aviso">Faltan grupos con alumnos conectados: se necesitan al menos dos.</div>` : ""}
    <textarea id="prTexto" rows="2" maxlength="300" placeholder="Escribe la pregunta del debate">${esc(p.pregunta || "")}</textarea>
    ${p.porQue ? `<div class="pr-porque">${esc(p.porQue)}</div>` : ""}
    ${p.mejorFavor || p.mejorContra ? `<div class="pr-lados"><div style="--c:var(--A)"><b>A favor</b>${esc(p.mejorFavor)}</div><div style="--c:var(--B)"><b>En contra</b>${esc(p.mejorContra)}</div></div>` : ""}
    <div class="pr-grupos"><span style="color:var(--A)">A FAVOR</span>${sel("prA", p.A)}<span style="color:var(--B)">EN CONTRA</span>${sel("prB", p.B)}</div>
    <div class="pr-acc">
      <button class="btn pri" id="prPublicar">Publicar</button>
      <button class="btn" id="prOtra">Pedir otra</button>
      <span class="pr-cuenta" id="prCuenta"></span>
    </div>`;
  const detener = () => { clearInterval(cuentaPropuesta); $("prCuenta").textContent = ""; };
  el.onpointerdown = detener; el.onfocusin = detener;
  $("prPublicar").onclick = publicarPropuestaActual;
  $("prOtra").onclick = () => { S.clase.propuesta = null; prepararPropuesta(); };
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
  if (!pregunta) { tick("Escribe una pregunta o pide otra a la moderadora."); return; }
  if (!A || !B || A === B) { tick("Elige dos grupos distintos."); return; }
  publicarDebate({ pregunta, A, B });
}
