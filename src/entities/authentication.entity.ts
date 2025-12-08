import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
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

  @Column({ type: 'datetime' })
  created_at!: Date;

  @Column({ type: 'datetime' })
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
    const now = new Date();
    this.created_at = now;
    this.updated_at = now;
  }

  @BeforeUpdate()
  setUpdateDate(): void {
    this.updated_at = new Date();
  }
}
