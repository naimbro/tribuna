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

test("limpiarParaVoz: si el corte cae justo en un fin de frase, no lo recorta de más", () => {
  const t = "Primera frase." + " Segunda frase larga que sigue después.";
  assert.equal(V.limpiarParaVoz(t, 14), "Primera frase.");
});

test("limpiarParaVoz: el corte también reconoce el fin de frase antes de un guillemet de cierre", () => {
  const t = "Dijo que sí.» " + "x".repeat(50);
  assert.equal(V.limpiarParaVoz(t, 20), "Dijo que sí.»");
});

test("limpiarParaVoz: quita emojis nuevos como ⏳ y ⌨️ (Extended_Pictographic)", () => {
  assert.equal(V.limpiarParaVoz("⏳ Tiempo ⌨️ listo"), "Tiempo listo");
});

test("limpiarParaVoz: '|' después de un fin de frase no duplica la puntuación", () => {
  assert.equal(V.limpiarParaVoz("¿Todo bien? | Sí"), "¿Todo bien? Sí");
  assert.equal(V.limpiarParaVoz("Listo. | Ahora sigue"), "Listo. Ahora sigue");
  assert.equal(V.limpiarParaVoz("Cuidado! | Ojo"), "Cuidado! Ojo");
  assert.equal(V.limpiarParaVoz("Uno | Dos"), "Uno. Dos");   // sin puntuación antes: sigue partiendo con punto
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

test("textoHablado: a un resumen sin punto final se le agrega uno antes de seguir", () => {
  const m = { tipo: "relator", datos: { resumenA: "Frenar la ley" } };
  assert.equal(V.textoHablado(m, EQ), "A FAVOR: Frenar la ley. Público: voten en su teléfono.");
});

test("textoHablado: con resúmenes largos (~35 palabras) cada uno se corta por su cuenta y el relator siempre pide el voto", () => {
  const largo = Array(35).fill("palabra").join(" ") + ".";  // ~35 palabras, bien sobre 140 caracteres con el rótulo
  const m = { tipo: "relator", datos: { resumenA: largo, resumenB: largo, disputa: largo } };
  const r = V.textoHablado(m, EQ);
  assert.ok(r.endsWith("Público: voten en su teléfono."), r);
  assert.ok(r.includes("En disputa:"), r);
  // cada segmento se cortó por su cuenta: no quedó el texto completo (280+ caracteres) tres veces
  assert.ok(r.length < largo.length * 3, r.length);
});

test("textoHablado: lo demás no se lee", () => {
  assert.equal(V.textoHablado({ tipo: "alumno", texto: "hola" }, EQ), "");
  assert.equal(V.textoHablado({ tipo: "noticia", texto: "hola" }, EQ), "");
});

test("trozosParaVoz: texto vacío da lista vacía", () => {
  assert.deepEqual(V.trozosParaVoz(""), []);
  assert.deepEqual(V.trozosParaVoz(null), []);
});

test("trozosParaVoz: si caben, junta varias oraciones cortas en un solo trozo", () => {
  const t = "Uno. Dos. Tres.";
  assert.deepEqual(V.trozosParaVoz(t, 100), [t]);
});

test("trozosParaVoz: agrupa oraciones en trozos de a lo más max, sin cortar ninguna palabra", () => {
  const frase = "Uno dos tres. Cuatro cinco seis siete ocho nueve diez once doce trece catorce quince.";
  const trozos = V.trozosParaVoz(frase, 30);
  assert.ok(trozos.length > 1, trozos.length);
  for (const tr of trozos) assert.ok(tr.length <= 30, `trozo largo: "${tr}" (${tr.length})`);
  const palabras = frase.replace(/[.]/g, "").split(/\s+/);
  const todas = trozos.join(" ").replace(/[.]/g, "");
  for (const p of palabras) assert.ok(todas.includes(p), `falta "${p}" en ${JSON.stringify(trozos)}`);
});

test("trozosParaVoz: una sola palabra más larga que max nunca se corta", () => {
  const larga = "x".repeat(250);
  const trozos = V.trozosParaVoz(larga, 180);
  assert.deepEqual(trozos, [larga]);
});

test("trozosParaVoz: chunks quedan por debajo de 180 por defecto (Chrome corta utterances largos)", () => {
  const t = Array(60).fill("palabra corta").join(". ") + ".";
  const trozos = V.trozosParaVoz(t);
  for (const tr of trozos) assert.ok(tr.length <= 180, tr.length);
  assert.ok(trozos.length > 1);
});

test("elegirVoz: prefiere es-CL, luego es-US, es-419, es-MX, es-ES; dentro de cada una, las de Google", () => {
  const v = (lang, name) => ({ lang, name });
  assert.equal(V.elegirVoz([v("en-US", "A"), v("es-ES", "Monica"), v("es-MX", "Paulina")]).name, "Paulina");
  assert.equal(V.elegirVoz([v("es-US", "x"), v("es-US", "Google español de Estados Unidos")]).name, "Google español de Estados Unidos");
  assert.equal(V.elegirVoz([v("es_CL", "y"), v("es-US", "Google")]).name, "y");
  assert.equal(V.elegirVoz([v("es-AR", "z")]).name, "z");
  assert.equal(V.elegirVoz([v("en-US", "A")]), null);
});
