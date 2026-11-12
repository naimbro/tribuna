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
  const opc = ["PERSONAJES", "PREGUNTAS", "JUECES", "JUECES_COMUN", "BRUJULA"].map(k => `${k}: typeof ${k} === 'undefined' ? null : ${k}`).join(", ");
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", archivo), "utf8") + `\n;this.C = { SESION, CONCEPTOS, EQUIPOS, ${opc} };`, ctx);
  return ctx.C;
}
const C312 = contenido("contenido/semana312.js");
const sala = (extra = {}) => ({ ...D.salaNueva(C312, D.duelosDe(C312), 1000), ...extra });
const con = (s, cambios) => { assert.ok(cambios, "la transición devolvió null"); return { ...s, ...cambios }; };
const p = (duelo, quien, texto, t0) => ({ duelo, quien, texto, t0, t: t0 + 1000 });
const cinco = (a, b) => JUECES_DEFECTO.map((j, i) => D.fichaJuez(j, { A: a[i], B: b[i], fraseA: "fa" + i, fraseB: "fb" + i }));
// lo que el teléfono del profesor guarda aparte hasta revelarlo
const secreto = (js, sintesis = null, quiz = []) => ({ jueces: js, panel: panelJueces(js), sintesis, quiz });

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

test("recibirVeredicto: en la sala solo queda el estado; con menos de tres jueces no hay quórum y se reintenta", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.pedirVeredicto(s, 100));
  assert.deepEqual(s.veredicto, { estado: "deliberando" });
  const pocos = cinco([7, null, null, 6, null], [5, null, null, 6, null]);
  let q = con(s, D.recibirVeredicto(s, pocos));
  assert.deepEqual(q.veredicto, { estado: "sin_quorum" });
  assert.equal(D.siguiente(q, secreto(pocos)), null);
  q = con(q, D.reintentar(q));
  assert.equal(q.veredicto.estado, "deliberando");
  assert.equal(D.reintentar(q), null);
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  const ok = con(q, D.recibirVeredicto(q, js));
  assert.deepEqual(ok.veredicto, { estado: "listo" }, "ni las notas ni el ganador están en la sala todavía");
  assert.equal(ok.sintesis, null);
  assert.equal(D.recibirVeredicto(ok, js), null, "un veredicto listo no se pisa");
  assert.equal(D.recibirVeredicto(sala(), js), null);
});

test("siguiente: sin ronda, el primer toque trae el veredicto a la sala y revela juez por juez hasta la espera", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.darPalabra(s, "A", 0));
  s = con(s, D.pedirVeredicto(s, 60000));
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  const x = secreto(js, { disputa: "d", fraseA: "a", fraseB: "b", mejorA: "p1", mejorB: null });
  s = con(s, D.recibirVeredicto(s, js));
  assert.deepEqual(D.etiquetaSiguiente(s, x), { texto: "Revelar: 🎓 La académica", listo: true });
  s = con(s, D.siguiente(s, x));
  assert.equal(s.fase, "jueces");
  assert.equal(s.paso, 1);
  assert.equal(s.veredicto.jueces.length, 5, "ahora sí el veredicto está en la sala");
  assert.equal(s.veredicto.panel.ganador, "A");
  assert.equal(s.sintesis.mejorA, "p1");
  assert.equal(s.quiz, null);
  assert.equal(D.etiquetaSiguiente(s, x).texto, "Revelar: ⚖ El jurista");
  for (let i = 0; i < 4; i++) s = con(s, D.siguiente(s, x));
  assert.equal(s.paso, 5);
  assert.equal(s.duelos[0].jugado, false, "el resultado todavía no se muestra");
  assert.equal(D.etiquetaSiguiente(s, x).texto, "Mostrar el resultado");
  s = con(s, D.siguiente(s, x));
  assert.equal(s.paso, 6);
  assert.equal(s.duelos[0].jugado, true);
  assert.equal(s.duelos[0].ganador, "A");
  assert.equal(s.duelos[0].totalA, 21);
  assert.equal(s.duelos[0].totalB, 18);
  assert.equal(s.duelos[0].tiempo.A, 60000);
  assert.equal(D.etiquetaSiguiente(s, x).texto, "Lo que quedó en disputa");
  s = con(s, D.siguiente(s));                            // desde los jueces ya no hace falta el secreto
  assert.equal(s.fase, "sintesis");
  assert.equal(D.etiquetaSiguiente(s).texto, "Volver a los duelos");
  s = con(s, D.siguiente(s));
  assert.equal(s.fase, "espera");
  assert.equal(s.duelo, null);
  assert.equal(s.veredicto, null);
  assert.equal(s.sintesis, null);
  assert.equal(s.quiz, null);
  assert.equal(D.siguiente(s, x), null);
});

