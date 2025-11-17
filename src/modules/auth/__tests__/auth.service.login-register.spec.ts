import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../../../entities/user.entity';
import { PasswordResetToken } from '../../../entities/password-reset-token.entity';
import { Authentication } from '../../../entities/authentication.entity';
import { Credential } from '../../../entities/credential.entity';
import { MailerService } from '../mailer.service';
import { JwtService } from '@nestjs/jwt';

function createRepoMock<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
	return {
		find: jest.fn(),
		findOne: jest.fn(),
		findBy: jest.fn(),
		count: jest.fn(),
		create: jest.fn(),
		save: jest.fn(),
		remove: jest.fn(),
		update: jest.fn(),
		query: jest.fn(),
	} as any;
}

describe('AuthService - register/login', () => {
	let service: AuthService;
	let usersRepo: jest.Mocked<Repository<User>>;
	let credsRepo: jest.Mocked<Repository<Credential>>;
	let jwt: { sign: jest.Mock };

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
				{ provide: getRepositoryToken(PasswordResetToken), useValue: createRepoMock<PasswordResetToken>() },
				{ provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
				{ provide: getRepositoryToken(Credential), useValue: createRepoMock<Credential>() },
				{ provide: MailerService, useValue: { sendResetEmail: jest.fn() } },
				{ provide: JwtService, useValue: { sign: jest.fn(() => 'jwt-token') } },
			],
		}).compile();

		service = moduleRef.get(AuthService);
		usersRepo = moduleRef.get(getRepositoryToken(User));
		credsRepo = moduleRef.get(getRepositoryToken(Credential));
		jwt = moduleRef.get(JwtService) as any;
	});

	describe('register', () => {
		it('creates user and credential; rejects duplicate email', async () => {
			// duplicate
			usersRepo.findOne.mockResolvedValueOnce({ id: 1 } as any);
			await expect(service.register({ email: 'a@b.com', password: 'pw' } as any)).rejects.toThrow(
				'User already exists',
			);

			// happy path
			usersRepo.findOne.mockResolvedValueOnce(null as any);
			usersRepo.create.mockImplementation((u: any) => ({ id: 2, ...u }));
			usersRepo.save.mockResolvedValueOnce({ id: 2, email: 'a@b.com' } as any);
			credsRepo.create.mockImplementation((c: any) => c);
			credsRepo.save.mockResolvedValueOnce({ user_id: 2 } as any);

			const user = await service.register({ email: 'a@b.com', password: 'pw' } as any);
			expect(user.id).toBe(2);
			expect(credsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ user_id: 2 }));
		});
	});

	describe('login', () => {
		it('returns jwt on valid credentials', async () => {
			usersRepo.findOne.mockResolvedValueOnce({ id: 10, email: 'user@x.com' } as any);
			credsRepo.findOne.mockResolvedValueOnce({ user_id: 10, secret: '$hash' } as any);
			jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(true as any);

			const res = await service.login({ email: 'user@x.com', password: 'pw' } as any);
			expect(jwt.sign).toHaveBeenCalled();
			expect(res).toEqual({ access_token: 'jwt-token' });
		});

		it('throws Unauthorized when user not found', async () => {
			usersRepo.findOne.mockResolvedValueOnce(null as any);
			await expect(service.login({ email: 'missing@x.com', password: 'pw' } as any)).rejects.toThrow(
				'Invalid credentials',
			);
		});

		it('throws Unauthorized when credential missing', async () => {
			usersRepo.findOne.mockResolvedValueOnce({ id: 10 } as any);
			credsRepo.findOne.mockResolvedValueOnce(null as any);
			await expect(service.login({ email: 'user@x.com', password: 'pw' } as any)).rejects.toThrow(
				'Invalid credentials',
			);
		});

		it('throws Unauthorized when password mismatch', async () => {
			usersRepo.findOne.mockResolvedValueOnce({ id: 10 } as any);
			credsRepo.findOne.mockResolvedValueOnce({ user_id: 10, secret: '$hash' } as any);
			jest.spyOn(require('bcrypt'), 'compare').mockResolvedValueOnce(false as any);
			await expect(service.login({ email: 'user@x.com', password: 'pw' } as any)).rejects.toThrow(
				'Invalid credentials',
			);
		});
	});
});
