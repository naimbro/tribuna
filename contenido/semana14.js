/* =====================================================================
   TRIBUNA — contenido de una sesión.
   CSC00155 · Inteligencia Artificial y Democracia · Semana 14.
   Jueves 12 de noviembre de 2026, 15:00–16:10. Unos 20–25 alumnos.

   Material (naimbro.github.io/ia-democracia-2026), revisado el 12 de noviembre
   contra el deck y el syllabus tal como quedaron el 9 de noviembre:
   1) El deck «¿Puede la IA reemplazar a los políticos?»
      (semana14_ia_deliberativa.html): Hidalgo y el paquete (láminas 5–7,
      Gudiño-Rosero, Grandi & Hidalgo 2024), las tres objeciones de Innerarity
      (9–11), a quién representa el modelo (12–15: Abeliuk, Gaete & Bro 2026 y
      The Economist), la respuesta desde la IA (16–20: Evans & Weyl 2026, el
      puente de la app, MiroFish, el balance), Viña (22) y el cierre
      deliberativo (23–25: Habermas, Fishkin y America in One Room).
   2) La actividad del lunes: cada alumno entrenó su avatar en la app del curso
      y comparó sus respuestas con las de él. Referencia: Viña, correlación
      promedio 0,675, alta en recursos naturales (0,95) y baja en aborto (0,16).
   3) Lo ya leído: Chambers y Habermas (Semana 6), The Economist sobre el Estado
      británico (Semana 12) y Pitkin en las complementarias de la Semana 13.
   4) Los casos del syllabus: Moltbook y MiroFish.
   Ninguna cifra que no esté en esos materiales. Schneier & Sanders, Diella y
   los chatbots de Brasil salieron del deck el 9 de noviembre: aquí tampoco están.

   Modo de juego: un micrófono y galería (index.html). Dos duelos largos. Al
   entrar a la galería cada estudiante responde la brújula corta y queda en uno
   de los cuatro campos, que es su grupo. En cada duelo debaten los dos campos
   opuestos y cada uno defiende lo suyo: el campo que afirma la moción va a
   favor. En el juego clásico (clasico.html) sigue sirviendo con la rotación.
   ===================================================================== */

const SESION = {
  curso: "CSC00155 — Inteligencia Artificial y Democracia",
  semana: 14,
  tema: "¿Puede la IA reemplazar a los políticos? Avatares, representación y deliberación",
  mocion: "Un avatar entrenado con mis respuestas me representa mejor que mi diputado.",
  grupos: 5,                // solo el juego clásico: 5 grupos de 4–5 (el profesor lo cambia en la portada)
  compas: true,             // un micrófono: los campos de BRUJULA son los grupos de la galería
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
  { id: "estructura", nombre: "Claridad y economía",    max: 5, desc: "Se entiende qué sostiene y no hace perder el tiempo. Vale igual en un mensaje largo o en varios cortos." },
  { id: "concesion",  nombre: "Concesión honesta",      max: 5, desc: "Identifica la fortaleza adversaria y explica por qué persiste su posición." }
];

/* --- Knowledge base: conceptos de la semana 14 -----------------------
   claves = detonantes textuales (minúsculas, con y sin tilde)
   lado   = +1 ayuda a quien va A FAVOR en los dos duelos (el avatar, los
            agentes que deliberan), -1 a quien va EN CONTRA, 0 sirve a ambos.
   La etiqueta y la fuente son el material que leen los jueces de IA: van en
   orden de importancia, porque el prompt corta la lista a los 9.000 caracteres. */
