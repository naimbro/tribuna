# El debate en vivo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revelación dramática tras una preparación universal, proyector sin botones con control desde el celular, debate a viva voz (mantener para hablar, subtítulos, reloj de ajedrez, punto de información, moderadora con voz) y teléfono simplificado. Listo para el martes 29-sep-2026 (semana 308, personajes).

**Spec:** `docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md` (léela antes de cada tarea).

**Architecture:** Sitio estático sin build. La lógica pura va en scripts clásicos con `module.exports` al final (se cargan en el navegador como globales y en Node con `require`), probados con `node --test pruebas/`. El motor corre en la pantalla del profesor (`index.html`: `app.js`, `clase.js`, `moderacion.js`, `escenas.js`, `online.js`). El teléfono es `jugar.html` + `jugar.js` (módulo ES). El control del profesor es nuevo: `control.html` + `control.js` (módulo ES). Firestore sincroniza; no hay reglas nuevas.

**Tech Stack:** JavaScript del navegador sin dependencias, Firebase 12.9 (Auth + Firestore) por CDN, Web Speech API (`SpeechRecognition`, `speechSynthesis`), WebAudio, `node:test`.

---

## Reglas para quien implementa (léelas siempre)

- **Idioma y estilo:** todo en español, con el estilo del código vecino: comentarios que explican el porqué, nombres en español, sin punto y coma omitidos, funciones cortas. Mira el archivo que editas antes de escribir.
- **Git:** el árbol tiene cambios del profesor sin commitear (`.gitignore`, `contenido/semana307.js`, `contenido/semana5.js`, dos specs, `pruebas/jueces.test.js`, `.claude/`). **Nunca** hagas `git add -A`, `git add .`, `git commit -a`, `git stash`, `git checkout -- …` ni `git restore`. Agrega solo los archivos que tu tarea tocó, por nombre. Si necesitas tocar `pruebas/jueces.test.js`, no lo hagas: avisa.
- **Commits:** mensaje en español, estilo del repo (una línea que dice qué cambia para la clase, cuerpo opcional), terminado en
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Pruebas:** `cd /mnt/c/Users/naim.bro.k/claude_projects/games/tribuna && node --test pruebas/` debe quedar en verde después de cada tarea.
- **Caché:** los `<script src="…?v=…">` de `index.html`, `jugar.html` y `control.html` usan `?v=20260929a` para todo archivo que cambie en este plan (y para los nuevos).
- **Interruptores:** toda conducta nueva se consulta con `opcionActiva(S.clase.opciones, "<clave>")` (pantalla) o `opcionActiva(J.sala.opciones, "<clave>")` (teléfono). Apagado = conducta de hoy.

## Mapa de archivos

| Archivo | Qué cambia |
|---|---|
| `rotacion.js` | constantes nuevas, `OPCIONES_DEFECTO`, `opcionActiva`, `sortearDuelo`, `conRevancha` |
| `ajedrez.js` (nuevo) | reloj de ajedrez, puro |
| `punto.js` (nuevo) | punto de información, máquina de estados pura |
| `vozia.js` (nuevo) | texto hablado de moderadora/relator (puro) + cola de `speechSynthesis` |
| `ritmo.js` | `debeIntervenir` respeta a quien habla y el respiro corto con voz |
| `musica.js` (nuevo) | pulso de preparación, golpe, música de entrada (WebAudio) |
| `clase.js` | ciclo preparación → revelación → entrada → debate; banco del reloj; punto; órdenes |
| `escenas.js` | escenas de preparación, revelación y entrada |
| `escenario.js` (nuevo) | vista de debate del escenario y modo escenario |
| `moderacion.js` | voz de la moderadora, respeta el habla, 🎤 en la transcripción |
| `jueces.js` | aviso de transcripción automática |
| `online.js` | publica lo nuevo, lee `habla`/`punto`/`respondePunto`, `privado/control`, órdenes |
| `index.html` | CSS de escenas y escenario, scripts nuevos, botón ⛶ ESCENARIO |
| `control.html`, `control.js` (nuevos) | el control del profesor |
| `jugar.html`, `jugar.js` | preparación y revelación, mantener para hablar, vistas nuevas |
| `pruebas/*.test.js` | `rotacion`, `ajedrez`, `punto`, `ritmo`, `vozia` |
| `README.md` | sección «El debate en vivo» |

Dependencias entre tareas: 1, 2, 3, 4, 5 son puras e independientes (se pueden hacer en paralelo, cada una toca archivos distintos). Desde la 6 en adelante son secuenciales: todas tocan `clase.js`, `online.js`, `index.html` o `jugar.js`.

---

## Fase A0 — Lógica pura

### Task 1: Opciones, sorteo de duelo y revancha (`rotacion.js`)

**Files:**
- Modify: `rotacion.js`
- Test: `pruebas/rotacion.test.js`

- [ ] **Step 1: Escribir las pruebas que fallan.** Agrega al final de `pruebas/rotacion.test.js`:

```js
/* ---- El debate en vivo: opciones, sorteo de duelo, revancha ---- */
const seq = xs => () => (xs.length ? xs.shift() : 0);

test("opcionActiva: sin opciones, todo encendido; false apaga; claves desconocidas, encendidas", () => {
  assert.equal(R.opcionActiva(null, "voz"), true);
  assert.equal(R.opcionActiva({}, "revelacion"), true);
  assert.equal(R.opcionActiva({ voz: false }, "voz"), false);
  assert.equal(R.opcionActiva({ voz: false }, "musica"), true);
  assert.deepEqual(Object.keys(R.OPCIONES_DEFECTO).sort(), ["musica", "punto", "reloj", "revancha", "revelacion", "voz", "vozIA"]);
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
  // nunca deja a un grupo contra sí mismo
  const r = R.conRevancha({ A: 1, B: 3 }, [1, 2, 3], [{ A: 1, B: 2 }], seq([0.1, 0, 0.2]));
  assert.notEqual(r.A, r.B);
});
```

- [ ] **Step 2: Correr y ver que fallan.**
Run: `node --test pruebas/rotacion.test.js`
Expected: FAIL (`R.opcionActiva is not a function`, etc.)

- [ ] **Step 3: Implementar.** En `rotacion.js`:

En `ROT` agrega (después de `SEG_ESCRIBIENDO`):
```js
  SEG_REVELACION: 8,    // la revelación de quién pasa al frente (se puede saltar)
  SEG_ENTRADA: 20,      // la entrada al escenario: lo que toma caminar al frente (se puede saltar)
  P_REVANCHA: 0.25,     // con revelación, probabilidad de que un cupo caiga en un grupo que ya debatió
```

Antes del `if (typeof module …)` final, agrega:
```js
/* --- El debate en vivo (spec 2026-09-25) -------------------------------
   Cada conducta nueva tiene un interruptor en S.clase.opciones; lo que falta cuenta como
   encendido, así las salas creadas antes siguen funcionando. Apagado = la clase de siempre. */
const OPCIONES_DEFECTO = { revelacion: true, revancha: true, musica: true, voz: true, reloj: true, punto: true, vozIA: true };
const opcionActiva = (ops, k) => (ops && k in ops ? ops[k] !== false : OPCIONES_DEFECTO[k] !== false);

// Los duelos escritos que faltan, en números de grupo (con personajes). Mismo orden que PREGUNTAS.
function duelosPendientes(escritas, usadas, ps) {
  const ya = new Set((usadas || []).map(x => textoPregunta(x).toLowerCase()));
  return (escritas || []).filter(p => p && typeof p === "object" && p.duelo && textoPregunta(p) && !ya.has(textoPregunta(p).toLowerCase()))
    .map(p => ({ texto: textoPregunta(p), favor: p.favor || "", contra: p.contra || "", duelo: p.duelo, ...(dueloEnGrupos(p.duelo, ps) || { A: null, B: null }) }));
}

// Con revelación, el próximo duelo se sortea: nadie sabe cuál sigue. Entran al sorteo los pendientes
// con gente en los dos lados; `evitar` (el que el profesor acaba de descartar) solo si hay otro. Si
// ninguno tiene gente, el primero pendiente (la propuesta dirá quién falta). Misma forma que
// proximaPreguntaEscrita. azar: () => [0, 1), inyectable para las pruebas.
function sortearDuelo(escritas, usadas, ps, conteo, azar = Math.random, evitar = null) {
  const pend = duelosPendientes(escritas, usadas, ps);
  if (!pend.length) return null;
  const conGente = pend.filter(p => p.A && p.B && (conteo || {})[p.A] > 0 && (conteo || {})[p.B] > 0);
  let pool = conGente.length ? conGente : [pend[0]];
  const ev = String(evitar || "").trim().toLowerCase();
  if (ev && pool.length > 1) pool = pool.filter(p => p.texto.toLowerCase() !== ev);
  const p = pool[Math.min(pool.length - 1, Math.floor(azar() * pool.length))];
  return { texto: p.texto, afirma: null, favor: p.favor, contra: p.contra, duelo: p.duelo };
}

// La revancha: para que ningún grupo se sienta a salvo después de debatir, con probabilidad
// ROT.P_REVANCHA uno de los dos cupos cae en un grupo que ya debatió (nunca contra sí mismo).
// Solo con al menos un debate jugado y tres grupos con gente.
function conRevancha(par, disponibles, debates, azar = Math.random) {
  const gs = [...new Set(disponibles || [])];
  if (!par || !(debates || []).length || gs.length < 3) return par;
  if (azar() >= ROT.P_REVANCHA) return par;
  const jugaron = gs.filter(g => g !== par.A && g !== par.B && debates.some(d => d.A === g || d.B === g)).sort((a, b) => a - b);
  if (!jugaron.length) return par;
  const g = jugaron[Math.min(jugaron.length - 1, Math.floor(azar() * jugaron.length))];
  return azar() < 0.5 ? { ...par, A: g } : { ...par, B: g };
}
```

Y en el `module.exports` agrega `OPCIONES_DEFECTO, opcionActiva, duelosPendientes, sortearDuelo, conRevancha`.

- [ ] **Step 4: Correr las pruebas.** Run: `node --test pruebas/` — Expected: todo PASS.

- [ ] **Step 5: Commit.**
```bash
git add rotacion.js pruebas/rotacion.test.js
git commit -m "Rotación: interruptores del debate en vivo, sorteo del duelo y revancha"
```

### Task 2: El reloj de ajedrez (`ajedrez.js`)

**Files:**
- Create: `ajedrez.js`
- Test: `pruebas/ajedrez.test.js`

