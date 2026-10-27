import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Gasto')
export class Gasto {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  /** Solo fecha (YYYY-MM-DD): los gastos se cargan por día, no por hora. */
  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'varchar', length: 50 })
  categoria!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;

  /** Moneda en la que se pagó: 'USD' o 'CUP'. */
  @Column({ type: 'varchar', length: 5, default: 'USD' })
  moneda!: string;

  /** Importe tal como se pagó, en `moneda`. */
  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto!: number;

  /** Tasa CUP por 1 USD usada para congelar el equivalente en las dos monedas. */
  @Column({ type: 'numeric', precision: 10, scale: 4, default: 1 })
  tasa!: number;

  /** Equivalente en USD calculado al registrar el gasto. */
  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto_usd!: number;

  /** Equivalente en CUP calculado al registrar el gasto. */
  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto_cup!: number;

  /**
   * Envío al que se imputa el gasto (opcional). Es un id suelto y no una
   * relación: la app ya tiene los envíos cargados y así el respaldo JSON sigue
   * siendo plano. No cargar acá el flete/aranceles que ya viven en el Envío:
   * se contarían dos veces.
   */
  @Column({ type: 'int', nullable: true })
  envio_id!: number | null;
}
