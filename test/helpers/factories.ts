import { getDataSource } from './db';
import type { Repository } from 'typeorm';
import type { Event } from '../../src/entities/event.entity';
import type { EventTimeslot } from '../../src/entities/event-timeslot.entity';
import type { User } from '../../src/entities/user.entity';
import type { Credential } from '../../src/entities/credential.entity';
import * as bcrypt from 'bcrypt';

async function repo<T>(entity: new () => T): Promise<Repository<T>> {
  const ds = await getDataSource();
  return ds.getRepository<T>(entity as any);
}

export async function createEvent(partial: Partial<Event> = {}): Promise<Event> {
  const eventsRepo = await repo<Event>((await import('../../src/entities/event.entity')).Event);
  const entity = eventsRepo.create({
    name: partial.name ?? `Event ${Date.now()}`,
    description: partial.description ?? null,
    start_at: partial.start_at ?? null,
    end_at: partial.end_at ?? null,
    capacity: partial.capacity ?? null,
    is_active: partial.is_active ?? true,
  } as any);
  return eventsRepo.save(entity as any) as any;
}

export async function createTimeslot(partial: Partial<EventTimeslot>): Promise<EventTimeslot> {
  const timesRepo = await repo<EventTimeslot>(
    (await import('../../src/entities/event-timeslot.entity')).EventTimeslot,
  );
  const entity = timesRepo.create({
    event_id: partial.event_id!,
    start_at: partial.start_at ?? new Date(),
    end_at: partial.end_at ?? new Date(Date.now() + 60 * 60 * 1000),
    capacity: partial.capacity ?? null,
    is_active: partial.is_active ?? true,
  } as any);
  return timesRepo.save(entity as any) as any;
}

export async function createUserWithCredential(
  partial: Partial<User> & { password?: string } = {},
): Promise<{ user: User; password: string }> {
  const usersRepo = await repo<User>((await import('../../src/entities/user.entity')).User);
  const credRepo = await repo<Credential>(
    (await import('../../src/entities/credential.entity')).Credential,
  );
  const password = partial.password ?? 'TestPassword123';
  const user = usersRepo.create({
    email: partial.email ?? `user+${Date.now()}@example.com`,
    identification_code: partial.identification_code ?? `id_${Date.now()}`,
    user_type: partial.user_type ?? 'customer',
  } as any);
  const saved = (await usersRepo.save(user as any)) as any as User;
  const secret = await bcrypt.hash(password, 12);
  await credRepo.save(credRepo.create({ user_id: (saved as any).id, secret } as any) as any);
  return { user: saved, password };
}
