import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserEventFavorites1747000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_event_favorites (
        id         INT      NOT NULL AUTO_INCREMENT,
        user_id    BIGINT   NOT NULL,
        event_id   INT      NOT NULL,
        created_at DATETIME NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id),
        UNIQUE KEY uq_user_event (user_id, event_id),
        CONSTRAINT fk_fav_user FOREIGN KEY (user_id)
          REFERENCES users(id) ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS user_event_favorites`);
  }
}
