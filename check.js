// ============================================================================
//  check.js — Autotest del proyecto tradingview-ai-signals (sin navegador)
//  Valida lo verificable de forma estatica y ejecuta los endpoints de las
//  Pages Functions con un contexto simulado. Sale con codigo 0 si todo pasa,
//  o codigo 1 si algo falla. Uso:  node check.js
// ============================================================================
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const raiz = __dirname;
const FUNC_DIR = "functions/api";
let fallos = 0;
let pruebas = 0;

function ok(msg)   { pruebas++; console.log("  ✓ " + msg); }
function fail(msg) { pruebas++; fallos++; console.log("  ✗ " + msg); }

function existe(rel) {
  const p = path.join(raiz, rel);
  fs.existsSync(p) ? ok("existe " + rel) : fail("FALTA " + rel);
  return fs.existsSync(p);
}

function leer(rel) {
  try { return fs.readFileSync(path.join(raiz, rel), "utf8"); }
  catch (e) { return ""; }
}

function contiene(rel, textos, etiqueta) {
  const c = leer(rel);
  const faltan = textos.filter(function (t) { return c.indexOf(t) < 0; });
  if (faltan.length === 0) ok(etiqueta + " (" + rel + ")");
  else fail(etiqueta + " -> falta en " + rel + ": " + faltan.join(", "));
}

// Verifica que un archivo JS parsea con `node --check`.
function sintaxis(rel, comoModulo) {
  const abs = path.join(raiz, rel);
  let objetivo = abs;
  try {
    if (comoModulo) {
      objetivo = abs + ".check.mjs";
      fs.copyFileSync(abs, objetivo);
    }
    cp.execSync('node --check "' + objetivo + '"', { stdio: "pipe" });
    ok("sintaxis JS valida: " + rel);
  } catch (e) {
    fail("sintaxis JS INVALIDA: " + rel + " -> " + (e.stderr ? e.stderr.toString().slice(0, 160) : e.message));
  } finally {
    if (comoModulo && fs.existsSync(objetivo)) fs.unlinkSync(objetivo);
  }
}

// Importa un modulo de Function (export onRequest) copiandolo a .mjs temporal.
async function cargarFuncion(rel) {
  const abs = path.join(raiz, rel);
  const tmp = abs + ".run.mjs";
  fs.copyFileSync(abs, tmp);
  try {
    const mod = await import("file://" + tmp.replace(/\\/g, "/") + "?t=" + pruebas);
    return { mod, tmp };
  } catch (e) {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    throw e;
  }
}

async function probarEndpoint(rel, request, env, etiqueta, comprobar) {
  let ref = null;
  try {
    ref = await cargarFuncion(rel);
    if (typeof ref.mod.onRequest !== "function") {
      fail(etiqueta + " -> no exporta onRequest");
      return;
    }
    const resp = await ref.mod.onRequest({ request, env: env || {} });
    const status = resp.status;
    let data = {};
    try { data = await resp.json(); } catch (e) {}
    const problema = comprobar ? comprobar(status, data) : (status === 200 ? null : "status " + status);
    if (!problema) ok(etiqueta + " -> HTTP " + status);
    else fail(etiqueta + " -> " + problema);
  } catch (e) {
    fail(etiqueta + " -> excepcion: " + (e && e.message ? e.message : e));
  } finally {
    if (ref && fs.existsSync(ref.tmp)) fs.unlinkSync(ref.tmp);
  }
}

