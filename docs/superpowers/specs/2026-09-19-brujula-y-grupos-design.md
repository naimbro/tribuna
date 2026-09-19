# TRIBUNA · Brújula corta y grupos por posición — especificación

Fecha: 19 de septiembre de 2026. Estado: por revisar.
Se construye sobre la rotación, los veredictos y los oráculos, ya publicados.

## 1. Objetivo

Hoy cada alumno elige un grupo a mano y la moderadora asigna los lados A FAVOR y EN CONTRA sin
mirar qué piensa cada grupo. Con este cambio:

1. Al entrar, cada alumno responde una **brújula corta**: 5 preguntas en cerca de un minuto, en su
   teléfono. La brújula lo ubica en un plano de dos ejes y en un **campo**.
2. El proyector muestra el **mapa de la clase**: un punto anónimo por alumno, del color de su
   campo. La clase ve cómo se reparten sus opiniones antes de debatir.
3. El profesor aprieta **FORMAR GRUPOS** y cada campo se convierte en uno o más grupos.
4. En cada debate, la moderadora elige los **dos grupos más lejanos** en el mapa, entre los que
   menos han debatido, y escribe la pregunta justo sobre lo que los separa. El grupo cuya
   posición afirma la moción defiende A FAVOR. Nadie defiende algo que no piensa.
5. Al cierre, opcionalmente, la clase repite la brújula y el mapa muestra **cuánto se movió cada
   punto**.

Hay éxito si se cumplen tres condiciones:

- **Cobertura:** cada alumno queda en un grupo coherente con sus respuestas, y ningún grupo tiene
  menos de 3 personas mientras haya con quién juntarlo.
- **Sentido:** los debates enfrentan posiciones que de verdad discrepan, y el lado de cada grupo
  coincide con lo que respondió.
- **Tiempo:** la brújula completa, desde el QR hasta los grupos formados, toma menos de 3
  minutos de clase.

## 2. Decisiones tomadas en la conversación

| Tema | Decisión |
|---|---|
| Modelo de debate | Híbrido: grupos formados por la brújula y lados según la posición real de cada grupo. |
| Brújula | Corta y dentro de TRIBUNA, no la de ml2. |
| Mecánica del debate | Se mantiene: dos lados, jueces, voto del público y oráculos. |
| Exposición | El mapa es anónimo. Quedar en un grupo sí revela el campo, porque eso es el diseño. |

## 3. Contenido: la brújula de cada semana

Cada archivo de semana puede definir `BRUJULA`. Si no la define, el juego funciona como hoy, con
elección de grupo a mano.

```js
const BRUJULA = {
  ejes: {
    x: { id: "velocidad", etiqueta: "Velocidad", min: "frenar", max: "acelerar" },
    y: { id: "regla", etiqueta: "Quién pone la regla", min: "la industria se regula sola", max: "el Estado, con potestades vinculantes" }
  },
  preguntas: [
    { id: "p1", texto: "…", opciones: [ { texto: "…", x: -8, y: 6 }, { texto: "…", x: 4, y: -2 }, … ] },
    …                                             // exactamente 5
  ],
  campos: [
    { id: "ley", nombre: "Frenar por ley", centro: { x: -6, y: 6 }, color: "#38bdf8",
      afirma: "La IA de frontera hay que frenarla, y el freno lo pone la ley del Estado." },
    …
  ]
};
```

**Formato de las piezas:**
- **Opciones:** cada una suma puntos en uno o en los dos ejes, en una escala de −10 a 10. Si falta
  un eje, esa opción vale 0 en él.
- **Posición del alumno:** el promedio por eje de las opciones que eligió.
- **Campos:** cada uno tiene un centro en el plano y una frase `afirma`, que la moderadora usa para
  escribir mociones. Su campo es el de centro más cercano (distancia euclidiana).

**Semana 7:** se escriben 5 preguntas de opción múltiple sobre el temario de la semana,
reutilizando los ejes (velocidad y quién pone la regla) y las fichas del instrumento de ml2
(`instrumento_s7_v1`). Los campos son los cuatro que ya se usan: frenar por ley, frenar desde
adentro, guardarraíles sin freno, y ni freno ni ley.

## 4. Flujo

1. **Portada.** Igual que hoy, más el mapa vacío del plano, con los centros de los campos
   rotulados.
2. **Brújula en el teléfono.** Después de entrar con Google, el alumno ve una pregunta por
   pantalla, con opciones grandes. Al contestar la quinta ve «Tu campo: Frenar por ley», su punto
   en un mini-mapa y la frase del campo. Puede rehacer la brújula mientras la sala está en la
   portada.
