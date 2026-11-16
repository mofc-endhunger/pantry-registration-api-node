import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, FindOneOptions } from 'typeorm';
import { UsersService } from '../users.service';
import { HouseholdsService } from '../../households/households.service';
import { User } from '../../../entities/user.entity';
import { Household } from '../../../entities/household.entity';
import { HouseholdMember } from '../../../entities/household-member.entity';
import { HouseholdAddress } from '../../../entities/household-address.entity';
import { UpdateUserWithHouseholdDto } from '../dto/update-user-with-household.dto';
import { UpdateHouseholdMemberDto } from '../../households/dto/update-household.dto';

/* SUP-783 — PATCH /users/:id used to "reconcile" the counts a client sent
   beside members[] by inventing "Adult N Adult" rows for any deficit. The
   web client counted seniors from 65 and the server from 60, so a household
   with a 60-to-64-year-old member gained a placeholder on every save, and
   removing it re-sent the same over-count and recreated it.

   These tests wire the REAL HouseholdsService over in-memory repository
   fakes, so the counts the assertions see are the ones withComputedCounts
   derives from the member rows after the update, not a mock's answer. */

const HEAD_USER_ID = 10;
const HOUSEHOLD_ID = 77;

type MemberRow = Pick<
  HouseholdMember,
  | 'id'
  | 'household_id'
  | 'user_id'
  | 'first_name'
  | 'last_name'
  | 'date_of_birth'
  | 'is_head_of_household'
  | 'is_active'
  | 'added_by'
> &
  Partial<Pick<HouseholdMember, 'gender_id' | 'suffix_id' | 'created_at'>>;

interface Counts {
  seniors: number;
  adults: number;
  children: number;
}

/** YYYY-MM-DD for someone who turned `years` a month ago, so the age is stable on any test day. */
function bornYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

function row(id: number, first_name: string, ageYears: number, head = false): MemberRow {
  return {
    id,
    household_id: HOUSEHOLD_ID,
    user_id: head ? HEAD_USER_ID : null,
    first_name,
    last_name: 'Doe',
    date_of_birth: bornYearsAgo(ageYears),
    is_head_of_household: head,
    is_active: true,
    added_by: String(HEAD_USER_ID),
    gender_id: null,
    suffix_id: null,
  };
}

/** The member as the legacy and web clients send it back: ints for the flags. */
function asPayload(m: MemberRow): UpdateHouseholdMemberDto {
  return {
    id: m.id,
    first_name: m.first_name,
    last_name: m.last_name,
    date_of_birth: m.date_of_birth,
    is_head_of_household: m.is_head_of_household ? 1 : 0,
    is_active: 1,
  };
}

interface Harness {
  service: UsersService;
  /** The member table. Rows are shared by reference with what the service reads and saves. */
  members: MemberRow[];
  /** The counts the users row ends up with: the last snapshot write, or undefined if none ran. */
  storedCounts: () => Counts | undefined;
}

async function buildHarness(initial: MemberRow[]): Promise<Harness> {
  const members: MemberRow[] = initial.map((m) => ({ ...m }));
  let nextId = 1000;

  // A fresh object per read, like TypeORM, but over the one shared member table.
  const householdOf = (): Household =>
    ({
      id: HOUSEHOLD_ID,
      number: 0,
      name: 'Doe Household',
      identification_code: 'ABC123',
      added_by: HEAD_USER_ID,
      last_updated_by: HEAD_USER_ID,
      deleted_by: null,
      deleted_on: null,
      members,
      addresses: [],
    }) as unknown as Household;

  const householdsRepo = {
    findOne: jest.fn(async () => householdOf()),
    save: jest.fn(async (h: Household) => h),
  };
  const membersRepo = {
    create: jest.fn((m: Partial<MemberRow>) => ({ ...m })),
    save: jest.fn(async (m: Partial<MemberRow>) => {
      if (typeof m.id !== 'number') {
        m.id = nextId++;
        m.created_at = new Date();
        members.push(m as MemberRow);
      }
      return m;
    }),
    find: jest.fn(async () => members),
    findOne: jest.fn(async (opts: FindOneOptions<HouseholdMember>) => {
      const where = opts.where as { id?: number };
      return members.find((m) => m.id === where.id) ?? null;
    }),
  };
  const addressesRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const usersUpdate = jest.fn<
    Promise<{ affected: number }>,
    [number | { id: number }, Partial<User>]
  >(async () => ({ affected: 1 }));
  const usersRepo = {
    findOneBy: jest.fn(
      async () =>
        ({
          id: HEAD_USER_ID,
          date_of_birth: bornYearsAgo(40),
          gender: 'female',
        }) as User,
    ),
    findOne: jest.fn(async () => null),
    update: usersUpdate,
  };
  const dataSource = {
    getRepository: jest.fn(() => ({ update: jest.fn(async () => ({ affected: 1 })) })),
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      UsersService,
      HouseholdsService,
      { provide: getRepositoryToken(User), useValue: usersRepo },
      { provide: getRepositoryToken(Household), useValue: householdsRepo },
      { provide: getRepositoryToken(HouseholdMember), useValue: membersRepo },
      { provide: getRepositoryToken(HouseholdAddress), useValue: addressesRepo },
      { provide: DataSource, useValue: dataSource },
    ],
  }).compile();

  const storedCounts = (): Counts | undefined => {
    // The personal-fields update is `update(id, ...)`; the counts snapshot is `update({ id }, ...)`.
    const snapshot = usersUpdate.mock.calls.filter(([where]) => typeof where === 'object').at(-1);
    if (!snapshot) return undefined;
    const [, patch] = snapshot;
    return {
      seniors: patch.seniors_in_household ?? -1,
      adults: patch.adults_in_household ?? -1,
      children: patch.children_in_household ?? -1,
    };
  };

  return { service: moduleRef.get(UsersService), members, storedCounts };
}

