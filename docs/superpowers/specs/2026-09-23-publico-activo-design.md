# El público activo y los ajustes tras la simulación de 20 alumnos-agente

Fecha: 23-sep-2026, para la clase del jueves 24 (CSC00155, semana 7).

## Por qué

Una simulación con 20 alumnos-agente (brújula, 5 debates, votos, jueces, entrevista de salida)
mostró que el rol de **público** es lo aburrido del juego. Cada alumno pasa unos 18 minutos
leyendo sin hacer nada, y 19 de 20 pidieron poder participar mientras debaten otros. El
aburrimiento medio fue 4,0 de 7, y los más altos correspondían a quienes fueron público dos veces
seguidas. La misma simulación encontró cinco problemas más:

1. el voto «¿quién te convenció?» es ideológico y hunde al grupo que es minoría en la sala;
2. las preguntas escritas no saben qué campo afirman, y dos de cuatro debates invirtieron los lados;
3. los cinco jueces repiten el mismo criterio («nombren a una persona real y el instrumento»), y
   un juez nombró a una alumna en el proyector («Emilia no aporta nada»);
4. nadie explicó qué es un «instrumento» antes de exigirlo;
5. la brújula dejó a 15 de 20 alumnos en un solo campo.

## Qué se hizo

**El público activo** (`publico.js`, lógica pura con pruebas en `pruebas/publico.test.js`):

- **Termómetro.** Un deslizador en el teléfono del público. El proyector muestra la curva en vivo
  y el resultado dice cuánto se movió la sala. Fuera del puntaje.
- **Reacciones 🔥 🤔 🤝** sobre los mensajes. Con 🤔 de al menos max(2, 20 % del público), la
  moderadora pide la fuente «en nombre de la tribuna» con una plantilla fija. El mensaje con más
  🔥 (mínimo 2) es la frase del debate.
- **La pregunta de la tribuna.** Una por votante y debate. La moderadora la recibe desde el
  1:30, puede lanzarla tal cual y la fuerza a los 3:00 si no salió ninguna (máximo 2 por
  debate). Quien la escribió suma +1 punto de oráculo (`sumarPuntoPregunta`).

**Ajustes:**

| Problema | Cambio |
|---|---|
| Voto ideológico | «¿Quién argumentó mejor, aunque no pienses como él?» |
| Votar en 45 s | `ROT.SEG_VOTACION` = 75 |
| Lados invertidos | `PREGUNTAS` como `{ texto, afirma }` y `ladoQueAfirma` (`brujula.js`) |
| Primer debate con grupos por defecto | la propuesta se rehace al formar los grupos (bug encontrado en la prueba de punta a punta) |
| Jueces repetidos | `JUECES_COMUN` una vez, más un foco propio por juez |
| Jueces que nombran alumnos | `promptJuez`: «nunca nombres a un estudiante» |
| «Instrumento» sin explicar | `INSTRUMENTOS` y una lámina de la intro |
| Brújula sesgada | p1 y p3 ahora ponen al Estado con IA en casos concretos (reconocimiento facial en marchas, acceso a datos) |

## Verificación

- `node --test pruebas/`: todas las pruebas pasan.
- Prueba de punta a punta contra los emuladores de Firebase (Auth + Firestore, con las reglas
  nuevas) y Playwright: profesor más 6 teléfonos, brújula, 3 grupos, intro, un debate completo
  con termómetro, reacciones, pedido de fuente, pregunta de la tribuna elegida, votación y
  resultado. Sin errores de página.
- Brújula nueva con los mismos 20 alumnos-agente: 7 / 6 / 5 / 2 campos, contra 15 / 3 / 0 / 2.

## Lo que queda abierto

- El termómetro no entra en el puntaje. Si el profesor quiere premiar «mover a la sala», la
  medida ya está (`reg.termo.mov`).
- La moderadora con motor LLM elige la pregunta de la tribuna. Sin motor solo la lanza cuando
  se fuerza. El camino con LLM no se probó de punta a punta porque los emuladores no tienen motor.