3. **Mapa en vivo en el proyector.** Cada respuesta completa aparece como un punto anónimo del
   color de su campo, con una pequeña animación. Arriba se ve el conteo por campo.
4. **FORMAR GRUPOS.** El profesor lo aprieta cuando ya contestó la mayoría:
   - Cada campo con al menos 3 personas se reparte en grupos de hasta `TAM_GRUPO` (5). Por ejemplo,
     8 personas quedan como 4 y 4, y 11 como 4, 4 y 3.
   - Las personas de un campo con 1 o 2 alumnos pasan al grupo del campo de centro más cercano que
     tenga grupos.
   - Si ningún campo llega a 3, todos juntos forman grupos por cercanía.
   - Cada grupo recibe un número y el nombre de su campo, por ejemplo «Grupo 2 · Frenar por ley».
   - La posición del grupo es el promedio de las posiciones de sus integrantes.

   Los teléfonos pasan a «Estás en el Grupo 2 · Frenar por ley». Quienes lleguen tarde contestan
   la brújula y entran al grupo más chico de su campo. Si su campo no tiene grupos, entran al grupo
   más cercano a su posición.
5. **Intro y debates.** Igual que hoy, con estos cambios en el emparejamiento y en la pregunta:
   - **Emparejamiento:** entre los grupos con menos debates, con la misma regla de equidad que hoy,
     se elige el par cuyas posiciones están más lejos. Si hay empate, se prefiere a quien lleva más
     tiempo sin debatir.
   - **Pregunta:** la moderadora recibe las dos frases `afirma` y la posición de cada grupo.
     Escribe una moción que afirme la posición de uno de los dos y que el otro rechace desde la
     suya. Devuelve también cuál de los dos grupos la afirma, y ese queda A FAVOR.
   - **Panel de propuesta:** muestra «Grupo 2 · Frenar por ley — A FAVOR» contra «Grupo 5 · Ni
     freno ni ley — EN CONTRA». El profesor puede intercambiar los lados con un botón, además de lo
     que ya puede hacer hoy.
6. **Cierre, opcional.** Antes de «Terminar clase», el profesor puede apretar «REPETIR BRÚJULA».
   Los teléfonos contestan de nuevo las mismas 5 preguntas y el proyector muestra el mapa con una
   flecha por alumno, desde su punto inicial al final, más el conteo por campo antes y después.
   Después sigue el cierre de siempre: feedback y ceremonia.

## 5. Lógica pura (`brujula.js`, probada con Node)

```
posicion(respuestas, preguntas) → { x, y }
   promedio por eje de las opciones elegidas; las preguntas sin responder no cuentan
campoDe(pos, campos) → idCampo
   el de centro más cercano; si hay empate, el primero en el orden del archivo
formarGrupos(alumnos:[{uid, pos, campo}], campos, tam = 5) → { grupos:[{n, campo, miembros:[uid], pos}], de:{uid: n} }
   1. los campos con ≥3 se reparten en ceil(k / tam) grupos de tamaños parejos (difieren a lo más en 1)
   2. los de campos chicos van al grupo más cercano a su posición entre los ya formados
   3. si no se formó ningún grupo, se ordena a todos por ángulo en el plano y se corta en grupos de hasta `tam`
   4. los números de grupo van de 1 a N, ordenados por campo y después por tamaño
emparejarLejanos(disponibles, debates, posDe) → { A, B } | null
   la misma equidad que emparejar(): primero los que menos debatieron; entre los candidatos
   elegibles se toma el par de mayor distancia. A y B quedan provisorios hasta que la moderadora
   dice cuál afirma la moción.
movimiento(antes, despues) → [{uid, de:{x,y}, a:{x,y}, d}]
```

## 6. Datos (Firestore)

**`salas/{codigo}`** (público):
- `brujula: { activa: bool, fase: "responder"|"grupos"|"repetir"|null }`.
- `mapa: [{ x, y, campo }]` en orden aleatorio y sin uid, para que el teléfono y el proyector
  dibujen el mapa sin identificar a nadie.
- `campos: [{ id, nombre, color, n }]`.
- `grupos` sigue siendo el número de grupos, y se agrega `gruposInfo: [{ n, campo, nombre, pos }]`.

