const test = require("node:test");
const assert = require("node:assert/strict");
const R = require("../rotacion.js");

test("emparejar: con menos de dos grupos no hay debate", () => {
  assert.equal(R.emparejar([], []), null);
  assert.equal(R.emparejar([3], []), null);
  assert.equal(R.emparejar([3, 3], []), null);
});

test("emparejar: nadie debate dos veces más que otro, para 2 a 8 grupos", () => {
  for (let g = 2; g <= 8; g++) {
    const grupos = Array.from({ length: g }, (_, i) => i + 1), debates = [];
    for (let k = 0; k < 20; k++) {
      const p = R.emparejar(grupos, debates);
      assert.notEqual(p.A, p.B);
      debates.push(p);
      const n = grupos.map(x => debates.filter(d => d.A === x || d.B === x).length);
      assert.ok(Math.max(...n) - Math.min(...n) <= 1, `g=${g} k=${k} cuentas=${n}`);
    }
  }
});

test("emparejar: no repite pareja mientras haya alternativas", () => {
  const grupos = [1, 2, 3, 4], debates = [];
  for (let k = 0; k < 4; k++) debates.push(R.emparejar(grupos, debates));
  const parejas = debates.map(d => [d.A, d.B].sort().join("-"));
  assert.equal(new Set(parejas).size, parejas.length);
});

test("emparejar: alterna el lado A FAVOR", () => {
  const debates = [];
  for (let k = 0; k < 6; k++) debates.push(R.emparejar([1, 2], debates));
  const vecesA1 = debates.filter(d => d.A === 1).length;
  assert.equal(vecesA1, 3);
});

test("emparejar: ignora grupos que no están disponibles", () => {
  const p = R.emparejar([2, 5], [{ A: 1, B: 3 }]);
  assert.deepEqual([p.A, p.B].sort(), [2, 5]);
});

test("ranking: ordena por puntaje promedio, desempata por jurado, deja al final a quien no debatió", () => {
  const res = (a, b) => ({ A: a, B: b });
  const debates = [
    { A: 1, B: 2, res: res({ jurado: 80, publico: 60, puntaje: 70 }, { jurado: 40, publico: 40, puntaje: 40 }) },
    { A: 3, B: 4, res: res({ jurado: 60, publico: 80, puntaje: 70 }, { jurado: 50, publico: 20, puntaje: 35 }) },
    { A: 1, B: 3, res: null }
  ];
  const r = R.ranking(5, debates);
  assert.deepEqual(r.map(f => f.grupo), [1, 3, 2, 4, 5]);
  assert.equal(r[0].puesto, 1);
  assert.equal(r[4].puesto, null);
  assert.equal(r[4].debates, 0);
  assert.equal(r[1].distincion, "publico");
});

test("proximaPreguntaEscrita: devuelve la primera no usada, como { texto, afirma }", () => {
  assert.deepEqual(R.proximaPreguntaEscrita(["a", "b"], ["a"]), { texto: "b", afirma: null });
  assert.equal(R.proximaPreguntaEscrita(["a"], ["a"]), null);
  assert.equal(R.proximaPreguntaEscrita(undefined, []), null);
  // con el campo que afirma; las usadas se comparan por texto, vengan como texto u objeto
  const ps = [{ texto: "Ley ya.", afirma: "ley_antes" }, { texto: "Sin trabas.", afirma: "sin_trabas" }];
  assert.deepEqual(R.proximaPreguntaEscrita(ps, []), { texto: "Ley ya.", afirma: "ley_antes" });
  assert.deepEqual(R.proximaPreguntaEscrita(ps, [" ley ya. "]), { texto: "Sin trabas.", afirma: "sin_trabas" });
  assert.equal(R.proximaPreguntaEscrita(ps, [ps[0], ps[1]]), null);
});

test("mejorIntervencion: la nota más alta", () => {
  const m = R.mejorIntervencion([{ autor: "x", grupo: 1, debate: 1, total: 12 }, { autor: "y", grupo: 2, debate: 1, total: 17 }]);
  assert.equal(m.autor, "y");
  assert.equal(R.mejorIntervencion([]), null);
});

test("panelJueces: con cinco notas descarta la más alta y la más baja", () => {
  const p = R.panelJueces([
    { id: "a", A: 8, B: 6 }, { id: "b", A: 7, B: 7 }, { id: "c", A: 9, B: 5 }, { id: "d", A: 6, B: 7 }, { id: "e", A: 8, B: 4 }
  ]);
  assert.equal(p.A.total, 23);                       // 8 + 7 + 8 (sin 9 y 6)
  assert.deepEqual(p.A.descartadas, ["c", "d"]);
  assert.equal(p.B.total, 18);                       // notas 6,7,5,7,4: se tachan el 7 de índice 1 y el 4 → 6 + 5 + 7
  assert.deepEqual(p.B.descartadas, ["b", "e"]);
  assert.equal(p.ganador, "A");
});

