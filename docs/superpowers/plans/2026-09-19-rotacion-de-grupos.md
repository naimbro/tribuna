# Rotación de grupos — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** convertir una sala de TRIBUNA en una clase con debates cortos sucesivos entre grupos fijos. La moderadora de IA propone las preguntas, el profesor tiene control sobre ellas y la clase termina con un ranking de grupos.

**Arquitectura:**
- **Lógica pura en un archivo nuevo:** `rotacion.js` contiene el emparejamiento, el puntaje y el ranking, sin DOM ni Firestore, y se prueba con Node.
- **Orquestación en otro archivo nuevo:** `clase.js` conduce el ciclo propuesta → apertura → réplica → votación → resultado.
- **El motor actual sigue en su lugar:** `app.js` conserva el jurado, el reloj y el marcador, pero trabaja por debate.
- **Tres índices de avance:**
  - `S.ronda` pasa a ser un contador global de tramos de toda la clase, así los filtros actuales de la conversación (`m.ronda === S.ronda`) siguen funcionando.
  - `S.tramo` vale 0 (apertura) o 1 (réplica).
  - `S.debate.n` numera los debates.

**Tecnologías:** JavaScript sin paso de compilación, servido por GitHub Pages; Firebase Auth y Firestore (SDK web 12.9.0 desde gstatic); Cloud Function `evaluar` para el LLM; Node 20 en WSL para las pruebas (`node:test`).

**Spec:** `docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md`

## Restricciones globales

- **Repositorio:** `C:\Users\naim.bro.k\claude_projects\games\tribuna`, rama `main`. Se despliega en GitHub Pages al hacer push.
- **Caché:** cada `<script>` lleva `?v=`. Cambiar la versión de todo archivo tocado a `20260921` más una letra que aumente (`20260921a`, `b`…).
- **Commits:** `git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit` y el mensaje termina con `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Pruebas de Node:** corren en WSL:
  `wsl.exe -e bash -lc "source ~/.nvm/nvm.sh >/dev/null; cd /mnt/c/Users/naim.bro.k/claude_projects/games/tribuna && node --test pruebas/"`
- **Reglas de Firestore:** se despliegan desde una copia en `/tmp` de WSL: `firebase.json`, `.firebaserc` y `firestore.rules` a `/tmp/tribuna_rules`, y ahí `npx -y firebase-tools@latest deploy --only firestore:rules --project tribuna-csc00155`.
- **Tiempos**, en `ROT` de `rotacion.js`: apertura 180 s, réplica 180 s, votación 60 s, resultado 10 s, cuenta regresiva de la propuesta 15 s.
- **Puntaje:** `jurado = promedio /20 × 5`; `público = votos del lado / (votos A + votos B) × 100`, con 50 si nadie se movió; `puntaje = 0,5 × jurado + 0,5 × público`, o solo el jurado si no hubo votantes. Voto suave: `tanh(|pos| / 12)`; ±8 es indeciso.
- **Empates:** jurado bajo 0,05 puntos de diferencia; público bajo 0,5 votos.
- **La moderadora nunca sugiere a los alumnos conceptos, autores ni lecturas que no hayan mencionado.** El «por qué ahora» y los mejores argumentos de la propuesta se muestran solo al profesor.
- **Textos en español de Chile.** Los rótulos visibles nombran lo que la persona controla («Publicar», «Pedir otra», «Escribir la mía»).
- **Sin audiencia sintética en el juego.** `AUDIENCIA` y su motor quedan solo para `pruebas/simular.js`.

## Foco de revisión

1. **Alumno que llega tarde a un grupo que está debatiendo:** tiene que poder escribir de inmediato. Lo prueba la Tarea 11, paso 4.
2. **La pestaña del profesor se cierra a mitad de un debate:** al volver, el debate, el tramo, el ranking y la pregunta siguen ahí, y el tramo se reanuda con un clic. Lo prueba la Tarea 11, paso 6.
3. **Menos de dos grupos con gente conectada:** la propuesta dice «faltan grupos con alumnos conectados» y no se publica nada. Lo prueban la Tarea 1 (`emparejar` devuelve `null`) y la Tarea 5, paso 5.
4. **Debate sin votantes, o donde nadie mueve el deslizador:** el puntaje usa solo el jurado, o 50 y 50 de público. Lo prueba la Tarea 1 (`puntajeDebate`).
5. **Un alumno intenta escribir sin que su grupo esté debatiendo, o votar en su propio debate:** el servidor lo rechaza aunque la pantalla falle. Lo prueba la Tarea 11, paso 5.

---

### Tarea 1: `rotacion.js`, la lógica pura

**Archivos:**
- Crear: `rotacion.js`
- Crear: `pruebas/rotacion.test.js`

**Interfaces:**
- Consume: nada.
- Produce (globales en el navegador y `module.exports` en Node):
  - `ROT`: `{ SEG_APERTURA:180, SEG_REPLICA:180, SEG_VOTACION:60, SEG_RESULTADO:10, SEG_PROPUESTA:15, GRUPOS_DEFECTO:6, GRUPOS_MIN:2, GRUPOS_MAX:10, INDECISO:8, ESCALA:12, EMPATE_VOTOS:0.5, EMPATE_JURADO:0.05 }`
  - `TRAMOS`: `[{id:"apertura", nombre:"Apertura", seg, rol, pauta}, {id:"refutacion", nombre:"Réplica", seg, rol, pauta}]`
  - `emparejar(disponibles:number[], debates:{A:number,B:number}[]) → {A:number,B:number} | null`
  - `votosSuaves(posiciones:number[]) → {A:number, B:number, n:number}`
  - `puntajeDebate({notasA:number[], notasB:number[], posiciones:number[]}) → {A:{jurado,publico,puntaje}, B:{jurado,publico,puntaje}, ganadorJurado:"A"|"B"|null, ganadorPublico:"A"|"B"|null, ganador:"A"|"B"|null, votos:{A,B,n}, hayPublico:boolean}`. `publico` es `null` si no hubo votantes.
  - `ranking(grupos:number, debates:{A:number,B:number,res:object|null}[]) → [{grupo, debates, jurado, publico, puntaje, puesto, distincion}]`. `distincion` es `null`, `"jurado"`, `"publico"` o `"ambos"`.
  - `proximaPreguntaEscrita(preguntas:string[], usadas:string[]) → string | null`
  - `mejorIntervencion(historial:{autor:string, grupo:number, debate:number, total:number}[]) → misma forma | null`

- [ ] **Paso 1: escribir las pruebas que fallan**

`pruebas/rotacion.test.js`:

```js
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

test("votosSuaves: indecisos no suman, convencidos suman casi 1", () => {
  const v = R.votosSuaves([0, 5, -8, 100, -100, 30]);
  assert.equal(v.n, 6);
  assert.ok(Math.abs(v.A - (Math.tanh(100 / 12) + Math.tanh(30 / 12))) < 1e-9);
  assert.ok(Math.abs(v.B - Math.tanh(100 / 12)) < 1e-9);
});

test("puntajeDebate: sin votantes cuenta solo el jurado", () => {
  const r = R.puntajeDebate({ notasA: [16, 14], notasB: [10], posiciones: [] });
  assert.equal(r.hayPublico, false);
  assert.equal(r.A.publico, null);
  assert.equal(r.A.puntaje, 75);
  assert.equal(r.B.puntaje, 50);
  assert.equal(r.ganador, "A");
});

test("puntajeDebate: público que no se mueve da 50 y 50", () => {
  const r = R.puntajeDebate({ notasA: [10], notasB: [10], posiciones: [0, 3, -2] });
  assert.equal(r.hayPublico, true);
  assert.equal(r.A.publico, 50);
  assert.equal(r.B.publico, 50);
  assert.equal(r.ganador, null);
});

test("puntajeDebate: grupo que no escribe saca 0 de jurado", () => {
  const r = R.puntajeDebate({ notasA: [], notasB: [12], posiciones: [60, 60] });
  assert.equal(r.A.jurado, 0);
  assert.equal(r.A.puntaje, 50);          // 0,5×0 + 0,5×100
  assert.equal(r.B.puntaje, 30);          // 0,5×60 + 0,5×0
});

