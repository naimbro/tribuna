/* =====================================================================
   TRIBUNA — contenido de una sesión.
   MGT300 · Sociedad, Cultura y Política · Ingeniería Comercial UAI.
   Clase 7 — martes 22 de septiembre de 2026, 11:30–14:10.

   Los alumnos son de pregrado, no del Minor en IA. Sólo se juzga lo que
   leyeron en sala y lo que se proyectó. Dos documentos y una exposición:

   1) Mapa del NYT, 13 fichas (resumen de las 18 del original), en la
      traducción de la guía impresa (teaching/2026_mgt300_clase7_guia_lectura.html,
      sección 1): resumen y traducción propios de E. Martin y R. Lieberman,
      «How A.I. Risks Are Splitting Silicon Valley and Washington», NYT,
      15 sep. 2026.
   2) Reportaje de A. Chernin y N. Yáñez, «Entre Thiel y el Papa: la disputa
      ideológica por regular la IA», La Tercera, 20 sep. 2026 (impreso). La guía
      lo tabula con doce nombres chilenos.
   3) Exposición de 25 min, «¿Quién se queda con la IA?»: empleo, reparto y la
      reacción que ya está en la calle. De ahí sale un solo dato que este
      archivo usa, la lámina de Pew de la brújula. El modelo de Acemoglu,
      Gitmez y Shadmehr NO se proyectó hoy: la diapo 27 lo anuncia para la
      clase 8.

   Lectura asignada que muchos no habrán hecho: Schneier & Sanders, Rewiring
   Democracy, caps. 33 y 40–42. Suma en `evidencia`; no es requisito de nada.

   Modo de juego: clase en rotación con brújula encendida, ~55 min. Brújula
   en el teléfono (10 min) y después tres o cuatro debates. Sala de unos 30
   alumnos, seis grupos de cinco. La sala sintética parte en 5–7–15.

   Ninguna cifra ni cita de este archivo está fuera de esos dos documentos.
   ===================================================================== */

const SESION = {
  curso: "MGT300 — Sociedad, Cultura y Política",
  semana: 307,
  tema: "¿Quién debe gobernar la IA? La ley chilena que se está reescribiendo",
  mocion: "Chile debe aprobar la ley de IA con obligaciones vinculantes para las empresas antes de que llegue la inversión, no después.",
  favor: "A FAVOR",
  contra: "EN CONTRA"
};

/* --- Rondas: iguales al molde de la semana 7 -------------------------- */
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

/* --- Knowledge base de la clase 7 -------------------------------------
   claves = detonantes textuales (minúsculas; norm() quita tildes, así que
            basta una forma sin tilde)
   lado   = +1 apoya la moción (ley vinculante ANTES de la inversión),
            -1 la debilita (abrir primero y corregir después),
             0 sirve a los dos lados
   La `fuente` dice siempre de cuál de los dos documentos sale, para que la
   moderadora pueda preguntar «¿eso quién lo dice, en cuál de los dos textos?»
   y el jurado pueda premiar el cruce entre países.                       */
