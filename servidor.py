"""TRIBUNA — servidor local: archivos estáticos + proxy del motor LLM.

    python servidor.py            (puerto 8777)

Lee las API keys de `.env` (ANTHROPIC_API_KEY u OPENAI_API_KEY) y hace él la llamada
al proveedor, así la key nunca llega al navegador. Solo biblioteca estándar.

Escucha solo en 127.0.0.1 y no sirve archivos ocultos ni este script: `.env` vive en
esta misma carpeta y un `python -m http.server` a secas lo entregaría a toda la red.
"""
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.abspath(__file__))
PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8777
MAX_PROMPT = 40_000   # caracteres; una intervención de 3 minutos no se acerca

# "modelo" es el jurado (aplica la rúbrica: conviene que piense). "sociedad" son los agentes
# de la audiencia: muchas llamadas cortas en paralelo por intervención, modelo chico y rápido.
# El navegador elige el uso, nunca el modelo.
PROVEEDORES = {
    "anthropic": {"env": "ANTHROPIC_API_KEY", "modelo": "claude-sonnet-5", "sociedad": "claude-haiku-4-5"},
    "openai":    {"env": "OPENAI_API_KEY",    "modelo": "gpt-4o-mini",     "sociedad": "gpt-4o-mini"},
}


def leer_env():
    ruta, out = os.path.join(RAIZ, ".env"), {}
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8-sig") as f:
            for linea in f:
                linea = linea.strip()
                if linea and not linea.startswith("#") and "=" in linea:
                    k, v = linea.split("=", 1)
                    out[k.strip().removeprefix("export ").strip()] = v.strip().strip("'\"")
    return out


def key_de(prov):
    nombre = PROVEEDORES[prov]["env"]
    return leer_env().get(nombre) or os.environ.get(nombre, "")


def disponibles():
    return [p for p in PROVEEDORES if key_de(p)]


