const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../publico.js");

test("resumenTermometro: promedios de partida y llegada, y cuánto se movió la sala", () => {
  const r = P.resumenTermometro([{ pos: 40, pos0: 0 }, { pos: -20, pos0: -40 }, { pos: 10 }]);
  assert.equal(r.n, 3);
  assert.equal(r.inicial, -10);          // (0 − 40 + 10) / 3
  assert.equal(r.final, 10);
  assert.equal(r.mov, 20);               // se movió hacia A FAVOR
  assert.deepEqual(P.resumenTermometro([]), { n: 0, inicial: null, final: null, mov: null });
  assert.equal(P.resumenTermometro([{ pos: NaN }, null]).n, 0);
});

test("muestraCurva: un punto cada 3 s como mínimo, y se ralea al pasar el máximo", () => {
  let c = P.muestraCurva([], 0, 10, 4);
  c = P.muestraCurva(c, 1, 50, 4);                     // muy pronto: no entra
  assert.equal(c.length, 1);
  c = P.muestraCurva(c, 3, 20, 5);
  assert.deepEqual(c[1], { s: 3, m: 20, n: 5 });
  assert.equal(P.muestraCurva(c, 9, 20, 0).length, 2); // sin votantes no hay punto
  let larga = [];
  for (let s = 0; s < 3 * (P.PUB.CURVA_MAX + 1); s += 3) larga = P.muestraCurva(larga, s, s % 100, 3);
  assert.ok(larga.length <= P.PUB.CURVA_MAX, `quedaron ${larga.length}`);
  assert.equal(larga[larga.length - 1].s, 3 * P.PUB.CURVA_MAX);   // el último punto no se pierde
});

test("contarReacciones: una por persona y mensaje; null o desconocidas no cuentan", () => {
  const c = P.contarReacciones([
    { msg: "m1", uid: "a", r: "fuego" }, { msg: "m1", uid: "b", r: "fuente" }, { msg: "m1", uid: "c", r: "fuente" },
    { msg: "m2", uid: "a", r: null }, { msg: "m2", uid: "b", r: "aplauso" }]);
  assert.deepEqual(c, { m1: { fuego: 1, fuente: 2, concede: 0 } });
});

test("pedidosDeFuente: umbral de 2 o un quinto del público, y cada mensaje una sola vez", () => {
  assert.equal(P.umbralFuente(4), 2);
  assert.equal(P.umbralFuente(14), 3);
  const conteos = { m1: { fuego: 0, fuente: 3, concede: 0 }, m2: { fuego: 0, fuente: 2, concede: 0 } };
  assert.deepEqual(P.pedidosDeFuente(conteos, [], 14), ["m1"]);
  assert.deepEqual(P.pedidosDeFuente(conteos, ["m1"], 14), []);
  assert.deepEqual(P.pedidosDeFuente(conteos, [], 5).sort(), ["m1", "m2"]);
});

test("fraseDelDebate: el mensaje de alumno con más 🔥 (mínimo 2); empate, el primero", () => {
  const msgs = [{ id: "m0", tipo: "mod", texto: "x" }, { id: "m1", tipo: "alumno", nombre: "Ana", grupo: 2, equipo: "A", texto: "uno" },
    { id: "m2", tipo: "alumno", nombre: "Beto", grupo: 3, equipo: "B", texto: "dos" }];
  assert.equal(P.fraseDelDebate(msgs, { m1: { fuego: 1 } }), null);
  assert.equal(P.fraseDelDebate(msgs, { m0: { fuego: 9 } }), null);
  const f = P.fraseDelDebate(msgs, { m1: { fuego: 3 }, m2: { fuego: 3 } });
  assert.equal(f.id, "m1"); assert.equal(f.fuego, 3); assert.equal(f.nombre, "Ana");
  assert.equal(P.fraseDelDebate(msgs, { m1: { fuego: 2 }, m2: { fuego: 4 } }).id, "m2");
});

test("preguntas de la tribuna: fila por orden de llegada, cuándo ofrecer y cuándo forzar", () => {
  const ps = [{ uid: "b", texto: "¿y?", t: 5 }, { uid: "a", texto: "¿quién paga?", t: 2 }, { uid: "c", texto: "  ", t: 1 }];
  assert.deepEqual(P.preguntasPendientes(ps, []).map(p => p.uid), ["a", "b"]);
  assert.deepEqual(P.preguntasPendientes(ps, [{ uid: "a" }]).map(p => p.uid), ["b"]);
  assert.deepEqual(P.turnoTribuna({ seg: 60, emitidas: 0, pendientes: 2 }), { ofrecer: false, forzar: false });
  assert.deepEqual(P.turnoTribuna({ seg: 100, emitidas: 0, pendientes: 2 }), { ofrecer: true, forzar: false });
  assert.deepEqual(P.turnoTribuna({ seg: 200, emitidas: 0, pendientes: 1 }), { ofrecer: true, forzar: true });
  assert.deepEqual(P.turnoTribuna({ seg: 200, emitidas: 1, pendientes: 1 }), { ofrecer: true, forzar: false });
  assert.deepEqual(P.turnoTribuna({ seg: 300, emitidas: 2, pendientes: 3 }), { ofrecer: false, forzar: false });
  assert.deepEqual(P.turnoTribuna({ seg: 300, emitidas: 0, pendientes: 0 }), { ofrecer: false, forzar: false });
});

test("textoTribuna: las palabras del alumno, con su nombre y a quién va", () => {
  assert.equal(P.textoTribuna({ nombre: "Lucas Díaz", grupo: 3, texto: "¿Quién fiscaliza el incentivo?" }, "@Grupo 4"),
    "✋ La tribuna pregunta — Lucas Díaz (grupo 3): «¿Quién fiscaliza el incentivo?» @Grupo 4, ¿qué responden?");
  assert.match(P.textoTribuna({ nombre: "Ana", texto: "x".repeat(400) }, ""), /x{200}» ¿Qué responden\?$/);
});
