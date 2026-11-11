const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), vm = require("vm"), path = require("path");
const D = require("../duelo.js");
const { panelJueces } = require("../rotacion.js");
const { leerJuez, JUECES_DEFECTO } = require("../jueces.js");

// Los archivos de semana son scripts clásicos con const: se evalúan en un contexto y se leen.
function contenido(archivo) {
  const ctx = {};
  vm.createContext(ctx);
  const opc = ["PERSONAJES", "PREGUNTAS", "JUECES", "JUECES_COMUN"].map(k => `${k}: typeof ${k} === 'undefined' ? null : ${k}`).join(", ");
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", archivo), "utf8") + `\n;this.C = { SESION, CONCEPTOS, EQUIPOS, ${opc} };`, ctx);
  return ctx.C;
}
const C312 = contenido("contenido/semana312.js");
const sala = (extra = {}) => ({ ...D.salaNueva(C312, D.duelosDe(C312), 1000), ...extra });
const con = (s, cambios) => { assert.ok(cambios, "la transición devolvió null"); return { ...s, ...cambios }; };
const p = (duelo, quien, texto, t0) => ({ duelo, quien, texto, t0, t: t0 + 1000 });
const cinco = (a, b) => JUECES_DEFECTO.map((j, i) => D.fichaJuez(j, { A: a[i], B: b[i], fraseA: "fa" + i, fraseB: "fb" + i }));

/* ---------- los duelos de una clase ---------- */
test("duelosDe: clase con personajes, un duelo por pregunta con sus dos personajes", () => {
  const ds = D.duelosDe(C312);
  assert.equal(ds.length, 3);
  assert.equal(ds[0].n, 1);
  assert.equal(ds[0].pregunta, C312.PREGUNTAS[0].texto);
  assert.equal(ds[0].personajes, true);
  assert.equal(ds[0].A.corto, "Aghion");
  assert.equal(ds[0].A.nombre, "Philippe Aghion");
  assert.equal(ds[0].A.color, "#34d399");
  assert.equal(ds[0].B.id, "acemoglu");
  assert.equal(ds[2].B.corto, "Burry");
  assert.equal(ds[0].jugado, false);
  assert.equal(ds[0].ganador, null);
});

test("duelosDe: sin personajes, las preguntas pueden ser texto suelto; lados a favor y en contra", () => {
  const c = contenido("contenido/semana307.js");
  const ds = D.duelosDe(c);
  assert.equal(ds.length, c.PREGUNTAS.length);
  assert.equal(typeof ds[0].pregunta, "string");
  assert.ok(ds[0].pregunta.length > 20);
  assert.equal(ds[0].personajes, false);
  assert.equal(ds[0].A.nombre, "A favor");
  assert.equal(ds[0].B.nombre, "En contra");
  assert.equal(ds[0].A.color, c.EQUIPOS.A.color);
});

test("duelosDe: sin PREGUNTAS hay un solo debate sobre la moción; sin nada, ninguno", () => {
  const c = contenido("contenido/semana5.js");
  const ds = D.duelosDe(c);
  assert.equal(ds.length, 1);
  assert.equal(ds[0].pregunta, c.SESION.mocion);
  assert.equal(D.duelosDe({ SESION: {} }).length, 0);
  assert.equal(D.duelosDe({}).length, 0);
});

test("salaNueva: parte en espera, sin duelo ni turno", () => {
  const s = sala();
  assert.equal(s.modo, "micro");
  assert.equal(s.fase, "espera");
  assert.equal(s.semana, 312);
  assert.equal(s.curso, C312.SESION.curso);
  assert.equal(s.duelo, null);
  assert.equal(s.turno, null);
  assert.equal(s.creada, 1000);
  assert.equal(s.duelos.length, 3);
});

/* ---------- fases y turnos ---------- */
test("empezarDuelo: solo desde la espera, solo un duelo que existe y no se ha jugado", () => {
  const s = sala();
  const d = con(s, D.empezarDuelo(s, 2, 5000));
  assert.equal(d.fase, "debate");
  assert.equal(d.duelo, 2);
  assert.equal(d.turno, null);
  assert.equal(D.dueloDe(d).A.corto, "Thiel");
  assert.equal(D.empezarDuelo(s, 9, 5000), null);
  assert.equal(D.empezarDuelo(d, 1, 5000), null, "ya hay un duelo en curso");
  const jugado = sala({ duelos: s.duelos.map(x => x.n === 2 ? { ...x, jugado: true } : x) });
  assert.equal(D.empezarDuelo(jugado, 2, 5000), null);
});

