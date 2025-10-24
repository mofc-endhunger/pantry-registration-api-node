import { IsArray, IsInt, IsOptional, ArrayNotEmpty, ArrayUnique } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.event_id ?? obj?.eventId ?? value;
    return v === '' ? undefined : v;
  })
  event_id!: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.timeslot_id ?? obj?.timeslotId ?? obj?.timeSlotId ?? value;
    return v === '' ? undefined : v;
  })
  timeslot_id?: number;

  // Public DB identifiers (optional). If provided, capacity checks will use freshtrak_public.
  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.event_slot_id ?? obj?.eventSlotId ?? value;
    return v === '' ? undefined : v;
  })
  event_slot_id?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = obj?.event_date_id ?? obj?.eventDateId ?? value;
    return v === '' ? undefined : v;
  })
  event_date_id?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @Transform(({ value, obj }) => {
    const v = obj?.attendees ?? obj?.attendeeIds ?? value;
    return v === '' ? undefined : v;
  })
  attendees?: number[]; // household_member_id list
}
