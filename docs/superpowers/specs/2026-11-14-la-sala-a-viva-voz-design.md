# La Sala a viva voz — diseño

Fecha: 14 de noviembre de 2026
Estado: implementado el mismo día, a pedido del profesor («haz full implementation, por si acaso»),
sin ronda de aprobación previa. Las decisiones de abajo copian a Tribuna con un solo micrófono y a
la galería cuando había que elegir.
Se apoya en: `2026-11-10-un-microfono-design.md` y `2026-11-11-la-galeria-design.md`.

## 1. Por qué

El taller del 16 y 19 de noviembre va a ser analógico: las bancadas discuten, redactan en papel y
defienden de pie. La app queda para dos cosas, como en Tribuna: **votaciones y reacciones**, y
**puntaje**. La Sala del 13-nov pedía redactar en el teléfono, no tenía reacciones y sus senadores
simulados leían un texto tipeado, no lo que se dijo.

## 2. Qué cambia

1. **El micrófono es el teléfono del profesor.** La testera, abierta con la cuenta que creó la
   sala, tiene un interruptor «Activar el micrófono». Activo, el micrófono sigue a la palabra: se
   abre cuando una bancada tiene la palabra y se cierra cuando no la tiene nadie. Lo que se oye se
   corta en párrafos (30 s o cambio de bancada), igual que en Tribuna (`oido.js`, `dictado.js`).
2. **La redacción es en papel.** El teléfono muestra el formato y el artículo; el formulario del
   13-nov queda plegado como alternativa.
3. **La indicación entra leída.** En la lectura, la bancada autora tiene la palabra y lee su papel.
   Si al avanzar no hay una indicación entregada por teléfono, lo dictado pasa al comparado
   (rotulado «dictada en la sala»). La Secretaría puede corregir el texto a mano.
4. **Aplausos.** Durante el debate de un nudo, cada estudiante tiene tres aplausos por bancada que
   habla, sobre párrafos ya dichos. No se aplaude a la bancada propia. El proyector muestra cuántos
   lleva cada párrafo.
5. **Los senadores oyen el debate.** Además de la indicación, leen la transcripción del nudo.
   Cada uno vota como antes y agrega: el mejor párrafo de quien defiende y de quien responde, y si
   cada bancada cumplió el piso común (citar un artículo y aplicar un concepto de cada módulo).
6. **Puntaje.**
   - Por bancada: sala 2, Senado simulado 2 y patrocinio 1, como antes. Los fundamentos (1 punto,
     máximo 2) ahora los valida la mayoría de los senadores a partir de lo dicho; el presidente
     puede sumar o quitar con los botones de siempre.
   - Por estudiante (nuevo, como la galería): 3 por acertar la apuesta y 2 por haber aplaudido el
     párrafo que los senadores eligieron como el mejor de cada bancada.

Sin micrófono todo funciona como el 13-nov: los senadores juzgan lo escrito y la nota del presidente.

## 3. Datos

Sin colecciones nuevas y sin tocar `firestore.rules`.

- `salas/{codigo}.voz.{id} = { n, f, b, texto, t0 }`: un párrafo cerrado (nudo, fase, bancada).
  Lo escribe la cuenta que creó la sala. Va en el documento de la sala para que los tres tipos de
  pantalla lo reciban sin otro oyente.
- `salas/{codigo}/vivo/voz = { b, texto, t }`: lo que se está oyendo y el latido del micrófono.
  Solo lo escucha el hemiciclo.
- `jugadores/{uid}.apl.{n} = [id]`: los aplausos de un estudiante en el nudo n.
- `salas/{codigo}.n.{n}.apl.de = { uid: [id] }`: la foto de los aplausos al cerrar el debate. Los
  puntos se calculan con la foto.
- `salas/{codigo}.n.{n}.sen.mejores = { bancada: id }` y `.piso = { bancada: true | false }`.
- `ind.{n}.origen` suma dos valores: `dictada` y `secretaria`.

## 4. Piezas

- `sala-logica.js`: párrafos (`dichoDe`, `debateDe`, `dictadoDe`, `indDictada`), aplausos
  (`aplaudir`, `quedanAplausos`, `aplausosDe`, `cuentaAplausos`), el juicio (`promptSenador` con
  transcripción, `leerSenador`, `juicioSenado`), puntaje (`puntaje` con piso, `puntosEscano`,
  `tablaEscanos`), acciones nuevas (`dicho`, `dictada`, `indicar`) y el guion del ensayo.
- `sala-voz.js` (nuevo): une el oído de Tribuna con la testera. Sigue a `sala.palabra`, publica la
  voz en vivo, guarda párrafos, pide que la pantalla no se apague.
- `sala-canal.js`: `publicarVoz` y `escucharVoz`, en Firestore y en ensayo.
- `sala-testera.js`, `sala-hemiciclo.js`, `sala-escano.js`, `sala.css`: las tres pantallas.

## 5. Ensayo

`sala.html?local=1` como siempre. El enlace a la testera lleva `simular=1`: el micrófono «oye» un
guion armado con el contenido del nudo, sin hablar. Los escaños de ensayo aplauden. Sin llave de IA
los senadores votan «de ensayo», eligen como mejor el párrafo más largo y no validan fundamentos.

## 6. Lo que no se probó aquí

El reconocimiento de voz real en un Android y las reglas de Firestore con una sala real: el ensayo
local no las ejercita. Hay que hacer una pasada en línea antes de la clase.
