# TODO List - Mi App de Ventas

> Última auditoría: **2026-10-27** (Lobby, Fase 4.7, Fase 4.16 y estado de la BD verificados contra el código).

## Fase 0: Corregir Bugs y Completar Entities

- [x] Corregir tabla Cuentas en App.tsx (columnas "Tipo" y "Telefono" no existen)
- [x] Completar entity ProductoEnvio: agregar campos `cantidad` y `precio_unitario`
- [x] Completar entity Transaccion: agregar campo `descripcion`
- [x] Crear componente CuentaModal.tsx
- [x] Conectar CuentaModal en App.tsx (renderizar condicionalmente)
- [x] Mover lógica de conexión de database.ts a main.ts (opcional, limpieza) — database.ts quedó vacío; todo está en main.ts

---

## Fase 1: Importación (Envíos WeShipYou)

### Backend
- [x] Crear handlers IPC para Envio (CRUD completo)
  - [x] get-envios
  - [x] create-envio
  - [x] update-envio
  - [x] delete-envio
  - [x] get-envio-by-id
- [x] Crear handlers IPC para ProductoEnvio (CRUD)
  - [x] get-productos-envio
  - [x] add-producto-envio
  - [x] remove-producto-envio
- [x] Actualizar preload.ts con nuevos canales
- [x] Actualizar electron.d.ts con nuevos tipos

### Frontend
- [x] Crear componente EnvioModal.tsx (crear/editar envío)
  - [x] Campo: proveedor (default WeShipYou)
  - [x] Campo: costo envío USD
  - [x] Campo: aranceles USD
  - [x] Campo: peso total lbs (calculo automático desde productos + ajuste manual)
  - [x] Campo: estado (pendiente/recibido)
  - [x] Campo: fecha recepción (nullable)
  - [x] Lista de productos del envío (agregar/quitar)
- [x] Crear pestaña "Envíos" en App.tsx
- [x] Tabla de envíos con columnas: ID, Proveedor, Peso, Costo, Aranceles, Estado, Fecha, Acciones
- [x] Indicador visual de estado (pendiente = amarillo, recibido = verde)
- [x] Filtro por estado

---

## Fase 2: Ventas a Clientes (Revolico)

- [x] Crear entidad `Venta` (cliente_revolico, forma_pago, estado, total_usd, total_cup, tasa_usd_cup, costo_total_usd, ganancia_usd, fecha, descripcion)
- [x] Crear entidad `ProductoVenta` (venta, producto, cantidad, precio_unitario)
- [x] Crear handlers IPC para Venta/ProductoVenta (CRUD completo)
  - [x] get-ventas, create-venta, update-venta, delete-venta, get-venta-by-id
  - [x] get-productos-venta, add-producto-venta, remove-producto-venta
  - [x] Descuento automático de stock al crear venta
- [x] Actualizar preload.ts + electron.d.ts con canales de venta
- [x] Crear componente VentaModal.tsx (cliente, forma de pago, productos, cálculo en vivo de ganancia)
- [x] Crear pestaña "Ventas" en App.tsx (tabla + filtro por estado + resumen)
- [x] Formas de pago: efectivo CUP, transferencia CUP, efectivo USD, USDT

---

## Fase 3: Recarga de Tarjetas (QvaPay, MyPal, MPay)

### Modelado
- [x] Definir flujos de conversión (A/B/C/D en el modal, con descripciones):
  - [x] CUP cash → USD (mercado negro) → USDT (peer QvaPay)
  - [x] CUP transferencia → CUP cash (peer, ~10%) → USD → USDT
  - [x] CUP transferencia → USDT directo (peer, caro)
  - [x] **D: USD cash → USDT (peer)** — flujo independiente con entrada en USD; el modelo generalizó la entrada con `moneda_in` (CUP/USD) y campos `monto_in`, `total_comisiones_in`, `perdida_total_in`
- [ ] Registrar tasa de mercado negro por separado (hoy se usa la `tasa_efectiva` del flujo = moneda_in/USDT)

### Backend
- [x] Crear servicio de flujos de conversión
  - [x] Registrar cada flujo (tipo, moneda_in, monto, monto USDT, comisiones)
  - [x] Calcular comisiones y tasa efectiva (moneda_in por USDT)
  - [x] Calcular pérdida total por conversión (= comisiones)
- [x] Crear handlers para registro de peers QvaPay
  - [x] get-peers
  - [x] create-peer
  - [x] update-peer
  - [x] delete-peer

### Frontend
- [x] Crear pestaña "Conversión"
- [x] Formulario de nuevo flujo de conversión
  - [x] Selección de tipo de flujo (A, B, C, D)
  - [x] Registro de cada paso con montos y comisiones
  - [x] Cálculo automático del total gastado / tasa efectiva
- [x] Tabla de flujos realizados
- [x] Historial de peers utilizados
- [x] Resumen de conversión:
  - [x] Total CUP invertido
  - [x] Total USD invertido (flujos tipo D)
  - [x] Total USDT recibido
  - [x] Pérdida total por comisiones
  - [x] Tasa efectiva promedio (CUP/USDT)

---

## Fase 4: Dashboard y Reportes

- [x] Crear pestaña "Dashboard"
- [x] Resumen financiero:
  - [x] Total inversionado en importaciones (Σ costo + aranceles de envíos)
  - [x] Total vendido (Σ ventas.total_usd)
  - [x] Ganancia neta (Σ ventas.ganancia_usd)
  - [x] Stock total (Σ productos.stock_actual)
- [x] Gráficos (Recharts):
  - [x] Ventas por mes (BarChart)
  - [x] Ganancia por mes (BarChart)
  - [x] Distribución por forma de pago (PieChart)
  - [x] Evolución de tasa USD/CUP (LineChart)
  - [x] Costos de importación vs ventas (BarChart doble)
- [x] Exportar reportes a Excel/CSV (CSV con BOM UTF-8, resumen + ventas + envíos + gráficos)

---

## Fase 4.5: Ganancia Real por Envío (FIFO / Landed Cost)

### Objetivo
Que la ganancia refleje el **costo real** de la mercancía y permita determinar si un envío fue exitoso.
La unidad de costo es el **Envío**: productos + flete + aranceles + comisiones del camino.

### Modelo
- `overhead_por_unidad` = `(envio.costo + envio.aranceles_usd + envio.otros_costos_usd) / total_unidades_del_envío` (reparto **por unidad**)
- `costo_real_unitario` = `ProductoEnvio.precio_unitario` + `overhead_por_unidad`
- **Oferta FIFO**: por producto, envíos con `estado='recibido'`, ordenados por `fecha_recepcion ?? fecha_creacion`
- **Consumo**: se recorre las ventas por fecha y se consume de la oferta más antigua
- **Stock derivado**: `Σ unidades recibidas (envíos 'recibido') − Σ unidades vendidas` (ya no se escribe a mano)

### Modelado
- [x] `Envio.otros_costos_usd` (default 0) — comisiones/gestoría del camino no cubiertos por flete ni aranceles

### Backend
- [x] Crear `src/main/services/rentabilidadService.ts`
  - [x] `overheadPorUnidad` / `overheadDeEnvio` (reparto por unidad)
  - [x] `construirOferta` (FIFO por `fecha_recepcion ?? fecha_creacion`)
  - [x] `calcularRentabilidad` — costo real por venta + rentabilidad por envío + resumen global
  - [x] `recalcularTodo` — persiste `Venta.costo_total_usd` / `ganancia_usd` y el stock derivado
  - [x] `recalcularStock` — stock = unidades recibidas − unidades vendidas
  - [x] `previewCostoVenta` — costo FIFO de una venta hipotética (sin persistir)
  - [x] `calcularPreciosSugeridos` — precio recomendado por producto
