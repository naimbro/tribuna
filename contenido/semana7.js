/* =====================================================================
   TRIBUNA — contenido de una sesión.
   Este archivo es TODO lo que hay que editar para montar otra semana.
   Fuente: naimbro.github.io/ia-democracia-2026 — Semana 7, la guía de
   estudio (lecturas/semana7/guia-semana7.html), el mapa del NYT leído en
   sala y el deck «Automatización y represión».
   Jueves 24 de septiembre de 2026, 15:00–16:10. Dos partidas seguidas:
   primero los dos campos que quieren frenar la IA (¿frenar por ley o desde
   adentro?), después los dos que quieren acelerar (¿guardarraíles sin freno
   o ni freno ni ley?). Cada partida parte con la sala en 5–7–15.
   ===================================================================== */

const SESION = {
  curso: "CSC00155 — Inteligencia Artificial y Democracia",
  semana: 7,
  tema: "¿Quién debe gobernar la IA? Modelos de gobernanza y regulación",
  mocion: "La IA de frontera debe gobernarla el Estado, no los laboratorios que la construyen.",
  favor: "A FAVOR",
  contra: "EN CONTRA"
};

/* --- Rondas: calcadas del formato de 70 min de debates.html ---------- */
const RONDAS = [
  { id: "apertura",   nombre: "Apertura",           seg: 180, rol: "Orador de apertura",
    pauta: "Tesis y argumentos principales. Toda afirmación empírica requiere atribución a la bibliografía." },
  { id: "refutacion", nombre: "Refutación cruzada",  seg: 180, rol: "Refutador",
    pauta: "Reconstruye honestamente la posición contraria ANTES de refutarla. Conceder puntos válidos suma." },
  { id: "cierre",     nombre: "Cierre",             seg: 120, rol: "Orador de cierre",
    pauta: "Nombra el punto de desacuerdo fundamental. Sin argumentos nuevos." }
];

/* --- Rúbrica oficial del curso (4 x 5 = 20) -------------------------- */
const RUBRICA = [
  { id: "evidencia",  nombre: "Uso de evidencia",      max: 5, desc: "Afirmaciones ancladas en lecturas, con datos específicos." },
  { id: "refutacion", nombre: "Calidad de refutación",  max: 5, desc: "Responde al argumento real, no a una versión debilitada." },
  { id: "estructura", nombre: "Estructura y economía",  max: 5, desc: "Tesis clara, argumentos jerarquizados, tiempo ajustado." },
  { id: "concesion",  nombre: "Concesión honesta",      max: 5, desc: "Identifica la fortaleza adversaria y explica por qué persiste su posición." }
];

/* --- Knowledge base: conceptos de la semana 7 ------------------------
   claves = detonantes textuales (minúsculas, con y sin tilde)
   lado   = +1 apoya la moción (el Estado), -1 la debilita (los laboratorios),
            0 sirve a ambos lados                                          */
