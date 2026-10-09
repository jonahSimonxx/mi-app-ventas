import React, { useState, useEffect } from 'react';
import { Transaccion } from '../../shared/entities/Transaccion';
import { Cuenta } from '../../shared/entities/Cuenta';
import { Moneda } from '../../shared/entities/Moneda';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import { TextArea } from '@heroui/react/textarea';
import Selector from './Selector';

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
  const [errores, setErrores] = useState<string[]>([]);
  const [transaccion, setTransaccion] = useState<Partial<Transaccion>>({
    tipo: 'transferencia',
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
        tipo: 'transferencia',
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
        tipo: 'transferencia',
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

    // ========== VALIDACIÓN ==========
    const errores: string[] = [];

    if (!cuentaOrigenId || !cuentaDestinoId) {
      errores.push('Elegí la cuenta de origen y la de destino.');
    } else if (cuentaOrigenId === cuentaDestinoId) {
      // Una transferencia a la misma cuenta no mueve nada: infla un saldo y defla el otro
      // en la misma fila, y el total del mes sigue dando cero. Es un error de carga.
      errores.push('La cuenta de origen y la de destino son la misma.');
    }

    if (Number(transaccion.monto_origen) <= 0) {
      errores.push('El monto a enviar tiene que ser mayor que 0.');
    }

    if (Number(transaccion.tasa_cambio) <= 0) {
      // Con tasa 0 el "monto recibido" queda en 0 y la transacción parece un Peaks de caja gratis.
      errores.push('La tasa de cambio tiene que ser mayor que 0 (usá 1 si es la misma moneda).');
    }

    if (Number(transaccion.comision) < 0) {
      errores.push('La comisión no puede ser negativa.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave({
      ...transaccion,
      cuenta_origen: { id_cuenta: cuentaOrigenId } as Cuenta,
      cuenta_destino: { id_cuenta: cuentaDestinoId } as Cuenta,
    });
    onClose();
  };

  // Calcular monto destino automáticamente
  useEffect(() => {
    if (Number(transaccion.monto_origen) && Number(transaccion.tasa_cambio)) {
      const montoDestino = Number(transaccion.monto_origen) * Number(transaccion.tasa_cambio);
      setTransaccion(prev => ({ ...prev, monto_destino: montoDestino }));
    }
  }, [transaccion.monto_origen, transaccion.tasa_cambio]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="lg">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>{transaccionEditar ? 'Editar Transacción' : 'Nueva Transacción'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          <p className="text-foreground/70 text-xs mb-4">
            Movimiento entre cuentas · la comisión es lo que cobra la plataforma/peer
          </p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <Input fullWidth
                type="datetime-local"
                value={new Date(transaccion.fecha || new Date()).toISOString().slice(0, 16)}
                onChange={(e) => setTransaccion({ ...transaccion, fecha: new Date(e.target.value) })}
               
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cuenta Origen:</label>
              <Selector
                valor={cuentaOrigenId || ''}
                onChange={(v) => setCuentaOrigenId(v)}
                opciones={cuentas.map((c) => ({
                  valor: String(c.id_cuenta),
                  etiqueta: `${c.id_cuenta} - ${c.nombre} (${c.moneda?.codigo})`,
                }))}
                placeholder="Seleccionar cuenta origen"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cuenta Destino:</label>
              <Selector
                valor={cuentaDestinoId || ''}
                onChange={(v) => setCuentaDestinoId(v)}
                opciones={cuentas.map((c) => ({
                  valor: String(c.id_cuenta),
                  etiqueta: `${c.id_cuenta} - ${c.nombre} (${c.moneda?.codigo})`,
                }))}
                placeholder="Seleccionar cuenta destino"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto Origen:</label>
              <NumInput
                step="0.01"
                value={transaccion.monto_origen}
                onChange={(n) => setTransaccion({ ...transaccion, monto_origen: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tasa de Cambio:</label>
              <NumInput
                step="0.0001"
                value={transaccion.tasa_cambio}
                onChange={(n) => setTransaccion({ ...transaccion, tasa_cambio: n })}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monto Destino (calculado):</label>
              <Input fullWidth
                type="text"
                value={Number(transaccion.monto_destino || 0).toFixed(2)}
                readOnly
                className="bg-surface-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Comisión:</label>
              <NumInput
                step="0.01"
                min="0"
                value={transaccion.comision}
                onChange={(n) => setTransaccion({ ...transaccion, comision: n })}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <TextArea fullWidth
              value={transaccion.descripcion || ''}
              onChange={(e) => setTransaccion({ ...transaccion, descripcion: e.target.value })}
             
              rows={3}
            />
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {transaccionEditar ? 'Guardar Cambios' : 'Crear Transacción'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default TransaccionModal;
