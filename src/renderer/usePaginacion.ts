import { useEffect, useState } from 'react';

export interface Paginacion {
  pagina: number;
  setPagina: (p: number) => void;
  totalPaginas: number;
  inicio: number;
  fin: number;
  porPagina: number;
}

export function usePaginacion(
  total: number,
  porPagina = 10,
  reseteo: unknown[] = []
): Paginacion {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, reseteo);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [totalPaginas, pagina]);

  const inicio = (pagina - 1) * porPagina;
  const fin = Math.min(pagina * porPagina, total);

  return { pagina, setPagina, totalPaginas, inicio, fin, porPagina };
}