test("puntajeDebate: jurado y público en desacuerdo es empate", () => {
  const r = R.puntajeDebate({ notasA: [18], notasB: [8], posiciones: [-90, -90, -90] });
  assert.equal(r.ganadorJurado, "A");
  assert.equal(r.ganadorPublico, "B");
  assert.equal(r.ganador, null);
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

test("proximaPreguntaEscrita: devuelve la primera no usada", () => {
  assert.equal(R.proximaPreguntaEscrita(["a", "b"], ["a"]), "b");
  assert.equal(R.proximaPreguntaEscrita(["a"], ["a"]), null);
  assert.equal(R.proximaPreguntaEscrita(undefined, []), null);
});

test("mejorIntervencion: la nota más alta", () => {
  const m = R.mejorIntervencion([{ autor: "x", grupo: 1, debate: 1, total: 12 }, { autor: "y", grupo: 2, debate: 1, total: 17 }]);
  assert.equal(m.autor, "y");
  assert.equal(R.mejorIntervencion([]), null);
});
```

- [ ] **Paso 2: correr las pruebas y confirmar que fallan**

Correr: `wsl.exe -e bash -lc "source ~/.nvm/nvm.sh >/dev/null; cd /mnt/c/Users/naim.bro.k/claude_projects/games/tribuna && node --test pruebas/"`
Esperado: FALLA con «Cannot find module '../rotacion.js'».

- [ ] **Paso 3: escribir `rotacion.js`**

```js
/* =====================================================================
   TRIBUNA — rotación de grupos: la lógica pura (sin DOM ni Firestore).
   Quién debate con quién, cuánto sacó cada grupo en un debate y el ranking de la clase.
   Se carga en el navegador como script clásico (globales) y en Node con require()
   para las pruebas (pruebas/rotacion.test.js).
   Spec: docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md
   ===================================================================== */

const ROT = {
  SEG_APERTURA: 180, SEG_REPLICA: 180, SEG_VOTACION: 60, SEG_RESULTADO: 10, SEG_PROPUESTA: 15,
  GRUPOS_DEFECTO: 6, GRUPOS_MIN: 2, GRUPOS_MAX: 10,
  INDECISO: 8,          // |pos| ≤ 8 es indeciso y no suma votos
  ESCALA: 12,           // voto suave: tanh(|pos| / 12)
  EMPATE_VOTOS: 0.5,    // el público empata bajo medio voto de diferencia
  EMPATE_JURADO: 0.05   // el jurado empata bajo 0,05 puntos (de 20) de diferencia
};

// Los dos tramos de cada debate. "refutacion" es el id que el jurado ya conoce para la réplica.
const TRAMOS = [
  { id: "apertura", nombre: "Apertura", seg: ROT.SEG_APERTURA, rol: "Apertura",
    pauta: "Tesis y argumentos principales. Toda afirmación empírica requiere atribución a la bibliografía." },
  { id: "refutacion", nombre: "Réplica", seg: ROT.SEG_REPLICA, rol: "Réplica",
    pauta: "Responde lo más fuerte que dijo el otro grupo. Conceder un punto válido suma." }
];

// Quién debate ahora. Siempre los dos grupos que menos han debatido (así nadie queda dos
// debates atrás de otro); entre los empatados, el que debatió hace más tiempo. El rival se
// busca entre los de menos debates que todavía no se enfrentaron con el primero. A FAVOR le
// toca al que menos veces lo ha tenido.
function emparejar(disponibles, debates) {
  const gs = [...new Set(disponibles || [])].sort((a, b) => a - b);
  if (gs.length < 2) return null;
  const jugados = g => debates.filter(d => d.A === g || d.B === g).length;
  const ultimo = g => { for (let i = debates.length - 1; i >= 0; i--) if (debates[i].A === g || debates[i].B === g) return i; return -1; };
  const orden = [...gs].sort((a, b) => jugados(a) - jugados(b) || ultimo(a) - ultimo(b) || a - b);
  const primero = orden[0];
  const minRival = jugados(orden[1]);
  const candidatos = orden.slice(1).filter(g => jugados(g) === minRival);
  const yaJugaron = (x, y) => debates.some(d => (d.A === x && d.B === y) || (d.A === y && d.B === x));
  const rival = candidatos.find(g => !yaJugaron(primero, g)) ?? candidatos[0];
  const vecesA = g => debates.filter(d => d.A === g).length;
  return vecesA(primero) <= vecesA(rival) ? { A: primero, B: rival } : { A: rival, B: primero };
}

// Votos de un debate. Cada votante parte en 0, así que su posición final es su voto.
function votosSuaves(posiciones) {
  let A = 0, B = 0, n = 0;
  for (const p of posiciones || []) {
    if (typeof p !== "number" || !isFinite(p)) continue;
    n++;
    if (p > ROT.INDECISO) A += Math.tanh(p / ROT.ESCALA);
    else if (p < -ROT.INDECISO) B += Math.tanh(-p / ROT.ESCALA);
  }
  return { A, B, n };
}

const promedio = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

// Puntaje 0–100 de cada lado en un debate: mitad jurado, mitad público.
function puntajeDebate({ notasA, notasB, posiciones }) {
  const mA = promedio(notasA || []), mB = promedio(notasB || []);
  const jA = mA * 5, jB = mB * 5;
  const votos = votosSuaves(posiciones);
  const hayPublico = votos.n > 0;
  const tot = votos.A + votos.B;
  const pA = hayPublico ? (tot > 0 ? 100 * votos.A / tot : 50) : null;
  const pB = hayPublico ? 100 - pA : null;
  const pun = (j, p) => hayPublico ? 0.5 * j + 0.5 * p : j;
  const ganadorJurado = Math.abs(mA - mB) < ROT.EMPATE_JURADO ? null : (mA > mB ? "A" : "B");
  const ganadorPublico = !hayPublico || Math.abs(votos.A - votos.B) < ROT.EMPATE_VOTOS ? null : (votos.A > votos.B ? "A" : "B");
  const ganador = !hayPublico ? ganadorJurado
    : ganadorJurado === ganadorPublico ? ganadorJurado
    : !ganadorJurado ? ganadorPublico : !ganadorPublico ? ganadorJurado : null;
  return {
    A: { jurado: jA, publico: pA, puntaje: pun(jA, pA) },
    B: { jurado: jB, publico: pB, puntaje: pun(jB, pB) },
    ganadorJurado, ganadorPublico, ganador, votos, hayPublico
  };
}

// El ranking de la clase: promedio por debate de cada grupo (no suma: algunos grupos
// debaten una vez más que otros). Desempata el jurado. Quien no ha debatido va al final.
function ranking(grupos, debates) {
  const filas = [];
  for (let g = 1; g <= grupos; g++) {
    const mios = [];
    for (const d of debates || []) {
      if (!d.res) continue;
      if (d.A === g) mios.push(d.res.A); else if (d.B === g) mios.push(d.res.B);
    }
    const conPublico = mios.filter(x => x.publico !== null && x.publico !== undefined);
    filas.push({
      grupo: g, debates: mios.length,
      jurado: mios.length ? promedio(mios.map(x => x.jurado)) : null,
      publico: conPublico.length ? promedio(conPublico.map(x => x.publico)) : null,
      puntaje: mios.length ? promedio(mios.map(x => x.puntaje)) : null,
      puesto: null, distincion: null
    });
  }
  filas.sort((x, y) => (y.debates > 0) - (x.debates > 0) || (y.puntaje ?? 0) - (x.puntaje ?? 0)
    || (y.jurado ?? 0) - (x.jurado ?? 0) || x.grupo - y.grupo);
  const jugaron = filas.filter(f => f.debates > 0);
  jugaron.forEach((f, i) => f.puesto = i + 1);
  if (jugaron.length > 1) {
    const top = jugaron[0];
    const mejorJ = jugaron.reduce((a, b) => (b.jurado > a.jurado ? b : a));
    const conP = jugaron.filter(f => f.publico !== null);
    const mejorP = conP.length ? conP.reduce((a, b) => (b.publico > a.publico ? b : a)) : null;
    if (mejorJ !== top) mejorJ.distincion = "jurado";
    if (mejorP && mejorP !== top) mejorP.distincion = mejorP.distincion ? "ambos" : "publico";
  }
  return filas;
}

// Las preguntas que el profesor dejó escritas en el archivo de la semana se usan primero.
function proximaPreguntaEscrita(preguntas, usadas) {
  const ya = new Set((usadas || []).map(x => String(x).trim().toLowerCase()));
  return (preguntas || []).find(p => !ya.has(String(p).trim().toLowerCase())) || null;
}

function mejorIntervencion(historial) {
  return (historial || []).reduce((m, h) => (!m || h.total > m.total ? h : m), null);
}

if (typeof module !== "undefined") module.exports = { ROT, TRAMOS, emparejar, votosSuaves, puntajeDebate, ranking, proximaPreguntaEscrita, mejorIntervencion };
```

- [ ] **Paso 4: correr las pruebas y confirmar que pasan**

Correr el comando de pruebas de las restricciones globales.
Esperado: `# pass 13`, `# fail 0`.

- [ ] **Paso 5: commit**

```bash
git add rotacion.js pruebas/rotacion.test.js
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "rotacion.js: emparejamiento, puntaje por debate y ranking, con pruebas

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 2: reglas de Firestore para la rotación

**Archivos:**
- Modificar: `firestore.rules`, en los bloques `match /jugadores/{uid}` y `match /mensajes/{id}`, más un bloque nuevo `match /votos/{id}`.

**Interfaces:**
- Consume: los campos de la sala que publicará la Tarea 6: `modo`, `etapa`, `fase`, `debate.{n,A,B}`.
- Produce los contratos que usan los teléfonos (Tarea 8):
  - `jugadores/{uid}` acepta `grupo` entero de 0 a 10.
  - `mensajes` acepta mensajes de alumno con `debate`, `grupo` y `equipo` (A o B).
  - `votos/{n}_{uid}` acepta `{ uid, debate, pos, nombre, email, grupo, t }`.

- [ ] **Paso 1: reemplazar el bloque de jugadores**

```
      match /jugadores/{uid} {
        allow read: if conSesion();
        // El alumno escribe su propio documento. Su grupo (rotación) solo cambia mientras la
        // sala está en la portada o si todavía no eligió (0). El profesor puede moverlo.
        allow write: if (conSesion() && uid == request.auth.uid
            && request.resource.data.nombre is string && request.resource.data.nombre.size() <= 40
            && request.resource.data.email == request.auth.token.email
            && request.resource.data.get('equipo', '') in ['', 'A', 'B', 'P']
            && (!('grupo' in request.resource.data)
                || (request.resource.data.grupo is int && request.resource.data.grupo >= 0 && request.resource.data.grupo <= 10
                    && (resource == null || resource.data.get('grupo', 0) == 0
                        || resource.data.get('grupo', 0) == request.resource.data.grupo
                        || sala(codigo).data.get('etapa', null) == 'portada'))))
          || (esProfe(codigo) && request.resource.data.get('grupo', 0) is int
              && request.resource.data.get('grupo', 0) >= 0 && request.resource.data.get('grupo', 0) <= 10);
      }
```

- [ ] **Paso 2: agregar la rama de rotación a la creación de mensajes**

En `match /mensajes/{id}`, reemplazar la línea `allow create:` completa por:

```
        allow create: if esProfe(codigo)
          // modo clásico (salas antiguas)
          || (conSesion() && esJugador(codigo)
            && sala(codigo).data.get('modo', '') != 'rotacion'
            && request.resource.data.tipo == 'alumno'
            && request.resource.data.uid == request.auth.uid
            && request.resource.data.equipo == jugador(codigo).data.equipo
            && request.resource.data.equipo in ['A', 'B']
            && sala(codigo).data.fase == 'abierta'
            && request.resource.data.texto is string
            && request.resource.data.texto.size() > 0 && request.resource.data.texto.size() <= 1500)
          // rotación: solo los dos grupos llamados, cada uno por su lado, en el debate en curso
          || (conSesion() && esJugador(codigo)
            && sala(codigo).data.get('modo', '') == 'rotacion'
            && request.resource.data.tipo == 'alumno'
            && request.resource.data.uid == request.auth.uid
            && sala(codigo).data.fase == 'abierta'
            && request.resource.data.debate == sala(codigo).data.debate.n
            && request.resource.data.grupo == jugador(codigo).data.grupo
            && ((request.resource.data.equipo == 'A' && jugador(codigo).data.grupo == sala(codigo).data.debate.A)
                || (request.resource.data.equipo == 'B' && jugador(codigo).data.grupo == sala(codigo).data.debate.B))
            && request.resource.data.texto is string
            && request.resource.data.texto.size() > 0 && request.resource.data.texto.size() <= 1500);
```

- [ ] **Paso 3: agregar el bloque de votos, después del bloque `publico`**

```
      // Rotación: la posición de cada votante en cada debate (id = "{debate}_{uid}"). Vota solo
      // quien no está debatiendo, en el debate en curso, con el tramo abierto o en votación.
      match /votos/{id} {
        allow read: if esProfe(codigo) || (conSesion() && id.matches('^[0-9]+_' + request.auth.uid + '$'));
        allow write: if conSesion() && esJugador(codigo)
          && id == string(request.resource.data.debate) + '_' + request.auth.uid
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.debate == sala(codigo).data.debate.n
          && sala(codigo).data.fase in ['abierta', 'votando']
          && jugador(codigo).data.grupo != sala(codigo).data.debate.A
          && jugador(codigo).data.grupo != sala(codigo).data.debate.B
          && request.resource.data.pos is number
          && request.resource.data.pos >= -100 && request.resource.data.pos <= 100;
      }
```

- [ ] **Paso 4: desplegar y confirmar que compila**

Correr:
`wsl.exe -e bash -lc 'source ~/.nvm/nvm.sh >/dev/null; rm -rf /tmp/tribuna_rules && mkdir -p /tmp/tribuna_rules && cd /mnt/c/Users/naim.bro.k/claude_projects/games/tribuna && cp firebase.json .firebaserc firestore.rules /tmp/tribuna_rules/ && cd /tmp/tribuna_rules && npx -y firebase-tools@latest deploy --only firestore:rules --project tribuna-csc00155 2>&1 | tail -4'`
Esperado: `rules file firestore.rules compiled successfully` y `Deploy complete!`. Las salas antiguas siguen funcionando por la rama clásica. Las reglas de la rotación se prueban en la Tarea 11.

- [ ] **Paso 5: commit**

```bash
git add firestore.rules
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Reglas: grupos, mensajes y votos de la rotación

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 3: el motor trabaja por debate

**Archivos:**
- Modificar: `app.js`: estado `S`, `pintarRonda`, `abrirRonda`, `rigorMedio`, `pintarJueces`, `pintarFeed`, `promptEval`, `lanzarEvento` y `pintarMarcador`.
- Modificar: `moderacion.js`: `postChat`, `transcripcionChat`, `abrirTramoChat`, `promptModerador` y `relatorPideVoto`.
- Modificar: `index.html`: orden de los scripts.

**Interfaces:**
- Consume: `TRAMOS` y `ROT` (Tarea 1).
- Produce:
  - `tramoActual() → {id, nombre, seg, rol, pauta}`: el tramo en curso (`TRAMOS[S.tramo]`).
  - `mocionActual() → string`: la pregunta del debate en curso, o `SESION.mocion` si no hay debate.
  - `ladoNombre(k:"A"|"B") → string`, por ejemplo `"A FAVOR · Grupo 3"`, o solo `EQUIPOS[k].nombre` si no hay debate.
  - `delDebate(h) → boolean`: entradas de `S.historial` del debate en curso.
  - `S.clase = { grupos:number, tema:string, debates:[{n,pregunta,A,B,res,votantes}], propuesta:null|object, evaluado:number }`.
  - `S.debate = null | { n, pregunta, A, B }`, `S.tramo` (0|1).
  - Cada mensaje nuevo lleva `debate` (número o 0) y `tramo`.

- [ ] **Paso 1: cargar `rotacion.js` antes del motor**

En `index.html`, justo antes de `<script src="moderacion.js?v=…">`:

```html
<script src="rotacion.js?v=20260921a"></script>
```

- [ ] **Paso 2: estado y ayudantes**

En `app.js`, dentro de `const S = {`, cambiar `fase: "listo",` por:

```js
  fase: "propuesta",      // propuesta | listo | abierta | votando | resultado | fin   (rotación)
  tramo: 0,               // 0 = apertura, 1 = réplica, dentro del debate en curso
  clase: { grupos: ROT.GRUPOS_DEFECTO, tema: "", debates: [], propuesta: null, evaluado: 0 },
  debate: null,           // { n, pregunta, A: grupo, B: grupo } — el debate en curso
```

Después de la línea `const palabras = …`, agregar:

```js
// La ronda global (S.ronda) cuenta tramos de toda la clase: así los filtros de la
// conversación (m.ronda === S.ronda) siguen sirviendo. El tramo dentro del debate es S.tramo.
const tramoActual = () => TRAMOS[S.tramo] || TRAMOS[0];
const mocionActual = () => (S.debate && S.debate.pregunta) || SESION.mocion;
const ladoNombre = k => S.debate ? `${EQUIPOS[k].nombre} · Grupo ${S.debate[k]}` : EQUIPOS[k].nombre;
const delDebate = h => !S.debate || h.debate === S.debate.n;
```

- [ ] **Paso 3: reemplazar los usos de `RONDAS[S.ronda]` y de la moción fija**

- En `app.js`: `pintarRonda`, `abrirRonda` (las cuatro apariciones) y `lanzarEvento` usan `tramoActual()` en vez de `RONDAS[S.ronda]`.
- En `moderacion.js`: `abrirTramoChat`, `promptModerador` y `relatorPideVoto` usan `tramoActual()`.
- En los tres prompts, `promptEval` (app.js), `promptModerador` y `relatorPideVoto` (moderacion.js), `"${SESION.mocion}"` pasa a `"${mocionActual()}"`, y `EQUIPOS.A.nombre` / `EQUIPOS.B.nombre` pasan a `ladoNombre("A")` / `ladoNombre("B")`.

`pintarRonda` completo:

```js
function pintarRonda() {
  const R = tramoActual();
  const d = S.debate;
  $("rondaPill").textContent = d ? `DEBATE ${d.n} · ${R.nombre.toUpperCase()}` : "ROTACIÓN";
  $("pauta").innerHTML = d ? `<b>DEBATE ${d.n} · ${R.nombre.toUpperCase()}</b> — «${esc(d.pregunta)}» · ${R.pauta}` : "Esperando la próxima pregunta.";
  $("reloj").textContent = fmt(R.seg);
}
```

- [ ] **Paso 4: el jurado y el marcador leen solo el debate en curso**

En `app.js`:

```js
const rigorMedio = k => { const h = S.historial.filter(x => x.equipo === k && delDebate(x)); return h.length ? h.reduce((s, x) => s + x.ev.rubrica.total, 0) / h.length : null; };
```

En `pintarJueces`, la función `prom` y `n` agregan `&& delDebate(x)` al filtro, y `ultima` busca en `S.historial.filter(delDebate)`.

En `pintarMarcador`, al comienzo:

```js
  for (const k of ["A", "B"]) {
    $("nom" + k).textContent = S.debate ? `GRUPO ${S.debate[k]}` : EQUIPOS[k].nombre;
    $("lema" + k).textContent = S.debate ? EQUIPOS[k].nombre : EQUIPOS[k].lema;
  }
```

- [ ] **Paso 5: los mensajes llevan el debate y el tramo**

En `moderacion.js`, en `postChat`, después de `m.ronda = m.ronda ?? S.ronda;`:

```js
  m.debate = m.debate ?? (S.debate ? S.debate.n : 0);
  m.tramo = m.tramo ?? S.tramo;
```

En `relatorPideVoto`, el filtro `delTramo` resume el debate completo:

```js
  const delTramo = m => S.debate ? m.debate === S.debate.n : m.ronda === S.ronda;
```

Su prompt dice `Acaba de terminar el debate ${S.debate ? S.debate.n : ""}: «${mocionActual()}»` en vez del nombre del tramo.

En `pintarFeed` (app.js), el separador marca cada debate y cada tramo:

```js
  let html = "", clave = null;
  for (const m of S.chat) {
    const k = `${m.debate || 0}|${m.tramo || 0}`;
    if (k !== clave && m.debate) { clave = k; html += `<div class="turno-sep">DEBATE ${m.debate} · ${(TRAMOS[m.tramo || 0] || TRAMOS[0]).nombre.toUpperCase()}</div>`; }
    html += burbuja(m);
  }
```

- [ ] **Paso 6: revisar la sintaxis y que la pantalla cargue**

Correr en WSL: `node --check app.js && node --check moderacion.js && node --check rotacion.js`.
Esperado: sin salida y código 0.

Abrir `index.html` con el servidor local (`python servidor.py`, <http://localhost:8777/?semana=7>) y leer la consola del navegador.
Esperado: sin errores; la píldora dice «ROTACIÓN».

- [ ] **Paso 7: commit**

```bash
git add app.js moderacion.js index.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Motor por debate: tramo, moción y jurado del debate en curso

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 4: `clase.js`, el ciclo de un debate

**Archivos:**
- Crear: `clase.js`
- Modificar: `app.js`: `cerrarRonda` pasa a despachar; se borran `siguienteRonda`, `marcadores`, `ceremonia` y `veredicto`; el manejador de `btnPrincipal` pasa a `clase.js`.
- Modificar: `index.html`: cargar `clase.js` después de `app.js`; agregar el botón `btnTerminar`.
- Modificar: `moderacion.js`: `abrirTramoChat` anuncia el debate o la réplica.

**Interfaces:**
- Consume: `emparejar`, `puntajeDebate`, `ranking`, `TRAMOS`, `ROT` (Tarea 1); `tramoActual`, `mocionActual`, `S.clase`, `S.debate` (Tarea 3); `relatorPideVoto`, `postChat`, `transcripcionChat` (moderacion.js); `evaluarConLLM`, `evaluarRigor`, `abrirRonda`, `pintarMarcador`, `pintarRonda`, `sonar`, `tick` (app.js).
- Produce:
  - `gruposDisponibles() → number[]`: usa `window.gruposConectados` si existe (Tarea 6); si no, 1..N.
  - `publicarDebate({pregunta, A, B})`: abre el debate n+1 y su apertura.
  - `pasarAReplica()`: cierra la apertura y abre la réplica.
  - `votarDebate()`: fase votando; relator, jurado y propuesta en paralelo; reloj de 60 s.
  - `cerrarVotacion()`: espera al jurado y pasa al resultado.
  - `evaluarDebate() → Promise<void>`: evalúa por alumno todo lo que escribió en el debate; idempotente por `S.clase.evaluado`.
  - `terminarClase()`: fase fin y ceremonia final.
  - `publicarEstado()`: `window.publicarEstado?.()` (Tarea 6).
  - Tareas posteriores definen `mostrarPropuesta()` y `prepararPropuesta()` (Tarea 5), `mostrarResultadoDebate(res, alTerminar)` y `ceremoniaRanking(...)` (Tarea 9). `clase.js` las llama con `typeof x === "function"`, así esta tarea funciona sola.
- Formato de las entradas de `S.historial`: `{ orden, turnoOrden, debate, grupo, equipo, autor, autorEmail, ronda:"debate", rondaNombre, rolNombre, texto, ev }`.

- [ ] **Paso 1: el despachador de fin de tramo en `app.js`**

Reemplazar la función `cerrarRonda` completa por:

```js
// Fin de un tramo (por reloj o por el botón): la apertura pasa a la réplica; la réplica, a la votación.
async function cerrarRonda() {
  if (S.fase !== "abierta") return;
  clearInterval(S.reloj);
  $("reloj").classList.remove("corriendo", "urgente");
  if (S.tramo === 0) pasarAReplica(); else votarDebate();
}
```

Borrar de `app.js` las funciones `siguienteRonda`, `marcadores`, `ceremonia` y `veredicto`, y el bloque `$("btnPrincipal").onclick = …` de `init()`.

- [ ] **Paso 2: crear `clase.js`**

```js
/* =====================================================================
   TRIBUNA — la clase en rotación: un debate tras otro entre grupos fijos.
   propuesta → apertura → réplica → votación → resultado → propuesta …  hasta «Terminar clase».
   Corre solo en la pantalla del profesor. La lógica pura está en rotacion.js; aquí se
   orquesta: reloj, moderadora, jurado, público y lo que se publica a los teléfonos.
   ===================================================================== */

const publicarEstado = () => { if (typeof window.publicarEstado === "function") window.publicarEstado(); };

function gruposDisponibles() {
  if (typeof window.gruposConectados === "function") return window.gruposConectados();
  return Array.from({ length: S.clase.grupos }, (_, i) => i + 1);
}

function publicarDebate({ pregunta, A, B }) {
  const n = S.clase.debates.length + 1;
  const anterior = S.debate;
  S.debate = { n, pregunta: String(pregunta).trim().slice(0, 300), A, B };
  S.clase.debates.push({ n, pregunta: S.debate.pregunta, A, B, res: null, votantes: [] });
  S.clase.propuesta = null;
  S.tramo = 0;
  S.ronda = (n - 1) * 2;
  S.publico = { A: 0, B: 0, n: 0, votantes: [] };
  S.debateAnterior = anterior;
  if (typeof window.alCambiarDebate === "function") window.alCambiarDebate(n);   // online: votos del debate n
  $("propuesta")?.remove();
  pintarRonda(); pintarMarcador();
  S.fase = "listo";
  abrirRonda();                                          // abre la apertura; abrirTramoChat anuncia
  publicarEstado();
}

function pasarAReplica() {
  S.tramo = 1;
  S.ronda = (S.debate.n - 1) * 2 + 1;
  pintarRonda();
  S.fase = "listo";
  abrirRonda();
  publicarEstado();
}

function votarDebate() {
  S.fase = "votando";
  const fin = Date.now() + ROT.SEG_VOTACION * 1000;
  S.finVoto = fin;
  $("btnPrincipal").textContent = "CERRAR VOTACIÓN";
  const n = S.debate.n;
  // en paralelo: el relator llama a votar, el jurado evalúa y la moderadora piensa la próxima pregunta
  S.jurando = relatorPideVoto().then(rel => evaluarDebate(rel)).catch(e => { console.warn("evaluación:", e); });
  if (typeof prepararPropuesta === "function") prepararPropuesta();
  clearInterval(S.reloj);
  S.reloj = setInterval(() => {
    const resta = Math.max(0, Math.ceil((fin - Date.now()) / 1000));
    $("reloj").textContent = fmt(resta);
    if (resta <= 0 && S.fase === "votando" && S.debate && S.debate.n === n) cerrarVotacion();
  }, 500);
  tick(`Debate ${n}: votación abierta, ${ROT.SEG_VOTACION} segundos.`);
  publicarEstado();
}

async function cerrarVotacion() {
  if (S.fase !== "votando") return;
  S.fase = "cerrando";
  clearInterval(S.reloj);
  $("btnPrincipal").disabled = true; $("btnPrincipal").textContent = "EL JURADO TERMINA…";
  await (S.jurando || evaluarDebate());
  if (S.clase.evaluado !== S.debate.n) await evaluarDebate();
  $("btnPrincipal").disabled = false;
  mostrarResultado();
}

// Todo lo que escribió cada alumno en el debate (los dos tramos) es su intervención.
function entregasDelDebate(n) {
  const out = { A: [], B: [] }, por = new Map();
  for (const m of S.chat) if (m.tipo === "alumno" && m.debate === n && (m.equipo === "A" || m.equipo === "B")) {
    const k = m.equipo + "|" + (m.uid || m.nombre);
    if (!por.has(k)) por.set(k, { equipo: m.equipo, autor: m.nombre, email: m.email || "", textos: [] });
    por.get(k).textos.push(m.texto);
  }
  for (const v of por.values()) out[v.equipo].push({ autor: v.autor, email: v.email, texto: v.textos.join("\n").slice(0, 6000) });
  return out;
}

async function evaluarDebate(relator = null) {
  const d = S.debate;
  if (!d || S.clase.evaluado === d.n) return;
  const entregas = entregasDelDebate(d.n);
  const chatTramo = transcripcionChat(m => m.debate === d.n, 80);
  const pauta = TRAMOS.map(t => `${t.nombre}: ${t.pauta}`).join(" ");
  const trabajos = ["A", "B"].map(async k => {
    const ctx = { ronda: "refutacion", rondaNombre: `Debate ${d.n} (apertura y réplica)`, pauta, dir: EQUIPOS[k].dir,
                  conceptosRival: [], previas: [], ecos: [], chatTramo, relator };
    const evs = await Promise.all(entregas[k].map(t => S.motor.activo ? evaluarConLLM(t.texto, ctx, k) : Promise.resolve(evaluarRigor(t.texto, ctx))));
    return { k, evs };
  });
  const res = await Promise.all(trabajos);
  if (S.clase.evaluado === d.n) return;                 // otra llamada terminó primero
  for (const { k, evs } of res) {
    const textos = entregas[k];
    const turnoOrden = S.seq++;
    textos.forEach((t, i) => S.historial.push({
      orden: S.seq++, turnoOrden, debate: d.n, grupo: d[k], equipo: k, autor: t.autor, autorEmail: t.email || "",
      ronda: "debate", rondaNombre: `Debate ${d.n}`, rolNombre: EQUIPOS[k].nombre, texto: t.texto, ev: evs[i]
    }));
    const rig = evs.length ? evs.reduce((a, ev) => a + ev.rubrica.total, 0) / evs.length : 0;
    postChat({ tipo: "resultado", equipo: k, nombre: "resultado", texto: "", datos: {
      rondaNombre: `Debate ${d.n} · Grupo ${d[k]}`, grupo: d[k], n: textos.length, rigorMedio: +rig.toFixed(1),
      alumnos: textos.map((t, i) => ({ autor: t.autor, total: evs[i].rubrica.total, nota: evs[i].nota || "", banderas: evs[i].banderas }))
    } });
    if (!textos.length) tick(`El Grupo ${d[k]} no escribió en este debate: su parte de jurado vale 0.`);
  }
  S.clase.evaluado = d.n;
  pintarMarcador();
  publicarEstado();
}

function mostrarResultado() {
  const d = S.debate, reg = S.clase.debates[d.n - 1];
  const notas = k => S.historial.filter(h => h.debate === d.n && h.equipo === k).map(h => h.ev.rubrica.total);
  const posiciones = (S.publico.votantes || []).map(v => v.final);
  reg.res = puntajeDebate({ notasA: notas("A"), notasB: notas("B"), posiciones });
  reg.votantes = (S.publico.votantes || []).map(v => ({ ...v }));
  const antes = S.clase.ranking || [];
  S.clase.ranking = ranking(S.clase.grupos, S.clase.debates);
  S.clase.ultimo = { n: d.n, pregunta: d.pregunta, A: d.A, B: d.B, res: reg.res };
  S.fase = "resultado";
  sonar(reg.res.ganador ? "fanfarria" : "whoosh");
  publicarEstado();
  const seguir = () => {
    if (S.fase !== "resultado") return;
    S.fase = "propuesta";
    // la moderadora agradece y la propuesta siguiente ya se generó durante la votación
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto: `Gracias, Grupo ${d.A} y Grupo ${d.B}. Viene el próximo debate.` });
    if (typeof mostrarPropuesta === "function") mostrarPropuesta();
    publicarEstado();
  };
  if (typeof mostrarResultadoDebate === "function") mostrarResultadoDebate(S.clase.ultimo, antes, S.clase.ranking, seguir);
  else setTimeout(seguir, ROT.SEG_RESULTADO * 1000);
  $("btnPrincipal").textContent = "SEGUIR ▶";
}

function terminarClase() {
  if (S.fase === "abierta" || S.fase === "votando") {
    if (!confirm("Hay un debate en curso. ¿Terminar la clase igual? Ese debate no cuenta para el ranking.")) return;
    clearInterval(S.reloj);
    if (S.debate && !S.clase.debates[S.debate.n - 1].res) S.clase.debates.pop();
  }
  S.fase = "fin";
  S.clase.ranking = ranking(S.clase.grupos, S.clase.debates);
  $("propuesta")?.remove();
  $("btnPrincipal").textContent = "🏆 VER CAMPEÓN";
  tick("Clase terminada. Los teléfonos piden feedback; revela al campeón cuando quieras.");
  publicarEstado();
}

// El botón principal hace lo que corresponde a cada momento.
function accionPrincipal() {
  if (S.fase === "propuesta") { if (typeof publicarPropuestaActual === "function") publicarPropuestaActual(); }
  else if (S.fase === "listo") abrirRonda();                 // tramo restaurado tras cerrar la pestaña
  else if (S.fase === "abierta") cerrarRonda();
  else if (S.fase === "votando") cerrarVotacion();
  else if (S.fase === "resultado") { $("resultado")?.remove(); S.fase = "resultado"; mostrarResultadoSeguir(); }
  else if (S.fase === "fin") { if (typeof ceremoniaRanking === "function") ceremoniaRanking(); }
}
function mostrarResultadoSeguir() {
  const d = S.debate;
  S.fase = "propuesta";
  postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto: `Gracias, Grupo ${d.A} y Grupo ${d.B}. Viene el próximo debate.` });
  if (typeof mostrarPropuesta === "function") mostrarPropuesta();
  publicarEstado();
}

