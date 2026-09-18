/* =====================================================================
   TRIBUNA — simulador de partidas (auditoría de robustez).
   No es parte del juego: se carga a mano desde la consola, con el motor LLM activo:

     const s = document.createElement("script"); s.src = "pruebas/simular.js"; document.head.append(s);
     simularPartidas(20)            // corre en segundo plano; el avance queda en window.SIM
     simularPartidas(20, 3, false)  // sin agentes: solo jurado + audiencia paramétrica
     resumenSim()                   // tabla de resultados

   Juega N partidas completas con los textos de EJEMPLOS sin tocar la pantalla ni el estado
   del juego. En cada partida el jurado LLM evalúa una vez y DOS audiencias escuchan lo mismo:
   la sociedad de agentes y la paramétrica. Así la comparación es pareada y la paramétrica
   sale gratis. Costo: 6 llamadas al jurado + 36 a los agentes por partida.
   ===================================================================== */

function simConteo(aud) {
  let a = 0, b = 0;
  for (const x of aud) { if (x.pos > 8) a += x.p.votos; else if (x.pos < -8) b += x.p.votos; }
  return { a, b };
}

// rigFijo: {aA: 5.5, aB: 12.5, rA: …} con puntajes de rigor de una partida real. Si viene, no se
// llama al jurado (la sociedad no depende de él) y la partida cuesta solo los 36 agentes.
async function simularUna(conSociedad = true, rigFijo = null) {
  const soc = AUDIENCIA.map(p => ({ p, pos: S.iniPos[p.id], memoria: [], haciaOrador: 0, n: 0 }));
  const par = AUDIENCIA.map(p => ({ p, pos: S.iniPos[p.id] }));
  const hist = [];
  let caidos = 0;

  for (const R of RONDAS) {
    const orden = Math.random() < .5 ? ["A", "B"] : ["B", "A"];
    const previas = hist.slice();
    for (const k of orden) {
      const texto = EJEMPLOS[R.id][k], dir = EQUIPOS[k].dir;
      const rivalPrev = previas.filter(h => h.equipo !== k).slice(-1)[0];
      const ctx = {
        ronda: R.id, rondaNombre: R.nombre, pauta: R.pauta, dir,
        conceptosRival: rivalPrev ? rivalPrev.ev.conceptos.map(c => c.id) : [],
        previas: previas.map(h => ({ equipo: h.equipo, rondaNombre: h.rondaNombre, texto: h.texto })),
        ecos: ecosDe(previas, k)
      };
      let ev;
      if (rigFijo) {
        ev = evaluarRigor(texto, ctx);
        ev = { ...ev, nota: "rigor fijo", rubrica: { ...ev.rubrica, total: rigFijo[R.id[0] + k] } };
      } else ev = await evaluarConLLM(texto, ctx, k);

      // sociedad de agentes
      const mar = aud => margenDe(aud.map(x => [x.p.votos, x.pos]));
      const antesS = mar(soc);
      if (conSociedad) await Promise.all(soc.map(async x => {
        let delta;
        try {
          const a = await consultarAgente(x.p, x.pos, x.memoria, texto, k, ctx);
          delta = saturar(a.delta, x.pos);
          x.memoria.push({ rondaNombre: R.nombre, equipo: k, hacia: a.hacia, cuanto: a.cuanto, frase: a.frase });
          x.n++; if (a.hacia === "acerca") x.haciaOrador++;
        } catch (e) {
          caidos++; delta = moverParametrico({ ...x.p, pos: x.pos }, texto, ev, dir, ctx.ecos).delta;
        }
        x.pos = clamp(x.pos + delta, -100, 100);
      }));
      const despuesS = mar(soc);

      // audiencia paramétrica, con la misma evaluación del jurado
      const antesP = mar(par);
      for (const x of par) x.pos = clamp(x.pos + moverParametrico({ ...x.p, pos: x.pos }, texto, ev, dir, ctx.ecos).delta, -100, 100);
      const despuesP = mar(par);

      const sw = (a, d) => (k === "A" ? 1 : -1) * swingA(a, d);      // voto suave, como el juego
      const foto = aud => aud.map(x => +x.pos.toFixed(1));       // en el orden de AUDIENCIA
      hist.push({ equipo: k, ronda: R.id, rondaNombre: R.nombre, texto, ev,
                  dvSoc: sw(antesS, despuesS), dvPar: sw(antesP, despuesP),
                  posSoc: foto(soc), posPar: foto(par) });
    }
  }

  const suma = (k, campo) => hist.filter(h => h.equipo === k).reduce((s, h) => s + h[campo], 0);
  const rig = k => { const h = hist.filter(x => x.equipo === k); return h.reduce((s, x) => s + x.ev.rubrica.total, 0) / h.length; };
  const gana = (a, b, eps) => Math.abs(a - b) <= eps ? "EMPATE" : a > b ? "A" : "B";
  const rA = rig("A"), rB = rig("B"), ganaR = gana(rA, rB, 0.05);
  const lado = campo => {
    const pA = decima(suma("A", campo)), pB = decima(suma("B", campo));
    const ganaP = empatanEnVotos(pA, pB) ? "EMPATE" : pA > pB ? "A" : "B";     // misma regla que el veredicto
    return { pA, pB, ganaP, divergen: ganaP !== "EMPATE" && ganaR !== "EMPATE" && ganaP !== ganaR };
  };
  return {
    rA: +rA.toFixed(1), rB: +rB.toFixed(1), ganaR, caidos,
    soc: { ...lado("dvSoc"), final: simConteo(soc), pos: Object.fromEntries(soc.map(x => [x.p.id, Math.round(x.pos)])),
           aquiescencia: Object.fromEntries(soc.map(x => [x.p.id, x.n ? +(x.haciaOrador / x.n).toFixed(2) : null])) },
    par: { ...lado("dvPar"), final: simConteo(par), pos: Object.fromEntries(par.map(x => [x.p.id, Math.round(x.pos)])) },
    // trayectoria: posiciones de toda la audiencia después de cada intervención, para poder
    // recalcular la persuasión con otra métrica sin volver a jugar (ver persuasionSegun)
    tray: hist.map(h => ({ k: h.equipo, soc: h.posSoc, par: h.posPar })),
    rigores: hist.map(h => `${h.ronda[0]}${h.equipo}:${h.ev.rubrica.total}`).join(" "),
    juradoCaido: hist.filter(h => h.ev.nota === undefined).length      // cayó al heurístico
  };
}

