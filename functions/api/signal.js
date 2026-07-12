// ============================================================================
//  Cloudflare Pages Function — /api/signal
// ----------------------------------------------------------------------------
//  Recibe una señal de trading (POST JSON) y devuelve una explicacion en
//  lenguaje natural + un nivel de confianza (0-100).
//
//  - Si existe la variable de entorno OPENAI_API_KEY, consulta a OpenAI.
//  - Si NO existe, devuelve una respuesta simulada (mock) igual de util para
//    ver la interfaz funcionando sin gastar creditos ni requerir claves.
//
//  No usa dependencias externas: solo el fetch nativo del runtime de Cloudflare.
//
//  AVISO: solo con fines educativos y de portafolio. No es consejo financiero
//  ni ejecuta operaciones reales.
// ============================================================================

const DISCLAIMER =
  "Solo con fines educativos y de portafolio. No constituye consejo financiero " +
  "ni ejecuta operaciones reales.";

// Cabeceras CORS para permitir que el panel web llame a esta funcion.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

// Responder a las peticiones "preflight" de CORS.
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) Leer y validar el cuerpo JSON.
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch (e) {
    return json({ error: "JSON invalido en el cuerpo de la peticion." }, 400);
  }

  const symbol = (cuerpo && cuerpo.symbol) || "DESCONOCIDO";
  const signalType = (cuerpo && cuerpo.signal_type) || "neutral";
  const indicators = (cuerpo && cuerpo.indicators) || {};
  const rsi = indicators.rsi;
  const emaCross = indicators.ema_cross;
  const divergence = indicators.divergence;

  // 2) Si hay clave de OpenAI, pedir una explicacion real.
  if (env && env.OPENAI_API_KEY) {
    try {
      const resultado = await explicarConOpenAI(env.OPENAI_API_KEY, {
        symbol, signalType, rsi, emaCross, divergence,
      });
      return json({
        source: "openai",
        symbol,
        signal_type: signalType,
        ai_explanation: resultado.explicacion,
        ai_confidence: resultado.confianza,
        disclaimer: DISCLAIMER,
      });
    } catch (err) {
      // Si OpenAI falla, degradamos a mock (nunca rompemos la UI).
      const mock = explicacionMock({ symbol, signalType, rsi, emaCross, divergence });
      return json({
        source: "mock_fallback",
        error_openai: String(err && err.message ? err.message : err),
        symbol,
        signal_type: signalType,
        ai_explanation: mock.explicacion,
        ai_confidence: mock.confianza,
        disclaimer: DISCLAIMER,
      });
    }
  }

  // 3) Sin clave: respuesta simulada.
  const mock = explicacionMock({ symbol, signalType, rsi, emaCross, divergence });
  return json({
    source: "mock",
    symbol,
    signal_type: signalType,
    ai_explanation: mock.explicacion,
    ai_confidence: mock.confianza,
    disclaimer: DISCLAIMER,
  });
}

// ----------------------------------------------------------------------------
//  Llamada a OpenAI usando fetch nativo (Chat Completions).
// ----------------------------------------------------------------------------
async function explicarConOpenAI(apiKey, datos) {
  const prompt =
    "Eres un analista tecnico educativo. Explica en 2-3 frases y en español " +
    "por que la siguiente señal es '" + datos.signalType + "' para " + datos.symbol +
    ". Indicadores -> RSI: " + fmt(datos.rsi) +
    ", cruce EMA: " + fmt(datos.emaCross) +
    ", divergencia: " + fmt(datos.divergence) + ". " +
    "Al final, en una linea aparte, escribe 'CONFIANZA: N' donde N es un entero 0-100 " +
    "que refleje que tan clara es la señal. No des consejo financiero.";

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

  // Extraer la confianza de la linea 'CONFIANZA: N'.
  let confianza = 60;
  const m = contenido.match(/CONFIANZA:\s*(\d{1,3})/i);
  if (m) confianza = Math.max(0, Math.min(100, parseInt(m[1], 10)));

  // Quitar la linea de confianza del texto mostrado.
  const explicacion = contenido.replace(/\n?CONFIANZA:\s*\d{1,3}\s*$/i, "").trim();

  return { explicacion: explicacion || contenido.trim(), confianza };
}

// ----------------------------------------------------------------------------
//  Explicacion simulada (mock) — determinista segun los indicadores.
// ----------------------------------------------------------------------------
function explicacionMock(datos) {
  const esAlcista = String(datos.signalType).toLowerCase().indexOf("alcista") >= 0 ||
                    String(datos.signalType).toLowerCase() === "bullish";
  const partes = [];
  let confianza = 50;

  if (typeof datos.rsi === "number") {
    if (datos.rsi < 30) { partes.push("el RSI en " + datos.rsi + " indica sobreventa"); confianza += 12; }
    else if (datos.rsi > 70) { partes.push("el RSI en " + datos.rsi + " indica sobrecompra"); confianza += 12; }
    else { partes.push("el RSI en " + datos.rsi + " esta en zona neutral"); }
  }
  if (datos.emaCross === "up" || datos.emaCross === "alcista") { partes.push("el cruce de EMAs es alcista"); confianza += 15; }
  else if (datos.emaCross === "down" || datos.emaCross === "bajista") { partes.push("el cruce de EMAs es bajista"); confianza += 15; }

  if (datos.divergence && String(datos.divergence).toLowerCase() !== "none" && String(datos.divergence).toLowerCase() !== "ninguna") {
    partes.push("se detecto una divergencia " + datos.divergence); confianza += 10;
  }

  const razones = partes.length ? partes.join(", ") + "." : "los indicadores no muestran una señal fuerte.";
  const sentido = esAlcista ? "una posible subida" : "una posible bajada";
  const explicacion =
    "Señal " + datos.signalType + " en " + datos.symbol + ": " + razones +
    " En conjunto sugiere " + sentido + " (analisis educativo, no consejo financiero).";

  confianza = Math.max(0, Math.min(100, confianza));
  return { explicacion, confianza };
}

function fmt(v) {
  return (v === undefined || v === null) ? "n/d" : String(v);
}
