import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEventFavorite } from '../../entities/user-event-favorite.entity';
import { FavoriteResponseDto, FavoritesListResponseDto } from './dto/favorite-response.dto';

interface MysqlError extends Error {
  code?: string;
  errno?: number;
}

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(UserEventFavorite)
    private readonly favoritesRepo: Repository<UserEventFavorite>,
  ) {}

  async getFavorites(userId: number): Promise<FavoritesListResponseDto> {
    const rows = await this.favoritesRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      select: ['id', 'eventId', 'createdAt'],
    });

    return {
      favorites: rows.map((row) => ({
        id: row.id,
        event_id: row.eventId,
        created_at: row.createdAt,
      })),
    };
  }

  async addFavorite(userId: number, eventId: number): Promise<FavoriteResponseDto> {
    try {
      const entity = this.favoritesRepo.create({ userId, eventId });
      const saved = await this.favoritesRepo.save(entity);
      return {
        id: saved.id,
        user_id: saved.userId,
        event_id: saved.eventId,
        created_at: saved.createdAt,
      };
    } catch (err) {
      const mysqlErr = err as MysqlError;
      if (mysqlErr.errno === 1062 || mysqlErr.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Event already in favorites');
      }
      throw err;
    }
  }

  async removeFavorite(userId: number, eventId: number): Promise<void> {
    const result = await this.favoritesRepo.delete({ userId, eventId });
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException('Favorite not found');
    }
  }
}
