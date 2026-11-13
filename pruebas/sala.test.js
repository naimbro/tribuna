const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../sala-logica.js");
const D = require("../sala-datos.js");

const esc = (uid, x = {}) => ({ uid, nombre: uid + " Ensayo", email: uid + "@ensayo", equipo: "P", ...x });
const azarFijo = () => { let s = 42; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; };

/* ---------------- el contenido ---------------- */
test("contenido: cuatro nudos, cuatro bancadas, y cada bancada es autora de uno e impugna otro", () => {
  assert.equal(D.nudos.length, 4);
  assert.equal(D.bancadas.length, 4);
  for (const b of D.bancadas) {
    assert.equal(L.nudoDe(D, b.autora).autora, b.n, b.nombre + " es autora de su nudo");
    assert.equal(L.nudoDe(D, b.impugna).impugna, b.n, b.nombre + " impugna su nudo");
    assert.notEqual(b.autora, b.impugna);
  }
  assert.deepEqual(D.nudos.map(n => n.autora).sort(), [1, 2, 3, 4]);
  assert.deepEqual(D.nudos.map(n => n.impugna).sort(), [1, 2, 3, 4]);
});

test("contenido: cada nudo trae artículo, dos voces, indicación de partida y conceptos que existen", () => {
  const ids = new Set(D.conceptos.map(c => c.id));
  assert.equal(ids.size, D.conceptos.length, "sin conceptos repetidos");
  for (const n of D.nudos) {
    assert.ok(n.vigente.texto.length > 40 && n.vigente.simple, "nudo " + n.n);
    assert.equal(n.pelea.length, 2);
    for (const p of n.pelea) assert.ok(p.quien && p.cita && p.fuente);
    assert.ok(L.TIPOS.includes(n.partida.tipo));
    assert.ok(["estado", "empresas", "ciudadanos"].includes(n.mueve.hacia) && n.mueve.hacia !== n.mueve.desde);
    for (const s of n.sugeridos) assert.ok(ids.has(s), "concepto sugerido " + s);
    assert.ok(L.catalogo(D, n.n, "dem").length >= 5 && L.catalogo(D, n.n, "ia").length >= 5);
  }
  assert.equal(D.nudos.filter(n => n.requierePatrocinio).length, 1, "solo el nudo 3 crea un organismo");
  assert.equal(D.senadores.length, 5);
  assert.equal(D.filtraciones.length, 6);
  for (const c of D.conceptos) assert.ok(["dem", "ia"].includes(c.mod) && c.sem >= 2 && c.sem <= 14 && c.fuente);
});

test("catálogo: primero los sugeridos del nudo, después las semanas más recientes", () => {
  const ia = L.catalogo(D, 2, "ia");
  assert.ok(ia[0].sugerido);
  const resto = ia.filter(c => !c.sugerido).map(c => c.sem);
  assert.deepEqual(resto, [...resto].sort((a, b) => b - a));
});

/* ---------------- utilidades ---------------- */
test("aplicarRutas: escribe rutas anidadas como updateDoc, sin tocar el original", () => {
  const a = { n: { 1: { v: { estado: "abierta" } } }, fase: "x" };
  const b = L.aplicarRutas(a, { "n.1.v": { estado: "cerrada" }, "n.2.inadm": true, "urg.3": true, fase: "y", reloj: null });
  assert.equal(a.n[1].v.estado, "abierta");
  assert.deepEqual(b, { n: { 1: { v: { estado: "cerrada" } }, 2: { inadm: true } }, fase: "y", urg: { 3: true }, reloj: null });
});

test("nombreCorto y jsonDe", () => {
  assert.equal(L.nombreCorto("Antonia Rojas Pérez"), "Antonia R.");
  assert.equal(L.nombreCorto(""), "Alguien");
  assert.deepEqual(L.jsonDe('```json\n{"voto":"favor","frase":"x"}\n```'), { voto: "favor", frase: "x" });
  assert.equal(L.jsonDe("no hay json"), null);
});