// conSociedad = false: solo jurado + audiencia paramétrica (6 llamadas por partida en vez de 42)
function simularPartidas(n = 20, enParalelo = 3, conSociedad = true, rigsFijos = null) {
  if (!S.motor.activo && !(rigsFijos && !conSociedad)) throw new Error("Activa el motor LLM primero (⚙ MOTOR).");
  const SIM = window.SIM = { pedidas: n, conSociedad, partidas: [], errores: [], fin: false, inicio: Date.now() };
  SIM.nombre = "sim-" + new Date(SIM.inicio).toISOString().slice(0, 19).replace(/[T:]/g, "-").toLowerCase();
  SIM.rigsFijos = rigsFijos;
  let i = 0;
  const worker = async () => {
    while (i < n) {
      const yo = i++;
      try { SIM.partidas.push(await simularUna(conSociedad, rigsFijos ? rigsFijos[yo % rigsFijos.length] : null)); } catch (e) { SIM.errores.push(String(e.message)); }
      // Respaldo cuando la partida costó llamadas: a disco vía servidor.py (sobrevive a que se
      // caiga el navegador o la sesión) y a sessionStorage por si solo se recarga la página.
      if (conSociedad || !rigsFijos) {
        SIM.hechas = SIM.partidas.length; SIM.fin = SIM.hechas + SIM.errores.length >= n;
        if (SIM.fin) SIM.seg = Math.round((Date.now() - SIM.inicio) / 1000);
        try { sessionStorage.setItem("tribuna_sim", JSON.stringify(SIM)); } catch (e) {}
        fetch("/api/guardar", { method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ nombre: SIM.nombre, datos: SIM }) }).catch(() => {});
      }
    }
  };
  Promise.all(Array.from({ length: enParalelo }, worker)).then(() => { SIM.fin = true; SIM.seg = Math.round((Date.now() - SIM.inicio) / 1000); });
  return "corriendo: mira window.SIM";
}

