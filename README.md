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
| **EL PÚBLICO** | votos que ganó cada bancada entre los alumnos que no debaten, en **voto suave** | los alumnos de los grupos que no debaten, que al final votan quién los convenció |

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
  y pone a una bancada frente al argumento del otro lado que no ha respondido. Le habla a los
  **grupos** (`@Grupo 3`); a una persona la nombra con @Nombre solo si lleva más de 2 minutos sin
  escribir, o si esa persona le habló a ella. En el teléfono de quien nombra, el mensaje se destaca
  y vibra. Sigue el ritmo (`ritmo.js`, probado en `pruebas/ritmo.test.js`): no entra si alguien
  escribió hace menos de 8 s, deja al menos 25 s entre dos intervenciones y con el LLM puede elegir
  «esperar» si la conversación va sola. Si nadie le contesta, vuelve a entrar a los 45 s, 90 s y
  135 s, y después calla hasta que alguien escriba. Nunca repite un mensaje, no insiste con quien
  no responde (dos llamados sin respuesta, o un alumno que avisa «no está», y la da por ausente) y
  pregunta «¿de dónde sale eso?» a lo más una vez por persona. 🎙 MODERADORA la hace entrar ya.
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
  profesor), `cupos/{g}` (clase con personajes: los inscritos en cada personaje; cada alumno se agrega
  o se quita a sí mismo, con la inscripción abierta y si queda lugar) y `privado/estado` (solo el profesor). Reglas en
  `firestore.rules`. Todos entran **con su cuenta Google** (igual que en `ml2-master-game`):
  el uid es estable, así que el mismo alumno queda identificado de clase a clase y el CSV
  lleva `autor_email`. Salas solo las crea `naim.bro@gmail.com` o un correo listado en la
  colección `profesores/{email}` (la edita el admin desde la consola).
- **Motor LLM online:** Cloud Function `evaluar` (`functions/src/index.ts`, us-central1). La
  key de Anthropic vive en Secret Manager (`ANTHROPIC_API_KEY`) y nunca llega a un navegador;
  la función solo atiende a `naim.bro@gmail.com` o a correos en `profesores`. Cuando el profesor
  entra con Google y la función responde, el motor se **enciende solo** (el rótulo dice
  `(servidor TRIBUNA)`). Queda en el heurístico únicamente si en ⚙ MOTOR se eligió «Usar
  heurístico», y esa elección se recuerda en ese navegador. Hasta el 22-sep-2026 había que
  encenderlo a mano y la clase de la sala 42RT corrió entera con plantillas. Los alumnos nunca llaman al proveedor. El proyecto está en el plan
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

## El público y los oráculos

En cada debate, los alumnos de los grupos que no debaten son el público. Al terminar, su teléfono
se cubre con dos preguntas: «¿Quién argumentó mejor, aunque no pienses como él?» y «¿A quién
elegirá el jurado?». Tienen 75 segundos y pueden cambiar sus respuestas hasta que se cierra la
votación. Nadie vota en el debate de su propio grupo, y el servidor lo hace cumplir.

La primera pregunta es el voto del público: el grupo que gana más votos gana ese veredicto, y su
parte de los votos es la mitad de su puntaje. Hasta el 23-sep-2026 decía «¿quién te
convenció?», y la simulación con 20 alumnos-agente mostró que así el público vota lo que ya
pensaba: un grupo en minoría en la sala casi no podía ganar. La segunda es el juego de los
**oráculos**: quien acierta al ganador de los jueces suma un punto, y los puntos se acumulan toda
la clase. Las predicciones nunca se muestran en el proyector. En el CSV hay una fila por votante
y por debate, con su voto, su predicción y si acertó.

## El público activo (`publico.js`)

Mientras dos grupos debaten, los otros tres no se quedan mirando: en esa misma simulación, 19 de
20 alumnos pidieron poder hacer algo siendo público. El teléfono del público tiene tres cosas:

