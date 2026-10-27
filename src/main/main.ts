import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import * as fs from 'fs';
import { startDbBridge, stopDbBridge } from './dbBridge';
import { registrarEnBitacora } from './services/bitacoraService';

// Fuerza conexión directa sin proxy del sistema (Psiphon/VPN no debe interferir).
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('no-sandbox');

// Carga las variables de entorno desde .env (credenciales de BD, etc.).
try {
  require('dotenv').config();
} catch {
  console.warn('⚠️ dotenv no está instalado; se usarán los valores por defecto. Ejecuta "npm install".');
}

import { createConnection, Connection, getConnection, Between } from 'typeorm';
import { Producto } from '../shared/entities/Producto';
import { Moneda } from '../shared/entities/Moneda';
import { Cuenta } from '../shared/entities/Cuenta';
import { Envio } from '../shared/entities/Envio';
import { ProductoEnvio } from '../shared/entities/ProductoEnvio';
import { Transaccion } from '../shared/entities/Transaccion';
import { TasaCambioHistorico } from '../shared/entities/TasaCambioHistorico';
import { Peer } from '../shared/entities/Peer';
import { FlujoConversion } from '../shared/entities/FlujoConversion';
import { Venta } from '../shared/entities/Venta';
import { ProductoVenta } from '../shared/entities/ProductoVenta';
import { Inversor } from '../shared/entities/Inversor';
import { Aporte } from '../shared/entities/Aporte';
import { Inversion } from '../shared/entities/Inversion';
import { MovimientoCapital } from '../shared/entities/MovimientoCapital';
import { Gasto } from '../shared/entities/Gasto';
import { normalizarImporteGasto } from '../shared/gastos';
import {
  calcularResumenInversores,
  crearInversor,
  actualizarInversor,
  registrarAporte,
  registrarInversion,
  registrarMovimiento,
  registrarCobroComision,
  DatosInversor,
  DatosAporte,
  DatosInversion,
  DatosMovimiento,
  DatosCobroComision,
} from './services/inversoresService';
import {
  getTasaActual,
  getTasaPorFecha,
  getTasasHistoricas,
  agregarTasaManual,
  importarTasasDesdeExcel,
  TasaCambioManual,
} from './services/tasaCambioService';
import {
  calcularRentabilidad,
  recalcularTodo,
  previewCostoVenta,
  calcularPreciosSugeridos,
  LineaVentaSimulada,
} from './services/rentabilidadService';

let mainWindow: BrowserWindow | null = null;
let connection: Connection | null = null;

function generarIdProducto(): string {
  return (
    'P' +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 5).toUpperCase()
  );
}

/**
 * Recalcula FIFO/stock sin propagar el fallo.
 *
 * El guardado del cambio ya está confirmado en la base de datos cuando se llama a
 * esto, así que si el recálculo revienta no debe invalidar la operación: de lo
 * contrario el renderer cree que todo falló, no refresca, y las siguientes acciones
 * opere sobre filas que la UI todavía cree Alive (ventas huérfanas, "Envío no
 * encontrado", "Venta o Producto no encontrado"). Se avisa, pero el guardado vale.
 */
async function recalcularSinAbortar(): Promise<void> {
  if (!connection) return;
  try {
    await recalcularTodo(connection);
  } catch (error) {
    console.error(
      '⚠️ El cambio se guardó, pero falló el recálculo de rentabilidad/stock. Reinicia la app para reintentarlo.',
      error instanceof Error ? error.message : error
    );
  }
}

// Postgres devuelve los numeric como string, y TypeORM no siempre los proyecta. Este
// helper es el que evita el bug clasico de comparar 0 contra "" (ver CONTEXT.md).
function n(valor: any): number {
  const parsed = Number(valor);
  return Number.isFinite(parsed) ? parsed : 0;
}

function s(valor: any): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

// Un producto es "manual" (de inventario a mano) si NUNCA ha entrado en ningún envío
// (pendiente o recibido). recalcularStock ya no lo deriva: su stock lo escribe el
// usuario y las ventas se lo descuentan directamente aquí, así "agregar producto con
// stock y venderlo" descuenta (stock 1 − 1 = 0) en vez de caer en el negativo fantasma
// `0 recibidas − vendidas`. Para garantizar el signo, un retiro o baja de producto de
// una venta usa `+delta` y un alta o re-creación usa `-delta`.
function productoEnAlgunEnvio(productoId: string): Promise<boolean> {
  if (!connection) return Promise.resolve(false);
  return connection
    .getRepository(ProductoEnvio)
    .count({ where: { producto: { id_prod: productoId } } })
    .then((total) => total > 0)
    .catch(() => false);
}

async function ajustarStockProductoManual(productoId: string, delta: number): Promise<void> {
  if (!connection || (await productoEnAlgunEnvio(productoId))) return;
  const repo = connection.getRepository(Producto);
  const producto = await repo.findOne({ where: { id_prod: productoId } });
  if (!producto) return;
  producto.stock_actual = n(producto.stock_actual) + delta;
  await repo.save(producto);
}

