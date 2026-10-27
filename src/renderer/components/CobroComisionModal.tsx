import React, { useState, useEffect } from 'react';
import NumInput from './NumInput';
import CampoFecha from './CampoFecha';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import Selector from './Selector';

export interface InversorResumen {
  inversorId: number;
  nombre: string;
  comisionDevengada: number;
  comisionCobrada: number;
  comisionPendiente: number;
  comisionInconsistente: boolean;
}

interface CobroComisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (datos: {
    inversorId: number;
    monto: number;
    fecha: string;
  }) => void;
  inversores: InversorResumen[];
  inversorPorDefecto: number | null;
}

const CobroComisionModal: React.FC<CobroComisionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  inversores,
  inversorPorDefecto,
}) => {
  const [inversorId, setInversorId] = useState<number | ''>('');
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16));

  useEffect(() => {
    if (isOpen) {
      const conPendiente = inversores.find((i) => i.comisionPendiente > 0.004);
      setInversorId(
        inversorPorDefecto || (conPendiente ? conPendiente.inversorId : inversores.length ? inversores[0].inversorId : '')
      );
      setMonto(0);
      setFecha(new Date().toISOString().slice(0, 16));
    }
  }, [isOpen, inversorPorDefecto, inversores]);

  const socio = inversores.find((i) => i.inversorId === Number(inversorId));
  const pendiente = Number(socio?.comisionPendiente || 0);
  const restante = Number((pendiente - Number(monto || 0)).toFixed(2));
  const excede = Number(monto || 0) > pendiente + 0.01;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (excede) return;
    onSave({
      inversorId: Number(inversorId),
      monto,
      fecha: new Date(fecha).toISOString(),
    });
    onClose();
  };

  if (!isOpen) return null;

  if (inversores.length === 0) {
    return (
      <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <Modal.Backdrop>
        <Modal.Container placement="center" scroll="inside" size="md">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Cobrar Comisión del 1%</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted mb-4">
                Todavía no hay ningún socio registrado.
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cerrar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="lg">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>Cobrar Comisión del 1%</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
        <p className="text-xs text-muted mb-4">
          El 1% se <strong>devenga</strong> en el momento de la venta y ya resta de la
          ganancia. Aquí solo marcas cuánto de eso te pagó el socio, que es cuando
          deposita el importe de la venta en QvaPay. No sale dinero de ninguna cuenta:
          el movimiento real de caja ya está en la recarga de Conversión.
        </p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Socio:</label>
            <Selector
              valor={String(inversorId)}
              onChange={(v) => {
                setInversorId(Number(v));
                setMonto(0);
              }}
              opciones={inversores.map((i) => ({
                valor: String(i.inversorId),
                etiqueta: `${i.nombre} — por cobrar ${i.comisionPendiente.toFixed(2)}`,
              }))}
              required
            />
          </div>

          {socio && (
            <div className="mb-4 p-3 bg-surface-secondary border rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Devengado (ventas)</span>
                <span className="font-medium">{socio.comisionDevengada.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Cobrado</span>
                <span className="font-medium">{socio.comisionCobrada.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between border-t mt-1 pt-1">
                <span className="text-muted">Pendiente</span>
                <span className={`font-bold ${pendiente > 0.004 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {pendiente.toFixed(2)} USD
                </span>
              </div>
              {socio.comisionInconsistente && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-2">
                  Has cobrado más de lo devengado. Probablemente bajaste el precio de una
                  venta que ya estaba cobrada; revisa la inversión antes de seguir.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto que cobras:</label>
              <NumInput
                step="0.01"
                min="0"
                value={monto}
                onChange={setMonto}
                className="w-full p-2 border rounded"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha del cobro:</label>
              <CampoFecha
                valor={fecha}
                onChange={setFecha}
                conHora
                etiqueta="Fecha del cobro"
                fullWidth
                required
              />
            </div>
          </div>

          {excede && (
            <p className="text-red-600 dark:text-red-400 text-xs mb-3">
              No puedes cobrar {Number(monto).toFixed(2)}: solo hay {pendiente.toFixed(2)}{' '}
              pendientes.
            </p>
          )}
          {!excede && Number(monto) > 0 && restante > 0.004 && (
            <p className="text-muted text-xs mb-3">
              Quedarán {restante.toFixed(2)} USD por cobrar. Se reparte de la inversión
              más antigua a la más reciente.
            </p>
          )}

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit" isDisabled={excede || Number(monto) <= 0}>
                Registrar Cobro
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default CobroComisionModal;