test("panelJueces: descarte determinista con notas repetidas", () => {
  const p = R.panelJueces([{ id: "a", A: 5, B: 1 }, { id: "b", A: 5, B: 1 }, { id: "c", A: 5, B: 1 }, { id: "d", A: 5, B: 1 }, { id: "e", A: 5, B: 1 }]);
  assert.deepEqual(p.A.descartadas, ["a", "e"]);     // alta: la de menor índice; baja: la de mayor índice
  assert.equal(p.A.total, 15);
});

test("panelJueces: con cuatro notas escala las dos del medio", () => {
  const p = R.panelJueces([{ id: "a", A: 8, B: 5 }, { id: "b", A: null, B: null }, { id: "c", A: 6, B: 5 }, { id: "d", A: 4, B: 5 }, { id: "e", A: 10, B: 5 }]);
  assert.equal(p.A.total, (8 + 6) * 3 / 2);
  assert.equal(p.B.total, 15);
});

test("panelJueces: con tres o menos promedia por tres; sin notas no hay total", () => {
  const p = R.panelJueces([{ id: "a", A: 9, B: 3 }, { id: "b", A: 6, B: null }, { id: "c", A: null, B: null }]);
  assert.equal(p.A.total, 22.5);
  assert.equal(p.B.total, 9);
  assert.deepEqual(p.A.descartadas, []);
  const vacio = R.panelJueces([{ id: "a", A: null, B: null }]);
  assert.equal(vacio.A.total, null);
  assert.equal(vacio.ganador, null);
});

test("panelJueces: totales iguales es empate", () => {
  const p = R.panelJueces([{ id: "a", A: 7, B: 7 }, { id: "b", A: 5, B: 5 }, { id: "c", A: 6, B: 6 }]);
  assert.equal(p.ganador, null);
});

test("votoPublico: cuenta votos, ignora a quien no votó y declara empate", () => {
  const v = R.votoPublico(["A", "B", "A", null, "A"]);
  assert.deepEqual([v.A, v.B, v.n, v.ganador], [3, 1, 4, "A"]);
  assert.equal(v.parteA, 75);
  assert.equal(v.parteB, 25);
  assert.equal(R.votoPublico(["A", "B"]).ganador, null);
  const nadie = R.votoPublico([null, null]);
  assert.deepEqual([nadie.n, nadie.parteA, nadie.ganador], [0, 50, null]);
});

test("puntajeDebate: mitad jueces, mitad público", () => {
  const panel = { A: { total: 24 }, B: { total: 15 }, ganador: "A" };
  const r = R.puntajeDebate({ panel, publico: R.votoPublico(["A", "B", "B", "B"]) });
  assert.equal(r.A.jurado, 80);
  assert.equal(r.A.publico, 25);
  assert.equal(r.A.puntaje, 52.5);
  assert.equal(r.B.puntaje, 0.5 * 50 + 0.5 * 75);
  assert.equal(r.ganador, null);                     // jueces A, público B → empate
});

test("puntajeDebate: sin votantes cuentan solo los jueces; sin jueces, solo el público; sin nada, 50", () => {
  const panel = { A: { total: 21 }, B: { total: 9 }, ganador: "A" };
  const soloJ = R.puntajeDebate({ panel, publico: R.votoPublico([]) });
  assert.equal(soloJ.A.puntaje, 70);
  assert.equal(soloJ.A.publico, null);
  assert.equal(soloJ.ganador, "A");
  const sinJ = { A: { total: null }, B: { total: null }, ganador: null };
  const soloP = R.puntajeDebate({ panel: sinJ, publico: R.votoPublico(["B"]) });
  assert.equal(soloP.B.puntaje, 100);
  assert.equal(soloP.A.jurado, null);
  assert.equal(soloP.ganador, "B");
  assert.equal(R.puntajeDebate({ panel: sinJ, publico: R.votoPublico([]) }).A.puntaje, 50);
});

test("ranking: promedia jueces ignorando debates sin jueces", () => {
  const debates = [
    { A: 1, B: 2, res: { A: { jurado: 80, publico: 50, puntaje: 65 }, B: { jurado: 20, publico: 50, puntaje: 35 } } },
    { A: 1, B: 3, res: { A: { jurado: null, publico: 100, puntaje: 100 }, B: { jurado: null, publico: 0, puntaje: 0 } } }
  ];
  const g1 = R.ranking(3, debates).find(f => f.grupo === 1);
  assert.equal(g1.jurado, 80);
  assert.equal(g1.puntaje, 82.5);
});

