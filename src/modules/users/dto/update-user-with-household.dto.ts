import { IsOptional, IsString, IsBoolean, IsInt } from 'class-validator';
import { UpdateHouseholdDto } from '../../households/dto/update-household.dto';

export class UpdateUserWithHouseholdDto extends UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  declare address_line_1?: string;

  @IsOptional()
  @IsString()
  declare address_line_2?: string;

  @IsOptional()
  @IsString()
  declare city?: string;

  @IsOptional()
  @IsString()
  declare state?: string;

  @IsOptional()
  @IsString()
  declare zip_code?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  permission_to_email?: boolean;

  @IsOptional()
  @IsBoolean()
  permission_to_text?: boolean;

  // Optional snapshot counts (used when syncing household counts to user)
  @IsOptional()
  @IsInt()
  seniors_in_household?: number;

  @IsOptional()
  @IsInt()
  adults_in_household?: number;

  @IsOptional()
  @IsInt()
  children_in_household?: number;

  // Optional alternative aliases that may be provided by clients
  @IsOptional()
  @IsInt()
  seniors?: number;

  @IsOptional()
  @IsInt()
  adults?: number;

  @IsOptional()
  @IsInt()
  children?: number;
}