test("siguiente: sin síntesis vuelve directo a la espera; totales iguales son empate", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 3, 0));
  s = con(s, D.pedirVeredicto(s, 10));
  const js = cinco([7, 7, 7, 7, 7], [7, 7, 7, 7, 7]), x = secreto(js);
  s = con(s, D.recibirVeredicto(s, js));
  for (let i = 0; i < 6; i++) s = con(s, D.siguiente(s, x));
  assert.equal(s.paso, 6);
  assert.equal(s.duelos[2].ganador, "empate");
  assert.equal(D.textoResultado(s.duelos[2]), "Empate, 21 a 21");
  assert.equal(D.textoResultado(s.duelos[0]), "", "un duelo sin jugar no tiene resultado");
  assert.equal(D.textoResultado({ ...s.duelos[0], jugado: true, ganador: "B", totalA: 18, totalB: 21.5 }), "Ganó Acemoglu, 21,5 a 18");
  assert.equal(D.etiquetaSiguiente(s, x).texto, "Volver a los duelos");
  s = con(s, D.siguiente(s, x));
  assert.equal(s.fase, "espera");
});

test("etiquetaSiguiente mientras se espera a los jueces, y sin el veredicto cargado", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  assert.deepEqual(D.etiquetaSiguiente(s), { texto: "", listo: false });
  s = con(s, D.pedirVeredicto(s, 10));
  assert.deepEqual(D.etiquetaSiguiente(s), { texto: "Los jueces deliberan…", listo: false });
  const pocos = cinco([null, null, null, null, 4], [null, null, null, null, 4]);
  assert.equal(D.etiquetaSiguiente(con(s, D.recibirVeredicto(s, pocos)), secreto(pocos)).listo, false);
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  s = con(s, D.recibirVeredicto(s, js));
  // el teléfono se recargó y todavía no recupera lo guardado: «Siguiente» no hace ni revela nada
  assert.deepEqual(D.etiquetaSiguiente(s), { texto: "Recuperando el veredicto…", listo: false });
  assert.equal(D.siguiente(s), null);
  assert.equal(D.siguiente(s, {}), null);
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
  // la frase no se corta a media palabra
  const larga = "Acemoglu repite su 0,66 sin distinguir tareas fáciles de difíciles ni productividad total de laboral, y queda contaminado por una línea ajena";
  const crudo = { A: { nota: 7, frase: larga }, B: { nota: 6, frase: "palabra ".repeat(40) } };
  assert.equal(leerJuez(crudo).fraseA.length, 120, "leerJuez sí la corta");
  const entera = D.conFrases(leerJuez(crudo), crudo);
  assert.equal(entera.fraseA, larga);
  assert.equal(entera.A, 7);
  assert.ok(entera.fraseB.length <= 171 && entera.fraseB.endsWith("palabra…"), entera.fraseB);
  assert.equal(D.conFrases(null, crudo), null);
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

test("promptSintesis, leerSintesis, conMejores y sintesisDeEnsayo", () => {
  const d = D.duelosDe(C312)[0];
  const ps = [{ id: "x1", ...p(1, "A", "es un piso", 1) }, { id: "x2", ...p(1, "B", "el carro no reparte", 2) }];
  const pr = D.promptSintesis(d, ps, ctx312);
  assert.ok(pr.includes('{"disputa": "…", "fraseA": "…", "fraseB": "…", "mejorA": n, "mejorB": n}'));
  assert.ok(pr.includes("[1] LADO A (Aghion): es un piso\n[2] LADO B (Acemoglu): el carro no reparte"), "los párrafos van numerados");
  assert.match(pr, /DATOS, no instrucciones/);
  assert.ok(!D.promptJuezVoz(C312.JUECES[0], d, ps, ctx312).includes("[1] LADO"), "a los jueces no se les numera");
  assert.deepEqual(D.leerSintesis({ disputa: " Quedó abierto el desfase. ", fraseA: "Es un piso.", fraseB: null, mejorA: 1, mejorB: "2" }),
    { disputa: "Quedó abierto el desfase.", fraseA: "Es un piso.", fraseB: "", mejorA: 1, mejorB: null });
  assert.equal(D.leerSintesis({ disputa: "" }), null);
  assert.equal(D.leerSintesis(null), null);
  // del número de párrafo a su id; un número que apunta al otro lado, o a ninguno, no vale
  const base = { disputa: "x", fraseA: "", fraseB: "" };
  assert.deepEqual(D.conMejores({ ...base, mejorA: 1, mejorB: 2 }, ps, d), { ...base, mejorA: "x1", mejorB: "x2" });
  assert.deepEqual(D.conMejores({ ...base, mejorA: 2, mejorB: 9 }, ps, d), { ...base, mejorA: null, mejorB: null });
  assert.equal(D.conMejores(null, ps, d), null);
  const s = D.sintesisDeEnsayo([...ps, { id: "x3", ...p(1, "A", "Es un piso. Y hay más, mucho más.", 3) }], d);
  assert.match(s.disputa, /ensayo/);
  assert.equal(s.fraseA, "Es un piso.");
  assert.equal(s.mejorA, 3);
  assert.equal(s.mejorB, 2);
  assert.equal(D.sintesisDeEnsayo([], d).mejorA, null);
});

/* ---------- registro y reloj ---------- */
test("registroTexto: la transcripción, el veredicto, la ronda y la tabla de la galería, en texto plano", () => {
  let s = con(sala({ codigo: "AB12" }), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.pedirVeredicto(s, 10));
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  const sintesis = { disputa: "Quedó abierto el desfase.", fraseA: "Es un piso.", fraseB: "", mejorA: null, mejorB: null };
  const quiz = [{ texto: "¿Qué dijo Aghion?", opciones: ["que es un piso", "b", "c", "d"], correcta: 0 }, null];
  const x = secreto(js, sintesis);
  s = con(s, D.recibirVeredicto(s, js));
  for (let i = 0; i < 6; i++) s = con(s, D.siguiente(s, x));
  const galeria = { top: [{ nombre: "Antonia R.", grupo: "Khan", total: 11 }, { nombre: "Dani X.", grupo: "", total: 5 }],
    grupos: [{ n: 4, nombre: "Khan", miembros: 3, promedio: 5.5 }] };
  const txt = D.registroTexto(s, [p(1, "A", "es un piso", 1000), p(1, "P", "¿y el desfase?", 2000)],
    { 1: { ...x, quiz } }, () => "10:00", galeria);
  assert.match(txt, /TRIBUNA · sala AB12/);
  assert.match(txt, /=== Duelo 1: La IA es una revolución/);
  assert.match(txt, /\[10:00\] Aghion: es un piso/);
  assert.match(txt, /\[10:00\] Profesor: ¿y el desfase\?/);
  assert.match(txt, /🎓 La académica: Aghion 7 «fa0» · Acemoglu 6 «fb0»/);
  assert.match(txt, /Total: Aghion 21 \/ 30 · Acemoglu 18 \/ 30 · Gana Aghion/);
  assert.match(txt, /Ronda relámpago: ¿Qué dijo Aghion\? Respuesta: que es un piso/);
  assert.match(txt, /Lo que quedó en disputa: Quedó abierto el desfase\./);
  assert.match(txt, /=== Duelo 2: .*\n\(no se jugó\)/);
  assert.match(txt, /=== La galería ===\n1\. Antonia R\. \(Khan\): 11\n2\. Dani X\.: 5/);
  assert.match(txt, /Por grupo \(promedio\):\nKhan: 5,5 \(3\)/);
  assert.ok(!D.registroTexto(s, [], {}, () => "10:00").includes("La galería"), "sin galería no hay sección");
});

test("fmtReloj", () => {
  assert.equal(D.fmtReloj(0), "0:00");
  assert.equal(D.fmtReloj(65400), "1:05");
  assert.equal(D.fmtReloj(-5), "0:00");
  assert.equal(D.fmtReloj(undefined), "0:00");
});

/* ---------- la galería: grupos, ronda relámpago y preguntas del público ---------- */
test("cada lado sabe qué grupo lo encarna, y la sala trae la lista de grupos", () => {
  const ds = D.duelosDe(C312);
  assert.deepEqual([ds[0].A.g, ds[0].B.g, ds[1].A.g, ds[2].B.g], [1, 2, 3, 6]);
  const s = sala();
  assert.equal(s.grupos.length, 6);
  assert.deepEqual({ ...s.grupos[3] }, { n: 4, nombre: "Lina Khan", corto: "Khan", color: "#a78bfa" });
  assert.equal(s.quiz, null);
  assert.deepEqual(s.usadas, []);
  assert.ok(!("personajes" in s), "ese campo activa otras reglas de Firestore");
  const c307 = contenido("contenido/semana307.js");
  assert.equal(D.duelosDe(c307)[0].A.g, 0);
  assert.deepEqual(D.gruposDe(c307), []);
  assert.deepEqual(D.gruposDe({}), []);
});

const Q0 = { texto: "¿Qué dijo Aghion del piso?", opciones: ["a", "b", "c", "d"], correcta: 2 };
const Q1 = { texto: "¿Qué respondió Acemoglu?", opciones: ["e", "f", "g", "h"], correcta: 0 };

test("la ronda relámpago: se lanza, se revela, sigue la otra pregunta y recién después los jueces", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.pedirVeredicto(s, 10));
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]), x = secreto(js, null, [Q0, Q1]);
  s = con(s, D.recibirVeredicto(s, js));
  assert.deepEqual(D.etiquetaSiguiente(s, x), { texto: "Lanzar: ¿Qué dijo Aghion del piso?", listo: true, pregunta: 0 });
  s = con(s, D.siguiente(s, x));
  assert.equal(s.fase, "quiz");
  assert.deepEqual(s.quiz, { i: 0, numero: 1, total: 2, estado: "abierta", texto: Q0.texto, opciones: ["a", "b", "c", "d"], correcta: null });
  assert.deepEqual(s.veredicto, { estado: "listo" }, "el veredicto sigue fuera de la sala");
  assert.deepEqual(D.etiquetaSiguiente(s, x), { texto: "Mostrar la respuesta", listo: true });
  assert.equal(D.siguiente(s), null, "sin el veredicto cargado no se revela nada");
  assert.equal(D.etiquetaSiguiente(s).listo, false);
  s = con(s, D.siguiente(s, x));
  assert.equal(s.quiz.estado, "revelada");
  assert.equal(s.quiz.correcta, 2);
  assert.deepEqual(D.etiquetaSiguiente(s, x), { texto: "Lanzar: ¿Qué respondió Acemoglu?", listo: true, pregunta: 1 });
  s = con(s, D.siguiente(s, x));
  assert.deepEqual([s.quiz.i, s.quiz.numero, s.quiz.estado, s.quiz.correcta], [1, 2, "abierta", null]);
  s = con(s, D.siguiente(s, x));
  assert.equal(s.quiz.correcta, 0);
  assert.equal(D.etiquetaSiguiente(s, x).texto, "Revelar: 🎓 La académica");
  s = con(s, D.siguiente(s, x));
  assert.equal(s.fase, "jueces");
  assert.equal(s.paso, 1);
  assert.equal(s.quiz, null);
  assert.equal(s.veredicto.jueces.length, 5);
  assert.equal(D.volverAlDebate(s), null, "de la ronda en adelante no se vuelve al debate");
});

