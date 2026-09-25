// Prueba de firestore.rules contra el emulador de Firestore: el cupo por personaje (semana 308), el
// orden de llegada (dos que tocan el último lugar a la vez), que las salas sin personajes sigan como
// antes y que un mensaje de alumno solo entre con un id como el que arma el teléfono. No corre con `node --test pruebas/`: necesita el emulador y dos paquetes que el repo no trae.
//
//   cd /tmp && mkdir reglas && cd reglas && npm i @firebase/rules-unit-testing@4 firebase@11
//   cd <repo> && NODE_PATH=/tmp/reglas/node_modules \
//     firebase emulators:exec --only firestore --project demo-tribuna "node pruebas/reglas-emulador.cjs"
//
// Con un emulador que ya está corriendo en 8080, basta NODE_PATH=… node pruebas/reglas-emulador.cjs;
// REGLAS_PROYECTO elige otro proyecto (demo-…) para no pisar las reglas ni los datos de otra prueba.
// Resultado del 25-sep-2026: 27 de 27, y en 20 salas con un solo lugar libre entró exactamente uno.
const { initializeTestEnvironment, assertSucceeds, assertFails } = require("@firebase/rules-unit-testing");
const { doc, setDoc, getDoc, writeBatch, deleteField, FieldPath } = require("firebase/firestore");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
const env = await initializeTestEnvironment({
  projectId: process.env.REGLAS_PROYECTO || "demo-tribuna",
  firestore: { rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8"), host: "127.0.0.1", port: 8080 }
});

const PERS = ["huang", "amodei", "hawley", "altman", "sanders", "musk"].map((id, i) => ({ n: i + 1, id, nombre: id, corto: id }));
const email = u => `${u}@uai.cl`;
const ctx = u => env.authenticatedContext(u, { email: email(u), email_verified: true }).firestore();
const profe = () => env.authenticatedContext("profe", { email: "naim.bro@gmail.com", email_verified: true }).firestore();

let ok = 0, mal = 0;
async function caso(nombre, fn) {
  try { await fn(); ok++; console.log("  ✓", nombre); }
  catch (e) { mal++; console.log("  ✗", nombre, "—", e.message); }
}

async function sembrar(codigo, { personajes = true, cupo = 2, inscripcion = "abierta", etapa = "portada", alumnos = ["a", "b", "c", "d"] } = {}) {
  await env.withSecurityRulesDisabled(async c => {
    const db = c.firestore();
    const sala = { profeUid: "profe", modo: "rotacion", etapa, fase: "propuesta", debate: null };
    if (personajes) Object.assign(sala, { personajes: PERS, cupo, inscripcion });
    await setDoc(doc(db, "salas", codigo), sala);
    if (personajes) for (const p of PERS) await setDoc(doc(db, "salas", codigo, "cupos", String(p.n)), { miembros: {} });
    for (const u of alumnos) await setDoc(doc(db, "salas", codigo, "jugadores", u), { nombre: u.toUpperCase(), email: email(u), grupo: 0, equipo: "", unido: 1 });
  });
}
const actualizarSala = (codigo, cambios) => env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), "salas", codigo), cambios, { merge: true }));
async function leer(codigo, ...ruta) {
  let x; await env.withSecurityRulesDisabled(async c => { x = (await getDoc(doc(c.firestore(), "salas", codigo, ...ruta))).data(); }); return x;
}

// Lo mismo que hace el teléfono (jugar.js, elegirPersonaje)
function lote(db, codigo, u, g, antes = 0, { tocarCupo = true, quitarAntes = true } = {}) {
  const b = writeBatch(db);
  if (tocarCupo) b.update(doc(db, "salas", codigo, "cupos", String(g)), new FieldPath("miembros", u), true);
  if (antes > 0 && quitarAntes) b.update(doc(db, "salas", codigo, "cupos", String(antes)), new FieldPath("miembros", u), deleteField());
  b.set(doc(db, "salas", codigo, "jugadores", u), { nombre: u.toUpperCase(), email: email(u), foto: "", grupo: g, equipo: "" }, { merge: true });
  return b.commit();
}