test("darPalabra: cambia de lado sumando el tiempo; tocar el lado activo pausa", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.darPalabra(s, "A", 1000));
  assert.equal(s.turno, "A");
  assert.equal(s.t0turno, 1000);
  s = con(s, D.darPalabra(s, "B", 4000));
  assert.equal(s.turno, "B");
  assert.equal(s.tiempo.A, 3000);
  s = con(s, D.darPalabra(s, "B", 6000));
  assert.equal(s.turno, null, "tocar el activo es pausa");
  assert.equal(s.tiempo.B, 2000);
  s = con(s, D.darPalabra(s, "P", 7000));
  assert.equal(s.turno, "P");
  assert.equal(D.tiempos(s, 7500).P, 500, "el turno en curso cuenta en la barra");
  assert.equal(D.tiempos(s, 7500).A, 3000);
});

test("toques fuera de lugar: nada cambia y ningún tiempo queda negativo", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  assert.equal(D.darPalabra(s, "X", 10), null);
  assert.equal(D.darPalabra(sala(), "A", 10), null, "en la espera no hay palabra que dar");
  assert.equal(D.pausar(s, 10), null, "nadie tiene la palabra");
  s = con(s, D.darPalabra(s, "A", 5000));
  s = con(s, D.darPalabra(s, "B", 4000));               // el reloj del teléfono retrocedió
  assert.equal(s.tiempo.A, 0);
  // doble toque en el mismo milisegundo: palabra y pausa, sin tiempo
  s = con(s, D.darPalabra(s, "B", 4000));
  assert.equal(s.turno, null);
  assert.equal(s.tiempo.B, 0);
  const m = con(s, D.pedirVeredicto(s, 9000));
  assert.equal(D.darPalabra(m, "A", 9500), null, "durante el veredicto no se da la palabra");
  assert.equal(D.siguiente(m), null, "los jueces todavía deliberan");
  assert.equal(D.pedirVeredicto(m, 9600), null);
  assert.equal(D.empezarDuelo(m, 2, 9700), null);
});

test("salirDelDuelo guarda el tiempo en el duelo y empezarDuelo lo retoma", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.darPalabra(s, "A", 1000));
  s = con(s, D.salirDelDuelo(s, 3000));
  assert.equal(s.fase, "espera");
  assert.equal(s.duelo, null);
  assert.equal(s.duelos[0].tiempo.A, 2000);
  assert.equal(s.duelos[0].jugado, false);
  s = con(s, D.empezarDuelo(s, 1, 9000));
  assert.equal(s.tiempo.A, 2000);
  assert.equal(D.salirDelDuelo(sala(), 1), null);
});

test("pedirVeredicto cierra el turno y deja a los jueces deliberando; volverAlDebate lo deshace", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.darPalabra(s, "B", 1000));
  s = con(s, D.pedirVeredicto(s, 2500));
  assert.equal(s.fase, "manos");
  assert.equal(s.turno, null);
  assert.equal(s.tiempo.B, 1500);
  assert.equal(s.veredicto.estado, "deliberando");
  s = con(s, D.volverAlDebate(s));
  assert.equal(s.fase, "debate");
  assert.equal(s.veredicto, null);
  assert.equal(D.volverAlDebate(s), null);
});

