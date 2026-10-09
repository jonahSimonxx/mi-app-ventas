import React from 'react';

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
    <div className="mb-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 rounded-lg p-3">
      <p className="text-sm font-medium text-red-800 dark:text-red-200">Revisá antes de guardar:</p>
      <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300">
        {errores.map((mensaje) => (
          <li key={mensaje}>{mensaje}</li>
        ))}
      </ul>
    </div>
  );
};

export default ErrorFormulario;
