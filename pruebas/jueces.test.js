const test = require("node:test");
const assert = require("node:assert/strict");
const J = require("../jueces.js");

test("hay cinco jueces con id, nombre, emoji y perfil", () => {
  assert.equal(J.JUECES_DEFECTO.length, 5);
  for (const j of J.JUECES_DEFECTO) for (const k of ["id", "nombre", "emoji", "valora", "molesta"]) assert.ok(j[k], `${j.id} sin ${k}`);
});

test("notaJuez: acota a 0–10 y redondea a medio punto", () => {
  assert.equal(J.notaJuez(7.3), 7.5);
  assert.equal(J.notaJuez(12), 10);
  assert.equal(J.notaJuez(-1), 0);
  assert.equal(J.notaJuez("6"), 6);
  assert.equal(J.notaJuez("abc"), null);
  assert.equal(J.notaJuez(undefined), null);
});

test("leerJuez: exige las dos notas y recorta las frases", () => {
  const r = J.leerJuez({ A: { nota: 8, frase: "Buena atribución." }, B: { nota: 5, frase: "x".repeat(300) } });
  assert.deepEqual([r.A, r.B, r.fraseA], [8, 5, "Buena atribución."]);
  assert.ok(r.fraseB.length <= 120);
  assert.equal(J.leerJuez({ A: { nota: 8 } }), null);
});

test("juecesSimulados: deterministas, en rango, y 0 para quien no escribió", () => {
  const d = { n: 2, pregunta: "p", A: 1, B: 2 };
  const ev = t => 12;                               // el lector heurístico da 12/20
  const a = J.juecesSimulados(d, { A: "texto", B: "" }, ev, J.JUECES_DEFECTO);
  const b = J.juecesSimulados(d, { A: "texto", B: "" }, ev, J.JUECES_DEFECTO);
  assert.deepEqual(a.map(x => x.A), b.map(x => x.A));
  for (const j of a) { assert.ok(j.A >= 5 && j.A <= 7); assert.equal(j.B, 0); assert.equal(j.simulado, true); }
});
