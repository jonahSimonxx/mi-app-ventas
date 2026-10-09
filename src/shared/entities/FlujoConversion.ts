import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Peer } from './Peer';

@Entity('FlujoConversion')
export class FlujoConversion {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 2 })
  tipo!: string;

  @Column({ type: 'varchar', length: 5, default: 'CUP' })
  moneda_in!: string;

  @ManyToOne(() => Peer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'peer_id' })
  peer!: Peer;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto_in!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto_usdt_recibido!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  total_comisiones_in!: number;

  @Column({ type: 'numeric', precision: 10, scale: 4 })
  tasa_efectiva!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  perdida_total_in!: number;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;
}