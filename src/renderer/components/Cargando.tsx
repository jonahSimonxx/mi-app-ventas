import React from 'react';
import { ProgressCircle } from '@heroui/react/progress-circle';

interface CargandoProps {
  /** Texto que se muestra debajo del círculo y usa el lector de pantalla. */
  etiqueta?: string;
  className?: string;
}

/**
 * Indicador de carga circular de HeroUI.
 *
 * Sustituye a los textos sueltos "Cargando…" para que toda la app espere igual.
 * `isIndeterminate` hace que el aro gire sin porcentaje, que es lo correcto
 * mientras no se conoce el avance real.
 */
const Cargando: React.FC<CargandoProps> = ({ etiqueta = 'Cargando…', className = '' }) => (
  <div
    role="status"
    aria-live="polite"
    className={`flex flex-col items-center justify-center gap-2 py-6 ${className}`}
  >
    <ProgressCircle isIndeterminate aria-label={etiqueta} size="md">
      <ProgressCircle.Track>
        <ProgressCircle.TrackCircle />
        <ProgressCircle.FillCircle />
      </ProgressCircle.Track>
    </ProgressCircle>
    <span className="text-xs text-muted">{etiqueta}</span>
  </div>
);

export default Cargando;
