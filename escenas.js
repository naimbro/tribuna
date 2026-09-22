/* =====================================================================
   TRIBUNA — las escenas de la pantalla del profesor que no son el debate:
     1. PORTADA: el QR y el código, y los alumnos que van entrando (foto de Google y nombre),
        con el color de lo que eligieron: A FAVOR, EN CONTRA o PÚBLICO.
     2. INTRO: cuatro láminas mínimas antes de abrir el primer tramo: el tema, la moción, las
        dos posiciones y cómo se gana. Se avanza con clic, → o espacio.
     3. CONFETI para la declaración del ganador (la ceremonia vive en app.js).
   S.etapa guarda dónde va la sala: "portada" → "intro" → null (el debate). online.js lo
   publica para que los teléfonos muestren lo mismo.
   ===================================================================== */

const escHtml = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const iniciales = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase();
const COLOR_ROL = () => ({ A: EQUIPOS.A.color, B: EQUIPOS.B.color, P: "#a78bfa" });

function avatarHtml(j, tam = 64) {
  const c = COLOR_ROL()[j.equipo] || "#4d5f70";
  const cara = j.foto
    ? `<img src="${escHtml(j.foto)}" referrerpolicy="no-referrer" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${iniciales(j.nombre)}'}))">`
    : `<span>${iniciales(j.nombre)}</span>`;
  return `<div class="av" style="--c:${c};--t:${tam}px">${cara}</div>`;
}

/* ---------------------------- 1. PORTADA ---------------------------- */
const PORTADA = { vistos: new Set(), primera: true };

function mostrarPortada(url, codigo, alEmpezar) {
  $("portada")?.remove();
  const el = document.createElement("div");
  el.id = "portada";
  let qr = "";
  if (typeof qrcode === "function") {
    const q = qrcode(0, "M"); q.addData(url); q.make();
    qr = q.createSvgTag({ cellSize: 7, margin: 0 });
  }
  el.innerHTML = `
    <div class="po-top"><b>TRIBUNA</b><span>${escHtml(SESION.curso || "")} · semana ${SESION.semana}</span></div>
    <div class="po-cuerpo">
      <div class="po-entrar">
        <div class="po-k">ENTRA CON TU TELÉFONO</div>
        <div class="po-qr">${qr}</div>
        <div class="po-codigo mono">${codigo}</div>
        <div class="po-url mono">${escHtml(url.replace(/^https?:\/\//, ""))}</div>
      </div>
      <div class="po-sala">
        <div class="po-cfg">
          <label>Tema general <input id="poTema" value="${escHtml(S.clase.tema || SESION.tema)}"></label>
          <label>Grupos <select id="poGrupos">${Array.from({ length: ROT.GRUPOS_MAX - ROT.GRUPOS_MIN + 1 }, (_, i) => i + ROT.GRUPOS_MIN)
            .map(g => `<option ${g === S.clase.grupos ? "selected" : ""}>${g}</option>`).join("")}</select></label>
          ${typeof BRUJULA !== "undefined" ? `<label class="po-sw"><input type="checkbox" id="poBrujula" ${S.clase.brujula && S.clase.brujula.activa ? "checked" : ""}> Usar brújula</label>` : ""}
        </div>
        <div class="po-cuenta" id="poCuenta"></div>
        <div class="po-gente" id="poGente"><div class="po-vacio">Esperando a los primeros…</div></div>
      </div>
    </div>
    <div class="po-pie">
      <span id="poPie">Entren con su cuenta de Google y elijan un grupo. Cada grupo debate y vota por turnos.</span>
      <button class="btn pri" id="poEmpezar">EMPEZAR ▶</button>
    </div>`;
  document.body.appendChild(el);
  // con la brújula encendida, primero se forman los grupos (o se apaga y eligen a mano)
  $("poEmpezar").onclick = () => {
    if (S.clase.brujula && S.clase.brujula.activa && S.clase.brujula.fase === "responder") {
      const a = $("poFormarAviso");
      if (a) a.textContent = "Primero FORMAR GRUPOS (o apaga la brújula para que elijan a mano).";
      return;
    }
    alEmpezar();
  };
  if ($("poBrujula")) $("poBrujula").onchange = ev => {
    S.clase.brujula = { activa: ev.target.checked, fase: ev.target.checked ? "responder" : null };
    S.clase.gruposInfo = [];
    window.publicarEstado?.();
    actualizarPortada(window.jugadoresSala?.() || {});
  };
  $("poTema").onchange = e => { S.clase.tema = e.target.value.trim().slice(0, 200) || SESION.tema; window.publicarEstado?.(); };
  $("poGrupos").onchange = async e => {
    S.clase.grupos = +e.target.value;
    // con los grupos ya formados, cambiar el numero los rehace: el profesor prueba 5 y 6
    // mirando el mapa antes de mandar a nadie a moverse de silla
    if (S.clase.brujula && S.clase.brujula.activa && S.clase.brujula.fase === "grupos") await window.formarGruposBrujula?.();
    else window.publicarEstado?.();
    actualizarPortada(window.jugadoresSala?.() || {});
  };
  PORTADA.primera = true;
}

