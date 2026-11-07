/* =====================================================================
   TRIBUNA — contenido de una sesión.
   CSC00155 · Inteligencia Artificial y Democracia · Semana 14.
   Jueves 12 de noviembre de 2026, 15:00–16:10. Unos 20–25 alumnos.

   Material (naimbro.github.io/ia-democracia-2026):
   1) El deck «¿Puede la IA reemplazar a los políticos?»
      (semana14_ia_deliberativa.html): Hidalgo y el paquete, Brasil 2022
      (Gudiño-Rosero, Grandi & Hidalgo 2024), las tres objeciones de
      Innerarity, el gradiente escuchar / representar / actuar (Schneier &
      Sanders, caps. 15, 19 y 38), Abeliuk, Gaete & Bro (2026), The Economist
      sobre los valores de los modelos y los chatbots en las elecciones de Brasil.
   2) La actividad del lunes: cada alumno entrenó su avatar y comparó sus
      respuestas con las de él. Referencia: Viña, correlación promedio 0,675,
      alta en recursos naturales (0,95) y baja en aborto (0,16).
   3) Lo ya leído: The Economist sobre el Estado británico (Semana 12) y
      Pitkin en las complementarias de la Semana 13.
   Ninguna cifra que no esté en esos materiales.

   Modo de juego: clase en rotación con brújula, 5 grupos de 4–5 (SESION.grupos).
   ===================================================================== */