- [ ] **Step 1: Pruebas que fallan.** Crea `pruebas/ajedrez.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const AJ = require("../ajedrez.js");

test("nuevoBanco: la mitad del tramo para cada lado, en ms", () => {
  assert.deepEqual(AJ.nuevoBanco(360), { A: 180000, B: 180000 });
});

test("avanzar: corre solo el lado que habla; los dos si hablan a la vez", () => {
  let b = AJ.nuevoBanco(360);
  let r = AJ.avanzar(b, { A: true, B: false }, 1000);
  assert.deepEqual(r.banco, { A: 179000, B: 180000 });
  r = AJ.avanzar(r.banco, { A: true, B: true }, 500);
  assert.deepEqual(r.banco, { A: 178500, B: 179500 });
  r = AJ.avanzar(r.banco, { A: false, B: false }, 5000);
  assert.deepEqual(r.banco, { A: 178500, B: 179500 });
  assert.deepEqual(r.agotados, []);
});

test("avanzar: no baja de cero y avisa una sola vez cuando un lado se agota", () => {
  let r = AJ.avanzar({ A: 300, B: 5000 }, { A: true, B: false }, 1000);
  assert.deepEqual(r.banco, { A: 0, B: 5000 });
  assert.deepEqual(r.agotados, ["A"]);
  r = AJ.avanzar(r.banco, { A: true, B: false }, 1000);
  assert.deepEqual(r.agotados, []);
});

test("avanzar: un dt negativo o enorme (pestaña dormida) se acota", () => {
  assert.deepEqual(AJ.avanzar({ A: 1000, B: 1000 }, { A: true }, -50).banco, { A: 1000, B: 1000 });
  assert.deepEqual(AJ.avanzar({ A: 10000, B: 1000 }, { A: true }, 60000).banco, { A: 10000 - AJ.AJ.DT_MAX, B: 1000 });
});

test("hablandoPorLado: cuenta a quien tiene habla vigente del debate en curso", () => {
  const ahora = 100000;
  const xs = [
    { grupo: 3, habla: { debate: 2, t: 1 }, visto: ahora - 500 },     // A, vigente
    { grupo: 4, habla: { debate: 2, t: 1 }, visto: ahora - 4000 },    // B, latido vencido
    { grupo: 4, habla: { debate: 1, t: 1 }, visto: ahora - 100 },     // B, otro debate
    { grupo: 5, habla: { debate: 2, t: 1 }, visto: ahora - 100 },     // público: no cuenta
    { grupo: 4, habla: null, visto: ahora }
  ];
  assert.deepEqual(AJ.hablandoPorLado(xs, { debate: 2, A: 3, B: 4, ahora }), { A: true, B: false });
});

test("terminado: los dos bancos en cero, o el tramo más el margen", () => {
  const abre = 0, seg = 360;
  assert.equal(AJ.terminado({ A: 0, B: 0 }, { abre, seg, ahora: 1000 }), true);
  assert.equal(AJ.terminado({ A: 0, B: 1 }, { abre, seg, ahora: 1000 }), false);
  assert.equal(AJ.terminado({ A: 5, B: 5 }, { abre, seg, ahora: (seg + AJ.AJ.MARGEN) * 1000 }), true);
  assert.equal(AJ.terminado({ A: 5, B: 5 }, { abre, seg, ahora: (seg + AJ.AJ.MARGEN) * 1000 - 1 }), false);
});

test("sumar: +30 s a los dos lados", () => {
  assert.deepEqual(AJ.sumar({ A: 0, B: 1000 }, 30000), { A: 30000, B: 31000 });
});

test("restante: lo que queda ahora, contando lo que corrió desde la foto publicada", () => {
  const foto = { A: 60000, B: 50000, corre: { A: true, B: false }, t: 1000 };
  assert.deepEqual(AJ.restante(foto, 3000), { A: 58000, B: 50000 });
  assert.deepEqual(AJ.restante({ ...foto, corre: { A: true, B: true } }, 100000), { A: 0, B: 0 });
});
```

- [ ] **Step 2: Correr y ver que fallan.** Run: `node --test pruebas/ajedrez.test.js` — Expected: FAIL (`Cannot find module '../ajedrez.js'`).

- [ ] **Step 3: Implementar.** Crea `ajedrez.js`:

```js
/* =====================================================================
   TRIBUNA — el reloj de ajedrez del debate a viva voz: lógica pura (sin DOM ni Firestore),
   probada con Node (pruebas/ajedrez.test.js). Spec: docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md

   Cada lado tiene un banco igual a la mitad del tramo. El banco de un lado corre mientras al
   menos uno de sus integrantes tiene el botón de hablar apretado (su ficha lleva `habla` con un
   latido reciente). Si hablan los dos lados a la vez, corren los dos: interrumpir cuesta. Un lado
   sin tiempo solo puede escribir. El tramo termina con los dos bancos en cero o al pasar el
   tramo más un margen, lo que llegue primero.
   ===================================================================== */

const AJ = {
  LATIDO: 2500,   // una ficha con habla cuyo último latido llegó hace más de esto cuenta como callada
  MARGEN: 90,     // segundos de margen sobre el tramo: el debate no se alarga para siempre con silencios
  DT_MAX: 2000    // un paso de reloj nunca descuenta más que esto (pestaña dormida, reloj que salta)
};

const nuevoBanco = segTramo => ({ A: Math.round(segTramo * 500), B: Math.round(segTramo * 500) });

// Descuenta dt ms a cada lado que habla. agotados: los lados que llegaron a cero en este paso.
function avanzar(banco, hablando, dt) {
  const paso = Math.max(0, Math.min(AJ.DT_MAX, dt || 0));
  const out = { A: banco.A, B: banco.B }, agotados = [];
  for (const k of ["A", "B"]) {
    if (!hablando || !hablando[k] || out[k] <= 0) continue;
    out[k] = Math.max(0, out[k] - paso);
    if (out[k] === 0) agotados.push(k);
  }
  return { banco: out, agotados };
}

// ¿Quién habla ahora? xs: [{ grupo, habla: { debate, t } | null, visto }], donde visto es cuándo
// ESTE aparato vio llegar el último latido (así no dependemos de que los relojes coincidan).
function hablandoPorLado(xs, { debate, A, B, ahora }) {
  const out = { A: false, B: false };
  for (const x of xs || []) {
    if (!x || !x.habla || x.habla.debate !== debate || ahora - (x.visto || 0) > AJ.LATIDO) continue;
    if (x.grupo === A) out.A = true; else if (x.grupo === B) out.B = true;
  }
  return out;
}

const terminado = (banco, { abre, seg, ahora }) =>
  (banco.A <= 0 && banco.B <= 0) || ahora - abre >= (seg + AJ.MARGEN) * 1000;

const sumar = (banco, ms) => ({ A: banco.A + ms, B: banco.B + ms });

// En el teléfono: la foto publicada { A, B, corre: { A, B }, t } y la hora de ahora → lo que queda.
function restante(foto, ahora) {
  const pasado = Math.max(0, ahora - (foto.t || ahora));
  const r = k => Math.max(0, foto[k] - (foto.corre && foto.corre[k] ? pasado : 0));
  return { A: r("A"), B: r("B") };
}

if (typeof module !== "undefined") module.exports = { AJ, nuevoBanco, avanzar, hablandoPorLado, terminado, sumar, restante };
```

- [ ] **Step 4: Correr.** Run: `node --test pruebas/` — Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add ajedrez.js pruebas/ajedrez.test.js
git commit -m "Reloj de ajedrez del debate a viva voz (lógica pura)"
```

### Task 3: El punto de información (`punto.js`)

**Files:**
- Create: `punto.js`
- Test: `pruebas/punto.test.js`

Estado: `null` o `{ de, nombre, grupo, lado, para, estado, t, fin, hasta }`, con `estado` en `"pedido" | "aceptado" | "rechazado" | "vencido" | "terminado"`. `t` es la marca del pedido (la pone el teléfono y sirve de id). `fin`: cuándo vence el pedido (10 s) o termina la palabra (15 s). `hasta`: hasta cuándo se muestra un punto ya cerrado (4 s). Nota: cualquiera del grupo que recibe el punto puede aceptarlo o rechazarlo; gana la primera respuesta (ajuste menor a la spec, que decía «quien está hablando»).

- [ ] **Step 1: Pruebas que fallan.** Crea `pruebas/punto.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../punto.js");

const pedido = (o = {}) => ({ uid: "u1", nombre: "Ana", grupo: 3, lado: "B", t: 500, ...o });
const base = { ahora: 1000, hablando: { A: true, B: false }, ultimo: {} };

test("pedir: solo si el otro lado está hablando y no hay otro punto", () => {
  const r = P.pedirPunto(null, pedido(), base);
  assert.equal(r.punto.estado, "pedido");
  assert.equal(r.punto.para, "A");
  assert.equal(r.punto.fin, 1000 + P.PUNTO.ESPERA);
  assert.equal(r.ultimo.B, 1000);
  assert.equal(P.pedirPunto(null, pedido(), { ...base, hablando: { A: false, B: false } }).punto, null);
  assert.equal(P.pedirPunto(r.punto, pedido({ uid: "u2", lado: "A", grupo: 4 }), { ...base, hablando: { A: true, B: true } }).punto, r.punto);
});

test("pedir: cada lado espera ENFRIA desde su último pedido", () => {
  const ultimo = { B: 1000 };
  assert.equal(P.pedirPunto(null, pedido(), { ...base, ahora: 1000 + P.PUNTO.ENFRIA - 1, ultimo }).punto, null);
  assert.equal(P.pedirPunto(null, pedido(), { ...base, ahora: 1000 + P.PUNTO.ENFRIA, ultimo }).punto.estado, "pedido");
});

test("pedir: un punto cerrado que todavía se muestra no bloquea uno nuevo", () => {
  const cerrado = { estado: "rechazado", hasta: 5000, lado: "A", para: "B" };
  assert.equal(P.pedirPunto(cerrado, pedido(), base).punto.estado, "pedido");
});

test("responder: aceptar da 15 s; rechazar cierra; una respuesta a otro pedido no cuenta", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);
  const a = P.responderPunto(punto, { t: 500, acepta: true }, 2000);
  assert.equal(a.estado, "aceptado");
  assert.equal(a.fin, 2000 + P.PUNTO.DURA);
  const r = P.responderPunto(punto, { t: 500, acepta: false }, 2000);
  assert.equal(r.estado, "rechazado");
  assert.equal(r.hasta, 2000 + P.PUNTO.MUESTRA);
  assert.equal(P.responderPunto(punto, { t: 499, acepta: true }, 2000), punto);
  assert.equal(P.responderPunto(a, { t: 500, acepta: false }, 2100), a);   // ya aceptado: no se deshace
});

test("vencer: pedido sin respuesta → vencido; palabra cumplida → terminado; cerrado que ya se mostró → null", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);
  assert.equal(P.vencerPunto(punto, punto.fin - 1), punto);
  const v = P.vencerPunto(punto, punto.fin);
  assert.equal(v.estado, "vencido");
  const a = P.responderPunto(punto, { t: 500, acepta: true }, 2000);
  assert.equal(P.vencerPunto(a, a.fin).estado, "terminado");
  assert.equal(P.vencerPunto(v, v.hasta), null);
  assert.equal(P.vencerPunto(null, 1), null);
});

test("activo y puedeHablar: quien pidió habla solo con el punto aceptado", () => {
  const { punto } = P.pedirPunto(null, pedido(), base);
  assert.equal(P.puntoActivo(punto), true);
  const a = P.responderPunto(punto, { t: 500, acepta: true }, 2000);
  assert.equal(P.puedeHablarPorPunto(a, "u1", 3000), true);
  assert.equal(P.puedeHablarPorPunto(a, "u2", 3000), false);
  assert.equal(P.puedeHablarPorPunto(a, "u1", a.fin), false);
  assert.equal(P.puedeHablarPorPunto(punto, "u1", 3000), false);
  assert.equal(P.puntoActivo(P.responderPunto(punto, { t: 500, acepta: false }, 2000)), false);
});
```

- [ ] **Step 2: Correr y ver que fallan.** Run: `node --test pruebas/punto.test.js` — Expected: FAIL.

- [ ] **Step 3: Implementar.** Crea `punto.js`:

```js
/* =====================================================================
   TRIBUNA — el punto de información (como en el debate parlamentario británico): mientras un lado
   habla, alguien del otro lado pide la palabra desde el teléfono; el lado que habla lo acepta o lo
   rechaza. Aceptado, quien lo pidió tiene 15 s (corre el banco de su lado). Un punto a la vez;
   cada lado vuelve a pedir 30 s después de su último pedido. Lógica pura, probada con Node
   (pruebas/punto.test.js). Spec: docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md
   ===================================================================== */

const PUNTO = { ESPERA: 10000, DURA: 15000, ENFRIA: 30000, MUESTRA: 4000 };
const otroLado = k => (k === "A" ? "B" : "A");
const puntoActivo = p => !!p && (p.estado === "pedido" || p.estado === "aceptado");

