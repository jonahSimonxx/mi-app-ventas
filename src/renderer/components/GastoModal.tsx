import React, { useEffect, useState } from 'react';
import { Gasto } from '../../shared/entities/Gasto';
import { Envio } from '../../shared/entities/Envio';
import { CATEGORIAS_GASTO, normalizarImporteGasto } from '../../shared/gastos';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import Selector from './Selector';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { TextArea } from '@heroui/react/textarea';
import { Separator } from '@heroui/react/separator';

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gasto: Partial<Gasto>) => void;
  gastoEditar: Gasto | null;
  envios: Envio[];
  /** Tasa CUP/USD actual, usada como valor por defecto. */
  tasaUSD?: number;
}

/** Fecha de hoy en horario local (no UTC), en `YYYY-MM-DD`. */
const hoyLocal = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const GastoModal: React.FC<GastoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  gastoEditar,
  envios,
  tasaUSD = 1,
}) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [gasto, setGasto] = useState<Partial<Gasto>>({
    fecha: hoyLocal(),
    categoria: 'Otros',
    descripcion: '',
    moneda: 'USD',
    monto: 0,
    tasa: tasaUSD,
    envio_id: null,
  });
  const [envioId, setEnvioId] = useState<string>('');

  useEffect(() => {
    setErrores([]);
    if (gastoEditar) {
      setGasto({
        id: gastoEditar.id,
        fecha: gastoEditar.fecha || hoyLocal(),
        categoria: gastoEditar.categoria || 'Otros',
        descripcion: gastoEditar.descripcion || '',
        moneda: gastoEditar.moneda || 'USD',
        monto: Number(gastoEditar.monto) || 0,
        tasa: Number(gastoEditar.tasa) || 1,
        monto_usd: Number(gastoEditar.monto_usd) || 0,
        monto_cup: Number(gastoEditar.monto_cup) || 0,
        envio_id: gastoEditar.envio_id ?? null,
      });
      setEnvioId(gastoEditar.envio_id ? String(gastoEditar.envio_id) : '');
    } else {
      setGasto({
        fecha: hoyLocal(),
        categoria: 'Otros',
        descripcion: '',
        moneda: 'USD',
        monto: 0,
        tasa: tasaUSD,
        envio_id: null,
      });
      setEnvioId('');
    }
  }, [gastoEditar, tasaUSD]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const listaErrores: string[] = [];
    if (!gasto.fecha) listaErrores.push('Elegí la fecha en que se pagó el gasto.');
    if (Number(gasto.monto) <= 0) listaErrores.push('El monto tiene que ser mayor que 0.');
    if (Number(gasto.tasa) <= 0) {
      listaErrores.push('La tasa tiene que ser mayor que 0 (usá 1 si el gasto es en USD).');
    }

    setErrores(listaErrores);
    if (listaErrores.length > 0) return;

    // Los dos equivalentes se congelan acá, con la tasa del día del gasto: el
    // histórico no debe cambiar cuando después se actualice la tasa de la app.
    const importe = normalizarImporteGasto(
      gasto.moneda || 'USD',
      Number(gasto.monto) || 0,
      Number(gasto.tasa) || 1
    );

    onSave({
      ...gasto,
      ...importe,
      envio_id: envioId ? Number(envioId) : null,
    });
    onClose();
  };

  if (!isOpen) return null;

  const moneda = gasto.moneda === 'CUP' ? 'CUP' : 'USD';
  const vistaPrevia = normalizarImporteGasto(
    moneda,
    Number(gasto.monto) || 0,
    Number(gasto.tasa) || 1
  );

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container placement="center" scroll="inside" size="lg">
          <Modal.Dialog>
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <Modal.Header>
                <Modal.Heading>{gastoEditar ? 'Editar Gasto' : 'Nuevo Gasto'}</Modal.Heading>
                <Modal.CloseTrigger aria-label="Cerrar" />
              </Modal.Header>
              <Modal.Body>
                <ErrorFormulario errores={errores} />
                <p className="text-foreground/70 text-xs mb-4">
                  Gasto operativo · no cargues acá el flete ni los aranceles que ya viven en el Envío
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fecha:</label>
                    <CampoFecha
                      valor={gasto.fecha || ''}
                      onChange={(fecha) => setGasto({ ...gasto, fecha })}
                      etiqueta="Fecha del gasto"
                      fullWidth
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Categoría:</label>
                    <Selector
                      valor={gasto.categoria || 'Otros'}
                      onChange={(v) => setGasto({ ...gasto, categoria: v })}
                      opciones={CATEGORIAS_GASTO.map((c) => ({ valor: c, etiqueta: c }))}
                      placeholder="Elegir categoría"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Descripción:</label>
                  <TextArea
                    fullWidth
                    value={gasto.descripcion || ''}
                    onChange={(e) => setGasto({ ...gasto, descripcion: e.target.value })}
                    placeholder="Ej. flete interno, recibo de luz de septiembre…"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Moneda:</label>
                    <Selector
                      valor={moneda}
                      onChange={(v) => setGasto({ ...gasto, moneda: v })}
                      opciones={[
                        { valor: 'USD', etiqueta: 'USD' },
                        { valor: 'CUP', etiqueta: 'CUP' },
                      ]}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Monto:</label>
                    <NumInput
                      step="0.01"
                      value={gasto.monto}
                      onChange={(n) => setGasto({ ...gasto, monto: n })}
                      sufijo={moneda}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tasa (CUP por USD):</label>
                    <NumInput
                      step="0.0001"
                      value={gasto.tasa}
                      onChange={(n) => setGasto({ ...gasto, tasa: n })}
                      sufijo="CUP/USD"
                      className="w-full"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Envío (opcional):</label>
                  <Selector
                    valor={envioId}
                    onChange={setEnvioId}
                    opciones={[
                      { valor: '', etiqueta: 'Sin envío' },
                      ...envios.map((e) => ({
                        valor: String(e.id),
                        etiqueta: `#${e.id} - ${e.proveedor} (${new Date(e.fecha_creacion).toLocaleDateString()})`,
                      })),
                    ]}
                    placeholder="Sin envío"
                  />
                  <p className="text-foreground/60 text-xs mt-1">
                    Solo para imputar el gasto a un envío concreto. El flete y los aranceles del envío
                    ya se cuentan aparte.
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted">Equivalente en USD</p>
                    <p className="text-lg font-semibold">${vistaPrevia.monto_usd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Equivalente en CUP</p>
                    <p className="text-lg font-semibold">${vistaPrevia.monto_cup.toFixed(2)}</p>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="secondary" onPress={onClose}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit">
                  {gastoEditar ? 'Guardar Cambios' : 'Crear Gasto'}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default GastoModal;
