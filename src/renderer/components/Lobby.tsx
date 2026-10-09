import React from 'react';
import { Card } from '@heroui/react/card';
import { Skeleton } from '@heroui/react/skeleton';
import { BadgeDollarSign, PackagePlus, Truck, Receipt, ArrowLeftRight } from 'lucide-react';

export type TabActiva =
  | 'dashboard'
  | 'productos'
  | 'monedas'
  | 'cuentas'
  | 'envios'
  | 'transacciones'
  | 'conversion'
  | 'ventas'
  | 'calculadora'
  | 'inversores';

export interface ProductoStockBajo {
  id: string;
  nombre: string;
  stock: number;
}

interface LobbyProps {
  ventasHoy: number;
  ingresosHoyUsd: number;
  enviosPendientes: number;
  stockBajo: ProductoStockBajo[];
  cargando?: boolean;
  onNuevaVenta: () => void;
  onAgregarProducto: () => void;
  onRegistrarEnvio: () => void;
  onNuevaTransaccion: () => void;
  onRegistrarConversion: () => void;
  onIrA: (tab: TabActiva) => void;
}

const ATAJOS = [
  {
    Icono: BadgeDollarSign,
    etiqueta: 'Nueva Venta',
    detalle: 'Registra una venta de Revolico',
    accion: 'venta',
  },
  {
    Icono: PackagePlus,
    etiqueta: 'Agregar Producto',
    detalle: 'Añade un artículo al catálogo',
    accion: 'producto',
  },
  {
    Icono: Truck,
    etiqueta: 'Registrar Envío',
    detalle: 'Alta de un envío de WeShipYou',
    accion: 'envio',
  },
  {
    Icono: Receipt,
    etiqueta: 'Nueva Transacción',
    detalle: 'Movimiento entre cuentas',
    accion: 'transaccion',
  },
  {
    Icono: ArrowLeftRight,
    etiqueta: 'Nueva Conversión',
    detalle: 'Registra una recarga / flujo',
    accion: 'conversion',
  },
] as const;

const Lobby: React.FC<LobbyProps> = ({
  ventasHoy,
  ingresosHoyUsd,
  enviosPendientes,
  stockBajo,
  cargando = false,
  onNuevaVenta,
  onAgregarProducto,
  onRegistrarEnvio,
  onNuevaTransaccion,
  onRegistrarConversion,
  onIrA,
}) => {
  const onAccion = (accion: string) => {
    switch (accion) {
      case 'venta':
        onNuevaVenta();
        break;
      case 'producto':
        onAgregarProducto();
        break;
      case 'envio':
        onRegistrarEnvio();
        break;
      case 'transaccion':
        onNuevaTransaccion();
        break;
      case 'conversion':
        onRegistrarConversion();
        break;
    }
  };

  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ATAJOS.map((a) => (
          <Card
            key={a.accion}
            role="button"
            tabIndex={0}
            className="p-4 cursor-pointer hover:bg-surface-hover transition-colors"
            onClick={() => onAccion(a.accion)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAccion(a.accion);
              }
            }}
          >
            <a.Icono className="h-7 w-7" aria-hidden="true" />
            <p className="font-semibold mt-2 text-sm">{a.etiqueta}</p>
            <p className="text-xs text-muted mt-0.5">{a.detalle}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-muted">Ventas de hoy</p>
            <button
              type="button"
              onClick={() => onIrA('ventas')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver ventas
            </button>
          </div>
          {cargando ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{ventasHoy}</p>
          )}
          <p className="text-xs text-muted">
            {cargando ? 'Cargando…' : `$${ingresosHoyUsd.toFixed(2)} USD ingresados`}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-muted">Envíos pendientes</p>
            <button
              type="button"
              onClick={() => onIrA('envios')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver envíos
            </button>
          </div>
          {cargando ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className={`text-2xl font-semibold ${enviosPendientes > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
              {enviosPendientes}
            </p>
          )}
          <p className="text-xs text-muted">
            {cargando
              ? 'Cargando…'
              : enviosPendientes > 0
                ? 'en camino a Cuba'
                : 'sin envíos en camino'}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-muted">Stock bajo</p>
            <button
              type="button"
              onClick={() => onIrA('productos')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver productos
            </button>
          </div>
          {cargando ? (
            <Skeleton className="h-8 w-20" />
          ) : stockBajo.length === 0 ? (
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">Todo en orden</p>
          ) : (
            <>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{stockBajo.length}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {stockBajo.slice(0, 4).map((p) => (
                  <span
                    key={p.id}
                    title={`${p.nombre}: ${p.stock} unidades`}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.stock <= 0
                        ? 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300'
                        : 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {p.nombre.length > 14 ? `${p.nombre.slice(0, 14)}…` : p.nombre} · {p.stock}
                  </span>
                ))}
                {stockBajo.length > 4 && (
                  <span className="px-2 py-0.5 rounded-full text-xs text-muted">
                    +{stockBajo.length - 4} más
                  </span>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Lobby;
