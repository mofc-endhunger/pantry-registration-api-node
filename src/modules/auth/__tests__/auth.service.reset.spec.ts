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
		delete: jest.fn(),
		query: jest.fn(),
	} as any;
}

describe('AuthService.resetPassword', () => {
	let service: AuthService;
	let usersRepo: jest.Mocked<Repository<User>>;
	let resetRepo: jest.Mocked<Repository<PasswordResetToken>>;
	let credRepo: jest.Mocked<Repository<Credential>>;

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
		resetRepo = moduleRef.get(getRepositoryToken(PasswordResetToken));
		credRepo = moduleRef.get(getRepositoryToken(Credential));
	});

	it('throws for missing token', async () => {
		resetRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.resetPassword({ token: 'bad', newPassword: 'x' } as any)).rejects.toThrow('Invalid or expired token');
	});

	it('throws for expired token', async () => {
		resetRepo.findOne.mockResolvedValueOnce({ id: 1, user_id: 1, expires_at: new Date(Date.now() - 1000) } as any);
		await expect(service.resetPassword({ token: 't', newPassword: 'x' } as any)).rejects.toThrow('Invalid or expired token');
	});

	it('throws if user not found', async () => {
		resetRepo.findOne.mockResolvedValueOnce({ id: 1, user_id: 9, expires_at: new Date(Date.now() + 1000) } as any);
		usersRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.resetPassword({ token: 't', newPassword: 'x' } as any)).rejects.toThrow('User not found');
	});

	it('creates credential if missing and deletes token on success', async () => {
		resetRepo.findOne.mockResolvedValueOnce({ id: 2, user_id: 3, expires_at: new Date(Date.now() + 1000) } as any);
		usersRepo.findOne.mockResolvedValueOnce({ id: 3, email: 'u@example.com' } as any);
		credRepo.findOne.mockResolvedValueOnce(null as any);
		credRepo.create.mockImplementation((x: any) => x);
		credRepo.save.mockResolvedValueOnce({ id: 10 } as any);
		(resetRepo.delete as jest.Mock).mockResolvedValueOnce({} as any);
		const res = await service.resetPassword({ token: 'tok', newPassword: 'NewPass123' } as any);
		expect(credRepo.save).toHaveBeenCalledWith(expect.objectContaining({ user_id: 3, secret: expect.any(String) }));
		expect(resetRepo.delete).toHaveBeenCalledWith({ id: 2 });
		expect(res).toEqual({ message: 'Password reset successful' });
	});
});
