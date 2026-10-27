import React, { useState, useEffect } from 'react';
import { FlujoConversion } from '../../shared/entities/FlujoConversion';
import { Peer } from '../../shared/entities/Peer';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import { TextArea } from '@heroui/react/textarea';
import Selector from './Selector';

const DESCRIPCIONES_TIPO: Record<string, string> = {
  A: 'CUP cash → USD (mercado negro) → USDT (peer)',
  B: 'CUP transferencia → CUP cash (peer ~10%) → USD → USDT',
  C: 'CUP transferencia → USDT directo (peer, caro)',
  D: 'USD cash → USDT (peer)',
};

const MONEDA_IN_TIPO: Record<string, string> = {
  A: 'CUP',
  B: 'CUP',
  C: 'CUP',
  D: 'USD',
};

interface ConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flujo: Partial<FlujoConversion>) => void;
  flujoEditar: Partial<FlujoConversion> | null;
  peers: Peer[];
}

const ConversionModal: React.FC<ConversionModalProps> = ({ isOpen, onClose, onSave, flujoEditar, peers }) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [flujo, setFlujo] = useState<Partial<FlujoConversion>>({
    tipo: 'A',
    monto_in: 0,
    monto_usdt_recibido: 0,
    total_comisiones_in: 0,
    fecha: new Date(),
    descripcion: '',
  });
  const [peerId, setPeerId] = useState<string>('');

  useEffect(() => {
    if (flujoEditar) {
      setFlujo({
        id: flujoEditar.id,
        tipo: flujoEditar.tipo || 'A',
        monto_in: flujoEditar.monto_in || 0,
        monto_usdt_recibido: flujoEditar.monto_usdt_recibido || 0,
        total_comisiones_in: flujoEditar.total_comisiones_in || 0,
        fecha: flujoEditar.fecha || new Date(),
        descripcion: flujoEditar.descripcion || '',
      });
      setPeerId(flujoEditar.peer?.id ? String(flujoEditar.peer.id) : '');
    } else {
      setFlujo({
        tipo: 'A',
        monto_in: 0,
        monto_usdt_recibido: 0,
        total_comisiones_in: 0,
        fecha: new Date(),
        descripcion: '',
      });
      setPeerId('');
    }
  }, [flujoEditar, isOpen]);

  const monedaIn = MONEDA_IN_TIPO[flujo.tipo || 'A'] || 'CUP';
  const montoIn = Number(flujo.monto_in) || 0;
  const montoUsdt = Number(flujo.monto_usdt_recibido) || 0;
  const comisiones = Number(flujo.total_comisiones_in) || 0;
  const tasaEfectiva = montoIn > 0 && montoUsdt > 0 ? montoIn / montoUsdt : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // Sin `monto_usdt_recibido` la tasa efectiva queda en 0 (`montoIn > 0 && montoUsdt > 0`
    // es el guard) y el resumen de la pestaña Conversión muestra tasas en 0 sin que se
    // note que en realidad no se registró nada.
    const errores: string[] = [];

    if (!peerId) {
      errores.push('Elegí el peer que hizo el cambio: sin él el flujo queda sin responsable.');
    }

    if (Number(flujo.monto_in) <= 0) {
      errores.push('El monto de entrada tiene que ser mayor que 0.');
    }

    if (Number(flujo.monto_usdt_recibido) <= 0) {
      errores.push('El USDT recibido tiene que ser mayor que 0, si no la tasa efectiva queda en 0.');
    }

    if (Number(flujo.total_comisiones_in) < 0) {
      errores.push('Las comisiones no pueden ser negativas.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave({
      ...flujo,
      moneda_in: monedaIn,
      peer: { id: Number(peerId) } as Peer,
      tasa_efectiva: tasaEfectiva,
      perdida_total_in: comisiones,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
      <Modal.Container placement="center" scroll="inside" size="lg">
        <Modal.Dialog>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <Modal.Header>
              <Modal.Heading>{flujoEditar ? 'Editar Conversión' : 'Nueva Conversión'}</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Tipo de Flujo:</label>
            <Selector
              valor={flujo.tipo || ''}
              onChange={(v) => setFlujo({ ...flujo, tipo: v })}
              opciones={[
                { valor: 'A', etiqueta: `A — ${DESCRIPCIONES_TIPO.A}` },
                { valor: 'B', etiqueta: `B — ${DESCRIPCIONES_TIPO.B}` },
                { valor: 'C', etiqueta: `C — ${DESCRIPCIONES_TIPO.C}` },
                { valor: 'D', etiqueta: `D — ${DESCRIPCIONES_TIPO.D}` },
              ]}
              placeholder="Seleccionar tipo"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Peer QvaPay:</label>
            <Selector
              valor={peerId || ''}
              onChange={(v) => setPeerId(v)}
              opciones={peers
                .filter((p) => p.activo)
                .map((p) => ({ valor: String(p.id), etiqueta: p.nombre }))}
              placeholder="Seleccionar peer"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {monedaIn} invertido:
              </label>
              <NumInput
                step="0.01"
                value={flujo.monto_in}
                onChange={(n) => setFlujo({ ...flujo, monto_in: n })}
                sufijo={monedaIn}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">USDT recibido:</label>
              <NumInput
                step="0.01"
                value={flujo.monto_usdt_recibido}
                onChange={(n) => setFlujo({ ...flujo, monto_usdt_recibido: n })}
                sufijo="USDT"
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comisiones ({monedaIn}):</label>
              <NumInput
                step="0.01"
                min="0"
                value={flujo.total_comisiones_in}
                onChange={(n) => setFlujo({ ...flujo, total_comisiones_in: n })}
                sufijo={monedaIn}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tasa efectiva ({monedaIn} por USDT):
              </label>
              <Input fullWidth
                type="text"
                value={tasaEfectiva === 0 ? '—' : tasaEfectiva.toFixed(4)}
                readOnly
                className="bg-surface-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <CampoFecha
                valor={new Date(flujo.fecha || new Date()).toISOString().slice(0, 16)}
                onChange={(fecha) => setFlujo({ ...flujo, fecha: new Date(fecha) })}
                conHora
                etiqueta="Fecha de la conversión"
                fullWidth
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <TextArea fullWidth
              value={flujo.descripcion || ''}
              onChange={(e) => setFlujo({ ...flujo, descripcion: e.target.value })}
             
              rows={2}
            />
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {flujoEditar ? 'Guardar Cambios' : 'Crear Conversión'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ConversionModal;
