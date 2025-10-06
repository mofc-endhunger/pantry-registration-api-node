import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsAndRegistrations1730890000000 implements MigrationInterface {
  name = 'CreateEventsAndRegistrations1730890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
		CREATE TABLE IF NOT EXISTS events (
		  id BIGINT PRIMARY KEY AUTO_INCREMENT,
		  name VARCHAR(255) NOT NULL,
		  description TEXT NULL,
		  start_at DATETIME NULL,
		  end_at DATETIME NULL,
		  capacity INT NULL,
		  is_active TINYINT(1) NOT NULL DEFAULT 1,
		  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);

    await queryRunner.query(`
		CREATE TABLE IF NOT EXISTS event_timeslots (
		  id BIGINT PRIMARY KEY AUTO_INCREMENT,
		  event_id BIGINT NOT NULL,
		  start_at DATETIME NOT NULL,
		  end_at DATETIME NOT NULL,
		  capacity INT NULL,
		  is_active TINYINT(1) NOT NULL DEFAULT 1,
		  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		  INDEX idx_event_timeslots_event_id (event_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);

    await queryRunner.query(`
		CREATE TABLE IF NOT EXISTS registrations (
		  id BIGINT PRIMARY KEY AUTO_INCREMENT,
		  event_id BIGINT NOT NULL,
		  household_id BIGINT NOT NULL,
		  timeslot_id BIGINT NULL,
		  status VARCHAR(32) NOT NULL,
		  created_by BIGINT NOT NULL,
		  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		  INDEX idx_registrations_event_id (event_id),
		  INDEX idx_registrations_household_id (household_id),
		  INDEX idx_registrations_timeslot_id (timeslot_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);

    await queryRunner.query(`
		CREATE TABLE IF NOT EXISTS registration_attendees (
		  id BIGINT PRIMARY KEY AUTO_INCREMENT,
		  registration_id BIGINT NOT NULL,
		  household_member_id BIGINT NOT NULL,
		  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		  INDEX idx_reg_att_registration_id (registration_id),
		  INDEX idx_reg_att_household_member_id (household_member_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
		`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS registration_attendees`);
    await queryRunner.query(`DROP TABLE IF EXISTS registrations`);
    await queryRunner.query(`DROP TABLE IF EXISTS event_timeslots`);
    await queryRunner.query(`DROP TABLE IF EXISTS events`);
  }
}
