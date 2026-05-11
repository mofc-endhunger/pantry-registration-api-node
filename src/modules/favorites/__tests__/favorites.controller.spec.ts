import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { FavoritesController } from '../favorites.controller';
import { FavoritesService } from '../favorites.service';
import { UsersService } from '../../users/users.service';

class FavoritesServiceMock implements Partial<FavoritesService> {
  getFavorites = jest.fn();
  addFavorite = jest.fn();
  removeFavorite = jest.fn();
}

class UsersServiceMock implements Partial<UsersService> {
  findDbUserIdByCognitoUuid = jest.fn();
}

function makeRequest(sub: string): Request {
  return { user: { id: sub } } as unknown as Request;
}

describe('FavoritesController', () => {
  let controller: FavoritesController;
  let favoritesService: FavoritesServiceMock;
  let usersService: UsersServiceMock;

  beforeEach(() => {
    favoritesService = new FavoritesServiceMock();
    usersService = new UsersServiceMock();
    controller = new FavoritesController(
      favoritesService as unknown as FavoritesService,
      usersService as unknown as UsersService,
    );
  });

  describe('GET /api/favorites', () => {
    it('calls getFavorites with the DB user ID resolved from JWT sub', async () => {
      usersService.findDbUserIdByCognitoUuid.mockResolvedValue(5);
      const expected = { favorites: [{ id: 1, event_id: 42, created_at: new Date() }] };
      favoritesService.getFavorites.mockResolvedValue(expected as any);

      const result = await controller.getFavorites(makeRequest('cognito-sub-abc'));

      expect(usersService.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('cognito-sub-abc');
      expect(favoritesService.getFavorites).toHaveBeenCalledWith(5);
      expect(result).toBe(expected);
    });

    it('throws ForbiddenException when user sub cannot be resolved to a DB user', async () => {
      usersService.findDbUserIdByCognitoUuid.mockResolvedValue(null);

      await expect(controller.getFavorites(makeRequest('unknown-sub'))).rejects.toThrow(
        ForbiddenException,
      );
      expect(favoritesService.getFavorites).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/favorites', () => {
    it('calls addFavorite with user ID and event_id, returns the created entity', async () => {
      usersService.findDbUserIdByCognitoUuid.mockResolvedValue(5);
      const now = new Date();
      const created = { id: 13, user_id: 5, event_id: 99, created_at: now };
      favoritesService.addFavorite.mockResolvedValue(created as any);

      const result = await controller.addFavorite(makeRequest('cognito-sub-abc'), {
        event_id: 99,
      } as any);

      expect(favoritesService.addFavorite).toHaveBeenCalledWith(5, 99);
      expect(result).toBe(created);
    });

    it('propagates ConflictException from the service', async () => {
      usersService.findDbUserIdByCognitoUuid.mockResolvedValue(5);
      favoritesService.addFavorite.mockRejectedValue(
        new ConflictException('Event already in favorites'),
      );

      await expect(
        controller.addFavorite(makeRequest('cognito-sub-abc'), { event_id: 99 } as any),
      ).rejects.toThrow(new ConflictException('Event already in favorites'));
    });
  });

  describe('DELETE /api/favorites/:eventId', () => {
    it('calls removeFavorite with user ID and eventId', async () => {
      usersService.findDbUserIdByCognitoUuid.mockResolvedValue(5);
      favoritesService.removeFavorite.mockResolvedValue(undefined);

      const result = await controller.removeFavorite(makeRequest('cognito-sub-abc'), 42);

      expect(favoritesService.removeFavorite).toHaveBeenCalledWith(5, 42);
      expect(result).toBeUndefined();
    });

    it('propagates NotFoundException from the service', async () => {
      usersService.findDbUserIdByCognitoUuid.mockResolvedValue(5);
      favoritesService.removeFavorite.mockRejectedValue(
        new NotFoundException('Favorite not found'),
      );

      await expect(controller.removeFavorite(makeRequest('cognito-sub-abc'), 9999)).rejects.toThrow(
        new NotFoundException('Favorite not found'),
      );
    });
  });
});
