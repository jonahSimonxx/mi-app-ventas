import React from 'react';
import { AlertDialog } from '@heroui/react/alert-dialog';
import { Button } from '@heroui/react/button';

// Sustituye a window.confirm y window.alert (HeroUI Fase 4.7): un solo componente
// para los dos casos. Si onConfirm viene, muestra Cancelar + un boton de accion
// (confirmacion); si no, un solo boton Aceptar (aviso).
export interface AvisoConfig {
  titulo: string;
  mensaje: React.ReactNode;
  onConfirm?: () => void | Promise<void>;
  etiquetaConfirmar?: string;
  status?: 'danger' | 'warning' | 'success' | 'accent' | 'default';
}

interface DialogoAvisoProps {
  config: AvisoConfig | null;
  onClose: () => void;
}

const DialogoAviso: React.FC<DialogoAvisoProps> = ({ config, onClose }) => {
  if (!config) return null;
  const esConfirmacion = Boolean(config.onConfirm);
  const status = config.status || (esConfirmacion ? 'danger' : 'accent');

  return (
    <AlertDialog isOpen onOpenChange={onClose}>
      <AlertDialog.Backdrop />
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon status={status} />
            <AlertDialog.Heading>{config.titulo}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{config.mensaje}</AlertDialog.Body>
          <AlertDialog.Footer>
            {esConfirmacion && (
              <Button variant="tertiary" onPress={onClose}>
                Cancelar
              </Button>
            )}
            <Button
              variant={status === 'danger' ? 'danger' : 'primary'}
              onPress={() => {
                const accion = config.onConfirm;
                onClose();
                if (accion) void accion();
              }}
            >
              {esConfirmacion ? config.etiquetaConfirmar || 'Confirmar' : 'Aceptar'}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog>
  );
};

export default DialogoAviso;