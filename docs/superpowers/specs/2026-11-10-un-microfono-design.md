# Tribuna con un solo micrófono — diseño

Fecha: 10 de noviembre de 2026
Estado: aprobado el 10 de noviembre de 2026. Plan: `docs/superpowers/plans/2026-11-10-un-microfono.md`.

## 1. Por qué

El 10-nov-2026, en MGT300 (clase 12, `semana312.js`), el juego falló en dos frentes:

- **La voz.** Cada estudiante hablaba por su propio teléfono con el reconocimiento de voz del
  navegador. Ese reconocimiento no existe o es inestable en varios navegadores (Chrome de iPhone,
  navegadores dentro de apps, Safari), así que a unos el botón les funcionó y a otros no. Este
  diagnóstico sale del código, no de los datos de la sala de hoy.
- **La complejidad.** El profesor tenía un panel de partidas, una pantalla de proyector con motor
  propio, un control en el teléfono con siete interruptores, inscripción con cupos, público,
  termómetro, oráculos, reloj de ajedrez y moderadora con voz. La transcripción se veía en una
  ventana chica.

Lo que pidió el profesor: estar de pie entre los dos grupos haciendo preguntas, sin pensar en la
tecnología; atrás, la transcripción en grande; al final, el veredicto de los jueces de IA. Simple,
elegante, inmersivo, educativo.

## 2. La idea

**El profesor es el micrófono.** Su teléfono (Android con Chrome) es el único aparato que escucha y
el único control. Lo acerca a quien habla y toca el lado que tiene la palabra. Los estudiantes no
usan teléfono.

Hay dos pantallas y nada más:

- **El escenario** (`index.html`), en el notebook conectado al proyector. Solo muestra.
- **El micrófono** (`micro.html`), en el teléfono del profesor. Escucha, decide y manda.

## 3. Qué desaparece y qué queda

Desaparece del juego nuevo: los teléfonos de los estudiantes (entrada con Google, inscripción,
cupos, botón de hablar), el público (voto, termómetro, reacciones, preguntas, oráculos), la brújula,
la rotación de grupos, el reloj de ajedrez, el punto de información, la moderadora y el relator con
voz, la música, el ranking por puntaje, los siete interruptores y el motor heurístico.

Queda: el contenido de cada clase (`contenido/semana*.js`), los perfiles de los cinco jueces y su
piso común, el cálculo del panel (se descartan la nota más alta y la más baja), la función de la
nube `evaluar` y las reglas de Firestore. No hay que desplegar nada.

El juego anterior no se borra: `index.html` pasa a llamarse `clasico.html` y sigue funcionando con
`jugar.html`, `control.html` y `admin.html`.

## 4. Cómo corre una clase

1. **Abrir.** El profesor abre Tribuna en el notebook. Ve las clases disponibles agrupadas por
   curso y elige una. Aparece la sala de espera: el tema, los duelos de la clase y un código QR.
2. **Emparejar.** Escanea el QR con su teléfono. La primera vez entra con Google; después el
   teléfono recuerda la sesión. Hace la prueba de micrófono: dice una frase, la lee en pantalla y
   toca «Se oye bien».
3. **Duelo.** En el teléfono toca «Empezar» en un duelo. El escenario muestra la moción y los dos
   lados. Durante el debate:
   - toca la mitad izquierda o la derecha: ese lado tiene la palabra y lo que dice aparece atrás;
   - toca «Pregunto yo»: lo que dice el profesor aparece centrado, en cursiva;
   - toca de nuevo lo que está activo: el micrófono queda en pausa;
   - «⇄ Era del otro lado» cambia de lado el último párrafo.
4. **Veredicto.** Mantiene apretado «Veredicto» un segundo. El escenario pide manos arriba
   («¿Quién ganó?») mientras los jueces deliberan. Después, cada toque en «Siguiente» revela un
   juez con su nota y su frase; el último toque tacha la nota más alta y la más baja y anuncia al
   ganador.
5. **Síntesis.** Un toque más muestra lo que quedó en disputa y la mejor frase de cada lado, para
   el cierre del profesor.