test("recibirVeredicto: con tres o más jueces hay panel; con menos, sin quórum y se puede reintentar", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.pedirVeredicto(s, 100));
  const pocos = cinco([7, null, null, 6, null], [5, null, null, 6, null]);
  let q = con(s, D.recibirVeredicto(s, pocos, panelJueces(pocos), { disputa: "x", fraseA: "", fraseB: "" }));
  assert.equal(q.veredicto.estado, "sin_quorum");
  assert.equal(q.veredicto.panel, null);
  assert.equal(q.sintesis, null);
  assert.equal(D.siguiente(q), null);
  q = con(q, D.reintentar(q));
  assert.equal(q.veredicto.estado, "deliberando");
  assert.equal(D.reintentar(q), null);
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  const ok = con(q, D.recibirVeredicto(q, js, panelJueces(js), { disputa: "x", fraseA: "a", fraseB: "b" }));
  assert.equal(ok.veredicto.estado, "listo");
  assert.equal(ok.veredicto.panel.ganador, "A");
  assert.equal(ok.sintesis.disputa, "x");
  assert.equal(D.recibirVeredicto(ok, js, panelJueces(js), null), null, "un veredicto listo no se pisa");
  assert.equal(D.recibirVeredicto(sala(), js, panelJueces(js), null), null);
});

test("siguiente: revela juez por juez, anota el resultado, pasa por la síntesis y vuelve a la espera", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.darPalabra(s, "A", 0));
  s = con(s, D.pedirVeredicto(s, 60000));
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  s = con(s, D.recibirVeredicto(s, js, panelJueces(js), { disputa: "d", fraseA: "a", fraseB: "b" }));
  assert.deepEqual(D.etiquetaSiguiente(s), { texto: "Revelar: 🎓 La académica", listo: true });
  s = con(s, D.siguiente(s));
  assert.equal(s.fase, "jueces");
  assert.equal(s.paso, 1);
  assert.equal(D.etiquetaSiguiente(s).texto, "Revelar: ⚖ El jurista");
  for (let i = 0; i < 4; i++) s = con(s, D.siguiente(s));
  assert.equal(s.paso, 5);
  assert.equal(s.duelos[0].jugado, false, "el resultado todavía no se muestra");
  assert.equal(D.etiquetaSiguiente(s).texto, "Mostrar el resultado");
  s = con(s, D.siguiente(s));
  assert.equal(s.paso, 6);
  assert.equal(s.duelos[0].jugado, true);
  assert.equal(s.duelos[0].ganador, "A");
  assert.equal(s.duelos[0].totalA, 21);
  assert.equal(s.duelos[0].totalB, 18);
  assert.equal(s.duelos[0].tiempo.A, 60000);
  assert.equal(D.etiquetaSiguiente(s).texto, "Lo que quedó en disputa");
  s = con(s, D.siguiente(s));
  assert.equal(s.fase, "sintesis");
  assert.equal(D.etiquetaSiguiente(s).texto, "Volver a los duelos");
  s = con(s, D.siguiente(s));
  assert.equal(s.fase, "espera");
  assert.equal(s.duelo, null);
  assert.equal(s.veredicto, null);
  assert.equal(s.sintesis, null);
  assert.equal(D.siguiente(s), null);
});

test("siguiente: sin síntesis vuelve directo a la espera; totales iguales son empate", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 3, 0));
  s = con(s, D.pedirVeredicto(s, 10));
  const js = cinco([7, 7, 7, 7, 7], [7, 7, 7, 7, 7]);
  s = con(s, D.recibirVeredicto(s, js, panelJueces(js), null));
  for (let i = 0; i < 6; i++) s = con(s, D.siguiente(s));
  assert.equal(s.paso, 6);
  assert.equal(s.duelos[2].ganador, "empate");
  assert.equal(D.textoResultado(s.duelos[2]), "Empate, 21 a 21");
  assert.equal(D.textoResultado(s.duelos[0]), "", "un duelo sin jugar no tiene resultado");
  assert.equal(D.textoResultado({ ...s.duelos[0], jugado: true, ganador: "B", totalA: 18, totalB: 21.5 }), "Ganó Acemoglu, 21,5 a 18");
  assert.equal(D.etiquetaSiguiente(s).texto, "Volver a los duelos");
  s = con(s, D.siguiente(s));
  assert.equal(s.fase, "espera");
});

test("etiquetaSiguiente mientras se espera a los jueces", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  assert.deepEqual(D.etiquetaSiguiente(s), { texto: "", listo: false });
  s = con(s, D.pedirVeredicto(s, 10));
  assert.deepEqual(D.etiquetaSiguiente(s), { texto: "Los jueces deliberan…", listo: false });
  const pocos = cinco([null, null, null, null, 4], [null, null, null, null, 4]);
  s = con(s, D.recibirVeredicto(s, pocos, panelJueces(pocos), null));
  assert.equal(D.etiquetaSiguiente(s).listo, false);
});

