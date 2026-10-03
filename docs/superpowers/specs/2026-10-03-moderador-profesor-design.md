# El profesor modera: la voz del moderador desde el control

Fecha: 2026-10-03. Estado: aprobado por el profesor en la conversación; falta revisar este texto.

## Por qué

Hoy la moderadora es una IA que corre en el proyector (`moderacion.js`, `ritmo.js`) y habla por
`speechSynthesis`. El profesor quiere poder ser él el moderador: hablar desde su celular, en ese rol,
con lo que dice transcrito en vivo para toda la sala y guardado en la conversación como lo que dijo el
moderador.

## Resumen

- Un interruptor nuevo, **«Moderas tú»** (`modProfe`), en el control. Encendido, la moderadora de IA
  se calla del todo y el profesor modera a viva voz desde el control.
- El control gana un botón **🎙 HABLAR** (mantener para hablar). Mientras está apretado, la
  transcripción provisional se ve en vivo en el proyector y en todos los teléfonos; al soltar, queda
  como mensaje del **Moderador** en la conversación.
- **El moderador toma la palabra:** mientras habla, los alumnos no pueden hablar; quien tenía el botón
  apretado lo suelta y envía lo que llevaba.
- Las preguntas de la tribuna, los 🤔 y las menciones al moderador llegan a una **cola en el control**;
  el profesor elige cuál sale en el proyector.
- El reconocimiento de voz del teléfono sale a un módulo compartido, `dictado.js`, que usan el teléfono
  y el control.

Apagado `modProfe`, la clase corre exactamente como hoy.

## 1. Activación y la IA

### El interruptor

`modProfe` entra en `OPCIONES_DEFECTO` (`rotacion.js`) con valor **`false`** (es el único interruptor
que parte apagado) y en `INTERRUPTORES` del control: «Moderas tú — la IA se calla y moderas a viva
voz desde aquí». Se puede cambiar en cualquier momento, también con el debate abierto: el cambio vale
desde la siguiente decisión de la moderadora.

Es independiente de `voz`: con `voz` apagado los alumnos escriben, pero el profesor igual habla desde
el control. Es independiente de `vozIA`: con `modProfe` encendido, `vozIA` solo afecta al relator.

### Lo que se calla con `modProfe` encendido

- **Las intervenciones de la IA:** `moderadorTalvez` no hace nada (ni por el ritmo, ni forzada por
  «🎙 moderadora ya», ni por una mención `@Moderadora`). El botón «🎙 moderadora ya» del control se
  esconde.
- **La tribuna automática:** `estadoTribuna` no ofrece preguntas al prompt ni fuerza una a los
  3 minutos, y `fuentesTalvez` no lanza los 🤔. Todo eso pasa a la cola del control (sección 3).
- **Las líneas fijas** de `abrirTramoChat` (la apertura del debate o del duelo) y la de `clase.js`
  («Gracias, Grupo 3 y Grupo 1. Viene el próximo debate.») se siguen publicando, pero como
  `tipo: "sistema"`: quedan escritas como guía en la conversación y en los teléfonos, y nadie las lee
  en voz alta.

### Lo que sigue igual

El relator (cierre del tramo, voto), los jueces de IA y el jurado. En `transcripcionChat` cada mensaje
`mod` se rotula con su propio `m.nombre` (hoy usa `MOD_NOMBRE` fijo), y los del moderador llevan la
marca 🎤 como los alumnos con `voz`: el relator y los jueces ya saben que esas líneas son
transcripciones automáticas.

## 2. La voz del moderador

### Mientras habla

El control escribe en un documento nuevo, `salas/{codigo}/vivo/moderador`:

```
habla: { debate, t0, t, texto }   // cada ~800 ms mientras el botón está apretado
habla: null                       // al soltar
```

Es el mismo formato que la ficha de un alumno (`texto` provisional hasta 300 caracteres; `t` es el
latido). Quien lo lee cuenta cuándo le llegó cada latido; pasados `AJ.LATIDO` (2,5 s) sin latido, el
moderador cuenta como callado (el celular se apagó o perdió la red). Lo dicho hasta ahí no se publica,
como pasa hoy con un alumno.