async function migrarDatosIniciales() {
  if (!connection) return;
  try {
    const repoMoneda = connection.getRepository(Moneda);
    const monedasBase = [
      { codigo: 'USD', nombre: 'Dólar Estadounidense' },
      { codigo: 'CUP', nombre: 'Peso Cubano' },
      { codigo: 'USDT', nombre: 'Tether' },
      { codigo: 'EUR', nombre: 'Euro' },
      { codigo: 'GBP', nombre: 'Libra Esterlina' },
    ];
    for (const m of monedasBase) {
      const existente = await repoMoneda.findOne({ where: { codigo: m.codigo } });
      if (!existente) {
        await repoMoneda.save(
          repoMoneda.create({
            codigo: m.codigo,
            nombre: m.nombre,
            tasa_cambio: m.codigo === 'CUP' ? 1 : 0,
          } as Moneda)
        );
      }
    }

    const repoCuenta = connection.getRepository(Cuenta);
    // Renombre histórico: Saldo Coinex → Saldo MyPal
    const cuentaCoinex = await repoCuenta.findOne({ where: { id_cuenta: '4', nombre: 'Saldo Coinex' } });
    if (cuentaCoinex) {
      cuentaCoinex.nombre = 'Saldo MyPal';
      await repoCuenta.save(cuentaCoinex);
      console.log('✅ Cuenta 4 renombrada: Saldo Coinex → Saldo MyPal');
    }

    const totalCuentas = await repoCuenta.count();
    if (totalCuentas === 0) {
      const cuentasBase = [
        { id_cuenta: '1', nombre: 'Efectivo USD', codigo: 'USD' },
        { id_cuenta: '2', nombre: 'Efectivo CUP', codigo: 'CUP' },
        { id_cuenta: '3', nombre: 'CUP Transferencia', codigo: 'CUP' },
        { id_cuenta: '4', nombre: 'Saldo MyPal', codigo: 'USD' },
        { id_cuenta: '5', nombre: 'Saldo QvaPay', codigo: 'USDT' },
        { id_cuenta: '6', nombre: 'Saldo MPay', codigo: 'USD' },
      ];
      for (const c of cuentasBase) {
        await repoCuenta.save(
          repoCuenta.create({
            id_cuenta: c.id_cuenta,
            nombre: c.nombre,
            saldo: 0,
            moneda: { codigo: c.codigo } as Moneda,
          } as Cuenta)
        );
      }
      console.log('✅ Cuentas predefinidas creadas');
    }

    // Las transacciones son solo movimientos entre cuentas (tipo 'transferencia')
    await connection.query(
      'UPDATE "Transaccion" SET tipo=\'transferencia\' WHERE tipo IS DISTINCT FROM \'transferencia\''
    );

    // El stock es derivado (unidades recibidas - unidades vendidas) y puede quedar
    // negativo si se vende antes de marcar el envío como recibido. Este CHECK lo
    // bloqueaba y abortaba todos los recálculos (error 23514 en Producto).
    // Va en su propio try/catch: si falla, el recálculo de abajo debe correr igual.
    try {
      await connection.query(`
        DO $$
        DECLARE cname text;
        BEGIN
          FOR cname IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = '"Producto"'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%stock_actual%'
          LOOP
            EXECUTE format('ALTER TABLE "Producto" DROP CONSTRAINT %I CASCADE', cname);
          END LOOP;
        END $$;
      `);
    } catch (error) {
      console.error('⚠️ No se pudo quitar el CHECK de stock_actual:', error instanceof Error ? error.message : error);
    }

    // Cuenta arrastraba un CHECK que limitaba id_cuenta a 1-6 (las 6 cuentas
    // predefinidas). Los inversores necesitan una cuenta propia por socio (IDs 7+)
    // para que aportes y retiros sean Transacciones de caja reales, asi que el CHECK
    // las bloqueaba con error 23514. Mismo idioma que el de stock_actual y su propio
    // try/catch para no abortar el recalculo.
    try {
      await connection.query(`
        DO $$
        DECLARE cname text;
        BEGIN
          FOR cname IN
            SELECT conname FROM pg_constraint
            WHERE conrelid = '"Cuenta"'::regclass
              AND contype = 'c'
              AND pg_get_constraintdef(oid) ILIKE '%id_cuenta%'
          LOOP
            EXECUTE format('ALTER TABLE "Cuenta" DROP CONSTRAINT %I CASCADE', cname);
          END LOOP;
        END $$;
      `);
    } catch (error) {
      console.error('⚠️ No se pudo quitar el CHECK de id_cuenta:', error instanceof Error ? error.message : error);
    }

    // El 1% del socio tiene dos momentos y por eso dos columnas: comision_devengada
    // (al vender, la escribe la pasada FIFO) y comision_cobrada (cuando el socio paga
    // al depositar en QvaPay, solo esa la escribe el usuario). Antes era una sola
    // columna "comision_pagada", que mentía en las dos puntas. Esa migración ya se
    // hizo en su día (renombrar+dropar la columna vieja), así que aquí SOLO se
    // garantiza que las tres columnas existen; no hay nada que migrar de la vieja.
    //
    // ⚠️ No reintroducir un UPDATE/DROP contra "comision_pagada": ya no existe y
    // un batch que la referencie falla en cada arranque (y aborta todo el lote,
    // que va en una transacción implícita, revirtiendo también los ADD COLUMN).
    try {
      await connection.query(`
        ALTER TABLE "Inversion" ADD COLUMN IF NOT EXISTS comision_devengada numeric(15,2) NOT NULL DEFAULT 0;
        ALTER TABLE "Inversion" ADD COLUMN IF NOT EXISTS comision_cobrada numeric(15,2) NOT NULL DEFAULT 0;
        ALTER TABLE "Inversion" ADD COLUMN IF NOT EXISTS fecha_cobro_comision timestamp;
      `);
    } catch (error) {
      console.error('⚠️ No se pudo asegurar las columnas de comisión en Inversion:', error instanceof Error ? error.message : error);
    }

    await recalcularTodo(connection);
    console.log('✅ Rentabilidad FIFO y stock derivados recalculados');
  } catch (error) {
    console.error('❌ Error en la migración de datos iniciales:', error);
  }
}

async function initDatabase() {
  try {
    // Electron ligado por ESET: abre socket TCP local y el bridge se conecta a la nube.
    const bridgePort = await startDbBridge();
    connection = await createConnection({
      type: 'postgres',
      host: '127.0.0.1',
      port: bridgePort,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '1234',
      database: process.env.DB_NAME || 'mi-app-ventas-data-base',
      entities: [Producto, Moneda, Cuenta, Envio, ProductoEnvio, Transaccion, TasaCambioHistorico, Peer, FlujoConversion, Venta, ProductoVenta, Inversor, Aporte, Inversion, MovimientoCapital, Gasto],
      synchronize: true,
      ssl: false,
      logging: false,
    });
    console.log('✅ Base de datos conectada vía bridge local (puerto ' + bridgePort + ')');
    await migrarDatosIniciales();
  } catch (error) {
    console.error('❌ Error en la base de datos:', error);
    connection = null;
  }
}

// ========== HANDLERS DE PRODUCTO ==========
ipcMain.handle('get-productos', async () => {
  try {
    const repo = connection!.getRepository(Producto);
    return await repo.find();
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    return [];
  }
});

ipcMain.handle('create-producto', async (_, producto: Partial<Producto>) => {
  try {
    const repo = connection!.getRepository(Producto);
    const nuevoProducto = repo.create({
      ...producto,
      id_prod: producto.id_prod?.trim() || generarIdProducto(),
    } as Producto);
    await repo.save(nuevoProducto);
    return nuevoProducto;
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    throw error;
  }
});

ipcMain.handle('update-producto', async (_, id: string, producto: Partial<Producto>) => {
  try {
    const repo = connection!.getRepository(Producto);
    await repo.update(id, producto);
    return await repo.findOne({ where: { id_prod: id } });
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    throw error;
  }
});

ipcMain.handle('delete-producto', async (_, id: string) => {
  try {
    const repo = connection!.getRepository(Producto);
    const producto = await repo.findOne({ where: { id_prod: id } });
    if (!producto) return true;

    const enEnvios = await connection!.getRepository(ProductoEnvio).count({
      where: { producto: { id_prod: id } },
    });
    const enVentas = await connection!.getRepository(ProductoVenta).count({
      where: { producto: { id_prod: id } },
    });

    if (enEnvios > 0 || enVentas > 0) {
      const partes: string[] = [];
      if (enEnvios > 0) partes.push(`${enEnvios} ${enEnvios === 1 ? 'envío' : 'envíos'}`);
      if (enVentas > 0) partes.push(`${enVentas} ${enVentas === 1 ? 'venta' : 'ventas'}`);
      const pasos: string[] = [];
      if (enEnvios > 0) pasos.push('quítalo de los envíos (devuélvelos a Pendiente para poder editarlos)');
      if (enVentas > 0) pasos.push('elimínalo de las ventas');
      throw new Error(
        `«${producto.nombre_prod}» está en uso: aparece en ${partes.join(' y ')}. Para borrarlo, ${pasos.join(' y ')}.`
      );
    }

    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error instanceof Error ? error.message : error);
    throw error;
  }
});

