# El profesor modera — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Con el interruptor «Moderas tú», la moderadora de IA se calla y el profesor modera a viva voz desde su control: mantener para hablar, subtítulo en vivo en el proyector y los teléfonos, toma la palabra a los alumnos y lanza las preguntas de la tribuna desde una cola.

**Architecture:** El control (`control.html`) escribe el latido de lo que dice en `salas/{c}/vivo/moderador` (regla nueva) y, al soltar, publica un mensaje `tipo: "mod"` en `mensajes`. El proyector y los teléfonos escuchan ese documento. La moderadora de IA se silencia con `debeIntervenir(..., { profe })`. La cola de la tribuna la arma el proyector (función pura `colaTribuna`) y la publica en `privado/control`; el control manda órdenes `tribuna` / `descartar`. El reconocimiento de voz sale de `jugar.js` a `dictado.js`, compartido.

**Tech Stack:** JavaScript sin bundler (scripts clásicos con globales + módulos ES de Firebase 12.9 desde gstatic), Firestore, `node --test pruebas/`, emulador de Firestore para reglas, Playwright para la prueba de punta a punta.

**Spec:** `docs/superpowers/specs/2026-10-03-moderador-profesor-design.md`

**Convenciones del repo (léelas antes de empezar):**
- Comentarios y nombres en español, en el tono de los existentes. Los módulos puros terminan con `if (typeof module !== "undefined") module.exports = {...}` para que `node --test` los cargue.
- Las páginas cargan los scripts con `?v=AAAAMMDDx`; la tarea 12 sube las versiones de todo lo que cambió.
- Pruebas: `node --test pruebas/` (hoy: 165 pasan). Después de cada tarea tienen que pasar todas.
- Commits chicos, uno por tarea, terminados con `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. El árbol de trabajo tiene cambios ajenos sin commitear (`.gitignore`, `contenido/semana307.js`, `contenido/semana5.js`, dos specs, `pruebas/jueces.test.js`): **nunca** uses `git add -A` ni `git commit -a`; agrega solo los archivos de la tarea.

## Mapa de archivos

| Archivo | Qué | Responsabilidad |
|---|---|---|
| `vozprofe.js` | nuevo, puro | Constantes del moderador humano, latido (`notarProfe`, `profeHabla`) y el mensaje al soltar (`mensajeProfe`) |
| `dictado.js` | nuevo, puro | La «toma» de mantener para hablar: reconocedores, corte de 60 s, espera del final |
| `moderar.js` | nuevo, módulo ES | En el control: el botón HABLAR, el latido, publicar el mensaje, el campo de texto de respaldo, la cola |
| `rotacion.js` | modificar | `modProfe: false` en `OPCIONES_DEFECTO` |
| `ritmo.js` | modificar | `debeIntervenir` con `profe` |
| `publico.js` | modificar | `colaTribuna` |
| `moderacion.js` | modificar | Silenciar la IA, nombre del moderador, cola del control, lanzar/descartar |
| `clase.js` | modificar | Línea de cierre como sistema; nombre del interruptor |
| `online.js` | modificar | Escuchar `vivo/moderador`; `ronda`, `tramo`, `cola` en el resumen; órdenes nuevas |
| `escenario.js` | modificar | Rótulo en vivo del moderador; nombre del mensaje |
| `jugar.js` | modificar | Usa `dictado.js`; escucha al moderador; le cede la palabra; subtítulo |
| `control.js`, `control.html` | modificar | Interruptor, disposición «al pulgar», monta `moderar.js` |
| `firestore.rules`, `pruebas/reglas-emulador.cjs` | modificar | `vivo/{doc}` |
| `index.html`, `jugar.html` | modificar | Cargar los scripts nuevos; versiones |
| `pruebas/vozprofe.test.js`, `pruebas/dictado.test.js` | nuevos | Pruebas |
| `pruebas/ritmo.test.js`, `pruebas/publico.test.js`, `pruebas/rotacion.test.js` | modificar | Pruebas |

---

### Task 1: `vozprofe.js` y el interruptor `modProfe`

**Files:**
- Create: `vozprofe.js`
- Create: `pruebas/vozprofe.test.js`
- Modify: `rotacion.js:287` (`OPCIONES_DEFECTO`)
- Modify: `pruebas/rotacion.test.js:281`

- [ ] **Step 1: Escribir las pruebas que fallan**

`pruebas/vozprofe.test.js`:

```js
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
```

En `pruebas/rotacion.test.js:281`, la lista de claves suma `modProfe`:

```js
  assert.deepEqual(Object.keys(R.OPCIONES_DEFECTO).sort(), ["modProfe", "musica", "punto", "reloj", "revancha", "revelacion", "voz", "vozIA"]);
```

- [ ] **Step 2: Correr y ver que fallan**

Run: `node --test pruebas/vozprofe.test.js pruebas/rotacion.test.js`
Expected: FAIL — `Cannot find module '../vozprofe.js'` y la lista de claves distinta.

- [ ] **Step 3: Implementar**

`vozprofe.js`:

```js
/* =====================================================================
   TRIBUNA — el profesor modera a viva voz desde su control (control.html, moderar.js).
   Con el interruptor «Moderas tú» (modProfe) la moderadora de IA se calla. Mientras el profesor
   aprieta HABLAR, el control escribe en salas/{codigo}/vivo/moderador
   habla: { debate, t0, t, texto } (un latido cada PROFE.CADA ms) y habla: null al soltar; el
   proyector y los teléfonos lo leen para el subtítulo en vivo y para que los alumnos le cedan la
   palabra. Al soltar, el control publica lo dicho como un mensaje del Moderador.
   Como con los alumnos, cuenta cuándo llegó cada latido a ESTE aparato (los relojes no coinciden):
   sin latido hace más de AJ.LATIDO (2,5 s), el moderador está callado (su celular se apagó a mitad).
   ===================================================================== */
const PROFE = { NOMBRE: "Moderador", CADA: 800, TEXTO: 300 };

// Cada foto de vivo/moderador. antes: lo anotado con la foto anterior. primera: la primera foto
// trae un latido viejo (de antes de abrir esta página): no cuenta como «ahora».
function notarProfe(antes, doc, ahora, primera = false) {
  const h = doc && doc.habla;
  if (!h) return { habla: null, visto: 0 };
  if (antes && antes.habla && antes.habla.t === h.t) return { habla: h, visto: antes.visto };
  return { habla: h, visto: primera ? 0 : ahora };
}

// { texto, t0 } si el moderador está hablando en el debate `debate`, o null.
function profeHabla(estado, debate, ahora, latido = (typeof AJ !== "undefined" ? AJ.LATIDO : 2500)) {
  const h = estado && estado.habla;
  if (!h || !debate || h.debate !== debate || !estado.visto || ahora - estado.visto > latido) return null;
  return { texto: String(h.texto || "").slice(-PROFE.TEXTO), t0: h.t0 || 0 };
}

// El mensaje que publica el control al soltar (o al escribir, voz: false). null si no hay nada
// que publicar. Una sola palabra sí sale: «Tiempo.» es una intervención del moderador.
function mensajeProfe({ texto, voz = true, debate, ronda = 0, tramo = 0, ahora = Date.now(), azar = Math.random }) {
  texto = String(texto || "").replace(/\s+/g, " ").trim().slice(0, 1500);
  if (!texto || !debate) return null;
  return { id: "p" + ahora.toString(36) + azar().toString(36).slice(2, 7), tipo: "mod", nombre: PROFE.NOMBRE, texto,
    debate, ronda, tramo, t: ahora, datos: { profe: true }, ...(voz ? { voz: true } : {}) };
}

if (typeof module !== "undefined") module.exports = { PROFE, notarProfe, profeHabla, mensajeProfe };
```

En `rotacion.js:287`:

```js
// modProfe parte apagado: es el único interruptor que cambia quién modera (el profesor, a viva voz)
const OPCIONES_DEFECTO = { revelacion: true, revancha: true, musica: true, voz: true, reloj: true, punto: true, vozIA: true, modProfe: false };
```

- [ ] **Step 4: Correr todas las pruebas**

Run: `node --test pruebas/`
Expected: PASS, 165 + 8 = 173.

- [ ] **Step 5: Commit**

```bash
git add vozprofe.js pruebas/vozprofe.test.js rotacion.js pruebas/rotacion.test.js
git commit -m "Moderador profesor: latido y mensaje (vozprofe.js) y el interruptor modProfe

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: la IA no interviene con `modProfe`

**Files:**
- Modify: `ritmo.js:95-101` (`debeIntervenir`)
- Modify: `pruebas/ritmo.test.js` (al final)

- [ ] **Step 1: Prueba que falla** (agregar al final de `pruebas/ritmo.test.js`)