test("cerrarClase y reabrirClase", () => {
  const s = sala();
  const f = con(s, D.cerrarClase(s));
  assert.equal(f.fase, "fin");
  assert.equal(D.cerrarClase(f), null);
  assert.equal(con(f, D.reabrirClase(f)).fase, "espera");
  assert.equal(D.reabrirClase(s), null);
});

/* ---------- párrafos y transcripción ---------- */
test("transcripcionDe: solo el duelo pedido, en orden, con rótulo de lado y sin párrafos vacíos", () => {
  const d = D.duelosDe(C312)[0];
  const ps = [p(1, "B", "  no más   de 0,66% ", 3000), p(1, "A", "es un piso", 1000), p(2, "A", "otro duelo", 1500),
    p(1, "P", "¿y el desfase?", 2000), p(1, "A", "   ", 4000)];
  assert.equal(D.transcripcionDe(ps, d),
    "LADO A (Aghion): es un piso\nPROFESOR: ¿y el desfase?\nLADO B (Acemoglu): no más de 0,66%");
  assert.equal(D.transcripcionDe([], d), "");
});

test("recortar: lo corto queda igual; lo largo conserva el comienzo y el final con una marca", () => {
  assert.equal(D.recortar("hola", 100), "hola");
  const largo = "A".repeat(20000) + "M".repeat(20000) + "Z".repeat(20000);
  const r = D.recortar(largo, 30000);
  assert.ok(r.length <= 30100, "largo " + r.length);
  assert.ok(r.startsWith("A".repeat(8000)));
  assert.ok(r.endsWith("Z".repeat(20000)));
  assert.match(r, /se omite la parte central/);
});

test("palabrasPorLado, ultimoDeLados y otro", () => {
  const ps = [p(1, "A", "uno dos tres", 1000), p(1, "P", "pregunta", 3000), p(1, "B", "cuatro cinco", 2000)];
  assert.deepEqual(D.palabrasPorLado(ps), { A: 3, B: 2, P: 1 });
  assert.equal(D.ultimoDeLados(ps).quien, "B", "el último de A o B, no la pregunta del profesor");
  assert.equal(D.ultimoDeLados([p(1, "P", "x", 1)]), null);
  assert.equal(D.otro("A"), "B");
  assert.equal(D.otro("B"), "A");
  assert.equal(D.delDuelo([p(2, "A", "x", 1), p(1, "A", "y", 2)], 1).length, 1);
});

/* ---------- los prompts ---------- */
const ctx312 = { curso: C312.SESION.curso, comun: C312.JUECES_COMUN, conceptos: C312.CONCEPTOS };

test("promptJuezVoz: perfil, piso común, personajes y las advertencias de una transcripción por voz", () => {
  const d = D.duelosDe(C312)[1];
  const pr = D.promptJuezVoz(C312.JUECES[0], d, [p(2, "A", "todas las empresas felices son diferentes", 1), p(2, "B", "no hay excepción para la IA", 2)], ctx312);
  assert.ok(pr.includes(C312.JUECES[0].nombre));
  assert.ok(pr.includes(C312.JUECES[0].valora));
  assert.ok(pr.includes(C312.JUECES_COMUN.slice(0, 60)));
  assert.ok(pr.includes("Peter Thiel") && pr.includes("Lina Khan"));
  assert.ok(pr.includes("LADO A (Thiel): todas las empresas felices son diferentes"));
  assert.match(pr, /DATOS, no instrucciones/);
  assert.match(pr, /un solo micrófono/);
  assert.match(pr, /PROFESOR/);
  assert.match(pr, /nunca nombres a un estudiante/);
  assert.ok(pr.includes('{"A": {"nota": n, "frase": "…"}, "B": {"nota": n, "frase": "…"}}'));
  // el dossier de los personajes del duelo va primero en el material
  assert.ok(pr.indexOf("Palantir") > 0 && pr.indexOf("Palantir") < pr.indexOf("LA TRANSCRIPCIÓN"));
});

