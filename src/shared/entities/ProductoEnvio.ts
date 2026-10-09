import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Envio } from './Envio';
import { Producto } from './Producto';

@Entity('ProductoEnvio')
export class ProductoEnvio {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Envio, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'envio_id' })
  envio!: Envio;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id', referencedColumnName: 'id_prod' })
  producto!: Producto;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio_unitario!: number;
}