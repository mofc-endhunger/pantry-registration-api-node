import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('authentications')
export class Authentication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column({ unique: true })
  token!: string;

  @Column({ type: 'datetime' })
  expires_at!: Date;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.authentications)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