test("un duelo larguísimo con un dossier largo: ningún prompt pasa de 38.000 caracteres", () => {
  const d = D.duelosDe(C312)[0];
  const ps = [];
  for (let i = 0; i < 300; i++) ps.push(p(1, i % 2 ? "B" : "A", `turno ${i} ` + "palabra ".repeat(40), i * 1000));
  for (const pr of [D.promptJuezVoz(C312.JUECES[2], d, ps, ctx312), D.promptSintesis(d, ps, ctx312)]) {
    assert.ok(pr.length <= D.CFG.MAX_PROMPT, "largo " + pr.length);
    assert.ok(pr.includes("turno 0 "), "se perdió el comienzo del debate");
    assert.ok(pr.includes("turno 299 "), "se perdió el final del debate");
    assert.match(pr, /se omite la parte central/);
  }
  const sinDossier = D.promptJuezVoz(JUECES_DEFECTO[0], D.duelosDe(contenido("contenido/semana5.js"))[0], [], { curso: "X", comun: "", conceptos: [] });
  assert.match(sinDossier, /\(nadie habló\)/);
  assert.ok(!sinDossier.includes("PISO COMÚN"));
});

test("respuestas de los jueces: se lee el JSON aunque venga envuelto; lo ilegible es abstención", () => {
  const juez = JUECES_DEFECTO[1];
  const bien = D.fichaJuez(juez, leerJuez(D.jsonEn('Claro:\n```json\n{"A": {"nota": 11, "frase": "sólido"}, "B": {"nota": "6.5", "frase": "evade"}}\n```')));
  assert.deepEqual(bien, { id: "jurista", nombre: "El jurista", emoji: "⚖", A: 10, B: 6.5, fraseA: "sólido", fraseB: "evade" });
  for (const malo of ["", "no puedo evaluar esto", "{nota: 7}", '{"A": {"nota": "siete"}, "B": {"nota": 5}}', '{"A": {"nota": 7}}']) {
    const f = D.fichaJuez(juez, leerJuez(D.jsonEn(malo)));
    assert.equal(f.A, null, malo);
    assert.equal(f.B, null, malo);
    assert.equal(f.fraseA, "");
  }
  assert.equal(D.jsonEn(null), null);
  // el panel no se rompe con abstenciones
  const mezcla = cinco([7, null, 8, null, 6], [5, null, 6, null, 7]);
  assert.equal(panelJueces(mezcla).ganador, "A");
});

test("juecesDeEnsayo: notas válidas de medio en medio punto; quien no habló recibe 0", () => {
  const js = D.juecesDeEnsayo(JUECES_DEFECTO, [p(1, "A", "palabra ".repeat(200), 1)]);
  assert.equal(js.length, 5);
  for (const j of js) {
    assert.equal(j.B, 0);
    assert.ok(j.A > 0 && j.A <= 10 && (j.A * 2) % 1 === 0, "nota " + j.A);
    assert.match(j.fraseA, /ensayo/);
  }
  assert.equal(panelJueces(js).ganador, "A");
});

/* ---------- sugerencias y síntesis ---------- */
test("sugerenciasDossier: las contradicciones ⚡ de los dos personajes del duelo, alternadas y sin repetir", () => {
  const d = D.duelosDe(C312)[1];
  const ss = D.sugerenciasDossier(C312.CONCEPTOS, d);
  assert.ok(ss.length >= 4);
  assert.ok(ss.every(s => s.origen === "dossier" && !s.texto.includes("⚡") && (s.para === "A" || s.para === "B")));
  assert.ok(ss.some(s => s.para === "A" && /Palantir/.test(s.texto)));
  assert.ok(ss.some(s => s.para === "A" && s.texto.startsWith("los monopolios son malos")), "«Thiel:» no se repite en el texto");
  assert.ok(ss.some(s => s.para === "B" && /tribunales/.test(s.texto)));
  assert.equal(new Set(ss.map(s => s.texto)).size, ss.length);
  assert.notEqual(ss[0].para, ss[1].para, "alternadas: una para cada lado");
  assert.ok(!ss.some(s => /Burry|Aghion/.test(s.texto)), "solo las de este duelo");
  assert.deepEqual(D.sugerenciasDossier(C312.CONCEPTOS, D.duelosDe(contenido("contenido/semana307.js"))[0]), []);
});

