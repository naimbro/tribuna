/* =====================================================================
   TRIBUNA — contenido de una sesión.
   CSC00155 · Inteligencia Artificial y Democracia · Semana 15, taller integrador.
   Lunes 16 de noviembre de 2026, 08:30–09:40. El jueves 19 se juega La Sala.

   Material: la guía impresa semana15_proyecto_ley_ia.pdf (síntesis del debate,
   los dos modelos en disputa y el texto despachado por la Cámara, oficio
   N° 20.843 del 13-oct-2025) y sala-datos.js (las cuatro bancadas y los cuatro
   nudos de La Sala). Ninguna cifra ni cita que no esté en esos dos.

   Modo de juego: un micrófono y galería (index.html), pero el lunes NO hay
   duelos. Solo se usa el compás: cada alumno entra con su teléfono, responde la
   brújula corta y queda en uno de los cuatro campos, que son las cuatro
   bancadas de La Sala (mismos ids, nombres, colores y orden: el grupo n de la
   galería es la bancada n). El proyector muestra el mapa y cuántos hay en cada
   bancada. La sala se queda en la espera hasta que el profesor abra un duelo
   desde su teléfono, cosa que el lunes no hace.

   Los dos duelos de PREGUNTAS existen porque la galería no crea una sala sin
   duelos. Son los nudos 3 y 4 de La Sala, que enfrentan a bancadas opuestas
   en el mapa, con el mismo lado a favor que en La Sala.
   ===================================================================== */

const SESION = {
  curso: "CSC00155 — Inteligencia Artificial y Democracia",
  semana: 15,
  tema: "La ley de IA: ¿en qué bancada estás?",
  mocion: "Hay que crear un fiscalizador propio de la IA, en vez de encargárselo a la Agencia de Datos.",
  grupos: 4,                // solo el juego clásico
  compas: true,             // un micrófono: los campos de BRUJULA son los grupos de la galería
  favor: "A FAVOR",
  contra: "EN CONTRA"
};

/* --- Rondas y rúbrica: las del curso (semana 14) ---------------------- */
const RONDAS = [
  { id: "apertura",   nombre: "Apertura",           seg: 180, rol: "Orador de apertura",
    pauta: "Tesis y argumentos principales. Toda afirmación sobre el proyecto cita el artículo." },
  { id: "refutacion", nombre: "Refutación cruzada",  seg: 180, rol: "Refutador",
    pauta: "Reconstruye honestamente la posición contraria ANTES de refutarla. Conceder puntos válidos suma." },
  { id: "cierre",     nombre: "Cierre",             seg: 120, rol: "Orador de cierre",
    pauta: "Nombra el punto de desacuerdo fundamental. Sin argumentos nuevos." }
];

const RUBRICA = [
  { id: "evidencia",  nombre: "Uso de evidencia",      max: 5, desc: "Afirmaciones ancladas en el articulado y en la guía, con el artículo preciso." },
  { id: "refutacion", nombre: "Calidad de refutación",  max: 5, desc: "Responde al argumento real, no a una versión debilitada." },
  { id: "estructura", nombre: "Claridad y economía",    max: 5, desc: "Se entiende qué sostiene y no hace perder el tiempo." },
  { id: "concesion",  nombre: "Concesión honesta",      max: 5, desc: "Identifica la fortaleza adversaria y explica por qué persiste su posición." }
];

/* --- Conceptos: lo que dice la guía impresa ----------------------------
   lado = +1 ayuda a la regla fuerte y previa (quien va A FAVOR en los dos
   duelos: Garantistas y Soberanistas), −1 a la regla flexible y posterior
   (Orden y seguridad, Habilitantes), 0 sirve a ambos. */
