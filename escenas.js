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
        </div>
        <div class="po-cuenta" id="poCuenta"></div>
        <div class="po-gente" id="poGente"><div class="po-vacio">Esperando a los primeros…</div></div>
      </div>
    </div>
    <div class="po-pie">
      <span>Entren con su cuenta de Google y elijan un grupo. Cada grupo debate y vota por turnos.</span>
      <button class="btn pri" id="poEmpezar">EMPEZAR ▶</button>
    </div>`;
  document.body.appendChild(el);
  $("poEmpezar").onclick = alEmpezar;
  $("poTema").onchange = e => { S.clase.tema = e.target.value.trim().slice(0, 200) || SESION.tema; window.publicarEstado?.(); };
  $("poGrupos").onchange = e => { S.clase.grupos = +e.target.value; window.publicarEstado?.(); actualizarPortada(window.jugadoresSala?.() || {}); };
  PORTADA.primera = true;
}

function actualizarPortada(jugadores) {
  const g = $("poGente"); if (!g) return;
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
      `<div class="po-g"><div class="po-gk">GRUPO ${k} <span>${enGrupo(k).length}</span></div>${enGrupo(k).map(cara).join("")}</div>`).join("")}</div>
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
       <div><div class="in-e">💬</div><b>DEBATEN</b><span>Apertura (${mm(ROT.SEG_APERTURA)}) y réplica (${mm(ROT.SEG_REPLICA)}), todos en la misma conversación.</span></div>
       <div><div class="in-e">🗳</div><b>LOS DEMÁS VOTAN</b><span>Los grupos que no debaten mueven su deslizador. Después, rotan.</span></div>
     </div>`,
    `<div class="in-k">CÓMO SE GANA</div>
     <div class="in-jueces">
       <div><div class="in-e">⚖</div><b>EL JURADO · 50%</b><span>Una IA que conoce las lecturas pone nota con la rúbrica del curso.</span></div>
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
