import React from 'react';
import { Alert } from '@heroui/react/alert';

interface ErrorFormularioProps {
  errores: string[];
}

/**
 * Lista de errores de validación de un modal.
 *
 * No se muestra nada mientras `errores` está vacío, así que los modales pueden
 * tener el estado `errores` desde el principio y solo se enciende al fallar un submit.
 */
const ErrorFormulario: React.FC<ErrorFormularioProps> = ({ errores }) => {
  if (errores.length === 0) return null;

  return (
    <Alert status="danger" className="mb-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>Revisá antes de guardar</Alert.Title>
        <Alert.Description>
          <ul className="list-disc list-inside space-y-0.5">
            {errores.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        </Alert.Description>
      </Alert.Content>
    </Alert>
  );
};

export default ErrorFormulario;
