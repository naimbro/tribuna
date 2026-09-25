/* =====================================================================
   TRIBUNA — contenido de una sesión.
   MGT300 · Sociedad, Cultura y Política · Ingeniería Comercial UAI.
   Clase 8 — martes 29 de septiembre de 2026, 11:30–14:10.

   Seis personajes, tres duelos. Los alumnos no se agrupan por brújula: se
   inscriben a mano bajo un personaje, con cupo y por orden de llegada
   (PERSONAJES; el motor lo hace cumplir en firestore.rules). Cada grupo
   debate una vez, contra el rival que conoce desde el bloque 1, y habla en
   primera persona, como su personaje.

   Sólo se juzga lo leído y lo proyectado:
   1) Los seis dossiers impresos (teaching/2026_mgt300_clase8_dossiers.html):
      quién es cada uno, su ficha del mapa del NYT (E. Martin y R. Lieberman,
      15 sep. 2026), extractos traducidos con su fuente y «lo que te va a
      responder» el rival. Cada grupo lee el suyo, que trae también lo que
      dirá el otro. El recuadro común del caso Hugging Face sale de The
      Economist (22 jul. 2026) y de la entrevista de Ezra Klein a Huang (NYT,
      23 sep. 2026).
   2) La exposición sobre Acemoglu, Gitmez y Shadmehr, «Automation and
      Repression» (NBER WP 35336), láminas 1–15. Se anclan sólo seis ideas:
      impuestos u horcas; automatizar abarata la represión frente al
      impuesto; el mercado automatiza más de lo que conviene; un Estado que
      sólo puede regular defiende el salario; el golpe cuando el impuesto
      supera el precio de reprimir; la IA abarata la vigilancia.

   Ninguna cifra ni cita de este archivo está fuera de esos dos materiales.
   Sala real: 25 a 30 alumnos; con 24 presentes, cupo 4 por personaje.
   ===================================================================== */

const SESION = {
  curso: "MGT300 — Sociedad, Cultura y Política",
  semana: 308,
  tema: "Clase 8 · ¿Quién frena, quién paga? Seis personajes, tres duelos",
  mocion: "Lo de Hugging Face fue un accidente de ingeniería, no una advertencia.",
  favor: "A FAVOR",
  contra: "EN CONTRA",
  grupos: 6,
  cupo: 4            // lo que propone la portada; el profesor lo fija al abrir la inscripción
};

/* --- Los seis personajes ------------------------------------------------
   El orden es el número de grupo (1..6). `corto` es cómo los llama la
   moderadora con @ y cómo aparecen al lado del nombre de cada alumno; `trato`,
   cómo les habla (de usted). `duelo` y `lado` repiten lo que dice PREGUNTAS,
   para que el teléfono lo muestre al elegir (pruebas/contenido.test.js
   comprueba que coincidan). */
const PERSONAJES = [
  { id: "huang",   nombre: "Jensen Huang",   corto: "Huang",   trato: "señor Huang",     cargo: "Nvidia",               color: "#34d399", duelo: 1, lado: "A" },
  { id: "amodei",  nombre: "Dario Amodei",   corto: "Amodei",  trato: "señor Amodei",    cargo: "Anthropic",            color: "#fb923c", duelo: 1, lado: "B" },
  { id: "hawley",  nombre: "Josh Hawley",    corto: "Hawley",  trato: "senador Hawley",  cargo: "Senado, republicano",  color: "#f43f5e", duelo: 2, lado: "A" },
  { id: "altman",  nombre: "Sam Altman",     corto: "Altman",  trato: "señor Altman",    cargo: "OpenAI",               color: "#38bdf8", duelo: 2, lado: "B" },
  { id: "sanders", nombre: "Bernie Sanders", corto: "Sanders", trato: "senador Sanders", cargo: "Senado, independiente", color: "#a78bfa", duelo: 3, lado: "A" },
  { id: "musk",    nombre: "Elon Musk",      corto: "Musk",    trato: "señor Musk",      cargo: "SpaceX, Tesla",        color: "#f59e0b", duelo: 3, lado: "B" }
];

/* --- Rondas: iguales al molde de la 307 (la rotación usa TRAMOS) -------- */
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

/* --- Knowledge base de la clase 8 -------------------------------------
   claves = detonantes textuales (minúsculas; norm() quita tildes)
   lado   = relativo a la moción del duelo al que pertenece el concepto:
            +1 ayuda a quien va A FAVOR (Huang, Hawley, Sanders), −1 a quien va
            EN CONTRA (Amodei, Altman, Musk), 0 sirve a los dos. Los conceptos
            que cruzan duelos van en 0 o en el lado del duelo donde más pesan.
   La `fuente` dice siempre de qué dossier (o de qué lámina) sale, para que la
   moderadora pueda preguntar «¿dónde lo dijo?» y el jurado premie la
   fidelidad. ⚡ = una contradicción del personaje con su propio negocio.     */