const CONCEPTOS = [
  { id: "riesgo", etiqueta: "El proyecto regula usos, no la tecnología: cuatro niveles de riesgo", lado: 0,
    fuente: "Guía semana 15, sección 2; oficio 20.843, art. 6: inaceptable (prohibido, art. 7), alto riesgo (arts. 8–10), limitado (art. 11) y sin riesgo evidente",
    claves: ["riesgo","niveles","cuatro niveles","inaceptable","alto riesgo","riesgo limitado","articulo 6","artículo 6","art. 6"] },
  { id: "prohibidos", etiqueta: "Siete usos prohibidos, entre ellos el reconocimiento facial en tiempo real en espacios públicos", lado: +1,
    fuente: "Oficio 20.843, art. 7: manipulación subliminal, explotación de vulnerabilidades, categorización biométrica que discrimine, calificación social, identificación biométrica remota en tiempo real en espacios públicos (n° 5), extracción masiva de rostros, inferencia de emociones; infracción gravísima, hasta 20.000 UTM",
    claves: ["prohibido","prohibe","prohíbe","articulo 7","artículo 7","art. 7","reconocimiento facial","tiempo real","biometrica","biométrica","calificacion social","calificación social","subliminal"] },
  { id: "alto_sin_lista", etiqueta: "La ley no lista cuáles son los usos de alto riesgo", lado: -1,
    fuente: "Guía semana 15, sección 2; oficio 20.843, art. 8: el alto riesgo se define por su efecto, un riesgo significativo para derechos fundamentales",
    claves: ["no lista","no dice cuales","no dice cuáles","quien decide","quién decide","articulo 8","artículo 8","incertidumbre"] },
  { id: "ex_post", etiqueta: "El Gobierno: que se sancione el acto concreto y no su mera posibilidad", lado: -1,
    fuente: "Guía semana 15, sección 3: la ministra Lincolao propone sanciones proporcionales a daños concretos, estándares internacionales, autodeclaración y certificaciones (AI Verify de Singapur)",
    claves: ["ex post","acto concreto","mera posibilidad","lincolao","ministra","certificacion","certificación","autodeclaracion","autodeclaración","singapur","japon","japón"] },
  { id: "martillo", etiqueta: "Rojo Edwards: no se regula el martillo, se sanciona a quien lo usa mal", lado: -1,
    fuente: "Guía semana 15, voces en la comisión (paráfrasis del informe): libertad para innovar sin autorización previa, certificación voluntaria con presunción de diligencia, sin regulador horizontal; siempre debe haber un responsable identificable",
    claves: ["martillo","rojo edwards","edwards","libertad para innovar","regulador horizontal","presuncion de diligencia","presunción de diligencia","responsable identificable"] },
  { id: "dano_sistemico", etiqueta: "Cicardini: los daños sistémicos de decisiones automatizadas son difíciles de sancionar después", lado: +1,
    fuente: "Guía semana 15, voces en la comisión (paráfrasis del informe): falta un principio sobre derechos de las personas, no está claro quién fiscaliza y preocupa la concentración en pocas grandes tecnológicas",
    claves: ["cicardini","sistemico","sistémico","daño sistemico","daño sistémico","dificil de probar","difícil de probar","despues de ocurrido","después de ocurrido","grandes tecnologicas","grandes tecnológicas"] },
  { id: "fiscaliza", etiqueta: "No se crea una agencia nueva: sanciona la Agencia de Protección de Datos Personales", lado: 0,
    fuente: "Guía semana 15, sección 2; oficio 20.843, arts. 9 y 16–19: la ANCI puede requerir fiscalizaciones y hay acción civil por daños en procedimiento sumario",
    claves: ["agencia de datos","proteccion de datos","protección de datos","anci","fiscaliza","fiscalizador","agencia nueva","sumario","accion civil","acción civil"] },
  { id: "extranjeros", etiqueta: "La ley alcanza a proveedores extranjeros si su sistema se usa en Chile", lado: +1,
    fuente: "Oficio 20.843, art. 2, n° 3: proveedores e implementadores domiciliados en el extranjero, cuando la información de salida se utilice en Chile",
    claves: ["extranjero","extranjeros","extranjera","domiciliados","se usa en chile","se utilice en chile","representante legal","soberania","soberanía"] },
  { id: "multas", etiqueta: "Multas de hasta 5.000, 10.000 y 20.000 UTM, según el tamaño y las ventas del operador", lado: 0,
    fuente: "Oficio 20.843, art. 17; guía semana 15: 1 UTM ≈ 70 mil pesos",
    claves: ["multa","multas","utm","20.000","10.000","5.000","ventas","articulo 17","artículo 17"] },
  { id: "fomento", etiqueta: "Sandboxes exentos de multas y apoyo a pymes; el Gobierno y Edwards suman incentivos", lado: -1,
    fuente: "Oficio 20.843, arts. 12–14; guía semana 15, sección 3: sandboxes de hasta 2 años, zonas de innovación y cómputo (Gobierno); depreciación acelerada y crédito del 35 % para pymes (Edwards)",
    claves: ["sandbox","sandboxes","espacio controlado","espacios controlados","pyme","pymes","depreciacion","depreciación","35","incentivo","incentivos","computo","cómputo"] },
  { id: "defensa", etiqueta: "La IA de defensa nacional queda fuera, con una lista reservada", lado: 0,
    fuente: "Oficio 20.843, art. 2, letra a): una resolución reservada del Ministerio de Defensa lista los sistemas exceptuados",
    claves: ["defensa nacional","lista reservada","reservada","ministerio de defensa","militares"] },
  { id: "diferenciado", etiqueta: "Etcheverry: no es lo mismo un diagnóstico médico que un recomendador de productos", lado: +1,
    fuente: "Guía semana 15, voces en la comisión (paráfrasis del informe): por eso hace falta un trato diferenciado según el riesgo",
    claves: ["etcheverry","diagnostico medico","diagnóstico médico","recomendador","trato diferenciado"] }
];

