# Brújula corta y grupos por posición — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que cada partida pueda, opcionalmente, formar los grupos con una brújula corta en el teléfono, mostrar el mapa de la clase, emparejar los grupos más lejanos con la moción sobre lo que los separa, y repetir la brújula al cierre para ver cuánto se movió cada punto.

**Arquitectura:**
- **Lógica pura en `brujula.js`:** posición, campo, formación de grupos, emparejamiento por distancia, asignación de rezagados, movimiento y el SVG del mapa. Es un script clásico con `module.exports` para Node, y lo cargan la pantalla del profesor, el teléfono y el panel.
- **El profesor es la fuente de verdad:** publica la definición de la brújula y el mapa anónimo en la sala, y escribe los grupos en `jugadores/{uid}.grupo`.
- **El teléfono** lee la brújula desde la sala, calcula su posición con `brujula.js` y la guarda en `brujula/{uid}`.

**Tecnologías:** JavaScript sin compilación, Firebase Auth y Firestore 12.9.0, Node 20 en WSL (`node --test`).

**Spec:** `docs/superpowers/specs/2026-09-19-brujula-y-grupos-design.md`

## Restricciones globales

- **Rama y merge:** se trabaja en la rama `brujula`. El merge a `main` se hace después de la prueba en línea (Tarea 9).
- **Caché:** cada `<script>` tocado sube su `?v=` a `20260924` más una letra.
- **Commits:** con `-c user.name="Naim Bro" -c user.email="naim.bro@gmail.com"`, terminando en `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Pruebas:** `wsl.exe -e bash -lc "source ~/.nvm/nvm.sh >/dev/null; cd /mnt/c/Users/naim.bro.k/claude_projects/games/tribuna && node --test pruebas/"`
- **Sintaxis de los módulos:** se copian a `/tmp/chk/*.mjs` y se revisan con `node --check`.
- **Reglas:** se despliegan desde `/tmp/tribuna_rules` con `firebase.json`, `.firebaserc`, `firestore.rules` y `firestore.indexes.json`.
- **La brújula es opcional:** al comienzo, con el interruptor «Usar brújula» de la portada, visible solo si la semana define `BRUJULA`. Al cierre, con el botón «REPETIR BRÚJULA», visible solo si la partida la usó. Apagada, todo funciona como hoy.
- **Constantes:** `TAM_GRUPO = 5`. Un campo con 3 o más personas forma grupos propios; uno con 1 o 2 se reparte en el grupo más cercano.
- **Anonimato:** el mapa público lleva solo `{x, y, campo}`, en orden aleatorio y sin uid.
- **Escala:** los ejes van de −10 a 10.

## Foco de revisión

1. **Todos los alumnos caen en un solo campo:** igual se forman al menos dos grupos, si hay al menos 2 personas, para poder debatir. Lo prueba la Tarea 1 (`formarGrupos`, caso «un solo campo»).
2. **Alumno que llega después de formar los grupos, o que no terminó la brújula:** queda asignado a un grupo en segundos. El que no terminó va al grupo más chico. Lo prueban la Tarea 1 (`asignarTarde`) y la Tarea 9, paso 5.
3. **El profesor apaga la brújula con respuestas ya dadas:** los alumnos sin grupo pasan a la elección de grupo a mano. Lo prueba la Tarea 9, paso 3.
4. **La moderadora no dice qué grupo afirma la moción:** se mantiene el orden del emparejamiento y el profesor puede intercambiar los lados. Lo prueba la Tarea 7, paso 4.
5. **Semana sin `BRUJULA`:** no aparece el interruptor y todo sigue como hoy. Lo prueba la Tarea 6, paso 5 (semana 5).

---

### Tarea 1: `brujula.js`, la lógica pura

**Archivos:**
- Crear: `brujula.js`
- Crear: `pruebas/brujula.test.js`

**Interfaces:**
- Produce (globales en el navegador y `module.exports` en Node):
  - `TAM_GRUPO = 5`
  - `posicion(respuestas: {[idPregunta]: índice}, preguntas) → {x, y} | null`: promedio por eje de las opciones elegidas que puntúan en ese eje; un eje sin opciones vale 0. `null` si no hay ninguna respuesta.
  - `campoDe(pos, campos) → idCampo`
  - `formarGrupos(alumnos: [{uid, pos, campo}], campos, tam = TAM_GRUPO) → { grupos: [{n, campo, miembros: [uid], pos}], de: {[uid]: n} }`
  - `asignarTarde(pos | null, campo | null, grupos: [{n, campo, pos, tam}]) → n`
  - `emparejarLejanos(disponibles: number[], debates: {A,B}[], posDe: {[n]: {x,y}}) → {A, B} | null`
  - `movimiento(antes: {[uid]: {x,y}}, despues: {[uid]: {x,y}}) → [{uid, de, a, d}]`
  - `mapaSvg({ puntos: [{x, y, color, desde?: {x,y}, yo?: bool}], campos, ejes, tam = 420, chico = false }) → string`

- [ ] **Paso 1: pruebas que fallan** (`pruebas/brujula.test.js`)

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const B = require("../brujula.js");

const preguntas = [
  { id: "p1", opciones: [{ x: -8 }, { x: -4 }, { x: 4 }, { x: 8 }] },
  { id: "p2", opciones: [{ y: -7 }, { y: -3 }, { y: 3 }, { y: 7 }] },
  { id: "p3", opciones: [{ x: -8 }, { x: -4 }, { x: 4 }, { x: 8 }] }
];
const campos = [
  { id: "ley", centro: { x: -6, y: 5 } }, { id: "adentro", centro: { x: -6, y: -5 } },
  { id: "guard", centro: { x: 6, y: 5 } }, { id: "nada", centro: { x: 6, y: -5 } }
];

test("posicion: promedia por eje solo las opciones que puntúan en ese eje", () => {
  assert.deepEqual(B.posicion({ p1: 0, p2: 3, p3: 1 }, preguntas), { x: -6, y: 7 });
  assert.deepEqual(B.posicion({ p1: 3 }, preguntas), { x: 8, y: 0 });
  assert.equal(B.posicion({}, preguntas), null);
});

test("campoDe: el centro más cercano; empate, el primero", () => {
  assert.equal(B.campoDe({ x: -5, y: 6 }, campos), "ley");
  assert.equal(B.campoDe({ x: 0, y: 0 }, campos), "ley");
});

const al = (uid, campo, x, y) => ({ uid, campo, pos: { x, y } });

test("formarGrupos: un campo grande se reparte parejo en grupos de hasta 5", () => {
  const xs = Array.from({ length: 11 }, (_, i) => al("u" + i, "ley", -6 + i * 0.1, 5));
  const { grupos } = B.formarGrupos(xs, campos);
  assert.deepEqual(grupos.map(g => g.miembros.length).sort(), [3, 4, 4]);
  assert.ok(grupos.every(g => g.campo === "ley"));
});

test("formarGrupos: un campo de 1 o 2 se reparte al grupo más cercano", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "ley", -6, 6), al("c", "ley", -5, 5),
              al("d", "nada", 6, -5), al("e", "nada", 6, -6), al("f", "nada", 5, -5),
              al("g", "adentro", -6, -4)];
  const { grupos, de } = B.formarGrupos(xs, campos);
  assert.equal(grupos.length, 2);
  assert.equal(grupos.find(g => g.n === de.g).campo, "ley");     // (−6,−4) está más cerca de «ley» que de «nada»
});

test("formarGrupos: un solo campo igual forma dos grupos para poder debatir", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "ley", -5, 5), al("c", "ley", -6, 6), al("d", "ley", -4, 4)];
  const { grupos } = B.formarGrupos(xs, campos);
  assert.equal(grupos.length, 2);
  assert.deepEqual(grupos.map(g => g.miembros.length).sort(), [2, 2]);
});

test("formarGrupos: ningún campo llega a 3 → se agrupan por cercanía", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "adentro", -6, -5), al("c", "guard", 6, 5), al("d", "nada", 6, -5)];
  const { grupos, de } = B.formarGrupos(xs, campos);
  assert.equal(grupos.length, 2);
  assert.equal(Object.keys(de).length, 4);
});

test("formarGrupos: números 1..N estables y posición = centroide", () => {
  const xs = [al("a", "ley", -6, 5), al("b", "ley", -6, 5), al("c", "ley", -6, 5), al("d", "nada", 6, -5), al("e", "nada", 6, -5), al("f", "nada", 6, -5)];
  const r1 = B.formarGrupos(xs, campos), r2 = B.formarGrupos([...xs].reverse(), campos);
  assert.deepEqual(r1.grupos.map(g => [g.n, g.campo]), [[1, "ley"], [2, "nada"]]);
  assert.deepEqual(r1.grupos.map(g => [g.n, g.campo]), r2.grupos.map(g => [g.n, g.campo]));
  assert.deepEqual(r1.grupos[0].pos, { x: -6, y: 5 });
});

test("asignarTarde: al grupo más chico de su campo; si no tiene, al más cercano; sin posición, al más chico", () => {
  const gs = [{ n: 1, campo: "ley", pos: { x: -6, y: 5 }, tam: 4 }, { n: 2, campo: "ley", pos: { x: -5, y: 5 }, tam: 3 }, { n: 3, campo: "nada", pos: { x: 6, y: -5 }, tam: 5 }];
  assert.equal(B.asignarTarde({ x: -6, y: 5 }, "ley", gs), 2);
  assert.equal(B.asignarTarde({ x: 5, y: -4 }, "guard", gs), 3);
  assert.equal(B.asignarTarde(null, null, gs), 2);
});

test("emparejarLejanos: nadie queda dos debates atrás y se elige el par más lejano", () => {
  const posDe = { 1: { x: -6, y: 5 }, 2: { x: -5, y: 4 }, 3: { x: 6, y: -5 }, 4: { x: 5, y: 5 } };
  const p = B.emparejarLejanos([1, 2, 3, 4], [], posDe);
  assert.deepEqual([p.A, p.B].sort(), [1, 3]);
  const debates = [];
  for (let k = 0; k < 12; k++) {
    const q = B.emparejarLejanos([1, 2, 3, 4], debates, posDe);
    debates.push(q);
    const n = [1, 2, 3, 4].map(g => debates.filter(d => d.A === g || d.B === g).length);
    assert.ok(Math.max(...n) - Math.min(...n) <= 1, `k=${k} ${n}`);
  }
  assert.equal(B.emparejarLejanos([1], [], posDe), null);
});

test("movimiento: solo quienes respondieron las dos veces", () => {
  const m = B.movimiento({ a: { x: 0, y: 0 }, b: { x: 1, y: 1 } }, { a: { x: 3, y: 4 } });
  assert.equal(m.length, 1);
  assert.equal(m[0].d, 5);
});

test("mapaSvg: un círculo por campo y por punto, flecha si hay «desde»", () => {
  const s = B.mapaSvg({ puntos: [{ x: 1, y: 1, color: "#fff" }, { x: 2, y: 2, color: "#fff", desde: { x: 0, y: 0 } }], campos: campos.map(c => ({ ...c, nombre: c.id, color: "#38bdf8" })), ejes: null });
  assert.equal((s.match(/<circle/g) || []).length, 6);
  assert.equal((s.match(/<line class="mv"/g) || []).length, 1);
});
```

- [ ] **Paso 2: correr y ver que fallan**

Esperado: FALLA con `Cannot find module '../brujula.js'`.

- [ ] **Paso 3: `brujula.js`**

```js
/* =====================================================================
   TRIBUNA — la brújula corta: dónde está cada alumno, en qué campo, cómo se forman los grupos
   y qué pares de grupos debaten. Lógica pura (sin DOM ni Firestore), probada con Node.
   Spec: docs/superpowers/specs/2026-09-19-brujula-y-grupos-design.md
   ===================================================================== */

