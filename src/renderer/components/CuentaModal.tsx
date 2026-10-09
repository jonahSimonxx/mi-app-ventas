import React, { useState, useEffect } from 'react';
import ErrorFormulario from './ErrorFormulario';
import { Cuenta } from '../../shared/entities/Cuenta';
import { Moneda } from '../../shared/entities/Moneda';
import NumInput from './NumInput';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import Selector from './Selector';

interface CuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (cuenta: Partial<Cuenta>) => void;
  cuentaEditar: Partial<Cuenta> | null;
  monedas: Moneda[];
}

const CuentaModal: React.FC<CuentaModalProps> = ({ isOpen, onClose, onSave, cuentaEditar, monedas }) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [cuenta, setCuenta] = useState<Partial<Cuenta>>({
    id_cuenta: '',
    nombre: '',
    saldo: 0,
    moneda: undefined,
  });

  useEffect(() => {
    setErrores([]);
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

    // ========== VALIDACIÓN ==========
    const errores: string[] = [];

    if (!String(cuenta.nombre || '').trim()) {
      errores.push('El nombre de la cuenta es obligatorio.');
    }

    if (!cuenta.moneda?.codigo) {
      // `Cuenta.moneda` es la FK: sin moneda, las conversiones y los filtros por moneda
      // de la pestaña Transacciones no pueden agrupar nada.
      errores.push('Elegí la moneda de la cuenta.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave(cuenta);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="sm">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>{cuentaEditar ? 'Editar Cuenta' : 'Nueva Cuenta'}</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ID:</label>
            <Selector
              valor={cuenta.id_cuenta || ''}
              onChange={(v) => setCuenta({ ...cuenta, id_cuenta: v })}
              opciones={[
                { valor: '1', etiqueta: '1 - Efectivo USD' },
                { valor: '2', etiqueta: '2 - Efectivo CUP' },
                { valor: '3', etiqueta: '3 - CUP Transferencia' },
                { valor: '4', etiqueta: '4 - Saldo MyPal' },
                { valor: '5', etiqueta: '5 - Saldo QvaPay' },
                { valor: '6', etiqueta: '6 - Saldo MPay' },
              ]}
              placeholder="Selecciona un ID"
              required
              disabled={!!cuentaEditar}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre:</label>
            <Input fullWidth
              type="text"
              value={cuenta.nombre}
              onChange={(e) => setCuenta({ ...cuenta, nombre: e.target.value })}
             
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Moneda:</label>
            <Selector
              valor={cuenta.moneda?.codigo || ''}
              onChange={(v) => {
                const selectedMoneda = monedas.find(m => m.codigo === v);
                setCuenta({ ...cuenta, moneda: selectedMoneda });
              }}
              opciones={monedas.map((moneda) => ({
                valor: String(moneda.codigo),
                etiqueta: `${moneda.codigo} - ${moneda.nombre}`,
              }))}
              placeholder="Selecciona una moneda"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Saldo:</label>
            <NumInput
              step="0.01"
              allowNegative
              value={cuenta.saldo}
              onChange={(n) => setCuenta({ ...cuenta, saldo: n })}
              className="w-full p-2 border rounded"
            />
          </div>
          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {cuentaEditar ? 'Guardar Cambios' : 'Crear Cuenta'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CuentaModal;


