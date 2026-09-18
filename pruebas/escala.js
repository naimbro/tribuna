/* =====================================================================
   TRIBUNA — medición de la escala de la sociedad de agentes.
   ¿Usan los agentes todo el rango de movimiento o contestan siempre 5–6?
   Se carga a mano desde la consola, con el motor LLM activo:

     const s = document.createElement("script"); s.src = "pruebas/escala.js"; document.head.append(s);
     medirEscala(8)        // 6 textos de EJEMPLOS × 6 agentes × 8 repeticiones = 288 llamadas
     resumenEscala()

   Cada agente escucha cada texto desde su posición inicial y sin memoria. Corre en segundo
   plano, deja el avance en window.ESC y lo guarda en pruebas/salidas/ (vía servidor.py).
   `consultar` permite medir una variante del prompt sin tocar el juego.
   ===================================================================== */

function medirEscala(reps = 8, consultar = consultarAgente, etiqueta = "actual") {
  if (!S.motor.activo) throw new Error("Activa el motor LLM primero (⚙ MOTOR).");
  const ESC = window.ESC = { etiqueta, reps, res: [], fallos: 0, fin: false, inicio: Date.now() };
  ESC.nombre = "escala-" + etiqueta.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" +
    new Date(ESC.inicio).toISOString().slice(11, 19).replace(/:/g, "");
  const tareas = [];
  for (const R of RONDAS) for (const k of ["A", "B"]) for (const p of AUDIENCIA) for (let i = 0; i < reps; i++)
    tareas.push({ R, k, p });
  ESC.total = tareas.length;
  let idx = 0;
  const guardar = () => fetch("/api/guardar", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ nombre: ESC.nombre, datos: { ...ESC, guardando: undefined } }) }).catch(() => {});
  const worker = async () => {
    while (idx < tareas.length) {
      const t = tareas[idx++];
      try {
        const a = await consultar(t.p, S.iniPos[t.p.id], [], EJEMPLOS[t.R.id][t.k], t.k, { rondaNombre: t.R.nombre });
        // movimiento hacia quien habla, antes de saturar: es lo que el agente declara
        ESC.res.push({ texto: t.R.id[0] + t.k, id: t.p.id, h: +(a.delta * EQUIPOS[t.k].dir).toFixed(2),
                       ...(a.toca === undefined ? {} : { tcm: `${a.toca}${a.cree}${a.molesta}` }) });
      } catch (e) { ESC.fallos++; ESC.err = String(e.message); }
      if ((ESC.res.length + ESC.fallos) % 24 === 0 && !ESC.guardando) {   // un guardado a la vez
        ESC.guardando = true; guardar().finally(() => { ESC.guardando = false; });
      }
    }
  };
  Promise.all(Array.from({ length: 6 }, worker)).then(() => {
    ESC.fin = true; ESC.seg = Math.round((Date.now() - ESC.inicio) / 1000); guardar();
  });
  return "corriendo: mira window.ESC (" + ESC.total + " llamadas)";
}

function resumenEscala(ESC = window.ESC) {
  const v = ESC.res.map(r => Math.abs(r.h));
  const n = v.length, hist = {};
  v.forEach(x => { const b = Math.round(x); hist[b] = (hist[b] || 0) + 1; });
  // entropía del histograma (bits): 0 = siempre el mismo número; log2(13) ≈ 3,7 = rango 0–12 parejo
  const H = -Object.values(hist).reduce((s, c) => s + (c / n) * Math.log2(c / n), 0);
  // ¿distingue cada agente entre textos? desviación de sus medias por texto
  const TEXTOS = RONDAS.flatMap(R => ["A", "B"].map(k => R.id[0] + k));     // aA aB rA rB cA cB
  const porAgente = {};
  for (const p of AUDIENCIA) {
    const medias = TEXTOS.map(t => {
      const xs = ESC.res.filter(r => r.id === p.id && r.texto === t).map(r => r.h);
      return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
    });
    const m = medias.reduce((s, x) => s + x, 0) / medias.length;
    porAgente[p.id] = { "medias por texto": medias.map(x => +x.toFixed(1)).join(" "),
                        "sd entre textos": +Math.sqrt(medias.reduce((s, x) => s + (x - m) ** 2, 0) / medias.length).toFixed(2) };
  }
  return {
    etiqueta: ESC.etiqueta, n, fallos: ESC.fallos, seg: ESC.seg,
    "histograma de |movimiento|": Object.fromEntries(Object.entries(hist).sort((a, b) => a[0] - b[0])),
    "en 5–6": +(v.filter(x => Math.round(x) === 5 || Math.round(x) === 6).length / n).toFixed(2),
    "en 0": +(v.filter(x => Math.round(x) === 0).length / n).toFixed(2),
    "valores distintos": Object.keys(hist).length, "entropía (bits)": +H.toFixed(2),
    "textos (orden de las medias)": TEXTOS.join(" "),
    porAgente
  };
}
