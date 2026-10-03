const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../vozprofe.js");
const R = require("../rotacion.js");

const foto = (t, texto = "hola", debate = 2) => ({ habla: { debate, t0: 100, t, texto } });

test("notarProfe: la primera foto trae un latido viejo y no cuenta", () => {
  const e = P.notarProfe(null, foto(5), 1000, true);
  assert.equal(e.visto, 0);
  assert.equal(P.profeHabla(e, 2, 1000), null);
});

test("notarProfe: un latido nuevo se anota con la hora de ESTE aparato; el mismo latido no la mueve", () => {
  let e = P.notarProfe(null, foto(5), 1000, false);
  assert.equal(e.visto, 1000);
  e = P.notarProfe(e, foto(5, "hola de nuevo"), 1800, false);
  assert.equal(e.visto, 1000, "mismo t: no es un latido nuevo");
  e = P.notarProfe(e, foto(6), 1900, false);
  assert.equal(e.visto, 1900);
});

test("notarProfe: habla null o documento ausente = callado", () => {
  assert.deepEqual(P.notarProfe(null, null, 1000), { habla: null, visto: 0 });
  assert.deepEqual(P.notarProfe(null, { habla: null }, 1000), { habla: null, visto: 0 });
});

test("profeHabla: vigente hasta el latido, luego callado; otro debate no cuenta", () => {
  const e = P.notarProfe(null, foto(5, "  la palabra  "), 1000, false);
  assert.deepEqual(P.profeHabla(e, 2, 3000), { texto: "  la palabra  ", t0: 100 });
  assert.equal(P.profeHabla(e, 2, 3501), null, "más de 2,5 s sin latido");
  assert.equal(P.profeHabla(e, 3, 1500), null, "otro debate");
  assert.equal(P.profeHabla(e, null, 1500), null, "sin debate");
});

test("profeHabla: el texto se corta al final (lo último que dijo)", () => {
  const largo = "a".repeat(250) + "b".repeat(100);
  const e = P.notarProfe(null, foto(5, largo), 1000, false);
  assert.equal(P.profeHabla(e, 2, 1000).texto, "a".repeat(200) + "b".repeat(100));
});

test("mensajeProfe: vacío no se publica; una palabra sí", () => {
  assert.equal(P.mensajeProfe({ texto: "   ", debate: 1 }), null);
  assert.equal(P.mensajeProfe({ texto: "hola", debate: 0 }), null, "sin debate");
  const m = P.mensajeProfe({ texto: "  Tiempo. ", debate: 3, ronda: 2, tramo: 0, ahora: 1700000000000, azar: () => 0.123456789 });
  assert.match(m.id, /^p[0-9a-z]{6,24}$/);
  assert.deepEqual({ ...m, id: "" }, { id: "", tipo: "mod", nombre: "Moderador", texto: "Tiempo.", debate: 3, ronda: 2, tramo: 0,
    t: 1700000000000, datos: { profe: true }, voz: true });
});

test("mensajeProfe: escrito (voz: false) no lleva la marca 🎤", () => {
  const m = P.mensajeProfe({ texto: "Pasemos al costo", debate: 1, voz: false });
  assert.equal("voz" in m, false);
});

test("modProfe: parte apagado; los demás interruptores siguen encendidos por defecto", () => {
  assert.equal(R.opcionActiva({}, "modProfe"), false);
  assert.equal(R.opcionActiva(null, "modProfe"), false);
  assert.equal(R.opcionActiva({ modProfe: true }, "modProfe"), true);
  assert.equal(R.opcionActiva({}, "vozIA"), true);
});
