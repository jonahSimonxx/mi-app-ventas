# TODO List - Mi App de Ventas

## Fase 0: Corregir Bugs y Completar Entities

- [ ] Corregir tabla Cuentas en App.tsx (columnas "Tipo" y "Telefono" no existen)
- [ ] Completar entity ProductoEnvio: agregar campos `cantidad` y `precio_unitario`
- [ ] Completar entity Transaccion: agregar campo `descripcion`
- [ ] Crear componente CuentaModal.tsx
- [ ] Conectar CuentaModal en App.tsx (renderizar condicionalmente)
- [ ] Mover lógica de conexión de database.ts a main.ts (opcional, limpieza)

---

## Fase 1: Importación (Envíos WeShipYou)

### Backend
- [ ] Crear handlers IPC para Envio (CRUD completo)
  - [ ] get-envios
  - [ ] create-envio
  - [ ] update-envio
  - [ ] delete-envio
  - [ ] get-envio-by-id
- [ ] Crear handlers IPC para ProductoEnvio (CRUD)
  - [ ] get-productos-envio
  - [ ] add-producto-envio
  - [ ] remove-producto-envio
- [ ] Actualizar preload.ts con nuevos canales
- [ ] Actualizar electron.d.ts con nuevos tipos

### Frontend
- [ ] Crear componente EnvioModal.tsx (crear/editar envío)
  - [ ] Campo: proveedor (default WeShipYou)
  - [ ] Campo: costo envío USD
  - [ ] Campo: aranceles USD
  - [ ] Campo: peso total lbs
  - [ ] Campo: estado (pendiente/recibido)
  - [ ] Campo: fecha recepción (nullable)
  - [ ] Lista de productos del envío (agregar/quitar)
- [ ] Crear pestaña "Envíos" en App.tsx
- [ ] Tabla de envíos con columnas: ID, Proveedor, Peso, Costo, Aranceles, Estado, Fecha, Acciones
- [ ] Indicador visual de estado (pendiente = amarillo, recibido = verde)
- [ ] Filtro por estado

---

## Fase 2: Ventas (Transacciones Revolico)

### Backend
- [ ] Crear handlers IPC para Transaccion (CRUD completo)
  - [ ] get-transacciones
  - [ ] create-transaccion
  - [ ] update-transaccion
  - [ ] delete-transaccion
  - [ ] get-transacciones-por-fecha
  - [ ] get-transacciones-por-tipo
- [ ] Crear servicio de conversión de monedas
  - [ ] Calcular monto destino según tasa
  - [ ] Registrar comisiones por plataforma

### Frontend
- [ ] Crear componente TransaccionModal.tsx
  - [ ] Campo: tipo (transferencia/venta/compra/envío)
  - [ ] Campo: cuenta origen (select)
  - [ ] Campo: cuenta destino (select)
  - [ ] Campo: monto origen
  - [ ] Campo: monto destino (calculado automáticamente)
  - [ ] Campo: tasa de cambio aplicada
  - [ ] Campo: comisión cobrada
  - [ ] Campo: fecha
  - [ ] Campo: descripción
- [ ] Crear pestaña "Transacciones" en App.tsx
- [ ] Tabla de transacciones con columnas: ID, Tipo, Origen, Destino, Monto, Tasa, Comisión, Fecha, Acciones
- [ ] Resumen por tipo de transacción
- [ ] Filtros por fecha y tipo

---

## Fase 3: Recarga de Tarjetas (QvaPay, MyPal, MPay)

### Modelado
- [ ] Definir flujos de conversión:
  - [ ] CUP cash → USD (mercado negro) → USDT (peer QvaPay)
  - [ ] CUP transferencia → CUP cash (peer, -10%) → USD → USDT
  - [ ] CUP transferencia → USDT directo (peer, caro)
- [ ] Registrar tasa de mercado negro (diferente a tasa oficial)

### Backend
- [ ] Crear servicio de flujos de conversión
  - [ ] Registrar cada paso del flujo
  - [ ] Calcular comisiones por peer/plataforma
  - [ ] Calcular pérdida total por conversión
- [ ] Crear handlers para registro de peers QvaPay
  - [ ] get-peers
  - [ ] create-peer
  - [ ] update-peer
  - [ ] delete-peer