def post_json(url, headers, cuerpo):
    req = urllib.request.Request(url, data=json.dumps(cuerpo).encode(), method="POST",
                                 headers={"content-type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # el cuerpo del error trae el motivo real (key inválida, sin saldo, modelo…)
        try:
            detalle = json.load(e)["error"]["message"]
        except Exception:
            detalle = e.reason
        raise RuntimeError(f"{e.code}: {detalle}") from None
    except urllib.error.URLError as e:
        raise RuntimeError(f"sin conexión con el proveedor ({e.reason})") from None


def evaluar(prov, prompt, uso="jurado"):
    modelo = PROVEEDORES[prov]["sociedad" if uso == "sociedad" else "modelo"]
    key = key_de(prov)
    if prov == "anthropic":
        if uso == "sociedad":
            # Haiku 4.5 no piensa por defecto y rechaza `effort`: respuesta corta y directa.
            cuerpo = {"model": modelo, "max_tokens": 400}
        else:
            # Sonnet 5 piensa por defecto y eso consume max_tokens: 700 cortaba el JSON.
            cuerpo = {"model": modelo, "max_tokens": 4000, "output_config": {"effort": "low"}}
        j = post_json("https://api.anthropic.com/v1/messages",
                      {"x-api-key": key, "anthropic-version": "2023-06-01"},
                      {**cuerpo, "messages": [{"role": "user", "content": prompt}]})
        if j.get("stop_reason") in ("refusal", "max_tokens"):
            raise RuntimeError(f"el modelo no terminó la evaluación ({j['stop_reason']})")
        return "".join(b.get("text", "") for b in j["content"] if b["type"] == "text")
    j = post_json("https://api.openai.com/v1/chat/completions",
                  {"authorization": "Bearer " + key},
                  {"model": modelo, "temperature": 0.2,
                   "response_format": {"type": "json_object"},
                   "messages": [{"role": "user", "content": prompt}]})
    return j["choices"][0]["message"]["content"]


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=RAIZ, **kw)

    def _json(self, codigo, obj):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(codigo)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(cuerpo)))
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(cuerpo)

    def _prohibido(self):
        partes = [p for p in self.path.split("?")[0].split("/") if p]
        return any(p.startswith(".") or p.lower().endswith(".py") for p in partes)

    def end_headers(self):
        # sin caché: mientras se itera el prototipo, el navegador servía un app.js viejo
        if not self.path.startswith("/api/"):
            self.send_header("cache-control", "no-store")
        super().end_headers()

    def do_GET(self):
        if self.path.split("?")[0] == "/api/motor":
            return self._json(200, {"proveedores": [
                {"id": p, "modelo": PROVEEDORES[p]["modelo"], "sociedad": PROVEEDORES[p]["sociedad"]}
                for p in disponibles()]})
        if self._prohibido():
            return self.send_error(404)
        super().do_GET()

    def do_HEAD(self):
        if self._prohibido():
            return self.send_error(404)
        super().do_HEAD()

    def _guardar(self):
        """El simulador deja aquí sus resultados partida a partida: si se cae el navegador o la
        sesión, lo ya jugado (y pagado) queda en pruebas/salidas/."""
        n = int(self.headers.get("content-length") or 0)
        if n > 5_000_000:
            return self._json(413, {"error": "demasiado grande"})
        datos = json.loads(self.rfile.read(n) or b"{}")
        nombre = str(datos.get("nombre", ""))
        if not re.fullmatch(r"[a-z0-9_-]{1,60}", nombre):
            return self._json(400, {"error": "nombre inválido"})
        carpeta = os.path.join(RAIZ, "pruebas", "salidas")
        os.makedirs(carpeta, exist_ok=True)
        ruta = os.path.join(carpeta, nombre + ".json")
        # temporal con nombre único: dos guardados simultáneos (el servidor es multihilo)
        # escribían el mismo .tmp y dejaban un JSON corrupto
        tmp = f"{ruta}.{threading.get_ident()}.{time.time_ns()}.tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(datos.get("datos"), f, ensure_ascii=False, indent=1)
        os.replace(tmp, ruta)                    # nunca deja un archivo a medio escribir
        self._json(200, {"ok": True})

    def do_POST(self):
        if self.path not in ("/api/evaluar", "/api/guardar"):
            return self.send_error(404)
        # solo la propia página puede gastar la key (otra pestaña abierta no)
        origen = self.headers.get("origin")
        if origen and origen not in (f"http://localhost:{PUERTO}", f"http://127.0.0.1:{PUERTO}"):
            return self._json(403, {"error": "origen no permitido"})
        if self.path == "/api/guardar":
            try:
                return self._guardar()
            except Exception as e:
                return self._json(500, {"error": f"{type(e).__name__}: {e}"})
        try:
            n = int(self.headers.get("content-length") or 0)
            datos = json.loads(self.rfile.read(n) or b"{}")
            prov, prompt = datos.get("prov"), datos.get("prompt", "")
            if prov not in PROVEEDORES or not key_de(prov):
                return self._json(400, {"error": f"no hay key para '{prov}' en .env"})
            if not prompt or len(prompt) > MAX_PROMPT:
                return self._json(400, {"error": "prompt vacío o demasiado largo"})
            uso = "sociedad" if datos.get("uso") == "sociedad" else "jurado"
            self._json(200, {"text": evaluar(prov, prompt, uso)})
        except RuntimeError as e:
            self._json(502, {"error": str(e)})
        except Exception as e:
            self._json(500, {"error": f"{type(e).__name__}: {e}"})

    def log_message(self, fmt, *args):
        # Solo los errores de /api/: una simulación hace cientos de llamadas y una línea por
        # cada 200 llena el búfer de logs de quien esté mirando sin decir nada útil.
        if self.path.startswith("/api/") and not (len(args) > 1 and str(args[1]) == "200"):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    print(f"TRIBUNA en http://localhost:{PUERTO} | motor LLM: "
          f"{', '.join(disponibles()) or 'sin keys en .env (solo heurístico)'}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", PUERTO), Handler).serve_forever()
