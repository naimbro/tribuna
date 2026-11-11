/* =====================================================================
   TRIBUNA con un solo micrófono — el canal entre el teléfono y el escenario.
   Dos implementaciones de la misma interfaz:
     · Firestore: salas/{codigo} (el estado), vivo/voz (el párrafo que se está oyendo),
       vivo/micro (el latido del teléfono), mensajes/{id} (los párrafos cerrados) y
       privado/{nombre} (el registro de cada veredicto). Caben en las reglas de siempre porque el
       teléfono y el notebook entran con la cuenta del profesor que creó la sala.
     · Ensayo local (?local=1): lo mismo sobre localStorage y BroadcastChannel, entre pestañas del
       mismo navegador. Sin Google, sin Firestore y sin cargar nada de internet.
   Firebase se importa solo si hace falta, para que el ensayo funcione sin red.
   ===================================================================== */
const FB = "https://www.gstatic.com/firebasejs/12.9.0/";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nuevoCodigo = () => Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
const limpio = o => JSON.parse(JSON.stringify(o));        // Firestore no acepta undefined

// yo: solo en ensayo, quién abre esta pestaña (sin él, es el profesor)
export function abrirCanal({ local = false, ia = false, yo = "" } = {}) {
  return local ? Promise.resolve(canalLocal({ ia, yo })) : canalFirestore();
}

/* ------------------------------ Firestore ------------------------------ */
async function canalFirestore() {
  const [{ initializeApp }, A, F, G, { firebaseConfig }] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js"),
    import(FB + "firebase-functions.js"), import("./firebase-config.js?v=20260918a")]);
  const app = initializeApp(firebaseConfig), auth = A.getAuth(app), db = F.getFirestore(app);
  const evaluar = G.httpsCallable(G.getFunctions(app, "us-central1"), "evaluar", { timeout: 130000 });
  const sala = c => F.doc(db, "salas", c);
  const sub = (c, col, id) => F.doc(db, "salas", c, col, id);
  const escucharDoc = (ref, cb) => F.onSnapshot(ref, s => cb(s.exists() ? s.data() : null),
    e => { console.warn("canal:", e.code || e); cb(null); });
  let yo = null;
  return {
    local: false,
    alEntrar: cb => A.onAuthStateChanged(auth, async u => {
      // sesiones anónimas de versiones antiguas: se cierran y se pide Google
      if (u && (u.isAnonymous || !u.email)) { await A.signOut(auth); return; }
      yo = u ? { uid: u.uid, email: u.email, nombre: u.displayName || "" } : null;
      cb(yo);
    }),
    entrar: () => A.signInWithPopup(auth, new A.GoogleAuthProvider()),
    salir: () => A.signOut(auth),
    conIA: async () => true,
    async crearSala(datos) {
      for (let i = 0; i < 6; i++) {
        const codigo = nuevoCodigo();
        if ((await F.getDoc(sala(codigo))).exists()) continue;
        await F.setDoc(sala(codigo), limpio({ ...datos, profeUid: yo.uid, profeEmail: yo.email }));
        return codigo;
      }
      throw new Error("no se pudo generar un código de sala");
    },
    async leerSala(c) { const s = await F.getDoc(sala(c)); return s.exists() ? s.data() : null; },
    escucharSala: (c, cb) => escucharDoc(sala(c), cb),
    cambiarSala: (c, cambios) => F.updateDoc(sala(c), limpio({ ...cambios, actualizado: Date.now() })),
    publicarVoz: (c, voz) => F.setDoc(sub(c, "vivo", "voz"), limpio(voz)),
    escucharVoz: (c, cb) => escucharDoc(sub(c, "vivo", "voz"), cb),
    latido: c => F.setDoc(sub(c, "vivo", "micro"), { t: Date.now() }),
    escucharLatido: (c, cb) => escucharDoc(sub(c, "vivo", "micro"), d => cb(d ? d.t || 0 : 0)),
    agregarParrafo: (c, id, p) => F.setDoc(sub(c, "mensajes", id), limpio({ tipo: "voz", ...p })),
    corregirParrafo: (c, id, cambios) => F.updateDoc(sub(c, "mensajes", id), limpio(cambios)),
    escucharParrafos: (c, cb) => F.onSnapshot(F.query(F.collection(db, "salas", c, "mensajes"), F.orderBy("t0")),
      s => { const l = []; s.forEach(d => l.push({ id: d.id, ...d.data() })); cb(l); },
      e => console.warn("canal:", e.code || e)),
    guardarPrivado: (c, nombre, datos) => F.setDoc(sub(c, "privado", nombre), limpio(datos)),
    async leerPrivado(c, nombre) { const s = await F.getDoc(sub(c, "privado", nombre)); return s.exists() ? s.data() : null; },
    escucharPrivado: (c, nombre, cb) => escucharDoc(sub(c, "privado", nombre), cb),
    // --- la galería. Las reglas piden en jugadores: nombre, el email de la sesión y equipo "P";
    // el grupo se fija una sola vez. En publico/{uid} solo exigen `pos` entre −100 y 100.
    entrarGaleria: (c, { nombre, grupo }) => F.setDoc(sub(c, "jugadores", yo.uid),
      limpio({ nombre, email: yo.email, equipo: "P", ...(grupo ? { grupo } : {}) }), { merge: true }),
    async leerJugador(c) { const s = await F.getDoc(sub(c, "jugadores", yo.uid)); return s.exists() ? s.data() : null; },
    async leerPublico(c) { const s = await F.getDoc(sub(c, "publico", yo.uid)); return s.exists() ? s.data() : null; },
    escribirPublico: (c, datos) => F.setDoc(sub(c, "publico", yo.uid), limpio(datos)),
    escucharPublico: (c, cb) => F.onSnapshot(F.collection(db, "salas", c, "publico"),
      s => { const l = []; s.forEach(d => l.push({ ...d.data(), uid: d.id })); cb(l); },
      e => console.warn("canal:", e.code || e)),
    publicarGaleria: (c, datos) => F.setDoc(sub(c, "vivo", "galeria"), limpio(datos)),
    escucharGaleria: (c, cb) => escucharDoc(sub(c, "vivo", "galeria"), cb),
    publicarPuntos: (c, datos) => F.setDoc(sub(c, "vivo", "puntos"), limpio(datos)),
    escucharPuntos: (c, cb) => escucharDoc(sub(c, "vivo", "puntos"), cb),
    async pedirLLM(prompt, uso) { return (await evaluar({ prompt, uso })).data.text; }
  };
}