const FUENTES = [
  "oficio", "20.843", "camara", "cámara", "senado", "comision", "comisión", "lincolao", "edwards", "cicardini", "celis",
  "etcheverry", "agencia de datos", "anci", "ai act", "union europea", "unión europea", "singapur", "articulo", "artículo"
];

/* El juego clásico no se usa con esta clase: sin audiencia ni titulares. */
const AUDIENCIA = [];
const EVENTOS = [];

const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "La regla, antes del daño.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "Que responda quien hace daño.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Los dos duelos que la galería necesita para crear la sala -----------
   El lunes no se juegan. Son los nudos 3 y 4 de La Sala (sala-datos.js): cada
   uno enfrenta a dos bancadas opuestas en el mapa, y la que afirma es la autora
   del nudo en La Sala. */
const PREGUNTAS = [
  { texto: "Hay que crear un fiscalizador propio de la IA, en vez de encargárselo a la Agencia de Datos.", afirma: "garantistas",
    favor: "Un organismo propio de IA, con capacidad real de fiscalizar: la Agencia de Datos no alcanza.",
    contra: "Basta con la Agencia de Datos y los organismos que ya existen; uno nuevo no da más seguridad." },
  { texto: "El incentivo tributario a las tecnológicas debe exigir cómputo y datos en Chile, con multas según sus ventas.", afirma: "soberanistas",
    favor: "Sin cómputo ni datos en Chile no hay beneficio, y la multa se mide por lo que la empresa vende.",
    contra: "Condicionar el incentivo espanta la inversión: que llegue primero y responda si causa daño." }
];

/* --- Brújula corta -------------------------------------------------------
   Los cuatro campos son las cuatro bancadas de La Sala, en su orden.

   x — ¿Cómo debe ser la regla? Flexible: se responde al daño después (−) ↔
       fuerte: se exige antes del daño (+). Es la disputa ex ante / ex post de
       la sección 3 de la guía (Cámara contra Gobierno y Rojo Edwards).
   y — ¿A quién se protege primero? A cada persona (−) ↔ a la comunidad y la
       nación (+).

   Cada pregunta se ancla en un punto del proyecto. P1, P3 y P5 puntúan en un
   eje; P2 y P4 en los dos, porque son las peleas de bancadas en diagonal:
     P1  riesgo o principios y sandboxes (arts. 6–12) ............ x
     P2  reconocimiento facial y policías (art. 7 n° 5) .......... Seguridad ↔ Garantistas
     P3  quién fiscaliza (arts. 9 y 16) .......................... x
     P4  incentivo y cómputo y datos en Chile (nudo 4) ........... Habilitantes ↔ Soberanistas
     P5  multas, pymes y extranjeras (arts. 2 n° 3, 13 y 17) ..... y

   Equilibrio: de las 4^5 = 1024 combinaciones, 256 caen en cada bancada.
   Sale de dos simetrías: P2 y P4 tienen los mismos módulos (3 y 7) con el
   signo de y cruzado, así que reflejar un eje intercambia P2 con P4 y deja el
   conjunto igual. Y ningún promedio puede ser 0 (no hay empates entre dos
   bancadas): x suma tres ejes impares (P1, P2, P4) y uno par (P3), y y suma tres
   impares (P2, P4, P5). La prueba en pruebas/contenido.test.js lo recorre. */