test("acumularOraculos: suma aciertos, ignora empates y a quien no predijo", () => {
  let reg = R.acumularOraculos(undefined, [
    { uid: "u1", nombre: "Ana", prediccion: "A" }, { uid: "u2", nombre: "Beto", prediccion: "B" }, { uid: "u3", nombre: "Caro", prediccion: null }
  ], "A");
  assert.deepEqual([reg.u1.puntos, reg.u1.predicciones, reg.u2.puntos, reg.u2.predicciones, reg.u3.predicciones], [1, 1, 0, 1, 0]);
  reg = R.acumularOraculos(reg, [{ uid: "u1", nombre: "Ana", prediccion: "B" }], null);   // jueces empatados
  assert.deepEqual([reg.u1.puntos, reg.u1.predicciones], [1, 1]);
});

test("rankingOraculos: ordena por puntos, luego tasa de acierto, luego nombre", () => {
  const r = R.rankingOraculos({
    a: { uid: "a", nombre: "Zoe", puntos: 2, predicciones: 4, aciertos: 2 },
    b: { uid: "b", nombre: "Ana", puntos: 2, predicciones: 2, aciertos: 2 },
    c: { uid: "c", nombre: "Bea", puntos: 2, predicciones: 2, aciertos: 2 },
    d: { uid: "d", nombre: "Dan", puntos: 0, predicciones: 0, aciertos: 0 }
  });
  assert.deepEqual(r.map(x => x.nombre), ["Ana", "Bea", "Zoe"]);   // Dan nunca predijo: no ocupa puesto
  assert.deepEqual(r.map(x => x.puesto), [1, 2, 3]);
  assert.equal(r[2].tasa, 0.5);
});

test("conGrupo: el nombre acompañado de su grupo", () => {
  assert.equal(R.conGrupo("Naim", 1), "Naim (grupo 1)");
  assert.equal(R.conGrupo("Naim", 0), "Naim");
  assert.equal(R.conGrupo("Naim", null), "Naim");
});

test("acumularOraculos: guarda el grupo del votante", () => {
  const reg = R.acumularOraculos(undefined, [{ uid: "u1", nombre: "Ana", grupo: 3, prediccion: "A" }], "A");
  assert.equal(reg.u1.grupo, 3);
});

/* --- Un solo tramo abierto por debate ---------------------------------
   La posición de entrada y después libre: la estructura la pone la moderadora,
   no el reloj. */

test("TRAMOS: un solo tramo abierto por debate", () => {
  assert.equal(R.TRAMOS.length, 1);
  const t = R.TRAMOS[0];
  assert.equal(t.id, "apertura", "el id es la clave de EJEMPLOS_SESION y del marcador local");
  assert.ok(t.seg >= 300, "el tramo único dura lo que antes duraban los dos");
  assert.ok(!/r[ée]plica|refutaci[óo]n|cierre/i.test(t.nombre + " " + t.pauta),
    "la pauta ya no prescribe reconstruir-y-refutar ni concluir");
});

test("TRAMOS: la duración del tramo único sale de ROT", () => {
  assert.equal(R.TRAMOS[0].seg, R.ROT.SEG_DEBATE);
  assert.equal(R.ROT.SEG_APERTURA, undefined, "quedó una constante del esquema viejo");
  assert.equal(R.ROT.SEG_REPLICA, undefined, "quedó una constante del esquema viejo");
});

test("sumarPuntoPregunta: +1 punto de oráculo sin contar como predicción", () => {
  let reg = R.sumarPuntoPregunta({}, { uid: "u1", nombre: "Lucas", grupo: 3 });
  assert.deepEqual([reg.u1.puntos, reg.u1.predicciones, reg.u1.preguntas, reg.u1.grupo], [1, 0, 1, 3]);
  reg = R.acumularOraculos(reg, [{ uid: "u1", nombre: "Lucas", grupo: 3, prediccion: "A" }], "A");
  assert.deepEqual([reg.u1.puntos, reg.u1.predicciones, reg.u1.aciertos], [2, 1, 1]);
  // quien solo sumó por una pregunta igual aparece en el ranking de oráculos
  const r = R.rankingOraculos(R.sumarPuntoPregunta({}, { uid: "u9", nombre: "Ana" }));
  assert.equal(r.length, 1); assert.equal(r[0].tasa, 0);
  assert.deepEqual(R.sumarPuntoPregunta({ x: 1 }, null), { x: 1 });
});

