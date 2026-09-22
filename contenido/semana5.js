/* =====================================================================
   TRIBUNA — contenido de una sesión.
   Este archivo es TODO lo que hay que editar para montar otra semana.
   Fuente: naimbro.github.io/ia-democracia-2026 — Semana 5 y debates.html
   ===================================================================== */

const SESION = {
  curso: "CSC00155 — Inteligencia Artificial y Democracia",
  semana: 5,
  tema: "Populismo y oligarquía de la IA",
  mocion: "La dirección de la IA —automatización o proworker— es una elección política, no técnica.",
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

/* --- Knowledge base: conceptos de la semana 5 ------------------------
   claves = detonantes textuales (minúsculas, con y sin tilde)
   lado   = +1 apoya la moción, -1 la debilita, 0 sirve a ambos lados   */
const CONCEPTOS = [
  { id: "direccionalidad", etiqueta: "Direccionalidad tecnológica (Acemoglu)", lado: +1,
    fuente: "Acemoglu, podcast How AI Will Affect the Economy",
    claves: ["acemoglu","proworker","pro-worker","complementacion","complementación","complementa","automatizacion","automatización","direccionalidad","dos caminos"] },
  { id: "revolucion", etiqueta: "Precedente de la Revolución Industrial", lado: +1,
    fuente: "Acemoglu — la corrección vino por gobiernos y sindicatos",
    claves: ["revolucion industrial","revolución industrial","sindicato","sindicatos","luditas","siglo xix","telares"] },
  { id: "quien_decide", etiqueta: "Quién financia, compra y regula", lado: +1,
    fuente: "Semana 5, Parte IV",
    claves: ["quien financia","quienes financian","quien compra","quienes compran","regulan","reguladores","compradores","financiamiento","subsidio","incentivo tributario"] },
  { id: "oligarquia", etiqueta: "Los cinco que controlan la IA", lado: 0,
    fuente: "The Economist (2026), Five men control AI",
    claves: ["cinco hombres","altman","amodei","hassabis","zuckerberg","musk","openai","anthropic","deepmind","xai","oligarquia","oligarquía"] },
  { id: "zucman", etiqueta: "Concentración de riqueza (Zucman)", lado: 0,
    fuente: "NYT (jun. 2026), serie Blanchet-Mouillet-Saez-Zucman",
    claves: ["zucman","saez","blanchet","milmillonarios","20% del pib","20 % del pib","20,1","billones","concentracion de riqueza","concentración de riqueza"] },
  { id: "pay_to_play", etiqueta: "Dinero en política / pay-to-play", lado: +1,
    fuente: "David Autor (MIT); impuesto al patrimonio, California nov. 2026",
    claves: ["autor","pay-to-play","pay to play","distorsiona la politica","distorsiona la política","aristocracia","impuesto","patrimonio","california","lobby","donaciones de campaña"] },
  { id: "filantropia", etiqueta: "Filantropía sin rendición de cuentas", lado: +1,
    fuente: "The Economist (2026), sobre la filantropía de los fundadores",
    claves: ["filantropia","filantropía","fundacion openai","fundación openai","430","plan marshall","carnegie","rockefeller","usaid","donacion","donación","rendicion de cuentas","rendición de cuentas"] },
  { id: "populismo_ia", etiqueta: "Populismo de IA (Jasmine Sun)", lado: +1,
    fuente: "Jasmi (2026), Warning Shots / NYT podcast",
    claves: ["populismo de ia","jasmine sun","warning shots","centros de datos","centro de datos","data center","moratoria","moratorias","70%","consentimiento","sin consentimiento","backlash"] },
  { id: "underclass", etiqueta: "Hipótesis de la underclass", lado: 0,
    fuente: "Semana 5, Parte III; Wilson (1987), Gans (1995)",
    claves: ["underclass","subclase","exclusion estructural","exclusión estructural","wilson","gans","movilidad social","palanca","excedente","estructuralmente excluida"] },
  { id: "abundancia", etiqueta: "La promesa de abundancia (Musk)", lado: 0,
    fuente: "The Economist (2026), entrevista a Elon Musk",
    claves: ["abundancia","dinero obsoleto","manhattan","mona lisa","8.300","hiperproduccion","hiperproducción","quien reparte","quién reparte"] },
  { id: "objeciones", etiqueta: "Objeciones a Acemoglu", lado: -1,
    fuente: "The Economist (ago. 2026); Albouy (2012)",
    claves: ["albouy","impugnado","china","ia agentica","ia agéntica","agentica","23.000","marco institucional","no previo","no previó"] },
  { id: "schneier", etiqueta: "¿La IA distribuye o refuerza el poder?", lado: 0,
    fuente: "Schneier & Sanders, Rewiring Democracy, caps. 32 y 39",
    claves: ["schneier","sanders","rewiring democracy","distribuye capacidades","refuerza a quienes","capacidades politicas","capacidades políticas"] },
  { id: "mercado", etiqueta: "Determinismo de mercado / eficiencia", lado: -1,
    fuente: "Contrapunto liberal (Semana 5, Parte I)",
    claves: ["competencia","el mercado decide","eficiencia","curva de costos","productividad","inevitable","determinismo","fuerzas del mercado"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
const FUENTES = ["acemoglu","zucman","saez","autor","schneier","sanders","jasmine sun","jasmi","albouy","wilson","gans","estavillo","the economist","economist","new york times","nyt","rewiring democracy","heatmap"];

/* --- La audiencia: seis bloques, no una masa ------------------------- */
/* registro y no_mueve solo los usa la sociedad de agentes (MOTOR → AUDIENCIA): el tono de la
   persona y lo que NO la mueve aunque esté bien dicho. Sin no_mueve los agentes le dan la razón
   a casi cualquiera que hable razonablemente. */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te expliquen la economía desde arriba: la competencia global, los mercados y los papers te suenan a excusa de gerencia. Tampoco la pura rabia sin propuesta: ya estuviste en muchas asambleas que no terminaron en nada.",
    bloque: "TRABAJO", votos: 5, pos: 16, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { direccionalidad: 1.5, revolucion: 1.4, quien_decide: 1.2, populismo_ia: 1.1, underclass: 1.2, mercado: 0.9, abundancia: 0.4 },
    alergias: ["inevitable","progreso imparable","disrupcion","disrupción"],
    voz: {
      alto: ["Eso lo veo en mi turno. Alguien firmó ese diseño.", "Ya, esto sí aterriza. La máquina no se compró sola.", "Si hay decisión, hay con quién negociar. Eso me sirve."],
      bajo: ["Hablan de la industria como si fuera el clima.", "Puros conceptos. Yo trabajo ahí adentro.", "Nadie que haya pisado una sala de servidores habla así."]
    }
  },
  {
    id: "capital", nombre: "Rodrigo Ossandón", edad: 54, emoji: "\u{1F4C8}", color: "#f59e0b",
    oficio: "Socio de un fondo de venture capital, Santiago.",
    registro: "Seco, irónico, de directorio.",
    no_mueve: "No te mueven la indignación ni los nombres propios: sin cifras, costos o un mecanismo, para ti no hay argumento. Llevas veinte años escuchando que el mercado no decide y un buen discurso no te cambia la opinión.",
    bloque: "CAPITAL", votos: 4, pos: -45, volatilidad: 0.7, peso_rigor: 1.1,
    mueve: { mercado: 1.5, objeciones: 1.4, abundancia: 1.1, zucman: 0.8, direccionalidad: 0.7, pay_to_play: 0.5, filantropia: 0.4 },
    alergias: ["expropiar","oligarca","saqueo","los ricos"],
    voz: {
      alto: ["Concedo el punto: ahí hay una decisión de asignación.", "Números. Por fin alguien trae números.", "Bien traído. No me convence del todo, pero es un argumento."],
      bajo: ["Consigna sin cifra. Siguiente.", "Eso confunde correlación con voluntad.", "¿Y el costo de capital? No aparece por ningún lado."]
    }
  },
  {
    id: "estado", nombre: "Fernanda Lillo", edad: 41, emoji: "\u{1F3DB}️", color: "#a78bfa",
    oficio: "Jefa de división en un ministerio sectorial.",
    registro: "Funcionaria: precisa, algo cansada.",
    no_mueve: "No te mueve el diagnóstico sin instrumento: si no dice quién, con qué facultad y con qué plata, es ruido. Tampoco las consignas contra empresarios ni la fe en que el mercado se ordena solo.",
    bloque: "ESTADO", votos: 4, pos: -5, volatilidad: 0.8, peso_rigor: 1.3,
    mueve: { quien_decide: 1.5, pay_to_play: 1.3, filantropia: 1.3, schneier: 1.1, direccionalidad: 1.0, objeciones: 0.8 },
    alergias: ["hay que regular","el estado debe","urge una ley"],
    voz: {
      alto: ["Ahí hay un instrumento, no solo un diagnóstico.", "Eso se puede escribir en un decreto. Anotado.", "Correcto: la pregunta es quién rinde cuentas."],
      bajo: ["Hay que regular no es una política pública.", "¿Con qué facultad? ¿Con qué presupuesto?", "Diagnóstico impecable, instrumento cero."]
    }
  },
  {
    id: "calle", nombre: "Ignacio Peña", edad: 19, emoji: "\u{1F4F1}", color: "#f43f5e",
    oficio: "Estudiante. Vive en internet. Desconfía de los cinco por igual.",
    registro: "Chileno de 19 años, de redes: frases cortas, sarcástico.",
    no_mueve: "No te mueve nadie que hable como paper: si en la segunda frase ya hay una tesis, un marco o tres autores, dejas de escuchar aunque tengan razón. Desconfías por igual de empresas, gobierno y profes, y no te compras que algo sea inevitable.",
    bloque: "CALLE", votos: 6, pos: 2, volatilidad: 1.6, peso_rigor: 0.2,
    mueve: { oligarquia: 1.6, populismo_ia: 1.5, filantropia: 1.3, zucman: 1.2, underclass: 1.0, abundancia: 0.8 },
    alergias: ["marco institucional","paradigma","stakeholder","ceteris","heterogeneidad"],
    voz: {
      alto: ["ESO. Cinco tipos decidiendo por ocho mil millones.", "Ya po, alguien lo dijo.", "Esto se comparte."],
      bajo: ["No entendí nada y creo que esa era la idea.", "Habla como paper. Chao.", "Suena a alguien que nunca perdió nada."]
    }
  },
  {
    id: "academia", nombre: "Dra. Marta Cifuentes", edad: 60, emoji: "\u{1F4DA}", color: "#34d399",
    oficio: "Economista. Lee las notas al pie antes que el abstract.",
    registro: "Docta y cortante.",
    no_mueve: "No te mueve la retórica, por buena que sea, ni la cita de adorno: una fuente mal usada te predispone peor que ninguna. Cambias de posición poco y de a poco.",
    bloque: "ACADEMIA", votos: 3, pos: -20, volatilidad: 0.5, peso_rigor: 1.8,
    mueve: { objeciones: 1.3, direccionalidad: 1.2, zucman: 1.2, schneier: 1.2, underclass: 1.1, revolucion: 1.0 },
    alergias: ["está demostrado","todos sabemos","obviamente","es un hecho que"],
    voz: {
      alto: ["Atribución correcta. Es lo mínimo y casi nadie lo hace.", "Bien: distingue hipótesis de hallazgo.", "Reconstruyó la posición contraria antes de refutarla. Suma."],
      bajo: ["Eso Acemoglu no lo dice así.", "Afirmación empírica sin fuente. No cuenta.", "Apelación a autoridad. La bibliografía no es un escudo."]
    }
  },
  {
    id: "territorio", nombre: "Héctor Muñoz", edad: 63, emoji: "\u{1F33E}", color: "#fb923c",
    oficio: "Ex operario. Su comuna votó una moratoria a un centro de datos.",
    registro: "Hombre mayor de comuna: pausado, concreto.",
    no_mueve: "No te mueve nada que no nombre un lugar, un vecino o una cuenta de la luz: China, los mercados y los autores extranjeros te dan lo mismo. Tampoco confías en el que habla bonito desde Santiago.",
    bloque: "TERRITORIO", votos: 5, pos: -8, volatilidad: 1.2, peso_rigor: 0.4,
    mueve: { populismo_ia: 1.6, quien_decide: 1.3, oligarquia: 1.1, underclass: 1.2, revolucion: 1.0, abundancia: 0.6 },
    alergias: ["externalidad","optimizar","escalar"],
    voz: {
      alto: ["A nosotros nadie nos preguntó dónde ponerlo. Eso es decidir.", "El agua y la luz salieron de acá. Alguien eligió eso.", "Por fin alguien nombra el lugar."],
      bajo: ["Puro Santiago hablando.", "¿Y quién vive al lado de la bendita máquina?", "Eso no se lo digan a mi vecina."]
    }
  }
];

/* --- Sala de control: shocks que el profesor lanza en vivo ------------ */
const EVENTOS = [
  { id: "filtracion", titular: "FILTRACIÓN: el fondo que financia el centro de datos compró los terrenos ocho meses antes del anuncio municipal.",
    efecto: { territorio: 14, calle: 11, trabajo: 6, capital: -4, estado: 5, academia: 2 } },
  { id: "albouy", titular: "The Economist recuerda que el paper de 2001 de Acemoglu fue impugnado por Albouy (2012) y que no previó la IA agéntica.",
    efecto: { academia: -12, capital: -10, estado: -5, calle: -1, trabajo: -3, territorio: -2 } },
  { id: "encuesta", titular: "Heatmap News: la oposición local a centros de datos sube de 40% (ago. 2025) a 70% (mayo 2026). Más de 100 moratorias propuestas.",
    efecto: { calle: 13, territorio: 12, trabajo: 7, estado: 4, academia: 3, capital: -6 } },
  { id: "ipo", titular: "Las salidas a bolsa de OpenAI y Anthropic liberarían US$430 mil millones en donaciones: dos Planes Marshall sin urna.",
    efecto: { estado: 12, academia: 8, calle: 9, capital: -7, territorio: 5, trabajo: 4 } },
  { id: "abundancia", titular: "Musk insiste: en un mundo de abundancia infinita el dinero se vuelve obsoleto, y su fortuna también.",
    efecto: { capital: 10, calle: -8, territorio: -6, trabajo: -5, academia: -2, estado: -4 } }
];

/* --- Bancadas -------------------------------------------------------- */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "La dirección de la IA se elige.",
       integrantes: ["Valentina", "Matías", "Antonia", "Joaquín"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "La técnica y el mercado fijan el rumbo.",
       integrantes: ["Camilo", "Josefa", "Benjamín", "Isidora"] }
};
