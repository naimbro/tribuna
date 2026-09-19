# TRIBUNA · Rotación de grupos — especificación

Fecha: 19 de septiembre de 2026. Estado: por revisar.

## 1. Objetivo

Hoy una partida es un solo debate: dos bancadas escriben y el resto del curso mira o vota.
Con la rotación, una clase es una sucesión de debates cortos. Todos los alumnos debaten y
todos votan, y la clase termina con un ranking de grupos. La moderadora de IA conduce los
cambios: agradece, plantea la pregunta siguiente y llama a los grupos que siguen.

Éxito significa tres cosas:

- **Participan todos:** cada grupo debate al menos una vez en una clase de una hora con
  seis grupos.
- **Los cambios son rápidos:** entre el fin de una votación y la apertura del debate
  siguiente pasan menos de 30 segundos, sin menús ni reasignaciones.
- **El profesor tiene el control:** ninguna pregunta llega a los alumnos sin haber pasado
  por la pantalla del profesor, aunque sea como cuenta regresiva.

## 2. Decisiones tomadas en la conversación

| Tema | Decisión |
|---|---|
| Formación de grupos | Grupos fijos al entrar. Cada alumno elige grupo en la portada y lo mantiene toda la clase. |
| Formato de cada debate | Corto: apertura (3 min) y réplica (3 min), más un minuto de votación. |
| Duración de la clase | Abierta: los debates siguen hasta que el profesor aprieta «Terminar clase». |
| Preguntas | El profesor fija el tema general. La moderadora propone subtemas a partir del material de la semana y de la dinámica de la discusión. |
| Control del profesor | Publicar, pedir otra, escribir la propia o cambiar los grupos. Sin acción, la propuesta se publica sola a los 15 segundos. |
| Simultaneidad | Un solo debate a la vez. |
| Jueces | El jurado (IA con rúbrica) y el público (los alumnos que no debaten). Sin audiencia sintética. |
| Ranking | Puntaje de 0 a 100 por debate, mitad jurado y mitad público, promediado por debate. |

## 3. Flujo de la clase

1. **Portada.** El profesor fija cuántos grupos hay (por defecto 6) y puede reescribir el tema
   general. Los alumnos entran con Google y eligen grupo. La portada muestra cuántos van en
   cada grupo y sus fotos.
2. **Intro.** Tres láminas: el tema general, cómo funciona la rotación y cómo se gana el
   ranking.
3. **Ciclo de un debate**, repetible:
   1. *Propuesta.* En la pantalla del profesor aparecen la pregunta y los dos grupos llamados,
      con cuenta regresiva de 15 segundos.
   2. *Anuncio.* La moderadora agradece a los grupos anteriores, plantea la pregunta y llama a
      los dos grupos. Los teléfonos cambian de rol.
   3. *Apertura*, 3 minutos. La moderadora pregunta y pasa la palabra.
   4. *Réplica*, 3 minutos. La moderadora pide responder lo más fuerte del otro lado.
   5. *Votación*, 1 minuto. El relator resume y llama a votar. El jurado evalúa en paralelo, y
      la moderadora prepara la propuesta siguiente.
   6. *Resultado*, unos 10 segundos. Quién ganó ese debate y el ranking actualizado.
4. **Terminar clase.** Los teléfonos piden feedback. La pantalla muestra la ceremonia: el
   ranking se revela de abajo hacia arriba, termina en el grupo campeón y reconoce la mejor
   intervención del día.

Los pasos avanzan solos cuando se acaba su tiempo. El profesor puede adelantar cualquiera con el
botón principal, alargar un tramo (+1 MIN) o hacer intervenir a la moderadora en cualquier
momento, como hoy.

## 4. Roles y teléfonos

Cada alumno tiene un **grupo** fijo y, en cada debate, un **rol**: debate A FAVOR, debate EN
CONTRA o vota. El teléfono muestra siempre el grupo y el rol del momento.

**Grupo llamado a debatir:**
- **Aviso:** el teléfono vibra y muestra la pregunta y el lado que le toca.
- **Escritura:** se abre la caja de escritura. Pueden escribir todos los del grupo.
- **Notas:** ven las notas del jurado recién en el resultado.

**Grupo que vota:**
- **Lectura:** lee la conversación en vivo.
- **Voto:** mueve el deslizador, que parte en el centro en cada debate.
- **Llamado:** vibra cuando el relator llama a votar.
- **Sin notas antes de votar:** no ve las notas del jurado hasta el resultado.

**Entre debates:** todos ven «La moderadora prepara la próxima pregunta» y después el
resultado, con el lugar de su grupo.

**Casos borde:**
- **Llegada tarde:** el alumno elige grupo al entrar. Si ese grupo está debatiendo, entra
  directo a escribir.
- **Cambio de grupo:** el alumno puede cambiarse solo mientras la sala está en la portada.
  Después, solo el profesor puede moverlo, desde su pantalla.
