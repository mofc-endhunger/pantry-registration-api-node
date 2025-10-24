import { IsInt, IsOptional, IsString, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHouseholdMemberDto {
  @IsOptional()
  @IsInt()
  id?: number | null;

  @IsOptional()
  @IsInt()
  household_id?: number | null;

  @IsOptional()
  @IsString()
  user_id?: string | null;

  @IsOptional()
  @IsInt()
  number?: number | null;

  @IsOptional()
  @IsString()
  first_name?: string | null;

  @IsOptional()
  @IsString()
  middle_name?: string | null;

  @IsOptional()
  @IsString()
  last_name?: string | null;

  @IsOptional()
  @IsString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsInt()
  is_head_of_household?: number | null;

  @IsOptional()
  @IsInt()
  is_active?: number | null;

  @IsOptional()
  @IsString()
  added_by?: string | null;

  @IsOptional()
  @IsInt()
  gender_id?: number | null;

  @IsOptional()
  @IsInt()
  suffix_id?: number | null;

  @IsOptional()
  @IsString()
  created_at?: string | null;

  @IsOptional()
  @IsString()
  updated_at?: string | null;
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
  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  @IsInt()
  household_id?: number;

  @IsOptional()
  @IsInt()
  number?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  identification_code?: string;

  @IsOptional()
  @IsInt()
  added_by?: number;

  @IsOptional()
  @IsInt()
  last_updated_by?: number;

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

  // Address fields matching DB schema
  @IsOptional()
  @IsString()
  line_1?: string | null;

  @IsOptional()
  @IsString()
  line_2?: string | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  state?: string | null;

  @IsOptional()
  @IsString()
  zip_code?: string | null;

  @IsOptional()
  @IsString()
  zip_4?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateHouseholdMemberDto)
  members?: UpdateHouseholdMemberDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateHouseholdCountsDto)
  counts?: UpdateHouseholdCountsDto;
}