$("btnPrincipal").onclick = accionPrincipal;
$("btnTerminar").onclick = terminarClase;
```

- [ ] **Paso 3: botones y script en `index.html`**

En `.acciones`, después del botón `btnMasMin`:

```html
        <button class="btn sm" id="btnTerminar" title="Terminar la clase y pasar al ranking final">🏁 TERMINAR CLASE</button>
```

Después de `<script src="app.js?v=…"></script>`:

```html
<script src="clase.js?v=20260921a"></script>
```

- [ ] **Paso 4: la moderadora anuncia el debate y la réplica**

En `moderacion.js`, reemplazar el `postChat` de `abrirTramoChat` por:

```js
  const d = S.debate;
  if (d && S.tramo === 0) {
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto:
      `Debate ${d.n}: «${d.pregunta}». Grupo ${d.A} defiende ${EQUIPOS.A.nombre}; Grupo ${d.B}, ${EQUIPOS.B.nombre}. ` +
      `${quien(a, "Grupo " + d.A)}, ¿cuál es la tesis de tu grupo? Y ${quien(b, "Grupo " + d.B)}, la del suyo. Tienen ${Math.round(R.seg / 60)} minutos.` });
  } else {
    postChat({ tipo: "mod", nombre: MOD_NOMBRE, texto:
      `Réplica. ${quien(b, "Grupo " + (d ? d.B : ""))} y ${quien(a, "Grupo " + (d ? d.A : ""))}: respondan lo más fuerte que dijo el otro grupo. Conceder un punto válido suma.` });
  }
