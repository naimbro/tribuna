// Clase con personajes (semana 308): los grupos se llaman como un personaje, con cupo y duelos
// fijos. Sin personajes, todo se ve exactamente como antes («Grupo 3», «@Grupo 3», «(grupo 3)»).
const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../rotacion.js");
const { mencionaA, cargarApellidos } = require("../ritmo.js");
const { textoTribuna } = require("../publico.js");

const PS = R.numerarPersonajes([
  { id: "huang", nombre: "Jensen Huang", corto: "Huang", cargo: "Nvidia" },
  { id: "amodei", nombre: "Dario Amodei", corto: "Amodei", cargo: "Anthropic" },
  { id: "hawley", nombre: "Josh Hawley", corto: "Hawley", cargo: "Senado" },
  { id: "altman", nombre: "Sam Altman", corto: "Altman", cargo: "OpenAI" },
  { id: "sanders", nombre: "Bernie Sanders", corto: "Sanders", cargo: "Senado" },
  { id: "musk", nombre: "Elon Musk", corto: "Musk", cargo: "SpaceX, Tesla" }
]);

test("sin personajes, los rótulos son los de siempre, carácter por carácter", () => {
  for (const ps of [undefined, null, []]) {
    assert.equal(R.rotuloGrupo(3, ps), "Grupo 3");
    assert.equal(R.rotuloCorto(3, ps), "G3");
    assert.equal(R.mencionGrupo(3, ps), "@Grupo 3");
    assert.equal(R.conGrupo("Naim", 3, ps), "Naim (grupo 3)");
    assert.equal(R.conGrupo("Naim", 0, ps), "Naim");
    assert.deepEqual(R.aliasGrupo(3, ps), []);
  }
  assert.equal(R.conGrupo("Naim", 1), "Naim (grupo 1)");
  assert.equal(R.numerarPersonajes(undefined), null);
  assert.equal(R.numerarPersonajes([]), null);
});

test("con personajes, cada grupo se llama como su personaje", () => {
  assert.equal(R.rotuloGrupo(1, PS), "Jensen Huang");
  assert.equal(R.rotuloCorto(4, PS), "Altman");
  assert.equal(R.mencionGrupo(6, PS), "@Musk");
  assert.equal(R.conGrupo("Naim Bro", 2, PS), "Naim Bro (Amodei)");
  assert.deepEqual(R.aliasGrupo(1, PS), ["huang", "jensen huang"]);
  // un número fuera de la lista vuelve al rótulo de siempre
  assert.equal(R.rotuloGrupo(9, PS), "Grupo 9");
});

test("la mención del personaje llega a los integrantes de ese grupo", () => {
  cargarApellidos(["Ana Pérez", "Pablo Soto"]);
  assert.ok(mencionaA("@Huang, señor Huang, ¿qué le responde a Amodei?", "Ana Pérez", 1, R.aliasGrupo(1, PS)));
  assert.ok(mencionaA("@Jensen Huang: ¿dónde lo dijo?", "Ana Pérez", 1, R.aliasGrupo(1, PS)));
  assert.ok(!mencionaA("@Huang, ¿qué le responde a Amodei?", "Pablo Soto", 2, R.aliasGrupo(2, PS)));
  assert.ok(!mencionaA("@Huangs", "Ana Pérez", 1, R.aliasGrupo(1, PS)));
  // «@Grupo N» sigue sirviendo
  assert.ok(mencionaA("@Grupo 2, ¿y ustedes?", "Pablo Soto", 2, R.aliasGrupo(2, PS)));
  // sin alias, igual que antes
  assert.ok(mencionaA("@grupo 3 ¿qué opinan?", "Ana Pérez", 3));
});

test("la pregunta de la tribuna nombra al personaje de quien la hizo", () => {
  const p = { nombre: "Ana", grupo: 5, texto: "¿Quién paga?" };
  assert.equal(textoTribuna(p, "@Grupo 1"), "✋ La tribuna pregunta — Ana (grupo 5): «¿Quién paga?» @Grupo 1, ¿qué responden?");
  assert.equal(textoTribuna(p, "@Huang", PS), "✋ La tribuna pregunta — Ana (Sanders): «¿Quién paga?» @Huang, ¿qué responden?");
});