const TAM_GRUPO = 5;
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const centroide = xs => ({ x: xs.reduce((s, a) => s + a.pos.x, 0) / xs.length, y: xs.reduce((s, a) => s + a.pos.y, 0) / xs.length });

// Promedio por eje de las opciones elegidas que puntúan en ese eje (como la brújula de ml2).
function posicion(respuestas, preguntas) {
  const ejes = { x: [], y: [] };
  let n = 0;
  for (const p of preguntas || []) {
    const i = respuestas ? respuestas[p.id] : undefined;
    const o = Number.isInteger(i) ? p.opciones[i] : null;
    if (!o) continue;
    n++;
    if (typeof o.x === "number") ejes.x.push(o.x);
    if (typeof o.y === "number") ejes.y.push(o.y);
  }
  if (!n) return null;
  const prom = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  return { x: prom(ejes.x), y: prom(ejes.y) };
}

function campoDe(pos, campos) {
  let mejor = null, d = Infinity;
  for (const c of campos || []) { const e = distancia(pos, c.centro); if (e < d - 1e-9) { d = e; mejor = c.id; } }
  return mejor;
}

// Reparte una lista en k grupos de tamaños parejos (difieren a lo más en 1), manteniendo juntos a
// los cercanos: se ordena por posición antes de cortar.
function repartir(xs, k) {
  const orden = [...xs].sort((a, b) => a.pos.x - b.pos.x || a.pos.y - b.pos.y || String(a.uid).localeCompare(String(b.uid)));
  const base = Math.floor(orden.length / k), extra = orden.length % k, out = [];
  let i = 0;
  for (let g = 0; g < k; g++) { const t = base + (g < extra ? 1 : 0); out.push(orden.slice(i, i + t)); i += t; }
  return out.filter(g => g.length);
}

function formarGrupos(alumnos, campos, tam = TAM_GRUPO) {
  const conPos = (alumnos || []).filter(a => a && a.pos);
  const orden = (campos || []).map(c => c.id);
  let grupos = [];
  const sueltos = [];
  for (const id of orden) {
    const xs = conPos.filter(a => a.campo === id);
    if (xs.length >= 3) for (const g of repartir(xs, Math.ceil(xs.length / tam))) grupos.push({ campo: id, miembros: g });
    else sueltos.push(...xs);
  }
  sueltos.push(...conPos.filter(a => !orden.includes(a.campo)));
  if (!grupos.length && conPos.length) {
    // ningún campo llega a 3: todos juntos, ordenados por ángulo en el plano
    const porAngulo = [...conPos].sort((a, b) => Math.atan2(a.pos.y, a.pos.x) - Math.atan2(b.pos.y, b.pos.x));
    const k = Math.max(conPos.length >= 2 ? 2 : 1, Math.ceil(conPos.length / tam));
    grupos = repartir(porAngulo, k).map(g => ({ campo: campoDe(centroide(g), campos) || g[0].campo, miembros: g }));
  } else {
    for (const a of sueltos) {
      const g = grupos.reduce((m, x) => (distancia(a.pos, centroide(x.miembros)) < distancia(a.pos, centroide(m.miembros)) ? x : m));
      g.miembros.push(a);
    }
  }
  // para debatir hacen falta dos grupos: si hay uno solo con al menos 2 personas, se parte en dos
  if (grupos.length === 1 && grupos[0].miembros.length >= 2) grupos = repartir(grupos[0].miembros, 2).map(m => ({ campo: grupos[0].campo, miembros: m }));
  grupos.sort((a, b) => orden.indexOf(a.campo) - orden.indexOf(b.campo) || b.miembros.length - a.miembros.length
    || String(a.miembros.map(m => m.uid).sort()[0]).localeCompare(String(b.miembros.map(m => m.uid).sort()[0])));
  const de = {};
  const salida = grupos.map((g, i) => {
    g.miembros.forEach(m => { de[m.uid] = i + 1; });
    return { n: i + 1, campo: g.campo, miembros: g.miembros.map(m => m.uid), pos: centroide(g.miembros) };
  });
  return { grupos: salida, de };
}

// Quien llega tarde (o no terminó la brújula): al grupo más chico de su campo; si su campo no
// tiene grupos, al más cercano a su posición; sin posición, al más chico de todos.
function asignarTarde(pos, campo, grupos) {
  if (!grupos || !grupos.length) return null;
  const chico = xs => xs.reduce((m, g) => (g.tam < m.tam || (g.tam === m.tam && g.n < m.n) ? g : m)).n;
  if (!pos) return chico(grupos);
  const delCampo = grupos.filter(g => g.campo === campo);
  if (delCampo.length) return chico(delCampo);
  return grupos.reduce((m, g) => (distancia(pos, g.pos) < distancia(pos, m.pos) ? g : m)).n;
}

