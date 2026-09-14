import React, { useState, useEffect } from 'react';
import { Transaccion } from '../../shared/entities/Transaccion';
import { Cuenta } from '../../shared/entities/Cuenta';
import { Moneda } from '../../shared/entities/Moneda';

interface TransaccionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaccion: Partial<Transaccion>) => void;
  transaccionEditar: Partial<Transaccion> | null;
  cuentas: Cuenta[];
  monedas: Moneda[];
}

const TransaccionModal: React.FC<TransaccionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  transaccionEditar,
  cuentas,
  monedas,
}) => {
  const [transaccion, setTransaccion] = useState<Partial<Transaccion>>({
    tipo: 'venta',
    monto_origen: 0,
    monto_destino: 0,
    tasa_cambio: 1,
    comision: 0,
    fecha: new Date(),
    descripcion: '',
  });

  const [cuentaOrigenId, setCuentaOrigenId] = useState<string>('');
  const [cuentaDestinoId, setCuentaDestinoId] = useState<string>('');

  // Obtener tasa de cambio actual para USD
  const tasaUSD = monedas.find(m => m.codigo === 'USD')?.tasa_cambio || 1;

  useEffect(() => {
    if (transaccionEditar) {
      setTransaccion({
        id_trans: transaccionEditar.id_trans,
        tipo: transaccionEditar.tipo || 'venta',
        monto_origen: transaccionEditar.monto_origen || 0,
        monto_destino: transaccionEditar.monto_destino || 0,
        tasa_cambio: transaccionEditar.tasa_cambio || 1,
        comision: transaccionEditar.comision || 0,
        fecha: transaccionEditar.fecha || new Date(),
        descripcion: transaccionEditar.descripcion || '',
      });
      setCuentaOrigenId(transaccionEditar.cuenta_origen?.id_cuenta || '');
      setCuentaDestinoId(transaccionEditar.cuenta_destino?.id_cuenta || '');
    } else {
      setTransaccion({
        tipo: 'venta',
        monto_origen: 0,
        monto_destino: 0,
        tasa_cambio: 1,
        comision: 0,
        fecha: new Date(),
        descripcion: '',
      });
      setCuentaOrigenId('');
      setCuentaDestinoId('');
    }
  }, [transaccionEditar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...transaccion,
      cuenta_origen: { id_cuenta: cuentaOrigenId } as Cuenta,
      cuenta_destino: { id_cuenta: cuentaDestinoId } as Cuenta,
    });
    onClose();
  };

  // Calcular monto destino automáticamente
  useEffect(() => {
    if (transaccion.monto_origen && transaccion.tasa_cambio) {
      const montoDestino = transaccion.monto_origen * transaccion.tasa_cambio;
      setTransaccion(prev => ({ ...prev, monto_destino: montoDestino }));
    }
  }, [transaccion.monto_origen, transaccion.tasa_cambio]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {transaccionEditar ? 'Editar Transacción' : 'Nueva Transacción'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo:</label>
              <select
                value={transaccion.tipo}
                onChange={(e) => setTransaccion({ ...transaccion, tipo: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="venta">Venta</option>
                <option value="compra">Compra</option>
                <option value="transferencia">Transferencia</option>
                <option value="envio">Envío</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <input
                type="datetime-local"
                value={new Date(transaccion.fecha || new Date()).toISOString().slice(0, 16)}
                onChange={(e) => setTransaccion({ ...transaccion, fecha: new Date(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cuenta Origen:</label>
              <select
                value={cuentaOrigenId}
                onChange={(e) => setCuentaOrigenId(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccionar cuenta origen</option>
                {cuentas.map((c) => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>
                    {c.id_cuenta} - {c.nombre} ({c.moneda?.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cuenta Destino:</label>
              <select
                value={cuentaDestinoId}
                onChange={(e) => setCuentaDestinoId(e.target.value)}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Seleccionar cuenta destino</option>
                {cuentas.map((c) => (
                  <option key={c.id_cuenta} value={c.id_cuenta}>
                    {c.id_cuenta} - {c.nombre} ({c.moneda?.codigo})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto Origen:</label>
              <input
                type="number"
                step="0.01"
                value={transaccion.monto_origen}
                onChange={(e) => setTransaccion({ ...transaccion, monto_origen: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tasa de Cambio:</label>
              <input
                type="number"
                step="0.0001"
                value={transaccion.tasa_cambio}
                onChange={(e) => setTransaccion({ ...transaccion, tasa_cambio: Number(e.target.value) })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto Destino (calculado):</label>
              <input
                type="number"
                step="0.01"
                value={transaccion.monto_destino}
                onChange={(e) => setTransaccion({ ...transaccion, monto_destino: Number(e.target.value) })}
                className="w-full p-2 border rounded bg-gray-100"
                readOnly
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Comisión:</label>
              <input
                type="number"
                step="0.01"
                value={transaccion.comision}
                onChange={(e) => setTransaccion({ ...transaccion, comision: Number(e.target.value) })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <textarea
              value={transaccion.descripcion || ''}
              onChange={(e) => setTransaccion({ ...transaccion, descripcion: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              {transaccionEditar ? 'Guardar Cambios' : 'Crear Transacción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransaccionModal;
