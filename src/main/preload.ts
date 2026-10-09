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
  updateEnvio: (id: number, envio: any, recalcular = true) => ipcRenderer.invoke('update-envio', id, envio, recalcular),
  deleteEnvio: (id: number) => ipcRenderer.invoke('delete-envio', id),
  getEnvioById: (id: number) => ipcRenderer.invoke('get-envio-by-id', id),

  // Handlers de ProductoEnvio
  getProductosEnvio: (envioId: number) => ipcRenderer.invoke('get-productos-envio', envioId),
  addProductoEnvio: (envioId: number, productoId: string, cantidad: number, precioUnitario: number, recalcular = true) => ipcRenderer.invoke('add-producto-envio', envioId, productoId, cantidad, precioUnitario, recalcular),
  updateProductoEnvio: (id: number, cantidad: number, precioUnitario: number, recalcular = true) => ipcRenderer.invoke('update-producto-envio', id, cantidad, precioUnitario, recalcular),
  removeProductoEnvio: (id: number, recalcular = true) => ipcRenderer.invoke('remove-producto-envio', id, recalcular),

  // Handlers de Venta
  getVentas: () => ipcRenderer.invoke('get-ventas'),
  createVenta: (venta: any, recalcular = true) => ipcRenderer.invoke('create-venta', venta, recalcular),
  updateVenta: (id: number, venta: any, recalcular = true) => ipcRenderer.invoke('update-venta', id, venta, recalcular),
  deleteVenta: (id: number) => ipcRenderer.invoke('delete-venta', id),
  getVentaById: (id: number) => ipcRenderer.invoke('get-venta-by-id', id),

  // Handlers de Inversores (Fase 4.8)
  getInversores: () => ipcRenderer.invoke('get-inversores'),
  getResumenInversores: () => ipcRenderer.invoke('get-resumen-inversores'),
  getInversiones: () => ipcRenderer.invoke('get-inversiones'),
  getAportes: () => ipcRenderer.invoke('get-aportes'),
  getMovimientosCapital: () => ipcRenderer.invoke('get-movimientos-capital'),
  createInversor: (datos: any) => ipcRenderer.invoke('create-inversor', datos),
  updateInversor: (id: number, datos: any) => ipcRenderer.invoke('update-inversor', { id, datos }),
  createAporte: (datos: any) => ipcRenderer.invoke('create-aporte', datos),
  createInversion: (datos: any) => ipcRenderer.invoke('create-inversion', datos),
  createMovimientoCapital: (datos: any) => ipcRenderer.invoke('create-movimiento-capital', datos),
  createCobroComision: (datos: any) => ipcRenderer.invoke('create-cobro-comision', datos),
  deleteInversion: (id: number) => ipcRenderer.invoke('delete-inversion', id),
  deleteInversor: (id: number) => ipcRenderer.invoke('delete-inversor', id),

  // Handlers de ProductoVenta
  getProductosVenta: (ventaId: number) => ipcRenderer.invoke('get-productos-venta', ventaId),
  addProductoVenta: (ventaId: number, productoId: string, cantidad: number, precioUnitario: number, recalcular = true) => ipcRenderer.invoke('add-producto-venta', ventaId, productoId, cantidad, precioUnitario, recalcular),
  removeProductoVenta: (id: number, recalcular = true) => ipcRenderer.invoke('remove-producto-venta', id, recalcular),

  // Handlers de Rentabilidad
  getRentabilidad: () => ipcRenderer.invoke('get-rentabilidad'),
  recalcularRentabilidad: () => ipcRenderer.invoke('recalcular-rentabilidad'),
  previewCostoVenta: (lineas: any[]) => ipcRenderer.invoke('preview-costo-venta', lineas),
  precioSugerido: (margenObjetivoPct: number, tasaUsdCup: number) => ipcRenderer.invoke('precio-sugerido', margenObjetivoPct, tasaUsdCup),

  // Handlers de Transaccion
  getTransacciones: () => ipcRenderer.invoke('get-transacciones'),
  createTransaccion: (transaccion: any) => ipcRenderer.invoke('create-transaccion', transaccion),
  updateTransaccion: (id: number, transaccion: any) => ipcRenderer.invoke('update-transaccion', id, transaccion),
  deleteTransaccion: (id: number) => ipcRenderer.invoke('delete-transaccion', id),
  getTransaccionesPorFecha: (fecha: string) => ipcRenderer.invoke('get-transacciones-por-fecha', fecha),

  // Handlers de Peers QvaPay
  getPeers: () => ipcRenderer.invoke('get-peers'),
  createPeer: (peer: any) => ipcRenderer.invoke('create-peer', peer),
  updatePeer: (id: number, peer: any) => ipcRenderer.invoke('update-peer', id, peer),
  deletePeer: (id: number) => ipcRenderer.invoke('delete-peer', id),

  // Handlers de Flujos de Conversión
  getFlujosConversion: () => ipcRenderer.invoke('get-flujos-conversion'),
  createFlujoConversion: (flujo: any) => ipcRenderer.invoke('create-flujo-conversion', flujo),
  updateFlujoConversion: (id: number, flujo: any) => ipcRenderer.invoke('update-flujo-conversion', id, flujo),
  deleteFlujoConversion: (id: number) => ipcRenderer.invoke('delete-flujo-conversion', id),

  getTasaActual: (codigo: string) => ipcRenderer.invoke('get-tasa-actual', codigo),
  getTasaPorFecha: (fecha: string, codigo: string) => ipcRenderer.invoke('get-tasa-por-fecha', fecha, codigo),
  getTasasHistoricas: () => ipcRenderer.invoke('get-tasas-historicas'),
  agregarTasaManual: (tasa: any) => ipcRenderer.invoke('agregar-tasa-manual', tasa),
  importarTasasExcel: () => ipcRenderer.invoke('importar-tasas-excel'),

  // Respaldo completo (Fase 9.2 - Seguridad)
  exportarRespaldo: () => ipcRenderer.invoke('exportar-respaldo'),
});