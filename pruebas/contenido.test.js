const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const B = require("../brujula.js");

// Los archivos de semana son scripts clásicos con const: se evalúan en un contexto y se leen.
function cargar(archivo) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", archivo), "utf8") + "\n;this.BRUJULA = typeof BRUJULA === 'undefined' ? null : BRUJULA;", ctx);
  return ctx.BRUJULA;
}

test("semana 7: brújula de 5 preguntas con opciones en los dos ejes y 4 campos", () => {
  const b = cargar("contenido/semana7.js");
  assert.ok(b, "semana7.js no define BRUJULA");
  assert.equal(b.preguntas.length, 5);
  for (const p of b.preguntas) {
    assert.ok(p.id && p.texto && p.opciones.length >= 2, p.id);
    for (const o of p.opciones) assert.ok(typeof o.x === "number" || typeof o.y === "number", `${p.id}: opción sin eje`);
  }
  const ejesUsados = new Set(b.preguntas.flatMap(p => p.opciones.flatMap(o => ["x", "y"].filter(k => typeof o[k] === "number"))));
  assert.deepEqual([...ejesUsados].sort(), ["x", "y"]);
  assert.equal(b.campos.length, 4);
  for (const c of b.campos) assert.ok(c.id && c.nombre && c.afirma && c.color && c.centro, c.id);
  // cada combinación extrema cae en un campo distinto
  const extremos = [0, 3].flatMap(i => [0, 3].map(j => Object.fromEntries(b.preguntas.map(p => [p.id, typeof p.opciones[0].x === "number" ? i : j]))));
  assert.equal(new Set(extremos.map(r => B.campoDe(B.posicion(r, b.preguntas), b.campos))).size, 4);
});

test("semana 5: sin brújula, el juego queda con la elección a mano", () => {
  assert.equal(cargar("contenido/semana5.js"), null);
});
