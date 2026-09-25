/* =====================================================================
   TRIBUNA — la música del debate en vivo, sintetizada con WebAudio (sin archivos ni licencias):
   el pulso de concentración de la preparación, el golpe de cada nombre en la revelación y la
   música de entrada al escenario. Suena solo si el 🔊 está encendido y el interruptor `musica`
   de la sala también. Usa audioCtx() y sonidoActivo() de app.js.
   ===================================================================== */

const MUSICA = { timer: null, nodos: [] };
const musicaActiva = () => sonidoActivo() && opcionActiva(S.clase.opciones, "musica");

function pararMusica() {
  clearTimeout(MUSICA.timer); MUSICA.timer = null;
  for (const n of MUSICA.nodos) { try { n.stop(); } catch {} try { n.disconnect(); } catch {} }
  MUSICA.nodos = [];
}

// Un golpe grave con cola: el latido de la preparación y el golpe de cada nombre revelado.
// Devuelve el oscilador para que quien lo agenda lo registre en MUSICA.nodos (pararMusica lo corta).
function musicaBombo(ac, t0, fuerza = 1) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "sine"; o.frequency.setValueAtTime(90, t0); o.frequency.exponentialRampToValueAtTime(38, t0 + 0.45);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.55 * fuerza, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.55);
  return o;
}
function musicaTic(ac, t0, agudo = false) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = "square"; o.frequency.setValueAtTime(agudo ? 2600 : 1900, t0);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
  o.connect(g); g.connect(ac.destination); o.start(t0); o.stop(t0 + 0.05);
  return o;
}

// La preparación: un zumbido grave de tensión y un latido con tic de reloj, cada segundo; en los
// últimos 10 s, cada medio segundo; en los últimos 3, cada cuarto. Termina sola en finMs.
function pulsoPreparacion(finMs) {
  pararMusica();
  if (!musicaActiva()) return;
  const ac = audioCtx(); if (!ac) return;
  // zumbido: dos sierras desafinadas bajo un pasabajos
  const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 140;
  const g = ac.createGain(); g.gain.value = 0.035;
  lp.connect(g); g.connect(ac.destination);
  for (const f of [55, 55.4]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(lp); o.start(); MUSICA.nodos.push(o); }
  const paso = () => {
    const resta = finMs - Date.now();
    if (resta <= 0 || !musicaActiva()) { pararMusica(); return; }
    const t0 = ac.currentTime + 0.02;
    // los nodos que ya sonaron salen de la lista (si no, crece un par por segundo)
    MUSICA.nodos = MUSICA.nodos.filter(n => !n.fin || n.fin > ac.currentTime);
    const b = musicaBombo(ac, t0, resta < 10000 ? 0.9 : 0.6), k = musicaTic(ac, t0 + 0.5 * (resta < 10000 ? 0.5 : 1), resta < 10000);
    b.fin = k.fin = t0 + 0.55; MUSICA.nodos.push(b, k);
    MUSICA.timer = setTimeout(paso, resta < 3000 ? 250 : resta < 10000 ? 500 : 1000);
  };
  paso();
}

// La revelación: el redoble que ya existe (app.js) y un golpe por nombre.
function redobleRevelacion() { if (musicaActiva()) { pararMusica(); sonar("redoble"); } }
function golpeRevelacion() { if (!musicaActiva()) return; const ac = audioCtx(); if (ac) { musicaBombo(ac, ac.currentTime + 0.01, 1.2); sonar("whoosh"); } }

// La entrada al escenario: un riff de bombo, caja y bajo a 124 bpm durante `segundos`.
function musicaEntrada(segundos) {
  pararMusica();
  if (!musicaActiva()) return;
  const ac = audioCtx(); if (!ac) return;
  const negra = 60 / 124, t0 = ac.currentTime + 0.05, bajo = [55, 55, 82.4, 73.4];
  for (let i = 0; i * negra < segundos; i++) {
    const t = t0 + i * negra;
    if (i % 2 === 0) MUSICA.nodos.push(musicaBombo(ac, t, 0.8));
    else {   // caja: ruido corto
      const n = ac.createBufferSource(), len = Math.floor(ac.sampleRate * 0.12);
      const buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
      const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
      const g = ac.createGain(); g.gain.value = 0.18;
      n.buffer = buf; n.connect(hp); hp.connect(g); g.connect(ac.destination); n.start(t); MUSICA.nodos.push(n);
    }
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sawtooth"; o.frequency.value = bajo[Math.floor(i / 2) % bajo.length];
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + negra * 0.9);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 600;
    o.connect(lp); lp.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + negra); MUSICA.nodos.push(o);
  }
}
