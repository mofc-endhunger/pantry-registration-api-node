import { IsString, IsNotEmpty } from 'class-validator';

export class RequestPasswordResetDto {
  @IsString()
  @IsNotEmpty()
  email!: string;
}
