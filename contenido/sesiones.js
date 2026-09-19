/* Sesiones disponibles. Cada una es un archivo contenido/semana<N>.js con el mismo esqueleto
   (SESION, RONDAS, RUBRICA, CONCEPTOS, FUENTES, AUDIENCIA, EVENTOS, EQUIPOS). Se elige con
   index.html?semana=<N>; sin parámetro carga la primera. */
// `curso` agrupa las partidas en el panel del profesor (admin.html); debe coincidir con
// SESION.curso del archivo de la semana.
const CSC00155 = "CSC00155 — Inteligencia Artificial y Democracia";
const SESIONES = [
  { semana: 5, tema: "Populismo y oligarquía de la IA", curso: CSC00155 },
  { semana: 7, tema: "¿Quién debe gobernar la IA?", curso: CSC00155 }
];
