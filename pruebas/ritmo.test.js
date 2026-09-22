const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../ritmo.js");

const T0 = 1_000_000;
const mod = (s, texto) => ({ tipo: "mod", t: T0 + s * 1000, texto });
const alu = (s, nombre, texto, equipo = "A", grupo = 3) => ({ tipo: "alumno", t: T0 + s * 1000, nombre, texto, equipo, grupo });
const roster = [
  { nombre: "pablo concha", equipo: "B", grupo: 5 }, { nombre: "Pablo Sandoval", equipo: "B", grupo: 5 },
  { nombre: "consuelo vera", equipo: "A", grupo: 3 }, { nombre: "Andrés Bermúdez", equipo: "A", grupo: 3 }
];

test("mencionaA: nombre completo, primer nombre y grupo", () => {
  R.cargarApellidos(roster.map(r => r.nombre));
  assert.ok(R.mencionaA("@pablo concha, todavía no te leemos", "pablo concha"));
  assert.ok(!R.mencionaA("@pablo concha, todavía no te leemos", "Pablo Sandoval"), "«@pablo concha» no es Pablo Sandoval");
  assert.ok(R.mencionaA("@Pablo, ¿de dónde sale eso?", "Pablo Sandoval"));
  assert.ok(R.mencionaA("@Pablo qué opinas", "Pablo Sandoval"));
  assert.ok(R.mencionaA("@Andres Bermudez, ¿y eso?", "Andrés Bermúdez"), "sin tildes también");
  assert.ok(!R.mencionaA("@pablito ven", "pablo concha"));
  assert.ok(R.mencionaA("@Grupo 5, ¿qué le responden?", "Pablo Sandoval", 5));
  assert.ok(!R.mencionaA("@Grupo 15, ¿qué le responden?", "Pablo Sandoval", 1));
  assert.ok(!R.mencionaA("@Grupo 3, ¿qué le responden?", "Pablo Sandoval", 5));
});

test("42RT: tres mensajes seguidos a quien no contesta → callada hasta que alguien escriba", () => {
  const msgs = [mod(0, "Debate 2: … @Alonso y @Giuliana: su posición en una frase."),
    mod(30, "@pablo concha, todavía no te leemos en este debate. ¿Qué agregarías a lo que dijo el otro lado?")];
  let e = R.leerTramo(msgs, roster, T0 + 60000);
  // la segunda insistencia no llega a los 30 s de la primera: con dos seguidas espera 90 s
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 60000, abre: T0 }).toca, false);
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 30000 + 90000, abre: T0 }).toca, true);
  msgs.push(mod(120, "@Grupo 5, ¿qué responden?"));
  e = R.leerTramo(msgs, roster, T0 + 400000);
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 400000, abre: T0 }).toca, false, "tres sin respuesta: espera");
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 400000, abre: T0, forzar: true }).toca, true, "el profesor puede forzarla");
});

test("42RT: la avisan de que Consuelo no está → ya no la nombra", () => {
  const msgs = [mod(0, "@consuelo vera, todavía no te leemos en este debate."), alu(20, "Naim", "@consuelo vera no está moderadora", "B", 2)];
  const e = R.leerTramo(msgs, [...roster, { nombre: "Naim", equipo: "B", grupo: 2 }], T0 + 400000);
  assert.ok(e.alumnos.find(p => p.nombre === "consuelo vera").ausente);
  assert.ok(!R.nombrables(e, { ahora: T0 + 400000, abre: T0 }).some(p => p.nombre === "consuelo vera"));
});

test("dos llamados sin respuesta la dan por ausente; si escribe, vuelve", () => {
  const msgs = [mod(0, "@pablo concha, ¿qué opinas?"), mod(60, "@pablo concha, ¿sigues ahí?")];
  let e = R.leerTramo(msgs, roster, T0 + 400000);
  assert.ok(e.alumnos.find(p => p.nombre === "pablo concha").ausente);
  msgs.push(alu(90, "pablo concha", "sí, estoy", "B", 5));
  e = R.leerTramo(msgs, roster, T0 + 400000);
  assert.ok(!e.alumnos.find(p => p.nombre === "pablo concha").ausente);
});

test("no interrumpe una conversación que fluye y no nombra a nadie en los primeros 2 minutos", () => {
  const msgs = [mod(0, "abre"), alu(20, "Andrés Bermúdez", "uno"), alu(26, "Pablo Sandoval", "dos", "B", 5), alu(31, "Andrés Bermúdez", "tres")];
  const e = R.leerTramo(msgs, roster, T0 + 35000);
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 35000, abre: T0 }).toca, false, "hace 4 s que escribieron");
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 40000, abre: T0 }).toca, true, "tres mensajes y una pausa");
  assert.deepEqual(R.nombrables(e, { ahora: T0 + 40000, abre: T0 }), []);
  const tarde = R.nombrables(e, { ahora: T0 + 130000, abre: T0 }).map(p => p.nombre).sort();
  assert.deepEqual(tarde, ["consuelo vera", "pablo concha"], "pasados 2 minutos, solo quienes no han escrito");
});

test("esRepetida: la misma pregunta con otro @ cuenta como repetida", () => {
  const previas = ["@Naim, ¿de qué lectura sale eso? Nombra el autor o el dato. Y @consuelo vera, ¿cómo le responde tu bancada?"];
  assert.ok(R.esRepetida("@Andrés Bermúdez, ¿de qué lectura sale eso? Nombra el autor o el dato. Y @Alonso Ruiz Tagle, ¿cómo le responde tu bancada?", previas));
  assert.ok(!R.esRepetida("@Grupo 5, si las cuotas frenan la automatización, ¿quién paga ese costo?", previas));
});