/* ---------------- sorteo ---------------- */
test("sortear: bancadas equilibradas, y quien ya tiene bancada la conserva", () => {
  const uids = Array.from({ length: 22 }, (_, i) => "u" + i);
  const s = L.sortear(uids, {}, azarFijo());
  const c = Object.values(L.porBancada(s));
  assert.equal(c.reduce((a, b) => a + b, 0), 22);
  assert.ok(Math.max(...c) - Math.min(...c) <= 1, "diferencia máxima de uno: " + c);
  const s2 = L.sortear([...uids, "tarde1", "tarde2", "tarde3"], s, azarFijo());
  for (const u of uids) assert.equal(s2[u], s[u]);
  const c2 = Object.values(L.porBancada(s2));
  assert.ok(Math.max(...c2) - Math.min(...c2) <= 1, "quien llega tarde va a la bancada más chica: " + c2);
});

test("escaños: el equipo docente y los que salieron no ocupan escaño", () => {
  const js = [esc("a"), esc("b", { fuera: true }), { uid: "profe", nombre: "P", equipo: "", rol: "docente" }, esc("c")];
  assert.deepEqual(L.escanos(js).map(j => j.uid), ["a", "c"]);
});

/* ---------------- votos ---------------- */
test("contar: mayoría simple, las abstenciones no suman y el empate rechaza", () => {
  assert.equal(L.contar({ a: "f", b: "f", c: "c" }, 3).aprobada, true);
  assert.equal(L.contar({ a: "f", b: "c" }, 2).aprobada, false, "empate");
  assert.equal(L.contar({ a: "f", b: "a", c: "a", d: "c", e: "c" }, 5).aprobada, false);
  assert.equal(L.contar({ a: "f", b: "a", c: "a" }, 3).aprobada, true, "uno a favor y nadie en contra");
  assert.deepEqual(L.contar({ a: "f", b: "x" }, 2), { f: 1, c: 0, a: 0, votaron: 1, escanos: 2, quorum: true, aprobada: true });
});

test("quórum: un tercio de los escaños; sin quórum no se aprueba nada", () => {
  assert.equal(L.quorumDe(24), 8);
  assert.equal(L.quorumDe(22), 8);
  assert.equal(L.quorumDe(0), 1);
  const sin = L.contar({ a: "f", b: "f" }, 24);
  assert.equal(sin.quorum, false);
  assert.equal(sin.aprobada, false);
  const votos = Object.fromEntries(Array.from({ length: 8 }, (_, i) => ["u" + i, "f"]));
  assert.equal(L.contar(votos, 24).aprobada, true);
  assert.equal(L.contar({}, 10).quorum, false);
});

test("dos tercios: la insistencia necesita dos de cada tres votos, con las abstenciones presentes", () => {
  const v = (f, c, a) => Object.fromEntries([...Array(f).fill("f"), ...Array(c).fill("c"), ...Array(a).fill("a")].map((x, i) => ["u" + i, x]));
  assert.equal(L.dosTercios(v(16, 8, 0)).insiste, true);
  assert.equal(L.dosTercios(v(15, 9, 0)).insiste, false);
  assert.equal(L.dosTercios(v(14, 2, 8)).insiste, false, "las abstenciones cuentan como presentes");
  assert.equal(L.dosTercios(v(2, 1, 0)).insiste, true);
  assert.equal(L.dosTercios(v(0, 0, 0)).insiste, false);
  assert.equal(L.dosTercios(v(7, 3, 0)).necesarios, 7);
});

test("votosDe: solo cuentan los escaños sorteados y los valores válidos", () => {
  const sala = { sorteo: { a: 1, b: 2 } };
  const js = [esc("a", { v: { 2: "f" } }), esc("b", { v: { 2: "zzz" } }), esc("colado", { v: { 2: "c" } })];
  assert.deepEqual(L.votosDe(sala, js, "v", 2), { a: "f" });
  assert.deepEqual(L.votosDe({}, [esc("a", { g: "c" })], "g"), { a: "c" });
});

