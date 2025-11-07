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

describe('AuthService.registerGuest', () => {
	let service: AuthService;
	let usersRepo: jest.Mocked<Repository<User>>;
	let authRepo: jest.Mocked<Repository<Authentication>>;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				AuthService,
				{ provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
				{ provide: getRepositoryToken(PasswordResetToken), useValue: createRepoMock<PasswordResetToken>() },
				{ provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
				{ provide: getRepositoryToken(Credential), useValue: createRepoMock<Credential>() },
				{ provide: MailerService, useValue: { sendResetEmail: jest.fn() } },
				{ provide: JwtService, useValue: { sign: jest.fn(() => 'jwt') } },
			],
		}).compile();
		service = moduleRef.get(AuthService);
		usersRepo = moduleRef.get(getRepositoryToken(User));
		authRepo = moduleRef.get(getRepositoryToken(Authentication));
		usersRepo.create.mockImplementation((x: any) => x);
		authRepo.create.mockImplementation((x: any) => x);
		usersRepo.save.mockImplementation(async (u: any) => { u.id = 1; return u; });
		authRepo.save.mockImplementation(async (a: any) => { a.id = 2; return a; });
	});

	it('creates guest user and authentication with token', async () => {
		// save mocks set ids above
		const res = await service.registerGuest();
		expect(usersRepo.save).toHaveBeenCalledWith(expect.objectContaining({ user_type: 'guest' }));
		expect(authRepo.save).toHaveBeenCalledWith(expect.objectContaining({ user_id: expect.any(Number), token: expect.any(String) }));
		expect(res).toEqual(expect.objectContaining({ id: expect.any(Number), token: expect.any(String) }));
	});
});
