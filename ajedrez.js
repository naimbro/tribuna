/* =====================================================================
   TRIBUNA — el reloj de ajedrez del debate a viva voz: lógica pura (sin DOM ni Firestore),
   probada con Node (pruebas/ajedrez.test.js). Spec: docs/superpowers/specs/2026-09-25-debate-en-vivo-design.md

   Cada lado tiene un banco igual a la mitad del tramo. El banco de un lado corre mientras al
   menos uno de sus integrantes tiene el botón de hablar apretado (su ficha lleva `habla` con un
   latido reciente). Si hablan los dos lados a la vez, corren los dos: interrumpir cuesta. Un lado
   sin tiempo solo puede escribir. El tramo termina con los dos bancos en cero o al pasar el
   tramo más un margen, lo que llegue primero.
   ===================================================================== */

const AJ = {
  LATIDO: 2500,   // una ficha con habla cuyo último latido llegó hace más de esto cuenta como callada
  MARGEN: 90,     // segundos de margen sobre el tramo: el debate no se alarga para siempre con silencios
  DT_MAX: 2000    // un paso de reloj nunca descuenta más que esto (pestaña dormida, reloj que salta)
};

const nuevoBanco = segTramo => ({ A: Math.round(segTramo * 500), B: Math.round(segTramo * 500) });

// Descuenta dt ms a cada lado que habla. agotados: los lados que llegaron a cero en este paso.
function avanzar(banco, hablando, dt) {
  const paso = Math.max(0, Math.min(AJ.DT_MAX, dt || 0));
  const out = { A: banco.A, B: banco.B }, agotados = [];
  for (const k of ["A", "B"]) {
    if (!hablando || !hablando[k] || out[k] <= 0) continue;
    out[k] = Math.max(0, out[k] - paso);
    if (out[k] === 0) agotados.push(k);
  }
  return { banco: out, agotados };
}

// ¿Quién habla ahora? xs: [{ grupo, habla: { debate, t } | null, visto }], donde visto es cuándo
// ESTE aparato vio llegar el último latido (así no dependemos de que los relojes coincidan).
function hablandoPorLado(xs, { debate, A, B, ahora }) {
  const out = { A: false, B: false };
  for (const x of xs || []) {
    if (!x || !x.habla || x.habla.debate !== debate || ahora - (x.visto || 0) > AJ.LATIDO) continue;
    if (x.grupo === A) out.A = true; else if (x.grupo === B) out.B = true;
  }
  return out;
}

const terminado = (banco, { abre, seg, ahora }) =>
  (banco.A <= 0 && banco.B <= 0) || ahora - abre >= (seg + AJ.MARGEN) * 1000;

const sumar = (banco, ms) => ({ A: banco.A + ms, B: banco.B + ms });

// En el teléfono: la foto publicada { A, B, corre: { A, B }, t } y la hora de ahora → lo que queda.
function restante(foto, ahora) {
  const pasado = Math.max(0, ahora - (foto.t || ahora));
  const r = k => Math.max(0, foto[k] - (foto.corre && foto.corre[k] ? pasado : 0));
  return { A: r("A"), B: r("B") };
}

if (typeof module !== "undefined") module.exports = { AJ, nuevoBanco, avanzar, hablandoPorLado, terminado, sumar, restante };
