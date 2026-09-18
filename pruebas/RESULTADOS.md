# Resultados de simulación

## 2026-09-17 · 20 partidas, textos de `EJEMPLOS`, sin shocks

Jurado `claude-sonnet-5`; sociedad de 6 agentes `claude-haiku-4-5` (prompt v2 + saturación).
En cada partida el jurado evalúa una vez y las dos audiencias escuchan lo mismo (comparación
pareada). 428 s con 3 partidas en paralelo; 0 agentes caídos, 0 evaluaciones caídas.

| | Sociedad de agentes | Paramétrica |
|---|---|---|
| Gana persuasión A FAVOR | 16 | 2 |
| Gana persuasión EN CONTRA | 2 | 4 |
| Empate en persuasión | 2 | 14 |
| **PERSUASIÓN y RIGOR divergen** | **16 / 20** | **2 / 20** |
| Persuasión media A / B | 9,9 / 5,7 | 7,3 / 8,0 |

Rigor: gana EN CONTRA en 20 de 20 (media 10,6 vs 12,0).

Fracción de veces que cada agente se movió hacia quien hablaba (0,5 es lo que daría un
partidario que solo escucha a su lado): academia 0,49 · calle 0,68 · capital 0,62 ·
estado 0,56 · territorio 0,47 · trabajo 0,49.

Posición final media (sociedad): trabajo +32 · calle +13 · territorio +4 · estado −9 ·
academia −21 · capital −55.

Detalle (R = quién gana rigor y promedios A/B; persuasión A/B; votos finales a favor–en contra):

```
R:B 10.8/11.7 | soc A 11/9 fin 11-11 DIV | par EMPATE 10/10 fin 5-7
R:B 10.2/11.8 | soc A 6/0 fin 11-7 DIV | par EMPATE 6/6 fin 5-7
R:B 10.6/12.2 | soc A 19/14 fin 11-8 DIV | par EMPATE 5/5 fin 5-7
R:B 10.8/12.2 | soc A 10/8 fin 11-11 DIV | par EMPATE 10/10 fin 5-7
R:B 10.8/11.3 | soc A 19/12 fin 16-11 DIV | par EMPATE 5/5 fin 5-7
R:B 10.2/12.3 | soc EMPATE 11/11 fin 5-7 | par EMPATE 10/10 fin 5-7
R:B 11.1/12.1 | soc A 16/10 fin 11-7 DIV | par EMPATE 16/16 fin 5-7
R:B 10.4/12.2 | soc A 15/0 fin 20-7 DIV | par A 6/0 fin 11-7 DIV
R:B 10.4/12.4 | soc EMPATE 4/4 fin 5-7 | par A 11/10 fin 11-12 DIV
R:B 10.3/12.2 | soc A 5/-2 fin 16-11 DIV | par EMPATE 6/6 fin 5-7
R:B 10.6/12.2 | soc A 11/10 fin 10-11 DIV | par EMPATE 10/10 fin 5-7
R:B 10.6/12   | soc B 5/9 fin 5-11 | par B 0/5 fin 5-12
R:B 10.6/11.8 | soc A 9/-2 fin 16-7 DIV | par EMPATE 5/5 fin 5-7
R:B 10.6/12.6 | soc A 15/8 fin 16-11 DIV | par EMPATE 16/16 fin 5-7
R:B 10.6/11.9 | soc A 6/4 fin 11-11 DIV | par EMPATE 15/15 fin 5-7
R:B 10.5/11.6 | soc A 0/-6 fin 11-7 DIV | par B 6/11 fin 5-12
R:B 10.8/11.9 | soc B 15/18 fin 11-16 | par EMPATE 10/10 fin 5-7
R:B 10.6/11.8 | soc A 10/8 fin 11-11 DIV | par B 0/5 fin 5-12
R:B 10.3/11.9 | soc A 4/-2 fin 11-7 DIV | par B 0/5 fin 5-12
R:B 10.6/12   | soc A 8/1 fin 16-11 DIV | par EMPATE 0/0 fin 5-7
```

Límite de lectura: los textos son fijos, así que esto mide estas seis intervenciones, no el
juego en general. La divergencia siempre tiene el mismo signo porque los ejemplos se
escribieron para eso.

## 2026-09-17 (tarde) · la audiencia paramétrica escucha el texto

Cambio: `moverParametrico` ya no usa los conceptos ni las banderas que devuelve el jurado; oye
el texto por palabras clave (`oidoSala`) y del jurado solo toma el puntaje de rigor y la
inyección. Con el jurado heurístico el impacto es idéntico al de antes (diferencia 0 en 48 casos).

Frecuencia con que PERSUASIÓN y RIGOR divergen, audiencia paramétrica, textos de `EJEMPLOS`:

| Jurado | Refutaciones | Descuento de ecos | Divergen | Empate en persuasión | n |
|---|---|---|---|---|---|
| heurístico | viejas (antes de reescribirlas) | no | 52 % | 1 % | 2000 |
| heurístico | actuales | no | 3 % | 17 % | 2600 |
| heurístico | actuales | sí | **24 %** | 15 % | 600 |
| LLM (20 partidas reales) | actuales | no | 0 de 20 | 9 de 20 | 20 |
| LLM (puntajes de esas 20 partidas, ruido nuevo) | actuales | no | 6 % | 47 % | 600 |
| LLM (ídem) | actuales | sí | **29 %** | 42 % | 600 |

Las filas «LLM (puntajes…)» no gastan API: reutilizan los puntajes de rigor que el jurado dio
en las 20 partidas reales y solo vuelven a tirar el ruido de la audiencia.

Lectura:

- Escuchar el texto no bastó. El problema venía de otro lado: las refutaciones de ejemplo
  reescritas reconstruyen al rival («sostienen que cinco hombres… centros de datos…»), y un
  oído por palabras clave no distingue citar de sostener, así que EN CONTRA se llevaba a
  CALLE y TERRITORIO con las consignas de A FAVOR. Eso ya pasaba con el jurado heurístico.
- El descuento de ecos (`ecosDe`: conceptos que puso el rival en rondas previas y que no son
  del lado de quien habla valen ×0,25) lo corrige en parte: 3 % → 24 % y 6 % → 29 %.
- Queda un efecto de umbral: CALLE, ESTADO y TERRITORIO parten cerca de ±8 y cruzan ~2 veces por
  partida; cada cruce cuenta para quien habla y se anulan. De ahí los empates exactos (14/14).
- Referencia: la sociedad de agentes diverge en 16 de 20 con estos mismos textos.

## 2026-09-17 (noche) · exploración: otra métrica de PERSUASIÓN (incompleta)

Observación: con cualquier métrica aditiva, `persuasión A − persuasión B` = cambio del margen de
la sala entre el inicio y el final. Con cruces de umbral ±8 ese margen es discreto, así que hay
empate cada vez que la sala termina igual que empezó (5–7), aunque todos se hayan movido.

Audiencia paramétrica, 400 partidas sin API (puntajes de rigor de 20 partidas reales del jurado
LLM, ruido nuevo; rigor lo gana EN CONTRA en las 400). Métricas en `persuasionSegun`:

| Métrica | Gana A FAVOR | Gana EN CONTRA | Empate | Divergen | Media A / B |
|---|---|---|---|---|---|
| cruces (la del juego) | 103 | 114 | 183 | 26 % | 14,2 / 14,3 |
| lineal: Σ votos · Δpos / 100 | 245 | 155 | 0 | 61 % | 2,0 / 1,9 |
| suave: Σ votos · tanh(pos / 12) | 351 | 49 | 0 | 88 % | 9,1 / 7,1 |

La métrica suave favorece a quien mueve indecisos: EN CONTRA acumula movimiento entre los ya
convencidos (CAPITAL de −45 a −55), que en tanh casi no suma; A FAVOR mueve a CALLE, TERRITORIO
y ESTADO, que están cerca del centro.

Sociedad de agentes y audiencia paramétrica, las mismas 20 partidas
(`pruebas/salidas/sim-2026-09-17-23-19-43.json`; 285 s, 1 agente caído de 720, rigor con 4 juegos
de puntajes reales del jurado LLM rotados: gana EN CONTRA en las 20):

| Métrica | Sociedad: divergen | empates | media A / B | Paramétrica: divergen | empates | media A / B |
|---|---|---|---|---|---|---|
| cruces (la del juego) | 16 / 20 | 2 | 9,1 / 6,0 | 5 / 20 | 12 | 14,4 / 14,1 |
| lineal | 20 / 20 | 0 | 2,7 / 1,2 | 11 / 20 | 0 | 2,0 / 2,0 |
| suave | 20 / 20 | 0 | 10,6 / 3,4 | 16 / 20 | 0 | 9,0 / 7,3 |

La réplica de la sociedad con «cruces» dio lo mismo que la corrida anterior (16 de 20). Ojo: con
la sociedad y una métrica continua, A FAVOR gana la sala 20 de 20 con estos textos: la divergencia
deja de ser un resultado posible y pasa a ser el único. No se decidió todavía si cambiar el
marcador del juego.

**Decisión (2026-09-17):** el marcador del juego pasó a la métrica suave (`margenDe` en `app.js`).
Verificado: las tarjetas suman el marcador, los shocks quedan fuera, y el simulador con la
métrica nueva da 347 divergencias, 46 victorias de EN CONTRA y 7 empates (diferencia < 0,05) en
400 partidas de la audiencia paramétrica. `compararMetricas()` sigue calculando las tres.
Ojo para leer resultados anteriores: todo lo medido antes de esta línea usa «cruces».

