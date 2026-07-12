/* ==========================================================================
   AGC AI Signals — Logica del panel (JavaScript local, sin dependencias)
   Muestra señales con explicacion generada por IA y nivel de confianza.
   Al cargar intenta consultar la funcion /api/signal; si no responde
   (p. ej. abriendo el HTML como archivo local), usa una explicacion mock.
   ========================================================================== */

// Señales base (datos de ejemplo). La explicacion AI y la confianza se
// completan al cargar, ya sea desde /api/signal o desde el mock local.
const senalesBase = [
  {
    tipo: "alcista",
    par: "BTC/USDT",
    signal_type: "alcista",
    motivo: "Cruce EMA 9/21 + RSI sale de sobreventa",
    hora: "10:42",
    indicators: { rsi: 28, ema_cross: "up", divergence: "alcista" },
    ai_explanation: "",
    ai_confidence: null,
  },
  {
    tipo: "bajista",
    par: "ETH/USDT",
    signal_type: "bajista",
    motivo: "Divergencia bajista RSI-precio",
    hora: "09:18",
    indicators: { rsi: 72, ema_cross: "down", divergence: "bajista" },
    ai_explanation: "",
    ai_confidence: null,
  },
  {
    tipo: "alcista",
    par: "SOL/USDT",
    signal_type: "alcista",
    motivo: "Divergencia alcista RSI-precio",
    hora: "08:05",
    indicators: { rsi: 41, ema_cross: "up", divergence: "alcista" },
    ai_explanation: "",
    ai_confidence: null,
  },
];

// --------------------------------------------------------------------------
//  Consulta la explicacion AI de una señal.
//  Intenta /api/signal; si falla, genera un mock local equivalente.
// --------------------------------------------------------------------------
async function obtenerExplicacion(senal) {
  const payload = {
    symbol: senal.par,
    signal_type: senal.signal_type,
    indicators: senal.indicators,
  };

  try {
    const resp = await fetch("/api/signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        ai_explanation: data.ai_explanation || mockLocal(senal).ai_explanation,
        ai_confidence: (typeof data.ai_confidence === "number") ? data.ai_confidence : mockLocal(senal).ai_confidence,
      };
    }
  } catch (e) {
    // Sin servidor (archivo local) o error de red -> caemos al mock.
  }
  return mockLocal(senal);
}

// Explicacion simulada en el navegador (misma logica que el mock del backend).
function mockLocal(senal) {
  const ind = senal.indicators || {};
  const partes = [];
  let conf = 50;

  if (typeof ind.rsi === "number") {
    if (ind.rsi < 30) { partes.push("el RSI en " + ind.rsi + " indica sobreventa"); conf += 12; }
    else if (ind.rsi > 70) { partes.push("el RSI en " + ind.rsi + " indica sobrecompra"); conf += 12; }
    else { partes.push("el RSI en " + ind.rsi + " esta en zona neutral"); }
  }
  if (ind.ema_cross === "up") { partes.push("el cruce de EMAs es alcista"); conf += 15; }
  else if (ind.ema_cross === "down") { partes.push("el cruce de EMAs es bajista"); conf += 15; }
  if (ind.divergence && ind.divergence !== "none" && ind.divergence !== "ninguna") {
    partes.push("hay divergencia " + ind.divergence); conf += 10;
  }

  const razones = partes.length ? partes.join(", ") + "." : "sin señal fuerte.";
  const sentido = senal.tipo === "alcista" ? "una posible subida" : "una posible bajada";
  conf = Math.max(0, Math.min(100, conf));

  return {
    ai_explanation: "Señal " + senal.signal_type + ": " + razones + " Sugiere " + sentido +
                    " (análisis educativo, no consejo financiero).",
    ai_confidence: conf,
  };
}

// Devuelve una clase de color segun el nivel de confianza.
function claseConfianza(v) {
  if (v >= 70) return "verde";
  if (v >= 45) return "amarillo";
  return "rojo";
}

// --------------------------------------------------------------------------
//  Pinta las filas de la tabla de señales.
// --------------------------------------------------------------------------
function pintarSenales(lista) {
  const cont = document.getElementById("cuerpo-tabla");
  if (!cont) return;

  if (!lista || lista.length === 0) {
    cont.innerHTML = '<tr><td colspan="6" class="placeholder-vacio">Sin señales por ahora. Esperando datos del indicador…</td></tr>';
    return;
  }

  cont.innerHTML = lista.map(function (s) {
    const clase = s.tipo === "alcista" ? "alcista" : "bajista";
    const texto = s.tipo === "alcista" ? "ALCISTA" : "BAJISTA";
    const conf = (typeof s.ai_confidence === "number") ? s.ai_confidence : "…";
    const claseConf = (typeof s.ai_confidence === "number") ? claseConfianza(s.ai_confidence) : "amarillo";
    const explic = s.ai_explanation || "Generando explicación…";
    const pct = (typeof s.ai_confidence === "number") ? s.ai_confidence : 0;

    return (
      '<tr>' +
        '<td><span class="etiqueta ' + clase + '">' + texto + '</span></td>' +
        '<td class="par">' + s.par + '</td>' +
        '<td class="motivo">' + s.motivo + '</td>' +
        '<td class="explicacion">' + explic + '</td>' +
        '<td class="confianza">' +
          '<div class="conf-num valor ' + claseConf + '">' + conf + (typeof conf === "number" ? "%" : "") + '</div>' +
          '<div class="barra"><span class="barra-relleno ' + claseConf + '" style="width:' + pct + '%"></span></div>' +
        '</td>' +
        '<td class="hora">' + s.hora + '</td>' +
      '</tr>'
    );
  }).join("");
}

// Actualiza la hora del encabezado (reloj simple).
function actualizarReloj() {
  const el = document.getElementById("reloj");
  if (!el) return;
  const ahora = new Date();
  el.textContent = ahora.toLocaleTimeString("es-ES");
}

// --------------------------------------------------------------------------
//  Arranque del panel.
// --------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async function () {
  // 1) Pintado inicial (muestra "Generando explicación…").
  pintarSenales(senalesBase);
  actualizarReloj();
  setInterval(actualizarReloj, 1000);

  // 2) Completar explicacion AI + confianza de cada señal.
  const enriquecidas = await Promise.all(
    senalesBase.map(async function (s) {
      const ai = await obtenerExplicacion(s);
      return Object.assign({}, s, ai);
    })
  );

  // 3) Repintar con la informacion de IA.
  pintarSenales(enriquecidas);
});
