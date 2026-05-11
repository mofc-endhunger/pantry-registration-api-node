export class FavoriteResponseDto {
  id!: number;
  user_id!: number;
  event_id!: number;
  created_at!: Date;
}

export class FavoritesListResponseDto {
  favorites!: Pick<FavoriteResponseDto, 'id' | 'event_id' | 'created_at'>[];
}