```js
test("moderas tú: la IA no interviene, ni llamada ni con tres mensajes nuevos", () => {
  const msgs = [mod(0, "Debate 1: ¿qué piensan?"), alu(10, "consuelo vera", "uno"), alu(20, "consuelo vera", "dos"), alu(30, "Pablo Sandoval", "tres", "B", 5)];
  const e = R.leerTramo(msgs, roster, T0 + 200000);
  assert.equal(R.debeIntervenir(e, { ahora: T0 + 200000, abre: T0 }).toca, true, "sin el interruptor, entra");
  assert.deepEqual(R.debeIntervenir(e, { ahora: T0 + 200000, abre: T0, profe: true }), { toca: false, motivo: "profe" });
  assert.deepEqual(R.debeIntervenir(e, { ahora: T0 + 200000, abre: T0, profe: true, forzar: true }), { toca: false, motivo: "profe" });
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test pruebas/ritmo.test.js`
Expected: FAIL en «moderas tú» (`toca: true`).

- [ ] **Step 3: Implementar** — en `ritmo.js`, la firma y la primera línea de `debeIntervenir`:

```js
// profe: el profesor modera a viva voz (interruptor modProfe): la IA no entra, ni llamada.
function debeIntervenir(estado, { ahora, abre, forzar = false, hablando = false, ultimaVoz = 0, voz = false, profe = false }) {
  if (profe) return { toca: false, motivo: "profe" };
  if (hablando) return { toca: false, motivo: "hablan" };
```

(El resto de la función no cambia. Agrega `profe` al comentario de arriba de la función.)

- [ ] **Step 4: Correr todas las pruebas** — `node --test pruebas/` → PASS (174).

- [ ] **Step 5: Commit**

```bash
git add ritmo.js pruebas/ritmo.test.js
git commit -m "Ritmo: con el profesor moderando, la IA no interviene

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: la cola de la tribuna (`colaTribuna`)

**Files:**
- Modify: `publico.js` (nueva función antes del `module.exports`, y agregarla al export)
- Modify: `pruebas/publico.test.js` (al final)

- [ ] **Step 1: Pruebas que fallan** (al final de `pruebas/publico.test.js`; si el archivo importa el módulo con otro nombre que `P`, usa ese)

```js
test("colaTribuna: preguntas pendientes, 🤔 y menciones al moderador, en ese orden", () => {
  const { colaTribuna } = require("../publico.js");
  const preguntas = [{ uid: "u2", nombre: "Pedro", grupo: 4, texto: "¿Y los costos?", t: 20 }, { uid: "u1", nombre: "Ana", grupo: 5, texto: " ¿Quién paga? ", t: 10 }];
  const chat = [
    { id: "m1", tipo: "alumno", nombre: "Luis", grupo: 3, debate: 2, t: 100, texto: "El 80% de las pymes quiebra" },
    { id: "m2", tipo: "alumno", nombre: "Sofía", grupo: 1, debate: 2, t: 110, texto: "@Moderador ¿podemos ver el dato?" },
    { id: "m3", tipo: "alumno", nombre: "Sofía", grupo: 1, debate: 1, t: 50, texto: "@moderadora hola" },          // otro debate
    { id: "m5", tipo: "mod", nombre: "Moderador", debate: 2, t: 120, texto: "@Moderador no se cuenta a sí mismo" }
  ];
  const cola = colaTribuna({ preguntas, emitidas: [], fuentes: ["m1"], chat, debate: 2, fuera: [] });
  assert.deepEqual(cola.map(x => x.id), ["p:u1", "p:u2", "f:m1", "m:m2"]);
  assert.deepEqual(cola[0], { id: "p:u1", tipo: "pregunta", nombre: "Ana", grupo: 5, texto: "¿Quién paga?" });
  assert.deepEqual(cola[2], { id: "f:m1", tipo: "fuente", nombre: "Luis", grupo: 3, texto: "El 80% de las pymes quiebra" });
  assert.equal(cola[3].tipo, "mencion");
});

test("colaTribuna: un mensaje con 🤔 y @Moderador sale una sola vez, como fuente; ids repetidos no se duplican", () => {
  const { colaTribuna } = require("../publico.js");
  const chat = [{ id: "m1", tipo: "alumno", nombre: "Luis", grupo: 3, debate: 2, t: 100, texto: "@Moderador mira este dato" }];
  const cola = colaTribuna({ fuentes: ["m1", "m1"], chat, debate: 2 });
  assert.deepEqual(cola.map(x => x.id), ["f:m1"]);
});

test("colaTribuna: lo ya emitido o lanzado/descartado (fuera) no vuelve", () => {
  const { colaTribuna } = require("../publico.js");
  const preguntas = [{ uid: "u1", nombre: "Ana", grupo: 5, texto: "¿Quién paga?", t: 10 }, { uid: "u2", nombre: "Pedro", grupo: 4, texto: "¿Y?", t: 20 }];
  const chat = [{ id: "m1", tipo: "alumno", nombre: "Luis", grupo: 3, debate: 2, t: 100, texto: "dato" }];
  const cola = colaTribuna({ preguntas, emitidas: [{ uid: "u1" }], fuentes: ["m1", "mX"], chat, debate: 2, fuera: ["p:u2"] });
  assert.deepEqual(cola.map(x => x.id), ["f:m1"], "u1 ya salió, u2 descartada, mX no está en el chat");
});
```

- [ ] **Step 2: Correr y ver que fallan** — `node --test pruebas/publico.test.js` → FAIL (`colaTribuna is not a function`).

- [ ] **Step 3: Implementar** — en `publico.js`, antes del `module.exports`:

```js
// La cola del moderador humano (interruptor modProfe): lo que la tribuna pide y que la moderadora
// de IA lanzaría sola. El profesor la ve en su control y elige qué sale en el proyector.
// Cada ítem: { id, tipo: "pregunta" | "fuente" | "mencion", nombre, grupo, texto }; el id es
// "p:uid" (la pregunta de esa persona), "f:msgId" (el mensaje que juntó 🤔) o "m:msgId" (un
// mensaje de alumno que le habla al moderador). fuera: los ids ya lanzados o descartados.
// Un mensaje que juntó 🤔 y además le habla al moderador sale una sola vez, como "f:"; ids repetidos
// en fuentes cuentan una vez. Las menciones son las del debate en curso (hay un tramo por debate).
const MENCION_MOD = /@moderador(a)?\b/i;
function colaTribuna({ preguntas = [], emitidas = [], fuentes = [], chat = [], debate, fuera = [] }) {
  const no = new Set(fuera), enFuente = new Set(fuentes), xs = [];
  for (const p of preguntasPendientes(preguntas, emitidas))
    xs.push({ id: "p:" + p.uid, tipo: "pregunta", nombre: p.nombre || "", grupo: p.grupo || 0, texto: String(p.texto).trim().slice(0, PUB.PREGUNTA_MAX) });
  for (const id of enFuente) {
    const m = chat.find(x => x.id === id);
    if (m) xs.push({ id: "f:" + id, tipo: "fuente", nombre: m.nombre || "", grupo: m.grupo || 0, texto: String(m.texto || "").trim().slice(0, 200) });
  }
  for (const m of chat)
    if (m.tipo === "alumno" && m.debate === debate && !enFuente.has(m.id) && MENCION_MOD.test(m.texto || ""))
      xs.push({ id: "m:" + m.id, tipo: "mencion", nombre: m.nombre || "", grupo: m.grupo || 0, texto: String(m.texto).trim().slice(0, 200) });
  return xs.filter(x => !no.has(x.id));
}
```

Y agrega `colaTribuna` a la lista del `module.exports` de `publico.js`.

- [ ] **Step 4: Correr todas las pruebas** — `node --test pruebas/` → PASS (176).

- [ ] **Step 5: Commit**

```bash
git add publico.js pruebas/publico.test.js
git commit -m "Tribuna: la cola del moderador humano (preguntas, 🤔 y menciones)

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `dictado.js`, la toma de mantener para hablar

Extrae a un módulo puro lo que hoy hacen `escuchar`, `cortarToma`, el corte de 60 s de `tickHabla` y la espera del final de `soltarHablar` en `jugar.js:827-1040`. **Mismo comportamiento**; lee esas líneas antes de empezar. Esta tarea solo crea el módulo; la tarea 5 lo conecta.

**Files:**
- Create: `dictado.js`
- Create: `pruebas/dictado.test.js`

- [ ] **Step 1: Pruebas que fallan** — `pruebas/dictado.test.js`:

```js
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
```

- [ ] **Step 2: Correr y ver que fallan** — `node --test pruebas/dictado.test.js` → FAIL (`Cannot find module '../dictado.js'`).

- [ ] **Step 3: Implementar** — `dictado.js`:

```js
/* =====================================================================
   TRIBUNA — mantener para hablar: el reconocimiento de voz del navegador, compartido por el
   teléfono de quien debate (jugar.js) y el control del profesor cuando modera (moderar.js).
   Una «toma» es un apretón del botón, con su propio texto. Usa un reconocedor de una frase a la
   vez: al terminar la frase se cierra y, si el botón sigue apretado, se abre otro y el texto sigue
   sumando en la misma toma. No continuo: en Chrome de Android (probado el 1-oct-2026 en un
   teléfono real) el modo continuo entrega cada pedazo como un resultado final nuevo con todo el
   texto acumulado, y la toma salía «Aló Aló estoy Aló estoy probando…»; en iPhone el modo
   continuo tiene fallas conocidas.
   A los DICTADO.MAX ms la toma se corta (alCorte con lo dicho) y sigue escuchando. Al soltar se
   espera el resultado final DICTADO.ESPERA ms como mucho. Lo que se hace con el texto (latido,
   envío, avisos) queda en cada página: aquí no hay Firestore ni DOM.
   ===================================================================== */
const DICTADO = { LANG: "es-CL", MAX: 60000, ESPERA: 1200, CONTINUO: false, RAPIDO: 500, FALLAS: 4 };

// junta dos trozos reconocidos: después de reiniciar el reconocedor, el primer trozo no trae espacio
const unirTrozos = (a, b) => !a ? b || "" : !b ? a : /\s$/.test(a) || /^\s/.test(b) ? a + b : a + " " + b;

// Rec: el constructor (window.SpeechRecognition || window.webkitSpeechRecognition).
// alTexto(texto): llegó texto (provisional o firme) mientras el botón sigue apretado.
// alFallo(codigo, oyo): un error del reconocedor que obliga a soltar ("not-allowed",
//   "service-not-allowed", "audio-capture", "network", …), o "mudo" (el micrófono se cierra apenas
//   se abre, DICTADO.FALLAS veces seguidas) o "cortado" (no se pudo abrir el siguiente). oyo: si la
//   toma ya tenía texto. no-speech y aborted no son fallas: si sigue apretado, se abre otro.
// alCorte(texto, desde): el corte de los 60 s; desde = cuándo empezó ese trozo.
// Devuelve la toma: { final, interino, t0, debate, texto(), empezar(), tick(), soltar({ inmediato }) }.
// empezar() lanza si el navegador no deja abrir el micrófono. soltar() resuelve { texto, desde }.
function crearToma(Rec, { debate = null, alTexto = () => {}, alFallo = () => {}, alCorte = () => {},
  max = DICTADO.MAX, espera = DICTADO.ESPERA, reloj = () => Date.now() } = {}) {
  const h = { rec: null, final: "", interino: "", t0: reloj(), debate, corte: 0, fallas: 0, inicio: 0, alTerminar: null, soltada: false };
  h.texto = () => unirTrozos(h.final, h.interino).replace(/\s+/g, " ").trim();
  const oyo = () => !!(h.final || h.interino);
  const desenganchar = rec => { rec.onresult = rec.onend = rec.onerror = null; try { rec.abort(); } catch (e) { /* ya cerrado */ } };

  function cortar() {
    const texto = h.texto(), desde = h.t0;
    Object.assign(h, { final: "", interino: "", t0: reloj(), corte: 0 });
    alCorte(texto, desde);
  }
  function escuchar() {
    const rec = new Rec();
    rec.lang = DICTADO.LANG; rec.continuous = DICTADO.CONTINUO; rec.interimResults = true;
    rec.onresult = e => {
      let interino = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) h.final = unirTrozos(h.final, e.results[i][0].transcript);
        else interino += e.results[i][0].transcript;
      }
      h.interino = interino;
      if (!h.soltada) alTexto(h.texto());
    };
    rec.onerror = e => {
      if (h.soltada || e.error === "no-speech" || e.error === "aborted") return;
      alFallo(e.error, oyo());
    };
    rec.onend = () => {
      if (h.rec !== rec) return;                      // un reconocedor ya reemplazado o soltado
      // lo que quedó como interino es lo último que se oyó: pasa a firme, o el próximo reconocedor lo pisa
      if (h.interino) { h.final = unirTrozos(h.final, h.interino); h.interino = ""; }
      if (h.corte) cortar();                          // el corte de los 60 s esperaba este final
      if (h.alTerminar) { h.alTerminar(); return; }   // soltó: la toma esperaba este final
      if (h.soltada) return;
      // un micrófono que se cierra apenas se abre no se reintenta sin fin
      h.fallas = reloj() - h.inicio < DICTADO.RAPIDO ? h.fallas + 1 : 0;
      if (h.fallas >= DICTADO.FALLAS) { alFallo("mudo", oyo()); return; }
      try { escuchar(); } catch (e) { alFallo("cortado", oyo()); }
    };
    h.rec = rec; h.inicio = reloj();
    rec.start();
  }

  h.empezar = () => {
    try { escuchar(); }
    catch (e) { h.soltada = true; if (h.rec) desenganchar(h.rec); h.rec = null; throw e; }
  };
  // Cada ~200 ms mientras se aprieta: el corte de los 60 s.
  h.tick = () => {
    if (h.soltada) return;
    const ahora = reloj();
    if (!h.corte && ahora - h.t0 >= max) {
      h.corte = ahora;
      try { h.rec.stop(); } catch (e) { cortar(); }
    } else if (h.corte && ahora - h.corte > espera) {
      // el reconocedor no terminó a tiempo: se corta igual con lo que hay y se abre otro
      const viejo = h.rec; h.rec = null;
      if (viejo) desenganchar(viejo);
      cortar();
      try { escuchar(); } catch (e) { alFallo("cortado", oyo()); }
    }
  };
  // inmediato: sale ya con lo que hay (sin tiempo, cede la palabra, o se descarta).
  h.soltar = async ({ inmediato = false } = {}) => {
    if (!h.soltada) {
      h.soltada = true;
      const rec = h.rec;
      if (rec && !inmediato) await new Promise(listo => {
        const plazo = setTimeout(listo, espera);
        h.alTerminar = () => { clearTimeout(plazo); listo(); };
        try { rec.stop(); } catch (e) { h.alTerminar(); }
      });
      h.rec = null;
      if (rec) desenganchar(rec);
    }
    return { texto: h.texto(), desde: h.t0 };
  };
  return h;
}

if (typeof module !== "undefined") module.exports = { DICTADO, unirTrozos, crearToma };
```

- [ ] **Step 4: Correr todas las pruebas** — `node --test pruebas/` → PASS (194).

- [ ] **Step 5: Commit**

```bash
git add dictado.js pruebas/dictado.test.js
git commit -m "dictado.js: la toma de mantener para hablar, fuera del teléfono

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: el teléfono usa `dictado.js` (sin cambiar lo que hace)

**Files:**
- Modify: `jugar.js:827-1040` (bloque «mantener para hablar») y `jugar.js:747-800` (dictado 🎤 de la caja)
- Modify: `jugar.html:456-463` (cargar `dictado.js` antes de `jugar.js`)

- [ ] **Step 1: Cargar el módulo** — en `jugar.html`, antes de `<script type="module" src="jugar.js…">`:

```html
<script src="dictado.js?v=20261003a"></script>
```

- [ ] **Step 2: Reemplazar los ayudantes** — en `jugar.js`:
  - Borra `const unir = …` (línea ~833) y `const textoToma = …` (línea ~834); en su lugar:
    ```js
    const unir = unirTrozos;                       // dictado.js
    ```
  - Borra `const CONTINUO = false;` (línea ~883) junto con su comentario (el comentario ya vive en `dictado.js`), y en `dictarFrase` (línea ~779) cambia `rec.continuous = CONTINUO` por `rec.continuous = DICTADO.CONTINUO`.
  - Borra las funciones `escuchar(h)` y `cortarToma(h)` enteras.
  - En `HABLA` (línea ~830) quita `MAX: 60000, ESPERA: 1200` (ya están en `DICTADO`). Comprueba con `grep -n "HABLA.MAX\|HABLA.ESPERA" jugar.js` que no queden usos después de los pasos siguientes.

- [ ] **Step 3: `latido`** — cambia `textoToma(h)` por `h.texto()`:

```js
    { habla: { debate: h.debate, t0: h.t0, t: ahora, texto: h.texto().slice(-300) } }, { merge: true }).catch(() => {});
