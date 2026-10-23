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
  // La variante `secondary` pinta el trigger con `--default` (gris en claro, gris
  // oscuro en oscuro), mientras que `primary` usa `--field-background` que en el
  // tema actual es blanco-sin-borde: sobre una página blanca el control queda
  // casi invisible (el "óvalo transparente" de los filtros de Envíos/Ventas).
  variant?: 'primary' | 'secondary';
}

const Selector: React.FC<SelectorProps> = ({
  valor,
  onChange,
  opciones,
  placeholder = 'Seleccionar…',
  required,
  disabled,
  fullWidth = true,
  variant = 'primary',
}) => (
  <Select
    fullWidth={fullWidth}
    variant={variant}
    selectedKey={valor === '' ? null : valor}
    onChange={(key) => onChange(key === null || key === undefined ? '' : String(key))}
    isRequired={required}
    isDisabled={disabled}
  >
    <SelectTrigger>
      <SelectValue>
        {() => {
          if (valor === '' || valor == null) return placeholder;
          return opciones.find((o) => o.valor === valor)?.etiqueta || valor;
        }}
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
