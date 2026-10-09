import React, { useState, useEffect } from 'react';
import { Moneda } from '../../shared/entities/Moneda';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import Selector from './Selector';

interface MonedaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (moneda: Partial<Moneda>) => void;
  monedaEditar: Partial<Moneda> | null;
}

const MonedaModal: React.FC<MonedaModalProps> = ({ isOpen, onClose, onSave, monedaEditar }) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [moneda, setMoneda] = useState<Partial<Moneda>>({
    codigo: '',
    nombre: '',
    tasa_cambio: 1.0, 
  });

  useEffect(() => {
    if (monedaEditar) {
      setMoneda({
        codigo: monedaEditar.codigo || '',
        nombre: monedaEditar.nombre || '',
        tasa_cambio: monedaEditar.tasa_cambio || 1.0, 
      });
    } else {
      setMoneda({
        codigo: '',
        nombre: '',
        tasa_cambio: 1.0, 
      });
    }
  }, [monedaEditar, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // `Moneda.tasa_cambio` se usa como referencia para calcular conversiones manuales. Con
    // 0 o vacía, todo monto calculado contra esa moneda da 0 sin fallar.
    const errores: string[] = [];

    if (!String(moneda.codigo || '').trim()) {
      errores.push('El código de la moneda es obligatorio (ej. USD, CUP, USDT).');
    }

    if (!String(moneda.nombre || '').trim()) {
      errores.push('El nombre de la moneda es obligatorio.');
    }

    if (!(Number(moneda.tasa_cambio) > 0)) {
      errores.push('La tasa tiene que ser un número mayor que 0.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave(moneda);
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
              <Modal.Heading>{monedaEditar ? 'Editar Moneda' : 'Nueva Moneda'}</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Código:</label>
            <Selector
              valor={moneda.codigo || ''}
              onChange={(v) => setMoneda({ ...moneda, codigo: v })}
              opciones={[
                { valor: 'USD', etiqueta: 'USD' },
                { valor: 'CUP', etiqueta: 'CUP' },
                { valor: 'USDT', etiqueta: 'USDT' },
                { valor: 'EUR', etiqueta: 'EUR' },
                { valor: 'GBP', etiqueta: 'GBP' },
              ]}
              placeholder="Selecciona un código"
              required
              disabled={!!monedaEditar}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre:</label>
            <Selector
              valor={moneda.nombre || ''}
              onChange={(v) => setMoneda({ ...moneda, nombre: v })}
              opciones={[
                { valor: 'Dólar Estadounidense', etiqueta: 'Dólar Estadounidense' },
                { valor: 'Peso Cubano', etiqueta: 'Peso Cubano' },
                { valor: 'Tether', etiqueta: 'Tether' },
                { valor: 'Euro', etiqueta: 'Euro' },
                { valor: 'Libra Esterlina', etiqueta: 'Libra Esterlina' },
              ]}
              placeholder="Selecciona un nombre"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tasa de Cambio (vs CUP):</label>
            <NumInput
              step="0.0001"
              min="0"
              value={moneda.tasa_cambio}
              onChange={(n) => setMoneda({ ...moneda, tasa_cambio: n })}
              className="w-full p-2 border rounded"
              required
              placeholder="Ej: 540.00"
            />
          </div>
          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {monedaEditar ? 'Guardar Cambios' : 'Crear Moneda'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default MonedaModal;
