# tradingview-ai-signals

Proyecto de portafolio que junta **un indicador de señales para TradingView**
(Pine Script) con **un panel web** que muestra esas señales de forma clara.

> ⚠️ Solo con fines educativos y de portafolio. No es consejo financiero ni
> ejecuta operaciones reales.

## ¿Qué incluye?

- **`pine_scripts/`** — Indicador `agc_ai_signals.pine` (Pine Script v5) que
  marca señales alcistas/bajistas usando cruce de EMAs (9/21), RSI (14) y
  divergencias RSI-precio. Incluye su propio README con instrucciones para
  TradingView.
- **`web_dashboard/`** — Panel web autocontenido (HTML + CSS + JS locales, sin
  CDNs) con tema oscuro tipo terminal de trading. Muestra las señales y los
  indicadores.
- **`functions/`** — Reservado para lógica de servidor futura (p. ej. avisos por
  Telegram o análisis con IA).
- **`ui_shots/`** — Capturas de la interfaz (evidencia visual del progreso).

## Cómo abrir el panel

Abre **`web_dashboard/index.html`** con doble clic en tu navegador. No requiere
instalar nada ni conexión a internet.

## Configuración (opcional)

Copia `.env.example` como `.env` y completa las claves si vas a usar las
integraciones futuras (OpenAI, Telegram).

## Estado

Iteración 0: estructura base creada, indicador Pine listo y panel web con datos
de ejemplo. Captura en `ui_shots/iter_0.png`.
