# El debate en vivo: revelación, escenario, control y viva voz

Fecha: 2026-09-25. Estado: aprobado por el profesor. Primera clase con esto: martes 29-sep-2026,
MGT300 clase 8 (semana 308, seis personajes, tres duelos).

## Por qué

Hasta ahora Tribuna se jugó escribiendo en el chat. El profesor quiere que se juegue **principalmente
a viva voz**: los dos grupos que debaten pasan al frente y hablan con el teléfono cerca de la boca, y
lo que dicen entra a la conversación. Escribir a mano sigue funcionando igual que siempre.

Tres problemas acompañan el cambio:

- En el minuto de preparación solo preparan los dos grupos llamados; el resto se desconecta.
- La pantalla proyectada es la del profesor: la conversación se ve chica, está llena de botones y
  uno se pierde.
- El teléfono del alumno hace muchas cosas a la vez.

El objetivo es el engagement: que todos estén absorbidos por el debate, que todos tengan que
interiorizar el material y que sea emocionante.

## Resumen

Cuatro piezas, en este orden de construcción:

- **A. Preparación universal, revelación y entrada.** Todos preparan; al final del minuto el relator
  revela quién pasa al frente.
- **B. Escenario y control.** El proyector deja de tener botones; el profesor maneja la clase desde su
  celular.
- **C. Viva voz.** Mantener para hablar, subtítulos en vivo, reloj de ajedrez, punto de información,
  moderadora y relator con voz, el gusano.
- **D. Teléfono simplificado.** Una sola cosa a la vez, según el rol.

**Todo se puede apagar** desde el control (ver «Interruptores»). Apagado, la clase corre exactamente
como hoy. El teclado funciona siempre.

## A. Preparación universal, revelación y entrada

### El ciclo

Hoy: propuesta (en el proyector) → publicar → preparación 60 s (solo los dos grupos ven su lado) →
debate.

Nuevo: **propuesta (solo en el control)** → publicar → **preparación** (60 s, todos) →
**revelación** (~8 s) → **entrada** (20 s, se puede saltar) → debate.

Fases de `S.fase`: `propuesta` → `listo` (preparación) → `revelando` → `entrada` → `abierta` →
`votando` → … Las fases nuevas entran en las listas de `terminarClase`, `accionPrincipal` y la
restauración de la pestaña. Restaurar durante `revelando` o `entrada` salta directo a `abierta`.

### Sin personajes (grupos o brújula)

- **Proyector:** la moción en letras enormes, las dos posiciones en una línea cada una (`favor` /
  `contra`), un anillo de 60 s. Nada más.
- **Teléfonos:** todos ven la moción y las dos posiciones. Nadie sabe si pasa ni de qué lado: **todos
  preparan los dos lados.**
- **La revelación dice grupo y lado a la vez**: «A FAVOR… Grupo 3» (pausa) «EN CONTRA… Grupo 1». El
  emparejamiento y la asignación de lados de hoy (`emparejar`, `emparejarLejanos`, `ladoQueAfirma`)
  no cambian: solo quedan ocultos hasta la revelación.
- **Revancha.** Para que ningún grupo se sienta a salvo, con probabilidad `ROT.P_REVANCHA` (0,25) uno
  de los dos cupos cae en un grupo que ya debatió. Solo si ya hubo al menos un debate y hay al menos
  tres grupos con gente. Función pura en `rotacion.js`, con el azar inyectable para las pruebas. Con
  brújula, la revancha se aplica antes de escribir la moción (que cae sobre lo que separa al par
  final).

### Con personajes (semana 308)

Cada personaje tiene su lado fijo y cada duelo su moción, así que la pregunta de la revelación es
**«¿qué duelo sigue?»**.

- **La propuesta sortea el duelo** entre los que faltan y tienen gente en los dos lados (hoy se juegan
  en el orden de `PREGUNTAS`). El profesor lo ve en el control y puede pedir otro.
- **Proyector:** el tema de la clase y los duelos que quedan como tarjetas: los dos retratos (color y
  nombre del personaje) y su moción en una línea. Anillo de 60 s.
- **Teléfonos:** cada grupo ve las mismas tarjetas, con la suya destacada: «Si sale tu duelo, defiendes
  esto: …». Los seis personajes repasan su dossier.
- **Revelación:** las tarjetas que no tocan se apagan, la elegida viaja al centro, sus dos personajes
  se iluminan y la moción queda en grande.
- **El último duelo** no tiene suspenso: la preparación dice «Último duelo» y la revelación es solo la
  entrada. Se acepta.

