import { IsArray, IsInt, IsNotEmpty } from 'class-validator';

export class CheckInDto {
  @IsInt()
  @IsNotEmpty()
  registration_id!: number;

  @IsArray()
  @IsInt({ each: true })
  attendee_ids!: number[];
}
