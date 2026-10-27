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
import {
  ResumenInversor,
  DatosInversor,
  DatosAporte,
  DatosInversion,
  DatosMovimiento,
  DatosCobroComision,
  ResultadoCobroComision,
} from '../main/services/inversoresService';
import {
  RentabilidadEnvio,
  ResumenRentabilidad,
  SugerenciaPrecio,
  PreviewCostoVenta,
  LineaVentaSimulada,
} from '../main/services/rentabilidadService';

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
  updateEnvio: (id: number, envio: Partial<Envio>, recalcular?: boolean) => Promise<Envio | null>;
  deleteEnvio: (id: number) => Promise<{ ok: boolean }>;
  getEnvioById: (id: number) => Promise<Envio | null>;

  // Handlers de ProductoEnvio
  getProductosEnvio: (envioId: number) => Promise<ProductoEnvio[]>;
  addProductoEnvio: (envioId: number, productoId: string, cantidad: number, precioUnitario: number, recalcular?: boolean) => Promise<ProductoEnvio>;
  updateProductoEnvio: (id: number, cantidad: number, precioUnitario: number, recalcular?: boolean) => Promise<ProductoEnvio>;
  removeProductoEnvio: (id: number, recalcular?: boolean) => Promise<boolean>;

  // Handlers de Inversores (Fase 4.8)
  getInversores: () => Promise<Inversor[]>;
  getResumenInversores: () => Promise<ResumenInversor[]>;
  getInversiones: () => Promise<Inversion[]>;
  getAportes: () => Promise<Aporte[]>;
  getMovimientosCapital: () => Promise<MovimientoCapital[]>;
  createInversor: (datos: DatosInversor) => Promise<Inversor>;
  updateInversor: (id: number, datos: { activo?: boolean; notas?: string }) => Promise<Inversor>;
  createAporte: (datos: DatosAporte) => Promise<Aporte>;
  createInversion: (datos: DatosInversion) => Promise<void>;
  createMovimientoCapital: (datos: DatosMovimiento) => Promise<void>;
  createCobroComision: (datos: DatosCobroComision) => Promise<ResultadoCobroComision>;
  deleteInversion: (id: number) => Promise<boolean>;
  deleteInversor: (id: number) => Promise<boolean>;

  // Handlers de Venta
  getVentas: () => Promise<Venta[]>;
  createVenta: (venta: Partial<Venta>, recalcular?: boolean) => Promise<Venta>;
  updateVenta: (id: number, venta: Partial<Venta>, recalcular?: boolean) => Promise<Venta | null>;
  deleteVenta: (id: number) => Promise<boolean>;
  getVentaById: (id: number) => Promise<Venta | null>;

  // Handlers de ProductoVenta
  getProductosVenta: (ventaId: number) => Promise<ProductoVenta[]>;
  addProductoVenta: (ventaId: number, productoId: string, cantidad: number, precioUnitario: number, recalcular?: boolean) => Promise<ProductoVenta>;
  removeProductoVenta: (id: number, recalcular?: boolean) => Promise<boolean>;

  // Handlers de Rentabilidad
  getRentabilidad: () => Promise<{
    porEnvio: RentabilidadEnvio[];
    porVenta: any[];
    resumen: ResumenRentabilidad;
  } | null>;
  recalcularRentabilidad: () => Promise<{
    porEnvio: RentabilidadEnvio[];
    porVenta: any[];
    resumen: ResumenRentabilidad;
  }>;
  previewCostoVenta: (lineas: LineaVentaSimulada[]) => Promise<PreviewCostoVenta>;
  precioSugerido: (margenObjetivoPct: number, tasaUsdCup: number) => Promise<SugerenciaPrecio[]>;

  // Handlers de Transaccion
  getTransacciones: () => Promise<Transaccion[]>;
  createTransaccion: (transaccion: Partial<Transaccion>) => Promise<Transaccion>;
  updateTransaccion: (id: number, transaccion: Partial<Transaccion>) => Promise<Transaccion | null>;
  deleteTransaccion: (id: number) => Promise<boolean>;
  getTransaccionesPorFecha: (fecha: string) => Promise<Transaccion[]>;

  // Handlers de Gastos (Fase 10.1)
  getGastos: () => Promise<Gasto[]>;
  createGasto: (gasto: Partial<Gasto>) => Promise<Gasto>;
  updateGasto: (id: number, gasto: Partial<Gasto>) => Promise<Gasto | null>;
  deleteGasto: (id: number) => Promise<boolean>;

  // Handlers de Peers QvaPay
  getPeers: () => Promise<Peer[]>;
  createPeer: (peer: Partial<Peer>) => Promise<Peer>;
  updatePeer: (id: number, peer: Partial<Peer>) => Promise<Peer | null>;
  deletePeer: (id: number) => Promise<boolean>;

  // Handlers de Flujos de Conversión
  getFlujosConversion: () => Promise<FlujoConversion[]>;
  createFlujoConversion: (flujo: Partial<FlujoConversion>) => Promise<FlujoConversion>;
  updateFlujoConversion: (id: number, flujo: Partial<FlujoConversion>) => Promise<FlujoConversion | null>;
  deleteFlujoConversion: (id: number) => Promise<boolean>;

  getTasaActual: (codigo: string) => Promise<number>;
  getTasaPorFecha: (fecha: string, codigo: string) => Promise<number>;
  getTasasHistoricas: () => Promise<TasaCambioHistorico[]>;
  agregarTasaManual: (tasa: TasaCambioManual) => Promise<boolean>;
  importarTasasExcel: () => Promise<{ importado: boolean }>;

  // Respaldo completo (Fase 9.2 - Seguridad)
  exportarRespaldo: () => Promise<{
    ok: boolean;
    cancelado?: boolean;
    ruta?: string;
  }>;
}



declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}