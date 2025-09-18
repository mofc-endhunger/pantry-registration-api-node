import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';

export class UpsertMemberDto {
  @IsOptional() @IsString()
  first_name?: string;
  @IsOptional() @IsString()
  middle_name?: string;
  @IsOptional() @IsString()
  last_name?: string;
  @IsOptional() @IsString()
  suffix?: string;
  @IsOptional() @IsString()
  gender?: string;
  @IsOptional() @IsString()
  phone?: string;
  @IsOptional() @IsString()
  email?: string;
  @IsOptional() @IsDateString()
  date_of_birth?: string;
  @IsOptional() @IsBoolean()
  is_active?: boolean;
  @IsOptional() @IsBoolean()
  is_head_of_household?: boolean;
}

