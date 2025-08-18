import { IsString, IsOptional } from 'class-validator';

export class CreateAuthCallbackDto {
  @IsString()
  provider!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  accessToken?: string;
}
