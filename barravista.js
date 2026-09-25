/* =====================================================================
   TRIBUNA — la barra de participación en el proyector (barra.js tiene la lógica).
   Dos barras enfrentadas sobre la conversación, A FAVOR a la izquierda y EN CONTRA a la
   derecha, con una tajada por integrante. Todo el curso la ve. Al cruzar la mitad suena; al
   llenarse, confeti desde la barra, fanfarria y un cartel. Cada hito, una vez por debate.
   ===================================================================== */

const BV = { debate: null, claves: { A: "", B: "" }, antes: {}, hechos: new Set() };

// Integrantes del grupo que debate por el lado k: los de la sala con ese grupo, más quienes
// escribieron por ese lado en este debate (alumnos que el profesor simula desde su compositor).
function integrantesBarra(k) {
  const d = S.debate;
  if (!d) return [];
  const out = new Map();
  const js = typeof window.jugadoresSala === "function" ? window.jugadoresSala() : {};
  for (const [uid, j] of Object.entries(js || {})) if (j.grupo === d[k]) out.set(claveBarra({ uid }), { uid, nombre: j.nombre || "?" });
  for (const m of S.chat) if (m.tipo === "alumno" && m.debate === d.n && m.equipo === k && !out.has(claveBarra(m)))
    out.set(claveBarra(m), { uid: m.uid, nombre: m.nombre });
  return [...out.values()];
}
function llenadoLado(k) {
  const d = S.debate;
  return llenadoGrupo(S.chat.filter(m => m.debate === d.n && m.equipo === k), integrantesBarra(k));
}

const primerNombre = n => String(n || "?").trim().split(/\s+/)[0];

function pintarBarras() {
  const d = S.debate;
  if (!d) return;
  if (BV.debate !== d.n) { BV.debate = d.n; BV.antes = {}; BV.hechos = new Set(); BV.claves = { A: "", B: "" }; }
  for (const k of ["A", "B"]) {
    const r = llenadoLado(k), el = $("lista" + k);
    const clave = d.n + "|" + r.personas.map(p => p.clave).join(",");
    // la estructura se rehace solo si cambian los integrantes; si no, se actualiza en sitio y anima
    if (BV.claves[k] !== clave || !el.querySelector(".bz")) {
      BV.claves[k] = clave;
      el.innerHTML = `<div class="bz" style="--c:var(--${k})">
        <div class="bz-cab"><b>${EQUIPOS[k].bandera} ${esc(nombreG(d[k]))} · ${EQUIPOS[k].nombre}</b><span class="bz-sello"></span><span class="bz-pct mono"></span></div>
        <div class="bz-barra"><div class="bz-llen"></div></div>
        <div class="bz-tajadas">${r.personas.map(p => `<span class="bz-t" data-c="${esc(p.clave).replace(/"/g, "&quot;")}"><i></i><em>${esc(primerNombre(p.nombre))}</em></span>`).join("") || `<span class="bz-vacio">nadie en el grupo aún</span>`}</div></div>`;
    }
    const pct = Math.round(r.pct * 100);
    el.querySelector(".bz-pct").textContent = pct + " %";
    el.querySelector(".bz-barra").className = "bz-barra " + colorBarra(r.pct);
    el.querySelector(".bz-llen").style.width = pct + "%";
    el.querySelector(".bz-sello").textContent = r.todos ? "👥 todos escribieron" : "";
    for (const p of r.personas) {
      const t = el.querySelector(`.bz-t[data-c="${CSS.escape(p.clave)}"]`);
      if (!t) continue;
      t.className = "bz-t " + (p.pct >= 1 ? "full" : p.pct > 0 ? "mid" : "cero");
      t.querySelector("i").style.width = Math.round(p.pct * 100) + "%";
      t.title = `${p.nombre}: ${p.palabras} de ${BARRA.META_PERSONA} palabras`;
    }
    celebrarBarra(k, BV.antes[k] || null, r, el);
    BV.antes[k] = r;
  }
}

function celebrarBarra(k, antes, ahora, el) {
  for (const h of hitosNuevos(antes, ahora)) {
    const id = k + "|" + h.tipo + "|" + (h.clave || "");
    if (BV.hechos.has(id)) continue;
    BV.hechos.add(id);
    if (h.tipo === "mitad") sonar("moneda");
    else if (h.tipo === "todos") sonar("campana");
    else if (h.tipo === "parte") el.querySelector(`.bz-t[data-c="${CSS.escape(h.clave)}"]`)?.classList.add("pop");
    else if (h.tipo === "lleno") {
      const b = el.querySelector(".bz-barra").getBoundingClientRect();
      confeti([EQUIPOS[k].color, "#ffffff", "#ffb020"], 3500, { x: b.left + b.width / 2, y: b.top });
      sonar("fanfarria");
      $("bzCartel")?.remove();
      const c = document.createElement("div");
      c.id = "bzCartel"; c.style.setProperty("--c", EQUIPOS[k].color);
      c.textContent = `🎉 ¡${nombreG(S.debate[k]).toUpperCase()} LLENÓ LA BARRA!`;
      document.body.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }
}

// Lo que queda registrado del debate al cerrar la votación (clase.js), para el panel.
function barraDelDebate() {
  const out = {};
  for (const k of ["A", "B"]) {
    const r = llenadoLado(k);
    out[k] = { pct: +r.pct.toFixed(3), todos: r.todos, personas: r.personas.map(p => ({ nombre: p.nombre, palabras: p.palabras })) };
  }
  return out;
}
