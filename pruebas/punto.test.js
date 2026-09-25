const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../punto.js");

const pedido = (o = {}) => ({ uid: "u1", nombre: "Ana", grupo: 3, lado: "B", t: 500, ...o });
const base = { ahora: 1000, hablando: { A: true, B: false }, ultimo: {} };

test("pedir: solo si el otro lado está hablando y no hay otro punto", () => {
  const r = P.pedirPunto(null, pedido(), base);
  assert.equal(r.punto.estado, "pedido");
  assert.equal(r.punto.para, "A");
  assert.equal(r.punto.fin, 1000 + P.PUNTO.ESPERA);
  assert.equal(r.ultimo.B, 1000);
  assert.equal(P.pedirPunto(null, pedido(), { ...base, hablando: { A: false, B: false } }).punto, null);
  assert.equal(P.pedirPunto(r.punto, pedido({ uid: "u2", lado: "A", grupo: 4 }), { ...base, hablando: { A: true, B: true } }).punto, r.punto);
});

test("pedir: cada lado espera ENFRIA desde su último pedido", () => {
  const ultimo = { B: 1000 };
  assert.equal(P.pedirPunto(null, pedido(), { ...base, ahora: 1000 + P.PUNTO.ENFRIA - 1, ultimo }).punto, null);
  assert.equal(P.pedirPunto(null, pedido(), { ...base, ahora: 1000 + P.PUNTO.ENFRIA, ultimo }).punto.estado, "pedido");
});

test("pedir: un punto cerrado que todavía se muestra no bloquea uno nuevo", () => {
  const cerrado = { estado: "rechazado", hasta: 5000, lado: "A", para: "B" };
  assert.equal(P.pedirPunto(cerrado, pedido(), base).punto.estado, "pedido");
});

test("pedir: ultimo puede venir null (sala recién creada)", () => {
  const r = P.pedirPunto(null, pedido(), { ahora: 1000, hablando: { A: true, B: false }, ultimo: null });
  assert.equal(r.punto.estado, "pedido");
});

test("pedir: el pedido fantasma (mismo t que ya se atendió) no revive aunque siga en el doc del teléfono", () => {
  const r1 = P.pedirPunto(null, pedido({ t: 500 }), base);
  assert.equal(r1.punto.estado, "pedido");
  assert.equal(r1.ultimo.tB, 500);
  const rechazado = P.responderPunto(r1.punto, { t: 500, acepta: false }, 1000);
  const limpio = P.vencerPunto(rechazado, rechazado.hasta);
  assert.equal(limpio, null);
  // el teléfono nunca borró su campo punto: sigue publicando { debate, t: 500 } — se ignora
  const ahora2 = 1000 + P.PUNTO.ENFRIA + 1;
  const r2 = P.pedirPunto(limpio, pedido({ t: 500 }), { ahora: ahora2, hablando: base.hablando, ultimo: r1.ultimo });
  assert.equal(r2.punto, null);
  assert.equal(r2.ultimo, r1.ultimo);
  // un pedido de verdad (otro t) sí se acepta
  const r3 = P.pedirPunto(limpio, pedido({ t: 600 }), { ahora: ahora2, hablando: base.hablando, ultimo: r1.ultimo });
  assert.equal(r3.punto.estado, "pedido");
  assert.equal(r3.ultimo.tB, 600);
});

test("responder: aceptar da 15 s; rechazar cierra; una respuesta a otro pedido no cuenta", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);
  const a = P.responderPunto(punto, { t: 500, acepta: true }, 2000);
  assert.equal(a.estado, "aceptado");
  assert.equal(a.fin, 2000 + P.PUNTO.DURA);
  const r = P.responderPunto(punto, { t: 500, acepta: false }, 2000);
  assert.equal(r.estado, "rechazado");
  assert.equal(r.hasta, 2000 + P.PUNTO.MUESTRA);
  assert.equal(P.responderPunto(punto, { t: 499, acepta: true }, 2000), punto);
  assert.equal(P.responderPunto(a, { t: 500, acepta: false }, 2100), a);   // ya aceptado: no se deshace
});

test("responder: una respuesta tardía (después de fin) no cuenta; solo responde quien tiene la palabra", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);   // para: "A" (pidió B)
  assert.equal(P.responderPunto(punto, { t: 500, acepta: true }, punto.fin), punto);      // ya venció
  assert.equal(P.responderPunto(punto, { t: 500, acepta: true }, punto.fin + 1), punto);  // más tarde aún
  assert.equal(P.responderPunto(punto, { t: 500, acepta: true, lado: "B" }, 2000), punto); // no le toca a B
  const a = P.responderPunto(punto, { t: 500, acepta: true, lado: "A" }, 2000);
  assert.equal(a.estado, "aceptado");
});

test("vencer: pedido sin respuesta → vencido; palabra cumplida → terminado; cerrado que ya se mostró → null", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);
  assert.equal(P.vencerPunto(punto, punto.fin - 1), punto);
  const v = P.vencerPunto(punto, punto.fin);
  assert.equal(v.estado, "vencido");
  const a = P.responderPunto(punto, { t: 500, acepta: true }, 2000);
  assert.equal(P.vencerPunto(a, a.fin).estado, "terminado");
  assert.equal(P.vencerPunto(v, v.hasta), null);
  assert.equal(P.vencerPunto(null, 1), null);
});

test("activo y puedeHablar: quien pidió habla solo con el punto aceptado", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);
  assert.equal(P.puntoActivo(punto), true);
  const a = P.responderPunto(punto, { t: 500, acepta: true }, 2000);
  assert.equal(P.puedeHablarPorPunto(a, "u1", 3000), true);
  assert.equal(P.puedeHablarPorPunto(a, "u2", 3000), false);
  assert.equal(P.puedeHablarPorPunto(a, "u1", a.fin), false);
  assert.equal(P.puedeHablarPorPunto(punto, "u1", 3000), false);
  assert.equal(P.puntoActivo(P.responderPunto(punto, { t: 500, acepta: false }, 2000)), false);
});
