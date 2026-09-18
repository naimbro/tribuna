/* TRIBUNA — proxy del motor LLM.
   La pantalla del profesor llama a `evaluar` (callable) con el prompt ya armado; la función
   comprueba que quien llama es un profesor autorizado y llama a Anthropic con la key guardada
   en Secret Manager. La key nunca llega a un navegador. Los alumnos no llaman a esta función:
   el motor corre solo en la pantalla del profesor. */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import Anthropic from "@anthropic-ai/sdk";

initializeApp();
const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const ADMIN = "naim.bro@gmail.com";

// "jurado" aplica la rúbrica (conviene que piense); "sociedad" es un agente de la audiencia:
// muchas llamadas cortas en paralelo, modelo chico. El cliente elige el uso, nunca el modelo.
const USOS = {
  jurado:   { model: "claude-sonnet-5",  max_tokens: 4000, output_config: { effort: "low" as const } },
  sociedad: { model: "claude-haiku-4-5", max_tokens: 400 },
};
const MAX_PROMPT = 40_000;

async function esProfesor(email: string | undefined): Promise<boolean> {
  if (!email) return false;
  if (email === ADMIN) return true;
  const d = await getFirestore().doc(`profesores/${email.toLowerCase()}`).get();
  return d.exists;
}

export const evaluar = onCall(
  { secrets: [ANTHROPIC_API_KEY], region: "us-central1", timeoutSeconds: 120, memory: "256MiB", maxInstances: 20, cors: true },
  async (req) => {
    const tok = req.auth?.token;
    if (!req.auth || !tok?.email_verified) throw new HttpsError("unauthenticated", "Entra con tu cuenta Google.");
    if (!(await esProfesor(tok.email))) throw new HttpsError("permission-denied", `La cuenta ${tok.email} no está autorizada para usar el motor.`);

    const { prompt, uso } = (req.data || {}) as { prompt?: unknown; uso?: unknown };
    if (typeof prompt !== "string" || !prompt || prompt.length > MAX_PROMPT)
      throw new HttpsError("invalid-argument", "Prompt vacío o demasiado largo.");
    const cfg = uso === "sociedad" ? USOS.sociedad : USOS.jurado;

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    try {
      const r = await client.messages.create({ ...cfg, messages: [{ role: "user", content: prompt }] });
      if (r.stop_reason === "refusal" || r.stop_reason === "max_tokens")
        throw new HttpsError("internal", `El modelo no terminó la evaluación (${r.stop_reason}).`);
      let text = "";
      for (const b of r.content) if (b.type === "text") text += b.text;
      return { text };
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      if (e instanceof Anthropic.RateLimitError) throw new HttpsError("resource-exhausted", "El proveedor pidió esperar (429).");
      if (e instanceof Anthropic.APIConnectionError) throw new HttpsError("unavailable", "Sin conexión con el proveedor.");
      if (e instanceof Anthropic.APIError) throw new HttpsError("internal", `${e.status}: ${e.message}`);
      throw new HttpsError("internal", String(e));
    }
  }
);
