import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getProductos: () => ipcRenderer.invoke('get-productos'),
  createProducto: (producto: any) => ipcRenderer.invoke('create-producto', producto),
  updateProducto: (id: string, producto: any) => ipcRenderer.invoke('update-producto', id, producto),
  deleteProducto: (id: string) => ipcRenderer.invoke('delete-producto', id),

  getMonedas: () => ipcRenderer.invoke('get-monedas'),
  createMoneda: (moneda: any) => ipcRenderer.invoke('create-moneda', moneda),
  updateMoneda: (codigo: string, moneda: any) => ipcRenderer.invoke('update-moneda', codigo, moneda),
  deleteMoneda: (codigo: string) => ipcRenderer.invoke('delete-moneda', codigo),

  getCuentas: () => ipcRenderer.invoke('get-cuentas'),
  createCuenta: (cuenta: any) => ipcRenderer.invoke('create-cuenta', cuenta),
  updateCuenta: (id: string, cuenta: any) => ipcRenderer.invoke('update-cuenta', id, cuenta),
  deleteCuenta: (id: string) => ipcRenderer.invoke('delete-cuenta', id),

  // Handlers de Envio
  getEnvios: () => ipcRenderer.invoke('get-envios'),
  createEnvio: (envio: any) => ipcRenderer.invoke('create-envio', envio),
  updateEnvio: (id: number, envio: any) => ipcRenderer.invoke('update-envio', id, envio),
  deleteEnvio: (id: number) => ipcRenderer.invoke('delete-envio', id),
  getEnvioById: (id: number) => ipcRenderer.invoke('get-envio-by-id', id),

  // Handlers de ProductoEnvio
  getProductosEnvio: (envioId: number) => ipcRenderer.invoke('get-productos-envio', envioId),
  addProductoEnvio: (envioId: number, productoId: string, cantidad: number, precioUnitario: number) => ipcRenderer.invoke('add-producto-envio', envioId, productoId, cantidad, precioUnitario),
  removeProductoEnvio: (id: number) => ipcRenderer.invoke('remove-producto-envio', id),

  getTasaActual: (codigo: string) => ipcRenderer.invoke('get-tasa-actual', codigo),
  getTasaPorFecha: (fecha: string, codigo: string) => ipcRenderer.invoke('get-tasa-por-fecha', fecha, codigo),
  getTasasHistoricas: () => ipcRenderer.invoke('get-tasas-historicas'),
  agregarTasaManual: (tasa: any) => ipcRenderer.invoke('agregar-tasa-manual', tasa),
  importarTasasExcel: () => ipcRenderer.invoke('importar-tasas-excel'),
});