import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Inversor } from './Inversor';
import { Inversion } from './Inversion';
import { Envio } from './Envio';

@Entity('MovimientoCapital')
export class MovimientoCapital {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Inversor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inversor_id' })
  inversor!: Inversor;

  // 'retiro' = se le paga al socio. 'reinversion' = el capital vuelve a la
  // mercancia y ademas nace una Inversion nueva apuntando a envio_destino.
  @Column({ type: 'varchar', length: 20 })
  tipo!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto!: number;

  // Inversion que se libero al vender y que origina este movimiento. Null si el
  // movimiento se registro suelto (un ajuste manual del usuario).
  @ManyToOne(() => Inversion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'inversion_origen_id' })
  inversion_origen!: Inversion;

  @ManyToOne(() => Envio, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'envio_destino_id' })
  envio_destino!: Envio;

  // Si el movimiento movio caja, id de la Transaccion generada. Sirve para no
  // aplicar dos veces el mismo retiro al saldo.
  @Column({ type: 'int', nullable: true })
  transaccion_id!: number;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;
}
