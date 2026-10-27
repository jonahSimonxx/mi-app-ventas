import React, { useState, useEffect } from 'react';
import ErrorFormulario from './ErrorFormulario';
import CampoFecha from './CampoFecha';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import { TextArea } from '@heroui/react/textarea';
import { Checkbox } from '@heroui/react/checkbox';

interface InversorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (datos: { nombre: string; activo: boolean; fecha_alta: string; notas: string }) => void;
  inversorEditar: { id: number; nombre: string; activo: boolean; fecha_alta: string; notas: string } | null;
}

const InversorModal: React.FC<InversorModalProps> = ({ isOpen, onClose, onSave, inversorEditar }) => {
const [errores, setErrores] = useState<string[]>([]);
  const [nombre, setNombre] = useState('');
  const [activo, setActivo] = useState(true);
  const [fechaAlta, setFechaAlta] = useState(new Date().toISOString().slice(0, 10));
  const [notas, setNotas] = useState('');

  useEffect(() => {
    setErrores([]);
    if (inversorEditar) {
      setNombre(inversorEditar.nombre || '');
      setActivo(Boolean(inversorEditar.activo));
      setFechaAlta(
        inversorEditar.fecha_alta
          ? String(inversorEditar.fecha_alta).slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setNotas(inversorEditar.notas || '');
    } else {
      setNombre('');
      setActivo(true);
      setFechaAlta(new Date().toISOString().slice(0, 10));
      setNotas('');
    }
  }, [inversorEditar, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    // El nombre no es un dato cualquiera: `crearCuentaParaInversor` arma la cuenta como
    // "Socio <nombre> - por pagar" y el resumen la busca con esa misma convención
    // exacta. Un nombre vacío deja la cuenta huérfana sin que nada falle.
    const errores: string[] = [];

    if (!String(nombre).trim()) {
      errores.push('El nombre del socio es obligatorio.');
    }

    if (Number.isNaN(new Date(fechaAlta).getTime())) {
      errores.push('La fecha de alta no es válida.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave({ nombre: nombre.trim(), activo, fecha_alta: fechaAlta, notas });
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
              <Modal.Heading>{inversorEditar ? 'Editar Socio' : 'Nuevo Socio'}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
        <p className="text-foreground/70 text-xs mb-4">
          {inversorEditar ? (
            <>
              Su cuenta se llama &laquo;{`Socio ${inversorEditar.nombre} - por pagar`}&raquo; y
              se busca por ese nombre exacto, así que el nombre no se puede cambiar: si se
              cambia, la cuenta se queda sin socio. Actívalo, desactívalo o ponle notas.
            </>
          ) : (
            <>
              Al crearlo se le abre automáticamente una cuenta de pasivo
              &laquo;Socio {nombre || '…'} - por pagar&raquo; para que sus aportes y retiros
              sean movimientos de caja reales.
            </>
          )}
        </p>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre:</label>
            <Input fullWidth
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="text-muted disabled:bg-surface-secondary disabled:text-muted"
              required
              readOnly={Boolean(inversorEditar)}
              autoFocus={!inversorEditar}
            />
            {inversorEditar && (
              <p className="text-muted text-xs mt-1">
                No editable: es la llave con la que se encuentra su cuenta.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de alta:</label>
              <CampoFecha
                valor={fechaAlta}
                onChange={setFechaAlta}
                etiqueta="Fecha de alta"
                fullWidth
                required
                disabled={Boolean(inversorEditar)}
              />
            </div>
            <div className="flex items-end pb-2">
              <Checkbox isSelected={activo} onChange={setActivo}>
                Socio activo
              </Checkbox>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Notas:</label>
            <TextArea fullWidth
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
             
              rows={2}
            />
          </div>

          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {inversorEditar ? 'Guardar Cambios' : 'Crear Socio'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default InversorModal;


