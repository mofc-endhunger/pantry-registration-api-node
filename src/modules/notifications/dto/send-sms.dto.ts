import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class SendSmsDto {
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'from_phone_number must be E.164 format' })
  from_phone_number?: string;

  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'to_phone_number must be E.164 format' })
  to_phone_number!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
