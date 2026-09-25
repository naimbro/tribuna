const test = require("node:test");
const assert = require("node:assert/strict");
const AJ = require("../ajedrez.js");

test("nuevoBanco: la mitad del tramo para cada lado, en ms", () => {
  assert.deepEqual(AJ.nuevoBanco(360), { A: 180000, B: 180000 });
});

test("avanzarBanco: corre solo el lado que habla; los dos si hablan a la vez", () => {
  let b = AJ.nuevoBanco(360);
  let r = AJ.avanzarBanco(b, { A: true, B: false }, 1000);
  assert.deepEqual(r.banco, { A: 179000, B: 180000 });
  r = AJ.avanzarBanco(r.banco, { A: true, B: true }, 500);
  assert.deepEqual(r.banco, { A: 178500, B: 179500 });
  r = AJ.avanzarBanco(r.banco, { A: false, B: false }, 5000);
  assert.deepEqual(r.banco, { A: 178500, B: 179500 });
  assert.deepEqual(r.agotados, []);
});

test("avanzarBanco: no baja de cero y avisa una sola vez cuando un lado se agota", () => {
  let r = AJ.avanzarBanco({ A: 300, B: 5000 }, { A: true, B: false }, 1000);
  assert.deepEqual(r.banco, { A: 0, B: 5000 });
  assert.deepEqual(r.agotados, ["A"]);
  r = AJ.avanzarBanco(r.banco, { A: true, B: false }, 1000);
  assert.deepEqual(r.agotados, []);
});

test("avanzarBanco: un dt negativo o enorme (pestaña dormida) se acota", () => {
  assert.deepEqual(AJ.avanzarBanco({ A: 1000, B: 1000 }, { A: true }, -50).banco, { A: 1000, B: 1000 });
  assert.deepEqual(AJ.avanzarBanco({ A: 10000, B: 1000 }, { A: true }, 60000).banco, { A: 10000 - AJ.AJ.DT_MAX, B: 1000 });
});

test("avanzarBanco: tolera un banco sin A o sin B, y hablando indefinido", () => {
  assert.deepEqual(AJ.avanzarBanco({ B: 500 }, { A: true, B: true }, 100).banco, { A: 0, B: 400 });
  assert.deepEqual(AJ.avanzarBanco({ A: 500 }, undefined, 100).banco, { A: 500, B: 0 });
});

test("hablandoPorLado: cuenta a quien tiene habla vigente del debate en curso", () => {
  const ahora = 100000;
  const xs = [
    { grupo: 3, habla: { debate: 2, t: 1 }, visto: ahora - 500 },     // A, vigente
    { grupo: 4, habla: { debate: 2, t: 1 }, visto: ahora - 4000 },    // B, latido vencido
    { grupo: 4, habla: { debate: 1, t: 1 }, visto: ahora - 100 },     // B, otro debate
    { grupo: 5, habla: { debate: 2, t: 1 }, visto: ahora - 100 },     // público: no cuenta
    { grupo: 4, habla: null, visto: ahora }
  ];
  assert.deepEqual(AJ.hablandoPorLado(xs, { debate: 2, A: 3, B: 4, ahora }), { A: true, B: false });
});

test("bancoTerminado: los dos bancos en cero, o el tramo más el margen", () => {
  const abre = 0, seg = 360;
  assert.equal(AJ.bancoTerminado({ A: 0, B: 0 }, { abre, seg, ahora: 1000 }), true);
  assert.equal(AJ.bancoTerminado({ A: 0, B: 1 }, { abre, seg, ahora: 1000 }), false);
  assert.equal(AJ.bancoTerminado({ A: 5, B: 5 }, { abre, seg, ahora: (seg + AJ.AJ.MARGEN) * 1000 }), true);
  assert.equal(AJ.bancoTerminado({ A: 5, B: 5 }, { abre, seg, ahora: (seg + AJ.AJ.MARGEN) * 1000 - 1 }), false);
});

test("bancoTerminado: el «+30 s» del profesor (extra) empuja el límite de pared, no lo come el margen", () => {
  const abre = 0, seg = 360, extra = 30000;
  const limiteSinExtra = (seg + AJ.AJ.MARGEN) * 1000;
  assert.equal(AJ.bancoTerminado({ A: 5, B: 5 }, { abre, seg, ahora: limiteSinExtra, extra }), false);
  assert.equal(AJ.bancoTerminado({ A: 5, B: 5 }, { abre, seg, ahora: limiteSinExtra + extra - 1, extra }), false);
  assert.equal(AJ.bancoTerminado({ A: 5, B: 5 }, { abre, seg, ahora: limiteSinExtra + extra, extra }), true);
  // sin extra (por defecto 0) se comporta como antes
  assert.equal(AJ.bancoTerminado({ A: 5, B: 5 }, { abre, seg, ahora: limiteSinExtra }), true);
});

test("AJ.MARGEN: 150 s — la moderadora también usa el margen con sus turnos hablados", () => {
  assert.equal(AJ.AJ.MARGEN, 150);
});

test("sumarBanco: +30 s a los dos lados", () => {
  assert.deepEqual(AJ.sumarBanco({ A: 0, B: 1000 }, 30000), { A: 30000, B: 31000 });
});

test("bancoRestante: lo que queda ahora, contando lo que corrió desde la foto publicada", () => {
  const foto = { A: 60000, B: 50000, corre: { A: true, B: false }, t: 1000 };
  assert.deepEqual(AJ.bancoRestante(foto, 3000), { A: 58000, B: 50000 });
  assert.deepEqual(AJ.bancoRestante({ ...foto, corre: { A: true, B: true } }, 100000), { A: 0, B: 0 });
});