console.log("Sala con personajes (cupo 2):");
await sembrar("P001");
await caso("un alumno elige un personaje con cupo", () => assertSucceeds(lote(ctx("a"), "P001", "a", 1)));
await caso("queda inscrito en el cupo", async () => { const c = await leer("P001", "cupos", "1"); if (!c.miembros.a) throw new Error(JSON.stringify(c)); });
await caso("no puede cambiar su grupo sin pasar por el cupo", () => assertFails(setDoc(doc(ctx("a"), "salas", "P001", "jugadores", "a"), { nombre: "A", email: email("a"), grupo: 2 }, { merge: true })));
await caso("no puede agregarse a otro cupo sin cambiar su grupo", () => { const db = ctx("a"); return assertFails(writeBatch(db).update(doc(db, "salas", "P001", "cupos", "3"), new FieldPath("miembros", "a"), true).commit()); });
await caso("no puede quedarse en dos cupos (cambia sin salir del anterior)", () => assertFails(lote(ctx("a"), "P001", "a", 2, 1, { quitarAntes: false })));
await caso("no puede sacar a otro del cupo", async () => { await lote(ctx("a"), "P001", "a", 1, 2); const db = ctx("b"); await assertFails(writeBatch(db).update(doc(db, "salas", "P001", "cupos", "1"), new FieldPath("miembros", "a"), deleteField()).commit()); await lote(ctx("a"), "P001", "a", 2, 1); });
await caso("cambia de personaje: entra al nuevo y sale del anterior", async () => { await lote(ctx("a"), "P001", "a", 1, 2); await assertSucceeds(lote(ctx("a"), "P001", "a", 2, 1)); });
await caso("el anterior ya no lo tiene", async () => { const c = await leer("P001", "cupos", "1"); if (c.miembros.a) throw new Error(JSON.stringify(c)); });
await caso("la ficha se sigue actualizando sin tocar el grupo (escribe, nombre)", () => assertSucceeds(setDoc(doc(ctx("a"), "salas", "P001", "jugadores", "a"), { nombre: "A", email: email("a"), escribe: { debate: 1, t: 5 } }, { merge: true })));
await caso("un alumno nuevo crea su ficha con grupo 0", () => assertSucceeds(setDoc(doc(ctx("e"), "salas", "P001", "jugadores", "e"), { nombre: "E", email: email("e"), foto: "", grupo: 0, equipo: "", unido: 2 })));
await caso("pero no puede crearla ya con personaje sin cupo", () => assertFails(setDoc(doc(ctx("f"), "salas", "P001", "jugadores", "f"), { nombre: "F", email: email("f"), grupo: 3, equipo: "" })));
await caso("b llena el cupo de Amodei (2/2)", () => assertSucceeds(lote(ctx("b"), "P001", "b", 2)));
await caso("c no entra a un personaje lleno", () => assertFails(lote(ctx("c"), "P001", "c", 2)));
await caso("subir el cupo a 3 deja entrar a c", async () => { await actualizarSala("P001", { cupo: 3 }); await assertSucceeds(lote(ctx("c"), "P001", "c", 2)); });
await caso("bajar el cupo no expulsa a nadie, y salir siempre se puede", async () => { await actualizarSala("P001", { cupo: 1 }); await assertSucceeds(lote(ctx("c"), "P001", "c", 4, 2)); });
await caso("con la inscripción cerrada nadie se cambia", async () => { await actualizarSala("P001", { inscripcion: "cerrada", cupo: 4 }); await assertFails(lote(ctx("a"), "P001", "a", 5, 2)); });
await caso("con la inscripción cerrada nadie se inscribe solo", () => assertFails(lote(ctx("d"), "P001", "d", 5)));
await caso("el profesor asigna al atrasado (lote de la pantalla)", () => assertSucceeds(lote(profe(), "P001", "d", 5)));
await caso("el profesor puede pasar el cupo al mover", async () => { await actualizarSala("P001", { cupo: 1 }); await assertSucceeds(lote(profe(), "P001", "e", 5)); });
await caso("sin inscripción abierta (null) tampoco", async () => {
  await sembrar("P002", { inscripcion: null });
  await assertFails(lote(ctx("a"), "P002", "a", 1));
});

console.log("Dos alumnos tocan el último lugar al mismo tiempo (20 salas):");
let dobles = 0, ninguno = 0;
for (let i = 0; i < 20; i++) {
  const cod = "C" + String(i).padStart(3, "0");
  await sembrar(cod, { cupo: 2 });
  await lote(ctx("a"), cod, "a", 1);                               // queda un lugar
  const r = await Promise.allSettled([lote(ctx("b"), cod, "b", 1), lote(ctx("c"), cod, "c", 1)]);
  const entraron = r.filter(x => x.status === "fulfilled").length;
  const cupo = await leer(cod, "cupos", "1");
  const conGrupo = (await Promise.all(["a", "b", "c"].map(u => leer(cod, "jugadores", u)))).filter(j => j.grupo === 1).length;
  if (entraron > 1 || Object.keys(cupo.miembros).length > 2 || conGrupo > 2) dobles++;
  if (entraron === 0) ninguno++;
  if (Object.keys(cupo.miembros).length !== conGrupo) { dobles++; console.log("   descuadre", cod, cupo, conGrupo); }
}
await caso(`nunca entran los dos (${dobles} dobles en 20)`, async () => { if (dobles) throw new Error(`${dobles} salas con cupo doble`); });
console.log(`   (en ${ninguno} de 20 el emulador rechazó a los dos por contención; el teléfono dice «se llenó» y el alumno vuelve a tocar)`);

