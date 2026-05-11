import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { UserEventFavorite } from '../../../entities/user-event-favorite.entity';
import { FavoritesService } from '../favorites.service';

function createRepoMock<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  } as any;
}

describe('FavoritesService', () => {
  let service: FavoritesService;
  let repo: jest.Mocked<Repository<UserEventFavorite>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        FavoritesService,
        {
          provide: getRepositoryToken(UserEventFavorite),
          useValue: createRepoMock<UserEventFavorite>(),
        },
      ],
    }).compile();

    service = moduleRef.get(FavoritesService);
    repo = moduleRef.get(getRepositoryToken(UserEventFavorite));
  });

  describe('getFavorites', () => {
    it('returns mapped favorites list when rows exist', async () => {
      const now = new Date();
      repo.find.mockResolvedValue([
        { id: 1, userId: 5, eventId: 42, createdAt: now } as UserEventFavorite,
        { id: 2, userId: 5, eventId: 18, createdAt: now } as UserEventFavorite,
      ]);

      const result = await service.getFavorites(5);

      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 5 },
        order: { createdAt: 'DESC' },
        select: ['id', 'eventId', 'createdAt'],
      });
      expect(result.favorites).toHaveLength(2);
      expect(result.favorites[0]).toEqual({ id: 1, event_id: 42, created_at: now });
      expect(result.favorites[1]).toEqual({ id: 2, event_id: 18, created_at: now });
    });

    it('returns empty favorites list when user has no favorites', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.getFavorites(5);

      expect(result).toEqual({ favorites: [] });
    });
  });

  describe('addFavorite', () => {
    it('inserts and returns the created entity on success', async () => {
      const now = new Date();
      const entity = { userId: 5, eventId: 99 } as UserEventFavorite;
      const saved = { id: 13, userId: 5, eventId: 99, createdAt: now } as UserEventFavorite;

      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(saved);

      const result = await service.addFavorite(5, 99);

      expect(repo.create).toHaveBeenCalledWith({ userId: 5, eventId: 99 });
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual({ id: 13, user_id: 5, event_id: 99, created_at: now });
    });

    it('throws ConflictException when DB returns a duplicate key error (ER_DUP_ENTRY)', async () => {
      repo.create.mockReturnValue({ userId: 5, eventId: 99 } as UserEventFavorite);
      const dupError = Object.assign(new Error('Duplicate entry'), {
        code: 'ER_DUP_ENTRY',
        errno: 1062,
      });
      repo.save.mockRejectedValue(dupError);

      await expect(service.addFavorite(5, 99)).rejects.toThrow(
        new ConflictException('Event already in favorites'),
      );
    });

    it('throws ConflictException when DB error has errno 1062', async () => {
      repo.create.mockReturnValue({ userId: 5, eventId: 99 } as UserEventFavorite);
      const dupError = Object.assign(new Error('Duplicate entry'), { errno: 1062 });
      repo.save.mockRejectedValue(dupError);

      await expect(service.addFavorite(5, 99)).rejects.toThrow(ConflictException);
    });

    it('re-throws unexpected DB errors', async () => {
      repo.create.mockReturnValue({ userId: 5, eventId: 99 } as UserEventFavorite);
      const unexpectedError = new Error('Connection lost');
      repo.save.mockRejectedValue(unexpectedError);

      await expect(service.addFavorite(5, 99)).rejects.toThrow('Connection lost');
    });
  });

  describe('removeFavorite', () => {
    it('resolves void when a row is deleted (affected = 1)', async () => {
      repo.delete.mockResolvedValue({ affected: 1 } as any);

      await expect(service.removeFavorite(5, 42)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith({ userId: 5, eventId: 42 });
    });

    it('throws NotFoundException when no row is found (affected = 0)', async () => {
      repo.delete.mockResolvedValue({ affected: 0 } as any);

      await expect(service.removeFavorite(5, 9999)).rejects.toThrow(
        new NotFoundException('Favorite not found'),
      );
    });
  });
});
