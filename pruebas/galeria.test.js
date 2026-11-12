const test = require("node:test");
const assert = require("node:assert/strict");
const G = require("../galeria.js");

const D = { n: 1, pregunta: "La IA es una revolución de la productividad.",
  A: { nombre: "Philippe Aghion", corto: "Aghion", g: 1 }, B: { nombre: "Daron Acemoglu", corto: "Acemoglu", g: 2 } };
const GRUPOS = [1, 2, 3, 4].map(n => ({ n, nombre: "Grupo " + n, corto: ["Aghion", "Acemoglu", "Thiel", "Khan"][n - 1], color: "#000000" }));
// un estudiante con lo suyo en el duelo 1
const pub = (uid, grupo, x = {}) => ({ uid, nombre: uid[0].toUpperCase() + uid.slice(1) + " X.", grupo, pos: 0, d: { 1: x } });

test("nombreCorto: nombre e inicial, y algo decente si viene vacío o raro", () => {
  assert.equal(G.nombreCorto("Antonia Rojas Pérez"), "Antonia R.");
  assert.equal(G.nombreCorto("  matías   "), "matías");
  assert.equal(G.nombreCorto(""), "Alguien");
  assert.equal(G.nombreCorto(null), "Alguien");
  assert.ok(G.nombreCorto("Maximilianoalejandrodelosangeles Soto").length <= 21);
});

test("juega: los dos grupos que debaten miran; el resto y quien no tiene grupo juegan", () => {
  assert.equal(G.juega(1, D), false);
  assert.equal(G.juega(2, D), false);
  assert.equal(G.juega(3, D), true);
  assert.equal(G.juega(0, D), true);
  const sinGrupos = { ...D, A: { ...D.A, g: 0 }, B: { ...D.B, g: 0 } };
  assert.equal(G.juega(0, sinGrupos), true, "clase sin personajes: todos juegan");
});

test("aplaudir: tres por lado, tocar de nuevo retira, y con los tres gastados no entra otro", () => {
  let ap = { A: [], B: [] };
  ap = G.aplaudir(ap, "A", "p1");
  ap = G.aplaudir(ap, "A", "p2");
  ap = G.aplaudir(ap, "A", "p3");
  assert.deepEqual(ap.A, ["p1", "p2", "p3"]);
  assert.equal(G.quedan(ap, "A"), 0);
  assert.equal(G.quedan(ap, "B"), 3);
  assert.equal(G.aplaudir(ap, "A", "p4"), null, "ya gastó los de ese lado");
  ap = G.aplaudir(ap, "A", "p2");
  assert.deepEqual(ap.A, ["p1", "p3"], "tocar de nuevo lo retira");
  assert.deepEqual(G.aplaudir(ap, "A", "p4").A, ["p1", "p3", "p4"]);
  assert.deepEqual(G.aplaudir(undefined, "B", "x"), { A: [], B: ["x"] });
});

test("deDuelo: un documento mal formado o manipulado queda con la forma de siempre", () => {
  const raro = { uid: "u", d: { 1: { ap: { A: ["a", "a", 7, "b", "c", "d"], B: "no" }, pulso: 900, apuesta: "C", q: "  hola   mundo " + "x".repeat(300), quiz: "no" } } };
  const e = G.deDuelo(raro, 1);
  assert.deepEqual(e.ap.B, []);
  assert.equal(e.pulso, 100, "el pulso se acota");
  assert.equal(e.apuesta, null);
  assert.equal(e.q.length, 140);
  assert.ok(e.q.startsWith("hola mundo"));
  assert.deepEqual(e.quiz, {});
  assert.deepEqual(G.deDuelo({}, 1), { ap: { A: [], B: [] }, pulso: null, apuesta: null, q: "", t: 0, quiz: {} });
  assert.deepEqual(G.deDuelo(null, 3).ap, { A: [], B: [] });
  // en los agregados solo cuentan tres por lado y una vez por párrafo
  assert.deepEqual(G.agregados([raro], D).aplausos, { a: 1, b: 1 });
});