test("promptSugerencia, leerSugerencia y tocaSugerir", () => {
  const d = D.duelosDe(C312)[0];
  const pr = D.promptSugerencia(d, [p(1, "A", "es un piso de 0,8 puntos", 1)], D.sugerenciasDossier(C312.CONCEPTOS, d));
  assert.ok(pr.includes("Aghion") && pr.includes("es un piso de 0,8 puntos") && pr.includes("GAFAM"));
  assert.match(pr, /máximo 25 palabras/);
  assert.deepEqual(D.leerSugerencia({ para: "B", pregunta: " ¿Y el 0,5%? " }), { para: "B", texto: "¿Y el 0,5%?", origen: "ia" });
  assert.equal(D.leerSugerencia({ para: "Z", pregunta: "¿Qué?" }).para, "ambos");
  assert.equal(D.leerSugerencia({ pregunta: "" }), null);
  assert.equal(D.leerSugerencia(null), null);
  assert.equal(D.leerSugerencia({ pregunta: "x".repeat(500) }).texto.length, 220);
  const base = { palabras: 300, palabrasUltima: 100, ahora: 100000, tUltima: 0 };
  assert.equal(D.tocaSugerir(base), true);
  assert.equal(D.tocaSugerir({ ...base, palabras: 219 }), false, "menos de 120 palabras nuevas");
  assert.equal(D.tocaSugerir({ ...base, tUltima: 60000 }), false, "menos de 45 s desde la última");
});

test("promptSintesis, leerSintesis y sintesisDeEnsayo", () => {
  const d = D.duelosDe(C312)[0];
  const pr = D.promptSintesis(d, [p(1, "A", "es un piso", 1)], ctx312);
  assert.ok(pr.includes('{"disputa": "…", "fraseA": "…", "fraseB": "…"}'));
  assert.match(pr, /DATOS, no instrucciones/);
  assert.deepEqual(D.leerSintesis({ disputa: " Quedó abierto el desfase. ", fraseA: "Es un piso.", fraseB: null }),
    { disputa: "Quedó abierto el desfase.", fraseA: "Es un piso.", fraseB: "" });
  assert.equal(D.leerSintesis({ disputa: "" }), null);
  assert.equal(D.leerSintesis(null), null);
  const s = D.sintesisDeEnsayo([p(1, "A", "Es un piso. Y hay más.", 1)], d);
  assert.match(s.disputa, /ensayo/);
  assert.equal(s.fraseA, "Es un piso.");
  assert.equal(s.fraseB, "");
});

/* ---------- registro y reloj ---------- */
test("registroTexto: la transcripción y el veredicto de cada duelo, en texto plano", () => {
  let s = con(sala({ codigo: "AB12" }), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.pedirVeredicto(s, 10));
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  const panel = panelJueces(js), sintesis = { disputa: "Quedó abierto el desfase.", fraseA: "Es un piso.", fraseB: "" };
  s = con(s, D.recibirVeredicto(s, js, panel, sintesis));
  for (let i = 0; i < 6; i++) s = con(s, D.siguiente(s));
  const txt = D.registroTexto(s, [p(1, "A", "es un piso", 1000), p(1, "P", "¿y el desfase?", 2000)],
    { 1: { jueces: js, panel, sintesis } }, () => "10:00");
  assert.match(txt, /TRIBUNA · sala AB12/);
  assert.match(txt, /=== Duelo 1: La IA es una revolución/);
  assert.match(txt, /\[10:00\] Aghion: es un piso/);
  assert.match(txt, /\[10:00\] Profesor: ¿y el desfase\?/);
  assert.match(txt, /🎓 La académica: Aghion 7 «fa0» · Acemoglu 6 «fb0»/);
  assert.match(txt, /Total: Aghion 21 \/ 30 · Acemoglu 18 \/ 30 · Gana Aghion/);
  assert.match(txt, /Lo que quedó en disputa: Quedó abierto el desfase\./);
  assert.match(txt, /=== Duelo 2: .*\n\(no se jugó\)/);
});

test("fmtReloj", () => {
  assert.equal(D.fmtReloj(0), "0:00");
  assert.equal(D.fmtReloj(65400), "1:05");
  assert.equal(D.fmtReloj(-5), "0:00");
  assert.equal(D.fmtReloj(undefined), "0:00");
});
