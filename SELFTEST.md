# SELFTEST — tradingview-ai-signals

Documenta qué valida el autotest automático del proyecto.

## Cómo ejecutarlo

```
node check.js
```

Sale con **código 0** si todo pasa, o **código 1** si algo falla (sin necesidad
de navegador ni conexión a internet).

## Qué se prueba (27 comprobaciones)

1. **Archivos principales** existen: README, `.gitignore`, `.env.example`,
   `wrangler.toml`, los dos Pine Scripts, las dos Functions
   (`functions/api/signal.js` y `telegram.js`, en la raíz) y los tres archivos
   del dashboard.
2. **Sintaxis JavaScript** válida (`node --check`) en las dos Functions, `app.js`
   y el propio `check.js`.
3. **Contenido del dashboard**: el HTML tiene las columnas "Explicación AI" y
   "Confianza", el ticker y el disclaimer ("consejo financiero"); `app.js`
   incluye la lógica de Binance + IA; el CSS tiene los estilos del ticker y la
   tabla.
4. **Pine Scripts**: el indicador usa EMA/RSI/divergencias; la estrategia usa
   `strategy.entry` y la misma lógica.
5. **Endpoints (Pages Functions con contexto simulado)** — se importa cada
   Function y se invoca `onRequest` con un `Request` y un `env` de prueba:
   - `/api/signal` **GET** con query params, sin `OPENAI_API_KEY` → **HTTP 200**
     con `ai_explanation`, `ai_confidence` numérico y `disclaimer`.
   - `/api/signal` **POST** con body JSON → **HTTP 200** con `disclaimer`.
   - `/api/telegram` **POST** sin credenciales → **HTTP 200** con éxito simulado.
   - `/api/telegram` **POST** sin `message` → **HTTP 400** (validación).
6. **Seguridad**: `.env.example` no contiene valores reales, `.gitignore` ignora
   `.env`, `node_modules` y `_edge_profile`, y no existe ningún `.env` en el repo.

## Última ejecución

```
27 pruebas, 0 fallo(s).
AUTOTEST OK   (exit 0)
```

## Verificación en producción (deploy)

Tras desplegar, los endpoints se comprueban con `curl` contra
`https://agc-tradingview-ai-signals.pages.dev/api/signal` y `/api/telegram`
(ver reporte de iteración). Sin las variables `OPENAI_API_KEY` /
`TELEGRAM_BOT_TOKEN` configuradas en Cloudflare, responden en modo simulado
(mock) con el disclaimer incluido.

## Verificación visual (manual, no automatizable)

Cada iteración con UI genera una captura con Edge headless en `ui_shots/`
(`iter_0.png` … `iter_3.png`) que se revisa a ojo para confirmar contraste y
legibilidad.