- **Grupos vacíos:** un grupo sin integrantes conectados no se llama.

## 5. La moderadora y las preguntas

**Entrada de la propuesta:**
- **Tema general:** el que fijó el profesor, que por defecto es `SESION.tema` con su moción.
- **Material:** `CONCEPTOS`, `FUENTES` y, si existe, la lista `PREGUNTAS` del archivo de la
  semana.
- **Dinámica:** las preguntas ya debatidas, los puntos en disputa que dejó el relator en cada
  debate, lo que el jurado marcó como flojo y los conceptos que nadie ha usado.

**Salida.** Un JSON con cuatro campos:
- `pregunta`: una afirmación discutible de una línea, defendible desde los dos lados con el
  material.
- `porQue`: una línea para el profesor.
- `mejorFavor`: el mejor argumento a favor, en una línea.
- `mejorContra`: el mejor argumento en contra, en una línea.

Los tres últimos campos se muestran solo al profesor.

**Orden de uso:** primero las preguntas de `PREGUNTAS` que no se hayan usado, si el archivo las
trae. Después, las generadas por la IA. Si la IA falla, la propuesta queda vacía y el profesor
escribe la suya.

**Momento:** la propuesta siguiente se genera durante la votación del debate actual, así que
cuando termina el resultado ya está lista.

**Emparejamiento.** Lo decide el código, no la IA:
1. Candidatos: los grupos con al menos un integrante conectado.
2. Primer grupo: el que menos debates lleva; si empatan, el que debatió hace más tiempo.
3. Rival: el siguiente candidato que no se haya enfrentado con el primero. Si todos ya se
   enfrentaron, se permite repetir.
4. Lado: A FAVOR para el grupo que menos veces lo ha tenido.

**Mensajes de la moderadora:** anuncio, preguntas durante los tramos, paso a la réplica y
cierre. El anuncio, el paso a la réplica y el cierre usan plantillas, para que salgan al instante. Las intervenciones durante los tramos las escribe el modelo con las reglas actuales. Nunca sugiere conceptos, autores ni
lecturas que los alumnos no hayan mencionado.

**Controles del profesor sobre la propuesta:**
- Publicar.
- Otra: genera una nueva.
- Escribir la mía: campo de texto.
- Cambiar grupos: dos selectores.

La cuenta de 15 segundos se detiene al tocar cualquier control.

## 6. Puntaje y ranking

**Puntaje de un grupo en un debate**, de 0 a 100:

```
jurado  = promedio de las notas /20 de sus integrantes en ese debate × 5     (0–100; 0 si nadie escribió)
público = votos del lado del grupo / (votos A + votos B) × 100               (50 si nadie se movió)
votos de un lado = Σ tanh(|pos| / 12) de los votantes que terminaron de ese lado (±8 es indeciso y no suma)
puntaje = 0,5 × jurado + 0,5 × público                                         (solo jurado si no hubo votantes)
```

**Ganador del debate:** si el jurado y el público coinciden, gana ese grupo; si no, es empate.
El jurado lo decide la diferencia de notas, con 0,05 como umbral. El público lo decide la
diferencia de votos, con `EMPATE_VOTOS` como umbral. Esta regla solo alimenta el anuncio: el
ranking usa el puntaje.

**Ranking:**
- **Orden:** por puntaje promedio por debate. Empate: mejor promedio del jurado.
- **Columnas:** puesto, grupo, debates jugados, jurado promedio, público promedio y puntaje.
- **Sin debatir:** los grupos que no han debatido van al final con «sin debatir».
- **Distinciones:** «★ mejor argumentado» para quien lidera el jurado promedio y «♥ favorito
  del público» para quien lidera el público promedio, cuando ninguno va primero en el total.

**Dónde se ve:**
- **Marcador de arriba:** los dos grupos del debate en curso («GRUPO 3 · a favor»).
- **Columna derecha:** el jurado y el hemiciclo del debate en curso, más los tres primeros del
  ranking.
- **Pantalla de resultado:** la tabla completa, con animación de subidas y bajadas.
- **Ceremonia final:** el ranking completo y la mejor intervención del día, que es la nota más
  alta del jurado, con el nombre del alumno.

## 7. Datos (Firestore)

**`salas/{codigo}`**, estado público que publica la pantalla del profesor:
- `modo: "rotacion"`, `grupos: N`, `temaGeneral`.
- `debate: { n, pregunta, A: grupo, B: grupo, fase }`, donde `fase` es `"propuesta"`,
  `"abierta"`, `"votando"` o `"resultado"`, y `ronda` es 0 (apertura) o 1 (réplica).
- `ranking: [{ grupo, debates, jurado, publico, puntaje }]`.
- `debates: [{ n, pregunta, A, B, ganador, puntajeA, puntajeB }]`, el historial resumido.
- Se mantienen `etapa`, `abreEn`, `seg`, `veredicto` y los demás campos actuales que sigan
  aplicando.

