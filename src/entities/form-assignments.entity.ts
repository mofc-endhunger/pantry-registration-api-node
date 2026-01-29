import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('form_assignments')
export class FormAssignment {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ type: 'int' })
  form_id!: number;

  @Column({ type: 'int' })
  hierarchy_type_id!: number; // e.g., 1=org, 2=location, 3=event

  @Column({ type: 'int' })
  hierarchy_value!: number; // the id value for the selected hierarchy type
}
