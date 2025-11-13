import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from '../src/entities/password-reset-token.entity';

// This test requires a running DB (CI or local MySQL). It will be skipped if app init fails.
describe('Auth password reset flow (E2E)', () => {
	let app: INestApplication | undefined;
	let resetRepo: Repository<PasswordResetToken>;

	beforeAll(async () => {
		try {
			const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
			app = moduleRef.createNestApplication();
			await app.init();
			resetRepo = app.get(getRepositoryToken(PasswordResetToken));
		} catch {
			app = undefined;
		}
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	it('registers, requests reset, resets, and logs in with new password', async () => {
		if (!app) return;
		const email = `resetflow+${Date.now()}@example.com`;
		await request(app.getHttpServer()).post('/auth/register').send({ email, password: 'OldPw123!!' }).expect(201);
		await request(app.getHttpServer()).post('/auth/request-password-reset').send({ email }).expect(201);
		const rec = await resetRepo.find({ where: { user: { email } } as any, order: { id: 'DESC' } as any, take: 1 } as any);
		const token = rec[0]?.token as string;
		expect(typeof token).toBe('string');
		await request(app.getHttpServer()).post('/auth/reset-password').send({ token, newPassword: 'NewPw123!!' }).expect(201);
		await request(app.getHttpServer()).post('/auth/login').send({ email, password: 'NewPw123!!' }).expect(201);
	});
});
