# TRIBUNA

Prototipo de debate en equipos con audiencia sintética, para el curso
**CSC00155 — Inteligencia Artificial y Democracia**. La sesión cargada es la
**Semana 5: Populismo y oligarquía de la IA**.

Es un proyecto aparte de `ml2-master-game`: sin Firebase, sin build, sin dependencias.
Tres archivos y se abre en el navegador; `servidor.py` (biblioteca estándar) es opcional y
solo hace falta para el motor LLM con la key en `.env`.

## Correr

```bash
python tribuna/servidor.py
```

y abrir <http://localhost:8777>. También corre con doble clic en `index.html`,
salvo que el navegador bloquee los `<script src>` locales (así solo hay heurístico).

**No usar `python -m http.server` si hay un `.env` en la carpeta**: lo sirve tal cual en
`/.env`, y a toda la red local. `servidor.py` escucha solo en 127.0.0.1 y devuelve 404
para archivos ocultos y `.py`.

El botón **✎ rellenar con ejemplo** carga dos intervenciones escritas a propósito:
la bancada A abre con demagogia (rigor 6/20) y la B con manual de debate (19/20).
Es la forma más rápida de ver los dos marcadores separarse.
Las refutaciones de ejemplo contestan a esas aperturas (el jurado LLM compara contra lo que el
rival dijo de verdad): si se edita una apertura en `EJEMPLOS`, hay que reescribir la
refutación que le responde.

## La idea

Juzgan dos, y pueden apuntar a lados distintos. Ahí está la clase:

| Marcador | Qué mide | Quién juzga |
|---|---|---|
| **LOS JUECES** | panel de cinco jueces de IA independientes (académica, jurista, economista, periodista, activista): tarjetas de 0 a 10 por grupo, se tachan la más alta y la más baja, suman las tres del medio sobre 30 | `jueces.js`; cada semana puede traer los suyos |
| **EL PÚBLICO** | votos que ganó cada bancada entre los alumnos que no debaten, en **voto suave** | los alumnos que entran como PÚBLICO y mueven su deslizador |

Si los dos coinciden, gana esa bancada. Si no coinciden, es empate: una argumentó mejor y la
otra convenció más, y esa brecha es el pie para la síntesis docente. Sin público decide el
jurado; si un marcador empata, decide el otro. El público empata bajo medio voto de diferencia
(`EMPATE_VOTOS` en `app.js`).

En la pantalla del profesor, la columna derecha muestra los dos jueces. Arriba está EL JURADO:
cada criterio de la rúbrica en espejo, el total y el último comentario. Abajo está EL PÚBLICO:
un hemiciclo con un asiento por alumno, ordenado por posición y sin nombres, y cuántos están a
favor, indecisos y en contra. La barra del centro del marcador también es del público.

Los titulares de la sala de control (📰) ya no mueven votos. Se proyectan y entran a la
conversación como «última hora» para que las bancadas los usen o los refuten.

## La conversación y los dos moderadores

El debate es **una sola conversación**, como un grupo de WhatsApp: A FAVOR a la izquierda,
EN CONTRA a la derecha, los moderadores al centro. Todos leen todo en vivo, en el proyector y en
los teléfonos. Se juega en **tramos** (apertura, refutación, cierre; nombres, pautas y minutos
en `RONDAS` de cada semana).

- **🎙 Moderadora (IA).** Durante el tramo lee la conversación e interviene: pide profundizar una
  afirmación gruesa, pregunta de dónde sale un dato o qué significa un concepto (para comprobar
  que el alumno sabe, sin soplarle nunca la respuesta), le pasa la palabra a quien no ha hablado
  y pone a una bancada frente al argumento del otro lado que no ha respondido. Nombra con
  @Nombre; en el teléfono de esa persona el mensaje se destaca y vibra. Interviene sola cada
  25–45 s según cómo avance la conversación, o cuando el profesor pulsa 🎙 MODERADORA.
