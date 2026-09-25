/* =====================================================================
   TRIBUNA — el ritmo de la moderadora: cuándo entra, a quién puede nombrar y qué no repetir.
   Lógica pura (sin DOM ni Firestore), probada con Node (pruebas/ritmo.test.js).

   Lo que corrige (clase del 22-sep-2026, sala 42RT): la moderadora escribió tres veces seguidas
   el mismo mensaje a alguien que no contestaba, insistió con una alumna que no estaba y preguntó
   «¿de qué lectura sale eso?» a cada mensaje. Reglas:
   - No interrumpe: si alguien acaba de escribir, espera a que la conversación respire.
   - Si nadie le contesta, vuelve a entrar cada vez más espaciado, y nunca con el mismo mensaje.
   - Le habla a los GRUPOS. A una persona la nombra solo si lleva rato sin escribir nada (o si
     esa persona le habló a ella), y no insiste: dos llamados sin respuesta y la da por ausente.
   ===================================================================== */

const RITMO = {
  RESPIRO: 8000,        // si alguien escribió hace menos de esto, no interrumpe
  PAUSA_MIN: 25000,     // entre dos intervenciones suyas, como mínimo
  PAUSA_TRAS: 15000,    // con 1-2 mensajes nuevos, espera este silencio antes de entrar
  SILENCIO: 45000,      // nadie escribe desde su última intervención: vuelve a entrar (45 s, 90 s, 135 s…)
  MAX_SIN_RESPUESTA: 3, // tras tres intervenciones seguidas sin respuesta, calla hasta que alguien escriba
  NOMBRAR_TRAS: 120000, // a una persona que no ha escrito se la puede nombrar pasados 2 minutos del debate
  ENFRIAR: 150000,      // a quien nombró sin respuesta no lo vuelve a nombrar antes de 2,5 minutos
  AUSENTE_TRAS: 2       // nombrada dos veces sin responder: se da por ausente
};

const normRitmo = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

// ¿El texto nombra a esta persona (o a su grupo) con @? Con el nombre completo, o con el primer
// nombre si lo que sigue no es otro apellido: «@pablo concha» no nombra a Pablo Sandoval.
// alias: otros nombres del grupo, ya normalizados (con personajes, «huang» y «jensen huang»).
function mencionaA(texto, nombre, grupo, alias = []) {
  const t = normRitmo(texto), mi = normRitmo(nombre);
  if (grupo && new RegExp(`@grupo ${grupo}(?!\\d)`).test(t)) return true;
  // los alias salen de aliasGrupo (rotacion.js): letras y espacios, sin caracteres de regex
  for (const a of alias || []) if (a && new RegExp(`@${a}(?![a-zñ0-9])`).test(t)) return true;
  if (!mi) return false;
  if (t.includes("@" + mi)) return true;
  const toks = mi.split(" "), primero = toks[0];
  if (primero.length < 3) return false;
  for (let i = t.indexOf("@" + primero); i >= 0; i = t.indexOf("@" + primero, i + 1)) {
    const resto = t.slice(i + 1 + primero.length);
    if (/^[a-zñ0-9]/.test(resto)) continue;               // «@pablito» no es «@pablo»
    const sig = (resto.match(/^ ([a-zñ]+)/) || [])[1];
    if (!sig) return true;                                // «@Pablo,» «@Pablo?»
    if (toks[1] && toks[1].startsWith(sig)) return true;   // «@pablo sandoval»
    if (!(otrosApellidos && otrosApellidos.has(sig))) return true;   // «@Pablo qué opinas»
  }
  return false;
}
// Los segundos nombres de la sala: con ellos «@pablo concha» deja de nombrar a Pablo Sandoval.
let otrosApellidos = null;
function cargarApellidos(nombres) {
  otrosApellidos = new Set((nombres || []).map(n => normRitmo(n).split(" ")[1]).filter(Boolean));
}

// ¿Un alumno avisó que otro no está? («@Consuelo no está», «consuelo se fue»)
const AVISO_AUSENTE = /\b(no esta|no estan|se fue|salio|no vino|ausente|no se encuentra|no esta conectad)/;
function avisaAusencia(texto, nombre) {
  const t = normRitmo(texto), primero = normRitmo(nombre).split(" ")[0];
  return primero.length >= 3 && AVISO_AUSENTE.test(t) && t.includes(primero);
}

