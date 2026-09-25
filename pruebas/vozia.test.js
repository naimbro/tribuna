const test = require("node:test");
const assert = require("node:assert/strict");
const V = require("../vozia.js");

const EQ = { A: { nombre: "A FAVOR" }, B: { nombre: "EN CONTRA" } };

test("limpiarParaVoz: sin @, emojis ni markdown; pausas donde había barras", () => {
  assert.equal(V.limpiarParaVoz("🎙 @Hawley, senador Hawley, ¿de dónde *sale* eso?"), "Hawley, senador Hawley, ¿de dónde sale eso?");
  assert.equal(V.limpiarParaVoz("Uno | Dos"), "Uno. Dos");
  assert.equal(V.limpiarParaVoz("@Grupo 3 y @Grupo 4: su posición"), "Grupo 3 y Grupo 4: su posición");
});

test("limpiarParaVoz: corta en el último fin de frase antes del máximo", () => {
  const t = "Primera frase. " + "x".repeat(50) + ". Tercera.";
  assert.equal(V.limpiarParaVoz(t, 40), "Primera frase.");
  assert.equal(V.limpiarParaVoz("sin puntos " + "y".repeat(60), 20).length <= 21, true);
});

test("textoHablado: la moderadora dice su mensaje; la pregunta de la tribuna pide que la lea su autor", () => {
  assert.equal(V.textoHablado({ tipo: "mod", texto: "@Huang, ¿qué le responde?" }, EQ), "Huang, ¿qué le responde?");
  const trib = { tipo: "mod", texto: "✋ La tribuna pregunta — Ana Pérez (Musk): «¿y China?»", datos: { tribuna: "pregunta", nombre: "Ana Pérez" } };
  assert.equal(V.textoHablado(trib, EQ), "Pregunta de la tribuna. Ana, léela en voz alta, por favor.");
});

test("textoHablado: el relator dice los dos resúmenes y la disputa, y pide el voto", () => {
  const m = { tipo: "relator", texto: "…", datos: { resumenA: "Frenar.", resumenB: "Acelerar.", disputa: "Quién paga.", revisar: ["x"], criterios: ["y"] } };
  assert.equal(V.textoHablado(m, EQ), "A FAVOR: Frenar. EN CONTRA: Acelerar. En disputa: Quién paga. Público: voten en su teléfono.");
});

test("textoHablado: lo demás no se lee", () => {
  assert.equal(V.textoHablado({ tipo: "alumno", texto: "hola" }, EQ), "");
  assert.equal(V.textoHablado({ tipo: "noticia", texto: "hola" }, EQ), "");
});

test("elegirVoz: prefiere es-CL, luego es-US, es-419, es-MX, es-ES; dentro de cada una, las de Google", () => {
  const v = (lang, name) => ({ lang, name });
  assert.equal(V.elegirVoz([v("en-US", "A"), v("es-ES", "Monica"), v("es-MX", "Paulina")]).name, "Paulina");
  assert.equal(V.elegirVoz([v("es-US", "x"), v("es-US", "Google español de Estados Unidos")]).name, "Google español de Estados Unidos");
  assert.equal(V.elegirVoz([v("es_CL", "y"), v("es-US", "Google")]).name, "y");
  assert.equal(V.elegirVoz([v("es-AR", "z")]).name, "z");
  assert.equal(V.elegirVoz([v("en-US", "A")]), null);
});