```

- [ ] **Step 4: `tickHabla`** — reemplaza desde `const ahora = Date.now();` hasta el final de la función por:

```js
  h.tick();                                         // el corte de los 60 s (dictado.js)
  latido();
}
```

(`latido` ya no hace nada si un fallo soltó la toma: revisa `HABLA.apretado`.)

- [ ] **Step 5: `empezarHablar`** — reemplaza las dos líneas `const h = { rec: null, … };` y `try { escuchar(h); } catch { … }` por:

```js
  const h = crearToma(Reconocedor, {
    debate: s.debate.n,
    alTexto: t => { if (HABLA.toma === h) { pintarMiHabla(t); latido(); } },
    alCorte: (texto, desde) => { if (palabras(texto) >= 2) mandarVoz(texto, desde).then(err => err && avisoHabla(err)); },
    alFallo: (codigo, oyo) => {
      if (HABLA.toma !== h) return;
      if (codigo === "not-allowed" || codigo === "service-not-allowed") {
        // si ya había oído algo (el rechazo llegó al reabrir el reconocedor), lo dicho no se pierde
        if (!oyo) { J.micListo = false; try { localStorage.removeItem("tribuna_mic_ok"); } catch {} }
        soltarHablar({ enviar: oyo, aviso: "🎤 Permite el micrófono para este sitio (candado de la barra de direcciones) y vuelve a apretar." });
      } else if (codigo === "audio-capture") soltarHablar({ aviso: "🎤 No encontramos el micrófono de este teléfono: escribe tu mensaje abajo." });
      else if (codigo === "network") soltarHablar({ aviso: "🎤 Sin conexión para reconocer la voz: escribe tu mensaje abajo." });
      else if (codigo === "mudo") soltarHablar({ aviso: "🎤 El micrófono no responde: escribe tu mensaje abajo." });
      else if (codigo === "cortado") soltarHablar({ aviso: "🎤 Se cortó el micrófono. Vuelve a apretar." });
    }
  });
  try { h.empezar(); } catch { avisoHabla("🎤 No se pudo abrir el micrófono. Vuelve a apretar."); return; }
```

- [ ] **Step 6: `soltarHablar`** — reemplaza desde `const h = HABLA.toma, rec = h.rec;` hasta antes de `let error = "";` por:

```js
  const h = HABLA.toma;
  HABLA.apretado = false;
  clearInterval(HABLA.timer); HABLA.timer = null;
  if (J.codigo && J.uid) setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid), { habla: null }, { merge: true }).catch(() => {});
  pintarBotonHablar(J.sala);
  if (enviar && J.sala && alBorde(J.sala)) inmediato = true;
  await h.soltar({ inmediato: !enviar || inmediato });
```

y dentro del `if (enviar)` cambia `texto = textoToma(h)` por `texto = h.texto()`.

- [ ] **Step 7: Verificar que no quedan restos**

Run: `grep -n "textoToma\|cortarToma\|escuchar(\|CONTINUO\b\|HABLA.MAX\|HABLA.ESPERA" jugar.js`
Expected: solo `DICTADO.CONTINUO` en `dictarFrase`.

Run: `node --check jugar.js && node --test pruebas/`
Expected: sin errores de sintaxis; 188 pasan.

- [ ] **Step 8: Prueba manual rápida del teléfono** — `mic.html` es la página de diagnóstico, pero no usa `jugar.js`. Usa el arnés del teléfono sin Firebase descrito en la memoria (`scratchpad/tel/harness.py` + `hablar.py`, `SpeechRecognition` falso). Si el scratchpad ya no está, déjalo para la prueba de punta a punta (tarea 13), que cubre: hablar, soltar, el corte de 60 s y un error `not-allowed`. Anota cuál de las dos corriste en el mensaje del commit.

- [ ] **Step 9: Commit**

```bash
git add jugar.js jugar.html
git commit -m "Teléfono: mantener para hablar con dictado.js, sin cambios de comportamiento

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: la regla de `vivo/{doc}`

**Files:**
- Modify: `firestore.rules` (dentro de `match /salas/{codigo}`, después de `match /privado/{doc} {…}`)
- Modify: `pruebas/reglas-emulador.cjs` (antes de `await env.cleanup();`)

- [ ] **Step 1: Casos que fallan** — en `pruebas/reglas-emulador.cjs`, antes de `await env.cleanup();`:

```js
console.log("El moderador en vivo (vivo/moderador): escribe el profesor, leen todos");
await sembrar("V001", { personajes: false, etapa: null });
const vivo = { habla: { debate: 1, t0: 1, t: 2, texto: "Grupo 3, ¿de dónde sale ese dato?" } };
await caso("el profesor escribe su latido", () => assertSucceeds(setDoc(doc(profe(), "salas", "V001", "vivo", "moderador"), vivo)));
await caso("un alumno lo lee", () => assertSucceeds(getDoc(doc(ctx("a"), "salas", "V001", "vivo", "moderador"))));
await caso("un alumno no lo escribe", () => assertFails(setDoc(doc(ctx("a"), "salas", "V001", "vivo", "moderador"), vivo)));
await caso("sin sesión no se lee", () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "salas", "V001", "vivo", "moderador"))));
```

- [ ] **Step 2: Correr contra el emulador y ver que fallan** (instalación de los paquetes: ver el encabezado del archivo)

Run: `NODE_PATH=/tmp/reglas/node_modules firebase emulators:exec --only firestore --project demo-tribuna "node pruebas/reglas-emulador.cjs"`
Expected: los casos «escribe su latido» y «un alumno lo lee» fallan (no hay regla: todo se niega).

- [ ] **Step 3: La regla** — en `firestore.rules`, después del bloque `match /privado/{doc} { … }`:

```
      // El profesor modera a viva voz (vozprofe.js): su latido con lo que va diciendo. Lo escribe
      // su control; lo leen el proyector y los teléfonos para el subtítulo y para cederle la palabra.
      match /vivo/{doc} {
        allow read: if conSesion();
        allow write: if esProfe(codigo);
      }
```

- [ ] **Step 4: Correr de nuevo** — mismo comando. Expected: todos ok (`N ok, 0 mal`).

- [ ] **Step 5: Commit** (el despliegue va en la tarea 14, después de la prueba de punta a punta)