- **🌡 Termómetro.** Un deslizador A FAVOR ↔ EN CONTRA que el alumno mueve cuando algo lo
  convence (A FAVOR a la izquierda, como en la conversación). El proyector dibuja la curva de la
  sala en vivo arriba de la columna derecha, y el resultado del debate dice cuánto se movió el
  público y hacia qué grupo. **No entra en el puntaje.**
- **🔥 🤔 🤝 Reacciones.** Sobre cada mensaje de quien debate: buen punto, ¿de dónde sale?,
  buena concesión. Todos ven los conteos. Si un mensaje junta 🤔 de al menos 2 personas o un
  quinto del público (lo que sea mayor), la moderadora le pide la fuente a quien lo escribió «en
  nombre de la tribuna». El mensaje con más 🔥 (mínimo 2) es **la frase del debate** y se muestra
  en el resultado.
- **✋ La pregunta de la tribuna.** Cada votante puede dejar una pregunta por debate (200
  caracteres; se puede cambiar). Desde el minuto 1:30, la moderadora recibe la fila y puede
  lanzar una tal cual, con el nombre de quien la escribió; si a los 3 minutos no salió ninguna,
  lanza una. Hay un máximo de dos por debate. Quien la escribió suma **+1 punto de oráculo** (que
  no cuenta como predicción) y su teléfono se lo avisa.

Los datos van en `salas/{codigo}/termometro`, `reacciones` y `preguntas`, uno por persona y
debate (o por persona y mensaje). Solo los escribe quien vota en el debate en curso, con el tramo
abierto (`firestore.rules`). La lógica pura está en `publico.js` y se prueba con
`node --test pruebas/`.

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

## La brújula en vivo

El mapa de la brújula (`mapavivo.js`) no se redibuja: cada alumno es un punto que se desliza a su
nueva posición y deja un rastro tenue. El teléfono guarda la posición provisional tras cada
pregunta (`parcial: true`), así que en el proyector los puntos aparecen huecos y se van moviendo
mientras la clase responde; se llenan al terminar. FORMAR GRUPOS usa solo las brújulas completas.
**⛶ AMPLIAR MAPA** en la portada, o **🧭 MAPA** en la mesa, lo abre a pantalla completa (Esc
cierra). En la repetición del cierre, cada punto parte donde estaba y la flecha muestra el
recorrido.

## Panel del profesor (`admin.html`)

Todas las salas que creó tu cuenta, agrupadas por curso. Por partida muestra la fecha, el
código, el estado, el ganador, cuántos jugaron en cada rol y el promedio del feedback. Al abrir
una partida se ven los marcadores, los comentarios con nombre, quiénes jugaron, y los botones
para volver a la pantalla, descargar la conversación en `.txt` o archivarla. Una partida que quedó
abierta se cierra con **🏁 Terminar partida**: el debate a medias no cuenta, se calcula el ranking
y se revela al campeón en los teléfonos. Si la pantalla sigue abierta, recibe la orden
(`privado/orden`) y termina ella misma. Al fondo de cada partida está **CÓMO ESCRIBIERON ·
antitrampa** (`telemetria.js`): pegados, salidas de la app, inserciones de golpe y velocidad por
mensaje. Nunca entra en un puntaje. Desde la cabecera
de cada curso se crea una partida nueva. Las salas vacías y las archivadas se ocultan por
defecto. El curso de cada semana está en `contenido/sesiones.js`.

## La clase en rotación

Quien debate recibe el puntaje de su grupo; quien vota, sus puntos de oráculo (predecir a los jueces).

Una sala es una clase entera. Los alumnos eligen un grupo en la portada (el profesor fija
cuántos: 2 a 10) y la moderadora los hace debatir de a dos, por turnos:

1. **Propuesta.** La moderadora propone una pregunta dentro del tema general y llama a dos
   grupos. El profesor la ve primero: la publica, pide otra, escribe la suya o cambia los
   grupos. Sin acción, sale sola a los 15 segundos.
2. **Debate,** un tramo abierto de 6 minutos en la misma conversación. El público juega mientras
   tanto desde el teléfono (termómetro, reacciones y la pregunta de la tribuna).