// Como emparejar() de rotacion.js (nadie queda dos debates atrás de otro), pero entre los
// candidatos elige el par más lejano en el mapa. Primero los pares que no se han enfrentado.
function emparejarLejanos(disponibles, debates, posDe) {
  const gs = [...new Set(disponibles || [])].filter(g => posDe && posDe[g]).sort((a, b) => a - b);
  if (gs.length < 2) return null;
  const jug = g => debates.filter(d => d.A === g || d.B === g).length;
  const ult = g => { for (let i = debates.length - 1; i >= 0; i--) if (debates[i].A === g || debates[i].B === g) return i; return -1; };
  const yaJugaron = (x, y) => debates.some(d => (d.A === x && d.B === y) || (d.A === y && d.B === x));
  const min1 = Math.min(...gs.map(jug));
  const prim = gs.filter(g => jug(g) === min1);
  const pares = [];
  if (prim.length >= 2) { for (let i = 0; i < prim.length; i++) for (let j = i + 1; j < prim.length; j++) pares.push([prim[i], prim[j]]); }
  else {
    const resto = gs.filter(g => g !== prim[0]);
    const min2 = Math.min(...resto.map(jug));
    for (const b of resto.filter(g => jug(g) === min2)) pares.push([prim[0], b]);
  }
  const nuevos = pares.filter(([a, b]) => !yaJugaron(a, b));
  const cand = nuevos.length ? nuevos : pares;
  cand.sort((p, q) => distancia(posDe[q[0]], posDe[q[1]]) - distancia(posDe[p[0]], posDe[p[1]])
    || (ult(p[0]) + ult(p[1])) - (ult(q[0]) + ult(q[1])) || p[0] - q[0] || p[1] - q[1]);
  return { A: cand[0][0], B: cand[0][1] };
}

function movimiento(antes, despues) {
  return Object.keys(despues || {}).filter(u => antes && antes[u])
    .map(u => ({ uid: u, de: antes[u], a: despues[u], d: distancia(antes[u], despues[u]) }));
}

// El mapa: un plano de −10 a 10 con los centros de los campos como círculos tenues y un punto por
// alumno (flecha si trae «desde»). SVG en texto: lo usan el proyector, el teléfono y el panel.
function mapaSvg({ puntos = [], campos = [], ejes = null, tam = 420, chico = false }) {
  const m = chico ? 8 : 40, W = tam, H = tam;
  const X = v => m + (v + 10) / 20 * (W - 2 * m), Y = v => H - m - (v + 10) / 20 * (H - 2 * m);
  const e = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let s = `<svg viewBox="0 0 ${W} ${H}" class="mapa" role="img" aria-label="Mapa de posiciones de la clase">`;
  if (puntos.some(p => p.desde)) s += `<defs><marker id="fl" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#e6edf3"/></marker></defs>`;
  s += `<rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" fill="none" stroke="#1e2a36"/>`;
  s += `<line x1="${W / 2}" y1="${m}" x2="${W / 2}" y2="${H - m}" stroke="#1e2a36" stroke-dasharray="4 4"/><line x1="${m}" y1="${H / 2}" x2="${W - m}" y2="${H / 2}" stroke="#1e2a36" stroke-dasharray="4 4"/>`;
  for (const c of campos) {
    s += `<circle cx="${X(c.centro.x).toFixed(1)}" cy="${Y(c.centro.y).toFixed(1)}" r="${chico ? 16 : 46}" fill="${c.color || "#7d8fa1"}" opacity=".13"/>`;
    if (!chico) s += `<text x="${X(c.centro.x).toFixed(1)}" y="${(Y(c.centro.y) - 52).toFixed(1)}" text-anchor="middle" fill="${c.color || "#7d8fa1"}" font-size="12" font-weight="700">${e(c.nombre)}</text>`;
  }
  if (ejes && !chico) {
    s += `<text x="${m}" y="${H / 2 - 6}" fill="#7d8fa1" font-size="11">${e(ejes.x.min)}</text><text x="${W - m}" y="${H / 2 - 6}" fill="#7d8fa1" font-size="11" text-anchor="end">${e(ejes.x.max)}</text>`;
    s += `<text x="${W / 2 + 6}" y="${m + 12}" fill="#7d8fa1" font-size="11">${e(ejes.y.max)}</text><text x="${W / 2 + 6}" y="${H - m - 4}" fill="#7d8fa1" font-size="11">${e(ejes.y.min)}</text>`;
  }
  for (const p of puntos) {
    if (p.desde) s += `<line class="mv" x1="${X(p.desde.x).toFixed(1)}" y1="${Y(p.desde.y).toFixed(1)}" x2="${X(p.x).toFixed(1)}" y2="${Y(p.y).toFixed(1)}" stroke="${p.color}" stroke-width="2" opacity=".75" marker-end="url(#fl)"/>`;
    s += `<circle class="pt" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${p.yo ? (chico ? 6 : 9) : (chico ? 3.5 : 6)}" fill="${p.color}" stroke="${p.yo ? "#ffffff" : "none"}" stroke-width="2"/>`;
  }
  return s + "</svg>";
}

if (typeof module !== "undefined") module.exports = { TAM_GRUPO, posicion, campoDe, formarGrupos, asignarTarde, emparejarLejanos, movimiento, mapaSvg };
```

- [ ] **Paso 4: correr y ver que pasan**

Esperado: todas pasan, 31 anteriores más 11 nuevas.

Si «un campo de 1 o 2 se reparte al grupo más cercano» falla por la distancia, revisar el caso: (−6,−4) está a 9 de (−5.7,5.3) y a 12,04 de (6,−5.3), así que va a «ley».

- [ ] **Paso 5: commit**

```bash
git add brujula.js pruebas/brujula.test.js
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "brujula.js: posición, campo, grupos, emparejamiento por distancia, rezagados, movimiento y mapa

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 2: la brújula de la semana 7

**Archivos:**
- Modificar: `contenido/semana7.js`: agregar `BRUJULA` al final.
- Crear: `pruebas/contenido.test.js`
- Modificar: `docs/superpowers/specs/2026-09-19-brujula-y-grupos-design.md`, sección 3: la posición se promedia por eje solo sobre las opciones que puntúan en ese eje, no con 0 cuando falta el eje.

**Interfaces:**
- Produce: `BRUJULA` con `ejes`, `preguntas` (5) y `campos` (4), en el formato de la spec.

- [ ] **Paso 1: prueba que falla** (`pruebas/contenido.test.js`)

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const vm = require("vm");
const B = require("../brujula.js");

// Los archivos de semana son scripts clásicos con const: se evalúan en un contexto y se leen.
function cargar(archivo) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(archivo, "utf8") + "\n;this.BRUJULA = typeof BRUJULA === 'undefined' ? null : BRUJULA;", ctx);
  return ctx.BRUJULA;
}

test("semana 7: brújula de 5 preguntas con opciones en los dos ejes y 4 campos", () => {
  const b = cargar("contenido/semana7.js");
  assert.ok(b, "semana7.js no define BRUJULA");
  assert.equal(b.preguntas.length, 5);
  for (const p of b.preguntas) {
    assert.ok(p.id && p.texto && p.opciones.length >= 2, p.id);
    for (const o of p.opciones) assert.ok(typeof o.x === "number" || typeof o.y === "number", `${p.id}: opción sin eje`);
  }
  const ejesUsados = new Set(b.preguntas.flatMap(p => p.opciones.flatMap(o => ["x", "y"].filter(k => typeof o[k] === "number"))));
  assert.deepEqual([...ejesUsados].sort(), ["x", "y"]);
  assert.equal(b.campos.length, 4);
  for (const c of b.campos) assert.ok(c.id && c.nombre && c.afirma && c.color && c.centro, c.id);
  // cada combinación extrema cae en un campo distinto
  const extremos = [0, 3].flatMap(i => [0, 3].map(j => Object.fromEntries(b.preguntas.map(p => [p.id, typeof p.opciones[0].x === "number" ? i : j]))));
  assert.equal(new Set(extremos.map(r => B.campoDe(B.posicion(r, b.preguntas), b.campos))).size, 4);
});

