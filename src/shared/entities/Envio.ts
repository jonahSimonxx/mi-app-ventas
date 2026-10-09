import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, Check } from 'typeorm';
import { ProductoEnvio } from './ProductoEnvio';

@Entity('Envio')
@Check(`estado IN ('pendiente', 'recibido')`)
export class Envio {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, default: 'WeShipYou' })
  proveedor!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  costo!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  aranceles_usd!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  otros_costos_usd!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  peso_total_lbs!: number;

  @CreateDateColumn({ type: 'timestamp' })
  fecha_creacion!: Date;

  @Column({ type: 'timestamp', nullable: true })
  fecha_recepcion?: Date;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado!: string;

  @OneToMany(() => ProductoEnvio, (pe) => pe.envio)
  productos!: ProductoEnvio[];
}