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

test("clasificarMensaje: la mitad del texto de una vez es rojo; mensajes cortos no se clasifican", () => {
  assert.equal(T.clasificarMensaje({ ...base, largoFinal: 200, maxInsercion: 12 }), "escrito");
  assert.equal(T.clasificarMensaje({ ...base, largoFinal: 200, maxInsercion: 150 }), "golpe");
  assert.equal(T.clasificarMensaje({ ...base, largoFinal: 200, maxInsercion: 5, pegados: [{ ms: 1, chars: 120 }] }), "golpe");
  assert.equal(T.clasificarMensaje({ ...base, largoFinal: 19, maxInsercion: 9 }), "corto");
});

test("puntosHuella: termina en el largo enviado, arriba del todo", () => {
  const pts = T.puntosHuella({ huella: [0, 10, 20], largoFinal: 40 }, 30, 10).split(" ");
  assert.equal(pts.length, 4);
  assert.equal(pts[0], "0.0,10.0");
  assert.equal(pts[3], "30.0,0.0");
});

test("hechosMensaje: describe sin juzgar", () => {
  const h = T.hechosMensaje({ ...base, largoFinal: 200, msComposicion: 65000, maxInsercion: 150, salidas: 2, msFuera: 130000, tipos: ["insertFromPaste"] });
  assert.ok(h.some(x => x.includes("75 % del texto")));
  assert.ok(h.some(x => x.includes("portapapeles")));
  assert.ok(h.some(x => x.includes("2 min 10 s")));
  assert.ok(!h.join(" ").includes("copi"));
});

test("dictado por voz: no cuenta como velocidad sospechosa ni como golpe", () => {
  // 300 caracteres dictados en 20 s (15/s) + 20 tipeados: rápido, pero es voz
  const t = { ...base, largoFinal: 320, msComposicion: 20000, maxInsercion: 4, dictado: 300 };
  assert.deepEqual(T.senalesMensaje(t), []);
  assert.equal(T.clasificarMensaje(t), "escrito");
  assert.ok(T.hechosMensaje(t).some(x => x.includes("Dictó por voz 300 caracteres")));
});

test("dictado por voz: si además pegó, el pegado se sigue viendo", () => {
  const t = { ...base, largoFinal: 400, msComposicion: 30000, dictado: 100, pegados: [{ ms: 1, chars: 280 }] };
  assert.deepEqual(T.senalesMensaje(t), ["pegó 280 caracteres"]);
  assert.equal(T.clasificarMensaje(t), "golpe");
});