3. **Votación,** 75 segundos: cada votante responde en su teléfono «¿quién argumentó mejor,
   aunque no pienses como él?» y «¿a quién elegirá el jurado?». El proyector muestra las barras
   en vivo y declara al ganador del público.
4. **El panel de jueces:** cinco jueces de IA independientes (`jueces.js`; cada semana puede
   definir los suyos en `JUECES`) levantan una tarjeta de 0 a 10 por grupo. Como en los clavados,
   se tachan la más alta y la más baja y se suman las tres del medio, sobre 30. El criterio que
   comparten los cinco va una sola vez en `JUECES_COMUN`, y cada juez tiene un foco propio: con el
   criterio repetido en los cinco perfiles, sus frases salían casi iguales. Las frases se
   proyectan, así que nunca nombran a un estudiante.
5. **Resultado:** el puntaje de cada grupo (mitad jueces, mitad público), el ranking de grupos y
   los **oráculos**: quienes predicen mejor a los jueces suman un punto por acierto durante toda
   la clase.

La clase sigue hasta «🏁 TERMINAR CLASE». Entonces los teléfonos piden feedback y la
ceremonia revela el ranking y al campeón. La lógica pura está en `rotacion.js` y se prueba con
`node --test pruebas/`. El ciclo está en `clase.js`.

## La brújula corta (opcional)

Si la semana define `BRUJULA` (5 preguntas, dos ejes y los campos), la portada trae el
interruptor **Usar brújula**. Encendido, cada alumno responde la brújula en su teléfono en cerca de
un minuto y queda en un campo; el proyector muestra el mapa anónimo de la clase, y **FORMAR
GRUPOS** convierte cada campo en uno o más grupos de hasta 5 (los campos de 1 o 2 personas se
suman al grupo más cercano). Quien llega tarde responde la brújula y entra al grupo más chico de
su campo. En cada debate se enfrentan los dos grupos más lejanos entre los que menos han debatido,
y la moderadora escribe la moción sobre lo que los separa: el grupo cuya posición afirma queda A
FAVOR (el profesor puede intercambiar los lados con **⇄ lados**). Al final, **🧭 REPETIR
BRÚJULA** muestra una flecha por alumno con cuánto se movió. Las preguntas escritas a mano en
`PREGUNTAS` pueden decir qué campo afirman (`{ texto, afirma: "ley_antes" }`): A FAVOR le toca al
grupo del par más cercano a ese campo. Sin `afirma`, A FAVOR va al grupo que menos veces lo ha
sido, y en la simulación del 23-sep-2026 eso dejó a dos de cuatro grupos defendiendo lo contrario
de lo que pensaban. La propuesta del primer debate se arma después de FORMAR GRUPOS: antes se
preparaba al abrir la sala, sin grupos, y el primer debate caía en «Grupo 1 contra Grupo 2».
Si la semana define `INSTRUMENTOS`, la intro trae una lámina con lo que piden los jueces.
Apagada, los alumnos eligen grupo a mano. La lógica está en `brujula.js` y se prueba con `node --test pruebas/`.

## La clase con personajes (semana 308)

Si la semana define `PERSONAJES` (id, nombre, `corto`, `trato`, cargo, color, duelo y lado), los
alumnos no se agrupan por brújula ni eligen «Grupo N»: se inscriben bajo un personaje, con cupo y por
orden de llegada. Por debajo el grupo sigue siendo el número 1..N, en el orden de `PERSONAJES`, así
que el emparejamiento, el ranking y los votos no cambian. Lo que cambia es el nombre: donde decía
«Grupo 3», el proyector, los teléfonos, la barra, el ranking, el panel, los jueces y la moderadora dicen
«Josh Hawley». La moderadora los llama con `@Hawley` y les habla de usted («senador Hawley, ¿qué le
responde a Altman?»). Las semanas sin `PERSONAJES` se ven exactamente como antes
(`pruebas/personajes.test.js`).