const BRUJULA = {
  ejes: {
    x: { id: "regla", etiqueta: "¿Cómo debe ser la regla?", min: "flexible: se responde al daño", max: "fuerte: se exige antes" },
    y: { id: "proteger", etiqueta: "¿A quién se protege primero?", min: "a cada persona", max: "a la comunidad y la nación" }
  },
  preguntas: [
    { id: "p1", texto: "Una IA va a decidir a quién se le presta plata. ¿Qué se le exige antes de usarla?",
      opciones: [
        { texto: "Nada: si discrimina, que pague después", x: -7 },
        { texto: "Un sello voluntario y un periodo de prueba", x: -3 },
        { texto: "Unas reglas mínimas antes de salir", x: 3 },
        { texto: "Pruebas y control previo, como un remedio", x: 7 }] },
    { id: "p2", texto: "La policía quiere cámaras que reconozcan caras en vivo en el Metro. Hoy la ley lo prohíbe.",
      opciones: [
        { texto: "Que se usen: primero la seguridad de todos", x: -7, y: 7 },
        { texto: "Que se usen, con control y registro", x: -3, y: 3 },
        { texto: "Prohibidas, salvo orden de un juez", x: 3, y: -3 },
        { texto: "Prohibidas siempre: nos vigilan a todos", x: 7, y: -7 }] },
    { id: "p3", texto: "Una IA te perjudica. ¿Quién debería fiscalizar y multar?",
      opciones: [
        { texto: "Nadie nuevo: un juez, si hubo daño", x: -8 },
        { texto: "Los organismos que ya existen", x: -4 },
        { texto: "La Agencia de Datos, como dice la ley", x: 4 },
        { texto: "Una agencia nueva, solo para la IA", x: 8 }] },
    { id: "p4", texto: "El Gobierno quiere bajar impuestos a las empresas tecnológicas. ¿A cambio de qué?",
      opciones: [
        { texto: "De nada: que la inversión llegue", x: -7, y: -7 },
        { texto: "De que se instalen; el resto, el mercado", x: -3, y: -3 },
        { texto: "De que parte de los datos quede en Chile", x: 3, y: 3 },
        { texto: "De tener el cómputo y los datos en Chile", x: 7, y: 7 }] },
    { id: "p5", texto: "Una pyme chilena y una gigante extranjera cometen la misma falta. ¿Cómo se las multa?",
      opciones: [
        { texto: "Igual: lo que importa es la persona dañada", y: -7 },
        { texto: "Igual, con más plazo para la pyme", y: -3 },
        { texto: "Más suave con la pyme chilena", y: 3 },
        { texto: "Duro con la extranjera: según sus ventas", y: 7 }] }
  ],
  campos: [
    { id: "habilitantes", nombre: "Habilitantes", centro: { x: -5, y: -5 }, color: "#e0a43a",
      afirma: "Principios e incentivos. Que la inversión llegue." },
    { id: "garantistas", nombre: "Garantistas", centro: { x: 5, y: -5 }, color: "#3fb6a8",
      afirma: "Derechos, obligaciones previas y un fiscalizador fuerte." },
    { id: "seguridad", nombre: "Orden y seguridad", centro: { x: -5, y: 5 }, color: "#6f9bf2",
      afirma: "El Estado necesita ver para proteger." },
    { id: "soberanistas", nombre: "Soberanistas", centro: { x: 5, y: 5 }, color: "#b990f0",
      afirma: "Cómputo, datos y reglas propias. Desconfía de las grandes tecnológicas." }
  ]
};
