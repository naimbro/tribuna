const test = require("node:test");
const assert = require("node:assert/strict");
const { DICTADO, unirTrozos, crearToma } = require("../dictado.js");

// Un SpeechRecognition falso: cada reconocedor creado queda en recs; la prueba le hace «oír».
function falso() {
  const recs = [];
  class Rec {
    constructor() { recs.push(this); }
    start() { this.iniciado = true; }
    stop() { this.parado = true; }
    abort() { this.abortado = true; }
  }
  // trozos: [[texto, esFinal], ...]
  const oir = (rec, trozos) => rec.onresult({ resultIndex: 0, results: trozos.map(([t, fin]) => Object.assign([{ transcript: t }], { isFinal: fin })) });
  return { Rec, recs, oir };
}

test("unirTrozos: pone el espacio que falta, no duplica el que hay", () => {
  assert.equal(unirTrozos("", "hola"), "hola");
  assert.equal(unirTrozos("hola", ""), "hola");
  assert.equal(unirTrozos("hola", "mundo"), "hola mundo");
  assert.equal(unirTrozos("hola ", "mundo"), "hola mundo");
  assert.equal(unirTrozos("hola", " mundo"), "hola mundo");
});

test("un reconocedor de una frase a la vez, es-CL, con resultados provisionales", () => {
  const { Rec, recs } = falso();
  crearToma(Rec).empezar();
  assert.equal(recs.length, 1);
  assert.equal(recs[0].lang, "es-CL");
  assert.equal(recs[0].continuous, false, "continuo repetía el texto en Android (1-oct-2026)");
  assert.equal(recs[0].interimResults, true);
  assert.equal(recs[0].iniciado, true);
});

test("lo provisional avisa con alTexto; al soltar espera el final", async () => {
  const { Rec, recs, oir } = falso();
  const vistos = [];
  const h = crearToma(Rec, { alTexto: t => vistos.push(t) });
  h.empezar();
  oir(recs[0], [["hola", false]]);
  assert.deepEqual(vistos, ["hola"]);
  const p = h.soltar();
  assert.equal(recs[0].parado, true, "al soltar se pide el final");
  oir(recs[0], [["hola mundo", true]]);
  recs[0].onend();
  const r = await p;
  assert.equal(r.texto, "hola mundo");
  assert.deepEqual(vistos, ["hola"], "después de soltar no se avisa más");
  assert.equal(recs[0].abortado, true);
  assert.equal(recs[0].onresult, null);
});

test("termina una frase con el botón apretado: se abre otro reconocedor y el texto suma sin repetirse", () => {
  const { Rec, recs, oir } = falso();
  let t = 0;
  const h = crearToma(Rec, { reloj: () => t });
  h.empezar();
  oir(recs[0], [["Aló", true]]);
  t = 2000; recs[0].onend();
  assert.equal(recs.length, 2);
  oir(recs[1], [["estoy probando", true]]);
  assert.equal(h.texto(), "Aló estoy probando");
});

test("lo provisional que quedaba al terminar la frase pasa a firme", () => {
  const { Rec, recs, oir } = falso();
  let t = 0;
  const h = crearToma(Rec, { reloj: () => t });
  h.empezar();
  oir(recs[0], [["algo", false]]);
  t = 2000; recs[0].onend();
  oir(recs[1], [["más", false]]);
  assert.equal(h.texto(), "algo más");
});

test("a los 60 s se corta: alCorte con lo dicho y su inicio, y sigue escuchando", () => {
  const { Rec, recs, oir } = falso();
  let t = 0;
  const cortes = [];
  const h = crearToma(Rec, { max: 1000, espera: 50, reloj: () => t, alCorte: (texto, desde) => cortes.push([texto, desde]) });
  h.empezar();
  oir(recs[0], [["uno dos", true]]);
  t = 1000; h.tick();
  assert.equal(recs[0].parado, true);
  t = 1010; recs[0].onend();
  assert.deepEqual(cortes, [["uno dos", 0]]);
  assert.equal(h.t0, 1010, "el trozo nuevo empieza cuando llegó el final");
  assert.equal(h.texto(), "");
  assert.equal(recs.length, 2, "sigue escuchando");
});

test("si el final del corte no llega a tiempo, se corta igual y se abre otro reconocedor", () => {
  const { Rec, recs, oir } = falso();
  let t = 0;
  const cortes = [];
  const h = crearToma(Rec, { max: 1000, espera: 50, reloj: () => t, alCorte: texto => cortes.push(texto) });
  h.empezar();
  oir(recs[0], [["tres", false]]);
  t = 1000; h.tick();
  t = 1051; h.tick();
  assert.equal(recs[0].abortado, true);
  assert.deepEqual(cortes, ["tres"]);
  assert.equal(recs.length, 2);
});

test("soltar sin que llegue el final: a la espera, sale lo que hay (con lo provisional)", async () => {
  const { Rec, recs, oir } = falso();
  const h = crearToma(Rec, { espera: 10 });
  h.empezar();
  oir(recs[0], [["casi", false]]);
  const r = await h.soltar();
  assert.equal(r.texto, "casi");
  assert.equal(recs[0].abortado, true);
});