/* ---------------- admisibilidad y estado ---------------- */
test("admisibilidad: el nudo que crea un organismo necesita patrocinio; los demás no", () => {
  assert.equal(L.admisible({}, L.nudoDe(D, 3)), false);
  assert.equal(L.admisible({ pat: true }, L.nudoDe(D, 3)), true);
  for (const n of [1, 2, 4]) assert.equal(L.admisible({}, L.nudoDe(D, n)), true);
});

test("estadoNudo: pendiente, rechazada, aprobada, inadmisible, vetada e insistida", () => {
  const r = aprobada => ({ v: { r: { aprobada, quorum: true } } });
  assert.equal(L.estadoNudo({}, 1), "pendiente");
  assert.equal(L.estadoNudo({ n: { 1: r(false) } }, 1), "rechazada");
  assert.equal(L.estadoNudo({ n: { 1: r(true) } }, 1), "aprobada");
  assert.equal(L.estadoNudo({ n: { 3: { inadm: true } } }, 3), "inadmisible");
  assert.equal(L.estadoNudo({ n: { 1: { ...r(true), veto: true } } }, 1), "vetada");
  assert.equal(L.estadoNudo({ n: { 1: { ...r(true), veto: true, ins: { r: { insiste: false } } } } }, 1), "vetada");
  assert.equal(L.estadoNudo({ n: { 1: { ...r(true), veto: true, ins: { r: { insiste: true } } } } }, 1), "insistida");
});

/* ---------------- el triángulo ---------------- */
test("triángulo: parte en el centro y cada indicación aprobada lo mueve hacia donde dice el nudo", () => {
  const t0 = L.triangulo({}, D);
  assert.equal(t0.ruta.length, 1);
  assert.ok(Math.abs(t0.pos.estado - 1 / 3) < 1e-9);
  const ap = { v: { r: { aprobada: true, quorum: true } } };
  const t1 = L.triangulo({ n: { 1: ap } }, D);                       // hacia empresas, desde ciudadanos
  assert.ok(t1.pos.empresas > 1 / 3 && t1.pos.ciudadanos < 1 / 3 && Math.abs(t1.pos.estado - 1 / 3) < 1e-9);
  const todas = L.triangulo({ n: { 1: ap, 2: ap, 3: ap, 4: ap } }, D);
  assert.equal(todas.ruta.length, 5);
  assert.ok(todas.pos.estado > todas.pos.empresas);
  for (const p of todas.ruta) assert.ok(Math.abs(p.estado + p.empresas + p.ciudadanos - 1) < 1e-9, "los pesos siempre suman 1");
});

test("triángulo: lo rechazado, lo inadmisible y lo vetado sin insistencia no lo mueven", () => {
  const ap = { v: { r: { aprobada: true, quorum: true } } };
  const sala = { n: { 1: { v: { r: { aprobada: false, quorum: true } } }, 2: { ...ap, veto: true }, 3: { inadm: true } } };
  assert.equal(L.triangulo(sala, D).ruta.length, 1);
  sala.n[2].ins = { r: { insiste: true } };
  assert.equal(L.triangulo(sala, D).ruta.length, 2, "con insistencia vuelve a contar");
});

test("mover y aXY: nunca saca más peso del que hay, y el centro cae en el centro", () => {
  const p = L.mover({ estado: 0.9, empresas: 0.05, ciudadanos: 0.05 }, "estado", "empresas", 0.14);
  assert.ok(Math.abs(p.empresas) < 1e-9 && Math.abs(p.estado - 0.95) < 1e-9);
  assert.deepEqual(L.aXY(L.CENTRO, { estado: [50, 0], empresas: [0, 90], ciudadanos: [100, 90] }), [50, 60]);
});

