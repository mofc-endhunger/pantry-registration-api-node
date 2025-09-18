import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateHouseholdDto {
  // Primary member inline fields (used to create the head of household)
  @IsOptional() @IsString()
  primary_first_name?: string;
  @IsOptional() @IsString()
  primary_last_name?: string;
  @IsOptional() @IsString()
  primary_phone?: string;
  @IsOptional() @IsString()
  primary_email?: string;
  @IsOptional() @IsDateString()
  primary_date_of_birth?: string;
}

