import { IsInt, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class AddFavoriteDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  event_id!: number;
}