**Regla nueva** en `firestore.rules`, dentro de `salas/{codigo}`:

```
match /vivo/{doc} {
  allow read: if conSesion();
  allow write: if esProfe(codigo);
}
```

Hay que volver a desplegar las reglas. `pruebas/reglas-emulador.cjs` gana los casos: un alumno no
puede escribir en `vivo/`, el profesor sí, cualquiera con sesión lee.

### Al soltar

El control publica directamente en `mensajes` (el profesor ya puede crear mensajes):

```
{ tipo: "mod", nombre: "Moderador", voz: true, datos: { profe: true }, texto, debate, ronda, tramo, t }
```

con un id con prefijo `p` (los de los alumnos usan `a`). `debate` ya viene en el resumen que el
proyector publica en `privado/control`; el proyector le agrega `ronda` y `tramo`. Un texto vacío no
se publica; una sola palabra sí («Tiempo.» es una intervención válida del moderador).

En el proyector, `recibirChat` nunca manda a `hablarModeradora` un mensaje con `datos.profe`: el
profesor ya lo dijo en voz alta.

### El moderador toma la palabra

- Mientras el moderador habla (latido vigente), los teléfonos de quienes debaten apagan el botón de
  hablar y muestran «🎙 El moderador tiene la palabra».
- Si alguien tenía el botón apretado cuando el moderador empezó, su teléfono lo suelta y **envía** lo
  que llevaba (`soltarHablar({ enviar: true, inmediato: true, aviso: "🎙 El moderador tomó la palabra" })`).
- Como los alumnos sueltan, sus bancos del reloj de ajedrez dejan de correr solos; el moderador no
  tiene banco y su voz nunca hace correr uno.
- `salaOcupada` (moderacion.js) cuenta al moderador hablando: la voz del relator espera a que suelte.
- Un punto de información aceptado sigue con su reloj de 15 s aunque el moderador hable encima.
- Lo hace cumplir el teléfono, no las reglas (igual que «un lado sin tiempo solo puede escribir»).

### Sin reconocimiento de voz

Si el navegador del control no tiene `SpeechRecognition`, el botón HABLAR se reemplaza por un campo
«Escribir como Moderador» que publica el mismo mensaje con `voz: false`.

### `dictado.js`

El reconocimiento de voz de `jugar.js` (líneas ~747–1070: `Reconocedor`, el reinicio en `onend`
pasando lo provisional a final, el corte de 60 s, el `not-allowed` tras un reinicio, la repetición del
texto final en Android, `cortarDictado`) sale a un módulo nuevo `dictado.js` con una interfaz chica:

```
const d = crearDictado({ lang: "es-CL", maxMs: 60000,
  alParcial(texto), alCorte(textoFinal), alError(codigo) });
d.empezar(); d.soltar() → Promise<textoFinal>; d.abortar(); Dictado.disponible
```

`jugar.js` y `control.js` lo usan; el latido a Firestore, el botón y los avisos quedan en cada página.
`jugar.js` no cambia de comportamiento (lo comprueban las pruebas de punta a punta existentes).

## 3. Dónde se ve

### Proyector (`escenario.js`)

`online.js` escucha `vivo/moderador` y expone `window.moderadorHabla()` → `{ texto, t0 }` o `null`.

- Mientras el moderador habla, el **rótulo inferior** dice «🎙 MODERADOR» con su subtítulo en vivo
  (el final siempre a la vista, como los subtítulos de los alumnos). Manda sobre el rótulo de un
  mensaje anterior.
- Al soltar, su mensaje queda en el rótulo los `ESCN_ROTULO_MS` (12 s) de siempre.
- En la conversación de la pantalla del profesor, los mensajes `mod` muestran `m.nombre`
  («🎙 Moderador» o «🎙 Moderadora»), no `MOD_NOMBRE` fijo.

### Teléfonos (`jugar.js`)

Escuchan `vivo/moderador` (un documento chico) además de lo de hoy.