/* ---------------- indicaciones ---------------- */
test("faltaInd: el formato fijo pide tipo, texto, un concepto de cada módulo y una frase por concepto", () => {
  assert.equal(L.faltaInd({}, D).length, 4);
  const ok = { tipo: "sustituir", texto: "Sustitúyese el artículo 5 por principios.", dem: "d9_foucault",
    demFrase: "El artículo vigila antes de castigar.", ia: "i12_ijop", iaFrase: "El caso muestra qué pasa sin control." };
  assert.deepEqual(L.faltaInd(ok, D), []);
  assert.equal(L.faltaInd({ ...ok, dem: "i12_ijop" }, D).length, 1, "un concepto de IA no sirve como concepto de Democracia");
  assert.equal(L.faltaInd({ ...ok, iaFrase: "corta" }, D).length, 1);
  assert.equal(L.faltaInd({ ...ok, tipo: "borrar todo" }, D).length, 1);
});

test("borradorDe: vale la última versión que guardó alguien de la bancada", () => {
  const sala = { sorteo: { a: 1, b: 1, c: 2 } };
  const js = [esc("a", { ind: { tipo: "agregar", texto: "primera versión del texto", t: 10 } }),
    esc("b", { ind: { tipo: "suprimir", texto: "segunda versión del texto", t: 20, lista: true } }),
    esc("c", { ind: { tipo: "agregar", texto: "otra bancada", t: 30 } })];
  const b = L.borradorDe(sala, js, 1);
  assert.equal(b.texto, "segunda versión del texto");
  assert.equal(b.lista, true);
  assert.equal(b.por, "b");
  assert.equal(L.borradorDe(sala, js, 3), null);
});

test("indicacionDe: con la redacción abierta manda lo último de la bancada; cerrada, la oficial", () => {
  const js = [esc("a", { ind: { tipo: "agregar", texto: "versión nueva de la bancada", t: 50, lista: true } })];
  const oficial = { tipo: "sustituir", texto: "la que estaba en el comparado", origen: "bancada", t: 10 };
  const sala = { fase: "redaccion", sorteo: { a: 1 }, ind: { 1: oficial } };
  assert.equal(L.indicacionDe(sala, js, D, 1).texto, "versión nueva de la bancada");
  assert.equal(L.indicacionDe({ ...sala, fase: "lectura" }, js, D, 1).texto, "la que estaba en el comparado");
  assert.equal(L.indicacionDe({ ...sala, ind: { 1: { ...oficial, t: 99 } } }, js, D, 1).texto, "la que estaba en el comparado", "una oficial más nueva no se pisa");
  assert.equal(L.indicacionDe({ fase: "lectura", sorteo: { a: 1 } }, js, D, 1).origen, "bancada");
  assert.equal(L.indicacionDe({ fase: "lectura", sorteo: {} }, [], D, 2), null);
});

/* ---------------- el Senado simulado ---------------- */
test("leerSenador: acepta favor, contra y abstención, con o sin tilde; lo demás no vale", () => {
  assert.deepEqual(L.leerSenador({ voto: "A favor", frase: " Deja hacer. " }), { voto: "f", frase: "Deja hacer." });
  assert.equal(L.leerSenador({ voto: "en contra" }).voto, "c");
  assert.equal(L.leerSenador({ voto: "Abstención" }).voto, "a");
  assert.equal(L.leerSenador({ voto: "quizás" }), null);
  assert.equal(L.leerSenador(null), null);
});

test("promptSenador: lleva el criterio, el artículo, la indicación y la nota; nada más", () => {
  const ind = { tipo: "sustituir", texto: "Texto de la bancada.", dem: "d9_foucault", demFrase: "Frase que aplica.", ia: "i12_ijop", iaFrase: "Otra frase." };
  const p = L.promptSenador(D.senadores[4], 2, ind, D, "La autora citó el artículo 6.");
  for (const trozo of ["Hacienda", "quién paga", "La excepción de seguridad", "Texto de la bancada.", "Vigilar y castigar", "La autora citó el artículo 6.", D.rotuloTexto, '"voto"'])
    assert.ok(p.includes(trozo), "falta: " + trozo);
  assert.ok(p.length < 6000);
});

