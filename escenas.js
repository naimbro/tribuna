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
        <div class="po-tema">${escHtml(SESION.tema)}</div>
        <div class="po-cuenta" id="poCuenta"></div>
        <div class="po-gente" id="poGente"><div class="po-vacio">Esperando a los primeros…</div></div>
      </div>
    </div>
    <div class="po-pie">
      <span>Entren con su cuenta de Google y elijan: debatir <b style="color:${EQUIPOS.A.color}">${EQUIPOS.A.nombre}</b>, debatir <b style="color:${EQUIPOS.B.color}">${EQUIPOS.B.nombre}</b> o ser <b style="color:#a78bfa">PÚBLICO</b>.</span>
      <button class="btn pri" id="poEmpezar">EMPEZAR ▶</button>
    </div>`;
  document.body.appendChild(el);
  $("poEmpezar").onclick = alEmpezar;
  PORTADA.primera = true;
}

function actualizarPortada(jugadores) {
  const g = $("poGente"); if (!g) return;
  const lista = Object.entries(jugadores).map(([uid, j]) => ({ uid, ...j })).sort((a, b) => (a.unido || 0) - (b.unido || 0));
  const n = r => lista.filter(j => j.equipo === r).length;
  const eligiendo = lista.filter(j => !["A", "B", "P"].includes(j.equipo)).length;
  $("poCuenta").innerHTML = `<b>${lista.length}</b> en la sala
    <span style="color:${EQUIPOS.A.color}">● ${EQUIPOS.A.nombre} ${n("A")}</span>
    <span style="color:${EQUIPOS.B.color}">● ${EQUIPOS.B.nombre} ${n("B")}</span>
    <span style="color:#a78bfa">● PÚBLICO ${n("P")}</span>
    ${eligiendo ? `<span style="color:var(--dim)">● eligiendo ${eligiendo}</span>` : ""}`;
  if (!lista.length) { g.innerHTML = `<div class="po-vacio">Esperando a los primeros…</div>`; return; }
  let nuevos = 0;
  g.innerHTML = lista.map(j => {
    const nuevo = !PORTADA.vistos.has(j.uid);
    if (nuevo) { PORTADA.vistos.add(j.uid); nuevos++; }
    return `<div class="po-j ${nuevo && !PORTADA.primera ? "llega" : ""}">${avatarHtml(j, 66)}<div class="po-n">${escHtml(j.nombre)}</div></div>`;
  }).join("");
  if (nuevos && !PORTADA.primera) sonar("pop");
  PORTADA.primera = false;
}

function cerrarPortada() { $("portada")?.remove(); }

/* ----------------------------- 2. INTRO ----------------------------- */
function laminasIntro() {
  const votos = AUDIENCIA.reduce((a, p) => a + (p.votos || 1), 0);
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return [
    `<div class="in-k">SEMANA ${SESION.semana} · ${escHtml(SESION.curso || "")}</div>
     <div class="in-tema">${escHtml(SESION.tema)}</div>`,
    `<div class="in-k">LA MOCIÓN</div>
     <div class="in-mocion">«${escHtml(SESION.mocion)}»</div>`,
    `<div class="in-k">LAS POSICIONES</div>
     <div class="in-vs">
       <div class="in-lado" style="--c:${EQUIPOS.A.color}"><div class="in-b">${EQUIPOS.A.bandera}</div><div class="in-n">${EQUIPOS.A.nombre}</div><div class="in-l">${escHtml(EQUIPOS.A.lema || "Defiende la moción.")}</div></div>
       <div class="in-x">VS</div>
       <div class="in-lado" style="--c:${EQUIPOS.B.color}"><div class="in-b">${EQUIPOS.B.bandera}</div><div class="in-n">${EQUIPOS.B.nombre}</div><div class="in-l">${escHtml(EQUIPOS.B.lema || "Rechaza la moción.")}</div></div>
     </div>`,
    `<div class="in-k">CÓMO SE GANA</div>
     <div class="in-jueces">
       <div><div class="in-e">🤖</div><b>LA SALA</b><span>${votos} votantes sintéticos que leen el debate y se mueven. Gana quien mueve más votos.</span></div>
       <div><div class="in-e">🗳</div><b>EL PÚBLICO</b><span>Ustedes, los que no debaten: mueven su deslizador cuando algo los convence.</span></div>
       <div><div class="in-e">⚖</div><b>EL JURADO</b><span>Una IA con rúbrica sobre 20: evidencia, lógica, refutación. Gana quien argumenta mejor.</span></div>
     </div>
     <div class="in-tramos">${RONDAS.map((r, i) => `<span><b>${i + 1}</b> ${escHtml(r.nombre)} <i class="mono">${mmss(r.seg)}</i></span>`).join("<em>›</em>")}</div>
     <div class="in-nota">🎙 Una moderadora de IA pregunta y pasa la palabra · ⚖ un relator resume y llama a votar al final de cada tramo.</div>`
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