// ========== HANDLERS DE MONEDA ==========
ipcMain.handle('get-monedas', async () => {
  try {
    const repo = connection!.getRepository(Moneda);
    return await repo.find();
  } catch (error) {
    console.error('❌ Error al obtener monedas:', error);
    return [];
  }
});

ipcMain.handle('create-moneda', async (_, moneda: Partial<Moneda>) => {
  try {
    const repo = connection!.getRepository(Moneda);
    const nuevaMoneda = repo.create(moneda as Moneda);
    await repo.save(nuevaMoneda);
    return nuevaMoneda;
  } catch (error) {
    console.error('❌ Error al crear moneda:', error);
    throw error;
  }
});

ipcMain.handle('update-moneda', async (_, codigo: string, moneda: Partial<Moneda>) => {
  try {
    const repo = connection!.getRepository(Moneda);
    await repo.update(codigo, moneda);
    return await repo.findOne({ where: { codigo } });
  } catch (error) {
    console.error('❌ Error al actualizar moneda:', error);
    throw error;
  }
});

ipcMain.handle('delete-moneda', async (_, codigo: string) => {
  try {
    const repo = connection!.getRepository(Moneda);
    await repo.delete(codigo);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar moneda:', error);
    throw error;
  }
});

  // ========== HANDLERS DE CUENTA ==========
ipcMain.handle('get-cuentas', async () => {
  try {
    const repo = connection!.getRepository(Cuenta);
    return await repo.find({ relations: ['moneda'] });
  } catch (error) {
    console.error('❌ Error al obtener cuentas:', error);
    return [];
  }
});

ipcMain.handle('create-cuenta', async (_, cuenta: Partial<Cuenta>) => {
  try {
    const repo = connection!.getRepository(Cuenta);
    const nuevaCuenta = repo.create(cuenta as Cuenta);
    await repo.save(nuevaCuenta);
    return nuevaCuenta;
  } catch (error) {
    console.error('❌ Error al crear cuenta:', error);
    throw error;
  }
});

ipcMain.handle('update-cuenta', async (_, id: string, cuenta: Partial<Cuenta>) => {
  try {
    const repo = connection!.getRepository(Cuenta);
    await repo.update(id, cuenta);
    return await repo.findOne({ where: { id_cuenta: id } });
  } catch (error) {
    console.error('❌ Error al actualizar cuenta:', error);
    throw error;
  }
});

ipcMain.handle('delete-cuenta', async (_, id: string) => {
  try {
    const repo = connection!.getRepository(Cuenta);
    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar cuenta:', error);
    throw error;
  }
});


  // ========== HANDLERS DE ENVIO ==========