test("agregados: pulso desde tres personas, aplausos por párrafo, apuestas y respuestas; los que debaten no cuentan", () => {
  const ps = [
    pub("ana", 3, { pulso: -60, ap: { A: ["p1"], B: ["p2"] }, apuesta: "A", quiz: { 0: 2 } }),
    pub("beto", 4, { pulso: 20, ap: { A: ["p1"], B: [] }, apuesta: "B" }),
    pub("caro", 1, { pulso: 100, ap: { A: ["p1", "p9"], B: [] }, apuesta: "A", quiz: { 0: 1 } })   // su grupo debate
  ];
  let a = G.agregados(ps, D, 0);
  assert.equal(a.duelo, 1);
  assert.equal(a.n, 3, "la gente conectada son todos");
  assert.equal(a.pulso, null, "con dos personas jugando no hay pulso");
  assert.deepEqual(a.aplausos, { p1: 2, p2: 1 });
  assert.equal(a.apostaron, 2);
  assert.equal(a.respondieron, 1);
  ps.push(pub("dani", 0, { pulso: 10 }));
  a = G.agregados(ps, D);
  assert.equal(a.pulso, -10, "promedio de −60, 20 y 10");
  assert.equal(a.respondieron, 0, "sin pregunta en curso no se cuentan respuestas");
  assert.deepEqual(G.agregados([], D), { duelo: 1, n: 0, pulso: null, aplausos: {}, apostaron: 0, respondieron: 0 });
  assert.equal(G.agregados(ps, null).duelo, null);
});

test("fotos de cierre: lo que cada uno tenía, solo de quienes juegan", () => {
  const ps = [pub("ana", 3, { ap: { A: ["p1"], B: ["p2"] }, apuesta: "A", quiz: { 0: 2, 1: 0 } }),
    pub("beto", 4, { quiz: { 1: 3 } }), pub("caro", 2, { apuesta: "B", quiz: { 0: 2 } })];
  assert.deepEqual(G.fotoAplausos(ps, D), { ana: ["p1", "p2"], beto: [] });
  assert.deepEqual(G.fotoApuestas(ps, D), { ana: "A" });
  assert.deepEqual(G.fotoQuiz(ps, D, 0), { ana: 2 });
  assert.deepEqual(G.fotoQuiz(ps, D, 1), { ana: 0, beto: 3 });
});

const DATOS = { ganador: "A", mejores: { A: "p1", B: "p7" }, usadas: ["beto_1"], claves: [2, 0] };

test("puntosDuelo: apuesta 3, aplauso certero 2 por lado, pregunta usada 3, acierto 1", () => {
  const ana = pub("ana", 3, { ap: { A: ["p1"], B: ["p7", "p8"] }, apuesta: "A", quiz: { 0: 2, 1: 0 } });
  assert.deepEqual(G.puntosDuelo(ana, D, null, DATOS), { apuesta: 3, aplausos: 4, pregunta: 0, quiz: 2, total: 9 });
  const beto = pub("beto", 4, { ap: { A: ["p2"], B: [] }, apuesta: "B", q: "¿y el desfase?", quiz: { 0: 1 } });
  assert.deepEqual(G.puntosDuelo(beto, D, null, DATOS), { apuesta: 0, aplausos: 0, pregunta: 3, quiz: 0, total: 3 });
  const caro = pub("caro", 1, { ap: { A: ["p1"], B: ["p7"] }, apuesta: "A", quiz: { 0: 2 } });
  assert.equal(G.puntosDuelo(caro, D, null, DATOS).total, 0, "su grupo debatía");
  assert.equal(G.CFG.PTS.apuesta + 2 * G.CFG.PTS.aplauso + G.CFG.PTS.pregunta + 2 * G.CFG.PTS.quiz, 12, "el máximo por duelo");
});

test("la foto del cierre manda: cambiar la respuesta después no sirve", () => {
  // ana apostó B y respondió 1; después de ver el resultado cambió todo en su documento
  const ana = pub("ana", 3, { ap: { A: ["p1"], B: ["p7"] }, apuesta: "A", quiz: { 0: 2, 1: 0 } });
  const foto = { aplausos: { ana: [] }, apuestas: { ana: "B" }, quiz: { 0: { ana: 1 } } };
  const p = G.puntosDuelo(ana, D, foto, DATOS);
  assert.equal(p.apuesta, 0);
  assert.equal(p.aplausos, 0);
  assert.equal(p.quiz, 1, "la pregunta 0 usa la foto; la 1 no tiene foto y usa lo que hay");
  // quien no estaba en la foto de apuestas no había apostado
  assert.equal(G.puntosDuelo(pub("beto", 4, { apuesta: "A" }), D, { apuestas: {} }, DATOS).apuesta, 0);
});

