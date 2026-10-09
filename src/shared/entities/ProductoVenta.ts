import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Venta } from './Venta';
import { Producto } from './Producto';

@Entity('ProductoVenta')
export class ProductoVenta {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @ManyToOne(() => Venta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venta_id' })
  venta!: Venta;

  @ManyToOne(() => Producto, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'producto_id', referencedColumnName: 'id_prod' })
  producto!: Producto;

  @Column({ type: 'int' })
  cantidad!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio_unitario!: number;
}
