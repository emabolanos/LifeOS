# Proyecto LifeOS — Rediseño hacia una aplicación de finanzas personales

## 1. Contexto del proyecto

LifeOS es una aplicación web, inicialmente diseñada como un gestor personal con módulos de finanzas, tareas, vehículo, alertas y configuración.

Ya existe una primera versión funcional, con interfaz responsive, diseño moderno y almacenamiento local. El código fuente actual está en esta carpeta y es el punto de partida.

**El objetivo es transformar LifeOS en una aplicación exclusivamente de finanzas personales**, simplificando considerablemente la experiencia.

No comenzar desde cero si se puede reutilizar correctamente la arquitectura, el CSS y las funcionalidades que ya existen.

## 2. Objetivo principal

Crear una aplicación donde pueda:

- Registrar mis ingresos salariales de manera mensual o quincenal.
- Agregar ingresos adicionales cuando sea necesario.
- Crear, modificar y eliminar libremente mis propias categorías de gastos.
- Registrar los gastos que realizo.
- Establecer cuánto dinero quiero destinar al ahorro.
- Consultar cuánto dinero he gastado y cuánto tengo disponible.
- Consultar el historial financiero de meses y quincenas anteriores.
- Gestionar mi perfil personal.
- Almacenar toda mi información localmente en el navegador.

La aplicación debe sentirse sencilla, intuitiva, elegante y rápida.

**No quiero un software de contabilidad complejo. Quiero una herramienta personal para controlar mi dinero.**

## 3. Funcionalidades que deben eliminarse

Eliminar completamente:

1. Gestión de vehículos.
2. Mantenimiento de vehículos.
3. Gestión de tareas y pendientes.
4. Alertas y notificaciones.
5. Reglas automáticas relacionadas con tareas, vehículos o alertas.

También eliminar sus botones, elementos del menú, formularios, componentes, estilos y referencias que ya no sean necesarios.

Mantener únicamente las funciones relacionadas con finanzas personales y configuración del usuario.

Revisar cuidadosamente las dependencias antes de eliminar código para no romper funcionalidades compartidas.

## 4. Funcionalidades principales

### A. Gestión de ingresos

Registrar ingresos eligiendo la frecuencia con la que recibo mi salario:

- **Mensual:** registro el salario recibido en un mes.
- **Quincenal:** registro cuánto recibí en la primera o segunda quincena del mes.

Debe ser posible registrar montos diferentes en cada período, porque mi salario puede variar.

Cada ingreso tendrá:

- Monto.
- Moneda.
- Fecha en que lo recibí.
- Período correspondiente.
- Descripción opcional.
- Tipo de ingreso: salario u otro.

**Regla del período:** el período se sugiere automáticamente a partir de la fecha (día 1–15 = primera quincena, día 16 en adelante = segunda quincena), pero puedo cambiarlo manualmente en el formulario. Esto cubre casos como un pago que llega el día 1 pero corresponde a la quincena anterior. Las estadísticas de ingresos se calculan según el período asignado, no solo según la fecha.

Los ingresos podrán editarse y eliminarse.

No registrar ingresos futuros automáticamente como si ya hubieran sido recibidos.

### B. Categorías de gastos personalizables

Este es uno de los requisitos más importantes.

Quiero administrar completamente mis categorías. Puedes ofrecer ejemplos iniciales como:

- Gimnasio.
- Teléfono.
- Gasolina.
- Gastos diarios.

**El ahorro NO es una categoría de gasto** (ver sección D), por lo que no debe aparecer entre las categorías.

Las categorías no deben estar programadas de manera fija. Debo poder crear, renombrar y eliminar categorías desde la interfaz, sin modificar código.

Cada categoría tiene:

- Nombre.
- Ícono.
- Tipo: **fijo** (se repite con un monto similar, como teléfono o gimnasio) o **variable** (cambia según el consumo, como gasolina o comida).
- Presupuesto opcional, definido **por mes**. En la vista quincenal, el presupuesto se muestra como la mitad del presupuesto mensual.

Cuando elimine una categoría que ya tiene movimientos, la aplicación debe ofrecer reasignar esos movimientos a otra categoría o conservarlos como "Sin categoría", para no perder el historial financiero.

### C. Registro de gastos

Registro rápido de gastos con los campos:

- Monto.
- Categoría.
- Fecha.
- Descripción opcional.
- Moneda.

Debe permitir editar o eliminar gastos y mostrar el total gastado por categoría durante un período.

Debe permitir registrar múltiples gastos dentro de una misma categoría. Ejemplo: varias compras de gasolina durante el mes, viendo el total acumulado.

Los gastos se asignan al período según su fecha.

### D. Ahorros

