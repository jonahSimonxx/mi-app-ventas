import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cuenta } from './Cuenta';

@Entity('Transaccion')
export class Transaccion {
  @PrimaryGeneratedColumn('increment')
  id_trans!: number;

  @ManyToOne(() => Cuenta)
  @JoinColumn({ name: 'cuenta_origen_id' })
  cuenta_origen!: Cuenta;

  @ManyToOne(() => Cuenta)
  @JoinColumn({ name: 'cuenta_destino_id' })
  cuenta_destino!: Cuenta;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto_origen!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto_destino!: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  tasa_cambio!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  comision!: number;

  @Column({ type: 'varchar', length: 50, default: 'transferencia' })
  tipo!: string;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;
}