test("soltar inmediato no espera el final", async () => {
  const { Rec, recs, oir } = falso();
  const h = crearToma(Rec, { espera: 60000 });
  h.empezar();
  oir(recs[0], [["ya", false]]);
  const r = await h.soltar({ inmediato: true });
  assert.equal(r.texto, "ya");
  assert.equal(recs[0].parado, undefined);
  assert.equal(recs[0].abortado, true);
});

test("errores: not-allowed avisa (y si ya oyó algo); no-speech y aborted no; tras soltar, nada", async () => {
  const { Rec, recs, oir } = falso();
  const fallos = [];
  const h = crearToma(Rec, { espera: 10, alFallo: (c, oyo) => fallos.push([c, oyo]) });
  h.empezar();
  recs[0].onerror({ error: "no-speech" });
  recs[0].onerror({ error: "aborted" });
  recs[0].onerror({ error: "not-allowed" });
  oir(recs[0], [["algo", false]]);
  recs[0].onerror({ error: "network" });
  assert.deepEqual(fallos, [["not-allowed", false], ["network", true]]);
  const err = recs[0].onerror;
  await h.soltar();
  err({ error: "network" });
  assert.equal(fallos.length, 2);
});

test("un micrófono que se cierra apenas se abre: a la cuarta vez, alFallo('mudo')", () => {
  const { Rec, recs } = falso();
  const fallos = [];
  const h = crearToma(Rec, { reloj: () => 0, alFallo: c => fallos.push(c) });
  h.empezar();
  for (let i = 0; i < DICTADO.FALLAS; i++) recs[i].onend();
  assert.deepEqual(fallos, ["mudo"]);
  assert.equal(recs.length, DICTADO.FALLAS, "no abre un quinto");
});

test("si no se puede abrir el siguiente reconocedor, alFallo('cortado')", () => {
  const { Rec, recs } = falso();
  let t = 0, romper = false;
  class Fragil extends Rec { start() { if (romper) throw new Error("no"); super.start(); } }
  const fallos = [];
  const h = crearToma(Fragil, { reloj: () => t, alFallo: c => fallos.push(c) });
  h.empezar();
  romper = true; t = 2000; recs[0].onend();
  assert.deepEqual(fallos, ["cortado"]);
});

test("empezar() que lanza no deja un micrófono abierto: un onend tardío no abre otro", async () => {
  const { Rec, recs } = falso();
  class Roto extends Rec { start() { super.start(); throw new Error("no se pudo"); } }
  const h = crearToma(Roto, { reloj: () => 0 });
  assert.throws(() => h.empezar(), /no se pudo/);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].abortado, true, "el reconocedor queda abortado");
  assert.equal(recs[0].onend, null, "y desenganchado");
  assert.equal(h.rec, null);
  const r = await h.soltar();
  assert.equal(r.texto, "");
  assert.equal(recs.length, 1, "no se abrió otro");
});

test("fallas vuelve a 0 si un reconocedor duró lo bastante: no hay 'mudo'", () => {
  const { Rec, recs } = falso();
  let t = 0;
  const fallos = [];
  const h = crearToma(Rec, { reloj: () => t, alFallo: c => fallos.push(c) });
  h.empezar();
  const cerrar = (i, dur) => { t += dur; recs[i].onend(); };
  let i = 0;
  for (let k = 0; k < 3; k++) cerrar(i++, 10);
  cerrar(i++, DICTADO.RAPIDO);
  for (let k = 0; k < 3; k++) cerrar(i++, 10);
  assert.deepEqual(fallos, []);
  assert.equal(h.fallas, 3);
  assert.equal(recs.length, 8, "sigue abriendo reconocedores");
});

test("soltar mientras el corte de 60 s espera su final: alCorte con lo dicho, y soltar sale con el trozo nuevo vacío", async () => {
  const { Rec, recs, oir } = falso();
  let t = 0;
  const cortes = [];
  const h = crearToma(Rec, { max: 1000, espera: 5000, reloj: () => t, alCorte: (texto, desde) => cortes.push([texto, desde]) });
  h.empezar();
  oir(recs[0], [["largo", true]]);
  t = 1000; h.tick();
  assert.equal(recs[0].parado, true);
  const p = h.soltar();
  t = 1010; recs[0].onend();
  const r = await p;
  assert.deepEqual(cortes, [["largo", 0]]);
  assert.equal(r.texto, "");
  assert.equal(r.desde, 1010);
  assert.equal(recs.length, 1, "no abre otro reconocedor");
});

test("stop() que lanza dentro de soltar(): sale de inmediato con lo que había y deja el reconocedor abortado", async () => {
  const { Rec, recs, oir } = falso();
  class Terco extends Rec { stop() { throw new Error("ya cerrado"); } }
  const h = crearToma(Terco, { espera: 60000 });
  h.empezar();
  oir(recs[0], [["algo", false]]);
  const r = await h.soltar();
  assert.equal(r.texto, "algo");
  assert.equal(recs[0].abortado, true);
  assert.equal(recs[0].onend, null);
});
