// ============================================================================
//  Cloudflare Pages Function — /api/telegram
// ----------------------------------------------------------------------------
//  Envia un mensaje a Telegram (POST JSON: { message, chat_id }).
//
//  - Si estan definidas TELEGRAM_BOT_TOKEN y (TELEGRAM_CHAT_ID o chat_id),
//    envia el mensaje real usando la API de Telegram con fetch nativo.
//  - Si NO estan definidas, responde con exito simulado (para probar la UI
//    sin necesitar un bot configurado).
//
//  No usa dependencias externas.
//
//  AVISO: solo con fines educativos y de portafolio. No es consejo financiero.
// ============================================================================

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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // 1) Leer el cuerpo JSON.
  let cuerpo;
  try {
    cuerpo = await request.json();
  } catch (e) {
    return json({ ok: false, error: "JSON invalido en el cuerpo de la peticion." }, 400);
  }

  const message = (cuerpo && cuerpo.message) || "";
  if (!message) {
    return json({ ok: false, error: "Falta el campo 'message'." }, 400);
  }

  // El chat_id puede venir en el cuerpo o desde la variable de entorno.
  const chatId = (cuerpo && cuerpo.chat_id) || (env && env.TELEGRAM_CHAT_ID) || null;
  const botToken = env && env.TELEGRAM_BOT_TOKEN;

  // 2) Sin credenciales -> exito simulado.
  if (!botToken || !chatId) {
    return json({
      ok: true,
      simulated: true,
      info: "Envio simulado: falta TELEGRAM_BOT_TOKEN y/o TELEGRAM_CHAT_ID. " +
            "Configura esas variables en Cloudflare para enviar mensajes reales.",
      message,
      chat_id: chatId,
    });
  }

  // 3) Con credenciales -> envio real a Telegram.
  try {
    const url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
    });

    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      return json({
        ok: false,
        error: "Telegram respondio error.",
        detalle: data,
      }, 502);
    }

    return json({ ok: true, simulated: false, telegram: { message_id: data.result && data.result.message_id } });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) }, 502);
  }
}
