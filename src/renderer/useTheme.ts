import { useCallback, useEffect, useState } from 'react';

export type TemaOscuro = 'light' | 'dark';

function temaInicial(): TemaOscuro {
  try {
    const guardado = localStorage.getItem('theme');
    if (guardado === 'light' || guardado === 'dark') return guardado;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<TemaOscuro>(temaInicial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // sin almacenamiento disponible: el tema vive solo en la sesión
    }
  }, [theme]);

  const onToggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, onToggleTheme };
}