test("senado: gana si hay más votos a favor que en contra; los de ensayo van rotulados", () => {
  assert.equal(L.resultadoSenado([{ voto: "f" }, { voto: "f" }, { voto: "c" }, { voto: "a" }, { voto: "a" }]).aprueba, true);
  assert.equal(L.resultadoSenado([{ voto: "f" }, { voto: "c" }, { voto: "a" }]).aprueba, false);
  for (const n of [1, 2, 3, 4]) {
    const vs = L.senadoresDeEnsayo(n, D);
    assert.equal(vs.length, 5);
    assert.ok(vs.every(v => v.ensayo && L.VOTOS.includes(v.voto) && /ensayo/i.test(v.frase)));
    assert.deepEqual(vs, L.senadoresDeEnsayo(n, D), "siempre los mismos");
  }
});

/* ---------------- puntaje ---------------- */
test("puntaje: 2 por la sala, 2 por el Senado, 1 por patrocinio y hasta 2 fundamentos", () => {
  const sala = { pat: true, val: { 1: 5, 2: 1 },
    n: { 1: { v: { r: { aprobada: true, quorum: true } }, sen: { r: { aprueba: false } } },      // sala: habilitantes; Senado: garantistas
      3: { v: { r: { aprobada: false, quorum: true } }, sen: { r: { aprueba: false } } } } };     // gana quien impugna: orden y seguridad
  const t = Object.fromEntries(L.puntaje(sala, D).map(x => [x.b, x]));
  assert.deepEqual([t[1].sala, t[1].senado, t[1].fundamentos, t[1].total], [2, 0, 2, 4]);
  assert.deepEqual([t[2].senado, t[2].patrocinio, t[2].fundamentos, t[2].total], [2, 1, 1, 4]);
  assert.deepEqual([t[3].sala, t[3].senado, t[3].total], [2, 2, 4]);
  assert.equal(t[4].total, 0);
  assert.equal(L.puntaje({}, D).every(x => x.total === 0), true);
  const p = L.puntaje({ n: { 2: { v: { r: { aprobada: true, quorum: true } } } } }, D);
  assert.equal(p[0].b, 3, "la tabla va de mayor a menor");
});

test("puntaje: un nudo inadmisible no reparte puntos de sala ni de Senado", () => {
  const t = L.puntaje({ n: { 3: { inadm: true } } }, D);
  assert.ok(t.every(x => x.sala === 0 && x.senado === 0));
});

/* ---------------- el hemiciclo ---------------- */
test("asientos: uno por escaño, dentro de la caja, sin encimarse y de izquierda a derecha", () => {
  for (const n of [1, 2, 5, 11, 20, 25, 40]) {
    const as = L.asientos(n);
    assert.equal(as.length, n);
    for (const a of as) assert.ok(a.x >= 0 && a.x <= 200 && a.y >= 0 && a.y <= 108 && a.r > 0, `${n}: ${JSON.stringify(a)}`);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
      assert.ok(Math.hypot(as[i].x - as[j].x, as[i].y - as[j].y) >= as[i].r * 1.9, `${n} escaños: ${i} y ${j} se enciman`);
  }
  assert.deepEqual(L.asientos(0), []);
  const as = L.asientos(12);
  assert.ok(as[0].x < as[11].x);
});

test("ubicar: las bancadas quedan juntas", () => {
  const js = Array.from({ length: 12 }, (_, i) => esc("u" + String(i).padStart(2, "0")));
  const sala = { sorteo: L.sortear(js.map(j => j.uid), {}, azarFijo()) };
  const bs = L.ubicar(sala, js).map(e => e.b);
  assert.deepEqual(bs, [...bs].sort((a, b) => a - b));
});

