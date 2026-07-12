# tradingview-ai-signals

Proyecto de portafolio que junta **indicadores/estrategia para TradingView**
(Pine Script) con **un panel web** que muestra las señales de forma clara, con
explicación por IA, ticker de precios en vivo y avisos por Telegram.

> ⚠️ Solo con fines educativos y de portafolio. No es consejo financiero ni
> ejecuta operaciones reales.

## 🌐 Demo en vivo

**https://agc-tradingview-ai-signals.pages.dev**

## ¿Qué incluye?

- **`pine_scripts/`** — Para TradingView (Pine Script v5):
  - `agc_ai_signals.pine`: **indicador** de señales (cruce de EMAs 9/21, RSI 14
    y divergencias RSI-precio).
  - `agc_ai_strategy.pine`: **estrategia con backtest** que usa la misma lógica
    y abre/cierra operaciones simuladas (con Stop Loss / Take Profit).
  - Incluye su propio README con instrucciones.
- **`web_dashboard/`** — Panel web autocontenido (HTML + CSS + JS locales, sin
  CDNs) con tema oscuro tipo terminal: ticker de precios (Binance), tabla de
  señales con explicación por IA y nivel de confianza.
- **`functions/`** — Cloudflare Pages Functions: `/api/signal` (explicación de
  señales con OpenAI o mock) y `/api/telegram` (envío de avisos).
- **`ui_shots/`** — Capturas de la interfaz (evidencia visual del progreso).
- **`check.js`** — Autotest sin navegador (`node check.js`).

## Cómo abrir el panel

- **En la nube:** entra a la [demo en vivo](https://agc-tradingview-ai-signals.pages.dev).
- **En local:** abre `web_dashboard/index.html` con doble clic. No requiere
  instalar nada. El ticker intenta usar Binance; si no hay internet, usa datos demo.

## Configuración (opcional)

Copia `.env.example` como `.env` y completa las claves si vas a usar las
integraciones (OpenAI para la explicación real, Telegram para avisos). En el
deploy, esas variables se configuran como *secrets* en Cloudflare Pages.

## Autotest

```
node check.js
```

Valida archivos, sintaxis JS, contenido del dashboard, los Pine Scripts y que no
haya secretos. Sale con código 0 si todo pasa.

## Estado

Iteración 2: dos Pine Scripts (indicador + estrategia), panel web con ticker de
precios en vivo y explicación por IA, desplegado en Cloudflare Pages, y autotest
en verde. Capturas en `ui_shots/`.
