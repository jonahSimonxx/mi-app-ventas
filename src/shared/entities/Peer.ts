import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('Peer')
export class Peer {
  @PrimaryGeneratedColumn('increment')
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nombre!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion!: string;
}