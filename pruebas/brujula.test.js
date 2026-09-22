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

// El teléfono: qué hacer con la pantalla de la brújula según lo que publica la sala.
test("accionBrujula: la pantalla abierta se cierra si ya no se puede guardar", () => {
  const vis = { visible: true, modo: "inicio", tieneMio: false, tieneRepeticion: false };
  assert.equal(B.accionBrujula({ activa: false, fase: null }, vis), "cerrar");
  assert.equal(B.accionBrujula({ activa: true, fase: "cerrada" }, vis), "cerrar");
  assert.equal(B.accionBrujula({ activa: true, fase: "responder" }, vis), "nada");
  assert.equal(B.accionBrujula({ activa: true, fase: "grupos" }, vis), "nada");
  const rep = { ...vis, modo: "repetir", tieneMio: true };
  assert.equal(B.accionBrujula({ activa: true, fase: "cerrada" }, rep), "cerrar");
  assert.equal(B.accionBrujula({ activa: true, fase: "repetir" }, rep), "nada");
});

test("accionBrujula: la repetición se abre sola una vez, solo a quien respondió la primera", () => {
  const oculto = { visible: false, modo: "inicio", tieneMio: true, tieneRepeticion: false };
  assert.equal(B.accionBrujula({ activa: true, fase: "repetir" }, oculto), "repetir");
  assert.equal(B.accionBrujula({ activa: true, fase: "repetir" }, { ...oculto, tieneRepeticion: true }), "nada");
  assert.equal(B.accionBrujula({ activa: true, fase: "repetir" }, { ...oculto, tieneMio: false }), "nada");
  assert.equal(B.accionBrujula({ activa: true, fase: "grupos" }, oculto), "nada");
});

test("ofrecerBrujula: a quien no la respondió, mientras se puede, tenga o no grupo", () => {
  assert.equal(B.ofrecerBrujula({ activa: true, fase: "responder" }, false), true);
  assert.equal(B.ofrecerBrujula({ activa: true, fase: "grupos" }, false), true);
  assert.equal(B.ofrecerBrujula({ activa: true, fase: "grupos" }, true), false);
  assert.equal(B.ofrecerBrujula({ activa: true, fase: "cerrada" }, false), false);
  assert.equal(B.ofrecerBrujula({ activa: false, fase: null }, false), false);
  assert.equal(B.ofrecerBrujula(null, false), false);
});

test("emparejarLejanos: A FAVOR va al grupo que menos veces lo ha sido", () => {
  const posDe = { 1: { x: -6, y: 5 }, 2: { x: 6, y: -5 } };
  assert.deepEqual(B.emparejarLejanos([1, 2], [{ A: 1, B: 2 }], posDe), { A: 2, B: 1 });
  assert.deepEqual(B.emparejarLejanos([1, 2], [{ A: 1, B: 2 }, { A: 2, B: 1 }], posDe), { A: 1, B: 2 });
});

test("formarGrupos: al sumar campos chicos ningún grupo pasa de 5", () => {
  const xs = [...Array.from({ length: 5 }, (_, i) => al("l" + i, "ley", -6, 5 + i * 0.1)),
              al("a1", "adentro", -6, -5), al("a2", "adentro", -6, -4),
              al("g1", "guard", 6, 5), al("g2", "guard", 5, 5),
              al("n1", "nada", 6, -5), al("n2", "nada", 5, -5)];
  const { grupos, de } = B.formarGrupos(xs, campos);
  assert.ok(grupos.every(g => g.miembros.length <= 5), grupos.map(g => g.miembros.length).join(","));
  assert.equal(Object.keys(de).length, 11);
});

test("formarGrupos: nunca más de 10 grupos (la regla admite grupo 1..10)", () => {
  const xs = Array.from({ length: 63 }, (_, i) => al("u" + i, campos[i % 4].id, campos[i % 4].centro.x + (i % 7) * 0.1, campos[i % 4].centro.y));
  const { grupos, de } = B.formarGrupos(xs, campos);
  assert.ok(grupos.length <= 10, String(grupos.length));
  assert.equal(Object.keys(de).length, 63);
});

