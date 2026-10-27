import React, { useState, useEffect } from 'react';
import { Cuenta } from '../../shared/entities/Cuenta';
import NumInput from './NumInput';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import Selector from './Selector';

interface AporteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (datos: {
    inversorId: number;
    monto: number;
    cuentaDestinoId: number;
    fecha: string;
    descripcion: string;
  }) => void;
  inversores: { id: number; nombre: string; activo: boolean }[];
  cuentas: Cuenta[];
  inversorPorDefecto: number | null;
}

const AporteModal: React.FC<AporteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  inversores,
  cuentas,
  inversorPorDefecto,
}) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [inversorId, setInversorId] = useState<number | ''>('');
  const [monto, setMonto] = useState(0);
  const [cuentaDestinoId, setCuentaDestinoId] = useState<number | ''>('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 16));
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInversorId(inversorPorDefecto || (inversores.length ? inversores[0].id : ''));
      setMonto(0);
      // Por defecto "Efectivo USD": es donde aterriza la plata del socio.
      const efectivo = cuentas.find((c) => c.nombre?.toLowerCase().includes('efectivo usd'));
      setCuentaDestinoId(efectivo ? Number(efectivo.id_cuenta) : cuentas.length ? Number(cuentas[0].id_cuenta) : '');
      setFecha(new Date().toISOString().slice(0, 16));
      setDescripcion('');
    }
  }, [isOpen, inversorPorDefecto, inversores, cuentas]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // Un aporte de 0 suma 0 al cuadre del socio: no rompe nada, pero ensucia el
    // historial y después no se sabe de dónde salió el capital.
    const errores: string[] = [];

    if (!inversorId) {
      errores.push('Elegí el socio que aporta.');
    }

    if (!(Number(monto) > 0)) {
      errores.push('El monto del aporte tiene que ser mayor que 0.');
    }

    if (!cuentaDestinoId) {
      errores.push('Elegí la cuenta de caja que recibe el dinero.');
    }

    if (Number.isNaN(new Date(fecha).getTime())) {
      errores.push('La fecha del aporte no es válida.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave({
      inversorId: Number(inversorId),
      monto,
      cuentaDestinoId: Number(cuentaDestinoId),
      fecha: new Date(fecha).toISOString(),
      descripcion,
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
              <Modal.Heading>Registrar Aporte</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-foreground/70 text-sm mb-4">
                Todavía no hay ningún socio. Crea uno primero en la pestaña Inversores.
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
              <Modal.Heading>Registrar Aporte</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
        <p className="text-foreground/70 text-xs mb-4">
          El capital entra desde la cuenta de pasivo del socio hacia la cuenta de caja
          que elijas. Queda registrado también en la pestaña Transacciones.
        </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Socio:</label>
            <Selector
              valor={inversorId ? String(inversorId) : ''}
              onChange={(v) => setInversorId(Number(v))}
              opciones={inversores.map((i) => ({ valor: String(i.id), etiqueta: i.nombre }))}
              placeholder="Seleccionar socio"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Monto que aporta:</label>
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
              <label className="block text-sm font-medium mb-1">Fecha:</label>
              <CampoFecha
                valor={fecha}
                onChange={setFecha}
                conHora
                etiqueta="Fecha del aporte"
                fullWidth
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Entra a la cuenta:</label>
            <Selector
              valor={cuentaDestinoId ? String(cuentaDestinoId) : ''}
              onChange={(v) => setCuentaDestinoId(Number(v))}
              opciones={cuentas
                .filter((c) => !c.nombre?.toLowerCase().startsWith('socio'))
                .map((c) => ({
                  valor: String(c.id_cuenta),
                  etiqueta: `${c.nombre} (${c.moneda?.codigo}) — saldo ${Number(c.saldo || 0).toFixed(2)}`,
                }))}
              placeholder="Seleccionar cuenta"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <Input fullWidth
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
             
              placeholder="Ej: capital inicial"
            />
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Registrar Aporte
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default AporteModal;
