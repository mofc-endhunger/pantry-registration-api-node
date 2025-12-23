import { IsArray, IsInt, IsOptional, ArrayNotEmpty, ArrayUnique, ValidateNested, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class RegisterHouseholdCountsDto {
  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = (obj as any)?.seniors ?? (obj as any)?.seniors_count ?? (obj as any)?.seniors_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  seniors?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = (obj as any)?.adults ?? (obj as any)?.adults_count ?? (obj as any)?.adults_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  adults?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = (obj as any)?.children ?? (obj as any)?.children_count ?? (obj as any)?.children_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  children?: number;
}

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
    const v = obj?.attendees ?? obj?.attendeeIds ?? (obj as any)?.attendee_ids ?? value;
    return v === '' ? undefined : v;
  })
  attendees?: number[]; // household_member_id list

  // Optional household counts as a nested object (me-format)
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Transform(({ value }) => (typeof value === 'object' ? value : undefined))
  @Type(() => RegisterHouseholdCountsDto)
  counts?: RegisterHouseholdCountsDto;

  // Optional top-level aliases (simple format)
  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = (obj as any)?.synth_seniors ?? (obj as any)?.seniors ?? (obj as any)?.seniors_count ?? (obj as any)?.seniors_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  seniors?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = (obj as any)?.synth_adults ?? (obj as any)?.adults ?? (obj as any)?.adults_count ?? (obj as any)?.adults_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  adults?: number;

  @IsOptional()
  @IsInt()
  @Transform(({ value, obj }) => {
    const v = (obj as any)?.synth_children ?? (obj as any)?.children ?? (obj as any)?.children_count ?? (obj as any)?.children_in_household ?? value;
    return v === '' || v === null || v === undefined ? undefined : parseInt(String(v), 10);
  })
  children?: number;
}
