import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Inversor } from './Inversor';
import { Producto } from './Producto';
import { Envio } from './Envio';

@Entity('Inversion')
export class Inversion {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Inversor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'inversor_id' })
  inversor!: Inversor;

  // El capital se asigna a un producto concreto, pero se guarda tambien el envio
  // porque ahi vive el costo real (flete + aranceles repartidos por unidad).
  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id', referencedColumnName: 'id_prod' })
  producto!: Producto;

  @ManyToOne(() => Envio, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'envio_id' })
  envio!: Envio;

  @Column({ type: 'int' })
  unidades!: number;

  // Escrito por una sola pasada: la del FIFO de rentabilidadService. Deliberadamente
  // no hay columna `estado`: un texto puede desmentir a la realidad, este numero sale
  // de la misma verdad que ya calcula costo_total_usd.
  @Column({ type: 'int', default: 0 })
  unidades_liberadas!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  monto!: number;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  monto_liberado!: number;

  // 1% de las ventas que consumieron SUS unidades. Se DEVENGAL al vender, en la misma
  // pasada FIFO que monto_liberado y por el mismo sincronizarInversiones, asi que no
  // puede desmentir a la liberacion. Es un gasto del negocio y NO se descuenta del
  // capital: el retiro paga el capital integro (ver comision_cobrada).
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  comision_devengada!: number;

  // UNICO campo de esta tabla que el FIFO NO reescribe. El devengo se recalcula en cada
  // pasada, pero un cobro es un hecho historico: si lo escribiera sincronizarInversiones
  // cada recálculo borraria los cobros. Solo lo escribe registrarCobroComision, cuando el
  // socio paga la comision al depositar el importe en QvaPay.
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  comision_cobrada!: number;

  @Column({ type: 'timestamp', nullable: true })
  fecha_cobro_comision!: Date | null;

  @Column({ type: 'timestamp' })
  fecha!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;
}
