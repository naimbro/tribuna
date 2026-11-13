/* =====================================================================
   LA SALA — el canal entre las tres pantallas. Dos implementaciones de la misma interfaz:
     · Firestore: salas/{codigo} (el estado; lo escribe la cuenta que creó la sala) y
       jugadores/{uid} (lo de cada escaño; lo escribe su dueño). Cabe en las reglas de tribuna:
       no hay colecciones nuevas. Los escaños de ensayo son documentos de jugadores que escribe
       el dueño de la sala.
     · Ensayo local (?local=1): lo mismo sobre localStorage y BroadcastChannel, entre pestañas
       del mismo navegador. Sin Google, sin Firestore y sin cargar nada de internet.
   Mismo patrón que canal.js (tribuna con un micrófono). Firebase se importa solo si hace falta.
   ===================================================================== */
const FB = "https://www.gstatic.com/firebasejs/12.9.0/";
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nuevoCodigo = () => Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
const limpio = o => JSON.parse(JSON.stringify(o));        // Firestore no acepta undefined
const esMapa = v => v && typeof v === "object" && !Array.isArray(v);
// como setDoc con merge: los mapas se funden, lo demás se reemplaza
function fundir(a, b) {
  const out = { ...(esMapa(a) ? a : {}) };
  for (const [k, v] of Object.entries(b || {})) out[k] = esMapa(v) ? fundir(out[k], v) : v;
  return out;
}

// yo: solo en ensayo, quién abre esta pestaña (sin él, es la cuenta que creó la sala)
// ia: solo en ensayo, usar el motor de servidor.py en vez de los votos de ensayo
export function abrirCanal({ local = false, yo = "", ia = false } = {}) {
  return local ? Promise.resolve(canalLocal({ yo, ia })) : canalFirestore();
}

/* ------------------------------ Firestore ------------------------------ */
async function canalFirestore() {
  const [{ initializeApp }, A, F, G, { firebaseConfig }] = await Promise.all([
    import(FB + "firebase-app.js"), import(FB + "firebase-auth.js"), import(FB + "firebase-firestore.js"),
    import(FB + "firebase-functions.js"), import("./firebase-config.js?v=20260918a")]);
  const app = initializeApp(firebaseConfig), auth = A.getAuth(app), db = F.getFirestore(app);
  const evaluar = G.httpsCallable(G.getFunctions(app, "us-central1"), "evaluar", { timeout: 130000 });
  const sala = c => F.doc(db, "salas", c);
  const jug = (c, uid) => F.doc(db, "salas", c, "jugadores", uid);
  let yo = null;
  // las reglas piden en jugadores: nombre (hasta 40), el correo de la sesión y un equipo conocido
  const base = equipo => ({ nombre: (yo.nombre || yo.email.split("@")[0]).slice(0, 40), email: yo.email, equipo });
  return {
    local: false,
    alEntrar: cb => A.onAuthStateChanged(auth, async u => {
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
    escucharSala: (c, cb) => F.onSnapshot(sala(c), s => cb(s.exists() ? s.data() : null),
      e => { console.warn("canal:", e.code || e); cb(null, e); }),
    // cambios con rutas «a.b.c», como updateDoc
    cambiarSala: (c, cambios) => F.updateDoc(sala(c), limpio({ ...cambios, actualizado: Date.now() })),
    escucharEscanos: (c, cb) => F.onSnapshot(F.collection(db, "salas", c, "jugadores"),
      s => { const l = []; s.forEach(d => l.push({ ...d.data(), uid: d.id })); cb(l); },
      e => console.warn("canal:", e.code || e)),
    // lo mío: el escaño de un estudiante (equipo "P") o las órdenes de un docente (equipo "")
    escribirMio: (c, datos, equipo = "P") => F.setDoc(jug(c, yo.uid), limpio({ ...base(equipo), ...datos }), { merge: true }),
    // solo quien creó la sala: los escaños de ensayo
    escribirEscano: (c, uid, datos) => F.setDoc(jug(c, uid), limpio(datos), { merge: true }),
    // el latido de la pantalla que hace de motor (vivo/sala): la testera sabe si el hemiciclo está vivo
    latido: c => F.setDoc(F.doc(db, "salas", c, "vivo", "sala"), { t: Date.now() }),
    escucharLatido: (c, cb) => F.onSnapshot(F.doc(db, "salas", c, "vivo", "sala"), s => cb(s.exists() ? s.data().t || 0 : 0), () => cb(0)),
    async pedirLLM(prompt, uso) { return (await evaluar({ prompt, uso })).data.text; }
  };
}

/* ------------------------------ ensayo local ------------------------------ */
function canalLocal({ yo, ia }) {
  const id = String(yo || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const quien = id ? { uid: id, email: id + "@ensayo", nombre: id[0].toUpperCase() + id.slice(1) + " Ensayo" }
    : { uid: "ensayo", email: "ensayo", nombre: "Profesor" };
  const bc = typeof BroadcastChannel === "function" ? new BroadcastChannel("lasala_local") : null;
  const clave = c => "lasala_local_" + c;
  const leer = c => { try { return JSON.parse(localStorage.getItem(clave(c))) || null; } catch (e) { return null; } };
  const oyentes = new Set();
  const avisar = (codigo, que) => { for (const o of [...oyentes]) if (o.codigo === codigo && o.que === que) o.cb(); };
  if (bc) bc.onmessage = e => avisar(e.data.codigo, e.data.que);
  function guardar(codigo, que, f) {
    const x = { sala: null, jug: {}, latido: 0, ...(leer(codigo) || {}) };
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
  // la IA del ensayo es servidor.py con su .env; sin llave, los senadores votan «de ensayo»
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
    cambiarSala: async (c, cambios) => guardar(c, "sala", x => {
      if (x.sala) x.sala = SalaLogica.aplicarRutas(x.sala, { ...limpio(cambios), actualizado: Date.now() }); }),
    escucharEscanos: (c, cb) => escuchar(c, "jug", x => Object.entries((x && x.jug) || {}).map(([uid, j]) => ({ ...j, uid })), cb),
    escribirMio: async (c, datos, equipo = "P") => guardar(c, "jug", x => {
      x.jug[quien.uid] = fundir(x.jug[quien.uid], limpio({ nombre: quien.nombre, email: quien.email, equipo, ...datos })); }),
    escribirEscano: async (c, uid, datos) => guardar(c, "jug", x => { x.jug[uid] = fundir(x.jug[uid], limpio(datos)); }),
    latido: async c => guardar(c, "latido", x => { x.latido = Date.now(); }),
    escucharLatido: (c, cb) => escuchar(c, "latido", x => (x && x.latido) || 0, cb),
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
