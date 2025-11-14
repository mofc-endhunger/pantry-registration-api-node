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

describe('AuthService - requestPasswordReset', () => {
  let service: AuthService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let resetRepo: jest.Mocked<Repository<PasswordResetToken>>;
  let mailer: { sendResetEmail: jest.Mock };

  beforeEach(async () => {
    process.env.NODE_ENV = 'test';
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: createRepoMock<PasswordResetToken>(),
        },
        { provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
        { provide: getRepositoryToken(Credential), useValue: createRepoMock<Credential>() },
        { provide: MailerService, useValue: { sendResetEmail: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn(() => 'jwt') } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    usersRepo = moduleRef.get(getRepositoryToken(User));
    resetRepo = moduleRef.get(getRepositoryToken(PasswordResetToken));
    mailer = moduleRef.get(MailerService) as any;
  });

  it('returns generic message if email not found', async () => {
    usersRepo.findOne.mockResolvedValue(null as any);
    const res = await service.requestPasswordReset({ email: 'missing@example.com' });
    expect(res).toEqual({ message: 'If the email exists, a reset link will be sent.' });
    expect(resetRepo.save).not.toHaveBeenCalled();
    expect(mailer.sendResetEmail).not.toHaveBeenCalled();
  });

  it('saves reset token and sends email; ignores send errors in test', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 1, email: 'user@example.com' } as any);
    resetRepo.save.mockResolvedValue({ id: 123 } as any);
    (mailer.sendResetEmail as jest.Mock).mockRejectedValueOnce(new Error('smtp down'));

    const res = await service.requestPasswordReset({ email: 'user@example.com' });

    expect(resetRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 1,
        token: expect.any(String),
        expires_at: expect.any(Date),
      }),
    );
    expect(mailer.sendResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));
    expect(res).toEqual({ message: 'If the email exists, a reset link will be sent.' });
  });
});
