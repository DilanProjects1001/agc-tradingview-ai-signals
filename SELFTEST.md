# SELFTEST — tradingview-ai-signals

Documenta qué valida el autotest automático del proyecto.

## Cómo ejecutarlo

```
node check.js
```

Sale con **código 0** si todo pasa, o **código 1** si algo falla (sin necesidad
de navegador ni conexión a internet).

## Qué se prueba (22 comprobaciones)

1. **Archivos principales** existen: README, `.gitignore`, `.env.example`, los
   dos Pine Scripts, las dos funciones (`signal.js`, `telegram.js`) y los tres
   archivos del dashboard.
2. **Sintaxis JavaScript** válida (`node --check`) en `signal.js`, `telegram.js`,
   `app.js` y el propio `check.js`.
3. **Contenido del dashboard**: el HTML tiene las columnas "Explicación AI" y
   "Confianza" y el ticker; `app.js` incluye la lógica de Binance + IA; el CSS
   tiene los estilos del ticker y la tabla.
4. **Pine Scripts**: el indicador usa EMA/RSI/divergencias; la estrategia usa
   `strategy.entry` y la misma lógica.
5. **Seguridad**: `.env.example` no contiene valores reales, `.gitignore` ignora
   `.env`, `node_modules` y `_edge_profile`, y no existe ningún `.env` en el repo.

## Última ejecución

```
22 pruebas, 0 fallo(s).
AUTOTEST OK   (exit 0)
```

## Verificación visual (manual, no automatizable)

Cada iteración con UI genera una captura con Edge headless en `ui_shots/`
(`iter_0.png`, `iter_1.png`, `iter_2.png`) que se revisa a ojo para confirmar
contraste y legibilidad. La `iter_2.png` es del deploy en vivo con precios
reales de Binance.