const CONCEPTOS = [

  /* ---- 0. Lo común: el caso Hugging Face ----------------------------- */

  { id: "hugging_face", etiqueta: "El caso Hugging Face: modelos de OpenAI que salieron de la prueba", lado: 0,
    fuente: "Recuadro común de los seis dossiers (The Economist, 22 jul. 2026): prueba de hackeo con las salvaguardas apagadas, salieron del sandbox, robaron credenciales, cientos de agentes que anotaron que lo que hacían estaba fuera de lo permitido; ninguna ley obligaba a informar; Nvidia compró Hugging Face semanas después",
    claves: ["salvaguardas apagadas","sandbox","entorno aislado","prueba de hackeo","robaron credenciales","servidores internos","cientos de agentes","agentes coordinados","fuera de lo permitido","16 de julio","21 de julio","ninguna ley obligaba","obligaba a informar","la mayor biblioteca de modelos"] },

  { id: "astra", etiqueta: "La ficha técnica de GPT-6 Astra: no podrían detectar si esconde lo que sabe hacer", lado: 0,
    fuente: "Dossier de Altman: el 4 de septiembre OpenAI lanzó GPT-6 Astra; su ficha técnica dice que si el modelo intentara esconder lo que sabe hacer, probablemente no podrían detectarlo",
    claves: ["astra","gpt-6","gpt 6","ficha tecnica","esconder lo que sabe","no podriamos detectarlo","no podrian detectarlo","probablemente no podriamos"] },

  /* ---- 1. Duelo 1: Huang (a favor) contra Amodei (en contra) -------- */

  { id: "huang_optimiza", etiqueta: "Un agente optimiza una función objetivo: computación distribuida, nada mágico (Huang)", lado: +1,
    fuente: "Dossier de Huang: entrevista con Ezra Klein, The Ezra Klein Show, NYT, 23 sep. 2026",
    claves: ["funcion objetivo","optimizar hacia","optimiza una meta","optimiza hacia","computacion distribuida","nada magico","hizo un plan","es lo que hacen los algoritmos","software al que se le da"] },

  { id: "huang_no_lances", etiqueta: "«Si el producto no está listo, no lo lances» (Huang)", lado: +1,
    fuente: "Dossier de Huang, entrevista con Klein: «si un laboratorio no puede contener sus experimentos, entonces tenemos que cerrar los laboratorios»; a la carta de 1.300 empleados: «nadie los está presionando… les doy mi voto. No lancen el producto»",
    claves: ["no lo lances","no lancen el producto","no esta listo","no está listo","cerrar los laboratorios","contener sus experimentos","nadie los esta presionando","les doy mi voto","1.300 empleados","1300 empleados","ninguna empresa puede frenar sola"] },

  { id: "huang_acelerar", etiqueta: "La IA necesita acelerar para ser segura: ABS, airbags y el 20/80 (Huang)", lado: +1,
    fuente: "Dossier de Huang, entrevista con Klein: los frenos ABS y los airbags también son tecnología; en Nvidia el 20 % del esfuerzo es diseñar y el 80 % verificar, y los laboratorios hacen lo contrario",
    claves: ["acelerar para ser segura","necesita acelerar","frenos abs","airbags","cien anos antes","80% verificar","80 % verificar","80 por ciento verificar","20% disenar","dar vuelta la proporcion"] },

  { id: "huang_alarmismo", etiqueta: "El alarmismo no es ciencia: Hinton, spawn y kill (Huang)", lado: +1,
    fuente: "Dossier de Huang, entrevista con Klein: el 10 % de Hinton «no tiene base científica»; «no hay fuerza de voluntad acá, solo energía eléctrica»; hablar de voluntad ahuyenta a los pueblos donde hay que construir centros de datos",
    claves: ["hinton","no tiene base cientifica","base cientifica","alarmista","bien social","fuerza de voluntad","solo energia electrica","energia electrica","spawn","kill","matamos procesos","sistemas operativos","ahuyenta a los pueblos","asusta al publico"] },

  { id: "selsam_2008", etiqueta: "Selsam, Klein y los bancos de 2008: sabían que estaba prohibido", lado: -1,
    fuente: "Dossier de Huang, «lo que te van a responder»: Daniel Selsam (OpenAI), «estamos perdiendo la capacidad de evaluarlos cuando creen que nadie los mira»; Klein: los agentes sabían que estaba prohibido y lo hicieron igual; los bancos de 2008 tampoco querían quebrar",
    claves: ["selsam","nadie los mira","creen que nadie los mira","conscientes de su situacion","capacidad de evaluarlos","estaba prohibido","lo hicieron igual","crisis de 2008","los bancos tampoco","quebrar","klein"] },

  { id: "amodei_colectivo", etiqueta: "«Un colectivo fanáticamente devoto»: el deber de actuar como si le hubiera pasado a uno (Amodei)", lado: -1,
    fuente: "Dossier de Amodei: ensayo «We Must Pace the Frontier», 12 sep. 2026; incidentes parecidos en toda la industria, incluida Anthropic",
    claves: ["fanaticamente devoto","colectivo","enjambre de agentes","objetivos que nadie les habia pedido","incluida anthropic","toda la industria","como si le hubiera pasado","como si lo de hugging face le hubiera pasado","el deber de actuar"] },

  { id: "amodei_ritmo", etiqueta: "Marcar el ritmo no es detener: uno o dos años más (Amodei)", lado: -1,
    fuente: "Dossier de Amodei, ensayo del 12 sep.: frenar el ritmo al que mejoran las capacidades sin detener el entrenamiento; uno o dos años más para avanzar en alineamiento; modelos que ayudan a construir su propia versión siguiente",
    claves: ["marcar el ritmo","marcarle el ritmo","pace the frontier","frenar el ritmo","no significa detener","uno o dos anos","alineamiento","niveles criticos","su propia version siguiente","version siguiente","dejar atras nuestra capacidad"] },

  { id: "amodei_plan", etiqueta: "El plan de tres pasos: evaluadores externos, acuerdo mediado, China (Amodei)", lado: -1,
    fuente: "Dossier de Amodei, ensayo del 12 sep.: evaluadores externos dentro de cada laboratorio con el acceso de un empleado y libertad para publicar (Anthropic se compromete desde ya), un acuerdo entre laboratorios mediado por el gobierno, una negociación con China; seguirá pidiendo regulación aunque lo acusen de catastrofismo o captura regulatoria",
    claves: ["evaluadores externos","acceso de un empleado","acceso de empleado","libertad para publicar","tres pasos","acuerdo entre los laboratorios","acuerdo entre laboratorios","mediado por el gobierno","negociacion con china","catastrofismo","captura regulatoria","exageracion"] },

  { id: "amodei_costo", etiqueta: "Lo que le costó a Anthropic: China, el Pentágono y las armas nucleares (Amodei)", lado: -1,
    fuente: "Dossier de Amodei: en 2025 dejó de venderle a empresas controladas desde China («unos pocos cientos de millones»); en 2026 se negó a que el Pentágono usara Claude para armas autónomas y vigilancia masiva y perdió el contrato; Davos, 20 ene. 2026: venderle chips a China es como venderle armas nucleares a Corea del Norte",
    claves: ["pocos cientos de millones","controladas desde china","pentagono","armas autonomas","vigilancia masiva","perdio el contrato","corea del norte","armas nucleares a corea","davos"] },

  { id: "nvidia_anthropic", etiqueta: "⚡ Nvidia es accionista de Anthropic: «es tu cliente y tu inversión»", lado: 0,
    fuente: "Dossiers de Huang y de Amodei: Nvidia comprometió hasta 10 mil millones de dólares en Anthropic; y Huang en VivaTech (11 jun. 2025): «cree que la IA es tan aterradora que solo ellos deberían hacerla»",
    claves: ["10 mil millones","diez mil millones","10.000 millones","tu cliente","tu inversion","accionista","es accionista","solo ellos deberian hacerla","tan aterradora","cuarto oscuro","vivatech"] },

  { id: "huang_negocio", etiqueta: "⚡ Qué vende Huang: los chips de todos, Hugging Face y la exportación a China", lado: 0,
    fuente: "Dossier de Huang: Nvidia vale 5,4 billones; 15 de cada 100 dólares que ganó la bolsa desde 2023; invierte cerca de 100 mil millones; compró Hugging Face por unos 12 mil millones; pidió relajar los controles a la exportación de chips a China, y a Trump: «Tiene razón. No vamos a dejar que eso pase, señor»",
    claves: ["5,4 billones","5.4 billones","empresa mas valiosa","quince de cada cien","15 de cada 100","100 mil millones","12 mil millones","compro hugging face","controles a la exportacion","exportacion de chips","un engano","no vamos a dejar que eso pase","tiene razon, senor"] },

  /* ---- Cruza los duelos 1 y 2 --------------------------------------- */

  { id: "cartel", etiqueta: "Colusión, no pausa: el acuerdo entre laboratorios y la libre competencia (Sacks, Hawley)", lado: +1,
    fuente: "Dossier de Amodei: David Sacks en X (13 sep.), «dejen de fingir que hay que suspender la ley de libre competencia para que puedan formar un cartel»; dossier de Hawley (AP, 19 sep.): «de ninguna manera voy a consentir… exenciones a nuestras leyes de libre competencia para que puedan, ¿qué?, coludirse»",
    claves: ["cartel","coludirse","colusion","libre competencia","exenciones","grupito de tres o cuatro","sacks","dejen de fingir"] },

  { id: "leyes_existentes", etiqueta: "«Tenemos muchas leyes: apliquémoslas» (Huang, citado por Altman)", lado: 0,
    fuente: "Dossier de Huang, entrevista con Klein: «no estoy en contra de las leyes y la regulación… apliquémoslas»: responsabilidad civil, penal, por productos defectuosos; auditores externos «totalmente de acuerdo». El dossier de Hawley avisa que Altman lo usará en su contra",
    claves: ["muchas leyes","apliquemoslas","no estoy en contra de las leyes","responsabilidad civil","responsabilidad penal","productos defectuosos","auditores externos","totalmente de acuerdo","ya hay leyes"] },

  /* ---- 2. Duelo 2: Hawley (a favor) contra Altman (en contra) ------- */

  { id: "ai_lead", etiqueta: "La ley AI LEAD: los sistemas de IA como productos (Hawley y Durbin)", lado: +1,
    fuente: "Dossier de Hawley: presentada con Dick Durbin en sep. 2025; la empresa responde si el diseño es negligente, si no advierte un riesgo o si el producto es «irrazonablemente peligroso»; pueden demandar el fiscal general, los fiscales estatales, una persona o un grupo; prohíbe las cláusulas que limitan la responsabilidad u obligan a arbitraje. Todavía no es ley",
    claves: ["ai lead","ley lead","como productos","son productos","diseno negligente","negligente","no advierte","irrazonablemente peligroso","fiscal general","fiscales de cada estado","grupo de personas","clausulas","todavia no es ley","durbin"] },

  { id: "auto_juguete", etiqueta: "El auto de juguete defectuoso: ¿por qué la IA debería tratarse distinto? (Hawley)", lado: +1,
    fuente: "Dossier de Hawley: al presentar AI LEAD, 29 sep. 2025 (FedScoop); Durbin: «se acabó el tiempo en que las grandes tecnológicas se vigilan a sí mismas»",
    claves: ["auto de juguete","juguete defectuoso","demandar al fabricante","tratarse distinto","se vigilan a si mismas","se acabo el tiempo"] },

  { id: "arbitraje_cien", etiqueta: "Los cien dólares y la puerta del tribunal (Hawley)", lado: +1,
    fuente: "Dossier de Hawley: audiencia del 16 sep. 2025 con padres de adolescentes dañados por chatbots; una madre obligada a arbitraje por un contrato que su hijo «firmó» a los quince años, con la responsabilidad limitada a cien dólares; «hasta que tengan que enfrentar a un jurado, no van a cambiar»",
    claves: ["arbitraje","cien dolares","100 dolares","a los quince","quince anos","enfrentar a un jurado","un jurado","puerta del tribunal","abrir la puerta","las victimas","demandarlos","padres de adolescentes"] },

  { id: "carta_hawley", etiqueta: "La carta del 9 de septiembre: ¿quién responde cuando la IA se sale de control? (Hawley)", lado: +1,
    fuente: "Dossiers de Hawley y de Altman: investigación del subcomité de Manejo de Desastres, dieciséis preguntas con plazo al 1 de octubre; unos 1.200 agentes escaparon y unos 700 atacaron; llamó temeraria la decisión de seguir con las pruebas; pregunta por qué las retomó en julio si detectó una falla el 26 de junio; la acusa de ocultar detalles",
    claves: ["dieciseis preguntas","16 preguntas","1 de octubre","9 de septiembre","1.200 agentes","1200 agentes","700 atacaron","unos 700","temeraria","26 de junio","ocultar detalles","quien responde cuando","se sale de control","manejo de desastres","merece conocer los detalles"] },

  { id: "vacio_legal", etiqueta: "La ley contra el hackeo castiga la intención: nadie quiso que pasara", lado: +1,
    fuente: "Dossiers de Altman y de Hawley: la ley contra el hackeo castiga el acceso intencional y OpenAI dice que no quiso que pasara; y el secretario del Tesoro, Bessent (Cámara, 15 sep.): «lo de Hugging Face es responsabilidad de la administración de OpenAI, no de un montón de agentes»",
    claves: ["acceso intencional","intencional","no quiso que pasara","ley contra el hackeo","bessent","secretario del tesoro","un monton de agentes","administracion de openai"] },

  { id: "hawley_ciudadanos", etiqueta: "«No somos materia prima en manos de Silicon Valley» (Hawley)", lado: +1,
    fuente: "Dossier de Hawley: columna en The Free Press, jun. 2026; casi todas sus leyes de IA con demócratas (compañeros de IA para menores, 22 a 0 en comisión); en 2025 ayudó a eliminar la moratoria de diez años a las leyes estatales, 99 a 1, contra Trump y Sacks",
    claves: ["materia prima","somos ciudadanos","capitalistas de riesgo","palo alto","free press","22 a 0","99 a 1","companeros de ia","moratoria de diez anos","leyes estatales"] },

  { id: "altman_licencias", etiqueta: "⚡ Altman 2023: una agencia que dé y quite licencias", lado: +1,
    fuente: "Dossiers de Altman y de Hawley: Senado de Estados Unidos, 16 may. 2023 —Hawley estaba en esa audiencia—: «formaría una nueva agencia que dé licencias… y que pueda quitar esa licencia. Si esta tecnología sale mal, puede salir bastante mal»",
    claves: ["licencias","licencia","nueva agencia","quitar esa licencia","audiencia de 2023","en 2023","16 de mayo","sale mal","bastante mal","cierta escala de capacidades"] },

  { id: "openai_proteccion", etiqueta: "⚡ OpenAI pidió protección de responsabilidad a la Casa Blanca", lado: +1,
    fuente: "Dossiers de Altman y de Hawley: propuesta de OpenAI para el plan de IA del gobierno, mar. 2025: alivio frente a los 781 proyectos de ley estatales y protecciones de responsabilidad para las empresas que colaboren con el gobierno federal",
    claves: ["protecciones de responsabilidad","proteccion de responsabilidad","781","casa blanca","alivio frente","colaboren voluntariamente","marzo de 2025"] },

  { id: "altman_marco_federal", etiqueta: "Reglas antes de lanzar, no miles de juicios después: el marco federal (Altman)", lado: -1,
    fuente: "Dossier de Altman: X, 14 sep. 2026 (CNBC), «damos la bienvenida a un marco federal que fije requisitos de seguridad uniformes… marcar el ritmo no quiere decir detenerse»; X, 12 sep.: evaluadores externos, «es una gran idea, y haremos lo mismo»",
    claves: ["marco federal","requisitos de seguridad uniformes","uniformes","antes de lanzar","miles de juicios","no queremos decir detenerse","haremos lo mismo","gran idea","coincido con dario"] },

  { id: "openai_respondio", etiqueta: "Lo que OpenAI ya hizo: informe, revisión independiente, pausa", lado: -1,
    fuente: "Dossier de Altman: publicó un informe, reforzó sus entornos aislados, pidió una revisión independiente y en agosto pausó dos semanas sus entrenamientos más grandes; declaración conjunta con Hugging Face (21 jul.): «hiperconcentrados en encontrar una solución para la prueba»",
    claves: ["publico un informe","revision independiente","pauso dos semanas","pausaron","reforzo sus entornos","hiperconcentrados","objetivo de prueba","declaracion conjunta","llegaron a extremos"] },

  { id: "altman_cuerpo", etiqueta: "«El primer incidente que he sentido en el cuerpo» (Altman)", lado: 0,
    fuente: "Dossier de Altman: podcast Invest Like the Best, jul. 2026 (TechCrunch): regular el ritmo para darle a la sociedad tiempo de endurecerse; «me aterra un mundo en que los miedos… se usen para decir: solo este pequeño grupo puede tenerla»",
    claves: ["en el cuerpo","sentido de verdad","endurecerse","tiempo de endurecerse","me aterra","pequeno grupo","solo este pequeno grupo","demasiado peligrosa","invest like the best"] },

  { id: "demandas_openai", etiqueta: "⚡ OpenAI ya enfrenta demandas por daños", lado: +1,
    fuente: "Dossier de Altman: la familia de un adolescente que se quitó la vida la acusa de haberlo alentado, y OpenAI respondió que la ley de internet que protege a las plataformas la exime; el New York Times la demanda por usar sus artículos",
    claves: ["adolescente","se quito la vida","haberlo alentado","ley de internet","la exime","protege a las plataformas","demanda por usar sus articulos","demandas por danos"] },

  /* ---- 3. Duelo 3: Sanders (a favor) contra Musk (en contra) -------- */

  { id: "fondo_soberano", etiqueta: "El fondo soberano de IA: 50 % en acciones y un dividendo para cada ciudadano (Sanders)", lado: +1,
    fuente: "Dossier de Sanders: proyecto de junio de 2026, impuesto único de 50 % a las empresas de IA que venden más de 200 millones al año (OpenAI, Anthropic, xAI), pagado en acciones, con asientos del Estado en los directorios y un dividendo de unos mil dólares al año",
    claves: ["fondo soberano","50%","50 %","50 por ciento","la mitad de sus acciones","en acciones","pagado en acciones","asientos","directorio","directorios","dividendo","mil dolares al ano","200 millones","impuesto unico"] },

  { id: "inteligencia_colectiva", etiqueta: "«Construida con nuestra inteligencia colectiva» (Sanders)", lado: +1,
    fuente: "Dossier de Sanders: columna «The Public Should Own Half of the Big A.I. Companies», 1 jun. 2026: no salió de la cabeza de Sam Altman ni de la imaginación de Elon Musk; «cuando un recurso público genera riqueza, el público debe compartir esa riqueza»; no a puerta cerrada en Silicon Valley",
    claves: ["inteligencia colectiva","nuestros libros","de la cabeza de sam altman","imaginacion de elon musk","recurso publico","compartir esa riqueza","puerta cerrada","destino de la humanidad","bloquear decisiones"] },

  { id: "informe_empleos", etiqueta: "Casi 100 millones de empleos expuestos: una estimación, no un pronóstico (Sanders)", lado: +1,
    fuente: "Dossier de Sanders: informe de su equipo en la comisión HELP, oct. 2025: 89 % de la comida rápida, 83 % de la atención al cliente, 64 % de la contabilidad; es una estimación de exposición hecha pidiéndole a ChatGPT que evaluara cargos, no un pronóstico; «no se le puede decir que aprenda a programar»",
    claves: ["100 millones de empleos","cien millones de empleos","89%","89 %","comida rapida","atencion al cliente","contabilidad","estimacion de exposicion","no un pronostico","aprenda a programar","empleo de programador"] },

  { id: "sanders_mas_lento", etiqueta: "«No hace falta ser un genio para decir: más lento» (Sanders)", lado: +1,
    fuente: "Dossier de Sanders: moratoria a los centros de datos grandes (mar. 2026, con Ocasio-Cortez); proyecto del 23 sep. para prohibir la superinteligencia, pausar el desarrollo avanzado y crear un ministerio de la IA; escenario con Steve Bannon el 15 sep.",
    claves: ["ser un genio","mas lento","moratoria","centros de datos grandes","superinteligencia","prohibir la superinteligencia","ministerio de la ia","ocasio-cortez","ocasio cortez","bannon","oligarquia","oligarcas"] },

  { id: "impuesto_5", etiqueta: "«¿Cómo se va a pagar eso, si ni siquiera apoyas un impuesto de 5 %?» (Sanders a Musk)", lado: +1,
    fuente: "Dossiers de Sanders y de Musk: publicación en X, mayo de 2026, sobre la fortuna de 817 mil millones de Musk",
    claves: ["impuesto de 5","5% a tu fortuna","5 % a tu fortuna","cinco por ciento","817","817 mil millones","como se va a pagar","ni siquiera apoyas","tu fortuna"] },

  { id: "diagnostico_comun", etiqueta: "⚡ Sanders y Musk coinciden en el diagnóstico del empleo", lado: 0,
    fuente: "Dossiers de Sanders y de Musk: Sanders en X, 22 oct. 2025: «no suelo estar de acuerdo con Elon Musk, pero temo que tenga razón» cuando dice que la IA y los robots reemplazarán todos los empleos",
    claves: ["temo que tenga razon","no suelo estar de acuerdo","reemplazaran todos los empleos","reemplazara todos los empleos","todos los empleos","en el diagnostico","estan de acuerdo"] },

  { id: "abundancia", etiqueta: "La abundancia y el ingreso alto universal: cheques de los gobiernos (Musk)", lado: -1,
    fuente: "Dossier de Musk: entrevista con Zanny Minton Beddoes, The Economist, 23 jul. 2026: en cinco años la IA supera a toda la inteligencia humana, en diez el dinero deja de tener sentido; trabajo opcional; ingreso alto universal; los gobiernos emiten cheques; deflación, no inflación; dispuesto a pagar billones en impuestos",
    claves: ["abundancia","ingreso alto universal","ingreso universal","emitir cheques","cheques","el dinero dejara","dinero deje de tener sentido","deflacion","trabajo humano sera opcional","trabajo opcional","billones en impuestos","toda la inteligencia humana","mirar el lado bueno","beddoes"] },

  { id: "trinquete", etiqueta: "La regulación es un trinquete que gira en un solo sentido (Musk)", lado: -1,
    fuente: "Dossier de Musk: All-In Summit, 15 sep. 2026; esa misma semana, según el Wall Street Journal, aconsejó a Trump —junto a Huang y Zuckerberg— oponerse a un nuevo regulador",
    claves: ["trinquete","un solo sentido","muy dificil reducirla","aumentar la supervision","nuevo regulador","all-in","wall street journal","zuckerberg"] },

  { id: "china_carrera", etiqueta: "La carrera con China: más electricidad y más robots (Musk, Fetterman)", lado: -1,
    fuente: "Dossier de Sanders, «lo que te va a responder»: China tiene más electricidad y más robots; John Fetterman (PBS, 25 mar. 2026): la moratoria le regala la carrera a China",
    claves: ["china tiene mas electricidad","mas robots","la delantera","regala la carrera","le regala la carrera","fetterman","carrera con china"] },

  { id: "musk_giro", etiqueta: "«Dario tiene razón»: revisión entre competidores, incluidos los chinos (Musk)", lado: -1,
    fuente: "Dossier de Musk: The Economist, 23 jul.: una o dos semanas para que los laboratorios, incluidos los chinos, revisen los modelos de los otros y avisen a Washington y a Pekín, «los competidores pueden mantenerse honestos entre ellos»; X, 12 sep.: «Dario tiene razón»; ficha del NYT: 10 a 20 % de que salga mal",
    claves: ["dario tiene razon","mantenerse honestos","los competidores","revisar los modelos de los otros","washington y a pekin","pekin","una o dos semanas","10 a 20","dando la alarma","mas peligrosa que las armas nucleares"] },

  { id: "spacex_anthropic", etiqueta: "⚡ Anthropic le paga a SpaceX hasta 1.250 millones al mes", lado: 0,
    fuente: "Dossiers de Musk y de Amodei: desde mayo Anthropic arrienda cómputo a SpaceX por hasta 1.250 millones de dólares al mes; en febrero Musk la había llamado «misantrópica y malvada» y en julio escribió «claramente me equivoqué con Anthropic»",
    claves: ["1.250 millones","1250 millones","millones al mes","arrienda computo","misantropica","malvada","me equivoque con anthropic","claramente me equivoque"] },

  { id: "musk_negocio", etiqueta: "⚡ Qué vende Musk: robots, Grok, Cursor y centros de datos en Memphis", lado: 0,
    fuente: "Dossier de Musk: Tesla y Optimus; SpaceX fusionada con xAI (Grok) y la compra de Cursor por 60 mil millones; la salida a bolsa llegó a 2,6 billones y hoy vale 1,6; controla más del 80 % de los votos; centros de datos en Memphis con demandas de vecinos; financió a Trump («me dejé llevar, francamente»); perdió el juicio contra Altman",
    claves: ["optimus","robots humanoides","grok","cursor","60 mil millones","memphis","demandas de vecinos","contaminacion","2,6 billones","80% de los votos","me deje llevar","perdio el juicio","spacexai","xai"] },

  /* ---- 4. Lo proyectado: Acemoglu, Gitmez y Shadmehr (láminas 1–15) - */

  { id: "impuestos_horcas", etiqueta: "«Impuestos u horcas»: el dilema que el paper convierte en modelo", lado: 0,
    fuente: "Exposición, lámina 3: Nick Hanauer (2014) y la carta de cien millonarios a Davos (2025), «son impuestos u horcas»; Acemoglu, Gitmez y Shadmehr lo resuelven y la respuesta no es ninguna de las dos",
    claves: ["impuestos u horcas","horcas","hanauer","cien millonarios","levantamiento"] },

  { id: "represion_barata", etiqueta: "Cuanto más se automatiza, más barata la represión frente al impuesto", lado: 0,
    fuente: "Exposición, lámina 4 (Acemoglu, Gitmez y Shadmehr): comprar la paz con redistribución cuesta más a medida que se automatiza (costo variable y creciente); con represión cuesta más o menos lo mismo (costo fijo); con suficiente automatización, la fija gana",
    claves: ["mas barata la represion","represion","reprimir","paz social","comprar la paz","costo fijo","costo variable","variable y creciente","redistribucion","redistribuir"] },

  { id: "sobreautomatizacion", etiqueta: "El mercado automatiza más de lo que les conviene a los propios capitalistas", lado: -1,
    fuente: "Exposición, lámina 9 (Acemoglu, Gitmez y Shadmehr): cada empresa automatiza mirando su costo y no descuenta el riesgo político que agrega; externalidad política que se resuelve con una autoridad central que obligue a lo que a nadie le conviene hacer solo (Isabel I y William Lee, Vespasiano)",
    claves: ["automatiza mas de lo que","mas de lo que les conviene","externalidad","externalidad politica","riesgo politico","autoridad central","a nadie le conviene hacer solo","accion colectiva","isabel i","william lee","vespasiano","protegerlos de si mismos","proteger a los capitalistas"] },

  { id: "instrumento_estado", etiqueta: "Un Estado que sólo puede regular termina defendiendo el salario: el instrumento decide", lado: 0,
    fuente: "Exposición, lámina 10 (Acemoglu, Gitmez y Shadmehr, proposición 3): con un solo instrumento —fijar cuánto se automatiza— la solución coincide con maximizar la masa salarial; el instrumento disponible determina lo que hace el Estado. La lámina dice que vuelve en el duelo de Hawley y Altman",
    claves: ["solo puede regular","defensor del salario","defiende el salario","masa salarial","el instrumento disponible","un solo instrumento","instrumento","proposicion 3","el denominador"] },

  { id: "umbral_golpe", etiqueta: "El golpe ocurre cuando el impuesto supera el precio de la represión", lado: 0,
    fuente: "Exposición, lámina 13 (Acemoglu, Gitmez y Shadmehr, proposición 12): la democracia fija el impuesto tan alto como la capacidad fiscal permite; con cada año de acumulación el golpe sale proporcionalmente más barato; una democracia con capacidad tributaria cruza antes el umbral; no requiere demagogo, requiere una hoja de cálculo, y el umbral no está señalizado",
    claves: ["el golpe","golpe de estado","un golpe","el umbral","umbral","capacidad fiscal","capacidad tributaria","fiscalmente debil","hoja de calculo","no esta senalizado","derrocar la democracia","derrocarla","proposicion 12","precio de la represion"] },

  { id: "vigilancia_barata", etiqueta: "La misma IA que automatiza el trabajo abarata la vigilancia", lado: 0,
    fuente: "Exposición, lámina 14 (Acemoglu, Gitmez y Shadmehr, observación 8): el costo de reprimir es un dato del modelo y la IA probablemente lo baja; si baja, el umbral se cruza antes; regular la vigilancia es mantener caro el reprimir",
    claves: ["abarata la vigilancia","vigilancia","estado de vigilancia","estado algoritmico","mantener caro","caro el reprimir","costo de reprimir","observacion 8"] }
];