const CONCEPTOS = [
  /* ---- La propuesta (Parte I del deck) ---- */
  { id: "paquete", etiqueta: "Votamos por paquetes: el problema es de ancho de banda (Hidalgo)", lado: +1,
    fuente: "Hidalgo, TED (2018) [06:59–09:44]: nueve proyectos de ley al día, un representante personalizado para cada uno y un paquete que no te satisface; «no necesitamos tecnología de comunicación, sino tecnología de aumentación»; deck lámina 5",
    claves: ["paquete","paquetes","cada cuatro años","cada cuatro anos","ancho de banda","bundle","programa completo","todo el programa","tema a tema","propuesta por propuesta","hidalgo","democracia aumentada","aumentacion","aumentación","nueve proyectos","gemelo digital"] },
  { id: "brasil_acierto", etiqueta: "En Brasil 2022 el avatar acierta más que la regla del paquete, casi siempre", lado: +1,
    fuente: "Gudiño-Rosero, Grandi & Hidalgo (2024), Phil. Trans. R. Soc. A: 267 personas eligen entre pares de 67 propuestas de Lula y Bolsonaro, 8.719 elecciones, seis LLM ajustados con la mitad y probados con la otra mitad. Fig. 2a: liberal que elige a Lula, paquete 0,71 y avatares de 0,82 a 0,88; con conservadores el paquete apenas supera el azar (0,56 y 0,55); el avatar gana en 21 de 24 celdas; deck láminas 6–7",
    claves: ["brasil","brazucracia","267","67 propuestas","8.719","8719","0,88","0,82","0,71","88%","82%","71%","21 de 24","regla del paquete","acierta mas","acierta más","aciertan mas","aciertan más","lula","bolsonaro","gudino","gudiño","seis modelos"] },
  { id: "brasil_limite", etiqueta: "Donde el avatar no gana: el liberal que elige una propuesta de Bolsonaro", lado: -1,
    fuente: "Gudiño-Rosero, Grandi & Hidalgo (2024), Fig. 2a: en esa celda los seis modelos van de 0,50 a 0,71 y tres quedan bajo el paquete (0,63); deck lámina 7",
    claves: ["0,63","0,50","bajo el paquete","tres modelos","contra su lado","fuera de su programa","3 de 24","tres de 24"] },
  { id: "delegacion_traicion", etiqueta: "Entre elección y elección la opinión se olvida o se traiciona", lado: +1,
    fuente: "Innerarity (2024), el diagnóstico del malestar [00:00–02:00]: la delegación solo se verifica en momentos puntuales",
    claves: ["entre eleccion y eleccion","entre elección y elección","se olvida","traiciona","traicionan","promesas de campaña","promesas de campana","no me escucha","no nos escuchan","una vez cada","momentos puntuales","malestar democratico","malestar democrático"] },
  { id: "vina_acierta", etiqueta: "Viña: el avatar coincide alto con su humano en la mayoría de las preguntas", lado: +1,
    fuente: "Análisis avatares vs. humanos, Viña: promedio 0,675; recursos naturales 0,95, referendos 0,94, ciencia 0,93, salario mínimo 0,88, regular la IA 0,86, representantes humanos 0,85, matrimonio igualitario 0,82; deck lámina 22",
    claves: ["viña","vina","0,95","0,94","0,93","0,86","0,675","0.675","recursos naturales","referendos","salario minimo","salario mínimo","matrimonio igualitario","mi avatar acerto","mi avatar acertó","coincidio","coincidió","mi avatar respondio igual","mi avatar respondió igual"] },
  { id: "declaras", etiqueta: "El avatar se entrena con lo que declaras, no con tus huellas de consumo", lado: +1,
    fuente: "Deck lámina 20, balance: la respuesta desde la IA a «¿son tuyas?»; lo que queda abierto: lo que declaras también se forma afuera",
    claves: ["lo que declaro","lo que declaras","mis respuestas","mi planilla","planilla","no mis huellas","no con mis huellas","yo lo entrene","yo lo entrené","lo entrene yo","lo entrené yo"] },

  /* ---- La réplica (Parte II) ---- */
  { id: "origen", etiqueta: "¿Son tuyas? El mercado no solo registra preferencias: también las fabrica (Innerarity)", lado: -1,
    fuente: "Innerarity (2024), primera objeción [04:26–05:35]; deck lámina 9",
    claves: ["son tuyas","son nuestras","fabrica preferencias","crea preferencias","crea necesidades","huellas de consumo","consumo","capitalismo","lo que dejamos en","no somos nuestras huellas","se forma afuera"] },
  { id: "pasado", etiqueta: "Los datos son siempre pasados: dicen quién fuiste, no quién quieres ser (Innerarity)", lado: -1,
    fuente: "Innerarity (2024), segunda objeción [06:56–09:22]: «podemos querer ser mejores de lo que de hecho somos»; la ley de Massachusetts sobre la historia salarial, la natalidad de Arendt, la brecha entre lo que declaramos y lo que hacemos. Balance (lámina 20): ninguna respuesta desde la IA, el yo aspiracional sigue fuera del modelo; deck láminas 9–10",
    claves: ["pasado","pasadas","yo aspiracional","aspiracional","quien fuiste","quién fuiste","quien quieres ser","quién quieres ser","dejar de fumar","natalidad","arendt","massachusetts","historia salarial","historial salarial","ser mejores","conductismo","romper rutinas"] },
  { id: "agregacion", etiqueta: "Sumar no es deliberar: los intereses también se forman conversando (Innerarity; Semana 6)", lado: -1,
    fuente: "Innerarity (2024), tercera objeción [09:18–13:11]; Chambers (2020) y la democracia deliberativa, Semana 6; deck lámina 9",
    claves: ["agregar","agregacion","agregación","sumar preferencias","sumar no es","deliberar","deliberacion","deliberación","chambers","espacio publico","espacio público","conversando","se forman","conversacion","conversación","asamblea","parlamento"] },
  { id: "ignorancia", etiqueta: "Hay democracia porque no sabemos lo que nos conviene (Innerarity)", lado: -1,
    fuente: "Innerarity (2024), conclusión [13:11–15:00]; deck lámina 11",
    claves: ["ignorancia","no sabemos lo que nos conviene","lo que nos conviene","incertidumbre","aproximativ","no son exactas","poca ambigüedad","poca ambiguedad","input y output","binario"] },
  { id: "pitkin", etiqueta: "Representar no es reflejar: es actuar por alguien y responder ante él (Pitkin, Semana 13)", lado: -1,
    fuente: "Pitkin (1967), The Concept of Representation, complementaria de la Semana 13; deck lámina 26",
    claves: ["pitkin","descriptiva","sustantiva","actuar por","en nombre de","espejo","reflejar","refleja","rendir cuentas","rinde cuentas","responder ante","mandato","revocar","destituir","no reelegir","reelegir"] },

  /* ---- ¿A quién representa el modelo? (Parte III) ---- */
  { id: "liberales", etiqueta: "El avatar acierta más con quien ya tenía voz: liberales y universitarios (Brasil)", lado: -1,
    fuente: "Gudiño-Rosero, Grandi & Hidalgo (2024): los seis modelos aciertan más con liberales que con conservadores, y más con universitarios que con quienes no lo son; deck lámina 14",
    claves: ["liberales","conservadores","centristas","universitarios","sin universidad","no universitarios","educacion universitaria","educación universitaria","acierta mas con","acierta más con","ya tenia voz","ya tenía voz"] },
  { id: "chile_sesgo", etiqueta: "Los modelos simulan peor la opinión de Chile que la de EE.UU. (Abeliuk, Gaete & Bro)", lado: -1,
    fuente: "Abeliuk, Gaete & Bro (2026), EPJ Data Science 15: 75: encuesta CEP n.º 88 frente a ANES 2020; en Chile fallan más con mujeres, baja escolaridad y religiosos; el riesgo es la injusticia epistémica con las sociedades subregistradas; deck láminas 13–14",
    claves: ["abeliuk","gaete","injusticia epistemica","injusticia epistémica","subregistrad","cep","anes","peor a chile","peor con chile","mujeres","religiosos","baja escolaridad","baja educacion","baja educación","estadounidense","entrenados en ingles","entrenados en inglés","datos de estados unidos"] },
  { id: "valores", etiqueta: "Un avatar no parte de cero: los modelos son más seculares y liberales que cualquier país (The Economist)", lado: -1,
    fuente: "The Economist (25 jun. 2026), «AI models' values are very different from most people's»: 25 modelos frente a la Encuesta Mundial de Valores; GPT es más secular que cualquier país; ningún modelo refleja a la mayoría de los países africanos o musulmanes; en términos de EE.UU. son demócratas, salvo DeepSeek; deck láminas 12 y 15",
    claves: ["secular","seculares","encuesta mundial de valores","world values","valores del modelo","valores de los modelos","son democratas","son demócratas","deepseek","africanos","musulmanes","ansari","gemini","grok","post-entrenamiento","alineamiento","su propio mundo","no parte de cero"] },
  { id: "de_quien", etiqueta: "¿El avatar de quién? Quien entrena el modelo le pone su mundo", lado: -1,
    fuente: "Deck láminas 12 y 26: un avatar parte de un modelo con su propio mundo; Abeliuk, Gaete & Bro (2026) y The Economist (2026)",
    claves: ["de quien es","de quién es","avatar de quien","avatar de quién","la empresa que lo hizo","quien lo entrena","quién lo entrena","openai","meta","dueño del modelo","dueno del modelo","lealtad","leal"] },
  { id: "persuasion", etiqueta: "Un modelo sesgado corre a quien conversa con él (Fisher et al.)", lado: -1,
    fuente: "The Economist (25 jun. 2026), sobre el experimento de Jillian Fisher et al.: demócratas y republicanos se corren hacia el sesgo del modelo, más si no se les avisa",
    claves: ["persuad","persuasion","persuasión","fisher","sesgo republicano","sesgo democrata","sesgo demócrata","se corren","cambian de posicion","cambian de posición","influir en el voto","manipul"] },
  { id: "vina_falla", etiqueta: "Viña: el avatar falla justo en aborto, clima y migración", lado: -1,
    fuente: "Análisis avatares vs. humanos, Viña: aborto 0,16, cambio climático 0,23, migración 0,39, rol del Estado 0,51, impuestos 0,59; deck lámina 22",
    claves: ["aborto","0,16","0,23","0,39","0,51","0,59","clima","cambio climatico","cambio climático","migracion","migración","temas morales","lo que divide","mi avatar fallo","mi avatar falló","no me represento","no me representó","se equivoco","se equivocó"] },

  /* ---- La respuesta desde la IA (Parte IV) ---- */
  { id: "alineacion_inversa", etiqueta: "Alineación inversa: rediseñar las instituciones, no los modelos (Evans & Weyl)", lado: +1,
    fuente: "Evans & Weyl (2026), Science, «In the image of their tools»: las instituciones que funcionaron copiaron la arquitectura de la tecnología de su época (era industrial, jerarquía; internet, capas; redes neuronales, espacio: ubicar por posición y no por etiqueta, ponderar por atención, acreditar por aporte marginal); la fábrica electrificada rindió poco mientras conservó el diseño de la era del vapor; deck lámina 17",
    claves: ["evans","weyl","alineacion inversa","alineación inversa","rediseñar las instituciones","redisenar las instituciones","in the image","jerarquia","jerarquía","capas","espacio latente","por posicion","por posición","aporte marginal","fabrica electrificada","fábrica electrificada","era del vapor"] },
  { id: "puente", etiqueta: "El puente: premiar lo que comparten grupos distintos, no solo contar la mayoría", lado: +1,
    fuente: "Evans & Weyl (2026) y el puente de Community Notes y Polis, en la app del curso: «la mayoría cuenta; la atención pondera»; 40 copias de una persona hacen saltar la mayoría, pero en el mapa caen en un solo punto; deck láminas 18 y 20",
    claves: ["puente","community notes","polis","la atencion pondera","la atención pondera","40 copias","cuarenta copias","bots","un solo punto","el mapa","grupos distintos","lo que comparten"] },
  { id: "mirofish", etiqueta: "MiroFish: avatares que conversan en una red simulada y vuelven a votar", lado: 0,
    fuente: "MiroFish, código abierto; deck láminas 19–20: responde a «los intereses se forman conversando», pero queda abierto si deliberar acerca al avatar a su humano o lo empuja hacia los valores del modelo: ¿conversan como ustedes, o como el modelo?",
    claves: ["mirofish","miro fish","red simulada","red social simulada","avatares en red","avatares solos","vuelven a votar","conversan entre si","conversan entre sí","como el modelo","multiagente"] },
  { id: "opacidad", etiqueta: "Lo que no se entiende cuesta legitimarlo (lo admiten Evans & Weyl)", lado: -1,
    fuente: "Deck lámina 20: el espacio latente predice mejor, pero lo que no se entiende cuesta legitimarlo",
    claves: ["no se entiende","cuesta legitimar","caja negra","opaco","opacidad","explicar la decision","explicar la decisión","nadie entiende"] },

  /* ---- El cierre deliberativo ---- */
  { id: "fishkin", etiqueta: "Deliberar cambia a la gente: America in One Room (Fishkin)", lado: -1,
    fuente: "Fishkin, Siu, Diamond & Bradburn (2021), APSR: 523 votantes, muestra representativa de EE.UU., cuatro días en Texas (2019), contra un grupo de control de 844; demócratas y republicanos se acercaron en 22 de 26 propuestas muy polarizadas, y subió la simpatía hacia el otro partido (+13 y +14 puntos); nada parecido en el control. ¿Un avatar entrenado con tus respuestas de antes habría cambiado así?; deck láminas 24–25",
    claves: ["fishkin","america in one room","523","844","22 de 26","texas","cuatro dias","cuatro días","grupo de control","se acercaron","simpatia","simpatía","cambiaron de opinion","cambiaron de opinión","respuestas de antes"] },
  { id: "habermas", etiqueta: "Legítimo por el proceso: una deliberación pública abierta, informada y libre de coacción (Habermas)", lado: -1,
    fuente: "Habermas, legitimidad por el proceso (paráfrasis), Semana 6; deck lámina 23",
    claves: ["habermas","deliberativa","deliberacion publica","deliberación pública","libre de coaccion","libre de coacción","abierta e informada","por el proceso"] },

  /* ---- Sirven a los dos lados ---- */
  { id: "resultado_procedimiento", etiqueta: "Legitimidad por resultado (Hidalgo) o por procedimiento (Innerarity)", lado: 0,
    fuente: "Deck lámina 11, la tensión de la semana: si el avatar acierta más que el paquete, representa mejor; o acertarle a quien fuiste no es representar a quien quieres ser. Pregunta motivadora del syllabus",
    claves: ["legitimidad","legitimo","legítimo","ilegitimo","ilegítimo","por resultado","por procedimiento","gobernar mejor","gobierna mejor","acertar no es","acertar no basta","resultados"] },
  { id: "moltbook", etiqueta: "Moltbook: una red social donde solo conversan agentes de IA", lado: 0,
    fuente: "Caso del syllabus; The Economist (2 feb. 2026), «A social network for AI agents is full of introspection and threats»",
    claves: ["moltbook","red social de agentes","red social para agentes","agentes hablando","introspeccion","introspección","amenazas"] },
  { id: "flooding", etiqueta: "Si todos tienen agente, el Estado se satura (agentic flooding)", lado: 0,
    fuente: "The Economist (6 ago. 2026), «How AI is breaking the British state», Semana 12",
    claves: ["agentic flooding","flooding","inundacion","inundación","se satura","saturar","se ahoga","reclamos","britanico","británico","reino unido"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
const FUENTES = [
  "hidalgo", "gudino", "gudiño", "grandi", "innerarity", "abeliuk", "gaete", "bro", "evans", "weyl", "fishkin",
  "the economist", "economist", "fisher", "pitkin", "chambers", "habermas", "arendt", "science",
  "cep", "anes", "encuesta mundial de valores", "world values", "viña", "vina", "ted", "congreso futuro",
  "mirofish", "moltbook", "community notes", "polis", "america in one room"
];

/* --- La audiencia: seis bloques, no una masa ------------------------- */
/* Las mismas seis personas de las semanas 5 y 7, con el oído afinado a la
   moción de esta semana. La sala abre 4–3 con 20 indecisos (README).
   Solo el juego clásico usa este bloque. */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te prometan que una máquina te va a representar mejor: ya ves en el turno cómo los sistemas se equivocan y nadie responde. Tampoco te mueve la nostalgia por el diputado: hace años que no le ves la cara. Te mueve saber quién responde cuando el avatar vota mal, y si el sindicato pierde o gana voz.",
    bloque: "TRABAJO", votos: 5, pos: -4, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { delegacion_traicion: 1.3, de_quien: 1.4, pitkin: 1.1, fishkin: 1.0, paquete: 1.0, puente: 1.1, vina_falla: 0.9, flooding: 0.8 },
    alergias: ["inevitable","el futuro ya llegó","el futuro ya llego","disrupcion","disrupción"],
    voz: {
      alto: ["Eso es lo que pregunto en el turno: ¿quién responde cuando falla?", "Al diputado no lo veo nunca. Eso es verdad.", "Si el avatar lo entrena la empresa, la voz es de la empresa."],
      bajo: ["Puro paper. ¿Y quién firma?", "Me hablan de acertar como si votar fuera un examen.", "Otra máquina que decide por mí sin preguntarme."]
    }
  },
  {
    id: "capital", nombre: "Rodrigo Ossandón", edad: 54, emoji: "\u{1F4C8}", color: "#f59e0b",
    oficio: "Socio de un fondo de venture capital, Santiago.",
    registro: "Seco, irónico, de directorio.",
    no_mueve: "No te mueven las objeciones filosóficas sin un número: si el avatar acierta más, para ti la carga de la prueba la tiene el otro lado. Tampoco te mueve la indignación con las empresas tecnológicas. Te mueve un dato bien leído, aunque vaya en tu contra: si el modelo falla en Chile, quieres saber cuánto y con quién.",
    bloque: "CAPITAL", votos: 4, pos: 20, volatilidad: 0.7, peso_rigor: 1.1,
    mueve: { brasil_acierto: 1.5, paquete: 1.3, vina_acierta: 1.2, chile_sesgo: 1.1, liberales: 0.9, brasil_limite: 0.9, alineacion_inversa: 1.0, resultado_procedimiento: 1.0, agregacion: 0.5 },
    alergias: ["neoliberal","las big tech","codicia","los ricos","oligarca"],
    voz: {
      alto: ["Ochenta y ocho contra setenta y uno. Ahí hay un argumento.", "Concedo: si falla con la mitad del país, no sirve.", "Números. Por fin alguien trae números."],
      bajo: ["Filosofía sin cifra. Siguiente.", "¿Y el diputado acierta cuánto? Nadie lo midió.", "Eso es nostalgia por la urna, no un argumento."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}\u{FE0F}", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve la idea de que cada ciudadano tenga un agente sin decir quién procesa lo que esos agentes mandan: ya ves la bandeja de entrada del ministerio. Tampoco te mueve que invoquen «la deliberación» sin decir dónde ocurre. Te mueve que alguien diga quién responde, ante quién, y cómo se destituye al que decide.",
    bloque: "ESTADO", votos: 4, pos: -6, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { flooding: 1.5, pitkin: 1.3, puente: 1.3, opacidad: 1.1, de_quien: 1.0, alineacion_inversa: 1.2, brasil_acierto: 0.8, agregacion: 0.9 },
    alergias: ["el estado debe","hay que modernizar","transformacion digital","transformación digital"],
    voz: {
      alto: ["Eso: ¿ante quién responde y cómo se le saca?", "Rediseñar la institución antes que el modelo: eso sí lo firmo.", "Correcto. Si todos mandan agentes, nadie es escuchado."],
      bajo: ["¿Y quién lee lo que mandan veinte millones de agentes?", "Deliberación, ¿dónde? ¿En qué sala?", "Un avatar no se puede acusar constitucionalmente."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. No conoce el nombre de su diputado.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper ni que defienda a los políticos como si se lo merecieran. Tampoco te compras que la IA sea neutral: ya viste lo que hace Grok. Te llega lo concreto: lo que contestó tu propio avatar el lunes, los agentes de Moltbook conversando solos, cuarenta copias de una persona que dan vuelta una votación.",
    bloque: "CALLE", votos: 6, pos: 6, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { delegacion_traicion: 1.4, paquete: 1.2, moltbook: 1.4, vina_falla: 1.3, vina_acierta: 1.2, mirofish: 1.1, valores: 1.0, persuasion: 1.2, de_quien: 1.1 },
    alergias: ["deliberativa","paradigma","epistemica","epistémica","agregacion de preferencias","agregación de preferencias","normativo"],
    voz: {
      alto: ["Mi avatar sabía más de mí que mi diputado. Así de triste.", "Ya po, ¿y quién entrena al avatar? ¿Musk?", "Esto se comparte."],
      bajo: ["Habla como paper. Chao.", "Defender al diputado en 2026 es valiente.", "No entendí nada y creo que esa era la idea."]
    }
  },
  {
    id: "academia", nombre: "Dra. Marta Cifuentes", edad: 60, emoji: "\u{1F4DA}", color: "#34d399",
    oficio: "Politóloga. Lee las notas al pie antes que el abstract.",
    registro: "Docta y cortante.",
    no_mueve: "No te mueve la retórica ni la cita de adorno: decir «Habermas» no es usar a Habermas. Te irrita que confundan acertar con representar, o que generalicen 267 participantes a todo Brasil. Te mueve que alguien distinga el resultado del procedimiento y use bien un estudio, sobre todo contra la conclusión cómoda.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { agregacion: 1.4, pitkin: 1.4, resultado_procedimiento: 1.3, chile_sesgo: 1.3, liberales: 1.2, brasil_acierto: 1.1, pasado: 1.1, persuasion: 1.0, fishkin: 1.3, habermas: 1.0 },
    alergias: ["está demostrado","esta demostrado","todos sabemos","obviamente","el paper prueba","es un hecho que"],
    voz: {
      alto: ["Bien: distingue acertar de representar.", "Atribución correcta. 267 personas, no Brasil. Gracias.", "Reconstruyó la posición contraria antes de refutarla. Suma."],
      bajo: ["Eso el estudio no lo dice así.", "Deliberar no es opinar en voz alta.", "Afirmación empírica sin fuente. No cuenta."]
    }
  },
  {
    id: "territorio", nombre: "Héctor Muñoz", edad: 63, emoji: "\u{1F33E}", color: "#fb923c",
    oficio: "Ex operario. Dirigente de junta de vecinos en una comuna rural.",
    registro: "Hombre mayor de comuna: pausado, concreto.",
    no_mueve: "No te mueve nada que no nombre a gente como tú: a ti nunca te preguntó una encuesta y dudas que una máquina entrenada en inglés sepa lo que piensa tu vecina. Tampoco confías en el diputado que solo aparece en campaña. Te llega que alguien diga a quién se equivoca más el modelo, y que la junta de vecinos se discute cara a cara.",
    bloque: "TERRITORIO", votos: 5, pos: -5, volatilidad: 1.2, peso_rigor: 0.4,
    mueve: { chile_sesgo: 1.6, delegacion_traicion: 1.3, agregacion: 1.1, liberales: 1.2, fishkin: 1.1, valores: 1.0, vina_falla: 1.0 },
    alergias: ["escalar","optimizar","eficiencia","algoritmo"],
    voz: {
      alto: ["A mi vecina la máquina no la conoce. Eso es verdad.", "El diputado viene una vez cada cuatro años. Eso también.", "En la junta las cosas se conversan. No se suman."],
      bajo: ["Puro Santiago hablando.", "¿Y la señora del campo tiene avatar?", "Eso no se lo digan a la junta."]
    }
  }
];

/* --- El panel de jueces de esta semana --------------------------------
   El criterio común va una sola vez, en JUECES_COMUN; cada juez tiene un
   foco propio que no se pisa con el de los otros (lección del 23-sep-2026). */
const JUECES_COMUN = "que citen un dato o un autor de los materiales de la semana (Hidalgo y Gudiño-Rosero, Innerarity, Abeliuk, Gaete y Bro, The Economist, Evans y Weyl, Fishkin) o lo que pasó con su propio avatar el lunes, y que contesten lo que el rival dijo de verdad";
const JUECES = [
  { id: "academica", nombre: "La académica", emoji: "\u{1F393}",
    valora: "la lectura correcta de los estudios: que Gudiño-Rosero midió a 267 participantes y no a Brasil, que 0,88 es su mejor celda y no el promedio, que Abeliuk, Gaete y Bro comparan la CEP con la ANES, y que acertar una elección entre pares no es lo mismo que representar",
    molesta: "generalizar una cifra más allá de su muestra, inventar números, y la autoridad sin argumento" },
  { id: "teorica", nombre: "La teórica política", emoji: "\u{1F3DB}",
    valora: "la distinción entre legitimidad por resultado y por procedimiento, y conceptos usados con precisión: deliberación (Habermas y Chambers, Semana 6), representación según Pitkin, agregación según Innerarity",
    molesta: "usar «deliberar» como sinónimo de opinar o de conversar, y confundir representar con reflejar" },
  { id: "jurista", nombre: "El jurista", emoji: "\u{2696}",
    valora: "quién responde cuando el avatar o el agente decide mal: mandato, revocación, rendición de cuentas, quién entrena el modelo y ante quién se reclama",
    molesta: "proponer avatares o agentes sin decir quién los fiscaliza ni cómo se les quita el poder" },
  { id: "periodista", nombre: "La periodista", emoji: "\u{1F4F0}",
    valora: "que respondan la pregunta que se les hizo, con hechos verificables y escenas concretas: los votantes de Fishkin en Texas, los agentes de Moltbook, las cuarenta copias que dan vuelta una votación, lo que contestó su avatar en una pregunta precisa",
    molesta: "la jerga, las evasivas y repetir un nombre como talismán sin decir qué dijo" },
  { id: "activista", nombre: "La activista", emoji: "\u{270A}",
    valora: "quién queda fuera: los que el modelo predice peor (mujeres, religiosos, baja escolaridad, Chile frente a EE.UU.) y quién pierde voz si la representación o la deliberación pasan a un modelo",
    molesta: "hablar de «los ciudadanos» como si todos estuvieran igual de representados por el modelo" }
];

/* --- Sala de control: shocks que el profesor lanza en vivo ------------
   efecto > 0 mueve hacia A FAVOR (el avatar); < 0 hacia EN CONTRA.
   Todos salen de los materiales de la semana. Solo el juego clásico.    */
const EVENTOS = [
  { id: "brasil", titular: "Gudiño-Rosero, Grandi e Hidalgo: en Brasil 2022, cuando un liberal elige una propuesta de Lula, los avatares aciertan entre 0,82 y 0,88; la regla del paquete, 0,71. El avatar gana en 21 de 24 celdas.",
    efecto: { capital: 12, calle: 6, academia: 4, estado: 3, trabajo: 2, territorio: 1 } },
  { id: "chile", titular: "Abeliuk, Gaete y Bro: los modelos simulan mejor la opinión de EE.UU. que la de Chile. En Chile fallan más con mujeres, baja escolaridad y religiosos.",
    efecto: { territorio: -14, academia: -9, trabajo: -6, calle: -5, estado: -4, capital: -5 } },
  { id: "valores", titular: "The Economist prueba 25 modelos con la Encuesta Mundial de Valores: GPT es más secular que cualquier país. Ningún modelo refleja a la mayoría de los países africanos o musulmanes.",
    efecto: { territorio: -9, calle: -6, academia: -6, trabajo: -4, estado: -3, capital: -2 } },
  { id: "fishkin", titular: "Fishkin: 523 votantes deliberan cuatro días en Texas. Demócratas y republicanos se acercan en 22 de 26 propuestas muy polarizadas; en el grupo de control, que no deliberó, nada parecido.",
    efecto: { academia: -10, territorio: -7, estado: -6, trabajo: -4, calle: -3, capital: -2 } },
  { id: "copias", titular: "En la app del curso, 40 copias de una misma persona hacen saltar la mayoría a otra propuesta. En el mapa, las 40 caen en un solo punto.",
    efecto: { estado: -6, calle: -5, trabajo: -4, territorio: -3, academia: 3, capital: 4 } },
  { id: "flooding", titular: "The Economist: en el Reino Unido, los reclamos redactados por agentes de IA saturan al Estado. Lo llaman agentic flooding.",
    efecto: { estado: -12, academia: -5, capital: -3, territorio: -3, trabajo: -2, calle: 2 } },
  { id: "vina", titular: "Viña: el avatar coincide con su humano en 0,95 sobre recursos naturales, pero solo en 0,16 sobre el aborto. Promedio: 0,675.",
    efecto: { academia: -6, territorio: -4, trabajo: -2, calle: 3, capital: 4, estado: -1 } },
  { id: "persuasion", titular: "Fisher et al.: votantes que conversan con un modelo sesgado se corren hacia el sesgo del modelo, sobre todo si nadie les avisa.",
    efecto: { academia: -8, calle: -7, trabajo: -5, territorio: -5, estado: -4, capital: -3 } }
];

/* --- Bancadas -------------------------------------------------------- */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "Te conoce mejor que tu diputado.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "Acertarle a quien fuiste no es representarte.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Ejemplos: una bancada efectista y otra de manual ----------------
   A FAVOR abre con arenga (rigor bajo, sala encendida), EN CONTRA con
   manual (rigor alto, sala fría). Las refutaciones contestan a ESTAS
   aperturas: si se cambia una, hay que reescribir la que le responde.
   Solo el juego clásico. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `¿Alguien aquí sabe el nombre de su diputado? Yo tampoco. Lo vemos una vez cada cuatro años, nos vende un paquete entero de promesas y después vota lo que le dice el partido. Mi avatar, en cambio, el lunes contestó como yo en casi todo. Y no es solo mi caso: en Brasil los avatares acertaron hasta 88 de cada 100 veces lo que elegía cada persona, y votar por paquete, como hacemos hoy, no pasó de 71. Hidalgo tiene razón: el problema de la democracia es que le preguntamos muy poco a la gente y muy de vez en cuando. Un avatar no se cansa, no se vende y no te olvida apenas gana. Todos sabemos que el diputado no nos representa. Por lo menos el avatar lo intenta.`,
    B: `Nuestra tesis es que acertar no es representar. Primero, Innerarity: los datos con que se entrena un avatar son siempre pasados, y la política existe justamente para que podamos querer ser distintos de lo que fuimos. Un avatar le acierta a quien fuiste. Segundo, el propio estudio de Brasil muestra que los modelos aciertan más con liberales y universitarios que con conservadores y sin universidad, y Abeliuk, Gaete y Bro encuentran lo mismo en Chile: los modelos simulan peor la opinión chilena que la estadounidense, y fallan más con mujeres, religiosos y baja escolaridad. El avatar representa mejor a quien ya tenía voz. Tercero, Pitkin: representar es actuar por alguien y responder ante él, no reflejarlo. Al diputado se le puede no reelegir; al avatar, ¿quién lo destituye? Concedemos que el diagnóstico de Hidalgo es real: votar por paquetes cada cuatro años es poco. La respuesta es deliberar mejor, como los 523 votantes de Fishkin en Texas, no reemplazar.`
  },
  refutacion: {
    // A contesta los tres pasos de B: datos pasados, sesgo contra quien tiene menos voz, rendición de cuentas.
    A: `La bancada contraria dice tres cosas: que los datos son pasados, que el modelo representa peor a quien tiene menos voz, y que al avatar no se lo puede destituir. Concedo la segunda, y es su mejor punto: Abeliuk, Gaete y Bro muestran que en Chile el modelo falla más con mujeres y religiosos. Pero eso es un argumento para entrenarlo mejor con datos chilenos, no para quedarse con un diputado que también representa peor a esos mismos grupos, y al que nadie midió. Primero, sobre los datos pasados: el voto también es pasado; elegimos hoy a alguien que decide durante cuatro años, y el avatar se puede reentrenar cada mes. Tercero, sobre la destitución: el avatar es mío. Si no me representa, lo apago. Es la forma más directa de rendición de cuentas que existe.`,
    // B contesta la arenga de A: el diputado ausente, el 88 de cada 100, "no se cansa, no se vende".
    B: `La apertura contraria sostiene que el diputado está ausente, que en Brasil el avatar acertó 88 de cada 100 veces, y que el avatar no se cansa ni se vende. Concedemos lo primero: el diagnóstico de la ausencia es real, y lo comparte Innerarity. Pero, segundo, el 0,88 es la mejor celda del estudio, un liberal que elige propuestas de Lula, con 267 participantes y no con Brasil; cuando ese mismo liberal elige una propuesta de Bolsonaro, tres de los seis modelos quedan bajo la regla del paquete. Y mide si el avatar adivina cuál de dos propuestas prefieres: adivinar una preferencia no es defenderla en una negociación. Tercero, que el avatar no se venda supone que no tiene dueño. The Economist muestra que cada modelo trae sus propios valores, más seculares que cualquier país, y Fisher encuentra que un modelo sesgado corre a quien conversa con él. «Todos sabemos» no es una fuente, y en Viña los avatares fallaron justo en aborto, clima y migración, que es donde más importa representar.`
  },
  cierre: {
    A: `El desacuerdo de fondo no es si el avatar es perfecto: no lo es. Es contra qué se compara. Ellos lo comparan con un representante ideal que delibera y rinde cuentas; nosotros, con el diputado que tenemos, que no escucha y no responde. Contra ese, el avatar gana.`,
    B: `El punto de desacuerdo es qué significa representar. Ellos dicen acertar; nosotros, deliberar y responder ante alguien. Un avatar puede ayudar a un diputado a escuchar mejor. Pero si representar fuera solo acertar, bastaría con una encuesta, y nunca hemos dicho que una encuesta nos gobierna.`
  }
};

/* --- Los dos duelos de la clase ----------------------------------------
   `afirma` es el campo de la brújula que sostiene la pregunta: ese campo va
   A FAVOR y su opuesto en el mapa, EN CONTRA (los otros dos campos siguen el
   duelo desde la galería). `favor` y `contra` son la postura de cada lado en
   una frase.
   1) La moción del syllabus: Hidalgo contra Innerarity (Partes I a III).
   2) La respuesta desde la IA y el cierre deliberativo (Parte IV, Fishkin). */
const PREGUNTAS = [
  { texto: "Un avatar entrenado con mis respuestas me representa mejor que mi diputado.", afirma: "avatar_ya",
    favor: "El avatar me representa mejor: acierta más a lo que quiero que un diputado que vota por paquete.",
    contra: "El diputado, con todos sus defectos, representa algo que un avatar que solo acierta no puede." },
  { texto: "Si millones de agentes deliberan y votan propuestas, eso es más democrático que un Congreso de 155 diputados.", afirma: "agentes",
    favor: "Más democrático: todos participan, por medio de agentes que conversan entre sí y responden a su dueño.",
    contra: "Menos democrático: agentes que conversan entre sí no son ciudadanos que deliberan y cambian de opinión." }
];

/* --- Brújula corta ------------------------------------------------------
   Reglas de la semana 7: cada eje es UNA pregunta de fondo con tres ítems;
   enunciados de ≤ 120 caracteres y opciones de ≤ 50.

   x — ¿Qué hace legítimo a un representante? Que acierte (resultado, −) ↔
       que delibere y responda ante alguien (procedimiento, +). Es la
       tensión Hidalgo / Innerarity del deck (lámina 11).
   y — ¿Cuánto le delegarías a una IA? Poco: escucharme (−) ↔ mucho: actuar
       por mí (+).
   En el juego de un micrófono los cuatro campos son los grupos de la galería,
   en este orden (1 a 4), y cada duelo enfrenta a dos campos opuestos. */
const BRUJULA = {
  ejes: {
    x: { id: "legitimidad", etiqueta: "¿Qué hace legítimo a un representante?", min: "que acierte", max: "que delibere y responda" },
    y: { id: "delegar", etiqueta: "¿Cuánto le delegarías a una IA?", min: "escucharme", max: "actuar por mí" }
  },
  preguntas: [
    { id: "p1", texto: "Tu avatar predice tu voto de hoy. Si deliberaras cuatro días, quizá votarías distinto. ¿Cuál voto vale?",
      opciones: [
        { texto: "El de hoy: es lo que quiero", x: -8 },
        { texto: "El de hoy, salvo en los temas grandes", x: -3 },
        { texto: "El de después, si de verdad deliberé", x: 3 },
        { texto: "El de después: sin deliberar no hay voto", x: 8 }] },
    { id: "p2", texto: "¿Dejarías que una IA te diga por quién votar?",
      opciones: [
        { texto: "Nunca, ni como consejo", y: -8 },
        { texto: "Como consejo, y decido yo", y: -3 },
        { texto: "Sí, si me explica por qué", y: 3 },
        { texto: "Sí, y que vote ella si quiere", y: 8 }] },
    { id: "p3", texto: "En Brasil los avatares acertaron más que votar por paquete. ¿Eso los hace mejores representantes?",
      opciones: [
        { texto: "Sí: representar es acertar", x: -8 },
        { texto: "En gran parte, sí", x: -3 },
        { texto: "No del todo: aciertan a lo que fui", x: 3 },
        { texto: "No: representar es otra cosa", x: 8 }] },
    { id: "p4", texto: "Tu agente puede firmar peticiones y reclamos por ti sin preguntarte cada vez. ¿Lo activas?",
      opciones: [
        { texto: "No: firmo yo", y: -8 },
        { texto: "Solo si me pregunta antes", y: -3 },
        { texto: "Sí, en trámites menores", y: 3 },
        { texto: "Sí, en todo lo que pueda", y: 8 }] },
    { id: "p5", texto: "Innerarity: los intereses se forman conversando, no antes. ¿Estás de acuerdo?",
      opciones: [
        { texto: "No: ya sé lo que quiero", x: -8 },
        { texto: "Poco: conversar casi no me cambia", x: -3 },
        { texto: "Bastante: cambio de idea al discutir", x: 3 },
        { texto: "Sí: sin conversar no hay interés", x: 8 }] },
    { id: "p6", texto: "The Economist: GPT es más secular que cualquier país. ¿Usarías ese modelo para tu avatar?",
      opciones: [
        { texto: "No: no le confío mi voz", y: -8 },
        { texto: "Con cuidado, para consultas", y: -3 },
        { texto: "Sí, ajustado con mis datos", y: 3 },
        { texto: "Sí: con mis respuestas basta", y: 8 }] }
  ],
  campos: [
    { id: "avatar_ya", nombre: "Avatar ya", centro: { x: -5, y: 5 }, color: "#38bdf8",
      afirma: "Lo que importa es acertar: si el avatar acierta más que el diputado, que vote por mí." },
    { id: "asesor", nombre: "Asesor, no votante", centro: { x: -5, y: -5 }, color: "#34d399",
      afirma: "El avatar sirve para que el diputado escuche mejor; la decisión la sigue firmando un humano." },
    { id: "agentes", nombre: "Agentes que deliberan", centro: { x: 5, y: 5 }, color: "#f59e0b",
      afirma: "Delegar está bien si los agentes deliberan entre sí y responden a su dueño; sumar preferencias no basta." },
    { id: "urna", nombre: "Urna y asamblea", centro: { x: 5, y: -5 }, color: "#fb7185",
      afirma: "Representar es deliberar y responder ante alguien: ningún avatar reemplaza eso." }
  ]
};
