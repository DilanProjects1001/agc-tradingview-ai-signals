// ============================================================================
//  check.js — Autotest del proyecto tradingview-ai-signals (sin navegador)
//  Valida lo verificable de forma estatica. Sale con codigo 0 si todo pasa,
//  o codigo 1 si algo falla. Uso:  node check.js
// ============================================================================
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const raiz = __dirname;
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
      // node --check falla con 'export' en .js; copiamos a .mjs temporal.
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

console.log("== Autotest tradingview-ai-signals ==\n");

console.log("[1] Archivos principales");
existe("README.md");
existe(".gitignore");
existe(".env.example");
existe("pine_scripts/agc_ai_signals.pine");
existe("pine_scripts/agc_ai_strategy.pine");
existe("functions/api/signal.js");
existe("functions/api/telegram.js");
existe("web_dashboard/index.html");
existe("web_dashboard/styles.css");
existe("web_dashboard/app.js");

console.log("\n[2] Sintaxis JavaScript");
sintaxis("functions/api/signal.js", true);
sintaxis("functions/api/telegram.js", true);
sintaxis("web_dashboard/app.js", false);
sintaxis("check.js", false);

console.log("\n[3] Contenido esperado del dashboard");
contiene("web_dashboard/index.html", ["Explicación AI", "Confianza", "ticker", "BTC/USDT"], "columnas y ticker en el HTML");
contiene("web_dashboard/app.js", ["api.binance.com", "refrescarTicker", "preciosDemo", "ai_confidence"], "logica de ticker + IA en app.js");
contiene("web_dashboard/styles.css", [".ticker", ".tabla-senales"], "estilos de ticker y tabla");

console.log("\n[4] Pine Scripts");
contiene("pine_scripts/agc_ai_signals.pine", ["@version=5", "ta.ema", "ta.rsi", "divergenciaAlcista"], "indicador con EMA/RSI/divergencias");
contiene("pine_scripts/agc_ai_strategy.pine", ["strategy(", "strategy.entry", "ta.rsi", "divergenciaAlcista"], "estrategia con entradas y logica");

console.log("\n[5] Seguridad (sin secretos)");
// .env.example debe tener las claves VACIAS (solo plantilla).
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
// .gitignore debe ignorar .env, node_modules y _edge_profile.
contiene(".gitignore", [".env", "node_modules", "_edge_profile"], ".gitignore ignora secretos y temporales");
// No debe existir un .env real en el repo.
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