- **⚖ Relator (IA).** Al pulsar ⚖ PEDIR VOTACIÓN (o al acabarse el reloj) resume con
  neutralidad la posición de cada bancada en el tramo, nombra el punto en disputa, dice qué
  revisar (cosas concretas que se dijeron) y con qué criterios votar, y pide el voto. Sus
  indicaciones llegan a los tres jueces: al **público** (aviso en el teléfono para mover su
  posición), al **jurado** y a la **audiencia sintética** (van en sus prompts).
- **La votación.** El jurado puntúa a cada participante por todos sus mensajes del tramo
  (rúbrica individual, con la conversación del tramo como contexto). La audiencia sintética oye
  a cada bancada como bloque. El resultado aparece en la conversación como una tarjeta: votos de
  la bancada, nota y devolución de cada participante, murmullos de la audiencia.

Los moderadores corren en la pantalla del profesor con el mismo motor que el jurado
(`moderacion.js`); sin motor LLM hablan con plantillas simples. En la pantalla, el compositor
de abajo sirve para escribir por una bancada o simular alumnos con `@Nombre: texto`.

## Sala de control

- **⚡ LANZAR** tira uno de cinco shocks de la semana 5 (la filtración de los terrenos,
  la objeción de Albouy, la encuesta de Heatmap, los US$430 mil millones de filantropía,
  la promesa de abundancia de Musk). Mueve a la audiencia en vivo y sirve de control de ritmo. Lo que
  mueve queda registrado (ticker, veredicto y una fila `SALA DE CONTROL` en el CSV, intercalada en orden cronológico y con la dirección en `banderas`) y fuera
  del marcador de PERSUASIÓN.
- **↓ CSV** exporta una fila por intervención (una por alumno), con autor y correo, los
  cuatro criterios, el total, los conceptos del knowledge base efectivamente usados y las
  banderas. `delta_votos` es lo que movió LA BANCADA en esa ronda, repetido en cada fila suya. Eso es lo que
  convierte esto en instrumento de evaluación y no en veinte minutos entretenidos.
- **⚙ MOTOR** cambia el evaluador (ver abajo).

## Jugar online: cada bancada desde su teléfono

El motor sigue corriendo en la pantalla del profesor (proyector). Firestore solo sincroniza:
la pantalla publica el estado de la sala y recibe lo que escriben las bancadas.

- **Profesor:** abre `index.html` (publicado en GitHub Pages), pulsa **🌐 SALA ONLINE** y
  proyecta el código de 4 letras (**⛶ MOSTRAR CÓDIGO**). Las cajas de texto pasan a ser de
  solo lectura: espejan lo que escribe cada bancada. Abrir, cerrar, shocks, veredicto y CSV
  funcionan igual que en local. Si la pestaña se cierra, `index.html?sala=CODIGO` restaura
  la partida (queda en `salas/{codigo}/privado/estado`), siempre desde el mismo navegador.
- **Alumnos:** `jugar.html?sala=CODIGO` con su nombre y su bancada. **Todos intervienen:**
  cada integrante escribe su propia intervención en cada ronda (la caja fija abajo, como un
  chat; se guarda sola mientras escribe). Al cerrar la ronda, el jurado puntúa a cada uno por
  separado (rúbrica individual, en paralelo) y la sala oye a la bancada como bloque: se mueve
  una vez por bancada y ronda, con el promedio de lo que le haría cada texto (paramétrica) o
  leyendo el conjunto (sociedad de agentes). Así una bancada grande no pesa más por tamaño.
  En el hilo del teléfono cada uno ve su nota marcada como «(tú)». Los borradores solo los ve
  la propia bancada, no la rival.
- **Datos:** `salas/{codigo}` (público para quien tenga el código; solo el creador escribe),
  `jugadores/{uid}` (cada uno el suyo), `intervenciones/{uid}` (una por alumno y ronda; solo
  por su bancada, con la ronda abierta, máximo 4000 caracteres; la lee su bancada y el
  profesor) y `privado/estado` (solo el profesor). Reglas en
  `firestore.rules`. Todos entran **con su cuenta Google** (igual que en `ml2-master-game`):
  el uid es estable, así que el mismo alumno queda identificado de clase a clase y el CSV
  lleva `autor_email`. Salas solo las crea `naim.bro@gmail.com` o un correo listado en la
  colección `profesores/{email}` (la edita el admin desde la consola).