### Qué se publica

Durante `listo`, el estado público lleva la moción (sin personajes) o la lista de duelos pendientes
(con personajes), pero **`debate.A` y `debate.B` van en `null`** y, con personajes, también
`debate.pregunta`. Se completan al pasar a `revelando`. Las reglas de `mensajes` solo miran `A`/`B` con
la fase `abierta`, así que no cambian.

### La entrada

20 s de entrada tipo boxeo: «En esta esquina…» con el nombre del grupo o personaje, su color y las
caras de sus integrantes (foto de Google), primero A y después B, con música de entrada. Es el tiempo
que toma caminar al frente. El botón principal la salta.

### Los teléfonos en la revelación

A los integrantes de los dos grupos elegidos, la pantalla se llena con el color de su grupo, vibra y
dice «¡SUBEN AL ESCENARIO!» con su lado. A todos los demás: «Eres tribuna».

### Sonido

Todo sintetizado con WebAudio (sin archivos, sin licencias), en un módulo nuevo `musica.js`:

- **Preparación:** un pulso grave con tic de reloj, que se acelera en los últimos 10 s.
- **Revelación:** redoble creciente y un golpe por cada nombre.
- **Entrada:** un riff rítmico corto.

Silenciable desde el control (interruptor `musica`) y con el 🔊 que ya existe.

## B. Escenario y control

### El escenario (proyector)

`index.html` sigue siendo la pantalla del profesor y el motor sigue corriendo ahí. El botón
**⛶ ESCENARIO** (y `?escenario=1`) pone la clase `escenario` en `body`: se esconden todos los controles
(sala de control, compositor, botones, selectores, ticker) y la conversación se reemplaza por la
vista de escenario. Esc sale del modo.

Una escena a la vez: portada (la de hoy), intro (la de hoy), **preparación**, **revelación**,
**entrada**, **debate**, votación, jueces, resultado y podio (las de hoy, en `escenas.js`).

La **vista de debate del escenario** (módulo nuevo `escenario.js`):

- Dos podios, A FAVOR a la izquierda y EN CONTRA a la derecha, con nombre y color del grupo o
  personaje, las caras de sus integrantes y el **reloj de ajedrez** de cada lado.
- **Subtítulo en vivo** grande bajo el podio de quien está hablando (ver C).
- Los últimos 3–4 mensajes de la conversación, en chico, al centro.
- La moderadora entra como **rótulo inferior** cuando habla.
- **El gusano** en una franja al pie (ver C).
- Las barras de participación, como hoy.
- Las reacciones 🔥🤔🤝 del público suben flotando sobre el mensaje que las recibe.

### El control (celular del profesor)

Página nueva `control.html` + `control.js`. Entra con Google (el mismo profesor) y `?sala=CODIGO`
(fuera del modo escenario, la barra de la sala muestra un QR del control). Muestra:

- La fase y el reloj.
- **Un botón grande con la acción siguiente** (la misma de `accionPrincipal`, con su rótulo:
  PUBLICAR, ABRIR YA, SALTAR ENTRADA, PEDIR VOTACIÓN, CERRAR VOTACIÓN, SALTAR, SEGUIR, VER CAMPEÓN).
- **La propuesta, en privado:** la moción, por qué, los dos grupos o el duelo sorteado, y la cuenta de
  «se publica en 15 s». Acciones: publicar, pedir otra, escribir la propia, cambiar grupos, ⇄ lados.
- Acciones secundarias: **+30 s** (a los dos bancos del reloj de ajedrez, o al tramo si el reloj está
  apagado), **🎙 moderadora ya**, **⚡ shock**, **🏁 terminar clase**.
- Los **interruptores** (abajo).
- Un resumen: quién habla ahora, los dos relojes, cuántos han votado de cuántos.

### Cómo se hablan

- El escenario publica un resumen para el control en `salas/{codigo}/privado/control` (fase, rótulo
  del botón principal, propuesta, relojes, interruptores, conteo de votos). Solo lo lee el profesor
  (regla de `privado` que ya existe).
- El control escribe órdenes en `salas/{codigo}/privado/orden`: `{ cmd, arg, t }`. El escenario ya
  escucha ese documento para `terminar` (desde `admin.html`); ahora además atiende `cmd`, una sola vez
  por `t`. `terminar` sigue funcionando como hoy.
- **No hacen falta reglas nuevas.**
- La propuesta ya no se muestra en el escenario. Sin control abierto, el profesor puede seguir
  usando la pantalla fuera del modo escenario como hoy.

## C. Viva voz

### Mantener para hablar

