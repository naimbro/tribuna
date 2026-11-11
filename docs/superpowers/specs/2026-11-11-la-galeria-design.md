# La galería: el público de Tribuna — diseño

Fecha: 11 de noviembre de 2026
Estado: aprobado el 11 de noviembre de 2026. Plan: `docs/superpowers/plans/2026-11-11-la-galeria.md`.
Se apoya en: `docs/superpowers/specs/2026-11-10-un-microfono-design.md` (Tribuna con un solo micrófono).

## 1. Por qué

En Tribuna con un solo micrófono los estudiantes que no debaten solo miran y levantan la mano. El
profesor quiere que el público esté enganchado: que reaccione, que eso se vea en el proyector, que
tenga en su teléfono el flujo del debate separado por lado, y que haya competencia. El proyector
tiene que seguir siendo minimalista y el profesor no puede ganar botones durante el debate.

## 2. La idea

**La galería** es el público del debate, en sus teléfonos. Sigue el duelo por lado y compite por
quién lo lee mejor. Cinco piezas:

1. **Aplausos contados.** Tres por lado en cada duelo, sobre los párrafos ya dichos.
2. **Pulso.** Un deslizador: «¿quién te va convenciendo?».
3. **Pregunta al profesor.** Una por duelo; llega solo al teléfono del profesor.
4. **Apuesta al veredicto.** A quién le darán la victoria los jueces.
5. **Ronda relámpago.** Hasta dos preguntas de alternativas sobre lo que dijo cada lado, entre la
   apuesta y los jueces.

Los jueces de IA no ven nada de la galería: su veredicto sigue siendo independiente.

## 3. Cómo se juega

### Entrar

En la sala de espera, cuando el micrófono del profesor ya está conectado, el proyector cambia su QR
por el de la galería. El estudiante lo escanea, entra con Google y, si la clase tiene personajes,
elige su grupo. Se elige una vez. Quien llega tarde entra entre duelos, cuando el QR vuelve a
verse.

### Durante el debate

El teléfono muestra cada párrafo cerrado en el color de quien habló (un lado a la izquierda, el
otro a la derecha, las preguntas del profesor al centro) y, abajo, el que se está diciendo.

- **Aplaudir:** tocar un párrafo de un lado. Tocar de nuevo lo retira. Con los tres de un lado
  gastados, hay que retirar uno para dar otro.
- **Pulso:** se mueve cuando se quiera.
- **Pregunta:** hasta 140 caracteres; una vez enviada no se cambia.

Quien pertenece a uno de los dos grupos que debaten ve el flujo, pero en ese duelo no aplaude, no
apuesta, no responde y no suma puntos.

### El veredicto

1. El profesor pide el veredicto. Se cierran los aplausos y el pulso. El proyector pregunta
   «¿Quién ganó?» y la galería **apuesta** en el teléfono; se puede cambiar hasta el cierre.
2. Con el primer «Siguiente» se cierran las apuestas y empieza la **ronda relámpago**, si la IA
   armó preguntas. Cada pregunta toma dos toques: lanzarla y mostrar la respuesta. Antes de
   lanzarla el profesor la lee en su teléfono y puede saltarla.
3. Después siguen los jueces, de a uno, y el resultado, como hoy.
4. Al mostrarse el resultado cada teléfono muestra los puntos que ganó en el duelo y por qué.

### Puntos

| Acierto | Puntos |
|---|---|
| Apostó al ganador de los jueces | 3 |
| Aplaudió el párrafo que los jueces eligieron como el mejor de un lado | 2 por lado |
| El profesor usó su pregunta | 3 |
| Respuesta correcta en la ronda relámpago | 1 por pregunta |

Máximo 12 por duelo. Si los jueces empatan, la apuesta no da puntos a nadie. Si no hubo síntesis o
no hubo ronda, esos puntos simplemente no existen en ese duelo. El pulso no da puntos.

Dos tablas: **individual** (suma de puntos) y **por grupo** (promedio de los puntos de sus
integrantes en la galería, para que no gane el grupo más grande). Las clases sin personajes no
tienen grupos: solo tabla individual.

## 4. El proyector