// pedido: { uid, nombre, grupo, lado, t }. ultimo: { A, B } → cuándo pidió cada lado por última vez.
// Devuelve { punto, ultimo }; si el pedido no vale, el punto de antes y ultimo sin cambios.
function pedirPunto(actual, pedido, { ahora, hablando, ultimo = {} }) {
  const lado = pedido && pedido.lado, para = otroLado(lado);
  const vale = (lado === "A" || lado === "B") && !puntoActivo(actual) && hablando && hablando[para]
    && ahora - (ultimo[lado] ?? -Infinity) >= PUNTO.ENFRIA;
  if (!vale) return { punto: actual, ultimo };
  return {
    punto: { de: pedido.uid, nombre: pedido.nombre || "", grupo: pedido.grupo || 0, lado, para, estado: "pedido", t: pedido.t, fin: ahora + PUNTO.ESPERA, hasta: null },
    ultimo: { ...ultimo, [lado]: ahora }
  };
}

// respuesta: { t, acepta } — t tiene que ser el del pedido en curso.
function responderPunto(actual, respuesta, ahora) {
  if (!actual || actual.estado !== "pedido" || !respuesta || respuesta.t !== actual.t) return actual;
  return respuesta.acepta ? { ...actual, estado: "aceptado", fin: ahora + PUNTO.DURA }
    : { ...actual, estado: "rechazado", fin: null, hasta: ahora + PUNTO.MUESTRA };
}

function vencerPunto(actual, ahora) {
  if (!actual) return null;
  if (actual.estado === "pedido" && ahora >= actual.fin) return { ...actual, estado: "vencido", hasta: ahora + PUNTO.MUESTRA };
  if (actual.estado === "aceptado" && ahora >= actual.fin) return { ...actual, estado: "terminado", hasta: ahora + PUNTO.MUESTRA };
  if (!puntoActivo(actual) && ahora >= (actual.hasta || 0)) return null;
  return actual;
}

const puedeHablarPorPunto = (p, uid, ahora) => !!p && p.estado === "aceptado" && p.de === uid && ahora < p.fin;

if (typeof module !== "undefined") module.exports = { PUNTO, otroLado, puntoActivo, pedirPunto, responderPunto, vencerPunto, puedeHablarPorPunto };
```

- [ ] **Step 4: Correr.** Run: `node --test pruebas/` — Expected: PASS.

- [ ] **Step 5: Commit.**
```bash
git add punto.js pruebas/punto.test.js
git commit -m "Punto de información (máquina de estados pura)"
```

### Task 4: La moderadora no interrumpe a quien habla (`ritmo.js`)

**Files:**
- Modify: `ritmo.js` (`RITMO` y `debeIntervenir`)
- Test: `pruebas/ritmo.test.js`

- [ ] **Step 1: Pruebas que fallan.** Agrega al final de `pruebas/ritmo.test.js` (el archivo ya importa ritmo.js; mira cómo se llama el objeto importado en las primeras líneas y úsalo — abajo se asume `R`; si es otro nombre, cámbialo):

```js
test("debeIntervenir: mientras alguien habla no entra, ni pedida", () => {
  const est = { ultimoAlumno: 0, ultimaMod: 0, nuevos: 0, modSeguidas: 0, alumnos: [] };
  assert.equal(R.debeIntervenir(est, { ahora: 200000, abre: 0, hablando: true }).toca, false);
  assert.equal(R.debeIntervenir(est, { ahora: 200000, abre: 0, hablando: true, forzar: true }).toca, false);
  assert.equal(R.debeIntervenir(est, { ahora: 200000, abre: 0, hablando: true }).motivo, "hablan");
});

test("debeIntervenir: con voz, el respiro se mide desde que terminó de hablar y es corto", () => {
  const est = { ultimoAlumno: 100000, ultimaMod: 0, nuevos: 3, modSeguidas: 0, alumnos: [] };
  // sin voz: 8 s de respiro desde el último mensaje
  assert.equal(R.debeIntervenir(est, { ahora: 104000, abre: 0 }).toca, false);
  // con voz: 3 s desde el último mensaje o la última voz, lo más reciente
  assert.equal(R.debeIntervenir(est, { ahora: 104000, abre: 0, voz: true }).toca, true);
  assert.equal(R.debeIntervenir(est, { ahora: 104000, abre: 0, voz: true, ultimaVoz: 102000 }).toca, false);
  assert.equal(R.debeIntervenir(est, { ahora: 105000, abre: 0, voz: true, ultimaVoz: 102000 }).toca, true);
});
```

- [ ] **Step 2: Correr y ver que fallan.** Run: `node --test pruebas/ritmo.test.js` — Expected: FAIL (la primera prueba: `toca` es `true` con `forzar`).

- [ ] **Step 3: Implementar.** En `RITMO` agrega `RESPIRO_VOZ: 3000,   // con voz: silencio tras la última frase dicha antes de entrar`. Reemplaza el comienzo de `debeIntervenir`:

```js
// ¿Entra ahora? abre: cuándo empezó el tramo. forzar: el profesor pulsó 🎙 o le escribieron a ella.
// Debate a viva voz: hablando = alguien tiene el botón apretado (o hay un punto de información en
// curso); ultimaVoz = cuándo terminó de hablar el último. Nunca le quita la palabra a nadie, ni
// pedida: quien la llama espera a que se haga silencio.
function debeIntervenir(estado, { ahora, abre, forzar = false, hablando = false, ultimaVoz = 0, voz = false }) {
  if (hablando) return { toca: false, motivo: "hablan" };
  if (forzar) return { toca: true, motivo: "pedido" };
  const desdeMod = ahora - (estado.ultimaMod || abre);
  const ultimo = Math.max(estado.ultimoAlumno || 0, ultimaVoz || 0);
  if (ultimo && ahora - ultimo < (voz ? RITMO.RESPIRO_VOZ : RITMO.RESPIRO)) return { toca: false, motivo: "conversan" };
```
(el resto de la función queda igual).

- [ ] **Step 4: Correr.** Run: `node --test pruebas/` — Expected: PASS (las pruebas viejas de ritmo no pasan `hablando`, así que no cambian).

- [ ] **Step 5: Commit.**
```bash
git add ritmo.js pruebas/ritmo.test.js
git commit -m "Ritmo: la moderadora no le quita la palabra a quien habla"
```

### Task 5: Lo que dicen en voz alta la moderadora y el relator (`vozia.js`)

**Files:**
- Create: `vozia.js`
- Test: `pruebas/vozia.test.js`

- [ ] **Step 1: Pruebas que fallan.** Crea `pruebas/vozia.test.js`:

```js
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
```

Nota: `datos.nombre` de la pregunta de la tribuna todavía no existe en el mensaje; la Task 13 lo agrega en `lanzarPreguntaTribuna` (`datos: { tribuna: "pregunta", uid, nombre }`).

- [ ] **Step 2: Correr y ver que fallan.** Run: `node --test pruebas/vozia.test.js` — Expected: FAIL.

- [ ] **Step 3: Implementar.** Crea `vozia.js`:

```js
/* =====================================================================
   TRIBUNA — la moderadora y el relator hablan por los parlantes del proyector.
   Si los alumnos debaten en voz alta y la IA solo escribe, el ritmo se rompe. Usa la voz del
   navegador (speechSynthesis): gratis, sin demora y sin claves. Arriba, lo puro (qué se dice y con
   qué voz), probado con Node (pruebas/vozia.test.js); abajo, la cola del navegador.
   ===================================================================== */

const VOZIA = { MAX: 400, IDIOMAS: ["es-cl", "es-us", "es-419", "es-mx", "es-es"] };

// Sin @, emojis, markdown ni barras; cortado en el último fin de frase que cabe en max.
function limpiarParaVoz(texto, max = VOZIA.MAX) {
  let t = String(texto || "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/@/g, "").replace(/[*_`#]/g, "")
    .replace(/\s*\|\s*/g, ". ")
    .replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const fin = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("? "), corte.lastIndexOf("! "));
  return fin > 0 ? corte.slice(0, fin + 1) : corte.replace(/\s+\S*$/, "") + "…";
}

// Lo que se dice en voz alta por un mensaje de la conversación ("" = nada).
function textoHablado(m, equipos) {
  if (!m) return "";
  if (m.tipo === "mod") {
    if (m.datos && m.datos.tribuna === "pregunta") {
      const nombre = String(m.datos.nombre || "").trim().split(/\s+/)[0];
      return nombre ? `Pregunta de la tribuna. ${nombre}, léela en voz alta, por favor.` : "Pregunta de la tribuna.";
    }
    return limpiarParaVoz(m.texto);
  }
  if (m.tipo === "relator") {
    const d = m.datos || {};
    if (!d.resumenA && !d.resumenB) return limpiarParaVoz(m.texto);
    return limpiarParaVoz(`${equipos.A.nombre}: ${d.resumenA || ""} ${equipos.B.nombre}: ${d.resumenB || ""} En disputa: ${d.disputa || ""} Público: voten en su teléfono.`);
  }
  return "";
}

// La mejor voz en español: por idioma en el orden de VOZIA.IDIOMAS, y dentro de cada idioma las de
// Google (suenan mejor en Chrome). Si no hay ninguna de esas, cualquier voz «es».
function elegirVoz(voces) {
  const es = (voces || []).filter(v => /^es/i.test(v.lang || ""));
  if (!es.length) return null;
  const idioma = v => { const i = VOZIA.IDIOMAS.indexOf(String(v.lang).toLowerCase().replace("_", "-")); return i < 0 ? 99 : i; };
  const google = v => (/google/i.test(v.name || "") ? 0 : 1);
  return [...es].sort((a, b) => idioma(a) - idioma(b) || google(a) - google(b))[0];
}

/* ---------- en el navegador: una cola, un mensaje a la vez ---------- */
const COLA_VOZ = { voz: null };
function hablarIA(texto) {
  if (!texto || typeof speechSynthesis === "undefined") return;
  if (!COLA_VOZ.voz) COLA_VOZ.voz = elegirVoz(speechSynthesis.getVoices());
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = COLA_VOZ.voz ? COLA_VOZ.voz.lang : "es-CL";
  if (COLA_VOZ.voz) u.voice = COLA_VOZ.voz;
  u.rate = 1.03;
  speechSynthesis.speak(u);            // speechSynthesis ya encola: habla uno tras otro
}
function callarIA() { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); }
if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = () => { COLA_VOZ.voz = elegirVoz(speechSynthesis.getVoices()); };

if (typeof module !== "undefined") module.exports = { VOZIA, limpiarParaVoz, textoHablado, elegirVoz };
```

- [ ] **Step 4: Correr.** Run: `node --test pruebas/` — Expected: PASS. Si el regex de emojis no compila en el Node instalado, usa `\p{Extended_Pictographic}` con flag `u` y ajusta.

- [ ] **Step 5: Commit.**
```bash
git add vozia.js pruebas/vozia.test.js
git commit -m "La moderadora y el relator en voz alta: qué se dice y con qué voz"
```

---

## Fase A — Preparación universal, revelación y entrada

### Task 6: La música (`musica.js`)

**Files:**
- Create: `musica.js`
- Modify: `index.html` (cargar el script después de `app.js`)

No hay prueba automática (es audio). Se verifica a oído en la Task 8.

- [ ] **Step 1: Crear `musica.js`.** Usa `audioCtx()` y `sonidoActivo()` de `app.js` (globales). API:

```js
/* =====================================================================
   TRIBUNA — la música del debate en vivo, sintetizada con WebAudio (sin archivos ni licencias):
   el pulso de concentración de la preparación, el golpe de cada nombre en la revelación y la
   música de entrada al escenario. Suena solo si el 🔊 está encendido y el interruptor `musica`
   de la sala también. Usa audioCtx() y sonidoActivo() de app.js.
   ===================================================================== */

const MUSICA = { timer: null, nodos: [], hasta: 0 };
const musicaActiva = () => sonidoActivo() && opcionActiva(S.clase.opciones, "musica");