test("cupo: cuántos hay en cada personaje y cuáles están llenos", () => {
  const js = { a: { grupo: 1 }, b: { grupo: 1 }, c: { grupo: 2 }, d: { grupo: 0 }, e: {} };
  const c = R.conteoPersonajes(js, PS);
  assert.deepEqual(c, { 1: 2, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0 });
  assert.equal(R.personajeLleno(1, c, 2), true);
  assert.equal(R.personajeLleno(2, c, 2), false);
  assert.equal(R.todosLlenos(c, 1, PS), false);
  assert.equal(R.todosLlenos({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 }, 1, PS), true);
  assert.equal(R.cupoSugerido(24, 6), 4);
  assert.equal(R.cupoSugerido(25, 6), 5);
  assert.equal(R.cupoSugerido(0, 6), 1);
});

test("quien llega tarde entra al personaje con menos gente entre los que aún no debaten", () => {
  const conteo = { 1: 3, 2: 4, 3: 2, 4: 4, 5: 4, 6: 4 };
  // nadie ha debatido: el más chico
  assert.equal(R.personajeParaAtrasado(PS, conteo, []), 3);
  // Hawley (3) y Altman (4) ya debatieron: entre los que faltan, el más chico es Huang (1)
  const hechos = [{ n: 1, A: 3, B: 4, res: {} }];
  assert.equal(R.personajeParaAtrasado(PS, conteo, hechos), 1);
  // si todos debatieron, el más chico de todos
  const todos = [{ A: 1, B: 2 }, { A: 3, B: 4 }, { A: 5, B: 6 }];
  assert.equal(R.personajeParaAtrasado(PS, conteo, todos), 3);
  assert.equal(R.personajeParaAtrasado(null, conteo, []), null);
});

test("duelos fijos: la pregunta escrita trae su par y se traduce a números de grupo", () => {
  const PREG = [
    { texto: "Lo de Hugging Face fue un accidente de ingeniería, no una advertencia.", duelo: { A: "huang", B: "amodei" }, favor: "f1", contra: "c1" },
    { texto: "Hacen falta leyes nuevas para que las empresas de IA respondan por sus daños.", duelo: { A: "hawley", B: "altman" } }
  ];
  const p = R.proximaPreguntaEscrita(PREG, []);
  assert.deepEqual(p.duelo, { A: "huang", B: "amodei" });
  assert.equal(p.favor, "f1");
  assert.deepEqual(R.dueloEnGrupos(p.duelo, PS), { A: 1, B: 2 });
  assert.deepEqual(R.dueloEnGrupos({ A: "hawley", B: "nadie" }, PS), null);
  assert.equal(R.dueloEnGrupos(null, PS), null);
  const p2 = R.proximaPreguntaEscrita(PREG, [PREG[0].texto]);
  assert.deepEqual(R.dueloEnGrupos(p2.duelo, PS), { A: 3, B: 4 });
  assert.equal(R.proximaPreguntaEscrita(PREG, PREG.map(x => x.texto)), null);
  // las preguntas sin duelo (semanas 7, 307, 402) no traen el campo
  assert.equal("duelo" in R.proximaPreguntaEscrita([{ texto: "x", afirma: "a" }], []), false);
});

test("un duelo con un personaje sin nadie inscrito lo dice", () => {
  const conteo = { 1: 3, 2: 0, 3: 1, 4: 1, 5: 0, 6: 2 };
  assert.deepEqual(R.faltanEnDuelo({ A: 1, B: 2 }, conteo, PS), ["Dario Amodei"]);
  assert.deepEqual(R.faltanEnDuelo({ A: 3, B: 4 }, conteo, PS), []);
  assert.deepEqual(R.faltanEnDuelo({ A: 5, B: 2 }, conteo, PS), ["Bernie Sanders", "Dario Amodei"]);
});