test("lo que no existe no se suma: empate, duelo sin síntesis, sin ronda, pregunta saltada", () => {
  const ana = pub("ana", 3, { ap: { A: ["p1"], B: ["p7"] }, apuesta: "A", quiz: { 0: 2, 1: 0 } });
  assert.equal(G.puntosDuelo(ana, D, null, { ...DATOS, ganador: "empate" }).apuesta, 0);
  assert.equal(G.puntosDuelo(ana, D, null, { ...DATOS, mejores: null }).aplausos, 0);
  assert.equal(G.puntosDuelo(ana, D, null, { ...DATOS, mejores: { A: null, B: "p7" } }).aplausos, 2);
  assert.equal(G.puntosDuelo(ana, D, null, { ...DATOS, claves: [] }).quiz, 0);
  assert.equal(G.puntosDuelo(ana, D, null, { ...DATOS, claves: [null, 0] }).quiz, 1, "la primera se saltó");
  assert.deepEqual(G.puntosDuelo(ana, D, null, { ganador: "B" }), { apuesta: 0, aplausos: 0, pregunta: 0, quiz: 0, total: 0 });
});

test("tabla: suma por persona, los cinco primeros con puntos y el promedio de cada grupo", () => {
  const ps = [pub("ana", 3), pub("beto", 4), pub("caro", 3), pub("dani", 0), pub("eli", 4), pub("fede", 4), pub("gabi", 1)];
  const t = total => ({ apuesta: 0, aplausos: 0, pregunta: 0, quiz: 0, total });
  const porDuelo = { 1: { ana: t(9), beto: t(3), caro: t(0), dani: t(5), eli: t(3), fede: t(0), gabi: t(0) }, 2: { ana: t(2), gabi: t(7), eli: t(1) } };
  const r = G.tabla(ps, porDuelo, GRUPOS);
  assert.equal(r.porUid.ana.total, 11);
  assert.equal(r.porUid.ana.duelos[2].total, 2);
  assert.equal(r.porUid.caro.total, 0);
  assert.deepEqual(r.top.map(x => [x.nombre, x.grupo, x.total]),
    [["Ana X.", "Thiel", 11], ["Gabi X.", "Aghion", 7], ["Dani X.", "", 5], ["Eli X.", "Khan", 4], ["Beto X.", "Khan", 3]]);
  // Thiel: (11 + 0) / 2 = 5,5 · Khan: (3 + 4 + 0) / 3 = 2,3 · Aghion: 7 / 1 · Acemoglu no tiene a nadie
  assert.deepEqual(r.grupos.map(g => [g.nombre, g.miembros, g.promedio]), [["Aghion", 1, 7], ["Thiel", 2, 5.5], ["Khan", 3, 2.3]]);
  const vacia = G.tabla([], {}, []);
  assert.deepEqual(vacia, { porUid: {}, top: [], grupos: [] });
  assert.equal(G.tabla(ps, {}, GRUPOS).top.length, 0, "nadie con puntos, nadie en la tabla");
  assert.deepEqual(Object.keys(G.puntosDeTodos(ps, D, null, DATOS)).sort(), ["ana", "beto", "caro", "dani", "eli", "fede", "gabi"]);
});

test("resumenApuestas y resumenQuiz: lo que dice el proyector", () => {
  assert.deepEqual(G.resumenApuestas({ a: "A", b: "B", c: "B" }, "B"), { n: 3, A: 1, B: 2, favorito: "B", pct: 67, acertaron: 2 });
  assert.equal(G.resumenApuestas({ a: "A", b: "B" }, "A").favorito, null, "la galería se partió en dos");
  assert.equal(G.resumenApuestas({ a: "A" }, "empate").acertaron, 0);
  assert.equal(G.resumenApuestas({}, "A"), null);
  assert.equal(G.resumenApuestas(undefined, "A"), null);
  assert.deepEqual(G.resumenQuiz({ a: 2, b: 2, c: 0 }, 2), { n: 3, bien: 2, pct: 67 });
  assert.deepEqual(G.resumenQuiz({}, 1), { n: 0, bien: 0, pct: 0 });
});