function pararMusica() {
  clearTimeout(MUSICA.timer); MUSICA.timer = null;
  for (const n of MUSICA.nodos) { try { n.stop(); } catch {} try { n.disconnect(); } catch {} }
  MUSICA.nodos = [];
}

// Un golpe grave con cola: el latido de la preparación y el golpe de cada nombre revelado.
function bombo(ac, t0, fuerza = 1) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.45);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.55 * fuerza, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.55);
}
function tic(ac, t0, agudo = false) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "square"; o.frequency.setValueAtTime(agudo ? 2600 : 1900, t0);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.05);
}

// La preparación: un zumbido grave de tensión y un latido con tic de reloj, cada segundo; en los
// últimos 10 s, cada medio segundo; en los últimos 3, cada cuarto. Termina sola en finMs.
function pulsoPreparacion(finMs) {
  pararMusica();
  if (!musicaActiva()) return;
  const ac = audioCtx(); if (!ac) return;
  // zumbido: dos sierras desafinadas bajo un pasabajos
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 140;
  const g = ac.createGain(); g.gain.value = 0.035;
  lp.connect(g); g.connect(ac.destination);
  for (const f of [55, 55.4]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); MUSICA.nodos.push(o); }
  const paso = () => {
    const resta = finMs - Date.now();
    if (resta <= 0 || !musicaActiva()) { pararMusica(); return; }
    const t0 = ac.currentTime + 0.02;
    bombo(ac, t0, resta < 10000 ? 0.9 : 0.6); tic(ac, t0 + 0.5 * (resta < 10000 ? 0.5 : 1), resta < 10000);
    MUSICA.timer = setTimeout(paso, resta < 3000 ? 250 : resta < 10000 ? 500 : 1000);
  };
  paso();
}

// La revelación: el redoble que ya existe (app.js) y un golpe por nombre.
function redobleRevelacion() { if (musicaActiva()) { pararMusica(); sonar("redoble"); } }
function golpeRevelacion() { if (!musicaActiva()) return; const ac = audioCtx(); if (ac) { bombo(ac, ac.currentTime + 0.01, 1.2); sonar("whoosh"); } }

// La entrada al escenario: un riff de bombo, caja y bajo a 124 bpm durante `segundos`.
function musicaEntrada(segundos) {
  pararMusica();
  if (!musicaActiva()) return;
  const ac = audioCtx(); if (!ac) return;
  const negra = 60 / 124, t0 = ac.currentTime + 0.05, bajo = [55, 55, 82.4, 73.4];
  for (let i = 0; i * negra < segundos; i++) {
    const t = t0 + i * negra;
    if (i % 2 === 0) bombo(ac, t, 0.8);
    else {   // caja: ruido corto
      const n = ac.createBufferSource(), len = Math.floor(ac.sampleRate * 0.12);
      const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
      const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
      const g = ac.createGain(); g.gain.value = 0.18;
      n.buffer = buf; n.connect(hp); hp.connect(g); g.connect(ac.destination); n.start(t); MUSICA.nodos.push(n);
    }
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sawtooth"; o.frequency.value = bajo[Math.floor(i / 2) % bajo.length];
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + negra * 0.9);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + negra); MUSICA.nodos.push(o);
  }
}
```

- [ ] **Step 2: Cargar el script.** En `index.html`, después de `<script src="app.js?...">`, agrega `<script src="musica.js?v=20260929a"></script>`. Agrega también (para las tareas siguientes) `ajedrez.js`, `punto.js` y `vozia.js` después de `rotacion.js`:
```html
<script src="ajedrez.js?v=20260929a"></script>
<script src="punto.js?v=20260929a"></script>
<script src="vozia.js?v=20260929a"></script>
```
Y cambia a `?v=20260929a` el de `rotacion.js` y `ritmo.js`.

- [ ] **Step 3: Verificar que la página carga sin errores.** Run: `cd /mnt/c/Users/naim.bro.k/claude_projects/games/tribuna && python3 servidor.py &` y abre `http://localhost:8777/index.html?semana=308` con Playwright o curl; como mínimo `node -e "require('./ajedrez.js');require('./punto.js');require('./vozia.js')"` y `node --check musica.js`. Expected: sin errores.

- [ ] **Step 4: Commit.**
```bash
git add musica.js index.html
git commit -m "Música sintetizada de la preparación, la revelación y la entrada"
```

### Task 7: El ciclo nuevo en la pantalla del profesor (`clase.js`, `online.js`)

**Files:**
- Modify: `clase.js` (`publicarDebate`, `empezarPreparacion`, nuevas `revelar`, `entrada`, `accionPrincipal`, `terminarClase`, `prepararPropuesta`)
- Modify: `online.js` (`estadoPublico`, `estadoPrivado`, `restaurar`, `crearSala`)

Lee antes la sección A de la spec. Contrato de estado:
- `S.fase`: `"listo"` (preparación) → `"revelando"` → `"entrada"` → `"abierta"`.
- `S.revelado`: `true` cuando el par ya se conoce (siempre `true` si la revelación está apagada).
- `S.finPrep` (ya existe), `S.finEntrada` (nuevo).
- `S.clase.opciones`: objeto de interruptores (ver Task 1). `crearSala` lo inicializa con `{ ...OPCIONES_DEFECTO }`.
- Helper en `clase.js`: `const opcion = k => opcionActiva(S.clase.opciones, k);`

- [ ] **Step 1: Sorteo del duelo y revancha en `prepararPropuesta`.**
  - Con `PERS` y `opcion("revelacion")`: en vez de `proximaPreguntaEscrita(escritas, usadas)` para decidir el duelo, usa `sortearDuelo(escritas, usadas, PERS, conteoAhora(), Math.random, S.clase.evitar || null)` y después `S.clase.evitar = null`. El resto del bloque `if (duelo)` queda igual (el `porQue` pasa a decir `Duelo sorteado entre los ${n} que faltan.` donde `n = duelosPendientes(escritas, usadas, PERS).length`).
  - En el botón **Pedir otra** (`$("prOtra").onclick`) y en la nueva función `pedirOtraPropuesta()` (extráela del onclick para que la use el control): con `PERS`, en vez de agregar la pregunta a `S.clase.descartadas`, guarda `S.clase.evitar = p.pregunta` (un duelo descartado tiene que poder jugarse después). Sin `PERS`, igual que hoy.
  - Sin `PERS`: después de calcular `par`, si `opcion("revelacion") && opcion("revancha")`, `par = conRevancha(par, gruposDisponibles(), S.clase.debates)`. Se aplica antes de `base`, así la moción de la IA (con brújula) cae sobre el par final.

- [ ] **Step 2: `empezarPreparacion` con revelación.** Si `!opcion("revelacion")`, la función queda exactamente como hoy y `S.revelado = true`. Si está encendida:
```js
  S.fase = "listo"; S.revelado = false;
  S.finPrep = Date.now() + ROT.SEG_PREPARACION * 1000;
  clearInterval(S.reloj);
  $("preparacion")?.remove();
  mostrarPreparacion(d, datosPreparacion());          // escenas.js (Task 8)
  pulsoPreparacion(S.finPrep);                          // musica.js
  const tic = () => {
    if (S.fase !== "listo" || !S.finPrep) return;
    const resta = Math.max(0, Math.ceil((S.finPrep - Date.now()) / 1000));
    $("reloj").textContent = fmt(resta);
    actualizarPreparacion(resta, ROT.SEG_PREPARACION);  // escenas.js
    if (resta <= 0) revelar();
  };
  S.reloj = setInterval(tic, 250); tic();
  $("btnPrincipal").textContent = "REVELAR YA ▶";
  tick(`Debate ${d.n}: todos preparan. Al terminar el minuto se revela quién pasa al frente.`);
```
  `datosPreparacion()` (nueva, en `clase.js`) devuelve `{ tema: S.clase.tema || SESION.tema, duelos: PERS ? duelosPendientes(PREGUNTAS, S.clase.debates.slice(0, -1).map(x => x.pregunta), PERS) : null, ultimo: PERS && duelosPendientes(...).length === 1 }`. Ojo: `publicarDebate` ya empujó el debate en curso a `S.clase.debates`; por eso se excluye el último al calcular los pendientes (el duelo en curso tiene que aparecer como tarjeta).

- [ ] **Step 3: `revelar()` y `entrada()`.**
```js
// Fin del minuto: se revela quién pasa al frente. Cada paso comprueba que siga siendo el mismo
// debate (el profesor pudo terminar la clase o saltar la escena).
async function revelar() {
  const d = S.debate;
  if (!d || S.fase !== "listo") return;
  clearInterval(S.reloj); S.finPrep = null;
  S.fase = "revelando"; S.revelado = true;
  $("btnPrincipal").textContent = "SALTAR ▶";
  publicarEstado();
  tick(`Debate ${d.n}: ${nombreG(d.A)} (${EQUIPOS.A.nombre}) contra ${nombreG(d.B)} (${EQUIPOS.B.nombre}).`);
  await mostrarRevelacion(d, datosPreparacion());      // escenas.js
  if (S.fase === "revelando" && S.debate === d) entrada();
}

function entrada() {
  const d = S.debate;
  if (!d || S.fase !== "revelando") return;
  S.fase = "entrada";
  S.finEntrada = Date.now() + ROT.SEG_ENTRADA * 1000;
  $("btnPrincipal").textContent = "▶ EMPEZAR DEBATE";
  publicarEstado();
  musicaEntrada(ROT.SEG_ENTRADA);
  mostrarEntrada(d, integrantesDebate(), ROT.SEG_ENTRADA).then(() => {   // escenas.js
    if (S.fase === "entrada" && S.debate === d) { pararMusica(); cerrarEscena(); abrirRonda(); }
  });
}
// Quiénes suben al escenario: { A: [{ nombre, foto }], B: [...] } desde la lista de la sala.
function integrantesDebate() {
  const js = typeof window.jugadoresSala === "function" ? Object.values(window.jugadoresSala()) : [];
  const de = g => js.filter(j => j.grupo === g).map(j => ({ nombre: j.nombre || "", foto: j.foto || "" }));
  return S.debate ? { A: de(S.debate.A), B: de(S.debate.B) } : { A: [], B: [] };
}
```
En `abrirRonda` (app.js) agrega al comienzo `pararMusica?.(); if ($("escena") && ["listo","revelando","entrada"].includes(S.fase)) cerrarEscena();` — usa `typeof pararMusica === "function"` para no romper `pruebas/simular.js`.

- [ ] **Step 4: Botón principal y terminar clase.** En `accionPrincipal`:
```js
  else if (S.fase === "listo") (S.revelado ? abrirRonda() : revelar());
  else if (S.fase === "revelando") saltarEscena();
  else if (S.fase === "entrada") saltarEscena();
```
En `terminarClase`, agrega `"revelando", "entrada"` a la lista de fases con debate en curso, y `pararMusica?.()` (con guarda de `typeof`).

- [ ] **Step 5: Lo que se publica (`online.js`).** En `estadoPublico()`:
```js
    // con revelación, durante la preparación el par no se publica (y con personajes, tampoco la moción)
    debate: S.debate ? (S.fase === "listo" && !S.revelado
      ? { n: S.debate.n, pregunta: PERS ? null : S.debate.pregunta, A: null, B: null, posturas: PERS ? null : S.debate.posturas || null }
      : { n: S.debate.n, pregunta: S.debate.pregunta, A: S.debate.A, B: S.debate.B, posturas: S.debate.posturas || null }) : null,
    revelado: S.revelado !== false,
    finEntrada: S.fase === "entrada" ? S.finEntrada || null : null,
    duelos: PERS && S.fase === "listo" && !S.revelado ? datosPreparacion().duelos : null,
    opciones: { ...OPCIONES_DEFECTO, ...(S.clase.opciones || {}) },
```
  Revisa que ningún otro campo de `estadoPublico` filtre el par durante `listo` sin revelar: `debates` (la lista) incluye el debate en curso con `A`/`B` → filtra el último si `S.fase === "listo" && !S.revelado` (`S.clase.debates.filter((d, i) => !(i === S.clase.debates.length - 1 && S.fase === "listo" && !S.revelado))`).
  En `estadoPrivado()` agrega `revelado: S.revelado !== false`.
  En `restaurar`: `["revelando", "entrada"]` se restauran como `"listo"` con `S.revelado = true` (el botón dice ▶ REANUDAR TRAMO y abre directo); en otros casos `S.revelado = priv.revelado !== false`.
  En `crearSala`: `S.clase.opciones = { ...OPCIONES_DEFECTO };`.

