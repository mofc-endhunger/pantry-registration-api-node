import { IsInt, IsOptional, IsString, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHouseholdMemberDto {
  @IsInt()
  id: number;

  @IsInt()
  household_id: number;

  @IsString()
  user_id: string;

  @IsOptional()
  @IsInt()
  number?: number;

  @IsString()
  first_name: string;

  @IsOptional()
  @IsString()
  middle_name?: string;

  @IsString()
  last_name: string;

  @IsString()
  date_of_birth: string;

  @IsInt()
  is_head_of_household: number;

  @IsInt()
  is_active: number;

  @IsString()
  added_by: string;

  @IsOptional()
  @IsInt()
  gender_id?: number;

  @IsOptional()
  @IsInt()
  suffix_id?: number;

  @IsOptional()
  @IsString()
  created_at?: string;

  @IsOptional()
  @IsString()
  updated_at?: string;
}

export class UpdateHouseholdCountsDto {
  @IsInt()
  seniors: number;

  @IsInt()
  adults: number;

  @IsInt()
  children: number;

  @IsInt()
  total: number;
}

export class UpdateHouseholdDto {
  @IsInt()
  id: number;

  @IsInt()
  number: number;

  @IsString()
  name: string;

  @IsString()
  identification_code: string;

  @IsInt()
  added_by: number;

  @IsInt()
  last_updated_by: number;

  @IsOptional()
  @IsInt()
  deleted_by?: number;

  @IsOptional()
  @IsString()
  deleted_on?: string;

  @IsOptional()
  @IsString()
  created_at?: string;

  @IsOptional()
  @IsString()
  updated_at?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateHouseholdMemberDto)
  members: UpdateHouseholdMemberDto[];

  @IsObject()
  @ValidateNested()
  @Type(() => UpdateHouseholdCountsDto)
  counts: UpdateHouseholdCountsDto;
}
