/* =====================================================================
   TRIBUNA — contenido de una sesión.
   MGT300 · Sociedad, Cultura y Política · Ingeniería Comercial UAI.
   Clase 12 — martes 10 de noviembre de 2026, 11:30–14:10.

   ¿Revolución o burbuja? Seis personajes, tres duelos: uno por cada pregunta
   de la exposición (¿es una revolución?, ¿quién se queda con la ganancia?,
   ¿y si es una burbuja?). Mismo molde que la 308: los alumnos se inscriben a
   mano bajo un personaje, con cupo y por orden de llegada, y hablan en
   primera persona, como su personaje.

   Sólo se juzga lo leído y lo proyectado:
   1) Los seis dossiers impresos (naimbro.github.io,
      teaching/2026_mgt300_clase12_dossiers.html): quién es cada uno, el
      recuadro común con los conceptos de la exposición, extractos traducidos
      con su fuente y «lo que te va a responder» el rival. Fuentes verificadas
      el 9 de noviembre de 2026.
   2) La exposición «¿Revolución o burbuja?», láminas 6 a 15: las GPT y sus
      tres rasgos, la paradoja de Solow, el desfase, la productividad de
      EE. UU., las rentas productivas y rentistas (Aghion cap. 5), el carro de
      la productividad (Acemoglu y Johnson cap. 1), el escenario extremo, las
      cifras de Goldman y Acemoglu, y el boom de los US$3 billones.

   Ninguna cifra ni cita de este archivo está fuera de esos dos materiales.
   Sala real: 24 a 27 alumnos; con 24 presentes, cupo 4 por personaje.
   ===================================================================== */

const SESION = {
  curso: "MGT300 — Sociedad, Cultura y Política",
  semana: 312,
  tema: "Clase 12 · ¿Revolución o burbuja? Seis personajes, tres duelos",
  mocion: "La IA es una revolución de la productividad, como lo fue la electricidad.",
  favor: "A FAVOR",
  contra: "EN CONTRA",
  grupos: 6,
  cupo: 4            // lo que propone la portada; el profesor lo fija al abrir la inscripción
};

/* --- Los seis personajes ------------------------------------------------
   El orden es el número de grupo (1..6). `duelo` y `lado` repiten lo que
   dice PREGUNTAS (pruebas/contenido.test.js comprueba que coincidan). */
const PERSONAJES = [
  { id: "aghion",   nombre: "Philippe Aghion", corto: "Aghion",   trato: "profesor Aghion",   cargo: "Collège de France, Nobel 2025", color: "#34d399", duelo: 1, lado: "A" },
  { id: "acemoglu", nombre: "Daron Acemoglu",  corto: "Acemoglu", trato: "profesor Acemoglu", cargo: "MIT, Nobel 2024",               color: "#fb923c", duelo: 1, lado: "B" },
  { id: "thiel",    nombre: "Peter Thiel",     corto: "Thiel",    trato: "señor Thiel",       cargo: "Palantir, Founders Fund",       color: "#38bdf8", duelo: 2, lado: "A" },
  { id: "khan",     nombre: "Lina Khan",       corto: "Khan",     trato: "señora Khan",       cargo: "expresidenta de la FTC",        color: "#a78bfa", duelo: 2, lado: "B" },
  { id: "huang",    nombre: "Jensen Huang",    corto: "Huang",    trato: "señor Huang",       cargo: "Nvidia",                        color: "#f59e0b", duelo: 3, lado: "A" },
  { id: "burry",    nombre: "Michael Burry",   corto: "Burry",    trato: "señor Burry",       cargo: "inversionista, The Big Short",  color: "#f43f5e", duelo: 3, lado: "B" }
];

/* --- Rondas: iguales al molde de la 308 -------------------------------- */
const RONDAS = [
  { id: "apertura",   nombre: "Apertura",           seg: 180, rol: "Orador de apertura",
    pauta: "Tesis y argumentos principales, en primera persona y como tu personaje. Toda afirmación empírica requiere atribución al dossier." },
  { id: "refutacion", nombre: "Refutación cruzada",  seg: 180, rol: "Refutador",
    pauta: "Reconstruye honestamente la posición del rival ANTES de refutarla. Conceder puntos válidos suma." },
  { id: "cierre",     nombre: "Cierre",             seg: 120, rol: "Orador de cierre",
    pauta: "Nombra el punto de desacuerdo fundamental. Sin argumentos nuevos." }
];

/* --- Rúbrica oficial del curso (4 x 5 = 20) -------------------------- */
const RUBRICA = [
  { id: "evidencia",  nombre: "Uso de evidencia",      max: 5, desc: "Afirmaciones ancladas en el dossier o en la exposición, con datos específicos." },
  { id: "refutacion", nombre: "Calidad de refutación",  max: 5, desc: "Responde al argumento real del rival, no a una versión debilitada." },
  { id: "estructura", nombre: "Claridad y economía",    max: 5, desc: "Se entiende qué sostiene y no hace perder el tiempo. Vale igual en un mensaje largo o en varios cortos." },
  { id: "concesion",  nombre: "Concesión honesta",      max: 5, desc: "Identifica la fortaleza adversaria y explica por qué persiste su posición." }
];

/* --- Knowledge base de la clase 12 ------------------------------------
   claves = detonantes textuales (minúsculas; norm() quita tildes)
   lado   = relativo a la moción del duelo al que pertenece el concepto:
            +1 ayuda a quien va A FAVOR (Aghion, Thiel, Huang), −1 a quien va
            EN CONTRA (Acemoglu, Khan, Burry), 0 sirve a los dos.
   La `fuente` dice siempre de qué dossier o de qué lámina sale.
   ⚡ = una contradicción del personaje con su propio negocio o sus dichos. */
