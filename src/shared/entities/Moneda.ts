import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('Moneda')
export class Moneda {
  @PrimaryColumn({ type: 'varchar', length: 5 })
  codigo!: string;

  @Column({ type: 'varchar', length: 50 })
  nombre!: string;

   @Column({ type: 'numeric', precision: 10, scale: 4 })
  tasa_cambio!: number; 
}