const placeholders = (members: MemberRow[]): MemberRow[] =>
  members.filter((m) => ['Senior', 'Adult', 'Child'].includes(m.last_name));

describe('UsersService.updateUserWithHousehold — members[] is the authority (SUP-783)', () => {
  it("creates no placeholder when members[] comes with contradictory counts, and stores the members' own categories", async () => {
    // Head 40, Pat 62 (a senior to the server, an adult to a client counting from 65), Sam 30.
    const h = await buildHarness([row(1, 'Head', 40, true), row(2, 'Pat', 62), row(3, 'Sam', 30)]);
    const dto: UpdateUserWithHouseholdDto = {
      household_id: HOUSEHOLD_ID,
      members: h.members.map(asPayload),
      // The legacy client's counts: excluding the head, Pat counted as an adult.
      // The old server turned this into one "Adult 1 Adult" on every save.
      counts: { seniors: 0, adults: 2, children: 0, total: 2 },
      adults_in_household: 2,
    };

    const res = await h.service.updateUserWithHousehold(HEAD_USER_ID, dto);

    expect(h.members).toHaveLength(3);
    expect(placeholders(h.members)).toEqual([]);
    expect(h.members.every((m) => m.is_active)).toBe(true);
    const expected: Counts = { seniors: 1, adults: 2, children: 0 };
    expect(h.storedCounts()).toEqual(expected);
    expect(res.household.counts).toEqual(expect.objectContaining(expected));
  });

  it('still creates placeholders when counts come WITHOUT members[] (a size, not a roster)', async () => {
    const h = await buildHarness([row(1, 'Head', 40, true)]);
    const dto: UpdateUserWithHouseholdDto = {
      household_id: HOUSEHOLD_ID,
      // Counts exclude the head; the head is an adult, so the household should reach 3 adults + 1 child.
      adults_in_household: 2,
      children_in_household: 1,
    };

    await h.service.updateUserWithHousehold(HEAD_USER_ID, dto);

    expect(h.members).toHaveLength(4);
    expect(placeholders(h.members).map((m) => `${m.first_name} ${m.last_name}`)).toEqual([
      'Adult 1 Adult',
      'Adult 2 Adult',
      'Child 1 Child',
    ]);
    expect(h.storedCounts()).toEqual({ seniors: 0, adults: 3, children: 1 });
  });

  it('deactivates a member omitted from members[] and does not re-add anyone, even with stale counts beside it', async () => {
    const h = await buildHarness([row(1, 'Head', 40, true), row(2, 'Sam', 30), row(3, 'Kid', 10)]);
    const [head, sam, kid] = h.members;
    const dto: UpdateUserWithHouseholdDto = {
      household_id: HOUSEHOLD_ID,
      members: [head, kid].map(asPayload), // Sam removed
      // The counts a client sends when it has not recounted after the removal.
      // This is the over-count that used to bring the removed member back as a placeholder.
      adults_in_household: 1,
      children_in_household: 1,
    };

    const res = await h.service.updateUserWithHousehold(HEAD_USER_ID, dto);

    expect(h.members).toHaveLength(3);
    expect(sam.is_active).toBe(false);
    expect(head.is_active).toBe(true);
    expect(kid.is_active).toBe(true);
    expect(placeholders(h.members)).toEqual([]);
    expect(h.storedCounts()).toEqual({ seniors: 0, adults: 1, children: 1 });
    // UsersService types the household by its counts only; the response still carries the active members.
    const returned = res.household as typeof res.household & { members: HouseholdMember[] };
    expect(returned.members.map((m) => m.id).sort()).toEqual([1, 3]);
  });

  it('treats an empty members[] as "no one but the head", not as "no roster given"', async () => {
    const h = await buildHarness([row(1, 'Head', 40, true), row(2, 'Sam', 30)]);
    const dto: UpdateUserWithHouseholdDto = {
      household_id: HOUSEHOLD_ID,
      members: [],
      adults_in_household: 3,
    };

    await h.service.updateUserWithHousehold(HEAD_USER_ID, dto);

    expect(h.members).toHaveLength(2);
    expect(placeholders(h.members)).toEqual([]);
    expect(h.members.find((m) => m.id === 2)?.is_active).toBe(false);
    expect(h.storedCounts()).toEqual({ seniors: 0, adults: 1, children: 0 });
  });
});
