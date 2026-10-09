import React, { useEffect, useRef, useState } from 'react';

interface NumInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | string | null | undefined;
  onChange: (value: number) => void;
  /** Se permite el negativo si el campo lo necesita (ej. ajustes). */
  allowNegative?: boolean;
}

/** Un input numérico que no rompe la escritura. */
const NumInput: React.FC<NumInputProps> = ({
  value,
  onChange,
  allowNegative = false,
  className,
  ...rest
}) => {
  const aTexto = (v: number | string | null | undefined): string => {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    return Number.isNaN(n) || n === 0 ? '' : String(v);
  };

  const [texto, setTexto] = useState<string>(() => aTexto(value));
  const ultimoEnviado = useRef<number | string | null | undefined>(value);

  // Si el padre cambia el valor desde fuera (cargar el formulario, recalcular el peso),
  // se resincroniza el texto. Si el cambio viene de este mismo input, se respeta.
  useEffect(() => {
    if (value !== ultimoEnviado.current) {
      ultimoEnviado.current = value;
      setTexto(aTexto(value));
    }
  }, [value]);

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={texto}
      onChange={(e) => {
        const t = e.target.value;
        const patron = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
        if (!patron.test(t)) return;

        setTexto(t);

        const n = t === '' || t === '-' || t === '.' || t === '-.' ? 0 : Number(t);
        ultimoEnviado.current = n;
        onChange(n);
      }}
    />
  );
};

export default NumInput;