test("una pregunta saltada (null) no se lanza: sigue la otra, o los jueces", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.pedirVeredicto(s, 10));
  const js = cinco([7, 8, 6, 9, 5], [6, 6, 6, 6, 6]);
  s = con(s, D.recibirVeredicto(s, js));
  const una = secreto(js, null, [null, Q1]);
  assert.deepEqual(D.etiquetaSiguiente(s, una), { texto: "Lanzar: ¿Qué respondió Acemoglu?", listo: true, pregunta: 1 });
  const q = con(s, D.siguiente(s, una));
  assert.deepEqual([q.quiz.i, q.quiz.numero, q.quiz.total], [1, 1, 1]);
  const ninguna = secreto(js, null, [null, null]);
  assert.deepEqual(D.etiquetaSiguiente(s, ninguna), { texto: "Revelar: 🎓 La académica", listo: true });
  assert.equal(con(s, D.siguiente(s, ninguna)).fase, "jueces");
  // se salta la segunda después de revelar la primera
  let r = con(s, D.siguiente(s, secreto(js, null, [Q0, Q1])));
  r = con(r, D.siguiente(r, secreto(js, null, [Q0, Q1])));
  assert.equal(r.quiz.estado, "revelada");
  assert.equal(con(r, D.siguiente(r, secreto(js, null, [Q0, null]))).fase, "jueces");
  // volver al debate desde la apuesta limpia todo
  const v = con(s, D.volverAlDebate(s));
  assert.equal(v.quiz, null);
  assert.equal(v.veredicto, null);
});

