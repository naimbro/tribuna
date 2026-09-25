const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const B = require("../brujula.js");

// Los archivos de semana son scripts clásicos con const: se evalúan en un contexto y se leen.
function cargar(archivo) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", archivo), "utf8") + "\n;this.BRUJULA = typeof BRUJULA === 'undefined' ? null : BRUJULA;", ctx);
  return ctx.BRUJULA;
}

test("semana 7: brújula corta de 6 preguntas, 3 por eje, cada una sobre un solo eje", () => {
  const b = cargar("contenido/semana7.js");
  assert.ok(b, "semana7.js no define BRUJULA");
  assert.equal(b.preguntas.length, 6);
  for (const p of b.preguntas) {
    assert.equal(p.opciones.length, 4, p.id);
    // cortas: se leen en el teléfono en ~10 s (investigación del 23-sep-2026)
    assert.ok(p.texto.length <= 120, `${p.id}: enunciado de ${p.texto.length} caracteres`);
    for (const o of p.opciones) assert.ok(o.texto.length <= 50, `${p.id}: opción de ${o.texto.length} caracteres: ${o.texto}`);
    const eje = typeof p.opciones[0].x === "number" ? "x" : "y";
    const vs = p.opciones.map(o => o[eje]);
    assert.ok(vs.every(v => typeof v === "number"), `${p.id}: opciones en ejes distintos`);
    assert.ok(vs.every((v, i) => i === 0 || v > vs[i - 1]), `${p.id}: opciones desordenadas`);
    assert.ok(vs[0] < 0 && vs[3] > 0, `${p.id}: no cubre los dos extremos`);
  }
  const ejes = b.preguntas.map(p => typeof p.opciones[0].x === "number" ? "x" : "y");
  assert.equal(ejes.filter(e => e === "x").length, 3);
  assert.equal(ejes.filter(e => e === "y").length, 3);
  assert.equal(b.campos.length, 4);
  for (const c of b.campos) assert.ok(c.id && c.nombre && c.afirma && c.color && c.centro, c.id);
  const extremos = [0, 3].flatMap(i => [0, 3].map(j => Object.fromEntries(b.preguntas.map(p => [p.id, typeof p.opciones[0].x === "number" ? i : j]))));
  assert.equal(new Set(extremos.map(r => B.campoDe(B.posicion(r, b.preguntas), b.campos))).size, 4);
});

test("semana 7: La Tercera, Acemoglu, cinco jueces y preguntas semilla", () => {
  const s = cargarSesion("contenido/semana7.js");
  assert.ok(s.CONCEPTOS.some(c => /La Tercera/.test(c.fuente)), "ningún concepto del reportaje");
  assert.ok(s.CONCEPTOS.some(c => /Acemoglu/.test(c.fuente)), "ningún concepto de Acemoglu");
  for (const n of ["serrano", "girardi", "kaiser", "acemoglu"]) assert.ok(s.FUENTES.includes(n), n);
  assert.equal(s.JUECES.length, 5);
  // el piso común va una vez (JUECES_COMUN) y cada juez tiene un foco propio, sin repetirlo
  assert.match(s.JUECES_COMUN, /instrumento/);
  for (const j of s.JUECES) assert.ok(!j.valora.includes(s.JUECES_COMUN.slice(0, 40)), `${j.id} repite el piso común`);
  assert.equal(new Set(s.JUECES.map(j => j.valora.split(/\s+/).slice(0, 4).join(" "))).size, 5, "dos jueces parten igual");
  assert.ok(s.PREGUNTAS.length >= 4, "faltan preguntas semilla");
  // cada pregunta escrita dice qué campo de la brújula afirma, y ese campo existe
  const campos = new Set(s.BRUJULA.campos.map(c => c.id));
  for (const p of s.PREGUNTAS) assert.ok(p.texto && campos.has(p.afirma), `pregunta sin campo válido: ${JSON.stringify(p)}`);
  // el minuto de preparación: cada lado lee su postura en una frase (la postura, no el argumento)
  for (const p of s.PREGUNTAS) for (const k of ["favor", "contra"])
    assert.ok(p[k] && p[k].length >= 30 && p[k].length <= 200, `${k} de «${p.texto.slice(0, 30)}…»`);
  assert.ok(s.INSTRUMENTOS.length >= 4 && s.INSTRUMENTOS.every(x => x.nombre && x.ej), "INSTRUMENTOS incompleto");
  assert.equal(s.SESION.grupos, 5);
});

