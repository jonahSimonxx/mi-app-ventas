import React from 'react';
import { ComboBox, Input, ListBox, ListBoxItem } from '@heroui/react';
import type { Opcion } from './Selector';

interface SelectorBuscableProps {
  valor: string;
  onChange: (valor: string) => void;
  opciones: Opcion[];
  /** Texto del campo de búsqueda cuando no hay nada escrito. */
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: 'primary' | 'secondary';
}

/**
 * Selector con búsqueda (ComboBox de HeroUI). Se usa cuando la lista puede
 * crecer mucho — productos en Envío/Venta — donde el `Select` de `Selector`
 * obliga a recorrer decenas de opciones a ojo.
 *
 * `items` va en el `ListBox` (no en el `ComboBox`): así React Aria aplica su
 * filtro "contains" por `textValue` al escribir. Con `items` en el ComboBox
 * el filtro se desactiva (`useComboBoxState` asume filtrado async propio).
 */
const SelectorBuscable: React.FC<SelectorBuscableProps> = ({
  valor,
  onChange,
  opciones,
  placeholder = 'Buscar…',
  required,
  disabled,
  fullWidth = true,
  variant = 'primary',
}) => (
  <ComboBox
    fullWidth={fullWidth}
    variant={variant}
    selectedKey={valor === '' ? null : valor}
    onSelectionChange={(key) =>
      onChange(key === null || key === undefined ? '' : String(key))
    }
    isRequired={required}
    isDisabled={disabled}
    allowsCustomValue={false}
  >
    <ComboBox.InputGroup>
      <Input placeholder={placeholder} />
      <ComboBox.Trigger />
    </ComboBox.InputGroup>
    <ComboBox.Popover>
      <ListBox items={opciones}>
        {(o: Opcion) => (
          <ListBoxItem id={o.valor} textValue={o.etiqueta}>
            {o.etiqueta}
          </ListBoxItem>
        )}
      </ListBox>
    </ComboBox.Popover>
  </ComboBox>
);

export default SelectorBuscable;