console.log("Sala sin personajes (semanas 5, 7, 307, 402): como antes");
await sembrar("S001", { personajes: false, etapa: "portada" });
await caso("en la portada el alumno elige grupo a mano", () => assertSucceeds(setDoc(doc(ctx("a"), "salas", "S001", "jugadores", "a"), { nombre: "A", email: email("a"), grupo: 3, equipo: "" }, { merge: true })));
await caso("en la portada se puede cambiar", () => assertSucceeds(setDoc(doc(ctx("a"), "salas", "S001", "jugadores", "a"), { nombre: "A", email: email("a"), grupo: 4, equipo: "" }, { merge: true })));
await caso("fuera de la portada, con grupo, ya no", async () => { await actualizarSala("S001", { etapa: null }); await assertFails(setDoc(doc(ctx("a"), "salas", "S001", "jugadores", "a"), { nombre: "A", email: email("a"), grupo: 5 }, { merge: true })); });
await caso("fuera de la portada, sin grupo, puede elegir uno", () => assertSucceeds(setDoc(doc(ctx("b"), "salas", "S001", "jugadores", "b"), { nombre: "B", email: email("b"), grupo: 2 }, { merge: true })));
await caso("el profesor mueve a cualquiera", () => assertSucceeds(setDoc(doc(profe(), "salas", "S001", "jugadores", "a"), { grupo: 1 }, { merge: true })));
await caso("un alumno no escribe los cupos de una sala sin personajes", () => assertFails(setDoc(doc(ctx("a"), "salas", "S001", "cupos", "1"), { miembros: { a: true } })));

console.log("Mensajes de alumno: el id es el del teléfono (va dentro de atributos HTML)");
await sembrar("M001", { personajes: false, etapa: null });
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, "salas", "M001"), { fase: "abierta", debate: { n: 1, A: 1, B: 2 } }, { merge: true });
  await setDoc(doc(db, "salas", "M001", "jugadores", "a"), { grupo: 1 }, { merge: true });
});
// lo mismo que arma jugar.js (enviarTexto)
const idTel = () => "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const msg = texto => ({ tipo: "alumno", uid: "a", nombre: "A", email: email("a"), grupo: 1, equipo: "A", debate: 1, tramo: 0, ronda: 0, texto, t: Date.now() });
await caso("un mensaje con el id del teléfono entra", () => assertSucceeds(setDoc(doc(ctx("a"), "salas", "M001", "mensajes", idTel()), msg("Hay que llegar antes."))));
await caso("un id con comillas (inyección en data-m) no entra", () => assertFails(setDoc(doc(ctx("a"), "salas", "M001", "mensajes", 'a1" onmouseover="alert(1)'), msg("hola"))));
await caso("un id que no empieza con «a» no entra", () => assertFails(setDoc(doc(ctx("a"), "salas", "M001", "mensajes", "m" + Date.now().toString(36)), msg("hola"))));
await caso("un id demasiado largo no entra", () => assertFails(setDoc(doc(ctx("a"), "salas", "M001", "mensajes", "a" + "0".repeat(30)), msg("hola"))));
await caso("el profesor sigue publicando con sus ids (m…)", () => assertSucceeds(setDoc(doc(profe(), "salas", "M001", "mensajes", "m" + Date.now().toString(36) + "xyz"), { tipo: "mod", texto: "Moderadora", t: 1 })));
await sembrar("M002", { personajes: false, etapa: null });
await env.withSecurityRulesDisabled(async c => {
  const db = c.firestore();
  await setDoc(doc(db, "salas", "M002"), { modo: "clasico", fase: "abierta" }, { merge: true });
  await setDoc(doc(db, "salas", "M002", "jugadores", "a"), { equipo: "A" }, { merge: true });
});
await caso("modo clásico: el id del teléfono entra", () => assertSucceeds(setDoc(doc(ctx("a"), "salas", "M002", "mensajes", idTel()), { ...msg("hola a todos"), equipo: "A" })));
await caso("modo clásico: un id con comillas no entra", () => assertFails(setDoc(doc(ctx("a"), "salas", "M002", "mensajes", "a'><img src=x>"), { ...msg("hola"), equipo: "A" })));

await env.cleanup();
console.log(`\n${ok} ok, ${mal} mal`);
process.exit(mal ? 1 : 0);
})();