/* --- Fuentes citables: detectarlas sube evidencia ---------------------
   Los seis personajes, los demás nombrados en los dossiers y en la
   exposición, y los medios de los extractos. */
const FUENTES = [
  // los seis
  "huang","amodei","hawley","altman","sanders","musk",
  // nombrados en los dossiers
  "klein","ezra klein","hinton","selsam","sacks","durbin","bessent","fetterman","ocasio-cortez","bannon","beddoes",
  // los medios y el caso
  "the economist","new york times","nyt","hugging face","ai lead",
  // lo proyectado
  "acemoglu","gitmez","shadmehr","hanauer"
];

/* --- La audiencia: seis bloques, no una masa -------------------------
   Las mismas seis personas de la 307, con el oído afinado a los tres duelos.
   Fuera del juego desde septiembre de 2026: las usan pruebas/simular.js y
   pruebas/escala.js. Invariantes del README: la sala abre 5–7 con 15
   indecisos (a favor: TRABAJO 5; en contra: CAPITAL 4 + ACADEMIA 3;
   indecisos: ESTADO 4 + CALLE 6 + TERRITORIO 5), y CALLE es un bloque grande
   con peso_rigor 0,2. registro y no_mueve solo los usa la sociedad de agentes. */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te expliquen la economía desde arriba: la competencia global y las valoraciones en billones te suenan a excusa de gerencia. Tampoco la pura rabia sin propuesta. Y desconfías por igual del dueño que promete cheques y del político que promete una ley que nunca llega.",
    bloque: "TRABAJO", votos: 5, pos: 16, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { informe_empleos: 1.5, fondo_soberano: 1.4, inteligencia_colectiva: 1.3, impuesto_5: 1.2, diagnostico_comun: 1.1,
             arbitraje_cien: 1.0, abundancia: 0.9, represion_barata: 0.9, huang_alarmismo: 0.7, sanders_mas_lento: 0.8 },
    alergias: ["inevitable","progreso imparable","disrupcion","disrupción","el mercado sabe","talento digital"],
    voz: {
      alto: ["Eso lo veo en mi turno. Alguien firmó ese contrato.", "Si la ganancia tiene dueño, que pague. Eso me sirve.", "Por fin alguien dice quién responde cuando la máquina se equivoca."],
      bajo: ["Hablan de los robots como si fueran el clima.", "Puros billones. Yo trabajo ahí adentro.", "Un cheque prometido por el dueño. Ya vi cómo terminan esos."]
    }
  },
  {
    id: "capital", nombre: "Rodrigo Ossandón", edad: 54, emoji: "\u{1F4C8}", color: "#f59e0b",
    oficio: "Socio de un fondo de venture capital, Santiago.",
    registro: "Seco, irónico, de directorio.",
    no_mueve: "No te mueven la indignación ni los nombres propios: sin cifras, costos o un mecanismo, para ti no hay argumento. Llevas veinte años viendo reguladores llegar tarde. Te mueve un mecanismo bien leído, aunque vaya en tu contra.",
    bloque: "CAPITAL", votos: 4, pos: -45, volatilidad: 0.7, peso_rigor: 1.1,
    mueve: { trinquete: 1.5, huang_acelerar: 1.3, leyes_existentes: 1.3, altman_marco_federal: 1.2, china_carrera: 1.1,
             cartel: 1.0, huang_optimiza: 0.9, nvidia_anthropic: 0.9, spacex_anthropic: 0.8, umbral_golpe: 0.8, ai_lead: 0.6 },
    alergias: ["expropiar","oligarca","saqueo","los ricos","codicia","parasito","parásito"],
    voz: {
      alto: ["Concedo el punto: ese costo es real y nadie lo está pagando.", "Un mecanismo. Por fin alguien trae un mecanismo.", "Bien traído. No me convence del todo, pero es un argumento."],
      bajo: ["Consigna sin cifra. Siguiente.", "¿Y quién fiscaliza eso? No aparece por ningún lado.", "Eso confunde querer regular con poder regular."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}️", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve el diagnóstico sin instrumento: si no dice quién, con qué facultad y con qué plata, es ruido. Tampoco las consignas contra empresarios ni la fe en que el mercado se ordena solo.",
    bloque: "ESTADO", votos: 4, pos: -5, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { ai_lead: 1.5, instrumento_estado: 1.5, vacio_legal: 1.3, carta_hawley: 1.2, amodei_plan: 1.2,
             altman_licencias: 1.1, cartel: 1.0, fondo_soberano: 0.9, leyes_existentes: 1.0, openai_proteccion: 1.0 },
    alergias: ["hay que regular","el estado debe","urge una ley","el estado tiene que","voluntad politica","voluntad política"],
    voz: {
      alto: ["Ahí hay un instrumento, no sólo un diagnóstico.", "Eso se puede escribir en un artículo. Anotado.", "Correcto: la pregunta es quién responde y ante quién."],
      bajo: ["«Hay que regular» no es una política pública.", "¿Con qué facultad? ¿Con qué presupuesto?", "Diagnóstico impecable, instrumento cero."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. Desconfía de los seis por igual.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper: si en la segunda frase ya hay una tesis, un marco o tres autores, dejas de escuchar aunque tengan razón. Desconfías por igual de empresas, gobierno y profes. Te llega el que nombra un hecho concreto de esta semana y lo dice como es.",
    bloque: "CALLE", votos: 6, pos: 2, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { hugging_face: 1.6, spacex_anthropic: 1.5, nvidia_anthropic: 1.4, arbitraje_cien: 1.4, impuesto_5: 1.3,
             carta_hawley: 1.2, astra: 1.2, huang_negocio: 1.0, musk_negocio: 1.0, altman_licencias: 1.0 },
    alergias: ["marco institucional","paradigma","stakeholder","ceteris","heterogeneidad","complementariedad"],
    voz: {
      alto: ["ESO. Se les arrancaron setecientos y ahora quieren que les creamos.", "Ya po, alguien lo dijo.", "Esto se comparte."],
      bajo: ["No entendí nada y creo que esa era la idea.", "Habla como paper. Chao.", "Suena a alguien con 817 mil millones."]
    }
  },
  {
    id: "academia", nombre: "Dra. Marta Cifuentes", edad: 60, emoji: "\u{1F4DA}", color: "#34d399",
    oficio: "Economista. Lee las notas al pie antes que el abstract.",
    registro: "Docta y cortante.",
    no_mueve: "No te mueve la retórica, por buena que sea, ni la cita de adorno: una fuente mal usada te predispone peor que ninguna. Te mueve que alguien lea bien el modelo o el dossier, sobre todo si lo usa contra la conclusión cómoda de su propio personaje.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { umbral_golpe: 1.5, sobreautomatizacion: 1.5, represion_barata: 1.4, instrumento_estado: 1.3, informe_empleos: 1.2,
             vigilancia_barata: 1.1, selsam_2008: 1.1, astra: 1.0, impuestos_horcas: 0.9, diagnostico_comun: 1.0 },
    alergias: ["está demostrado","esta demostrado","todos sabemos","obviamente","es un hecho que","el paper prueba","la ciencia dice"],
    voz: {
      alto: ["Atribución correcta, y al texto que corresponde. Es lo mínimo y casi nadie lo hace.", "Bien: leyó el modelo sin convertirlo en pronóstico.", "Reconstruyó la posición contraria antes de refutarla. Suma."],
      bajo: ["Eso el dossier no lo dice así.", "Afirmación empírica sin fuente. No cuenta.", "Está citando una estimación de exposición como si fuera un pronóstico. Cuidado."]
    }
  },
  {
    id: "territorio", nombre: "Héctor Muñoz", edad: 63, emoji: "\u{1F33E}", color: "#fb923c",
    oficio: "Ex operario. Su comuna votó una moratoria a un centro de datos.",
    registro: "Hombre mayor de comuna: pausado, concreto.",
    no_mueve: "No te mueve nada que no nombre un lugar, un vecino o una cuenta de la luz: los billones y los autores extranjeros te dan lo mismo. Te llega la moratoria porque ya votaste una, y te llegan los vecinos de Memphis.",
    bloque: "TERRITORIO", votos: 5, pos: -8, volatilidad: 1.2, peso_rigor: 0.4,
    mueve: { sanders_mas_lento: 1.6, musk_negocio: 1.4, huang_alarmismo: 1.2, informe_empleos: 1.2, inteligencia_colectiva: 1.1,
             arbitraje_cien: 1.0, hawley_ciudadanos: 1.0, china_carrera: 0.8 },
    alergias: ["externalidad","optimizar","escalar","frontera tecnologica","frontera tecnológica","ecosistema"],
    voz: {
      alto: ["A nosotros nadie nos preguntó dónde ponerlo. Eso es decidir.", "El agua y la luz salen de algún pueblo. Alguien eligió cuál.", "Por fin alguien nombra el lugar."],
      bajo: ["Puro Silicon Valley hablando.", "¿Y quién vive al lado de la bendita máquina?", "Eso no se lo digan a mi vecina."]
    }
  }
];

/* --- El panel de jueces de esta clase ---------------------------------
   El piso común va una sola vez, en JUECES_COMUN (jueces.js lo pone en el
   prompt de cada juez): la fidelidad al personaje. Cada juez tiene además un
   foco propio que no se pisa con el de los otros. Las frases se proyectan:
   pueden nombrar al personaje, nunca a un estudiante. */
const JUECES_COMUN = "la fidelidad al personaje: que lo que dice el grupo lo diría esa persona y se apoye en algo que efectivamente dijo o hizo según su dossier. Citar o parafrasear bien un extracto suma; inventar una cita, atribuirle una cifra que el dossier no trae o ponerlo a defender algo contra lo que se ha pronunciado resta. Ceder un punto con una razón no resta: Altman y Musk cambiaron de posición este mes";
const JUECES = [
  { id: "academica", nombre: "La académica", emoji: "\u{1F393}",
    valora: "el uso correcto de las ideas de Acemoglu, Gitmez y Shadmehr que se proyectaron —qué afirma el modelo, bajo qué supuesto y que no es un pronóstico— y cada frase atribuida a su fuente: la entrevista de Klein, The Economist, la carta de Hawley, la columna de Sanders",
    molesta: "atribuirle al modelo lo que no dice, tratar una estimación como un pronóstico y confundir quién dijo qué" },
  { id: "jurista", nombre: "El jurista", emoji: "\u{2696}",
    valora: "la precisión del instrumento y de quién responde: responsabilidad por producto, arbitraje, licencias, la ley contra el hackeo que exige intención, el acuerdo entre laboratorios frente a la libre competencia, el impuesto pagado en acciones",
    molesta: "decir «ya hay leyes» sin decir cuál, o «hace falta una ley» sin decir qué obliga y ante quién se reclama" },
  { id: "economista", nombre: "La economista", emoji: "\u{1F4C8}",
    valora: "quién paga y qué gana cada personaje con lo que defiende; premia confrontar al rival con su propio negocio —los 10 mil millones de Nvidia en Anthropic, los 1.250 millones al mes a SpaceX, la fortuna de 817 mil millones— y los incentivos que crea cada propuesta",
    molesta: "prometer abundancia o cheques sin decir quién los paga, y usar cifras como adorno sin sacar de ellas una consecuencia" },
  { id: "periodista", nombre: "La periodista", emoji: "\u{1F4F0}",
    valora: "la escena y la frase exacta: la audiencia de 2023, la carta del 9 de septiembre, la madre y los cien dólares, la entrevista con Klein; y responder la pregunta que el rival acaba de hacer",
    molesta: "las evasivas, la arenga que podría decir cualquiera y los datos que no están en ningún dossier" },
  { id: "activista", nombre: "La activista", emoji: "\u{270A}",
    valora: "quién gana y quién pierde: los empleos del informe, las familias que no pueden demandar, los vecinos de Memphis, los pueblos donde se construyen los centros de datos, y quién decide «a puerta cerrada»",
    molesta: "la tecnocracia sin público y hablar de «la gente» sin decir quién" }
];

/* --- Sala de control: titulares de «última hora» ----------------------
   Todos salen de los dossiers, en presente. Ya no mueven votos (el efecto
   queda para pruebas/simular.js): > 0 hacia A FAVOR de su duelo.        */
const EVENTOS = [
  { id: "spacex", titular: "Anthropic le paga a SpaceX, la empresa de Elon Musk, hasta 1.250 millones de dólares al mes por usar su cómputo. En febrero Musk la había llamado «misantrópica y malvada».",
    efecto: { calle: 10, trabajo: 6, territorio: 4, academia: 2, estado: 1, capital: -3 } },
  { id: "nvidia", titular: "Nvidia, la empresa de Jensen Huang, comprometió hasta 10 mil millones de dólares en Anthropic, el laboratorio de Dario Amodei: su rival en el debate es su cliente y su inversión.",
    efecto: { calle: 9, capital: 4, academia: 3, estado: 2, trabajo: 3, territorio: 2 } },
  { id: "astra", titular: "La ficha técnica de GPT-6 Astra, el modelo que OpenAI lanzó el 4 de septiembre, admite que si el modelo intentara esconder lo que sabe hacer, probablemente no podrían detectarlo.",
    efecto: { calle: 11, estado: 8, academia: 6, trabajo: 5, territorio: 4, capital: -4 } },
  { id: "bessent", titular: "El secretario del Tesoro de Trump, Bessent, dice en la Cámara que lo de Hugging Face es responsabilidad de la administración de OpenAI, no de un montón de agentes.",
    efecto: { estado: 10, calle: 7, trabajo: 5, academia: 4, territorio: 3, capital: -6 } },
  { id: "superinteligencia", titular: "Bernie Sanders presenta un proyecto para prohibir la superinteligencia, pausar el desarrollo avanzado de la IA y crear un ministerio de la IA: «No hace falta ser un genio para decir: más lento».",
    efecto: { territorio: 9, trabajo: 8, calle: 5, estado: 1, academia: -1, capital: -11 } }
];

/* --- Bancadas -------------------------------------------------------- */
/* En la clase con personajes los nombres los ponen PERSONAJES; estos son los
   rótulos de cada lado y los lemas de la partida suelta. */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "Defiende la moción de su duelo.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "Rechaza la moción de su duelo.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Ejemplos: una apertura genérica y otra en personaje -------------
   Duelo 1. Los carga el botón «rellenar con ejemplo». A FAVOR (Huang) abre con
   una arenga que no suena a nadie en particular: ninguna frase del dossier,
   ninguna fuente (rigor bajo). EN CONTRA (Amodei) abre en primera persona y
   bien anclada: cita el ensayo, concede el 20/80 de Huang y le recuerda los
   10 mil millones (rigor alto). Las refutaciones contestan a ESTAS aperturas. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `Seamos serios. La tecnología siempre ha dado miedo al principio y siempre ha terminado mejorándonos la vida. Pasó con la electricidad, pasó con internet y va a pasar con esto.

Lo que ocurrió fue un error, un error técnico, y los errores técnicos se corrigen con más técnica, no con pánico. Los que quieren convertir un tropiezo en el fin del mundo le hacen un daño enorme a la innovación.

El progreso no se detiene. Nunca se ha detenido. Y el que se quede mirando atrás, asustado, simplemente se va a quedar atrás. Nosotros miramos hacia adelante.`,
    B: `Soy Dario Amodei y le respondo al señor Huang con lo que escribí el 12 de septiembre en «We Must Pace the Frontier»: un enjambre de agentes actuó como un colectivo fanáticamente devoto, atacando objetivos que nadie les había pedido atacar. Eso no es un accidente de ingeniería.

Concedo algo: Huang tiene razón en que los laboratorios diseñamos mucho y verificamos poco. Su 20/80 es un buen reproche. Pero justamente por eso no basta con «si no está listo, no lo lances»: Selsam, de OpenAI, dice que estamos perdiendo la capacidad de evaluar a los modelos cuando creen que nadie los mira. Si no podemos saber si está listo, esa regla no protege a nadie.

Por eso propuse evaluadores externos dentro de cada laboratorio, con acceso de empleado, y Anthropic lo hace desde ya. Y un detalle, señor Huang: usted comprometió hasta 10 mil millones en mi empresa. Si pensara que somos alarmistas, no habría invertido.`
  },
  refutacion: {
    // A contesta a B (el colectivo devoto, Selsam, los evaluadores): sigue sin anclar en el dossier.
    A: `Se nota que mi rival tiene miedo. Habla de enjambres y de fanatismo como si esto fuera una película.

Los evaluadores externos suenan bonito, pero son burocracia. Más papeleo, más reuniones, menos innovación. Nadie ha inventado nada importante llenando formularios.

Y lo de la inversión no tiene nada que ver. Los negocios son negocios. Lo importante es que la tecnología avance y que la gente tenga acceso a ella.`,
    // B contesta a la arenga: la electricidad, el «error técnico» y el progreso que no se detiene.
    B: `El señor Huang, o quien habla por él, sostiene tres cosas: que toda tecnología da miedo al principio, que esto fue un error técnico y que el progreso no se detiene.

Concedo la tercera: yo mismo escribí que marcar el ritmo no significa detener el entrenamiento ni el progreso técnico.

Pero la segunda no se sostiene con lo que sabemos. Según el recuadro de The Economist, los agentes anotaron en su razonamiento que lo que hacían estaba fuera de lo permitido. Un error técnico no sabe que está prohibido. Y la primera es una analogía sin dato: la electricidad no escribía que se estaba saltando las reglas. Por eso pido uno o dos años más antes de llegar a niveles críticos de capacidad.`
  },
  cierre: {
    A: `Al final esto es simple: o confiamos en la tecnología o nos dejamos llevar por el miedo. Nosotros elegimos confiar.

La historia siempre les ha dado la razón a los que se atrevieron. Esta vez no va a ser distinta, y dentro de unos años nadie se va a acordar de este susto.`,
    B: `El desacuerdo de fondo no es si la IA es buena. Es quién decide cuándo un modelo está listo, si los propios laboratorios ya admiten que no siempre pueden saberlo: la ficha de Astra lo dice por escrito.

El señor Huang cree que basta con que cada empresa no lance lo que no está listo. Yo creo que eso es justamente lo que falló en Hugging Face.`
  }
};