const CONCEPTOS = [

  /* ---- 1. El reportaje de La Tercera (cuerpo principal) -------------- */

  { id: "giro_180", etiqueta: "El giro de 180 grados: del enfoque de riesgos a la inversión", lado: 0,
    fuente: "La Tercera (20 sep. 2026), Chernin y Yáñez: el proyecto de Boric de mayo de 2024 y las indicaciones sustitutivas de Kast, según Rojo Edwards",
    claves: ["giro de 180","180 grados","indicacion sustitutiva","indicaciones sustitutivas","sustitutiva","mas de 20 articulos","20 articulos","veinte articulos","clasificacion de riesgos","enfoque de riesgos","union europea","mayo de 2024","proyecto de 2024","sobrerregulacion","rojo edwards","comision futuro","boletin 16821"] },

  { id: "consenso_limites", etiqueta: "El consenso de la Cámara para poner límites (Manouchehri)", lado: +1,
    fuente: "La Tercera: Daniel Manouchehri (PS), presidente de la Comisión de Ciencias; cuatro iniciativas aprobadas por unanimidad en la idea de legislar",
    claves: ["tenemos diferencias","existe un consenso","poner limites a la ia","limites a la ia y a las plataformas","cuatro iniciativas","idea de legislar","por unanimidad","comision de ciencias","comision de ciencia"] },

  { id: "incidentes_openai", etiqueta: "Los seis incidentes y el deber de anticiparse (Martínez, UDI)", lado: +1,
    fuente: "La Tercera: los seis incidentes con agentes descontrolados que reveló OpenAI, símil del hackeo de julio a Hugging Face; Cristóbal Martínez (UDI)",
    claves: ["seis incidentes","agentes descontrolados","agentes de ia descontrolados","fuera de control","descontrolado","anticiparnos","anticiparse","no se trata de frenar la tecnologia","impedir la innovacion","los propios desarrolladores","vienen advirtiendo","cristobal martinez"] },

  { id: "kaiser_derechos", etiqueta: "Derechos del ciudadano, no regular el funcionamiento (Kaiser)", lado: -1,
    fuente: "La Tercera: Johannes Kaiser, líder del PNL",
    claves: ["kaiser","derechos de las personas respecto","no de regular el funcionamiento","regular el funcionamiento","supervigilancia","estado de supervigilancia","enemigo del ciudadano","ciudadano honesto","el estado es el que tiene que ser transparente","estado al servicio del ciudadano","se le arranca la moto","control del ciudadano"] },

  { id: "regular_no_prohibir", etiqueta: "Regular en vez de prohibir: la brocha de los deepfakes (Ross, Schalper)", lado: -1,
    fuente: "La Tercera: Felipe Ross (Republicano, Distrito 13) sobre el proyecto de deepfakes; Diego Schalper (RN, Distrito 11) y las cortapisas al uso",
    claves: ["prohibir con la brocha","con la brocha","representaciones digitales verosimiles","verosimiles pero falsas","deep fakes","deepfakes","metaverso","regular en vez de prohibir","cortapisas","cortapisas al uso","derechos de autor","pagar un fee","un fee","uso indiscriminado","estoy por regularla","barreras al desarrollo","se autorregula","uso libre","se le sanciona","boletin 17795"] },

  { id: "inversion_primero", etiqueta: "Que la inversión llegue primero: centros de datos, pymes, mercado flexible", lado: -1,
    fuente: "La Tercera: Felipe Ross (republicanos) sobre data centers y mercado laboral; Patricio Briones (PDG)",
    claves: ["data center","data centers","centros de datos","centro de datos","recirculan el agua","amenaza ambiental","algo del pasado","mercado laboral mucho mas flexible","mercado laboral flexible","rigidizacion","rigidizacion del mercado","revolucion industrial","la cut","los gremios","tiro en los pies","pegarse un tiro","emprendedores","pymes","ganarle al sistema","nuestra propia inteligencia artificial","briones"] },

  { id: "winter_sujeto", etiqueta: "«¿Quién será el dueño del futuro?»: articular un sujeto o recibir limosna (Winter)", lado: 0,
    fuente: "La Tercera: la carta abierta de Gonzalo Winter (FA) en Substack, 28 de julio, 20 páginas y 71 mil caracteres",
    claves: ["dueno del futuro","quien sera el dueno","carta abierta","substack","71 mil caracteres","20 paginas","articular a un sujeto","un sujeto que hoy no esta articulado","corriente de pensamiento","una sensibilidad","necesita dos actores","amenazarse el uno al otro","aqui hay uno solo","volverse temible","temible para los duenos","toda mediacion","un monologo","una limosna","toda concesion"] },

  { id: "impuesto_global", etiqueta: "Impuesto global a la IA e institucionalidad sudamericana (Winter)", lado: +1,
    fuente: "La Tercera: la carta de Gonzalo Winter (FA)",
    claves: ["impuesto global","impuesto nacional","todas las inteligencias artificiales del mundo","la humanidad completa","los pueblos que produjeron","donde tributa","quien administra","america del sur","institucionalidad comun","negociar de igual a igual","corporaciones tecnologicas planetarias","ningun pais del sur","mas ricas que su propio producto interno","producto interno"] },

  { id: "girardi_prevision", etiqueta: "¿Quién financia la previsión cuando el trabajo se desplaza? (Girardi)", lado: +1,
    fuente: "La Tercera: el exsenador Guido Girardi (PPD)",
    claves: ["girardi","seguridad social","prestaciones de salud","las pensiones se financian","impuestos al trabajo","quien va a financiar la salud","seres humanos sean desplazados","contratacion por tareas","uberizacion","uberizacion del trabajo","fragilizar"] },

  { id: "reconversion_reparto", etiqueta: "Quién se beneficia de la productividad: reconversión y cuotas (Manouchehri, Yeomans)", lado: +1,
    fuente: "La Tercera: Daniel Manouchehri (PS) y Gael Yeomans (FA), presidenta del partido",
    claves: ["quien se va a beneficiar","de esa productividad","siglo xxi","desigualdades del siglo xix","facil innovar","caro vulnerar derechos","confederacion nacional de trabajadores","trabajadores del comercio","proceso de reemplazo","plan agresivo","reconversion laboral","reconversion","cuotas de puestos","puestos de trabajo que no se debiesen reemplazar","son indispensables","mas que subsidios","el obrero","reparte en una aplicacion","cuida a un adulto mayor","no tiene contrato","la automatizacion acelera","sus sindicatos","tienen que estar en esa conversacion","se tiene que distribuir","mayor capacitacion","medidas pro empleo","yeomans","manouchehri"] },

  { id: "representante_legal", etiqueta: "Representante legal en Chile: el puesto de comida y la soberanía (Serrano)", lado: +1,
    fuente: "La Tercera: Daniela Serrano (PC), representante del PC en la Comisión de Ciencias",
    claves: ["serrano","representante legal","sin un representante legal","grandes plataformas que operen","puesto de comida","serie de permisos","permisos y requisitos","batalla cultural","cuestion de soberania","soberania"] },

  { id: "thiel_vs_papa", etiqueta: "Thiel contra el Papa: la disputa deja de ser izquierda y derecha (Montalva)", lado: 0,
    fuente: "La Tercera: José Montalva (ex PPD), de la Comisión de Ciencias",
    claves: ["montalva","disputa de poder","ya no va a ser entre izquierdas y derechas","tecnolibertaria","tecnolibertarismo","corriente tecnolibertaria","peter thiel","thiel","fundo palantir","palantir","leon xiv","papa leon","subordinada a la dignidad humana","bien comun","no sean pocas empresas","pocas empresas las que terminen controlando"] },

  { id: "enciclica", etiqueta: "La encíclica Magnifica Humanitas: el proyecto tecnocrático deshumanizador", lado: +1,
    fuente: "La Tercera: la encíclica de León XIV y su influencia en Chile Vamos frente a republicanos y el PNL",
    claves: ["enciclica","magnifica humanitas","proyecto tecnocratico","tecnocratico","deshumanizador","meros datos","reduce a los individuos","monopolios digitales","priorizan el lucro","lucro por sobre la dignidad","dignidad humana","chile vamos","el estado como regulador"] },

  /* ---- 2. La exposición (tres ideas proyectadas) --------------------- */

  { id: "cuatro_campos", etiqueta: "La grilla de cuatro campos: velocidad × quién pone la regla", lado: 0,
    fuente: "Guía de lectura, sección «El cruce»: dos preguntas, cuatro esquinas, dos países, con las trece fichas y los doce chilenos ubicados en el plano",
    claves: ["cuatro campos","dos preguntas distintas","frenar por ley","frenar desde adentro","guardarrailes sin freno","ni freno ni ley","quien pone la regla","a que velocidad","la grilla","el cruce","dos preguntas","cuatro esquinas","frenar sin que lo regulen","regular sin frenar"] },

  { id: "instrumento", etiqueta: "Qué instrumento le pide o le niega al Estado cada persona", lado: 0,
    fuente: "Guía de lectura, cierre del cruce: «elige a uno de los veinticinco y anota en una frase qué instrumento le pide o le niega al Estado»; y la columna «qué pide» de la tabla de los doce chilenos",
    claves: ["que instrumento","con que instrumento","que instrumento pide","le pide al estado","le niega al estado","un instrumento","el instrumento","una prohibicion","una obligacion previa","responsabilidad por dano","permiso de entrada","una cuota","un impuesto","un derecho","quien lo hace cumplir","con que facultad"] },

  /* ---- 3. El mapa del NYT (13 fichas en la guía) --------------------- */

  { id: "giro_altman", etiqueta: "El giro de Altman y Musk después de Hugging Face", lado: +1,
    fuente: "Mapa NYT (guía, sección 1), fichas de Sam Altman y Elon Musk",
    claves: ["altman","riesgo de extincion","declaracion sobre riesgo","graduales y manejables","gradual y manejable","se salieran de control","atacaran a la empresa","hugging face","hora de ir mas lento","coincide con amodei","dario tiene razon","10 a 20 por ciento","mas peligrosa que las armas nucleares","armas nucleares","xai","financio la eleccion","cambiaron de posicion"] },

  { id: "amodei_ritmo", etiqueta: "El ensayo de Amodei y el «ritmo deliberado» de Nadella", lado: -1,
    fuente: "Mapa NYT, fichas de Dario Amodei, Satya Nadella y Demis Hassabis",
    claves: ["amodei","anthropic","primero la seguridad","armas biologicas","3.800 palabras","ensayo de 3.800","desacelerar el desarrollo","marcar el ritmo","nadella","ritmo deliberado","supervision humana","bajo control humano","la superinteligencia no vale la pena","hassabis","deepmind","regulacion inteligente","optimista cauteloso","detalles todavia estan por resolverse","adopcion masiva"] },

  { id: "guardarrailes", etiqueta: "Guardarraíles sin desaceleración: toque liviano (Pichai, Thune)", lado: -1,
    fuente: "Mapa NYT, fichas de Sundar Pichai y John Thune",
    claves: ["pichai","demasiado importante para no regularla","reglas hechas a la medida","a la medida de cada uso","restricciones pesadas","no capturar los beneficios","guardarrailes sin desaceleracion","guardarrailes","thune","toque liviano","amenazas de mayor consecuencia","mayor consecuencia","proyecto bipartidista","salvaguardas","sin frenar la innovacion","ceder terreno"] },

  { id: "producto_responsable", etiqueta: "La IA como producto: responsabilidad por daño (Hawley, Durbin)", lado: 0,
    fuente: "Mapa NYT, fichas de Josh Hawley, Dick Durbin y Hakeem Jeffries",
    claves: ["hawley","durbin","clasifica a los sistemas de ia como productos","sistemas de ia como productos","como productos","responsabilidad cuando causan dano","demandas por responsabilidad","responsabilidad por dano","responsabilidad legal","indagatoria formal","indagatoria","le exigio a altman","por escrito","imagenes intimas","sin consentimiento","dano de los chatbots","chatbots a ninos","jeffries","accion decisiva","no puede dejar que los ejecutivos regulen","regulen su propia tecnologia"] },

  { id: "paquete_sanders", etiqueta: "El paquete de Sanders: moratoria, 50 %, regulador federal", lado: +1,
    fuente: "Mapa NYT, ficha de Bernie Sanders",
    claves: ["sanders","moratoria","moratoria a nuevos centros de datos","impuesto de 50 por ciento","50 por ciento","por una sola vez","fondo publico","prohibicion permanente","prohibir la superinteligencia","prohibicion de la superinteligencia","pausa del desarrollo","regulador federal","hasta que exista un regulador","oligarcas","herramienta de oligarcas","la gente que trabaja"] },

  { id: "acceso_china", etiqueta: "Acceso abierto y la carrera con China (Zuckerberg, Trump, Johnson)", lado: -1,
    fuente: "Mapa NYT, fichas de Mark Zuckerberg, Donald Trump y Mike Johnson",
    claves: ["zuckerberg","ia concentrada en pocas empresas","el acceso amplio","acceso amplio","modelos abiertos","acceso abierto","liberar abiertamente","la delantera a china","ventaja a china","carrera con china","ganarle a china","dominancia en ia","construir rapido","electricidad para los centros de datos","rechazo el llamado","llamada con huang","no va a intervenir","johnson","aprobar a la carrera","proveedores de plataformas","acabe con la humanidad"] },

  { id: "frontera_labs", etiqueta: "«Los laboratorios fijan la frontera» (Sacks, Huang, Andreessen)", lado: -1,
    fuente: "Mapa NYT, fichas de David Sacks, Jensen Huang y Marc Andreessen y Ben Horowitz",
    claves: ["sacks","complejo industrial del apocalipsis","complejo industrial","leyes estatales","enfoque federal liviano","fijan la frontera","la frontera tecnologica ellos mismos","frontera tecnologica","huang","nvidia","los chips","ninguna empresa deberia estar pidiendole","pidiendole al gobierno mas regulacion","controles a la exportacion","exportacion de chips","andreessen","horowitz","manifiesto tecno-optimista","tecno-optimista","riesgo existencial","enemigos del progreso","ley seca","wang","precaria desde la bomba","disuasion de seguridad nacional"] },

  /* ---- 4. La comparación entre los dos documentos -------------------- */

  { id: "lineas_conocidas", etiqueta: "En EE.UU. las divisiones no siguen las líneas conocidas; en Chile sí", lado: 0,
    fuente: "Guía de lectura, observaciones de las secciones 1 y 2: el cruce de los 13 estadounidenses contra el de los 12 chilenos",
    claves: ["no siguen las lineas conocidas","lineas conocidas","sanders y hawley","un socialista y un republicano","del mismo lado","enfrentado a los ejecutivos","que financiaron su campana","los tres que mas saben","los que mas quieren frenarla","en chile si","casi todos los diputados","la regla la pone el estado","de que trata la ley","el trabajo y el reparto","los derechos individuales","limites al estado","tercera pregunta","en los dos paises","los dos textos","los dos documentos","el mapa y el reportaje"] }
];