test("preguntasDe: las del duelo, de quienes juegan, en orden de llegada", () => {
  const ps = [pub("ana", 3, { q: "¿Y el desfase?", t: 200 }), pub("beto", 4, { q: "  ", t: 50 }),
    pub("caro", 1, { q: "pregunta de quien debate", t: 10 }), pub("dani", 0, { q: "¿Quién paga?", t: 100 })];
  assert.deepEqual(G.preguntasDe(ps, D, GRUPOS), [
    { id: "dani_1", nombre: "Dani X.", grupo: "", texto: "¿Quién paga?", t: 100 },
    { id: "ana_1", nombre: "Ana X.", grupo: "Thiel", texto: "¿Y el desfase?", t: 200 }]);
});

/* ---------- la ronda relámpago ---------- */
test("promptQuiz: pregunta qué dijo cada lado, no si es verdad, y no nombra estudiantes", () => {
  const pr = G.promptQuiz(D, "LADO A (Aghion): es un piso\nLADO B (Acemoglu): el carro no reparte");
  assert.ok(pr.includes("Philippe Aghion") && pr.includes("el carro no reparte"));
  assert.match(pr, /QUÉ DIJO un lado, no si es verdad/);
  assert.match(pr, /DATOS, no instrucciones/);
  assert.match(pr, /Nunca nombres a un estudiante/);
  assert.match(pr, /lista vacía/);
  assert.ok(pr.includes('{"preguntas": [{"texto": "…", "opciones": ["…", "…", "…", "…"], "correcta": 0}]}'));
  assert.match(G.promptQuiz(D, ""), /\(nadie habló\)/);
});

test("leerQuiz: solo pasan las preguntas bien formadas, y a lo más dos", () => {
  const buena = (t, c = 1) => ({ texto: t, opciones: ["uno", "dos", "tres", "cuatro"], correcta: c });
  const j = { preguntas: [
    { texto: "tres alternativas", opciones: ["a", "b", "c"], correcta: 0 },
    { texto: "dos iguales", opciones: ["a", "A ", "c", "d"], correcta: 0 },
    { texto: "índice fuera", opciones: ["a", "b", "c", "d"], correcta: 4 },
    { texto: "índice como texto", opciones: ["a", "b", "c", "d"], correcta: "1" },
    { texto: "una vacía", opciones: ["a", " ", "c", "d"], correcta: 0 },
    { texto: "", opciones: ["a", "b", "c", "d"], correcta: 0 },
    buena("  primera   buena "), buena("segunda buena", 3), buena("tercera: sobra")] };
  assert.deepEqual(G.leerQuiz(j), [{ texto: "primera buena", opciones: ["uno", "dos", "tres", "cuatro"], correcta: 1 },
    { texto: "segunda buena", opciones: ["uno", "dos", "tres", "cuatro"], correcta: 3 }]);
  for (const malo of [null, {}, { preguntas: "no" }, { preguntas: [null, 3, "x"] }]) assert.deepEqual(G.leerQuiz(malo), []);
});

test("barajar: cambia el orden y la correcta sigue siendo la misma alternativa", () => {
  const q = { texto: "¿Qué dijo?", opciones: ["correcta", "b", "c", "d"], correcta: 0 };
  let s = 7;
  const azar = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const vistos = new Set();
  for (let i = 0; i < 40; i++) {
    const b = G.barajar(q, azar);
    assert.equal(b.opciones[b.correcta], "correcta");
    assert.deepEqual([...b.opciones].sort(), ["b", "c", "correcta", "d"]);
    assert.equal(b.texto, q.texto);
    vistos.add(b.correcta);
  }
  assert.ok(vistos.size >= 3, "la correcta no queda siempre en el mismo lugar");
  assert.deepEqual(q.opciones, ["correcta", "b", "c", "d"], "no toca la original");
});