- **Motor LLM online:** Cloud Function `evaluar` (`functions/src/index.ts`, us-central1). La
  key de Anthropic vive en Secret Manager (`ANTHROPIC_API_KEY`) y nunca llega a un navegador;
  la función solo atiende a `naim.bro@gmail.com` o a correos en `profesores`. El profesor
  entra con Google, abre ⚙ MOTOR, elige Anthropic y deja la key vacía: el rótulo dice
  `(servidor TRIBUNA)`. Los alumnos nunca llaman al proveedor. El proyecto está en el plan
  Blaze (cuenta «Firebase Payment») con un presupuesto de alerta de $10.000 CLP/mes. Desplegar:
  copiar `functions/` a un directorio nativo de WSL y `firebase deploy --only functions`
  (desde `/mnt/c` falla por lentitud, como en ml2). En local sigue funcionando `servidor.py`
  con el `.env`.
- **Publicar:** el repo es estático, sin build. GitHub Pages sirve `main` en
  `https://naimbro.github.io/tribuna/` (profesor) y `.../tribuna/jugar.html` (alumnos).
  Proyecto Firebase `tribuna-csc00155` (plan Spark: Firestore + acceso con Google, sin
  Functions). Reglas: `firebase deploy --only firestore:rules` desde WSL con Node 20.
- **Probado el 18-sep-2026** de punta a punta: sala creada, dos alumnos desde orígenes
  distintos (uno desde GitHub Pages), tres rondas escritas desde los teléfonos, jurado LLM +
  sociedad de agentes, veredicto en los teléfonos, restauración de la pestaña del profesor y
  reglas (un alumno no puede tocar la sala, el borrador rival, su borrador con la ronda
  cerrada, ni lo privado).
- **Ojo con la key en Pages:** `localStorage` es por origen. La key pegada en `localhost`
  no está en `naimbro.github.io`; hay que pegarla una vez ahí (⚙ MOTOR). Sin key, el
  juego online corre con el jurado heurístico y la audiencia paramétrica.

## El público real

Los alumnos que no debaten entran como **PÚBLICO** (`jugar.html`, tercer botón). No escriben:
marcan con un deslizador dónde están frente a la moción (−100 en contra … +100 a favor) y lo
mueven cuando algo los convence. Mientras dura el debate no ven las notas del jurado: leen
los textos y votan con criterio propio; al final ven todo.

El profesor toma una foto de las posiciones al abrir cada ronda y al revelar al ganador; lo
que se mueve cada alumno entre dos fotos se le anota a la bancada hacia la que se movió, con
voto suave: `tanh(pos / 12)`, así un voto se gana de a poco alrededor del centro y empujar a
un convencido casi no suma. La ceremonia revela primero al jurado y después al público. En el CSV, una fila por alumno del
público con su posición inicial, final y los votos que aportó (`delta_votos`, + hacia A FAVOR).
Las posiciones individuales solo las ve el profesor.

## Inicio, intro y cierre

Una partida online tiene cuatro escenas (`escenas.js`, más la ceremonia en `app.js`):

1. **Portada.** Toda sala nueva parte aquí: QR, código y los alumnos que van entrando, con su
   foto de Google y su nombre. El anillo de color dice qué eligieron (A FAVOR, EN CONTRA,
   PÚBLICO o gris si todavía eligen). **EMPEZAR ▶** pasa a la intro.
2. **Intro.** Cuatro láminas: tema, moción, las dos posiciones con su lema y cómo se gana.
   Se avanza con clic, → o espacio; **AL DEBATE ▶** abre la pantalla del debate. Los
   teléfonos muestran la moción y el papel de cada alumno. **📖 INTRO** en la sala de control la
   repite, y **⛶ PORTADA** en la barra de la sala vuelve al QR.
3. **Debate.** La conversación de siempre.
4. **Cierre.** Al terminar el último tramo, cada teléfono pide feedback (nota de 1 a 7 y
   un comentario de hasta 300 caracteres; se puede saltar). Después de los tres marcadores, la
   ceremonia **declara al ganador**: quien gana más marcadores (2 de 3, o 2 de 2 sin público),
   con confeti. Si quedan parejos, es empate.