test("usarPregunta: anota una sola vez la pregunta de la galería que el profesor usó", () => {
  let s = con(sala(), D.empezarDuelo(sala(), 1, 0));
  s = con(s, D.usarPregunta(s, "ana_1"));
  assert.deepEqual(s.usadas, ["ana_1"]);
  assert.equal(D.usarPregunta(s, "ana_1"), null);
  assert.equal(D.usarPregunta(s, ""), null);
  assert.equal(D.usarPregunta(sala(), "ana_1"), null, "solo durante el debate");
});

/* ---------- el compás: los campos de la brújula como grupos de la galería ---------- */
const C14 = contenido("contenido/semana14.js");
test("compás: con SESION.compas los campos de la brújula son los grupos de la galería", () => {
  const gs = D.gruposDe(C14);
  // (Array.from: la lista viene del contexto en que se evaluó el archivo de la semana)
  assert.deepEqual(Array.from(gs, g => g.nombre), ["Avatar ya", "Asesor, no votante", "Agentes que deliberan", "Urna y asamblea"]);
  assert.deepEqual({ ...gs[0] }, { n: 1, nombre: "Avatar ya", corto: "Avatar ya", color: "#38bdf8" });
  // sin el interruptor, o sin brújula, la clase no tiene grupos
  assert.deepEqual(D.gruposDe({ ...C14, SESION: { ...C14.SESION, compas: false } }), []);
  assert.deepEqual(D.gruposDe({ ...C14, BRUJULA: null }), []);
  // una clase con personajes sigue con sus personajes
  assert.equal(D.gruposDe({ ...C312, SESION: { ...C312.SESION, compas: true }, BRUJULA: C14.BRUJULA }).length, 6);
});

