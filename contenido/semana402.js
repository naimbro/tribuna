/* =====================================================================
   TRIBUNA — contenido de una sesión.
   Doctorado en Procesos e Instituciones Políticas (UAI) · Usos de la IA en
   Investigación Académica · Clase 2. Jueves 24 de septiembre de 2026, ~12:00.
   Tres doctorandos en ciencia política, desde el teléfono.

   Material (naimbro.github.io/materiales/2026_ai_research):
   1) Las dos lecturas, leídas en sala e impresas: Mollick, «The twilight of the
      chatbots» (30 jun. 2026), y Karpf, «What comes next, if Claude Code is as
      good as people say» (15 ene. 2026), que cita a Farrell, Evans y Gunitsky.
   2) El bloque 1 de la mañana: usaron un agente (Codex) por primera vez.
   3) El deck «Seis carpetas» (sin cifras: sirve de ejemplo, no de dato).
   Todo concepto, evento y pregunta está anclado en
   tribuna_clase02_knowledge_base.md. Ninguna cifra que no esté ahí.

   Modo de juego: clase en rotación con brújula y 3 grupos (SESION.grupos). Con
   tres alumnos, formarGruposEnK arma tres grupos de uno: cada debate enfrenta a
   los dos más lejanos del mapa y el tercero es el público. Se juegan dos debates.
   Con un solo espectador, el 🤔 y la frase del debate no se activan (piden 2).
   ===================================================================== */

