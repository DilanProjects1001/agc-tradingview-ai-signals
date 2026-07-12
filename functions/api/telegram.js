// ============================================================================
//  Cloudflare Pages Function — /api/telegram   (export onRequest)
// ----------------------------------------------------------------------------
//  Envia un mensaje de aviso a Telegram.
//
//  - Acepta { message, chat_id } por BODY JSON (POST) o por QUERY (GET).
//  - Si estan definidas TELEGRAM_BOT_TOKEN y (TELEGRAM_CHAT_ID o chat_id),
//    envia el mensaje real usando la API de Telegram con fetch NATIVO.
//  - Si NO estan definidas, responde con exito SIMULADO (para probar la UI
//    sin un bot configurado).
//
//  Sin dependencias externas.
//
//  AVISO: solo con fines educativos y de portafolio. No es consejo financiero.
// ============================================================================

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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  // ---- Leer message y chat_id (body JSON o query params) ----
  let message = "";
  let chatIdBody = null;
  try {
    const url = new URL(request.url);
    if (request.method === "POST") {
      const cuerpo = await request.json().catch(function () { return {}; });
      message = cuerpo.message || "";
      chatIdBody = cuerpo.chat_id || null;
    } else {
      message = url.searchParams.get("message") || "";
      chatIdBody = url.searchParams.get("chat_id") || null;
    }
  } catch (e) {
    return json({ ok: false, error: "No se pudo leer la peticion." }, 400);
  }

  if (!message) {
    return json({ ok: false, error: "Falta el campo 'message'." }, 400);
  }

  const chatId = chatIdBody || (env && env.TELEGRAM_CHAT_ID) || null;
  const botToken = env && env.TELEGRAM_BOT_TOKEN;

  // ---- Sin credenciales -> exito simulado ----
  if (!botToken || !chatId) {
    return json({
      ok: true,
      simulated: true,
      info: "Envio simulado: faltan TELEGRAM_BOT_TOKEN y/o TELEGRAM_CHAT_ID. " +
            "Configuralos como variables/secrets en Cloudflare para enviar mensajes reales.",
      message,
      chat_id: chatId,
    });
  }

  // ---- Con credenciales -> envio real a Telegram ----
  try {
    const url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      return json({ ok: false, error: "Telegram respondio error.", detalle: data }, 502);
    }
    return json({ ok: true, simulated: false, telegram: { message_id: data.result && data.result.message_id } });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 502);
  }
}
