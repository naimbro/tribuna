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

export function abrirCanal({ local = false, ia = false } = {}) {
  return local ? Promise.resolve(canalLocal({ ia })) : canalFirestore();
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
      yo = u ? { uid: u.uid, email: u.email } : null;
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
    async pedirLLM(prompt, uso) { return (await evaluar({ prompt, uso })).data.text; }
  };
}

/* ------------------------------ ensayo local ------------------------------ */
function canalLocal({ ia }) {
  const bc = typeof BroadcastChannel === "function" ? new BroadcastChannel("tribuna_local") : null;
  const clave = c => "tribuna_local_" + c;
  const leer = c => { try { return JSON.parse(localStorage.getItem(clave(c))) || null; } catch (e) { return null; } };
  const oyentes = new Set();
  const avisar = (codigo, que) => { for (const o of [...oyentes]) if (o.codigo === codigo && o.que === que) o.cb(); };
  if (bc) bc.onmessage = e => avisar(e.data.codigo, e.data.que);
  function guardar(codigo, que, f) {
    const x = leer(codigo) || { sala: null, voz: null, latido: 0, parrafos: {}, privado: {} };
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
    alEntrar(cb) { setTimeout(() => cb({ uid: "ensayo", email: "ensayo" }), 0); return () => {}; },
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
    guardarPrivado: async (c, nombre, datos) => guardar(c, "privado", x => { x.privado[nombre] = limpio(datos); }),
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
