import React from 'react';
import { Calendar, DatePicker } from '@heroui/react';
import { DateInputGroup } from '@heroui/react/date-input-group';
import { parseDate, parseDateTime } from '@internationalized/date';

interface CampoFechaProps {
  /** `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm` (si `conHora`) o cadena vacía. */
  valor: string;
  onChange: (valor: string) => void;
  /** Texto accesible; las pantallas ya muestran su propio `<label>`. */
  etiqueta?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /**
   * Campos que antes eran `datetime-local`: muestra también hora y minutos y
   * trabaja con `YYYY-MM-DDTHH:mm`. El calendario es el mismo.
   */
  conHora?: boolean;
}

/** Convierte el string de la app a DateValue sin romper el formulario si viene mal. */
const aValor = (texto: string, conHora: boolean) => {
  if (!texto) return null;
  try {
    return conHora ? parseDateTime(texto) : parseDate(texto);
  } catch {
    return null;
  }
};

/**
 * Campo de fecha con calendario (DatePicker de HeroUI).
 *
 * La app guarda las fechas como strings: `YYYY-MM-DD` para columnas `date` y
 * `YYYY-MM-DDTHH:mm` para las que llevan hora. El componente traduce en ambos
 * sentidos con `parseDate`/`parseDateTime` y `DateValue.toString()`.
 */
const CampoFecha: React.FC<CampoFechaProps> = ({
  valor,
  onChange,
  etiqueta = 'Fecha',
  required,
  disabled,
  fullWidth = false,
  conHora = false,
}) => (
  <DatePicker
    aria-label={etiqueta}
    className={fullWidth ? 'w-full' : undefined}
    value={aValor(valor, conHora)}
    onChange={(fecha) => {
      if (!fecha) {
        onChange('');
        return;
      }
      const texto = fecha.toString();
      onChange(conHora ? texto.slice(0, 16) : texto);
    }}
    isRequired={required}
    isDisabled={disabled}
    granularity={conHora ? 'minute' : 'day'}
  >
    <DateInputGroup fullWidth={fullWidth}>
      <DateInputGroup.Input>
        {(segmento) => <DateInputGroup.Segment segment={segmento} />}
      </DateInputGroup.Input>
      <DateInputGroup.Suffix>
        <DatePicker.Trigger>
          <DatePicker.TriggerIndicator />
        </DatePicker.Trigger>
      </DateInputGroup.Suffix>
    </DateInputGroup>
    <DatePicker.Popover>
      <Calendar aria-label={etiqueta}>
        <Calendar.Header>
          <Calendar.NavButton slot="previous" />
          <Calendar.Heading />
          <Calendar.NavButton slot="next" />
        </Calendar.Header>
        <Calendar.Grid>
          <Calendar.GridHeader>
            {(dia) => <Calendar.HeaderCell>{dia}</Calendar.HeaderCell>}
          </Calendar.GridHeader>
          <Calendar.GridBody>
            {(fecha) => <Calendar.Cell date={fecha} />}
          </Calendar.GridBody>
        </Calendar.Grid>
      </Calendar>
    </DatePicker.Popover>
  </DatePicker>
);

export default CampoFecha;