- En el teléfono de quien debate, un botón enorme: **se aprieta, se habla, se suelta**. Al soltar, el
  texto se envía solo como mensaje, con `voz: true` (se ve con 🎤 en la conversación). Nada de revisar
  antes: tiene que sentirse en vivo.
- Usa `SpeechRecognition` del navegador (`es-CL`, `continuous`, `interimResults`), como el dictado de
  hoy. Máximo 60 s por mensaje: a los 60 s se envía y sigue escuchando si el botón sigue apretado.
- Mantener para hablar también evita el problema de fondo: solo transcribe el teléfono que se está
  apretando, así que los teléfonos de la sala no se transcriben entre ellos.
- **Permiso del micrófono antes del debate:** durante la portada o la preparación, el teléfono ofrece
  «🎤 Probar micrófono» para que el permiso ya esté dado al subir al escenario.
- **Sin reconocimiento de voz** en el navegador (algunos iPhone), el botón no aparece y queda el
  teclado, como hoy.
- **Telemetría antitrampa:** el texto enviado por voz cuenta entero como dictado (como hoy).

### Subtítulos en vivo

Mientras el botón está apretado, el teléfono escribe en su propia ficha
`habla: { debate, t0, t, texto }` cada ~400 ms (el texto provisional hasta 300 caracteres; `t` sirve de
latido). Al soltar escribe `habla: null`. Es el mismo camino que «Grupo N está escribiendo…»
(`escribe`), sin reglas nuevas. Una ficha con `habla.t` de hace más de 2,5 s cuenta como callada (el
teléfono se apagó a mitad).

El escenario muestra ese texto grande bajo el nombre de quien habla. Los teléfonos del público lo
muestran también (ver D).

### Reloj de ajedrez

- Cada lado tiene un banco igual a la mitad de los segundos del tramo (con el tramo de 360 s de la
  rotación, 3:00 cada uno).
- El banco de un lado corre mientras al menos un integrante de ese lado habla (ficha con `habla`
  vigente). Si dos del mismo lado hablan a la vez, corre una vez. Si hablan los dos lados a la vez,
  corren los dos.
- **El tramo termina** cuando se agotan los dos bancos o cuando pasan los segundos del tramo más 90 s
  de margen, lo que ocurra primero.
- **Un lado sin tiempo solo puede escribir**: su botón de hablar se apaga y el teléfono lo dice. Lo
  hace cumplir el teléfono, no las reglas.
- El escenario publica los dos bancos (`reloj: { A, B, corre: { A, B } }`) y el teléfono cuenta
  hacia atrás localmente mientras corre.
- **+30 s** en el control suma a los dos bancos.
- Lógica pura en un módulo nuevo `ajedrez.js`: `avanzar(estado, hablando, dt)` → nuevo estado y
  eventos (`agotado`). Se prueba con `node --test`.

### Punto de información

- Mientras un lado habla, cada integrante del otro lado ve **✋ PUNTO** en su teléfono. Al tocarlo,
  escribe `punto: { debate, t }` en su ficha.
- El escenario toma el pedido más antiguo y publica `punto: { de, nombre, grupo, para, estado, t, fin }`.
  El teléfono de quien está hablando (o, si nadie habla, los de su grupo) muestra «Hawley pide un
  punto: **Aceptar / Rechazar**». Responde escribiendo `respondePunto: { t, acepta }` en su ficha.
- **Aceptado:** quien lo pidió tiene la palabra 15 s (su botón de hablar se enciende aunque no le
  toque; corre el banco de su lado); el escenario lo anuncia. **Rechazado** o sin respuesta en 10 s: se
  anuncia «rechazado» y se cierra.
- Un punto a la vez. Cada lado puede volver a pedir 30 s después de su último pedido.
- La moderadora no entra durante un punto.
- Máquina de estados pura en un módulo nuevo `punto.js`, probada con `node --test`.

### La moderadora y el relator hablan

- En el escenario, los mensajes de la moderadora y del relator se leen en voz alta con
  `speechSynthesis` (la mejor voz en español disponible; se prefiere es-CL, es-US, es-MX, es-ES en ese
  orden, y las voces «Google»). Se quitan @, emojis y markdown. Cola de un mensaje a la vez; lo del
  relator se corta a ~400 caracteres.
- **La moderadora no interrumpe a quien habla.** En `ritmo.js`: si alguien está hablando no entra; con
  la voz encendida, el respiro se mide desde que terminó de hablar el último y baja a 3 s. Las demás
  reglas del ritmo no cambian.