test("semana 5: sin brújula, el juego queda con la elección a mano", () => {
  assert.equal(cargar("contenido/semana5.js"), null);
});
```

- [ ] **Paso 2: correr y ver que falla**

Esperado: FALLA con «semana7.js no define BRUJULA».

- [ ] **Paso 3: generar `BRUJULA` desde el instrumento de ml2**

Correr este script de Python. Usa los ítems 1, 2, 3, 4 y 6 de `instrumento_s7_v1`: `magnitud` pasa a ser x y `direccion` pasa a ser y.

```python
import json, io
src = r"C:\Users\naim.bro.k\claude_projects\games\ml2-master-game\content\compas\ai_democracy_2026\instrumento_s7_v1.json"
i = json.load(open(src, encoding="utf-8"))
elegidos = ["s7_01_altman", "s7_02_sacks_hawley", "s7_03_huang", "s7_04_sanders", "s7_06_thune_jeffries"]
preguntas = []
for k, it in enumerate([x for x in i["items"] if x["id"] in elegidos], 1):
    ops = []
    for o in it["options"]:
        v = o["vector"]; d = {"texto": o["text"]}
        if "magnitud" in v: d["x"] = v["magnitud"]
        if "direccion" in v: d["y"] = v["direccion"]
        ops.append(d)
    preguntas.append({"id": f"p{k}", "texto": it["question"], "opciones": ops})
brujula = {
  "ejes": {"x": {"id": "velocidad", "etiqueta": "Velocidad", "min": "frenar", "max": "acelerar"},
           "y": {"id": "regla", "etiqueta": "Quién pone la regla", "min": "la industria se regula sola", "max": "el Estado, con potestades vinculantes"}},
  "preguntas": preguntas,
  "campos": [
    {"id": "ley", "nombre": "Frenar por ley", "centro": {"x": -6, "y": 5}, "color": "#38bdf8",
     "afirma": "La IA de frontera hay que frenarla, y el freno lo tiene que poner la ley del Estado."},
    {"id": "adentro", "nombre": "Frenar desde adentro", "centro": {"x": -6, "y": -5}, "color": "#34d399",
     "afirma": "La IA de frontera hay que frenarla, pero el freno lo ponen mejor los propios laboratorios que una ley."},
    {"id": "guard", "nombre": "Guardarraíles sin freno", "centro": {"x": 6, "y": 5}, "color": "#f59e0b",
     "afirma": "No hay que frenar la IA de frontera, pero el Estado tiene que fijarle guardarraíles vinculantes."},
    {"id": "nada", "nombre": "Ni freno ni ley", "centro": {"x": 6, "y": -5}, "color": "#fb7185",
     "afirma": "No hay que frenar la IA de frontera ni regularla por ley: el ritmo y las reglas los fija la industria."}
  ]
}
p = r"C:\Users\naim.bro.k\claude_projects\games\tribuna\contenido\semana7.js"
s = io.open(p, encoding="utf-8").read().rstrip("\n")
s += ("\n\n/* --- Brújula corta (opcional en cada partida) -------------------------\n"
      "   5 preguntas del instrumento de la semana 7 de ml2 (ítems 1, 2, 3, 4 y 6). x = velocidad\n"
      "   (frenar … acelerar), y = quién pone la regla (industria … Estado). Los campos son los\n"
      "   cuatro que ya se usan para formar las partidas. */\nconst BRUJULA = "
      + json.dumps(brujula, ensure_ascii=False, indent=2) + ";\n")
io.open(p, "w", encoding="utf-8", newline="").write(s)
```

- [ ] **Paso 4: correr y ver que pasan**

Esperado: todas pasan.

- [ ] **Paso 5: corregir la spec y hacer commit**

En la sección 3 de la spec, reemplazar «Si falta un eje, esa opción vale 0 en él.» y «el promedio por eje de las opciones que eligió» por: «La posición es, en cada eje, el promedio de las opciones elegidas que puntúan en ese eje (como la brújula de ml2); un eje sin opciones queda en 0».

```bash
git add contenido/semana7.js pruebas/contenido.test.js docs/superpowers/specs/2026-09-19-brujula-y-grupos-design.md
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Semana 7: brújula de 5 preguntas y 4 campos, desde el instrumento de ml2

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 3: regla de `brujula/{uid}`

**Archivos:**
- Modificar: `firestore.rules`, con un bloque nuevo después de `match /telemetria/{id}`.

**Interfaces:**
- Consume: `sala.brujula.fase`, publicado por la Tarea 5.
- Produce: `brujula/{uid}` acepta `{ uid, respuestas, pos: {x,y}, campo, t }`, con `repeticion` opcional, mientras la fase es «responder», «grupos» o «repetir».

- [ ] **Paso 1: el bloque**

```
      // Brújula corta: la respuesta de cada alumno (posición y campo). La escribe el propio alumno
      // mientras la brújula está abierta (al comienzo, para quien llega tarde, y al repetirla al
      // cierre). La leen él y el profesor; el mapa público va sin uid.
      match /brujula/{uid} {
        allow read: if esProfe(codigo) || (conSesion() && uid == request.auth.uid);
        allow write: if conSesion() && uid == request.auth.uid && esJugador(codigo)
          && sala(codigo).data.get('brujula', {}).get('fase', '') in ['responder', 'grupos', 'repetir']
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.pos.x is number && request.resource.data.pos.x >= -10 && request.resource.data.pos.x <= 10
          && request.resource.data.pos.y is number && request.resource.data.pos.y >= -10 && request.resource.data.pos.y <= 10
          && request.resource.data.campo is string && request.resource.data.campo.size() <= 40;
      }
```

- [ ] **Paso 2: desplegar**

Correr el despliegue de las restricciones globales.
Esperado: `compiled successfully` y `Deploy complete!`. Es compatible con la versión publicada, que no escribe esta colección.

- [ ] **Paso 3: commit**

```bash
git add firestore.rules
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Reglas: respuestas de la brújula

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 4: el teléfono responde la brújula

**Archivos:**
- Modificar: `jugar.html`: cargar `brujula.js` antes del módulo, agregar `<div id="brujula" class="capa oculto"></div>` y su CSS.
- Modificar: `jugar.js`: la entrada, `pintarSala`, `pintarEspera` y las funciones nuevas `mostrarBrujula`, `guardarBrujula` y `cargarBrujula`.

**Interfaces:**
- Consume: `posicion`, `campoDe` y `mapaSvg` (Tarea 1). De la sala: `brujula: { activa, fase, ejes, preguntas, campos }`, `mapa` y `gruposInfo` (Tarea 5).
- Produce: `brujula/{uid}` con `{ uid, respuestas, pos, campo, t }`; al repetir, con merge de `{ repeticion: { respuestas, pos, campo, t } }`.

- [ ] **Paso 1: HTML y CSS**

En `jugar.html`, antes de `<script type="module" src="jugar.js…">`:

```html
<script src="brujula.js?v=20260924a"></script>
```

Después de `<div id="votar" class="capa oculto"></div>`:

```html
<!-- brújula corta: una pregunta por pantalla (al entrar y, si el profesor la repite, al cierre) -->
<div id="brujula" class="capa oculto"></div>
```

CSS, antes de `#ceremonia{position:fixed;`:

```css
#brujula{justify-content:flex-start;padding-top:28px}
.bj-prog{display:flex;gap:6px;margin-bottom:14px}.bj-prog i{width:34px;height:5px;border-radius:9px;background:var(--line)}.bj-prog i.on{background:var(--neon)}
.bj-q{font-size:16.5px;line-height:1.4;max-width:520px;text-align:left;margin-bottom:12px}
.bj-op{display:block;width:100%;max-width:520px;text-align:left;padding:13px 14px;margin:6px 0;border-radius:12px;border:1px solid var(--line);background:#141d26;color:var(--txt);font:inherit;font-size:14.5px;line-height:1.35;cursor:pointer}
.bj-op:active{background:#1b2733}
.bj-campo{font-size:28px;font-weight:800;margin:6px 0}
.mapa{width:min(78vw,320px);height:auto}
```

