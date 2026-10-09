import React from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopover,
  ListBox,
  ListBoxItem,
} from '@heroui/react';

export interface Opcion {
  valor: string;
  etiqueta: string;
}

interface SelectorProps {
  valor: string;
  onChange: (valor: string) => void;
  opciones: Opcion[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const Selector: React.FC<SelectorProps> = ({
  valor,
  onChange,
  opciones,
  placeholder = 'Seleccionar…',
  required,
  disabled,
  fullWidth = true,
}) => (
  <Select
    fullWidth={fullWidth}
    selectedKey={valor === '' ? null : valor}
    onChange={(key) => onChange(key === null || key === undefined ? '' : String(key))}
    isRequired={required}
    isDisabled={disabled}
  >
    <SelectTrigger>
      <SelectValue>
        {(value) => (value.isPlaceholder ? placeholder : value.selectedText)}
      </SelectValue>
    </SelectTrigger>
    <SelectPopover>
      <ListBox>
        {opciones.map((o) => (
          <ListBoxItem key={o.valor} id={o.valor}>
            {o.etiqueta}
          </ListBoxItem>
        ))}
      </ListBox>
    </SelectPopover>
  </Select>
);

export default Selector;