- **Público:** en la zona de «lo que se dice ahora», el subtítulo del moderador mientras habla.
- **Quienes debaten:** en la línea de la moderadora (la última que le habló a su grupo), el subtítulo
  del moderador mientras habla; el botón de hablar apagado mientras dure.

### El control (`control.html`, `control.js`)

Con `modProfe` encendido y el debate abierto, la pantalla se reordena para el pulgar:

```
┌─────────────────────────┐
│ Debate 2 · 4:12 [CERRAR]│   arriba: fase, reloj, relojes de ajedrez, quién habla;
│ G3 ● 2:31      G1  2:48 │   CERRAR chico, lejos del pulgar, con doble toque como hoy
│ habla: Ana (G3)         │
├─────────────────────────┤
│ ✋ TRIBUNA (2)           │   al medio: la cola
│ · Pedro: ¿y los costos… │
│ · 🤔 dudan de Luis: «…»  │
│            [+30s] [⚡]   │
├─────────────────────────┤
│      🎙  HABLAR          │   abajo: el tercio inferior completo
│   (mantén apretado)     │
└─────────────────────────┘
```

Fuera del debate abierto, o con `modProfe` apagado, el control es el de hoy.

**La cola de la tribuna.** El proyector la publica en `privado/control` como
`cola: [{ id, tipo, nombre, grupo, texto }]`, con tres tipos:

- `pregunta`: las ✋ pendientes (`preguntasPendientes`, filtradas con `limpiaFrase`).
- `fuente`: los mensajes que juntaron suficientes 🤔 (hoy en `S.mod.fuentesPendientes`).
- `mencion`: mensajes de alumnos con `@Moderador` o `@Moderadora` en el debate en curso.

Al tocar un ítem, el control manda la orden `{ cmd: "tribuna", arg: id }`. El proyector:

- `pregunta` → `lanzarPreguntaTribuna(p, destino)`: sale en grande con foto y nombre, y su autor gana
  el punto de oráculo, como hoy. El texto del mensaje va firmado «Moderador».
- `fuente` → `pedirFuenteTribuna(msgId)`: «🤔 LA TRIBUNA PIDE LA FUENTE», como hoy.
- `mencion` → solo sale de la cola (el profesor la responde de palabra).

Cada ítem tiene una ✕ que lo descarta sin lanzarlo (orden `{ cmd: "descartar", arg: id }`). Un ítem
lanzado o descartado sale de la cola y no vuelve.

## Pruebas

- **Lógica pura, `node --test pruebas/`:**
  - `ritmo.js` / moderacion: con `modProfe` no interviene (ni forzada) y la tribuna no se ofrece.
  - La cola: armarla desde preguntas, 🤔 y menciones; lanzar y descartar la sacan; no se repite.
  - Latido del moderador: vigente, vencido a los 2,5 s, `null`.
  - `dictado.js` con un `SpeechRecognition` simulado: parciales, final al soltar, reinicio en
    `onend`, corte de 60 s, sin repetición del final (el caso de Android).
  - `transcripcionChat` rotula con `m.nombre` y marca 🎤 los del moderador.
- **Reglas:** `pruebas/reglas-emulador.cjs` con los casos de `vivo/`.
- **De punta a punta,** con emuladores y Playwright (ver la nota de la memoria sobre el arnés): un
  debate de la semana 307 moderado desde el control, con `SpeechRecognition` simulado en el control y
  en los teléfonos. Se comprueba:
  - El subtítulo del moderador aparece en el proyector y en los teléfonos, y su mensaje queda en la
    conversación firmado «Moderador».
  - Si un alumno tiene el botón apretado y el moderador empieza, el teléfono del alumno envía lo que
    llevaba y apaga el botón hasta que el moderador suelta.
  - Una pregunta de la tribuna lanzada desde el control sale en el proyector con foto.
  - No aparece ningún mensaje de la moderadora de IA y la IA no habla.
  - Con `modProfe` apagado, el ciclo es el de hoy.

## Fuera de alcance

- La IA como apuntadora privada del profesor (sugerencias en el control).
- Moderar desde un aparato distinto del control.
- Que el moderador «dé la palabra» a un alumno con un botón (lo hace de palabra).