- **La tribuna habla.** Cuando la moderadora lanza una pregunta de la tribuna, el escenario la muestra
  en grande con la foto de quien la escribió, y lo que la moderadora dice en voz alta es «Pregunta de
  la tribuna. Ana, léela en voz alta, por favor».
- A los prompts de la moderadora y los jueces se agrega: los mensajes marcados 🎤 son transcripciones
  automáticas de lo que se dijo en voz alta; no se castigan las muletillas, la puntuación ni los
  nombres propios mal transcritos.

### El gusano y la duda de la tribuna

- La curva del termómetro (la que ya se muestrea con `muestrearTermometro`) corre como una franja al
  pie del escenario, A FAVOR arriba y EN CONTRA abajo, como el «gusano» de los debates por televisión.
- Cuando un mensaje junta suficientes 🤔 (el umbral que ya existe en `publico.js`), el escenario le
  estampa «LA TRIBUNA DUDA».

### La barra de participación

No cambia. Su tope de 40 palabras por mensaje y la meta de 60 por persona hacen que dos
intervenciones habladas llenen la parte de cada uno.

## D. Teléfono simplificado

Solo cambian las vistas de la preparación, la revelación y el debate abierto. La portada, la
inscripción, la brújula, la votación, el resultado y el feedback quedan como hoy.

- **Preparación:** la moción y las dos posiciones (o las tarjetas de duelo, con la propia destacada),
  el anillo del reloj y «🎤 Probar micrófono».
- **Revelación:** la pantalla del color del grupo y «¡SUBEN AL ESCENARIO!», o «Eres tribuna».
- **Quien debate, con el debate abierto:** fondo del color de su grupo; el botón de hablar enorme al
  centro; el reloj de su lado; la última línea que la moderadora le dirigió a su grupo o a él; ✋ PUNTO
  cuando habla el otro lado; el aviso de punto cuando se lo piden. ⌨ abre el compositor de hoy (con
  el dictado 🎤 de hoy) y «ver conversación» abre el hilo completo en un panel.
- **Público, con el debate abierto:** el subtítulo de quien habla (o, en silencio, el último mensaje)
  con 🔥🤔🤝 debajo; el termómetro como deslizador; ✋ para su pregunta (abre una hoja). «Ver
  conversación» abre el hilo completo, con las reacciones por mensaje como hoy.
- Estética: fondo oscuro, tipografía grande, un solo acento de color (el del grupo).

## Interruptores

En `S.clase.opciones`, publicados en el estado de la sala y editables desde el control. Por defecto,
todos encendidos:

| Interruptor | Apagado |
|---|---|
| `revelacion` | La preparación es como hoy: solo los dos grupos, sin revelación ni entrada. |
| `revancha` | Nunca repite un grupo antes de tiempo (sin efecto con personajes). |
| `musica` | Sin pulso, redoble ni música de entrada. |
| `voz` | Sin botón de hablar, subtítulos, reloj de ajedrez ni punto; el tramo dura como hoy. |
| `reloj` | Con voz, sin bancos: el tramo dura como hoy. |
| `punto` | Sin ✋ PUNTO. |
| `vozIA` | La moderadora y el relator no se leen en voz alta. |

## Pruebas

- **Lógica pura, `node --test pruebas/`:** `ajedrez.js` (bancos, simultaneidad, latido vencido,
  agotado, +30 s), `punto.js` (pedido, aceptado, rechazado, vencido, espera de 30 s, uno a la vez),
  `rotacion.js` (sorteo del duelo entre los pendientes con gente, revancha con azar fijo), `ritmo.js`
  (no entra mientras alguien habla; respiro de 3 s con voz).
- **De punta a punta, antes del martes:** una clase completa de la semana 308 contra los emuladores
  con Playwright (ver la nota de la memoria sobre el arnés), 24 teléfonos con cupo 4, un control y el
  escenario. `SpeechRecognition` se reemplaza en los teléfonos por uno simulado que entrega frases con
  resultados provisionales. Se comprueba: la preparación sin A/B publicados, la revelación, la entrada,
  los subtítulos, los bancos, un punto aceptado y uno rechazado, que las órdenes del control llegan, que
  con todos los interruptores apagados el ciclo es el de hoy, y que la semana 307 (brújula) sigue
  corriendo.
- `pruebas/reglas-emulador.cjs` sigue pasando (no hay reglas nuevas).

## Fuera de alcance

- Transcripción en el servidor (Whisper u otro): si el reconocimiento del navegador falla en la sala,
  se evalúa después del martes.
- Voz natural por API para la moderadora.
- Pausar el debate.