- [ ] **Paso 2: funciones de la brújula en `jugar.js`**

Agregar antes de `/* ---------- espera: portada e intro ---------- */`:

```js
/* ---------- brújula corta ----------
   Una pregunta por pantalla. Al terminar: el campo, la frase del campo y el mini-mapa con el punto
   propio. Se guarda en salas/{codigo}/brujula/{uid}; en la repetición del cierre, en «repeticion». */
const BJ = { respuestas: {}, i: 0, modo: "inicio", mio: null, cargada: false };
async function cargarBrujula() {
  if (BJ.cargada) return;
  BJ.cargada = true;
  const d = await getDoc(doc(db, "salas", J.codigo, "brujula", J.uid)).catch(() => null);
  if (d && d.exists()) BJ.mio = d.data();
}
function mostrarBrujula(modo = "inicio") {
  const b = J.sala && J.sala.brujula;
  if (!b || !b.preguntas) return;
  if (BJ.modo !== modo) { BJ.modo = modo; BJ.respuestas = {}; BJ.i = 0; }
  const el = $("brujula");
  el.classList.remove("oculto");
  const p = b.preguntas[BJ.i];
  el.innerHTML = `<div class="k">${modo === "repetir" ? "Brújula · otra vez, al final" : "Brújula · antes de debatir"}</div>
    <div class="bj-prog">${b.preguntas.map((_, k) => `<i class="${k <= BJ.i ? "on" : ""}"></i>`).join("")}</div>
    <div class="bj-q">${esc(p.texto)}</div>
    ${p.opciones.map((o, k) => `<button class="bj-op" data-k="${k}">${esc(o.texto)}</button>`).join("")}
    ${BJ.i > 0 ? `<button class="link" id="bjAtras">‹ volver</button>` : ""}`;
  el.onclick = e => {
    const op = e.target.closest(".bj-op");
    if (e.target.id === "bjAtras") { BJ.i--; mostrarBrujula(modo); return; }
    if (!op) return;
    BJ.respuestas[p.id] = +op.dataset.k;
    navigator.vibrate?.(20);
    if (BJ.i < b.preguntas.length - 1) { BJ.i++; mostrarBrujula(modo); } else guardarBrujula(modo);
  };
}
async function guardarBrujula(modo) {
  const b = J.sala.brujula;
  const pos = posicion(BJ.respuestas, b.preguntas);
  const campo = campoDe(pos, b.campos);
  const dato = { respuestas: { ...BJ.respuestas }, pos: { x: +pos.x.toFixed(2), y: +pos.y.toFixed(2) }, campo, t: Date.now() };
  try {
    if (modo === "repetir") await setDoc(doc(db, "salas", J.codigo, "brujula", J.uid), { uid: J.uid, ...BJ.mio, repeticion: dato }, { merge: true });
    else await setDoc(doc(db, "salas", J.codigo, "brujula", J.uid), { uid: J.uid, ...dato });
    BJ.mio = modo === "repetir" ? { ...BJ.mio, repeticion: dato } : { uid: J.uid, ...dato };
    $("brujula").classList.add("oculto");
    if (modo === "inicio" && !J.grupo) await entrarAlJuego();
    else pintarSala();
  } catch (e) { $("brujula").insertAdjacentHTML("beforeend", `<p class="aviso">No se guardó: ${esc(e.code)}</p>`); }
}
function resultadoBrujula(s) {
  const b = s.brujula, mio = BJ.mio;
  if (!b || !mio) return "";
  const c = b.campos.find(x => x.id === mio.campo) || {};
  return `<div class="k">Tu campo</div><div class="bj-campo" style="color:${c.color}">${esc(c.nombre || mio.campo)}</div>
    <p style="color:var(--dim);max-width:340px">${esc(c.afirma || "")}</p>
    ${mapaSvg({ puntos: [...(s.mapa || []).map(p => ({ ...p, color: (b.campos.find(x => x.id === p.campo) || {}).color || "#7d8fa1" })),
      { ...mio.pos, color: c.color || "#fff", yo: true }], campos: b.campos, ejes: b.ejes, tam: 320, chico: true })}`;
}
```

- [ ] **Paso 3: la entrada decide entre brújula y elección a mano**

En `$("btnEntrar").onclick`, reemplazar `mostrarBancadas();` (después del `setDoc` de alta) por:

```js
    if (J.sala.brujula && J.sala.brujula.activa) {
      await cargarBrujula();
      if (BJ.mio) await entrarAlJuego(); else mostrarBrujula("inicio");
    } else mostrarBancadas();
```

En `entrarAlJuego`, después de `prepararCaja();`, agregar `cargarBrujula().then(() => pintarSala());`.

- [ ] **Paso 4: la brújula en `pintarSala` y en la espera**

En `pintarSala`, antes de `pintarEspera(s);`:

```js
  // brújula: la repetición del cierre; y si el profesor la apaga, quien no tiene grupo elige a mano
  const bj = s.brujula;
  if (bj && bj.activa && bj.fase === "repetir" && BJ.mio && !BJ.mio.repeticion && $("brujula").classList.contains("oculto")) mostrarBrujula("repetir");
  if (!J.grupo && s.etapa === "portada" && !(bj && bj.activa) && $("pBancada").classList.contains("oculto")) { mostrarBancadas(); return; }
```

En `pintarEspera`, dentro de la rama `s.etapa === "portada"`, antes del contenido actual:

```js
  if (!J.grupo && s.brujula && s.brujula.activa) {
    const clave2 = "bj|" + (BJ.mio ? BJ.mio.campo : "") + "|" + (s.mapa || []).length + "|" + s.brujula.fase;
    if (el.dataset.clave === clave2) return;
    el.dataset.clave = clave2;
    el.innerHTML = BJ.mio ? resultadoBrujula(s) + `<p style="color:var(--dim)">Espera: el profesor va a formar los grupos.</p>
        ${s.brujula.fase === "responder" ? `<button class="link" id="bjRehacer">rehacer la brújula</button>` : ""}`
      : `<h1>Falta tu brújula</h1><button class="btn pri" id="bjHacer">Responder (1 minuto)</button>`;
    const r = $("bjRehacer") || $("bjHacer");
    if (r) r.onclick = () => { BJ.modo = ""; mostrarBrujula("inicio"); };
    return;
  }
```

La clave del `dataset` evita repintar en cada cambio de la sala. Ya existe un `el.dataset.clave` para la espera normal; este usa el prefijo `bj|` para no chocar con él.

En el texto de «¡Estás dentro!» de la misma rama, mostrar el nombre del campo del grupo cuando exista `s.gruposInfo`:

```js
  const gi = (s.gruposInfo || []).find(g => g.n === J.grupo);
```

y usar `${esc(r.nombre)}${gi ? " · " + esc(gi.nombre) : ""}` en la ficha del rol.

- [ ] **Paso 5: sintaxis**

Copiar `jugar.js` a `/tmp/chk/jugar.mjs` y correr `node --check`.
Esperado: sin salida.

- [ ] **Paso 6: commit**

```bash
git add jugar.js jugar.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Teléfono: brújula corta, campo con mini-mapa, repetición al cierre y elección a mano si está apagada

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 5: el profesor publica la brújula y forma los grupos

**Archivos:**
- Modificar: `online.js`: estado público, suscripción a `brujula`, formación de grupos, asignación de rezagados y estado privado.
- Modificar: `index.html`: cargar `brujula.js` antes de `app.js`.

**Interfaces:**
- Consume: `formarGrupos`, `asignarTarde` y `movimiento` (Tarea 1); `BRUJULA` (Tarea 2).
- Produce:
  - `S.clase.brujula = { activa: bool, fase: "responder"|"grupos"|"repetir"|null }` y `S.clase.gruposInfo = [{ n, campo, nombre, pos, tam }]`.
  - `window.formarGruposBrujula() → Promise<{ ok, motivo? }>`
  - `window.repetirBrujula()`
  - `window.cerrarRepeticion()`
  - `window.datosMapa() → { puntos, movimiento }`
  - Campos públicos: `brujula` (definición y fase, solo con `activa`), `mapa: [{x, y, campo}]`, `mapaMov: [{x, y, dx, dy, campo}]`, `campos: [{id, nombre, color, n}]` y `gruposInfo`.

- [ ] **Paso 1: cargar `brujula.js` en `index.html`**

Después de `<script src="rotacion.js?v=…"></script>`: `<script src="brujula.js?v=20260924a"></script>`.

- [ ] **Paso 2: estado inicial**

En `crearSala()`, después de `S.clase = {…}`:

```js
  S.clase.brujula = { activa: typeof BRUJULA !== "undefined", fase: typeof BRUJULA !== "undefined" ? "responder" : null };
  S.clase.gruposInfo = [];