/* ---------------- el flujo completo, con escaños de ensayo ---------------- */
function recorrer({ patrocinio = true, veto = 0, urgencia = 0, alTerminarFase = null } = {}) {
  let sala = { fase: "portada", nudo: 0, bots: 12 }, ahora = 1000;
  const js = Array.from({ length: 12 }, (_, i) => esc("bot" + String(i + 1).padStart(2, "0"), { bot: true }));
  const azar = azarFijo(), ctx = () => ({ D, jugadores: js, ahora: (ahora += 1000), azar });
  const hacer = a => { const r = L.aplicar(sala, a, ctx()); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  const fases = [];
  for (let i = 0; i < 200 && sala.fase !== "final"; i++) {
    for (const j of js) {                                    // los escaños de ensayo hacen lo suyo
      const x = L.botHace(sala, j, js, D, ahora);
      if (x) for (const [k, v] of Object.entries(x)) j[k] = v && typeof v === "object" && !Array.isArray(v) && k !== "ind" ? { ...(j[k] || {}), ...v } : v;
    }
    if (sala.fase === "apertura" && urgencia && !(sala.urg || {})[urgencia]) hacer({ t: "urgencia", n: urgencia, on: true });
    if (sala.fase === "apertura" && patrocinio && !sala.pat) hacer({ t: "patrocinio", on: true });
    if (sala.fase === "veto" && veto && !sala.vetado) hacer({ t: "vetar", n: veto });
    const s = L.deNudo(sala, sala.nudo).sen;                 // el motor: sin IA, votos de ensayo
    if (s && s.estado === "pedir") hacer({ t: "senadoEnsayo" });
    if (alTerminarFase) alTerminarFase(sala, hacer);
    fases.push(sala.fase + (sala.nudo ? sala.nudo : ""));
    const antes = JSON.stringify(sala);
    assert.ok(L.etiquetaSiguiente(sala, D), "el botón dice algo en " + sala.fase);
    const r = hacer({ t: "sig" });
    assert.ok(r, "se trabó en " + sala.fase + " " + sala.nudo);
    assert.notEqual(JSON.stringify(sala), antes);
  }
  return { sala, fases, js };
}

test("flujo: los dos actos completos, de la portada a la ley despachada", () => {
  const { sala, fases } = recorrer();
  assert.equal(sala.fase, "final");
  for (const f of ["portada", "cuenta", "general", "generalR", "sorteo", "nudos1", "nudos4", "redaccion", "lectura1", "lectura4", "tarea",
    "apertura", "pelea1", "defensa1", "respuesta1", "votacion1", "resultado1", "apuesta1", "senado1", "cierre1", "pelea4", "cierre4", "veto"])
    assert.ok(fases.includes(f), "pasó por " + f);
  assert.equal(fases.filter(f => f === "senado2").length, 6, "cinco votos revelados uno por uno, y el paso al cierre");
  assert.equal(Object.keys(sala.sorteo).length, 12);
  for (const n of [1, 2, 3, 4]) {
    assert.equal(sala.ind[n].origen, "bancada", "la bancada entregó la indicación " + n);
    assert.equal(sala.n[n].v.estado, "cerrada");
    assert.equal(sala.n[n].v.r.votaron, 12);
    assert.equal(sala.n[n].sen.votos.length, 5);
    assert.ok(sala.n[n].sen.r);
    assert.equal(Object.keys(sala.n[n].ap.de).length, 12);
    assert.notEqual(L.estadoNudo(sala, n), "pendiente");
  }
  const ley = L.leyDespachada(sala, D);
  assert.equal(ley.length, 4);
  assert.equal(L.triangulo(sala, D).ruta.length, 1 + ley.filter(x => x.queda).length);
  assert.equal(L.puntaje(sala, D).reduce((a, x) => a + x.sala, 0), 8, "cada nudo votado reparte 2 puntos de sala");
});

test("flujo: sin patrocinio, el nudo 3 es inadmisible y no se vota", () => {
  const { sala, fases } = recorrer({ patrocinio: false });
  assert.ok(fases.includes("inadmisible3"));
  assert.ok(!fases.includes("votacion3"));
  assert.equal(L.estadoNudo(sala, 3), "inadmisible");
  assert.equal(sala.n[3].v, undefined);
  assert.equal(L.puntaje(sala, D).find(x => x.b === 2).patrocinio, 0);
});

test("flujo: el patrocinio que llega tarde permite votar el nudo 3", () => {
  const { sala, fases } = recorrer({ patrocinio: false, alTerminarFase: (s, hacer) => { if (s.fase === "inadmisible" && !s.pat) hacer({ t: "patrocinio", on: true }); } });
  assert.ok(fases.includes("inadmisible3") && fases.includes("votacion3"));
  assert.notEqual(L.estadoNudo(sala, 3), "inadmisible");
  assert.equal(L.puntaje(sala, D).find(x => x.b === 2).patrocinio, 1);
});

test("flujo: la urgencia parte el tiempo del debate por la mitad", () => {
  const relojes = {};
  recorrer({ urgencia: 2, alTerminarFase: s => { if (s.fase === "defensa") relojes[s.nudo] = s.reloj.dur; } });
  assert.equal(relojes[1], D.tiempos.defensa);
  assert.equal(relojes[2], D.tiempos.defensa / 2);
});

test("flujo: el veto abre la insistencia y sin dos tercios la indicación cae", () => {
  const base = recorrer();
  const aprobada = [1, 2, 3, 4].find(n => L.estadoNudo(base.sala, n) === "aprobada");
  assert.ok(aprobada, "alguna indicación se aprobó en el ensayo");
  const { sala, fases } = recorrer({ veto: aprobada });
  assert.ok(fases.includes("insistencia") && fases.includes("insistenciaR"));
  assert.equal(sala.n[aprobada].ins.estado, "cerrada");
  assert.ok(["vetada", "insistida"].includes(L.estadoNudo(sala, aprobada)));
  assert.equal(L.enLaLey(L.estadoNudo(sala, aprobada)), sala.n[aprobada].ins.r.insiste);
});

/* ---------------- acciones del equipo docente ---------------- */
test("acciones: validar fundamentos tiene tope de dos y no baja de cero", () => {
  const ctx = { D, jugadores: [], ahora: 5 };
  let sala = {};
  const hacer = a => { sala = L.aplicarRutas(sala, L.aplicar(sala, a, ctx).cambios); };
  hacer({ t: "validar", b: 2, d: 1 }); hacer({ t: "validar", b: 2, d: 1 }); hacer({ t: "validar", b: 2, d: 1 });
  assert.equal(sala.val[2], 2);
  hacer({ t: "validar", b: 2, d: -1 }); hacer({ t: "validar", b: 2, d: -1 }); hacer({ t: "validar", b: 2, d: -1 });
  assert.equal(sala.val[2], 0);
  assert.equal(L.aplicar(sala, { t: "validar", b: 9, d: 1 }, ctx), null);
});

test("acciones: palabra, pedido de fundamento, reloj, filtraciones y nota", () => {
  const ctx = { D, jugadores: [], ahora: 77 };
  let sala = { fase: "defensa", nudo: 1 };
  const hacer = a => { const r = L.aplicar(sala, a, ctx); if (r) sala = L.aplicarRutas(sala, r.cambios); return r; };
  hacer({ t: "palabra", b: 3 }); assert.equal(sala.palabra, 3);
  hacer({ t: "pedir", b: 3, mod: "dem" }); assert.deepEqual(sala.pedido, { b: 3, mod: "dem", t: 77 });
  hacer({ t: "validar", b: 3, d: 1 }); assert.equal(sala.pedido, null, "validar cierra el pedido");
  hacer({ t: "reloj", dur: 60, b: 2 }); assert.deepEqual(sala.reloj, { ini: 77, dur: 60, b: 2 });
  hacer({ t: "reloj", dur: 0 }); assert.equal(sala.reloj, null);
  hacer({ t: "filtrar", id: "f3" }); hacer({ t: "filtrar", id: "f3" }); hacer({ t: "filtrar", id: "f5" });
  assert.deepEqual(sala.filt, ["f3", "f5"]);
  assert.equal(sala.filtVer.id, "f5");
  hacer({ t: "filtrar", id: null }); assert.equal(sala.filtVer, null);
  assert.equal(hacer({ t: "filtrar", id: "inventada" }), null);
  hacer({ t: "nota", n: 1, txt: "La autora aplicó bien a Foucault." }); assert.equal(sala.n[1].nota, "La autora aplicó bien a Foucault.");
  hacer({ t: "partida", n: 4 }); assert.equal(sala.ind[4].origen, "partida");
  assert.equal(L.aplicar(sala, { t: "no existe" }, ctx), null);
});

test("acciones: solo se veta una indicación aprobada, y solo en la fase de veto", () => {
  const ctx = { D, jugadores: [], ahora: 9 };
  const ap = { v: { r: { aprobada: true, quorum: true } } }, re = { v: { r: { aprobada: false, quorum: true } } };
  let sala = { fase: "cierre", nudo: 4, n: { 1: ap, 2: re } };
  assert.equal(L.aplicar(sala, { t: "vetar", n: 1 }, ctx), null, "todavía no es la fase de veto");
  sala.fase = "veto";
  assert.equal(L.aplicar(sala, { t: "vetar", n: 2 }, ctx), null, "no se veta lo rechazado");
  sala = L.aplicarRutas(sala, L.aplicar(sala, { t: "vetar", n: 1 }, ctx).cambios);
  assert.equal(sala.vetado, 1);
  assert.equal(L.estadoNudo(sala, 1), "vetada");
  sala = L.aplicarRutas(sala, L.aplicar(sala, { t: "vetar", n: 0 }, ctx).cambios);
  assert.equal(L.estadoNudo(sala, 1), "aprobada", "el Ejecutivo puede arrepentirse antes de cerrar");
});

test("acciones: sin quórum no se avanza, y reabrir repite la votación", () => {
  const js = Array.from({ length: 9 }, (_, i) => esc("u" + i));
  const sorteo = L.sortear(js.map(j => j.uid), {}, azarFijo());
  js[0].v = { 1: "f" };
  let sala = { fase: "votacion", nudo: 1, sorteo, n: { 1: { v: { estado: "abierta" } } } };
  const ctx = { D, jugadores: js, ahora: 3 };
  sala = L.aplicarRutas(sala, L.aplicar(sala, { t: "sig" }, ctx).cambios);
  assert.equal(sala.n[1].v.r.quorum, false);
  assert.equal(L.aplicar(sala, { t: "sig" }, ctx), null);
  sala = L.aplicarRutas(sala, L.aplicar(sala, { t: "reabrir" }, ctx).cambios);
  assert.equal(sala.fase, "votacion");
  assert.equal(sala.n[1].v.estado, "abierta");
});

test("ensayo: los escaños de la bancada autora votan a favor y los de la que impugna, en contra", () => {
  const js = Array.from({ length: 8 }, (_, i) => esc("bot" + i, { bot: true }));
  const sala = { fase: "votacion", nudo: 2, sorteo: L.sortear(js.map(j => j.uid), {}, azarFijo()) };
  for (const j of js) {
    const x = L.botHace(sala, j, js, D, 1), b = sala.sorteo[j.uid];
    if (b === 3) assert.equal(x.v[2], "f");
    if (b === 4) assert.equal(x.v[2], "c");
    assert.ok(L.VOTOS.includes(x.v[2]));
  }
});
