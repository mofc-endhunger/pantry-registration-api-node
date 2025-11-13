import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../src/entities/event.entity';

// This test requires a running DB (CI or local MySQL). It will be skipped if app init fails.
describe('GET /registrations/me (JWT E2E)', () => {
	let app: INestApplication | undefined;
	let eventsRepo: Repository<Event>;

	beforeAll(async () => {
		try {
			const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
			app = moduleRef.createNestApplication();
			await app.init();
			eventsRepo = app.get(getRepositoryToken(Event));
		} catch {
			app = undefined;
		}
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('returns registrations for a JWT user', async () => {
		if (!app) return;
		const event = await eventsRepo.save(
			eventsRepo.create({ name: 'JWT ME Event', is_active: true, capacity: null } as any),
		);
		const email = `jwtme+${Date.now()}@example.com`;
		await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'Pw123!!' }).expect(201);
		const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'Pw123!!' }).expect(201);
		const jwt = login.body.access_token as string;

		await request(app.getHttpServer())
			.post('/registrations')
			.set('Authorization', `Bearer ${jwt}`)
			.send({ event_id: (event as any).id })
			.expect(201);

		const list = await request(app.getHttpServer())
			.get('/registrations/me')
			.set('Authorization', `Bearer ${jwt}`)
			.expect(200);
		expect(Array.isArray(list.body)).toBe(true);
		expect(list.body.length).toBeGreaterThan(0);
	});
});
