import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('password_reset_tokens')
export class PasswordResetToken {
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

  @ManyToOne(() => User)
  user!: User;
}