function resumenSim(SIM = window.SIM) {
  const P = SIM.partidas, n = P.length;
  const cuenta = f => P.filter(f).length;
  const media = f => +(P.reduce((s, x) => s + f(x), 0) / n).toFixed(1);
  const lado = k => ({
    "gana persuasión A FAVOR": cuenta(x => x[k].ganaP === "A"),
    "gana persuasión EN CONTRA": cuenta(x => x[k].ganaP === "B"),
    "empate en persuasión": cuenta(x => x[k].ganaP === "EMPATE"),
    "DIVERGEN (ESTO ES LA CLASE)": cuenta(x => x[k].divergen),
    "persuasión media A / B": media(x => x[k].pA) + " / " + media(x => x[k].pB)
  });
  return {
    partidas: n, errores: SIM.errores.length, seg: SIM.seg,
    "gana rigor A FAVOR / EN CONTRA / empate": [cuenta(x => x.ganaR === "A"), cuenta(x => x.ganaR === "B"), cuenta(x => x.ganaR === "EMPATE")].join(" / "),
    "rigor medio A / B": media(x => x.rA) + " / " + media(x => x.rB),
    sociedad: lado("soc"), parametrica: lado("par"),
    "aquiescencia (fracción de veces que se movió hacia quien hablaba)":
      Object.fromEntries(AUDIENCIA.map(p => [p.id, +(P.reduce((s, x) => s + (x.soc.aquiescencia[p.id] || 0), 0) / n).toFixed(2)])),
    "posición final media (sociedad)": Object.fromEntries(AUDIENCIA.map(p => [p.id, media(x => x.soc.pos[p.id])])),
    "agentes caídos al paramétrico": P.reduce((s, x) => s + x.caidos, 0),
    "evaluaciones del jurado caídas al heurístico": P.reduce((s, x) => s + x.juradoCaido, 0)
  };
}

/* ---------------------------------------------------------------------
   Métricas alternativas de PERSUASIÓN, recalculadas sobre las trayectorias guardadas.
   En todas, lo que mueve una intervención se le anota a quien habló, con signo.
     "cruces": la que tuvo el juego hasta sept. 2026. Swing neto de votos que cruzan el umbral ±8.
     "lineal": desplazamiento ponderado por votos, Σ votos · Δpos / 100 (100 puntos = 1 voto).
     "suave":  LA DEL JUEGO (margenDe en app.js). Σ votos · tanh(pos / 12): un voto se gana de a
               poco alrededor del centro y el convencido casi no suma (misma unidad que "cruces").
   --------------------------------------------------------------------- */
function persuasionSegun(metrica, partida, cual = "par") {
  const votos = AUDIENCIA.map(p => p.votos);
  const margen = pos => pos.reduce((s, v, i) => s + votos[i] * (
    metrica === "cruces" ? (v > 8 ? 1 : v < -8 ? -1 : 0) : metrica === "lineal" ? v / 100 : Math.tanh(v / ESCALA_VOTO)), 0);
  let antes = margen(AUDIENCIA.map(p => S.iniPos[p.id]));
  const out = { A: 0, B: 0 };
  for (const paso of partida.tray) {
    const ahora = margen(paso[cual]);
    out[paso.k] += (paso.k === "A" ? 1 : -1) * (ahora - antes);
    antes = ahora;
  }
  return out;
}

function compararMetricas(SIM = window.SIM, cual = "par") {
  const out = {};
  for (const m of ["cruces", "lineal", "suave"]) {
    const c = { A: 0, B: 0, empate: 0, divergen: 0, sumaA: 0, sumaB: 0 };
    for (const x of SIM.partidas) {
      const p = persuasionSegun(m, x, cual);
      // sin margen de empate: acá se comparan las métricas en crudo, no la regla del veredicto
      const g = Math.abs(p.A - p.B) < 1e-9 ? "empate" : p.A > p.B ? "A" : "B";
      c[g]++; c.sumaA += p.A; c.sumaB += p.B;
      if (g !== "empate" && x.ganaR !== "EMPATE" && g !== x.ganaR) c.divergen++;
    }
    const n = SIM.partidas.length;
    out[m] = { "gana A": c.A, "gana B": c.B, empate: c.empate, divergen: c.divergen,
               "media A / B": (c.sumaA / n).toFixed(2) + " / " + (c.sumaB / n).toFixed(2) };
  }
  return out;
}