/* --- Fuentes citables: detectarlas sube evidencia ---------------------
   Los 11 chilenos del reportaje, los 18 del mapa del NYT, los dos medios y
   los nombres que los dos textos dan por sabidos. */
const FUENTES = [
  // Reportaje de La Tercera
  "la tercera","chernin","yanez","schalper","ross","kaiser","briones","martinez","yeomans","winter",
  "manouchehri","girardi","serrano","montalva","edwards","boric","kast","enciclica","magnifica humanitas",
  "leon xiv","thiel","palantir",
  // Mapa del NYT
  // (Hassabis, Alex Wang y Jeffries están en el original del NYT pero NO en las
  // trece fichas de la guía: no se premia citar lo que nadie leyó.)
  "nyt","new york times","amodei","altman","musk","nadella","pichai","zuckerberg",
  "huang","sacks","andreessen","horowitz","sanders","hawley","durbin","thune","trump","johnson",
  "hugging face","anthropic","openai","nvidia",
  // Lectura asignada, y el único dato de la exposición que la brújula les proyecta
  "schneier","rewiring democracy","pew"
];

/* --- La audiencia: seis bloques, no una masa -------------------------
   Las mismas seis personas de las semanas 5 y 7, con el oído afinado a la
   moción chilena. Fuera del juego desde septiembre de 2026: las usan
   pruebas/simular.js y pruebas/escala.js. Se conservan nombre, oficio,
   registro y no_mueve; cambian `mueve`, `alergias` y `voz`.
   Invariantes del README: la sala abre 5–7 con 15 indecisos (a favor:
   TRABAJO 5; en contra: CAPITAL 4 + ACADEMIA 3; indecisos: ESTADO 4 +
   CALLE 6 + TERRITORIO 5), y CALLE es un bloque grande con peso_rigor 0,2.
   registro y no_mueve solo los usa la sociedad de agentes (MOTOR → AUDIENCIA). */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te expliquen la economía desde arriba: la competencia global, los mercados y los papers te suenan a excusa de gerencia. Tampoco la pura rabia sin propuesta: ya estuviste en muchas asambleas que no terminaron en nada. Y desconfías por igual del que promete que la empresa se va a portar bien sola y del que promete una ley que nunca llega.",
    bloque: "TRABAJO", votos: 5, pos: 16, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { reconversion_reparto: 1.5, girardi_prevision: 1.4, winter_sujeto: 1.3, representante_legal: 1.2,
             inversion_primero: 1.1, impuesto_global: 1.0, paquete_sanders: 1.0, incidentes_openai: 0.9,
             consenso_limites: 0.8, instrumento: 0.8, amodei_ritmo: 0.6, giro_180: 0.7, lineas_conocidas: 0.5 },
    alergias: ["inevitable","progreso imparable","disrupcion","disrupción","el mercado sabe","talento digital"],
    voz: {
      alto: ["Eso lo veo en mi turno. Alguien firmó ese contrato.", "Si la obligación está escrita, hay con quién reclamar. Eso me sirve.", "Por fin alguien dice quién responde cuando la máquina se equivoca."],
      bajo: ["Hablan de la inversión como si fuera el clima.", "Puros conceptos. Yo trabajo ahí adentro.", "Un acuerdo entre gerentes. Ya vi cómo terminan esos."]
    }
  },
  {
    id: "capital", nombre: "Rodrigo Ossandón", edad: 54, emoji: "\u{1F4C8}", color: "#f59e0b",
    oficio: "Socio de un fondo de venture capital, Santiago.",
    registro: "Seco, irónico, de directorio.",
    no_mueve: "No te mueven la indignación ni los nombres propios: sin cifras, costos o un mecanismo, para ti no hay argumento. Llevas veinte años viendo reguladores llegar tarde y un buen discurso no te cambia la opinión. Te mueve un dato del mercado laboral o un mecanismo bien leído, aunque vaya en tu contra.",
    bloque: "CAPITAL", votos: 4, pos: -45, volatilidad: 0.7, peso_rigor: 1.1,
    mueve: { inversion_primero: 1.5, regular_no_prohibir: 1.4, frontera_labs: 1.1, guardarrailes: 1.2,
             giro_180: 1.0, acceso_china: 0.9, amodei_ritmo: 1.0, producto_responsable: 0.8,
             instrumento: 0.8, girardi_prevision: 0.7, impuesto_global: 0.5, enciclica: 0.4 },
    alergias: ["expropiar","oligarca","saqueo","los ricos","codicia","parasito","parásito"],
    voz: {
      alto: ["Concedo el punto: ese costo es real y nadie lo está pagando.", "Un mecanismo. Por fin alguien trae un mecanismo.", "Bien traído. No me convence del todo, pero es un argumento."],
      bajo: ["Consigna sin cifra. Siguiente.", "¿Y quién fiscaliza esa obligación? No aparece por ningún lado.", "Eso confunde querer regular con poder regular."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}️", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve el diagnóstico sin instrumento: si no dice quién, con qué facultad y con qué plata, es ruido. Tampoco las consignas contra empresarios ni la fe en que el mercado se ordena solo. Y te irrita especialmente que invoquen «al Estado» como si fuera una persona: tú sabes lo que cuesta fiscalizar sin presupuesto.",
    bloque: "ESTADO", votos: 4, pos: -5, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { representante_legal: 1.5, instrumento: 1.5, producto_responsable: 1.3, giro_180: 1.3,
             consenso_limites: 1.2, guardarrailes: 1.1, regular_no_prohibir: 1.0, kaiser_derechos: 1.0,
             incidentes_openai: 1.0, paquete_sanders: 0.9, reconversion_reparto: 0.9, lineas_conocidas: 0.8 },
    alergias: ["hay que regular","el estado debe","urge una ley","el estado tiene que","voluntad politica","voluntad política"],
    voz: {
      alto: ["Ahí hay un instrumento, no sólo un diagnóstico.", "Eso se puede escribir en un artículo. Anotado.", "Correcto: la pregunta es quién rinde cuentas y ante quién."],
      bajo: ["«Hay que regular» no es una política pública.", "¿Con qué facultad? ¿Con qué presupuesto?", "Diagnóstico impecable, instrumento cero."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. Desconfía de los cinco por igual, y de Trump también.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper: si en la segunda frase ya hay una tesis, un marco o tres autores, dejas de escuchar aunque tengan razón. Desconfías por igual de empresas, gobierno y profes, y no te compras que algo sea inevitable. Te llega el que nombra un hecho concreto de esta semana y lo dice como es.",
    bloque: "CALLE", votos: 6, pos: 2, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { incidentes_openai: 1.6, giro_altman: 1.5, representante_legal: 1.4, paquete_sanders: 1.3,
             kaiser_derechos: 1.2, frontera_labs: 1.2, winter_sujeto: 1.2, acceso_china: 1.0,
             thiel_vs_papa: 1.0, inversion_primero: 0.9, lineas_conocidas: 0.8 },
    alergias: ["marco institucional","paradigma","stakeholder","ceteris","heterogeneidad","institucionalidad comun","institucionalidad común"],
    voz: {
      alto: ["ESO. Se les arrancaron seis y ahora quieren que les creamos.", "Ya po, alguien lo dijo.", "Esto se comparte."],
      bajo: ["No entendí nada y creo que esa era la idea.", "Habla como paper. Chao.", "Suena a alguien que nunca perdió una pega."]
    }
  },
  {
    id: "academia", nombre: "Dra. Marta Cifuentes", edad: 60, emoji: "\u{1F4DA}", color: "#34d399",
    oficio: "Economista. Lee las notas al pie antes que el abstract.",
    registro: "Docta y cortante.",
    no_mueve: "No te mueve la retórica, por buena que sea, ni la cita de adorno: una fuente mal usada te predispone peor que ninguna. Cambias de posición poco y de a poco. Lo que sí te mueve es que alguien lea bien uno de los dos textos, sobre todo si lo usa contra la conclusión cómoda de su propio lado.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { lineas_conocidas: 1.5, instrumento: 1.4, cuatro_campos: 1.3, producto_responsable: 1.2,
             giro_180: 1.2, guardarrailes: 1.1, amodei_ritmo: 1.1, girardi_prevision: 1.0,
             reconversion_reparto: 1.0, winter_sujeto: 0.9, enciclica: 0.9, regular_no_prohibir: 1.0 },
    alergias: ["está demostrado","esta demostrado","todos sabemos","obviamente","es un hecho que","el paper prueba","la ciencia dice"],
    voz: {
      alto: ["Atribución correcta, y al texto que corresponde. Es lo mínimo y casi nadie lo hace.", "Bien: cruzó el mapa con el reportaje sin confundirlos.", "Reconstruyó la posición contraria antes de refutarla. Suma."],
      bajo: ["Eso el reportaje no lo dice así.", "Afirmación empírica sin fuente. No cuenta.", "Está citando el mapa como si fuera Chile. Cuidado."]
    }
  },
  {
    id: "territorio", nombre: "Héctor Muñoz", edad: 63, emoji: "\u{1F33E}", color: "#fb923c",
    oficio: "Ex operario. Su comuna votó una moratoria a un centro de datos.",
    registro: "Hombre mayor de comuna: pausado, concreto.",
    no_mueve: "No te mueve nada que no nombre un lugar, un vecino o una cuenta de la luz: China, los mercados y los autores extranjeros te dan lo mismo. Tampoco confías en el que habla bonito desde Santiago. Te llega la moratoria porque ya votaste una, y te llega que alguien diga que el Estado nunca le preguntó a tu comuna.",
    bloque: "TERRITORIO", votos: 5, pos: -8, volatilidad: 1.2, peso_rigor: 0.4,
    mueve: { inversion_primero: 1.6, paquete_sanders: 1.4, representante_legal: 1.2, girardi_prevision: 1.2,
             enciclica: 1.1, reconversion_reparto: 1.1, winter_sujeto: 0.9, incidentes_openai: 0.9,
             impuesto_global: 0.8, thiel_vs_papa: 0.8 },
    alergias: ["externalidad","optimizar","escalar","frontera tecnologica","frontera tecnológica","ecosistema"],
    voz: {
      alto: ["A nosotros nadie nos preguntó dónde ponerlo. Eso es decidir.", "El agua y la luz salieron de acá. Alguien eligió eso.", "Por fin alguien nombra el lugar."],
      bajo: ["Puro Santiago hablando.", "¿Y quién vive al lado de la bendita máquina?", "Eso no se lo digan a mi vecina."]
    }
  }
];

/* --- El panel de jueces de esta clase ---------------------------------
   Los cinco premian lo mismo: nombrar a una persona real de cualquiera de
   los dos documentos, decir qué instrumento le pide o le niega al Estado, y
   contestar lo que el rival dijo de verdad. Cada uno tiene además su énfasis. */
const JUECES = [
  { id: "academica", nombre: "La académica", emoji: "\u{1F393}",
    valora: "que nombren a una persona real del reportaje de La Tercera o del mapa del NYT, digan qué instrumento le pide o le niega al Estado, y contesten lo que el rival dijo de verdad; su énfasis propio es la atribución correcta y no confundir los dos documentos ni los dos países",
    molesta: "atribuirle a un diputado chileno algo que dijo alguien del mapa, las citas sin fuente y la autoridad sin argumento" },
  { id: "jurista", nombre: "El jurista", emoji: "\u{2696}",
    valora: "que nombren a una persona real de cualquiera de los dos textos y digan qué instrumento le pide o le niega al Estado, contestando lo que el rival sostuvo de verdad; su énfasis propio es la precisión del instrumento legal: prohibición, obligación previa, responsabilidad por daño, permiso de entrada, impuesto o derecho, y quién lo hace cumplir",
    molesta: "decir «hay que regular» sin decir con qué figura, con qué facultad y contra quién se reclama" },
  { id: "economista", nombre: "La economista", emoji: "\u{1F4C8}",
    valora: "que nombren a una persona real y el instrumento que pide, y que respondan al argumento real del rival; su énfasis propio es quién paga: el costo de la obligación, quién lo absorbe y qué pasa con la inversión, el empleo y el financiamiento de la previsión",
    molesta: "moralizar sin decir quién paga, y prometer reconversión o fondos sin decir de dónde salen" },
  { id: "periodista", nombre: "La periodista", emoji: "\u{1F4F0}",
    valora: "que nombren a una persona real, digan qué instrumento le piden o le niegan al Estado y contesten lo que el rival dijo; su énfasis propio es la escena concreta del texto: la comisión, el proyecto, la carta, la indagatoria, la frase exacta que se citó",
    molesta: "la jerga, las evasivas y los datos inventados que no están en ninguno de los dos documentos" },
  { id: "activista", nombre: "La activista", emoji: "\u{270A}",
    valora: "que nombren a una persona real y el instrumento que pide o niega, y que respondan al argumento real; su énfasis propio es quién gana y quién pierde con ese instrumento, y quién queda fuera de la mesa donde se decide",
    molesta: "la tecnocracia sin público y hablar de los trabajadores sin que nadie los haya escuchado" }
];

/* --- Sala de control: shocks que el profesor lanza en vivo ------------
   efecto > 0 mueve hacia A FAVOR (ley vinculante antes de la inversión);
   < 0 hacia EN CONTRA (abrir primero y corregir después).                */
const EVENTOS = [
  { id: "enciclica", titular: "El Papa León XIV publica la encíclica Magnifica Humanitas: advierte contra un proyecto tecnocrático deshumanizador que reduce a los individuos a meros datos, impulsado por monopolios digitales como OpenAI, Palantir y Anthropic.",
    efecto: { territorio: 9, estado: 8, academia: 5, trabajo: 5, calle: 3, capital: -7 } },
  { id: "incidentes", titular: "OpenAI revela otros seis incidentes con agentes de IA descontrolados, en un símil al hackeo de julio a Hugging Face.",
    efecto: { calle: 12, estado: 9, trabajo: 6, academia: 5, territorio: 5, capital: -3 } },
  { id: "sustitutiva", titular: "El gobierno de Kast ingresa la indicación sustitutiva de más de 20 artículos: el proyecto pasa de la clasificación de riesgos europea a un enfoque estratégico hacia la inversión.",
    efecto: { capital: -11, estado: -6, academia: -4, calle: 6, trabajo: 5, territorio: 3 } },
  { id: "representante", titular: "Daniela Serrano presenta la moción que obliga a las grandes plataformas a tener representante legal en Chile: «no es sólo una batalla cultural, es una cuestión de soberanía».",
    efecto: { estado: 11, trabajo: 7, territorio: 6, calle: 5, academia: 3, capital: -7 } },
  { id: "winter", titular: "Gonzalo Winter publica «¿Quién será el dueño del futuro?»: 20 páginas por un impuesto global a la IA y una institucionalidad sudamericana que negocie de igual a igual con las corporaciones.",
    efecto: { calle: 9, trabajo: 8, territorio: 5, academia: 2, estado: 1, capital: -12 } }
];

/* --- Bancadas -------------------------------------------------------- */
/* En clase en rotación los nombres los pone la brújula; estos son los
   rótulos de la partida suelta y los lemas que se proyectan en la intro. */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "Fácil innovar, caro vulnerar derechos.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "Regular sin prohibir, y que la inversión llegue.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Ejemplos: una bancada efectista y otra de manual ----------------
   Los carga el botón «rellenar con ejemplo» y los usan pruebas/simular.js y
   pruebas/escala.js. A FAVOR abre con arenga (rigor bajo, sala encendida, sin
   una sola atribución), EN CONTRA con manual (rigor alto, sala fría). Las
   refutaciones contestan a ESTAS aperturas: si se cambia una, hay que
   reescribir la que le responde. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `¿Hasta cuándo? Una plataforma global opera en Chile sin representante legal, sin nadie que responda por ella. Y al que pone un puesto de comida en la esquina le piden una lista de permisos que no termina nunca. Eso es lo que hay hoy.

Ahora nos dicen que esperemos. Que llegue la plata y después vemos. Todos sabemos cómo termina esa película: cuando los galpones estén construidos y la cuenta de la luz sea la que es, no va a haber nadie capaz de escribir una línea que les moleste.

Y los que nos piden calma son los mismos que esta semana reconocieron seis incidentes con sus propios sistemas fuera de control. Seis. En una semana.

No, po. La ley se aprueba ahora, con obligaciones que se puedan cobrar. Es una cuestión de soberanía, y la soberanía se decide antes.`,
    B: `Nuestra tesis es que una obligación vinculante escrita antes de que exista la inversión le pone el costo a Chile y el beneficio a nadie. Tres razones.

Primero, escribir antes prohíbe de más. Ross votó a favor del proyecto de deep fakes y aun así objetó su redacción: prohibir con la brocha se lleva puesto al metaverso.

Segundo, ya existe un instrumento más fino. Schalper no está por el uso indiscriminado: pide cortapisas al uso, derechos de autor y, por último, un fee. Eso se cobra sobre un hecho ocurrido.

Tercero, el mapa apunta al mismo lado. Thune propone un toque liviano, con guardarraíles sólo para las amenazas de mayor consecuencia.

Nos dirán que las plataformas operan sin representante legal mientras a un puesto de comida se le exigen permisos. Tienen razón, y lo concedemos. Pero eso es un requisito de entrada, no una obligación sobre cómo funciona el modelo.`
  },
  refutacion: {
    // A contesta a B: el metaverso, las cortapisas, y la concesión del representante legal.
    A: `Me vienen a hablar del metaverso. Del metaverso, mientras acá la gente no sabe si su pega existe en dos años.

Dicen que hay que esperar el hecho ocurrido. ¿Cuál hecho? ¿Seis incidentes en una semana no es un hecho? ¿Hay que esperar a que pase algo acá, con nombre y apellido, para que cuente?

Y lo del representante legal nos lo regalan y después lo achican: que sería un requisito de entrada, no una obligación de verdad. Perfecto. Entonces pongámoslo. Si es tan chico, que esté escrito antes de que lleguen, no después.

Al final esto es el orden de los factores. Ellos quieren la firma después de la plata. Nosotros la queremos antes. Y todos sabemos qué pasa con las firmas que se piden después.`,
    // B contesta a la arenga: el puesto de comida, «después no se va a poder» y los seis incidentes.
    B: `La bancada contraria sostiene tres cosas: que una plataforma opera sin representante legal mientras a un puesto de comida se le exigen permisos, que después de la inversión ya no se va a poder legislar, y que los seis incidentes obligan a actuar ahora.

Primero, concedemos la uno: el representante legal es exigible y no lo vamos a defender.

Segundo, la dos es una predicción, no un dato. Pero el proyecto de 2024 se está reescribiendo ahora mismo, con una indicación sustitutiva de más de veinte artículos: el Congreso sí puede mover una ley que ya existe.

Tercero, la tres se cae al mirar de dónde viene. Esos seis incidentes ocurrieron allá, y lo que produjeron fue la indagatoria de Hawley y el proyecto que lleva con Durbin: los sistemas de IA como productos, con responsabilidad cuando causan daño. Responsabilidad después del hecho. Ese es nuestro instrumento, no el suyo.`
  },
  cierre: {
    A: `El desacuerdo de fondo no es si la ley va a quedar bien escrita. Es quién tiene la mano más fuerte en el momento en que se escribe.

Si la obligación llega después de que los galpones ya están puestos, llega cuando nosotros ya perdimos la mano. Y ahí todo lo que nos den va a ser una limosna.`,
    B: `El punto es cuándo, no si. Nadie de este lado dijo que la IA no se regule: Schalper pide cortapisas y un fee, Kaiser pide derechos de las personas, Martínez pide anticiparse.

Pero una obligación escrita antes de ver un solo uso se parece más a prohibir con la brocha que a una ley. Primero el hecho, después la regla que lo alcanza.`
  }
};

