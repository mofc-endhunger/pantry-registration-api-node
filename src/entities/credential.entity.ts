import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert, BeforeUpdate, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('credentials')
export class Credential {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint', nullable: true })
  user_id!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, default: null })
  token!: string | null;

  @Column({ nullable: true })
  secret!: string;

  @Column({ nullable: true })
  expires!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expires_at!: Date;

  @Column({ type: 'datetime' })
  created_at!: Date;

  @Column({ type: 'datetime' })
  updated_at!: Date;

  @ManyToOne(() => User)
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