```

- [ ] **Paso 3: suscripción, mapa y grupos** (dentro de `activarOnline`, después de la suscripción a `feedback`)

```js
  // Brújula: las respuestas de cada alumno. De aquí salen el mapa anónimo y los grupos.
  ON.brujula = {};
  onSnapshot(collection(db, "salas", ON.codigo, "brujula"), snap => {
    ON.brujula = {};
    snap.forEach(d => ON.brujula[d.id] = d.data());
    asignarRezagados();
    if (typeof actualizarMapaPortada === "function") actualizarMapaPortada();
    publicar();
  }, () => {});
```

Fuera de `activarOnline`:

```js
/* ---------- brújula: mapa, grupos y rezagados ---------- */
const barajar = xs => xs.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
window.datosMapa = () => {
  const r = Object.values(ON.brujula || {}).filter(b => b.pos);
  return {
    puntos: r.map(b => ({ x: b.pos.x, y: b.pos.y, campo: b.campo })),
    movimiento: r.filter(b => b.repeticion && b.repeticion.pos).map(b => ({ x: b.repeticion.pos.x, y: b.repeticion.pos.y, desde: b.pos, campo: b.repeticion.campo }))
  };
};
window.formarGruposBrujula = async () => {
  const alumnos = Object.entries(ON.brujula).filter(([uid, b]) => b.pos && ON.jugadores[uid]).map(([uid, b]) => ({ uid, pos: b.pos, campo: b.campo }));
  if (alumnos.length < 2) return { ok: false, motivo: "Faltan alumnos: se necesitan al menos 2 con la brújula respondida." };
  const { grupos, de } = formarGrupos(alumnos, BRUJULA.campos);
  S.clase.gruposInfo = grupos.map(g => ({ n: g.n, campo: g.campo, nombre: (BRUJULA.campos.find(c => c.id === g.campo) || {}).nombre || g.campo,
                                          pos: { x: +g.pos.x.toFixed(2), y: +g.pos.y.toFixed(2) }, tam: g.miembros.length }));
  S.clase.grupos = grupos.length;
  S.clase.brujula.fase = "grupos";
  await Promise.all(Object.entries(de).map(([uid, n]) => window.moverAlumno(uid, n)));
  asignarRezagados();                                    // quienes no terminaron la brújula
  publicar();
  return { ok: true };
};
function asignarRezagados() {
  if (!S.clase.brujula || S.clase.brujula.fase !== "grupos" || !(S.clase.gruposInfo || []).length) return;
  for (const [uid, j] of Object.entries(ON.jugadores)) {
    if (j.grupo > 0 || ON.asignando?.[uid]) continue;
    const b = ON.brujula[uid];
    const n = asignarTarde(b && b.pos, b && b.campo, S.clase.gruposInfo);
    if (!n) continue;
    (ON.asignando = ON.asignando || {})[uid] = true;
    S.clase.gruposInfo.find(g => g.n === n).tam++;
    window.moverAlumno(uid, n);
  }
}
window.repetirBrujula = () => { S.clase.brujula.fase = "repetir"; publicar(); };
window.cerrarRepeticion = () => { S.clase.brujula.fase = "cerrada"; publicar(); };
```

En la suscripción a `jugadores`, después de `ON.jugadores[d.id] = …`, llamar a `asignarRezagados();`.

- [ ] **Paso 4: estado público y privado**

En `estadoPublico()`, agregar:

```js
    brujula: S.clase.brujula && S.clase.brujula.activa && typeof BRUJULA !== "undefined"
      ? { activa: true, fase: S.clase.brujula.fase, ejes: BRUJULA.ejes,
          preguntas: BRUJULA.preguntas.map(p => ({ id: p.id, texto: p.texto, opciones: p.opciones.map(o => ({ texto: o.texto, ...(typeof o.x === "number" ? { x: o.x } : {}), ...(typeof o.y === "number" ? { y: o.y } : {}) })) })),
          campos: BRUJULA.campos }
      : { activa: false, fase: null },
    mapa: S.clase.brujula && S.clase.brujula.activa ? barajar(window.datosMapa().puntos.map(p => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2), campo: p.campo }))) : [],
    mapaMov: S.clase.brujula && S.clase.brujula.activa ? barajar(window.datosMapa().movimiento.map(m => ({ x: m.x, y: m.y, dx: m.desde.x, dy: m.desde.y, campo: m.campo }))) : [],
    gruposInfo: S.clase.gruposInfo || [],
```

`estadoPrivado` ya guarda `S.clase` completo, que incluye `brujula` y `gruposInfo`.

- [ ] **Paso 5: sintaxis y commit**

Copiar `online.js` a `/tmp/chk/online.mjs` y correr `node --check`.

```bash
git add online.js index.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Online: brújula publicada, mapa anónimo, formar grupos y asignar rezagados

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 6: la portada con mapa, el interruptor y FORMAR GRUPOS

**Archivos:**
- Modificar: `escenas.js`: `mostrarPortada`, `actualizarPortada` y la función nueva `actualizarMapaPortada`.
- Modificar: `index.html`: CSS del mapa en la portada.

**Interfaces:**
- Consume: `window.datosMapa`, `window.formarGruposBrujula` (Tarea 5) y `mapaSvg` (Tarea 1).
- Produce: `actualizarMapaPortada()`.

- [ ] **Paso 1: el interruptor**

En `mostrarPortada`, dentro de `.po-cfg`, después del selector de grupos:

```js
          ${typeof BRUJULA !== "undefined" ? `<label class="po-sw"><input type="checkbox" id="poBrujula" ${S.clase.brujula && S.clase.brujula.activa ? "checked" : ""}> Usar brújula</label>` : ""}
```

Al final de la función:

```js
  if ($("poBrujula")) $("poBrujula").onchange = e => {
    S.clase.brujula = { activa: e.target.checked, fase: e.target.checked ? "responder" : null };
    S.clase.gruposInfo = [];
    window.publicarEstado?.();
    actualizarPortada(window.jugadoresSala?.() || {});
  };
```

El selector de número de grupos se esconde cuando la brújula está activa y todavía no forma grupos, porque el número lo decide el algoritmo. En `actualizarPortada`, al inicio:

```js
  const conBrujula = S.clase.brujula && S.clase.brujula.activa && S.clase.brujula.fase === "responder";
  if ($("poGrupos")) $("poGrupos").closest("label").style.display = conBrujula ? "none" : "";
  if (conBrujula) { actualizarMapaPortada(); return; }
```

- [ ] **Paso 2: el mapa y FORMAR GRUPOS**

```js
function actualizarMapaPortada() {
  const g = $("poGente");
  if (!g || !S.clase.brujula || !S.clase.brujula.activa || S.clase.brujula.fase !== "responder") return;
  const { puntos } = window.datosMapa ? window.datosMapa() : { puntos: [] };
  const color = id => (BRUJULA.campos.find(c => c.id === id) || {}).color || "#7d8fa1";
  const n = Object.keys(window.jugadoresSala ? window.jugadoresSala() : {}).length;
  $("poCuenta").innerHTML = `<b>${puntos.length}</b> de ${n} respondieron la brújula
    ${BRUJULA.campos.map(c => `<span style="color:${c.color}">● ${escHtml(c.nombre)} ${puntos.filter(p => p.campo === c.id).length}</span>`).join("")}`;
  g.innerHTML = `<div class="po-mapa">${mapaSvg({ puntos: puntos.map(p => ({ ...p, color: color(p.campo) })), campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 460 })}
    <div class="po-formar"><button class="btn pri" id="poFormar">FORMAR GRUPOS</button><div class="aviso" id="poFormarAviso"></div></div></div>`;
  $("poFormar").onclick = async () => {
    const r = await window.formarGruposBrujula();
    if (!r.ok) { $("poFormarAviso").textContent = r.motivo; return; }
    sonar("fanfarria");
    actualizarPortada(window.jugadoresSala());
  };
}
```

