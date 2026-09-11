# Mi App de Ventas - Contexto del Proyecto

## Descripción General
Aplicación de escritorio para gestión de ventas, inventario y finanzas personales.
Orientada al negocio de importación y venta de artículos desde/para Cuba.

## Stack Tecnológico
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Recharts
- **Backend**: Electron 41 + Node.js
- **Base de datos**: PostgreSQL (TypeORM 0.3)

## Modelos de Negocio

### 1. Importación de Artículos
- **Proveedor**: WeShipYou (casillero virtual en EE.UU.)
- **Flujo**: Compra en EE.UU. → Envío a casillero → Envío a Cuba → Recepción
- **Datos por envío**: Peso (lbs), cantidad de artículos, costo de envío, aranceles USD, estado (pendiente/recibido)
- **Relación**: Cada envío contiene múltiples productos (ProductoEnvio)

### 2. Ventas en Cuba
- **Plataforma**: Revolico
- **Flujo**: Cliente escribe → Negociación → Venta → Pago
- **Formas de pago del cliente**:
  1. CUP en efectivo
  2. CUP por transferencia bancaria
  3. USD en efectivo
  4. USDT

### 3. Recarga de Tarjetas en el Exterior
- **Exchange**: QvaPay
- **Tarjetas**: MyPal, MPay
- **Problema**: Las recargas se hacen con cripto debido a sanciones a Cuba
- **Flujo CUP → USD** (el más complejo):
  - Opción A: CUP cash → Comprar USD al mercado negro → Peer QvaPay cambia USD por USDT
  - Opción B: CUP transferencia → Peer cambia por CUP cash (cobran ~10%) → Comprar USD → Peer USD→USDT
  - Opción C: CUP transferencia → Peer cambia directo por USDT (caro)

## Entidades de la Base de Datos

### Moneda
| Campo | Tipo | Descripción |
|-------|------|-------------|
| codigo | VARCHAR(5) PK | USD, CUP, USDT |
| nombre | VARCHAR(50) | Nombre completo |
| tasa_cambio | NUMERIC(10,4) | Tasa en CUP |

### Cuenta
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_cuenta | NUMERIC PK | ID fijo (1-6) |
| nombre | VARCHAR(50) | Nombre de la cuenta |
| saldo | NUMERIC(15,2) | Saldo actual |
| codigo_moneda | FK → Moneda | Moneda de la cuenta |

**Cuentas predefinidas**:
1. Efectivo USD
2. Efectivo CUP
3. CUP Transferencia
4. Saldo Coinex
5. Saldo QvaPay
6. Saldo MPay

### Producto
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_prod | VARCHAR(50) PK | ID del producto |
| nombre_prod | VARCHAR(100) | Nombre |
| descripcion | VARCHAR(255) | Descripción (opcional) |
| costo | NUMERIC(10,2) | Costo en USD |
| precio_venta | NUMERIC(10,2) | Precio venta en USD |
| stock_actual | NUMERIC(10,2) | Stock (≥0) |

### Envío
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Autoincremental |
| proveedor | VARCHAR(100) | Default: WeShipYou |
| costo | NUMERIC(15,2) | Costo del envío |
| aranceles_usd | NUMERIC(15,2) | Aranceles en USD |
| peso_total_lbs | NUMERIC(15,2) | Peso en libras |
| fecha_creacion | TIMESTAMP | Auto |
| fecha_recepcion | TIMESTAMP | Nullable |
| estado | VARCHAR(20) | pendiente/recibido |

### ProductoEnvio
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | NUMERIC PK | ID |
| envio_id | FK → Envío | Envío asociado |
| producto_id | FK → Producto | Producto asociado |
| cantidad | INT | Cantidad de unidades |
| precio_unitario | NUMERIC | Precio unitario |

### Transacción
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_trans | NUMERIC PK | ID |
| cuenta_origen_id | FK → Cuenta | Cuenta origen |
| cuenta_destino_id | FK → Cuenta | Cuenta destino |
| monto_origen | NUMERIC(15,2) | Monto en moneda origen |
| monto_destino | NUMERIC(15,2) | Monto en moneda destino |
| tasa_cambio | NUMERIC(10,4) | Tasa aplicada |
| comision | NUMERIC(15,2) | Comisión cobrada |
| tipo | VARCHAR(50) | transferencia/venta/compra/envío |
| fecha | TIMESTAMP | Fecha de la transacción |
| descripcion | VARCHAR(255) | Descripción |

### tasa_cambio_historico
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | SERIAL PK | Auto |
| fecha | DATE UNIQUE | Fecha |
| usd_to_cup | NUMERIC(10,4) | Tasa USD → CUP |
| eur_to_cup | NUMERIC(10,4) | Tasa EUR → CUP (opcional) |
| gbp_to_cup | NUMERIC(10,4) | Tasa GBP → CUP ( opcional) |
| fuente | VARCHAR(20) | manual/excel |
| created_at | TIMESTAMP | Auto |

## Estado Actual de la App

### ✅ Implementado
- CRUD Productos (UI + Backend)
- CRUD Monedas (UI + Backend)
- CRUD Tasas de Cambio (UI + Backend)
- Gestión de tasas manuales e importación Excel
- Gráfico histórico de tasas
- Conexión TypeORM a PostgreSQL vía Supabase (bridge `dbBridge.ts` resuelve EACCES de ESET)

### ⚠️ Parcial
- Cuentas: Entity definida, solo lectura, falta CuentaModal

### ❌ No implementado
- Envíos: Entity definida, sin handlers IPC ni UI
- ProductoEnvio: Entity incompleta (faltan campos)
- Transacciones: Entity definida, sin handlers IPC ni UI

## Bugs Conocidos
1. Tabla Cuentas en App.tsx muestra columnas "Tipo" y "Telefono" que no existen
2. Botón "+ Nueva Cuenta" no abre modal (falta CuentaModal)
3. ProductoEnvio le faltan campos: cantidad, precio_unitario
4. Transaccion le falta campo: descripcion
5. database.ts está vacío (todo está en main.ts)

## 💡 Conexión a Supabase vía Bridge (resuelto EACCES de Electron)

**Problema**: ESET Endpoint Antivirus bloquea sockets TCP externos del binario `electron.exe` (EACCES), mientras que `node.exe` sí puede conectarse a Supabase.

**Solución implementada** (`src/main/dbBridge.ts`):
- Electron ya NO se conecta directamente a la nube; abre un socket local `127.0.0.1` en un puerto aleatorio (5433-6533).
- `dbBridge` spawnea `node.exe` (C:\Program Files\nodejs\node.exe, configurable con env `NODE_BIN`) que ejecuta un script TCP puro.
- El script responde al protocolo Postgres: envía `SSLRequest` (PgBouncer de Supabase lo exige antes de TLS), hace upgrade a TLS con `rejectUnauthorized: false`, y reenvía bytes en ambas direcciones.
- `main.ts` usa `host: '127.0.0.1'`, `ssl: false` (el TLS lo maneja el bridge hacia la nube).
- El bridge se cierra con `stopDbBridge()` al salir de la app.

**Verificado**: `SELECT 1` OK desde Electron vía bridge (puerto 6146), y `npm run build` compila limpio.

## Dependencias No Usadas
- axios (instalado, no importado)
- cheerio (instalado, no importado)