// Brújula encendida y grupos sin formar: el mapa anónimo de la clase y FORMAR GRUPOS.
function actualizarMapaPortada() {
  const g = $("poGente");
  if (!g || !S.clase.brujula || !S.clase.brujula.activa || S.clase.brujula.fase !== "responder" || typeof BRUJULA === "undefined") return;
  const { puntos } = window.datosMapa ? window.datosMapa() : { puntos: [] };
  const color = id => (BRUJULA.campos.find(c => c.id === id) || {}).color || "#7d8fa1";
  const n = Object.keys(window.jugadoresSala ? window.jugadoresSala() : {}).length;
  $("poCuenta").innerHTML = `<span><b>${puntos.length}</b> de ${n} respondieron la brújula</span>
    ${BRUJULA.campos.map(c => `<span style="color:${c.color}">● ${escHtml(c.nombre)} ${puntos.filter(p => p.campo === c.id).length}</span>`).join("")}`;
  const aviso = $("poFormarAviso") ? $("poFormarAviso").textContent : "";
  // solo el punto de quien acaba de responder entra con animación
  const primera = !PORTADA.bjVistos;
  PORTADA.bjVistos = PORTADA.bjVistos || new Set();
  const conNuevo = puntos.map(p => { const nuevo = !primera && !PORTADA.bjVistos.has(p.uid); PORTADA.bjVistos.add(p.uid); return { ...p, nuevo, color: color(p.campo) }; });
  g.innerHTML = `<div class="po-mapa">${mapaSvg({ puntos: conNuevo, campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 460 })}
    <div class="po-formar"><button class="btn pri" id="poFormar">FORMAR GRUPOS</button><div class="aviso" id="poFormarAviso">${escHtml(aviso)}</div></div></div>`;
  $("poFormar").onclick = async () => {
    const r = await window.formarGruposBrujula();
    if (!r.ok) { $("poFormarAviso").textContent = r.motivo; return; }
    sonar("fanfarria");
    actualizarPortada(window.jugadoresSala());
  };
}