Con los grupos ya formados, las columnas de `actualizarPortada` rotulan cada grupo con su campo:

```js
    `<div class="po-gk">GRUPO ${k}${(S.clase.gruposInfo || []).find(x => x.n === k) ? ` · ${escHtml(S.clase.gruposInfo.find(x => x.n === k).nombre)}` : ""} <span>…`
```

En la línea existente que arma `po-gk`, agregar ese sufijo después de `GRUPO ${k}`.

- [ ] **Paso 3: CSS**

```css
.po-sw{display:flex;gap:8px;align-items:center;color:var(--txt);font-size:15px;margin-top:22px}
.po-mapa{display:flex;gap:26px;align-items:center;width:100%}
.po-mapa .mapa{width:min(52vh,460px)}
.po-mapa .pt{animation:llega .6s cubic-bezier(.2,1.6,.4,1)}
.po-formar{display:flex;flex-direction:column;gap:10px}
```

- [ ] **Paso 4: sintaxis y commit**

Correr `node --check escenas.js`.

```bash
git add escenas.js index.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Portada: interruptor de brújula, mapa en vivo y FORMAR GRUPOS

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

- [ ] **Paso 5: semana sin brújula (foco de revisión 5)**

En <http://localhost:8777/?semana=5>, en la consola:

```js
mostrarPortada("x", "TEST", () => {}); !!document.getElementById("poBrujula")
```

Esperado: `false`. Además, las columnas de grupos se ven como hoy.

---

### Tarea 7: emparejamiento por distancia, moción con los campos e intercambio de lados

**Archivos:**
- Modificar: `clase.js`: `prepararPropuesta`, `promptPropuesta` y `mostrarPropuesta`; agregar `nombreGrupo`.
- Modificar: `app.js`: `pintarMarcador`, para el nombre del campo en el lema.

**Interfaces:**
- Consume: `emparejarLejanos` (Tarea 1); `S.clase.gruposInfo` y `S.clase.brujula` (Tarea 5).
- Produce: `nombreGrupo(n) → "Grupo n · Campo"` o `"Grupo n"`.

- [ ] **Paso 1: emparejar y nombrar**

En `clase.js`:

```js
// «Grupo 2 · Frenar por ley» si la partida formó grupos con la brújula; si no, «Grupo 2».
function nombreGrupo(n) {
  const g = (S.clase.gruposInfo || []).find(x => x.n === n);
  return g ? `Grupo ${n} · ${g.nombre}` : `Grupo ${n}`;
}
const conBrujula = () => (S.clase.gruposInfo || []).length > 0;
```

En `prepararPropuesta`, reemplazar `const par = emparejar(gruposDisponibles(), S.clase.debates);` por:

```js
  const posDe = Object.fromEntries((S.clase.gruposInfo || []).map(g => [g.n, g.pos]));
  const par = conBrujula() ? emparejarLejanos(gruposDisponibles(), S.clase.debates, posDe) : emparejar(gruposDisponibles(), S.clase.debates);
```

- [ ] **Paso 2: la moción sobre lo que separa a los dos grupos**

`promptPropuesta` recibe el par: cambiar su firma a `function promptPropuesta(par)` y la llamada a `pedirLLM(promptPropuesta(par), "jurado")`. Antes de `TU TAREA:` agregar:

```js
${conBrujula() && par ? (() => {
  const g = n => S.clase.gruposInfo.find(x => x.n === n), c = n => (typeof BRUJULA !== "undefined" ? BRUJULA.campos.find(x => x.id === g(n).campo) : null) || {};
  return `LOS DOS GRUPOS QUE DEBATEN AHORA (se formaron por su posición real):
- Grupo ${par.A}, campo «${g(par.A).nombre}»: ${c(par.A).afirma || ""}
- Grupo ${par.B}, campo «${g(par.B).nombre}»: ${c(par.B).afirma || ""}
La moción tiene que caer justo sobre lo que separa a esos dos campos: debe AFIRMAR la posición de uno de los dos grupos, de modo que el otro la rechace desde la suya. Nadie debe quedar defendiendo algo que no piensa.
`; })() : ""}
```

La línea del JSON pasa a pedir `"afirma": número del grupo cuya posición afirma la moción` cuando hay brújula:

```js
Responde SOLO un JSON: {"pregunta": "…", "porQue": "…", "mejorFavor": "…", "mejorContra": "…"${conBrujula() ? ', "afirma": número del grupo que la moción afirma' : ""}}
```

Después de leer el JSON, antes de armar `S.clase.propuesta`:

```js
    let A = base.A, B = base.B;
    if (conBrujula() && +j.afirma === base.B) { A = base.B; B = base.A; }   // el grupo que la moción afirma defiende A FAVOR
```

`S.clase.propuesta` usa esos `A` y `B` en lugar de `base.A` y `base.B`. Si `afirma` no viene o no coincide con ninguno de los dos, queda el orden del emparejamiento (foco de revisión 4).

- [ ] **Paso 3: panel con nombres de grupo e intercambio de lados**

En `mostrarPropuesta`, el selector usa `nombreGrupo(g)` como texto de cada opción, en lugar de `Grupo ${g}`. Después de los dos selectores:

```js
<button class="btn sm" id="prCambiar" title="Intercambiar A FAVOR y EN CONTRA">⇄ lados</button>
```

Y en los manejadores:

```js
  $("prCambiar").onclick = () => { const a = $("prA").value; $("prA").value = $("prB").value; $("prB").value = a; };
```

En `pintarMarcador` (`app.js`), el lema del marcador pasa a ser `${EQUIPOS[k].nombre}${S.clase.gruposInfo && S.clase.gruposInfo.length ? " · " + ((S.clase.gruposInfo.find(g => g.n === S.debate[k]) || {}).nombre || "") : ""}` cuando hay debate.

- [ ] **Paso 4: probar en el navegador sin motor**

En <http://localhost:8777/?semana=7>, en la consola:

```js
S.motor.activo = false;
S.clase.gruposInfo = [{ n: 1, campo: "ley", nombre: "Frenar por ley", pos: { x: -6, y: 5 }, tam: 4 },
  { n: 2, campo: "adentro", nombre: "Frenar desde adentro", pos: { x: -5, y: -4 }, tam: 4 },
  { n: 3, campo: "nada", nombre: "Ni freno ni ley", pos: { x: 6, y: -5 }, tam: 4 }];
window.gruposConectados = () => [1, 2, 3];
S.fase = "propuesta"; S.clase.propuesta = null; mostrarPropuesta();
await new Promise(r => setTimeout(r, 300));
const par = [document.getElementById("prA").value, document.getElementById("prB").value];
document.getElementById("prCambiar").click();
const cambiado = [document.getElementById("prA").value, document.getElementById("prB").value];
JSON.stringify({ par, cambiado, opcion: document.getElementById("prA").selectedOptions[0].textContent })
```

Esperado: `par` es `["1","3"]`, porque el par más lejano es 1 contra 3 (distancia 15,6). `cambiado` es `["3","1"]` y `opcion` es `"Grupo 3 · Ni freno ni ley"`. Borrar `window.gruposConectados` al terminar.

- [ ] **Paso 5: commit**

```bash
git add clase.js app.js
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Debates por distancia: el par más lejano, moción sobre lo que los separa, lados intercambiables

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 8: la repetición al cierre, el panel y el README

**Archivos:**
- Modificar: `index.html`: el botón `btnRepetir` en `.acciones`.
- Modificar: `escenas.js`: la función nueva `mostrarMovimiento()`.
- Modificar: `clase.js`: el manejador del botón.
- Modificar: `admin.js`: el mapa en el detalle.
- Modificar: `README.md`.

