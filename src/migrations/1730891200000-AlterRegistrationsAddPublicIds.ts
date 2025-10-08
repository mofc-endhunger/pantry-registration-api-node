import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterRegistrationsAddPublicIds1730891200000 implements MigrationInterface {
  name = 'AlterRegistrationsAddPublicIds1730891200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE registrations ADD COLUMN public_event_slot_id INT UNSIGNED NULL DEFAULT NULL AFTER created_by, ADD COLUMN public_event_date_id INT UNSIGNED NULL DEFAULT NULL AFTER public_event_slot_id',
    );
    await queryRunner.query(
      'CREATE INDEX ix_regs_public_slot ON registrations (public_event_slot_id)',
    );
    await queryRunner.query(
      'CREATE INDEX ix_regs_public_date ON registrations (public_event_date_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE registrations DROP COLUMN public_event_date_id');
    await queryRunner.query('ALTER TABLE registrations DROP COLUMN public_event_slot_id');
  }
}
