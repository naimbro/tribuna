/* =====================================================================
   LA SALA — todo el contenido del juego, en un solo archivo.
   Simula la discusión en particular del boletín 16821-19 (ley marco de IA) en el Senado.
   Taller integrador de CSC00155, 16 y 19 de noviembre de 2026.

   REGLA DE ESTE ARCHIVO: ninguna cifra, cita o atribución sale de fuera del dossier del
   12-nov-2026, del articulado (el texto despachado por la Cámara, oficio N° 20.843 del
   13-oct-2025, que es el anexo de la guía impresa semana15_proyecto_ley_ia.pdf; y el Mensaje de
   mayo de 2024, solo donde se rotula como tal), del syllabus del curso o de contenido/semana307.js.
   Si falta un dato, se omite. Si el texto cambia en el Senado, se corrige aquí y en ninguna otra parte.
   Desde el 15-nov-2026 los artículos citados siguen la numeración de la Cámara (19 artículos).

   Las citas marcadas `textual: true` van entre comillas en pantalla; las demás son resumen.
   ===================================================================== */
const LA_SALA = {
  titulo: "La Sala",
  curso: "CSC00155 — Inteligencia Artificial y Democracia",      // como en contenido/sesiones.js: agrupa la sala en el panel del profesor
  boletin: "16821-19",
  proyecto: "Proyecto de ley que regula los sistemas de inteligencia artificial",
  // el rótulo que acompaña SIEMPRE al articulado en pantalla
  rotuloTexto: "Texto despachado por la Cámara (oficio 20.843, octubre de 2025)",
  avisoTexto: "Es el texto que aprobó en general la comisión del Senado: el mismo del anexo de la guía impresa.",

  /* ---------------- la cuenta del proyecto (apertura del lunes) ---------------- */
  cuenta: [
    "El Mensaje entró el 7 de mayo de 2024. Se fundió con la moción 15869-19.",
    "La Cámara lo aprobó en general el 4 de agosto de 2025 y en particular el 13 de octubre de 2025.",
    "En el Senado, la Comisión de Desafíos del Futuro lo aprobó en general el 26 de octubre de 2026, con sus cuatro presentes.",
    "Hoy está en discusión general en la Sala del Senado.",
    "El plazo para presentar indicaciones vence el 4 de diciembre de 2026."
  ],
  cuentaFuente: "Tramitación del boletín 16821-19; radio.uchile.cl, 5-nov-2026.",

  /* ---------------- el triángulo del poder ---------------- */
  vertices: [
    { id: "estado", nombre: "Estado", con: "el Estado" },
    { id: "empresas", nombre: "Empresas", con: "las empresas" },
    { id: "ciudadanos", nombre: "Ciudadanos", con: "los ciudadanos" }
  ],
  ideaCentral: "Cada artículo reparte poder entre el Estado, las empresas y los ciudadanos.",

  /* ---------------- las cuatro bancadas ---------------- */
  bancadas: [
    { n: 1, id: "habilitantes", nombre: "Habilitantes", color: "#e0a43a",
      posicion: "Principios e incentivos. Que la inversión llegue.", autora: 1, impugna: 4 },
    { n: 2, id: "garantistas", nombre: "Garantistas", color: "#3fb6a8",
      posicion: "Derechos, obligaciones previas y un fiscalizador fuerte.", autora: 3, impugna: 1 },
    { n: 3, id: "seguridad", nombre: "Orden y seguridad", color: "#6f9bf2",
      posicion: "El Estado necesita ver para proteger.", autora: 2, impugna: 3 },
    { n: 4, id: "soberanistas", nombre: "Soberanistas", color: "#b990f0",
      posicion: "Cómputo, datos y reglas propias. Desconfía de las grandes tecnológicas.", autora: 4, impugna: 2 }
  ],

  /* ---------------- los cuatro nudos ---------------- */
  nudos: [
    {
      n: 1, titulo: "¿Riesgos o habilitación?", articulos: "Arts. 6 a 12",
      pregunta: "¿Se reemplaza la clasificación por riesgo por principios, certificación voluntaria y sandboxes?",
      autora: 1, impugna: 2,
      vigente: {
        rotulo: "Artículo 6. Clasificación de los usos de sistemas de IA",
        texto: "Los usos de los sistemas de IA se clasifican, de acuerdo con su riesgo, en las siguientes categorías: 1. Usos de riesgo inaceptable […] Se prohíbe la distribución, introducción en el mercado o puesta en servicio de sistemas de IA destinados a tales usos. 2. Usos de alto riesgo […] 3. Uso de riesgo limitado […] 4. Usos sin riesgo evidente […]",
        simple: "Hoy hay cuatro niveles de riesgo. Lo inaceptable se prohíbe (art. 7). Lo de alto riesgo cumple reglas previas (art. 9).",
        mas: [
          "Art. 7: siete usos prohibidos, entre ellos la manipulación subliminal, la calificación social y la identificación biométrica en tiempo real en espacios públicos.",
          "Art. 9: los usos de alto riesgo deben tener gestión de riesgos, gobernanza de datos, documentación técnica, registros, supervisión humana, precisión y ciberseguridad.",
          "Art. 12: quien respeta la ley en un espacio controlado de pruebas queda exento de multas, pero responde por los daños a terceros."
        ]
      },
      partida: { tipo: "sustituir",
        texto: "Sustitúyese la clasificación por riesgo de los artículos 6 a 11 por principios, certificación voluntaria y espacios controlados de prueba (sandboxes)." },
      mueve: { hacia: "empresas", desde: "ciudadanos" },
      pelea: [
        { quien: "Rojo Edwards", cargo: "Presidente de la comisión", textual: true,
          cita: "tiene una mirada quizás que está solamente enfocada a lo que son los riesgos de la tecnología, pero antes de que las tecnologías se hayan desarrollado",
          fuente: "Comisión de Desafíos del Futuro, 26-oct-2026" },
        { quien: "Daniella Cicardini", cargo: "Senadora (PS)", textual: true,
          cita: "garantías tanto para las actividades productivas, para la inversión, para la innovación, como también para las personas y la ciudadanía",
          fuente: "Comisión de Desafíos del Futuro, 26-oct-2026" }
      ],
      actores: "La ministra Lincolao impulsa «un modelo menos prescriptivo, con certificaciones voluntarias y espacios de experimentación regulatoria». Edwards pide una ley «habilitante». Cicardini pide «un principio básico como es la protección de los derechos humanos».",
      actoresFuente: "radio.uchile.cl y cooperativa.cl, 4 y 5-nov-2026; sesión del 26-oct-2026",
      sugeridos: ["i7_frenar", "i7_instrumentos", "i7_finra", "i3_backlash"]
    },
    {
      n: 2, titulo: "La excepción de seguridad", articulos: "Arts. 7 n° 5, 2 a) y 15",
      pregunta: "¿La identificación biométrica remota en tiempo real pasa de prohibida a alto riesgo?",
      autora: 3, impugna: 4,
      vigente: {
        rotulo: "Artículo 7, número 5. Riesgo inaceptable",
        texto: "Identificación biométrica remota en tiempo real en espacios de acceso público: sistemas de IA utilizados para el análisis de imágenes de video en espacios de acceso público que emplean sistemas de identificación biométrica remota en tiempo real.",
        simple: "Hoy está prohibida sin excepciones. El Mensaje de 2024 exceptuaba a las policías; el texto de la Cámara ya no.",
        mas: [
          "Art. 2, letra a): la ley no se aplica a los sistemas de IA «desarrollados y utilizados con fines de defensa nacional». Una resolución reservada del Ministerio de Defensa los lista.",
          "Art. 15: quienes aplican la ley deben resguardar la confidencialidad de lo que obtienen de un sistema de IA para proteger, entre otras cosas, «el interés público y la seguridad nacional» y «la integridad de las causas penales»."
        ]
      },
      partida: { tipo: "sustituir",
        texto: "La identificación biométrica remota en tiempo real en espacios de acceso público deja de ser de riesgo inaceptable (artículo 7, número 5) y pasa a ser de alto riesgo (artículo 8), con las reglas del artículo 9." },
      mueve: { hacia: "estado", desde: "ciudadanos" },
      pelea: [
        { quien: "El Mensaje de 2024", cargo: "La excepción que la Cámara no mantuvo", textual: true,
          cita: "Esta prohibición no será aplicable, en caso de que el sistema de IA sea utilizado estrictamente por las autoridades y órganos encargados de la seguridad pública",
          fuente: "Texto del Mensaje (mayo de 2024), artículo 6, letra e)" },
        { quien: "Johannes Kaiser", cargo: "Líder del PNL", textual: false,
          cita: "Advierte de un «Estado de supervigilancia». Pide derechos de las personas, no regular el funcionamiento.",
          fuente: "La Tercera, 20-sep-2026" }
      ],
      actores: "El Mensaje de 2024 exceptuaba a las policías de la prohibición; el texto de la Cámara no. Kaiser advierte de un «Estado de supervigilancia». Celis pide «fiscalización humana del uso de la inteligencia artificial».",
      actoresFuente: "Texto del Mensaje y oficio de la Cámara; La Tercera, 20-sep-2026; sesión del 26-oct-2026",
      sugeridos: ["i12_smartsampa", "i12_ice", "i12_ijop", "i12_navalny", "i12_explicacion", "d9_foucault", "d9_levitsky", "d9_bermeo"]
    },
    {
      n: 3, titulo: "¿Quién fiscaliza?", articulos: "Arts. 8, 9, 16 y 18",
      pregunta: "¿Se crea un fiscalizador propio de IA en vez de encargarlo a la Agencia de Datos?",
      autora: 2, impugna: 3,
      requierePatrocinio: true,
      vigente: {
        rotulo: "Artículo 16. Infracciones (encabezado)",
        texto: "Para efectos del ejercicio de las atribuciones de la Agencia de Protección de Datos Personales, se considerará como infracción: 1. Gravísima […] 2. Grave […] 3. Leve […]",
        simple: "Hoy sanciona la Agencia de Protección de Datos Personales y la ANCI puede pedir fiscalizaciones. No se crea un organismo propio de IA.",
        mas: [
          "Art. 9 (último inciso): la APDP y la ANCI «podrán requerir a los operadores de estos sistemas procedimientos específicos de fiscalización» cuando haya indicios de incumplimiento.",
          "Art. 8: define el alto riesgo por su efecto, «un riesgo significativo de afectación de los derechos fundamentales», pero no lista cuáles son esos usos.",
          "Arts. 18 y 19: quien sufre un daño puede demandar civilmente la cesación y la indemnización, en procedimiento sumario."
        ]
      },
      partida: { tipo: "sustituir",
        texto: "Créase un organismo fiscalizador propio de inteligencia artificial. Reemplaza a la Agencia de Protección de Datos Personales en la fiscalización de esta ley (artículos 9 y 16)." },
      mueve: { hacia: "ciudadanos", desde: "empresas" },
      pelea: [
        { quien: "Ricardo Celis", cargo: "Senador (PPD)", textual: true,
          cita: "lo más importante, quién fiscaliza. ¿Cuál es la capacidad real que vamos a tener de fiscalización?",
          fuente: "Comisión de Desafíos del Futuro, 26-oct-2026" },
        { quien: "Rojo Edwards", cargo: "Presidente de la comisión", textual: true,
          cita: "que exista un responsable, una entidad encargada, una persona a la cual uno puede decir, oiga, esto resultó de esta manera",
          fuente: "Comisión de Desafíos del Futuro, 26-oct-2026" }
      ],
      actores: "El fiscalizador previsto es la Agencia de Protección de Datos Personales. La ley que la crea debía regir el 1-dic-2026. El Senado aprobó postergarla al 15-oct-2027, por 33 votos contra 6.",
      actoresFuente: "elmostrador.cl, 11-nov-2026",
      sugeridos: ["i12_rendicion", "i12_robodebt", "i12_subsidios", "d13_burrell", "i5_oligarquia"]
    },
    {
      n: 4, titulo: "Soberanía y plata", articulos: "Arts. 2 n° 3, 13 y 17",
      pregunta: "¿Se condiciona el incentivo tributario a cómputo y datos en Chile, con multas proporcionales a las ventas?",
      autora: 4, impugna: 1,
      vigente: {
        rotulo: "Artículo 17. Sanciones (extracto)",
        texto: "Multas de hasta 5.000 UTM (leves), 10.000 UTM (graves) y 20.000 UTM (gravísimas). Para fijarlas se considera, entre otras cosas, «el tamaño y volumen de las ventas anuales del operador».",
        simple: "Hoy las multas tienen un tope fijo. La ley alcanza a empresas extranjeras si su sistema se usa en Chile.",
        mas: [
          "Art. 2, número 3: la ley se aplica a los proveedores e implementadores «domiciliados en el extranjero, cuando la información de salida generada por el sistema de IA se utilice en Chile».",
          "Art. 13: las empresas de menor tamaño tienen acceso prioritario a los espacios controlados de prueba y apoyo en capacitación, «con arreglo a la disponibilidad presupuestaria existente»."
        ]
      },
      partida: { tipo: "agregar",
        texto: "El incentivo tributario a las empresas tecnológicas se condiciona a tener cómputo y datos en Chile. Las multas del artículo 17 pasan a ser proporcionales a las ventas del operador." },
      mueve: { hacia: "estado", desde: "empresas" },
      pelea: [
        { quien: "Rojo Edwards", cargo: "Presidente de la comisión", textual: true,
          cita: "incluso nuestros militares tienen que hacer todas las preguntas y la información va a ChatGPT y a Claude",
          fuente: "Comisión de Desafíos del Futuro, 26-oct-2026" },
        { quien: "La indicación del Ejecutivo", cargo: "Ministra Ximena Lincolao", textual: false,
          cita: "Incluye una depreciación acelerada del 100 % para empresas tecnológicas. Hacienda la objetó por su impacto fiscal.",
          fuente: "cooperativa.cl, 4-nov-2026" }
      ],
      actores: "La indicación del Ejecutivo trae una depreciación acelerada del 100 % para empresas tecnológicas. Hacienda la objetó. Daniela Serrano (PC) dice que exigir representante legal a las plataformas «es una cuestión de soberanía».",
      actoresFuente: "cooperativa.cl, 4-nov-2026; La Tercera, 20-sep-2026",
      sugeridos: ["d11_wallerstein", "d11_leeds", "i12_rivalidad", "i14_abeliuk"]
    }
  ],

  /* ---------------- el catálogo de conceptos (del syllabus) ----------------
     mod: "dem" = módulo de Democracia; "ia" = módulo de IA. Primero las semanas 9 a 14. */
  modulos: { dem: "Democracia", ia: "IA" },
  conceptos: [
    // --- Democracia, semanas 9 a 13
    { id: "d9_foucault", mod: "dem", sem: 9, nombre: "Vigilar y castigar", fuente: "Foucault (2001)" },
    { id: "d9_levitsky", mod: "dem", sem: 9, nombre: "Cómo mueren las democracias", fuente: "Levitsky y Ziblatt (2018)" },
    { id: "d9_bermeo", mod: "dem", sem: 9, nombre: "Retroceso democrático", fuente: "Bermeo (2016)" },
    { id: "d9_iliberal", mod: "dem", sem: 9, nombre: "Democracia iliberal y auge autoritario", fuente: "Clase de la semana 9" },
    { id: "d9_arendt", mod: "dem", sem: 9, nombre: "Los orígenes del totalitarismo", fuente: "Arendt (1951)" },
    { id: "d11_wallerstein", mod: "dem", sem: 11, nombre: "Sistema-mundo: centro y periferia", fuente: "Wallerstein (2004)" },
    { id: "d11_leeds", mod: "dem", sem: 11, nombre: "Gobernanza global y orden mundial", fuente: "Leeds, Mosley, Rosendorff y Zarakol (2025)" },
    { id: "d11_soberania", mod: "dem", sem: 11, nombre: "Democracia, soberanía y globalización", fuente: "Clase de la semana 11" },
    { id: "d13_burrell", mod: "dem", sem: 13, nombre: "La sociedad de los algoritmos", fuente: "Burrell y Fourcade (2021)" },
    { id: "d13_polarizacion", mod: "dem", sem: 13, nombre: "Polarización política", fuente: "Clase de la semana 13" },
    { id: "d13_deliberacion", mod: "dem", sem: 13, nombre: "Deliberación democrática", fuente: "Habermas (1996); Fishkin (2009)" },
    // --- Democracia, semanas 2 a 6
    { id: "d2_legitimidad", mod: "dem", sem: 2, nombre: "Legitimidad procedimental y sustantiva", fuente: "Clase de la semana 2" },
    { id: "d2_norris", mod: "dem", sem: 2, nombre: "Ciudadanos críticos y crisis de representación", fuente: "Norris (1999)" },
    { id: "d4_elites", mod: "dem", sem: 4, nombre: "Élites y concentración de poder", fuente: "The Power Elite (1956); Bourdieu (1996)" },
    { id: "d4_populismo", mod: "dem", sem: 4, nombre: "Populismo como respuesta a las élites", fuente: "Inglehart y Norris (2016)" },
    { id: "d6_esfera", mod: "dem", sem: 6, nombre: "Esfera pública y acción comunicativa", fuente: "Habermas (1989)" },
    { id: "d6_desinformacion", mod: "dem", sem: 6, nombre: "Desinformación y cámaras de eco", fuente: "Chambers (2020); Sunstein (2001)" },
    // --- IA, semanas 12 y 14
    { id: "i12_explicacion", mod: "ia", sem: 12, nombre: "Explicación, proporcionalidad e impugnación", fuente: "El Estado algorítmico" },
    { id: "i12_rendicion", mod: "ia", sem: 12, nombre: "Rendición de cuentas y control democrático", fuente: "El Estado algorítmico" },
    { id: "i12_juicio", mod: "ia", sem: 12, nombre: "Aumentar o reemplazar el juicio del funcionario", fuente: "El Estado algorítmico" },
    { id: "i12_smartsampa", mod: "ia", sem: 12, nombre: "Caso: Smart Sampa (Brasil)", fuente: "El Estado ve más" },
    { id: "i12_ice", mod: "ia", sem: 12, nombre: "Caso: ICE y Palantir (EE.UU.)", fuente: "El Estado ve más" },
    { id: "i12_ijop", mod: "ia", sem: 12, nombre: "Caso: la app IJOP (China)", fuente: "El Estado ve más" },
    { id: "i12_navalny", mod: "ia", sem: 12, nombre: "Caso: el funeral de Navalny (Rusia)", fuente: "El Estado ve más" },
    { id: "i12_robodebt", mod: "ia", sem: 12, nombre: "Caso: Robodebt (Australia)", fuente: "El Estado ve más" },
    { id: "i12_subsidios", mod: "ia", sem: 12, nombre: "Caso: el escándalo de los subsidios (Países Bajos)", fuente: "El Estado ve más" },
    { id: "i12_ciudadanos", mod: "ia", sem: 12, nombre: "Los ciudadanos ven más: vigilar al Estado", fuente: "Schneier y Sanders (2025), cap. 35" },
    { id: "i12_flooding", mod: "ia", sem: 12, nombre: "Agentic flooding: el ciudadano satura al Estado", fuente: "The Economist (2026)" },
    { id: "i12_rivalidad", mod: "ia", sem: 12, nombre: "Rivalidad entre EE.UU. y China por la hegemonía en IA", fuente: "El Estado algorítmico" },
    { id: "i14_abeliuk", mod: "ia", sem: 14, nombre: "Los modelos simulan peor a Chile que a EE.UU.", fuente: "Abeliuk, Gaete y Bro (2026)" },
    { id: "i14_aumentada", mod: "ia", sem: 14, nombre: "Democracia aumentada con modelos de lenguaje", fuente: "Gudiño-Rosero, Grandi e Hidalgo (2024)" },
    { id: "i14_valores", mod: "ia", sem: 14, nombre: "Los valores de los modelos no son los de la mayoría", fuente: "The Economist (2026)" },
    // --- IA, semanas 3 a 7
    { id: "i7_instrumentos", mod: "ia", sem: 7, nombre: "Regular, redistribuir, reprimir", fuente: "Acemoglu, Gitmez y Shadmehr (2026)" },
    { id: "i7_frenar", mod: "ia", sem: 7, nombre: "Frenar o acelerar; industria o Estado", fuente: "¿Quién debe gobernar la IA?" },
    { id: "i7_finra", mod: "ia", sem: 7, nombre: "Un organismo de estándares tipo FINRA", fuente: "Hassabis (2026)" },
    { id: "i5_oligarquia", mod: "ia", sem: 5, nombre: "Oligarquía de la IA y concentración de poder", fuente: "¿Quién controla las máquinas?" },
    { id: "i5_soberania", mod: "ia", sem: 5, nombre: "Depender de datos y cómputo es soberanía", fuente: "Estavillo (Congreso Futuro 2026)" },
    { id: "i5_proworker", mod: "ia", sem: 5, nombre: "Automatizar o complementar es una decisión política", fuente: "Acemoglu (2026)" },
    { id: "i5_underclass", mod: "ia", sem: 5, nombre: "Underclass permanente", fuente: "¿Quién controla las máquinas?" },
    { id: "i3_backlash", mod: "ia", sem: 3, nombre: "Backlash contra la IA", fuente: "¿Un backlash contra la IA?" },
    { id: "i3_centros", mod: "ia", sem: 3, nombre: "El choque territorial de los centros de datos", fuente: "The Economist (2026)" }
  ],

  /* ---------------- el Senado simulado: cinco tipos, no personas ---------------- */
  senadores: [
    { id: "habilitante", nombre: "El habilitante",
      valora: "que la norma deje hacer y nombre a un responsable identificable",
      molesta: "regular riesgos de tecnologías que todavía no existen" },
    { id: "garantista", nombre: "La garantista",
      valora: "obligaciones previas y un camino claro para que la persona afectada reclame",
      molesta: "las promesas de autorregulación sin sanción" },
    { id: "fiscalizacion", nombre: "El de la fiscalización",
      valora: "quién hace cumplir la norma, con qué facultades y con qué capacidad real",
      molesta: "crear deberes que nadie puede fiscalizar" },
    { id: "seguridad", nombre: "La de seguridad",
      valora: "que el Estado tenga herramientas para prevenir e investigar delitos, con control judicial",
      molesta: "atar las manos a las policías por casos hipotéticos" },
    { id: "hacienda", nombre: "Hacienda",
      valora: "quién paga, cuánto cuesta y de dónde sale",
      molesta: "el gasto sin financiamiento y los incentivos sin contrapartida" }
  ],
  pisoComun: "que la intervención cite un artículo del proyecto y aplique (no solo nombre) un concepto de cada módulo",
  senadoAviso: "Son cinco tipos de senador simulados con IA. No son personas reales.",

  /* ---------------- seis filtraciones (tarjetas de prensa) ---------------- */
  filtraciones: [
    { id: "f1", titular: "La ministra reescribió la indicación sin su equipo",
      detalle: "Cicardini pidió aclarar «si desde el Segundo Piso se está obstaculizando» su trabajo. Celis apuntó a «deficiencias en la asesoría legislativa».",
      fuente: "radio.uchile.cl, 5-nov-2026", nudo: 1 },
    { id: "f2", titular: "Hacienda objeta la depreciación acelerada del 100 %",
      detalle: "La indicación del Ejecutivo la incluye para empresas tecnológicas. Hacienda la objetó por su impacto fiscal. La Segpres le hizo observaciones legales.",
      fuente: "cooperativa.cl, 4-nov-2026", nudo: 4 },
    { id: "f3", titular: "El fiscalizador de la ley de IA no existirá hasta octubre de 2027",
      detalle: "La ley que crea la Agencia de Protección de Datos Personales debía regir el 1-dic-2026. El Senado aprobó postergarla al 15-oct-2027, por 33 votos contra 6.",
      fuente: "elmostrador.cl, 11-nov-2026", nudo: 3 },
    { id: "f4", titular: "En EE.UU., 40 de 41 consultas locales frenaron centros de datos",
      detalle: "En las elecciones de medio término, los votantes limitaron o frenaron centros de datos en casi todas las consultas locales.",
      fuente: "elpais.com.uy, 9-nov-2026", nudo: 4 },
    { id: "f5", titular: "Los incidentes de ciberseguridad significativos crecen 166 %",
      detalle: "La ANCI recibió 566 reportes entre enero y el 15-oct-2026. Casi un tercio afectó a organismos del Estado.",
      fuente: "biobiochile.cl, 7-nov-2026", nudo: 2 },
    { id: "f6", titular: "El Servel reconoce un vacío normativo frente a bots e IA en campañas",
      detalle: "El Frente Amplio presentó un proyecto contra las granjas de bots y el uso de IA en campañas.",
      fuente: "theclinic.cl, 4-nov-2026", nudo: 1 }
  ],

  /* ---------------- las reglas reales que el juego enseña ---------------- */
  reglas: {
    general: "Primero se vota la idea de legislar. Después se discute artículo por artículo.",
    particular: "Una indicación suprime, sustituye o agrega texto a un artículo.",
    papel: "En la hoja: el tipo (suprimir, sustituir o agregar), el texto como quedaría en la ley y un concepto de cada módulo, aplicado al artículo. Después la leen en voz alta.",
    urgencia: "Urgencia: el Presidente fija el ritmo del Congreso. Este punto se debate en la mitad del tiempo.",
    patrocinio: "Iniciativa exclusiva: solo el Presidente puede proponer crear un servicio público o comprometer gasto (art. 65 de la Constitución).",
    patrocinado: "El Ejecutivo patrocina la indicación. Ahora se puede votar.",
    inadmisible: "Inadmisible: la indicación crea un organismo y no tiene patrocinio del Ejecutivo. No se vota.",
    veto: "Veto: el Presidente puede rechazar lo que aprobó el Congreso.",
    insistencia: "Insistencia: el Congreso mantiene su texto si reúne dos tercios.",
    quorum: "Sin quórum no hay votación válida: tiene que votar al menos un tercio de los escaños.",
    senado: "La indicación se aprueba si gana en la sala. El Senado simulado muestra si sobreviviría fuera de ella."
  },

  /* ---------------- tiempos y puntaje ---------------- */
  tiempos: { defensa: 120, respuesta: 120, redaccion: 1800 },
  // por bancada: sala, senado, patrocinio y fundamentos. Por escaño: apuesta y aplauso.
  puntos: { sala: 2, senado: 2, patrocinio: 1, fundamento: 1, maxFundamentos: 2, apuesta: 3, aplauso: 2 },
  aplausos: 3,  // por estudiante, por cada bancada que habla en un nudo
  // la redacción es en papel: esto es lo que tiene que traer la hoja
  formato: ["El tipo: suprimir, sustituir o agregar.", "El texto, como quedaría en la ley.", "Un concepto del módulo de Democracia y uno del módulo de IA, aplicados al artículo."],
  paso: 0.14,   // cuánto mueve el triángulo cada indicación aprobada
  tarea: "Para el jueves: tu bancada defiende su indicación y responde otra. Lleguen con un concepto de cada módulo."
};

if (typeof module !== "undefined") module.exports = LA_SALA;
