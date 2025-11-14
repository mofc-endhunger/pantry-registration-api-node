import { IsOptional, IsString, IsBoolean, IsDateString, IsInt } from 'class-validator';

export class UpsertMemberDto {
  @IsOptional()
  @IsString()
  first_name?: string;
  @IsOptional()
  @IsString()
  middle_name?: string;
  @IsOptional()
  @IsString()
  last_name?: string;
  // phone/email are not part of the current schema
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
  @IsOptional()
  @IsBoolean()
  is_head_of_household?: boolean;
  @IsOptional()
  @IsInt()
  gender_id?: number;
  @IsOptional()
  @IsInt()
  suffix_id?: number;
}