- **Inscripción.** En la portada, el profesor escribe el **cupo por personaje** (con 24 presentes,
  cupo 4; la portada sugiere el número) y pulsa **ABRIR INSCRIPCIÓN**. Cada columna muestra «3/4».
  Mientras está abierta, el cupo se puede subir. **CERRAR INSCRIPCIÓN** (o EMPEZAR ▶) la cierra, y
  desde ahí nadie se cambia, tampoco durante el recreo en la portada.
- **Orden de llegada, sin carreras.** El cupo lo hacen cumplir las reglas de Firestore, no la
  pantalla. `salas/{codigo}/cupos/{g}` guarda los uid inscritos en el personaje g, y el teléfono se
  agrega ahí y cambia su `grupo` en una sola escritura en lote, amarradas con `getAfter`. Si dos
  alumnos tocan el último lugar al mismo tiempo, Firestore serializa las dos escrituras: la segunda
  encuentra el cupo lleno y se rechaza entera, y su teléfono dice «Se llenó Elon Musk: elige otro».
  Un personaje lleno se apaga en todos los teléfonos. La inscripción no depende de que la pantalla del
  profesor esté abierta. `pruebas/reglas-emulador.cjs` prueba las reglas contra el emulador (27 casos;
  en 20 salas con un solo lugar libre y dos toques simultáneos, entró exactamente uno).
- **Quien llega con la inscripción cerrada** entra solo al personaje con menos gente entre los que
  todavía no han debatido, para no caer en un duelo que ya pasó.
- **Duelos fijos.** Cada entrada de `PREGUNTAS` trae su `duelo: { A, B }` (ids de personaje). La
  moderadora propone los duelos en ese orden en vez de llamar a `emparejar`, y el profesor puede
  cambiar los grupos. Si un lado no tiene a nadie inscrito, la propuesta lo dice, no se publica sola y
  **Publicar** se niega. Jugados los tres, la propuesta lo avisa y no inventa un cuarto.
- **Mover a alguien.** Un clic en la cara, en la portada, lo pasa a otro personaje o lo deja sin
  personaje (0). Es la misma escritura en lote, así que el cupo guardado sigue cuadrando.
- **Jueces.** `JUECES_COMUN` de la 308 es la fidelidad al personaje: ¿lo diría esta persona?, ¿se
  apoya en algo que dijo según su dossier? Sus frases pueden nombrar al personaje, nunca al alumno.

Probado el 25-sep-2026 contra los emuladores con Playwright: 24 alumnos, cupo 4. Los 24 terminaron
inscritos, cuatro por personaje, y el cupo guardado cuadra uno a uno con el grupo de cada alumno. De dos
toques con 12 ms de diferencia sobre el último lugar de Musk entró uno, y el otro nunca vio «entraste».
Un atrasado cayó en Hawley, y los tres duelos corrieron en orden con sus mociones. La semana 307 con
brújula dio exactamente los mismos grupos, rótulos, propuesta y apertura de la moderadora que el
código anterior.

## El debate en vivo (desde el 29-sep-2026)

Hasta ahora se jugaba escribiendo. Desde la clase 8 de MGT300 (semana 308, martes 29-sep-2026) se
juega **principalmente a viva voz**: los dos lados pasan al frente y hablan con el teléfono cerca de
la boca; escribir a mano sigue funcionando igual que siempre. Spec en
`docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md`.

- **El ciclo.** Antes: propuesta (en el proyector) → publicar → preparación 60 s (solo ven su lado
  los dos llamados) → debate. Ahora: **propuesta (solo en el control del profesor)** → publicar →
  **preparación** de 60 s, todos preparan los dos lados sin saber si les toca → **revelación** (~8 s,
  redoble y golpe por nombre) → **entrada** (20 s tipo boxeo, se puede saltar) → debate. `S.fase` suma
  `revelando` y `entrada` entre `listo` y `abierta`; restaurar la pestaña ahí vuelve a la preparación
  ya revelada y pausada (`prepararEnSuspenso`, `revelar`, `entrada` en `clase.js`).
