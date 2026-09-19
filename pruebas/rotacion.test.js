const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../rotacion.js");

test("emparejar: con menos de dos grupos no hay debate", () => {
  assert.equal(R.emparejar([], []), null);
  assert.equal(R.emparejar([3], []), null);
  assert.equal(R.emparejar([3, 3], []), null);
});

test("emparejar: nadie debate dos veces más que otro, para 2 a 8 grupos", () => {
  for (let g = 2; g <= 8; g++) {
    const grupos = Array.from({ length: g }, (_, i) => i + 1), debates = [];
    for (let k = 0; k < 20; k++) {
      const p = R.emparejar(grupos, debates);
      assert.notEqual(p.A, p.B);
      debates.push(p);
      const n = grupos.map(x => debates.filter(d => d.A === x || d.B === x).length);
      assert.ok(Math.max(...n) - Math.min(...n) <= 1, `g=${g} k=${k} cuentas=${n}`);
    }
  }
});

test("emparejar: no repite pareja mientras haya alternativas", () => {
  const grupos = [1, 2, 3, 4], debates = [];
  for (let k = 0; k < 4; k++) debates.push(R.emparejar(grupos, debates));
  const parejas = debates.map(d => [d.A, d.B].sort().join("-"));
  assert.equal(new Set(parejas).size, parejas.length);
});

test("emparejar: alterna el lado A FAVOR", () => {
  const debates = [];
  for (let k = 0; k < 6; k++) debates.push(R.emparejar([1, 2], debates));
  const vecesA1 = debates.filter(d => d.A === 1).length;
  assert.equal(vecesA1, 3);
});

test("emparejar: ignora grupos que no están disponibles", () => {
  const p = R.emparejar([2, 5], [{ A: 1, B: 3 }]);
  assert.deepEqual([p.A, p.B].sort(), [2, 5]);
});

test("votosSuaves: indecisos no suman, convencidos suman casi 1", () => {
  const v = R.votosSuaves([0, 5, -8, 100, -100, 30]);
  assert.equal(v.n, 6);
  assert.ok(Math.abs(v.A - (Math.tanh(100 / 12) + Math.tanh(30 / 12))) < 1e-9);
  assert.ok(Math.abs(v.B - Math.tanh(100 / 12)) < 1e-9);
});

test("puntajeDebate: sin votantes cuenta solo el jurado", () => {
  const r = R.puntajeDebate({ notasA: [16, 14], notasB: [10], posiciones: [] });
  assert.equal(r.hayPublico, false);
  assert.equal(r.A.publico, null);
  assert.equal(r.A.puntaje, 75);
  assert.equal(r.B.puntaje, 50);
  assert.equal(r.ganador, "A");
});

test("puntajeDebate: público que no se mueve da 50 y 50", () => {
  const r = R.puntajeDebate({ notasA: [10], notasB: [10], posiciones: [0, 3, -2] });
  assert.equal(r.hayPublico, true);
  assert.equal(r.A.publico, 50);
  assert.equal(r.B.publico, 50);
  assert.equal(r.ganador, null);
});

test("puntajeDebate: grupo que no escribe saca 0 de jurado", () => {
  const r = R.puntajeDebate({ notasA: [], notasB: [12], posiciones: [60, 60] });
  assert.equal(r.A.jurado, 0);
  assert.equal(r.A.puntaje, 50);          // 0,5×0 + 0,5×100
  assert.equal(r.B.puntaje, 30);          // 0,5×60 + 0,5×0
});

test("puntajeDebate: jurado y público en desacuerdo es empate", () => {
  const r = R.puntajeDebate({ notasA: [18], notasB: [8], posiciones: [-90, -90, -90] });
  assert.equal(r.ganadorJurado, "A");
  assert.equal(r.ganadorPublico, "B");
  assert.equal(r.ganador, null);
});

test("ranking: ordena por puntaje promedio, desempata por jurado, deja al final a quien no debatió", () => {
  const res = (a, b) => ({ A: a, B: b });
  const debates = [
    { A: 1, B: 2, res: res({ jurado: 80, publico: 60, puntaje: 70 }, { jurado: 40, publico: 40, puntaje: 40 }) },
    { A: 3, B: 4, res: res({ jurado: 60, publico: 80, puntaje: 70 }, { jurado: 50, publico: 20, puntaje: 35 }) },
    { A: 1, B: 3, res: null }
  ];
  const r = R.ranking(5, debates);
  assert.deepEqual(r.map(f => f.grupo), [1, 3, 2, 4, 5]);
  assert.equal(r[0].puesto, 1);
  assert.equal(r[4].puesto, null);
  assert.equal(r[4].debates, 0);
  assert.equal(r[1].distincion, "publico");
});

test("proximaPreguntaEscrita: devuelve la primera no usada", () => {
  assert.equal(R.proximaPreguntaEscrita(["a", "b"], ["a"]), "b");
  assert.equal(R.proximaPreguntaEscrita(["a"], ["a"]), null);
  assert.equal(R.proximaPreguntaEscrita(undefined, []), null);
});

test("mejorIntervencion: la nota más alta", () => {
  const m = R.mejorIntervencion([{ autor: "x", grupo: 1, debate: 1, total: 12 }, { autor: "y", grupo: 2, debate: 1, total: 17 }]);
  assert.equal(m.autor, "y");
  assert.equal(R.mejorIntervencion([]), null);
});