```

(`a`, `b` y `quien` ya existen en la función; `R` es `tramoActual()`.)

- [ ] **Paso 5: prueba local del ciclo sin teléfonos**

Con el servidor local, en la consola de <http://localhost:8777/?semana=7>:

```js
publicarDebate({ pregunta: "La regulación estatal de la IA llega siempre tarde.", A: 1, B: 2 });
postChat({ tipo: "alumno", nombre: "Ana", equipo: "A", uid: "sim:Ana", texto: "Acemoglu muestra que la regulación reactiva llega después del daño." });
postChat({ tipo: "alumno", nombre: "Beto", equipo: "B", uid: "sim:Beto", texto: "Concedo el punto, pero la ley de responsabilidad por producto sí llega antes." });
cerrarRonda();                        // apertura → réplica
cerrarRonda();                        // réplica → votación
await cerrarVotacion();               // jurado → resultado
[S.fase, S.clase.debates[0].res.A.puntaje > 0, S.clase.ranking.length]
```

Esperado: `["resultado", true, 6]`, y la conversación muestra el anuncio, la réplica, el llamado del relator y dos tarjetas de resultado del «Debate 1».

- [ ] **Paso 6: commit**

```bash
git add clase.js app.js moderacion.js index.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "clase.js: ciclo propuesta, apertura, réplica, votación y resultado

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 5: la propuesta de la moderadora y los controles del profesor

**Archivos:**
- Modificar: `clase.js`: agregar `prepararPropuesta`, `promptPropuesta`, `mostrarPropuesta` y `publicarPropuestaActual`.
- Modificar: `index.html`: CSS de `#propuesta`.
- Modificar: `contenido/semana7.js`: agregar `const PREGUNTAS = [];` con un comentario de uso.

**Interfaces:**
- Consume: `emparejar`, `proximaPreguntaEscrita`, `ROT` (Tarea 1); `gruposDisponibles`, `publicarDebate` (Tarea 4); `pedirLLM`, `jsonDe`, `limpiaFrase` (app.js).
- Produce:
  - `S.clase.propuesta = { estado:"pensando"|"lista"|"vacia", pregunta, porQue, mejorFavor, mejorContra, A, B, fuente:"escrita"|"ia"|"profesor" }`.
  - `prepararPropuesta() → Promise<void>`.
  - `mostrarPropuesta()`: panel sobre la conversación, con cuenta regresiva.
  - `publicarPropuestaActual()`.

- [ ] **Paso 1: preguntas escritas opcionales**

Al final de `contenido/semana7.js`:

```js
/* --- Preguntas escritas por el profesor (opcional) --------------------
   Si hay, la moderadora las propone primero, en este orden. Después genera
   las suyas a partir del tema general, el material y lo que va pasando. */
const PREGUNTAS = [];
```

`contenido/semana5.js` no se toca. `clase.js` usa `typeof PREGUNTAS !== "undefined" ? PREGUNTAS : []`.

- [ ] **Paso 2: la generación, en `clase.js`**

```js
function promptPropuesta() {
  const hechas = S.clase.debates.map(d => `- ${d.pregunta}`).join("\n") || "(ninguna todavía)";
  const disputas = S.chat.filter(m => m.tipo === "relator" && m.datos && m.datos.disputa).map(m => `- ${m.datos.disputa}`).slice(-5).join("\n") || "(ninguna)";
  const flojas = S.historial.filter(h => h.ev && h.ev.nota && h.ev.rubrica.total < 10).map(h => `- ${h.ev.nota}`).slice(-5).join("\n") || "(nada)";
  const usados = new Set(S.historial.flatMap(h => (h.ev.conceptos || []).map(c => c.id || c)));
  const sinUsar = CONCEPTOS.filter(c => !usados.has(c.id)).map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n") || "(todos se han usado)";
  return `Eres la moderadora de una clase de debate en rotación. Curso: "${SESION.curso}", semana ${SESION.semana}.
TEMA GENERAL (lo fijó el profesor): "${S.clase.tema || SESION.tema}"

MATERIAL DE LA SEMANA (conceptos y lecturas):
${CONCEPTOS.map(c => `- ${c.etiqueta} — ${c.fuente}`).join("\n")}

YA SE DEBATIÓ (no repitas ni reformules estas preguntas):
${hechas}

LO QUE QUEDÓ EN DISPUTA SEGÚN EL RELATOR:
${disputas}

LO QUE EL JURADO MARCÓ COMO FLOJO:
${flojas}

CONCEPTOS QUE NADIE HA USADO TODAVÍA:
${sinUsar}

TU TAREA: propone la próxima pregunta de debate. Tiene que ser una afirmación discutible de una sola línea (máximo 25 palabras), dentro del tema general, que se pueda defender a favor y en contra con el material del curso. Prefiere lo que quedó en disputa o lo que nadie ha tocado. Español de Chile, sin groserías.

Responde SOLO un JSON: {"pregunta": "…", "porQue": "máx. 20 palabras: por qué esta y por qué ahora", "mejorFavor": "máx. 20 palabras", "mejorContra": "máx. 20 palabras"}`;
}

async function prepararPropuesta() {
  const par = emparejar(gruposDisponibles(), S.clase.debates);
  const base = { A: par ? par.A : null, B: par ? par.B : null };
  const escritas = typeof PREGUNTAS !== "undefined" ? PREGUNTAS : [];
  const escrita = proximaPreguntaEscrita(escritas, S.clase.debates.map(d => d.pregunta));
  if (escrita) { S.clase.propuesta = { ...base, estado: "lista", pregunta: escrita, porQue: "Pregunta escrita por ti en el archivo de la semana.", mejorFavor: "", mejorContra: "", fuente: "escrita" }; return; }
  S.clase.propuesta = { ...base, estado: "pensando", pregunta: "", porQue: "", mejorFavor: "", mejorContra: "", fuente: "ia" };
  if (S.fase === "propuesta") mostrarPropuesta();
  try {
    if (!S.motor.activo) throw new Error("sin motor LLM");
    const j = jsonDe(await pedirLLM(promptPropuesta(), "jurado"));
    const pregunta = String(j.pregunta || "").trim().slice(0, 300);
    if (!pregunta || !limpiaFrase(pregunta)) throw new Error("pregunta vacía o inválida");
    S.clase.propuesta = { ...base, estado: "lista", pregunta, porQue: String(j.porQue || "").slice(0, 200),
      mejorFavor: String(j.mejorFavor || "").slice(0, 200), mejorContra: String(j.mejorContra || "").slice(0, 200), fuente: "ia" };
  } catch (e) {
    console.warn("propuesta:", e);
    S.clase.propuesta = { ...base, estado: "vacia", pregunta: "", porQue: "", mejorFavor: "", mejorContra: "", fuente: "ia" };
  }
  if (S.fase === "propuesta") mostrarPropuesta();
}
```

- [ ] **Paso 3: el panel, en `clase.js`**

```js
let cuentaPropuesta = null;

function mostrarPropuesta() {
  clearInterval(cuentaPropuesta);
  const p = S.clase.propuesta;
  if (!p) { prepararPropuesta(); return; }
  let el = $("propuesta");
  if (!el) { el = document.createElement("div"); el.id = "propuesta"; document.querySelector("main .col").appendChild(el); }
  const gs = Array.from({ length: S.clase.grupos }, (_, i) => i + 1);
  const sel = (id, v) => `<select id="${id}">${gs.map(g => `<option value="${g}" ${g === v ? "selected" : ""}>Grupo ${g}</option>`).join("")}</select>`;
  const faltan = p.A === null || p.B === null;
  el.innerHTML = `
    <div class="pr-k">PRÓXIMO DEBATE · lo ves solo tú</div>
    ${p.estado === "pensando" ? `<div class="pr-pensando">La moderadora está pensando la próxima pregunta…</div>` : ""}
    ${p.estado === "vacia" ? `<div class="pr-aviso">La moderadora no pudo proponer una pregunta. Escribe la tuya o pide otra.</div>` : ""}
    ${faltan ? `<div class="pr-aviso">Faltan grupos con alumnos conectados: se necesitan al menos dos.</div>` : ""}
    <textarea id="prTexto" rows="2" maxlength="300" placeholder="Escribe la pregunta del debate">${esc(p.pregunta || "")}</textarea>
    ${p.porQue ? `<div class="pr-porque">${esc(p.porQue)}</div>` : ""}
    ${p.mejorFavor || p.mejorContra ? `<div class="pr-lados"><div style="--c:var(--A)"><b>A favor</b>${esc(p.mejorFavor)}</div><div style="--c:var(--B)"><b>En contra</b>${esc(p.mejorContra)}</div></div>` : ""}
    <div class="pr-grupos"><span style="color:var(--A)">A FAVOR</span>${sel("prA", p.A)}<span style="color:var(--B)">EN CONTRA</span>${sel("prB", p.B)}</div>
    <div class="pr-acc">
      <button class="btn pri" id="prPublicar">Publicar</button>
      <button class="btn" id="prOtra">Pedir otra</button>
      <span class="pr-cuenta" id="prCuenta"></span>
    </div>`;
  const detener = () => { clearInterval(cuentaPropuesta); $("prCuenta").textContent = ""; };
  el.onpointerdown = detener; el.onfocusin = detener;
  $("prPublicar").onclick = publicarPropuestaActual;
  $("prOtra").onclick = () => { S.clase.propuesta = null; prepararPropuesta(); };
  const listo = p.estado === "lista" && !faltan;
  $("btnPrincipal").textContent = "PUBLICAR PREGUNTA";
  if (listo) {
    let resta = ROT.SEG_PROPUESTA;
    $("prCuenta").textContent = `se publica en ${resta} s`;
    cuentaPropuesta = setInterval(() => {
      resta--;
      if (resta <= 0) { clearInterval(cuentaPropuesta); publicarPropuestaActual(); return; }
      if ($("prCuenta")) $("prCuenta").textContent = `se publica en ${resta} s`;
    }, 1000);
  }
}

function publicarPropuestaActual() {
  clearInterval(cuentaPropuesta);
  const pregunta = ($("prTexto")?.value || S.clase.propuesta?.pregunta || "").trim();
  const A = +($("prA")?.value || S.clase.propuesta?.A), B = +($("prB")?.value || S.clase.propuesta?.B);
  if (!pregunta) { tick("Escribe una pregunta o pide otra a la moderadora."); return; }
  if (!A || !B || A === B) { tick("Elige dos grupos distintos."); return; }
  publicarDebate({ pregunta, A, B });
}
```