- [x] Handlers IPC: `get-rentabilidad`, `recalcular-rentabilidad`, `preview-costo-venta`, `precio-sugerido`
- [x] `create/update/delete-venta` recalculan FIFO y stock (borrar venta devuelve stock al pool)
- [x] `update-envio` pendiente→recibido suma stock; recibido→pendiente lo revierte
- [x] `add/remove-producto-envio` bloqueados si el envío está `recibido` (lanza error)
- [x] `create-envio`/`update-envio` asignan `fecha_recepcion` automática al recibir
- [x] `recalcularTodo()` en `migrarDatosIniciales` (corrige datos históricos y el stock)
- [x] preload.ts + electron.d.ts con los 4 canales nuevos

### Frontend
- [x] `EnvioModal`: campo `otros_costos_usd`
- [x] `EnvioModal`: `precio_unitario` **editable** por línea (default `producto.costo`) — el FIFO usa el precio real pagado
- [x] `EnvioModal`: columna "Costo Real" por línea + resumen de overhead por unidad
- [x] `EnvioModal`: productos **bloqueados** al estar el envío `recibido` (devolver a pendiente para editar)
- [x] `VentaModal`: costo FIFO real en vivo (vía `preview-costo-venta`) en vez de `producto.costo`
- [x] `VentaModal`: columnas "Costo Real FIFO" y "Origen" (Envío #N o Catálogo) por línea
- [x] `VentaModal`: aviso cuando hay unidades sin envío de origen (usan precio de catálogo)
- [x] Dashboard: cards del modelo honesto (Ganancia Neta Real, Ingresos, Capital en Inventario, Invertido Total)
- [x] Dashboard: gráfico "Invertido vs Recuperado por Envío" (BarChart doble)
- [x] Dashboard: tabla "Rentabilidad por Envío" (invertido, overhead, unidades, recuperado, utilidad, margen, veredicto)
- [x] Veredictos: Exitoso / En curso / Sin vender / Pérdida

### Criterios
- **Exitoso**: todo el stock vendido y `recuperado > invertido`
- **En curso**: venta parcial (ganancia provisional)
- **Sin vender**: ninguna unidad vendida
- **Pérdida**: todo vendido con `recuperado <= invertido`

---

## Fase 4.6: Calculadora de Precios de Venta

### Objetivo
Recomendar precios de venta de los artículos **a partir del costo real de los envíos en la BD**, para alcanzar una ganancia objetivo.

### Decisiones
- Fórmula: `precio = costo_real_fifo / (1 - margen%)` (margen sobre el precio de venta)
- Costo incluido: solo el **costo real FIFO del envío** (compra + flete + aranceles + otros)
- Conversión a CUP con la tasa vigente (`Moneda.tasa_cambio` de USD)
- Fallback: si el producto no tiene envíos recibidos, usa `producto.costo`
- **Solo recomienda**: no escribe en `producto.precio_venta`

### Backend
- [x] `calcularPreciosSugeridos(margenObjetivoPct, tasaUsdCup)` en `rentabilidadService.ts`
- [x] Handler IPC `precio-sugerido`

### Frontend
- [x] Crear pestaña "Calculadora de Precios" en App.tsx
- [x] Input de margen objetivo % (recalcula en vivo)
- [x] Cards de resumen: productos analizados, bajo el margen objetivo, con envío de origen, tasa usada
- [x] Tabla: producto, costo real FIFO, origen (Envío #N / Catálogo), stock, precio actual, margen actual %, precio sugerido USD, precio sugerido CUP, ganancia unitaria, estado
- [x] Filtros: Todos / Con stock / Bajo margen
- [x] Resaltado en rojo de los productos bajo el margen objetivo
- [x] Sección de sugerencias incluida en el export CSV

---

## Fase 4.8: Inversores y Capital

### Decisiones del usuario
- El capital de cada socio se asigna a un **producto concreto** (guardando también el envío, que es donde vive el costo real)
- La **comisión del 1%** se cobra **sobre las ventas** y **se le descuenta al socio** (es costo del negocio, descuenta de `gananciaNetaReal`)
- Al vender, el capital **se libera y se decide**: reinvertir o pagar
- Aportes y retiros **son Transacciones reales** de caja

### Modelado (✅ hecho)
- [x] `Inversor` — nombre, activo, fecha_alta, notas
- [x] `Aporte` — inversor, monto, fecha, `cuenta_origen` (la cuenta de pasivo del socio), `transaccion_id`, descripcion
- [x] `Inversion` — inversor, `producto_id`, `envio_id`, unidades, `unidades_liberadas`, monto, `monto_liberado`, fecha
- [x] `MovimientoCapital` — inversor, `tipo` (`reinversion`|`retiro`), monto, `inversion_origen_id`, `envio_destino_id`, `transaccion_id`, fecha
- [x] `Venta.comision_inversores_usd`
- [x] `Cuenta` sin el `@Check(id_cuenta IN (1..6))` — necesario para las cuentas de los socios (IDs 7+). Se borra con el mismo `DO $$` de `stock_actual` en `migrarDatosIniciales`

### Backend (✅ hecho)
- [x] `inversoresService.ts` con `sincronizarInversiones`, `calcularResumenInversores` y `crearCuentaParaInversor`
- [x] `inversorId` / `inversionId` en `LoteOferta` y `LineaFIFO`
- [x] El 1% se calcula **en el bucle FIFO existente** (no hay un segundo motor)
- [x] `gananciaNetaReal = utilidadBruta − perdidasConversion − comisionesInversores`

### Falta
- [x] Handlers IPC (`get-inversores`, `get-inversiones`, `get-aportes`, `get-movimientos-capital`, `get-resumen-inversores`, `create-inversor`, `update-inversor`, `create-aporte`, `create-inversion`, `create-movimiento-capital`, `delete-inversion`, `delete-inversor`) + `preload` + `electron.d.ts`
- [x] `Inversion.comision_devengada` — el 1% queda escrito en la BD por la misma pasada FIFO, para que el resumen no dependa del orden de las llamadas
- [x] La reinversión **crea la `Inversion` nueva** en el producto destino y apunta con `inversion_origen`; ya no se roba `monto_liberado`
- [x] Validar en el servicio que el movimiento no exceda el capital liberado, y que la reinversión quepa en una sola liberación
- [x] `delete-inversor` bloqueado con mensaje claro si el socio tiene inversiones, aportes o movimientos (o transacciones que toquen su cuenta)
- [x] Modal de Inversor, Aporte, Asignar capital y Retiro/Reinversión
- [x] Pestaña "Inversores" (la 10ma) con la tarjeta por socio + tablas de aportes, capital asignado y movimientos
- [x] Cards en el Dashboard: "Capital de Socios en Mercancía" y "1% Inversores Devengado"
- [x] Aporte y retiro generan la `Transaccion` de caja real (`transaccion_id` filled)
- [x] Probado contra la BD real (socio, aporte, inversión, FIFO, 1%, reinversión, retiro, sobre-retiro, borrado y limpieza)

## Fase 4.8b: 1% devengado vs cobrado + no retroactivo

Decisiones del usuario (todas cerradas):
- `Cuenta.saldo` **se queda manual**. No se deriva de `Transaccion`.
- El retiro paga el **capital íntegro**: la comisión no se descuenta ahí.
- El 1% se **devenga al vender** y se **cobra cuando el socio deposita el importe en QvaPay**.
- El cobro se registra **a mano** con un botón en la pestaña Inversores (no automático al guardar la `FlujoConversion`: automatizar ataba un cobro de socio a un movimiento de moneda y exigía convertir USDT→USD).
- `gananciaNetaReal` resta lo **devengado**, no lo cobrado. El pendiente se muestra aparte.
- Una `Inversion` **no devenga comisiones de ventas anteriores** a su `fecha`; se **avisa** (no bloquea) al asignar capital a un producto ya vendido.

- [x] `Inversion.comision_pagada` → `comision_devengada` (la escribe la pasada FIFO) + `comision_cobrada` y `fecha_cobro_comision` (**nunca** las escribe el FIFO)
- [x] Migración en `migrarDatosIniciales` (`ADD COLUMN IF NOT EXISTS` + copia + `DROP COLUMN IF EXISTS`), en su propio `try/catch`
- [x] `OrigenLote.fechaOrden` + corte por fecha en el bucle de consumo del FIFO
- [x] El segmento sin financiar pasó a tener capacidad para **todo** el lote (si no, las unidades que ninguna inversión puede cubrir por fecha se perdían sin costo ni comisión)
- [x] `registrarCobroComision()` (reparto FIFO por inversión, valida contra lo pendiente, **no** valida `Cuenta.saldo` ni crea `Transaccion`)
- [x] `ResumenInversor` expone `comisionDevengada` / `comisionCobrada` / `comisionPendiente` / `comisionInconsistente`
- [x] `CobroComisionModal` + botón "+ Cobrar 1%" + columnas devengado/cobrado/pendiente
- [x] Aviso en `InversionModal` cuando el producto ya tiene unidades vendidas
- [x] Texto corregido en `MovimientoCapitalModal` (decía "el 1% ya se le descontó al socio", que era falso)
- [x] Probado contra la BD real, incluidos los 3 casos que importan: venta vieja no devenga (con costo FIFO intacto), venta nueva devenga 1%, y **el recálculo no borra el cobro**
- [x] Probado el caso `cobrado > devengado` (se baja el precio de una venta ya cobrada): se marca inconsistente, el cobro NO se recorta solo y **no deja cobrar** la diferencia que nunca se devengó
- [x] Fuera el campo "descripción" del modal de cobro: **se perdía**. No hay entidad de evento donde guardarla (el cobro se agrega sobre las `Inversion`), y un texto suelto se perdería en el siguiente cobro parcial

### Bugs encontrados al revisar (Fase 4.8b)
- [x] **`diferencia` daba falso positivo con cada reinversión legítima**: medía `aportado − invertido`, pero la reinversión crea una `Inversion` nueva sin aporte nuevo. Ahora mide `aportado + reinvertido − invertido` (el capital reinvertido **es** un origen) y el texto de la tarjeta explica el desglose
- [x] **Aviso de `InversionModal` prometía unidades que no puede saber**: decía "quedará sobre las N unidades que sí quedan", pero `yaVendidas` es el total del **producto** y `ProductoVenta` no tiene relación con el envío. Ahora solo afirma lo cierto (el 1% cuenta a partir de hoy)
- [x] **`CobroComisionModal` pedía una descripción inexistente** (ver arriba)
- [x] **Borrar un socio**: el diálogo no comprobaba las transacciones de su cuenta, que el backend sí bloquea; el error salía **después** de confirmar. Ahora se avisa antes, en el mismo orden que el backend

### Decisiones que quedan abiertas
- [ ] Editar el nombre de un socio (hoy bloqueado a propósito: la cuenta se busca por nombre)
- [ ] `cobrado > devengado` (bajar el precio de una venta ya cobrada) se **detecta y se marca en rojo**, pero no tiene reverso automático: se corrige a mano. No se inventó un "descobrar" que el usuario no pidió.

---

## Fase 4.7: Rediseño de Interfaz con HeroUI

### Objetivo
- Dejar la UI "funcional" y convertirla en una interfaz cuidada y consistente, sustituyendo el HTML/Tailwind escrito a mano por un sistema de componentes.
- Fuente de referencia: la lista de componentes que encantan al usuario (documentación de HeroUI v3).

### Componentes detectados y destino en la app

| Componente | Para qué se usaría en esta app |
|---|---|
| **table** | El mayor salto visual: Productos, Envíos, Ventas, Transacciones, Conversión y la Calculadora de Precios. Reemplaza las `<table>` escritas a mano. |
| **alert-dialog** | Sustituye **todos** los `window.confirm` actuales (borrar Producto, Envío, Venta, Transacción, Peer) y los `window.alert` recién añadidos. |
| **date-picker** | ✅ `CampoFecha` con calendario en **los 12 sitios** donde se elige fecha: filtros Desde/Hasta de Transacciones, `InversorModal` y `TasaCambioModal` (solo fecha) + `AporteModal`, `CobroComisionModal`, `ConversionModal`, `EnvioModal` (recepción), `InversionModal`, `MovimientoCapitalModal`, `TransaccionModal` y `VentaModal` (`conHora`, conserva la hora). |
| **combo-box** | ✅ `SelectorBuscable` con búsqueda en el producto de `EnvioModal` y `VentaModal`. Los filtros de 3 opciones siguen con `Selector` (Select). |
| **input-group** | Campos de monto con prefijo/sufijo de moneda (USD / CUP / USDT) y buscador con icono. |
| **alert** | Avisos no bloqueantes: stock bajo, envío con ventas, peer en uso, pérdida en conversión. |
| **progress-circle** | Tiempos de carga dentro de la app (indicado por el usuario). Reutilizable para mostrar la tasa efectiva de un flujo de conversión. |
| **meter** | Espacio ya utilizado en Supabase (indicado por el usuario). Reutilizable para la ganancia del mes frente al máximo objetivo. |
| **dropdown** | Menú contextual por fila (Editar / Ver / Borrar) para no saturar cada fila de botones. Mientras llega, los botones por fila ya son `Button` de HeroUI (secondary/Editar, danger/Eliminar). |
| **pagination** | Envíos, Ventas y Transacciones cuando la tabla crezca. |
| **scroll-shadow** | Scroll en tablas largas y en las listas laterales del Dashboard. |
| **card** | ✅ Migradas a `Card` de HeroUI las de resumen (Dashboard ×6 + 6 contenedores de gráfico, Calculadora ×4, Conversión ×5, Transacciones, Rentabilidad por Envío). |
| **skeleton** | Estados de carga de tablas y gráficos (hoy solo se muestra un texto "Cargando..."). |
| **separator** | Divisores entre secciones de los modales. |
| **close-button** | Botón de cerrar (X) en modales y tarjetas. |
| **breadcrumbs** | ⚠️ **No encaja bien** con el layout actual de pestañas; la alternativa natural es `tabs`. Se deja anotado pero en pausa. |

### 📊 Auditoría real (2026-10-27)

Medido en `src/renderer` (no de memoria). **La Fase 4.7 NO está terminada**: faltan 7 componentes + `scroll-shadow` y el tema.

| Componente | Estado | Dónde / qué falta |
|---|---|---|
| table | ✅ | 13 tablas migradas |
| alert-dialog | ✅ | `DialogoAviso`; 0 `window.confirm` / `window.alert` |
| pagination | ✅ | `Paginador` en Productos, Envíos, Ventas y Transacciones |
| card | ✅ | resúmenes y contenedores de gráficos |
| skeleton | ✅ | Lobby y tablas |
| button | ✅ | CTAs y acciones por fila |
| **date-picker** | ✅ | `CampoFecha.tsx` (`DatePicker` + `DateInputGroup` + `Calendar`) en **12 usos**: 4 solo fecha (filtros de Transacciones ×2, `InversorModal`, `TasaCambioModal`) y 8 con hora (`conHora`: Aporte, Cobro de comisión, Conversión, Recepción de envío, Inversión, Movimiento de capital, Transacción, Venta); 0 `<input type="date">` y 0 `<Input type="datetime-local">` |
| **combo-box** | ✅ | `SelectorBuscable.tsx` (`ComboBox`) en producto de `EnvioModal` y `VentaModal` |
| **dropdown** | ❌ | las filas siguen con 2 botones (Editar/Eliminar); es la solución natural a la separación pedida en Productos |
| **input-group** | ❌ | montos con prefijo/sufijo de moneda (USD/CUP/USDT) |
| **alert** | ❌ | avisos inline escritos a mano (`ErrorFormulario`, avisos de modales) |
| **separator** | ❌ | divisores entre secciones de los modales |
| **close-button** | ❌ | el cierre de modales no usa el componente |
| **progress-circle** | ❌ | no hay indicador de carga circular |
| **meter** | ❌ | no hay medidor de uso/objetivo |
| **scroll-shadow** | ⚠️ | solo el que trae `Tabs.ListContainer`; no se usa explícitamente en tablas/listas largas |
| **breadcrumbs** | ⏸️ | en pausa a propósito: no encaja con el layout de pestañas |
| **tema** | ❌ | "Definir el tema (colores, fuentes, radios)" sigue abierto |

### Instalación y prerrequisitos
- [x] `npm install @heroui/react@3.2.6` y los peers que exige: `react-aria`, `react-aria-components`, `@react-aria/ssr`, `@react-aria/utils`, `@internationalized/date` (+ `@heroui/styles@3.2.6`). `npm audit`: solo queda la vuln preexistente de `xlsx` (sin fix), ajena a HeroUI
- [x] CSS: Tailwind v4 no usa `@plugin` para esto; HeroUI v3 se carga con `@import "@heroui/styles";` **después** de `@import "tailwindcss";` en `src/renderer/index.css` (el orden importa). No requiere Provider
- [ ] Definir el tema (colores, fuentes, radios) — la paleta actual es Tailwind puro sobre fondo `#f3f4f6`
- [x] Verificar que el build sigue en Electron sin problemas de `file://` / `base: './'` — `vite build` OK, tsc OK

### Enfoque
- [x] **Tabs creados como migración pura de los `<button>` de pestañas**: `<Tabs selectedKey onSelectionChange>` con `<Tabs.List>`/`<Tabs.Tab>`; el contenido sigue pintándose aparte por `activeTab` (sin `Tabs.Panel`, avoida reescribir 10 bloques); `key as typeof activeTab` para el cast
- [x] **Tables**: las 13 `<table>` escritas a mano se convirtieron a `Table` de HeroUI (RAC) — Productos, Monedas, Cuentas, Envíos, Transacciones, Ventas, Rentabilidad por Envío, Calculadora, Aportes, Capital asignado, Reinversiones y pagos, Peers, Flujos de Conversión. Estructura `<Table aria-label>><Table.Content><Table.Header><Table.Column isRowHeader>…</Table.Header><Table.Body><Table.Row><Table.Cell>`; el primer tag colocado en `isRowHeader`. Detalles: `Table.Cell`/`Table.Column` **no aceptan `title`** (RAC), el tooltip va en un `<span>` interno; los colores de estado/negativo se pasan a `className` de la Cell; `aria-label` obligatorio en cada tabla
  - Las Cell ya no llevan `p-2 border` (el estilo lo pone HeroUI); la alineación derecha de montos se conserva con `text-right`
- [x] **`alert-dialog` vía componente reutilizable `DialogoAviso`**: un solo `AlertDialog` controlado (`isOpen`/`onOpenChange`) con dos formas — aviso (un botón Aceptar) y confirmación (Cancelar + acción danger). Reemplazó **todos** los `window.confirm` (10) y `window.alert` (19) de `App.tsx`. El backend API queda igual (los `deleteInversor`/`deleteInversion` siguen siendo instrucciones que solo se ejecutan al pulsar el botón de acción)
  - Los avisos que bloquean (socio con inversiones / con transacciones) pasan a JSX con `<br/>` en vez de `\n`; el cobro del 1% usa `<pre>` para las líneas del detalle
- [x] **Typecheck en dos tsconfigs** (por el ESM-only de HeroUI): `tsconfig.json` (main, `node16` CJS, solo `src/main`+`src/shared`+`src/types`) y `tsconfig.renderer.json` (`module: esnext` + `moduleResolution: bundler`, `noEmit`, `src/renderer`); script `npm run typecheck`. Fue necesario porque importar `@heroui/react` (ESM-only) desde un archivo tratado como CommonJS daba `TS1479` y TS2305 falso
  - Se aprovechó para corregir 5 `where: { inversor: { id } }` de `inversoresService.ts` que no tipaban: `as FindOptionsWhere<Inversion>` / `<MovimientoCapital>` (sin cambio de runtime)
- [x] **`button`**: los CTAs de cabecera (`+ Nuevo Producto/Moneda/Cuenta/Envío/Venta/Transacción/Socio/Aporte/Asignar Capital/Reinvertir/Pagar Socio/Cobrar 1%/Peer/Conversión`, `Tasas de Cambio`, `Exportar Reporte`), los pills de filtro de la Calculadora y todos los botones por fila (Editar/Eliminar/Borrar) pasaron a `Button` de HeroUI (`@heroui/react/button`). Detalles: `Button` **no acepta `title`** (RAC la filtra) → el tooltip va en un `<span>` interno; `isDisabled` en vez de `disabled`; variantes usadas: `primary` (CTAs), `secondary` (filtros inactivos/editar), `danger` (eliminar), `danger-soft` (cobrar 1%/borrar). Pasan `onClick` nativo sin problema. Quedan fuera: los `<button>` de los **modales** (cancelar/guardar) y los 2 `<button>` internos de `TransaccionModal`/`TasaCambioModal` — se harán con la migración de modales a `Modal` de HeroUI
- [x] **Pestañas reestructuradas (orden + horizontal + iconos)**: nuevo orden Dashboard, Productos, Envíos, Conversión, Ventas, Inversores, Cuentas, Transacciones, Calculadora de Precios, Monedas. Cada tab con icono+etiqueta; la barra va en un `Card` (`p-2`) con `Tabs.ListContainer` + `Tabs.List` sin `flex-wrap`: usa el `ScrollShadow` de HeroUI (una sola fila horizontal, flechas propias, sin barra visible). La pestaña por defecto es `dashboard`.
- [x] **Modo oscuro**: toggle 🌙/☀️ en la cabecera (default = `prefers-color-scheme`, luego manda `localStorage`); `@custom-variant dark` en `index.css`, clase `dark` en `<html>` (script inline en `index.html` para evitar flash), hook `src/renderer/useTheme.ts`, y pase completo `dark:` (~296 clases de mano en `App.tsx` + 13 modales + reglas globales para inputs/selects).
- [x] **Quitar título "Mi App de Ventas 🚀"** de la cabecera (se conserva el lado derecho: tasa, botón Tasas, toggle)
- [x] Mantener HeroUI y las clases Tailwind a mano conviviendo durante la migración (evita romper la app a medio camino)
- [x] **`card`**: los cajetines de resumen pasaron de `bg-gray-50 border rounded` / `bg-white border rounded` a `Card` de HeroUI (`@heroui/react/card`). Patrón conservador: se mantiene el contenido interior idéntico y solo cambia el wrapper a `<Card className="p-4">` (clases utilitarias de color de las cards naranjas del Dashboard se conservan). Quedan fuera de alcance: cajetines interactivos/selectables (tarjetas de socio del tab Inversores) y los `p-2 border rounded` de los inputs (son parte de la migración a `input`/`field`)
- [x] Eliminar los `window.confirm` / `window.alert` de `App.tsx` — hecho: quedan 0
- [x] Revisar el tamaño del bundle: `dist/renderer/assets/index-*.js` 1.035 kB (gzip 290 kB), CSS 440 kB (gzip 42 kB). Creció por HeroUI+RAC; al usar **subpath imports** (`@heroui/react/table`, `/tabs`, `/alert-dialog`, `/button`) rolldown bajó los módulos transformados a 1249. Aceptable para una app de escritorio (carga local, no por red); pendiente si se quiere: code-splitting por pestaña o `chunkSizeWarningLimit`

### Riesgos
- ⚠️ Verificar la compat��bilidad real en la práctica: `npm view` indica HeroUI **3.2.6** con peers `react >=19` y `tailwindcss >=4.0.0`, así que en principio encaja con React 19 y Tailwind 4.2.4. Pero la documentación de instalación **no se pudo consultar** (web no disponible), así que el paso de instalación exacto queda por confirmar.
- ⚠️ HeroUI v3 está construido sobre **React Aria Components**: cambia el modelo mental (muchos componentes son `compuestos`, no un solo `<Table>` con props), lo que implica reescribir los JSX de las tablas y no solo cambiar clases.
- [x] **Modales "en una esquina y sin poder ver todos los campos" (Fase 4.15) — resuelto**. No era la estructura JSX (los 18 bloques ya anidaban `Modal.Container` dentro de `Modal.Backdrop`, con el `<form>` en columna flex y `size="full"` en Envío/Venta). Era que **`--visual-viewport-height` no está definida en ningún lado**: `modal.css`/`drawer.css`/`alert-dialog.css` la usan 7 veces (`h-(--visual-viewport-height)`) pero ni `@heroui/styles` la define ni ningún JS la fija. Sin ella `.modal__container` queda con `height:auto` y sin estirar (hijo flex con `align-items:center`) → `max-height:100%` del dialog contra un padre de altura indefinida equivale a `none` → el dialog crece hasta su contenido y `.modal__body` nunca scrollea. Definida en `src/renderer/index.css` con `100dvh` (`@supports`) y fallback `100vh`. Verificado en el bundle.

---

## Fase 5: Versión Android

### Investigación
- [ ] Investigar herramientas para portar Electron a Android:
  - [ ] Capacitor (Ionic) - wrappear la app web existente
  - [ ] React Native - reescribir UI nativa
  - [ ] Tauri Mobile - alternativa ligera
  - [ ] Progressive Web App (PWA) - versión web instalable
- [ ] Evaluar qué base de datos usar en móvil:
  - [ ] SQLite local
  - [ ] Conexión directa a PostgreSQL remoto
  - [ ] Supabase/Firebase como backend
- [ ] Definir qué funcionalidades van en la versión móvil vs desktop

### Implementación
- [ ] Configurar proyecto Android con la herramienta elegida
- [ ] Adaptar entidades y servicios existentes
- [ ] Crear UI móvil optimizada (bottom tabs, gestures)
- [ ] Implementar modo offline/online (sincronización con PostgreSQL remoto al recuperar conexión)
- [ ] Testing en dispositivo real

---

## Fase 6: Lobby / Home Screen

**Estado (auditado 2026-10-27): ✅ IMPLEMENTADO, pero NO es la versión final.**
Existe `src/renderer/components/Lobby.tsx` y está integrado en la pestaña Dashboard. Lo que queda es pulido visual, no funcionalidad.

### Diseño
- [x] Pantalla de inicio (Lobby) con acceso rápido a:
  - [x] Nueva Venta → abre el formulario de venta
  - [x] Agregar a Inventario → abre el formulario de producto
  - [x] Registrar Envío → abre el formulario de envío
  - [x] Nueva Transacción y Registrar Conversión
  - [x] Resumen rápido: ventas del día, ingresos, stock bajo y envíos pendientes
- [x] Navegación por pestañas (las 10 pestañas existentes)
- [x] Layout responsive (2 columnas en móvil, 5 en escritorio para los atajos)
- [x] Skeletons de carga (no texto "Cargando…")

### Backend
- [x] Los datos del Lobby se calculan **en el renderer** con lo que ya devuelven los handlers existentes (`ventas`, `envios`, `productos`); **no** se creó un IPC `get-resumen-diario` aparte porque duplicaba lógica
- [x] `fetchProductos()` se refresca al entrar a Ventas, al abrir "Nueva Venta" y desde el Lobby (fix `baefc5d`)

### Frontend
- [x] `Lobby.tsx` con 5 atajos + 3 tarjetas de resumen
- [x] Integrado con las pestañas existentes
- [x] ~~`CardResumen.tsx` / `BotonRapido.tsx` como componentes separados~~ — se decidió **no** extraerlos: el Lobby es un solo bloque de ~220 líneas y fragmentarlo no aportaba

### ⚠️ Pendiente para la versión final (pulido, no funcionalidad)
- [ ] Los 3 enlaces "Ver ventas / Ver envíos / Ver productos" son `<button>` crudos → pasar a `Button` de HeroUI (`variant="ghost"` o `link`)
- [ ] Los pills de stock bajo son `<span>` con clases a mano → `Chip` de HeroUI (`color="danger"`/`"warning"`, `variant="soft"`)
- [ ] Colores fijos `blue/green/red/amber` → tokens semánticos (`text-accent`, `text-success`, `text-warning`, `text-danger`, `bg-*-soft`) como en el resto de la app
- [ ] Las tarjetas de atajo usan `Card role="button"` con `onKeyDown` manual → valorar `Button` que envuelva el `Card` (accesibilidad y foco correctos sin código a mano)

---

## Fase 7: Importación de Excel — ❌ DESCARTADA (llenado manual)

**Decisión tomada (2026-10-27): NO se importa nada de Excel.** Los datos históricos (Diciembre 2025 – Septiembre 2026) los carga el usuario **a mano**. Los scripts de importación se eliminaron y la BD se restauró a su estado original.

**Motivo:** la hoja `Inventario` solo trae PVP (no costo) y `Gastos Totales por envio` solo trae totales por envío. Con eso no se puede reconstruir el `ProductoEnvio` (`precio_unitario` por producto) que el FIFO necesita. Las ventas quedaban con `costo_total_usd = 0` y ganancia inflada (100 %).

- [ ] **Datos históricos cargados manualmente** ← marcar **solo cuando el usuario lo confirme**. De momento queda pendiente y no se toca.
- [x] ~~Subir archivos Excel para analizar estructura~~ (analizado; descartado)
- [x] ~~Diseñar mapeo Excel → Entidades~~ (descartado por falta de costos unitarios)
- [x] ~~Crear importador de Excel~~ (implementado y revertido; scripts borrados)

### Orden recomendado para la carga manual
1. **Exportar Respaldo (JSON)** desde el Dashboard antes de empezar.
2. Crear los **productos** que falten (los que solo aparecen en ventas quedan con `stock_actual = 0`).
3. Crear los **envíos históricos** como **pendiente**, añadir sus productos con el `precio_unitario` real y **después** pasarlos a **recibido** (un envío recibido bloquea la edición de líneas).
4. Registrar las **ventas** con su fecha real; el FIFO calcula costo y ganancia solos.
5. Revisar el Dashboard y "Rentabilidad por Envío".

⚠️ Si un producto **no** está en ningún envío, su costo sale de `Producto.costo` (catálogo): conviene que ese campo tenga el costo real aunque el producto ya esté agotado.

---

## Fase 8: Mejoras y Optimización

- [ ] Migrar lógica de main.ts a servicios modulares
- [x] **Todos los IDs deben generarse automáticamente al crear registros (evitar entrada manual)** — hecho para Envio, Transaccion, ProductoEnvio y Producto (`id_prod` auto); las Cuentas conservan IDs fijos 1-6 (conjunto predefinido de negocio)
- [x] **Campos numéricos de modales: no mostrar 0 por defecto ni "0 delante del número"** (costo, precio, saldo, montos, tasas, comisión)
- [x] **Cuentas: reemplazar 'Saldo Coinex' por 'Saldo MyPal'** (entity, modal y migración de datos al iniciar)
- [x] **Monedas: soportar todas las monedas del programa** (USD, CUP, USDT, EUR, GBP; se quitaron constraints que las limitaban y se siembran al iniciar)
- [x] **Corregir crash en pestaña Envíos/Transacciones** — numeric de Postgres llega como string; `.toFixed()` crasheaba; ahora se usa `Number()`
- [x] **Peso de los envíos calculado desde `peso_lbs` del producto (Σ cantidad × peso), con ajuste manual** — nuevo campo en Producto, editable en el formulario del envío
- [x] **Envíos: precio de línea autocompletado desde `producto.costo`; botón Crear/Guardar independiente de los campos de "agregar producto"** (ya no bloquea el submit)
- [x] **Pestaña Transacciones limitada a movimientos entre cuentas** — tipo fijo `transferencia` (sin venta/compra/envío), comisiones de plataformas van dentro de la transferencia; se quitó el selector de tipo, la columna "Tipo" y el handler IPC `get-transacciones-por-tipo`; filas existentes se normalizan en `migrarDatosIniciales`
- [x] **Filtro por estado en Envíos** — selector Todos/Pendiente/Recibido en la cabecera de la pestaña
- [x] **Al crear un producto, el stock debe inicializarse con valor 0.00 por defecto** — `Producto.stock_actual` tiene `default: 0` en la entity y `ProductoModal` inicializa los 4 campos numéricos en 0 (verificado 2026-10-27)
- [x] **Separar un poco los botones Editar / Eliminar de las tablas** — las 8 celdas de acciones (Productos, Monedas, Cuentas, Envíos, Transacciones, Ventas, Peers y Flujos) usan `<div className="flex flex-wrap items-center gap-3">` en vez de `space-x-2` (8 px → 12 px, y permite bajar de línea si falta ancho)
- [x] **No permitir borrar envíos con unidades vendidas (bloqueo por integridad)** — `delete-envio` ahora **bloquea** con 3 chequeos en orden y mensaje en claro: capital de socios asignado (`Inversion`), reinversiones que apuntan al envío (`MovimientoCapital.envio_destino`) y unidades ya vendidas. El de unidades vendidas se lee de `calcularRentabilidad().porEnvio.unidadesVendidas`, o sea **al motor FIFO que ya existe** — el aviso anterior era falso por construcción (contaba ventas de los *productos* del envío, no de ese envío). También se corrigió la nota obsoleta de `Bugs Conocidos` que decía que se permitía con aviso
- [x] **Integridad referencial explícita** — `ProductoEnvio.envio` y `ProductoVenta.venta` con `onDelete: CASCADE`; `ProductoEnvio.producto`, `ProductoVenta.producto` y `FlujoConversion.peer` con `onDelete: RESTRICT` más chequeo previo y mensaje en claro (evita el error 23503 de la consola)
- [x] **Quitar el `CHECK (stock_actual >= 0)`** — el stock es derivado y puede ser negativo (se vende antes de marcar el envío como recibido); el constraint abortaba todos los recálculos con 23514. Se elimina del entity y se dropea en la migración de arranque; la tabla marca el negativo en rojo
- [x] **El stock manual ya no se pierde al cambiar de pestaña** — `recalcularStock` reescribía TODOS los productos con `recibidas − vendidas`, poniendo 0 a los que el usuario inventory a mano. Ahora solo deriva los que aparecen en algún envío o venta; el resto conserva el valor escrito. Mismo criterio en `calcularPreciosSugeridos.stockDisponible`, que por eso hacía que el filtro "Con stock" saliera vacío
- [x] **Al crear un envío se guardan sus productos aunque se marque como Recibido** — el candado de "recibido" rechazaba cada `addProductoEnvio`, dejando el envío guardado y sin líneas. Ahora nace pendiente, se agregan los productos y después se aplica el estado
- [x] **Los modales cargan sus líneas antes de abrir** — `openEditEnvioModal`/`openEditVentaModal` seteaban el registro antes del `await`, y el `useEffect` del modal corría una vez con las líneas del registro anterior y otra con las nuevas
- [x] **`EnvioModal` carga la lista una sola vez por apertura** — el `useEffect` resincronizaba con cada cambio de la prop `productosEnvioExistentes` y podía pisar los productos recién añadidos; ahora usa un marcador `useRef` y al cerrar se olvida
- [x] **`delete-envio` no reventaba con envíos sin productos** — el aviso de "ventas afectadas" hacía `WHERE p.id_prod IN (:...ids)`; con la lista vacía TypeORM generaba `IN ()`, que Postgres no parsea (`42601: syntax error at or near ")"`). El `throw` abortaba **antes** del `delete`, así que el envío tampoco se borraba. Ahora solo se consulta si `productoIds.size > 0`
- [x] **Inputs numéricos: se podía escribir texto pero no decimales** — era `value={Number(x) === 0 ? '' : x}` sobre un `<input type="number">`: al teclear `0` el navegador da `"0"`, el ternario lo devuelve como `''` y el 0 se borra; al teclear `12.` la cadena no parsea, `e.target.value` llega `''`, `Number('')` es `0` y se borra todo. **En un envío nuevo todos los campos arrancan en 0, o sea todos vacíos, y no había forma de escribir un costo con decimales.** Resuelto en `EnvioModal` con el componente `NumInput` (guarda el texto, convierte al salir, solo acepta dígitos y un punto)
- [x] **Rollout de `NumInput` a toda la app** — aplicado en `EnvioModal` (6), `ProductoModal` (4), `TransaccionModal` (3), `VentaModal` (2), `TasaCambioModal` (3), `ConversionModal` (3), `CuentaModal` (1), `MonedaModal` (1) y el margen objetivo de la calculadora en `App.tsx` (1). **Ya no queda ningún `type="number"` en el renderer.** Campos calculados (`monto_destino`, `tasa_efectiva`) pasaron a `type="text"` con `readOnly` porque nunca se teclean. `MonedaModal` tenía un parche propio que también perdía el punto; se unificó. `allowNegative` solo en `stock_actual` y `saldo`
- [x] **Limpiar envíos huérfanos de la era con el bug del candado** — el envío 9 (0 productos, del bug del candado) ya se puede borrar con seguridad desde la UI: el `delete-envio` nuevo solo bloquea si hay capital de socios, reinversiones o unidades vendidas, y ese envío no tiene ninguna de las tres. No hizo falta tocar la BD a mano
- [x] **`recalcularSinAbortar()`** — un fallo al recalcular ya no invalida un guardado que sí se confirmó, lo que desincronizaba la UI y generaba la cascada de "Envío no encontrado" / "Venta o Producto no encontrado"
- [x] **Quitar el campo `cliente_revolico` de Venta** — no se podía completar de forma fiable (entity, modal, tabla y CSV)
- [x] **El bridge detecta su muerte inesperada** — avisa con el stderr y pide reiniciar en vez de dejar un `Connection terminated unexpectedly` críptico
- [x] **Recálculo FIFO redundante (N+1)** — cada alta/baja de una línea dispara un `recalcularTodo()` completo; crear una venta de 5 líneas recalculaba 6 veces. Resuelto con el parámetro `recalcular = true` en los handlers de línea y cabecera (`add/update/remove-producto-envio`, `add/remove-producto-venta`, `update-envio`, `update-venta`, `create-venta`) reutilizando el `recalcular-rentabilidad` que ya existía. Los 4 flujos por lote de `App.tsx` pasan `false` en cada línea y disparan **un** recálculo al final. Efecto secundario resuelto de paso: al crear un envío, como nace `pendiente`, sus unidades no contaban como recibidas y el stock se veía **rojo y negativo a medio guardar**; ahora las líneas no tocan el stock hasta el recálculo final
- [x] **Orden en `handleUpdateEnvio`** — actualizaba la cabecera (que dispara el recálculo) y después las líneas, así que el recálculo veía un estado a medias y, si el envío pasaba a `recibido` en ese mismo guardado, la cabecera se aplicaba antes de tiempo. Ahora las líneas van primero con `recalcular = false` y la cabecera al final
- [x] **`delete-envio` en transacción** — el `delete` y el `recalcularTodo` van dentro de `connection.transaction()`. Aquí el recálculo **no** usa `recalcularSinAbortar`: si falla, se revierte el borrado entero (antes quedaba `delete` confirmado con el stock derivado y el costo FIFO desincronizados, y nada lo decía)
- [x] **Limpiar envíos huérfanos de la era con el bug del candado** — el envío 9 (0 productos, del bug del candado) ya se puede borrar con seguridad desde la UI: el `delete-envio` nuevo solo bloquea si hay capital de socios, reinversiones o unidades vendidas, y ese envío no tiene ninguna de las tres. No hizo falta tocar la BD a mano
- [x] **Guardado de envíos/ventas por diff en vez de borrar-todo-y-recrear** — evita romper el candado de envíos recibidos y evita N recálculos FIFO por guardado; nuevo handler `update-producto-envio`
- [x] **Errores visibles en la UI** — helper `mensajeDeError` + `alert` en los handlers que antes solo hacían `console.error`
- [x] Eliminar dependencias no usadas (axios, cheerio) — quitadas de `package.json` (`axios`, `cheerio`, `@types/cheerio`); `npm install` podó 23 paquetes. `axios` sigue en `node_modules` como transitiva de otro paquete, es normal. Typecheck y build en verde
- [x] Agregar validaciones en forms — componente `ErrorFormulario` con el patrón `const [errores, setErrores]` + `setErrores(errores); if (errores.length) return;` en el `handleSubmit`. Cubiertos **13 modales**: Envío, Venta, Transacción, Conversión, Tasa, Moneda, Producto, Cuenta, Peer, Inversor, Aporte, Inversión y Movimiento de capital. `CobroComisionModal` se dejó como estaba: ya validaba (`excede` + `isDisabled` + aviso inline) y es el modelo a seguir. Además, guard en el backend de `update-envio` (no se puede marcar "recibido" un envío sin unidades)
- [x] **Modales pegados en una esquina y sin poder ver todo el formulario (Fase 4.14)** — dos defectos de estructura, ambos en los 18 bloques `Modal` de 14 archivos: (1) `<Modal.Backdrop />` estaba auto-cerrado y el `Modal.Container` era su hermano, así que react-aria-components se creaba su overlay interno sin `.modal__backdrop` → sin centrado y sin límite de altura (el `Container` va **dentro** del `Backdrop`); (2) el `<form>` (`display:block`) se interponía entre `Modal.Dialog` y `Modal.Body` y cortaba la cadena flex que hace scrollear el body → los campos inferiores quedaban inalcanzables (`<form className="flex min-h-0 flex-1 flex-col">`, y en `TasaCambioModal` sus clases `grid` a un `<div>` interno). Envío y Venta pasaron a `size="full"` por sus tablas de 7 columnas
- [ ] Agregar búsqueda en tablas → parcial: los selectores de producto de Envío/Venta ya usan **combo-box** (`SelectorBuscable`); falta un buscador de texto dentro de las tablas
- [x] Agregar paginación → hecho con **pagination** (Fase 4.7): `Paginador` en Productos, Envíos, Ventas y Transacciones
- [x] Agregar confirmación antes de eliminar → hecho con **alert-dialog** (Fase 4.7): `DialogoAviso`, 0 `window.confirm`
- [ ] Mejorar manejo de errores → parcial: `mensajeDeError` + `toast.error`; los avisos inline aún no usan **alert** (Fase 4.7)
- [ ] Agregar tooltips informativos → hoy solo `title` nativo dentro de un `<span>` (RAC filtra `title` en `Button`/`Cell`); falta el `Tooltip` de HeroUI
- [x] Modo oscuro (opcional) → hecho (toggle, `dark:` completo y `useTheme`)

---

## Fase 4.16: Cariño Visual (a–e)

Puramente de presentación: no tocó entidades, servicios FIFO ni handlers IPC.

**Estado (auditado 2026-10-27): ✅ COMPLETA.** Los 20 ítems están hechos y verificados en `src/renderer`. Única excepción: el **Lobby**, que se creó después, todavía tiene 3 `<button>` crudos, pills `<span>` y colores fijos — eso se sigue en la **Fase 6** (pendientes de la versión final).

### 4.16a Fundamentos
- [x] Radios de HeroUI aplicados: `rounded-sm/md/lg/xl` (26 sustituciones) y `rounded-full` en chips/pills
- [x] Texto secundario y tintes grises a tokens: `text-gray-500/600 dark:text-gray-400` → `text-muted` / `text-foreground/70`, fondos/bordes a `bg-surface-secondary` / `bg-surface` / `border-separator` / `hover:bg-surface-hover` (App.tsx, Lobby.tsx y los 13 modales; cero `gray-` en el renderer). `text-muted` adapta claro/oscuro vía `--muted`
- [x] Números en `tabular-nums` (29 tablas/cards), fechas `toLocaleDateString('es-ES')`, vacío `'—'`

### 4.16b Migración de controles crudos a HeroUI
- [x] 22 `<input>` → `<Input fullWidth>`; 4 `<textarea>` → `<TextArea fullWidth>`; 23 `<select>` → `Selector` (helper con `fullWidth`); 2 checkboxes → `<Checkbox>` (InversorModal, PeerModal). Solo queda crudo el `<input>` interno de `NumInput` (guard de decimales)
- [x] Botones verdes → `bg-success text-success-foreground` (3)
- [x] `EmptyState` en la fila vacía de las 13 tablas de App.tsx
- [x] 7 pills → `<Chip color variant="soft">` + mapa `veredictoColor`
- [x] Toasts de éxito: `<ToastProvider placement="bottom end">` en index.tsx + `toast.success(...)` en la ruta de éxito de los 20 handlers (CobroComision conserva su propio diálogo)
- [x] Tintes de fila → `bg-success-soft` / `bg-warning-soft` / `bg-danger-soft`. Ojo: `bg-success/10` NO funciona (HeroUI define `bg-success` como utilidad estática y el modificador de opacidad se cae: queda a plena intensidad)

### 4.16c Layout y encabezado
- [x] `<h1>` "Mi App de Ventas" + contenedor `max-w-7xl mx-auto`; cabecera `justify-between`
- [x] Grid de 6 KPIs del Dashboard a 3×2 (antes 4+2 colgando)

### 4.16d Iconos lucide-react
- [x] Dependencia `lucide-react` (no queda ningún emoji en el renderer)
- [x] 10 tabs (LayoutDashboard, Package, Truck, ArrowLeftRight, ShoppingCart, Handshake, Wallet, Receipt, Calculator, Coins)
- [x] 5 accesos rápidos del Lobby, toggle de tema Sun/Moon, 6 botones de Inversores, 6 tarjetas KPI del Dashboard

### 4.16e Dashboard
- [x] Tarjetas KPI con icono y etiqueta en fila
- [x] Gráficos con ejes/red/tooltip adaptativos al modo (tick `var(--muted)`, grid `var(--separator)`, tooltip `TOOLTIP_ESTILO`); las series conservan los hex de la paleta

---

## Fase 9: Seguridad Integral

"No seguridad en general, para la bd y todo lo demás que creas conveniente".

- [x] **9.1** TLS del bridge validado contra CA pineada de Supabase (`rejectUnauthorized: true` + `servername` + `ca` embebido en base64; TOFU). Verificado end-to-end con `SELECT 1`
- [x] **9.2** Respaldo completo (JSON): canal `exportar-respaldo`, vuelca las 15 tablas a Documents, botón "Exportar Respaldo (JSON)" en Dashboard
- [x] **9.3** Hardening del WebContents: CSP estricta vía `onHeadersReceived` (dev: +`unsafe-inline` para HMR), `setWindowOpenHandler` deny, `will-navigate` solo origen local. Script del tema extraído a `src/renderer/public/theme-init.js`
- [x] **9.4** Credenciales: documentado, NO cambiado (rol de Postgres se queda como está; `.env` gitignored)
- [x] **9.5** `importar-tasas-excel` valida extensión `.xlsx/.xls` además del filtro del diálogo
- [x] **9.6** Bitácora `bitacora-seguridad.log` (append JSON en userData) en los 5 borrados críticos (envío, venta, inversión, inversor, flujo de conversión) — solo cuando el borrado tuvo éxito
- [x] **9.7** Docs: sección "Seguridad (Fase 9)" en CONTEXT.md + lecciones en Bugs Conocidos

---

## Fase 10: Históricos por mes y por año (ganancias y gastos)

**Auditoría (2026-10-27): existe a medias.** El Dashboard ya tiene gráficos **por mes** derivados de las ventas y envíos (`ventasPorMes`, `importesPorMes`, `comparativoImportesVentas`, `invertedVsRecovered`) y Exportar CSV incluye "Mes,Vendido,Ganancia". Pero **no hay**:

- [ ] Selector de **año** ni vista **anual** (todo se suma en una sola línea de tiempo de meses)
- [ ] Sección/tab de **histórico** con tabla mes a mes (hoy solo gráficos)
- [ ] **Gastos** como concepto propio: hoy "gasto" = costo + aranceles del envío y el 1 % devengado. No existe entidad `Gasto` ni registro de gastos operativos (luz, internet, transporte, aduana, etc.)
- [ ] Resumen **anual** (ganancia bruta, gastos, ganancia neta, inversión recuperada) con comparación año contra año
- [ ] Desglose de **gastos por categoría** dentro de un mes/año
- [ ] Exportar el histórico filtrado (CSV/PDF)

### Propuesta mínima
1. Nueva entidad `Gasto` (`id`, `fecha`, `categoria`, `descripcion`, `monto_usd`, `monto_cup`, `tasa`, `envio_id?`) + CRUD y pestaña "Gastos".
2. Vista "Histórico" con dos filtros: **Año** y **Mes** (Todos / Ene…Dic), tarjetas de resumen y tabla mensual.
3. Reutilizar el motor FIFO para la ganancia y sumar los gastos **por su fecha** (no por la fecha del envío).
4. Gráfico de barras por año/mes y comparativo contra el año anterior.

---

## Fase 11: App para Windows (instalador)

Hoy se ejecuta con `npm run dev` / `npm start`: eso exige Node.js y el código fuente. Para tener un `.exe` que se instale y abra con doble clic:

- [ ] `electron-builder` ya está en `devDependencies`, pero **no hay configuración ni scripts**: agregar `build` block en `package.json` (appId, productName, icono, `nsis` one-click, `directories.output`)
- [ ] Icono `.ico` y assets de la app (no hay icono propio todavía)
- [ ] Script `npm run dist:win` (`electron-builder --win nsis`)
- [ ] **Empaquetar `.env` / credenciales**: hoy `dbBridge` lee `DB_HOST/PORT/USER/PASSWORD/NAME`. Decidir si van embebidas en el instalador (cómodo, pero el `.exe` las expone) o si se piden en un primer arranque y se guardan cifradas en `userData`
- [ ] Verificar el bridge TLS y la CA pineada dentro del paquete (rutas `app.asar`, `NODE_BIN` no aplica en producción: usar el binario empaquetado)
- [ ] Probar en una PC limpia sin Node.js: instalación, conexión a Supabase, respaldo JSON en `Documents`
- [ ] Firma de código (opcional; sin firma, Windows SmartScreen mostrará advertencia)
- [ ] Auto-actualización (opcional, para más adelante)

---

## Fase 12: Realidad de Cuba (cortes de luz y mala conexión) — planificación futura

Cuando llegue el momento, diseñar **offline-first**, porque la app hoy **depende 100 % de Supabase**: sin internet no abre datos ni guarda.

- [ ] **Planificar antes de implementar** (modo planificador): qué se puede hacer sin conexión y qué no
- [ ] **SQLite local** como fuente primaria en el escritorio y sincronización con Supabase al recuperar señal
- [ ] **Cola de operaciones offline** (outbox): ventas, gastos y movimientos se guardan localmente y se suben cuando haya red
- [ ] **Resolución de conflictos** (última escritura vs. merge por `updated_at`) y qué pasa con el FIFO/stock si dos dispositivos venden lo mismo
- [ ] **Cortes de luz**: guardado inmediato en disco (no en memoria), cierre/rearranque seguro, WAL en SQLite, recuperación tras apagón a mitad de una operación
- [ ] **Sincronización incremental** (no descargar todo): solo cambios desde la última marca de agua
- [ ] **Indicador de estado** visible: "Sin conexión — N operaciones pendientes", con reintento manual
- [ ] **Respaldos locales automáticos** (JSON/SQLite) para no depender de la nube
- [ ] Revisar el consumo de datos y los timeouts del pooler de Supabase con red 2G/3G

---

## Prioridad Recomendada

Estado a 2026-10-27. Las fases 0–4.6, 4.8, 4.16 y 9 están terminadas. Lo que viene, en orden:

```
1. Fase 4.7 restante (UI)  ← lo que falta de HeroUI: dropdown, alert,
   input-group, separator, close-button, progress-circle, meter,
   scroll-shadow y el tema
2. Fase 10 (Históricos por mes/año + gastos)  ← se necesita antes/después de
   cargar los históricos a mano
3. Fase 6 final (pulido del Lobby: Button/Chip/tokens/intro)
4. Fase 11 (App para Windows: instalador .exe)
5. Fase 5 (Android + modo offline)
6. Fase 12 (realidad de Cuba: cortes de luz y mala conexión — planificación)
7. Fase 8 (deuda técnica: partir main.ts en servicios)
```

**Ajuste rápido de UI (independiente del orden):** separar los botones Editar/Eliminar de la tabla Productos (ver Fase 8).

## Notas
- **Fase 7 (Excel) está descartada**: los históricos se cargan a mano. No volver a proponer un importador salvo petición explícita.
- **Fase 6 (Lobby) ya existe**, pero no es la versión final: quedan los `<button>`/pills/colores fijos (ver el bloque de pendientes de la fase).
- **Fase 4.7 no está terminada**: 7 componentes sin migrar (dropdown, input-group, alert, separator, close-button, progress-circle, meter) + `scroll-shadow` parcial + el tema; la tabla de auditoría de esa fase dice exactamente dónde está cada uno.
- Fase 5 (Android) requiere investigación previa de herramientas. Su modo offline es la base de la Fase 12.
- Fases 4.5 y 4.6 dependen del modelo FIFO: el costo real de cada venta se deriva de los envíos, así que `precio_unitario` en `EnvioModal` debe reflejar lo que realmente se pagó por cada artículo en ese envío.
- Fase 4.7 (HeroUI) es puramente de presentación: **no debe tocar entidades, servicios FIFO ni handlers IPC**. El orden 4.5 → 4.6 → 4.7 es deliberado, para tener la lógica estable antes de pintar la interfaz.
- La BD es **remota (Supabase)** y la app **no funciona sin internet** hasta que se haga la Fase 12. Tenerlo presente antes de usarla en un corte de luz.
- HeroUI v3.2.6 declara peers `react >=19.0.0` y `tailwindcss >=4.0.0`, compatible con este proyecto (React 19, Tailwind 4.2.4). La versión de documentación enlazada por el usuario corresponde a HeroUI v3
