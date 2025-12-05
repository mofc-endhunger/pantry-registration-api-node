import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert, BeforeUpdate, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('identities')
export class Identity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column()
  provider_uid!: string;

  @Column()
  provider_type!: string;

  @Column()
  auth_hash!: string;

  @Column({ type: 'datetime' })
  created_at!: Date;

  @Column({ type: 'datetime' })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.identities)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @BeforeInsert()
  setCreationDates(): void {
    const now = new Date();
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setUpdateDate(): void {
    this.updated_at = new Date();
  }
}
