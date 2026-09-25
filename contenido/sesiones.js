/* Sesiones disponibles. Cada una es un archivo contenido/semana<N>.js con el mismo esqueleto
   (SESION, RONDAS, RUBRICA, CONCEPTOS, FUENTES, AUDIENCIA, EVENTOS, EQUIPOS). Se elige con
   index.html?semana=<N>; sin parámetro carga la primera. */
// `curso` agrupa las partidas en el panel del profesor (admin.html); debe coincidir con
// SESION.curso del archivo de la semana.
// El número es el identificador del archivo, no el número de semana del programa: MGT300 usa
// la serie 30x para no chocar con las semanas de CSC00155 (307 = MGT300, clase 7; 308 = clase 8), y el doctorado
// la 40x (402 = Usos de la IA en Investigación Académica, clase 2).
const CSC00155 = "CSC00155 — Inteligencia Artificial y Democracia";
const MGT300 = "MGT300 — Sociedad, Cultura y Política";
const DOCTORADO_IA = "Doctorado — Usos de la IA en Investigación Académica";
const SESIONES = [
  { semana: 5, tema: "Populismo y oligarquía de la IA", curso: CSC00155 },
  { semana: 7, tema: "¿Quién debe gobernar la IA?", curso: CSC00155 },
  { semana: 307, tema: "Clase 7 · ¿Quién debe gobernar la IA? La ley chilena", curso: MGT300 },
  { semana: 308, tema: "Clase 8 · ¿Quién frena, quién paga? Seis personajes, tres duelos", curso: MGT300 },
  { semana: 402, tema: "Clase 2 · ¿Los agentes mejoran la ciencia o solo a los científicos?", curso: DOCTORADO_IA }
];
