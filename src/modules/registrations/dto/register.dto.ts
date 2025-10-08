import { IsArray, IsInt, IsOptional, ArrayNotEmpty, ArrayUnique } from 'class-validator';

export class RegisterDto {
  @IsInt()
  event_id!: number;

  @IsOptional()
  @IsInt()
  timeslot_id?: number;

  // Public DB identifiers (optional). If provided, capacity checks will use freshtrak_public.
  @IsOptional()
  @IsInt()
  event_slot_id?: number;

  @IsOptional()
  @IsInt()
  event_date_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  attendees?: number[]; // household_member_id list
}