- [ ] **Paso 4: estilos del panel en `index.html`**

Antes de `/* ceremonia del ganador */`:

```css
main .col{position:relative}
#propuesta{position:absolute;left:14px;right:14px;bottom:88px;z-index:20;background:#0f1822;border:1px solid var(--amber);border-radius:14px;padding:14px 16px;box-shadow:0 18px 50px rgba(0,0,0,.55)}
#propuesta .pr-k{font-size:10.5px;letter-spacing:.2em;color:var(--amber);margin-bottom:8px}
#propuesta textarea{width:100%;background:#080d12;color:var(--txt);border:1px solid var(--line);border-radius:9px;padding:10px;font:600 17px/1.35 system-ui;resize:none}
#propuesta .pr-porque{color:var(--dim);font-size:12.5px;margin:6px 0}
#propuesta .pr-lados{display:flex;gap:8px;margin:8px 0}
#propuesta .pr-lados div{flex:1;border-top:2px solid var(--c);background:var(--panel);border-radius:8px;padding:7px 9px;font-size:12px;color:var(--dim)}
#propuesta .pr-lados b{display:block;color:var(--c);font-size:11px;letter-spacing:.12em;text-transform:uppercase}
#propuesta .pr-grupos{display:flex;gap:8px;align-items:center;font-size:11px;letter-spacing:.12em;margin:8px 0}
#propuesta select{background:var(--panel2);color:var(--txt);border:1px solid var(--line);border-radius:7px;padding:5px 8px}
#propuesta .pr-acc{display:flex;gap:8px;align-items:center}
#propuesta .pr-cuenta{margin-left:auto;color:var(--amber);font-family:var(--mono);font-size:12.5px}
#propuesta .pr-pensando{color:var(--dim);animation:pulso 1.4s infinite;margin-bottom:6px}
#propuesta .pr-aviso{color:var(--amber);font-size:12.5px;margin-bottom:6px}
```

- [ ] **Paso 5: probar el panel en local**

En la consola de <http://localhost:8777/?semana=7>, sin motor LLM:

```js
S.fase = "propuesta"; S.clase.propuesta = null; mostrarPropuesta();
await new Promise(r => setTimeout(r, 300));
[S.clase.propuesta.estado, !!document.getElementById("propuesta"), S.clase.propuesta.A !== null]
```

Esperado: `["vacia", true, true]`. El panel pide escribir la pregunta y no hay cuenta regresiva.

Después, `window.gruposConectados = () => [4]; S.clase.propuesta = null; mostrarPropuesta();`.
Esperado: el aviso «Faltan grupos con alumnos conectados».

Borrar la función de prueba: `delete window.gruposConectados`.

- [ ] **Paso 6: commit**

```bash
git add clase.js index.html contenido/semana7.js
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Propuesta de la moderadora: pregunta, grupos, cuenta regresiva y controles del profesor

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 6: la capa online de la rotación

**Archivos:**
- Modificar: `online.js`: `estadoPublico`, `estadoPrivado`, `restaurar`, `crearSala`, `activarOnline` e `irA`; se agregan `suscribirVotos` y `moverAlumno`; se borran `fotoPublico`, `calcPublico` y la suscripción a `publico`.

**Interfaces:**
- Consume: `S.clase`, `S.debate`, `S.tramo` (Tarea 3); `publicarDebate` y demás funciones de `clase.js` (Tarea 4); `votosSuaves` (Tarea 1).
- Produce:
  - `window.publicarEstado()`.
  - `window.gruposConectados() → number[]`: grupos con al menos un jugador, ordenados.
  - `window.alCambiarDebate(n)`: se suscribe a `votos` del debate n.
  - `window.moverAlumno(uid, grupo) → Promise`.
  - `window.rosterRemoto()`: jugadores de los dos grupos del debate, `{ nombre, equipo:"A"|"B", grupo }`.
  - Campos nuevos de la sala: `modo:"rotacion"`, `grupos`, `temaGeneral`, `debate:{n,pregunta,A,B}|null`, `tramo`, `finVoto`, `ranking`, `debates:[{n,pregunta,A,B,ganador,puntajeA,puntajeB}]`, `ultimo`.
  - `veredicto`, cuando la ceremonia ya se reveló: `{ campeon, ranking, mejor }`.

- [ ] **Paso 1: estado público**

En `estadoPublico()`:
- Reemplazar `const R = RONDAS[S.ronda];` por `const R = tramoActual();`.
- Agregar al objeto que devuelve:

```js
    modo: "rotacion", grupos: S.clase.grupos, temaGeneral: S.clase.tema || SESION.tema,
    debate: S.debate ? { n: S.debate.n, pregunta: S.debate.pregunta, A: S.debate.A, B: S.debate.B } : null,
    tramo: S.tramo, finVoto: S.fase === "votando" ? S.finVoto || null : null,
    ranking: (S.clase.ranking || []).map(f => ({ grupo: f.grupo, debates: f.debates, puesto: f.puesto, distincion: f.distincion,
      jurado: f.jurado === null ? null : +f.jurado.toFixed(1), publico: f.publico === null ? null : +f.publico.toFixed(1),
      puntaje: f.puntaje === null ? null : +f.puntaje.toFixed(1) })),
    debates: S.clase.debates.map(d => ({ n: d.n, pregunta: d.pregunta, A: d.A, B: d.B,
      ganador: d.res ? d.res.ganador : null,
      puntajeA: d.res ? +d.res.A.puntaje.toFixed(1) : null, puntajeB: d.res ? +d.res.B.puntaje.toFixed(1) : null })),
    ultimo: S.clase.ultimo ? { n: S.clase.ultimo.n, pregunta: S.clase.ultimo.pregunta, A: S.clase.ultimo.A, B: S.clase.ultimo.B,
      ganador: S.clase.ultimo.res.ganador,
      resA: { jurado: +S.clase.ultimo.res.A.jurado.toFixed(1), publico: S.clase.ultimo.res.A.publico === null ? null : +S.clase.ultimo.res.A.publico.toFixed(1), puntaje: +S.clase.ultimo.res.A.puntaje.toFixed(1) },
      resB: { jurado: +S.clase.ultimo.res.B.jurado.toFixed(1), publico: S.clase.ultimo.res.B.publico === null ? null : +S.clase.ultimo.res.B.publico.toFixed(1), puntaje: +S.clase.ultimo.res.B.puntaje.toFixed(1) } } : null,
```

- Reemplazar la línea `veredicto:` por:

```js
    veredicto: S.fase === "fin" && S.veredictoRevelado ? resumenFinal() : null,
