import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from './user.entity';
import { randomBytes } from 'crypto';

@Entity('authentications')
export class Authentication {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  user_id!: number;

  @Column({ unique: true })
  token!: string;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;

  @ManyToOne(() => User, (user) => user.authentications)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @BeforeInsert()
  setDefaults(): void {
    if (!this.token || this.token.length === 0) {
      this.token = randomBytes(16).toString('hex');
    }
    if (!this.expires_at) {
      this.expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    }
  }
}