**`salas/{codigo}/jugadores/{uid}`:** `grupo` entero de 1 a N, o 0 mientras elige. Reemplaza
a `equipo`, y el rol de cada debate se deriva de `debate.A` y `debate.B`.

**`salas/{codigo}/mensajes/{id}`:** se agrega `debate: n`. Los mensajes de alumno llevan
`grupo` y `equipo` (A o B, el lado en ese debate).

**`salas/{codigo}/votos/{n}_{uid}`:** la posición del votante en el debate n. Reemplaza a
`publico/{uid}` para las salas en modo rotación, y guarda un documento por debate para que el
historial quede completo.

**`salas/{codigo}/privado/estado`:** el estado completo del motor, con `debate` y `grupo` en
cada entrada de `historial`, para restaurar la pantalla si se cierra.

## 8. Reglas de seguridad

- **`mensajes`, creación por un alumno:** su `grupo` es `debate.A` o `debate.B`, y su
  `equipo` es el lado que le corresponde. `debate.fase` es `"abierta"` y `debate.n` coincide
  con el del mensaje. El texto tiene entre 1 y 1500 caracteres.
- **`votos/{n}_{uid}`:** lo escribe solo ese alumno. Su grupo no está en el debate n,
  `debate.n == n`, y `debate.fase` es `"abierta"` o `"votando"`. `pos` va de −100 a 100.
- **`jugadores/{uid}`:**
  - El alumno escribe su propio documento. Solo puede cambiar `grupo` si `etapa == "portada"`
    o si todavía es 0.
  - El profesor de la sala puede escribir `grupo` en cualquier documento de jugador.
- **Se mantienen:** las reglas actuales de sala, privado y feedback.

## 9. Componentes

| Archivo | Cambio |
|---|---|
| `rotacion.js` (nuevo) | Lógica pura, sin DOM: emparejamiento, puntaje por debate, ranking y selección de la próxima pregunta. Se puede probar con Node. |
| `app.js` | El ciclo: tramos de 3+3, votación de un minuto, resultado, siguiente. `cerrarRonda` evalúa por grupo. `marcadores` y ceremonia pasan a trabajar por debate y por ranking. |
| `moderacion.js` | Anuncios de la rotación, prompt de propuesta de preguntas y controles del profesor sobre la propuesta. |
| `escenas.js` | Portada con grupos, intro de la rotación, pantalla de resultado entre debates y ceremonia final con el ranking. |
| `online.js` | Publicar `debate`, `ranking` y `debates`. Leer `votos` del debate en curso. Restaurar el debate. Mover alumnos de grupo. |
| `jugar.html` / `jugar.js` | Elección de grupo, rol por debate, deslizador que vuelve al centro y pantalla entre debates. |
| `admin.js` | Detalle por partida: ranking final y lista de debates. |
| `firestore.rules` | Las reglas de la sección 8. |
| `contenido/semana*.js` | `PREGUNTAS` opcional. |
| `README.md` | El modo rotación. |

El modo de un solo debate se reemplaza por el de rotación. Con dos grupos, la rotación
enfrenta siempre a los mismos dos y alterna los lados. Las salas antiguas se siguen viendo en
el panel.

## 10. Tiempos

Todos en constantes de `rotacion.js`:

| Constante | Valor |
|---|---|
| Apertura | 180 s |
| Réplica | 180 s |
| Votación | 60 s |
| Resultado | 10 s |
| Cuenta regresiva de la propuesta | 15 s |

## 11. Errores y recuperación

- **La pestaña del profesor se cierra:** al volver con `?sala=CODIGO`, se restaura el debate
  en curso. Un tramo abierto vuelve pausado y se reanuda a mano, como hoy.
- **El jurado falla:** reintenta una vez y luego usa el lector heurístico, marcado con ⚠, como
  hoy.
- **La propuesta falla:** queda vacía con el aviso «escribe la tuya o pide otra».
- **Nadie de un grupo llamado escribe:** su parte de jurado vale 0, y el resultado lo dice.

## 12. Pruebas

- **Pruebas unitarias con Node:** `pruebas/rotacion.test.js`, con `node:test`, sobre
  `rotacion.js`. Cubre:
  - El emparejamiento: nadie debate dos veces más que otro, no se repiten parejas mientras haya
    alternativas y los lados se alternan.
  - El puntaje: sin votantes, sin movimiento y sin textos.
  - El ranking: orden, desempate y distinciones.
- **Reglas:** prueba en línea con dos cuentas. Una de un grupo que no debate no puede escribir
  en la conversación, y una de un grupo que debate no puede votar.
- **Clase simulada:** en la pantalla del profesor, con el compositor extendido para simular
  alumnos de un grupo («@Nombre (G3): texto»). Se corren tres debates completos y se verifican
  el ranking, la restauración y la ceremonia.

## 13. Fuera de alcance

- Moderadora que corre en el servidor.
- Varios debates simultáneos.
- Torneo con final entre ganadores.
- Grupos armados antes de clase por el profesor.