**Interfaces:**
- Consume: `window.repetirBrujula`, `window.cerrarRepeticion`, `window.datosMapa` (Tarea 5) y `mapaSvg` (Tarea 1).

- [ ] **Paso 1: botón y escena**

En `index.html`, antes de `btnTerminar`:

```html
        <button class="btn sm" id="btnRepetir" title="Los alumnos responden la brújula otra vez; el proyector muestra cuánto se movió cada uno" style="display:none">🧭 REPETIR BRÚJULA</button>
```

En `escenas.js`:

```js
// El cierre opcional: la brújula otra vez y una flecha por alumno, desde su punto inicial al final.
function mostrarMovimiento() {
  const el = escena("movimiento");
  const pintar = () => {
    const { puntos, movimiento } = window.datosMapa();
    const color = id => (BRUJULA.campos.find(c => c.id === id) || {}).color || "#7d8fa1";
    const cuenta = (xs, id) => xs.filter(p => p.campo === id).length;
    const final = movimiento.map(m => ({ campo: m.campo }));
    el.innerHTML = `<div class="es-k">LA BRÚJULA, OTRA VEZ · ${movimiento.length} de ${puntos.length} respondieron</div>
      <div class="po-mapa" style="justify-content:center">${mapaSvg({ puntos: movimiento.map(m => ({ x: m.x, y: m.y, desde: m.desde, color: color(m.campo) })), campos: BRUJULA.campos, ejes: BRUJULA.ejes, tam: 520 })}
        <div class="rs-or">${BRUJULA.campos.map(c => `<div><b style="color:${c.color}">${escHtml(c.nombre)}</b><i>${cuenta(puntos, c.id)} → ${cuenta(final, c.id)}</i></div>`).join("")}</div></div>`;
  };
  pintar();
  ESC.refresco = setInterval(() => { if (!$("escena") || !$("escena").classList.contains("movimiento")) return clearInterval(ESC.refresco); pintar(); }, 1500);
  botonEscena("LISTO ▶");
}
```

- [ ] **Paso 2: manejador en `clase.js`**

```js
function actualizarBotonRepetir() {
  const b = $("btnRepetir");
  if (b) b.style.display = S.clase.gruposInfo && S.clase.gruposInfo.length && S.fase !== "fin" ? "" : "none";
}
$("btnRepetir").onclick = () => {
  if (S.fase === "abierta" || S.fase === "votando") { tick("Termina el debate en curso antes de repetir la brújula."); return; }
  window.repetirBrujula?.();
  mostrarMovimiento();
};
```

Llamar a `actualizarBotonRepetir()` al final de `pintarMarcador` (vía `pintarColumna`) para que se vea cuando existan grupos por brújula.

En `accionPrincipal`, al inicio: `if ($("escena") && $("escena").classList.contains("movimiento")) { window.cerrarRepeticion?.(); cerrarEscena(); return; }`.

- [ ] **Paso 3: panel**

En `admin.js`, en `partidaHtml` y dentro de `rotHtml`, antes de `<h3>RANKING</h3>`:

```js
      ${(s.mapa || []).length && s.brujula && s.brujula.campos ? `<h3>LA BRÚJULA</h3><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">
        ${mapaSvg({ puntos: (s.mapaMov || []).length ? s.mapaMov.map(m => ({ x: m.x, y: m.y, desde: { x: m.dx, y: m.dy }, color: (s.brujula.campos.find(c => c.id === m.campo) || {}).color || "#7d8fa1" }))
                     : s.mapa.map(p => ({ ...p, color: (s.brujula.campos.find(c => c.id === p.campo) || {}).color || "#7d8fa1" })), campos: s.brujula.campos, ejes: s.brujula.ejes, tam: 300 })}
        <div>${(s.gruposInfo || []).map(g => `<div>Grupo ${g.n} · ${esc(g.nombre)} (${g.tam})</div>`).join("")}</div></div>` : ""}
```

`admin.html` carga `brujula.js` antes del módulo: `<script src="brujula.js?v=20260924a"></script>`.

La sala guarda `brujula` con `activa: false` al cerrar si el profesor apagó la brújula. El panel muestra el mapa solo si hay puntos y definición.

- [ ] **Paso 4: README**

Agregar al `README.md`, antes de «## Pantalla del profesor»:

```markdown
## La brújula corta (opcional)

Si la semana define `BRUJULA` (5 preguntas, dos ejes y los campos), la portada trae el
interruptor **Usar brújula**. Encendido, cada alumno responde la brújula en su teléfono en cerca de
un minuto y queda en un campo; el proyector muestra el mapa anónimo de la clase, y **FORMAR
GRUPOS** convierte cada campo en uno o más grupos de hasta 5 (los campos de 1 o 2 personas se
suman al grupo más cercano). En cada debate la moderadora elige los dos grupos más lejanos entre
los que menos han debatido y escribe la moción sobre lo que los separa: el grupo cuya posición
afirma queda A FAVOR (el profesor puede intercambiar los lados). Al final, **🧭 REPETIR BRÚJULA**
muestra una flecha por alumno con cuánto se movió. Apagada, los alumnos eligen grupo a mano.
La lógica está en `brujula.js` y se prueba con `node --test pruebas/`.
```

- [ ] **Paso 5: sintaxis, pruebas y commit**

```bash
git add index.html escenas.js clase.js admin.js admin.html README.md
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Repetir la brújula al cierre con el movimiento de cada punto; mapa en el panel; README

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 9: prueba en línea

**Archivos:** ninguno. Los errores se corrigen en la tarea dueña del código.

- [ ] **Paso 1: sala con brújula**

En <http://localhost:8777/?semana=7>, en Chrome con sesión, crear una sala.
Esperado: la portada muestra «Usar brújula» encendido y el mapa vacío con los cuatro campos rotulados.

- [ ] **Paso 2: el alumno responde**

En otra pestaña, abrir `jugar.html?sala=CODIGO` y responder las 5 preguntas.
Esperado:
- El teléfono muestra el campo con su mini-mapa y «Espera: el profesor va a formar los grupos».
- En el proyector aparece un punto y «1 de 1 respondieron».

- [ ] **Paso 3: apagar y encender (foco de revisión 3)**

Apagar «Usar brújula».
Esperado: el teléfono pasa a los botones «Grupo 1…N».

Encenderla de nuevo.
Esperado: el teléfono vuelve a mostrar su campo, porque la respuesta sigue guardada.

- [ ] **Paso 4: formar grupos**

Con un solo alumno, apretar FORMAR GRUPOS.
Esperado: «Faltan alumnos: se necesitan al menos 2…».

Con varios alumnos: hace falta una segunda cuenta (naim.bro@imfd.cl), porque las reglas no dejan escribir `brujula/{uid}` ni `jugadores/{uid}` de otro. Si está disponible, responderla desde una ventana de incógnito en el campo opuesto y apretar FORMAR GRUPOS.
Esperado: 2 grupos, cada columna rotulada con su campo, y cada teléfono muestra «Estás dentro · Grupo N · Campo».

Si no está disponible, anotar en el ledger: `Ruling: formación con varios alumnos cubierta solo por las pruebas de formarGrupos`.

- [ ] **Paso 5: rezagados (foco de revisión 2)**

Con grupos formados, en una pestaña nueva de alumno sin grupo (misma cuenta con el `grupo` puesto en 0 desde el panel, o una segunda cuenta), responder la brújula.
Esperado: en segundos queda asignado a un grupo, y el teléfono muestra «Estás dentro · Grupo N · Campo».

- [ ] **Paso 6: debate y repetición**

Pasar la intro y verificar que la propuesta muestra nombres de grupo con campo y el botón «⇄ lados». Al terminar un debate, apretar «🧭 REPETIR BRÚJULA».
Esperado:
- El teléfono muestra la brújula otra vez.
- Al responderla, el proyector dibuja la flecha y el conteo «antes → después» por campo.
- «LISTO ▶» vuelve a la clase.

- [ ] **Paso 7: cierre**

Terminar la clase, revisar el panel con el mapa y los grupos, y archivar la sala de prueba.