Sigue siendo una función del estado y sigue sin botones. Lo nuevo:

| Momento | Lo que se agrega |
|---|---|
| Espera | El QR de la galería (cuando el micrófono ya está conectado) y, desde el primer duelo jugado, las dos tablas con los cinco primeros. |
| Debate | Una **línea de pulso** bajo la transcripción: un punto que se desliza hacia el lado que va convenciendo, visible desde tres personas. Una **marca de aplausos** con su número junto a cada párrafo que tenga dos o más. La luz de un lado **respira** una vez cuando le llega un aplauso. Al centro del pie: «la galería, 31 personas». |
| ¿Quién ganó? | «Apuesten en su teléfono» y cuántos ya apostaron. No se muestra hacia dónde. |
| Ronda relámpago | La pregunta en grande con sus alternativas y cuántos respondieron. Al revelar: la correcta marcada y el porcentaje de aciertos. |
| Resultado | Una línea bajo el ganador: «La galería apostó 61 % por Acemoglu. Acertaron 19 de 31.» Si los jueces empatan, dice que nadie acierta. |
| Síntesis | Bajo cada cita, cuántos aplaudieron ese párrafo. |
| Cierre | Las dos tablas completas hasta el quinto lugar, bajo los duelos. |

Nada que escriba un estudiante llega directo al proyector. Los nombres aparecen solo en las tablas,
como nombre e inicial («Antonia R.»), y solo los cinco primeros.

## 5. El teléfono del profesor

Cambia lo mínimo:

- En el debate, las preguntas de la galería entran en el mismo lugar que las sugeridas, marcadas
  «🙋 De Antonia R. (Khan)». Tienen un botón «La uso», que le da los puntos a quien la mandó.
  «otra» pasa a la siguiente, como hoy.
- En el veredicto, la línea sobre «Siguiente» anuncia cada paso de la ronda («Lanzar: ¿Qué
  respondió Thiel cuando…?», «Mostrar la respuesta») y aparece «Saltar esta pregunta».

## 6. La ronda relámpago

- **Qué pregunta.** Qué dijo un lado, no si es verdad: «¿Qué respondió Acemoglu cuando Aghion habló
  del desfase?». La respuesta correcta sale de la transcripción. Se prefieren argumentos a cifras
  exactas, porque los números son lo que peor oye la transcripción automática.
- **Forma.** Hasta dos preguntas por duelo, cuatro alternativas de no más de doce palabras, una
  correcta. Las falsas son cosas que dijo el otro lado o que nadie dijo. Nunca se nombra a un
  estudiante. El teléfono del profesor baraja las alternativas antes de lanzarlas.
- **Cuándo se arma.** Una llamada al modelo (`uso: "jurado"`) al pedir el veredicto, en paralelo
  con los jueces y la síntesis. Si el debate fue muy corto, si la llamada falla o si la respuesta no
  se puede leer, no hay ronda y el flujo sigue como hoy.
- **Riesgo que queda.** Un párrafo atribuido al lado equivocado puede dar una pregunta con la
  respuesta cambiada. Lo cubren «Era del otro lado» durante el debate y la lectura del profesor
  antes de lanzar.
- **En ensayo sin IA:** una pregunta de mentira («¿Quién dijo: “…”?») para poder recorrer el flujo.

## 7. El aplauso certero

La llamada de la síntesis recibe la transcripción con los párrafos numerados y devuelve, además de
lo de hoy, el número del párrafo de donde sacó la mejor frase de cada lado (`mejorA`, `mejorB`). Un
estudiante acierta en un lado si uno de sus aplausos fue a ese párrafo.

## 8. Cómo se sostiene: sin desplegar nada

Las reglas actuales de Firestore alcanzan si los estudiantes entran con Google:

- `salas/{codigo}/jugadores/{uid}`: lo escribe cada estudiante al entrar, con
  `{ nombre, email, equipo: "P", grupo }`. Las reglas dejan fijar el grupo una sola vez.
- `salas/{codigo}/publico/{uid}`: lo escribe cada estudiante; las reglas solo exigen `pos` entre
  −100 y 100 y dejan libres los demás campos. Ahí va todo lo suyo. Lo leen él y el profesor.
