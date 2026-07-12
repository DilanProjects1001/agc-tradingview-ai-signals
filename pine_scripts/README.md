# AGC AI Signals — Indicador para TradingView (Pine Script v5)

Indicador educativo que combina tres herramientas clásicas de análisis técnico
para marcar posibles señales **alcistas** y **bajistas** directamente sobre el
gráfico de precios.

> ⚠️ **Aviso:** Este indicador es solo con fines educativos y de portafolio.
> No constituye consejo financiero ni ejecuta operaciones reales.

## ¿Qué hace?

Emite señales combinando:

1. **Cruce de medias móviles (EMA 9 y EMA 21).**
   - *Alcista:* la EMA rápida cruza hacia arriba a la lenta.
   - *Bajista:* la EMA rápida cruza hacia abajo a la lenta.
2. **RSI (14) con niveles 30 / 70.**
   - *Alcista:* el RSI sale de sobreventa (cruza 30 hacia arriba).
   - *Bajista:* el RSI sale de sobrecompra (cruza 70 hacia abajo).
3. **Divergencias RSI-precio.**
   - *Alcista:* el precio hace un mínimo más bajo pero el RSI hace un mínimo más alto.
   - *Bajista:* el precio hace un máximo más alto pero el RSI hace un máximo más bajo.

En el gráfico verás triángulos (cruces de EMA), círculos (señal combinada),
etiquetas de divergencia y un fondo tenue en zonas de sobreventa/sobrecompra.

## Cómo usarlo en TradingView

1. Entra en [tradingview.com](https://www.tradingview.com) y abre cualquier gráfico.
2. Abajo, abre el **Pine Editor** (pestaña "Pine Editor" / "Editor de Pine").
3. Borra el contenido de ejemplo y **pega** todo el contenido de
   [`agc_ai_signals.pine`](agc_ai_signals.pine).
4. Pulsa **"Add to chart" / "Añadir al gráfico"**.
5. Ajusta los parámetros con el ícono de engranaje ⚙️ del indicador (EMAs, RSI,
   sensibilidad de divergencias, etc.).

## Activar las alertas (avisos)

El script incluye dos condiciones de alerta ("Señal ALCISTA" y "Señal BAJISTA").
Para recibir avisos:

1. Clic derecho en el gráfico → **"Add alert" / "Crear alerta"**.
2. En *Condition / Condición*, elige **AGC AI Signals** y la señal deseada.
3. Configura cómo quieres recibir el aviso (app, email, webhook) y guarda.

> Las alertas solo **avisan**; nunca ejecutan órdenes por sí solas.

## Modo estrategia (backtest opcional)

El script puede funcionar como **estrategia** para ver un backtest histórico.
Al final del archivo hay instrucciones: comenta la línea `indicator(...)` y
descomenta el bloque `strategy(...)`. El backtest es una simulación educativa;
no garantiza resultados futuros.

## Parámetros principales

| Parámetro | Por defecto | Qué controla |
|-----------|-------------|--------------|
| EMA rápida / lenta | 9 / 21 | Períodos de las medias móviles |
| Período RSI | 14 | Sensibilidad del RSI |
| Nivel sobreventa / sobrecompra | 30 / 70 | Zonas del RSI |
| Detectar divergencias | Activado | Activa/desactiva las divergencias |
| Barras izq./der. del pivote | 5 / 5 | Cuánto se confirma cada máximo/mínimo |

---

Parte del proyecto **tradingview-ai-signals**.