test("semana 5: sin brújula, el juego queda con la elección a mano", () => {
  assert.equal(cargar("contenido/semana5.js"), null);
});

/* --- MGT300, clase 7 (archivo semana307.js) ---------------------------- */

// Carga completa de un archivo de semana: los bloques opcionales quedan en null.
function cargarSesion(archivo) {
  const ctx = {};
  vm.createContext(ctx);
  const opc = ["BRUJULA", "JUECES", "JUECES_COMUN", "INSTRUMENTOS", "EJEMPLOS_SESION", "PREGUNTAS", "PERSONAJES"]
    .map(k => `${k}: typeof ${k} === 'undefined' ? null : ${k}`).join(", ");
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", archivo), "utf8") +
    `\n;this.S = { SESION, RONDAS, RUBRICA, CONCEPTOS, FUENTES, AUDIENCIA, EVENTOS, EQUIPOS, ${opc} };`, ctx);
  return ctx.S;
}

const SEMANAS = ["contenido/semana5.js", "contenido/semana7.js", "contenido/semana307.js", "contenido/semana308.js", "contenido/semana402.js"];

test("toda semana: los pesos `mueve` y los `efecto` apuntan a ids que existen", () => {
  for (const archivo of SEMANAS) {
    const s = cargarSesion(archivo);
    const conceptos = new Set(s.CONCEPTOS.map(c => c.id));
    const bloques = new Set(s.AUDIENCIA.map(p => p.id));
    for (const p of s.AUDIENCIA)
      for (const k of Object.keys(p.mueve))
        assert.ok(conceptos.has(k), `${archivo}: ${p.id}.mueve.${k} no es un concepto`);
    for (const e of s.EVENTOS)
      for (const k of Object.keys(e.efecto))
        assert.ok(bloques.has(k), `${archivo}: evento ${e.id} mueve a "${k}", que no es un bloque`);
  }
});

test("toda semana: las dos invariantes de la audiencia del README", () => {
  const INDECISO = 8;                                   // |pos| <= 8 es estar indeciso (app.js)
  for (const archivo of SEMANAS) {
    const { AUDIENCIA } = cargarSesion(archivo);
    const suma = f => AUDIENCIA.filter(f).reduce((n, p) => n + p.votos, 0);
    const favor = suma(p => p.pos > INDECISO), contra = suma(p => p.pos < -INDECISO);
    const indecisos = suma(p => Math.abs(p.pos) <= INDECISO);
    // 1. votación inicial apretada y con muchos indecisos
    assert.ok(Math.abs(favor - contra) <= 3, `${archivo}: abre ${favor}–${contra}, no está apretada`);
    assert.ok(indecisos >= favor + contra, `${archivo}: sólo ${indecisos} indecisos`);
    // 2. al menos un bloque grande premia poco la rúbrica, para que los marcadores diverjan
    assert.ok(AUDIENCIA.some(p => p.votos >= 5 && p.peso_rigor <= 0.5),
      `${archivo}: ningún bloque grande con peso_rigor bajo`);
  }
});

test("clase 7 de MGT300: curso propio, ejemplos, jueces y conceptos de los dos textos", () => {
  const s = cargarSesion("contenido/semana307.js");
  assert.equal(s.SESION.semana, 307);
  assert.match(s.SESION.curso, /^MGT300/);
  // el manifiesto la ofrece y su curso coincide con el del archivo
  const man = {};
  vm.createContext(man);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "contenido/sesiones.js"), "utf8") + "\n;this.SESIONES = SESIONES;", man);
  const fila = man.SESIONES.find(x => x.semana === 307);
  assert.ok(fila, "semana 307 no está en contenido/sesiones.js");
  assert.equal(fila.curso, s.SESION.curso);
  assert.equal(new Set(man.SESIONES.map(x => x.semana)).size, man.SESIONES.length, "hay semanas repetidas");
  // sólo se juzga lo leído: cada concepto dice de qué documento sale
  assert.ok(s.CONCEPTOS.length >= 12);
  for (const c of s.CONCEPTOS) {
    assert.ok(c.id && c.etiqueta && c.fuente && c.claves.length, c.id);
    assert.ok([-1, 0, 1].includes(c.lado), `${c.id}: lado ${c.lado}`);
    assert.match(c.fuente, /La Tercera|NYT|Exposición|Guía de lectura/, `${c.id}: fuente sin documento`);
  }
  assert.ok(s.CONCEPTOS.some(c => /La Tercera/.test(c.fuente)), "ningún concepto del reportaje");
  assert.ok(s.CONCEPTOS.filter(c => /NYT/.test(c.fuente)).length >= 6, "menos de 6 conceptos del mapa del NYT");
  // los cinco jueces premian nombrar a una persona real y decir qué instrumento pide
  assert.equal(s.JUECES.length, 5);
  for (const j of s.JUECES) assert.match(j.valora, /instrumento/, j.id);
  // los ejemplos separan los marcadores: la arenga no atribuye, el manual sí
  for (const r of ["apertura", "refutacion", "cierre"])
    for (const k of ["A", "B"]) assert.ok(s.EJEMPLOS_SESION[r][k].length > 200, `${r}.${k}`);
  assert.ok(s.PREGUNTAS.length >= 3, "faltan mociones semilla para la moderadora");
});

