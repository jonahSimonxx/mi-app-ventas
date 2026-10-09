import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductoVenta } from './ProductoVenta';

@Entity('Venta')
export class Venta {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  forma_pago!: string;

  @Column({ type: 'varchar', length: 20, default: 'completada' })
  estado!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  total_usd!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_cup!: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  tasa_usd_cup!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  costo_total_usd!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  ganancia_usd!: number;

  // 1% DEVENGADO con las ventas, sobre las unidades que financiaron. Es lo que descuenta
  // la ganancia neta real. Que este cobrado o no es otra columna (Inversion.
  // comision_cobrada), porque el cobro llega mucho despues, al depositar en QvaPay.
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  comision_inversores_usd!: number;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;

  @OneToMany(() => ProductoVenta, (pv) => pv.venta)
  productos!: ProductoVenta[];
}
