import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Event } from '../entities/event.entity';
import { EventTimeslot } from '../entities/event-timeslot.entity';
import { Registration } from '../entities/registration.entity';
import { RegistrationAttendee } from '../entities/registration-attendee.entity';
import { Household } from '../entities/household.entity';
import { HouseholdMember } from '../entities/household-member.entity';
import { HouseholdAddress } from '../entities/household-address.entity';

dotenv.config();

async function run() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    entities: [
      Event,
      EventTimeslot,
      Registration,
      RegistrationAttendee,
      Household,
      HouseholdMember,
      HouseholdAddress,
    ],
  });
  await ds.initialize();

  const eventsRepo = ds.getRepository(Event);
  const timesRepo = ds.getRepository(EventTimeslot);

  const sample = eventsRepo.create({
    name: 'Sample Food Distribution',
    description: 'Weekly pantry distribution',
    start_at: new Date(),
    end_at: new Date(Date.now() + 2 * 60 * 60 * 1000),
    capacity: 100,
    is_active: true,
  } as any);
  const savedOrArray = await eventsRepo.save(sample);
  const saved = Array.isArray(savedOrArray) ? (savedOrArray[0] as Event) : (savedOrArray as Event);

  const slot = timesRepo.create({
    event_id: saved.id,
    start_at: new Date(),
    end_at: new Date(Date.now() + 60 * 60 * 1000),
    capacity: 50,
    is_active: true,
  } as any);
  await timesRepo.save(slot);

  await ds.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
