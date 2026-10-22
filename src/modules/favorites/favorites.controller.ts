import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { FavoriteResponseDto, FavoritesListResponseDto } from './dto/favorite-response.dto';

@ApiTags('favorites')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(
    private readonly favoritesService: FavoritesService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveUserId(req: Request): Promise<number> {
    const sub = (req.user as { id: string }).id;
    const userId = await this.usersService.findDbUserIdByCognitoUuid(sub);
    if (!userId) throw new ForbiddenException('User not found');
    return userId;
  }

  @ApiOperation({ summary: 'List favorited events for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of favorites' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async getFavorites(@Req() req: Request): Promise<FavoritesListResponseDto> {
    const userId = await this.resolveUserId(req);
    return this.favoritesService.getFavorites(userId);
  }

  @ApiOperation({ summary: 'Add an event to favorites' })
  @ApiResponse({ status: 201, description: 'Favorite created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Event already in favorites' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async addFavorite(
    @Req() req: Request,
    @Body() dto: AddFavoriteDto,
  ): Promise<FavoriteResponseDto> {
    const userId = await this.resolveUserId(req);
    return this.favoritesService.addFavorite(userId, dto.event_id);
  }

  @ApiOperation({ summary: 'Remove an event from favorites' })
  @ApiResponse({ status: 204, description: 'Favorite removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':eventId')
  async removeFavorite(
    @Req() req: Request,
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<void> {
    const userId = await this.resolveUserId(req);
    return this.favoritesService.removeFavorite(userId, eventId);
  }
}