- [ ] **Step 6: Pruebas.** Run: `node --test pruebas/` — Expected: PASS. Después prueba a mano (Task 8 termina las escenas).

- [ ] **Step 7: Commit.**
```bash
git add clase.js online.js app.js
git commit -m "Preparación universal: el par se revela al final del minuto (duelo sorteado con personajes, revancha sin ellos)"
```

### Task 8: Las escenas de preparación, revelación y entrada (`escenas.js`, `index.html`)

**Files:**
- Modify: `escenas.js` (sección nueva «6. PREPARACIÓN, REVELACIÓN Y ENTRADA»)
- Modify: `index.html` (CSS)

Todas usan `escena(clase)` (pantalla completa `#escena`, con el botón `#esSig` que llama a `accionPrincipal`) y `esperar(ms)` (saltable). Estética: la de la intro (`.in-*`): fondo radial oscuro, Georgia para la moción, colores de `EQUIPOS`, letras enormes. Nada más en pantalla.

- [ ] **Step 1: `mostrarPreparacion(d, { tema, duelos, ultimo })`.**
  - Sin personajes: `<div class="es-k">DEBATE ${n} · PREPARACIÓN · todos preparan los dos lados</div>`, la moción en `.pp-q` (Georgia, `min(5.6vw,58px)`), dos `.pp-lado` con borde superior del color de `EQUIPOS.A/B`: título `A FAVOR` / `EN CONTRA` y la postura (`d.posturas.A/B`). **Sin nombres de grupo.**
  - Con personajes: `<div class="es-k">${ultimo ? "ÚLTIMO DUELO" : "¿QUÉ DUELO SIGUE?"} · PREPARACIÓN</div>`, el tema en `.pp-tema`, y una `.pp-duelo[data-t="<texto>"]` por duelo: dos retratos `.pp-ret` (círculo con iniciales y el `color` del personaje, `nombre` debajo) a los lados de «vs», y la moción en una línea. Usa `personajeDe(x.A, PERS)`.
  - Un anillo SVG `#ppAnillo` (círculo de 120 px, trazo neón) con el número `#ppNum` al centro.
  - Pie: `Nadie sabe quién pasa al frente. Al llegar a cero, el relator lo revela.`
  - `botonEscena("REVELAR YA ▶")`.
- [ ] **Step 2: `actualizarPreparacion(resta, total)`** ajusta `stroke-dashoffset` del anillo y `#ppNum`; en los últimos 10 s el anillo pasa a `var(--hot)` y late (clase `.urgente` con la animación `pulso`).
- [ ] **Step 3: `mostrarRevelacion(d, { duelos })` (async, ~8 s, saltable).**
  - Sin personajes: la escena se vacía; `¿QUIÉN PASA AL FRENTE?` en grande; `redobleRevelacion()`; una «tragamonedas» `.rv-slot` que pasa por los nombres de todos los grupos con gente (`nombreGrupo(g)` de `clase.js`, cada 90 ms) durante 2,4 s; se detiene en `A FAVOR… ${nombreGrupo(d.A)}` (texto en el color de A, clase `.rv-golpe` con escala), `golpeRevelacion()`, `esperar(1500)`; luego lo mismo para `EN CONTRA… ${nombreGrupo(d.B)}`, `esperar(2000)`.
  - Con personajes: si la escena de preparación sigue abierta, reutiliza sus tarjetas (si no, dibújalas otra vez). Si hay más de una: un resaltado `.pp-duelo.foco` que recorre las tarjetas cada 150 ms durante 2,4 s con `redobleRevelacion()`; después las que no tocan reciben `.apaga` (opacidad .15), la elegida `.elegida` (se centra y agranda, transición .8 s), `golpeRevelacion()`, la moción de la elegida pasa a `.pp-q` en grande, `esperar(3000)`. Si queda una sola tarjeta, sin recorrido: directo a `.elegida`.
  - Comprueba `el.isConnected` después de cada `esperar` (como `mostrarVeredictoJueces`).
- [ ] **Step 4: `mostrarEntrada(d, integrantes, segundos)` (async).** `escena("entrada")`, `botonEscena("▶ EMPEZAR DEBATE")`. Mitad del tiempo para cada lado: `EN ESTA ESQUINA…` en ámbar, luego el nombre (`nombreG(d.A)`) enorme en el color del personaje o de `EQUIPOS.A`, `A FAVOR`, y las caras (`avatarHtml(j, 96)` con `--c`) que entran de a una (`.po-j.llega` ya existe). Después lo mismo para B (`Y EN ESTA OTRA…`). Termina con `esperar` del resto.
- [ ] **Step 5: CSS en `index.html`** junto a las reglas de `.escena`: `.pp-q`, `.pp-lados`, `.pp-lado`, `.pp-tema`, `.pp-duelos` (columna, gap 18px, ancho `min(1200px,92vw)`), `.pp-duelo` (grid `1fr auto 1fr`, fondo `var(--panel)`, borde, radio 16px, transición de opacidad y transform .8s), `.pp-duelo.foco` (borde ámbar, sombra), `.pp-duelo.apaga{opacity:.15}`, `.pp-duelo.elegida{transform:scale(1.12);border-color:var(--amber)}`, `.pp-ret` (círculo 84px, borde 4px del color), `#ppAnillo`, `.rv-slot` (mono, 64px), `.rv-golpe` (animación de escala 1.4→1), `.en-esquina`, `.en-nombre` (`min(9vw,110px)`, 800). Mira `.in-*` y `.es-*` para mantener el lenguaje visual.
- [ ] **Step 6: Probar a mano con la semana 308 y con la 7.** Sin alumnos reales: abre `index.html?semana=308` (modo local, sin sala) — el ciclo local también pasa por `publicarDebate`. Verifica: preparación con tres tarjetas y el anillo; al saltar, el recorrido y la tarjeta elegida; la entrada con los dos lados; el debate se abre. Con `?semana=7`: moción grande, «A FAVOR… Grupo N». Toma capturas con Playwright (`page.screenshot`) y míralas.
- [ ] **Step 7: Commit.**
```bash
git add escenas.js index.html
git commit -m "Escenas de preparación, revelación y entrada al escenario"
```

### Task 9: El teléfono en la preparación y la revelación (`jugar.js`, `jugar.html`)

**Files:**
- Modify: `jugar.js` (`pintarEntre`, `pintarSala`, `pintarReloj`)
- Modify: `jugar.html` (CSS, `?v=`)

- [ ] **Step 1: Preparación para todos.** En `pintarEntre`, agrega `"revelando", "entrada"` a `fases`. Si `s.fase === "listo" && s.revelado === false` (revelación encendida):
  - Sin personajes (`!s.duelos`): `Debate ${n} · preparación`, `<h1>Prepara los dos lados</h1>`, la moción (`d.pregunta`), `.es-lados` con A FAVOR (`d.posturas.A`) y EN CONTRA (`d.posturas.B`) **sin nombres de grupo**, el reloj `#prepReloj`, y `<div class="es-papel">Nadie sabe quién pasa al frente: al terminar el minuto se revela. Puedes ser tú, de cualquiera de los dos lados.</div>`.
  - Con personajes (`s.duelos`): `<h1>¿Qué duelo sigue?</h1>`, una tarjeta por duelo (`.pr-duelo`: «Huang vs Amodei» con los colores y la moción) con la mía destacada (`.mio`, borde neón) y, si está, arriba: `Si sale tu duelo, defiendes esto: <b>${favor o contra según mi lado}</b>` (mi lado = `personajeDe(J.grupo, PJ()).lado`, texto de `x.favor`/`x.contra` de mi tarjeta).
  - Debajo, el botón `🎤 Probar micrófono` (`#btnProbarMic`, lo implementa la Task 14; aquí solo el hueco con `oculto` si `!opcionActiva(s.opciones, "voz")`).
  - La vista vieja (solo los dos grupos) queda para `s.revelado !== false`.
- [ ] **Step 2: Revelación.** Si `s.fase === "revelando" || s.fase === "entrada"`:
  - Si mi grupo es `d.A` o `d.B`: `document.body` recibe la clase `sube` y `--c` = color de mi lado (`s.equipos[rol].color`, o el `color` de mi personaje con `PJ()`); `<h1 class="sube-t">¡SUBEN AL ESCENARIO!</h1>`, `Tu grupo defiende ${s.equipos[rol].nombre}`, la moción; en `entrada`, `Pasen al frente con el teléfono: el debate es en voz alta.`. Vibra una vez por debate (`J.subeVisto !== d.n`): `navigator.vibrate?.([200, 80, 200, 80, 400])`.
  - Si no: `<h1>Eres tribuna</h1>`, `${nomG(d.A)} contra ${nomG(d.B)}`, la moción y `Mientras debaten: mueve el termómetro, reacciona y manda una pregunta.`.
  - Al salir de esas fases, quita la clase `sube` del body.
- [ ] **Step 3: CSS en `jugar.html`**: `body.sube #entre{background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--c) 55%,#000) 0%,var(--bg) 75%)}`, `.sube-t{font-size:34px;font-weight:900;color:#fff;text-shadow:0 0 24px var(--c);animation:subeGolpe .6s cubic-bezier(.2,1.6,.4,1)}` con su keyframes, `.pr-duelo`, `.pr-duelo.mio`. Cambia los `?v=` de los scripts que cambiaron a `20260929a`.
- [ ] **Step 4: Probar** con la sala real en el emulador o, si todavía no hay arnés, revisar en código que ninguna rama use `d.A` cuando es `null` (en `pintarSala`, `rolEn` devuelve `"P"` y `J.debateVisto` cambia: el aviso «Tu grupo debate…» no debe salir con `A` nulo; comprueba que `debatiendo` es falso y que la barra no se pinta).
- [ ] **Step 5: Commit.**
```bash
git add jugar.js jugar.html
git commit -m "Teléfono: todos preparan, y la revelación tiñe los teléfonos que suben al escenario"
```

---

## Fase B — Escenario y control

### Task 10: Órdenes y resumen para el control (`online.js`, `clase.js`)

**Files:**
- Modify: `clase.js` (extraer acciones de la propuesta a funciones sin DOM)
- Modify: `online.js` (`privado/control`, dispatcher de `privado/orden`)

- [ ] **Step 1: Acciones sin DOM en `clase.js`.**
  - `publicarPropuestaActual(datos = null)`: si viene `datos = { pregunta, A, B }`, usa esos valores en vez de leer `#prTexto`, `#prA`, `#prB`.
  - `pedirOtraPropuesta()` (de la Task 7).
  - `cambiarLadosPropuesta()`: intercambia `S.clase.propuesta.A/B` y, si existen, los `<select>`; llama `mostrarPropuesta()`.
  - `elegirGruposPropuesta(A, B)`: fija `S.clase.propuesta.A/B`, recalcula `aviso` con `avisoDuelo`, `mostrarPropuesta()`.
  - `detenerCuentaPropuesta()`: `clearInterval(cuentaPropuesta); S.cuentaHasta = null;`.
  - En `mostrarPropuesta`, cuando arranca la cuenta, guarda `S.cuentaHasta = Date.now() + ROT.SEG_PROPUESTA * 1000` y llama `publicarEstado()`; al detenerla, `S.cuentaHasta = null`.
  - `sumarTiempo(ms)`: con banco activo (Task 15) `S.banco = sumar(S.banco, ms)`; si no, `S.finRonda += ms`. El botón `+1 MIN` pasa a llamar `sumarTiempo(60000)`.
  - `fijarOpcion(k, v)`: `S.clase.opciones = { ...OPCIONES_DEFECTO, ...(S.clase.opciones || {}), [k]: !!v }`; si `k === "musica" && !v` → `pararMusica()`; si `k === "vozIA" && !v` → `callarIA()`; `publicarEstado()`.