function actualizarPortada(jugadores) {
  const g = $("poGente"); if (!g) return;
  const conBrujula = S.clase.brujula && S.clase.brujula.activa && typeof BRUJULA !== "undefined";
  // con la brujula encendida el selector fija el k del reparto, asi que se muestra siempre
  if ($("poGrupos")) $("poGrupos").closest("label").style.display = "";
  if ($("poBrujula")) $("poBrujula").closest("label").style.display = conBrujula && S.clase.brujula.fase !== "responder" ? "none" : "";
  if ($("poPie")) $("poPie").textContent = conBrujula
    ? `Entren con su cuenta de Google y respondan la brújula (un minuto). Salen ${S.clase.grupos} grupos, por posición en el mapa.`
    : "Entren con su cuenta de Google y elijan un grupo. Cada grupo debate y vota por turnos.";
  if (conBrujula && S.clase.brujula.fase === "responder") { actualizarMapaPortada(); return; }
  const lista = Object.entries(jugadores).map(([uid, j]) => ({ uid, ...j })).sort((a, b) => (a.unido || 0) - (b.unido || 0));
  const N = S.clase.grupos;
  const enGrupo = g => lista.filter(j => j.grupo === g);
  const sinGrupo = lista.filter(j => !(j.grupo > 0));
  $("poCuenta").innerHTML = `<b>${lista.length}</b> en la sala${sinGrupo.length ? ` <span style="color:var(--dim)">· ${sinGrupo.length} eligiendo</span>` : ""}`;
  let nuevos = 0;
  const cara = j => {
    const nuevo = !PORTADA.vistos.has(j.uid);
    if (nuevo) { PORTADA.vistos.add(j.uid); nuevos++; }
    return `<div class="po-j ${nuevo && !PORTADA.primera ? "llega" : ""}" data-uid="${j.uid}" title="Clic para mover de grupo">${avatarHtml({ ...j, equipo: "" }, 50)}<div class="po-n">${escHtml(j.nombre)}</div></div>`;
  };
  g.innerHTML = `<div class="po-grupos">${Array.from({ length: N }, (_, i) => i + 1).map(k =>
      `<div class="po-g"><div class="po-gk">GRUPO ${k}${(S.clase.gruposInfo || []).find(x => x.n === k) ? ` · ${escHtml(S.clase.gruposInfo.find(x => x.n === k).nombre)}` : ""} <span>${enGrupo(k).length}</span></div>${enGrupo(k).map(cara).join("")}</div>`).join("")}</div>
    ${sinGrupo.length ? `<div class="po-sin">${sinGrupo.map(cara).join("")}</div>` : ""}`;
  g.querySelectorAll(".po-j").forEach(el => el.onclick = () => {
    const destino = +prompt(`¿A qué grupo mueves a ${el.textContent.trim()}? (1 a ${N})`);
    if (destino >= 1 && destino <= N) window.moverAlumno?.(el.dataset.uid, destino);
  });
  if (nuevos && !PORTADA.primera) sonar("pop");
  PORTADA.primera = false;
}

function cerrarPortada() { $("portada")?.remove(); }

/* ----------------------------- 2. INTRO ----------------------------- */
function laminasIntro() {
  const mm = s => `${Math.round(s / 60)} min`;
  return [
    `<div class="in-k">SEMANA ${SESION.semana} · TEMA GENERAL</div>
     <div class="in-tema">${escHtml(S.clase.tema || SESION.tema)}</div>`,
    `<div class="in-k">CÓMO FUNCIONA</div>
     <div class="in-jueces">
       <div><div class="in-e">🎙</div><b>LA MODERADORA LLAMA</b><span>Plantea una pregunta y llama a dos grupos: uno a favor y otro en contra.</span></div>
       <div><div class="in-e">💬</div><b>DEBATEN</b><span>Un tramo abierto de ${mm(ROT.SEG_DEBATE)}: la posición de entrada y después libre. La moderadora da la palabra.</span></div>
       <div><div class="in-e">🗳</div><b>LOS DEMÁS VOTAN</b><span>Los grupos que no debaten votan quién los convenció y predicen a los jueces: cada acierto suma un punto de oráculo. Después, rotan.</span></div>
     </div>`,
    `<div class="in-k">CÓMO SE GANA</div>
     <div class="in-jueces">
       <div><div class="in-e">⚖</div><b>LOS JUECES · 50%</b><span>Cinco jueces de IA con perfiles distintos. Como en los clavados, se tachan la nota más alta y la más baja.</span></div>
       <div><div class="in-e">🗳</div><b>EL PÚBLICO · 50%</b><span>Los votos que el grupo gana entre quienes no debaten.</span></div>
       <div><div class="in-e">🏆</div><b>EL RANKING</b><span>Promedio de cada grupo por debate. Al final de la clase, el campeón.</span></div>
     </div>`
  ];
}