**Empate bajo medio voto (2026-09-17):** el veredicto declara empate en persuasión cuando la
diferencia es menor a 0,5 votos. En 400 partidas de la audiencia paramétrica (mismos 4 juegos de
puntajes del jurado): 335 divergencias, 31 victorias de EN CONTRA y 34 empates (8,5 %); sin ese
margen eran 347 / 46 / 7. `resumenSim()` aplica la regla; `compararMetricas()` no, porque compara
las métricas en crudo.

## 2026-09-17 (noche) · escala de la sociedad de agentes

Pregunta: ¿usan los agentes el rango 0–12 o contestan siempre 5–6? Medición con
`pruebas/escala.js`: cada agente escucha cada uno de los 6 textos de `EJEMPLOS` desde su posición
inicial, sin memoria, 8 veces (288 llamadas a Haiku por variante; archivos `salidas/escala-*.json`).
Histograma del movimiento declarado (valor absoluto):

| Variante | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9 | entropía | veredicto |
|---|---|---|---|---|---|---|---|---|---|---|---|
| base (prompt v2) | 77 | 4 | 46 | 25 | 54 | 30 | 48 | 4 | 0 | 2,63 | rango real 0–7; 27 % en 5–6, 27 % en 0 |
| v3: tres preguntas 0–3 (toca · cree − 1,5 · molesta), sin número | 6 | 112 | 26 | 70 | 27 | 14 | 28 | 0 | 5 | 2,42 | peor: 39 % en 1 |
| v4: tres preguntas como andamio, número lo pone el agente | 151 | 2 | 14 | 21 | 66 | 19 | 14 | 1 | 0 | 2,01 | peor: 52 % en 0 |
| **v5: base con "acerca"/"aleja"** (la que quedó) | 89 | 13 | 27 | 14 | 89 | 24 | 32 | 0 | 0 | 2,43 | rango 0–6; modas en 0, 4 y 6 |

Conclusión sobre la escala: pedir el número por partes no la abre; la mueve de moda. Un
partidario le pone 5–6 a casi todo lo de su lado y eso no es un defecto de escala. Se deja como
está y el marcador (voto suave, continuo) no depende de que el rango se use entero.

**Hallazgo colateral, más importante:** las opciones de dirección `"orador" | "contrario"` eran
ambiguas. v4 preguntaba además cuánto le cree el agente a quien habló: de 45 respuestas que le
creían a EN CONTRA (cree ≥ 2, molesta = 0), 12 marcaron "contrario" —leído como la bancada EN
CONTRA— y se alejaron de ella; con A FAVOR, 0 de 46. Es decir, todo lo medido con la sociedad
hasta aquí tenía ruido en contra de EN CONTRA. Con `"acerca" | "aleja"` (v5) desaparece:
Rodrigo pasa de +1,4 a +5,3 con la refutación de EN CONTRA y Marta de −1,4 a +2,5. Las cifras
de divergencia de la sociedad (16/20, 20/20) están medidas con el prompt viejo y hay que
repetirlas.

## 2026-09-18 · repetición de las 20 partidas con el prompt corregido («acerca/aleja»)

`salidas/sim-2026-09-18-00-08-00.json`: 274 s, 1 agente caído de 720, mismos 4 juegos de
puntajes del jurado, marcador de voto suave con empate bajo medio voto. Rigor: EN CONTRA 20/20.

| | Gana persuasión A | Gana B | Empate | Divergen | Persuasión media A / B |
|---|---|---|---|---|---|
| Sociedad de agentes | 19 | 0 | 1 | **19 / 20** | 12,4 / 6,4 |
| Paramétrica | 16 | 2 | 2 | 16 / 20 | 8,7 / 6,8 |

Comparado con la corrida anterior de la sociedad (prompt viejo, mismas condiciones): EN CONTRA
sube de 3,4 a 6,4 votos de persuasión —ahí estaba el ruido en su contra— pero A FAVOR sigue
ganando la sala con estos textos. La aquiescencia sube (capital 0,77, estado 0,81) porque ahora
sus «acerca» a EN CONTRA se cuentan como tales.

**Efecto a vigilar del voto suave:** en 5 de 20 partidas la votación visible terminó 5–11
(EN CONTRA ganó 4 votos por umbral y A FAVOR ninguno) y aun así A FAVOR ganó en persuasión, porque
movió indecisos sin que cruzaran ±8 mientras EN CONTRA empujaba a convencidos. Es lo que la
métrica pretende, pero en pantalla el marcador de la sala y el de persuasión se contradicen.
