import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Moneda } from './Moneda';

@Entity('Cuenta')
export class Cuenta {
  @PrimaryColumn({ type: 'numeric' })
  id_cuenta!: string;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;

  @ManyToOne(() => Moneda)
  @JoinColumn({ name: 'codigo_moneda', referencedColumnName: 'codigo' })
  moneda!: Moneda;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  saldo!: number;
}