test("preparación: un minuto antes de abrir el chat", () => {
  assert.equal(R.ROT.SEG_PREPARACION, 60);
});

test("proximaPreguntaEscrita: trae la postura de cada lado si la pregunta la define", () => {
  const ps = [{ texto: "Ley ya.", afirma: "ley_antes", favor: "Hay que legislar ahora.", contra: "Legislar ahora es un error." }];
  assert.deepEqual(R.proximaPreguntaEscrita(ps, []),
    { texto: "Ley ya.", afirma: "ley_antes", favor: "Hay que legislar ahora.", contra: "Legislar ahora es un error." });
});

test("posturasDebate: usa la postura escrita y, si no hay, una genérica que no regala argumentos", () => {
  assert.deepEqual(R.posturasDebate({ favor: " Sí, ya. ", contra: "No, todavía." }), { A: "Sí, ya.", B: "No, todavía." });
  const g = R.posturasDebate({});
  assert.ok(g.A && g.B && g.A !== g.B);
  assert.deepEqual(R.posturasDebate(null), g);
  assert.equal(R.posturasDebate({ favor: "x".repeat(400) }).A.length, 240);
});

test("gruposEscribiendo: los grupos del debate con alguien tecleando hace poco, sin contarme a mí", () => {
  const ahora = 100000;
  const xs = [
    { uid: "a", grupo: 4, debate: 2, t: 5, visto: ahora - 1000 },
    { uid: "b", grupo: 4, debate: 2, t: 9, visto: ahora - 2000 },
    { uid: "c", grupo: 1, debate: 2, t: 7, visto: ahora - 9000 },   // hace rato: ya no
    { uid: "d", grupo: 1, debate: 1, t: 7, visto: ahora },          // otro debate
    { uid: "e", grupo: 2, debate: 2, t: 0, visto: ahora },          // envió: t=0 limpia
    { uid: "yo", grupo: 5, debate: 2, t: 3, visto: ahora }
  ];
  assert.deepEqual(R.gruposEscribiendo(xs, { debate: 2, ahora, yo: "yo" }), [4]);
  assert.deepEqual(R.gruposEscribiendo(xs, { debate: 2, ahora }), [4, 5]);
  assert.deepEqual(R.gruposEscribiendo([], { debate: 2, ahora }), []);
  assert.deepEqual(R.gruposEscribiendo(xs, { debate: null, ahora }), []);
});

/* ---- El debate en vivo: opciones, sorteo de duelo, revancha ---- */
const seq = xs => () => (xs.length ? xs.shift() : 0);

test("opcionActiva: sin opciones, todo encendido; false apaga; claves desconocidas, encendidas", () => {
  assert.equal(R.opcionActiva(null, "voz"), true);
  assert.equal(R.opcionActiva({}, "revelacion"), true);
  assert.equal(R.opcionActiva({ voz: false }, "voz"), false);
  assert.equal(R.opcionActiva({ voz: false }, "musica"), true);
  assert.equal(R.opcionActiva({}, "otra"), true);
  assert.deepEqual(Object.keys(R.OPCIONES_DEFECTO).sort(), ["musica", "punto", "reloj", "revancha", "revelacion", "voz", "vozIA"]);
});

test("opcionActiva: ops que no es un objeto (dato corrupto) no revienta, cae al valor por defecto", () => {
  assert.equal(R.opcionActiva(5, "voz"), true);
  assert.equal(R.opcionActiva("x", "voz"), true);
});

const PS = R.numerarPersonajes([
  { id: "huang", nombre: "Jensen Huang", corto: "Huang", duelo: 1, lado: "A" },
  { id: "amodei", nombre: "Dario Amodei", corto: "Amodei", duelo: 1, lado: "B" },
  { id: "hawley", nombre: "Josh Hawley", corto: "Hawley", duelo: 2, lado: "A" },
  { id: "altman", nombre: "Sam Altman", corto: "Altman", duelo: 2, lado: "B" },
  { id: "sanders", nombre: "Bernie Sanders", corto: "Sanders", duelo: 3, lado: "A" },
  { id: "musk", nombre: "Elon Musk", corto: "Musk", duelo: 3, lado: "B" }
]);
const DUELOS = [
  { texto: "Moción uno", favor: "f1", contra: "c1", duelo: { A: "huang", B: "amodei" } },
  { texto: "Moción dos", favor: "f2", contra: "c2", duelo: { A: "hawley", B: "altman" } },
  { texto: "Moción tres", favor: "f3", contra: "c3", duelo: { A: "sanders", B: "musk" } }
];
const LLENO = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 4 };

