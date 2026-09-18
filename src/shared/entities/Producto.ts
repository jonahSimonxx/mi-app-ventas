import { Entity, PrimaryColumn, Column, Check } from 'typeorm';

@Entity('Producto')
@Check(`stock_actual >= 0`)
export class Producto {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id_prod!: string;

  @Column({ type: 'varchar', length: 100 })
  nombre_prod!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion?: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  costo!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio_venta!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  stock_actual!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  peso_lbs!: number;
}