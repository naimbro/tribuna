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

test("panelJueces: con cinco notas descarta la más alta y la más baja", () => {
  const p = R.panelJueces([
    { id: "a", A: 8, B: 6 }, { id: "b", A: 7, B: 7 }, { id: "c", A: 9, B: 5 }, { id: "d", A: 6, B: 7 }, { id: "e", A: 8, B: 4 }
  ]);
  assert.equal(p.A.total, 23);                       // 8 + 7 + 8 (sin 9 y 6)
  assert.deepEqual(p.A.descartadas, ["c", "d"]);
  assert.equal(p.B.total, 18);                       // notas 6,7,5,7,4: se tachan el 7 de índice 1 y el 4 → 6 + 5 + 7
  assert.deepEqual(p.B.descartadas, ["b", "e"]);
  assert.equal(p.ganador, "A");
});

test("panelJueces: descarte determinista con notas repetidas", () => {
  const p = R.panelJueces([{ id: "a", A: 5, B: 1 }, { id: "b", A: 5, B: 1 }, { id: "c", A: 5, B: 1 }, { id: "d", A: 5, B: 1 }, { id: "e", A: 5, B: 1 }]);
  assert.deepEqual(p.A.descartadas, ["a", "e"]);     // alta: la de menor índice; baja: la de mayor índice
  assert.equal(p.A.total, 15);
});

test("panelJueces: con cuatro notas escala las dos del medio", () => {
  const p = R.panelJueces([{ id: "a", A: 8, B: 5 }, { id: "b", A: null, B: null }, { id: "c", A: 6, B: 5 }, { id: "d", A: 4, B: 5 }, { id: "e", A: 10, B: 5 }]);
  assert.equal(p.A.total, (8 + 6) * 3 / 2);
  assert.equal(p.B.total, 15);
});

test("panelJueces: con tres o menos promedia por tres; sin notas no hay total", () => {
  const p = R.panelJueces([{ id: "a", A: 9, B: 3 }, { id: "b", A: 6, B: null }, { id: "c", A: null, B: null }]);
  assert.equal(p.A.total, 22.5);
  assert.equal(p.B.total, 9);
  assert.deepEqual(p.A.descartadas, []);
  const vacio = R.panelJueces([{ id: "a", A: null, B: null }]);
  assert.equal(vacio.A.total, null);
  assert.equal(vacio.ganador, null);
});

test("panelJueces: totales iguales es empate", () => {
  const p = R.panelJueces([{ id: "a", A: 7, B: 7 }, { id: "b", A: 5, B: 5 }, { id: "c", A: 6, B: 6 }]);
  assert.equal(p.ganador, null);
});

test("votoPublico: cuenta votos, ignora a quien no votó y declara empate", () => {
  const v = R.votoPublico(["A", "B", "A", null, "A"]);
  assert.deepEqual([v.A, v.B, v.n, v.ganador], [3, 1, 4, "A"]);
  assert.equal(v.parteA, 75);
  assert.equal(v.parteB, 25);
  assert.equal(R.votoPublico(["A", "B"]).ganador, null);
  const nadie = R.votoPublico([null, null]);
  assert.deepEqual([nadie.n, nadie.parteA, nadie.ganador], [0, 50, null]);
});

test("puntajeDebate: mitad jueces, mitad público", () => {
  const panel = { A: { total: 24 }, B: { total: 15 }, ganador: "A" };
  const r = R.puntajeDebate({ panel, publico: R.votoPublico(["A", "B", "B", "B"]) });
  assert.equal(r.A.jurado, 80);
  assert.equal(r.A.publico, 25);
  assert.equal(r.A.puntaje, 52.5);
  assert.equal(r.B.puntaje, 0.5 * 50 + 0.5 * 75);
  assert.equal(r.ganador, null);                     // jueces A, público B → empate
});

test("puntajeDebate: sin votantes cuentan solo los jueces; sin jueces, solo el público; sin nada, 50", () => {
  const panel = { A: { total: 21 }, B: { total: 9 }, ganador: "A" };
  const soloJ = R.puntajeDebate({ panel, publico: R.votoPublico([]) });
  assert.equal(soloJ.A.puntaje, 70);
  assert.equal(soloJ.A.publico, null);
  assert.equal(soloJ.ganador, "A");
  const sinJ = { A: { total: null }, B: { total: null }, ganador: null };
  const soloP = R.puntajeDebate({ panel: sinJ, publico: R.votoPublico(["B"]) });
  assert.equal(soloP.B.puntaje, 100);
  assert.equal(soloP.A.jurado, null);
  assert.equal(soloP.ganador, "B");
  assert.equal(R.puntajeDebate({ panel: sinJ, publico: R.votoPublico([]) }).A.puntaje, 50);
});

test("ranking: promedia jueces ignorando debates sin jueces", () => {
  const debates = [
    { A: 1, B: 2, res: { A: { jurado: 80, publico: 50, puntaje: 65 }, B: { jurado: 20, publico: 50, puntaje: 35 } } },
    { A: 1, B: 3, res: { A: { jurado: null, publico: 100, puntaje: 100 }, B: { jurado: null, publico: 0, puntaje: 0 } } }
  ];
  const g1 = R.ranking(3, debates).find(f => f.grupo === 1);
  assert.equal(g1.jurado, 80);
  assert.equal(g1.puntaje, 82.5);
});

test("acumularOraculos: suma aciertos, ignora empates y a quien no predijo", () => {
  let reg = R.acumularOraculos(undefined, [
    { uid: "u1", nombre: "Ana", prediccion: "A" }, { uid: "u2", nombre: "Beto", prediccion: "B" }, { uid: "u3", nombre: "Caro", prediccion: null }
  ], "A");
  assert.deepEqual([reg.u1.puntos, reg.u1.predicciones, reg.u2.puntos, reg.u2.predicciones, reg.u3.predicciones], [1, 1, 0, 1, 0]);
  reg = R.acumularOraculos(reg, [{ uid: "u1", nombre: "Ana", prediccion: "B" }], null);   // jueces empatados
  assert.deepEqual([reg.u1.puntos, reg.u1.predicciones], [1, 1]);
});

test("rankingOraculos: ordena por puntos, luego tasa de acierto, luego nombre", () => {
  const r = R.rankingOraculos({
    a: { uid: "a", nombre: "Zoe", puntos: 2, predicciones: 4, aciertos: 2 },
    b: { uid: "b", nombre: "Ana", puntos: 2, predicciones: 2, aciertos: 2 },
    c: { uid: "c", nombre: "Bea", puntos: 2, predicciones: 2, aciertos: 2 },
    d: { uid: "d", nombre: "Dan", puntos: 0, predicciones: 0, aciertos: 0 }
  });
  assert.deepEqual(r.map(x => x.nombre), ["Ana", "Bea", "Zoe", "Dan"]);
  assert.deepEqual(r.map(x => x.puesto), [1, 2, 3, 4]);
  assert.equal(r[2].tasa, 0.5);
});