test("duelosPendientes: los que no se han jugado, en números de grupo", () => {
  const p = R.duelosPendientes(DUELOS, ["Moción dos"], PS);
  assert.deepEqual(p.map(x => [x.texto, x.A, x.B]), [["Moción uno", 1, 2], ["Moción tres", 5, 6]]);
  assert.equal(p[0].favor, "f1");
});

test("sortearDuelo: elige al azar entre los pendientes con gente en los dos lados", () => {
  assert.equal(R.sortearDuelo(DUELOS, [], PS, LLENO, seq([0])).texto, "Moción uno");
  assert.equal(R.sortearDuelo(DUELOS, [], PS, LLENO, seq([0.5])).texto, "Moción dos");
  assert.equal(R.sortearDuelo(DUELOS, [], PS, LLENO, seq([0.99])).texto, "Moción tres");
  // Musk sin nadie: el duelo 3 no entra al sorteo
  const sinMusk = { ...LLENO, 6: 0 };
  for (const x of [0, 0.4, 0.7, 0.99]) assert.notEqual(R.sortearDuelo(DUELOS, [], PS, sinMusk, seq([x])).texto, "Moción tres");
});

test("sortearDuelo: 'evitar' se salta si hay otro; los jugados no vuelven; sin gente en ninguno, el primero pendiente", () => {
  assert.equal(R.sortearDuelo(DUELOS, ["Moción uno"], PS, LLENO, seq([0]), "Moción dos").texto, "Moción tres");
  assert.equal(R.sortearDuelo(DUELOS, ["Moción uno", "Moción tres"], PS, LLENO, seq([0]), "Moción dos").texto, "Moción dos");
  assert.equal(R.sortearDuelo(DUELOS, ["Moción uno"], PS, {}, seq([0.9])).texto, "Moción dos");
  assert.equal(R.sortearDuelo(DUELOS, ["Moción uno", "Moción dos", "Moción tres"], PS, LLENO, seq([0])), null);
});

test("sortearDuelo: sin gente en ningún duelo, el que cae por defecto también respeta 'evitar'", () => {
  assert.equal(R.sortearDuelo(DUELOS, [], PS, {}, seq([0]), "Moción uno").texto, "Moción dos");
});

test("sortearDuelo devuelve la forma de proximaPreguntaEscrita (texto, favor, contra, duelo)", () => {
  const d = R.sortearDuelo(DUELOS, [], PS, LLENO, seq([0]));
  assert.deepEqual(d, { texto: "Moción uno", afirma: null, favor: "f1", contra: "c1", duelo: { A: "huang", B: "amodei" } });
});

test("conRevancha: sin debates previos, con menos de 3 grupos o sin suerte, el par no cambia", () => {
  const par = { A: 3, B: 4 };
  assert.deepEqual(R.conRevancha(par, [1, 2, 3, 4], [], seq([0])), par);
  assert.deepEqual(R.conRevancha(par, [3, 4], [{ A: 3, B: 4 }], seq([0])), par);
  assert.deepEqual(R.conRevancha(par, [1, 2, 3, 4], [{ A: 1, B: 2 }], seq([R.ROT.P_REVANCHA])), par);
  assert.equal(R.conRevancha(null, [1, 2], [], seq([0])), null);
});

test("conRevancha: con suerte, un cupo cae en un grupo que ya debatió", () => {
  // azar: 0.1 (< P_REVANCHA) → hay revancha; 0 → el primero de los que ya jugaron; 0.7 → reemplaza a B
  assert.deepEqual(R.conRevancha({ A: 3, B: 4 }, [1, 2, 3, 4], [{ A: 1, B: 2 }], seq([0.1, 0, 0.7])), { A: 3, B: 1 });
  assert.deepEqual(R.conRevancha({ A: 3, B: 4 }, [1, 2, 3, 4], [{ A: 1, B: 2 }], seq([0.1, 0.99, 0.2])), { A: 2, B: 4 });
  // nunca deja a un grupo contra sí mismo: grupo 1 ya debatió, par {A:1,B:3} → la revancha
  // solo puede caer en el grupo 2 (el único que debatió y no es ni A ni B)
  const r = R.conRevancha({ A: 1, B: 3 }, [1, 2, 3], [{ A: 1, B: 2 }], seq([0.1, 0, 0.2]));
  assert.notEqual(r.A, r.B);
  assert.deepEqual(r, { A: 2, B: 3 });
});