const SESION = {
  curso: "CSC00155 — Inteligencia Artificial y Democracia",
  semana: 14,
  tema: "¿Puede la IA reemplazar a los políticos? Avatares, representación y deliberación",
  mocion: "Un avatar entrenado con mis respuestas me representa mejor que mi diputado.",
  grupos: 5,                // 20–25 alumnos: 5 grupos de 4–5 (el profesor lo cambia en la portada)
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
   lado   = +1 apoya la moción (el avatar representa mejor), -1 la debilita,
            0 sirve a ambos lados                                          */
const CONCEPTOS = [
  /* ---- La propuesta ---- */
  { id: "paquete", etiqueta: "Votamos por paquetes cada cuatro años (Hidalgo)", lado: +1,
    fuente: "Hidalgo, TED (2018); deck lámina 7",
    claves: ["paquete","paquetes","cada cuatro años","cada cuatro anos","ancho de banda","bundle","programa completo","todo el programa","tema a tema","propuesta por propuesta","hidalgo","democracia aumentada","gemelo digital"] },
  { id: "brasil_acierto", etiqueta: "En Brasil 2022 el avatar acierta más que el paquete", lado: +1,
    fuente: "Gudiño-Rosero, Grandi & Hidalgo (2024): 267 personas, 67 propuestas, avatares 69–77% contra 55–71% de la regla del paquete; deck lámina 8",
    claves: ["brasil","brazucracia","267","67 propuestas","77%","77 por ciento","76","69%","71%","55%","regla del paquete","acierta mas","acierta más","aciertan mas","aciertan más","lula","bolsonaro","gudino","gudiño","llama"] },
  { id: "delegacion_traicion", etiqueta: "Entre elección y elección la opinión se olvida o se traiciona", lado: +1,
    fuente: "Innerarity (2024), el diagnóstico del malestar [00:00–02:00]: la delegación solo se verifica en momentos puntuales",
    claves: ["entre eleccion y eleccion","entre elección y elección","se olvida","traiciona","traicionan","promesas de campaña","promesas de campana","no me escucha","no nos escuchan","una vez cada","momentos puntuales","malestar democratico","malestar democrático"] },
  { id: "escuchar", etiqueta: "Escuchar a los electores a escala (Schneier & Sanders, cap. 15)", lado: +1,
    fuente: "Schneier & Sanders (2025), cap. 15, «Listening to Constituents»; deck lámina 14",
    claves: ["escuchar","escucha","electores","cartas","resumir","resume","miles de mensajes","constituents","el diputado no lee","no alcanza a leer","listening"] },
  { id: "proxy", etiqueta: "El agente como apoderado político (cap. 38)", lado: +1,
    fuente: "Schneier & Sanders (2025), cap. 38, «Acting as Your Personal Political Proxy» (extracto en AI Frontiers)",
    claves: ["proxy","apoderado","vota por mi","vota por mí","firma por mi","firma por mí","agente personal","mi agente","generaciones futuras","niños","ninos","la naturaleza","accionistas","votacion continua","votación continua"] },
  { id: "vina_acierta", etiqueta: "Viña: el avatar coincide alto en la mayoría de las preguntas", lado: +1,
    fuente: "Análisis avatares vs. humanos, Viña: promedio 0,675; recursos naturales 0,95, referendos 0,94, salario mínimo 0,88; deck lámina 21",
    claves: ["viña","vina","0,95","0,94","0,88","0,675","0.675","recursos naturales","referendos","salario minimo","salario mínimo","mi avatar acerto","mi avatar acertó","coincidio","coincidió","mi avatar respondio igual","mi avatar respondió igual"] },

  /* ---- La réplica ---- */
  { id: "origen", etiqueta: "¿Son tuyas? El mercado también fabrica preferencias (Innerarity)", lado: -1,
    fuente: "Innerarity (2024), primera objeción [04:26–05:35]; deck lámina 10",
    claves: ["son tuyas","son nuestras","fabrica preferencias","crea preferencias","crea necesidades","huellas de consumo","consumo","capitalismo","lo que dejamos en","no somos nuestras huellas"] },
  { id: "pasado", etiqueta: "Los datos son siempre pasados: el yo aspiracional (Innerarity)", lado: -1,
    fuente: "Innerarity (2024), segunda objeción [05:35–09:18]: «podemos querer ser mejores de lo que de hecho somos»; deck láminas 10–11",
    claves: ["pasado","pasadas","yo aspiracional","aspiracional","quien fuiste","quién fuiste","quien quieres ser","quién quieres ser","dejar de fumar","natalidad","arendt","massachusetts","historial salarial","ser mejores","conductismo","romper rutinas"] },
  { id: "agregacion", etiqueta: "Sumar no es deliberar (Innerarity; Semana 6)", lado: -1,
    fuente: "Innerarity (2024), tercera objeción [09:18–13:11]; Chambers (2020) y la democracia deliberativa, Semana 6",
    claves: ["agregar","agregacion","agregación","sumar preferencias","sumar no es","deliberar","deliberacion","deliberación","deliberativa","habermas","chambers","espacio publico","espacio público","conversando","se forman","conversacion","conversación","asamblea","parlamento"] },
  { id: "ignorancia", etiqueta: "Hay democracia porque no sabemos lo que nos conviene", lado: -1,
    fuente: "Innerarity (2024), conclusión [13:11–15:00]",
    claves: ["ignorancia","no sabemos lo que nos conviene","lo que nos conviene","incertidumbre","aproximativ","no son exactas","poca ambigüedad","poca ambiguedad","input y output","binario"] },
  { id: "liberales", etiqueta: "El avatar acierta más con liberales y universitarios (Brasil)", lado: -1,
    fuente: "Gudiño-Rosero, Grandi & Hidalgo (2024): los seis modelos aciertan más con liberales que con conservadores y centristas, y con universitarios; deck lámina 17",
    claves: ["liberales","conservadores","centristas","universitarios","sin universidad","no universitarios","educacion universitaria","educación universitaria","acierta mas con","acierta más con","ya tenia voz","ya tenía voz"] },
  { id: "chile_sesgo", etiqueta: "Los modelos representan peor a Chile (Abeliuk, Gaete & Bro)", lado: -1,
    fuente: "Abeliuk, Gaete & Bro (2026), EPJ Data Science: CEP n.º 88 frente a ANES 2020; en Chile fallan más con mujeres, baja escolaridad y religiosos; deck lámina 17",
    claves: ["abeliuk","gaete","injusticia epistemica","injusticia epistémica","subregistrad","cep","anes","peor a chile","peor con chile","mujeres","religiosos","baja escolaridad","baja educacion","baja educación","estadounidense","entrenados en ingles","entrenados en inglés","datos de estados unidos"] },
  { id: "valores", etiqueta: "Los modelos son más seculares y liberales que cualquier país (The Economist)", lado: -1,
    fuente: "The Economist (25 jun. 2026), «AI models' values are very different from most people's»; deck lámina 18",
    claves: ["secular","seculares","encuesta mundial de valores","world values","valores del modelo","valores de los modelos","son democratas","son demócratas","deepseek","africanos","musulmanes","ansari","gemini","grok","post-entrenamiento","alineamiento"] },
  { id: "persuasion", etiqueta: "Un modelo sesgado corre a quien conversa con él (Fisher et al.)", lado: -1,
    fuente: "The Economist (25 jun. 2026), sobre el experimento de Jillian Fisher et al.: demócratas y republicanos se corren hacia el sesgo del modelo, más si no se les avisa",
    claves: ["persuad","persuasion","persuasión","fisher","sesgo republicano","sesgo democrata","sesgo demócrata","se corren","cambian de posicion","cambian de posición","influir en el voto","manipul"] },
  { id: "pitkin", etiqueta: "Representar no es reflejar (Pitkin, Semana 13)", lado: -1,
    fuente: "Pitkin (1967), The Concept of Representation, complementaria de la Semana 13",
    claves: ["pitkin","descriptiva","sustantiva","actuar por","en nombre de","espejo","reflejar","refleja","rendir cuentas","rinde cuentas","responder ante","mandato","revocar","destituir"] },
  { id: "vina_falla", etiqueta: "Viña: el avatar falla justo en aborto, clima y migración", lado: -1,
    fuente: "Análisis avatares vs. humanos, Viña: aborto 0,16, cambio climático 0,23, migración 0,39; deck lámina 21",
    claves: ["aborto","0,16","0,23","0,39","clima","cambio climatico","cambio climático","migracion","migración","temas morales","lo que divide","mi avatar fallo","mi avatar falló","no me represento","no me representó","se equivoco","se equivocó"] },
  { id: "capacidad_civica", etiqueta: "Delegar erosiona la capacidad cívica (cap. 38)", lado: -1,
    fuente: "Schneier & Sanders (2025), cap. 38: los riesgos de tercerizar la deliberación y los bucles que polarizan",
    claves: ["capacidad civica","capacidad cívica","musculo civico","músculo cívico","dejar de pensar","atrofia","flojera","tercerizar","convicciones","bucle","se refuerzan"] },
  { id: "lealtad", etiqueta: "¿A quién es leal el avatar? La empresa y el hackeo (cap. 38)", lado: -1,
    fuente: "Schneier & Sanders (2025), cap. 38: lealtades desalineadas y seguridad",
    claves: ["lealtad","leal","la empresa que lo hizo","quien lo entrena","quién lo entrena","hackear","hackeo","openai","meta","dueño del modelo","dueno del modelo"] },

  /* ---- Sirven a los dos lados ---- */
  { id: "gradiente", etiqueta: "Escuchar, representar o actuar: no es todo o nada", lado: 0,
    fuente: "Deck lámina 14; Schneier & Sanders (2025), caps. 15, 19 y 38",
    claves: ["gradiente","escuchar representar actuar","representar","actuar","asesor","consejo","sin preguntarme","sin preguntarte","no es todo o nada","hasta donde","hasta dónde","la linea","la línea"] },
  { id: "flooding", etiqueta: "Si todos tienen agente, el Estado se satura (agentic flooding)", lado: 0,
    fuente: "The Economist (6 ago. 2026), «How AI is breaking the British state», Semana 12; deck lámina 15",
    claves: ["agentic flooding","flooding","inundacion","inundación","se satura","saturar","se ahoga","reclamos","britanico","británico","reino unido"] },
  { id: "neutral", etiqueta: "¿Negarse a recomendar es neutral? Los chatbots en Brasil", lado: 0,
    fuente: "InternetLab, LabDados/FGV y Rede Conhecimento Social (sep. 2026), vía El Mostrador: Meta AI remite al TSE en el 70,7% de las preguntas sobre el voto; deck lámina 19",
    claves: ["neutral","neutralidad","tse","meta ai","70,7","recomendar un candidato","no recomienda","internetlab","chatbots","ocho chatbots"] },
  { id: "diella", etiqueta: "Diella: un cargo que no se soborna, ¿y se destituye?", lado: 0,
    fuente: "Diella (AI system), Albania, sep. 2025; deck lámina 4",
    claves: ["diella","albania","licitaciones","ministra","edi rama","sobornar","soborno","corrupcion","corrupción"] },
  { id: "resultado_procedimiento", etiqueta: "Legitimidad por resultado o por procedimiento", lado: 0,
    fuente: "Deck lámina 12, la tensión de la semana; pregunta motivadora",
    claves: ["legitimidad","legitimo","legítimo","ilegitimo","ilegítimo","por resultado","por procedimiento","gobernar mejor","gobierna mejor","acertar no es","acertar no basta","resultados"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
const FUENTES = [
  "hidalgo", "gudino", "gudiño", "grandi", "innerarity", "schneier", "sanders", "rewiring democracy", "abeliuk", "gaete", "bro",
  "the economist", "economist", "fisher", "el mostrador", "internetlab", "fgv", "pitkin", "chambers", "habermas", "arendt",
  "diella", "cep", "anes", "encuesta mundial de valores", "world values", "viña", "vina", "ted", "congreso futuro"
];

/* --- La audiencia: seis bloques, no una masa ------------------------- */
/* Las mismas seis personas de las semanas 5 y 7, con el oído afinado a la
   moción de esta semana. La sala abre 4–3 con 20 indecisos (README). */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te prometan que una máquina te va a representar mejor: ya ves en el turno cómo los sistemas se equivocan y nadie responde. Tampoco te mueve la nostalgia por el diputado: hace años que no le ves la cara. Te mueve saber quién responde cuando el avatar vota mal, y si el sindicato pierde o gana voz.",
    bloque: "TRABAJO", votos: 5, pos: -4, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { delegacion_traicion: 1.3, lealtad: 1.4, pitkin: 1.1, capacidad_civica: 1.0, paquete: 1.0, escuchar: 1.1, vina_falla: 0.9, flooding: 0.8 },
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
    mueve: { brasil_acierto: 1.5, paquete: 1.3, vina_acierta: 1.2, chile_sesgo: 1.1, liberales: 0.9, flooding: 0.8, resultado_procedimiento: 1.0, agregacion: 0.5 },
    alergias: ["neoliberal","las big tech","codicia","los ricos","oligarca"],
    voz: {
      alto: ["Setenta y siete contra setenta y uno. Ahí hay un argumento.", "Concedo: si falla con la mitad del país, no sirve.", "Números. Por fin alguien trae números."],
      bajo: ["Filosofía sin cifra. Siguiente.", "¿Y el diputado acierta cuánto? Nadie lo midió.", "Eso es nostalgia por la urna, no un argumento."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}️", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve la idea de que cada ciudadano tenga un agente sin decir quién procesa lo que esos agentes mandan: ya ves la bandeja de entrada del ministerio. Tampoco te mueve que invoquen «la deliberación» sin decir dónde ocurre. Te mueve que alguien diga quién responde, ante quién, y cómo se destituye al que decide.",
    bloque: "ESTADO", votos: 4, pos: -6, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { flooding: 1.5, pitkin: 1.3, escuchar: 1.3, diella: 1.1, lealtad: 1.0, gradiente: 1.2, brasil_acierto: 0.8, agregacion: 0.9 },
    alergias: ["el estado debe","hay que modernizar","transformacion digital","transformación digital"],
    voz: {
      alto: ["Eso: ¿ante quién responde y cómo se le saca?", "Un diputado que escucha mejor con IA, eso sí lo firmo.", "Correcto. Si todos mandan agentes, nadie es escuchado."],
      bajo: ["¿Y quién lee lo que mandan veinte millones de agentes?", "Deliberación, ¿dónde? ¿En qué sala?", "Un avatar no se puede acusar constitucionalmente."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. No conoce el nombre de su diputado.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper ni que defienda a los políticos como si se lo merecieran. Tampoco te compras que la IA sea neutral: ya viste lo que hace Grok. Te llega lo concreto: lo que contestó tu propio avatar el lunes, Diella en Albania, un chatbot que se niega a decir por quién votar.",
    bloque: "CALLE", votos: 6, pos: 6, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { delegacion_traicion: 1.4, paquete: 1.2, diella: 1.4, vina_falla: 1.3, vina_acierta: 1.2, neutral: 1.1, valores: 1.0, persuasion: 1.2, lealtad: 1.1 },
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
    no_mueve: "No te mueve la retórica ni la cita de adorno: decir «Habermas» no es usar a Habermas. Te irrita que confundan acertar con representar, o que generalicen 267 participantes de una plataforma a todo Brasil. Te mueve que alguien distinga el resultado del procedimiento y use bien un estudio, sobre todo contra la conclusión cómoda.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { agregacion: 1.4, pitkin: 1.4, resultado_procedimiento: 1.3, chile_sesgo: 1.3, liberales: 1.2, brasil_acierto: 1.1, pasado: 1.1, persuasion: 1.0 },
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
    mueve: { chile_sesgo: 1.6, delegacion_traicion: 1.3, agregacion: 1.1, liberales: 1.2, capacidad_civica: 1.1, valores: 1.0, vina_falla: 1.0 },
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
const JUECES_COMUN = "que citen un dato o un autor de las lecturas de la semana (Hidalgo y Gudiño-Rosero, Innerarity, Schneier y Sanders, Abeliuk, Gaete y Bro, The Economist) o lo que pasó con su propio avatar el lunes, y que contesten lo que el rival dijo de verdad";
const JUECES = [
  { id: "academica", nombre: "La académica", emoji: "\u{1F393}",
    valora: "la lectura correcta de los estudios: que Gudiño-Rosero midió a 267 participantes de una plataforma y no a Brasil, que Abeliuk, Gaete y Bro comparan la CEP con la ANES, y que acertar una elección entre pares no es lo mismo que representar",
    molesta: "generalizar una cifra más allá de su muestra, inventar números, y la autoridad sin argumento" },
  { id: "teorica", nombre: "La teórica política", emoji: "\u{1F3DB}",
    valora: "la distinción entre legitimidad por resultado y por procedimiento, y conceptos usados con precisión: deliberación (Semana 6), representación según Pitkin, agregación según Innerarity",
    molesta: "usar «deliberar» como sinónimo de opinar y confundir representar con reflejar" },
  { id: "jurista", nombre: "El jurista", emoji: "\u{2696}",
    valora: "quién responde cuando el avatar vota mal: mandato, revocación, rendición de cuentas, quién entrena el modelo y ante quién se reclama",
    molesta: "proponer avatares o agentes sin decir quién los fiscaliza ni cómo se les quita el poder" },
  { id: "periodista", nombre: "La periodista", emoji: "\u{1F4F0}",
    valora: "que respondan la pregunta que se les hizo, con hechos verificables y escenas concretas: Diella en Albania, los chatbots en Brasil, lo que contestó su avatar en una pregunta precisa",
    molesta: "la jerga, las evasivas y repetir un nombre como talismán sin decir qué dijo" },
  { id: "activista", nombre: "La activista", emoji: "\u{270A}",
    valora: "quién queda fuera: los que el modelo predice peor (mujeres, religiosos, baja escolaridad, Chile frente a EE.UU.) y quién pierde voz si la representación pasa a un modelo",
    molesta: "hablar de «los ciudadanos» como si todos estuvieran igual de representados por el modelo" }
];

/* --- Sala de control: shocks que el profesor lanza en vivo ------------
   efecto > 0 mueve hacia A FAVOR (el avatar); < 0 hacia EN CONTRA.
   Todos salen de los materiales de la semana.                           */
const EVENTOS = [
  { id: "brasil", titular: "Gudiño-Rosero, Grandi e Hidalgo: en Brasil 2022 los avatares aciertan entre 69% y 77% de las elecciones de cada persona; votar por paquete, entre 55% y 71%.",
    efecto: { capital: 12, calle: 6, academia: 4, estado: 3, trabajo: 2, territorio: 1 } },
  { id: "chile", titular: "Abeliuk, Gaete y Bro: los modelos simulan mejor la opinión de EE.UU. que la de Chile. En Chile fallan más con mujeres, baja escolaridad y religiosos.",
    efecto: { territorio: -14, academia: -9, trabajo: -6, calle: -5, estado: -4, capital: -5 } },
  { id: "valores", titular: "The Economist prueba 25 modelos con la Encuesta Mundial de Valores: GPT es más secular que cualquier país. Ningún modelo refleja a la mayoría de los países africanos o musulmanes.",
    efecto: { territorio: -9, calle: -6, academia: -6, trabajo: -4, estado: -3, capital: -2 } },
  { id: "diella", titular: "Albania pone a Diella, un sistema de IA, a cargo de las licitaciones públicas. La promesa: cero corrupción.",
    efecto: { calle: 10, capital: 6, trabajo: 2, territorio: 1, estado: -5, academia: -4 } },
  { id: "flooding", titular: "The Economist: en el Reino Unido, los reclamos redactados por agentes de IA saturan al Estado. Lo llaman agentic flooding.",
    efecto: { estado: -12, academia: -5, capital: -3, territorio: -3, trabajo: -2, calle: 2 } },
  { id: "tse", titular: "Brasil: Meta AI responde el 70,7% de las preguntas sobre el voto con el mismo mensaje, que remite al TSE. ChatGPT casi nunca recomienda candidatos.",
    efecto: { calle: -4, academia: -3, estado: 2, capital: 1, trabajo: -1, territorio: -1 } },
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
   aperturas: si se cambia una, hay que reescribir la que le responde. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `¿Alguien aquí sabe el nombre de su diputado? Yo tampoco. Lo vemos una vez cada cuatro años, nos vende un paquete entero de promesas y después vota lo que le dice el partido. Mi avatar, en cambio, el lunes contestó como yo en casi todo. Y no es solo mi caso: en Brasil los avatares acertaron hasta 77% de lo que quería cada persona, y votar por paquete, como hacemos hoy, no pasó de 71%. Hidalgo tiene razón: el problema de la democracia es que le preguntamos muy poco a la gente y muy de vez en cuando. Un avatar no se cansa, no se vende y no te olvida apenas gana. Todos sabemos que el diputado no nos representa. Por lo menos el avatar lo intenta.`,
    B: `Nuestra tesis es que acertar no es representar. Primero, Innerarity: los datos con que se entrena un avatar son siempre pasados, y la política existe justamente para que podamos querer ser distintos de lo que fuimos. Un avatar le acierta a quien fuiste. Segundo, el propio estudio de Brasil muestra que los modelos aciertan más con liberales y universitarios que con conservadores y sin universidad, y Abeliuk, Gaete y Bro encuentran lo mismo en Chile: los modelos simulan peor la opinión chilena que la estadounidense, y fallan más con mujeres, religiosos y baja escolaridad. El avatar representa mejor a quien ya tenía voz. Tercero, Pitkin: representar es actuar por alguien y responder ante él, no reflejarlo. Al diputado se le puede no reelegir; al avatar, ¿quién lo destituye? Concedemos que el diagnóstico de Hidalgo es real: votar por paquetes cada cuatro años es poco. La respuesta es escuchar mejor, como en el capítulo 15, no reemplazar.`
  },
  refutacion: {
    // A contesta los tres pasos de B: datos pasados, sesgo contra quien tiene menos voz, rendición de cuentas.
    A: `La bancada contraria dice tres cosas: que los datos son pasados, que el modelo representa peor a quien tiene menos voz, y que al avatar no se lo puede destituir. Concedo la segunda, y es su mejor punto: Abeliuk, Gaete y Bro muestran que en Chile el modelo falla más con mujeres y religiosos. Pero eso es un argumento para entrenarlo mejor con datos chilenos, no para quedarse con un diputado que también representa peor a esos mismos grupos, y al que nadie midió. Primero, sobre los datos pasados: el voto también es pasado; elegimos hoy a alguien que decide durante cuatro años, y el avatar se puede reentrenar cada mes. Tercero, sobre la destitución: el avatar es mío. Si no me representa, lo apago. Es la forma más directa de rendición de cuentas que existe.`,
    // B contesta la arenga de A: el diputado ausente, el 77%, "no se cansa, no se vende".
    B: `La apertura contraria sostiene que el diputado está ausente, que en Brasil el avatar acertó 77%, y que el avatar no se cansa ni se vende. Concedemos lo primero: el diagnóstico de la ausencia es real, y lo comparte Innerarity. Pero, segundo, el 77% es el mejor modelo con 267 participantes de una plataforma, no Brasil, y mide si el avatar adivina cuál de dos propuestas prefieres: adivinar una preferencia no es defenderla en una negociación. Tercero, que el avatar no se venda supone que no tiene dueño. The Economist muestra que cada modelo trae los valores de quien lo entrenó, más seculares que cualquier país, y Fisher encuentra que un modelo sesgado corre a quien conversa con él. «Todos sabemos» no es una fuente, y en Viña los avatares fallaron justo en aborto, clima y migración, que es donde más importa representar.`
  },
  cierre: {
    A: `El desacuerdo de fondo no es si el avatar es perfecto: no lo es. Es contra qué se compara. Ellos lo comparan con un representante ideal que delibera y rinde cuentas; nosotros, con el diputado que tenemos, que no escucha y no responde. Contra ese, el avatar gana.`,
    B: `El punto de desacuerdo es qué significa representar. Ellos dicen acertar; nosotros, deliberar y responder ante alguien. Un avatar puede ayudar a un diputado a escuchar mejor. Pero si representar fuera solo acertar, bastaría con una encuesta, y nunca hemos dicho que una encuesta nos gobierna.`
  }
};

/* --- Preguntas escritas por el profesor -------------------------------
   `afirma` es el campo de la brújula que sostiene la pregunta; `favor` y
   `contra`, la postura de cada lado en una frase, para el minuto de
   preparación.                                                          */
const PREGUNTAS = [
  { texto: "Un avatar entrenado con mis respuestas me representa mejor que mi diputado.", afirma: "avatar_ya",
    favor: "El avatar me representa mejor: acierta más a lo que quiero que un diputado que vota por paquete.",
    contra: "El diputado, con todos sus defectos, representa algo que un avatar que solo acierta no puede." },
  { texto: "El Congreso debería consultar a avatares de los electores antes de votar cada proyecto.", afirma: "asesor",
    favor: "Sí: que el diputado escuche a sus electores con avatares, y que la decisión la siga firmando él.",
    contra: "No: consultar avatares en vez de personas mete el sesgo del modelo en el Congreso." },
  { texto: "Si millones de agentes deliberan y votan propuestas, eso es más democrático que un Congreso de 155 diputados.", afirma: "agentes",
    favor: "Más democrático: todos participan, por medio de agentes que discuten entre sí y responden a su dueño.",
    contra: "Menos democrático: agentes que discuten entre sí no son ciudadanos que deliberan." },
  { texto: "Un modelo que se equivoca más con las mujeres, los religiosos y la baja escolaridad no debe representar a nadie en Chile.", afirma: "urna",
    favor: "No debe: un representante que falla más con quienes ya tienen menos voz agrava la desigualdad política.",
    contra: "Sí puede: el sesgo se corrige con datos chilenos, y el diputado también representa peor a esos grupos." }
];

/* --- Brújula corta ------------------------------------------------------
   Reglas de la semana 7: cada eje es UNA pregunta de fondo con tres ítems;
   enunciados de ≤ 120 caracteres y opciones de ≤ 50.

   x — ¿Qué hace legítimo a un representante? Que acierte (resultado, −) ↔
       que delibere y responda ante alguien (procedimiento, +). Es la
       tensión Hidalgo / Innerarity del deck.
   y — ¿Cuánto le delegarías a una IA? Poco: escuchar (−) ↔ mucho: actuar
       por ti (+). Es el gradiente de Schneier y Sanders.               */
const BRUJULA = {
  ejes: {
    x: { id: "legitimidad", etiqueta: "¿Qué hace legítimo a un representante?", min: "que acierte", max: "que delibere y responda" },
    y: { id: "delegar", etiqueta: "¿Cuánto le delegarías a una IA?", min: "escucharme", max: "actuar por mí" }
  },
  preguntas: [
    { id: "p1", texto: "Diella, la «ministra» IA de Albania, adjudica licitaciones sin sobornos. ¿Le darías ese cargo en Chile?",
      opciones: [
        { texto: "Sí: si no hay corrupción, funciona", x: -8 },
        { texto: "Sí, con un humano que firme", x: -3 },
        { texto: "Solo como asesora, no a cargo", x: 3 },
        { texto: "No: un cargo exige responder ante alguien", x: 8 }] },
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