// Lo que pasó en el tramo, por persona. msgs: solo los del debate en curso, en orden.
// roster: [{nombre, equipo, grupo}] de quienes debaten ahora.
function leerTramo(msgs, roster, ahora) {
  const por = new Map();
  for (const r of roster || []) por.set(r.nombre, { nombre: r.nombre, equipo: r.equipo, grupo: r.grupo || 0,
    n: 0, ultimo: 0, llamadas: 0, sinResponder: 0, ultimaLlamada: 0, ausente: false, verificado: false });
  const alumno = m => {
    let p = por.get(m.nombre);
    if (!p) { p = { nombre: m.nombre, equipo: m.equipo, grupo: m.grupo || 0, n: 0, ultimo: 0, llamadas: 0, sinResponder: 0, ultimaLlamada: 0, ausente: false, verificado: false }; por.set(m.nombre, p); }
    return p;
  };
  let ultimoAlumno = 0, ultimaMod = 0, nuevos = 0, modSeguidas = 0;
  const ultimasMod = [];
  for (const m of msgs || []) {
    if (m.tipo === "alumno") {
      const p = alumno(m);
      p.n++; p.ultimo = m.t; p.sinResponder = 0; p.ausente = false;
      ultimoAlumno = m.t; nuevos++; modSeguidas = 0;
      for (const q of por.values()) if (q !== p && avisaAusencia(m.texto, q.nombre)) q.ausente = true;
    } else if (m.tipo === "mod") {
      ultimaMod = m.t; nuevos = 0; modSeguidas++;
      ultimasMod.push(m.texto);
      for (const q of por.values()) if (mencionaA(m.texto, q.nombre)) {
        q.llamadas++; q.sinResponder++; q.ultimaLlamada = m.t;
        if (/de (que|donde) (lectura|texto|autor)|de donde sale|nombra el autor/.test(normRitmo(m.texto))) q.verificado = true;
        if (q.sinResponder >= RITMO.AUSENTE_TRAS) q.ausente = true;
      }
    }
  }
  return { alumnos: [...por.values()], ultimoAlumno, ultimaMod, nuevos, modSeguidas, ultimasMod: ultimasMod.slice(-6) };
}

// ¿Entra ahora? abre: cuándo empezó el tramo. forzar: el profesor pulsó 🎙 o le escribieron a ella.
function debeIntervenir(estado, { ahora, abre, forzar = false }) {
  if (forzar) return { toca: true, motivo: "pedido" };
  const desdeMod = ahora - (estado.ultimaMod || abre);
  if (estado.ultimoAlumno && ahora - estado.ultimoAlumno < RITMO.RESPIRO) return { toca: false, motivo: "conversan" };
  if (desdeMod < RITMO.PAUSA_MIN) return { toca: false, motivo: "recien" };
  if (estado.nuevos >= 3) return { toca: true, motivo: "avanzo" };
  if (estado.nuevos >= 1) return ahora - estado.ultimoAlumno >= RITMO.PAUSA_TRAS ? { toca: true, motivo: "quedo_en_el_aire" } : { toca: false, motivo: "espera" };
  // silencio: nadie ha escrito desde su última intervención
  if (estado.modSeguidas >= RITMO.MAX_SIN_RESPUESTA) return { toca: false, motivo: "espera_respuesta" };
  return desdeMod >= RITMO.SILENCIO * Math.max(1, estado.modSeguidas) ? { toca: true, motivo: "silencio" } : { toca: false, motivo: "espera" };
}

// A quién puede nombrar con @: quien no ha escrito nada pasados 2 minutos, no está ausente y no
// fue llamado hace poco. Al resto, se le habla por su grupo.
function nombrables(estado, { ahora, abre }) {
  if (ahora - abre < RITMO.NOMBRAR_TRAS) return [];
  return estado.alumnos.filter(p => p.n === 0 && !p.ausente && (!p.ultimaLlamada || ahora - p.ultimaLlamada >= RITMO.ENFRIAR));
}

// ¿Ya dijo algo casi igual en este debate? (misma pregunta con otras palabras de relleno)
function esRepetida(texto, previas) {
  const bolsa = t => new Set(normRitmo(t).replace(/@[\w.-]+( [\w.-]+)?/g, " ").split(/[^a-zñ0-9]+/).filter(w => w.length > 3));
  const a = bolsa(texto);
  if (!a.size) return false;
  return (previas || []).some(p => {
    const b = bolsa(p);
    const comun = [...a].filter(w => b.has(w)).length;
    return comun / Math.min(a.size, b.size || 1) >= 0.7;
  });
}

if (typeof module !== "undefined") module.exports = { RITMO, mencionaA, cargarApellidos, avisaAusencia, leerTramo, debeIntervenir, nombrables, esRepetida };