```bash
git add firestore.rules pruebas/reglas-emulador.cjs
git commit -m "Reglas: vivo/moderador, escribe el profesor y leen todos

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: el proyector calla a la IA y arma la cola

**Files:**
- Modify: `moderacion.js` (varias funciones, listadas abajo)
- Modify: `clase.js:238` y `clase.js:395-407`
- Modify: `index.html:983-992` (cargar `vozprofe.js` antes de `moderacion.js`)

No hay pruebas de `node` para estos archivos (dependen de `S` y del DOM): lo cubre la tarea 13. Eso incluye `transcripcionChat` (el spec la listaba entre las pruebas puras; no se puede cargar en `node` sin `S`): el escenario 5 de la tarea 13 revisa la línea `[🎙 Moderador · 🎤]` en el prompt del relator con un espía en `pedirLLM`. Después de cada paso, `node --check <archivo>`.

- [ ] **Step 1: Cargar `vozprofe.js`** — en `index.html`, después de `<script src="ritmo.js…"></script>`:

```html
<script src="vozprofe.js?v=20261003a"></script>
```

- [ ] **Step 2: Ayudantes** — en `moderacion.js`, después de `const MOD_NOMBRE = "Moderadora", REL_NOMBRE = "Relator";`:

```js
// Interruptor «Moderas tú» (modProfe, vozprofe.js): el profesor modera a viva voz desde su control
// y la IA se calla. Lo que el proyector todavía escribe en nombre del moderador (las preguntas de
// la tribuna que el profesor elige) va firmado con su nombre.
const moderaProfe = () => !!(S.clase && opcionActiva(S.clase.opciones, "modProfe"));
const nombreMod = () => (moderaProfe() ? PROFE.NOMBRE : MOD_NOMBRE);
```

- [ ] **Step 3: `recibirChat`** — la mención a la moderadora y la voz de la IA:

```js
      if (m.ronda === S.ronda && S.fase === "abierta" && S.mod && !moderaProfe()) {
```

y la condición de la voz:

```js
    // el proyector habla: la moderadora y el relator, si la voz de la IA está encendida (vozia.js).
    // Lo del moderador humano no se lee: el profesor ya lo dijo, o lo dice él (modProfe).
    const callado = m.tipo === "mod" && ((m.datos && m.datos.profe) || moderaProfe());
    if ((m.tipo === "mod" || m.tipo === "relator") && !callado && opcionActiva(S.clase.opciones, "vozIA") && typeof hablarIA === "function") {
```

- [ ] **Step 4: `burbuja`** — el nombre del mensaje del moderador:

```js
  if (m.tipo === "mod") return `<div class="msg mod ${m.datos && m.datos.tribuna ? "trib" : ""}"><div class="who">🎙 ${esc(m.nombre || MOD_NOMBRE)}${m.voz ? " 🎤" : ""}${m.datos && m.datos.tribuna ? " · ✋ la tribuna" : ""}<span class="hora">${hora}</span></div><div class="tx">${conMenciones(m.texto)}</div></div>`;
```

- [ ] **Step 5: `transcripcionChat`** — la línea del moderador:

```js
    m.tipo === "mod" ? `[🎙 ${m.nombre || MOD_NOMBRE}${m.voz ? " · 🎤" : ""}] ${m.texto}`
```

y en el comentario de arriba agrega: «los del moderador humano (modProfe) también llevan 🎤: los dijo en voz alta».

- [ ] **Step 6: `abrirTramoChat`** — las dos llamadas a `postChat({ tipo: "mod", nombre: MOD_NOMBRE, … })` pasan a usar `tipo: tipoGuia()`. Define antes de la función:

```js
// Con el profesor moderando, las líneas fijas (apertura del debate, cierre) quedan escritas como
// guía del sistema: nadie las lee en voz alta y no cuentan como intervención de la moderadora.
const tipoGuia = () => (moderaProfe() ? "sistema" : "mod");
```

- [ ] **Step 7: `moderadorTalvez`** — pasar `profe` y avisar si la llamaron:

```js
  const r = debeIntervenir(estadoTramo(), { ahora: Date.now(), abre: M.abre, forzar: forzar || !!M.forzarPendiente, hablando, ultimaVoz, voz, profe: moderaProfe() });
  if (!r.toca) {
    if (pedida && r.motivo === "profe") tick("🎙 Moderas tú: la moderadora de IA no interviene.");
    if (forzar && r.motivo === "hablan") {
```

- [ ] **Step 8: `fuentesTalvez`** — los 🤔 esperan al profesor en la cola:

```js
  if (!M || S.fase !== "abierta" || moderaProfe() || !(M.fuentesPendientes || []).length || salaOcupada()) return;
```

- [ ] **Step 9: `salaOcupada`** — el moderador hablando ocupa la sala:

```js
  const profe = typeof window.moderadorHabla === "function" && !!window.moderadorHabla();
  if (hs.length || profe || S.cierreBanco || (typeof puntoActivo === "function" && puntoActivo(S.punto))) return true;
```

- [ ] **Step 10: firmas** — en `lanzarPreguntaTribuna` y `pedirFuenteTribuna`, `nombre: MOD_NOMBRE` → `nombre: nombreMod()`.

- [ ] **Step 11: la cola** — en `moderacion.js`, después de `lanzarPreguntaTribuna`:

```js
// La cola del profesor que modera (publico.js, colaTribuna): la ve en su control. S.mod.fuera
// guarda lo que ya lanzó o descartó en este tramo.
function colaControl() {
  const reg = S.debate && S.clase.debates[S.debate.n - 1];
  if (!reg || !S.mod || S.fase !== "abierta" || !moderaProfe()) return [];
  return colaTribuna({ preguntas: (S.preguntasPub || []).filter(p => limpiaFrase(p.texto)), emitidas: reg.tribuna,
    fuentes: S.mod.fuentesPendientes || [], chat: S.chat, debate: S.debate.n, fuera: S.mod.fuera || [] });
}
// Orden del control: sale en el proyector como la lanzaría la moderadora (foto, nombre, oráculo).
function lanzarDeCola(id) {
  const M = S.mod, x = colaControl().find(i => i.id === id);
  if (!x) { tick("Eso ya no está en la cola de la tribuna."); return; }
  (M.fuera = M.fuera || []).push(id);
  if (x.tipo === "pregunta") {
    const p = (S.preguntasPub || []).find(q => "p:" + q.uid === id);
    lanzarPreguntaTribuna(p, PERS ? `${grupoDe("A")} y ${grupoDe("B")}` : `@Grupo ${S.debate.A} y @Grupo ${S.debate.B}`);
  } else if (x.tipo === "fuente") {
    const msgId = id.slice(2);
    M.fuentesPendientes = (M.fuentesPendientes || []).filter(i => i !== msgId);
    pedirFuenteTribuna(msgId);
  }
}
function descartarDeCola(id) {
  const M = S.mod;
  if (!M) return;
  (M.fuera = M.fuera || []).push(id);
  if (id.startsWith("f:")) M.fuentesPendientes = (M.fuentesPendientes || []).filter(i => i !== id.slice(2));
}
```

- [ ] **Step 12: `clase.js`** — el cierre (`clase.js:238`):

```js
    postChat({ tipo: tipoGuia(), nombre: MOD_NOMBRE, texto: `Gracias, ${nombreG(d.A)} y ${nombreG(d.B)}. Viene el próximo debate.` });
```

En `fijarOpcion` (`clase.js:395`), después de la línea de `vozIA`:

```js
  // el profesor toma la moderación: lo que la IA tenía por decir ya no viene al caso
  if (k === "modProfe" && v) { if (typeof VOZ_ESPERA !== "undefined") VOZ_ESPERA.length = 0; if (S.mod) S.mod.forzarPendiente = false; }
```

y en el mapa de nombres agrega `modProfe: "Moderas tú"`.

- [ ] **Step 13: Verificar** — `node --check moderacion.js && node --check clase.js && node --test pruebas/` → 188 pasan.

- [ ] **Step 14: Commit**

```bash
git add moderacion.js clase.js index.html
git commit -m "Proyector: con modProfe la IA se calla, las guías quedan escritas y la tribuna va a una cola

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: el proyector escucha al moderador y le habla al control

**Files:**
- Modify: `online.js` (suscripción nueva, `ultimaVoz`, `estadoControl`, `ORDENES`, `SEGUN_FASE`, aviso de la cola)

- [ ] **Step 1: Escuchar `vivo/moderador`** — en `online.js`, justo después del `onSnapshot(doc(db, "salas", ON.codigo, "privado", "orden"), …)` (termina con `}, () => {});`, antes de `setInterval(asignarRezagados, 10000);`):

```js
  // El profesor modera a viva voz desde el control (vozprofe.js): su latido. La primera foto trae
  // un latido viejo; al soltar (habla: null) cuenta como la última voz (el respiro de la moderadora).
  let profePrimera = true;
  onSnapshot(doc(db, "salas", ON.codigo, "vivo", "moderador"), snap => {
    const antes = ON.profe;
    ON.profe = notarProfe(antes, snap.exists() ? snap.data() : null, Date.now(), profePrimera);
    profePrimera = false;
    if (antes && antes.habla && !ON.profe.habla) ON.ultimaVoz = Date.now();
  }, () => {});
```

- [ ] **Step 2: `moderadorHabla` y `ultimaVoz`** — junto a `window.hablaSala = hablaSala;`:

```js
// { texto, t0 } mientras el profesor habla desde el control en el debate en curso, o null.
window.moderadorHabla = () => profeHabla(ON.profe, S.debate && S.debate.n, Date.now(), typeof AJ !== "undefined" ? AJ.LATIDO : 2500);
```

y `window.ultimaVoz` suma el latido del moderador:

```js
window.ultimaVoz = () => Math.max(ON.ultimaVoz || 0, (ON.profe && ON.profe.visto) || 0, ...Object.values(HABLA).map(h => h.visto || 0));
```

- [ ] **Step 3: `estadoControl`** — agrega, junto a `debate:`:

```js
    ronda: S.ronda, tramo: S.tramo,      // el control los pone en los mensajes del moderador
    cola: typeof colaControl === "function" ? colaControl() : [],
```

- [ ] **Step 4: Órdenes** — en `ORDENES`:

```js
  // la cola de la tribuna del profesor que modera (moderacion.js)
  tribuna: a => { if (S.fase === "abierta") lanzarDeCola(String(a || "")); },
  descartar: a => descartarDeCola(String(a || "")),
```

y agrega `"tribuna"` a `SEGUN_FASE`.

- [ ] **Step 5: El control ve la cola al cambiar** — después de `setInterval(avisarHabla, 1000);`:

```js
// La cola de la tribuna (preguntas, 🤔, menciones) cambia sin que nada más publique: si cambió,
// el control la ve en la próxima publicación liviana.
let firmaCola = "";
setInterval(() => {
  if (typeof colaControl !== "function") return;
  const f = JSON.stringify(colaControl());
  if (f === firmaCola) return;
  firmaCola = f;
  publicar({ ligera: true });
}, 1000);
```

- [ ] **Step 6: Verificar** — `node --check online.js` no sirve para módulos con imports remotos; usa `node --input-type=module --check < online.js`. Expected: sin error. `node --test pruebas/` → 188.

- [ ] **Step 7: Commit**

```bash
git add online.js
git commit -m "Proyector: escucha al moderador en vivo y le publica la cola al control

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: el escenario muestra al moderador en vivo

**Files:**
- Modify: `escenario.js:290-293` (tarjeta), `escenario.js:372-401` (`escnRotulo`)
- Modify: `index.html` (CSS de `.escn-rotulo`, línea ~518-528)

- [ ] **Step 1: La tarjeta** — en `escenario.js:292`:

```js
    const quien = m.tipo === "mod" ? `🎙 ${escHtml(String(m.nombre || MOD_NOMBRE).toUpperCase())}${m.datos && m.datos.tribuna ? " · ✋ LA TRIBUNA" : ""}`
```

- [ ] **Step 2: El rótulo en vivo** — al comienzo de `escnRotulo`, después de `const el = $("escnRotulo");`:

```js
  // el profesor modera y está hablando (vozprofe.js): su subtítulo en vivo manda sobre todo
  const mh = typeof window.moderadorHabla === "function" ? window.moderadorHabla() : null;
  if (mh) {
    ESCN.rotuloId = null;
    if (ESCN.rotulo !== "vivo") {
      ESCN.rotulo = "vivo";
      el.innerHTML = `<div class="escn-rot-c"><div class="escn-rot-k"><i class="escn-envivo">● EN VIVO</i> 🎙 ${escHtml(PROFE.NOMBRE.toUpperCase())}</div>
        <div class="escn-rot-t"><span></span><i class="escn-cursor"></i></div></div>`;
      el.className = "escn-rotulo";
      void el.offsetWidth;
      el.className = "escn-rotulo on vivo";
    }
    escnTexto(el.querySelector(".escn-rot-t span"), escnCola(mh.texto));
    return;
  }
```

y en la rama del mensaje normal cambia `` `🎙 ${MOD_NOMBRE.toUpperCase()}` `` por `` `🎙 ${escHtml(String(m.nombre || MOD_NOMBRE).toUpperCase())}` ``.

- [ ] **Step 3: CSS** — en `index.html`, después de `.escn-rotulo.trib{…}`:

```css
.escn-rotulo.vivo{border-left-color:var(--neon)}
.escn-rotulo.vivo .escn-rot-k{color:var(--neon)}
```

- [ ] **Step 4: Verificar** — `node --check escenario.js` → sin error.

- [ ] **Step 5: Commit**

```bash
git add escenario.js index.html
git commit -m "Escenario: el moderador en vivo en el rótulo inferior

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: el teléfono le cede la palabra y muestra su subtítulo

**Files:**
- Modify: `jugar.js` (suscripción, `puedoHablar`, `tickHabla`, `empezarHablar`, `pintarBotonHablar`, `parcialDebate`, `parcialPublico`, `avisarNuevos`)
- Modify: `jugar.html` (cargar `vozprofe.js`; CSS de `.vv-hab.mod`)

- [ ] **Step 1: Cargar `vozprofe.js`** — en `jugar.html`, junto a `dictado.js`:

```html
<script src="vozprofe.js?v=20261003a"></script>
```

- [ ] **Step 2: Escuchar `vivo/moderador`** — en `jugar.js`, junto a las otras suscripciones (después de la de `jugadores`, línea ~200):

```js
  // el profesor modera a viva voz (vozprofe.js): su subtítulo y, mientras habla, nadie más habla
  let profePrimera = true;
  subs.push(onSnapshot(doc(db, "salas", J.codigo, "vivo", "moderador"), snap => {
    J.profe = notarProfe(J.profe, snap.exists() ? snap.data() : null, Date.now(), profePrimera);
    profePrimera = false;
    pintarVivoParcial();
  }, () => {}));
```

- [ ] **Step 3: `modera` y `puedoHablar`** — antes de `puedoHablar`:

```js
// ¿El moderador (el profesor) tiene la palabra? Mientras habla, el botón se apaga y quien hablaba
// suelta: se envía lo que llevaba.
const modera = s => !!(s && s.debate && profeHabla(J.profe, s.debate.n, Date.now(), AJ.LATIDO));
```

y en `puedoHablar`, después de `if (cedoPorPunto(s)) return false;`:

```js
  if (modera(s)) return false;
```

- [ ] **Step 4: `tickHabla`** — en el bloque `if (!puedoHablar(s)) {`:

```js
    const agotado = sinTiempo(s), cede = cedoPorPunto(s), mod = modera(s);
    soltarHablar({ aviso: mod ? "🎙 El moderador tomó la palabra." : cede ? `✋ Punto de ${quienPunto(cede)}: escucha.` : agotado ? "⏱ Tu lado se quedó sin tiempo: solo puedes escribir." : "",
      inmediato: mod || agotado || !!cede });
```

- [ ] **Step 5: `empezarHablar`** — el aviso al apretar:

```js
    avisoHabla(modera(s) ? "🎙 Habla el moderador: espera a que termine."
      : cede ? `✋ Punto de ${quienPunto(cede)}: escucha. Hablas cuando termine.`
      : s && sinTiempo(s) ? "⏱ Tu lado se quedó sin tiempo: solo puedes escribir." : "Podrás hablar cuando se abra el tramo.");
```

- [ ] **Step 6: `pintarBotonHablar`** — estado nuevo `modera`:

```js
  const mod = !HABLA.apretado && s.fase === "abierta" && modera(s);
  const estado = HABLA.apretado ? "apretado" : mod ? "modera" : puede ? (agotado ? "punto" : "listo") : cede ? "cede" : agotado ? "agotado" : "cerrado";
```

en el mapa de `innerHTML` agrega `modera: "🎙 HABLA EL MODERADOR<br><small>espera</small>",` y en el de `aria-label` `modera: "Habla el moderador: espera",`.

- [ ] **Step 7: `parcialDebate`** — el botón se repinta solo (el latido se vence sin foto nueva) y la línea del moderador:

Al comienzo, después de la línea de `montarBotonHablar`:

```js
  pintarBotonHablar(s);                             // el moderador empezó o calló (no siempre llega una foto)
```

Reemplaza las tres líneas de `const m = pide ? null : …` hasta `poner(mod, …)` por:

```js
  const mh = s.debate ? profeHabla(J.profe, d.n, ahora, AJ.LATIDO) : null;
  const m = pide || mh ? null : modParaMi(s, ahora), mod = $("vvMod");
  mod.classList.toggle("oculto", !m && !mh);
  poner(mod, mh ? `<b class="q">🎙 Habla el moderador · en vivo</b><span class="vv-mod-tx">${esc(cola(mh.texto, 220)) || "…"}</span>`
    : m ? `<b class="q">🎙 ${m.datos && m.datos.profe ? "El moderador" : "La moderadora"} te pregunta</b><span class="vv-mod-tx">${menciones(m.texto)}</span>` : "");
```

- [ ] **Step 8: `parcialPublico`** — el moderador primero en la escena. Antes de `let escena;`:

```js
  const mh = profeHabla(J.profe, d.n, Date.now(), AJ.LATIDO);
  const bloqueMod = mh ? `<div class="vv-hab mod"><div class="vv-en"><i></i>Habla el moderador</div>
      <div class="vv-nom">🎙 ${esc(PROFE.NOMBRE)}</div><div class="vv-tx"><span>${mh.texto ? esc(cola(mh.texto, 280)) : `<i class="vv-pts">…</i>`}</span></div></div>` : "";
```

y cambia las ramas para que el moderador vaya delante: `if (hablan.length) { escena = bloqueMod + (…lo de hoy…); } else if (mh) escena = bloqueMod; else if (msgs.length) { … }`. La clase `dos` sigue igual (`hablan.length > 1`).

- [ ] **Step 9: `avisarNuevos`** — el aviso al ser nombrado:

```js
      $("notaCaja").textContent = `🎙 ${m.datos && m.datos.profe ? "El moderador" : "La moderadora"} te pregunta a ti. Responde abajo.`;
```

- [ ] **Step 10: CSS** — en `jugar.html`, después de `.vv-hab.quieto .vv-en{…}`:

```css
.vv-hab.mod{--l:var(--mod)}
.vv-hab.mod .vv-en{color:var(--mod)}
```

(Comprueba con `grep -n "\-\-mod" jugar.html` que `--mod` existe en `:root`; si no, usa `#b4a6ff`.)

- [ ] **Step 11: Verificar** — `node --input-type=module --check < jugar.js` → sin error; `node --test pruebas/` → 188.

- [ ] **Step 12: Commit**

```bash
git add jugar.js jugar.html
git commit -m "Teléfono: el moderador toma la palabra y su subtítulo se ve en vivo

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: el control modera

**Files:**
- Create: `moderar.js`
- Modify: `control.html` (markup, CSS, scripts)
- Modify: `control.js` (`INTERRUPTORES`, `habilitar`, `pintar`, `pintarDebate`, montar `moderar.js`)

- [ ] **Step 1: Markup** — en `control.html`, después de `<section class="cc oculto" id="sDebate">…</section>`:

```html
    <section class="cc oculto" id="sCola">
      <div class="k" id="colaK">✋ Tribuna</div>
      <div id="cola"></div>
    </section>

    <section class="oculto" id="sModera">
      <button type="button" class="hablar-profe" id="btnHablarProfe">🎙 HABLAR<small>mantén apretado</small></button>
      <div class="mi-habla" id="profeHabla" aria-live="polite"></div>
      <div class="ca oculto" id="profeEscribe">
        <input type="text" id="profeTx" maxlength="400" placeholder="Escribir como Moderador">
        <button class="b pri" id="profeEnviar" style="flex:0 0 auto">Enviar</button>
      </div>
    </section>
```

Antes de `<script type="module" src="control.js…">`:

```html
<script src="dictado.js?v=20261003a"></script>
<script src="vozprofe.js?v=20261003a"></script>
```


- [ ] **Step 2: CSS** — en el `<style>` de `control.html`, al final:

```css
/* el profesor modera (modProfe, con el debate abierto): HABLAR en el tercio de abajo, al pulgar;
   el botón principal (cerrar) se achica arriba, lejos del pulgar */
body.modera main{padding-bottom:calc(36dvh + env(safe-area-inset-bottom))}
body.modera .cp{min-height:46px;font-size:16px;width:auto;align-self:flex-end;padding:8px 16px}
body.modera #sModera{position:fixed;left:0;right:0;bottom:0;z-index:6;height:34dvh;padding:10px 12px calc(10px + env(safe-area-inset-bottom));
  background:#0c1319;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px}
.hablar-profe{flex:1 1 auto;width:100%;border:0;border-radius:20px;background:#1b1830;color:var(--mod);border:2px solid #4c3fa0;
  font:800 26px/1.1 system-ui,-apple-system,sans-serif;letter-spacing:.04em;touch-action:none;user-select:none;-webkit-user-select:none;cursor:pointer}
.hablar-profe small{display:block;font-size:13px;font-weight:600;color:var(--dim);margin-top:6px;letter-spacing:0}
.hablar-profe *{pointer-events:none}
.hablar-profe.on{background:var(--mod);color:#130f2b;border-color:var(--mod);box-shadow:0 0 30px #b4a6ff66}
.mi-habla{min-height:20px;font-size:14px;color:var(--txt);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:rtl;text-align:left}
.mi-habla.aviso{color:var(--amber);direction:ltr;white-space:normal}
.cola-i{display:flex;gap:8px;align-items:stretch;border-top:1px solid var(--line);padding:8px 0}
.cola-i:first-child{border-top:0}
.cola-i button.lanzar{flex:1 1 auto;text-align:left;background:none;border:0;color:var(--txt);font:15px/1.35 system-ui,-apple-system,sans-serif;padding:0;cursor:pointer}
.cola-i button.lanzar b{color:var(--amber)}
.cola-i button.lanzar small{display:block;color:var(--dim);font-size:12.5px}
.cola-i button.x{flex:0 0 44px;min-height:44px}
.cola-vacia{color:var(--dim2);font-size:14px}
```

- [ ] **Step 3: `moderar.js`** (módulo ES, lo importa `control.js`):

```js
/* =====================================================================
   TRIBUNA — el profesor modera desde su control (interruptor «Moderas tú», modProfe).
   Mantener para hablar (dictado.js), como el teléfono de quien debate: mientras aprieta, el latido
   va a salas/{codigo}/vivo/moderador (vozprofe.js) y el proyector y los teléfonos muestran el
   subtítulo; al soltar, lo dicho se publica como mensaje del Moderador (las reglas ya dejan que el
   profesor escriba en mensajes). Sin reconocimiento de voz, un campo para escribir como Moderador.
   La cola de la tribuna la arma el proyector (privado/control → cola); aquí se toca para lanzar.
   ===================================================================== */
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const V = { db: null, codigo: "", dato: () => null, mandar: null, apretado: false, toma: null, pointerId: null, timer: null, ultimo: 0, colaFirma: "" };

// El debate en el que se habla: abierto y con número (lo que publica el proyector en privado/control).
function debateAbierto() {
  const c = V.dato();
  return c && c.fase === "abierta" && c.debate && c.debate.n ? c : null;
}
const vivoRef = () => doc(V.db, "salas", V.codigo, "vivo", "moderador");
function aviso(t) { const m = $("profeHabla"); m.textContent = t; m.classList.toggle("aviso", !!t); }
function lo(t) { const m = $("profeHabla"); m.textContent = t; m.classList.remove("aviso"); }

// Publica lo dicho (o escrito) como mensaje del Moderador. Devuelve el aviso de error, o "".
async function publicarMensaje(texto, { voz = true } = {}) {
  const c = debateAbierto();
  if (!c) return "";
  const m = mensajeProfe({ texto, voz, debate: c.debate.n, ronda: c.ronda || 0, tramo: c.tramo || 0 });
  if (!m) return "";
  const { id, ...datos } = m;
  try { await setDoc(doc(V.db, "salas", V.codigo, "mensajes", id), datos); return ""; }
  catch (e) { return `No se publicó (${e.code || e.message}): «${texto.slice(0, 120)}»`; }
}

function latido(forzar = false) {
  const h = V.toma;
  if (!V.apretado || !h) return;
  const ahora = Date.now();
  if (!forzar && ahora - V.ultimo < PROFE.CADA) return;
  V.ultimo = ahora;
  setDoc(vivoRef(), { habla: { debate: h.debate, t0: h.t0, t: ahora, texto: h.texto().slice(-PROFE.TEXTO) } }).catch(() => {});
}

function tick() {
  const h = V.toma;
  if (!V.apretado || !h) return;
  const c = debateAbierto();
  if (!c || c.debate.n !== h.debate) { soltar({ enviar: false, avisar: "Se cerró el debate: no se publicó." }); return; }
  h.tick();
  latido();
}

function empezar(e) {
  if (e) { e.preventDefault(); if (e.button > 0) return; }
  if (V.apretado || !Rec) return;
  const c = debateAbierto();
  if (!c) { aviso("Se habla con el debate abierto."); return; }
  const h = crearToma(Rec, {
    debate: c.debate.n,
    alTexto: t => { if (V.toma === h) { lo(t); latido(); } },
    alCorte: (texto, desde) => { publicarMensaje(texto).then(err => err && aviso(err)); },
    alFallo: (codigo, oyo) => {
      if (V.toma !== h) return;
      const t = codigo === "not-allowed" || codigo === "service-not-allowed" ? "🎤 Permite el micrófono para este sitio y vuelve a apretar."
        : codigo === "audio-capture" ? "🎤 No encontramos el micrófono: escribe abajo."
        : codigo === "network" ? "🎤 Sin conexión para reconocer la voz." : "🎤 Se cortó el micrófono. Vuelve a apretar.";
      soltar({ enviar: oyo, avisar: t });
    }
  });
  try { h.empezar(); } catch { aviso("🎤 No se pudo abrir el micrófono. Vuelve a apretar."); return; }
  try { e && e.currentTarget && e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  Object.assign(V, { apretado: true, toma: h, ultimo: 0, pointerId: e ? e.pointerId : null });
  navigator.vibrate?.(20);
  $("btnHablarProfe").classList.add("on");
  $("btnHablarProfe").firstChild.textContent = "🎙 TE ESCUCHAN";
  lo("");
  latido(true);
  clearInterval(V.timer); V.timer = setInterval(tick, 200);
}

// Al soltar: habla: null en el acto (los alumnos recuperan el botón), luego el final y el mensaje.
async function soltar({ enviar = true, avisar = "" } = {}) {
  if (!V.apretado) return;
  const h = V.toma;
  V.apretado = false;
  clearInterval(V.timer); V.timer = null;
  setDoc(vivoRef(), { habla: null }).catch(() => {});
  $("btnHablarProfe").classList.remove("on");
  $("btnHablarProfe").firstChild.textContent = "🎙 HABLAR";
  const { texto } = await h.soltar({ inmediato: !enviar });
  let err = "";
  if (enviar && h.debate === (debateAbierto() || {}).debate?.n) err = await publicarMensaje(texto);
  if (V.toma === h && !V.apretado) V.toma = null;
  aviso(err || avisar || (enviar && !texto ? "🎤 No te escuché: mantén apretado mientras hablas." : ""));
}

// La cola de la tribuna (la arma el proyector): tocar lanza, ✕ descarta.
function pintarCola(c) {
  const xs = c.cola || [];
  const firma = JSON.stringify(xs);
  if (firma === V.colaFirma) return;
  V.colaFirma = firma;
  $("colaK").textContent = `✋ Tribuna${xs.length ? ` (${xs.length})` : ""}`;
  const que = { pregunta: "pregunta", fuente: "🤔 la tribuna duda de", mencion: "💬 te habla" };
  $("cola").innerHTML = xs.length ? xs.map(x => `<div class="cola-i">
      <button type="button" class="lanzar" data-id="${esc(x.id)}"><b>${esc(x.nombre || "Alguien")}</b> · ${que[x.tipo] || ""}<small>${esc(x.texto)}</small></button>
      <button type="button" class="b x" data-x="${esc(x.id)}" aria-label="Descartar">✕</button></div>`).join("")
    : `<div class="cola-vacia">Nada por ahora. Aquí llegan las preguntas ✋ del público, los 🤔 y las menciones al moderador.</div>`;
}

// Lo llama control.js en cada foto del proyector.
export function pintarModerar(c, modera) {
  document.body.classList.toggle("modera", modera);
  $("sModera").classList.toggle("oculto", !modera);
  $("sCola").classList.toggle("oculto", !modera);
  if (!modera && V.apretado) soltar({ enviar: false });
  if (modera) pintarCola(c);
}

export function prepararModerar({ db, codigo, dato, mandar }) {
  Object.assign(V, { db, codigo, dato, mandar });
  const b = $("btnHablarProfe");
  if (!Rec) {
    b.classList.add("oculto");
    $("profeEscribe").classList.remove("oculto");
    const enviar = async () => {
      const t = $("profeTx").value.trim();
      if (!t) return;
      const err = await publicarMensaje(t, { voz: false });
      if (!err) $("profeTx").value = "";
      aviso(err);
    };
    $("profeEnviar").onclick = enviar;
    $("profeTx").onkeydown = e => { if (e.key === "Enter") enviar(); };
  } else {
    b.addEventListener("pointerdown", empezar);
    // solo suelta el dedo que apretó
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(ev, e => { if (e.pointerId === V.pointerId) soltar(); });
    b.addEventListener("contextmenu", e => e.preventDefault());
    // red de seguridad: el micrófono nunca queda abierto a ciegas
    for (const ev of ["pointerup", "pointercancel"])
      document.addEventListener(ev, e => { if (V.apretado && e.pointerId === V.pointerId) soltar(); }, true);
    document.addEventListener("visibilitychange", () => { if (document.hidden && V.apretado) soltar(); });
    window.addEventListener("pagehide", () => { if (V.toma) setDoc(vivoRef(), { habla: null }).catch(() => {}); });
  }
  $("cola").addEventListener("click", e => {
    const l = e.target.closest("[data-id]"), x = e.target.closest("[data-x]");
    // sin botón: mandar() reescribe el textContent del botón que espera y aplastaría su <b>/<small>
    if (l) V.mandar("tribuna", l.dataset.id);
    else if (x) V.mandar("descartar", x.dataset.x);
  });
}
```

- [ ] **Step 4: `control.js`** — conectar:
  - Import arriba, después del de `firebase-config.js`:
    ```js
    import { prepararModerar, pintarModerar } from "./moderar.js?v=20261003a";
    ```
  - En `INTERRUPTORES`, primero de la lista:
    ```js
      ["modProfe", "Moderas tú", "la IA se calla y moderas a viva voz desde aquí"],
    ```
  - En `habilitar()`, que el botón de hablar nunca se deshabilite mientras se aprieta (perdería el dedo):
    ```js
      for (const el of document.querySelectorAll("#vPanel button:not(.hablar-profe), #vPanel select, #vPanel input:not(#profeTx)")) el.disabled = !!P.t;
    ```
  - En `pintar()`, después de `if (f === "abierta") pintarDebate(c);`:
    ```js
      pintarModerar(c, f === "abierta" && opcionActiva(c.opciones || {}, "modProfe"));
    ```
  - En `pintarDebate(c)`, al final:
    ```js
      mostrar("btnModera", !opcionActiva(ops, "modProfe"));   // moderas tú: la moderadora de IA no se llama
    ```
  - En `conectar(user)`, justo antes de `espera("Conectando con la pantalla…");`:
    ```js
      prepararModerar({ db, codigo: CODIGO, dato: () => C.dato, mandar });
    ```

- [ ] **Step 5: Verificar** — `node --input-type=module --check < control.js` y `node --input-type=module --check < moderar.js` → sin error (los imports remotos no se resuelven con `--check`).

- [ ] **Step 6: Commit**

```bash
git add moderar.js control.js control.html
git commit -m "Control: moderas tú — HABLAR al pulgar, la cola de la tribuna y escribir como Moderador

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: versiones de caché

**Files:** `index.html`, `jugar.html`, `control.html`, `control.js` (su import de `moderar.js`)

- [ ] **Step 1:** Para cada script que cambió en este plan (`rotacion.js`, `ritmo.js`, `publico.js`, `moderacion.js`, `clase.js`, `escenario.js`, `online.js`, `jugar.js`, `control.js`, `vozprofe.js`, `dictado.js`, `moderar.js`), cambia su `?v=…` a `?v=20261003a` en **todas** las páginas que lo cargan:

Run: `grep -n "rotacion.js?v\|ritmo.js?v\|publico.js?v\|moderacion.js?v\|clase.js?v\|escenario.js?v\|online.js?v\|jugar.js?v\|control.js?v\|vozprofe.js?v\|dictado.js?v\|moderar.js?v" *.html *.js`
Expected después del cambio: todas las coincidencias con `20261003a`.

- [ ] **Step 2:** `node --test pruebas/` → 188 pasan.

- [ ] **Step 3: Commit**

```bash
git add index.html jugar.html control.html control.js
git commit -m "Caché: versiones nuevas para el moderador profesor

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: prueba de punta a punta (emuladores + Playwright)

No se commitea nada del arnés: vive en el scratchpad. Arma el arnés según la memoria `e2e-emuladores-playwright` (reemplazar `firebase-config.js` por `demo-tribuna`, reescribir al vuelo `online.js`, `jugar.js` **y ahora también `control.js` y `moderar.js`** para conectar los emuladores e iniciar sesión con credencial falsa; profe = naim.bro@gmail.com; un contexto del navegador por aparato; cortar `cloudfunctions.net`). Inyecta en el control y en los teléfonos un `SpeechRecognition` falso (`add_init_script`) que, al `start()`, entrega resultados provisionales y luego uno final con una frase fija, y `onend` al `stop()`.

- [ ] **Step 1: Montaje** — `servidor.py` sirviendo el repo; emuladores de Auth y Firestore con las reglas del repo; semana 307; proyector en `index.html?escenario=1`, control en `control.html?sala=…`, 8 teléfonos (2 grupos de 4 que debaten y el resto público).

- [ ] **Step 2: Escenarios** — cada uno es un caso con su resultado en consola:
  1. Con `modProfe` apagado: un debate completo como hoy, con al menos un mensaje de la moderadora de IA (sin motor LLM: plantillas).
  2. Encender «Moderas tú» desde el control. Abrir el debate: la apertura aparece como mensaje de sistema, no como `mod`.
  3. El control aprieta HABLAR: en < 3 s el rótulo del escenario muestra «● EN VIVO 🎙 MODERADOR» con el texto provisional; los teléfonos del público muestran «Habla el moderador»; los que debaten, la línea «Habla el moderador · en vivo» y el botón «HABLA EL MODERADOR».
  4. Un alumno tiene el botón apretado y el control empieza a hablar: el alumno suelta solo, su mensaje 🎤 se publica, su aviso dice «El moderador tomó la palabra», y su banco deja de correr.
  5. El control suelta: aparece un mensaje `tipo: "mod"`, `nombre: "Moderador"`, `voz: true`, `datos.profe: true` en `mensajes`; los botones de los alumnos vuelven en ≤ 3 s. Al cerrar el tramo, el prompt del relator (espía en `pedirLLM`) trae la línea `[🎙 Moderador · 🎤] …`; sin motor LLM, revisa `transcripcionChat(() => true)` desde la consola del proyector.
  6. Un teléfono del público manda una pregunta ✋: aparece en la cola del control; tocarla la muestra en el escenario con foto (rótulo ámbar) firmada «Moderador» y sale de la cola. Otra pregunta descartada con ✕ no vuelve.
  7. Durante todo el debate con `modProfe`: ningún mensaje nuevo con `nombre: "Moderadora"` y `speechSynthesis.speak` no se llama para mensajes `mod` (envuélvelo con un espía en el proyector).
  8. Apagar «Moderas tú» a mitad del debate: la moderadora de IA vuelve a intervenir.
  9. El control sin `SpeechRecognition` (otro contexto sin el falso y con `delete window.webkitSpeechRecognition`): aparece «Escribir como Moderador» y su mensaje sale sin 🎤.
  10. Regresión del teléfono (tarea 5): un alumno mantiene 61 s → dos mensajes (corte de 60 s); un `not-allowed` en el primer reconocedor no envía nada y avisa.

- [ ] **Step 3:** Si algo falla, arréglalo en una tarea aparte con su commit (`superpowers:systematic-debugging`), y vuelve a correr todos los escenarios.

---

### Task 14: desplegar

Solo con el visto bueno del profesor (publica en GitHub Pages y cambia las reglas de producción).

- [ ] **Step 1:** `node --test pruebas/` → 188 pasan; reglas contra el emulador → 0 mal.
- [ ] **Step 2:** Desplegar reglas: `firebase deploy --only firestore:rules`.
- [ ] **Step 3:** `git push origin main` (GitHub Pages).
- [ ] **Step 4:** Prueba del profesor en aparatos reales antes de la clase: su celular Android con el control (HABLAR, latido, mensaje), un teléfono Android y un iPhone como alumnos (ceder la palabra, subtítulo), el proyector en modo escenario.
