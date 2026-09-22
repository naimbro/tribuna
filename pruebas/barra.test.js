const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../barra.js");
const palabras = n => Array.from({ length: n }, (_, i) => "palabra" + i).join(" ");
const msg = (uid, texto) => ({ tipo: "alumno", uid, nombre: uid, texto });
const tres = [{ uid: "a", nombre: "Ana" }, { uid: "b", nombre: "Beto" }, { uid: "c", nombre: "Caro" }];

test("palabrasQueCuentan: menos de 3 no cuenta, tope 40, sin @menciones", () => {
  assert.equal(B.palabrasQueCuentan("sí, claro"), 0);
  assert.equal(B.palabrasQueCuentan("@Moderadora no sé"), 0);
  assert.equal(B.palabrasQueCuentan("la ley llega tarde"), 4);
  assert.equal(B.palabrasQueCuentan(palabras(90)), 40);
});

test("llenadoGrupo: una persona sola no pasa de 1/N", () => {
  const r = B.llenadoGrupo([msg("a", palabras(40)), msg("a", palabras(40) + " x"), msg("a", palabras(30) + " y z")], tres);
  assert.equal(r.personas.find(p => p.clave === "a").pct, 1);
  assert.ok(Math.abs(r.pct - 1 / 3) < 1e-9);
  assert.equal(r.todos, false);
});

test("llenadoGrupo: repetir el mismo texto no suma; quien no es del grupo no cuenta", () => {
  const r = B.llenadoGrupo([msg("a", palabras(30)), msg("a", palabras(30)), msg("z", palabras(40))], tres);
  assert.equal(r.personas.find(p => p.clave === "a").palabras, 30);
  assert.equal(r.personas.length, 3);
});

test("llenadoGrupo: todos escriben 60 → 100 % y «todos»", () => {
  const ms = tres.flatMap(p => [msg(p.uid, palabras(30)), msg(p.uid, palabras(30) + " fin")]);
  const r = B.llenadoGrupo(ms, tres);
  assert.equal(r.pct, 1);
  assert.equal(r.todos, true);
});

test("llenadoGrupo: sin uid se atribuye por nombre", () => {
  const r = B.llenadoGrupo([{ tipo: "alumno", nombre: "Ana", texto: palabras(10) }], [{ nombre: "Ana" }]);
  assert.equal(r.personas[0].palabras, 10);
});

test("colorBarra: umbrales", () => {
  assert.equal(B.colorBarra(0), "rojo");
  assert.equal(B.colorBarra(0.33), "rojo");
  assert.equal(B.colorBarra(0.34), "ambar");
  assert.equal(B.colorBarra(0.67), "verde");
  assert.equal(B.colorBarra(1), "lleno");
});

test("hitosNuevos: se disparan al cruzar, no al estar", () => {
  const vacio = B.llenadoGrupo([], tres);
  const medio = B.llenadoGrupo(tres.map(p => msg(p.uid, palabras(35))), tres);
  const lleno = B.llenadoGrupo(tres.flatMap(p => [msg(p.uid, palabras(30)), msg(p.uid, palabras(30) + " fin")]), tres);
  assert.deepEqual(B.hitosNuevos(null, lleno), [], "la primera lectura no celebra");
  assert.deepEqual(B.hitosNuevos(vacio, medio).map(h => h.tipo).sort(), ["mitad", "todos"]);
  assert.deepEqual(B.hitosNuevos(medio, lleno).map(h => h.tipo).sort(), ["lleno", "parte", "parte", "parte"]);
  assert.deepEqual(B.hitosNuevos(lleno, lleno), []);
});
