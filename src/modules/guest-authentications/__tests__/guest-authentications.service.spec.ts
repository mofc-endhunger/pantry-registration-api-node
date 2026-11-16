import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { GuestAuthenticationsService } from '../guest-authentications.service';
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

describe('GuestAuthenticationsService', () => {
  let service: GuestAuthenticationsService;
  let userRepo: jest.Mocked<Repository<User>>;
  let authRepo: jest.Mocked<Repository<Authentication>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GuestAuthenticationsService,
        { provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
        { provide: getRepositoryToken(Authentication), useValue: createRepoMock<Authentication>() },
      ],
    }).compile();
    service = moduleRef.get(GuestAuthenticationsService);
    userRepo = moduleRef.get(getRepositoryToken(User));
    authRepo = moduleRef.get(getRepositoryToken(Authentication));
  });

  it('createGuest generates unique code (retries on collision) and auth token', async () => {
    // First code collides, second passes
    userRepo.findOne.mockResolvedValueOnce({ id: 1 } as any).mockResolvedValueOnce(null as any);
    userRepo.create.mockImplementation((u: any) => ({ id: 5, ...u }));
    authRepo.create.mockImplementation((a: any) => a);
    // Stub randomBytes to deterministic hex outputs
    const crypto = require('crypto');
    jest.spyOn(crypto, 'randomBytes').mockImplementationOnce(() => Buffer.from('aaaaaa', 'hex'));
    jest.spyOn(crypto, 'randomBytes').mockImplementationOnce(() => Buffer.from('bbbbbb', 'hex'));
    // token 16 bytes
    jest
      .spyOn(crypto, 'randomBytes')
      .mockImplementationOnce(() => Buffer.from('cccccccccccccccccccccccccccccccc', 'hex'));

    const res = await service.createGuest({ phone: '555' } as any);
    expect(userRepo.save).toHaveBeenCalled();
    expect(authRepo.save).toHaveBeenCalled();
    expect(res.token).toBeDefined();
  });

  it('updateGuestByToken throws when token not found', async () => {
    authRepo.findOne.mockResolvedValueOnce(null as any);
    await expect(service.updateGuestByToken('bad', { phone: '1' } as any)).rejects.toThrow(
      'Invalid guest token',
    );
  });

  it('updateGuestByToken updates provided fields and respects no_email/no_phone flags', async () => {
    const user: any = { id: 9, phone: '000', email: 'a@b.com' };
    authRepo.findOne.mockResolvedValueOnce({ user } as any);
    await service.updateGuestByToken('tok', {
      phone: '111',
      no_email: true,
      email: 'ignored@x.com',
      first_name: 'Jane',
    } as any);
    expect(user.phone).toBe('111');
    expect(user.email).toBeNull();
    expect(user.first_name).toBe('Jane');
    expect(userRepo.save).toHaveBeenCalledWith(user);
  });

  describe('homeless (SUP-1141)', () => {
    it('stores no street and the Homeless marker, keeping city, state and ZIP', async () => {
      const user: any = { id: 9, address_line_1: '1 Old Rd', address_line_2: null };
      authRepo.findOne.mockResolvedValueOnce({ user } as any);
      await service.updateGuestByToken('tok', {
        homeless: true,
        address_line_1: '123 Main St',
        city: 'Columbus',
        state: 'OH',
        zip_code: '43215',
      } as any);
      expect(user.address_line_1).toBeNull();
      expect(user.address_line_2).toBe('Homeless');
      expect(user.city).toBe('Columbus');
      expect(user.zip_code).toBe('43215');
    });

    it('clears the marker when the box is un-ticked and an address is given', async () => {
      const user: any = { id: 9, address_line_1: null, address_line_2: 'Homeless' };
      authRepo.findOne.mockResolvedValueOnce({ user } as any);
      await service.updateGuestByToken('tok', {
        homeless: false,
        address_line_1: '123 Main St',
      } as any);
      expect(user.address_line_1).toBe('123 Main St');
      expect(user.address_line_2).toBeNull();
    });

    it('leaves the address alone when the flag is not sent', async () => {
      const user: any = { id: 9, address_line_1: null, address_line_2: 'Homeless' };
      authRepo.findOne.mockResolvedValueOnce({ user } as any);
      await service.updateGuestByToken('tok', { first_name: 'Jane' } as any);
      expect(user.address_line_2).toBe('Homeless');
    });
  });
});
