import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsDateString()
  start_at?: string | null;

  @IsOptional()
  @IsDateString()
  end_at?: string | null;

  @IsOptional()
  @IsInt()
  capacity?: number | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