El feedback no se proyecta: se lee en el panel.

## Panel del profesor (`admin.html`)

Todas las salas que creó tu cuenta, agrupadas por curso. Por partida muestra la fecha, el
código, el estado, el ganador, cuántos jugaron en cada rol y el promedio del feedback. Al abrir
una partida se ven los marcadores, los comentarios con nombre, quiénes jugaron, y los botones
para volver a la pantalla, descargar la conversación en `.txt` o archivarla. Desde la cabecera
de cada curso se crea una partida nueva. Las salas vacías y las archivadas se ocultan por
defecto. El curso de cada semana está en `contenido/sesiones.js`.

## La clase en rotación

Quien debate recibe el puntaje de su grupo; quien vota, sus puntos de oráculo (predecir a los jueces).

Una sala es una clase entera. Los alumnos eligen un grupo en la portada (el profesor fija
cuántos: 2 a 10) y la moderadora los hace debatir de a dos, por turnos:

1. **Propuesta.** La moderadora propone una pregunta dentro del tema general y llama a dos
   grupos. El profesor la ve primero: la publica, pide otra, escribe la suya o cambia los
   grupos. Sin acción, sale sola a los 15 segundos.
2. **Apertura y réplica,** 3 minutos cada una, en la misma conversación.
3. **Votación,** 45 segundos: cada votante responde en su teléfono «¿quién te convenció?» y
   «¿a quién elegirá el jurado?». El proyector muestra las barras en vivo y declara al ganador
   del público.
4. **El panel de jueces:** cinco jueces de IA independientes (`jueces.js`; cada semana puede
   definir los suyos en `JUECES`) levantan una tarjeta de 0 a 10 por grupo. Como en los clavados,
   se tachan la más alta y la más baja y se suman las tres del medio, sobre 30.
5. **Resultado:** el puntaje de cada grupo (mitad jueces, mitad público), el ranking de grupos y
   los **oráculos**: quienes predicen mejor a los jueces suman un punto por acierto durante toda
   la clase.

La clase sigue hasta «🏁 TERMINAR CLASE». Entonces los teléfonos piden feedback y la
ceremonia revela el ranking y al campeón. La lógica pura está en `rotacion.js` y se prueba con
`node --test pruebas/`. El ciclo está en `clase.js`.

## Pantalla del profesor

Dos paneles, como el panel de debate de `mapuche_panel`: a la izquierda **el hilo** —una
cabecera por turno (bancada × ronda) con los votos que movió y lo que murmuró la audiencia, y
debajo cada intervención con su rigor en grande y la devolución del jurado— y la mesa de
escritura al pie; a la derecha la audiencia. Sonidos sintetizados con WebAudio al revelar
(aplauso si la bancada ganó votos, abucheo si los perdió, moneda por rigor alto, campana al
abrir ronda); se apagan con 🔊 en el pie.

## Los dos evaluadores

Por defecto corre un **lector heurístico local**: busca los conceptos de
`contenido/semana5.js`, las fuentes citables y las marcas de la rúbrica
(reconstrucción del adversario, concesión, tesis, orden). Es instantáneo y gratis,
pero no entiende un argumento: entiende palabras. Se le puede engañar.

Con una API key (botón **⚙ MOTOR**, Anthropic u OpenAI) un LLM aplica la misma
rúbrica leyendo de verdad, y su devolución de una frase aparece en la tarjeta (⚖).
El jurado LLM recibe además la **transcripción de las rondas anteriores** (las dos
bancadas, rotuladas): juzga la refutación contra lo que el rival dijo de verdad —un hombre
de paja baja el puntaje—, exige que la concesión sea sobre un punto que el rival sostuvo, y
en el cierre puede detectar argumentos nuevos. La ronda en curso no entra, porque se
escribe a ciegas; en la apertura, "refutación" se juzga por anticipación de objeciones.
Esa transcripción va marcada como contexto: una instrucción escondida en el texto de una
bancada no cambia el puntaje de la otra.

Hay dos formas de darle la key:

- **`.env` + `servidor.py` (recomendada).** Un archivo `tribuna/.env` con
  `ANTHROPIC_API_KEY=` y/o `OPENAI_API_KEY=`. En ⚙ MOTOR se elige el proveedor y se deja
  el campo de key vacío: el navegador le pide la evaluación a `/api/evaluar` y es el
  servidor quien llama al proveedor. La key nunca llega al navegador. El rótulo de la
  mesa dice `motor: claude-sonnet-5 (.env)`.
- **Key pegada en el diálogo.** Queda en `localStorage` y va directo al proveedor desde
  el navegador: sirve para probar, **no para una clase real**.

Si el proveedor falla (key inválida, sin saldo, modelo), el ticker muestra el motivo que
dio el proveedor y esa intervención se evalúa con el heurístico.

Ambos evaluadores marcan **INYECCIÓN DETECTADA** cuando el texto intenta dar
instrucciones al evaluador en vez de argumentar: rigor 0 y la sala se da vuelta.
En un curso de IA eso no es un bug, es materia.

## Audiencia sintética (fuera del juego)

Hasta septiembre de 2026 había un tercer juez: LA SALA, seis personajes sintéticos (Camila,
Rodrigo, Fernanda, Ignacio, Marta, Héctor) que sumaban 27 votos. Se sacó del juego para
simplificarlo. Su motor sigue en `app.js` (sección 3) y en `contenido/semana*.js` porque lo
usan `pruebas/simular.js` y `pruebas/escala.js`. Lo que sigue documenta ese experimento.

### Sociedad de agentes (experimental)

En ⚙ MOTOR → AUDIENCIA se puede cambiar la audiencia paramétrica (los pesos `mueve`
escritos a mano) por una **sociedad de agentes**: cada persona es un LLM chico
(`claude-haiku-4-5`) que lee la intervención en crudo y contesta hacia dónde se movió,
cuánto (0–12) y qué murmura. Conoce su posición y recuerda cómo reaccionó a las intervenciones anteriores. **No ve la
rúbrica ni la nota del jurado**: son dos oídos separados. Las seis consultas van en paralelo
(~3 s por intervención); si un agente no contesta, esa persona reacciona con el modelo
paramétrico. La inyección conserva su castigo fijo.

El agente se arma con `oficio`, `registro`, `no_mueve`, `alergias` y `peso_rigor` (traducido a
una actitud frente a la evidencia); no usa `mueve` ni `voz`. Reacciona
primero y pone el número después; y en cada consulta recibe un «ánimo» al azar (ruido a
propósito, como el `ruido` del modelo paramétrico).

Mediciones del 17-sep-2026: aperturas de ejemplo, posiciones iniciales, sin memoria,
movimiento medio hacia quien habla (sd). Tres versiones del prompt:

| | v0 · perfil blando | v1 · «casi nadie cambia» | **v2 · actual** | paramétrica |
|---|---|---|---|---|
| **Apertura demagógica (A)** | | | | |
| CALLE · Ignacio | +6,0 (0,2) | +1,1 (1,3) | **+4,0 (1,9)** | +6,5 |
| TERRITORIO · Héctor | +5,2 (0,4) | +0,4 (0,9) | **+3,8 (1,8)** | +4,7 |
| TRABAJO · Camila | +5,0 (0,0) | +0,6 (1,1) | **+2,7 (2,3)** | +1,2 |
| ESTADO · Fernanda | −0,6 (1,4) | −0,6 (0,8) | **−0,4 (1,7)** | −2,0 |
| ACADEMIA · Marta | −3,1 (1,5) | −0,8 (0,4) | **−0,6 (2,2)** | −4,9 |
| CAPITAL · Rodrigo | −5,6 (0,5) | −1,0 (0,2) | **−0,4 (1,5)** | −1,9 |
| **Apertura de manual (B)** | | | | |
| CALLE · Ignacio | +5,0 (0,0) | +0,2 (1,4) | **+0,8 (2,5)** | −1,5 |
| TERRITORIO · Héctor | 0,0 (0,0) | +0,4 (1,1) | **+0,8 (1,6)** | +2,7 |
| TRABAJO · Camila | +0,1 (3,4) | −0,2 (1,5) | **−0,2 (1,3)** | +5,8 |
| ESTADO · Fernanda | +5,7 (0,5) | +1,9 (2,7) | **+5,3 (0,9)** | +6,1 |
| ACADEMIA · Marta | +5,2 (0,4) | −0,8 (1,7) | **+0,6 (3,8)** | +4,2 |
| CAPITAL · Rodrigo | +6,0 (0,0) | +2,2 (2,3) | **+5,9 (0,3)** | +4,8 |