- [ ] **Step 2: `estadoControl()` en `online.js`** (se escribe en `salas/{codigo}/privado/control` dentro de `publicar()`, después de los otros dos `setDoc`):
```js
function estadoControl() {
  const p = S.clase.propuesta;
  return {
    t: Date.now(), ack: ON.ultimaOrden || 0,
    fase: S.fase, etapa: S.etapa || null, principal: $("btnPrincipal").textContent,
    debate: S.debate ? { n: S.debate.n, pregunta: S.debate.pregunta, A: S.debate.A, B: S.debate.B } : null,
    propuesta: p ? { estado: p.estado, pregunta: p.pregunta || "", porQue: p.porQue || "", A: p.A, B: p.B, aviso: p.aviso || "",
      favor: p.favor || "", contra: p.contra || "", cuentaHasta: S.cuentaHasta || null } : null,
    grupos: Array.from({ length: S.clase.grupos }, (_, i) => i + 1).map(n => ({ n, nombre: nombreGrupo(n),
      gente: Object.values(ON.jugadores).filter(j => j.grupo === n).length })),
    opciones: { ...OPCIONES_DEFECTO, ...(S.clase.opciones || {}) },
    banco: S.banco ? { A: S.banco.A, B: S.banco.B, corre: S.bancoCorre || { A: false, B: false }, t: Date.now() } : null,
    finRonda: S.fase === "abierta" ? S.finRonda || null : null, finPrep: S.finPrep || null, finVoto: S.fase === "votando" ? S.finVoto || null : null,
    votos: { n: (S.publico.A || 0) + (S.publico.B || 0), elegibles: S.publico.elegibles || 0 },
    hablando: typeof window.hablaSala === "function" ? window.hablaSala().map(h => h.nombre) : [],
    eventos: EVENTOS.map(e => ({ id: e.id, titular: e.titular }))
  };
}
```
- [ ] **Step 3: Dispatcher.** En el `onSnapshot` de `privado/orden` (`online.js`, ~línea 207), conserva lo de `terminar` y agrega: si `data.cmd && data.t > (ON.ultimaOrden || 0)` (la primera foto no cuenta, como `ordenVista`), `ON.ultimaOrden = data.t` y:
```js
const ORDENES = {
  principal: () => accionPrincipal(),
  publicar: a => publicarPropuestaActual(a && a.pregunta ? a : null),
  otra: () => pedirOtraPropuesta(),
  lados: () => cambiarLadosPropuesta(),
  grupos: a => elegirGruposPropuesta(+a.A, +a.B),
  detener: () => detenerCuentaPropuesta(),
  mas30: () => sumarTiempo(30000),
  moderadora: () => { if (S.fase === "abierta") moderadorTalvez(true); },
  shock: a => { $("selEvento").value = a; lanzarEvento(); },
  opcion: a => fijarOpcion(a.k, a.v),
  escenario: a => window.modoEscenario?.(!!a),
  terminar: () => { terminarClase(true); S.veredictoRevelado = true; }
};
```
  Ejecuta `ORDENES[data.cmd]?.(data.arg)` dentro de `try/catch` (el error va a `tick`) y después `publicar()` (así el control recibe el `ack`).
- [ ] **Step 4: Pruebas** `node --test pruebas/` (PASS) y `node --check online.js clase.js`.
- [ ] **Step 5: Commit.**
```bash
git add clase.js online.js
git commit -m "La pantalla atiende órdenes del control y le publica un resumen privado"
```

### Task 11: El control del profesor (`control.html`, `control.js`)

**Files:**
- Create: `control.html`, `control.js`
- Modify: `online.js` (botón 📱 CONTROL con QR en la barra de la sala)

Página para celular, oscura, con la paleta de `jugar.html`. Entra con Google como el profesor (mismo patrón que `jugar.js`: `signInWithPopup`, `onAuthStateChanged`). URL: `control.html?sala=CODIGO`.

- [ ] **Step 1: `control.html`**: `<header>` con `TRIBUNA · CONTROL`, el código de sala y un punto de conexión; `<main id="c">`; estilos: botón principal `.cp` (ancho completo, 72px de alto, neón, 22px 800), tarjetas `.cc`, fila de acciones `.ca` (botones de 48px), interruptores `.sw` (fila con etiqueta y un `input[type=checkbox]` grande). Carga `rotacion.js?v=20260929a` (para `OPCIONES_DEFECTO`, `opcionActiva`, `rotuloGrupo`) y `control.js` como módulo.
- [ ] **Step 2: `control.js`**:
  - Suscripciones: `salas/{codigo}` (estado público: fase, debate, conteos, `personajes`, `banco`, `punto`) y `salas/{codigo}/privado/control` (lo privado). Si `privado/control` da `permission-denied`: «Esta cuenta no es la del profesor de la sala».
  - `mandar(cmd, arg)`: `setDoc(doc(db,"salas",codigo,"privado","orden"), { cmd, arg: arg ?? null, t: Date.now() })`. Mientras `control.ack < t` enviado, los botones quedan deshabilitados con «…» (la pantalla lo confirma en su próxima publicación). Si a los 5 s no llega el ack: «La pantalla no responde: ¿está abierta?».
  - Render según `control.fase`:
    - Siempre arriba: fase en palabras (`propuesta` → «Próximo debate», `listo` → «Preparación», `revelando` → «Revelación», `entrada` → «Entrada», `abierta` → «Debate», `votando` → «Votación», `veredictoPublico`/`veredictoJueces` → «Veredicto», `resultado` → «Resultado», `fin` → «Clase terminada») y un reloj (de `finPrep`, `finRonda` o `finVoto`, calculado localmente cada 250 ms).
    - Botón principal `.cp` con el texto `control.principal` → `mandar("principal")`.
    - En `propuesta`: tarjeta «Lo ves solo tú» con `textarea` de la pregunta (al enfocarla, `mandar("detener")`), `porQue`, los dos `select` de grupos (de `control.grupos`, con «(n)» gente) y botones **Publicar** (`mandar("publicar", { pregunta, A, B })`), **Otra** (`otra`), **⇄ lados** (`lados`); la cuenta «se publica en N s» desde `cuentaHasta`; el `aviso` en ámbar. Si cambian los `select`, `mandar("grupos", { A, B })`.
    - En `abierta`: quién habla (`control.hablando`), los dos bancos (con `restante()` de `ajedrez.js`: cárgalo también en `control.html`), votos no aplica; botones **+30 s**, **🎙 Moderadora**, **⚡ Shock** (abre un `select` de `control.eventos` y confirma).
    - En `votando`: `votos.n de votos.elegibles`.
    - Abajo, siempre: los siete interruptores (`opciones`) con su nombre en castellano (`revelacion` «Revelación dramática», `revancha` «Revancha», `musica` «Música», `voz` «Debate en voz alta», `reloj` «Reloj de ajedrez», `punto` «Punto de información», `vozIA` «La IA habla en voz alta») → `mandar("opcion", { k, v })`; **⛶ Escenario** on/off (`escenario`); y **🏁 Terminar clase** con `confirm`.
- [ ] **Step 3: Botón en la pantalla.** En `pintarBarraOnline` (`online.js`) agrega `<button class="btn" id="btnControl">📱 CONTROL</button>`, que abre `abrirModal` con un QR (`qrcode(0,"M")` de qrcode-generator, como en la portada) de `…/control.html?sala=CODIGO` y la URL en texto.
- [ ] **Step 4: Probar** en el emulador: control y pantalla con la misma cuenta; publicar desde el control, cambiar grupos, pedir otra, apagar música, +30 s. Verifica que el botón principal del control avanza cada fase.
- [ ] **Step 5: Commit.**
```bash
git add control.html control.js online.js
git commit -m "El control del profesor en el celular"
```

### Task 12: El modo escenario (`escenario.js`, `index.html`)

**Files:**
- Create: `escenario.js`
- Modify: `index.html` (CSS `body.escenario`, script, botón ⛶ ESCENARIO en el pie)
- Modify: `online.js` (`window.hablaSala` si aún no existe → lo crea la Task 15; aquí usa `typeof … === "function"`)

- [ ] **Step 1: Modo.** `window.modoEscenario(on)`: alterna `document.body.classList.toggle("escenario", on)`, guarda en `localStorage("tribuna_escenario")`, y llama `pintarEscenario()`. Se enciende con `?escenario=1`, con el botón **⛶ ESCENARIO** (en el `<footer>`, junto a 📖 INTRO) y con la orden del control. **Esc** lo apaga (solo si no hay `#escena` ni modal abiertos).
- [ ] **Step 2: CSS.** `body.escenario > header, body.escenario > .marcador, body.escenario > main, body.escenario > footer, body.escenario #barraOnline, body.escenario #barraEntrar {display:none}`. `#escenarioVista{position:fixed;inset:0;z-index:50;display:none}` y `body.escenario #escenarioVista{display:flex}`. Las escenas (`.escena` z 57, `#resultado` 58, `#ceremonia` 60, portada/intro 55) quedan por encima, como hoy.
- [ ] **Step 3: La vista (`pintarEscenario()`, cada 300 ms y en cada `recibirChat`/`publicar`).** Según `S.fase`:
  - `propuesta` / `resultado` (sin escena encima): «EN UN MOMENTO, EL PRÓXIMO DEBATE» y el ranking de grupos (top 5, con `nombreGrupo`), grande.
  - `abierta`: el debate:
    - **Podios** izquierda (A) y derecha (B): nombre (`nombreG`), `A FAVOR`/`EN CONTRA`, color; las caras de sus integrantes (`avatarHtml`), la de quien habla más grande y con halo; el **reloj** del lado (`fmt` de segundos de `S.banco[k]`, o el reloj del tramo si el banco está apagado), que se pone rojo bajo 20 s y gris en 0 («SIN TIEMPO · solo escribe»).
    - **Subtítulo en vivo**: por cada ficha con habla vigente (`window.hablaSala()`, Task 15), bajo su podio, `nombre` y el texto provisional en `min(3.4vw,40px)`, con cursor parpadeante. Si nadie habla, el último mensaje de alumno del debate, más chico.
    - **Centro**: los últimos 4 mensajes (`S.chat` del debate en curso, alumnos, moderadora, noticias), en tarjetas compactas; los 🎤 con el ícono. Sobre cada uno, sus 🔥🤔🤝 (`S.reacciones`); cuando un conteo sube, un emoji `.flota` sube y se desvanece (1,5 s).
    - **La duda de la tribuna**: si el id está en `reg.pedidosFuente`, la tarjeta lleva el sello `LA TRIBUNA DUDA` (rotado, borde ámbar).
    - **Rótulo inferior de la moderadora**: el último mensaje `mod` de los últimos 12 s aparece abajo en una franja morada (`🎙 MODERADORA`), grande. Si es una pregunta de la tribuna (`datos.tribuna === "pregunta"`), la franja es ámbar, con la foto (de `jugadoresSala()[uid].foto`) y el nombre de quien la hizo y la pregunta en grande.
    - **Punto de información** (`S.punto`, Task 15): banner central `✋ PUNTO DE INFORMACIÓN — ${nombre} pide la palabra` (pedido), `ACEPTADO · ${s} s` (aceptado, cuenta regresiva), `RECHAZADO` / `SIN RESPUESTA` (cerrado).
    - **El gusano**: franja al pie (alto 110px) con la curva del termómetro: reutiliza el SVG de `pintarTermometro` (extrae la función que arma el `<svg>` a `svgTermometro(W, H)` en `app.js` y úsala en los dos lugares).
    - **Barras de participación**: reutiliza lo que pinta `barravista.js` si expone una función; si no, omítelas en el escenario (no es crítico).
