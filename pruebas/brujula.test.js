const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../brujula.js");

const preguntas = [
  { id: "p1", opciones: [{ x: -8 }, { x: -4 }, { x: 4 }, { x: 8 }] },
  { id: "p2", opciones: [{ y: -7 }, { y: -3 }, { y: 3 }, { y: 7 }] },
  { id: "p3", opciones: [{ x: -8 }, { x: -4 }, { x: 4 }, { x: 8 }] }
];
const campos = [
  { id: "ley", centro: { x: -6, y: 5 } }, { id: "adentro", centro: { x: -6, y: -5 } },
  { id: "guard", centro: { x: 6, y: 5 } }, { id: "nada", centro: { x: 6, y: -5 } }
];

test("posicion: promedia por eje solo las opciones que puntúan en ese eje", () => {
  assert.deepEqual(B.posicion({ p1: 0, p2: 3, p3: 1 }, preguntas), { x: -6, y: 7 });
  assert.deepEqual(B.posicion({ p1: 3 }, preguntas), { x: 8, y: 0 });
  assert.equal(B.posicion({}, preguntas), null);
});

test("campoDe: el centro más cercano; empate, el primero", () => {
  assert.equal(B.campoDe({ x: -5, y: 6 }, campos), "ley");
  assert.equal(B.campoDe({ x: 0, y: 0 }, campos), "ley");
});

const al = (uid, campo, x, y) => ({ uid, campo, pos: { x, y } });

test("formarGrupos: un campo grande se reparte parejo en grupos de hasta 5", () => {
  const xs = Array.from({ length: 11 }, (_, i) => al("u" + i, "ley", -6 + i * 0.1, 5));
  const { grupos } = B.formarGrupos(xs, campos);
  assert.deepEqual(grupos.map(g => g.miembros.length).sort(), [3, 4, 4]);
  assert.ok(grupos.every(g => g.campo === "ley"));
});

test("formarGrupos: un campo de 1 o 2 se reparte al grupo más cercano", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "ley", -6, 6), al("c", "ley", -5, 5),
              al("d", "nada", 6, -5), al("e", "nada", 6, -6), al("f", "nada", 5, -5),
              al("g", "adentro", -6, -4)];
  const { grupos, de } = B.formarGrupos(xs, campos);
  assert.equal(grupos.length, 2);
  assert.equal(grupos.find(g => g.n === de.g).campo, "ley");     // (−6,−4) está más cerca de «ley» que de «nada»
});

test("formarGrupos: un solo campo igual forma dos grupos para poder debatir", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "ley", -5, 5), al("c", "ley", -6, 6), al("d", "ley", -4, 4)];
  const { grupos } = B.formarGrupos(xs, campos);
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos.map(g => g.miembros.length).sort(), [2, 2]);
});

test("formarGrupos: ningún campo llega a 3 → se agrupan por cercanía", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "adentro", -6, -5), al("c", "guard", 6, 5), al("d", "nada", 6, -5)];
  const { grupos, de } = B.formarGrupos(xs, campos);
  assert.equal(grupos.length, 2);
  assert.equal(Object.keys(de).length, 4);
});

test("formarGrupos: números 1..N estables y posición = centroide", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "ley", -6, 5), al("c", "ley", -6, 5), al("d", "nada", 6, -5), al("e", "nada", 6, -5), al("f", "nada", 6, -5)];
  const r1 = B.formarGrupos(xs, campos), r2 = B.formarGrupos([...xs].reverse(), campos);
  assert.deepEqual(r1.grupos.map(g => [g.n, g.campo]), [[1, "ley"], [2, "nada"]]);
  assert.deepEqual(r1.grupos.map(g => [g.n, g.campo]), r2.grupos.map(g => [g.n, g.campo]));
  assert.deepEqual(r1.grupos[0].pos, { x: -6, y: 5 });
});

test("asignarTarde: al grupo más chico de su campo; si no tiene, al más cercano; sin posición, al más chico", () => {
  const gs = [{ n: 1, campo: "ley", pos: { x: -6, y: 5 }, tam: 4 }, { n: 2, campo: "ley", pos: { x: -5, y: 5 }, tam: 3 }, { n: 3, campo: "nada", pos: { x: 6, y: -5 }, tam: 5 }];
  assert.equal(B.asignarTarde({ x: -6, y: 5 }, "ley", gs), 2);
  assert.equal(B.asignarTarde({ x: 5, y: -4 }, "guard", gs), 3);
  assert.equal(B.asignarTarde(null, null, gs), 2);
});

test("emparejarLejanos: nadie queda dos debates atrás y se elige el par más lejano", () => {
  const posDe = { 1: { x: -6, y: 5 }, 2: { x: -5, y: 4 }, 3: { x: 6, y: -5 }, 4: { x: 5, y: 5 } };
  const p = B.emparejarLejanos([1, 2, 3, 4], [], posDe);
  assert.deepEqual([p.A, p.B].sort(), [1, 3]);
  const debates = [];
  for (let k = 0; k < 12; k++) {
    const q = B.emparejarLejanos([1, 2, 3, 4], debates, posDe);
    debates.push(q);
    const n = [1, 2, 3, 4].map(g => debates.filter(d => d.A === g || d.B === g).length);
    assert.ok(Math.max(...n) - Math.min(...n) <= 1, `k=${k} ${n}`);
  }
  assert.equal(B.emparejarLejanos([1], [], posDe), null);
});

test("movimiento: solo quienes respondieron las dos veces", () => {
  const m = B.movimiento({ a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }, { a: { x: 3, y: 4 } });
  assert.equal(m.length, 1);
  assert.equal(m[0].d, 5);
});

test("mapaSvg: un círculo por campo y por punto, flecha si hay «desde»", () => {
  const s = B.mapaSvg({ puntos: [{ x: 1, y: 1, color: "#fff" }, { x: 2, y: 2, color: "#fff", desde: { x: 0, y: 0 } }], campos: campos.map(c => ({ ...c, nombre: c.id, color: "#38bdf8" })), ejes: null });
  assert.equal((s.match(/<circle/g) || []).length, 6);
  assert.equal((s.match(/<line class="mv"/g) || []).length, 1);
});

test("mapaSvg: puntos en la misma posición se dibujan separados", () => {
  const s = B.mapaSvg({ puntos: [{ x: 1, y: 1, color: "#fff" }, { x: 1, y: 1, color: "#fff" }, { x: 1, y: 1, color: "#fff" }], campos: [], ejes: null });
  const cs = [...s.matchAll(/<circle class="pt" cx="([\d.]+)" cy="([\d.]+)"/g)].map(m => m[1] + "," + m[2]);
  assert.equal(new Set(cs).size, 3);
});