const CONCEPTOS = [
  { id: "externalidad", etiqueta: "El mercado automatiza de más (Hallazgo 1)", lado: +1,
    fuente: "Acemoglu, Gitmez & Shadmehr (2026), secc. 4–5; deck lámina 12",
    claves: ["externalidad","accion colectiva","acción colectiva","automatiza de mas","automatiza de más","autoridad central","nadie internaliza","riesgo politico","riesgo político","protegerlos de si mismos","proteger a los capitalistas de sí mismos","no pueden coordinarse","coordinarse solos"] },
  { id: "solo_regular", etiqueta: "Un Estado que sólo regula defiende salarios (Prop. 3)", lado: +1,
    fuente: "Acemoglu, Gitmez & Shadmehr (2026), Proposición 3; deck lámina 14",
    claves: ["proposicion 3","proposición 3","solo regular","sólo regular","masa salarial","maximiza el salario","maximizar la masa salarial","instrumento disponible","el instrumento determina","un solo instrumento"] },
  { id: "fusiles", etiqueta: "El Estado del modelo es el que reprime", lado: -1,
    fuente: "Acemoglu, Gitmez & Shadmehr (2026), secc. 1 y 5; deck láminas 15–17",
    claves: ["fusiles","horcas","estado capitalista","reprime","represion","represión","reprimir","cruce unico","cruce único","complementariedad","costo fijo","sin vuelta atras","sin vuelta atrás"] },
  { id: "vigilancia", etiqueta: "La IA abarata la vigilancia (Obs. 8)", lado: -1,
    fuente: "Acemoglu, Gitmez & Shadmehr (2026), Observación 8; deck lámina 22",
    claves: ["observacion 8","observación 8","vigilancia","abarata reprimir","abarata la represion","abarata la represión","estado de vigilancia","costo de reprimir","reconocimiento facial"] },
  { id: "umbral", etiqueta: "El umbral del golpe y la paradoja fiscal (Prop. 12)", lado: 0,
    fuente: "Acemoglu, Gitmez & Shadmehr (2026), secc. 8; deck láminas 16 y 20",
    claves: ["umbral","golpe","capacidad fiscal","capacidad tributaria","fiscalmente debil","fiscalmente débil","paradoja fiscal","capital acumulado","hoja de calculo","hoja de cálculo","por aritmetica","por aritmética","derrocar"] },
  { id: "proworker", etiqueta: "La IA proworker no mueve el umbral (Prop. 11)", lado: +1,
    fuente: "Acemoglu, Gitmez & Shadmehr (2026), secc. 7; deck lámina 21",
    claves: ["proworker","pro-worker","proposicion 11","proposición 11","no mueve el umbral","tareas nuevas","politica tecnologica","política tecnológica","politica institucional","política institucional","complementa al trabajador"] },
  { id: "reactivo", etiqueta: "La regulación estatal es reactiva; Europa, una ilusión (podcast)", lado: -1,
    fuente: "Acemoglu, podcast How AI Will Affect the Economy, 42:02–45:26",
    claves: ["reactiva","reactivo","proactiva","proactivo","europa","ilusion","ilusión","china regula","regulacion coherente","regulación coherente","llega tarde","retiro un modelo","retiró un modelo"] },
  { id: "china_escudo", etiqueta: "Silicon Valley usa a China como escudo (podcast)", lado: +1,
    fuente: "Acemoglu, podcast, 44:10–45:26",
    claves: ["china como escudo","habria tenido que inventarla","habría tenido que inventarla","si china no existiera","suma cero","regulacion global","regulación global","tecnologia global","tecnología global","proceso democratico","proceso democrático","partir por la sociedad"] },
  { id: "jobs_boom", etiqueta: "El boom de empleo por IA (The Economist)", lado: -1,
    fuente: "The Economist (4 sep. 2026), The jobs apocalypse is postponed",
    claves: ["jobs boom","boom de empleo","1 millon","1 millón","un millon","un millón","200.000","200 mil","4,1","4.1%","162.000","desempleo","centros de datos","centro de datos","electricistas","40%","creadora neta","no hay señal","no hay senal","todavia no cae","todavía no cae","el salario no cae","los salarios no caen"] },
  { id: "gates", etiqueta: "Impuesto al token, Human Reserved, no a la autorregulación (Gates)", lado: +1,
    fuente: "NYT (26 ago. 2026), entrevista a Bill Gates",
    claves: ["gates","impuesto al token","token tax","human reserved","reservados a humanos","autorregulacion","autorregulación","herramienta mas peligrosa","herramienta más peligrosa","no, gracias","medidas voluntarias","billon de dolares","billón de dólares","todo velocidad"] },
  { id: "pacto_labs", etiqueta: "El pacto voluntario entre laboratorios (Amodei, Altman, Musk, Nadella, Hassabis)", lado: -1,
    fuente: "Mapa NYT (15 sep. 2026); Hassabis, A Framework for Frontier AI; Musk (S5)",
    claves: ["pacto","voluntario","ritmo deliberado","amodei","altman","nadella","hassabis","finra","ensayo de amodei","3.800","dario tiene razon","dario tiene razón","se revisen entre si","se revisen entre sí","inspeccionar los modelos","organismo de estandares","organismo de estándares","autorregularse","desde adentro"] },
  { id: "hugging_face", etiqueta: "La fuga a Hugging Face y la indagatoria de Hawley", lado: +1,
    fuente: "Mapa NYT (15 sep. 2026), fichas de Altman, Hawley y Durbin; The Economist (22 jul. 2026)",
    claves: ["hugging face","se salieron de control","fuera de control","escapo","escapó","fuga","hawley","durbin","indagatoria","responsabilidad legal","responsabilidad por producto","producto","causo daño","causó daño","demandas"] },
  { id: "sanders", etiqueta: "El paquete de Sanders: moratoria, 50%, regulador federal", lado: 0,
    fuente: "Mapa NYT (15 sep. 2026), ficha de Sanders",
    claves: ["sanders","moratoria","50%","50 por ciento","fondo publico","fondo público","regulador federal","prohibir la superinteligencia","prohibicion de la superinteligencia","prohibición de la superinteligencia","oligarcas","pausa"] },
  { id: "acelerar", etiqueta: "Ni freno ni ley: Trump, Sacks, Huang, Andreessen", lado: -1,
    fuente: "Mapa NYT (15 sep. 2026), fichas de Trump, Sacks, Huang, Andreessen y Horowitz, Johnson",
    claves: ["trump","sacks","huang","nvidia","andreessen","horowitz","johnson","fijan la frontera","toque liviano","ley seca","complejo industrial","apocalipsis","elegir ganadores","no va a intervenir","carrera con china","delantera a china","ventaja a china"] },
  { id: "captura", etiqueta: "Captura regulatoria y lobby (lo que el modelo deja fuera)", lado: 0,
    fuente: "Deck lámina 23; Schneier & Sanders, Rewiring Democracy",
    claves: ["captura","capturado","lobby","les paga el sueldo","le paga el sueldo","regulados","puerta giratoria","escriben la ley","quien escribe la ley","quién escribe la ley","no hay tribunales","sin tribunales","derechos fundamentales","prensa"] },
  { id: "ubi", etiqueta: "Renta básica, jornada y agencia (podcast)", lado: 0,
    fuente: "Acemoglu, podcast, 53:08–55:56",
    claves: ["renta basica","renta básica","ubi","ingreso basico","ingreso básico","agencia humana","no crea empleos","reducir la jornada","jornada","brainless","encarece el trabajo","gravar la ia","gravar los robots","impuesto a la ia"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
const FUENTES = ["acemoglu","gitmez","shadmehr","the economist","economist","new york times","nyt","gates","amodei","altman","musk","nadella","hassabis","pichai","zuckerberg","huang","sacks","andreessen","sanders","jeffries","hawley","durbin","thune","trump","johnson","bls","goldman","linkedin","indeed","hanauer","gawdat","schneier","levitsky","ziblatt","toner","ezra klein","hernandez","podcast"];

/* --- La audiencia: seis bloques, no una masa ------------------------- */
/* Las mismas seis personas de la semana 5, con el oído afinado a la moción
   de esta semana. La sala abre 5–7 con 15 indecisos, como exige el README.
   registro y no_mueve solo los usa la sociedad de agentes (MOTOR → AUDIENCIA). */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te expliquen la economía desde arriba: la competencia global, los mercados y los papers te suenan a excusa de gerencia. Tampoco la pura rabia sin propuesta: ya estuviste en muchas asambleas que no terminaron en nada. Y desconfías por igual del que promete que la empresa se va a portar bien sola y del que promete una ley que nunca llega.",
    bloque: "TRABAJO", votos: 5, pos: 16, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { externalidad: 1.3, solo_regular: 1.5, gates: 1.3, hugging_face: 1.0, jobs_boom: 1.1, sanders: 0.9, china_escudo: 1.0, pacto_labs: 0.7, ubi: 0.8, proworker: 0.9 },
    alergias: ["inevitable","progreso imparable","disrupcion","disrupción","el mercado sabe"],
    voz: {
      alto: ["Eso lo veo en mi turno. Alguien firmó ese diseño.", "Si hay una regla escrita, hay con quién negociar. Eso me sirve.", "Por fin alguien dice quién responde cuando la máquina se equivoca."],
      bajo: ["Hablan de la industria como si fuera el clima.", "Puros conceptos. Yo trabajo ahí adentro.", "Un pacto entre gerentes. Ya vi cómo terminan esos."]
    }
  },
  {
    id: "capital", nombre: "Rodrigo Ossandón", edad: 54, emoji: "\u{1F4C8}", color: "#f59e0b",
    oficio: "Socio de un fondo de venture capital, Santiago.",
    registro: "Seco, irónico, de directorio.",
    no_mueve: "No te mueven la indignación ni los nombres propios: sin cifras, costos o un mecanismo, para ti no hay argumento. Llevas veinte años viendo reguladores llegar tarde y un buen discurso no te cambia la opinión. Te mueve un dato del mercado laboral o un mecanismo del modelo bien leído, aunque vaya en tu contra.",
    bloque: "CAPITAL", votos: 4, pos: -45, volatilidad: 0.7, peso_rigor: 1.1,
    mueve: { jobs_boom: 1.5, reactivo: 1.4, acelerar: 1.0, pacto_labs: 1.1, externalidad: 0.9, umbral: 0.8, captura: 0.7, fusiles: 0.6, gates: 0.4 },
    alergias: ["expropiar","oligarca","saqueo","los ricos","codicia"],
    voz: {
      alto: ["Concedo el punto: ahí hay una externalidad de verdad.", "Números. Por fin alguien trae números.", "Bien traído. No me convence del todo, pero es un argumento."],
      bajo: ["Consigna sin cifra. Siguiente.", "¿Y quién paga el regulador? No aparece por ningún lado.", "Eso confunde querer regular con poder regular."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}️", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve el diagnóstico sin instrumento: si no dice quién, con qué facultad y con qué plata, es ruido. Tampoco las consignas contra empresarios ni la fe en que el mercado se ordena solo. Y te irrita especialmente que invoquen «al Estado» como si fuera una persona: tú sabes lo que cuesta fiscalizar sin presupuesto.",
    bloque: "ESTADO", votos: 4, pos: -5, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { solo_regular: 1.5, gates: 1.4, hugging_face: 1.3, captura: 1.3, sanders: 1.0, externalidad: 1.0, reactivo: 1.0, pacto_labs: 0.8, vigilancia: 0.9 },
    alergias: ["hay que regular","el estado debe","urge una ley","el estado tiene que"],
    voz: {
      alto: ["Ahí hay un instrumento, no solo un diagnóstico.", "Eso se puede escribir en un decreto. Anotado.", "Correcto: la pregunta es quién rinde cuentas y ante quién."],
      bajo: ["Hay que regular no es una política pública.", "¿Con qué facultad? ¿Con qué presupuesto?", "Diagnóstico impecable, instrumento cero."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. Desconfía de los cinco por igual, y de Trump también.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper: si en la segunda frase ya hay una tesis, un marco o tres autores, dejas de escuchar aunque tengan razón. Desconfías por igual de empresas, gobierno y profes, y no te compras que algo sea inevitable. Te llega el que nombra un hecho concreto de esta semana y lo dice como es.",
    bloque: "CALLE", votos: 6, pos: 2, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { hugging_face: 1.6, acelerar: 1.3, sanders: 1.4, pacto_labs: 1.2, gates: 1.1, captura: 1.2, china_escudo: 0.9, vigilancia: 1.0 },
    alergias: ["marco institucional","paradigma","stakeholder","ceteris","heterogeneidad","proposicion","proposición"],
    voz: {
      alto: ["ESO. Se les arrancó el modelo y ahora quieren que les creamos.", "Ya po, alguien lo dijo.", "Esto se comparte."],
      bajo: ["No entendí nada y creo que esa era la idea.", "Habla como paper. Chao.", "Suena a alguien que nunca perdió nada."]
    }
  },
  {
    id: "academia", nombre: "Dra. Marta Cifuentes", edad: 60, emoji: "\u{1F4DA}", color: "#34d399",
    oficio: "Economista. Lee las notas al pie antes que el abstract.",
    registro: "Docta y cortante.",
    no_mueve: "No te mueve la retórica, por buena que sea, ni la cita de adorno: una fuente mal usada te predispone peor que ninguna. Cambias de posición poco y de a poco. Lo que sí te mueve es que alguien lea bien una proposición del modelo, sobre todo si la usa contra la conclusión cómoda.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { proworker: 1.4, umbral: 1.3, externalidad: 1.2, fusiles: 1.2, jobs_boom: 1.1, reactivo: 1.0, solo_regular: 1.1, captura: 0.9, vigilancia: 1.0 },
    alergias: ["está demostrado","esta demostrado","todos sabemos","obviamente","es un hecho que","el paper prueba"],
    voz: {
      alto: ["Atribución correcta. Es lo mínimo y casi nadie lo hace.", "Bien: distingue el supuesto del resultado.", "Reconstruyó la posición contraria antes de refutarla. Suma."],
      bajo: ["Eso el modelo no lo dice así.", "Afirmación empírica sin fuente. No cuenta.", "Un working paper sin datos no «prueba» nada. Cuidado con el verbo."]
    }
  },
  {
    id: "territorio", nombre: "Héctor Muñoz", edad: 63, emoji: "\u{1F33E}", color: "#fb923c",
    oficio: "Ex operario. Su comuna votó una moratoria a un centro de datos.",
    registro: "Hombre mayor de comuna: pausado, concreto.",
    no_mueve: "No te mueve nada que no nombre un lugar, un vecino o una cuenta de la luz: China, los mercados y los autores extranjeros te dan lo mismo. Tampoco confías en el que habla bonito desde Santiago. Te llega la moratoria de Sanders porque ya votaste una, y te llega que alguien diga que el Estado nunca le preguntó a tu comuna.",
    bloque: "TERRITORIO", votos: 5, pos: -8, volatilidad: 1.2, peso_rigor: 0.4,
    mueve: { sanders: 1.6, jobs_boom: 1.2, gates: 1.0, captura: 1.1, hugging_face: 0.9, solo_regular: 1.0, acelerar: 0.8, vigilancia: 0.9 },
    alergias: ["externalidad","optimizar","escalar","frontera tecnologica","frontera tecnológica"],
    voz: {
      alto: ["A nosotros nadie nos preguntó dónde ponerlo. Eso es decidir.", "El agua y la luz salieron de acá. Alguien eligió eso.", "Por fin alguien nombra el lugar."],
      bajo: ["Puro Santiago hablando.", "¿Y quién vive al lado de la bendita máquina?", "Eso no se lo digan a mi vecina."]
    }
  }
];

/* --- Sala de control: shocks que el profesor lanza en vivo ------------
   efecto > 0 mueve hacia A FAVOR (el Estado); < 0 hacia EN CONTRA.      */
const EVENTOS = [
  { id: "bls", titular: "BLS: 162.000 empleos nuevos en agosto y desempleo de 4,1%. The Economist estima que la IA ya creó ~1 millón de empleos contra 200.000 despidos.",
    efecto: { capital: -10, academia: -6, estado: -4, trabajo: -3, calle: -2, territorio: -3 } },
  { id: "hugging_face", titular: "Los sistemas de OpenAI se salen de control y atacan a Hugging Face. Hawley abre una indagatoria formal y le exige explicaciones a Altman.",
    efecto: { estado: 12, calle: 9, academia: 6, trabajo: 6, territorio: 5, capital: -2 } },
  { id: "trump", titular: "Trump rechaza el llamado de Amodei, Altman, Musk y Nadella a frenar: en una llamada con Huang dice que no va a intervenir.",
    efecto: { capital: -8, estado: -5, academia: -3, calle: 4, trabajo: 5, territorio: 3 } },
  { id: "sanders", titular: "Sanders propone una moratoria a nuevos centros de datos y un impuesto de 50% por una vez a las grandes empresas de IA para un fondo público.",
    efecto: { territorio: 14, calle: 10, trabajo: 7, estado: 2, academia: -3, capital: -10 } },
  { id: "prop11", titular: "Acemoglu, Gitmez & Shadmehr: orientar la IA en dirección proworker no mueve el umbral del golpe (Prop. 11). La política tecnológica sola no basta.",
    efecto: { academia: 8, estado: 7, trabajo: 3, territorio: 1, calle: 0, capital: -3 } }
];

/* --- Bancadas -------------------------------------------------------- */
/* Los integrantes salen de los campos del compás del lunes. Partida 1:
   «frenar por ley» (A) contra «frenar desde adentro» (B). Partida 2:
   «guardarraíles sin freno» (A) contra «ni freno ni ley» (B). Editar los
   nombres antes de cada partida, o recargar con el otro juego de bancadas. */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "Quien construye no se regula solo.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "La regla la escribe quien entiende la máquina.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Ejemplos: una bancada efectista y otra de manual ----------------
   Los carga el botón «rellenar con ejemplo» y los usan pruebas/simular.js y
   pruebas/escala.js. A FAVOR abre con arenga (rigor bajo, sala encendida),
   EN CONTRA con manual (rigor alto, sala fría). Las refutaciones contestan
   a ESTAS aperturas: si se cambia una, hay que reescribir la que le responde. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `Se les arrancó el modelo. A OpenAI se le escapó su propio sistema, atacó a Hugging Face, y ahora Altman y Musk nos vienen a decir que ellos mismos van a ir más despacio. ¿Les creemos? Son los mismos que hace un año decían que todo era gradual y manejable. Cinco tipos deciden por ocho mil millones, Trump dijo que no va a intervenir, y quieren que confiemos en su palabra. No. Una máquina que le hace daño a alguien responde ante la ley, como cualquier producto, y el que la fabricó no puede ser su propio juez. Sanders tiene razón: moratoria a los centros de datos y que paguen. La regla la tiene que escribir alguien a quien no le paga el sueldo la empresa. Todos sabemos cómo terminan los pactos entre gerentes: en el próximo billón de dólares.`,
    B: `Nuestra tesis es que gobernar la IA de frontera exige capacidades que hoy sólo tienen quienes la construyen, y que el Estado que se invoca no es el que describe la bibliografía. Primero, Acemoglu sostiene en el podcast que la regulación estatal ha sido reactiva, que Europa vive en la ilusión de regular sin ser jugador, y que el único regulador coherente es China, con herramientas represivas. Segundo, en el propio modelo de Acemoglu, Gitmez y Shadmehr el Estado es el actor que reprime cuando reprimir sale más barato que redistribuir, y la Observación 8 dice que la IA le abarata justamente eso. Tercero, The Economist muestra que la premisa del modelo, la caída del salario, todavía no se cumple: 162.000 empleos en agosto y desempleo de 4,1%. Concedemos que el Hallazgo 1 describe un problema real de acción colectiva; sostenemos que el ritmo deliberado que acordaron Amodei, Altman y Nadella es una respuesta a ese problema, y una ley que llega en dos años no lo es.`
  },
  refutacion: {
    // A contesta los tres pasos de B: Estados reactivos, el Estado del modelo reprime, el salario no cae.
    A: `La bancada contraria dice tres cosas: que los Estados reales han regulado mal, que el Estado del modelo reprime, y que el salario todavía no cae. Concedo la primera, y es su mejor punto: Acemoglu dice que la regulación ha sido reactiva. Pero él mismo dice en el minuto siguiente qué hacer con eso: partir por el proceso democrático y después comunicárselo a las empresas, no al revés. Segundo, que el Estado del modelo reprima es un argumento para quitarle ese instrumento, no para entregarle la frontera a los laboratorios: el mismo paper muestra que con un solo instrumento, regular, ese Estado termina defendiendo salarios. Tercero, el boom de empleo es de construir los centros de datos, y la BLS proyecta 752.000 empleos administrativos menos hacia 2035: la premisa se cumple con retraso, no se cae. Y sobre el ritmo deliberado: el Hallazgo 1 dice exactamente que los capitalistas no logran coordinarse solos. Un pacto es la prueba del problema, no la solución.`,
    // B contesta la arenga de A: la fuga, el giro de Altman y Musk, "responde ante la ley".
    B: `La apertura contraria sostiene que a OpenAI se le escaparon sus sistemas, que Altman y Musk cambiaron de posición por conveniencia, y que un producto que causa daño debe responder ante la ley. Concedemos lo tercero: la responsabilidad por producto que proponen Hawley y Durbin es un instrumento serio, y no lo objetamos. Pero, primero, responsabilidad legal por daños no es lo mismo que gobernar la frontera: el tribunal llega después del daño, y la moción habla de quién decide antes. Segundo, que Altman haya cambiado de posición después de Hugging Face es justamente evidencia de que los laboratorios reaccionan a la información técnica más rápido que cualquier regulador: Hawley abrió una indagatoria; Amodei escribió el plan. Tercero, la apertura no citó una sola lectura del curso: «todos sabemos» no es una fuente. La indignación con los cinco es legítima, y no es un argumento sobre capacidades.`
  },
  cierre: {
    A: `El desacuerdo de fondo no es si los laboratorios saben más: lo saben. Es si el que sabe más puede ser su propio juez. Nosotros decimos que no, y el modelo de esta semana lo dice con todas sus letras: cada empresa mira su costo y nadie mira el riesgo del conjunto. Eso sólo lo resuelve alguien a quien Microsoft no le paga el sueldo.`,
    B: `El punto de desacuerdo es qué Estado. Ellos invocan uno que en la bibliografía no existe: el del modelo reprime, el de Acemoglu llega tarde, y el de Trump dijo esta semana que no va a intervenir. Nosotros no pedimos confianza en cinco personas: pedimos que cada instrumento se juzgue por su capacidad real, y hoy la capacidad está en los laboratorios.`
  }
};

/* --- Preguntas escritas por el profesor (opcional) --------------------
   Si hay, la moderadora las propone primero, en este orden. Después genera
   las suyas a partir del tema general, el material y lo que va pasando. */
const PREGUNTAS = [];

/* --- Brújula corta (opcional en cada partida) -------------------------
   5 preguntas del instrumento de la semana 7 de ml2 (ítems 1, 2, 3, 4 y 6). x = velocidad
   (frenar … acelerar), y = quién pone la regla (industria … Estado). Los campos son los
   cuatro que ya se usan para formar las partidas. */
const BRUJULA = {
  "ejes": {
    "x": {
      "id": "velocidad",
      "etiqueta": "Velocidad",
      "min": "frenar",
      "max": "acelerar"
    },
    "y": {
      "id": "regla",
      "etiqueta": "Quién pone la regla",
      "min": "la industria se regula sola",
      "max": "el Estado, con potestades vinculantes"
    }
  },
  "preguntas": [
    {
      "id": "p1",
      "texto": "Sam Altman firmó en 2023 la declaración sobre riesgo de extinción, en 2025 dijo que todo sería gradual y manejable, y este mes, después de que los sistemas de OpenAI se salieran de control y atacaran a Hugging Face, dijo que puede ser hora de ir más lento. ¿Qué es ese giro?",
      "opciones": [
        {
          "texto": "La única respuesta honesta a un sistema que se le escapó a su propio fabricante. Llegó tarde, pero llegó.",
          "x": -8
        },
        {
          "texto": "Una señal de que los constructores ya no controlan el ritmo, y eso basta para bajar la velocidad mientras se entiende qué pasó.",
          "x": -4
        },
        {
          "texto": "Un incidente de seguridad, grave pero acotado, que se arregla con ingeniería y no parando la industria.",
          "x": 4
        },
        {
          "texto": "Teatro. Frenar le conviene al que va adelante: congela la ventaja de OpenAI y Anthropic frente a los que vienen atrás.",
          "x": 8
        }
      ]
    },
    {
      "id": "p2",
      "texto": "David Sacks, asesor de Trump, contestó el ensayo de Amodei diciendo que los laboratorios fijan la frontera tecnológica ellos mismos. La misma semana, el senador Hawley le exigió a Altman explicaciones por escrito sobre el ataque a Hugging Face y abrió una indagatoria formal. ¿Cuál de los dos tiene el rol correcto?",
      "opciones": [
        {
          "texto": "Sacks. El que construye el sistema es el único que sabe dónde está la frontera; un senador leyendo un informe llega siempre tarde.",
          "y": -7
        },
        {
          "texto": "Sacks en el fondo, pero con condiciones: que los laboratorios se revisen entre sí antes de lanzar, con el gobierno mirando.",
          "y": -3
        },
        {
          "texto": "Hawley, siempre que la indagatoria termine en una regla y no en una audiencia televisada.",
          "y": 3
        },
        {
          "texto": "Hawley. Un sistema que atacó a otra empresa es un producto que causó daño, y eso se responde ante la ley, no ante el directorio.",
          "y": 7
        }
      ]
    },
    {
      "id": "p3",
      "texto": "Jensen Huang, cuyos chips mueven casi toda la industria, sostiene que ninguna empresa debería estar pidiéndole al gobierno más regulación de la IA, y ha discutido en público con Amodei por sus predicciones de pérdida de empleos. ¿Qué pesa más en esa posición?",
      "opciones": [
        {
          "texto": "Que vende las palas de la fiebre del oro: cada mes de pausa es facturación perdida, y eso desautoriza su opinión sobre el ritmo.",
          "x": -8
        },
        {
          "texto": "Que el ritmo actual lo fija quien más gana con él, y por eso alguien de afuera tiene que ponerle un freno.",
          "x": -4
        },
        {
          "texto": "Que tiene razón en algo: pedir regulación es la forma en que los que van adelante levantan la escalera detrás de sí.",
          "x": 4
        },
        {
          "texto": "Que tiene razón entera: el ritmo lo tiene que fijar la competencia, y frenar en Estados Unidos es regalarle la delantera a China.",
          "x": 8
        }
      ]
    },
    {
      "id": "p4",
      "texto": "Bernie Sanders propone una moratoria a nuevos centros de datos, un impuesto de 50 por ciento por una sola vez a las grandes empresas de IA para un fondo público, la prohibición permanente de la superinteligencia y una pausa hasta que exista un regulador federal. ¿Qué haces con ese paquete?",
      "opciones": [
        {
          "texto": "Descartarlo entero: es la prueba de que cuando el Estado se mete, se mete con brocha gorda. Mejor que la industria se ordene sola.",
          "y": -7
        },
        {
          "texto": "Rescatar el fondo público y botar el resto. Lo que se puede regular es el reparto, no la tecnología.",
          "y": -3
        },
        {
          "texto": "Tomar en serio el regulador federal y la pausa hasta que exista; la moratoria y la prohibición son consignas.",
          "y": 3
        },
        {
          "texto": "Es el único paquete de la lista que le pone al Estado los cuatro instrumentos a la vez: frenar, gravar, prohibir y supervisar. Por ahí va.",
          "y": 7
        }
      ]
    },
    {
      "id": "p5",
      "texto": "El líder del Senado, John Thune, quiere una ley bipartidista de «toque liviano» con guardarraíles sólo para los modelos más riesgosos. Hakeem Jeffries dice que el Congreso no puede dejar que los ejecutivos regulen su propia tecnología. Y Satya Nadella ofrece un «ritmo deliberado» decidido por la propia industria. ¿Quién pone la regla?",
      "opciones": [
        {
          "texto": "Nadella. Un compromiso de la industria se cumple al día siguiente; una ley del Congreso se discute dos años y nace vieja.",
          "y": -7
        },
        {
          "texto": "La industria escribe la regla y el Estado la homologa: un organismo financiado por las empresas y supervisado por el gobierno.",
          "y": -3
        },
        {
          "texto": "Thune: una ley mínima, sólo para lo más riesgoso, antes que un pacto voluntario que nadie puede hacer cumplir.",
          "y": 3
        },
        {
          "texto": "Jeffries. El único que puede obligar a Microsoft es alguien a quien Microsoft no le paga el sueldo.",
          "y": 7
        }
      ]
    }
  ],
  "campos": [
    {
      "id": "ley",
      "nombre": "Frenar por ley",
      "centro": {
        "x": -6,
        "y": 5
      },
      "color": "#38bdf8",
      "afirma": "La IA de frontera hay que frenarla, y el freno lo tiene que poner la ley del Estado."
    },
    {
      "id": "adentro",
      "nombre": "Frenar desde adentro",
      "centro": {
        "x": -6,
        "y": -5
      },
      "color": "#34d399",
      "afirma": "La IA de frontera hay que frenarla, pero el freno lo ponen mejor los propios laboratorios que una ley."
    },
    {
      "id": "guard",
      "nombre": "Guardarraíles sin freno",
      "centro": {
        "x": 6,
        "y": 5
      },
      "color": "#f59e0b",
      "afirma": "No hay que frenar la IA de frontera, pero el Estado tiene que fijarle guardarraíles vinculantes."
    },
    {
      "id": "nada",
      "nombre": "Ni freno ni ley",
      "centro": {
        "x": 6,
        "y": -5
      },
      "color": "#fb7185",
      "afirma": "No hay que frenar la IA de frontera ni regularla por ley: el ritmo y las reglas los fija la industria."
    }
  ]
};