6. **Siguiente duelo o cierre.** Vuelve la lista de duelos con el resultado del que terminó. «Cerrar
   la clase» muestra el tablero final.

## 5. El escenario

Es una función del estado de la sala: no decide nada, no llama a la IA y se puede recargar en
cualquier momento sin perder nada.

**Estética.** Fondo oscuro con un foco suave, como un teatro. Serif de alto contraste para la
moción, los nombres y el veredicto; sans para la transcripción. Las fuentes se cargan de Google
Fonts con respaldo del sistema: sin red, se ve bien igual. Sin botones a la vista.

**Vistas, según la fase de la sala:**

| Fase | Lo que se ve |
|---|---|
| portada (sin sala) | Entrar con Google si hace falta; las clases por curso; un enlace discreto a «Partidas anteriores y juego clásico» (`admin.html`). |
| `espera` | Tema de la clase, lista de duelos con el resultado de los ya jugados, QR y código de la sala. Cuando el teléfono está conectado, el QR se achica y aparece «Micrófono conectado». |
| `debate` | Arriba, la moción. A los lados, el nombre y cargo de cada lado en su color; el que tiene la palabra se ilumina. Al centro, la transcripción. Abajo, una barra fina con el tiempo de palabra de cada lado y el tiempo total del duelo. |
| `manos` | «¿Quién ganó?», los dos nombres y «manos arriba». Debajo: «Los jueces deliberan». |
| `jueces` | Cinco tarjetas. Cada paso da vuelta una: emoji, nombre, nota de cada lado y sus dos frases. En el paso final se tachan la más alta y la más baja de cada lado, aparece el total sobre 30 y el ganador. |
| `sintesis` | «Lo que quedó en disputa» (dos o tres frases) y la mejor frase de cada lado, entre comillas. |
| `fin` | Todos los duelos con su ganador y su puntaje. |

**La transcripción.** Tamaño `clamp(28px, 2.6vw, 44px)`, legible desde el fondo de la sala. Cada
párrafo lleva el nombre corto de quien habla, en su color: el lado A alineado a la izquierda, el B a
la derecha, el profesor al centro en cursiva. Lo más nuevo abajo; lo viejo sube y se atenúa. El
texto que todavía se está oyendo se ve más claro y se afirma al cerrarse el párrafo.

**El tiempo.** No hay reloj que corte a nadie. La barra muestra cuánto habló cada lado para que el
profesor equilibre a ojo.

## 6. El micrófono

El teléfono es el único cerebro: guarda el estado, abre el micrófono, llama a la IA y escribe todo
en la sala. Mantiene la pantalla encendida (Wake Lock) mientras hay un duelo.

**Pantallas:**

1. **Entrar.** Botón de Google. Solo aparece si no hay sesión.
2. **Prueba de micrófono.** Texto en vivo de lo que oye y un botón «Se oye bien». Si el navegador
   no tiene reconocimiento de voz o el permiso está negado, lo dice con la instrucción exacta para
   arreglarlo.
3. **Duelos.** Un botón grande por duelo («1 · Aghion vs Acemoglu»), con el resultado si ya se jugó.
   Abajo, «Cerrar la clase».
4. **Debate.** De arriba abajo:
   - una línea con lo que el teléfono está oyendo;
   - la pregunta sugerida (💡), con «otra» para pasar a la siguiente;
   - dos mitades grandes, una por lado, con el nombre corto y el color; la activa se ilumina y
     muestra «tiene la palabra»;
   - la barra «Pregunto yo»;
   - abajo, chicos: «⇄ Era del otro lado» y «Veredicto» (mantener apretado 1 s);
   - arriba, «‹ Duelos»: vuelve a la lista sin veredicto, por si se abrió el duelo equivocado. El
     duelo queda sin jugar y se puede retomar.
5. **Veredicto.** Un solo botón grande, «Siguiente», con una línea que dice qué va a mostrar
   («Revelar: La economista»). Mientras se pide manos arriba hay además «Volver al debate», por si
   el veredicto se pidió sin querer.

**Avisos.** Una franja roja arriba cuando el micrófono falla (con qué hacer) y una pastilla «sin
conexión» cuando no hay red. El debate no se bloquea: lo ya transcrito está guardado.

