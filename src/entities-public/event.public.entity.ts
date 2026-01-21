import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('events', { database: 'freshtrak_public' })
export class PublicEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: number;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;
}
