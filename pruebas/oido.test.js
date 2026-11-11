const test = require("node:test");
const assert = require("node:assert/strict");
const { crearToma } = require("../dictado.js");
const { OIDO, crearOido, recSimulado } = require("../oido.js");

// Un SpeechRecognition falso (como en dictado.test.js): la prueba le hace «oír».
function falso() {
  const recs = [];
  class Rec {
    constructor() { recs.push(this); }
    start() { this.iniciado = true; }
    stop() { this.parado = true; }
    abort() { this.abortado = true; }
  }
  const oir = (rec, trozos) => rec.onresult({ resultIndex: 0, results: trozos.map(([t, fin]) => Object.assign([{ transcript: t }], { isFinal: fin })) });
  return { Rec, recs, oir };
}
function armar(extra = {}) {
  const f = falso(), textos = [], parrafos = [], fallos = [];
  const reloj = { t: 1000 };
  const o = crearOido({ Rec: f.Rec, toma: crearToma, reloj: () => reloj.t,
    alTexto: x => textos.push(x), alParrafo: x => parrafos.push(x), alFallo: x => fallos.push(x), ...extra });
  return { ...f, o, textos, parrafos, fallos, reloj };
}

test("abrir da la palabra: un reconocedor, y lo que se oye avisa con el lado", () => {
  const { o, recs, oir, textos, parrafos } = armar();
  assert.equal(o.abrir("A"), true);
  assert.equal(o.quien(), "A");
  assert.equal(recs.length, 1);
  assert.equal(recs[0].iniciado, true);
  oir(recs[0], [["es un", false]]);
  assert.deepEqual(textos.at(-1), { quien: "A", texto: "es un" });
  assert.equal(parrafos.length, 0, "el párrafo sigue abierto");
  assert.equal(o.abrir("A"), true);
  assert.equal(recs.length, 1, "abrir el mismo lado no reinicia el micrófono");
});

test("cambiar de lado cierra el párrafo con lo que hay, sin esperar, y abre para el que sigue", () => {
  const { o, recs, oir, textos, parrafos, reloj } = armar();
  o.abrir("A");
  oir(recs[0], [["es un piso", true]]);
  oir(recs[0], [["y hay", false]]);                      // lo provisional también cuenta
  reloj.t = 6000;
  o.abrir("B");
  assert.deepEqual(parrafos, [{ quien: "A", texto: "es un piso y hay", t0: 1000, t: 6000 }]);
  assert.equal(recs[0].abortado, true);
  assert.equal(recs[0].onresult, null, "el reconocedor viejo ya no puede escribir en el párrafo nuevo");
  assert.equal(recs.length, 2);
  assert.equal(o.quien(), "B");
  oir(recs[1], [["no más de 0,66", false]]);
  assert.deepEqual(textos.at(-1), { quien: "B", texto: "no más de 0,66" });
});

test("cerrar (pausa) guarda el párrafo y avisa que nadie habla; sin nadie hablando no hace nada", () => {
  const { o, recs, oir, textos, parrafos } = armar();
  o.cerrar();
  assert.equal(parrafos.length, 0);
  assert.equal(textos.length, 0);
  o.abrir("P");
  oir(recs[0], [["¿y el desfase?", true]]);
  o.cerrar();
  assert.equal(parrafos.length, 1);
  assert.equal(parrafos[0].quien, "P");
  assert.equal(parrafos[0].texto, "¿y el desfase?");
  assert.deepEqual(textos.at(-1), { quien: null, texto: "" });
  assert.equal(o.quien(), null);
});

test("silencio o puro espacio: no se crea un párrafo vacío", () => {
  const { o, recs, oir, parrafos } = armar();
  o.abrir("A");
  o.abrir("B");                                          // A no dijo nada
  oir(recs[1], [["   ", true]]);
  oir(recs[1], [["", false]]);
  o.cerrar();
  assert.equal(parrafos.length, 0);
});

test("a los 30 segundos el párrafo se corta y el lado sigue con la palabra", () => {
  const { o, recs, oir, textos, parrafos, reloj } = armar();
  assert.equal(OIDO.PARRAFO_MS, 30000);
  o.abrir("A");
  oir(recs[0], [["uno dos", true]]);
  reloj.t = 20000; o.tick();
  assert.equal(recs[0].parado, undefined, "todavía no");
  reloj.t = 31500; o.tick();
  assert.equal(recs[0].parado, true, "se pide el final de la frase en curso");
  recs[0].onend();
  assert.deepEqual(parrafos, [{ quien: "A", texto: "uno dos", t0: 1000, t: 31500 }]);
  assert.deepEqual(textos.at(-1), { quien: "A", texto: "" });
  assert.equal(recs.length, 2, "se abrió otro reconocedor");
  assert.equal(o.quien(), "A");
  oir(recs[1], [["tres", true]]);
  reloj.t = 40000;
  o.cerrar();
  assert.deepEqual(parrafos[1], { quien: "A", texto: "tres", t0: 31500, t: 40000 });
});

test("si el micrófono falla, lo ya oído se guarda y el fallo se avisa una vez", () => {
  const { o, recs, oir, parrafos, fallos } = armar();
  o.abrir("B");
  oir(recs[0], [["no hay excepción", true]]);
  recs[0].onerror({ error: "not-allowed" });
  assert.equal(parrafos.length, 1);
  assert.equal(parrafos[0].texto, "no hay excepción");
  assert.deepEqual(fallos, ["not-allowed"]);
  assert.equal(o.quien(), null);
  o.tick();                                              // sin toma, no revienta
});

test("no-speech no es un fallo: el micrófono sigue abierto", () => {
  const { o, recs, fallos, reloj } = armar();
  o.abrir("A");
  recs[0].onerror({ error: "no-speech" });
  reloj.t = 9000;
  recs[0].onend();
  assert.deepEqual(fallos, []);
  assert.equal(recs.length, 2);
  assert.equal(o.quien(), "A");
});

test("sin reconocimiento de voz en el navegador, o si no se puede abrir, avisa y no queda nadie con la palabra", () => {
  const sin = armar({ Rec: null });
  assert.equal(sin.o.abrir("A"), false);
  assert.deepEqual(sin.fallos, ["sin-voz"]);
  assert.equal(sin.o.quien(), null);
  class Roto { start() { throw new Error("InvalidStateError"); } abort() {} }
  const roto = armar({ Rec: Roto });
  assert.equal(roto.o.abrir("A"), false);
  assert.deepEqual(roto.fallos, ["no-abre"]);
  assert.equal(roto.o.quien(), null);
});

test("recSimulado: oye las frases del guion palabra por palabra y las encadena", async () => {
  const guion = ["hola a todos", "esto es un ensayo"];
  let i = 0, t = 0;
  const textos = [], parrafos = [], fallos = [];
  const o = crearOido({ Rec: recSimulado(() => guion[i++ % guion.length], { paso: 1, pausa: 1 }), toma: crearToma,
    reloj: () => (t += 1000), alTexto: x => textos.push(x), alParrafo: x => parrafos.push(x), alFallo: x => fallos.push(x) });
  o.abrir("A");
  await new Promise(r => setTimeout(r, 120));
  o.cerrar();
  assert.deepEqual(fallos, []);
  assert.ok(textos.some(x => x.texto === "hola"), "llega palabra por palabra");
  assert.equal(parrafos.length, 1);
  assert.ok(parrafos[0].texto.startsWith("hola a todos esto es un ensayo"), parrafos[0].texto);
  const antes = textos.length;
  await new Promise(r => setTimeout(r, 30));
  assert.equal(textos.length, antes, "después de cerrar no se oye nada más");
});