test("compás: va a favor el campo que afirma la pregunta y en contra su opuesto en el mapa", () => {
  const ds = D.duelosDe(C14);
  assert.equal(ds.length, 2);
  assert.deepEqual([ds[0].A.g, ds[0].B.g, ds[1].A.g, ds[1].B.g], [1, 4, 3, 2]);
  assert.deepEqual([ds[0].A.nombre, ds[0].A.corto, ds[0].A.cargo], ["A favor", "A favor", "Avatar ya"]);
  assert.deepEqual([ds[0].B.nombre, ds[0].B.corto, ds[0].B.cargo], ["En contra", "En contra", "Urna y asamblea"]);
  assert.deepEqual([ds[1].A.cargo, ds[1].B.cargo], ["Agentes que deliberan", "Asesor, no votante"]);
  // cada lado lleva el color de su campo
  assert.deepEqual([ds[0].A.color, ds[0].B.color, ds[1].A.color, ds[1].B.color], ["#38bdf8", "#fb7185", "#f59e0b", "#34d399"]);
  assert.equal(ds[0].personajes, false);
  // una pregunta suelta, o con un campo que no existe, queda sin grupos: toda la galería juega
  const sueltas = D.duelosDe({ ...C14, PREGUNTAS: ["Una pregunta suelta sobre los avatares.", { texto: "Otra pregunta, con un campo inventado.", afirma: "nada" }] });
  assert.deepEqual(sueltas.map(d => [d.A.g, d.B.g, d.A.cargo, d.A.color]), [[0, 0, "", C14.EQUIPOS.A.color], [0, 0, "", C14.EQUIPOS.A.color]]);
  // sin el interruptor, como antes
  const sin = D.duelosDe({ ...C14, SESION: { ...C14.SESION, compas: false } });
  assert.deepEqual([sin[0].A.g, sin[0].B.g, sin[0].A.cargo], [0, 0, ""]);
});

test("compás: la sala lleva las preguntas y los campos, para que la butaca no necesite el archivo de la clase", () => {
  const s = D.salaNueva(C14, D.duelosDe(C14), 1000);
  assert.equal(s.grupos.length, 4);
  assert.equal(s.compas.preguntas.length, 6);
  assert.deepEqual(Object.keys(s.compas.preguntas[0]).sort(), ["id", "opciones", "texto"]);
  assert.deepEqual(s.compas.preguntas[0].opciones[0], { texto: C14.BRUJULA.preguntas[0].opciones[0].texto, x: -8 });
  assert.deepEqual(s.compas.preguntas[1].opciones[3], { texto: C14.BRUJULA.preguntas[1].opciones[3].texto, y: 8 });
  assert.deepEqual(s.compas.campos.map(c => c.id), ["avatar_ya", "asesor", "agentes", "urna"]);
  assert.ok(s.compas.campos.every(c => c.nombre && c.afirma && /^#[0-9a-f]{6}$/i.test(c.color) && typeof c.centro.x === "number" && typeof c.centro.y === "number"));
  assert.ok(!("brujula" in s), "ese campo activa las reglas de la brújula del juego clásico");
  assert.ok(JSON.stringify(s).length < 12000, "la sala tiene que seguir siendo un documento chico");
  // una clase sin compás no lo lleva
  assert.equal(sala().compas, null);
  assert.equal(D.salaNueva({ ...C14, SESION: { ...C14.SESION, compas: false } }, [], 1).compas, null);
});
