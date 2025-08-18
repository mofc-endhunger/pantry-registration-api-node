import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserDetail } from './user-detail.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  identification_code: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  credential_id: number;

  @Column({ nullable: true })
  password_digest: string;

  @Column({ type: 'enum', enum: ['guest', 'customer'] })
  user_type: 'guest' | 'customer';

  @OneToOne(() => UserDetail, (detail) => detail.user)
  @JoinColumn()
  user_detail: UserDetail;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // TODO: Add relations for identities, authentications, reservations, credential
}