function mostrarIntro(alTerminar) {
  $("intro")?.remove();
  const laminas = laminasIntro();
  let i = 0;
  const el = document.createElement("div");
  el.id = "intro";
  el.innerHTML = `<div class="in-lamina" id="inLamina"></div>
    <div class="in-pie"><div class="in-puntos" id="inPuntos"></div>
      <button class="btn" id="inAtras">‹</button><button class="btn pri" id="inSig"></button></div>`;
  document.body.appendChild(el);
  const pinta = () => {
    const l = $("inLamina");
    l.classList.remove("on"); void l.offsetWidth;
    l.innerHTML = laminas[i]; l.classList.add("on");
    $("inPuntos").innerHTML = laminas.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
    $("inSig").textContent = i === laminas.length - 1 ? "AL DEBATE ▶" : "SIGUIENTE ›";
    $("inAtras").style.visibility = i ? "visible" : "hidden";
    sonar("whoosh");
  };
  const fin = () => { document.removeEventListener("keydown", teclas); el.remove(); alTerminar?.(); };
  const sig = () => { if (i < laminas.length - 1) { i++; pinta(); } else fin(); };
  const atras = () => { if (i > 0) { i--; pinta(); } };
  const teclas = e => {
    if (e.target.closest?.("input,textarea,select")) return;
    if (["ArrowRight", " ", "Enter", "PageDown"].includes(e.key)) { e.preventDefault(); sig(); }
    if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); atras(); }
    if (e.key === "Escape") fin();
  };
  document.addEventListener("keydown", teclas);
  $("inSig").onclick = e => { e.stopPropagation(); sig(); };
  $("inAtras").onclick = e => { e.stopPropagation(); atras(); };
  $("inLamina").onclick = sig;
  pinta();
}

/* ---------------------------- 3. CONFETI ---------------------------- */
function confeti(colores, ms = 5000) {
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;z-index:80;pointer-events:none";
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const x = c.getContext("2d");
  const ps = Array.from({ length: 220 }, () => ({
    x: c.width / 2 + (Math.random() - .5) * c.width * .3, y: c.height * .45,
    vx: (Math.random() - .5) * 22, vy: -Math.random() * 20 - 6,
    r: Math.random() * 7 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .4,
    col: colores[Math.floor(Math.random() * colores.length)]
  }));
  const t0 = performance.now();
  (function paso(t) {
    x.clearRect(0, 0, c.width, c.height);
    const vida = 1 - (t - t0) / ms;
    for (const p of ps) {
      p.vy += .45; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      x.save(); x.globalAlpha = Math.max(0, Math.min(1, vida * 2)); x.translate(p.x, p.y); x.rotate(p.a);
      x.fillStyle = p.col; x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore();
    }
    if (vida > 0) requestAnimationFrame(paso); else c.remove();
  })(t0);
}

// 📖 INTRO en la sala de control: la vuelve a mostrar (en línea, online.js la reemplaza por
// una versión que también la muestra en los teléfonos).
$("btnIntro").onclick = () => mostrarIntro();

/* ------------------- 4. RESULTADO Y RANKING ------------------- */
function tablaRanking(filas, antes = []) {
  const puestoAntes = g => (antes.find(f => f.grupo === g) || {}).puesto;
  const fmt1 = v => v === null || v === undefined ? "—" : v.toFixed(1);
  return `<table class="rk"><tr><th></th><th>Grupo</th><th>Debates</th><th>Jurado</th><th>Público</th><th>Puntaje</th></tr>
    ${filas.map(f => {
      const pa = puestoAntes(f.grupo), mov = pa && f.puesto ? pa - f.puesto : 0;
      return `<tr class="${f.debates ? "" : "sin"}"><td class="pu">${f.puesto ?? "·"}${mov > 0 ? `<i class="sube">▲${mov}</i>` : mov < 0 ? `<i class="baja">▼${-mov}</i>` : ""}</td>
        <td><b>Grupo ${f.grupo}</b>${f.distincion === "jurado" || f.distincion === "ambos" ? ` <span class="dis">★ mejor argumentado</span>` : ""}${f.distincion === "publico" || f.distincion === "ambos" ? ` <span class="dis">♥ favorito del público</span>` : ""}</td>
        <td>${f.debates || "sin debatir"}</td><td>${fmt1(f.jurado)}</td><td>${fmt1(f.publico)}</td><td class="pt">${fmt1(f.puntaje)}</td></tr>`;
    }).join("")}</table>`;
}