(async function () {
  console.log("== Autotest tradingview-ai-signals ==\n");

  console.log("[1] Archivos principales");
  existe("README.md");
  existe(".gitignore");
  existe(".env.example");
  existe("wrangler.toml");
  existe("pine_scripts/agc_ai_signals.pine");
  existe("pine_scripts/agc_ai_strategy.pine");
  existe(FUNC_DIR + "/signal.js");
  existe(FUNC_DIR + "/telegram.js");
  existe("web_dashboard/index.html");
  existe("web_dashboard/styles.css");
  existe("web_dashboard/app.js");

  console.log("\n[2] Sintaxis JavaScript");
  sintaxis(FUNC_DIR + "/signal.js", true);
  sintaxis(FUNC_DIR + "/telegram.js", true);
  sintaxis("web_dashboard/app.js", false);
  sintaxis("check.js", false);

  console.log("\n[3] Contenido esperado del dashboard");
  contiene("web_dashboard/index.html", ["Explicación AI", "Confianza", "ticker", "BTC/USDT", "consejo financiero"], "columnas, ticker y disclaimer en el HTML");
  contiene("web_dashboard/app.js", ["api.binance.com", "refrescarTicker", "preciosDemo", "ai_confidence"], "logica de ticker + IA en app.js");
  contiene("web_dashboard/styles.css", [".ticker", ".tabla-senales"], "estilos de ticker y tabla");

  console.log("\n[4] Pine Scripts");
  contiene("pine_scripts/agc_ai_signals.pine", ["@version=5", "ta.ema", "ta.rsi", "divergenciaAlcista"], "indicador con EMA/RSI/divergencias");
  contiene("pine_scripts/agc_ai_strategy.pine", ["strategy(", "strategy.entry", "ta.rsi", "divergenciaAlcista"], "estrategia con entradas y logica");

  console.log("\n[5] Endpoints (Pages Functions, contexto simulado)");
  // /api/signal por GET con query params, SIN OPENAI_API_KEY -> mock 200 con disclaimer y confianza.
  await probarEndpoint(
    FUNC_DIR + "/signal.js",
    new Request("https://x/api/signal?symbol=BTCUSDT&signal_type=alcista&rsi=28&ema_cross=up&divergence=alcista"),
    {},
    "/api/signal GET (mock)",
    function (status, data) {
      if (status !== 200) return "status " + status;
      if (!data.ai_explanation) return "falta ai_explanation";
      if (typeof data.ai_confidence !== "number") return "falta ai_confidence numerico";
      if (!data.disclaimer || data.disclaimer.indexOf("consejo financiero") < 0) return "falta disclaimer";
      return null;
    }
  );
  // /api/signal por POST con body JSON.
  await probarEndpoint(
    FUNC_DIR + "/signal.js",
    new Request("https://x/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: "ETHUSDT", signal_type: "bajista", indicators: { rsi: 72, ema_cross: "down", divergence: "bajista" } }),
    }),
    {},
    "/api/signal POST (mock)",
    function (status, data) {
      if (status !== 200) return "status " + status;
      if (!data.disclaimer) return "falta disclaimer";
      return null;
    }
  );
  // /api/telegram por POST sin credenciales -> exito simulado 200.
  await probarEndpoint(
    FUNC_DIR + "/telegram.js",
    new Request("https://x/api/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Prueba de aviso" }),
    }),
    {},
    "/api/telegram POST (simulado)",
    function (status, data) {
      if (status !== 200) return "status " + status;
      if (data.ok !== true) return "ok != true";
      if (data.simulated !== true) return "deberia ser simulado sin credenciales";
      return null;
    }
  );
  // /api/telegram sin message -> 400 (validacion).
  await probarEndpoint(
    FUNC_DIR + "/telegram.js",
    new Request("https://x/api/telegram", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    {},
    "/api/telegram POST sin message (400 esperado)",
    function (status) { return status === 400 ? null : "esperaba 400, dio " + status; }
  );

  console.log("\n[6] Seguridad (sin secretos)");
  (function () {
    const env = leer(".env.example");
    const lineasConValor = env.split(/\r?\n/).filter(function (l) {
      const m = l.match(/^(OPENAI_API_KEY|TELEGRAM_BOT_TOKEN|TELEGRAM_CHAT_ID)\s*=\s*(.+)$/);
      return m && m[2].trim().length > 0;
    });
    lineasConValor.length === 0
      ? ok(".env.example no contiene valores reales")
      : fail(".env.example TIENE valores: " + lineasConValor.join(" | "));
  })();
  contiene(".gitignore", [".env", "node_modules", "_edge_profile"], ".gitignore ignora secretos y temporales");
  (function () {
    fs.existsSync(path.join(raiz, ".env"))
      ? fail("existe un archivo .env (no deberia estar en el repo)")
      : ok("no hay archivo .env en el proyecto");
  })();

  console.log("\n== Resultado ==");
  console.log(pruebas + " pruebas, " + fallos + " fallo(s).");
  if (fallos > 0) { console.log("AUTOTEST FALLIDO"); process.exit(1); }
  console.log("AUTOTEST OK");
  process.exit(0);
})();