### Frontend
- [ ] Crear pestaña "Recargas" o "Conversión"
- [ ] Formulario de nuevo flujo de conversión
  - [ ] Selección de tipo de flujo (A, B, C)
  - [ ] Registro de cada paso con montos y comisiones
  - [ ] Cálculo automático del total gastado
- [ ] Tabla de flujos realizados
- [ ] Historial de peers utilizados
- [ ] Dashboard con resumen de conversión:
  - [ ] Total CUP invertido
  - [ ] Total USDT recibido
  - [ ] Pérdida total por comisiones
  - [ ] Tasa efectiva de cambio

---

## Fase 4: Dashboard y Reportes

- [ ] Crear pestaña "Dashboard"
- [ ] Resumen financiero:
  - [ ] Total inversionado en importaciones
  - [ ] Total vendido
  - [ ] Ganancia neta
  - [ ] Stock total
- [ ] Gráficos:
  - [ ] Ventas por mes
  - [ ] Distribución por forma de pago
  - [ ] Evolución de tasas de cambio
  - [ ] Costos de importación vs ventas
- [ ] Exportar reportes a Excel

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
- [ ] Implementar modo offline/online
- [ ] Testing en dispositivo real

---

## Fase 6: Lobby / Home Screen

### Diseño
- [ ] Crear pantalla de inicio (Lobby) con acceso rápido a:
  - [ ] Botón "Nueva Venta" → abre formulario de venta
  - [ ] Botón "Agregar a Inventario" → abre formulario de producto
  - [ ] Botón "Registrar Envío" → abre formulario de envío
  - [ ] Resumen rápido: ventas del día, stock bajo, envíos pendientes
- [ ] Implementar navegación por pestañas o sidebar
- [ ] Diseñar layout responsive (desktop y móvil)

### Backend
- [ ] Crear handler IPC para estadísticas del dashboard
  - [ ] get-resumen-diario (ventas hoy, ingresos, etc.)
  - [ ] get-alertas (stock bajo, envíos pendientes)
- [ ] Actualizar preload.ts con nuevos canales

### Frontend
- [ ] Crear componente Lobby.tsx
- [ ] Crear componente CardResumen.tsx (tarjetas de resumen)
- [ ] Crear componente BotonRapido.tsx (accesos directos)
- [ ] Integrar con pestañas existentes

---

## Fase 7: Importación de Excel (Análisis)

### Tarea
- [ ] Subir archivos Excel actuales para analizar estructura de datos
- [ ] Identificar columnas y formato used
- [ ] Diseñar mapeo Excel → Entidades de la BD
- [ ] Crear importador de Excel para:
  - [ ] Productos (catálogo actual)
  - [ ] Ventas históricas
  - [ ] Envíos realizados
  - [ ] Tasas de cambio

### Preguntas para el usuario
- [ ] ¿Qué columnas tienen tus Excel actuales?
- [ ] ¿Son varios archivos o uno solo con diferentes hojas?
- [ ] ¿Quieres importar el historial o empezar de cero?

---

## Fase 8: Mejoras y Optimización

- [ ] Migrar lógica de main.ts a servicios modulares
- [ ] Eliminar dependencias no usadas (axios, cheerio)
- [ ] Agregar validaciones en forms
- [ ] Agregar búsqueda en tablas
- [ ] Agregar paginación
- [ ] Agregar confirmación antes de eliminar
- [ ] Mejorar manejo de errores
- [ ] Agregar tooltips informativos
- [ ] Modo oscuro (opcional)

---

## Prioridad Recomendada

```
Fase 0 (Bugs) → Fase 1 (Envíos) → Fase 2 (Ventas) → Fase 3 (Recargas) → Fase 4 (Dashboard) → Fase 5 (Android) → Fase 6 (Lobby) → Fase 7 (Excel) → Fase 8 (Mejoras)
```

## Notas
- Fase 5 (Android) requiere investigación previa de herramientas
- Fase 7 (Excel) necesita que el usuario suba sus archivos actuales para analizar la estructura
- Fase 6 (Lobby) puede implementarse en paralelo con otras fases