test("clase 7 de MGT300: brújula de 5 preguntas, dos ejes y 4 campos chilenos", () => {
  const b = cargar("contenido/semana307.js");
  assert.ok(b, "semana307.js no define BRUJULA");
  assert.equal(b.preguntas.length, 5);
  for (const p of b.preguntas) {
    assert.equal(p.opciones.length, 4, p.id);
    // cada pregunta puntúa en un solo eje, y sus opciones van de un extremo al otro
    const eje = typeof p.opciones[0].x === "number" ? "x" : "y";
    const vs = p.opciones.map(o => o[eje]);
    assert.ok(vs.every(v => typeof v === "number"), `${p.id}: opciones en ejes distintos`);
    assert.ok(vs.every((v, i) => i === 0 || v > vs[i - 1]), `${p.id}: opciones desordenadas`);
    assert.ok(vs[0] < 0 && vs[3] > 0, `${p.id}: no cubre los dos extremos`);
    for (const o of p.opciones) assert.ok(o.texto.length > 40, `${p.id}: opción muy corta`);
  }
  const ejes = b.preguntas.map(p => typeof p.opciones[0].x === "number" ? "x" : "y");
  assert.ok(ejes.filter(e => e === "x").length >= 2 && ejes.filter(e => e === "y").length >= 2,
    "un eje queda con menos de dos preguntas");
  assert.equal(b.campos.length, 4);
  for (const c of b.campos) assert.ok(c.id && c.nombre && c.afirma && c.color && c.centro, c.id);
  // cada combinación extrema cae en un campo distinto
  const extremos = [0, 3].flatMap(i => [0, 3].map(j => Object.fromEntries(b.preguntas.map(p => [p.id, typeof p.opciones[0].x === "number" ? i : j]))));
  assert.equal(new Set(extremos.map(r => B.campoDe(B.posicion(r, b.preguntas), b.campos))).size, 4);
});

/* --- Doctorado, Usos de la IA en Investigación Académica, clase 2 (semana402.js) --- */

test("clase 2 del doctorado: brújula corta de 6 preguntas, 3 por eje, cada una sobre un solo eje", () => {
  const b = cargar("contenido/semana402.js");
  assert.ok(b, "semana402.js no define BRUJULA");
  assert.equal(b.preguntas.length, 6);
  for (const p of b.preguntas) {
    assert.equal(p.opciones.length, 4, p.id);
    assert.ok(p.texto.length <= 120, `${p.id}: enunciado de ${p.texto.length} caracteres`);
    for (const o of p.opciones) assert.ok(o.texto.length <= 50, `${p.id}: opción de ${o.texto.length} caracteres: ${o.texto}`);
    const eje = typeof p.opciones[0].x === "number" ? "x" : "y";
    const vs = p.opciones.map(o => o[eje]);
    assert.ok(vs.every(v => typeof v === "number"), `${p.id}: opciones en ejes distintos`);
    assert.ok(vs.every((v, i) => i === 0 || v > vs[i - 1]), `${p.id}: opciones desordenadas`);
    assert.ok(vs[0] < 0 && vs[3] > 0, `${p.id}: no cubre los dos extremos`);
  }
  const ejes = b.preguntas.map(p => typeof p.opciones[0].x === "number" ? "x" : "y");
  assert.equal(ejes.filter(e => e === "x").length, 3);
  assert.equal(ejes.filter(e => e === "y").length, 3);
  assert.equal(b.campos.length, 4);
  for (const c of b.campos) assert.ok(c.id && c.nombre && c.afirma && c.color && c.centro, c.id);
  const extremos = [0, 3].flatMap(i => [0, 3].map(j => Object.fromEntries(b.preguntas.map(p => [p.id, typeof p.opciones[0].x === "number" ? i : j]))));
  assert.equal(new Set(extremos.map(r => B.campoDe(B.posicion(r, b.preguntas), b.campos))).size, 4);
});

