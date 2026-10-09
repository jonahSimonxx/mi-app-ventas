import React from 'react';
import { Pagination } from '@heroui/react/pagination';

interface PaginadorProps {
  pagina: number;
  totalPaginas: number;
  onCambio: (pagina: number) => void;
  className?: string;
}

function rango(pagina: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const elegidas = [1, 2, total - 1, total, pagina - 1, pagina, pagina + 1].filter(
    (p) => p >= 1 && p <= total
  );
  const unicas = [...new Set(elegidas)].sort((a, b) => a - b);
  const resultado: (number | '…')[] = [];
  let anterior = 0;
  for (const p of unicas) {
    if (p - anterior > 1) resultado.push('…');
    resultado.push(p);
    anterior = p;
  }
  return resultado;
}

const Paginador: React.FC<PaginadorProps> = ({ pagina, totalPaginas, onCambio, className }) => {
  if (totalPaginas <= 1) return null;
  const paginas = rango(pagina, totalPaginas);
  return (
    <Pagination.Root size="sm" aria-label="Paginación" className={className}>
      <Pagination.Content className="flex flex-wrap items-center justify-center gap-1 pt-3">
        <Pagination.Item>
          <Pagination.Previous
            type="button"
            isDisabled={pagina <= 1}
            onPress={() => onCambio(pagina - 1)}
          >
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        {paginas.map((n, i) =>
          n === '…' ? (
            <Pagination.Item key={`ellipsis-${i}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={n}>
              <Pagination.Link type="button" isActive={n === pagina} onPress={() => onCambio(n)}>
                {n}
              </Pagination.Link>
            </Pagination.Item>
          )
        )}
        <Pagination.Item>
          <Pagination.Next
            type="button"
            isDisabled={pagina >= totalPaginas}
            onPress={() => onCambio(pagina + 1)}
          >
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination.Root>
  );
};

export default Paginador;