import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import { startDbBridge, stopDbBridge } from './dbBridge';

// Fuerza conexión directa sin proxy del sistema (Psiphon/VPN no debe interferir).
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('no-sandbox');

// Carga las variables de entorno desde .env (credenciales de BD, etc.).
try {
  require('dotenv').config();
} catch {
  console.warn('⚠️ dotenv no está instalado; se usarán los valores por defecto. Ejecuta "npm install".');
}

import { createConnection, Connection, getConnection } from 'typeorm';
import { Producto } from '../shared/entities/Producto';
import { Moneda } from '../shared/entities/Moneda';
import { Cuenta } from '../shared/entities/Cuenta';
import { Envio } from '../shared/entities/Envio';
import { ProductoEnvio } from '../shared/entities/ProductoEnvio';
import { Transaccion } from '../shared/entities/Transaccion';
import { TasaCambioHistorico } from '../shared/entities/TasaCambioHistorico';
import {
  getTasaActual,
  getTasaPorFecha,
  getTasasHistoricas,
  agregarTasaManual,
  importarTasasDesdeExcel,
  TasaCambioManual,
} from './services/tasaCambioService';

let mainWindow: BrowserWindow | null = null;
let connection: Connection | null = null;

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
      entities: [Producto, Moneda, Cuenta, Envio, ProductoEnvio, Transaccion, TasaCambioHistorico],
      synchronize: true,
      ssl: false,
      logging: true,
    });
    console.log('✅ Base de datos conectada vía bridge local (puerto ' + bridgePort + ')');
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
    const nuevoProducto = repo.create(producto as Producto);
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
    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
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
    return await repo.find();
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
    const nuevoEnvio = repo.create(envioData as Envio);
    await repo.save(nuevoEnvio);
    return nuevoEnvio;
  } catch (error) {
    console.error('❌ Error al crear envío:', error);
    throw error;
  }
});

ipcMain.handle('update-envio', async (_, id, envioData) => {
  try {
    const repo = connection!.getRepository(Envio);
    await repo.update(id, envioData);
    return await repo.findOne({ where: { id }, relations: ['productos'] });
  } catch (error) {
    console.error('❌ Error al actualizar envío:', error);
    throw error;
  }
});

ipcMain.handle('delete-envio', async (_, id) => {
  try {
    const repo = connection!.getRepository(Envio);
    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar envío:', error);
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

ipcMain.handle('add-producto-envio', async (_, envioId, productoId, cantidad, precioUnitario) => {
  try {
    const repo = connection!.getRepository(ProductoEnvio);
    const envioRepo = connection!.getRepository(Envio);
    const productoRepo = connection!.getRepository(Producto);
    
    const envio = await envioRepo.findOne({ where: { id: envioId } });
    const producto = await productoRepo.findOne({ where: { id_prod: productoId } });
    
    if (!envio || !producto) {
      throw new Error('Envio o Producto no encontrado');
    }
    
    const nuevoProductoEnvio = repo.create({
      envio,
      producto,
      cantidad,
      precio_unitario: precioUnitario,
    } as ProductoEnvio);
    
    await repo.save(nuevoProductoEnvio);
    return nuevoProductoEnvio;
  } catch (error) {
    console.error('❌ Error al agregar producto al envío:', error);
    throw error;
  }
});

ipcMain.handle('remove-producto-envio', async (_, id) => {
  try {
    const repo = connection!.getRepository(ProductoEnvio);
    await repo.delete(id);
    return true;
  } catch (error) {
    console.error('❌ Error al eliminar producto del envío:', error);
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
    await importarTasasDesdeExcel(resultado.filePaths[0]);
    return { importado: true };
  } catch (error) {
    console.error('❌ Error al importar tasas desde Excel:', error);
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
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('http://localhost:5173');

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(async () => {
  try {
    await session.defaultSession.setProxy({ proxyRules: 'direct://' });
  } catch {
    console.warn('⚠️ No se pudo forzar proxy directo; se usará la configuración del sistema.');
  }
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