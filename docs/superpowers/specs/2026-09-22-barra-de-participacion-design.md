# La barra de participación

Fecha: 2026-09-22. Estado: aprobado por el profesor.

## Por qué

En la clase del 22-sep-2026 (sala 42RT) se escribió poco y tarde: 10 mensajes en dos debates, y la
mitad de quienes debatían no escribió nada. La barra hace visible cuánto ha alimentado cada grupo la
conversación y empuja a que escriban **todos** los integrantes, no solo el más suelto.

## Qué es

Una barra por cada grupo que debate. Se llena con lo que escriben sus integrantes en ese debate.

- Si el grupo tiene N integrantes en la sala, cada uno llena como máximo 1/N de la barra. Su parte se
  llena con **60 palabras** en el debate (`BARRA.META_PERSONA`). Lo que escriba de más no suma: la
  barra solo llega a 100 % si escriben todos.
- Anti-relleno:
  - un mensaje de menos de 3 palabras no cuenta;
  - un mensaje aporta como máximo 40 palabras, así que hacen falta al menos dos mensajes para llenar
    una parte;
  - un texto idéntico a uno anterior de la misma persona en el debate no suma.
- Colores por porcentaje del grupo: rojo < 34 %, ámbar 34–66 %, verde ≥ 67 %, azul neón con brillo
  al llegar a 100 %.
- Quien se fue de la sala sigue contando en N: su tajada queda vacía y el grupo no llega a 100 %. Es
  a propósito: el profesor ve quién falta.
- **No da puntos.** No toca el jurado, el público ni el ranking. Solo celebra.

## Dónde se ve

- **Proyector (pantalla del profesor):** dos barras enfrentadas sobre la conversación, A FAVOR a la
  izquierda y EN CONTRA a la derecha. Debajo, una tajada por integrante con su primer nombre: vacía,
  a medias o llena. Es lo que ve todo el curso, incluido el público.
- **Teléfono de quien debate:** la barra de su grupo, con su tajada destacada («tu parte: 35/60
  palabras»).
- **Teléfono del público:** las dos barras, en chico.

## La celebración

Cada celebración ocurre una vez por debate. En el teléfono, lo ya celebrado se recuerda en
`localStorage` por sala y debate, para no repetirlo al recargar.

| Momento | Proyector | Teléfono |
|---|---|---|
| Tu parte llena | — | vibra, «✓ tu parte», ráfaga chica de confeti |
| Todos escribieron al menos una vez | sello «👥 todos escribieron» en la barra | el mismo sello |
| El grupo llega a 50 % | sonido corto | — |
| El grupo llega a 100 % | confeti que sale de la barra, fanfarria y el cartel «🎉 ¡GRUPO N LLENÓ LA BARRA!» | los del grupo: vibra, confeti y el mismo cartel |

## Cómo está hecho

- `barra.js`: lógica pura, sin DOM ni Firestore, probada con Node (`pruebas/barra.test.js`).
  - `palabrasQueCuentan(texto)`
  - `llenadoGrupo(msgs, integrantes)` → `{ pct, porPersona: [{ nombre, uid, palabras, pct }], todos }`
  - `colorBarra(pct)`
  - `hitosNuevos(antes, ahora)` → qué celebrar al pasar de un estado al siguiente
- Cada pantalla calcula la barra a partir de lo que ya recibe: los mensajes del debate en curso
  (`salas/{codigo}/mensajes`) y la lista de la sala (`jugadores`, con su grupo). No hay datos nuevos
  en Firestore ni cambios en las reglas.
  - Integrantes de un grupo: los jugadores de la sala con ese `grupo`.
  - Los mensajes se atribuyen por `uid`. En modo local, o si el profesor simula alumnos, se
    atribuyen por nombre.
- El proyector la pinta en la columna de la conversación (`index.html`, `moderacion.js` o un módulo
  propio `barravista.js`). El teléfono la pinta en `jugar.js`.
- **Registro:** al cerrar la votación de cada debate, el profesor guarda en
  `S.clase.debates[n].barra = { A: { pct, porPersona }, B: { … } }`, que llega a
  `privado/estado`. El estado público lleva solo `{ A: pct, B: pct }` por debate, y admin lo muestra
  en la lista de debates de la partida.

## Pruebas

- `pruebas/barra.test.js`:
  - tope por persona (una persona sola no pasa de 1/N);
  - mensajes cortos y repetidos no cuentan;
  - el tope de 40 palabras por mensaje;
  - los umbrales de color;
  - los hitos se disparan una sola vez;
  - «todos escribieron».
- Prueba headless del proyector con mensajes simulados: las barras crecen, cambian de color y
  aparece la celebración al 100 %.

## Fuera de alcance

Puntos por participación, barras por persona en el ranking, y que la moderadora comente la barra.