test("clase 2 del doctorado: las dos lecturas, cinco jueces, preguntas con campo y 3 grupos", () => {
  const s = cargarSesion("contenido/semana402.js");
  assert.equal(s.SESION.semana, 402);
  assert.equal(s.SESION.grupos, 3);
  // el manifiesto la ofrece y su curso coincide con el del archivo
  const man = {};
  vm.createContext(man);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "contenido/sesiones.js"), "utf8") + "\n;this.SESIONES = SESIONES;", man);
  const fila = man.SESIONES.find(x => x.semana === 402);
  assert.ok(fila, "semana 402 no está en contenido/sesiones.js");
  assert.equal(fila.curso, s.SESION.curso);
  // sólo se juzga lo leído: cada concepto dice de qué texto sale, y están las dos lecturas
  assert.ok(s.CONCEPTOS.length >= 12 && s.CONCEPTOS.length <= 16, `${s.CONCEPTOS.length} conceptos`);
  for (const c of s.CONCEPTOS) {
    assert.ok(c.id && c.etiqueta && c.fuente && c.claves.length, c.id);
    assert.ok([-1, 0, 1].includes(c.lado), `${c.id}: lado ${c.lado}`);
    assert.match(c.fuente, /Mollick|Karpf|Bloque 1/, `${c.id}: fuente sin texto`);
  }
  assert.ok(s.CONCEPTOS.some(c => /^Mollick/.test(c.fuente)), "ningún concepto de Mollick");
  assert.ok(s.CONCEPTOS.some(c => /^Karpf/.test(c.fuente)), "ningún concepto de Karpf");
  for (const n of ["mollick", "karpf"]) assert.ok(s.FUENTES.includes(n), n);
  assert.equal(s.JUECES.length, 5);
  // el piso común va una vez (JUECES_COMUN) y cada juez tiene un foco propio, sin repetirlo
  assert.match(s.JUECES_COMUN, /agente/);
  for (const j of s.JUECES) assert.ok(!j.valora.includes(s.JUECES_COMUN.slice(0, 40)), `${j.id} repite el piso común`);
  assert.equal(new Set(s.JUECES.map(j => j.valora.split(/\s+/).slice(0, 4).join(" "))).size, 5, "dos jueces parten igual");
  // las preguntas escritas dicen qué campo de la brújula afirman, y ese campo existe
  assert.ok(s.PREGUNTAS.length >= 1, "falta la pregunta del primer debate");
  const campos = new Set(s.BRUJULA.campos.map(c => c.id));
  for (const p of s.PREGUNTAS) assert.ok(p.texto && campos.has(p.afirma), `pregunta sin campo válido: ${JSON.stringify(p)}`);
  // los ejemplos separan los marcadores: la arenga no atribuye, el manual sí
  for (const r of ["apertura", "refutacion", "cierre"])
    for (const k of ["A", "B"]) assert.ok(s.EJEMPLOS_SESION[r][k].length > 200, `${r}.${k}`);
});

/* --- MGT300, clase 8 (semana308.js): seis personajes, tres duelos --------- */