- La sala, `vivo/*` y `mensajes` (la transcripción) los puede leer cualquier inscrito.
- `privado/*` solo lo lee el profesor.

**Quién cuenta.** El escenario (el notebook, con la cuenta del profesor) escucha la colección
`publico` y publica los agregados. Así el teléfono del profesor, que ya carga con el micrófono, no
recibe cada toque de cuarenta estudiantes. El escenario sigue pudiendo recargarse: todo lo que
publica se recalcula de lo guardado.

**Lo que no se puede espiar.** Un estudiante puede leer la sala desde su navegador, así que nada
secreto vive ahí antes de tiempo:

- El veredicto, la síntesis y las preguntas de la ronda con su respuesta se guardan en
  `privado/duelo{n}` apenas llegan. En la sala solo se anota que están listos.
- El veredicto completo pasa a la sala al revelar el primer juez, cuando las apuestas ya cerraron.
- La respuesta correcta de cada pregunta pasa a la sala al revelarla.
- Al cerrarse cada ventana (aplausos, apuestas, cada pregunta), el escenario guarda en
  `privado/galeria{n}` lo que cada uno tenía en ese momento. Los puntos se calculan con esa foto:
  cambiar la respuesta después no sirve.

### Datos

**`salas/{codigo}`**, campos nuevos (los escribe el teléfono del profesor):

```
grupos: [{ n, nombre, corto, color }]     // de PERSONAJES; [] si la clase no tiene
duelos[i].A.g, duelos[i].B.g              // el grupo que encarna cada lado (0 si no hay)
fase: … | "quiz"                          // entre "manos" y "jueces"
veredicto: { estado }                     // sin jueces ni panel hasta la fase "jueces"
quiz: null | { i, total, estado: "abierta" | "revelada", texto, opciones: [4], correcta: null | 0…3 }
usadas: ["<uid>_<duelo>", …]              // preguntas de la galería que el profesor usó
```

**`salas/{codigo}/publico/{uid}`** (lo escribe el estudiante):

```
pos: −100…100, nombre, grupo, t
d: { "<n>": { ap: { A: [idParrafo…], B: […] }, apuesta: "A" | "B" | null,
              q: "texto", quiz: { "0": 0…3, "1": 0…3 } } }
```

**`vivo/galeria`** (lo publica el escenario, cada 1,5 s como mucho y solo si cambió):
`{ duelo, n, pulso: −100…100 | null, aplausos: { idParrafo: cantidad }, apostaron, respondieron, t }`

**`vivo/puntos`** (lo publica el escenario al cerrarse cada duelo):
`{ porUid: { uid: { total, duelos: { n: { apuesta, aplausos, pregunta, quiz } } } }, top: [{ nombre, grupo, total }], grupos: [{ n, promedio, miembros }], t }`

**`privado/preguntas`** (lo publica el escenario; lo escucha el teléfono del profesor):
`{ duelo, lista: [{ id: "<uid>_<duelo>", nombre, grupo, texto, t }] }`

**`privado/duelo{n}`** suma `quiz: [{ texto, opciones, correcta }]` y `sintesis.mejorA/mejorB` (ids
de párrafo). **`privado/galeria{n}`**: `{ aplausos, apuestas, quiz }` por `uid`, la foto de cada
cierre.

## 9. Piezas

