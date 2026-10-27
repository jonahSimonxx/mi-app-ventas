import React from 'react';
import { Calendar, DatePicker } from '@heroui/react';
import { DateInputGroup } from '@heroui/react/date-input-group';
import { parseDate } from '@internationalized/date';

interface CampoFechaProps {
  /** Fecha en formato `YYYY-MM-DD` (o cadena vacía). */
  valor: string;
  onChange: (valor: string) => void;
  /** Texto accesible; las pantallas ya muestran su propio `<label>`. */
  etiqueta?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

/**
 * Campo de fecha con calendario (DatePicker de HeroUI).
 *
 * La app guarda las fechas como strings `YYYY-MM-DD` (columnas `date` de
 * Postgres), así que el componente traduce en ambos sentidos con
 * `parseDate` / `DateValue.toString()`.
 */
const CampoFecha: React.FC<CampoFechaProps> = ({
  valor,
  onChange,
  etiqueta = 'Fecha',
  required,
  disabled,
  fullWidth = false,
}) => (
  <DatePicker
    aria-label={etiqueta}
    className={fullWidth ? 'w-full' : undefined}
    value={valor ? parseDate(valor) : null}
    onChange={(fecha) => onChange(fecha ? fecha.toString() : '')}
    isRequired={required}
    isDisabled={disabled}
    granularity="day"
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