n = 20–40 (v0), 20 (v1), 12 (v2) por celda. v0 le daba la razón a casi cualquiera (Ignacio +5
con un texto que contiene una de sus `alergias`), contestaba lo mismo 40 de 40 veces y
repetía las frases de ejemplo. v1 lo corrigió pero dejó la sala inerte. v2 es el punto medio.

Lo que sigue pendiente:

- **Dentro de una partida la aquiescencia reaparece en parte**: con memoria y seis
  intervenciones seguidas, Ignacio se movió hacia quien hablaba en 5 de 6.
- **Ahora que hay varianza, una partida no dice nada**: hay que mirar muchas (abajo).
- ~1 % de las respuestas trae JSON mal formado (esa persona cae al modelo paramétrico), y
  pese a la instrucción a veces se cuela un chilenismo subido de tono en la frase.

El movimiento que declara el agente pasa por `saturar()`: el mismo freno a los convencidos
del modelo paramétrico.

**Simulación de 20 partidas** (`pruebas/simular.js`, resultados en `pruebas/RESULTADOS.md`):
con el jurado LLM, el marcador de voto suave y los textos de ejemplo, PERSUASIÓN y RIGOR divergen
en **19 de 20** partidas con la sociedad de agentes y en **16 de 20** con la audiencia
paramétrica (medido el 18-sep-2026 con el prompt corregido). El simulador se carga a mano desde
la consola (instrucciones en el archivo), cuesta 6 llamadas al jurado + 36 a los agentes por
partida y guarda cada partida en `pruebas/salidas/` por si se cae la sesión.

Es una v0 en lo estructural: un agente por bloque, sin conversación entre agentes ni red.

## Cambiar de semana

Todo el contenido de una sesión está en `contenido/semana<N>.js`; `contenido/sesiones.js`
las lista y la pantalla las ofrece en un selector (o `index.html?semana=7`). Una sala online
recuerda su sesión. Para montar otra se copia el archivo, se agrega al manifiesto y se
editan seis cosas:

1. `SESION` — curso, semana, moción.
2. `RONDAS` — nombres, roles y segundos.
3. `RUBRICA` — los criterios (los del curso ya están).
4. `CONCEPTOS` — el knowledge base: `id`, `etiqueta`, `fuente`, `claves` (detonantes
   textuales) y `lado` (+1 apoya la moción, −1 la debilita, 0 sirve a ambos).
5. `AUDIENCIA` — los bloques: `votos`, `pos` inicial, `volatilidad`, `peso_rigor`,
   el mapa `mueve` (qué concepto lo mueve y cuánto), sus `alergias` y su `voz`.
   Para la sociedad de agentes, además `registro` (cómo habla) y `no_mueve` (lo que no la
   mueve aunque esté bien dicho).
6. `EVENTOS` — los shocks del profesor.

Dos invariantes al editar:

- **La votación inicial tiene que estar apretada y con muchos indecisos.** Si la sala
  ya está ganada, "mover votos" no mide nada. La de la semana 5 abre 5–7 con 15 indecisos.
- **Al menos un bloque grande con `peso_rigor` bajo.** Si todos los bloques premian la
  rúbrica, PERSUASIÓN y RIGOR nunca divergen y el juego se queda con un solo marcador,
  que era justo lo que se quería evitar.

## Lo que este prototipo no tiene

Deliberadamente: multiplayer real, cuentas, objetivos ocultos por equipo, roles
rotativos dentro de la bancada (redactor / verificador / apostador), y puntaje
individual privado. Todo eso es v2, si la v1 aguanta una clase de verdad.