- **Personajes vs. grupos/brújula.** Con personajes (semana 308) cada duelo tiene su lado fijo, así
  que la propuesta **sortea qué duelo sigue** entre los pendientes con gente en los dos lados
  (`sortearDuelo` en `rotacion.js`, en el orden de `PREGUNTAS`; el profesor puede pedir otro); el
  último duelo no tiene suspenso, va directo a la entrada. Sin personajes, la revelación dice grupo y
  lado a la vez («A FAVOR… Grupo 3», pausa, «EN CONTRA… Grupo 1») y, con probabilidad de 25 %
  (`ROT.P_REVANCHA`), uno de los dos cupos cae en un grupo que ya debatió (`conRevancha`, con al
  menos un debate jugado y tres grupos con gente, nunca un grupo contra sí mismo).
- **El control.** `control.html?sala=CODIGO`, entra con Google (el mismo profesor); se abre
  escaneando el QR del botón **📱 CONTROL** de la barra de la sala. Muestra la fase y su reloj, **un
  botón grande con la acción siguiente** (PUBLICAR, ABRIR YA, SALTAR ENTRADA, PEDIR VOTACIÓN…, la
  misma de `accionPrincipal`), la propuesta en privado antes de publicarla, **+30 s**, 🎙 moderadora
  ya, ⚡ shock, 🏁 terminar clase, los siete interruptores y un resumen (quién habla, los dos relojes,
  votos). Se hablan por dos documentos privados: el proyector publica `privado/control` (fase, rótulo
  del botón, propuesta, relojes) y el control escribe órdenes en `privado/orden` (`{ cmd, arg, t }`);
  cada orden se atiende una sola vez por `t` y el `ack` siguiente es lo que destraba el botón — si
  tarda, el control avisa «la pantalla no responde». No hace falta ninguna regla de Firestore nueva.
- **El escenario.** `index.html` sigue siendo la pantalla del profesor y el motor sigue corriendo
  ahí; **⛶ ESCENARIO** (o `?escenario=1`, o la orden del control) esconde sala de control, botones y
  ticker y pone la vista de escenario (`escenario.js`, `modoEscenario`): dos podios (A FAVOR a la
  izquierda, EN CONTRA a la derecha) con caras, reloj de ajedrez y barra de cada lado, el subtítulo en
  vivo bajo quien habla, los últimos mensajes al centro, la moderadora como rótulo inferior, el
  gusano al pie y las reacciones subiendo flotando. Como Chrome exige un clic antes de reproducir
  audio, si el `AudioContext` no arrancó aparece el banner «🔊 Toca la pantalla para activar el
  sonido»; un toque lo desbloquea y el banner se retira solo.
- **Mantener para hablar.** En el teléfono de quien debate, un botón enorme: se aprieta, se habla, se
  suelta; al soltar el texto se envía solo, marcado `voz: true` (se ve con 🎤 en la conversación).
  Usa `SpeechRecognition` del navegador, igual que el dictado de hoy; sin reconocimiento de voz (algún
  iPhone), el botón no aparece y queda el teclado de siempre. Antes del debate, «🎤 Probar micrófono»
  en la preparación pide el permiso con anticipación. Mientras el botón está apretado, el teléfono
  escribe su transcripción provisional en su ficha (`habla: { debate, t0, t, texto }`, un latido cada
  ~1 s); el escenario y los teléfonos del público lo muestran como subtítulo en vivo, y una ficha
  con latido de más de 2,5 s cuenta como callada.
- **El reloj de ajedrez.** Cada lado tiene un banco igual a la mitad del tramo; corre mientras alguien
  de ese lado tiene el botón apretado (los dos bancos corren a la vez si hablan los dos lados). El
  tramo termina cuando los dos bancos llegan a cero o al pasar el tramo más 150 s de margen (holgado
  porque los turnos hablados de la moderadora no gastan banco pero sí corren contra ese margen), lo
  que ocurra primero. **El margen se gana hablando:** mientras nadie haya usado el botón de hablar en
  el tramo, el tramo dura lo de siempre (una clase que solo escribe no espera 150 s de más); con la
  primera voz se agrega el margen, y el LÍMITE del escenario y del control salta a esa hora. Con los
  dos bancos en cero, quien estaba hablando alcanza a soltar (hasta 4,5 s) antes de que se cierre. **+30 s** en el control suma a los dos bancos. Un lado sin tiempo solo puede
  escribir: el teléfono apaga su botón de hablar y lo dice. Lógica pura en `ajedrez.js`.