const SESION = {
  curso: "Doctorado — Usos de la IA en Investigación Académica",
  semana: 402,
  tema: "¿Los agentes de IA mejoran la ciencia o solo a los científicos?",
  mocion: "Los agentes de IA van a mejorar la ciencia social, no solo las carreras de quienes la hacen.",
  grupos: 3,                // 3 doctorandos: 3 grupos de uno
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

/* --- Knowledge base: conceptos de la clase 2 --------------------------
   claves = detonantes textuales. Los textos están en inglés y los alumnos
   escriben en español: cada concepto lleva la frase del texto y su paráfrasis.
   (app.js compara sin tildes ni mayúsculas, por substring: nada de claves
   cortas que calcen dentro de otras palabras.)
   lado   = +1 apoya la moción (los agentes mejoran la ciencia social),
            -1 la debilita (mejoran carreras, no la ciencia), 0 sirve a ambos. */
const CONCEPTOS = [
  /* ---- Mollick, The twilight of the chatbots ---- */
  { id: "aceleracion", etiqueta: "Mejor que exponencial, y no lo sentimos desde adentro", lado: +1,
    fuente: "Mollick, The twilight of the chatbots: METR, AI Security Institute y GDPval; de un par de horas a 16 horas o más con un solo prompt",
    claves: ["better than exponential","mejor que exponencial","mas que exponencial","exponencial","exponential","metr ","ai security institute","gdpval","horas de programador","programmer hours","sixteen hours","16 horas","dieciseis horas","feeling exponentials","desde adentro","from the inside","una serie de shocks","a saltos"] },
  { id: "epoch_opus", etiqueta: "Epoch: Opus 4.7, 14 horas solo, 2 a 17 semanas de ingeniería, US$251", lado: +1,
    fuente: "Mollick, The twilight of the chatbots, citando a Epoch",
    claves: ["epoch","opus 4.7","opus","14 horas","14 hours","catorce horas","2 a 17 semanas","2-17 weeks","17 semanas","251","semanas de ingenieria","weeks of human engineering","9 horas","fable"] },
  { id: "frontera_irregular", etiqueta: "La frontera sigue irregular: débil en muchas cosas, y el juicio no se mide", lado: 0,
    fuente: "Mollick, The twilight of the chatbots: «the frontier stays jagged»; la simulación del puerto",
    claves: ["jagged","irregular","frontera irregular","dentada","weak in many places","debil en muchas","sigue siendo debil","puerto","harbor","juicio","judgement","judgment","dificiles de medir","hard-to-benchmark","benchmarks esconden","esconden la irregularidad"] },
  { id: "asignar_trabajo", etiqueta: "De conversar con chatbots a asignarles trabajo a agentes (harness, OpenAI)", lado: +1,
    fuente: "Mollick, The twilight of the chatbots: co-intelligence, harnesses, el estudio de OpenAI con economistas académicos",
    claves: ["co-intelligence","cointeligencia","co-inteligencia","assigning work","asignar trabajo","asignarles trabajo","harness","herramientas y un entorno","extra machinery","constant human intervention","intervencion humana constante","se corrigen solos","self-correcting","canary","canario","un cuarto","a quarter","cuatro agentes","four agents","recursos humanos","non-tech","no tecnicas","economistas academicos"] },
  { id: "expertise", etiqueta: "La expertise, no la profesión, predice el éxito: dirigir agentes como un gerente", lado: +1,
    fuente: "Mollick, The twilight of the chatbots: el estudio de usuarios de Claude Code",
    claves: ["expertise","experticia","domain experience","experiencia en el dominio","experiencia en el tema","conocimiento del tema","not the profession","no la profesion","no era la profesion","tasa de exito","success rate","usuarios de claude code","think of yourself as a manager","como un gerente","como gerente","manager","experts use agents","expertos usan agentes","non-experts","no expertos","fill in gaps","llenar vacios"] },
  { id: "instituciones_lentas", etiqueta: "Las instituciones van a la velocidad de las personas (o de los comités)", lado: 0,
    fuente: "Mollick, The twilight of the chatbots, cierre",
    claves: ["speed of people","velocidad de las personas","committees","comites","comite","the gap only widens","la brecha se agranda","la brecha solo crece","turbulencia","turbulence","inestabilidad","instability","no se va a estabilizar","curva que no es humana","not human in nature"] },

  /* ---- Karpf, What comes next (y lo que cita de Farrell, Evans y Gunitsky) ---- */
  { id: "no_lo_probo", etiqueta: "Karpf no ha probado Claude Code", lado: +1,
    fuente: "Karpf, What comes next: «I haven't tried out Claude Code yet»",
    claves: ["haven't tried","havent tried","not tried","no lo ha probado","no lo probo","no ha probado","nunca lo probo","nunca lo ha usado","no lo ha usado","no lo uso","sin haberlo usado","sin haberlo probado","sin probarlo","nosotros si lo usamos","nosotros lo usamos"] },
  { id: "startup_mollick", etiqueta: "El negocio de US$1.000 al mes de Mollick (500 prompts a US$39)", lado: -1,
    fuente: "Karpf, What comes next, citando a Mollick, «Claude Code and What Comes Next»",
    claves: ["1.000 al mes","1000 al mes","$1,000","1,000/month","1.000 dolares","mil dolares","500 prompts","39 dolares","us$39","$39","una hora y catorce","hour and fourteen","74 minutos","sketchy","fake marketing","marketing falso","promesas falsas","afirmaciones falsas","link de venta","startup","ingreso pasivo","passive income"] },
  { id: "novedad", etiqueta: "Primero la novedad, después la corrosión: el ciclo de los meses 1 a 5", lado: -1,
    fuente: "Karpf, What comes next: la predicción y la cronología de 20 años de internet",
    claves: ["novelty","novedad","efecto novedad","infinite sellers","vendedores infinitos","infinitos vendedores","compradores finitos","finite buyers","barreras","barriers","no es unico","not a unique","corrosion","corrosivo","corrosive","mes 1","mes 2","mes 3","mes 4","month 1","month 2","lather","rinse","repeat","ciclo del hype","hype cycle","the verge","wired","20 anos de internet","20 years of internet","mismas ideas","convergen"] },
  { id: "cientificos_vs_ciencia", etiqueta: "Bueno para los científicos, quizás no para la ciencia (Farrell)", lado: -1,
    fuente: "Karpf, What comes next, citando a Farrell: más papers, más citas, ascensos más rápidos; asociaciones, no efectos causales",
    claves: ["great for scientists","not so great for science","bueno para los cientificos","buena para los cientificos","no para la ciencia","para la ciencia como un todo","science as a whole","carreras","careers","mas papers","more papers","mas citas","more likely to be cited","ascensos","promoted","menos ayuda de otros","less help","asociaciones","associational","no causal","not causal","no son causales","correlacion"] },
  { id: "evans_achica", etiqueta: "La investigación con IA achica las preguntas (Evans y coautores)", lado: -1,
    fuente: "Karpf, What comes next, citando a Farrell (Evans y coautores, Nature)",
    claves: ["evans","shrink","achica","achicar","encoge","estrecha","smaller set","conjunto mas chico","preguntas de moda","topical questions","stretch boundaries","empujar los limites","ampliar las fronteras","horizontal","intercambio entre areas","menos intercambio"] },
  { id: "gunitsky_slop", etiqueta: "La era académica del AI slop: ciencia normal, Automatenwissenschaft (Gunitsky)", lado: -1,
    fuente: "Karpf, What comes next, citando a Farrell/Gunitsky, «The Academic Age of AI Slop Is Upon Us»",
    claves: ["gunitsky","slop","slop-plus","premium slop","automatenwissenschaft","normalwissenschaft","ciencia normal","normal science","kuhn","technically proficient","tecnicamente competente","competentes pero","adequate","poco originales","unoriginal","incremental"] },
  { id: "por_que_importa", etiqueta: "El árbitro deja de preguntar «¿está bien?» y pregunta «¿por qué importa?»", lado: 0,
    fuente: "Karpf, What comes next, citando a Farrell/Gunitsky: la revisión por pares",
    claves: ["why does this matter","por que importa","is this right","esta bien hecho","si esta bien","revision por pares","peer review","arbitro","arbitros","reviewers","editores","taste","discernment","discernimiento","cuello de botella","bottleneck","que preguntas vale la pena","which questions are important"] },
  { id: "busqueda_borracho", etiqueta: "La búsqueda del borracho: estudiar lo que el agente vuelve fácil (y la ciencia social empeora)", lado: -1,
    fuente: "Karpf, What comes next (y Farrell, la «genre-fication»)",
    claves: ["borracho","drunken search","farol","bajo la luz","las llaves","genre-fication","generificacion","facil de estudiar","easy to study","first-movers","first movers","second-movers","disciplina en crisis","discipline-in-crisis","se aleja de su objeto","object of study","will get worse","van a empeorar","va a empeorar","empeorar","digital futures","futuros digitales","academia es glacial","glacial"] },
  { id: "no_inevitable", etiqueta: "No es inevitable: el Autotune y las instituciones que hay que construir", lado: 0,
    fuente: "Karpf, What comes next, citando a Farrell (el cierre) y su propio cierre",
    claves: ["no es inevitable","not an inevitable","inevitable","autotune","auto-tune","musica pop","pop music","arc of history","arco de la historia","no se dobla","doesn't bend","esfuerzo colectivo","collective","construir instituciones","reforzar las instituciones","reinforce the institutions","bien comun","common good","intereses de la ciencia"] },

  /* ---- Lo que les pasó hoy ---- */
  { id: "codex_hoy", etiqueta: "Lo que hicieron hoy con Codex: el script con el error y los DOI", lado: 0,
    fuente: "Bloque 1 de hoy (Codex): contar_cargos.py y la verificación de citas",
    claves: ["codex","contar_cargos","contar cargos","el script","error plantado","celda del nombre","la columna del nombre","contaba el nombre","cero cargos","55 personas","maximo era 14","maximo 14","14 cargos","15 cargos","elites","1828","doi","citas inventadas","cita que no existe","referencia inventada","verificar las citas","verifique","esta manana","hoy en la manana","en el bloque 1"] }
];

/* --- Fuentes citables: detectarlas sube evidencia --------------------- */
// "metr " con espacio: sin él calza dentro de «parámetro» o «métrica».
const FUENTES = [
  "mollick", "karpf", "farrell", "gunitsky", "evans", "kuhn", "metr ", "ai security institute", "epoch", "gdpval",
  "aa-briefcase", "openai", "anthropic", "google", "claude code", "codex", "nature", "andy hall", "one useful thing",
  "substack", "twilight of the chatbots", "what comes next"
];

/* --- La audiencia: seis bloques, no una masa ------------------------- */
/* Las mismas seis personas de semana7.js (fuera del juego: las usan pruebas/simular.js y
   pruebas/escala.js). Solo cambia `mueve`, reasignado a los conceptos de esta clase. La sala
   abre 5–7 con 15 indecisos, como exige el README. */
const AUDIENCIA = [
  {
    id: "trabajo", nombre: "Camila Reyes", edad: 27, emoji: "\u{1F527}", color: "#22d3ee",
    oficio: "Ingeniera de turno en un centro de datos regional. Sindicalizada.",
    registro: "Hablas corto y concreto, desde el turno. Chilena, cero jerga académica.",
    no_mueve: "No te mueve que te expliquen la economía desde arriba: la competencia global, los mercados y los papers te suenan a excusa de gerencia. Tampoco la pura rabia sin propuesta: ya estuviste en muchas asambleas que no terminaron en nada. Y desconfías por igual del que promete que la empresa se va a portar bien sola y del que promete una ley que nunca llega.",
    bloque: "TRABAJO", votos: 5, pos: 16, volatilidad: 1.0, peso_rigor: 0.5,
    mueve: { codex_hoy: 1.3, asignar_trabajo: 1.2, novedad: 1.1, startup_mollick: 1.0, expertise: 0.9, no_inevitable: 0.9, instituciones_lentas: 0.8, frontera_irregular: 0.8 },
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
    mueve: { epoch_opus: 1.5, aceleracion: 1.3, novedad: 1.2, asignar_trabajo: 1.1, expertise: 1.0, instituciones_lentas: 0.8, cientificos_vs_ciencia: 0.7 },
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
    mueve: { instituciones_lentas: 1.4, no_inevitable: 1.4, por_que_importa: 1.1, cientificos_vs_ciencia: 1.0, frontera_irregular: 1.0, codex_hoy: 0.9 },
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
    mueve: { startup_mollick: 1.6, novedad: 1.4, no_lo_probo: 1.3, codex_hoy: 1.2, epoch_opus: 1.0, busqueda_borracho: 1.0 },
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
    mueve: { cientificos_vs_ciencia: 1.5, evans_achica: 1.4, gunitsky_slop: 1.3, frontera_irregular: 1.2, por_que_importa: 1.2, expertise: 1.1, busqueda_borracho: 1.0 },
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
    mueve: { codex_hoy: 1.3, busqueda_borracho: 1.2, no_lo_probo: 1.0, instituciones_lentas: 1.0, novedad: 0.9, startup_mollick: 0.9 },
    alergias: ["externalidad","optimizar","escalar","frontera tecnologica","frontera tecnológica"],
    voz: {
      alto: ["A nosotros nadie nos preguntó dónde ponerlo. Eso es decidir.", "El agua y la luz salieron de acá. Alguien eligió eso.", "Por fin alguien nombra el lugar."],
      bajo: ["Puro Santiago hablando.", "¿Y quién vive al lado de la bendita máquina?", "Eso no se lo digan a mi vecina."]
    }
  }
];

/* --- El panel de jueces de esta clase ----------------------------------
   El piso común va una sola vez, en JUECES_COMUN (jueces.js lo pone en el prompt de cada juez).
   Cada juez tiene un foco propio que no se pisa con el de los otros (ver semana7.js: con el
   criterio repetido en los cinco, las frases salían casi iguales). */
const JUECES_COMUN = "que citen un dato, un autor o una frase de uno de los dos textos (Mollick o Karpf, y lo que Karpf cita de Farrell, Evans y Gunitsky), o algo concreto que les pasó hoy con el agente, y que contesten lo que el rival dijo de verdad";
const JUECES = [
  { id: "metodologa", nombre: "La metodóloga", emoji: "\u{1F52C}",
    valora: "distinguir asociación de efecto causal (Farrell advierte que sus resultados son asociaciones), preguntar de dónde sale cada muestra (el estudio de OpenAI, los usuarios de Claude Code) y usar cada cifra con su tamaño exacto",
    molesta: "tratar una correlación como un efecto, y una predicción (los meses 1 a 5 de Karpf) como si fuera un dato" },
  { id: "editor", nombre: "El editor de revista", emoji: "\u{1F4DD}",
    valora: "una tesis que se entienda en una frase y que diga por qué importa antes que si está bien hecha: la pregunta que Gunitsky le pone al árbitro",
    molesta: "lo competente pero intrascendente: forma de paper sin pregunta, y la jerga que tapa que no hay tesis" },
  { id: "economista", nombre: "La economista de la ciencia", emoji: "\u{1F4C8}",
    valora: "los incentivos: quién gana con los agentes, el científico o la ciencia; los primeros contra los segundos en llegar; el efecto novedad y lo que cuesta de verdad (US$251 por 14 horas)",
    molesta: "moralizar sin decir qué premia la academia, y suponer que lo que le conviene a una carrera le conviene a la disciplina" },
  { id: "ingeniero", nombre: "El ingeniero", emoji: "\u{1F6E0}",
    valora: "saber qué hace de verdad un agente: el harness, las herramientas, la frontera irregular, y lo que vieron trabajar esta mañana (el error del script, los DOI que pidieron verificar)",
    molesta: "hablar del agente como magia o como amenaza sin haberlo visto trabajar, y confundir un chatbot con un agente" },
  { id: "historiadora", nombre: "La historiadora de la ciencia", emoji: "\u{1F4DC}",
    valora: "la perspectiva larga: Kuhn y la ciencia normal, los futuros digitales del pasado, la búsqueda del borracho y quién construye las instituciones",
    molesta: "el presentismo: creer que esta vez todo es nuevo, o que todo es igual a la última vez" }
];

/* Sin INSTRUMENTOS: la lámina de la intro (escenas.js) trae el título «EL INSTRUMENTO» y una
   bajada sobre el Estado escritos en el código, que en este curso no calzan. */

/* --- Sala de control: titulares que el profesor lanza en vivo ---------
   efecto > 0 mueve hacia A FAVOR (los agentes mejoran la ciencia); < 0 hacia EN CONTRA.
   Todos anclados en las dos lecturas.                                    */
const EVENTOS = [
  { id: "suspension", titular: "Gobiernos suspenden temporalmente el acceso a Claude Fable y GPT-5.6, dos de los modelos más potentes. (Mollick)",
    efecto: { estado: 4, academia: 2, calle: 3, capital: -4, trabajo: -2, territorio: -3 } },
  { id: "epoch", titular: "Epoch: Opus 4.7 trabaja solo 14 horas y construye un software de 2 a 17 semanas de ingeniería humana, por US$251. (Mollick)",
    efecto: { capital: 10, calle: 7, trabajo: 6, estado: 5, academia: 4, territorio: 3 } },
  { id: "openai", titular: "Un cuarto de los trabajadores de OpenAI tiene al menos cuatro agentes corriendo a la vez cada semana. (Mollick)",
    efecto: { capital: 8, trabajo: 5, calle: 5, estado: 4, academia: 2, territorio: 2 } },
  { id: "evans", titular: "Evans y coautores: la investigación con IA achica la ciencia a un conjunto más chico de preguntas de moda. (Karpf, citando a Farrell)",
    efecto: { academia: -10, estado: -6, territorio: -5, calle: -3, trabajo: -3, capital: -2 } },
  { id: "gunitsky", titular: "Gunitsky: llega la era académica del «AI slop». La ciencia normal pasa a ser Automatenwissenschaft. (Karpf, citando a Farrell)",
    efecto: { academia: -8, calle: -6, estado: -4, territorio: -4, trabajo: -3, capital: -2 } }
];

/* --- Bancadas -------------------------------------------------------- */
const EQUIPOS = {
  A: { id: "A", nombre: "A FAVOR", bandera: "\u{1F7E6}", color: "#38bdf8", dir: 1,
       lema: "El agente multiplica al experto.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] },
  B: { id: "B", nombre: "EN CONTRA", bandera: "\u{1F7E5}", color: "#fb7185", dir: -1,
       lema: "Buena para los científicos, no para la ciencia.",
       integrantes: ["Redactor", "Verificador", "Estratega de sala", "Lector del rival"] }
};

/* --- Ejemplos: una bancada efectista y otra de manual ----------------
   Los carga el botón «rellenar con ejemplo» y los usan pruebas/simular.js y
   pruebas/escala.js. A FAVOR abre con arenga (rigor bajo), EN CONTRA con
   manual (rigor alto). Las refutaciones contestan a ESTAS aperturas: si se
   cambia una, hay que reescribir la que le responde. */
const EJEMPLOS_SESION = {
  apertura: {
    A: `Esto ya pasó. Los agentes trabajan horas solos, construyen software completo y cada mes son mejores: es imparable, y el que no lo vea se va a quedar atrás. Karpf escribe desde el miedo, como todos los que llegaron tarde a internet. Todos sabemos que cada tecnología nueva tuvo sus profetas del apocalipsis, y la ciencia siguió avanzando igual. ¿De verdad vamos a creer que una herramienta que multiplica lo que sabemos va a empeorar la ciencia política? Es obvio que no. El que no se suba ahora va a seguir haciendo a mano lo que el resto hace en una tarde. La ciencia social va a ser mejor porque vamos a poder hacer más, más rápido y mejor. Punto.`,
    B: `Nuestra tesis es que los agentes van a mejorar las carreras de los científicos sociales más que la ciencia social, y que esa diferencia es la moción entera. Primero, Farrell, citado por Karpf: a quienes usan IA les va mejor —más papers, más citas, ascensos más rápidos—, aunque él mismo advierte que son asociaciones y no efectos causales. Segundo, Evans y sus coautores encuentran que la investigación con IA «tends to shrink scientific inquiry to a smaller set of more topical questions», con menos intercambio horizontal entre áreas. Tercero, Gunitsky anticipa papers técnicamente competentes pero poco originales, lo que Kuhn llamó ciencia normal: Automatenwissenschaft. Karpf lo resume con la búsqueda del borracho: vamos a estudiar lo que Claude Code vuelve fácil de estudiar. Concedemos el mejor punto de Mollick: en el estudio de usuarios de Claude Code, lo que predijo el éxito fue la expertise en el dominio, no la profesión. Sostenemos que eso mejora al investigador y no necesariamente a la disciplina: si todos los expertos dirigen agentes hacia las preguntas que el agente resuelve bien, la disciplina se estrecha igual.`
  },
  refutacion: {
    // A contesta los tres pasos de B: carreras (Farrell), preguntas más chicas (Evans), ciencia normal (Gunitsky).
    A: `La bancada contraria dice tres cosas: que a los que usan IA les va mejor en la carrera, que la investigación con IA achica las preguntas, y que lo que viene es ciencia normal. Concedo lo segundo como riesgo real: Evans y sus coautores lo miden y no lo descarto. Pero, primero, el propio Farrell dice que sus resultados son asociaciones, no efectos: no sabemos si la IA achica la ciencia o si quienes ya hacían preguntas de moda la adoptaron antes. Segundo, la ciencia normal no es un insulto: Gunitsky mismo dice que es trabajo incremental legítimo, y es la mayor parte de lo que hace cualquier disciplina. Tercero, Karpf escribe «I haven't tried out Claude Code yet»; nosotros lo usamos esta mañana. Le pedimos a Codex que explicara el error de contar_cargos.py antes de tocarlo: contaba la celda del nombre como si fuera un cargo, y el máximo real era 14, no 15, con 55 personas sin cargos. Un dato corregido es mejor ciencia, no una mejor carrera.`,
    // B contesta la arenga de A: «imparable», «Karpf escribe desde el miedo», «más rápido es mejor».
    B: `La apertura contraria sostiene que los agentes son imparables, que Karpf escribe desde el miedo y que hacer más y más rápido es hacer mejor ciencia. Concedemos lo primero en su versión seria: Mollick muestra que Opus 4.7 trabajó solo 14 horas y construyó un software de 2 a 17 semanas de ingeniería humana, por US$251. La capacidad no está en duda; Karpf mismo parte suponiendo que Mollick tiene razón. Pero, primero, el argumento de Karpf es sobre incentivos, no sobre miedo: el efecto novedad ocurre justamente porque la herramienta le funciona a todos por igual, y entonces habrá «infinite sellers and extremely finite buyers». Segundo, «más, más rápido» es exactamente lo que describe Farrell: más papers, más citas y ascensos para el científico, sin que eso pruebe nada sobre la ciencia. Tercero, «todos sabemos» no es una fuente: la apertura no citó un solo dato de las lecturas.`
  },
  cierre: {
    A: `El desacuerdo de fondo es si el agente trabaja para el experto o el experto para el agente. Mollick muestra que lo que predice el éxito es la expertise en el dominio, no la profesión, y Farrell mismo cierra diciendo que el achicamiento no es inevitable: el Autotune también se usó de formas raras e interesantes. Si el investigador dirige al agente como un gerente y verifica lo que entrega, lo que mejora es la ciencia.`,
    B: `El punto de desacuerdo es quién decide qué se estudia. Ellos hablan de lo que un investigador puede hacer con un agente; nosotros, de lo que hace la disciplina cuando todos tienen el mismo. Los primeros ganan cargos, los segundos copian, y la ciencia política se aleja de su objeto. Por eso Karpf pide construir instituciones: la historia no se dobla sola hacia ningún lado.`
  }
};

/* --- Preguntas escritas por el profesor -------------------------------
   Una sola, para el primer debate: las escritas salen antes que las de la moderadora (clase.js,
   prepararPropuesta) y con dos debates la moderadora nunca escribiría la suya. El segundo
   debate lo escribe ella con el jurado LLM, sobre lo que separa a ese par. `afirma` es el campo
   de la brújula que sostiene la moción: A FAVOR le toca al grupo del par más cercano a ese campo.

   De reserva, para pegar con «escribe la suya» si el motor LLM cae al heurístico:
   - «El mayor riesgo de los agentes para la ciencia política son los errores que nadie revisa,
     no que todos terminen haciendo las mismas preguntas.»  → A FAVOR: amplia_si_verifica
   - «Un doctorando que empieza a usar agentes en 2026 ya llega tarde: la ventaja fue de los
     primeros.»  → A FAVOR: ciencia_normal
   - «Si cualquiera puede producir un paper empírico competente, las revistas deben juzgar
     primero "por qué importa" y después "si está bien hecho".»  → A FAVOR: disciplina_en_crisis */
const PREGUNTAS = [
  { texto: "En la era de los agentes, lo que distingue a un buen investigador es su expertise en el tema, no el dominio de la herramienta.", afirma: "manos_a_la_obra" }
];

/* --- Brújula corta ------------------------------------------------------
   Seis preguntas, tres por eje, con las reglas de semana7.js: enunciados de ≤ 120 caracteres y
   opciones de ≤ 50, para que se responda en un minuto en el teléfono. Cada pregunta está anclada
   en una lectura o en el bloque 1; ninguna opción es «la correcta».

   x — ¿Qué le hacen los agentes a la investigación? La amplían (−, Mollick) ↔ la achican
       (+, Karpf, Farrell, Evans).
   y — Cómo te deja: entusiasmo (−) ↔ preocupación (+). En la sala 42RT de MGT300 fue el eje
       que sí separó a la gente; acá además se ancla en lo que les pasó esta mañana. */
const BRUJULA = {
  ejes: {
    x: { id: "investigacion", etiqueta: "¿Qué le hacen los agentes a la investigación?", min: "la amplían", max: "la achican" },
    y: { id: "animo", etiqueta: "Cómo te deja", min: "entusiasmo", max: "preocupación" }
  },
  preguntas: [
    { id: "x1", texto: "Mollick: la expertise, no la profesión, predice el éxito con agentes. ¿Qué gana un doctorando?",
      opciones: [
        { texto: "Todo: su expertise se multiplica", x: -8 },
        { texto: "Tiempo para las preguntas difíciles", x: -3 },
        { texto: "Papers, no necesariamente ciencia", x: 3 },
        { texto: "Nada que no ganen todos", x: 8 }] },
    { id: "y1", texto: "Esta mañana usaste un agente por primera vez. ¿Qué sentiste?",
      opciones: [
        { texto: "Ganas de usarlo ya en mi tesis", y: -8 },
        { texto: "Curiosidad, con cautela", y: -3 },
        { texto: "Incomodidad: no sé si confiarle", y: 3 },
        { texto: "Inquietud por lo que viene", y: 8 }] },
    { id: "x2", texto: "Farrell: la IA es buena para los científicos, quizás no para la ciencia. ¿Tú qué crees?",
      opciones: [
        { texto: "Es buena para los dos", x: -8 },
        { texto: "Más buena que mala para la ciencia", x: -3 },
        { texto: "Buena para carreras, neutra para la ciencia", x: 3 },
        { texto: "Mala para la ciencia", x: 8 }] },
    { id: "y2", texto: "Mollick: un agente hace en 14 horas el trabajo de semanas. Leyendo eso…",
      opciones: [
        { texto: "Me entusiasma", y: -8 },
        { texto: "Me interesa", y: -3 },
        { texto: "Me inquieta", y: 3 },
        { texto: "Me preocupa mucho", y: 8 }] },
    { id: "x3", texto: "Evans y coautores: la investigación con IA achica las preguntas. En tu disciplina, eso…",
      opciones: [
        { texto: "Es falso: abre preguntas nuevas", x: -8 },
        { texto: "Es un riesgo evitable", x: -3 },
        { texto: "Es probable en lo cuantitativo", x: 3 },
        { texto: "Ya está pasando", x: 8 }] },
    { id: "y3", texto: "Karpf predice que las ciencias sociales van a empeorar. ¿Cómo te deja?",
      opciones: [
        { texto: "Exagera, y no me afecta", y: -8 },
        { texto: "Exagera, pero lo anoto", y: -3 },
        { texto: "Tiene un punto que me pesa", y: 3 },
        { texto: "Me preocupa de verdad", y: 8 }] }
  ],
  campos: [
    { id: "manos_a_la_obra", nombre: "Manos a la obra", centro: { x: -6, y: -5 }, color: "#34d399",
      afirma: "Los agentes multiplican al experto: el doctorando que aprende hoy a dirigirlos va a hacer mejor ciencia, no solo más papers." },
    { id: "amplia_si_verifica", nombre: "Amplía, si se verifica", centro: { x: -6, y: 5 }, color: "#38bdf8",
      afirma: "Los agentes pueden ampliar la investigación, pero el riesgo no es la herramienta: es confiarle sin revisar lo que entrega." },
    { id: "ciencia_normal", nombre: "Es ciencia normal", centro: { x: 6, y: -5 }, color: "#fb7185",
      afirma: "Los agentes premian carreras más que descubrimientos, y no es una tragedia: la ciencia normal siempre fue la mayor parte del trabajo." },
    { id: "disciplina_en_crisis", nombre: "Disciplina en crisis", centro: { x: 6, y: 5 }, color: "#f59e0b",
      afirma: "Si todos usan agentes, todos van a estudiar lo que el agente vuelve fácil de estudiar, y la ciencia política se va a alejar de su objeto." }
  ]
};