function mostrarResultadoDebate(u, antes, despues, alTerminar, oraculos = []) {
  cerrarEscena();
  $("resultado")?.remove();
  const r = u.res, gana = r.ganador ? u[r.ganador] : null;
  const f1 = v => (v === null || v === undefined ? "—" : v.toFixed(1));
  const lado = (k, c) => `<div class="rs-lado" style="--c:${c}"><div class="rs-g">GRUPO ${u[k]}</div><div class="rs-p">${f1(r[k].puntaje)}</div>
    <div class="rs-d">jueces ${u.panel && u.panel[k].total !== null ? f1(u.panel[k].total) + "/30" : "—"} · público ${u.publico && u.publico.n ? u.publico[k] + " votos" : "—"}</div></div>`;
  const top = (oraculos || []).filter(o => o.predicciones).slice(0, 5);
  const el = document.createElement("div");
  el.id = "resultado";
  el.innerHTML = `<div class="rs-k">DEBATE ${u.n} · RESULTADO</div>
    <div class="rs-q">«${escHtml(u.pregunta)}»</div>
    <div class="rs-vs">${lado("A", EQUIPOS.A.color)}<div class="rs-x">${gana ? `GANA GRUPO ${gana}` : "EMPATE"}</div>${lado("B", EQUIPOS.B.color)}</div>
    <div class="rs-tablas">${tablaRanking(despues, antes)}
      <div class="rs-or"><div class="rs-ork">🔮 ORÁCULOS</div>${top.length ? top.map(o => `<div><span>#${o.puesto}</span><b>${escHtml(conGrupo(o.nombre, o.grupo))}</b><i>${o.puntos}</i></div>`).join("")
        : `<div class="vacio">Nadie ha acertado todavía.</div>`}</div></div>
    <div class="rs-pie"><button class="btn pri" id="rsSeguir">SEGUIR ▶</button></div>`;
  document.body.appendChild(el);
  let hecho = false;
  const fin = () => { if (hecho) return; hecho = true; el.remove(); alTerminar(); };
  $("rsSeguir").onclick = fin;
  setTimeout(fin, ROT.SEG_RESULTADO * 1000);
}

// La ceremonia final tiene dos actos: el podio de los grupos (quién debatió mejor) y el podio de
// los oráculos (quién predijo mejor a los jueces). El segundo llega solo, o con «VER ORÁCULOS».
function ceremoniaRanking() {
  S.veredictoRevelado = true;
  const filas = (S.clase.ranking || []).filter(f => f.debates > 0);
  $("ceremonia")?.remove();
  const el = document.createElement("div");
  el.id = "ceremonia";
  el.innerHTML = `<div class="cer-k" id="cer0">EL RANKING DE LA CLASE</div>
    <div class="cer-rk">${[...filas].reverse().map((f, i) => `<div class="cer-fila" id="cf${i}"><span class="n">#${f.puesto}</span><b>GRUPO ${f.grupo}</b><span class="p">${f.puntaje.toFixed(1)}</span></div>`).join("")}</div>
    <div class="cer-bloque" id="cerG"><div class="cer-k">CAMPEÓN</div><div class="cer-g" style="color:var(--amber)">${filas[0] ? `🏆 GRUPO ${filas[0].grupo}` : "SIN DEBATES"}</div></div>
    <div class="cer-lect" id="cer3"><button class="btn pri" id="cerOr">VER ORÁCULOS ▶</button> <button class="btn" id="cerCerrar">Cerrar</button></div>`;
  document.body.appendChild(el);
  sonar("redoble");
  const paso = 1100, n = filas.length;
  filas.forEach((_, i) => setTimeout(() => { $("cf" + i)?.classList.add("on"); sonar(i === n - 1 ? "redoble" : "nota", 10 + i); }, 1500 + i * paso));
  const tG = 1500 + n * paso + 1500;
  setTimeout(() => { $("cerG")?.classList.add("on"); sonar("fanfarria"); setTimeout(() => sonar("aplauso"), 500); confeti(["#ffb020", "#ffffff", EQUIPOS.A.color]); }, tG);
  setTimeout(() => $("cer3")?.classList.add("on"), tG + 1500);
  let segundo = false;
  const acto2 = () => { if (segundo || !el.isConnected) return; segundo = true; ceremoniaOraculos(el); };
  setTimeout(acto2, tG + 7000);
  $("cerOr").onclick = acto2;
  $("cerCerrar").onclick = () => el.remove();
  window.publicarEstado?.();
}

function ceremoniaOraculos(el) {
  const ors = rankingOraculos(S.clase.oraculos || {}).slice(0, 5);
  const top = ors[0];
  el.innerHTML = `<div class="cer-k" style="color:#a78bfa">🔮 EL ORÁCULO DE LA CLASE</div>
    <div class="cer-sub">quién predijo mejor a los jueces</div>
    ${ors.length ? `<div class="cer-rk">${[...ors].reverse().map((o, i) => `<div class="cer-fila" id="co${i}"><span class="n">#${o.puesto}</span>
        <b>${escHtml(conGrupo(o.nombre, o.grupo))}</b><span class="p" style="color:#a78bfa">${o.aciertos} de ${o.predicciones}</span></div>`).join("")}</div>
      <div class="cer-bloque" id="coG"><div class="cer-g" style="color:#a78bfa">🔮 ${escHtml(conGrupo(top.nombre, top.grupo))}</div>
        <div class="cer-s">${top.puntos} punto${top.puntos === 1 ? "" : "s"} · acertó ${top.aciertos} de ${top.predicciones} veredictos</div></div>`
    : `<div class="cer-bloque on"><div class="cer-g" style="color:var(--dim);font-size:40px">Nadie predijo a los jueces esta clase</div>
        <div class="cer-s">Solo cuentan los debates donde los jueces eligieron un ganador; los empates no suman.</div></div>`}
    <div class="cer-lect" id="co3"><button class="btn" id="coCerrar">Cerrar</button></div>`;
  sonar("redoble");
  const paso = 1000, n = ors.length;
  ors.forEach((_, i) => setTimeout(() => { $("co" + i)?.classList.add("on"); sonar("nota", 10 + i); }, 1200 + i * paso));
  const tG = 1200 + n * paso + 1200;
  if (n) setTimeout(() => { $("coG")?.classList.add("on"); sonar("fanfarria"); confeti(["#a78bfa", "#ffffff", "#ffb020"]); }, tG);
  setTimeout(() => $("co3")?.classList.add("on"), n ? tG + 1500 : 800);
  $("coCerrar").onclick = () => el.remove();
}

/* ------------------------ LA BRÚJULA, OTRA VEZ ------------------------ */
// El cierre opcional: la brújula otra vez y una flecha por alumno, desde su punto inicial al final.
// Se repinta cada vez que llega una respuesta (online.js llama a refrescarMovimiento).
function mostrarMovimiento() {
  escena("movimiento");
  botonEscena("LISTO ▶");
  refrescarMovimiento();
}
function refrescarMovimiento() {
  const el = $("escena");
  if (!el || !el.classList.contains("movimiento") || typeof BRUJULA === "undefined" || !window.datosMapa) return;
  const { puntos, movimiento } = window.datosMapa();
  const color = id => (BRUJULA.campos.find(c => c.id === id) || {}).color || "#7d8fa1";
  const cuenta = (xs, id) => xs.filter(p => p.campo === id).length;
  el.innerHTML = `<div class="es-k">🧭 LA BRÚJULA, OTRA VEZ · ${movimiento.length} de ${puntos.length} respondieron</div>
    <div class="po-mapa" style="justify-content:center">${mapaSvg({ puntos: movimiento.map(m => ({ x: m.x, y: m.y, desde: m.desde, color: color(m.campo) })), campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 520 })}
      <div class="rs-or"><div class="rs-ork">ANTES → AHORA</div>${BRUJULA.campos.map(c => `<div><b style="color:${c.color}">${escHtml(c.nombre)}</b><i>${cuenta(movimiento.map(m => ({ campo: m.campoAntes })), c.id)} → ${cuenta(movimiento, c.id)}</i></div>`).join("")}</div></div>`;
}

/* ------------------------ 5. VEREDICTOS ------------------------ */
// Cada escena ocupa la pantalla completa (#escena). Las esperas se pueden saltar con el botón
// principal: saltarEscena() termina la espera en curso y las siguientes pasan de inmediato.
const ESC = { rapido: false, resolver: null };
function esperar(ms) {
  if (ESC.rapido) return Promise.resolve();
  return new Promise(r => {
    const t = setTimeout(() => { ESC.resolver = null; r(); }, ms);
    ESC.resolver = () => { clearTimeout(t); ESC.resolver = null; r(); };
  });
}
function saltarEscena() { ESC.rapido = true; if (ESC.resolver) ESC.resolver(); }
function escena(clase) {
  $("escena")?.remove();
  ESC.rapido = false;
  const el = document.createElement("div");
  el.id = "escena"; el.className = "escena " + clase;
  document.body.appendChild(el);
  botonEscena(clase === "votacion" ? "CERRAR VOTACIÓN ▶" : "SALTAR ▶");
  return el;
}
function cerrarEscena() { $("escena")?.remove(); $("esSig")?.remove(); }

// Las escenas tapan el botón principal: cada una trae el suyo, abajo a la derecha, que hace lo
// mismo (cerrar la votación o saltar el veredicto). También sirven → y Enter.
function botonEscena(texto) {
  let b = $("esSig");
  if (!b) {
    b = document.createElement("button");
    b.id = "esSig"; b.className = "btn pri";
    b.onclick = () => { if (typeof accionPrincipal === "function") accionPrincipal(); };
    document.body.appendChild(b);
  }
  b.textContent = texto;
}
document.addEventListener("keydown", e => {
  if (!$("escena") || e.target.closest?.("input,textarea,select")) return;
  if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); if (typeof accionPrincipal === "function") accionPrincipal(); }
});
const fmtNota = v => (v === null || v === undefined ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(1));

// Contador animado con setTimeout (requestAnimationFrame se detiene en pestañas en segundo plano)
function contar(el, hasta) {
  if (hasta === null || hasta === undefined) { el.textContent = "—"; return Promise.resolve(); }
  if (ESC.rapido) { el.textContent = hasta.toFixed(1); return Promise.resolve(); }
  return new Promise(r => {
    const t0 = Date.now(), dur = 1600;
    const paso = () => {
      const p = Math.min(1, (Date.now() - t0) / dur);
      el.textContent = (hasta * p).toFixed(1);
      if (p < 1 && !ESC.rapido) setTimeout(paso, 40); else { el.textContent = hasta.toFixed(1); r(); }
    };
    paso();
  });
}

function mostrarVotacion(d) {
  const el = escena("votacion");
  el.innerHTML = `<div class="es-k">EL PÚBLICO VOTA · ¿quién convenció?</div>
    <div class="es-q">«${escHtml(d.pregunta)}»</div>
    <div class="vb">${["A", "B"].map(k => `<div class="vb-fila" id="vbf${k}" style="--c:${EQUIPOS[k].color}">
        <div class="vb-n">${EQUIPOS[k].nombre} · GRUPO ${d[k]}</div>
        <div class="vb-barra"><i id="vb${k}"></i></div><div class="vb-c mono" id="vbc${k}">0</div></div>`).join("")}</div>
    <div class="es-pie mono" id="vbPie"></div>`;
  actualizarVotacion();
}

function actualizarVotacion() {
  if (!$("vbA")) return;
  const P = S.publico || {}, a = P.A || 0, b = P.B || 0;
  const tope = Math.max(1, a, b, Math.ceil((P.elegibles || 0) / 2));
  $("vbA").style.width = (100 * a / tope) + "%";
  $("vbB").style.width = (100 * b / tope) + "%";
  $("vbcA").textContent = a; $("vbcB").textContent = b;
  if (S.fase === "votando") {
    const resta = S.finVoto ? Math.max(0, Math.ceil((S.finVoto - Date.now()) / 1000)) : 0;
    $("vbPie").textContent = `${a + b} de ${P.elegibles ?? "?"} votaron · ${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, "0")}`;
  }
}

async function mostrarVeredictoPublico(d, pub) {
  if (!$("vbA")) mostrarVotacion(d);
  ESC.rapido = false;
  actualizarVotacion();
  $("vbPie").textContent = "VOTACIÓN CERRADA";
  botonEscena("SALTAR ▶");
  sonar("redoble");
  await esperar(1800);
  if (!$("escena")) return;                      // la escena se cerró (p. ej. terminó la clase)
  const g = pub.ganador;
  $("escena").classList.add("cerrada");
  if (g) $("vbf" + g).classList.add("gana");
  const b = document.createElement("div");
  b.className = "es-ganador on";
  b.innerHTML = !pub.n ? "Nadie votó en este debate"
    : g ? `GANA EL PÚBLICO: <b style="color:${EQUIPOS[g].color}">GRUPO ${d[g]}</b> · ${Math.round(g === "A" ? pub.parteA : pub.parteB)} %`
    : "EMPATE EN EL PÚBLICO";
  $("escena").appendChild(b);
  sonar(g ? "fanfarria" : "whoosh");
  await esperar(ROT.SEG_VEREDICTO_PUBLICO * 1000);
}

function mostrarDeliberando(d) {
  const el = escena("deliberan");
  el.innerHTML = `<div class="es-k">EL PANEL DE JUECES</div><div class="es-q">«${escHtml(d.pregunta)}»</div>
    <div class="es-delib">Los jueces deliberan…</div>`;
}

async function mostrarVeredictoJueces(d, jueces, panel) {
  const el = escena("jueces");
  const tarjeta = (j, k) => `<div class="tj" id="tj-${j.id}-${k}" style="--c:${EQUIPOS[k].color}">${fmtNota(j[k])}</div>`;
  el.innerHTML = `<div class="es-k">EL PANEL DE JUECES</div>
    <div class="es-q">«${escHtml(d.pregunta)}»</div>
    <div class="jz-lados"><span style="color:${EQUIPOS.A.color}">■ GRUPO ${d.A} · A FAVOR</span><span style="color:${EQUIPOS.B.color}">■ GRUPO ${d.B} · EN CONTRA</span></div>
    <div class="jz">${jueces.map(j => `<div class="jz-col" id="jz-${j.id}">
        <div class="jz-e">${j.emoji}</div><div class="jz-n">${escHtml(j.nombre)}</div><div class="jz-p">${escHtml(j.valora)}</div>
        <div class="jz-t">${tarjeta(j, "A")}${tarjeta(j, "B")}</div>
        <div class="jz-f"><i style="color:${EQUIPOS.A.color}">${escHtml(j.fraseA || "")}</i><i style="color:${EQUIPOS.B.color}">${escHtml(j.fraseB || "")}</i></div>
      </div>`).join("")}</div>
    <div class="jz-tot">${["A", "B"].map(k => `<div style="--c:${EQUIPOS[k].color}"><small>GRUPO ${d[k]}</small><b class="mono" id="jzt${k}">0.0</b><small>/30</small></div>`).join("")}</div>
    <div class="es-ganador" id="jzG"></div>
    ${jueces.some(j => j.simulado) ? `<div class="jz-sim">jueces simulados (sin motor)</div>` : ""}`;
  sonar("redoble");
  await esperar(1200);
  for (const j of jueces) {
    if (!el.isConnected) return;                 // la escena se cerró (p. ej. terminó la clase)
    $("jz-" + j.id).classList.add("on");
    sonar(j.A === null && j.B === null ? "whoosh" : "nota", 12);
    await esperar(ROT.SEG_JUEZ * 1000);
  }
  if (!el.isConnected) return;
  for (const k of ["A", "B"]) for (const id of panel[k].descartadas) $(`tj-${id}-${k}`)?.classList.add("tachada");
  sonar("whoosh");
  await esperar(1500);
  if (!el.isConnected) return;
  await Promise.all(["A", "B"].map(k => contar($("jzt" + k), panel[k].total)));
  if (!el.isConnected) return;
  const g = panel.ganador;
  $("jzG").innerHTML = panel.A.total === null ? "Los jueces no alcanzaron a votar"
    : g ? `GANAN LOS JUECES: <b style="color:${EQUIPOS[g].color}">GRUPO ${d[g]}</b>` : "EMPATE ENTRE LOS JUECES";
  $("jzG").classList.add("on");
  sonar(g ? "fanfarria" : "whoosh");
  if (g) confeti([EQUIPOS[g].color, "#ffffff", "#ffb020"], 3000);
  await esperar(ROT.SEG_TOTALES * 1000);
}
