import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { AuthCallbacksService } from '../auth-callbacks.service';
import { Identity } from '../../../entities/identity.entity';
import { User } from '../../../entities/user.entity';
import { Authentication } from '../../../entities/authentication.entity';

function createRepoMock<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
	return {
		find: jest.fn(),
		findOne: jest.fn(),
		findBy: jest.fn(),
		findOneBy: jest.fn(),
		count: jest.fn(),
		create: jest.fn(),
		save: jest.fn(),
		remove: jest.fn(),
		update: jest.fn(),
		query: jest.fn(),
	} as any;
}

describe('AuthCallbacksService', () => {
	let service: AuthCallbacksService;
	let identityRepo: jest.Mocked<Repository<Identity>>;
	let userRepo: jest.Mocked<Repository<User>>;
	let authRepo: jest.Mocked<Repository<Authentication>>;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				AuthCallbacksService,
				{ provide: getRepositoryToken(Identity), useValue: createRepoMock<Identity>() },
				{ provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
				{ provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
			],
		}).compile();
		service = moduleRef.get(AuthCallbacksService);
		identityRepo = moduleRef.get(getRepositoryToken(Identity));
		userRepo = moduleRef.get(getRepositoryToken(User));
		authRepo = moduleRef.get(getRepositoryToken(Authentication));
		userRepo.create.mockImplementation((x: any) => x);
		identityRepo.create.mockImplementation((x: any) => x);
		authRepo.create.mockImplementation((x: any) => x);

		// By default, allow token verification
		jest.spyOn(service as any, 'verifyFacebookToken').mockResolvedValue(true);
	});

	it('throws when token verification fails', async () => {
		(service as any).verifyFacebookToken.mockResolvedValueOnce(false);
		await expect(service.facebookCallback({ userID: 'u', graphDomain: 'fb', accessToken: 'bad' } as any)).rejects.toThrow('Invalid Facebook token');
	});

	it('uses existing identity and loads user', async () => {
		identityRepo.findOne.mockResolvedValueOnce({ user_id: 5 } as any);
		userRepo.findOne.mockResolvedValueOnce({ id: 5 } as any);
		authRepo.save.mockResolvedValueOnce({ id: 9 } as any);
		const res = await service.facebookCallback({ userID: 'u1', graphDomain: 'fb', accessToken: 't' } as any);
		expect(authRepo.save).toHaveBeenCalled();
		expect((res as any).token).toBeDefined();
	});

	it('throws when identity exists but user not found', async () => {
		identityRepo.findOne.mockResolvedValueOnce({ user_id: 7 } as any);
		userRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.facebookCallback({ userID: 'u2', graphDomain: 'fb', accessToken: 't' } as any)).rejects.toThrow('User not found for identity');
	});

	it('creates user+identity when not found and retries code on collision', async () => {
		identityRepo.findOne.mockResolvedValueOnce(null as any);
		// generateUniqueCode loops until userRepo.findOne returns null
		userRepo.findOne
			.mockResolvedValueOnce({ id: 1 } as any) // collision
			.mockResolvedValueOnce(null as any);
		userRepo.save.mockResolvedValueOnce({ id: 10 } as any);
		identityRepo.save.mockResolvedValueOnce({ id: 20 } as any);
		authRepo.save.mockResolvedValueOnce({ id: 30, token: 'tok' } as any);

		const res = await service.facebookCallback({ userID: 'u3', graphDomain: 'fb', accessToken: 't' } as any);
		expect(userRepo.save).toHaveBeenCalled();
		expect(identityRepo.save).toHaveBeenCalled();
		expect(authRepo.save).toHaveBeenCalled();
		expect((res as any).token).toBeDefined();
	});
});
