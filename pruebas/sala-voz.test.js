/* LA SALA a viva voz: lo que oye el micrófono del profesor, los aplausos, el juicio del Senado
   simulado sobre lo dicho y el puntaje por escaño. Lógica pura (sala-logica.js). */
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../sala-logica.js");
const D = require("../sala-datos.js");

const esc = (uid, x = {}) => ({ uid, nombre: uid + " Ensayo", email: uid + "@ensayo", equipo: "P", ...x });
const azarFijo = () => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; };
const parrafo = (id, n, f, b, texto, t0) => ({ t: "dicho", id, n, f, b, texto, t0 });

// una sala en el debate del nudo 1 (defiende la bancada 1, responde la 2), con ocho escaños
function salaConDebate() {
  const js = Array.from({ length: 8 }, (_, i) => esc("u" + i));
  let sala = { fase: "respuesta", nudo: 1, sorteo: Object.fromEntries(js.map((j, i) => [j.uid, (i % 4) + 1])) };
  const ctx = { D, jugadores: js, ahora: 50 };
  const hacer = a => { const r = L.aplicar(sala, a, ctx); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  hacer(parrafo("pd1", 1, "defensa", 1, "Defendemos porque el artículo 5 frena la inversión.", 10));
  hacer(parrafo("pd2", 1, "defensa", 1, "Aplicamos regular, redistribuir, reprimir al artículo 8 y el caso Smart Sampa muestra el costo de esperar.", 20));
  hacer(parrafo("pr1", 1, "respuesta", 2, "Respondemos que sin obligaciones previas nadie responde.", 30));
  hacer(parrafo("pr2", 1, "respuesta", 2, "Corto.", 40));
  return { js, ctx, hacer, sala: () => sala };
}

test("dicho: guarda un párrafo por id, ordenados por hora, y descarta lo que no sirve", () => {
  const { hacer, sala } = salaConDebate();
  assert.deepEqual(L.debateDe(sala(), 1).map(p => p.id), ["pd1", "pd2", "pr1", "pr2"]);
  assert.deepEqual(L.dichoDe(sala(), 1, ["respuesta"]).map(p => p.b), [2, 2]);
  assert.equal(L.debateDe(sala(), 2).length, 0);
  assert.equal(hacer(parrafo("x", 1, "defensa", 1, "id muy corto", 1)), null);
  assert.equal(hacer(parrafo("pz9", 1, "defensa", 9, "bancada que no existe", 1)), null);
  assert.equal(hacer(parrafo("pz8", 1, "defensa", 1, "   ", 1)), null);
  hacer(parrafo("pl1", 1, "lectura", 1, "esto fue en la lectura", 5));
  assert.equal(L.debateDe(sala(), 1).length, 4, "la lectura no es debate");
  hacer({ t: "borrarDicho", id: "pr2" });
  assert.deepEqual(L.debateDe(sala(), 1).map(p => p.id), ["pd1", "pd2", "pr1"]);
  assert.equal(hacer({ t: "borrarDicho", id: "no-existe" }), null);
  const largo = L.aplicar({}, parrafo("plargo", 1, "defensa", 1, "palabra ".repeat(400), 1), { D, jugadores: [], ahora: 1 });
  assert.ok(largo.cambios["voz.plargo"].texto.length <= L.MAX.parrafo);
});

test("dictado: lo que la bancada autora lee en la lectura es su indicación, con el tipo que dijo", () => {
  const ctx = { D, jugadores: [], ahora: 9 };
  let sala = { fase: "lectura", nudo: 2 };
  const hacer = a => { const r = L.aplicar(sala, a, ctx); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  assert.equal(L.indDictada(sala, D, 2), null);
  hacer(parrafo("pa1", 2, "lectura", 3, "suprímese la letra e del artículo 6", 1));
  hacer(parrafo("pa2", 2, "lectura", 3, "y agrégase un control judicial previo", 2));
  hacer(parrafo("pa3", 2, "lectura", 4, "esto lo dijo otra bancada", 3));
  hacer(parrafo("pa4", 2, "defensa", 3, "esto ya es el debate", 4));
  const d = L.indDictada(sala, D, 2);
  assert.equal(d.texto, "Suprímese la letra e del artículo 6 y agrégase un control judicial previo");
  assert.equal(d.tipo, "suprimir", "manda el primer verbo que se oyó");
  assert.equal(d.origen, "dictada");
  assert.equal(L.tipoDicho("la identificación biométrica pasa a ser de alto riesgo", "sustituir"), "sustituir", "sin verbo, el tipo de la de partida");
  assert.equal(L.tipoDicho("Añádase un inciso", ""), "agregar");
  assert.equal(L.indicacionDe(sala, [], D, 2).origen, "dictada", "se ve en el comparado mientras la leen");
});

test("lectura: la bancada autora recibe la palabra, y al avanzar lo dictado pasa al comparado si no hay otra", () => {
  const js = Array.from({ length: 8 }, (_, i) => esc("u" + i));
  let sala = { fase: "redaccion", nudo: 0, sorteo: Object.fromEntries(js.map((j, i) => [j.uid, (i % 4) + 1])) };
  js[0].ind = { tipo: "agregar", texto: "Texto entregado por teléfono, completo.", dem: "d9_foucault", demFrase: "Una frase que aplica el concepto.",
    ia: "i12_ijop", iaFrase: "Otra frase que aplica el caso.", t: 5, lista: true };      // la bancada 1 (nudo 1) sí usó el teléfono
  const ctx = { D, jugadores: js, ahora: 100 };
  const hacer = a => { const r = L.aplicar(sala, a, ctx); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  hacer({ t: "sig" });
  assert.deepEqual([sala.fase, sala.nudo, sala.palabra], ["lectura", 1, D.nudos[0].autora]);
  hacer(parrafo("pb1", 1, "lectura", 1, "sustitúyese todo por principios generales", 1));
  hacer({ t: "sig" });
  assert.equal(sala.ind[1].origen, "bancada", "lo entregado por teléfono no se pisa");
  assert.deepEqual([sala.nudo, sala.palabra], [2, D.nudos[1].autora]);
  hacer(parrafo("pb2", 2, "lectura", 3, "la identificación biométrica pasa a ser de alto riesgo", 2));
  hacer({ t: "sig" });
  assert.equal(sala.ind[2].origen, "dictada");
  assert.equal(sala.ind[2].tipo, D.nudos[1].partida.tipo);
  hacer({ t: "sig" }); hacer({ t: "sig" });
  assert.deepEqual([sala.fase, sala.palabra], ["tarea", 0]);
  assert.equal(sala.ind[3], undefined, "nadie leyó la del nudo 3: queda pendiente");
  hacer({ t: "patrocinio", on: true });
  for (let i = 0; i < 60 && !(sala.fase === "pelea" && sala.nudo === 3); i++) {
    for (const j of js) j.v = { ...(j.v || {}), [sala.nudo]: "f" };
    const s = L.deNudo(sala, sala.nudo).sen;
    if (s && s.estado === "pedir") hacer({ t: "senadoEnsayo" });
    assert.ok(hacer({ t: "sig" }), "se trabó en " + sala.fase + " " + sala.nudo);
  }
  assert.equal(sala.ind[3].origen, "partida", "sin teléfono ni dictado, al entrar al nudo se carga la de partida");
});

test("Secretaría: toma lo dictado o corrige el texto a mano", () => {
  const ctx = { D, jugadores: [], ahora: 77 };
  let sala = { fase: "lectura", nudo: 4, ind: { 4: { tipo: "agregar", texto: "La de partida.", origen: "partida" } } };
  const hacer = a => { const r = L.aplicar(sala, a, ctx); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  assert.equal(hacer({ t: "dictada", n: 4 }), null, "todavía nadie leyó");
  hacer(parrafo("pc1", 4, "lectura", 4, "agrégase una multa proporcional a las ventas", 1));
  assert.ok(hacer({ t: "dictada", n: 4 }));
  assert.deepEqual([sala.ind[4].origen, sala.ind[4].tipo, sala.ind[4].t], ["dictada", "agregar", 77]);
  assert.ok(hacer({ t: "indicar", n: 4, tipo: "sustituir", texto: "  Las multas del artículo 25 serán proporcionales a las ventas.  " }));
  assert.deepEqual([sala.ind[4].origen, sala.ind[4].tipo, sala.ind[4].texto], ["secretaria", "sustituir", "Las multas del artículo 25 serán proporcionales a las ventas."]);
  assert.equal(hacer({ t: "indicar", n: 4, tipo: "inventado", texto: "Un texto cualquiera." }), null);
  assert.equal(hacer({ t: "indicar", n: 4, tipo: "agregar", texto: "ab" }), null);
  assert.equal(hacer({ t: "indicar", n: 9, tipo: "agregar", texto: "Un texto cualquiera." }), null);
});

test("aplausos: tres por bancada, tocar de nuevo lo retira y nadie se aplaude a sí mismo", () => {
  const { hacer, sala } = salaConDebate();
  hacer(parrafo("pd3", 1, "defensa", 1, "Tercer párrafo de la defensa.", 21));
  hacer(parrafo("pd4", 1, "defensa", 1, "Cuarto párrafo de la defensa.", 22));
  let l = [];
  for (const id of ["pd1", "pd2", "pd3"]) l = L.aplaudir(l, id, sala(), 1, D, 3);
  assert.deepEqual(l, ["pd1", "pd2", "pd3"]);
  assert.equal(L.aplaudir(l, "pd4", sala(), 1, D, 3), null, "se acabaron los de esa bancada");
  assert.equal(L.quedanAplausos(l, sala(), 1, D, 3, 1), 0);
  assert.equal(L.quedanAplausos(l, sala(), 1, D, 3, 2), D.aplausos);
  l = L.aplaudir(l, "pr1", sala(), 1, D, 3);
  assert.deepEqual(l, ["pd1", "pd2", "pd3", "pr1"], "la otra bancada tiene sus propios tres");
  l = L.aplaudir(l, "pd2", sala(), 1, D, 3);
  assert.deepEqual(l, ["pd1", "pd3", "pr1"]);
  assert.equal(L.aplaudir([], "pd1", sala(), 1, D, 1), null, "no a la bancada propia");
  assert.equal(L.quedanAplausos([], sala(), 1, D, 1, 1), 0);
  assert.equal(L.aplaudir([], "no-existe", sala(), 1, D, 3), null);
});

test("aplausos: la foto solo guarda lo válido de cada escaño, y se toma al cerrar la votación", () => {
  const { js, hacer, sala } = salaConDebate();
  js[2].apl = { 1: ["pd1", "pd1", "pr1", "inventado", 7] };           // bancada 3
  js[0].apl = { 1: ["pd1", "pr1"] };                                  // bancada 1: no vale su propio párrafo
  js[1].apl = { 2: ["pd1"] };                                         // de otro nudo
  js[3].apl = "roto";
  assert.deepEqual(L.aplausosDe(sala(), js, 1, D), { u0: ["pr1"], u2: ["pd1", "pr1"] });
  assert.deepEqual(L.cuentaAplausos(L.aplausosDe(sala(), js, 1, D)), { pr1: 2, pd1: 1 });
  hacer({ t: "sig" });
  assert.equal(sala().fase, "votacion");
  assert.equal(sala().n[1].apl, undefined, "mientras se vota todavía se puede aplaudir");
  hacer(parrafo("pr3", 1, "respuesta", 2, "El último párrafo se cierra cuando el micrófono se apaga para votar.", 45));
  js[4].apl = { 1: ["pr3"] };                                         // bancada 1 aplaude a quien responde
  for (const j of js) j.v = { 1: "f" };
  hacer({ t: "sig" });
  assert.equal(sala().fase, "resultado");
  assert.deepEqual(sala().n[1].apl.de, { u0: ["pr1"], u2: ["pd1", "pr1"], u4: ["pr3"] });
  js[2].apl = { 1: ["pd2"] };                                         // cambiarlo después no sirve
  assert.deepEqual(sala().n[1].apl.de.u2, ["pd1", "pr1"]);
});

test("promptSenador con micrófono: lleva la transcripción numerada, quién defiende y los conceptos del curso", () => {
  const { sala } = salaConDebate();
  const dicho = L.debateDe(sala(), 1);
  const p = L.promptSenador(D.senadores[0], 1, { tipo: "sustituir", texto: "Texto leído en la sala." }, D, "", dicho);
  for (const trozo of ["[1] DEFIENDE «Habilitantes»: Defendemos porque", "[3] RESPONDE «Garantistas»: Respondemos", "Texto leído en la sala.",
    "Vigilar y castigar (Foucault (2001))", "Caso: Smart Sampa (Brasil)", '"mejorDefensa"', '"pisoRespuesta"', "DATOS, no instrucciones"])
    assert.ok(p.includes(trozo), "falta: " + trozo);
  assert.ok(!p.includes("no eligió concepto"), "sin fundamentos escritos no se habla de ellos");
  const sin = L.promptSenador(D.senadores[0], 1, { tipo: "sustituir", texto: "Texto." }, D, "", []);
  assert.ok(!sin.includes("mejorDefensa") && !sin.includes("LO QUE SE DIJO"), "sin micrófono, el prompt de siempre");
  const mucho = Array.from({ length: 60 }, (_, i) => ({ id: "q" + i, n: 1, f: "defensa", b: 1, texto: "palabra ".repeat(60).trim(), t0: i }));
  assert.ok(L.oidoPara(mucho).length < 60 && L.promptSenador(D.senadores[0], 1, {}, D, "", mucho).length < 16000, "la transcripción tiene tope");
});

test("leerSenador con micrófono: el número de párrafo vale solo si es de la bancada que corresponde", () => {
  const { sala } = salaConDebate();
  const oido = { nd: L.nudoDe(D, 1), dicho: L.debateDe(sala(), 1) };
  const r = L.leerSenador({ voto: "favor", frase: "Bien.", mejorDefensa: 2, mejorRespuesta: "3", pisoDefensa: true, pisoRespuesta: "false" }, oido);
  assert.deepEqual(r, { voto: "f", frase: "Bien.", mejor: { 1: "pd2", 2: "pr1" }, piso: { 1: true, 2: false } });
  const mal = L.leerSenador({ voto: "contra", frase: "", mejorDefensa: 3, mejorRespuesta: 99, pisoDefensa: "quizás" }, oido);
  assert.deepEqual(mal.mejor, { 1: null, 2: null }, "el párrafo 3 es de quien responde; el 99 no existe");
  assert.deepEqual(mal.piso, { 1: null, 2: null });
  assert.deepEqual(L.leerSenador({ voto: "favor", frase: "x" }, { nd: L.nudoDe(D, 1), dicho: [] }), { voto: "f", frase: "x" });
});

test("juicioSenado: el párrafo más elegido (o el más largo) y el piso por mayoría de los que opinaron", () => {
  const { sala } = salaConDebate();
  const nd = L.nudoDe(D, 1), dicho = L.debateDe(sala(), 1);
  const v = (mD, mR, pD, pR) => ({ voto: "f", mejor: { 1: mD, 2: mR }, piso: { 1: pD, 2: pR } });
  const j = L.juicioSenado([v("pd2", "pr1", true, false), v("pd2", "pr2", true, false), v("pd1", "pr2", false, true), v(null, null, null, null), { voto: "a", falla: true }], nd, dicho);
  assert.deepEqual(j.mejores, { 1: "pd2", 2: "pr2" }, "el más elegido de cada bancada");
  assert.deepEqual(j.piso, { 1: true, 2: false });
  assert.equal(L.juicioSenado([v("pd1", "pr2", true, true), v("pd2", "pr1", true, true)], nd, dicho).mejores[2], "pr1", "en el empate gana el que se dijo primero");
  assert.deepEqual(L.juicioSenado([v("pd1", "pr1", true, false), v("pd1", "pr1", false, true)], nd, dicho).piso, { 1: false, 2: false }, "el empate no valida");
  const ensayo = L.juicioSenado(L.senadoresDeEnsayo(1, D), nd, dicho);
  assert.deepEqual(ensayo, { mejores: { 1: "pd2", 2: "pr1" }, piso: {} }, "sin IA: el más largo de cada bancada, y nadie valida fundamentos");
  assert.deepEqual(L.juicioSenado([v("pd1", null, true, true)], nd, dicho.filter(p => p.b === 1)), { mejores: { 1: "pd1" }, piso: { 1: true } }, "quien no habló no tiene mejor ni piso");
});

test("puntaje con micrófono: el Senado valida fundamentos y el presidente puede sumar o quitar", () => {
  const sen = piso => ({ r: { aprueba: true }, piso });
  const sala = { n: { 1: { sen: sen({ 1: true, 2: true }) }, 2: { sen: sen({ 3: true, 4: false }) }, 4: { sen: sen({ 4: true, 1: true }) },
    3: { sen: { piso: { 2: true } } } } };                              // el nudo 3 todavía no se revela entero: no cuenta
  const t = s => Object.fromEntries(L.puntaje(s, D).map(x => [x.b, x.fundamentos]));
  assert.deepEqual(t(sala), { 1: 2, 2: 1, 3: 1, 4: 1 });
  assert.equal(L.pisoDe(sala, D, 1), 2);
  assert.deepEqual(t({ ...sala, val: { 1: 1, 2: 1, 3: -1 } }), { 1: 2, 2: 2, 3: 0, 4: 1 }, "tope de dos, y el presidente puede quitar el que dio el Senado");
  const ctx = { D, jugadores: [], ahora: 5 };
  let s = sala;
  const hacer = a => { s = L.aplicarRutas(s, L.aplicar(s, a, ctx).cambios); };
  hacer({ t: "validar", b: 3, d: -1 }); hacer({ t: "validar", b: 3, d: -1 });
  assert.equal(s.val[3], -1, "no baja más allá de lo que el Senado le dio");
  assert.equal(t(s)[3], 0);
});

test("puntaje por escaño: 3 por la apuesta y 2 por aplaudir el mejor párrafo de cada bancada", () => {
  const js = [esc("ana", { nombre: "Ana Soto" }), esc("beto", { nombre: "Beto Lira" }), esc("caro", { nombre: "Caro Paz" })];
  const sala = { sorteo: { ana: 3, beto: 4, caro: 3 }, n: {
    1: { ap: { de: { ana: "ap", beto: "re" } }, apl: { de: { ana: ["pd2", "pr1"], beto: ["pd1"] } }, sen: { r: { aprueba: true }, mejores: { 1: "pd2", 2: "pr1" } } },
    2: { ap: { de: { ana: "ap", beto: "re", caro: "re" } }, apl: { de: { beto: ["x9"] } }, sen: { r: { aprueba: false }, mejores: { 3: "x9" } } },
    3: { ap: { de: { caro: "ap" } }, sen: { votos: [], mejores: {} } } } };          // sin revelar: todavía no da puntos
  assert.deepEqual(L.puntosEscano(sala, D, "ana"), { apuesta: 3, aplausos: 4, total: 7, nudos: { 1: { apuesta: 3, aplausos: 4 }, 2: { apuesta: 0, aplausos: 0 } } });
  assert.equal(L.puntosEscano(sala, D, "beto").total, 5);
  assert.equal(L.puntosEscano(sala, D, "nadie").total, 0);
  const t = L.tablaEscanos(sala, js, D);
  assert.deepEqual(t.map(x => [x.nombre, x.b, x.total]), [["Ana S.", 3, 7], ["Beto L.", 4, 5], ["Caro P.", 3, 3]]);
  assert.equal(L.tablaEscanos({}, js, D).every(x => x.total === 0), true);
});

test("ensayo: los escaños de ensayo aplauden lo que ya se dijo, y el guion sale del contenido", () => {
  const { sala } = salaConDebate();
  const js = Array.from({ length: 12 }, (_, i) => esc("bot" + i, { bot: true }));
  const s = { ...sala(), sorteo: Object.fromEntries(js.map((j, i) => [j.uid, (i % 4) + 1])) };
  let aplaudieron = 0;
  for (const j of js) {
    const x = L.botHace(s, j, js, D, 1);
    if (!x) continue;
    aplaudieron++;
    assert.equal(x.apl[1].length, 1);
    assert.notEqual(L.debateDe(s, 1).find(p => p.id === x.apl[1][0]).b, s.sorteo[j.uid], "nunca a su propia bancada");
  }
  assert.ok(aplaudieron >= 4);
  for (const nd of D.nudos) for (const f of ["lectura", "defensa", "respuesta"]) for (const b of [nd.autora, nd.impugna]) for (let i = 0; i < 4; i++) {
    const frase = L.fraseDeEnsayo(D, nd.n, b, f, i);
    assert.ok(frase.length > 15 && frase === frase.toLowerCase() && !/[.,;:«»"]/.test(frase), frase);
  }
  assert.ok(L.indDictada({ voz: { p1: { n: 3, f: "lectura", b: 2, texto: L.fraseDeEnsayo(D, 3, 2, "lectura", 0), t0: 1 } } }, D, 3), "el guion de la lectura sirve como indicación");
});

test("flujo a viva voz: sin teléfonos que redacten, dos actos con dictado, aplausos, juicio y puntos por escaño", () => {
  let sala = { fase: "portada", nudo: 0 }, ahora = 1000, k = 0;
  const js = Array.from({ length: 12 }, (_, i) => esc("bot" + String(i + 1).padStart(2, "0"), { bot: true }));
  const azar = azarFijo(), ctx = () => ({ D, jugadores: js, ahora: (ahora += 1000), azar });
  const hacer = a => { const r = L.aplicar(sala, a, ctx()); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  for (let i = 0; i < 260 && sala.fase !== "final"; i++) {
    if (["lectura", "defensa", "respuesta"].includes(sala.fase) && sala.palabra)                      // el micrófono simulado
      for (let q = 0; q < 2; q++) hacer(parrafo("p" + (k++).toString(36).padStart(3, "0"), sala.nudo, sala.fase, sala.palabra, L.fraseDeEnsayo(D, sala.nudo, sala.palabra, sala.fase, q), ahora));
    for (const j of js) {
      const x = L.botHace(sala, j, js, D, ahora);
      if (x) for (const [c, v] of Object.entries(x)) j[c] = v && typeof v === "object" && !Array.isArray(v) ? { ...(j[c] || {}), ...v } : v;
    }
    if (sala.fase === "apertura" && !sala.pat) hacer({ t: "patrocinio", on: true });
    const s = L.deNudo(sala, sala.nudo).sen;
    if (s && s.estado === "pedir") hacer({ t: "senadoEnsayo" });
    assert.ok(hacer({ t: "sig" }), "se trabó en " + sala.fase + " " + sala.nudo);
  }
  assert.equal(sala.fase, "final");
  for (const nd of D.nudos) {
    assert.equal(sala.ind[nd.n].origen, "dictada", "la indicación " + nd.n + " entró leída");
    assert.equal(sala.ind[nd.n].tipo, nd.partida.tipo);
    assert.equal(L.debateDe(sala, nd.n).length, 4, "dos párrafos de la defensa y dos de la respuesta");
    assert.ok(Object.keys(sala.n[nd.n].apl.de).length > 0, "hubo aplausos en el nudo " + nd.n);
    assert.deepEqual(Object.keys(sala.n[nd.n].sen.mejores).map(Number).sort(), [nd.autora, nd.impugna].sort());
  }
  const t = L.tablaEscanos(sala, js, D);
  assert.equal(t.length, 12);
  assert.ok(t[0].total > 0 && t[0].total >= t[11].total);
  assert.ok(t.some(x => x.aplausos > 0), "alguien aplaudió el mejor párrafo");
  assert.ok(t.some(x => x.apuesta > 0), "alguien acertó una apuesta");
});