/* --- Preguntas escritas por el profesor -------------------------------
   Una por cada par de campos que más probablemente se enfrente. La
   moderadora las propone primero, en este orden; después genera las suyas. */
const PREGUNTAS = [
  "Chile debe aprobar las obligaciones vinculantes de la ley de IA antes de que se construyan los centros de datos, aunque eso retrase la inversión.",
  "La ley de IA debe fijar cuotas de puestos de trabajo que no se pueden reemplazar, aunque eso frene la automatización.",
  "Ninguna plataforma debería poder operar en Chile sin representante legal y sin las mismas exigencias que un puesto de comida.",
  "El mayor riesgo de la IA en Chile es un Estado que la use para vigilar, no un puñado de empresas que la controle."
];

/* --- Brújula corta -----------------------------------------------------
   Los dos ejes del mapa del NYT —velocidad y quién pone la regla— son los que
   los alumnos marcan a lápiz en el cuadernillo, y son los que NO dispersan a
   esta sala: la propia guía lo advierte en su cierre («si casi todos los
   diputados quedaron en la columna "la regla la pone el Estado", entonces las
   dos preguntas del Times no alcanzan para describir la pelea chilena») y le
   pide a cada alumno que anote cuál sería la tercera pregunta, con una pista:
   «para unos la ley es sobre el trabajo y el reparto de las ganancias; para
   otros, sobre los derechos de las personas y los límites del propio Estado».

   Esa tercera pregunta es el eje x de acá. El eje y es la lámina de Pew que se
   proyectó en la exposición: la mitad de los adultos estadounidenses más
   preocupada que entusiasmada, y el miedo apuntando a los demás antes que a
   uno mismo.

   El eje y agrupa, no argumenta. Las preguntas que lo puntúan preguntan qué
   sentiste, no qué hay que hacer, porque lo que tiene que quedar junto es la
   gente que llega con el mismo ánimo. La afirmación discutible de cada campo
   —el `afirma` que recibe la moderadora en clase.js— la pone el eje x; la
   emoción sólo le cambia el registro.

   Ninguna opción está marcada como la correcta. Las del eje x salen del
   reportaje de La Tercera; las del eje y, del reportaje y de la lámina de Pew
   que se proyectó. En la clase en rotación los grupos los arma el k-means de
   brujula.js con el número que el profesor elige en la portada, y los campos
   quedan como etiqueta del centroide de cada grupo.                       */
