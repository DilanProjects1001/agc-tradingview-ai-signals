// ============================================================================
//  Cloudflare Pages Function — /api/signal   (export onRequest)
// ----------------------------------------------------------------------------
//  Recibe una señal de trading y devuelve una explicacion en lenguaje natural
//  + un score de confianza (0-100).
//
//  - Acepta los datos por QUERY PARAMS (GET) o por BODY JSON (POST):
//      symbol, signal_type, rsi, ema_cross, divergence
//  - Si existe la variable de entorno OPENAI_API_KEY, consulta a OpenAI
//    (Chat Completions) con fetch NATIVO. Si NO existe, devuelve un mock.
//  - La respuesta SIEMPRE incluye un disclaimer de "no es consejo financiero".
//
//  Sin dependencias externas.
//
//  AVISO: solo con fines educativos y de portafolio. No es consejo financiero
//  ni ejecuta operaciones reales.
// ============================================================================

const DISCLAIMER =
  "Solo con fines educativos y de portafolio. No constituye consejo financiero " +
  "ni ejecuta operaciones reales.";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

// Punto de entrada unico. Cloudflare llama a onRequest para cualquier metodo.
export async function onRequest(context) {
  const { request, env } = context;

  // Responder al preflight de CORS.
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ---- 1) Leer los datos de la señal (query params o body JSON) ----
  let datos = {};
  try {
    const url = new URL(request.url);
    if (request.method === "POST") {
      const cuerpo = await request.json().catch(function () { return {}; });
      const ind = cuerpo.indicators || {};
      datos = {
        symbol: cuerpo.symbol,
        signal_type: cuerpo.signal_type,
        rsi: ind.rsi !== undefined ? ind.rsi : cuerpo.rsi,
        ema_cross: ind.ema_cross !== undefined ? ind.ema_cross : cuerpo.ema_cross,
        divergence: ind.divergence !== undefined ? ind.divergence : cuerpo.divergence,
      };
    } else {
      // GET: leer de la query string.
      const p = url.searchParams;
      datos = {
        symbol: p.get("symbol"),
        signal_type: p.get("signal_type"),
        rsi: p.get("rsi") !== null ? Number(p.get("rsi")) : undefined,
        ema_cross: p.get("ema_cross") || undefined,
        divergence: p.get("divergence") || undefined,
      };
    }
  } catch (e) {
    return json({ error: "No se pudieron leer los datos de la señal." }, 400);
  }

  const symbol = datos.symbol || "DESCONOCIDO";
  const signalType = datos.signal_type || "neutral";
  const indicadores = { rsi: datos.rsi, ema_cross: datos.ema_cross, divergence: datos.divergence };

  // ---- 2) Con clave de OpenAI: explicacion real ----
  if (env && env.OPENAI_API_KEY) {
    try {
      const r = await explicarConOpenAI(env.OPENAI_API_KEY, symbol, signalType, indicadores);
      return json({
        source: "openai",
        symbol,
        signal_type: signalType,
        indicators: indicadores,
        ai_explanation: r.explicacion,
        ai_confidence: r.confianza,
        disclaimer: DISCLAIMER,
      });
    } catch (err) {
      // Si OpenAI falla, degradamos a mock (nunca rompemos la respuesta).
      const m = explicacionMock(symbol, signalType, indicadores);
      return json({
        source: "mock_fallback",
        error_openai: String(err && err.message ? err.message : err),
        symbol,
        signal_type: signalType,
        indicators: indicadores,
        ai_explanation: m.explicacion,
        ai_confidence: m.confianza,
        disclaimer: DISCLAIMER,
      });
    }
  }

  // ---- 3) Sin clave: respuesta simulada ----
  const m = explicacionMock(symbol, signalType, indicadores);
  return json({
    source: "mock",
    symbol,
    signal_type: signalType,
    indicators: indicadores,
    ai_explanation: m.explicacion,
    ai_confidence: m.confianza,
    disclaimer: DISCLAIMER,
  });
}

// ----------------------------------------------------------------------------
//  Llamada a OpenAI (Chat Completions) con fetch nativo.
// ----------------------------------------------------------------------------
async function explicarConOpenAI(apiKey, symbol, signalType, ind) {
  const prompt =
    "Eres un analista tecnico educativo. Explica en 2-3 frases y en español " +
    "por que la siguiente señal es '" + signalType + "' para " + symbol +
    ". Indicadores -> RSI: " + fmt(ind.rsi) +
    ", cruce EMA: " + fmt(ind.ema_cross) +
    ", divergencia: " + fmt(ind.divergence) + ". " +
    "Al final, en una linea aparte, escribe 'CONFIANZA: N' donde N es un entero 0-100. " +
    "No des consejo financiero.";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Analista tecnico educativo. Responde en español, breve y claro." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 200,
    }),
  });

  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error("OpenAI respondio " + resp.status + ": " + texto.slice(0, 200));
  }

  const data = await resp.json();
  const contenido = (((data.choices || [])[0] || {}).message || {}).content || "";

  let confianza = 60;
  const mm = contenido.match(/CONFIANZA:\s*(\d{1,3})/i);
  if (mm) confianza = Math.max(0, Math.min(100, parseInt(mm[1], 10)));

  const explicacion = contenido.replace(/\n?CONFIANZA:\s*\d{1,3}\s*$/i, "").trim();
  return { explicacion: explicacion || contenido.trim(), confianza };
}

// ----------------------------------------------------------------------------
//  Explicacion simulada (mock) — determinista segun los indicadores.
// ----------------------------------------------------------------------------
function explicacionMock(symbol, signalType, ind) {
  const esAlcista = String(signalType).toLowerCase().indexOf("alcista") >= 0 ||
                    String(signalType).toLowerCase() === "bullish";
  const partes = [];
  let confianza = 50;

  if (typeof ind.rsi === "number" && !isNaN(ind.rsi)) {
    if (ind.rsi < 30) { partes.push("el RSI en " + ind.rsi + " indica sobreventa"); confianza += 12; }
    else if (ind.rsi > 70) { partes.push("el RSI en " + ind.rsi + " indica sobrecompra"); confianza += 12; }
    else { partes.push("el RSI en " + ind.rsi + " esta en zona neutral"); }
  }
  if (ind.ema_cross === "up" || ind.ema_cross === "alcista") { partes.push("el cruce de EMAs es alcista"); confianza += 15; }
  else if (ind.ema_cross === "down" || ind.ema_cross === "bajista") { partes.push("el cruce de EMAs es bajista"); confianza += 15; }
  if (ind.divergence && String(ind.divergence).toLowerCase() !== "none" && String(ind.divergence).toLowerCase() !== "ninguna") {
    partes.push("se detecto una divergencia " + ind.divergence); confianza += 10;
  }

  const razones = partes.length ? partes.join(", ") + "." : "los indicadores no muestran una señal fuerte.";
  const sentido = esAlcista ? "una posible subida" : "una posible bajada";
  const explicacion =
    "Señal " + signalType + " en " + symbol + ": " + razones +
    " En conjunto sugiere " + sentido + " (analisis educativo, no consejo financiero).";

  confianza = Math.max(0, Math.min(100, confianza));
  return { explicacion, confianza };
}

function fmt(v) {
  return (v === undefined || v === null || (typeof v === "number" && isNaN(v))) ? "n/d" : String(v);
}