```

- Reemplazar `resumenVeredicto` completa por:

```js
function resumenFinal() {
  const r = S.clase.ranking || [];
  const mejor = mejorIntervencion(S.historial.map(h => ({ autor: h.autor, grupo: h.grupo, debate: h.debate, total: h.ev.rubrica.total })));
  return { campeon: r[0] && r[0].debates ? r[0].grupo : null,
           ranking: r.map(f => ({ grupo: f.grupo, puesto: f.puesto, puntaje: f.puntaje === null ? null : +f.puntaje.toFixed(1) })),
           mejor: mejor ? { autor: mejor.autor, grupo: mejor.grupo, debate: mejor.debate, total: +mejor.total.toFixed(1) } : null };
}
```

- [ ] **Paso 2: estado privado y restauración**

En `estadoPrivado()`, agregar `clase: S.clase, debate: S.debate, tramo: S.tramo, finVoto: S.finVoto || null,`.

En `restaurar`, dentro de `if (priv && priv.historial) {`, agregar:

```js
    if (priv.clase) S.clase = { ...S.clase, ...priv.clase };
    S.debate = priv.debate || null; S.tramo = priv.tramo || 0;
    // un tramo abierto vuelve pausado (se reanuda con el botón); una votación, sin reloj
    S.fase = priv.fase === "abierta" ? "listo" : priv.fase === "cerrando" ? "votando" : priv.fase || "propuesta";
    if (S.debate) window.alCambiarDebate?.(S.debate.n);
```

y reemplazar el `$("btnPrincipal").textContent = …` de esa función por:

```js
    $("btnPrincipal").textContent = { propuesta: "PUBLICAR PREGUNTA", listo: "▶ REANUDAR TRAMO", votando: "CERRAR VOTACIÓN",
      resultado: "SEGUIR ▶", fin: "🏆 VER CAMPEÓN" }[S.fase] || "PUBLICAR PREGUNTA";
    if (S.fase === "resultado") S.fase = "propuesta";
```

Borrar las líneas de `restaurar` que tocan `S.publicoSnaps`, `S.publicoBase` y `AUDIENCIA`.

- [ ] **Paso 3: votos por debate, grupos conectados, roster y mover alumnos**

En `activarOnline()`:
- Borrar la suscripción `onSnapshot(collection(db, "salas", ON.codigo, "publico"), …)`, las funciones `fotoPublico` y `calcPublico`, y los `envolver("abrirRonda", …)` y `envolver("ceremonia", …)` que llaman a `fotoPublico`. En su lugar quedan `envolver("abrirRonda")` y `envolver("cerrarRonda")` sin función `despues`.
- Agregar el `import` de `where` en la línea de imports de Firestore.
- Agregar:

```js
  window.publicarEstado = publicar;
  window.gruposConectados = () => [...new Set(Object.values(ON.jugadores).map(j => j.grupo).filter(g => g > 0))].sort((a, b) => a - b);
  window.rosterRemoto = () => !S.debate ? [] : Object.values(ON.jugadores)
    .filter(j => j.grupo === S.debate.A || j.grupo === S.debate.B)
    .map(j => ({ nombre: j.nombre, equipo: j.grupo === S.debate.A ? "A" : "B", grupo: j.grupo }));
  window.moverAlumno = (uid, grupo) => setDoc(doc(db, "salas", ON.codigo, "jugadores", uid), { grupo }, { merge: true })
    .catch(e => tick("No se pudo mover al alumno: " + e.code));
  window.alCambiarDebate = n => suscribirVotos(n);
```

- Y fuera de `activarOnline`:

```js
// El público del debate n: cada votante parte en 0; su posición final es su voto (voto suave).
let desuscribirVotos = null;
function suscribirVotos(n) {
  desuscribirVotos?.();
  desuscribirVotos = onSnapshot(query(collection(db, "salas", ON.codigo, "votos"), where("debate", "==", n)), snap => {
    const votantes = [];
    snap.forEach(d => { const x = d.data(); if (typeof x.pos === "number") votantes.push({ uid: x.uid, nombre: x.nombre, email: x.email, grupo: x.grupo, inicial: 0, final: x.pos, aporte: 0 }); });
    const v = votosSuaves(votantes.map(x => x.final));
    S.publico = { A: v.A, B: v.B, n: v.n, votantes };
    pintarMarcador(); publicar();
  });
}
```

- [ ] **Paso 4: sala nueva y comienzo de los debates**

En `crearSala()`, después de `S.etapa = "portada";`:

```js
  S.clase = { grupos: ROT.GRUPOS_DEFECTO, tema: SESION.tema, debates: [], propuesta: null, evaluado: 0 };
  S.fase = "propuesta";
```

En `irA(etapa)`, reemplazar `if (etapa === null) tick(…)` por:

```js
  if (etapa === null) {
    tick("Comienza la rotación: revisa la primera pregunta de la moderadora.");
    if (S.fase === "propuesta" && !S.debate) mostrarPropuesta();
  }
```

- [ ] **Paso 5: revisión de sintaxis y prueba en línea**

Correr en WSL la revisión de sintaxis de `online.js` como módulo:
`mkdir -p /tmp/chk && cp online.js /tmp/chk/online.mjs && node --check /tmp/chk/online.mjs`.
Esperado: sin salida.

Hacer push. Esperar que <https://naimbro.github.io/tribuna/index.html> sirva la versión nueva de `online.js`. Crear una sala con «🌐 CREAR SALA ONLINE», pasar la portada y la intro.
Esperado: el panel de propuesta dice «Faltan grupos con alumnos conectados», porque todavía nadie eligió grupo. La consola no muestra errores.

- [ ] **Paso 6: commit**

```bash
git add online.js index.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Online: estado de la rotación, votos por debate, grupos conectados y restauración

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 7: portada con grupos e intro de la rotación

**Archivos:**
- Modificar: `escenas.js`: `mostrarPortada`, `actualizarPortada` y `laminasIntro`.
- Modificar: `index.html`: CSS de `.po-grupos` y `.po-cfg`.

**Interfaces:**
- Consume: `S.clase.grupos` y `S.clase.tema` (Tarea 3); `window.moverAlumno` y `window.publicarEstado` (Tarea 6); jugadores con `grupo` (Tarea 8).
- Produce: la portada agrupa a los alumnos por grupo. Tiene controles para el número de grupos y el tema general, y mueve a un alumno de grupo con un clic en su foto.

- [ ] **Paso 1: controles de la portada**

En `mostrarPortada`, reemplazar `<div class="po-tema">…</div>` por:

```js
        <div class="po-cfg">
          <label>Tema general <input id="poTema" value="${escHtml(S.clase.tema || SESION.tema)}"></label>
          <label>Grupos <select id="poGrupos">${Array.from({ length: ROT.GRUPOS_MAX - ROT.GRUPOS_MIN + 1 }, (_, i) => i + ROT.GRUPOS_MIN)
            .map(g => `<option ${g === S.clase.grupos ? "selected" : ""}>${g}</option>`).join("")}</select></label>
        </div>
```

y al final de la función:

```js
  $("poTema").onchange = e => { S.clase.tema = e.target.value.trim().slice(0, 200) || SESION.tema; window.publicarEstado?.(); };
  $("poGrupos").onchange = e => { S.clase.grupos = +e.target.value; window.publicarEstado?.(); actualizarPortada(window.jugadoresSala?.() || {}); };
```

El pie de la portada dice: `Entren con su cuenta de Google y elijan un grupo. Cada grupo debate y vota por turnos.`

- [ ] **Paso 2: los alumnos, agrupados**

Reemplazar el cuerpo de `actualizarPortada(jugadores)` después de calcular `lista`:

```js
  const N = S.clase.grupos;
  const enGrupo = g => lista.filter(j => j.grupo === g);
  const sinGrupo = lista.filter(j => !(j.grupo > 0));
  $("poCuenta").innerHTML = `<b>${lista.length}</b> en la sala${sinGrupo.length ? ` <span style="color:var(--dim)">· ${sinGrupo.length} eligiendo</span>` : ""}`;
  let nuevos = 0;
  const cara = j => {
    const nuevo = !PORTADA.vistos.has(j.uid);
    if (nuevo) { PORTADA.vistos.add(j.uid); nuevos++; }
    return `<div class="po-j ${nuevo && !PORTADA.primera ? "llega" : ""}" data-uid="${j.uid}" title="Clic para mover de grupo">${avatarHtml({ ...j, equipo: "" }, 50)}<div class="po-n">${escHtml(j.nombre)}</div></div>`;
  };
  g.innerHTML = `<div class="po-grupos">${Array.from({ length: N }, (_, i) => i + 1).map(k =>
      `<div class="po-g"><div class="po-gk">GRUPO ${k} <span>${enGrupo(k).length}</span></div>${enGrupo(k).map(cara).join("")}</div>`).join("")}</div>
    ${sinGrupo.length ? `<div class="po-sin">${sinGrupo.map(cara).join("")}</div>` : ""}`;
  g.querySelectorAll(".po-j").forEach(el => el.onclick = () => {
    const destino = +prompt(`¿A qué grupo mueves a ${el.textContent.trim()}? (1 a ${N})`);
    if (destino >= 1 && destino <= N) window.moverAlumno?.(el.dataset.uid, destino);
  });
  if (nuevos && !PORTADA.primera) sonar("pop");
  PORTADA.primera = false;
```

En `online.js` (`activarOnline`) agregar `window.jugadoresSala = () => ON.jugadores;`.

- [ ] **Paso 3: estilos**

```css
.po-cfg{display:flex;gap:18px;margin:6px 0 12px;color:var(--dim);font-size:13px;flex-wrap:wrap}
.po-cfg input{background:#080d12;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font:600 18px system-ui;width:min(560px,50vw);display:block;margin-top:4px}
.po-cfg select{background:#080d12;color:var(--txt);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font:600 18px system-ui;display:block;margin-top:4px}
.po-grupos{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;width:100%}
.po-g{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start;min-height:110px}
.po-gk{width:100%;font-size:12px;letter-spacing:.2em;color:var(--neon)}
.po-gk span{float:right;color:var(--dim)}
.po-g .po-j{width:64px;cursor:pointer}
.po-sin{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;opacity:.7}
```

- [ ] **Paso 4: intro de la rotación**

Reemplazar `laminasIntro()` por tres láminas:

```js
function laminasIntro() {
  const mm = s => `${Math.round(s / 60)} min`;
  return [
    `<div class="in-k">SEMANA ${SESION.semana} · TEMA GENERAL</div>
     <div class="in-tema">${escHtml(S.clase.tema || SESION.tema)}</div>`,
    `<div class="in-k">CÓMO FUNCIONA</div>
     <div class="in-jueces">
       <div><div class="in-e">🎙</div><b>LA MODERADORA LLAMA</b><span>Plantea una pregunta y llama a dos grupos: uno a favor y otro en contra.</span></div>
       <div><div class="in-e">💬</div><b>DEBATEN</b><span>Apertura (${mm(ROT.SEG_APERTURA)}) y réplica (${mm(ROT.SEG_REPLICA)}), todos en la misma conversación.</span></div>
       <div><div class="in-e">🗳</div><b>LOS DEMÁS VOTAN</b><span>Los grupos que no debaten mueven su deslizador. Después, rotan.</span></div>
     </div>`,
    `<div class="in-k">CÓMO SE GANA</div>
     <div class="in-jueces">
       <div><div class="in-e">⚖</div><b>EL JURADO · 50%</b><span>Una IA que conoce las lecturas pone nota con la rúbrica del curso.</span></div>
       <div><div class="in-e">🗳</div><b>EL PÚBLICO · 50%</b><span>Los votos que el grupo gana entre quienes no debaten.</span></div>
       <div><div class="in-e">🏆</div><b>EL RANKING</b><span>Promedio de cada grupo por debate. Al final de la clase, el campeón.</span></div>
     </div>`
  ];
}
```

- [ ] **Paso 5: revisar en línea**

Hacer push, abrir una sala nueva y seleccionar 4 grupos en la portada.
Esperado: aparecen cuatro columnas «GRUPO 1…4»; la intro tiene tres láminas; la consola no muestra errores.

- [ ] **Paso 6: commit**

```bash
git add escenas.js online.js index.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Portada con grupos, tema general e intro de la rotación

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 8: el teléfono en la rotación

**Archivos:**
- Modificar: `jugar.js`: `mostrarBancadas`, `elegir`, `pintarSala`, `pintarReloj`, `pintarCaja`, `enviar`, `prepararVoto` y `guardarPos`; se agregan `rolEn` y `pintarEntre`.
- Modificar: `jugar.html`: la tarjeta de elección de grupo y el contenedor `#entre`.

**Interfaces:**
- Consume: los campos de la sala de la Tarea 6 (`modo`, `grupos`, `debate`, `tramo`, `fase`, `finVoto`, `ranking`, `ultimo`, `veredicto`); las reglas de la Tarea 2.
- Produce:
  - Jugadores con `{ nombre, email, foto, grupo, equipo:"" }`.
  - Mensajes con `{ tipo:"alumno", uid, nombre, email, grupo, equipo:"A"|"B", debate, tramo, ronda, texto, t }`.
  - Votos en `votos/{n}_{uid}` con `{ uid, debate, pos, nombre, email, grupo, t }`.

- [ ] **Paso 1: el rol en cada debate**

En `jugar.js`, después de `const J = {…}`:

```js
// En la rotación el rol cambia en cada debate: "A" o "B" si mi grupo fue llamado, "P" si voto.
const rolEn = s => {
  if (!s || s.modo !== "rotacion") return J.equipo;
  if (!s.debate || !J.grupo) return null;
  return J.grupo === s.debate.A ? "A" : J.grupo === s.debate.B ? "B" : "P";
};
```

`J.grupo` se inicializa en `null` en el objeto `J`.

- [ ] **Paso 2: elegir grupo**

En `jugar.html`, dentro de `#pBancada .card`, reemplazar la fila de botones A/B y el botón PÚBLICO por `<div id="grupos" class="fila" style="flex-wrap:wrap"></div>`. Reemplazar el texto de aviso por: «Tu grupo debate cuando la moderadora lo llama y vota cuando debaten otros.»

En `jugar.js`, `mostrarBancadas` pinta los botones:

```js
function mostrarBancadas() {
  ["pEntrar", "pJuego", "estado", "caja", "voto", "espera", "fb", "entre"].forEach(id => $(id)?.classList.add("oculto"));
  $("pBancada").classList.remove("oculto");
  $("mocion1").textContent = J.sala.temaGeneral || J.sala.tema;
  const N = J.sala.grupos || 6;
  $("grupos").innerHTML = Array.from({ length: N }, (_, i) => i + 1)
    .map(g => `<button class="btn" data-g="${g}" style="flex:1 0 30%">Grupo ${g}</button>`).join("");
  $("grupos").onclick = e => { const g = +e.target.dataset?.g; if (g) elegirGrupo(g); };
}

async function elegirGrupo(g) {
  J.grupo = g;
  await setDoc(doc(db, "salas", J.codigo, "jugadores", J.uid),
    { nombre: J.nombre, email: J.email, foto: J.foto || "", grupo: g, equipo: "" }, { merge: true });
  await entrarAlJuego();
}
```

En `$("btnEntrar").onclick`, donde hoy se lee `yo.data().equipo`, usar el grupo:

```js
    if (yo.exists() && yo.data().grupo > 0) { J.grupo = yo.data().grupo; await entrarAlJuego(); return; }
    if (!yo.exists()) await setDoc(doc(db, "salas", codigo, "jugadores", J.uid),
      { nombre, email: J.email, foto: J.foto || "", grupo: 0, equipo: "", unido: Date.now() });
    mostrarBancadas();
```

Borrar las funciones `elegir`, `guardarPos` y la lectura del documento `publico/{uid}` en `prepararVoto`.

- [ ] **Paso 3: la pantalla según el rol**

En `entrarAlJuego`, reemplazar el cálculo de `esPublico` y el `prepararVoto()/prepararCaja()` por:

```js
  prepararCaja(); prepararVoto();
```

En `pintarSala`, reemplazar desde `const eq = …` hasta el `$("marca").innerHTML = …` por:

```js
  const rol = rolEn(s);
  const colorRol = { A: s.equipos.A.color, B: s.equipos.B.color, P: "#a78bfa" }[rol] || "var(--dim)";
  $("miBancada").textContent = `Grupo ${J.grupo || "?"}${rol === "A" ? ` · ${s.equipos.A.nombre}` : rol === "B" ? ` · ${s.equipos.B.nombre}` : rol === "P" ? " · votas" : ""}`;
  $("miBancada").style.color = colorRol; $("miBancada").style.borderColor = colorRol;
  const d = s.debate;
  $("tramoLbl").textContent = d ? `Debate ${d.n} · ${s.tramo === 1 ? "Réplica" : "Apertura"}.` : "Rotación.";
  $("pauta").textContent = d ? `«${d.pregunta}» — Grupo ${d.A} a favor, Grupo ${d.B} en contra.` : "Esperando la primera pregunta.";
  $("marca").innerHTML = "";
  const debatiendo = rol === "A" || rol === "B";
  $("caja").classList.toggle("oculto", !debatiendo);
  $("voto").classList.toggle("oculto", rol !== "P");
  document.body.classList.toggle("es-publico", rol === "P" && !s.veredicto);
  // cambio de debate: mi grupo fue llamado → aviso; si voto → deslizador al centro
  if (d && J.debateVisto !== d.n) {
    J.debateVisto = d.n;
    if (debatiendo) { navigator.vibrate?.([120, 60, 120]); $("notaCaja").textContent = `🎙 Tu grupo debate ${s.equipos[rol].nombre}. Escribe cuando se abra el tramo.`; $("notaCaja").classList.add("ati"); }
    if (rol === "P") { $("rngPos").value = 0; $("lblPos").textContent = "indeciso"; J.votoDe = null; }
  }
  if (rol === "P" && d && J.votoDe !== d.n && (s.fase === "abierta" || s.fase === "votando")) { J.votoDe = d.n; guardarVoto(0); }
  pintarEntre(s);
```

(`pintarEspera(s)`, `pintarFeedback(s)` y la llamada a la ceremonia se mantienen después.)

- [ ] **Paso 4: votar**

Reemplazar `prepararVoto` por:

```js
async function guardarVoto(v) {
  const s = J.sala; if (!s || !s.debate) return;
  const n = s.debate.n;
  await setDoc(doc(db, "salas", J.codigo, "votos", `${n}_${J.uid}`),
    { uid: J.uid, debate: n, pos: Math.round(v), nombre: J.nombre, email: J.email, grupo: J.grupo, t: Date.now() });
}
function prepararVoto() {
  const r = $("rngPos");
  const pinta = () => { $("lblPos").textContent = describePos(+r.value); };
  r.oninput = () => {
    pinta();
    clearTimeout(J.guardandoPos);
    J.guardandoPos = setTimeout(() => guardarVoto(+r.value)
      .then(() => { $("avisoVoto").textContent = "✓ guardado"; $("voto").classList.remove("pide"); })
      .catch(e => $("avisoVoto").textContent = "No se guardó: " + e.code), 300);
  };
  pinta();
}
```

- [ ] **Paso 5: escribir**

En `pintarCaja`, la condición de apertura pasa a `const abierta = J.sala.fase === "abierta" && (rolEn(J.sala) === "A" || rolEn(J.sala) === "B");`, y la primera línea `if (J.equipo === "P" || !J.sala) return;` pasa a `if (!J.sala) return;`.

En `enviar`, el objeto del mensaje es:

```js
      { tipo: "alumno", uid: J.uid, nombre: J.nombre, email: J.email, grupo: J.grupo, equipo: rolEn(J.sala),
        debate: J.sala.debate.n, tramo: J.sala.tramo, ronda: J.sala.ronda, texto: texto.slice(0, 1500), t: Date.now() }
```

- [ ] **Paso 6: entre debates**

En `jugar.html`, después de `<div id="fb" …>…</div>`:

```html
<div id="entre" class="capa oculto"></div>
```

En `jugar.js`:

```js
// Entre dos debates: la moderadora prepara la pregunta, o el resultado del que terminó.
function pintarEntre(s) {
  const el = $("entre");
  const toca = s.modo === "rotacion" && s.etapa == null && (s.fase === "propuesta" || s.fase === "resultado" || s.fase === "cerrando");
  el.classList.toggle("oculto", !toca);
  if (!toca) return;
  const u = s.ultimo, mio = (s.ranking || []).find(f => f.grupo === J.grupo);
  const res = (g, r) => `<div style="--c:${g === u.A ? s.equipos.A.color : s.equipos.B.color}"><b>Grupo ${g}</b>${r.puntaje} pts<br><small>jurado ${r.jurado} · público ${r.publico ?? "—"}</small></div>`;
  el.innerHTML = (u && s.fase !== "propuesta" ? `
      <div class="k">Debate ${u.n} · resultado</div>
      <div class="es-mocion" style="font-size:17px">«${esc(u.pregunta)}»</div>
      <div class="es-lados">${res(u.A, u.resA)}${res(u.B, u.resB)}</div>
      <h1 style="margin-top:14px">${u.ganador ? `Gana el Grupo ${u.ganador === "A" ? u.A : u.B}` : "Empate"}</h1>`
    : `<div class="k">Rotación</div><h1>La moderadora prepara la próxima pregunta…</h1>`) +
    (mio && mio.puesto ? `<div class="es-papel">Tu grupo va <b>#${mio.puesto}</b> con ${mio.puntaje} puntos.</div>`
      : J.grupo ? `<div class="es-papel">Tu grupo todavía no debate.</div>` : "");
}
```

- [ ] **Paso 7: el reloj de la votación**

En `pintarReloj`, antes de la rama `else`:

```js
  } else if (s.fase === "votando" && s.finVoto) {
    const resta = Math.max(0, Math.ceil((s.finVoto - Date.now()) / 1000));
    el.textContent = `0:${String(resta).padStart(2, "0")}`;
    el.classList.toggle("urgente", resta <= 10);
```

La condición del tramo usa `s.seg` y `s.abreEn`, que la Tarea 6 sigue publicando.

- [ ] **Paso 8: revisión de sintaxis y prueba**

Correr en WSL la revisión de `jugar.js` como módulo, igual que en la Tarea 6.
Esperado: sin salida.

Hacer push. En una sala nueva, abrir `jugar.html?sala=CODIGO` en otra pestaña con la misma cuenta y elegir «Grupo 2».
Esperado: la portada del profesor muestra la foto en la columna «GRUPO 2», y el teléfono dice «¡Estás dentro!».

- [ ] **Paso 9: commit**

```bash
git add jugar.js jugar.html
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Teléfono: elegir grupo, rol por debate, voto por debate y pantalla entre debates

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 9: resultado entre debates, ranking y ceremonia final

**Archivos:**
- Modificar: `escenas.js`: agregar `mostrarResultadoDebate`, `tablaRanking` y `ceremoniaRanking`.
- Modificar: `app.js`: `pintarJueces` agrega los tres primeros del ranking.
- Modificar: `index.html`: CSS de `#resultado`, `.rk` y el bloque `#top3`.
- Modificar: `jugar.js`: `ceremonia(s, v)` muestra el ranking final.

**Interfaces:**
- Consume: `S.clase.ranking`, `S.clase.ultimo` (Tarea 4); `mejorIntervencion` (Tarea 1); `confeti`, `sonar`.
- Produce:
  - `mostrarResultadoDebate(ultimo, rankingAntes, rankingDespues, alTerminar)`: se cierra sola a los `ROT.SEG_RESULTADO` segundos.
  - `ceremoniaRanking()`: marca `S.veredictoRevelado = true` y publica.
  - `tablaRanking(filas, antes) → string` (HTML).

- [ ] **Paso 1: la tabla del ranking**

```js
function tablaRanking(filas, antes = []) {
  const puestoAntes = g => (antes.find(f => f.grupo === g) || {}).puesto;
  const fmt1 = v => v === null || v === undefined ? "—" : v.toFixed(1);
  return `<table class="rk"><tr><th></th><th>Grupo</th><th>Debates</th><th>Jurado</th><th>Público</th><th>Puntaje</th></tr>
    ${filas.map(f => {
      const pa = puestoAntes(f.grupo), mov = pa && f.puesto ? pa - f.puesto : 0;
      return `<tr class="${f.debates ? "" : "sin"}"><td class="pu">${f.puesto ?? "·"}${mov > 0 ? `<i class="sube">▲${mov}</i>` : mov < 0 ? `<i class="baja">▼${-mov}</i>` : ""}</td>
        <td><b>Grupo ${f.grupo}</b>${f.distincion === "jurado" || f.distincion === "ambos" ? ` <span class="dis">★ mejor argumentado</span>` : ""}${f.distincion === "publico" || f.distincion === "ambos" ? ` <span class="dis">♥ favorito del público</span>` : ""}</td>
        <td>${f.debates || "sin debatir"}</td><td>${fmt1(f.jurado)}</td><td>${fmt1(f.publico)}</td><td class="pt">${fmt1(f.puntaje)}</td></tr>`;
    }).join("")}</table>`;
}
```

- [ ] **Paso 2: el resultado de cada debate**

```js
function mostrarResultadoDebate(u, antes, despues, alTerminar) {
  $("resultado")?.remove();
  const r = u.res, gana = r.ganador ? u[r.ganador] : null;
  const lado = (k, c) => `<div class="rs-lado" style="--c:${c}"><div class="rs-g">GRUPO ${u[k]}</div><div class="rs-p">${r[k].puntaje.toFixed(1)}</div>
    <div class="rs-d">jurado ${r[k].jurado.toFixed(1)} · público ${r[k].publico === null ? "—" : r[k].publico.toFixed(1)}</div></div>`;
  const el = document.createElement("div");
  el.id = "resultado";
  el.innerHTML = `<div class="rs-k">DEBATE ${u.n} · RESULTADO</div>
    <div class="rs-q">«${escHtml(u.pregunta)}»</div>
    <div class="rs-vs">${lado("A", EQUIPOS.A.color)}<div class="rs-x">${gana ? `GANA GRUPO ${gana}` : "EMPATE"}</div>${lado("B", EQUIPOS.B.color)}</div>
    ${tablaRanking(despues, antes)}
    <div class="rs-pie"><button class="btn pri" id="rsSeguir">SEGUIR ▶</button></div>`;
  document.body.appendChild(el);
  let hecho = false;
  const fin = () => { if (hecho) return; hecho = true; el.remove(); alTerminar(); };
  $("rsSeguir").onclick = fin;
  setTimeout(fin, ROT.SEG_RESULTADO * 1000);
}
```

En `clase.js`, `accionPrincipal`, la rama `resultado` pasa a `$("rsSeguir")?.click();`, y se borra `mostrarResultadoSeguir`.

- [ ] **Paso 3: la ceremonia final**

```js
function ceremoniaRanking() {
  S.veredictoRevelado = true;
  const filas = (S.clase.ranking || []).filter(f => f.debates > 0);
  const mejor = mejorIntervencion(S.historial.map(h => ({ autor: h.autor, grupo: h.grupo, debate: h.debate, total: h.ev.rubrica.total })));
  $("ceremonia")?.remove();
  const el = document.createElement("div");
  el.id = "ceremonia";
  el.innerHTML = `<div class="cer-k" id="cer0">EL RANKING DE LA CLASE</div>
    <div class="cer-rk">${[...filas].reverse().map((f, i) => `<div class="cer-fila" id="cf${i}"><span class="n">#${f.puesto}</span><b>GRUPO ${f.grupo}</b><span class="p">${f.puntaje.toFixed(1)}</span></div>`).join("")}</div>
    <div class="cer-bloque" id="cerG"><div class="cer-k">CAMPEÓN</div><div class="cer-g" style="color:var(--amber)">${filas[0] ? `🏆 GRUPO ${filas[0].grupo}` : "SIN DEBATES"}</div></div>
    ${mejor ? `<div class="cer-lect" id="cerM">Mejor intervención del día: <b>${escHtml(mejor.autor)}</b>, Grupo ${mejor.grupo}, debate ${mejor.debate} · ${mejor.total.toFixed(1)}/20</div>` : ""}
    <div class="cer-lect" id="cer3"><button class="btn" id="cerCerrar">Cerrar</button></div>`;
  document.body.appendChild(el);
  sonar("redoble");
  const paso = 1100, n = filas.length;
  filas.forEach((_, i) => setTimeout(() => { $("cf" + i)?.classList.add("on"); sonar(i === n - 1 ? "redoble" : "nota", 10 + i); }, 1500 + i * paso));
  const tG = 1500 + n * paso + 1500;
  setTimeout(() => { $("cerG")?.classList.add("on"); sonar("fanfarria"); setTimeout(() => sonar("aplauso"), 500); confeti(["#ffb020", "#ffffff", EQUIPOS.A.color]); }, tG);
  setTimeout(() => { $("cerM")?.classList.add("on"); $("cer3")?.classList.add("on"); }, tG + 2000);
  $("cerCerrar").onclick = () => el.remove();
  window.publicarEstado?.();
}
```

El último `#cfN` es el primer puesto, porque la lista va invertida. Se revela justo antes del bloque del campeón.

- [ ] **Paso 4: los tres primeros en la columna derecha**

En `index.html`, dentro del `<aside>`, antes de `<div class="cab">EL PÚBLICO …`:

```html
    <div class="cab">RANKING <span class="pt">promedio por debate</span></div>
    <div class="top3" id="top3"></div>
```

Al final de `pintarJueces` (app.js):

```js
  const t3 = $("top3");
  if (t3) {
    const r = (S.clase.ranking || []).filter(f => f.debates > 0).slice(0, 3);
    t3.innerHTML = r.length ? r.map(f => `<div class="t3"><span>#${f.puesto}</span><b>Grupo ${f.grupo}</b><i>${f.puntaje.toFixed(1)}</i></div>`).join("")
      : `<div class="vacio">El ranking aparece después del primer debate.</div>`;
  }
