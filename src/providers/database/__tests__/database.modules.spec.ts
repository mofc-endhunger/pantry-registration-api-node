import { DatabaseModule } from '../database.module';
import { PublicDatabaseModule } from '../public-database.module';

describe('Database Modules', () => {
	it('DatabaseModule is defined', () => {
		expect(DatabaseModule).toBeDefined();
	});

	it('PublicDatabaseModule is defined', () => {
		expect(PublicDatabaseModule).toBeDefined();
	});
});
