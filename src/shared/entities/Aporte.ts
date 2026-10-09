import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Inversor } from './Inversor';
import { Cuenta } from './Cuenta';

@Entity('Aporte')
export class Aporte {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Inversor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inversor_id' })
  inversor!: Inversor;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto!: number;

  // Cuenta del socio (la de pasivo, saldo negativo mientras se le debe). El aporte
  // se materializa como Transaccion desde esta cuenta hacia una de caja.
  @ManyToOne(() => Cuenta, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cuenta_origen_id' })
  cuenta_origen!: Cuenta;

  // Vinculo con la Transaccion generada al registrar el aporte. Evita que el mismo
  // aporte se cuente dos veces si se sincroniza de nuevo.
  @Column({ type: 'int', nullable: true })
  transaccion_id!: number;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;
}
