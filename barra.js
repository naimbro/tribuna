/* =====================================================================
   TRIBUNA — la barra de participación: cuánto ha alimentado cada grupo la conversación.
   Lógica pura (sin DOM ni Firestore), probada con Node (pruebas/barra.test.js).
   Spec: docs/superpowers/specs/2026-09-22-barra-de-participacion-design.md

   Cada integrante llena como máximo 1/N de la barra de su grupo (60 palabras en el debate):
   la barra solo llega a 100 % si escriben todos. Para que no convenga rellenar, un mensaje de
   menos de 3 palabras no cuenta, uno aporta a lo más 40 y repetir un texto no suma.
   No da puntos: solo celebra.
   ===================================================================== */

const BARRA = { META_PERSONA: 60, MAX_POR_MENSAJE: 40, MIN_PALABRAS: 3, AMBAR: 0.34, VERDE: 0.67 };
const normBarra = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
function palabrasQueCuentan(texto) {
  const n = (String(texto || "").replace(/@\S+/g, " ").match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
  return n < BARRA.MIN_PALABRAS ? 0 : Math.min(n, BARRA.MAX_POR_MENSAJE);
}
const claveBarra = x => x.uid || "nombre:" + normBarra(x.nombre);
function llenadoGrupo(msgs, integrantes) {
  const por = new Map();
  for (const i of integrantes || []) por.set(claveBarra(i), { clave: claveBarra(i), nombre: i.nombre || "?", palabras: 0, mensajes: 0, vistos: new Set() });
  for (const m of msgs || []) {
    if (m.tipo !== "alumno") continue;
    const p = por.get(claveBarra(m)), k = normBarra(m.texto);
    if (!p || p.vistos.has(k)) continue;
    p.vistos.add(k);
    const w = palabrasQueCuentan(m.texto);
    if (w) { p.palabras += w; p.mensajes++; }
  }
  const personas = [...por.values()].map(p => ({ clave: p.clave, nombre: p.nombre, palabras: p.palabras, pct: Math.min(1, p.palabras / BARRA.META_PERSONA), escribio: p.mensajes > 0 }));
  const pct = personas.length ? personas.reduce((a, p) => a + p.pct, 0) / personas.length : 0;
  return { pct, personas, todos: personas.length > 0 && personas.every(p => p.escribio) };
}
const colorBarra = pct => pct >= 1 - 1e-9 ? "lleno" : pct >= BARRA.VERDE ? "verde" : pct >= BARRA.AMBAR ? "ambar" : "rojo";
function hitosNuevos(antes, ahora) {
  if (!antes) return [];
  const h = [];
  if (antes.pct < 0.5 && ahora.pct >= 0.5) h.push({ tipo: "mitad" });
  if (antes.pct < 1 - 1e-9 && ahora.pct >= 1 - 1e-9) h.push({ tipo: "lleno" });
  if (!antes.todos && ahora.todos) h.push({ tipo: "todos" });
  for (const p of ahora.personas) {
    const a = antes.personas.find(x => x.clave === p.clave);
    if (p.pct >= 1 && !(a && a.pct >= 1)) h.push({ tipo: "parte", clave: p.clave, nombre: p.nombre });
  }
  return h;
}
if (typeof module !== "undefined") module.exports = { BARRA, palabrasQueCuentan, claveBarra, llenadoGrupo, colorBarra, hitosNuevos };
