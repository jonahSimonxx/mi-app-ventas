import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn, Check } from 'typeorm';
import { Moneda } from './Moneda';

@Entity('Cuenta')
@Check(`id_cuenta IN (1, 2, 3, 4, 5, 6)`)
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