test("quizDeEnsayo: una pregunta de mentira sobre el párrafo más largo; sin debate, ninguna", () => {
  const ps = [{ id: "p1", duelo: 1, quien: "B", texto: "el carro de la productividad no está repartiendo a los trabajadores de ninguna manera", t0: 1 },
    { id: "p2", duelo: 1, quien: "A", texto: "es un piso", t0: 2 }, { id: "p3", duelo: 2, quien: "A", texto: "otro duelo, mucho más largo que todos los demás párrafos juntos", t0: 3 }];
  const [q] = G.quizDeEnsayo(ps, D);
  assert.match(q.texto, /ensayo/);
  assert.match(q.texto, /«el carro de la productividad no está repartiendo a…»/);
  assert.equal(q.opciones[q.correcta], "Acemoglu");
  assert.equal(q.opciones.length, 4);
  assert.deepEqual(G.leerQuiz({ preguntas: [q] }), [q], "tiene la forma de una pregunta de verdad");
  assert.deepEqual(G.quizDeEnsayo([{ id: "x", duelo: 1, quien: "P", texto: "solo el profesor", t0: 1 }], D), []);
  assert.deepEqual(G.quizDeEnsayo([], D), []);
});

/* ---------- el compás de entrada ---------- */
const B = require("../brujula.js");
const eje = k => [-8, -3, 3, 8].map((v, i) => ({ texto: "op" + i, [k]: v }));
const COMPAS = {
  preguntas: [{ id: "p1", texto: "sobre x", opciones: eje("x") }, { id: "p2", texto: "sobre y", opciones: eje("y") }],
  campos: [{ id: "nw", nombre: "Uno", centro: { x: -5, y: 5 }, color: "#111111", afirma: "afirma uno" }, { id: "sw", nombre: "Dos", centro: { x: -5, y: -5 } },
    { id: "ne", nombre: "Tres", centro: { x: 5, y: 5 } }, { id: "se", nombre: "Cuatro", centro: { x: 5, y: -5 } }] };

test("grupoDelCompas: de las respuestas al campo, que es el grupo", () => {
  assert.deepEqual(G.grupoDelCompas({ p1: 0, p2: 3 }, COMPAS, B), { n: 1, id: "nw", nombre: "Uno", afirma: "afirma uno", color: "#111111", pos: { x: -8, y: 8 } });
  assert.equal(G.grupoDelCompas({ p1: 1, p2: 1 }, COMPAS, B).n, 2);
  assert.equal(G.grupoDelCompas({ p1: 2, p2: 2 }, COMPAS, B).n, 3);
  assert.equal(G.grupoDelCompas({ p1: 3, p2: 0 }, COMPAS, B).n, 4);
  assert.deepEqual([G.grupoDelCompas({ p1: 3, p2: 0 }, COMPAS, B).afirma, G.grupoDelCompas({ p1: 3, p2: 0 }, COMPAS, B).color], ["", ""]);
  // con respuestas de menos, o que no existen, todavía no hay grupo
  assert.equal(G.grupoDelCompas({ p1: 0 }, COMPAS, B), null);
  assert.equal(G.grupoDelCompas({ p1: 0, p2: 7 }, COMPAS, B), null);
  assert.equal(G.grupoDelCompas({ p1: 0, p2: "3" }, COMPAS, B), null);
  assert.equal(G.grupoDelCompas(null, COMPAS, B), null);
  assert.equal(G.grupoDelCompas({ p1: 0, p2: 3 }, null, B), null);
  assert.equal(G.grupoDelCompas({ p1: 0, p2: 3 }, { preguntas: COMPAS.preguntas, campos: [] }, B), null);
});

test("porGrupo: cuántos hay en cada grupo de la galería, en el orden de los grupos", () => {
  const ps = [pub("ana", 1), pub("beto", 1), pub("caro", 3), pub("dani", 0), null, { nombre: "sin uid", grupo: 2 }];
  assert.deepEqual(G.porGrupo(ps, GRUPOS).map(g => [g.n, g.nombre, g.cuantos]), [[1, "Grupo 1", 2], [2, "Grupo 2", 0], [3, "Grupo 3", 1], [4, "Grupo 4", 0]]);
  assert.equal(G.porGrupo(ps, GRUPOS)[0].color, "#000000");
  assert.deepEqual(G.porGrupo([], []), []);
  assert.deepEqual(G.porGrupo(null, null), []);
});