```

- [ ] **Paso 5: estilos**

```css
#resultado{position:fixed;inset:0;z-index:58;background:radial-gradient(900px 500px at 50% 30%,#10202b 0%,rgba(3,6,9,.97) 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px}
.rs-k{letter-spacing:.3em;color:var(--amber);font-size:14px}
.rs-q{font:700 26px/1.3 Georgia,serif;max-width:1000px;text-align:center}
.rs-vs{display:flex;gap:26px;align-items:center}
.rs-lado{border-top:4px solid var(--c);background:var(--panel);border-radius:14px;padding:14px 26px;text-align:center;min-width:220px}
.rs-g{letter-spacing:.2em;color:var(--c);font-size:14px}.rs-p{font:800 54px var(--mono)}.rs-d{color:var(--dim);font-size:13px}
.rs-x{font-weight:800;font-size:22px;color:var(--amber);letter-spacing:.1em}
.rk{border-collapse:collapse;min-width:620px;font-size:15px}
.rk th{font-size:10.5px;letter-spacing:.16em;color:var(--dim);text-align:left;padding:4px 10px}
.rk td{padding:6px 10px;border-top:1px solid var(--line)}
.rk tr.sin td{color:var(--dim2)}
.rk .pu{font:700 16px var(--mono);white-space:nowrap}.rk .pt{font:700 17px var(--mono);color:var(--neon)}
.rk .sube{color:var(--neon);font-style:normal;font-size:11px;margin-left:4px}.rk .baja{color:var(--hot);font-style:normal;font-size:11px;margin-left:4px}
.rk .dis{font-size:11px;color:var(--amber);margin-left:6px}
.top3{padding:8px 14px;border-bottom:1px solid var(--line)}
.t3{display:flex;gap:8px;align-items:baseline;padding:3px 0}.t3 span{color:var(--dim);font-family:var(--mono);width:26px}.t3 i{margin-left:auto;font:700 14px var(--mono);font-style:normal;color:var(--neon)}
.top3 .vacio{color:var(--dim2);font-size:12px}
.cer-rk{display:flex;flex-direction:column-reverse;gap:8px;min-width:420px}
.cer-fila{display:flex;gap:16px;align-items:baseline;font-size:26px;opacity:0;transform:translateX(-30px);transition:all .6s}
.cer-fila.on{opacity:1;transform:none}.cer-fila .n{color:var(--dim);font-family:var(--mono);width:52px}.cer-fila .p{margin-left:auto;font-family:var(--mono);color:var(--neon)}
```

- [ ] **Paso 6: la ceremonia en el teléfono**

Reemplazar el cuerpo de `ceremonia(s, v)` en `jugar.js` por:

```js
function ceremonia(s, v) {
  if (!v.ranking) return;                      // salas antiguas sin ranking: no hay ceremonia de rotación
  const el = document.createElement("div");
  el.id = "ceremonia";
  const mio = v.ranking.find(f => f.grupo === J.grupo);
  el.innerHTML = `<div class="k" style="color:var(--amber);font-size:14px">EL RANKING DE LA CLASE</div>
    <div class="cb" id="cG"><div class="cg" style="color:var(--amber)">${v.campeon ? `🏆 Grupo ${v.campeon}` : "Sin debates"}</div>
      <div class="cs">${mio && mio.puesto ? `Tu grupo terminó #${mio.puesto} con ${mio.puntaje} puntos` : "Tu grupo no alcanzó a debatir"}</div>
      ${v.mejor ? `<div class="cmini">Mejor intervención: <b>${esc(v.mejor.autor)}</b> · Grupo ${v.mejor.grupo} · ${v.mejor.total}/20</div>` : ""}</div>
    <button class="btn cb" id="c3" style="max-width:240px">Cerrar</button>`;
  document.body.appendChild(el);
  setTimeout(() => { $("cG")?.classList.add("on"); navigator.vibrate?.([80, 60, 200]); confeti(["#f5b301", "#ffffff", "#38bdf8"]); }, 1500);
  setTimeout(() => $("c3")?.classList.add("on"), 3500);
  $("c3").onclick = () => el.remove();
}
```

- [ ] **Paso 7: probar en local**

Con el servidor local, en la consola, después de los pasos de la prueba de la Tarea 4:

```js
publicarDebate({ pregunta: "Los laboratorios deberían publicar sus evaluaciones de riesgo.", A: 3, B: 4 });
postChat({ tipo: "alumno", nombre: "Carla", equipo: "A", uid: "sim:Carla", texto: "Sin publicación no hay rendición de cuentas." });
cerrarRonda(); cerrarRonda(); await cerrarVotacion();
await new Promise(r => setTimeout(r, 11000));
terminarClase(); ceremoniaRanking();
[S.clase.ranking.filter(f => f.debates).length, !!document.getElementById("ceremonia")]
```

Esperado: `[4, true]`. La pantalla de resultado mostró la tabla con subidas y bajadas, y la ceremonia revela cuatro filas y al campeón.

- [ ] **Paso 8: commit**

```bash
git add escenas.js app.js clase.js index.html jugar.js
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Resultado entre debates, ranking en vivo y ceremonia final del campeón

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 10: panel, CSV, simulación de alumnos y README

**Archivos:**
- Modificar: `admin.js`: `ganadorDe`, `estadoDe` y `partidaHtml`.
- Modificar: `app.js`: `exportarCsv`.
- Modificar: `moderacion.js`: `prepararCompositor` para simular alumnos de un grupo.
- Modificar: `README.md`: una sección «La clase en rotación».
- Modificar: `docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md`, sección 5: los mensajes de anuncio, réplica y cierre usan plantillas y no el modelo, para que salgan al instante. Solo las intervenciones durante los tramos usan el modelo.

**Interfaces:**
- Consume: los campos de la sala de la Tarea 6.
- Produce: el panel muestra el ranking y los debates de cada partida en rotación, y el CSV trae debate y grupo.

- [ ] **Paso 1: panel**

En `admin.js`:

```js
function ganadorDe(s) {
  if (s.modo === "rotacion") return s.veredicto && s.veredicto.campeon ? `Grupo ${s.veredicto.campeon}` : (s.ranking && s.ranking[0] && s.ranking[0].debates ? `Grupo ${s.ranking[0].grupo} (va primero)` : null);
  const v = s.veredicto; if (!v) return null;
  if (v.ganaG) return v.ganaG;
  const noms = [v.ganaP, v.pubN ? v.ganaU : null, v.ganaR].filter(x => x != null);
  const A = s.equipos?.A?.nombre, B = s.equipos?.B?.nombre;
  const a = noms.filter(x => x === A).length, b = noms.filter(x => x === B).length;
  return a > b ? A : b > a ? B : "EMPATE";
}
```

En `estadoDe`, antes de la línea de `fase === "abierta"`:

```js
  if (s.modo === "rotacion") {
    if (s.fase === "fin") return [s.veredicto ? "terminada" : "por revelar", s.veredicto ? "fin" : "vivo"];
    return [s.debate ? `debate ${s.debate.n}` : "sin empezar", s.debate ? "vivo" : ""];
  }
```

En `partidaHtml`, si `s.modo === "rotacion"`, el bloque `.marc` se reemplaza por el ranking y la lista de debates:

```js
  const rot = s.modo === "rotacion";
  const rotHtml = rot ? `<div class="caja" style="margin-bottom:12px"><h3>RANKING</h3>
      ${(s.ranking || []).map(f => `<div class="com"><div class="q"><b>${f.puesto ? "#" + f.puesto : "·"} Grupo ${f.grupo}</b>
        <span style="color:var(--dim)">${f.debates} debate${f.debates === 1 ? "" : "s"} · jurado ${f.jurado ?? "—"} · público ${f.publico ?? "—"}</span>
        <span class="mono" style="margin-left:auto;color:var(--neon)">${f.puntaje ?? "—"}</span></div></div>`).join("")}
      <h3 style="margin-top:12px">DEBATES</h3>
      ${(s.debates || []).map(d => `<div class="com"><div class="q"><b>${d.n}.</b> Grupo ${d.A} vs Grupo ${d.B}
        <span class="mono" style="margin-left:auto">${d.puntajeA ?? "—"} · ${d.puntajeB ?? "—"}</span></div><p>${esc(d.pregunta)}</p></div>`).join("") || `<p style="color:var(--dim)">Sin debates.</p>`}
    </div>` : "";
```

Usar `${rot ? rotHtml : `<div class="marc">…</div>`}` en lugar del bloque `.marc` actual. En la fila, la columna de jugadores de una sala en rotación muestra `${jugadores.length} alumnos`.

- [ ] **Paso 2: CSV**

En `exportarCsv` (app.js):
- La cabecera agrega `"debate", "grupo", "lado"` después de `"ronda"`.
- Cada fila de intervención agrega `h.debate || "", h.grupo || "", EQUIPOS[h.equipo].nombre` en esa posición, reemplazando `EQUIPOS[h.equipo].nombre` que hoy ocupa la columna `equipo`, que pasa a ser el lado.
- Las filas del público salen de `S.clase.debates.flatMap(d => d.votantes.map(v => …))`, con `d.n`, `v.grupo`, `"PÚBLICO"` y `delta_votos = v.final`.

Cabecera final:

```js
  const cab = ["ronda", "debate", "grupo", "lado", "autor", "autor_email", "palabras", "evidencia", "refutacion", "estructura",
    "concesion", "rigor_total", "delta_votos", "conceptos", "banderas", "texto"];
```

- [ ] **Paso 3: simular alumnos de un grupo desde la pantalla del profesor**

En `prepararCompositor`, en `enviar`, reemplazar el `postChat` por:

```js
    // "@Nombre: texto" simula a un alumno del grupo que está en el lado elegido
    const grupo = S.debate ? S.debate[banca] : null;
    for (const p of partirCaja(t, "(profesor)"))
      postChat({ tipo: "alumno", nombre: p.autor, equipo: banca, grupo, uid: "sim:" + p.autor, texto: p.texto });
```

Los botones de lado dicen `A FAVOR · G${S.debate.A}` y `EN CONTRA · G${S.debate.B}`: se actualizan en `pintarMarcador` con `$("chatBanca" + k).textContent = …`.

- [ ] **Paso 4: README y spec**

Agregar al `README.md`, antes de «## Pantalla del profesor»:

```markdown
## La clase en rotación

Una sala es una clase entera. Los alumnos eligen un grupo en la portada (el profesor fija
cuántos: 2 a 10) y la moderadora los hace debatir de a dos, por turnos:

1. **Propuesta.** La moderadora propone una pregunta dentro del tema general y llama a dos
   grupos. El profesor la ve primero: la publica, pide otra, escribe la suya o cambia los
   grupos. Sin acción, sale sola a los 15 segundos.
2. **Apertura y réplica,** 3 minutos cada una, en la misma conversación.
3. **Votación,** 1 minuto: el relator resume y los demás grupos votan con su deslizador.
4. **Resultado:** el puntaje de cada grupo (mitad jurado, mitad público) y el ranking.

La clase sigue hasta «🏁 TERMINAR CLASE». Entonces los teléfonos piden feedback y la
ceremonia revela el ranking y al campeón. La lógica pura está en `rotacion.js` y se prueba con
`node --test pruebas/`. El ciclo está en `clase.js`.
```

En la spec, sección 5, reemplazar «Los escribe el modelo con las reglas actuales.» por: «El anuncio, el paso a la réplica y el cierre usan plantillas, para que salgan al instante. Las intervenciones durante los tramos las escribe el modelo con las reglas actuales.»

- [ ] **Paso 5: commit**

```bash
git add admin.js app.js moderacion.js README.md docs/superpowers/specs/2026-09-19-rotacion-de-grupos-design.md
git -c user.name="Naim Bro" -c user.email="naim.bro@gmail.com" commit -m "Panel y CSV de la rotación, simulación por grupo, README

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Tarea 11: clase simulada de punta a punta, en línea

**Archivos:** ninguno. Si aparece un error, se corrige en la tarea dueña del código, con su propio commit.

**Interfaces:**
- Consume: todo lo anterior, desplegado en GitHub Pages con las reglas de la Tarea 2.

- [ ] **Paso 1: desplegar y esperar**

Hacer push y esperar que `https://naimbro.github.io/tribuna/index.html` sirva la versión nueva de `clase.js`:

`curl -s "https://naimbro.github.io/tribuna/index.html?x=$RANDOM" | grep -o 'clase.js?v=[0-9a-z]*'`

- [ ] **Paso 2: sala y grupos**

En la pestaña del profesor: crear una sala y elegir 4 grupos. En otra pestaña, con la misma cuenta, abrir `jugar.html?sala=CODIGO` y elegir «Grupo 3».
Esperado: en la portada, «GRUPO 3» tiene una foto.

- [ ] **Paso 3: primer debate con el alumno votando**

Pasar la intro. En la propuesta, poner el Grupo 1 contra el Grupo 2 y publicar. Simular dos mensajes por lado con el compositor (`@Ana: …`, `@Beto: …`). En la pestaña del alumno, mover el deslizador a +70.
Esperado:
- En la pestaña del alumno, la caja de escritura está oculta y el deslizador visible.
- En la pestaña del profesor, EL PÚBLICO dice «1 alumno votando» y el hemiciclo tiene un asiento azul.

Cerrar los tramos y la votación con el botón principal.
Esperado: el resultado muestra puntajes con público distinto de «—», y el ranking tiene dos grupos.

- [ ] **Paso 4: llegada tarde a un grupo que debate (foco de revisión 1)**

En la propuesta siguiente, poner el Grupo 3 contra el Grupo 4 y publicar. En la pestaña del alumno, que ya está en el Grupo 3, escribir un mensaje.
Esperado: el teléfono vibra, la caja aparece y el mensaje llega a la conversación del profesor como «A FAVOR» o «EN CONTRA», según el lado que le tocó al Grupo 3.

- [ ] **Paso 5: las reglas rechazan lo indebido (foco de revisión 5)**

En la consola de la pestaña del alumno, que está debatiendo:

```js
const { getFirestore, doc, setDoc } = await import("https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js");
const db = getFirestore();
const n = J.sala.debate.n;
await setDoc(doc(db, "salas", J.codigo, "votos", `${n}_${J.uid}`), { uid: J.uid, debate: n, pos: 50, nombre: "x", email: J.email, grupo: J.grupo, t: Date.now() }).then(() => "ACEPTADO", e => e.code);
```

Esperado: `"permission-denied"`, porque su grupo está debatiendo.

Mientras debaten otros grupos, en un debate donde el Grupo 3 vota:

```js
await setDoc(doc(db, "salas", J.codigo, "mensajes", "prueba" + Date.now()), { tipo: "alumno", uid: J.uid, nombre: "x", email: J.email, grupo: J.grupo, equipo: "A", debate: J.sala.debate.n, tramo: 0, ronda: J.sala.ronda, texto: "hola", t: Date.now() }).then(() => "ACEPTADO", e => e.code);
```

Esperado: `"permission-denied"`.

- [ ] **Paso 6: cerrar la pestaña del profesor a mitad de un tramo (foco de revisión 2)**

Con un tramo abierto, recargar la pestaña del profesor.
Esperado:
- El botón dice «▶ REANUDAR TRAMO».
- La píldora muestra el mismo número de debate y el mismo tramo.
- La columna RANKING conserva los grupos.
- Al reanudar, el reloj corre y la conversación sigue.

- [ ] **Paso 7: terminar la clase**

Apretar «🏁 TERMINAR CLASE» con el debate cerrado.
Esperado: el teléfono del alumno pide feedback. Tras enviarlo o saltarlo, y después de «🏆 VER CAMPEÓN» en el profesor, el teléfono muestra al campeón y el puesto de su grupo.

Abrir `admin.html`.
Esperado: la partida aparece con estado «terminada», ganador «Grupo N», ranking y lista de debates.

- [ ] **Paso 8: archivar la sala de prueba y registrar**

En el panel, archivar la sala de prueba. Anotar en el mensaje final al usuario qué pasos pasaron y cuáles no, con la salida observada.