## 7. La voz

- **Motor.** El reconocimiento de voz de Chrome (`SpeechRecognition`, `es-CL`), a través de
  `crearToma` de `dictado.js`, que no se modifica: un reconocedor de una frase a la vez,
  reabierto mientras el lado siga con la palabra. Es la configuración probada en un Android real el
  1-oct-2026 (el modo continuo duplicaba el texto).
- **Párrafos.** Mientras un lado tiene la palabra, su texto se acumula en un párrafo. El párrafo se
  cierra al cambiar de lado, al pausar o a los 30 segundos. Al cambiar de lado no se espera el
  resultado final del reconocedor: el párrafo se cierra con lo que hay y el micrófono reabre de
  inmediato para el que sigue.
- **En vivo.** El texto del párrafo abierto se publica cada 700 ms como mucho, y solo si cambió.
- **Aislado.** Todo lo que toca el reconocedor vive en un módulo (`oido.js`) con una interfaz
  mínima: `abrir(quien)`, `cerrar()`, y los avisos `alTexto`, `alParrafo`, `alFallo`. Si el motor
  del navegador no convence en la sala, se reemplaza ese módulo por uno de servidor sin tocar el
  resto. Ese reemplazo no es parte de este trabajo.
- **Simulado.** Con `?simular=1` el módulo usa un reconocedor falso que entrega frases de un guion.
  Sirve para ensayar sin hablar y para las pruebas en el navegador.

## 8. La IA

Todas las llamadas salen del teléfono hacia la función `evaluar` (o hacia `servidor.py` en modo
ensayo). La transcripción es dato, no instrucción: los prompts lo dicen, como hoy.

**Los jueces.** Al entrar a `manos` se lanzan los cinco en paralelo, con los perfiles de `JUECES`
y el piso de `JUECES_COMUN` de la clase. El prompt es nuevo (`promptJuezVoz` en `duelo.js`) porque
el material cambió: es una transcripción automática de un solo micrófono, puede traer palabras mal
oídas y algún párrafo atribuido al lado equivocado, y las preguntas del profesor no se evalúan. El
formato de respuesta es el de hoy (`{"A": {"nota", "frase"}, "B": {…}}`), se lee con `leerJuez` y
se calcula con `panelJueces` (con cinco notas descarta la más alta y la más baja y suma las tres
del medio sobre 30; con menos, escala; totales iguales son empate). Cada juez tiene 45 s y un
reintento; el que no alcanza se abstiene.
Con menos de tres jueces el panel no tiene quórum: el teléfono ofrece «Reintentar» y el escenario
sigue en «Los jueces deliberan». Nunca se nombra a un estudiante: la transcripción solo conoce
lados.

**La pregunta sugerida.** Privada: solo existe en el teléfono, nunca va a la sala.

- Parte con las contradicciones del dossier: los `CONCEPTOS` marcados ⚡ que nombran a alguno de
  los dos personajes del duelo, mostradas como «⚡ Para Thiel: …».
- Cuando la transcripción creció en unas 120 palabras desde la última sugerencia, y no más de una
  vez cada 45 s, se pide al modelo chico (`uso: "sociedad"`) una pregunta de repregunta de hasta 25
  palabras, dirigida a un lado o a ambos, a partir de la moción, los dos personajes, las ⚡ y los
  últimos párrafos.
- Si la llamada falla, no pasa nada: queda la sugerencia anterior.

**La síntesis.** Se pide junto con los jueces (`uso: "jurado"`): dos o tres frases con lo que quedó
en disputa y la mejor frase de cada lado, citada de la transcripción. Si falla, el paso de síntesis
se salta.

**Tamaño.** `evaluar` acepta hasta 40.000 caracteres y ningún prompt pasa de 38.000. La
transcripción entra con un tope de 30.000, o menos si el resto del prompt lo exige (el material
del curso va con un tope de 9.000, con el dossier de los dos personajes primero). Si se pasa, se
conservan el comienzo y el final, en proporción 8 a 22, con una marca de corte.

## 9. Los duelos de una clase

`duelosDe()` arma la lista a partir del contenido, sin tocar los archivos de las semanas:

- **Con `PERSONAJES`** (308, 312): un duelo por cada entrada de `PREGUNTAS`; los lados son los dos
  personajes de `duelo: {A, B}`, con su nombre, nombre corto, cargo y color.
- **Sin personajes y con `PREGUNTAS`** (7, 14, 307, 402): un debate por pregunta; los lados son
  «A favor» y «En contra» con los colores de `EQUIPOS`. En estas semanas una pregunta puede ser un
  texto suelto o un objeto con `texto`: se aceptan las dos formas.
- **Sin `PREGUNTAS`** (5): un solo debate sobre `SESION.mocion`.

Una semana sin `JUECES` propios (la 5) usa los cinco de `JUECES_DEFECTO`.

Qué grupo encarna a quién se decide en la sala, a viva voz. La aplicación no sabe de estudiantes.

## 10. Datos

Todo cabe en las reglas actuales, porque el teléfono y el notebook entran con la cuenta del
profesor que creó la sala.

**`salas/{codigo}`** (la escribe el teléfono; al crearla, el notebook):

```
profeUid, profeEmail, creada, actualizado
modo: "micro"
curso, semana, tema
fase: "espera" | "debate" | "manos" | "jueces" | "sintesis" | "fin"
duelos: [{ n, pregunta, A: { nombre, corto, cargo, color }, B: { … },
           jugado, ganador: "A" | "B" | "empate" | null, totalA, totalB }]
duelo: n | null                  // el duelo en curso
turno: "A" | "B" | "P" | null    // quién tiene la palabra; null = micrófono en pausa
t0turno: ms                      // cuándo empezó el turno en curso
tiempo: { A: ms, B: ms, P: ms }  // tiempo de palabra ya cerrado en este duelo
t0duelo: ms
veredicto: null | { estado: "deliberando" | "listo" | "sin_quorum",
                    jueces: [{ id, nombre, emoji, A, B, fraseA, fraseB }], panel }
paso: 0…N+1                      // tarjetas de jueces dadas vuelta (N jueces); N+1 = resultado
sintesis: null | { disputa, fraseA, fraseB }
```

**`salas/{codigo}/vivo/voz`**: `{ duelo, quien, texto, t }`. El párrafo abierto. Vacío cuando nadie
habla.

**`salas/{codigo}/vivo/micro`**: `{ t }`. Latido del teléfono cada 10 s; el escenario muestra
«Micrófono conectado» si tiene menos de 25 s.

**`salas/{codigo}/mensajes/{id}`**: `{ tipo: "voz", duelo, quien, texto, t0, t }`. Un documento por
párrafo cerrado. «Era del otro lado» actualiza `quien`.

**`salas/{codigo}/privado/duelo{n}`**: el veredicto completo y la síntesis de cada duelo, para el
registro.

El teléfono es el único que cambia `fase`, `turno`, `paso` y los resultados. Al recargarse lee la
sala y sigue donde estaba, con el micrófono en pausa. No se guarda audio en ninguna parte: solo
texto.

## 11. Piezas

| Archivo | Qué es | Depende de |
|---|---|---|
| `tribuna.css` | Colores, tipografías y el estilo del escenario. | nada |
| `index.html` + `escena.js` | El escenario: portada, espera y las vistas de cada fase. | `canal.js`, `duelo.js`, contenido |
| `micro.html` + `micro.css` + `micro.js` | El teléfono: pantallas, estado, llamadas a la IA. | `canal.js`, `oido.js`, `duelo.js`, `jueces.js`, `rotacion.js`, contenido |
| `oido.js` | La voz: de reconocedor a párrafos. Sin Firestore ni DOM. | `dictado.js` |
| `duelo.js` | Lógica pura: `duelosDe`, transiciones de fase y turno, tiempos de palabra, transcripción para los prompts con su tope, prompts de juez, sugerencia y síntesis, y la lectura de sus respuestas. | nada (recibe el contenido por parámetro) |
| `canal.js` | La sincronización, con dos implementaciones de la misma interfaz: Firestore y local. | Firebase |
| `clasico.html` | El `index.html` actual, renombrado. | lo de hoy |

