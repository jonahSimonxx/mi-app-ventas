import { Producto } from '../shared/entities/Producto';
import { Moneda } from '../shared/entities/Moneda';
import { Cuenta } from '../shared/entities/Cuenta';
import { Envio } from '../shared/entities/Envio';
import { ProductoEnvio } from '../shared/entities/ProductoEnvio';
import { Transaccion } from '../shared/entities/Transaccion';
import { TasaCambioHistorico } from '../shared/entities/TasaCambioHistorico';

export interface TasaCambioManual {
  fecha: string;
  usd_to_cup: number;
  eur_to_cup?: number;
  gbp_to_cup?: number;
  fuente?: string;
}

export interface ElectronAPI {
  getProductos: () => Promise<Producto[]>;
  createProducto: (producto: Partial<Producto>) => Promise<Producto>;
  updateProducto: (id: string, producto: Partial<Producto>) => Promise<Producto | null>;
  deleteProducto: (id: string) => Promise<boolean>;

  getMonedas: () => Promise<Moneda[]>;
  createMoneda: (moneda: Partial<Moneda>) => Promise<Moneda>;
  updateMoneda: (codigo: string, moneda: Partial<Moneda>) => Promise<Moneda | null>;
  deleteMoneda: (codigo: string) => Promise<boolean>;

  getCuentas: () => Promise<Cuenta[]>;
  createCuenta: (cuenta: Partial<Cuenta>) => Promise<Cuenta>;
  updateCuenta: (id: string, cuenta: Partial<Cuenta>) => Promise<Cuenta | null>;
  deleteCuenta: (id: string) => Promise<boolean>;

  // Handlers de Envio
  getEnvios: () => Promise<Envio[]>;
  createEnvio: (envio: Partial<Envio>) => Promise<Envio>;
  updateEnvio: (id: number, envio: Partial<Envio>) => Promise<Envio | null>;
  deleteEnvio: (id: number) => Promise<boolean>;
  getEnvioById: (id: number) => Promise<Envio | null>;

  // Handlers de ProductoEnvio
  getProductosEnvio: (envioId: number) => Promise<ProductoEnvio[]>;
  addProductoEnvio: (envioId: number, productoId: string, cantidad: number, precioUnitario: number) => Promise<ProductoEnvio>;
  removeProductoEnvio: (id: number) => Promise<boolean>;

  // Handlers de Transaccion
  getTransacciones: () => Promise<Transaccion[]>;
  createTransaccion: (transaccion: Partial<Transaccion>) => Promise<Transaccion>;
  updateTransaccion: (id: number, transaccion: Partial<Transaccion>) => Promise<Transaccion | null>;
  deleteTransaccion: (id: number) => Promise<boolean>;
  getTransaccionesPorFecha: (fecha: string) => Promise<Transaccion[]>;
  getTransaccionesPorTipo: (tipo: string) => Promise<Transaccion[]>;

  getTasaActual: (codigo: string) => Promise<number>;
  getTasaPorFecha: (fecha: string, codigo: string) => Promise<number>;
  getTasasHistoricas: () => Promise<TasaCambioHistorico[]>;
  agregarTasaManual: (tasa: TasaCambioManual) => Promise<boolean>;
  importarTasasExcel: () => Promise<{ importado: boolean }>;
}



declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}