| Archivo | Acción | Qué hace |
|---|---|---|
| `galeria.js` | crear | Lógica pura con pruebas: nombre corto, quién puede jugar un duelo, aplausos con su tope, agregados (pulso, aplausos, apuestas, respuestas), fotos de cierre, puntos de un duelo, tablas, prompt y lectura de la ronda, barajar. |
| `galeria.html`, `galeria.css`, `butaca.js` | crear | El teléfono del estudiante (su butaca): entrar, elegir grupo, seguir el debate, aplaudir, pulso, pregunta, apuesta, ronda, puntos. |
| `duelo.js` | modificar | `g` en cada lado y `grupos` en la sala; la fase `quiz` en `siguiente` y `etiquetaSiguiente`; el veredicto retenido hasta la fase `jueces`; párrafos numerados para la síntesis y `mejorA/mejorB`. |
| `canal.js` | modificar | Entrar a la galería, leer y escribir el documento propio, escuchar a todo el público (profesor), publicar y escuchar agregados y puntos, leer y escuchar `privado`. En ensayo, cada pestaña puede ser un estudiante distinto (`&yo=ana`). |
| `escena.js`, `tribuna.css` | modificar | Contar a la galería y publicar; pulso, aplausos, respiración de la luz, apuestas, ronda, línea del resultado, tablas, QR de la galería. |
| `micro.js`, `micro.html`, `micro.css` | modificar | Retener y revelar el veredicto; armar la ronda; pasos de la ronda y «Saltar»; preguntas de la galería y «La uso». |
| `admin.js` | modificar | La descarga de una sala incluye la tabla de la galería. |
| `pruebas/galeria.test.js`, `pruebas/duelo.test.js` | crear / modificar | Pruebas de lo anterior. |

No cambian `firestore.rules`, `functions/`, `jueces.js`, `dictado.js`, `oido.js`, `rotacion.js` ni
`contenido/`. El juego clásico no se toca: su `publico.js` es otra cosa y queda como está.

## 10. Cuando algo falla

| Qué pasa | Qué hace la aplicación |
|---|---|
| A un estudiante no le funciona el teléfono o no entra | El debate y el veredicto no dependen de él. Mira el proyector. |
| El escenario está cerrado o recargándose | No se publican agregados mientras tanto; al volver recalcula con lo guardado. Si se perdió el momento de un cierre, usa lo que cada documento tenga al volver. |
| No llega la ronda (falla la IA o el debate fue corto) | No hay ronda; de la apuesta se pasa a los jueces. |
| El profesor salta una pregunta | No se lanza y no da puntos. |
| Se vuelve al debate desde «¿Quién ganó?» | Se reabren aplausos y pulso. Lo apostado queda marcado y se puede cambiar cuando se vuelva a pedir el veredicto. |
| Un estudiante manda una pregunta ofensiva | Solo la ve el profesor, que la pasa con «otra». Nunca llega al proyector ni a la IA. |
| Empate de jueces | Nadie suma por la apuesta. |
| Un estudiante entra tarde | Juega desde el duelo siguiente; lo anterior no se recupera. |
| Dos estudiantes con el mismo nombre corto | Se muestran igual; los puntos van por cuenta, no por nombre. |

## 11. Pruebas

- **Lógica pura** (`node --test pruebas/*.test.js`): tope y retiro de aplausos; exclusión de los
  grupos que debaten; pulso con menos de tres personas; fotos de cierre que ganan a lo escrito
  después; puntos de cada tipo, empate, duelo sin síntesis y sin ronda; promedio por grupo;
  lectura de la ronda (alternativas repetidas, índice fuera de rango, texto envuelto, más de dos
  preguntas); barajar conserva la correcta; fases con y sin ronda; veredicto retenido.
- **De punta a punta en ensayo**, con el escenario, el teléfono del profesor y tres estudiantes en
  pestañas distintas, voz simulada: entrar y elegir grupo, aplaudir hasta el tope, pulso, pregunta
  y «La uso», apuesta, ronda con una pregunta saltada, resultado, puntos en cada teléfono, tablas
  en el proyector, recarga de cada pestaña a mitad de camino.
- **Con datos reales**, desde el Chrome del profesor y su cuenta haciendo también de estudiante:
  que las reglas aceptan `jugadores` y `publico` tal como se escriben y que el escenario cuenta.
- **Lo que no se puede probar desde aquí:** estudiantes con otras cuentas (la lectura de la
  transcripción como inscrito y no como profesor), y cuarenta teléfonos a la vez. Queda para el
  ensayo del profesor con una segunda cuenta y para la primera clase.

## 12. Fuera de alcance

- Entrar sin cuenta de Google (pide desplegar reglas nuevas).
- Reacciones con texto libre o emojis en el proyector.
- Puntos por rapidez.
- Que el profesor cambie a un estudiante de grupo.
- Cualquier cambio al juego clásico.