`canal.js` expone: entrar y salir, crear y leer la sala, escribir cambios parciales, escuchar la
sala, publicar y escuchar la voz en vivo y el latido, agregar y corregir párrafos, escuchar los
párrafos de un duelo, guardar el registro privado y `pedirLLM(prompt, uso)`.

**Modo ensayo** (`?local=1`): la misma interfaz sobre `BroadcastChannel` y `localStorage`, entre
dos pestañas del mismo navegador, sin Google y sin Firestore. La IA va por `servidor.py` si hay
llaves en `.env`; si no, jueces simulados que lo dicen en su frase.

**Cambios en lo existente:**

- `admin.js`: las salas `modo: "micro"` aparecen en la lista con sus duelos y ganadores, «Abrir
  escenario» y «Descargar transcripción» (texto plano con los veredictos). Los enlaces del juego
  clásico apuntan a `clasico.html`.
- `README.md`: una sección nueva al comienzo con el juego nuevo; lo anterior queda bajo «Clásico».
- No cambian `firestore.rules`, `functions/`, `jueces.js`, `dictado.js`, `rotacion.js` ni los
  archivos de `contenido/`.

## 12. Cuando algo falla

| Qué pasa | Qué hace la aplicación |
|---|---|
| El navegador del teléfono no tiene reconocimiento de voz | La prueba de micrófono lo dice y pide abrir la página en Chrome. |
| Permiso de micrófono negado | Franja roja con los pasos para permitirlo; el resto sigue usable. |
| El micrófono se cierra solo varias veces seguidas | Franja roja «El micrófono se cortó, toca un lado para reabrir»; el turno queda en pausa. |
| Sin red durante el debate | Pastilla «sin conexión». Firestore encola los párrafos y los envía al volver. |
| Se recarga o se cierra el teléfono | Al volver a `micro.html?sala=…` retoma la fase y el duelo, con el micrófono en pausa. |
| Se recarga el escenario | Vuelve a pintar desde la sala. |
| Un juez no responde | Se abstiene; con tres o más hay panel. |
| Menos de tres jueces | «Reintentar» en el teléfono. |
| Casi no hay transcripción (menos de 40 palabras entre los dos lados) | Al pedir el veredicto, el teléfono avisa y pide confirmar. |
| Párrafo atribuido al lado equivocado | «⇄ Era del otro lado» sobre el último párrafo, abierto o cerrado. |
| Veredicto pedido sin querer | «Volver al debate» durante `manos`; el resultado de esa deliberación se descarta. |
| Dos teléfonos en la misma sala | No se admite: manda el último que escribe. |

## 13. Pruebas

- **Lógica pura**, con `node --test pruebas/`: `pruebas/duelo.test.js` (duelos de cada tipo de
  clase, transiciones, tiempos, corrección de lado, tope de la transcripción, lectura de sugerencia
  y síntesis, quórum, ganador y empate) y `pruebas/oido.test.js` (párrafos con un reconocedor
  falso: cambio de lado, pausa, corte a los 30 s, fallas). `pruebas/contenido.test.js` suma una
  comprobación: todas las semanas de `SESIONES` producen al menos un duelo válido.
- **De punta a punta en el navegador**, en modo ensayo con el reconocedor simulado: crear sala,
  emparejar, un duelo completo, veredicto paso a paso, síntesis, segundo duelo, cierre, recarga de
  ambas pestañas a mitad de camino, y el escenario a 1920×1080.
- **Lo que no se puede probar desde aquí**, y queda para un ensayo del profesor antes de la
  próxima clase:
  1. El reconocimiento en su Android real con el micrófono abierto varios minutos. Chrome puede
     sonar un «bip» cada vez que reabre el micrófono y pierde palabras si quien habla está a más
     de un brazo.
  2. El camino con Firestore y Google de verdad (crear la sala en el notebook, emparejar el
     teléfono, un duelo corto con los jueces reales).

## 14. Fuera de alcance

- Reconocimiento de voz por servidor, y guardar audio.
- Cualquier participación de los estudiantes desde sus teléfonos.
- Cambios al juego clásico más allá del nombre del archivo y sus enlaces.
- Despliegue de reglas o de funciones.
