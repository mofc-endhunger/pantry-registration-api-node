import { IsBoolean, IsDateString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateTimeslotDto {
  @IsInt()
  @IsNotEmpty()
  event_id!: number;

  @IsDateString()
  start_at!: string;

  @IsDateString()
  end_at!: string;

  @IsInt()
  capacity!: number;

  @IsBoolean()
  is_active!: boolean;
}
