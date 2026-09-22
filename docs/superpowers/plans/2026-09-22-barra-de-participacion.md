# Barra de participación — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una barra por grupo que se llena con lo que escriben sus integrantes (tope 1/N por persona, 60 palabras), visible en el proyector y en los teléfonos, con celebraciones y registro en admin.

**Architecture:** `barra.js` es lógica pura, probada con Node. `barravista.js` la pinta en el proyector, en la franja `.participantes`, y celebra. `jugar.js` la pinta en el teléfono, en `#marca`. Cada pantalla la calcula con lo que ya recibe (mensajes y jugadores), sin datos nuevos en Firestore. Al cerrar la votación, `clase.js` guarda el resultado en el debate, y admin lo muestra.

**Tech Stack:** JS vanilla (scripts clásicos + módulos ES), Firestore, `node --test`.

Spec: `docs/superpowers/specs/2026-09-22-barra-de-participacion-design.md`

---

### Task 1: `barra.js` — la lógica pura

**Files:** Create `barra.js`, Test `pruebas/barra.test.js`

- [ ] **Step 1: tests que fallan**

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../barra.js");
const palabras = n => Array.from({ length: n }, (_, i) => "palabra" + i).join(" ");
const msg = (uid, texto) => ({ tipo: "alumno", uid, nombre: uid, texto });
const tres = [{ uid: "a", nombre: "Ana" }, { uid: "b", nombre: "Beto" }, { uid: "c", nombre: "Caro" }];

test("palabrasQueCuentan: menos de 3 no cuenta, tope 40, sin @menciones", () => {
  assert.equal(B.palabrasQueCuentan("sí, claro"), 0);
  assert.equal(B.palabrasQueCuentan("@Moderadora no sé"), 0);
  assert.equal(B.palabrasQueCuentan("la ley llega tarde"), 4);
  assert.equal(B.palabrasQueCuentan(palabras(90)), 40);
});

test("llenadoGrupo: una persona sola no pasa de 1/N", () => {
  const r = B.llenadoGrupo([msg("a", palabras(40)), msg("a", palabras(40) + " x"), msg("a", palabras(30) + " y z")], tres);
  assert.equal(r.personas.find(p => p.clave === "a").pct, 1);
  assert.ok(Math.abs(r.pct - 1 / 3) < 1e-9);
  assert.equal(r.todos, false);
});

test("llenadoGrupo: repetir el mismo texto no suma; quien no es del grupo no cuenta", () => {
  const r = B.llenadoGrupo([msg("a", palabras(30)), msg("a", palabras(30)), msg("z", palabras(40))], tres);
  assert.equal(r.personas.find(p => p.clave === "a").palabras, 30);
  assert.equal(r.personas.length, 3);
});

test("llenadoGrupo: todos escriben 60 → 100 % y «todos»", () => {
  const ms = tres.flatMap(p => [msg(p.uid, palabras(30)), msg(p.uid, palabras(30) + " fin")]);
  const r = B.llenadoGrupo(ms, tres);
  assert.equal(r.pct, 1);
  assert.equal(r.todos, true);
});

test("llenadoGrupo: sin uid se atribuye por nombre", () => {
  const r = B.llenadoGrupo([{ tipo: "alumno", nombre: "Ana", texto: palabras(10) }], [{ nombre: "Ana" }]);
  assert.equal(r.personas[0].palabras, 10);
});

test("colorBarra: umbrales", () => {
  assert.equal(B.colorBarra(0), "rojo");
  assert.equal(B.colorBarra(0.33), "rojo");
  assert.equal(B.colorBarra(0.34), "ambar");
  assert.equal(B.colorBarra(0.67), "verde");
  assert.equal(B.colorBarra(1), "lleno");
});