test("clase 8 de MGT300: sin brújula, seis personajes y tres duelos fijos que calzan", () => {
  const s = cargarSesion("contenido/semana308.js");
  assert.equal(s.SESION.semana, 308);
  assert.match(s.SESION.curso, /^MGT300/);
  assert.equal(s.BRUJULA, null, "la clase 8 se agrupa por personaje, no por brújula");
  const man = {};
  vm.createContext(man);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "contenido/sesiones.js"), "utf8") + "\n;this.SESIONES = SESIONES;", man);
  const fila = man.SESIONES.find(x => x.semana === 308);
  assert.ok(fila, "semana 308 no está en contenido/sesiones.js");
  assert.equal(fila.curso, s.SESION.curso);
  // personajes: únicos, con lo que necesitan las pantallas, y la regla de Firestore admite grupo 1..10
  const P = s.PERSONAJES;
  assert.equal(P.length, 6);
  assert.equal(new Set(P.map(p => p.id)).size, 6);
  assert.equal(new Set(P.map(p => p.corto.toLowerCase())).size, 6);
  for (const p of P) assert.ok(p.id && p.nombre && p.corto && p.trato && p.cargo && /^#[0-9a-f]{6}$/i.test(p.color), p.id);
  // tres duelos, cada personaje en exactamente uno, y su duelo/lado coinciden con PREGUNTAS
  assert.equal(s.PREGUNTAS.length, 3);
  const vistos = [];
  s.PREGUNTAS.forEach((q, i) => {
    assert.ok(q.texto && q.favor && q.contra, `duelo ${i + 1}`);
    for (const k of ["A", "B"]) {
      const p = P.find(x => x.id === q.duelo[k]);
      assert.ok(p, `duelo ${i + 1}: ${q.duelo[k]} no es un personaje`);
      assert.equal(p.duelo, i + 1, `${p.id}: duelo`);
      assert.equal(p.lado, k, `${p.id}: lado`);
      vistos.push(p.id);
    }
  });
  assert.equal(vistos.sort().join(), [...P.map(p => p.id)].sort().join());
});

test("clase 8 de MGT300: conceptos anclados a un dossier o a una lámina, y jueces de fidelidad", () => {
  const s = cargarSesion("contenido/semana308.js");
  for (const c of s.CONCEPTOS) {
    assert.ok(c.id && c.etiqueta && c.fuente && c.claves.length, c.id);
    assert.ok([-1, 0, 1].includes(c.lado), `${c.id}: lado ${c.lado}`);
    assert.match(c.fuente, /[Dd]ossier|Exposición, lámina/, `${c.id}: fuente sin dossier ni lámina`);
  }
  // las seis ideas de Acemoglu que se proyectaron, cada una en su lámina
  assert.equal(s.CONCEPTOS.filter(c => /Exposición, lámina/.test(c.fuente)).length, 6);
  // las contradicciones que más sirven en sala
  for (const id of ["nvidia_anthropic", "spacex_anthropic", "altman_licencias", "diagnostico_comun"])
    assert.ok(s.CONCEPTOS.some(c => c.id === id), id);
  // fuentes: los seis y los demás nombrados en los dossiers
  for (const f of ["huang", "amodei", "hawley", "altman", "sanders", "musk", "klein", "hinton", "selsam", "sacks", "durbin",
                   "bessent", "fetterman", "acemoglu", "the economist", "new york times", "hugging face"])
    assert.ok(s.FUENTES.includes(f), f);
  // el piso común es la fidelidad al personaje; cada juez, un foco propio que no lo repite
  assert.match(s.JUECES_COMUN, /fidelidad al personaje/);
  assert.match(s.JUECES_COMUN, /inventar una cita/);
  assert.equal(s.JUECES.length, 5);
  for (const j of s.JUECES) assert.ok(!j.valora.includes(s.JUECES_COMUN.slice(0, 40)), `${j.id} repite el piso común`);
  assert.equal(new Set(s.JUECES.map(j => j.valora.split(/\s+/).slice(0, 4).join(" "))).size, 5, "dos jueces parten igual");
  // cinco titulares de última hora
  assert.equal(s.EVENTOS.length, 5);
  // los ejemplos separan los marcadores: la arenga no nombra a nadie del dossier, la apertura en personaje sí
  for (const r of ["apertura", "refutacion", "cierre"])
    for (const k of ["A", "B"]) assert.ok(s.EJEMPLOS_SESION[r][k].length > 200, `${r}.${k}`);
  const norm = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fuentesEn = t => s.FUENTES.filter(f => norm(t).includes(f));
  assert.equal(fuentesEn(s.EJEMPLOS_SESION.apertura.A).join(), "", "la arenga no debería citar a nadie");
  assert.ok(fuentesEn(s.EJEMPLOS_SESION.apertura.B).length >= 3, "la apertura en personaje debería citar");
});