const CONCEPTOS = [

  /* ---- 0. Lo proyectado: la exposición, láminas 6 a 15 --------------- */

  { id: "gpt", etiqueta: "Tecnología de propósito general: se difunde, mejora, engendra", lado: 0,
    fuente: "Exposición, lámina 6 (Aghion, Antonin y Bunel, cap. 3): una GPT se difunde por toda la economía, mejora con el tiempo y engendra innovaciones derivadas; vapor, electricidad y microprocesador. GPT aquí es general purpose technology, no el GPT de ChatGPT",
    claves: ["proposito general","gpt","general purpose","se difunde","engendra","tres rasgos","maquina de vapor","electricidad","microprocesador","innovaciones derivadas"] },

  { id: "solow", etiqueta: "La paradoja de Solow: computadores en todas partes, menos en las estadísticas", lado: 0,
    fuente: "Exposición, lámina 7: Robert Solow, 1987, «se ve la era de los computadores en todas partes, menos en las estadísticas de productividad»",
    claves: ["solow","paradoja de solow","dilema de solow","en todas partes menos","estadisticas de productividad","1987","era de los computadores"] },

  { id: "desfase", etiqueta: "El desfase: una GPT tarda décadas en notarse en la productividad", lado: +1,
    fuente: "Exposición, lámina 8: vapor (Newcomen 1712, efecto desde 1830), electricidad (Edison 1879, salto fabril en los años 20), microprocesador (1971, productividad de EE. UU. desde 1995); hay que reorganizar la producción. Y dossier de Aghion: «un desfase de treinta años»",
    claves: ["desfase","tarda decadas","edison","1879","newcomen","1712","anos 20","reorganizar la produccion","treinta anos","30 anos","todavia no se nota","se va a notar"] },

  { id: "productividad_eeuu", etiqueta: "La productividad de EE. UU.: 1,4% (1973–95), 3,1% (1995–2004), y la incógnita de hoy", lado: 0,
    fuente: "Exposición, lámina 9: productividad de EE. UU. 2,8% (1948–73), 1,4% (1973–95), 3,1% (1995–2004), 1,5% (2004–19), 2,3% (2019–25, rayada: mezcla pandemia y quizás IA). Dossiers de Aghion y Acemoglu: 3,6% anualizado en el 3T-2026, 2,1% interanual, preliminar; el BLS no atribuye nada a la IA",
    claves: ["1,4%","1,4 %","3,1%","3,1 %","1995","2004","3,6%","3,6 %","anualizado","tercer trimestre","2,1%","2,1 %","bls","preliminar","no atribuye nada a la ia"] },

  { id: "rentas", etiqueta: "Renta productiva o rentista: el premio que dura hasta que otro innova, o el peaje del que ya está", lado: 0,
    fuente: "Exposición, lámina 10 (Aghion, Antonin y Bunel, cap. 5): donde hay más innovación el 1% más rico gana más (hasta 1,8 veces) pero también hay más movilidad; vale para la renta productiva. La rentista protege a los que ya están: licencias, conexiones políticas, lobby, barreras de entrada. Nvidia, margen bruto cercano a 75%",
    claves: ["renta productiva","rentas productivas","renta rentista","rentista","rentistas","barreras de entrada","lobby","peaje","cuello de botella","premio a la innovacion","movilidad","1% mas rico","top 1","75%","margen"] },

  { id: "carro", etiqueta: "El carro de la productividad: sólo reparte si crea tareas y hay poder para negociar", lado: -1,
    fuente: "Exposición, lámina 11 (Acemoglu y Johnson, Poder y progreso, cap. 1): la promesa (más productividad, mejores salarios), la condición (tareas nuevas y poder de negociación), la elección (la dirección de la tecnología la fija la visión de quienes tienen poder)",
    claves: ["carro de la productividad","productivity bandwagon","bandwagon","tareas nuevas","poder de negociacion","poder compensatorio","la direccion de la tecnologia","quienes tienen poder","no reparte","mejores salarios","poder y progreso"] },

  { id: "explode", etiqueta: "El escenario extremo: crecimiento de 20% o 30% al año si la IA automatiza la invención", lado: +1,
    fuente: "Exposición, lámina 12: The Economist (24-jul-2025) toma en serio que el crecimiento podría llegar a 20% o 30% al año; durante 17 siglos antes de 1700 el producto mundial creció cerca de 0,1% al año; en el modelo de Nordhaus el capital se queda con casi todo el ingreso. Dossier de Aghion: la IA «automatiza la producción de ideas»",
    claves: ["20%","30%","20 %","30 %","automatiza la invencion","produccion de ideas","automatiza la produccion de ideas","nordhaus","0,1% al ano","explosion del crecimiento"] },

  { id: "cifras", etiqueta: "Goldman (+1,5 puntos al año) frente a Acemoglu (+0,66% en diez años)", lado: 0,
    fuente: "Exposición, lámina 13: Goldman Sachs (2023), +1,5 puntos de productividad al año en EE. UU. durante diez años y +7% al PIB mundial; Acemoglu (2024), a lo más +0,66% de productividad total en diez años; ¿con cuál cuadran las valoraciones?",
    claves: ["goldman","1,5 puntos","7% al pib","valoraciones","con cual cuadran","orden de magnitud"] },

  { id: "boom_3trn", etiqueta: "El boom de los US$3 billones: lo que dejan las burbujas, y esta vez son chips", lado: -1,
    fuente: "Exposición, láminas 14 y 15 (The Economist, 11-sep-2025): cerca de US$400 mil millones al año en infraestructura; más de US$3 billones en centros de datos hacia 2028; vías y fibra quedaron, pero esta vez más de la mitad son chips que se deprecian en pocos años; el boom explicó cerca del 40% del crecimiento de EE. UU. en un año",
    claves: ["3 billones","tres billones","400 mil millones","centros de datos","data centers","2028","fibra","ferrocarril","lineas ferreas","punto com","puntocom","40% del crecimiento","quedan obsoletos","se deprecian"] },

  /* ---- 1. Duelo 1: Aghion (a favor) contra Acemoglu (en contra) ------ */

  { id: "aghion_estimacion", etiqueta: "0,8 a 1,3 puntos por año de productividad extra (Aghion y Bunel)", lado: +1,
    fuente: "Dossier de Aghion: Aghion y Bunel, «AI and Growth: Where Do We Stand?», junio de 2024; 1,3 si se parece a la electricidad en la Europa de los años 20, 0,8 si se parece a la ola digital de EE. UU. de fines de los 90",
    claves: ["0,8 y 1,3","0,8 a 1,3","1,3 puntos","0,8 puntos","entre 0,8","aghion y bunel","where do we stand","proxima decada","ola digital","europa de los anos 20"] },

  { id: "aghion_formula", etiqueta: "La misma fórmula de Acemoglu da 0,68: la diferencia son los supuestos", lado: +1,
    fuente: "Dossier de Aghion: con la fórmula de Acemoglu y «nuestra propia lectura de la literatura empírica reciente», 0,68 frente a 0,07 puntos por año; 60% de tareas expuestas (Acemoglu 20%), 50% rentables (23%), 40% de ahorro (27%)",
    claves: ["0,68","0,07","misma formula","los supuestos","60% de las tareas","60 % de las tareas","literatura empirica","diez veces","40% de ahorro"] },

  { id: "aghion_ideas", etiqueta: "Un piso: la IA también automatiza la producción de ideas (Aghion)", lado: +1,
    fuente: "Dossier de Aghion: «esta estimación puede verse como un piso, en la medida en que no considera que la IA también automatiza la producción de ideas»; HEC, sep. 2026: «si no crees en la innovación, te vuelves malthusiano»",
    claves: ["un piso","es un piso","produccion de ideas","automatiza las ideas","malthusiano","si no crees en la innovacion","destruccion creativa","inventa"] },

  { id: "aghion_empleo", etiqueta: "«No estamos de acuerdo en ninguno de los dos puntos»: desplazado por quien usa IA (Aghion)", lado: +1,
    fuente: "Dossier de Aghion: Aghion, Bunel y Jaravel, Project Syndicate, 14 ene. 2025; el riesgo es «ser desplazado por trabajadores de otras empresas que usan IA»",
    claves: ["ninguno de los dos puntos","no estamos de acuerdo","otras empresas que usan ia","desplazado por trabajadores","project syndicate","jaravel","crea empleos"] },

  { id: "aghion_gafam", etiqueta: "⚡ Aghion: los GAFAM pueden impedir de inmediato la entrada", lado: -1,
    fuente: "Dossier de Aghion: «esta vez los GAFAM son dominantes desde el comienzo y pueden impedir de inmediato la entrada de nuevas empresas innovadoras» (junio 2024); Barcelona, 17 jun. 2026: «necesitamos rentas de monopolio para recompensar a los innovadores»",
    claves: ["gafam","impedir de inmediato","dominantes desde el comienzo","rentas de monopolio para recompensar","bloquear la entrada","barcelona"] },

  { id: "acemoglu_066", etiqueta: "No más de 0,66% de productividad total en diez años (Acemoglu)", lado: -1,
    fuente: "Dossier de Acemoglu: «The Simple Macroeconomics of AI», NBER 2024 / Economic Policy 2025: «no triviales pero modestos: no más de un 0,66%… en 10 años», menos de 0,53% con tareas difíciles; PIB entre 0,9% y 1,6% en diez años",
    claves: ["0,66","0,53","no triviales pero modestos","modestos","simple macroeconomics","0,66% en diez","1,6%","0,9%","productividad total de los factores"] },

  { id: "acemoglu_tareas", etiqueta: "Sólo el 4,6% de las tareas, y las fáciles de aprender primero (Acemoglu)", lado: -1,
    fuente: "Dossier de Acemoglu: 20% de tareas expuestas por 23% en que conviene usarla da 4,6%; lo medido son tareas «fáciles de aprender», las que vienen son «difíciles de aprender»",
    claves: ["4,6%","4,6 %","20% de las tareas","23%","faciles de aprender","dificiles de aprender","tarea por tarea","tareas expuestas"] },

  { id: "acemoglu_direccion", etiqueta: "Demasiada automatización, en la dirección equivocada (Acemoglu)", lado: -1,
    fuente: "Dossier de Acemoglu: MIT News, 6 dic. 2024: «estamos usando la IA demasiado para automatizar y no lo suficiente para dar experticia e información a los trabajadores»; «hoy la IA va en la direccion equivocada»; Fortune, 21 jun. 2026: «ciegamente encandilados con lo que ofrecen OpenAI, Anthropic y unos pocos hiperescaladores»",
    claves: ["direccion equivocada","demasiado para automatizar","experticia","encandilados","alternativa razonable","destino predeterminado","pro trabajador"] },

  { id: "acemoglu_masomenos", etiqueta: "Automatización «más o menos»: las cajas de autoservicio (Acemoglu)", lado: -1,
    fuente: "Dossier de Acemoglu: MIT News, 21 nov. 2022: «si introduces cajas de autoservicio, no va a cambiar mucho la productividad… traslada trabajo»",
    claves: ["mas o menos","so-so","cajas de autoservicio","autoservicio","traslada trabajo","no aumenta la productividad"] },

  { id: "acemoglu_invierno", etiqueta: "«Se va a desperdiciar mucho dinero»: primavera e invierno de la IA (Acemoglu)", lado: -1,
    fuente: "Dossier de Acemoglu: Bloomberg, oct. 2024; MIT Sloan Management Review, 24 feb. 2026: «no tenemos medidas objetivas que muestren grandes ganancias de la IA por ahora»",
    claves: ["desperdiciar mucho dinero","invierno de la ia","primavera de la ia","medidas objetivas","grandes ganancias","decepcionante","promesas de la industria"] },

  { id: "salario_real", etiqueta: "Productividad 2,1%, salario real 1,0%, parte del trabajo 53%: la más baja desde 1947", lado: -1,
    fuente: "Dossiers de Acemoglu y de Aghion: BLS, Productivity and Costs, 5 nov. 2026 (preliminar)",
    claves: ["salario real","1,0%","53%","53 %","desde 1947","participacion del trabajo","parte del ingreso","la mas baja"] },

  { id: "acemoglu_05", etiqueta: "⚡ Acemoglu: «no debemos menospreciar un 0,5% en 10 años»", lado: +1,
    fuente: "Dossier de Acemoglu: MIT News, 6 dic. 2024: «no creo que debamos menospreciar un 0,5% en 10 años. Es mejor que cero»",
    claves: ["menospreciar","mejor que cero","0,5%","0,5 %"] },

  /* ---- 2. Duelo 2: Thiel (a favor) contra Khan (en contra) ----------- */

  { id: "thiel_felices", etiqueta: "«Todas las empresas felices son diferentes»: escapar de la competencia (Thiel)", lado: +1,
    fuente: "Dossier de Thiel: «Competition Is for Losers», The Wall Street Journal, 12 sep. 2014",
    claves: ["empresas felices","felices son diferentes","escapar de la competencia","competencia es para perdedores","competition is for losers","problema unico","fracasadas son iguales"] },

  { id: "thiel_largo_plazo", etiqueta: "Las ganancias de monopolio permiten pensar en algo más que sobrevivir (Thiel)", lado: +1,
    fuente: "Dossier de Thiel, WSJ 2014: «solo una cosa permite a una empresa trascender la brutal lucha diaria por la supervivencia: las ganancias de monopolio»; «los monopolistas pueden pensar en otras cosas además de ganar dinero»",
    claves: ["ganancias de monopolio","lucha diaria","supervivencia","pensar en otras cosas","largo plazo","monopolista"] },

  { id: "thiel_dinamico", etiqueta: "En un mundo dinámico el monopolio es temporal: mejores monopolios reemplazan a los viejos (Thiel)", lado: +1,
    fuente: "Dossier de Thiel: WSJ 2014 y Zero to One: «en un mundo estático, un monopolista es solo un cobrador de rentas», pero «el mundo es dinámico»; «la historia del progreso es una historia de mejores negocios monopólicos reemplazando a los incumbentes»; el celular contra Microsoft",
    claves: ["mundo estatico","mundo dinamico","cobrador de rentas","reemplazando a los incumbentes","monopolios creativos","monopolio creativo","de cero a uno","zero to one","dominio de microsoft","0 a 1"] },

  { id: "thiel_estancamiento", etiqueta: "«Salvo por la IA, estamos en un estancamiento casi total» (Thiel)", lado: 0,
    fuente: "Dossier de Thiel: entrevista con Ross Douthat, NYT, 26 jun. 2025: la IA «aproximadamente en la escala de internet a fines de los 90»; «podría bastar para crear algunas grandes empresas»",
    claves: ["estancamiento","salvo por la ia","escala de internet","fines de los 90","grandes empresas","douthat"] },

  { id: "thiel_harvard", etiqueta: "⚡ Thiel: los monopolios son malos cuando se vuelven cobradores de rentas", lado: -1,
    fuente: "Dossiers de Thiel y de Khan: Harvard Business School, 19 sep. 2014: «los monopolios son buenos cuando crean cosas nuevas, malos cuando se convierten en una especie de cobradores de rentas»",
    claves: ["cobradores de rentas","malos cuando","buenos cuando crean","harvard"] },

  { id: "thiel_gobierno", etiqueta: "⚡ Palantir: 54% de sus ingresos vienen de gobiernos", lado: -1,
    fuente: "Dossiers de Thiel y de Khan: en 2025, US$2.400 de 4.475 millones de ingresos de Palantir vinieron de gobiernos; acuerdo de hasta US$10 mil millones con el Ejército; la idea de monopolio de Thiel excluye a los «favoritos del gobierno»",
    claves: ["palantir","54%","54 %","del estado","de gobiernos","favoritos del gobierno","ejercito","10 mil millones","contratos publicos"] },

  { id: "thiel_nvidia", etiqueta: "⚡ Thiel: Nvidia se lleva 80–85% del dinero de la IA, «muy extraño», y vendió sus acciones", lado: -1,
    fuente: "Dossier de Thiel: Aspen Ideas Festival, jun. 2024; su fondo vendió toda su posición en Nvidia en el 3T-2025 (unos US$100 millones) y compró Apple y Microsoft",
    claves: ["80 y el 85","80%","85%","muy extrano","vendio sus acciones","vendio todas","vendio nvidia","aspen"] },

  { id: "vance_khan", etiqueta: "⚡ JD Vance, el protegido de Thiel, elogió a Lina Khan", lado: -1,
    fuente: "Dossier de Thiel: Thiel aportó US$15 millones a la campaña al Senado de Vance (2022); Vance, feb. 2024: Khan es «una de las pocas personas en la administración Biden» que hace bien su trabajo",
    claves: ["jd vance","vicepresidente","15 millones","pocas personas","administracion biden","protegido"] },

  { id: "khan_excepcion", etiqueta: "«No hay excepción para la IA en las leyes vigentes» (Khan)", lado: -1,
    fuente: "Dossier de Khan: declaración en la FTC, 25 abr. 2023: «las proclamas de innovación no deben servir de cobertura para infringir la ley»",
    claves: ["excepcion para la ia","no hay excepcion","leyes vigentes","proclamas de innovacion","cobertura para infringir"] },

  { id: "khan_informe", etiqueta: "El informe de la FTC: las nubes dueñas de los laboratorios, y el gasto que vuelve a la nube (Khan)", lado: -1,
    fuente: "Dossier de Khan: estudio obligatorio de enero de 2024 a Alphabet, Amazon, Anthropic, Microsoft y OpenAI; informe del 17 ene. 2025: participaciones y derechos sobre ingresos, gasto obligado en la nube del inversionista, costos de cambio, acceso al cómputo y a ingenieros, información sensible",
    claves: ["informe de la ftc","ftc","alianzas","participaciones","nube del inversionista","costos de cambio","lock-in","lock in","encerrados","informacion sensible","microsoft y openai","amazon y google"] },

  { id: "khan_cuello", etiqueta: "Nube y GPU como cuello de botella: tarifas extractivas y fosos (Khan)", lado: -1,
    fuente: "Dossier de Khan: discurso en la FTC, 25 ene. 2024: quien controla «insumos clave, como la infraestructura de nube y el acceso a GPUs», puede «cobrar tarifas extractivas o profundizar sus fosos»; «cuando concentras la producción, concentras el riesgo»",
    claves: ["insumos clave","infraestructura de nube","acceso a gpus","tarifas extractivas","fosos","terminos coercitivos","concentras la produccion","concentras el riesgo"] },

  { id: "khan_adquisiciones", etiqueta: "Comprar o dejar fuera al rival: así se consolidó internet, y DeepSeek es el canario (Khan)", lado: -1,
    fuente: "Dossier de Khan: discurso del 25 ene. 2024 («estrategias agresivas para adquirir o dejar fuera a las empresas que amenazaban su posición»); NYT, 4 feb. 2025 («DeepSeek es el canario en la mina de carbón»); Inflection, unos US$650 millones; Nvidia abandonó la compra de Arm en 2022",
    claves: ["adquirir o dejar fuera","comprando rivales","adquisiciones","canario","deepseek","inflection","compra de arm","punado de empresas","un punado","futuro elegido por ellas","no es inevitable"] },

  { id: "khan_autorregulacion", etiqueta: "La autorregulación es «un fracaso comprobado»; cuidado con los «campeones nacionales» (Khan)", lado: -1,
    fuente: "Dossier de Khan: ABC This Week, 4 oct. 2026, sobre el pacto voluntario de la Casa Blanca; StrictlyVC, jun. 2024",
    claves: ["autorregulacion","fracaso comprobado","pacto voluntario","campeones nacionales","casa blanca"] },

  { id: "khan_tribunales", etiqueta: "⚡ Khan perdió en tribunales: Activision, Meta; Ferguson y el «tremendo escepticismo»", lado: +1,
    fuente: "Dossier de Khan: Microsoft–Activision (2023 y apelación de 2025), Meta por Instagram y WhatsApp (nov. 2025); Andrew Ferguson, voto del 17 ene. 2025: leer el informe «con tremendo escepticismo»; regular a la carrera podría «estrangular esta tecnología naciente en la cuna»",
    claves: ["activision","perdio en tribunales","perdiste en tribunales","tribunales","instagram","whatsapp","ferguson","tremendo escepticismo","estrangular","en la cuna","no probo un dano"] },

  /* ---- 3. Duelo 3: Huang (a favor) contra Burry (en contra) ---------- */

  { id: "huang_distinto", etiqueta: "«Desde nuestro punto de observación, vemos algo muy distinto» (Huang)", lado: +1,
    fuente: "Dossier de Huang: llamada de resultados, 19 nov. 2025; comunicado del mismo día: «las ventas de Blackwell están por las nubes, y las GPU en la nube están agotadas»; GTC, 28 oct. 2025: «no creo que estemos en una burbuja»",
    claves: ["punto de observacion","algo muy distinto","por las nubes","agotadas","blackwell","no creo que estemos en una burbuja"] },

  { id: "huang_plataformas", etiqueta: "Tres cambios de plataforma a la vez (Huang)", lado: +1,
    fuente: "Dossier de Huang: llamada del 19 nov. 2025: de CPU a GPU, la IA generativa, y la IA agéntica y física, que «será revolucionaria»",
    claves: ["tres cambios de plataforma","cambios de plataforma","ley de moore","agentica","ia fisica","de cpu a gpu","sera revolucionaria"] },

  { id: "huang_ventas", etiqueta: "Ventas reales: US$96 mil millones, el doble en un año, margen 75%; «el cómputo es ingreso» (Huang)", lado: +1,
    fuente: "Dossier de Huang: trimestre mayo–julio 2026, US$96 mil millones, +106%, margen bruto 75%; comunicado 26 ago. 2026: «la IA ha llegado a su punto de inflexión», «ahora, el cómputo es ingreso»; Axios, ago. 2026: los agentes de programación son «increíblemente rentables»; pedidos por 500 mil millones (oct. 2025) y «al menos un billón» (mar. 2026)",
    claves: ["96 mil millones","se duplicaron","106","margen de 75","computo es ingreso","punto de inflexion","agentes de programacion","increiblemente rentables","un billon","500 mil millones","pedidos"] },

  { id: "huang_circular", etiqueta: "⚡ Nvidia financia a sus propios clientes: OpenAI, Anthropic, CoreWeave", lado: -1,
    fuente: "Dossiers de Huang y de Burry: US$30 mil millones en OpenAI, hasta 10 mil millones en Anthropic, 2 mil millones en CoreWeave (cerca de 12%); «en vez de entregar una parte de nuestra compañía, recibimos una parte de la suya»; sobre los 100 mil millones para OpenAI: «nunca fue un compromiso» (feb. 2026)",
    claves: ["financia a sus clientes","sus propios clientes","propios vendedores","financiados por sus propios vendedores","circular","financiacion circular","30 mil millones","nunca fue un compromiso","una parte de la suya","100 mil millones"] },

  { id: "coreweave", etiqueta: "CoreWeave: la deuda rinde casi 16% y Nvidia no la rescata", lado: -1,
    fuente: "Dossiers de Huang y de Burry: desplome de octubre de 2026, bono de CoreWeave cerca de 16%; Huang, 15 oct. 2026: «su costo de capital en realidad está bajando»",
    claves: ["coreweave","16%","casi 16","costo de capital","rescatar","rescate","neocloud"] },

  { id: "nvidia_caida", etiqueta: "Nvidia vale 22% menos que en octubre: US$1,27 billones menos", lado: -1,
    fuente: "Dossiers de Huang y de Burry: récord el 6 oct. 2026; cinco semanas a la baja; el 5 de noviembre cayó 9%; resultados el 17 de noviembre",
    claves: ["22%","22 %","1,27 billones","cinco semanas","cayo 9","17 de noviembre","su record"] },

  { id: "burry_cisco", etiqueta: "Nvidia es el Cisco de esta burbuja (Burry)", lado: -1,
    fuente: "Dossier de Burry: «una vez más hay un Cisco en el centro de todo… su nombre es Nvidia» (Cassandra Unchained, 24 nov. 2025); Cisco cayó cerca de 80% después de 2000; «no comparé a Nvidia con Enron»",
    claves: ["cisco","enron","fines de los 90","80%","en el centro de todo","su nombre es nvidia"] },

  { id: "burry_depreciacion", etiqueta: "Depreciación subestimada: US$176 mil millones de utilidades infladas (Burry)", lado: -1,
    fuente: "Dossier de Burry: X, 10 nov. 2025: «subestimar la depreciación alargando la vida útil de los activos infla artificialmente las utilidades»; US$176 mil millones entre 2026 y 2028; chips repartidos en cinco o seis años que quedan obsoletos antes",
    claves: ["depreciacion","vida util","176","infla artificialmente","utilidades infladas","cinco o seis anos","obsoletos","fraudes mas comunes"] },

  { id: "burry_sobreoferta", etiqueta: "Oferta sobreconstruida, demanda insuficiente: como las puntocom (Burry)", lado: -1,
    fuente: "Dossier de Burry: «catastróficamente sobreconstruida y ni de cerca suficiente demanda»; «no es tan distinto esta vez»; «la única jugada ganadora es no jugar» (X, 31 oct. 2025); una «caída tipo 1987» (sep. 2026)",
    claves: ["sobreconstruida","sobreoferta","suficiente demanda","no es tan distinto","jugada ganadora","no jugar","1987","tipo 1987"] },

  { id: "burry_rentas", etiqueta: "⚡ Burry: Nvidia «cobra rentas monopólicas» a precio bajo, y cerró sus apuestas", lado: +1,
    fuente: "Dossiers de Burry y de Huang: agosto de 2026, relación precio-utilidad «baja para una empresa de gran crecimiento que hoy cobra rentas monopólicas»; en septiembre vendió sus puts de Nvidia; el 5 nov. vendió un cuarto de sus apuestas contra los chips",
    claves: ["rentas monopolicas","precio-utilidad","precio utilidad","cerro sus apuestas","vendio sus puts","opciones de compra","un cuarto","muy bajista"] },

  { id: "burry_historial", etiqueta: "⚡ Burry: «Me equivoqué al decir vende» (2023), y ahora vende un boletín", lado: +1,
    fuente: "Dossiers de Burry y de Huang: enero 2023 «Vendan», marzo 2023 «me equivoqué al decir vende»; se desregistró y vende «Cassandra Unchained» (unos US$379 al año); 4 nov. 2026: «un año es una medida inútil»; el memo de Nvidia: recompró 91 mil millones, no 112,5",
    claves: ["me equivoque","vendan","boletin","substack","cassandra","379","desregistro","medida inutil","91 mil millones","112,5","memo"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
const FUENTES = [
  // los seis
  "aghion","acemoglu","thiel","khan","huang","burry",
  // nombrados en los dossiers y en la exposición
  "bunel","antonin","johnson","jaravel","solow","goldman","ferguson","jd vance","douthat",
  // obras, medios y documentos
  "poder y progreso","creative destruction","zero to one","wall street journal","the economist","new york times",
  "project syndicate","mit news","cassandra unchained","informe de la ftc"
];

/* --- La audiencia: las seis personas de la 307 y la 308 ---------------
   Fuera del juego desde septiembre de 2026: las usan pruebas/simular.js y
   pruebas/escala.js. Invariantes del README: la sala abre 5–7 con 15
   indecisos, y CALLE es un bloque grande con peso_rigor 0,2. */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te expliquen la economía desde arriba: la productividad agregada y las valoraciones en billones te suenan a excusa de gerencia. Te mueve saber quién se queda con la ganancia cuando la máquina rinde.",
    bloque: "TRABAJO", votos: 5, pos: 16, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { salario_real: 1.5, carro: 1.5, acemoglu_masomenos: 1.3, acemoglu_direccion: 1.2, aghion_empleo: 1.1,
             thiel_gobierno: 1.0, khan_cuello: 0.9, burry_sobreoferta: 0.8, huang_ventas: 0.7 },
    alergias: ["inevitable","progreso imparable","disrupcion","disrupción","el mercado sabe","talento digital"],
    voz: {
      alto: ["La productividad sube y mi sueldo no. Eso es lo que hay que explicar.", "Por fin alguien dice quién se queda con la plata.", "Eso lo veo en el turno: el chip nuevo llega y el viejo se bota."],
      bajo: ["Puros puntos de productividad. ¿Y el sueldo?", "Hablan de la IA como si fuera el clima.", "Billones para acá, billones para allá."]
    }
  },
  {
    id: "capital", nombre: "Rodrigo Ossandón", edad: 54, emoji: "\u{1F4C8}", color: "#f59e0b",
    oficio: "Socio de un fondo de venture capital, Santiago.",
    registro: "Seco, irónico, de directorio.",
    no_mueve: "No te mueven la indignación ni los nombres propios: sin cifras, márgenes o un mecanismo, para ti no hay argumento. Viste la burbuja puntocom desde adentro. Te mueve un número bien leído, aunque vaya en tu contra.",
    bloque: "CAPITAL", votos: 4, pos: -45, volatilidad: 0.7, peso_rigor: 1.1,
    mueve: { burry_depreciacion: 1.5, huang_ventas: 1.4, thiel_dinamico: 1.3, coreweave: 1.2, huang_circular: 1.2,
             boom_3trn: 1.1, cifras: 1.0, khan_tribunales: 1.0, burry_rentas: 0.9, aghion_formula: 0.8 },
    alergias: ["expropiar","oligarca","saqueo","los ricos","codicia","parasito","parásito"],
    voz: {
      alto: ["La depreciación. Por fin alguien mira el balance.", "Un margen de 75% no es una opinión. Bien traído.", "Concedo: ese número no cuadra con la valoración."],
      bajo: ["Consigna sin cifra. Siguiente.", "Eso no es un mecanismo, es un deseo.", "Confunde el precio de la acción con el valor de la tecnología."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}️", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve el diagnóstico sin instrumento: si no dice quién hace qué, con qué facultad y con qué plata, es ruido. Tampoco la fe en que el mercado se ordena solo ni en que el Estado lo arregla todo.",
    bloque: "ESTADO", votos: 4, pos: -5, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { khan_informe: 1.5, rentas: 1.4, khan_excepcion: 1.3, khan_tribunales: 1.2, aghion_gafam: 1.2,
             acemoglu_direccion: 1.1, thiel_gobierno: 1.0, khan_adquisiciones: 1.0, carro: 0.9 },
    alergias: ["hay que regular","el estado debe","urge una ley","el estado tiene que","voluntad politica","voluntad política"],
    voz: {
      alto: ["Ahí hay un instrumento: el estudio de mercado obligatorio. Anotado.", "Correcto: la pregunta es quién puede entrar al mercado.", "Distinguir renta productiva de rentista es justo lo que hace una agencia."],
      bajo: ["«Hay que romper el monopolio» no es una política pública.", "¿Con qué facultad? ¿Y si pierde en tribunales?", "Diagnóstico impecable, instrumento cero."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. Desconfía de los seis por igual.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper: si en la segunda frase ya hay una tesis, un marco o tres autores, dejas de escuchar aunque tengan razón. Te llega el que nombra un hecho concreto de esta semana y lo dice como es.",
    bloque: "CALLE", votos: 6, pos: 2, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { nvidia_caida: 1.6, burry_historial: 1.5, huang_circular: 1.5, thiel_nvidia: 1.4, burry_cisco: 1.3,
             vance_khan: 1.2, coreweave: 1.1, thiel_gobierno: 1.0, acemoglu_masomenos: 1.0 },
    alergias: ["marco institucional","paradigma","stakeholder","ceteris","heterogeneidad","complementariedad"],
    voz: {
      alto: ["Nvidia le presta plata a sus clientes para que le compren. JAJA.", "Ya po, alguien lo dijo.", "El de The Big Short vendiendo un Substack. Esto se comparte."],
      bajo: ["Habla como paper. Chao.", "0,68 puntos de qué.", "No entendí nada y creo que esa era la idea."]
    }
  },
  {
    id: "academia", nombre: "Dra. Marta Cifuentes", edad: 60, emoji: "\u{1F4DA}", color: "#34d399",
    oficio: "Economista. Lee las notas al pie antes que el abstract.",
    registro: "Docta y cortante.",
    no_mueve: "No te mueve la retórica, por buena que sea, ni la cita de adorno: una fuente mal usada te predispone peor que ninguna. Te mueve que alguien lea bien el supuesto detrás de la cifra, sobre todo si lo usa contra la conclusión cómoda de su propio personaje.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { aghion_formula: 1.5, acemoglu_tareas: 1.5, solow: 1.4, desfase: 1.3, gpt: 1.2,
             productividad_eeuu: 1.2, rentas: 1.1, carro: 1.1, cifras: 1.0, acemoglu_05: 1.0 },
    alergias: ["está demostrado","esta demostrado","todos sabemos","obviamente","es un hecho que","el paper prueba","la ciencia dice"],
    voz: {
      alto: ["Bien: discutió el supuesto, no la conclusión.", "Usó la paradoja de Solow con el dato correcto. Suma.", "Reconstruyó la posición contraria antes de refutarla."],
      bajo: ["Eso el dossier no lo dice así.", "Confunde productividad laboral con productividad total.", "Un trimestre preliminar no es una tendencia. Cuidado."]
    }
  },
  {
    id: "territorio", nombre: "Héctor Muñoz", edad: 63, emoji: "\u{1F33E}", color: "#fb923c",
    oficio: "Ex operario. Su comuna votó una moratoria a un centro de datos.",
    registro: "Hombre mayor de comuna: pausado, concreto.",
    no_mueve: "No te mueve nada que no nombre un lugar, un trabajo o una cuenta que alguien paga: los billones y los autores extranjeros te dan lo mismo. Ya viste promesas de progreso que pasaron de largo.",
    bloque: "TERRITORIO", votos: 5, pos: -8, volatilidad: 1.2, peso_rigor: 0.4,
    mueve: { boom_3trn: 1.5, acemoglu_masomenos: 1.4, salario_real: 1.3, carro: 1.2, burry_sobreoferta: 1.1,
             acemoglu_invierno: 1.0, thiel_gobierno: 1.0, khan_cuello: 0.8 },
    alergias: ["externalidad","optimizar","escalar","frontera tecnologica","frontera tecnológica","ecosistema"],
    voz: {
      alto: ["El tren dejó la línea férrea. ¿Qué deja un chip que se bota en tres años?", "La caja de autoservicio. Eso lo veo en el súper de mi comuna.", "Por fin alguien dice quién paga si se cae."],
      bajo: ["Puro Silicon Valley hablando.", "¿Y a mi comuna qué le queda?", "Eso no se lo digan a mi vecina."]
    }
  }
];

/* --- El panel de jueces de esta clase ---------------------------------
   El piso común va una sola vez, en JUECES_COMUN: la fidelidad al
   personaje. Cada juez tiene un foco propio que no se pisa con el de los
   otros. Las frases se proyectan: pueden nombrar al personaje, nunca a un
   estudiante. */
const JUECES_COMUN = "la fidelidad al personaje: que lo que dice el grupo lo diría esa persona y se apoye en algo que efectivamente dijo o hizo según su dossier. Citar o parafrasear bien un extracto suma; inventar una cita, atribuirle una cifra que el dossier no trae o ponerlo a defender algo contra lo que se ha pronunciado resta. Ceder un punto con una razón no resta: Aghion, Thiel y Burry tienen frases que juegan en su contra, y reconocerlas es honesto";
const JUECES = [
  { id: "academica", nombre: "La académica", emoji: "\u{1F393}",
    valora: "el uso correcto de los conceptos de la exposición —tecnología de propósito general, desfase, paradoja de Solow, renta productiva o rentista, carro de la productividad— y discutir el supuesto detrás de una cifra: el 0,66 de Acemoglu frente al 0,68 de Aghion",
    molesta: "tratar una estimación como un pronóstico, confundir productividad laboral con productividad total y leer un trimestre preliminar como tendencia" },
  { id: "jurista", nombre: "El jurista", emoji: "\u{2696}",
    valora: "la precisión sobre qué se puede hacer y quién lo hace: un estudio de mercado obligatorio no es una demanda, perder un juicio no prueba que no había daño, una renta se rompe con libre competencia, no con un deseo",
    molesta: "pedir «romper el monopolio» sin decir cuál conducta, con qué ley y ante qué tribunal" },
  { id: "economista", nombre: "La economista", emoji: "\u{1F4C8}",
    valora: "quién paga y qué gana cada personaje con lo que defiende; premia confrontar al rival con su propio negocio —Nvidia que financia a sus clientes, Palantir que vive del Estado, el boletín pagado de Burry— y leer un balance: márgenes, depreciación, deuda",
    molesta: "las cifras de adorno sin consecuencia y confundir el precio de una acción con el valor de una tecnología" },
  { id: "periodista", nombre: "La periodista", emoji: "\u{1F4F0}",
    valora: "la escena y la frase exacta: la llamada de resultados de Huang, el «me equivoqué al decir vende» de Burry, la columna de Thiel en el Wall Street Journal, el informe de la FTC; y responder la pregunta que el rival acaba de hacer",
    molesta: "las evasivas, la arenga que podría decir cualquiera y los datos que no están en ningún dossier" },
  { id: "activista", nombre: "La activista", emoji: "\u{270A}",
    valora: "quién gana y quién pierde: el salario que sube menos que la productividad, la parte del ingreso que se lleva el trabajo, los que pierden plata si la burbuja revienta, y quién decide la dirección de la tecnología",
    molesta: "la tecnocracia sin público y hablar de «la economía» sin decir de quién" }
];

/* --- Sala de control: titulares de «última hora» ----------------------
   Todos salen de los dossiers, en presente. Ya no mueven votos (el efecto
   queda para pruebas/simular.js): > 0 hacia A FAVOR de su duelo.        */
const EVENTOS = [
  { id: "nvidia_cae", titular: "Nvidia vale 22% menos que en su récord del 6 de octubre: US$1,27 billones menos tras cinco semanas a la baja. Publica resultados el 17 de noviembre.",
    efecto: { calle: -10, capital: -6, territorio: -4, academia: -2, trabajo: -3, estado: -1 } },
  { id: "productividad", titular: "La productividad de EE. UU. crece 3,6% anualizado en el tercer trimestre. Pero el salario real sube 1,0% en el año, y la parte del ingreso del trabajo cae a 53%, la más baja desde 1947.",
    efecto: { academia: 6, capital: 5, trabajo: -8, territorio: -5, calle: 2, estado: 1 } },
  { id: "burry_vende", titular: "Michael Burry vende un cuarto de sus apuestas contra los fabricantes de chips el día que Nvidia cae 9%, y dice seguir «muy bajista».",
    efecto: { calle: 9, capital: 4, academia: 2, trabajo: 2, territorio: 1, estado: 0 } },
  { id: "thiel_anthropic", titular: "Founders Fund, el fondo de Peter Thiel, co-lidera la ronda de US$30 mil millones de Anthropic. Su fondo personal ya había vendido todas sus acciones de Nvidia.",
    efecto: { calle: -8, estado: -5, academia: -3, trabajo: -3, territorio: -2, capital: 2 } },
  { id: "coreweave", titular: "La deuda de CoreWeave, la nube de la que Nvidia es accionista, rinde casi 16%. Huang: «su costo de capital en realidad está bajando»; no la va a rescatar.",
    efecto: { capital: -9, calle: -7, academia: -4, estado: -3, trabajo: -2, territorio: -2 } }
];

/* --- Bancadas -------------------------------------------------------- */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "Defiende la moción de su duelo.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "Rechaza la moción de su duelo.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Ejemplos: una apertura genérica y otra en personaje -------------
   Duelo 1. A FAVOR (Aghion) abre con una arenga que no suena a nadie en
   particular: ninguna frase del dossier, ninguna fuente (rigor bajo).
   EN CONTRA (Acemoglu) abre en primera persona y bien anclada: cita su
   trabajo, concede el desfase y usa el dato del salario real (rigor alto).
   Las refutaciones contestan a ESTAS aperturas. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `Seamos claros: estamos frente a la tecnología más importante de nuestra época. Cambia todo, y lo cambia rápido. Basta mirar a nuestro alrededor para ver cómo ya está transformando la forma en que trabajamos, estudiamos y vivimos.

Los escépticos siempre han existido. Dijeron lo mismo de cada gran invento, y la historia siempre les quitó la razón. La innovación es el motor del progreso, y el progreso no se detiene.

Quien no lo vea ahora lo va a ver muy pronto. El futuro ya llegó.`,
    B: `Soy Daron Acemoglu y le respondo al profesor Aghion con mi trabajo «The Simple Macroeconomics of AI»: sumando tarea por tarea, los efectos son no triviales pero modestos, no más de un 0,66% de productividad total en diez años. Sólo un 4,6% de las tareas se puede automatizar con ganancia en ese plazo.

Concedo algo: el desfase existe. La electricidad tardó décadas, como dice el recuadro de la exposición, y no debemos menospreciar un 0,5% en diez años. Es mejor que cero.

Pero una revolución como la electricidad subió los salarios. Hoy, según el BLS, la productividad creció 2,1% en el año y el salario real 1,0%, y la parte del ingreso del trabajo es la más baja desde 1947. Eso es lo que Johnson y yo llamamos un carro de la productividad que no está repartiendo. Estamos usando la IA demasiado para automatizar.`
  },
  refutacion: {
    // A contesta a B (el 0,66, el 4,6%, el salario real): sigue sin anclar en el dossier.
    A: `Mi rival vive mirando el pasado. Sus cálculos son pura teoría, números sacados de un escritorio.

Nadie puede medir hoy lo que va a pasar mañana. Las tablas no capturan la creatividad humana ni el ingenio de los emprendedores.

Y los salarios van a subir solos, porque cuando la economía crece, crecemos todos. Siempre ha sido así.`,
    // B contesta a la arenga: «cambia todo», «los escépticos siempre se equivocan», «el futuro ya llegó».
    B: `Mi rival sostiene tres cosas: que la IA lo cambia todo, que los escépticos siempre se equivocan y que el futuro ya llegó.

Concedo la primera a medias: es una tecnología de propósito general, se difunde y mejora.

Pero la tercera choca con la paradoja de Solow que vimos en la exposición: se veían computadores en todas partes y la productividad creció 1,4% al año entre 1973 y 1995. Y la segunda es una analogía sin dato: el carro de Poder y progreso muestra siglos en que la productividad subió y los salarios no. La pregunta no es si cambia todo, sino para quién.`
  },
  cierre: {
    A: `Al final esto es simple: o creemos en el futuro o nos quedamos atrás. Nosotros elegimos creer.

Dentro de unos años nadie se va a acordar de los escépticos, como nadie se acuerda de los que dudaron de la electricidad.`,
    B: `El desacuerdo de fondo no es si la IA sirve. Es si su ganancia llega a los trabajadores sin que nadie lo decida.

El profesor Aghion cree que la competencia y el desfase lo resuelven. Yo creo que la dirección de la tecnología es una elección, y hoy la están haciendo unos pocos hiperescaladores.`
  }
};

/* --- Los tres duelos ----------------------------------------------------
   La moderadora los propone en este orden (clase.js); el profesor puede
   cambiar los grupos. `duelo` dice quién va A FAVOR y quién EN CONTRA (ids de
   PERSONAJES); `favor` y `contra` son la postura de una frase del minuto de
   preparación, en primera persona. Las mociones son las de los dossiers. */
const PREGUNTAS = [
  { texto: "La IA es una revolución de la productividad, como lo fue la electricidad.",
    duelo: { A: "aghion", B: "acemoglu" },
    favor: "Soy Aghion: entre 0,8 y 1,3 puntos de productividad por año, y es un piso; el desfase de la electricidad ya se está cumpliendo.",
    contra: "Soy Acemoglu: no más de 0,66% en diez años, y aunque suba la productividad, el carro no está repartiendo." },
  { texto: "Las ganancias extraordinarias de las empresas de IA son el premio a la innovación, no una renta que haya que romper.",
    duelo: { A: "thiel", B: "khan" },
    favor: "Soy Thiel: todas las empresas felices son diferentes; el monopolio creativo financia el futuro y dura hasta que otro innova.",
    contra: "Soy Khan: no hay excepción para la IA; quien controla la nube y los chips cobra peaje y compra o deja fuera al rival." },
  { texto: "La IA no es una burbuja.",
    duelo: { A: "huang", B: "burry" },
    favor: "Soy Huang: desde nuestro punto de observación vemos algo muy distinto; el cómputo ya es ingreso y las ventas se duplicaron.",
    contra: "Soy Burry: Nvidia es el Cisco de esta burbuja; financia a sus clientes y las nubes inflan sus utilidades con la depreciación." }
];