- [ ] **Step 4: Probar** en local (sin sala) simulando alumnos con el compositor (`@Nombre: texto`) y en el emulador. Capturas en 1920×1080 y 1280×720: nada se corta, letras legibles desde el fondo de la sala.
- [ ] **Step 5: Commit.**
```bash
git add escenario.js index.html app.js online.js
git commit -m "Modo escenario: el proyector sin botones, con podios, subtítulos y el gusano"
```

---

## Fase C — Viva voz

### Task 13: Voz de la IA y avisos a los jueces (`moderacion.js`, `jueces.js`)

**Files:**
- Modify: `moderacion.js` (`recibirChat`, `lanzarPreguntaTribuna`, `transcripcionChat`, `promptModerador`)
- Modify: `jueces.js` (`promptJuez`)

- [ ] **Step 1: La IA habla.** En `recibirChat`, dentro del `for (const m of nuevos)` (no en la carga inicial), si `(m.tipo === "mod" || m.tipo === "relator") && opcionActiva(S.clase.opciones, "vozIA") && typeof hablarIA === "function"` → `hablarIA(textoHablado(m, EQUIPOS))`. Solo en la pantalla del profesor (este archivo solo corre ahí).
- [ ] **Step 2: La tribuna nombra a su autor.** En `lanzarPreguntaTribuna`, `datos: { tribuna: "pregunta", uid: p.uid, nombre: p.nombre || "" }`.
- [ ] **Step 3: 🎤 en las transcripciones.** En `transcripcionChat`, para alumnos con `m.voz`: `[${EQUIPOS…} · ${m.nombre} · 🎤] ${m.texto}`. En `promptModerador`, antes de «CÓMO MODERAS», agrega (solo si hay algún mensaje con `voz` en el debate):
  `LOS MENSAJES MARCADOS 🎤 son transcripciones automáticas de lo que se dijo en voz alta: no comentes muletillas, puntuación ni nombres propios mal transcritos.`
  En `promptJuez` (`jueces.js`), después de «LA CONVERSACIÓN…», la misma aclaración, redactada para jueces: `Los mensajes marcados 🎤 son transcripciones automáticas de algo dicho en voz alta: no castigues muletillas, puntuación ni nombres propios mal transcritos; juzga el argumento.` (`transcripcionChat` ya lleva la marca).
- [ ] **Step 4:** `node --test pruebas/` — PASS. Si `pruebas/jueces.test.js` falla por el texto nuevo del prompt, **no lo edites** (tiene cambios del profesor sin commitear): haz que la aclaración vaya solo cuando la transcripción contiene «🎤» y reporta.
- [ ] **Step 5: Commit.**
```bash
git add moderacion.js jueces.js
git commit -m "La moderadora y el relator hablan; jueces y moderadora saben que 🎤 es una transcripción"
```

### Task 14: Mantener para hablar (`jugar.js`, `jugar.html`)

**Files:**
- Modify: `jugar.js` (sección nueva «hablar», reutiliza `Reconocedor`, `registro()`, `enviar` refactorizado)
- Modify: `jugar.html` (cargar `ajedrez.js`, `punto.js`; CSS del botón)

- [ ] **Step 1: Refactor de `enviar`.** Extrae `enviarTexto(texto, { voz = false } = {})` (el cuerpo de `enviar` desde el `setDoc` del mensaje hasta la telemetría); agrega `voz: true` al documento del mensaje cuando corresponde y, en la telemetría, `dictado: texto.length` si `voz`. `enviar()` queda como `enviarTexto($("tx").value.trim())` más la limpieza de la caja.
- [ ] **Step 2: Estado y botón.** `const HABLA = { rec: null, apretado: false, final: "", interino: "", t0: 0, ultimoLatido: 0, timer: null };` y `HABLA.CADA = 800` (una escritura por segundo como mucho: el límite sostenido de Firestore por documento), `HABLA.MAX = 60000`.
  `puedoHablar(s)`: `opcionActiva(s.opciones,"voz") && Reconocedor && s.fase === "abierta" && s.debate && (mi lado es A o B) && (sin reloj || restante(s.banco, Date.now())[miLado] > 0 || puedeHablarPorPunto(s.punto, J.uid, Date.now()))`. Un integrante del lado que **recibe** un punto aceptado no está bloqueado (su banco decide).
- [ ] **Step 3: Apretar.** `empezarHablar()` (en `pointerdown` del botón; `e.preventDefault()`; `setPointerCapture`): si `!puedoHablar` → aviso y return. Crea `new Reconocedor()` (`es-CL`, `continuous`, `interimResults`), `HABLA.apretado = true`, `t0 = Date.now()`. `onresult` acumula `final` e `interino` como `empezarDictado`, pinta el texto propio en `#miHabla` y llama `latido()`. `onend`: si sigue apretado, `rec.start()` otra vez (Chrome corta tras silencios). `onerror` `not-allowed` → «Permite el micrófono…» y soltar. Vibra 20 ms. Escribe el primer latido de inmediato.
  `latido(forzar)`: si `forzar || Date.now() - ultimoLatido >= HABLA.CADA` → `setDoc(jugadores/uid, { habla: { debate: s.debate.n, t0, t: Date.now(), texto: (final + interino).slice(-300) } }, { merge: true })`. Un `setInterval` de 800 ms mientras está apretado garantiza el latido aunque no llegue texto.
  A los 60 s desde `t0`: `enviarTexto(final + interino, { voz: true })`, reinicia `final`, `interino`, `t0` y sigue.
- [ ] **Step 4: Soltar.** `soltarHablar()` (en `pointerup`, `pointercancel`, y si el teléfono se oculta): `apretado = false`, `rec.stop()`, espera `onend` o 1200 ms (lo que ocurra primero), toma `(final + " " + interino).trim()`, y si tiene al menos 2 palabras lo envía con `enviarTexto(texto, { voz: true })`. Luego `setDoc(jugadores/uid, { habla: null }, { merge: true })`, limpia `#miHabla`. Si se corta el tramo mientras habla (`pintarCaja` con `!abierta`), `rec.abort()` y `habla: null` sin enviar.
- [ ] **Step 5: 🎤 Probar micrófono** (`#btnProbarMic`, visible en la preparación de la Task 9 si `Reconocedor` existe y la voz está encendida): `navigator.mediaDevices.getUserMedia({ audio: true })`, detiene las pistas y muestra `✓ Micrófono listo`; si falla, `Permite el micrófono para este sitio (candado de la barra de direcciones).`. Guarda `localStorage("tribuna_mic_ok")`.
- [ ] **Step 6: CSS/HTML en `jugar.html`**: carga `ajedrez.js?v=20260929a` y `punto.js?v=20260929a` antes de `jugar.js`. El botón `#btnHablar` vive en la vista de la Task 16; aquí define `.hablar{width:min(62vw,260px);aspect-ratio:1;border-radius:50%;border:6px solid #fff3;background:radial-gradient(circle,#fff2,#0000),var(--c);color:#fff;font:900 20px system-ui;touch-action:none;user-select:none;-webkit-user-select:none}` y `.hablar.on{transform:scale(.94);box-shadow:0 0 0 14px #ffffff22,0 0 60px var(--c);animation:micPulso 1s infinite}`, `.hablar:disabled{filter:grayscale(1);opacity:.4}`.
- [ ] **Step 7: Probar** en el navegador del computador con micrófono (Chrome) y con el `SpeechRecognition` falso del arnés (Task 18). Verifica: el mensaje llega con `voz: true`, la ficha lleva `habla` mientras se aprieta y `null` al soltar, y la telemetría marca todo como dictado.
- [ ] **Step 8: Commit.**
```bash
git add jugar.js jugar.html
git commit -m "Teléfono: mantener para hablar; al soltar, lo dicho entra a la conversación"
```

### Task 15: El reloj de ajedrez, los subtítulos y el punto en la pantalla (`online.js`, `clase.js`, `app.js`, `moderacion.js`)

**Files:**
- Modify: `online.js` (leer `habla`, `punto`, `respondePunto`; publicar `banco` y `punto`; `window.hablaSala`)
- Modify: `app.js` (`abrirRonda`, `cerrarRonda`)
- Modify: `clase.js` (`sumarTiempo` usa el banco)
- Modify: `moderacion.js` (`moderadorTalvez` pasa `hablando`, `ultimaVoz`, `voz`)

- [ ] **Step 1: Leer el habla.** En `online.js`, junto a `notarEscribiendo`, `notarHablando(jugadores)`: `HABLA[uid] = { t, t0, texto, visto }` cuando `j.habla.t` cambió (`visto = Date.now()`, salvo la primera foto: 0); `delete HABLA[uid]` si `j.habla` es null y anota `ON.ultimaVoz = Date.now()` si antes estaba. `window.hablaSala = () => S.debate ? Object.entries(HABLA).filter(([uid, h]) => { const j = ON.jugadores[uid]; return j && h.debate === S.debate.n && Date.now() - h.visto <= AJ.LATIDO && (j.grupo === S.debate.A || j.grupo === S.debate.B); }).map(([uid, h]) => ({ uid, nombre: ON.jugadores[uid].nombre, grupo: ON.jugadores[uid].grupo, texto: h.texto, t0: h.t0 })) : [];` (guarda `debate` en HABLA también). `window.ultimaVoz = () => ON.ultimaVoz || 0`.
- [ ] **Step 2: Punto.** En la misma pasada: para cada jugador con `j.punto && j.punto.debate === S.debate?.n` cuyo `uid + t` no se procesó → `({ punto: S.punto, ultimo: S.puntoUltimo } = pedirPunto(S.punto, { uid, nombre: j.nombre, grupo: j.grupo, lado: j.grupo === S.debate.A ? "A" : j.grupo === S.debate.B ? "B" : null, t: j.punto.t }, { ahora: Date.now(), hablando: hablandoAhora(), ultimo: S.puntoUltimo || {} }))`. Para `j.respondePunto` con `t === S.punto?.t` y `j` del lado `S.punto.para` → `S.punto = responderPunto(S.punto, j.respondePunto, Date.now())`. Si el estado cambió, `publicar()`; con `aceptado`, `tick("✋ Punto aceptado: 15 s para " + nombre)`. Solo si `opcionActiva(S.clase.opciones,"punto")` y `S.fase === "abierta"`.
- [ ] **Step 3: El banco.** En `abrirRonda` (`app.js`), si `S.debate && opcionActiva(S.clase.opciones, "voz") && opcionActiva(S.clase.opciones, "reloj")`: `S.banco = nuevoBanco(tramoActual().seg); S.bancoCorre = { A: false, B: false }; S.finRonda = Date.now() + (tramoActual().seg + AJ.MARGEN) * 1000;` (el reloj de la cabecera muestra el margen total). Si no, `S.banco = null` (como hoy). En el `tic` de 500 ms (bájalo a 250 ms), con `S.banco`:
```js
    const ahora = Date.now(), dt = ahora - (S.bancoT || ahora); S.bancoT = ahora;
    const hablando = hablandoAhora();                          // de window.hablaSala(): { A, B }
    const r = avanzar(S.banco, hablando, dt);
    S.banco = r.banco;
    if (hablando.A !== S.bancoCorre.A || hablando.B !== S.bancoCorre.B || r.agotados.length) { S.bancoCorre = hablando; publicarEstado?.(); }
    for (const k of r.agotados) tick(`${nombreG(S.debate[k])} se quedó sin tiempo: solo puede escribir.`);
    if (S.punto) { const p = vencerPunto(S.punto, ahora); if (p !== S.punto) { S.punto = p; publicarEstado?.(); } }
    if (terminado(S.banco, { abre: S.abreEnLocal, seg: tramoActual().seg, ahora })) cerrarRonda();
```
  (`S.abreEnLocal = Date.now()` al abrir; `hablandoAhora()` en `clase.js`: `const hs = typeof window.hablaSala === "function" ? window.hablaSala() : []; return { A: hs.some(h => h.grupo === S.debate.A), B: hs.some(h => h.grupo === S.debate.B) };`). En `cerrarRonda`, `S.punto = null`.