El ahorro se gestiona como dinero reservado, no como un gasto de consumo y no como una categoría.

Puedo registrar cuánto separo para ahorrar, con monto, moneda, fecha y descripción opcional. Los registros de ahorro se pueden editar y eliminar.

En esta versión solo se registran aportes al ahorro; no se requiere gestionar retiros ni metas de ahorro.

El dashboard debe mostrar claramente:

- Ingresos recibidos.
- Gastos realizados.
- Dinero destinado a ahorro.
- Saldo disponible.

Fórmula principal:

**Saldo disponible = ingresos − gastos − ahorro reservado**

El ahorro nunca debe contarse como gasto, para no restarlo dos veces.

### E. Gestión por períodos

Dos formas de analizar las finanzas:

- **Vista mensual:** todos los ingresos, gastos y ahorros de un mes.
- **Vista quincenal:** primera quincena (días 1 al 15) y segunda quincena (día 16 al último día del mes).

Un selector sencillo para cambiar entre meses y quincenas, y para navegar a períodos anteriores.

Los movimientos conservan su fecha real y las estadísticas se calculan según el período seleccionado.

Cambiar entre vista mensual y quincenal no debe duplicar movimientos ni ingresos. La vista mensual es siempre la suma exacta de sus dos quincenas.

### F. Monedas

Trabajar con colones costarricenses (CRC) y dólares estadounidenses (USD).

- Puedo seleccionar una moneda principal en mi perfil.
- Hay un tipo de cambio configurable manualmente en el perfil (no se consulta ningún servicio externo y no se usa una tasa inventada).
- **Cada movimiento registrado en una moneda distinta a la principal guarda el tipo de cambio vigente al momento de registrarlo.** El dashboard convierte usando la tasa guardada en cada movimiento.
- Cambiar el tipo de cambio en el perfil solo afecta los movimientos nuevos; nunca recalcula ni altera movimientos históricos.
- Al editar un movimiento, se puede corregir su tipo de cambio guardado si es necesario.
- Siempre se conservan el monto y la moneda originales del movimiento, y se muestran en el listado.
- Si cambio la moneda principal, los totales se recalculan a partir de los montos originales y sus tasas guardadas, sin modificar los registros.

## 5. Dashboard principal

La pantalla inicial es el elemento central de LifeOS. Debe presentar:

1. Saldo disponible.
2. Total de ingresos del período.
3. Total de gastos del período.
4. Total reservado para ahorro.
5. Distribución del gasto entre categorías, identificando fácilmente cuáles consumen más dinero.
6. Progreso frente al presupuesto en las categorías que lo tengan.
7. Movimientos recientes.

Usar gráficos solo cuando realmente ayuden. Preferir tarjetas simples, barras de progreso y gráficos pequeños, no un dashboard saturado.

Todos los importes se calculan a partir de los registros existentes, nunca de valores fijos.

Cuando no existan movimientos, mostrar un estado vacío elegante que invite a comenzar.

## 6. Pantallas principales

Navegación con cuatro secciones:

1. **Dashboard:** resumen general del período seleccionado.
2. **Movimientos:** listado de ingresos, gastos y ahorros para registrar, buscar, filtrar, editar y eliminar.
3. **Categorías:** crear, editar y eliminar categorías y configurar presupuestos opcionales.
4. **Mi perfil:** información personal, moneda principal, frecuencia salarial, tipo de cambio y respaldos.

No agregar pantallas innecesarias.

## 7. Perfil de usuario

En el primer acceso, solicitar:

- Nombre.
- Nombre para mostrar (opcional).
- Moneda principal.
- Frecuencia salarial: mensual o quincenal.

Mostrar un saludo personalizado en el dashboard. Ejemplo: "Hola, Emanuel. Así están tus finanzas este mes".

La frecuencia salarial define la vista por defecto del dashboard (mensual o quincenal), pero siempre puedo cambiar de vista con el selector.

Implementar un **perfil local**, sin servidor ni autenticación real. No simular un login con contraseñas almacenadas en localStorage.

Mantener la capa de almacenamiento separada del resto, para que en el futuro se pueda integrar un servicio como Supabase sin reescribir la aplicación. No implementar esa integración ahora.

## 8. Almacenamiento de datos

**Requisito fundamental: conservar el almacenamiento local.** La aplicación funciona sin backend y guarda movimientos, categorías, perfil y configuraciones entre sesiones. Si el proyecto actual usa localStorage, se conserva en esta etapa.

Requisitos:

- Persistir los cambios automáticamente.
- Evitar pérdida de información al actualizar la página.
- Usar identificadores únicos para cada registro.
- **Guardar los montos como números enteros en la unidad mínima (céntimos)** para evitar errores de redondeo, y formatearlos solo al mostrarlos.
- Permitir exportar todos los datos a JSON.
- Permitir importar un respaldo JSON validado, mostrando un error claro si el archivo no es válido y pidiendo confirmación antes de reemplazar los datos actuales.
- Mantener una estructura de datos organizada y con número de versión.
- Si existen datos financieros de la versión anterior, migrarlos a la nueva estructura sin borrarlos. Los datos de tareas, vehículos y alertas pueden dejar de usarse, pero no borrarse sin mi confirmación.
- No eliminar datos sin confirmación.
- No almacenar información sensible innecesaria.

Indicar en la interfaz (por ejemplo, en Mi perfil) que los datos son locales, no se sincronizan entre dispositivos y que conviene exportar respaldos periódicamente.

## 9. Diseño visual y experiencia de usuario

Conservar el estilo elegante de la versión actual:

- Blanco como fondo principal.
- Grises claros para tarjetas, divisores y fondos secundarios.
- Gris oscuro para textos y navegación.
- Naranja tostado como color de acento.
- Sin colores demasiado llamativos ni gradientes excesivos.

Estilo: minimalista, moderno, profesional, espacioso, intuitivo, responsive y consistente en todas las pantallas.

Tomar como referencia aplicaciones modernas de finanzas y productividad, sin copiar ningún diseño existente.

Priorizar una excelente experiencia en computadora y celular, con iconografía consistente, buena tipografía, botones claros, estados vacíos y formularios fáciles de usar.

## 10. Arquitectura y código

Primero inspeccionar los archivos existentes: tecnología usada, estructura de datos, componentes reutilizables y lógica actual.

No introducir React, nuevas dependencias ni una arquitectura más compleja sin explicar antes por qué son necesarios y esperar mi aprobación.

Se puede reorganizar el proyecto si eso mejora la mantenibilidad.

Requisitos técnicos:

- Código limpio y fácil de comprender.
- Separación razonable entre interfaz, estilos, lógica de negocio y almacenamiento.
- Validación de formularios (montos positivos, fechas válidas, campos obligatorios).
- Manejo de errores.
- Uso correcto de fechas (sin desfases por zona horaria) y monedas.
- Cálculos financieros precisos usando enteros.
- Diseño responsive.
- Accesibilidad básica (etiquetas en formularios, contraste, navegación con teclado).
- Sin servicios externos de pago.

## 11. Orden de desarrollo

Trabajar por etapas, **una a la vez**. Al terminar cada etapa, resumir los cambios y esperar mi confirmación antes de continuar.

- **Etapa 1 — Análisis:** revisar la aplicación actual, identificar archivos, dependencias y datos que deben conservarse. No modificar archivos en esta etapa.
- **Etapa 2 — Simplificación:** eliminar módulos de tareas, vehículos y alertas; reorganizar la navegación.
- **Etapa 3 — Finanzas:** ingresos, gastos, ahorro, categorías personalizadas, períodos mensuales/quincenales, monedas y migración de datos.
- **Etapa 4 — Dashboard:** nuevo dashboard con estadísticas reales y visualización sencilla.
- **Etapa 5 — Perfil:** configuración del perfil, preferencias locales, exportación e importación.
- **Etapa 6 — Pruebas:** verificar creación, edición y eliminación de movimientos, sumatorias, períodos, monedas, persistencia, importación y exportación.

## 12. Criterios de terminado

La aplicación está lista cuando puedo completar este flujo sin errores:

1. Abrir LifeOS y crear mi perfil local.
2. Registrar mi salario de una quincena.
3. Crear mis categorías personalizadas.
4. Registrar gastos de gimnasio, teléfono, gasolina y otros.
5. Registrar dinero reservado para ahorro.
6. Consultar cuánto dinero tengo disponible.
7. Cambiar entre quincenas y meses, y comprobar que el mes es la suma exacta de sus quincenas.
8. Registrar un gasto en USD, cambiar después el tipo de cambio y comprobar que ese gasto no cambia su valor convertido.
9. Editar o eliminar movimientos y comprobar que los totales se actualicen.
10. Cerrar y volver a abrir el navegador sin perder mis datos.
11. Exportar mis datos y restaurarlos correctamente.

## 13. Instrucciones finales

Trabajar sobre el proyecto existente en esta carpeta.

Antes de modificarlo, resumir brevemente su arquitectura y explicar qué componentes se conservan o se eliminan.

Luego implementar por etapas, haciendo los cambios directamente en los archivos del proyecto.

Evitar funcionalidades adicionales que no haya solicitado.

**La prioridad absoluta es simplicidad, estabilidad, buen diseño y facilidad para controlar mis finanzas personales.**
