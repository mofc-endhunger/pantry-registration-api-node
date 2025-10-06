import { IsArray, IsInt, IsOptional, ArrayNotEmpty, ArrayUnique } from 'class-validator';

export class RegisterDto {
  @IsInt()
  event_id!: number;

  @IsOptional()
  @IsInt()
  timeslot_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  attendees?: number[]; // household_member_id list
}
