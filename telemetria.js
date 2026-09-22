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

/* --- el reporte visual (como «Cómo se escribió» de ml2) ---------------------------------
   Por mensaje, qué parte del texto final llegó de una sola vez (pegado o inserción de golpe).
   Sobre la mitad se marca en rojo: es el umbral de ml2. Una rampa en la huella es alguien
   tipeando; un escalón que sube de golpe es un bloque que llegó entero. */
const UMBRAL_DE_GOLPE = 0.5;
const CORTO = 25;          // bajo esto un salto de una palabra ya es «la mitad»: no se clasifica

function proporcionDeGolpe(t) {
  const largo = t.largoFinal || 0;
  if (largo < CORTO) return null;
  const golpe = Math.max(t.maxInsercion || 0, ...(t.pegados || []).map(p => p.chars || 0));
  return Math.min(1, golpe / largo);
}
// "golpe" (rojo) · "escrito" (azul) · "corto" (gris: muy breve para decir algo)
function clasificarMensaje(t) {
  const p = proporcionDeGolpe(t);
  return p === null ? "corto" : p >= UMBRAL_DE_GOLPE ? "golpe" : "escrito";
}

// La huella como polilínea: una muestra del largo cada 2 s, y al final el largo enviado.
function puntosHuella(t, ancho, alto) {
  const h = [...(t.huella || []), t.largoFinal || 0];
  const max = Math.max(1, ...h), n = h.length;
  return h.map((v, i) => `${(n === 1 ? ancho : i / (n - 1) * ancho).toFixed(1)},${(alto - Math.max(0, v) / max * alto).toFixed(1)}`).join(" ");
}

const fmtDuracion = ms => { const s = Math.round((ms || 0) / 1000); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`; };

// Hechos, no juicios: lo que pasó mientras escribía ese mensaje.
function hechosMensaje(t) {
  const largo = t.largoFinal || 0, p = proporcionDeGolpe(t);
  const pegados = (t.pegados || []).filter(x => (x.chars || 0) > 0);
  const tipos = t.tipos || [];
  const out = [`Escribió ${largo} caracteres en ${fmtDuracion(t.msComposicion)}` +
    (t.msComposicion > 0 && largo >= 40 ? ` (${(largo / (t.msComposicion / 1000)).toFixed(1)} por segundo)` : "") + "."];
  out.push(`Mayor salto de una vez: ${t.maxInsercion || 0} caracteres${p !== null ? ` (${Math.round(p * 100)} % del texto)` : ""}.`);
  out.push(pegados.length ? `Pegó ${pegados.length} vez${pegados.length === 1 ? "" : "es"}: ${pegados.map(x => x.chars).join(", ")} caracteres.` : "No pegó nada.");
  if (tipos.includes("insertFromPaste") && !pegados.length) out.push("El teclado insertó texto del portapapeles (sin evento de pegado).");
  if (tipos.includes("insertFromDrop")) out.push("Arrastró texto a la caja.");
  out.push(t.salidas ? `Salió de la app ${t.salidas} ${t.salidas === 1 ? "vez" : "veces"}, ${fmtDuracion(t.msFuera)} en total.` : "No salió de la app.");
  return out;
}

if (typeof module !== "undefined") module.exports = { UMBRAL_TELEMETRIA, senalesMensaje, resumenTelemetria,
  UMBRAL_DE_GOLPE, proporcionDeGolpe, clasificarMensaje, puntosHuella, hechosMensaje };