- **El punto de información.** Mientras un lado habla, el otro ve ✋ PUNTO; al tocarlo pide la palabra.
  Quien habla lo acepta o lo rechaza: aceptado, quien pidió el punto tiene la palabra 15 s (corre el
  banco de su lado); rechazado, o sin respuesta en 10 s, se cierra y se anuncia. Un punto a la vez;
  cada lado puede volver a pedir 30 s después de su último pedido. Máquina de estados pura en
  `punto.js`.
- **La IA con voz.** En el escenario, la moderadora y el relator se leen en voz alta con
  `speechSynthesis` del navegador (sin @, emojis ni markdown; se prefiere es-CL, luego es-US, es-419,
  es-MX, es-ES, y dentro de cada una las voces «Google»; el relator se corta a ~400 caracteres). El
  relator siempre pide el voto al público al terminar. La moderadora **nunca interrumpe a quien
  habla**: mientras alguien tiene el botón apretado no entra, ni pedida (`ritmo.js`), y con la voz
  encendida el respiro entre intervenciones baja a 3 s, medido desde que terminó de hablar el último.
- **El gusano y la duda de la tribuna.** La curva del termómetro corre como una franja al pie del
  escenario, A FAVOR arriba y EN CONTRA abajo, como en los debates de televisión; un mensaje que junta
  suficientes 🤔 se estampa con «LA TRIBUNA DUDA».
- **Los siete interruptores**, en `S.clase.opciones`, editables desde el control y por defecto todos
  encendidos (lo que falta en `opciones` cuenta como encendido, así una sala vieja sigue funcionando):

  | Interruptor | Apagado |
  |---|---|
  | `revelacion` | La preparación es como antes: solo los dos grupos, sin revelación ni entrada. |
  | `revancha` | Nunca repite un grupo antes de tiempo (sin efecto con personajes). |
  | `musica` | Sin pulso, redoble ni música de entrada. |
  | `voz` | Sin botón de hablar, subtítulos, reloj de ajedrez ni punto; el tramo dura como antes. |
  | `reloj` | Con voz, sin bancos: el tramo dura como antes. |
  | `punto` | Sin ✋ PUNTO. |
  | `vozIA` | La moderadora y el relator no se leen en voz alta. |

- **Cómo se prueba.** Lógica pura con `node --test pruebas/`: `rotacion.test.js` (interruptores,
  sorteo del duelo, revancha), `ajedrez.test.js` (bancos, simultaneidad, latido vencido, agotado,
  +30 s), `punto.test.js` (pedido, aceptado, rechazado, vencido, enfriamiento de 30 s), `ritmo.test.js`
  (no entra mientras alguien habla, respiro corto con voz) y `vozia.test.js` (limpieza del texto,
  elección de voz). De punta a punta, un ensayo completo de la semana 308 contra los emuladores con
  Playwright (24 teléfonos, cupo 4, un control y el escenario; el arnés se documenta en la memoria del
  usuario), con `SpeechRecognition` reemplazado por uno simulado que entrega frases con resultados
  provisionales.
- **Límites conocidos.** El reconocimiento de voz no se probó en un teléfono real antes de la clase
  (solo en el ensayo con emuladores y voz simulada); Android puede repetir el texto final de una
  frase; Safari en iOS tiene sus propias rarezas de reconocimiento; y las lecturas de Firestore crecen
  con los latidos de «quién está hablando», así que una sala muy larga lee más que antes.

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

Opcionales: `BRUJULA` (la brújula corta), `PREGUNTAS` (mociones escritas), `JUECES` y `JUECES_COMUN`,
`EJEMPLOS_SESION`, `INSTRUMENTOS` y `PERSONAJES` (la clase con personajes; ver arriba).

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
