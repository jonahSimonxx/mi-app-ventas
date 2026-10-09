import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Aporte } from './Aporte';
import { Inversion } from './Inversion';
import { MovimientoCapital } from './MovimientoCapital';

@Entity('Inversor')
export class Inversor {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ type: 'date' })
  fecha_alta!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notas!: string;

  @OneToMany(() => Aporte, (a) => a.inversor)
  aportes!: Aporte[];

  @OneToMany(() => Inversion, (i) => i.inversor)
  inversiones!: Inversion[];

  @OneToMany(() => MovimientoCapital, (m) => m.inversor)
  movimientos!: MovimientoCapital[];
}
