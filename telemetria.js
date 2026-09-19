/* =====================================================================
   TRIBUNA — telemetría de escritura (antitrampa, como en ml2).
   El teléfono registra cómo se escribió cada mensaje: pegados, salidas de la app, inserciones
   de golpe y velocidad. Aquí, funciones puras que convierten ese registro en señales legibles
   para el panel del profesor.

   REGLA QUE MANDA: nada de esto entra en un puntaje, en el ranking ni en los jueces. Es un
   registro descriptivo para que el profesor juzgue; nunca una sanción automática.
   ===================================================================== */

const UMBRAL_TELEMETRIA = {
  PEGADO: 80,          // caracteres: menos que eso es una palabra o una cita corta
  INSERCION: 80,       // caracteres que aparecen de una vez sin evento de pegado (teclados de Android, dictado)
  VELOCIDAD: 12,       // caracteres por segundo sostenidos: más rápido que tipear en un teléfono
  LARGO_VELOCIDAD: 100 // la velocidad solo se mira en mensajes largos
};

function senalesMensaje(t) {
  const s = [];
  const maxPegado = Math.max(0, ...(t.pegados || []).map(p => p.chars || 0));
  if (maxPegado >= UMBRAL_TELEMETRIA.PEGADO) s.push(`pegó ${maxPegado} caracteres`);
  else if ((t.maxInsercion || 0) >= UMBRAL_TELEMETRIA.INSERCION) s.push(`insertó ${t.maxInsercion} caracteres de golpe`);
  if (t.salidas > 0) s.push(`salió de la app ${t.salidas} ${t.salidas === 1 ? "vez" : "veces"} (${Math.round((t.msFuera || 0) / 1000)} s)`);
  const seg = (t.msComposicion || 0) / 1000;
  const yaEntroDeGolpe = s.some(x => x.startsWith("pegó") || x.startsWith("insertó"));   // la velocidad sería el mismo hecho
  if (!yaEntroDeGolpe && (t.largoFinal || 0) >= UMBRAL_TELEMETRIA.LARGO_VELOCIDAD && seg > 0 && t.largoFinal / seg > UMBRAL_TELEMETRIA.VELOCIDAD)
    s.push(`escribió ${t.largoFinal} caracteres en ${Math.round(seg)} s`);
  return s;
}

// Un resumen por alumno, con las señales de cada mensaje. Primero quienes tienen más señales.
function resumenTelemetria(registros) {
  const por = new Map();
  for (const t of registros || []) {
    const x = por.get(t.uid) || { uid: t.uid, nombre: t.nombre || "", grupo: t.grupo || 0, mensajes: 0, charsPegados: 0, salidas: 0, msFuera: 0, maxInsercion: 0, senales: [], porMensaje: [] };
    const sen = senalesMensaje(t);
    x.mensajes++;
    x.charsPegados += (t.pegados || []).reduce((a, p) => a + (p.chars || 0), 0);
    x.salidas += t.salidas || 0;
    x.msFuera += t.msFuera || 0;
    x.maxInsercion = Math.max(x.maxInsercion, t.maxInsercion || 0);
    x.porMensaje.push({ debate: t.debate, largo: t.largoFinal || 0, senales: sen });
    for (const z of sen) x.senales.push(`debate ${t.debate}: ${z}`);
    por.set(t.uid, x);
  }
  return [...por.values()].sort((a, b) => b.senales.length - a.senales.length || String(a.nombre).localeCompare(String(b.nombre)));
}

if (typeof module !== "undefined") module.exports = { UMBRAL_TELEMETRIA, senalesMensaje, resumenTelemetria };
