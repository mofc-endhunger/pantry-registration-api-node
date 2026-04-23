import { IsOptional, IsInt, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreatedByMeQueryDto {
  @ApiPropertyOptional({ description: 'Filter by event ID' })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? undefined : parseInt(String(value), 10),
  )
  event_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by status (confirmed, waitlisted, cancelled, checked_in)',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter registrations created on or after this date (ISO)' })
  @IsOptional()
  @IsString()
  from_date?: string;

  @ApiPropertyOptional({ description: 'Filter registrations created on or before this date (ISO)' })
  @IsOptional()
  @IsString()
  to_date?: string;

  @ApiPropertyOptional({ description: 'Max results to return (default 50)', default: 50 })
  @IsOptional()
  @IsInt()
  @Transform(({ value }) =>
    value === '' || value === null || value === undefined ? 50 : parseInt(String(value), 10),
  )
  limit?: number;
}
