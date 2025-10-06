import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckinAudits1730890500000 implements MigrationInterface {
  name = 'CreateCheckinAudits1730890500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS checkin_audits (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        registration_id BIGINT NOT NULL,
        created_by BIGINT NOT NULL,
        attendees_count INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_checkin_reg_id (registration_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS checkin_audits');
  }
}