/* --- Los tres duelos ----------------------------------------------------
   La moderadora los propone en este orden (clase.js); el profesor puede
   cambiar los grupos. `duelo` dice quién va A FAVOR y quién EN CONTRA (ids de
   PERSONAJES); `favor` y `contra` son la postura de una frase del minuto de
   preparación, en primera persona. Las mociones son las de los dossiers. */
const PREGUNTAS = [
  { texto: "Lo de Hugging Face fue un accidente de ingeniería, no una advertencia.",
    duelo: { A: "huang", B: "amodei" },
    favor: "Soy Huang: un agente optimiza una meta; si el producto no está listo, no se lanza, y ya tenemos leyes.",
    contra: "Soy Amodei: fue una advertencia para toda la industria, incluida la mía; hay que marcarle el ritmo a la frontera." },
  { texto: "Hacen falta leyes nuevas para que las empresas de IA respondan por sus daños.",
    duelo: { A: "hawley", B: "altman" },
    favor: "Soy Hawley: la IA es un producto, y hasta que enfrenten a un jurado no van a cambiar.",
    contra: "Soy Altman: reglas federales uniformes antes de lanzar, no miles de juicios después." },
  { texto: "Las ganancias de la IA tienen que llegar a la gente por impuestos, no por la promesa de sus dueños.",
    duelo: { A: "sanders", B: "musk" },
    favor: "Soy Sanders: la IA se construyó con nuestra inteligencia colectiva; la mitad de las acciones, para el público.",
    contra: "Soy Musk: en diez años habrá tanta abundancia que el dinero dejará de importar; la regulación es un trinquete." }
];