**`salas/{codigo}/brujula/{uid}`:** `{ uid, respuestas: { p1: índice, … }, pos: { x, y }, campo,
t, repeticion?: { respuestas, pos, campo, t } }`. La escribe el propio alumno. La leen el profesor
y el alumno.

**`jugadores/{uid}.grupo`:** lo escribe el profesor al formar grupos. La regla ya lo permite.

## 7. Reglas

- **`brujula/{uid}`:** la escribe solo ese alumno, siendo jugador de la sala, con
  `sala.brujula.fase` en «responder» o «repetir».
  - Las respuestas son enteros entre 0 y 9.
  - `pos.x` y `pos.y` son números entre −10 y 10.
  - `campo` es un string.
  - La lee el profesor, y el alumno lee la suya.
- **Cambio de grupo del alumno:** fuera de la portada, `jugadores/{uid}.grupo` solo lo puede
  cambiar el profesor. La regla actual ya lo exige.

## 8. Pantallas

**Teléfono:**
- **Brújula:** una pregunta por pantalla, con opciones grandes que ocupan el ancho y una barra de
  progreso de 1 a 5.
- **Resultado:** el nombre del campo, la frase `afirma` y un mini-mapa con los centros y su punto.
- **Grupo formado:** «Estás en el Grupo N · nombre del campo», en lugar de la elección de grupo.

**Proyector:**
- **Mapa:** un plano cuadrado con los ejes rotulados en sus extremos y los centros de los campos
  como círculos grandes y tenues con su nombre. Los puntos aparecen con una animación suave.
  Conteo por campo arriba.
- **Grupos formados:** el mapa se agrupa por color y aparece la lista de grupos con cuántas
  personas tiene cada uno.
- **Repetición:** flechas desde el punto inicial al final, y el conteo por campo antes y después.

**Panel:** en el detalle de la partida, el mapa inicial y el final, y el campo y grupo de cada
alumno.

## 9. Componentes

| Archivo | Cambio |
|---|---|
| `brujula.js` (nuevo) | La lógica pura de la sección 5. También se carga en el teléfono, con un `<script>` antes del módulo. |
| `pruebas/brujula.test.js` (nuevo) | Pruebas de la sección 11. |
| `contenido/semana7.js` | `BRUJULA` con 5 preguntas y 4 campos. |
| `escenas.js` | Mapa en la portada, FORMAR GRUPOS, mapa de repetición. |
| `clase.js` | Emparejamiento por distancia, prompt de propuesta con los campos, intercambio de lados. |
| `online.js` | Suscripción a `brujula`, publicación de `mapa`, `campos` y `gruposInfo`, asignación de grupos a los jugadores. |
| `jugar.js` / `jugar.html` | Pantallas de la brújula y del resultado; «Estás en el Grupo N» en lugar de la elección. |
| `admin.js` | Mapa y campos en el detalle. |
| `firestore.rules` | Regla de `brujula`. |

## 10. Errores y casos borde

- **Alumno que no termina la brújula:** no aparece en el mapa. Al formar grupos entra en el grupo
  más chico, y su teléfono le ofrece terminarla.
- **Sala con menos de 6 alumnos:** se forman al menos 2 grupos si hay al menos 2 personas. Si no,
  FORMAR GRUPOS avisa que faltan alumnos.
- **La moderadora no dice cuál grupo afirma la moción:** A FAVOR queda para el grupo más cercano
  al centro del campo del que habla la moción. Si tampoco se puede, se usa el orden del
  emparejamiento. El profesor puede intercambiar los lados.
- **Semana sin `BRUJULA`:** elección de grupo a mano, como hoy.

## 11. Pruebas

- **Pruebas unitarias con Node:**
  - `posicion`: con respuestas incompletas.
  - `campoDe`: con empates.
  - `formarGrupos`: campos grandes que se reparten parejo, campos chicos que se juntan, ningún
    campo con 3 o más, y números de grupo estables.
  - `emparejarLejanos`: la equidad se respeta, se elige el par más lejano y se desempata.
  - `movimiento`.
- **Prueba en línea:** un alumno en Chrome contesta la brújula y aparece en el mapa. Al formar
  grupos queda asignado y lo ve en el teléfono. Un debate empareja grupos de campos distintos con
  el lado coherente. La repetición muestra la flecha.

## 12. Fuera de alcance

- Usar la brújula de ml2 directamente, o sincronizar con ella.
- Mapas de más de dos ejes.
- Debates con los lados invertidos, con cada grupo defendiendo lo contrario de lo que piensa. Se
  puede agregar después como opción del profesor.