/* ------------------------------ ensayo local ------------------------------ */
function canalLocal({ ia, yo }) {
  // en ensayo cada pestaña dice quién es con &yo=ana; sin eso, es el profesor
  const id = String(yo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const quien = id ? { uid: id, email: id + "@ensayo", nombre: id[0].toUpperCase() + id.slice(1) + " Ensayo" }
    : { uid: "ensayo", email: "ensayo", nombre: "Profesor" };
  const bc = typeof BroadcastChannel === "function" ? new BroadcastChannel("tribuna_local") : null;
  const clave = c => "tribuna_local_" + c;
  const leer = c => { try { return JSON.parse(localStorage.getItem(clave(c))) || null; } catch (e) { return null; } };
  const oyentes = new Set();
  const avisar = (codigo, que) => { for (const o of [...oyentes]) if (o.codigo === codigo && o.que === que) o.cb(); };
  if (bc) bc.onmessage = e => avisar(e.data.codigo, e.data.que);
  function guardar(codigo, que, f) {
    const x = { sala: null, voz: null, latido: 0, parrafos: {}, privado: {}, jugadores: {}, publico: {}, galeria: null, puntos: null,
      ...(leer(codigo) || {}) };
    f(x);
    localStorage.setItem(clave(codigo), JSON.stringify(x));
    avisar(codigo, que);
    if (bc) bc.postMessage({ codigo, que });
  }
  function escuchar(codigo, que, sacar, cb) {
    const o = { codigo, que, cb: () => cb(sacar(leer(codigo))) };
    oyentes.add(o);
    o.cb();
    return () => oyentes.delete(o);
  }
  const lista = x => Object.entries((x && x.parrafos) || {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => (a.t0 || 0) - (b.t0 || 0));
  // la IA del ensayo es servidor.py con su .env; sin llaves, no hay
  let motor = null;
  const hayMotor = () => motor || (motor = fetch("/api/motor").then(r => r.json())
    .then(j => (j.proveedores || []).some(p => p.id === "anthropic")).catch(() => false));
  return {
    local: true,
    alEntrar(cb) { setTimeout(() => cb(quien), 0); return () => {}; },
    entrar: async () => {},
    salir: async () => {},
    conIA: async () => ia && await hayMotor(),
    async crearSala(datos) {
      const codigo = nuevoCodigo();
      guardar(codigo, "sala", x => { x.sala = limpio({ ...datos, profeUid: "ensayo", profeEmail: "ensayo" }); });
      return codigo;
    },
    leerSala: async c => (leer(c) || {}).sala || null,
    escucharSala: (c, cb) => escuchar(c, "sala", x => (x && x.sala) || null, cb),
    cambiarSala: async (c, cambios) => guardar(c, "sala", x => { if (x.sala) x.sala = { ...x.sala, ...limpio(cambios), actualizado: Date.now() }; }),
    publicarVoz: async (c, voz) => guardar(c, "voz", x => { x.voz = limpio(voz); }),
    escucharVoz: (c, cb) => escuchar(c, "voz", x => (x && x.voz) || null, cb),
    latido: async c => guardar(c, "latido", x => { x.latido = Date.now(); }),
    escucharLatido: (c, cb) => escuchar(c, "latido", x => (x && x.latido) || 0, cb),
    agregarParrafo: async (c, id, p) => guardar(c, "parrafos", x => { x.parrafos[id] = limpio({ tipo: "voz", ...p }); }),
    corregirParrafo: async (c, id, cambios) => guardar(c, "parrafos", x => { if (x.parrafos[id]) Object.assign(x.parrafos[id], limpio(cambios)); }),
    escucharParrafos: (c, cb) => escuchar(c, "parrafos", lista, cb),
    guardarPrivado: async (c, nombre, datos) => guardar(c, "privado:" + nombre, x => { x.privado[nombre] = limpio(datos); }),
    leerPrivado: async (c, nombre) => ((leer(c) || {}).privado || {})[nombre] || null,
    escucharPrivado: (c, nombre, cb) => escuchar(c, "privado:" + nombre, x => (x && x.privado && x.privado[nombre]) || null, cb),
    entrarGaleria: async (c, { nombre, grupo }) => guardar(c, "jugadores", x => {
      x.jugadores[quien.uid] = { ...(x.jugadores[quien.uid] || {}), nombre, email: quien.email, equipo: "P", ...(grupo ? { grupo } : {}) }; }),
    leerJugador: async c => ((leer(c) || {}).jugadores || {})[quien.uid] || null,
    leerPublico: async c => ((leer(c) || {}).publico || {})[quien.uid] || null,
    escribirPublico: async (c, datos) => guardar(c, "publico", x => { x.publico[quien.uid] = limpio(datos); }),
    escucharPublico: (c, cb) => escuchar(c, "publico", x => Object.entries((x && x.publico) || {}).map(([uid, p]) => ({ ...p, uid })), cb),
    publicarGaleria: async (c, datos) => guardar(c, "galeria", x => { x.galeria = limpio(datos); }),
    escucharGaleria: (c, cb) => escuchar(c, "galeria", x => (x && x.galeria) || null, cb),
    publicarPuntos: async (c, datos) => guardar(c, "puntos", x => { x.puntos = limpio(datos); }),
    escucharPuntos: (c, cb) => escuchar(c, "puntos", x => (x && x.puntos) || null, cb),
    async pedirLLM(prompt, uso) {
      if (!(await hayMotor())) throw new Error("servidor.py no tiene una llave de IA");
      const r = await fetch("/api/evaluar", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ prov: "anthropic", prompt, uso }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "HTTP " + r.status);
      return j.text;
    }
  };
}