ipcMain.handle('get-envios', async () => {
  try {
    const repo = connection!.getRepository(Envio);
    return await repo.find({ relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al obtener envíos:', error);
    return [];
  }
});

ipcMain.handle('create-envio', async (_, envioData) => {
  try {
    const repo = connection!.getRepository(Envio);
    const datos = envioData.estado === 'recibido' && !envioData.fecha_recepcion
      ? { ...envioData, fecha_recepcion: new Date() }
      : envioData;
    const nuevoEnvio = repo.create(datos as Envio);
    await repo.save(nuevoEnvio);
    return nuevoEnvio;
  } catch (error) {
    console.error('❌ Error al crear envío:', error);
    throw error;
  }
});

ipcMain.handle('update-envio', async (_, id, envioData, recalcular = true) => {
  try {
    const repo = connection!.getRepository(Envio);
    const envio = await repo.findOne({ where: { id } });
    if (!envio) throw new Error('Envío no encontrado');

    const estadoAnterior = envio.estado;
    const estadoNuevo = envioData.estado || estadoAnterior;
    const cambioRecepcion = estadoAnterior !== estadoNuevo;

    if (cambioRecepcion && estadoNuevo === 'recibido' && !envioData.fecha_recepcion) {
      envioData = { ...envioData, fecha_recepcion: new Date() };
    }

    // Un envío "recibido" sin unidades no rompe nada: `overheadPorUnidad` devuelve 0
    // cuando `unidades <= 0`, así que flete + aranceles + otros **desaparecen en
    // silencio** del costo FIFO y las ventas que consumieran ese envío saldrían con
    // ganancia inflada. Se corta en el paso a "recibido", que es el momento en que las
    // unidades empiezan a contar. No aplica al alta: `create-envio` guarda el envío
    // primero y las líneas van después (ver `handleCreateEnvio`).
    if (cambioRecepcion && estadoNuevo === 'recibido') {
      const lineas = await connection!
        .getRepository(ProductoEnvio)
        .find({ where: { envio: { id } } });
      const unidades = lineas.reduce((sum, pe) => sum + (Number(pe.cantidad) || 0), 0);
      if (unidades <= 0) {
        throw new Error(
          `No se puede marcar como recibido el envío #${id} sin productos: ` +
            `su flete y sus aranceles se reparten entre las unidades, y sin unidades ese ` +
            `costo se perdería. Agregá al menos una unidad antes de marcarlo como recibido.`
        );
      }
    }

    await repo.update(id, envioData);
    if (recalcular) await recalcularSinAbortar();

    return await repo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al actualizar envío:', error);
    throw error;
  }
});

// Recálculo explícito: los flujos por lotes (crear/editar un envío o una venta)
// desactivan el recálculo en cada línea (parámetro `recalcular = false`) y lo
// disparan UNA vez al final. Antes cada línea añadida reventaba un recálculo
// completo, y durante la creación el stock se veía rojo y negativo a medio guardar:
// el envío todavía estaba "pendiente", así que sus unidades no contaban como
// recibidas y salía 0 − vendidas.
ipcMain.handle('delete-envio', async (_, id) => {
  try {
    const repo = connection!.getRepository(Envio);
    const envio = await repo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
    if (!envio) return { ok: true };

    // ========== CHEQUEOS EN ORDEN, CON MENSAJE EN CLARO ==========
    // Se comprueba antes de borrar y en el mismo orden que usa `delete-inversor`, para
    // que el error diga qué hay que resolver en vez de dejar un 23503 de Postgres.

    // 1) Capital de socios asignado a este envío. `Inversion.envio` es RESTRICT, así que
    //    sin este chequeo el borrado revienta con un 23503 crudo; y si algún día pasara a
    //    CASCADE, el capital desaparecería del cuadre del socio sin que nada lo dijera.
    const inversiones = await connection!
      .getRepository(Inversion)
      .find({ where: { envio: { id } }, relations: ['inversor'] });
    if (inversiones.length > 0) {
      const socios = [...new Set(inversiones.map((i) => i.inversor?.nombre).filter(Boolean))];
      throw new Error(
        `No se puede eliminar el envío #${id}: tiene capital de socios asignado ` +
          `(${inversiones.length} inversión${inversiones.length === 1 ? '' : 'es'}${
            socios.length > 0 ? ` de ${socios.join(', ')}` : ''
          }). ` +
          `Primero liberá ese capital en Inversores (reinvertir o pagar al socio).`
      );
    }

    // 2) Reinversiones que apuntan a este envío (`MovimientoCapital.envio_destino`, también RESTRICT).
    const movimientosDestino = await connection!
      .getRepository(MovimientoCapital)
      .find({ where: { envio_destino: { id } }, relations: ['inversor'] });
    if (movimientosDestino.length > 0) {
      const socios = [...new Set(movimientosDestino.map((m) => m.inversor?.nombre).filter(Boolean))];
      throw new Error(
        `No se puede eliminar el envío #${id}: es el destino de ` +
          `${movimientosDestino.length} reinversión${movimientosDestino.length === 1 ? '' : 'es'}` +
          `${socios.length > 0 ? ` de ${socios.join(', ')}` : ''}. ` +
          `Reasigná o revertí esas reinversiones antes de borrar el envío.`
      );
    }

    // 3) Unidades YA VENDIDAS de este envío. Se le pregunta al motor FIFO que ya existe
    //    (`calcularRentabilidad().porEnvio`) en vez de contar ventas del producto: un mismo
    //    producto puede estar repartido en varios envíos, y contar todas sus ventas disparaba
    //    el aviso por ventas que consumieron otro envío distinto. `unidadesVendidas` solo suma
    //    las unidades que el FIFO consumió de ESTE envío.
    const { porEnvio } = await calcularRentabilidad(connection!);
    const info = porEnvio.find((e) => e.envioId === id);
    if (info && info.unidadesVendidas > 0) {
      throw new Error(
        `No se puede eliminar el envío #${id}: ya se vendieron ${info.unidadesVendidas} de sus ` +
          `${info.unidadesTotales} unidades ($${info.recuperado.toFixed(2)} recuperados). ` +
          `Borrarlo cambiaría el costo FIFO de esas ventas al precio de catálogo.`
      );
    }

    await connection!.transaction(async (manager) => {
      await manager.getRepository(Envio).delete(id);
      // El recálculo va DENTRO de la transacción: si el borrado quedara confirmado y el
      // recálculo muriera, el stock derivado y el costo FIFO quedarían desincronizados sin
      // que nada lo dijera. A diferencia de `recalcularSinAbortar` (que se usa cuando el
      // guardado ya está confirmado), aquí el error NO se traga: revierte el borrado entero.
      await recalcularTodo(manager as unknown as Connection);
    });

    registrarEnBitacora('delete-envio', `Envío #${id} eliminado (proveedor: ${s(envio.proveedor)})`);
    return { ok: true };
  } catch (error) {
    console.error('❌ Error al eliminar envío:', error instanceof Error ? error.message : error);
    throw error;
  }
});

ipcMain.handle('get-envio-by-id', async (_, id) => {
  try {
    const repo = connection!.getRepository(Envio);
    return await repo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al obtener envío por ID:', error);
    return null;
  }
});

// ========== HANDLERS DE PRODUCTOENVIO ==========
ipcMain.handle('get-productos-envio', async (_, envioId) => {
  try {
    const repo = connection!.getRepository(ProductoEnvio);
    return await repo.find({ where: { envio: { id: envioId } }, relations: ['producto'] });
  } catch (error) {
    console.error('❌ Error al obtener productos del envío:', error);
    return [];
  }
});

ipcMain.handle('add-producto-envio', async (_, envioId, productoId, cantidad, precioUnitario, recalcular = true) => {
  try {
    if (envioId === null || envioId === undefined || Number.isNaN(Number(envioId))) {
      throw new Error(
        `No se pudo asociar el producto al envío: el id del envío llegó vacío (valor recibido: ${JSON.stringify(
          envioId
        )}). Es un error interno, no de tus datos.`
      );
    }

    const repo = connection!.getRepository(ProductoEnvio);
    const envioRepo = connection!.getRepository(Envio);
    const productoRepo = connection!.getRepository(Producto);
    
    const envio = await envioRepo.findOne({ where: { id: envioId } });
    const producto = await productoRepo.findOne({ where: { id_prod: productoId } });

    if (!envio || !producto) {
      throw new Error(
        !envio
          ? `No existe el envío ${envioId}. Vuelve a la lista de envíos y ábrelo de nuevo.`
          : `No existe el producto ${productoId}.`
      );
    }

    if (envio.estado === 'recibido') {
      throw new Error('No se pueden agregar productos a un envío ya recibido. Devuélvelo a pendiente para editarlo.');
    }

    const nuevoProductoEnvio = repo.create({
      envio,
      producto,
      cantidad,
      precio_unitario: precioUnitario,
    } as ProductoEnvio);

    await repo.save(nuevoProductoEnvio);
    if (recalcular) await recalcularSinAbortar();
    return nuevoProductoEnvio;
  } catch (error) {
    console.error('❌ Error al agregar producto al envío:', error);
    throw error;
  }
});

ipcMain.handle('update-producto-envio', async (_, id: number, cantidad: number, precioUnitario: number, recalcular = true) => {
  try {
    const repo = connection!.getRepository(ProductoEnvio);
    const productoEnvio = await repo.findOne({ where: { id }, relations: ['envio'] });
    if (!productoEnvio) throw new Error('La línea de producto del envío no existe');

    productoEnvio.cantidad = Number(cantidad);
    productoEnvio.precio_unitario = Number(precioUnitario);
    await repo.save(productoEnvio);

    if (recalcular) await recalcularSinAbortar();
    return productoEnvio;
  } catch (error) {
    console.error('❌ Error al actualizar producto del envío:', error instanceof Error ? error.message : error);
    throw error;
  }
});

ipcMain.handle('remove-producto-envio', async (_, id, recalcular = true) => {
  try {
    const repo = connection!.getRepository(ProductoEnvio);
    const productoEnvio = await repo.findOne({ where: { id }, relations: ['envio'] });
    if (productoEnvio?.envio?.estado === 'recibido') {
      throw new Error('No se pueden quitar productos de un envío ya recibido. Devuélvelo a pendiente para editarlo.');
    }
    await repo.delete(id);
    if (recalcular) await recalcularSinAbortar();
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar producto del envío:', error);
    throw error;
  }
});

// ========== HANDLERS DE VENTA ==========
ipcMain.handle('get-ventas', async () => {
  try {
    const repo = connection!.getRepository(Venta);
    return await repo.find({ relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al obtener ventas:', error);
    return [];
  }
});

ipcMain.handle('create-venta', async (_, ventaData, recalcular = true) => {
  try {
    const repo = connection!.getRepository(Venta);
    const nuevaVenta = repo.create(ventaData as Venta);
    await repo.save(nuevaVenta);

    if (recalcular) await recalcularSinAbortar();

    return await repo.findOne({ where: { id: nuevaVenta.id }, relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al crear venta:', error);
    throw error;
  }
});

ipcMain.handle('update-venta', async (_, id, ventaData, recalcular = true) => {
  try {
    const repo = connection!.getRepository(Venta);
    await repo.update(id, ventaData);
    if (recalcular) await recalcularSinAbortar();
    return await repo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al actualizar venta:', error);
    throw error;
  }
});

ipcMain.handle('delete-venta', async (_, id) => {
  try {
    const repo = connection!.getRepository(Venta);
    // Leer las líneas antes de borrar (el delete cascada elimina ProductoVenta).
    const venta = await repo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
    await repo.delete(id);
    for (const pv of venta?.productos || []) {
      if (pv.producto) await ajustarStockProductoManual(pv.producto.id_prod, n(pv.cantidad));
    }
    await recalcularSinAbortar();
    registrarEnBitacora('delete-venta', `Venta #${id} eliminada`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar venta:', error);
    throw error;
  }
});

ipcMain.handle('get-venta-by-id', async (_, id) => {
  try {
    const repo = connection!.getRepository(Venta);
    return await repo.findOne({ where: { id }, relations: ['productos', 'productos.producto'] });
  } catch (error) {
    console.error('❌ Error al obtener venta por ID:', error);
    return null;
  }
});

// ========== HANDLERS DE PRODUCTOVENTA ==========
ipcMain.handle('get-productos-venta', async (_, ventaId) => {
  try {
    const repo = connection!.getRepository(ProductoVenta);
    return await repo.find({ where: { venta: { id: ventaId } }, relations: ['producto'] });
  } catch (error) {
    console.error('❌ Error al obtener productos de la venta:', error);
    return [];
  }
});

ipcMain.handle('add-producto-venta', async (_, ventaId, productoId, cantidad, precioUnitario, recalcular = true) => {
  try {
    const repo = connection!.getRepository(ProductoVenta);
    const ventaRepo = connection!.getRepository(Venta);
    const productoRepo = connection!.getRepository(Producto);

    const venta = await ventaRepo.findOne({ where: { id: ventaId } });
    const producto = await productoRepo.findOne({ where: { id_prod: productoId } });

    if (!venta || !producto) {
      throw new Error('Venta o Producto no encontrado');
    }

    const nuevoProductoVenta = repo.create({
      venta,
      producto,
      cantidad,
      precio_unitario: precioUnitario,
    } as ProductoVenta);

    await repo.save(nuevoProductoVenta);
    await ajustarStockProductoManual(productoId, -n(cantidad));
    if (recalcular) await recalcularSinAbortar();
    return nuevoProductoVenta;
  } catch (error) {
    console.error('❌ Error al agregar producto a la venta:', error);
    throw error;
  }
});

ipcMain.handle('remove-producto-venta', async (_, id, recalcular = true) => {
  try {
    const repo = connection!.getRepository(ProductoVenta);
    const linea = await repo.findOne({ where: { id }, relations: ['producto'] });
    await repo.delete(id);
    if (linea?.producto) await ajustarStockProductoManual(linea.producto.id_prod, n(linea.cantidad));
    if (recalcular) await recalcularSinAbortar();
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar producto de la venta:', error);
    throw error;
  }
});

// ========== HANDLERS DE RENTABILIDAD ==========
ipcMain.handle('get-rentabilidad', async () => {
  try {
    return await calcularRentabilidad(connection!);
  } catch (error) {
    console.error('❌ Error al obtener rentabilidad:', error);
    return null;
  }
});

ipcMain.handle('recalcular-rentabilidad', async () => {
  try {
    return await recalcularTodo(connection!);
  } catch (error) {
    console.error('❌ Error al recalcular rentabilidad:', error);
    throw error;
  }
});

ipcMain.handle('preview-costo-venta', async (_, lineas: LineaVentaSimulada[]) => {
  try {
    return await previewCostoVenta(connection!, lineas || []);
  } catch (error) {
    console.error('❌ Error al previsualizar costo de venta:', error);
    throw error;
  }
});

ipcMain.handle('precio-sugerido', async (_, margenObjetivoPct: number, tasaUsdCup: number) => {
  try {
    return await calcularPreciosSugeridos(
      connection!,
      Number(margenObjetivoPct) || 0,
      Number(tasaUsdCup) || 0
    );
  } catch (error) {
    console.error('❌ Error al calcular precios sugeridos:', error);
    return [];
  }
});

// ========== HANDLERS DE TRANSACCION ==========
ipcMain.handle('get-transacciones', async () => {
  try {
    const repo = connection!.getRepository(Transaccion);
    return await repo.find({ relations: ['cuenta_origen', 'cuenta_destino'] });
  } catch (error) {
    console.error('❌ Error al obtener transacciones:', error);
    return [];
  }
});

ipcMain.handle('create-transaccion', async (_, transaccionData) => {
  try {
    const repo = connection!.getRepository(Transaccion);
    const nuevaTransaccion = repo.create(transaccionData as Transaccion);
    await repo.save(nuevaTransaccion);
    return nuevaTransaccion;
  } catch (error) {
    console.error('❌ Error al crear transacción:', error);
    throw error;
  }
});

ipcMain.handle('update-transaccion', async (_, id, transaccionData) => {
  try {
    const repo = connection!.getRepository(Transaccion);
    await repo.update(id, transaccionData);
    return await repo.findOne({ where: { id_trans: id }, relations: ['cuenta_origen', 'cuenta_destino'] });
  } catch (error) {
    console.error('❌ Error al actualizar transacción:', error);
    throw error;
  }
});

ipcMain.handle('delete-transaccion', async (_, id) => {
  try {
    const repo = connection!.getRepository(Transaccion);
    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar transacción:', error);
    throw error;
  }
});

ipcMain.handle('get-transacciones-por-fecha', async (_, fecha) => {
  try {
    const repo = connection!.getRepository(Transaccion);
    const startDate = new Date(fecha);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(fecha);
    endDate.setHours(23, 59, 59, 999);
    return await repo.find({
      where: { fecha: Between(startDate, endDate) },
      relations: ['cuenta_origen', 'cuenta_destino']
    });
  } catch (error) {
    console.error('❌ Error al obtener transacciones por fecha:', error);
    return [];
  }
});

// ========== HANDLERS DE GASTOS ==========
ipcMain.handle('get-gastos', async () => {
  try {
    const repo = connection!.getRepository(Gasto);
    return await repo.find({ order: { fecha: 'DESC', id: 'DESC' } });
  } catch (error) {
    console.error('❌ Error al obtener gastos:', error);
    return [];
  }
});

ipcMain.handle('create-gasto', async (_, datos: Partial<Gasto>) => {
  try {
    const repo = connection!.getRepository(Gasto);
    const monto = Number(datos.monto) || 0;
    if (monto <= 0) throw new Error('El monto del gasto tiene que ser mayor que 0.');

    const importe = normalizarImporteGasto(datos.moneda || 'USD', monto, datos.tasa ?? 1);
    const nuevo = repo.create({
      fecha: datos.fecha || new Date().toISOString().slice(0, 10),
      categoria: String(datos.categoria || 'Otros').trim() || 'Otros',
      descripcion: String(datos.descripcion || '').trim(),
      envio_id: datos.envio_id ? Number(datos.envio_id) : null,
      ...importe,
    } as Gasto);
    await repo.save(nuevo);
    return nuevo;
  } catch (error) {
    console.error('❌ Error al crear gasto:', error);
    throw error;
  }
});

ipcMain.handle('update-gasto', async (_, id: number, datos: Partial<Gasto>) => {
  try {
    const repo = connection!.getRepository(Gasto);
    const actual = await repo.findOne({ where: { id } });
    if (!actual) throw new Error('El gasto que intentás editar ya no existe.');

    const monto = Number(datos.monto) || 0;
    if (monto <= 0) throw new Error('El monto del gasto tiene que ser mayor que 0.');

    const importe = normalizarImporteGasto(
      datos.moneda || actual.moneda,
      monto,
      datos.tasa ?? actual.tasa
    );
    await repo.update(id, {
      fecha: datos.fecha || actual.fecha,
      categoria: String(datos.categoria || actual.categoria).trim() || 'Otros',
      descripcion: String(datos.descripcion ?? actual.descripcion ?? '').trim(),
      envio_id: datos.envio_id ? Number(datos.envio_id) : null,
      ...importe,
    });
    return await repo.findOne({ where: { id } });
  } catch (error) {
    console.error('❌ Error al actualizar gasto:', error);
    throw error;
  }
});

ipcMain.handle('delete-gasto', async (_, id: number) => {
  try {
    const repo = connection!.getRepository(Gasto);
    const gasto = await repo.findOne({ where: { id } });
    if (!gasto) throw new Error('El gasto que intentás eliminar ya no existe.');

    await repo.delete(id);
    registrarEnBitacora(
      'delete-gasto',
      `Gasto #${id} eliminado (${gasto.categoria}, ${gasto.moneda} ${Number(gasto.monto).toFixed(2)}, ${gasto.fecha})`
    );
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar gasto:', error);
    throw error;
  }
});

// ========== HANDLERS DE PEERS (QvaPay) ==========
ipcMain.handle('get-peers', async () => {
  try {
    const repo = connection!.getRepository(Peer);
    return await repo.find({ order: { nombre: 'ASC' } });
  } catch (error) {
    console.error('❌ Error al obtener peers:', error);
    return [];
  }
});

ipcMain.handle('create-peer', async (_, peerData: Partial<Peer>) => {
  try {
    const repo = connection!.getRepository(Peer);
    const nuevoPeer = repo.create(peerData as Peer);
    return await repo.save(nuevoPeer);
  } catch (error) {
    console.error('❌ Error al crear peer:', error);
    throw error;
  }
});

ipcMain.handle('update-peer', async (_, id: number, peerData: Partial<Peer>) => {
  try {
    const repo = connection!.getRepository(Peer);
    await repo.update(id, peerData as Partial<Peer>);
    return await repo.findOne({ where: { id } });
  } catch (error) {
    console.error('❌ Error al actualizar peer:', error);
    throw error;
  }
});

ipcMain.handle('delete-peer', async (_, id: number) => {
  try {
    const repo = connection!.getRepository(Peer);
    const peer = await repo.findOne({ where: { id } });
    if (!peer) return true;

    const flujos = await connection!.getRepository(FlujoConversion).count({ where: { peer: { id } } });
    if (flujos > 0) {
      throw new Error(
        `«${peer.nombre}» está en uso: aparece en ${flujos} ${
          flujos === 1 ? 'flujo de conversión' : 'flujos de conversión'
        }. ${flujos === 1 ? 'Elimínalo' : 'Elimínalos'} primero para poder borrarlo.`
      );
    }

    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar peer:', error instanceof Error ? error.message : error);
    throw error;
  }
});

// ========== HANDLERS DE FLUJOS DE CONVERSIÓN ==========
ipcMain.handle('get-flujos-conversion', async () => {
  try {
    const repo = connection!.getRepository(FlujoConversion);
    return await repo.find({ relations: ['peer'], order: { fecha: 'DESC' } });
  } catch (error) {
    console.error('❌ Error al obtener flujos de conversión:', error);
    return [];
  }
});

ipcMain.handle('create-flujo-conversion', async (_, flujoData: Partial<FlujoConversion>) => {
  try {
    const repo = connection!.getRepository(FlujoConversion);
    const nuevoFlujo = repo.create(flujoData as FlujoConversion);
    return await repo.save(nuevoFlujo);
  } catch (error) {
    console.error('❌ Error al crear flujo de conversión:', error);
    throw error;
  }
});

ipcMain.handle('update-flujo-conversion', async (_, id: number, flujoData: Partial<FlujoConversion>) => {
  try {
    const repo = connection!.getRepository(FlujoConversion);
    await repo.update(id, flujoData as Partial<FlujoConversion>);
    return await repo.findOne({ where: { id }, relations: ['peer'] });
  } catch (error) {
    console.error('❌ Error al actualizar flujo de conversión:', error);
    throw error;
  }
});

ipcMain.handle('delete-flujo-conversion', async (_, id: number) => {
  try {
    const repo = connection!.getRepository(FlujoConversion);
    await repo.delete(id);
    registrarEnBitacora('delete-flujo-conversion', `Flujo de conversión #${id} eliminado`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar flujo de conversión:', error);
    throw error;
  }
});

// ========== HANDLERS DE TASAS DE CAMBIO ==========
ipcMain.handle('get-tasa-actual', async (_, codigo_moneda: string) => {
  try {
    return await getTasaActual(codigo_moneda);
  } catch (error) {
    console.error('❌ Error al obtener tasa actual:', error);
    return 0;
  }
});

ipcMain.handle('get-tasa-por-fecha', async (_, fecha: string, codigo_moneda: string) => {
  try {
    return await getTasaPorFecha(fecha, codigo_moneda);
  } catch (error) {
    console.error('❌ Error al obtener tasa por fecha:', error);
    return 0;
  }
});

ipcMain.handle('get-tasas-historicas', async () => {
  try {
    return await getTasasHistoricas();
  } catch (error) {
    console.error('❌ Error al obtener histórico de tasas:', error);
    return [];
  }
});

ipcMain.handle('agregar-tasa-manual', async (_, tasa: TasaCambioManual) => {
  try {
    await agregarTasaManual(tasa);
    return true;
  } catch (error) {
    console.error('❌ Error al agregar tasa manual:', error);
    throw error;
  }
});

ipcMain.handle('importar-tasas-excel', async () => {
  try {
    const resultado = await dialog.showOpenDialog({
      title: 'Selecciona el archivo Excel de tasas',
      properties: ['openFile'],
      filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    });
    if (resultado.canceled || resultado.filePaths.length === 0) {
      return { importado: false };
    }
    const rutaExcel = resultado.filePaths[0];
    if (!/\.(xlsx|xls)$/i.test(rutaExcel)) {
      throw new Error('Solo se permiten archivos Excel (.xlsx o .xls).');
    }
    await importarTasasDesdeExcel(rutaExcel);
    return { importado: true };
  } catch (error) {
    console.error('❌ Error al importar tasas desde Excel:', error);
    throw error;
  }
});

// ========== HANDLERS DE INVERSORES (Fase 4.8) ==========
ipcMain.handle('get-inversores', async () => {
  try {
    const repo = connection!.getRepository(Inversor);
    return await repo.find({ order: { nombre: 'ASC' } });
  } catch (error) {
    console.error('❌ Error al obtener inversores:', error);
    throw error;
  }
});

// El resumen se arma desde la BD: el 1% devengado ya quedo escrito en
// Inversion.comision_devengada por la pasada FIFO, asi que el 1% que muestra la tabla es
// exactamente el mismo que descuenta la ganancia neta, sin depender del orden de las
// llamadas. Aun asi se recalcula antes, para que el resumen nunca salga viejo.
ipcMain.handle('get-resumen-inversores', async () => {
  try {
    await recalcularTodo(connection!);
    return await calcularResumenInversores(connection!);
  } catch (error) {
    console.error('❌ Error al obtener el resumen de inversores:', error);
    throw error;
  }
});

ipcMain.handle('get-inversiones', async () => {
  try {
    const repo = connection!.getRepository(Inversion);
    return await repo.find({
      relations: ['inversor', 'producto', 'envio'],
      order: { fecha: 'DESC', id: 'DESC' },
    });
  } catch (error) {
    console.error('❌ Error al obtener inversiones:', error);
    throw error;
  }
});

ipcMain.handle('get-aportes', async () => {
  try {
    const repo = connection!.getRepository(Aporte);
    return await repo.find({ relations: ['inversor'], order: { fecha: 'DESC', id: 'DESC' } });
  } catch (error) {
    console.error('❌ Error al obtener aportes:', error);
    throw error;
  }
});

ipcMain.handle('get-movimientos-capital', async () => {
  try {
    const repo = connection!.getRepository(MovimientoCapital);
    return await repo.find({
      relations: ['inversor', 'envio_destino'],
      order: { fecha: 'DESC', id: 'DESC' },
    });
  } catch (error) {
    console.error('❌ Error al obtener movimientos de capital:', error);
    throw error;
  }
});

ipcMain.handle('create-inversor', async (_, datos: DatosInversor) => {
  try {
    return await crearInversor(connection!, datos);
  } catch (error) {
    console.error('? Error al crear inversor:', error);
    throw error;
  }
});

ipcMain.handle('update-inversor', async (_, args: { id: number; datos: { activo?: boolean; notas?: string } }) => {
  try {
    return await actualizarInversor(connection!, Number(args.id), args.datos || {});
  } catch (error) {
    console.error('? Error al actualizar inversor:', error);
    throw error;
  }
});


ipcMain.handle('create-aporte', async (_, datos: DatosAporte) => {
  try {
    // No hace falta recalcular: un aporte no toca envios, ventas ni stock, y el 1%
    // depende de las ventas, no del capital aportado. Solo se guardan la Inversion y
    // la Transaccion.
    return await registrarAporte(connection!, datos);
  } catch (error) {
    console.error('❌ Error al registrar aporte:', error);
    throw error;
  }
});

ipcMain.handle('create-inversion', async (_, datos: DatosInversion) => {
  try {
    await registrarInversion(connection!, datos);
    return await recalcularSinAbortar();
  } catch (error) {
    console.error('❌ Error al registrar inversión:', error);
    throw error;
  }
});

ipcMain.handle('create-movimiento-capital', async (_, datos: DatosMovimiento) => {
  try {
    await registrarMovimiento(connection!, datos);
    // Un reinversion escribe monto_liberado, que es campo de la pasada FIFO: hay que
    // recalcular o el resumen mostraria el capital todavia disponible.
    return await recalcularSinAbortar();
  } catch (error) {
    console.error('❌ Error al registrar movimiento de capital:', error);
    throw error;
  }
});

// Cobro del 1% devengado. NO recalcula: el devengo ya esta escrito en la BD por la
// pasada FIFO y un cobro no toca envios, ventas ni stock. Ademas recalcular aqui seria
// inofensivo pero inutil, y el unico efecto de pasarlo seria volver a correr el FIFO
// para reescribir un numero que ya esta bien.
ipcMain.handle('create-cobro-comision', async (_, datos: DatosCobroComision) => {
  try {
    return await registrarCobroComision(connection!, datos);
  } catch (error) {
    console.error('❌ Error al registrar cobro de comisión:', error);
    throw error;
  }
});

// El capital de un socio solo puede desaparecer si se borra una venta o un envio que
// lo financiaba. En vez de dejar el cuadre roto en silencio, se avisa y se bloquea.
ipcMain.handle('delete-inversion', async (_, id: number) => {
  try {
    const repo = connection!.getRepository(Inversion);
    const inversion = await repo.findOne({ where: { id } });
    if (!inversion) return true;
    if (n(inversion.unidades_liberadas) > 0) {
      throw new Error(
        `Esta inversión ya tiene ${n(inversion.unidades_liberadas)} unidades liberadas (vendidas). ` +
          `Primero registra el reinversión o el retiro de ese capital, y solo después se puede borrar.`
      );
    }
    await repo.delete(id);
    registrarEnBitacora('delete-inversion', `Inversión #${id} eliminada`);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar inversión:', error);
    throw error;
  }
});

ipcMain.handle('delete-inversor', async (_, id: number) => {
  try {
    const repo = connection!.getRepository(Inversor);
    const nombre = s((await repo.findOne({ where: { id } }))?.nombre);
    if (!nombre) throw new Error('Socio no encontrado');

    const nombreCuenta = `Socio ${nombre} - por pagar`;

    // No se borra un socio con historia economica. Aporte y MovimientoCapital estan en
    // CASCADE, asi que se irian en silencio y dejarian el capital del socio
    // desaparece del cuadre sin avisar; ademas sus Transacciones apuntan a la cuenta del
    // socio y Transaccion no tiene ON DELETE, asi que borrar la cuenta revienta con
    // 23503 y, como el Inversor ya se habria borrado, dejaba la cuenta huerfana.
    // Se bloquea con un mensaje claro y que el usuario borre el movimiento de caja.
    const inversiones = await connection!
      .getRepository(Inversion)
      .createQueryBuilder('i')
      .where('i.inversor = :id', { id })
      .getCount();
    if (inversiones > 0) {
      throw new Error(
        `Este socio tiene ${inversiones} inversión(es) de capital registradas. Quítaselas antes de borrarlo.`
      );
    }

    const aportes = await connection!
      .getRepository(Aporte)
      .createQueryBuilder('a')
      .where('a.inversor = :id', { id })
      .getCount();
    const movimientos = await connection!
      .getRepository(MovimientoCapital)
      .createQueryBuilder('m')
      .where('m.inversor = :id', { id })
      .getCount();
    if (aportes > 0 || movimientos > 0) {
      throw new Error(
        `Este socio tiene ${aportes} aporte(s) y ${movimientos} movimiento(s) de capital, ` +
          `y cada uno generó una transacción de caja. Borra esas transacciones desde la ` +
          `pestaña Transacciones antes de borrarlo, o márcalo como inactivo.`
      );
    }

    const transaccionesDeSuCuenta = await connection!
      .getRepository(Transaccion)
      .createQueryBuilder('t')
      .leftJoin('t.cuenta_origen', 'co')
      .leftJoin('t.cuenta_destino', 'cd')
      .where('co.nombre = :n', { n: nombreCuenta })
      .orWhere('cd.nombre = :n', { n: nombreCuenta })
      .getCount();
    if (transaccionesDeSuCuenta > 0) {
      throw new Error(
        `Su cuenta "${nombreCuenta}" aparece en ${transaccionesDeSuCuenta} transacción(es) de caja. ` +
          `Bórralas desde la pestaña Transacciones antes de borrar al socio.`
      );
    }

await repo.delete(id);
    await connection!.query(`DELETE FROM "Cuenta" WHERE nombre = $1`, [nombreCuenta]);
    registrarEnBitacora('delete-inversor', `Socio "${nombre}" eliminado junto con su cuenta "${nombreCuenta}"`);
    return true;
  } catch (error) {
    console.error('? Error al eliminar inversor:', error);
    throw error;
  }
});

// ========== RESPALDO COMPLETO (Fase 9.2 - Seguridad) ==========
// Exporta todas las tablas a un único JSON. Es el *respaldo* de la app: los datos viven
// solo en Supabase y el CSV de reporte es un resumen, no un respaldo. Fuera de esto no hay
// punto único de falla: si la nube se pierde (o un borrado equivocado), esto es lo que queda.
const ENTIDADES_RESPALDO: Array<{ nombre: string; entidad: any }> = [
  { nombre: 'Producto', entidad: Producto },
  { nombre: 'Moneda', entidad: Moneda },
  { nombre: 'Cuenta', entidad: Cuenta },
  { nombre: 'Envio', entidad: Envio },
  { nombre: 'ProductoEnvio', entidad: ProductoEnvio },
  { nombre: 'Transaccion', entidad: Transaccion },
  { nombre: 'TasaCambioHistorico', entidad: TasaCambioHistorico },
  { nombre: 'Peer', entidad: Peer },
  { nombre: 'FlujoConversion', entidad: FlujoConversion },
  { nombre: 'Venta', entidad: Venta },
  { nombre: 'ProductoVenta', entidad: ProductoVenta },
  { nombre: 'Inversor', entidad: Inversor },
  { nombre: 'Aporte', entidad: Aporte },
  { nombre: 'Inversion', entidad: Inversion },
  { nombre: 'MovimientoCapital', entidad: MovimientoCapital },
  { nombre: 'Gasto', entidad: Gasto },
];

ipcMain.handle('exportar-respaldo', async () => {
  try {
    const ahora = new Date();
    const s2 = (n: number) => String(n).padStart(2, '0');
    const nombre = `respaldo-mi-app-ventas_${ahora.getFullYear()}-${s2(ahora.getMonth() + 1)}-${s2(ahora.getDate())}_${s2(ahora.getHours())}${s2(ahora.getMinutes())}.json`;
    const resultado = await dialog.showSaveDialog({
      title: 'Guardar respaldo completo (JSON)',
      defaultPath: path.join(app.getPath('documents'), nombre),
      filters: [{ name: 'Respaldo JSON', extensions: ['json'] }],
    });
    if (resultado.canceled || !resultado.filePath) {
      return { ok: false, cancelado: true };
    }
    const tablas: Record<string, unknown[]> = {};
    for (const { nombre: n, entidad } of ENTIDADES_RESPALDO) {
      tablas[n] = await connection!.getRepository(entidad).find();
    }
    const respaldo = {
      app: 'mi-app-ventas',
      version: '1.0.0',
      generado: ahora.toISOString(),
      tablas,
    };
    await fs.promises.writeFile(resultado.filePath, JSON.stringify(respaldo, null, 2), 'utf-8');
    console.log('✅ Respaldo completo exportado a', resultado.filePath);
    return { ok: true, ruta: resultado.filePath };
  } catch (error) {
    console.error('❌ Error al exportar el respaldo:', error);
    throw error;
  }
});

async function createWindow() {
  await initDatabase();

  if (!connection) {
    console.error('❌ No se registraron handlers: conexión fallida');
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Sin throttling de fondo: si la ventana arranca oculta/ocluída (p. ej. detrás de la
      // consola), Chromium estrangula rAF/MessageChannel y los renders diferidos no avanzan.
      // La pantalla negra real era el ToastProvider (ver index.tsx); esto es defensa extra.
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:5173');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Seguridad (Fase 9.3): la app nunca abre ventanas ni navega fuera de su propio origen.
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const origenApp = 'http://localhost:5173/';
  mainWindow.webContents.on('will-navigate', (evento, url) => {
    if (!url.startsWith(origenApp)) {
      evento.preventDefault();
    }
  });
}

app.whenReady().then(async () => {
  try {
    await session.defaultSession.setProxy({ proxyRules: 'direct://' });
  } catch {
    console.warn('⚠️ No se pudo forzar proxy directo; se usará la configuración del sistema.');
  }

  // Content-Security-Policy (Fase 9.3). Esta app SIEMPRE sirve su UI desde el dev server
  // de Vite (http://localhost:5173, ver loadURL arriba), y Vite inyecta un snippet inline
  // (react-refresh) en el index.html servido: si script-src no lleva 'unsafe-inline', el
  // plugin react lanza "@vitejs/plugin-react can't detect preamble" en el primer componente
  // y la app queda en pantalla negra sin más. Así que la rama estricta ('self' a secas)
  // SOLO se aplica cuando el lanzador pide producción EXPLÍCITAMENTE (NODE_ENV=production,
  // p. ej. al empaquetar); cualquier otro modo (dev, npm start, VS Code sin NODE_ENV) sirve
  // la página de Vite y necesita el unsafe-inline del preamble.
  const esDev = process.env.NODE_ENV !== 'production';
  session.defaultSession.webRequest.onHeadersReceived((_detalles, callback) => {
    callback({
      responseHeaders: {
        ..._detalles.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
            `script-src 'self'${esDev ? " 'unsafe-inline'" : ''}; ` +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' http://localhost:* ws://localhost:*; " +
            "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
        ],
      },
    });
  });

  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopDbBridge();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});