test("mapaSvg: solo los puntos nuevos llevan la animación de llegada", () => {
  const s = B.mapaSvg({ puntos: [{ x: 1, y: 1, color: "#fff", nuevo: true }, { x: 2, y: 2, color: "#fff" }], campos: [], ejes: null });
  assert.equal((s.match(/class="pt nuevo"/g) || []).length, 1);
  assert.equal((s.match(/class="pt"/g) || []).length, 1);
});

/* --- formarGruposEnK: k-means balanceado, con k elegido por el profesor ---
   Portado de armarCampos() de ml2-master-game: semillas lejanas, cupos exactos
   y dos refinamientos. Los campos del contenido dejan de decidir el grupo y
   pasan a ser solo la etiqueta del centroide. */

test("formarGruposEnK: k grupos con tamaños que difieren a lo más en uno", () => {
  const xs = Array.from({ length: 11 }, (_, i) => al("u" + i, "ley", -8 + i * 1.6, 5 - i));
  const { grupos } = B.formarGruposEnK(xs, campos, 3);
  assert.equal(grupos.length, 3);
  assert.deepEqual(grupos.map(g => g.miembros.length).sort(), [3, 4, 4]);
});

test("formarGruposEnK: dos nubes lejanas con k=2 no se mezclan", () => {
  const izq = ["a", "b", "c"].map((u, i) => al(u, "ley", -8 + i * 0.2, 5));
  const der = ["d", "e", "f"].map((u, i) => al(u, "nada", 8 - i * 0.2, -5));
  const { de } = B.formarGruposEnK([...izq, ...der], campos, 2);
  assert.equal(new Set(["a", "b", "c"].map(u => de[u])).size, 1, "la nube izquierda se partió");
  assert.equal(new Set(["d", "e", "f"].map(u => de[u])).size, 1, "la nube derecha se partió");
  assert.notEqual(de.a, de.d, "las dos nubes cayeron en el mismo grupo");
});

test("formarGruposEnK: cada grupo se etiqueta con el campo más cercano a su centroide", () => {
  const xs = [...["a", "b", "c"].map((u, i) => al(u, "ley", -6 + i * 0.1, 5)),
              ...["d", "e", "f"].map((u, i) => al(u, "nada", 6 - i * 0.1, -5))];
  const { grupos } = B.formarGruposEnK(xs, campos, 2);
  assert.deepEqual(grupos.map(g => g.campo).sort(), ["ley", "nada"]);
});

test("formarGruposEnK: mismas posiciones, mismos grupos (sin azar)", () => {
  const xs = Array.from({ length: 13 }, (_, i) => al("u" + i, "ley", Math.sin(i) * 9, Math.cos(i) * 9));
  assert.deepEqual(B.formarGruposEnK(xs, campos, 4), B.formarGruposEnK(xs, campos, 4));
});

test("formarGruposEnK: k mayor que la cantidad de alumnos se recorta", () => {
  const xs = ["a", "b", "c", "d"].map((u, i) => al(u, "ley", -6 + i, 5));
  assert.equal(B.formarGruposEnK(xs, campos, 9).grupos.length, 4);
});

test("formarGruposEnK: nunca más de 10 grupos (la regla admite grupo 1..10)", () => {
  const xs = Array.from({ length: 40 }, (_, i) => al("u" + i, "ley", (i % 20) - 10, 5 - (i % 7)));
  assert.equal(B.formarGruposEnK(xs, campos, 15).grupos.length, 10);
});

test("formarGruposEnK: con 2 o más alumnos nunca queda un solo grupo", () => {
  const xs = ["a", "b", "c"].map((u, i) => al(u, "ley", -6 + i * 0.1, 5));
  assert.equal(B.formarGruposEnK(xs, campos, 1).grupos.length, 2);
});

test("formarGruposEnK: quien no respondió la brújula queda fuera del reparto", () => {
  const xs = [...["a", "b", "c", "d"].map((u, i) => al(u, "ley", -6 + i, 5)), { uid: "z" }];
  const { grupos, de } = B.formarGruposEnK(xs, campos, 2);
  assert.equal(de.z, undefined);
  assert.equal(grupos.reduce((s, g) => s + g.miembros.length, 0), 4);
});