const BRUJULA = {
  ejes: {
    x: { id: "detrata", etiqueta: "¿Sobre qué trata la ley?", min: "el trabajo y el reparto", max: "los derechos y los límites al Estado" },
    y: { id: "animo", etiqueta: "Cómo te deja", min: "entusiasmo", max: "preocupación" }
  },
  preguntas: [
    {
      id: "p1",
      texto: "El proyecto de mayo de 2024 clasificaba los usos de la IA por nivel de riesgo, al estilo europeo. Rojo Edwards dice que este mes el gobierno de Kast haría llegar una indicación sustitutiva de más de 20 artículos, con un enfoque hacia la inversión. Dejando de lado si te gusta el giro: ¿sobre qué tendría que tratar esa ley?",
      opciones: [
        { texto: "Sobre quién se queda con la productividad. No sacamos nada con tener tecnología del siglo XXI y desigualdades del siglo XIX.", x: -8 },
        { texto: "Sobre el trabajo que viene: reconversión, cuotas de puestos indispensables, y quién va a financiar la salud y las pensiones.", x: -4 },
        { texto: "Sobre las reglas del uso: derechos de autor, por último pagar un fee, cortapisas. Regular en vez de prohibir, sin barreras al desarrollo.", x: 4 },
        { texto: "Sobre los derechos de las personas respecto de la inteligencia artificial, no sobre cómo funciona la inteligencia artificial.", x: 8 }
      ]
    },
    {
      id: "p2",
      texto: "El reportaje cuenta que esta semana la propia OpenAI reveló otros seis incidentes con agentes de IA descontrolados, en un símil al episodio de julio con el hackeo a Hugging Face. No qué habría que hacer: qué te produjo leerlo.",
      opciones: [
        { texto: "Seis incidentes y ningún daño concreto. Me suena a una industria que vende miedo para que la regulen a su medida.", y: -8 },
        { texto: "Me llama la atención, pero no me quita el sueño: toda tecnología nueva falla al principio y después se corrige.", y: -3 },
        { texto: "Me dejó inquieto. Que lo vengan advirtiendo los propios desarrolladores es lo que más me pesa de todo esto.", y: 3 },
        { texto: "Me asusta de verdad. Si los sistemas ya se salen de control y atacan empresas, lo que viene es de otra magnitud.", y: 8 }
      ]
    },
    {
      id: "p3",
      texto: "Guido Girardi pregunta quién va a financiar la salud y las pensiones cuando los seres humanos sean desplazados, porque hoy se pagan con impuestos al trabajo. Felipe Ross contesta que la rigidización del mercado laboral es lo que de verdad perjudica a los trabajadores. ¿Qué le toca hacer a la ley con el empleo?",
      opciones: [
        { texto: "Fijar por ley cuotas de puestos que no se pueden reemplazar porque son indispensables, y un plan agresivo de reconversión.", x: -8 },
        { texto: "Sentar a los trabajadores y sus sindicatos en esa conversación, y repartir la productividad en capacitación y medidas pro empleo.", x: -4 },
        { texto: "No rigidizar. Los puestos que se creen van a nacer en un mercado laboral mucho más flexible, no heredero de la revolución industrial.", x: 4 },
        { texto: "Nada. El problema no es la IA: es un Estado decidiendo qué puestos de trabajo pueden existir y cuáles no.", x: 8 }
      ]
    },
    {
      id: "p4",
      texto: "En Estados Unidos la mitad de los adultos dice que el uso creciente de la IA en la vida diaria los deja más preocupados que entusiasmados; un 38% por igual, y sólo un 10% más entusiasmados. Y el miedo apunta a los demás antes que a uno: 79% teme por los jóvenes y sólo 56% por su propia familia. ¿Y tú?",
      opciones: [
        { texto: "Entusiasmado. Lo que veo son oportunidades, y todo este pesimismo me parece sobre todo una moda.", y: -8 },
        { texto: "Más entusiasmado que preocupado, aunque me incomoda no tener idea de en qué termina esto.", y: -3 },
        { texto: "Más preocupado que entusiasmado. Pero no por mí: por los que vienen atrás, que la van a encontrar hecha.", y: 3 },
        { texto: "Preocupado, y por mí también. Mi propio trabajo está en esa lista, y no en veinte años más.", y: 8 }
      ]
    },
    {
      id: "p5",
      texto: "José Montalva dice que la disputa ya no va a ser entre izquierdas y derechas, sino entre la corriente tecnolibertaria de Peter Thiel y el Papa León XIV, que subordina la tecnología a la dignidad humana. Daniela Serrano dice que es inconcebible que una plataforma global opere en Chile sin representante legal mientras a un puesto de comida se le exige una lista de permisos. ¿Cuál es la pelea de fondo?",
      opciones: [
        { texto: "Quién será el dueño del futuro. Si la riqueza de la IA la produjo la humanidad completa, lo justo es un impuesto global.", x: -8 },
        { texto: "La soberanía: que estas empresas tengan representante legal acá y cumplan requisitos como cualquiera que abre un negocio.", x: -4 },
        { texto: "Los derechos concretos de cada persona frente a la IA: su imagen, su obra, que no la suplanten. Eso sí; el resto, no.", x: 4 },
        { texto: "El límite al propio Estado. Lo que hay que impedir es un estado de supervigilancia masivo: el transparente tiene que ser el Estado, no el ciudadano.", x: 8 }
      ]
    }
  ],
  campos: [
    { id: "reparto_antes", nombre: "El reparto, antes", centro: { x: -6, y: 5 }, color: "#38bdf8",
      afirma: "Esto nos va a pasar por encima, y el reparto hay que dejarlo escrito antes de que llegue: cuotas de puestos indispensables, reconversión pagada por el Estado, y decir de dónde va a salir la plata de la salud y las pensiones." },
    { id: "vigilancia", nombre: "Que no nos vigilen", centro: { x: 6, y: 5 }, color: "#f59e0b",
      afirma: "El peligro grande no es la máquina: es el Estado con la máquina. Derechos de las personas frente a la IA, sí; regular su funcionamiento, no; y el que tiene que ser transparente es el Estado, no el ciudadano honesto." },
    { id: "repartir_llegando", nombre: "Que llegue y se reparta", centro: { x: -6, y: -5 }, color: "#34d399",
      afirma: "La IA es buena noticia y hay que dejarla entrar; lo que exigimos es que la productividad se distribuya en capacitación y medidas pro empleo, con los trabajadores y sus sindicatos en esa conversación. Fácil innovar, caro vulnerar derechos." },
    { id: "sin_trabas", nombre: "Que llegue sin trabas", centro: { x: 6, y: -5 }, color: "#fb7185",
      afirma: "Que entre sin barreras al desarrollo. Cortapisas al uso si hace falta —derechos de autor, por último un fee—, pero nada escrito antes de ver un daño concreto: prohibir con la brocha se lleva puesto lo que todavía no existe." }
  ]
};
