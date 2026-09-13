import React, { useState, useEffect } from 'react';
import { Cuenta } from '../../shared/entities/Cuenta';
import { Moneda } from '../../shared/entities/Moneda';

interface CuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cuenta: Partial<Cuenta>) => void;
  cuentaEditar: Partial<Cuenta> | null;
  monedas: Moneda[];
}

const CuentaModal: React.FC<CuentaModalProps> = ({ isOpen, onClose, onSave, cuentaEditar, monedas }) => {
  const [cuenta, setCuenta] = useState<Partial<Cuenta>>({
    id_cuenta: '',
    nombre: '',
    saldo: 0,
    moneda: undefined,
  });

  useEffect(() => {
    if (cuentaEditar) {
      setCuenta({
        id_cuenta: cuentaEditar.id_cuenta || '',
        nombre: cuentaEditar.nombre || '',
        saldo: cuentaEditar.saldo || 0,
        moneda: cuentaEditar.moneda,
      });
    } else {
      setCuenta({
        id_cuenta: '',
        nombre: '',
        saldo: 0,
        moneda: undefined,
      });
    }
  }, [cuentaEditar, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(cuenta);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-bold mb-4">
          {cuentaEditar ? 'Editar Cuenta' : 'Nueva Cuenta'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ID:</label>
            <select
              value={cuenta.id_cuenta}
              onChange={(e) => setCuenta({ ...cuenta, id_cuenta: e.target.value })}
              className="w-full p-2 border rounded"
              required
              disabled={!!cuentaEditar}
            >
              <option value="">Selecciona un ID</option>
              <option value="1">1 - Efectivo USD</option>
              <option value="2">2 - Efectivo CUP</option>
              <option value="3">3 - CUP Transferencia</option>
              <option value="4">4 - Saldo Coinex</option>
              <option value="5">5 - Saldo QvaPay</option>
              <option value="6">6 - Saldo MPay</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre:</label>
            <input
              type="text"
              value={cuenta.nombre}
              onChange={(e) => setCuenta({ ...cuenta, nombre: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Moneda:</label>
            <select
              value={cuenta.moneda?.codigo || ''}
              onChange={(e) => {
                const selectedMoneda = monedas.find(m => m.codigo === e.target.value);
                setCuenta({ ...cuenta, moneda: selectedMoneda });
              }}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Selecciona una moneda</option>
              {monedas.map((moneda) => (
                <option key={moneda.codigo} value={moneda.codigo}>
                  {moneda.codigo} - {moneda.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Saldo:</label>
            <input
              type="number"
              step="0.01"
              value={cuenta.saldo}
              onChange={(e) => setCuenta({ ...cuenta, saldo: Number(e.target.value) })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              {cuentaEditar ? 'Guardar Cambios' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CuentaModal;
