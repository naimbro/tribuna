/* =====================================================================
   TRIBUNA — las escenas de la pantalla del profesor que no son el debate:
     1. PORTADA: el QR y el código, y los alumnos que van entrando (foto de Google y nombre),
        con el color de lo que eligieron: A FAVOR, EN CONTRA o PÚBLICO.
     2. INTRO: láminas mínimas antes de abrir el primer tramo: el tema, cómo funciona, qué hace
        el público mientras debaten otros, cómo se gana y (si la semana lo define) qué es un
        instrumento. Se avanza con clic, → o espacio.
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
          ${PERS ? `<label>Cupo por personaje <input id="poCupo" type="number" min="1" max="30" value="${S.clase.cupo || SESION.cupo || 4}" style="width:64px"></label>
            <button class="btn pri" id="poInscripcion"></button><span id="poInsEstado" class="po-ins"></span>`
          : `<label>Grupos <select id="poGrupos">${Array.from({ length: ROT.GRUPOS_MAX - ROT.GRUPOS_MIN + 1 }, (_, i) => i + ROT.GRUPOS_MIN)
            .map(g => `<option ${g === S.clase.grupos ? "selected" : ""}>${g}</option>`).join("")}</select></label>`}
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
  // con la brújula encendida, primero se forman los grupos (o se apaga y eligen a mano).
  // Con personajes, EMPEZAR cierra la inscripción: quien no eligió entra al personaje más chico.
  $("poEmpezar").onclick = () => {
    if (PERS && S.clase.inscripcion === "abierta") window.cerrarInscripcion?.();
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
  if (PERS) {
    $("poInscripcion").onclick = () => {
      if (S.clase.inscripcion === "abierta") window.cerrarInscripcion?.();
      else window.abrirInscripcion?.(+$("poCupo").value);
      actualizarPortada(window.jugadoresSala?.() || {});
    };
    // el cupo se puede subir (o corregir) con la inscripción abierta
    $("poCupo").onchange = () => { window.fijarCupo?.(+$("poCupo").value); actualizarPortada(window.jugadoresSala?.() || {}); };
  }
  if ($("poGrupos")) $("poGrupos").onchange = async e => {
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
  const { puntos, completos } = puntosDelMapa();
  const n = Object.keys(window.jugadoresSala ? window.jugadoresSala() : {}).length;
  $("poCuenta").innerHTML = `<span><b>${completos}</b> de ${n} respondieron la brújula</span>
    ${BRUJULA.campos.map(c => `<span style="color:${c.color}">● ${escHtml(c.nombre)} ${puntos.filter(p => p.campo === c.id).length}</span>`).join("")}`;
  // el mapa se arma una vez y después solo se mueven los puntos (mapavivo.js)
  if (!PORTADA.mapa || !g.contains(PORTADA.mapa.svg)) {
    g.innerHTML = `<div class="po-mapa"><div id="poMapaVivo"></div>
      <div class="po-formar"><button class="btn pri" id="poFormar">FORMAR GRUPOS</button>
        <button class="btn" id="poAmpliar" title="El mapa a pantalla completa, para proyectarlo">⛶ AMPLIAR MAPA</button>
        <div class="aviso" id="poFormarAviso"></div></div></div>
      <div class="po-tira" id="poTira"></div>`;
    PORTADA.mapa = crearMapaVivo($("poMapaVivo"), { campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 460 });
    $("poAmpliar").onclick = abrirMapaGrande;
    $("poFormar").onclick = async () => {
      const b = $("poFormar");
      b.disabled = true; b.textContent = "FORMANDO…";
      try {
        const r = await window.formarGruposBrujula();
        if (!r.ok) { $("poFormarAviso").textContent = r.motivo; return; }
        sonar("fanfarria");
        actualizarPortada(window.jugadoresSala());
      } finally { if ($("poFormar")) { $("poFormar").disabled = false; $("poFormar").textContent = "FORMAR GRUPOS"; } }
    };
  }
  PORTADA.mapa.actualizar(puntos);
  // bajo el mapa, las caras de quienes van entrando (✓: ya respondió). El mapa sigue anónimo:
  // la cara dice que llegó, no dónde quedó.
  const hechos = new Set(puntos.filter(p => !p.parcial).map(p => p.uid));
  const lista = Object.entries(window.jugadoresSala ? window.jugadoresSala() : {})
    .map(([uid, j]) => ({ uid, ...j })).sort((a, b) => (a.unido || 0) - (b.unido || 0));
  const antes = PORTADA.vistos.size;
  $("poTira").innerHTML = lista.map(j => caraPortada(j, 44, hechos.has(j.uid) ? `<i class="po-ok">✓</i>` : "", false)).join("");
  if (PORTADA.vistos.size > antes && !PORTADA.primera) sonar("pop");
  PORTADA.primera = false;
}

// Una cara de la portada; la primera vez que aparece alguien, entra con un salto.
function caraPortada(j, tam, extra = "", clic = true) {
  const nuevo = !PORTADA.vistos.has(j.uid);
  if (nuevo) PORTADA.vistos.add(j.uid);
  return `<div class="po-j ${nuevo && !PORTADA.primera ? "llega" : ""}" data-uid="${j.uid}"${clic ? ` title="Clic para mover de grupo"` : ""}>${avatarHtml({ ...j, equipo: "" }, tam)}${extra}<div class="po-n">${escHtml(j.nombre)}</div></div>`;
}

function actualizarPortada(jugadores) {
  const g = $("poGente"); if (!g) return;
  const conBrujula = S.clase.brujula && S.clase.brujula.activa && typeof BRUJULA !== "undefined";
  // con la brujula encendida el selector fija el k del reparto, asi que se muestra siempre
  if ($("poGrupos")) $("poGrupos").closest("label").style.display = "";
  if (PERS) { portadaPersonajes(jugadores); return; }
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
  const antes = PORTADA.vistos.size;
  const cara = j => caraPortada(j, 50);
  g.innerHTML = `<div class="po-grupos">${Array.from({ length: N }, (_, i) => i + 1).map(k =>
      `<div class="po-g"><div class="po-gk">GRUPO ${k}${(S.clase.gruposInfo || []).find(x => x.n === k) ? ` · ${escHtml(S.clase.gruposInfo.find(x => x.n === k).nombre)}` : ""} <span>${enGrupo(k).length}</span></div>${enGrupo(k).map(cara).join("")}</div>`).join("")}</div>
    ${sinGrupo.length ? `<div class="po-sin">${sinGrupo.map(cara).join("")}</div>` : ""}`;
  g.querySelectorAll(".po-j").forEach(el => el.onclick = () => {
    const destino = +prompt(`¿A qué grupo mueves a ${el.textContent.trim()}? (1 a ${N})`);
    if (destino >= 1 && destino <= N) window.moverAlumno?.(el.dataset.uid, destino);
  });
  if (PORTADA.vistos.size > antes && !PORTADA.primera) sonar("pop");
  PORTADA.primera = false;
}

// Clase con personajes: una columna por personaje con su cupo («3/4»), y el botón de la
// inscripción. Clic en una cara para moverla a otro personaje (o sacarla).
function portadaPersonajes(jugadores) {
  const g = $("poGente"); if (!g) return;
  const lista = Object.entries(jugadores).map(([uid, j]) => ({ uid, ...j })).sort((a, b) => (a.unido || 0) - (b.unido || 0));
  const conteo = conteoPersonajes(jugadores, PERS), cupo = S.clase.cupo || SESION.cupo || 4;
  const sin = lista.filter(j => !(j.grupo > 0));
  const ins = S.clase.inscripcion;
  $("poInscripcion").textContent = ins === "abierta" ? "CERRAR INSCRIPCIÓN" : ins === "cerrada" ? "REABRIR INSCRIPCIÓN" : "ABRIR INSCRIPCIÓN";
  $("poInsEstado").textContent = ins === "abierta" ? "● abierta" : ins === "cerrada" ? "cerrada: quien llegue entra al personaje más chico" : `sugerido: cupo ${cupoSugerido(lista.length, PERS.length)} para ${lista.length}`;
  const lleno = ins === "abierta" && sin.length && todosLlenos(conteo, cupo, PERS);
  $("poCuenta").innerHTML = `<b>${lista.length}</b> en la sala${sin.length ? ` <span style="color:var(--dim)">· ${sin.length} sin personaje</span>` : ""}`
    + (lleno ? ` <span style="color:var(--hot)">· todos los personajes están llenos: sube el cupo</span>` : "");
  if ($("poPie")) $("poPie").textContent = ins === "abierta"
    ? `Elijan su personaje en el teléfono: cupo ${cupo}, por orden de llegada. Si se llena, elijan otro.`
    : "Entren con su cuenta de Google y el código. La inscripción a los personajes se abre en un momento.";
  const antes = PORTADA.vistos.size;
  const cara = j => caraPortada(j, 46);
  g.innerHTML = `<div class="po-grupos">${PERS.map(p => `<div class="po-g" style="border-color:${p.color}">
      <div class="po-gk" style="color:${p.color}">${escHtml(p.nombre.toUpperCase())} <span>${conteo[p.n]}/${cupo}</span></div>
      <div class="po-gc">${escHtml(p.cargo)} · duelo ${p.duelo} · ${p.lado === "A" ? "a favor" : "en contra"}</div>
      ${lista.filter(j => j.grupo === p.n).map(cara).join("")}</div>`).join("")}</div>
    ${sin.length ? `<div class="po-sin">${sin.map(cara).join("")}</div>` : ""}`;
  g.querySelectorAll(".po-j").forEach(el => el.onclick = () => {
    const menu = PERS.map(p => `${p.n} ${p.nombre}`).join("\n");
    const r = prompt(`¿A qué personaje mueves a ${el.textContent.trim()}?\n${menu}\n0 sin personaje`);
    if (r === null || r.trim() === "") return;
    const destino = +r;
    if (destino >= 0 && destino <= PERS.length) window.moverAlumno?.(el.dataset.uid, destino);
  });
  if (PORTADA.vistos.size > antes && !PORTADA.primera) sonar("pop");
  PORTADA.primera = false;
}

function cerrarPortada() { $("portada")?.remove(); }

/* ----------------------------- 2. INTRO ----------------------------- */
function laminasIntro() {
  const mm = s => `${Math.round(s / 60)} min`;
  return [
    `<div class="in-k">SEMANA ${SESION.semana} · TEMA GENERAL</div>
     <div class="in-tema">${escHtml(S.clase.tema || SESION.tema)}</div>`,
    ...(PERS ? [`<div class="in-k">SEIS PERSONAJES · TRES DUELOS</div>
     <div class="in-duelos">${(typeof PREGUNTAS !== "undefined" ? PREGUNTAS : []).filter(q => q.duelo).map((q, i) => {
       const d = dueloEnGrupos(q.duelo, PERS) || {};
       const p = n => personajeDe(n, PERS) || { nombre: "?", cargo: "", color: "var(--dim)" };
       return `<div><b style="color:${p(d.A).color}">${escHtml(p(d.A).nombre)}</b><i>duelo ${i + 1}</i><b style="color:${p(d.B).color}">${escHtml(p(d.B).nombre)}</b>
         <span>«${escHtml(q.texto)}»</span></div>`; }).join("")}</div>
     <div class="in-sub">Hablan en primera persona, como su personaje. Los jueces premian la fidelidad: que tu personaje lo diría, y que puedas decir dónde lo dijo.</div>`] : []),
    `<div class="in-k">CÓMO FUNCIONA</div>
     <div class="in-jueces">
       <div><div class="in-e">🎙</div><b>LA MODERADORA LLAMA</b><span>${PERS ? "Llama a los dos personajes de cada duelo, en orden: uno a favor y otro en contra." : "Plantea una pregunta y llama a dos grupos: uno a favor y otro en contra."}</span></div>
       <div><div class="in-e">💬</div><b>DEBATEN</b><span>Un tramo abierto de ${mm(ROT.SEG_DEBATE)}: la posición de entrada y después libre. La moderadora da la palabra.</span></div>
       <div><div class="in-e">🗳</div><b>LOS DEMÁS VOTAN</b><span>Los grupos que no debaten votan quién argumentó mejor —aunque no piensen como él— y predicen a los jueces: cada acierto suma un punto de oráculo. Después, rotan.</span></div>
     </div>`,
    `<div class="in-k">MIENTRAS DEBATEN OTROS · EL PÚBLICO JUEGA</div>
     <div class="in-jueces">
       <div><div class="in-e">🌡</div><b>EL TERMÓMETRO</b><span>Mueve el deslizador de tu teléfono cuando algo te convenza. La curva de la sala se ve aquí en vivo.</span></div>
       <div><div class="in-e">🔥 🤔 🤝</div><b>REACCIONA</b><span>Toca un mensaje: buen punto, ¿de dónde sale?, buena concesión. Si muchos piden la fuente, la moderadora la pide por ustedes.</span></div>
       <div><div class="in-e">✋</div><b>PREGUNTA</b><span>Deja una pregunta para el debate. Si la moderadora la elige, la lanza con tu nombre y sumas un punto de oráculo.</span></div>
     </div>`,
    `<div class="in-k">CÓMO SE GANA</div>
     <div class="in-jueces">
       <div><div class="in-e">⚖</div><b>LOS JUECES · 50%</b><span>Cinco jueces de IA con perfiles distintos. Como en los clavados, se tachan la nota más alta y la más baja.</span></div>
       <div><div class="in-e">🗳</div><b>EL PÚBLICO · 50%</b><span>Los votos que el grupo gana entre quienes no debaten.</span></div>
       <div><div class="in-e">🏆</div><b>EL RANKING</b><span>${PERS ? "Cada personaje debate una vez. Al final de la clase, el campeón." : "Promedio de cada grupo por debate. Al final de la clase, el campeón."}</span></div>
     </div>`,
    // lo que piden los jueces: se explica antes, para que nadie se entere en vivo frente a la sala
    ...(typeof INSTRUMENTOS !== "undefined" && INSTRUMENTOS.length ? [`<div class="in-k">LO QUE PIDEN LOS JUECES · EL INSTRUMENTO</div>
     <div class="in-sub">«Hay que regular» no basta. ¿Qué le piden (o le niegan) al Estado, quién lo hace cumplir y quién paga?</div>
     <div class="in-inst">${INSTRUMENTOS.map(x => `<div><b>${escHtml(x.nombre)}</b><span>${escHtml(x.ej)}</span></div>`).join("")}</div>`] : [])
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
// origen: de dónde sale (p. ej. la barra de participación); por defecto, el centro
function confeti(colores, ms = 5000, origen = null) {
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;z-index:80;pointer-events:none";
  c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const x = c.getContext("2d");
  const ps = Array.from({ length: 220 }, () => ({
    x: origen ? origen.x + (Math.random() - .5) * 160 : c.width / 2 + (Math.random() - .5) * c.width * .3, y: origen ? origen.y : c.height * .45,
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
  return `<table class="rk"><tr><th></th><th>${PERS ? "Personaje" : "Grupo"}</th><th>Debates</th><th>Jurado</th><th>Público</th><th>Puntaje</th></tr>
    ${filas.map(f => {
      const pa = puestoAntes(f.grupo), mov = pa && f.puesto ? pa - f.puesto : 0;
      return `<tr class="${f.debates ? "" : "sin"}"><td class="pu">${f.puesto ?? "·"}${mov > 0 ? `<i class="sube">▲${mov}</i>` : mov < 0 ? `<i class="baja">▼${-mov}</i>` : ""}</td>
        <td><b>${escHtml(nombreG(f.grupo))}</b>${f.distincion === "jurado" || f.distincion === "ambos" ? ` <span class="dis">★ mejor argumentado</span>` : ""}${f.distincion === "publico" || f.distincion === "ambos" ? ` <span class="dis">♥ favorito del público</span>` : ""}</td>
        <td>${f.debates || "sin debatir"}</td><td>${fmt1(f.jurado)}</td><td>${fmt1(f.publico)}</td><td class="pt">${fmt1(f.puntaje)}</td></tr>`;
    }).join("")}</table>`;
}

function mostrarResultadoDebate(u, antes, despues, alTerminar, oraculos = []) {
  cerrarEscena();
  $("resultado")?.remove();
  const r = u.res, gana = r.ganador ? u[r.ganador] : null;
  const f1 = v => (v === null || v === undefined ? "—" : v.toFixed(1));
  const lado = (k, c) => `<div class="rs-lado" style="--c:${c}"><div class="rs-g">${escHtml(nombreG(u[k]).toUpperCase())}</div><div class="rs-p">${f1(r[k].puntaje)}</div>
    <div class="rs-d">jueces ${u.panel && u.panel[k].total !== null ? f1(u.panel[k].total) + "/30" : "—"} · público ${u.publico && u.publico.n ? u.publico[k] + " votos" : "—"}</div></div>`;
  const top = (oraculos || []).slice(0, 5);
  // el público activo: cuánto se movió la sala (termómetro) y la frase con más 🔥. No son puntaje.
  const t = u.termo, mueve = t && t.n && t.mov !== null && Math.abs(t.mov) >= 1 ? (t.mov > 0 ? "A" : "B") : null;
  const extra = [
    t && t.n ? `<div>🌡 ${mueve ? `El público se movió <b style="color:${EQUIPOS[mueve].color}">${Math.abs(Math.round(t.mov))} puntos hacia ${PERS ? "" : "el "}${escHtml(nombreG(u[mueve]))}</b>` : "El público terminó donde empezó"} <small>(${t.n} con el termómetro)</small></div>` : "",
    u.frase ? `<div>🔥 La frase del debate · <b style="color:${EQUIPOS[u.frase.equipo]?.color || "inherit"}">${escHtml(conGrupo(u.frase.nombre, u.frase.grupo, PERS))}</b>: «${escHtml(String(u.frase.texto).slice(0, 160))}${String(u.frase.texto).length > 160 ? "…" : ""}» <small>(${u.frase.fuego} 🔥)</small></div>` : ""
  ].join("");
  const el = document.createElement("div");
  el.id = "resultado";
  el.innerHTML = `<div class="rs-k">DEBATE ${u.n} · RESULTADO</div>
    <div class="rs-q">«${escHtml(u.pregunta)}»</div>
    <div class="rs-vs">${lado("A", EQUIPOS.A.color)}<div class="rs-x">${gana ? `GANA ${escHtml(nombreG(gana).toUpperCase())}` : "EMPATE"}</div>${lado("B", EQUIPOS.B.color)}</div>
    ${extra ? `<div class="rs-extra">${extra}</div>` : ""}
    <div class="rs-tablas">${tablaRanking(despues, antes)}
      <div class="rs-or"><div class="rs-ork">🔮 ORÁCULOS</div>${top.length ? top.map(o => `<div><span>#${o.puesto}</span><b>${escHtml(conGrupo(o.nombre, o.grupo, PERS))}</b><i>${o.puntos}</i></div>`).join("")
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
    <div class="cer-rk">${[...filas].reverse().map((f, i) => `<div class="cer-fila" id="cf${i}"><span class="n">#${f.puesto}</span><b>${escHtml(nombreG(f.grupo).toUpperCase())}</b><span class="p">${f.puntaje.toFixed(1)}</span></div>`).join("")}</div>
    <div class="cer-bloque" id="cerG"><div class="cer-k">CAMPEÓN</div><div class="cer-g" style="color:var(--amber)">${filas[0] ? `🏆 ${escHtml(nombreG(filas[0].grupo).toUpperCase())}` : "SIN DEBATES"}</div></div>
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
        <b>${escHtml(conGrupo(o.nombre, o.grupo, PERS))}</b><span class="p" style="color:#a78bfa">${o.aciertos} de ${o.predicciones}${o.preguntas ? ` · ✋ ${o.preguntas}` : ""}</span></div>`).join("")}</div>
      <div class="cer-bloque" id="coG"><div class="cer-g" style="color:#a78bfa">🔮 ${escHtml(conGrupo(top.nombre, top.grupo, PERS))}</div>
        <div class="cer-s">${top.puntos} punto${top.puntos === 1 ? "" : "s"} · acertó ${top.aciertos} de ${top.predicciones} veredictos${top.preguntas ? ` · ${top.preguntas} pregunta${top.preguntas === 1 ? "" : "s"} elegida${top.preguntas === 1 ? "" : "s"}` : ""}</div></div>`
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
  const hechos = movimiento.filter(m => !m.parcial);
  const cuenta = (xs, id) => xs.filter(p => p.campo === id).length;
  // cada punto parte donde estaba al inicio y se desliza a medida que el alumno responde de nuevo
  if (!el.querySelector("#movMapa")) {
    el.innerHTML = `<div class="es-k" id="movK"></div>
      <div class="po-mapa" style="justify-content:center"><div id="movMapa"></div>
        <div><div class="rs-or" id="movCuenta"></div><button class="btn" id="movAmpliar" style="margin-top:12px">⛶ AMPLIAR</button></div></div>`;
    MV.mov = crearMapaVivo($("movMapa"), { campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 520 });
    $("movAmpliar").onclick = abrirMapaGrande;
  }
  $("movK").textContent = `🧭 LA BRÚJULA, OTRA VEZ · ${hechos.length} de ${puntos.length} respondieron`;
  $("movCuenta").innerHTML = `<div class="rs-ork">ANTES → AHORA</div>${BRUJULA.campos.map(c => `<div><b style="color:${c.color}">${escHtml(c.nombre)}</b><i>${cuenta(hechos.map(m => ({ campo: m.campoAntes })), c.id)} → ${cuenta(hechos, c.id)}</i></div>`).join("")}`;
  MV.mov.actualizar(puntosDelMapa().puntos, { flechas: true });
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
  el.innerHTML = `<div class="es-k">EL PÚBLICO VOTA · ¿quién argumentó mejor, aunque no pienses como él?</div>
    <div class="es-q">«${escHtml(d.pregunta)}»</div>
    <div class="vb">${["A", "B"].map(k => `<div class="vb-fila" id="vbf${k}" style="--c:${EQUIPOS[k].color}">
        <div class="vb-n">${EQUIPOS[k].nombre} · ${escHtml(nombreG(d[k]).toUpperCase())}</div>
        <div class="vb-barra"><i id="vb${k}"></i></div><div class="vb-c mono" id="vbc${k}">0</div></div>`).join("")}</div>
    <div class="es-pie mono" id="vbPie"></div>
    <div class="es-oraculo">🔮 En el teléfono, además: apuesten a quién eligen los 5 jueces de IA. Cada acierto, +1 punto de oráculo.</div>`;
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
    : g ? `GANA EL PÚBLICO: <b style="color:${EQUIPOS[g].color}">${escHtml(nombreG(d[g]).toUpperCase())}</b> · ${Math.round(g === "A" ? pub.parteA : pub.parteB)} %`
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
    <div class="jz-lados"><span style="color:${EQUIPOS.A.color}">■ ${escHtml(nombreG(d.A).toUpperCase())} · A FAVOR</span><span style="color:${EQUIPOS.B.color}">■ ${escHtml(nombreG(d.B).toUpperCase())} · EN CONTRA</span></div>
    <div class="jz">${jueces.map(j => `<div class="jz-col" id="jz-${j.id}">
        <div class="jz-e">${j.emoji}</div><div class="jz-n">${escHtml(j.nombre)}</div><div class="jz-p">${escHtml(j.valora)}</div>
        <div class="jz-t">${tarjeta(j, "A")}${tarjeta(j, "B")}</div>
        <div class="jz-f"><i style="color:${EQUIPOS.A.color}">${escHtml(j.fraseA || "")}</i><i style="color:${EQUIPOS.B.color}">${escHtml(j.fraseB || "")}</i></div>
      </div>`).join("")}</div>
    <div class="jz-tot">${["A", "B"].map(k => `<div style="--c:${EQUIPOS[k].color}"><small>${escHtml(nombreG(d[k]).toUpperCase())}</small><b class="mono" id="jzt${k}">0.0</b><small>/30</small></div>`).join("")}</div>
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
    : g ? `GANAN LOS JUECES: <b style="color:${EQUIPOS[g].color}">${escHtml(nombreG(d[g]).toUpperCase())}</b>` : "EMPATE ENTRE LOS JUECES";
  $("jzG").classList.add("on");
  sonar(g ? "fanfarria" : "whoosh");
  if (g) confeti([EQUIPOS[g].color, "#ffffff", "#ffb020"], 3000);
  await esperar(ROT.SEG_TOTALES * 1000);
}
