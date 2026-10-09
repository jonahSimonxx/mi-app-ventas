import React, { useState, useEffect } from 'react';
import ErrorFormulario from './ErrorFormulario';
import { Peer } from '../../shared/entities/Peer';
import { Modal } from '@heroui/react/modal';
import { Button } from '@heroui/react/button';
import { Input } from '@heroui/react/input';
import { Checkbox } from '@heroui/react/checkbox';

interface PeerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (peer: Partial<Peer>) => void;
  peerEditar: Partial<Peer> | null;
}

const PeerModal: React.FC<PeerModalProps> = ({ isOpen, onClose, onSave, peerEditar }) => {
  const [errores, setErrores] = useState<string[]>([]);
  const [peer, setPeer] = useState<Partial<Peer>>({
    nombre: '',
    activo: true,
    descripcion: '',
  });

  useEffect(() => {
    setErrores([]);
    if (peerEditar) {
      setPeer({
        id: peerEditar.id,
        nombre: peerEditar.nombre || '',
        activo: peerEditar.activo ?? true,
        descripcion: peerEditar.descripcion || '',
      });
    } else {
      setPeer({
        nombre: '',
        activo: true,
        descripcion: '',
      });
    }
  }, [peerEditar, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ========== VALIDACIÓN ==========
    const errores: string[] = [];

    if (!String(peer.nombre || '').trim()) {
      errores.push('El nombre del peer es obligatorio: es lo que identifica al que hace el cambio.');
    }

    setErrores(errores);
    if (errores.length > 0) return;

    onSave(peer);
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
              <Modal.Heading>{peerEditar ? 'Editar Peer' : 'Nuevo Peer'}</Modal.Heading>
              <Modal.CloseTrigger aria-label="Cerrar" />
            </Modal.Header>
            <Modal.Body>
              <ErrorFormulario errores={errores} />
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre (usuario QvaPay):</label>
            <Input fullWidth
              type="text"
              value={peer.nombre}
              onChange={(e) => setPeer({ ...peer, nombre: e.target.value })}
             
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción:</label>
            <Input fullWidth
              type="text"
              value={peer.descripcion || ''}
              onChange={(e) => setPeer({ ...peer, descripcion: e.target.value })}
             
            />
          </div>
          <div className="mb-4 flex items-center gap-2">
            <Checkbox
              isSelected={peer.activo ?? true}
              onChange={(v) => setPeer({ ...peer, activo: v })}
            >
              Activo
            </Checkbox>
          </div>
          </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="secondary" onPress={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {peerEditar ? 'Guardar Cambios' : 'Crear Peer'}
              </Button>
            </Modal.Footer>
          </form>
        </Modal.Dialog>
      </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default PeerModal;

