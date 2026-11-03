# LifeOS — Finanzas personales

Aplicación web para controlar ingresos, gastos y ahorro. Funciona sin servidor ni
dependencias: los datos se guardan en el `localStorage` del navegador.

## Cómo usarla

Abre `index.html` con doble clic en Chrome, Edge o Firefox. No hace falta instalar nada.

> Los datos quedan en el navegador y en la ruta desde donde se abre el archivo.
> Si cambias de navegador o de equipo, usa **Mi perfil → Exportar / Importar respaldo**.

### Instalarla como app en el celular

Versión publicada: https://emabolanos.github.io/LifeOS/

- **iPhone (Safari):** Compartir → *Agregar a inicio*.
- **Android (Chrome):** menú ⋮ → *Instalar app* o *Agregar a pantalla principal*.

Se abre a pantalla completa, con su propio ícono, y funciona sin conexión.

> **iPhone:** la app instalada guarda sus datos aparte de Safari. Si ya registraste
> datos en Safari, expórtalos desde Safari e impórtalos dentro de la app instalada.

## Estructura

```
index.html          Estructura de la página y diálogos
css/styles.css      Estilos (tokens de color al inicio del archivo)
js/money.js         Montos en céntimos, conversión CRC/USD y formato
js/dates.js         Fechas "AAAA-MM-DD" y períodos (mes / quincena)
js/storage.js       Única capa que toca localStorage (reemplazable por otro servicio)
js/model.js         Estructura de datos, validación, migración y cálculos
js/app.js           Interfaz: vistas, formularios, diálogos y eventos
tests/logic.test.js Pruebas de la lógica: node tests/logic.test.js
manifest.webmanifest Datos para instalarla como app (nombre, íconos, colores)
sw.js               Uso sin conexión (red primero, copia local como respaldo)
icons/              Íconos de la app
fonts/              Source Sans 3 (licencia SIL OFL 1.1, ver fonts/OFL.txt)
```

Diseño: estilo "Aero" (cielo celeste a blanco, tarjetas de vidrio y brillos suaves),
tema claro por defecto y opción de oscuro o automático en Mi perfil → Apariencia, barras translúcidas
en el celular, título grande que se compacta al desplazarse y tamaños de letra
en `rem`. En iPhone se respeta el tamaño de texto elegido en Ajustes.

## Reglas principales

- **Saldo disponible = ingresos − gastos − ahorro reservado.** El ahorro no es un gasto ni una categoría.
- Los montos se guardan como enteros en céntimos y el tipo de cambio como céntimos de colón por US$1.
- Cada movimiento guarda su propio tipo de cambio. Cambiar la tasa del perfil solo afecta a movimientos nuevos.
- Los ingresos cuentan según su **período asignado** (sugerido por la fecha: días 1–15 = 1.ª quincena), y los gastos y ahorros según su fecha.
- La vista mensual es siempre la suma exacta de sus dos quincenas.
- Los datos tienen número de `version`. Los datos sin versión (de una versión anterior) se conservan en `legacy` y no se borran.