test("hitosNuevos: se disparan al cruzar, no al estar", () => {
  const vacio = B.llenadoGrupo([], tres);
  const medio = B.llenadoGrupo(tres.map(p => msg(p.uid, palabras(35))), tres);
  const lleno = B.llenadoGrupo(tres.flatMap(p => [msg(p.uid, palabras(30)), msg(p.uid, palabras(30) + " fin")]), tres);
  assert.deepEqual(B.hitosNuevos(null, lleno), [], "la primera lectura no celebra");
  assert.deepEqual(B.hitosNuevos(vacio, medio).map(h => h.tipo).sort(), ["mitad", "todos"]);
  assert.deepEqual(B.hitosNuevos(medio, lleno).map(h => h.tipo).sort(), ["lleno", "parte", "parte", "parte"]);
  assert.deepEqual(B.hitosNuevos(lleno, lleno), []);
});
```

- [ ] **Step 2:** `node --test pruebas/barra.test.js` → FAIL (`Cannot find module '../barra.js'`).

- [ ] **Step 3: implementación**

```js
const BARRA = { META_PERSONA: 60, MAX_POR_MENSAJE: 40, MIN_PALABRAS: 3, AMBAR: 0.34, VERDE: 0.67 };
const normBarra = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
function palabrasQueCuentan(texto) {
  const n = (String(texto || "").replace(/@\S+/g, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
  return n < BARRA.MIN_PALABRAS ? 0 : Math.min(n, BARRA.MAX_POR_MENSAJE);
}
const claveBarra = x => x.uid || "nombre:" + normBarra(x.nombre);
function llenadoGrupo(msgs, integrantes) {
  const por = new Map();
  for (const i of integrantes || []) por.set(claveBarra(i), { clave: claveBarra(i), nombre: i.nombre || "?", palabras: 0, mensajes: 0, vistos: new Set() });
  for (const m of msgs || []) {
    if (m.tipo !== "alumno") continue;
    const p = por.get(claveBarra(m)), k = normBarra(m.texto);
    if (!p || p.vistos.has(k)) continue;
    p.vistos.add(k);
    const w = palabrasQueCuentan(m.texto);
    if (w) { p.palabras += w; p.mensajes++; }
  }
  const personas = [...por.values()].map(p => ({ clave: p.clave, nombre: p.nombre, palabras: p.palabras, pct: Math.min(1, p.palabras / BARRA.META_PERSONA), escribio: p.mensajes > 0 }));
  const pct = personas.length ? personas.reduce((a, p) => a + p.pct, 0) / personas.length : 0;
  return { pct, personas, todos: personas.length > 0 && personas.every(p => p.escribio) };
}
const colorBarra = pct => pct >= 1 - 1e-9 ? "lleno" : pct >= BARRA.VERDE ? "verde" : pct >= BARRA.AMBAR ? "ambar" : "rojo";
function hitosNuevos(antes, ahora) {
  if (!antes) return [];
  const h = [];
  if (antes.pct < 0.5 && ahora.pct >= 0.5) h.push({ tipo: "mitad" });
  if (antes.pct < 1 - 1e-9 && ahora.pct >= 1 - 1e-9) h.push({ tipo: "lleno" });
  if (!antes.todos && ahora.todos) h.push({ tipo: "todos" });
  for (const p of ahora.personas) {
    const a = antes.personas.find(x => x.clave === p.clave);
    if (p.pct >= 1 && !(a && a.pct >= 1)) h.push({ tipo: "parte", clave: p.clave, nombre: p.nombre });
  }
  return h;
}
if (typeof module !== "undefined") module.exports = { BARRA, palabrasQueCuentan, claveBarra, llenadoGrupo, colorBarra, hitosNuevos };
```

- [ ] **Step 4:** `node --test pruebas/` → todos PASS.

### Task 2: el proyector (`barravista.js`)

**Files:** Create `barravista.js`; Modify `app.js` (`pintarFeed`, al final), `escenas.js` (`confeti` acepta origen), `online.js` (`rosterRemoto` con uid), `index.html` (CSS + scripts `barra.js`, `barravista.js`)

- `integrantesBarra(k)`: los jugadores de la sala con `grupo === S.debate[k]` (`window.jugadoresSala`), más quienes escribieron por ese lado en este debate (alumnos simulados por el profesor). Se unen por `claveBarra`.
- `pintarBarras()`: si no hay `S.debate`, no hace nada (quedan las listas de siempre). Si hay, pinta en `#listaA` / `#listaB`:
  - cabecera «Grupo N · A FAVOR» con el % y, si corresponde, el sello «👥 todos escribieron»;
  - la barra `.bz-barra.<color>` con `.bz-llen` de ancho `pct`;
  - una tajada por integrante (primer nombre), clase `cero` / `mid` / `full`.
  La estructura se rehace solo si cambian el debate o los integrantes. Si no, se actualizan anchos y clases, para que la transición CSS anime.
- Celebración: `BV.antes[k]` guarda el último estado. La primera lectura de cada debate es silenciosa. Con `hitosNuevos`:
  - `mitad` → `sonar("moneda")`;
  - `lleno` → `confeti([color, "#fff", "#ffb020"], 3500, origen de la barra)`, `sonar("fanfarria")` y el cartel `#bzCartel` «🎉 ¡GRUPO N LLENÓ LA BARRA!» por 3,5 s;
  - `todos` → `sonar("campana")`.
  Cada hito se celebra una sola vez (`BV.hechos`, un Set por debate).
- `app.js/pintarFeed`: al final, `if (typeof pintarBarras === "function" && S.debate) pintarBarras();` en vez de las listas cuando hay debate.

### Task 3: el teléfono (`jugar.js`, `jugar.html`)

- Integrantes: `J.gente` con `grupo === d[k]`. Mensajes: `J.chat` del debate `d.n`.
- Si debato: la barra de mi grupo y «tu parte: X/60 palabras» (mi tajada resaltada). Si voto: las dos barras en chico.
- Celebración: `hitosNuevos` contra el último estado (`JB.antes[k]`; al cargar, `null`), más lo ya celebrado en `localStorage["tribuna_barra_" + codigo + "_" + debate]`:
  - mi `parte` → vibra, `#notaCaja` «✓ ¡Tu parte está llena!» y confeti chico;
  - `lleno` de mi grupo → vibra, confeti y el cartel;
  - `todos` → queda el sello en la barra.
- Se repinta cuando llegan mensajes y cuando cambia la lista de la sala.

### Task 4: registro y admin

- `clase.js/cerrarVotacion`: `reg.barra = barraDelDebate()` (en `barravista.js`, devuelve `{ A: { pct, personas: [{ nombre, palabras }] }, B: … }`).
- `online.js/estadoPublico.debates`: `barraA`, `barraB` (% entero).
- `admin.js`: en la línea de cada debate, «· barra 85 % / 40 %».

### Task 5: verificación

- `node --test pruebas/` → PASS.
- Headless (`servidor.py` + Playwright): debate local con alumnos simulados por el compositor. Las barras cambian de color, aparece el cartel al 100 %, sin errores de consola. Captura de pantalla.
