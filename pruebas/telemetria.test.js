const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../telemetria.js");

const base = { uid: "u1", nombre: "Ana", grupo: 1, debate: 1, largoFinal: 60, msComposicion: 30000, pegados: [], maxInsercion: 3, salidas: 0, msFuera: 0 };

test("senalesMensaje: un mensaje escrito a mano no tiene señales", () => {
  assert.deepEqual(T.senalesMensaje(base), []);
});

test("senalesMensaje: pegado grande, inserción de golpe, salidas y velocidad", () => {
  assert.deepEqual(T.senalesMensaje({ ...base, pegados: [{ ms: 100, chars: 420 }] }), ["pegó 420 caracteres"]);
  assert.deepEqual(T.senalesMensaje({ ...base, maxInsercion: 300 }), ["insertó 300 caracteres de golpe"]);
  assert.deepEqual(T.senalesMensaje({ ...base, salidas: 3, msFuera: 61000 }), ["salió de la app 3 veces (61 s)"]);
  assert.deepEqual(T.senalesMensaje({ ...base, salidas: 1, msFuera: 4000 }), ["salió de la app 1 vez (4 s)"]);
  assert.deepEqual(T.senalesMensaje({ ...base, largoFinal: 600, msComposicion: 10000 }), ["escribió 600 caracteres en 10 s"]);
});

test("senalesMensaje: una inserción grande que ya es un pegado no se cuenta dos veces", () => {
  assert.deepEqual(T.senalesMensaje({ ...base, pegados: [{ ms: 1, chars: 300 }], maxInsercion: 300 }), ["pegó 300 caracteres"]);
});

test("senalesMensaje: pegados chicos (una palabra, una cita corta) no son señal", () => {
  assert.deepEqual(T.senalesMensaje({ ...base, pegados: [{ ms: 1, chars: 25 }] }), []);
});

test("resumenTelemetria: agrupa por alumno y ordena por cantidad de señales", () => {
  const r = T.resumenTelemetria([
    { ...base, uid: "u1", nombre: "Ana" },
    { ...base, uid: "u2", nombre: "Beto", grupo: 2, pegados: [{ ms: 1, chars: 500 }], salidas: 2, msFuera: 20000 },
    { ...base, uid: "u2", nombre: "Beto", grupo: 2, debate: 2 }
  ]);
  assert.deepEqual(r.map(x => x.nombre), ["Beto", "Ana"]);
  assert.equal(r[0].mensajes, 2);
  assert.equal(r[0].charsPegados, 500);
  assert.equal(r[0].salidas, 2);
  assert.equal(r[0].senales.length, 2);
  assert.equal(r[1].senales.length, 0);
});

test("senalesMensaje: si ya hubo pegado o inserción de golpe, la velocidad no se repite", () => {
  assert.deepEqual(T.senalesMensaje({ ...base, pegados: [{ ms: 1, chars: 302 }], largoFinal: 302, msComposicion: 100 }), ["pegó 302 caracteres"]);
  assert.deepEqual(T.senalesMensaje({ ...base, maxInsercion: 250, largoFinal: 250, msComposicion: 100 }), ["insertó 250 caracteres de golpe"]);
});