- [ ] **Step 4: Publicar.** En `estadoPublico`: `banco: S.banco && S.fase === "abierta" ? { A: Math.round(S.banco.A), B: Math.round(S.banco.B), corre: S.bancoCorre, t: Date.now() } : null, punto: S.fase === "abierta" ? S.punto || null : null,`.
- [ ] **Step 5: La moderadora.** En `moderadorTalvez`: `const voz = opcionActiva(S.clase.opciones, "voz"); const hablando = voz && (window.hablaSala?.().length > 0 || puntoActivo(S.punto));` y pasa `{ ahora, abre, forzar: forzar || M.forzarPendiente, hablando, ultimaVoz: window.ultimaVoz?.() || 0, voz }` a `debeIntervenir`. Si `forzar` llega mientras alguien habla, guarda `M.forzarPendiente = true` (se atiende en el próximo silencio: `moderadorTalvez` corre cada 6 s); límpialo al intervenir.
- [ ] **Step 6: `sumarTiempo`** (Task 10) con banco: `S.banco = sumar(S.banco, ms); S.finRonda += ms;`.
- [ ] **Step 7: Pruebas.** `node --test pruebas/` PASS. `pruebas/simular.js` sigue cargando (no llama a nada de esto; revisa que `abrirRonda` no falle sin `window.hablaSala`).
- [ ] **Step 8: Commit.**
```bash
git add online.js app.js clase.js moderacion.js
git commit -m "Reloj de ajedrez, subtítulos y punto de información en la pantalla del profesor"
```

---

## Fase D — Teléfono simplificado

### Task 16: Las vistas en vivo del teléfono (`jugar.js`, `jugar.html`)

**Files:**
- Modify: `jugar.html` (sección `#pVivo` y su CSS)
- Modify: `jugar.js` (`pintarVivo`, integración en `pintarSala`)

Con `opcionActiva(s.opciones, "voz")` y `s.fase === "abierta"`, el teléfono muestra `#pVivo` en lugar de `#pJuego` (salvo que el alumno eligió `J.vistaClasica = true`; un botón flotante `🎙 volver` lo devuelve).

- [ ] **Step 1: Quien debate (A o B).**
  - `#pVivo` con `--c` del color de mi lado (o de mi personaje) y fondo en degradado de ese color.
  - Arriba: `nomG(mi grupo) · A FAVOR/EN CONTRA` y **mi reloj** grande (`restante(s.banco, Date.now())[miLado]`, `m:ss`; rojo bajo 20 s; «SIN TIEMPO · solo puedes escribir» en 0). Sin banco: el reloj del tramo.
  - Centro: `<button id="btnHablar" class="hablar">MANTÉN<br>PARA HABLAR</button>` (Task 14), deshabilitado si `!puedoHablar(s)`; debajo `#miHabla` (lo que voy diciendo). Si otro de mi lado habla (`J.gente` con `habla` vigente, ≤ 2,5 s desde que lo vi cambiar), `🎙 ${nombre} está hablando` sobre el botón.
  - La última línea de la moderadora dirigida a mi grupo o a mí (`meNombran`) en los últimos 60 s, en una franja morada.
  - **Punto**: si habla el otro lado (`J.gente` del otro lado con `habla` vigente) y no hay punto activo (`!puntoActivo(s.punto)`), botón `✋ PUNTO` → `setDoc(jugadores/uid, { punto: { debate: n, t: Date.now() } }, { merge: true })` y muestra «Pedido…» hasta que `s.punto` lo refleje. Si `s.punto.estado === "pedido" && s.punto.para === miLado`: tarjeta `${nombre} (${nomG(grupo)}) pide un punto` con **Aceptar** / **Rechazar** → `setDoc(jugadores/uid, { respondePunto: { t: s.punto.t, acepta } }, { merge: true })`, vibra. Si `s.punto.estado === "aceptado" && s.punto.de === J.uid`: «Tienes la palabra: N s», y el botón de hablar se habilita.
  - Pie: `⌨ escribir` y `ver conversación` → `J.vistaClasica = true; pintarSala();` (se ve la vista de hoy, con `#caja`).
- [ ] **Step 2: Público (P).**
  - Arriba: `nomG(d.A)` vs `nomG(d.B)` en sus colores y los dos relojes chicos.
  - Centro: **quien habla** (de `J.gente`: nombre, grupo en su color, y el texto provisional grande); si nadie habla, el último mensaje de alumno del debate. Debajo, los tres botones 🔥🤔🤝 **para ese mensaje** (el último mensaje de alumno; mientras alguien habla, el último mensaje de ese mismo lado), con la misma escritura que el handler de `prepararPublicoActivo` (extrae la escritura de reacción a `reaccionar(msg, r)` y úsala en los dos lugares).
  - `#voto` (termómetro y ✋) sigue abajo como hoy.
  - Pie: `ver conversación` (vista clásica).
- [ ] **Step 3: Integración.** En `pintarSala`, después de `pintarCaja()`: `pintarVivo(s)`. `pintarVivo` decide si `#pVivo` se ve, oculta `#pJuego`, `#estado` y `#caja` cuando se ve (y los devuelve cuando no), y repinta con un `setInterval` de 300 ms solo el reloj y los subtítulos (no todo el HTML: el botón no puede perder el `pointerdown`). Al pasar a `votando`, `J.vistaClasica = false`.
- [ ] **Step 4: CSS** (`jugar.html`): `#pVivo{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:14px;background:radial-gradient(circle at 50% 35%,color-mix(in srgb,var(--c) 40%,#000) 0%,var(--bg) 78%)}`, `.vv-reloj` (mono 44px 800), `.vv-mod` (franja morada), `.vv-punto` (tarjeta ámbar con dos botones grandes), `.vv-quien`, `.vv-texto` (22px), `.vv-pie` (links). Todo legible con una mano.
- [ ] **Step 5: Probar** con el arnés (Task 18) y en un teléfono real si hay: tamaño 390×844, sin scroll horizontal, el botón se aprieta con el pulgar.
- [ ] **Step 6: Commit.**
```bash
git add jugar.js jugar.html
git commit -m "Teléfono en vivo: el botón de hablar para quien debate, lo que se dice ahora para el público"
```

---

## Fase E — Ensayo general y documentación

### Task 17: README

- [ ] Agrega a `README.md` una sección «## El debate en vivo (desde el 29-sep-2026)» después de «La clase con personajes»: el ciclo nuevo, el control (`control.html?sala=CODIGO`, QR en 📱 CONTROL), el modo escenario, mantener para hablar, el reloj de ajedrez, el punto, la IA con voz, los interruptores y qué hace cada uno apagado, y cómo se prueba. Tono y largo como las otras secciones.
- [ ] Commit: `git add README.md && git commit -m "README: el debate en vivo"`.

### Task 18: Ensayo general contra los emuladores (sin tocar el repo)

Sigue la nota de la memoria `e2e-emuladores-playwright` (proyecto `demo-tribuna`, `page.route` para `firebase-config.js` y reescribir al vuelo `online.js`/`jugar.js`/`admin.js`/**`control.js`**, un contexto por teléfono, cortar `cloudfunctions.net`). Todo el arnés vive en el scratchpad.

- [ ] **SpeechRecognition falso** (`add_init_script` en los teléfonos): una clase con `start()` que, mientras no llamen `stop()`, emite cada 300 ms un resultado provisional que va creciendo con palabras de una frase de prueba, y al `stop()` emite el final y `onend`. `speechSynthesis` del proyector: reemplazo que registra lo que se «dijo» en `window.__dicho`.
- [ ] **Guion (semana 308, 24 teléfonos, cupo 4, un control):**
  1. Portada → inscripción → intro → primera propuesta **en el control** (la pantalla no la muestra). Publicar desde el control.
  2. Preparación: el estado público tiene `debate.A === null`, `debate.pregunta === null` y `duelos.length === 3`; los 24 teléfonos muestran las tres tarjetas.
  3. Revelación y entrada: los teléfonos del duelo sorteado tienen `body.sube`; el resto dice «Eres tribuna».
  4. Debate: un alumno de A mantiene 4 s → el escenario muestra su subtítulo, `banco.A` baja ~4 s, al soltar llega un mensaje con `voz: true`. Un alumno de B pide un punto mientras habla A → A lo acepta → el de B habla 3 s → `banco.B` baja. Otro punto rechazado.
  5. La moderadora no entra mientras alguien mantiene; `__dicho` tiene su texto después.
  6. +30 s desde el control suma a los dos bancos. Apagar `musica` y `vozIA` desde el control llega a `S.clase.opciones`.
  7. Terminar los tres duelos (con los bancos agotados a mano o `principal`), podio.
  8. **Regresión:** una sala con todos los interruptores apagados corre el ciclo de hoy (preparación solo para los dos grupos, sin revelación ni banco), y la semana 307 con brújula sigue formando los mismos grupos.
- [ ] Informe con capturas del escenario (1920×1080) y de un teléfono (390×844) en cada fase. Arreglar lo que falle (cada arreglo, su commit).

---

## Autorrevisión del plan

- Spec A (ciclo, personajes, revancha, qué se publica, entrada, teléfonos, sonido): Tasks 1, 6, 7, 8, 9. Spec B (escenario, control, órdenes): 10, 11, 12. Spec C (hablar, subtítulos, reloj, punto, IA con voz, tribuna, gusano, duda, jueces): 2, 3, 4, 5, 13, 14, 15, 12. Spec D: 16. Interruptores: 1 (defaults), 7 (crearSala), 10 (fijarOpcion), 11 (control). Pruebas: 1–5 y 18.
- Ajustes a la spec, anotados aquí: el punto lo puede responder cualquiera del grupo que lo recibe (Task 3); restaurar la pestaña en revelación o entrada vuelve a la preparación ya revelada, pausada, y ▶ REANUDAR abre el debate (Task 7); el latido del habla es cada 800 ms por el límite de escritura de Firestore (Task 14).
- Nombres usados entre tareas: `opcionActiva`, `OPCIONES_DEFECTO`, `sortearDuelo`, `duelosPendientes`, `conRevancha` (1); `nuevoBanco`, `avanzar`, `hablandoPorLado`, `terminado`, `sumar`, `restante`, `AJ` (2); `pedirPunto`, `responderPunto`, `vencerPunto`, `puntoActivo`, `puedeHablarPorPunto` (3); `debeIntervenir({hablando, ultimaVoz, voz})` (4); `textoHablado`, `hablarIA`, `callarIA` (5); `pulsoPreparacion`, `redobleRevelacion`, `golpeRevelacion`, `musicaEntrada`, `pararMusica` (6); `revelar`, `entrada`, `datosPreparacion`, `integrantesDebate`, `S.revelado`, `S.finEntrada` (7); `mostrarPreparacion`, `actualizarPreparacion`, `mostrarRevelacion`, `mostrarEntrada` (8); `pedirOtraPropuesta`, `cambiarLadosPropuesta`, `elegirGruposPropuesta`, `detenerCuentaPropuesta`, `sumarTiempo`, `fijarOpcion`, `estadoControl` (10); `modoEscenario`, `pintarEscenario`, `svgTermometro` (12); `hablaSala`, `ultimaVoz`, `hablandoAhora`, `S.banco`, `S.bancoCorre`, `S.punto` (15); `enviarTexto`, `puedoHablar`, `empezarHablar`, `soltarHablar` (14); `pintarVivo`, `reaccionar` (16).
