/**
 * Categorías de gasto. Es una lista cerrada para que las sumas por categoría del
 * histórico (Fase 10.2) no se fragmenten por erratas. «Otros» queda para lo que no
 * encaje en el resto.
 */
export const CATEGORIAS_GASTO = [
  'Flete',
  'Aduana',
  'Transporte',
  'Luz',
  'Internet',
  'Alquiler',
  'Salarios',
  'Comisiones',
  'Otros',
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

export interface ImporteGasto {
  moneda: string;
  monto: number;
  tasa: number;
  monto_usd: number;
  monto_cup: number;
}

/**
 * Normaliza un gasto a USD y CUP con la tasa del día en que se pagó.
 *
 * Se guardan las dos monedas en la fila, no solo una: así el histórico conserva
 * el equivalente en USD aunque después cambie la tasa, y las sumas no dependen de
 * la tasa actual. `tasa` siempre es CUP por 1 USD (1 si el gasto se pagó en USD).
 */
export function normalizarImporteGasto(
  moneda: string,
  monto: number | string,
  tasa: number | string
): ImporteGasto {
  const m = Math.max(0, Number(monto) || 0);
  const t = Number(tasa) > 0 ? Number(tasa) : 1;
  const esCup = moneda === 'CUP';

  const montoUsd = esCup ? m / t : m;
  const montoCup = esCup ? m : m * t;

  return {
    moneda: esCup ? 'CUP' : 'USD',
    monto: Number(m.toFixed(2)),
    tasa: Number(t.toFixed(4)),
    monto_usd: Number(montoUsd.toFixed(2)),
    monto_cup: Number(montoCup.toFixed(2)),
  };
}
