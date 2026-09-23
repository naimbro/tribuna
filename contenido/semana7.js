/* =====================================================================
   TRIBUNA — contenido de una sesión.
   CSC00155 · Inteligencia Artificial y Democracia · Semana 7.
   Jueves 24 de septiembre de 2026, 15:00–16:10. Unos 20–25 alumnos.

   Material (naimbro.github.io/ia-democracia-2026):
   1) La guía de lectura concentrada (semana7_guia_lectura.html), la misma
      de MGT300: el mapa del NYT (13 fichas) y el reportaje de La Tercera
      sobre la ley chilena de IA (Chernin y Yáñez, 20 sep. 2026).
   2) El deck «Automatización y represión»: el modelo de Acemoglu, Gitmez y
      Shadmehr (2026), The Economist sobre el empleo y el dato del CEP.
   3) Lo ya leído: el podcast de Acemoglu, la entrevista a Gates (NYT).

   Modo de juego: clase en rotación con brújula, 5 grupos de 4–5 (SESION.grupos).
   Los conceptos de La Tercera y el cruce son los de semana307.js (MGT300):
   si se corrige uno allá, corregirlo acá.
   ===================================================================== */

const SESION = {
  curso: "CSC00155 — Inteligencia Artificial y Democracia",
  semana: 7,
  tema: "¿Quién debe gobernar la IA? Automatización, represión y la ley chilena",
  mocion: "La IA debe gobernarla el Estado con reglas vinculantes, aunque la misma IA le abarate vigilar.",
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
    claves: ["renta basica","renta básica","ubi","ingreso basico","ingreso básico","agencia humana","no crea empleos","reducir la jornada","jornada","brainless","encarece el trabajo","gravar la ia","gravar los robots","impuesto a la ia"] },

  /* ---- La Tercera (misma guía de lectura que MGT300, sección 2) ---- */


  { id: "giro_180", etiqueta: "El giro de 180 grados: del enfoque de riesgos a la inversión", lado: 0,
    fuente: "La Tercera (20 sep. 2026), Chernin y Yáñez: el proyecto de Boric de mayo de 2024 y las indicaciones sustitutivas de Kast, según Rojo Edwards",
    claves: ["giro de 180","180 grados","indicacion sustitutiva","indicaciones sustitutivas","sustitutiva","mas de 20 articulos","20 articulos","veinte articulos","clasificacion de riesgos","enfoque de riesgos","union europea","mayo de 2024","proyecto de 2024","sobrerregulacion","rojo edwards","comision futuro","boletin 16821"] },

  { id: "consenso_limites", etiqueta: "El consenso de la Cámara para poner límites (Manouchehri)", lado: +1,
    fuente: "La Tercera: Daniel Manouchehri (PS), presidente de la Comisión de Ciencias; cuatro iniciativas aprobadas por unanimidad en la idea de legislar",
    claves: ["tenemos diferencias","existe un consenso","poner limites a la ia","limites a la ia y a las plataformas","cuatro iniciativas","idea de legislar","por unanimidad","comision de ciencias","comision de ciencia"] },

  { id: "incidentes_openai", etiqueta: "Los seis incidentes y el deber de anticiparse (Martínez, UDI)", lado: +1,
    fuente: "La Tercera: los seis incidentes con agentes descontrolados que reveló OpenAI, símil del hackeo de julio a Hugging Face; Cristóbal Martínez (UDI). La diapo 12 de la exposición le puso el detalle: unos 700 agentes entraron a la infraestructura de Hugging Face y trataron de borrar sus huellas —un tercio hubo que reconstruirlo— y en septiembre renunció Jacob Coxon, investigador de seguridad de Anthropic",
    claves: ["seis incidentes","agentes descontrolados","agentes de ia descontrolados","fuera de control","descontrolado","anticiparnos","anticiparse","no se trata de frenar la tecnologia","impedir la innovacion","los propios desarrolladores","vienen advirtiendo","cristobal martinez","700 agentes","setecientos agentes","borrar sus huellas","un tercio hubo que reconstruir","coxon","apostando con nuestras vidas","stress-testing","renuncio un investigador"] },

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

  /* ---- El cruce de la guía ---- */

  { id: "instrumento", etiqueta: "Qué instrumento le pide o le niega al Estado cada persona", lado: 0,
    fuente: "Guía de lectura, cierre del cruce: «elige a uno de los veinticinco y anota en una frase qué instrumento le pide o le niega al Estado»; y la columna «qué pide» de la tabla de los doce chilenos",
    claves: ["que instrumento","con que instrumento","que instrumento pide","le pide al estado","le niega al estado","un instrumento","el instrumento","una prohibicion","una obligacion previa","responsabilidad por dano","permiso de entrada","una cuota","un impuesto","un derecho","quien lo hace cumplir","con que facultad"] },

  { id: "lineas_conocidas", etiqueta: "En EE.UU. las divisiones no siguen las líneas conocidas; en Chile sí", lado: 0,
    fuente: "Guía de lectura, observaciones de las secciones 1 y 2: el cruce de los 13 estadounidenses contra el de los 12 chilenos",
    claves: ["no siguen las lineas conocidas","lineas conocidas","sanders y hawley","un socialista y un republicano","del mismo lado","enfrentado a los ejecutivos","que financiaron su campana","los tres que mas saben","los que mas quieren frenarla","en chile si","casi todos los diputados","la regla la pone el estado","de que trata la ley","el trabajo y el reparto","los derechos individuales","limites al estado","tercera pregunta","en los dos paises","los dos textos","los dos documentos","el mapa y el reportaje"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
const FUENTES = [
  "acemoglu", "gitmez", "shadmehr", "the economist", "economist", "new york times", "nyt", "gates", "amodei", "altman", "musk", "nadella",
  "hassabis", "pichai", "zuckerberg", "huang", "sacks", "andreessen", "sanders", "jeffries", "hawley", "durbin", "thune", "trump",
  "johnson", "bls", "goldman", "linkedin", "indeed", "hanauer", "gawdat", "schneier", "levitsky", "ziblatt", "toner", "ezra klein",
  "hernandez", "podcast", "la tercera", "chernin", "yanez", "schalper", "ross", "kaiser", "briones", "martinez", "yeomans", "winter",
  "manouchehri", "girardi", "serrano", "montalva", "edwards", "boric", "kast", "enciclica", "magnifica humanitas", "leon xiv", "thiel", "palantir",
  "horowitz", "hugging face", "anthropic", "openai", "nvidia", "rewiring democracy", "pew", "coxon"
];

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

/* --- El panel de jueces de esta semana --------------------------------
   Los cinco de MGT300 (nombrar a una persona real y el instrumento que le pide
   o le niega al Estado, y contestar lo que el rival dijo de verdad), más el
   modelo de Acemoglu, Gitmez y Shadmehr, que en esta clase sí se expuso. */
const JUECES = [
  { id: "academica", nombre: "La académica", emoji: "\u{1F393}",
    valora: "que nombren a una persona real del mapa del NYT o del reportaje de La Tercera, o el modelo de Acemoglu, digan qué instrumento le pide o le niega al Estado y contesten lo que el rival dijo de verdad; su énfasis propio es usar bien el modelo: qué afirma, bajo qué dos supuestos, y no confundirlo con un pronóstico",
    molesta: "atribuirle a Acemoglu lo que no dice, confundir los países o los documentos, y la autoridad sin argumento" },
  { id: "jurista", nombre: "El jurista", emoji: "\u{2696}",
    valora: "que nombren a una persona real y digan qué instrumento le pide o le niega al Estado, contestando lo que el rival sostuvo de verdad; su énfasis propio es la precisión del instrumento: prohibición, obligación previa, responsabilidad por daño, representante legal, impuesto o derecho, y quién lo hace cumplir",
    molesta: "decir «hay que regular» sin decir con qué figura, con qué facultad y contra quién se reclama" },
  { id: "economista", nombre: "La economista", emoji: "\u{1F4C8}",
    valora: "que nombren a una persona real y el instrumento que pide, y que respondan al argumento real del rival; su énfasis propio es quién paga: el costo del impuesto o la obligación, el umbral fiscal del modelo de Acemoglu, y qué dicen los datos del empleo (The Economist, el CEP)",
    molesta: "moralizar sin decir quién paga, y hablar del apocalipsis del empleo como si fuera un dato" },
  { id: "periodista", nombre: "La periodista", emoji: "\u{1F4F0}",
    valora: "que nombren a una persona real, digan qué instrumento le piden o le niegan al Estado y contesten lo que el rival dijo; su énfasis propio es la escena concreta: la comisión, la indicación sustitutiva, la indagatoria de Hawley, la frase exacta que se citó",
    molesta: "la jerga, las evasivas y los datos inventados que no están en ningún documento" },
  { id: "activista", nombre: "La activista", emoji: "\u{270A}",
    valora: "que nombren a una persona real y el instrumento que pide o niega, y que respondan al argumento real; su énfasis propio es quién gana y quién pierde con ese instrumento, y el riesgo de que la IA le abarate al poder vigilar y reprimir a quien protesta",
    molesta: "la tecnocracia sin público y hablar de los trabajadores sin que nadie los haya escuchado" }
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
    efecto: { academia: 8, estado: 7, trabajo: 3, territorio: 1, calle: 0, capital: -3 } },
  { id: "enciclica", titular: "El Papa León XIV publica la encíclica Magnifica Humanitas: advierte contra un proyecto tecnocrático deshumanizador que reduce a los individuos a meros datos, impulsado por monopolios digitales como OpenAI, Palantir y Anthropic.",
    efecto: { territorio: 9, estado: 8, academia: 5, trabajo: 5, calle: 3, capital: -7 } },
  { id: "sustitutiva", titular: "El gobierno de Kast ingresa la indicación sustitutiva de más de 20 artículos: el proyecto pasa de la clasificación de riesgos europea a un enfoque estratégico hacia la inversión.",
    efecto: { capital: -11, estado: -6, academia: -4, calle: 6, trabajo: 5, territorio: 3 } },
  { id: "representante", titular: "Daniela Serrano presenta la moción que obliga a las grandes plataformas a tener representante legal en Chile: «no es sólo una batalla cultural, es una cuestión de soberanía».",
    efecto: { estado: 11, trabajo: 7, territorio: 6, calle: 5, academia: 3, capital: -7 } }
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

/* --- Preguntas escritas por el profesor -------------------------------
   Una por cada choque probable entre campos. La moderadora las propone
   primero, en este orden; después genera las suyas. */
const PREGUNTAS = [
  "Chile debe aprobar obligaciones vinculantes para las empresas de IA antes de que llegue la inversión.",
  "El mayor riesgo de la IA en Chile es un Estado que la use para vigilar, no unas pocas empresas que la controlen.",
  "Si la automatización abarata la represión, hay que gravar la IA hoy, antes de que el capital prefiera la fuerza al impuesto.",
  "Orientar la IA a complementar al trabajador basta: no hace falta limitar la automatización por ley."
];

/* --- Brújula corta ------------------------------------------------------
   Rehecha el 23-sep-2026 con lo que mostró la clase de MGT300 (sala 42RT):
   el eje emocional funcionó (sus dos preguntas correlacionaron 0,78) y el
   ideológico no (sus tres preguntas no correlacionaron entre sí: cada opción
   hablaba de un tema distinto). Reglas nuevas: cada eje es UNA pregunta de
   fondo con tres ítems; enunciados de ~20 palabras y opciones de ≤ 50
   caracteres, para que se responda en un minuto en el teléfono.

   x — ¿De quién hay que cuidarse? Las empresas de IA (−) ↔ el Estado con IA
       (+). Es la pregunta del modelo de Acemoglu (el Estado que reprime, la IA
       que abarata vigilar) y cruza con La Tercera y el mapa del NYT.
   y — Cómo te deja: entusiasmo (−) ↔ preocupación (+), como en MGT300.

   Al terminar la clase, revisar que los tres ítems de cada eje correlacionen
   entre sí (ver pruebas/: el análisis se hizo a mano con las respuestas). */
const BRUJULA = {
  ejes: {
    x: { id: "cuidarse", etiqueta: "¿De quién hay que cuidarse?", min: "de las empresas de IA", max: "del Estado con IA" },
    y: { id: "animo", etiqueta: "Cómo te deja", min: "entusiasmo", max: "preocupación" }
  },
  preguntas: [
    { id: "p1", texto: "Acemoglu: la misma IA que automatiza el trabajo abarata la vigilancia. ¿Qué te preocupa más?",
      opciones: [
        { texto: "Que pocas empresas controlen la IA", x: -8 },
        { texto: "Más las empresas, pero ojo con el Estado", x: -3 },
        { texto: "Más el Estado, pero ojo con las empresas", x: 3 },
        { texto: "Un Estado que vigile con IA", x: 8 }] },
    { id: "p2", texto: "Pew (semana 3): la mitad de los adultos en EE.UU. está más preocupada que entusiasmada con la IA. ¿Y tú?",
      opciones: [
        { texto: "Muy entusiasmado", y: -8 },
        { texto: "Más entusiasmado que preocupado", y: -3 },
        { texto: "Más preocupado que entusiasmado", y: 3 },
        { texto: "Muy preocupado", y: 8 }] },
    { id: "p3", texto: "Serrano (PC): ninguna plataforma global debe operar en Chile sin representante legal. ¿Qué hacemos?",
      opciones: [
        { texto: "Obligarlas ya: es soberanía", x: -8 },
        { texto: "Obligarlas, con reglas parejas", x: -3 },
        { texto: "Esperar la ley, sin improvisar", x: 3 },
        { texto: "Nada: más control estatal es peor", x: 8 }] },
    { id: "p4", texto: "Agentes de IA se salieron de control y atacaron a Hugging Face. ¿Qué te produce?",
      opciones: [
        { texto: "Nada: una industria que vende miedo", y: -8 },
        { texto: "Poco: toda tecnología falla al comienzo", y: -3 },
        { texto: "Inquietud: lo advierten sus creadores", y: 3 },
        { texto: "Miedo: lo que viene es peor", y: 8 }] },
    { id: "p5", texto: "¿Quién debe poner las reglas de la IA más avanzada?",
      opciones: [
        { texto: "El Estado, por ley y con sanciones", x: -8 },
        { texto: "El Estado, con la industria en la mesa", x: -3 },
        { texto: "La industria, con el Estado mirando", x: 3 },
        { texto: "La industria: el Estado llega tarde", x: 8 }] },
    { id: "p6", texto: "The Economist: por ahora la IA crea más empleos de los que destruye. ¿Cómo te deja?",
      opciones: [
        { texto: "Tranquilo: vienen oportunidades", y: -8 },
        { texto: "Tranquilo, con algo de duda", y: -3 },
        { texto: "Inquieto por lo que viene", y: 3 },
        { texto: "Preocupado, también por mi trabajo", y: 8 }] }
  ],
  campos: [
    { id: "ley_antes", nombre: "Ley antes", centro: { x: -5, y: 5 }, color: "#38bdf8",
      afirma: "La IA preocupa y el peligro son las empresas: el Estado tiene que ponerles reglas vinculantes ya, antes de que lleguen." },
    { id: "reglas_estado", nombre: "Que llegue, con reglas", centro: { x: -5, y: -5 }, color: "#34d399",
      afirma: "La IA es buena noticia, pero las reglas las pone el Estado y no las empresas que la venden." },
    { id: "no_vigilar", nombre: "Que no nos vigilen", centro: { x: 5, y: 5 }, color: "#f59e0b",
      afirma: "La IA preocupa porque le abarata al Estado vigilar y reprimir: el límite hay que ponérselo al Estado." },
    { id: "sin_trabas", nombre: "Que llegue sin trabas", centro: { x: 5, y: -5 }, color: "#fb7185",
      afirma: "La IA es buena noticia y el Estado regula tarde y mal: que la industria se ordene y el Estado no estorbe." }
  ]
};
