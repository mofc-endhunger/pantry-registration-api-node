import { Injectable, ForbiddenException, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';
import { HouseholdAddress } from '../../entities/household-address.entity';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UpsertMemberDto } from './dto/upsert-member.dto';
import { User } from '../../entities/user.entity';


type HouseholdWithComments = unknown; // placeholder to avoid type errors in modification context

type HouseholdWithCounts = Household & {
  members: HouseholdMember[];
  counts: { seniors: number; adults: number; children: number; total: number };
};

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectRepository(Household) private readonly householdsRepo: Repository<Household>,
    @InjectRepository(HouseholdMember) private readonly membersRepo: Repository<HouseholdMember>,
    @InjectRepository(HouseholdAddress)
    private readonly addressesRepo: Repository<HouseholdAddress>,
    private readonly dataSource: DataSource,
    @Optional() private readonly pantryTrakClient?: import('../integrations/pantrytrak.client').PantryTrakClient,
  ) {}

  async createHousehold(
    primaryUserId: number,
    dto: CreateHouseholdDto,
  ): Promise<HouseholdWithCounts> {
    // Minimal create; number/name/identification_code come from upstream inputs you provide.
    // Placeholder: you’ll likely supply number, name, identification_code elsewhere.
    const created = await this.householdsRepo.save(
      this.householdsRepo.create({
        number: 0,
        name: dto.primary_last_name ? `${dto.primary_last_name} Household` : 'Household',
        identification_code: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        added_by: primaryUserId,
        last_updated_by: primaryUserId,
      }),
    );
    await this.membersRepo.save(
      this.membersRepo.create({
        household_id: created.id,
        user_id: primaryUserId, // Always set user_id for the real user
        first_name: dto.primary_first_name || 'Primary',
        last_name: dto.primary_last_name || 'Member',
        date_of_birth: dto.primary_date_of_birth ?? '1900-01-01',
        is_head_of_household: true,
        is_active: true,
        added_by: String(primaryUserId),
      }),
    );
    return this.getHouseholdById(created.id, primaryUserId);
  }

  async getHouseholdById(
    householdId: number,
    requesterUserId: number,
  ): Promise<HouseholdWithCounts> {
    const household = await this.householdsRepo.findOne({
      where: { id: householdId },
      relations: { members: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    this.assertRequesterOwnsHousehold(household, requesterUserId);
    return this.withComputedCounts(household);
  }

  async getHouseholdForPrimary(primaryUserId: number): Promise<HouseholdWithCounts> {
    const household = await this.householdsRepo.findOne({
      where: { added_by: primaryUserId },
      relations: { members: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    return this.withComputedCounts(household);
  }

  async updateHousehold(
    householdId: number,
    requesterUserId: number,
    dto: UpdateHouseholdDto,
  ): Promise<HouseholdWithCounts> {
    const household = await this.householdsRepo.findOne({
      where: { id: householdId },
      relations: { members: true, addresses: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    this.assertRequesterOwnsHousehold(household, requesterUserId);

    // Update household fields conditionally
    if (typeof dto.number === 'number') household.number = dto.number;
    if (typeof dto.name === 'string') household.name = dto.name;
    if (typeof dto.identification_code === 'string')
      household.identification_code = dto.identification_code;
    household.last_updated_by = requesterUserId;
    household.deleted_by = dto.deleted_by ?? null;
    household.deleted_on = dto.deleted_on ? new Date(dto.deleted_on) : null;
    await this.householdsRepo.save(household);

    // Address history logic
    if (
      dto.line_1 ||
      (dto as any).address_line_1 ||
      dto.line_2 ||
      (dto as any).address_line_2 ||
      dto.city ||
      dto.state ||
      dto.zip_code ||
      dto.zip_4
    ) {
      // Determine current active address
      const prevActive =
        Array.isArray(household.addresses) && household.addresses.length
          ? (household.addresses.find((a) => !a.deleted_on) as Partial<HouseholdAddress> | undefined)
          : undefined;

      // Proposed incoming values (only those explicitly provided)
      const proposed = {
        line_1: (dto.line_1 as string | undefined) ?? ((dto as any).address_line_1 as string | undefined),
        line_2: (dto.line_2 as string | undefined) ?? ((dto as any).address_line_2 as string | undefined),
        city: dto.city as string | undefined,
        state: dto.state as string | undefined,
        zip_code: dto.zip_code as string | undefined,
        zip_4: dto.zip_4 as string | undefined,
      };

      // Decide whether there is any change vs the active address (only consider fields that were provided)
      const anyChange =
        !prevActive ||
        (proposed.line_1 !== undefined && proposed.line_1 !== (prevActive.line_1 as string | undefined)) ||
        (proposed.line_2 !== undefined && proposed.line_2 !== (prevActive.line_2 as string | undefined)) ||
        (proposed.city !== undefined && proposed.city !== (prevActive.city as string | undefined)) ||
        (proposed.state !== undefined && proposed.state !== (prevActive.state as string | undefined)) ||
        (proposed.zip_code !== undefined && proposed.zip_code !== (prevActive.zip_code as string | undefined)) ||
        (proposed.zip_4 !== undefined && proposed.zip_4 !== (prevActive.zip_4 as string | undefined));

      if (anyChange) {
        // Soft-delete previous active address rows and set deleted_by
        await this.addressesRepo.update(
          { household_id: householdId, deleted_on: IsNull() },
          { deleted_on: new Date(), deleted_by: requesterUserId, last_updated_by: requesterUserId } as any,
        );

        // Build the new address values: prefer provided, else fall back to previous, else sensible defaults
        const newAddress: Partial<HouseholdAddress> = {
          household_id: householdId,
          line_1: (proposed.line_1 ?? (prevActive?.line_1 as string | undefined) ?? '') as string,
          line_2: (proposed.line_2 ?? (prevActive?.line_2 as string | undefined) ?? null) as any,
          city: (proposed.city ?? (prevActive?.city as string | undefined) ?? '') as string,
          state: (proposed.state ?? (prevActive?.state as string | undefined) ?? '') as string,
          zip_code: (proposed.zip_code ?? (prevActive?.zip_code as string | undefined) ?? '') as string,
          zip_4: (proposed.zip_4 ?? (prevActive?.zip_4 as string | undefined)) as any,
          added_by: requesterUserId,
          last_updated_by: requesterUserId,
        };

        await this.addressesRepo.save(this.addressesRepo.create(newAddress));
      }
    }

    // Upsert members and deactivate omitted ones
    if (Array.isArray(dto.members)) {
      // Get IDs of members in the payload (excluding new members with null/undefined id)
      const payloadMemberIds = new Set(
        dto.members
          .filter((m: any) => m.id != null)
          .map((m: any) => Number(m.id))
      );

      // Deactivate members that exist in DB but are NOT in the payload
      // (except head of household - they cannot be deactivated this way)
      for (const existingMember of household.members) {
        if (
          existingMember.is_active &&
          !existingMember.is_head_of_household &&
          !payloadMemberIds.has(existingMember.id)
        ) {
          existingMember.is_active = false;
          await this.membersRepo.save(existingMember);
        }
      }

      // Upsert each provided member
      for (const m of dto.members) {
        const member = household.members.find((mem) => mem.id === m.id);
        if (member) {
          Object.assign(member, {
            number: m.number ?? member.number,
            first_name: m.first_name,
            middle_name: m.middle_name,
            last_name: m.last_name,
            date_of_birth: m.date_of_birth,
            is_head_of_household: !!m.is_head_of_household,
            is_active: m.is_active !== undefined ? !!m.is_active : member.is_active,
            added_by: m.added_by,
            gender_id: m.gender_id ?? member.gender_id,
            suffix_id: m.suffix_id ?? member.suffix_id,
          });
          await this.membersRepo.save(member);
        } else {
          // New member
          const newMemberData: Partial<HouseholdMember> = {
            number: m.number ?? null,
            first_name: m.first_name ?? '',
            middle_name: m.middle_name ?? undefined,
            last_name: m.last_name ?? '',
            date_of_birth: m.date_of_birth ?? '1900-01-01',
            is_head_of_household: !!m.is_head_of_household,
            is_active: m.is_active !== undefined ? !!m.is_active : true,
            added_by: m.added_by != null ? String(m.added_by) : String(requesterUserId),
            gender_id: m.gender_id ?? null,
            suffix_id: m.suffix_id ?? null,
          };
          if (typeof householdId !== 'undefined') newMemberData.household_id = householdId;
          if (typeof m.user_id !== 'undefined' && m.user_id !== null) {
            newMemberData.user_id =
              typeof m.user_id === 'string' ? parseInt(m.user_id, 10) : m.user_id;
          }
          const newMember = this.membersRepo.create(
            newMemberData as Required<Partial<HouseholdMember>>,
          );
                const saved = await this.membersRepo.save(newMember);
                // Best-effort: if this member maps to an existing user, sync that user to PantryTrak
                try {
                  if (this.pantryTrakClient && saved.user_id) {
                    const userRepo = this.dataSource.getRepository(User);
                    const user = await userRepo.findOne({ where: { id: Number(saved.user_id) } });
                    if (user) await this.pantryTrakClient.createUser(user as any);
                  }
                } catch (e) {
                  // swallow errors to avoid blocking household updates
                }
        }
      }
    }

    // Recalculate counts and return updated household
    const updated = await this.getHouseholdById(household.id, requesterUserId);

    // Also persist aggregate counts on the head-of-household user record so that
    // users.seniors/adults/children stay in sync with the household members.
    try {
      const headUserId = household.added_by; // primary user who owns the household
      if (headUserId) {
        await this.dataSource.getRepository(User).update(
          { id: Number(headUserId) },
          {
            seniors_in_household: updated.counts.seniors ?? 0,
            adults_in_household: updated.counts.adults ?? 0,
            children_in_household: updated.counts.children ?? 0,
          },
        );
        // Best-effort: sync the head user's full record to PantryTrak after counts changed
        try {
          if (this.pantryTrakClient) {
            const userRepo = this.dataSource.getRepository(User);
            const headUser = await userRepo.findOne({ where: { id: Number(headUserId) } });
            if (headUser) await this.pantryTrakClient.createUser(headUser as any);
          }
        } catch (e) {
          // swallow
        }
      }
    } catch (e) {
      // Swallow to avoid blocking household update; surface via logs if a logger is configured
      // console.warn('Failed to sync user household counts', e);
    }

    return updated;
  }
 

  private withComputedCounts(household: Household): HouseholdWithCounts {
    const members: HouseholdMember[] = household.members || [];
    const today = new Date();
    const age = (dob?: string) => {
      if (!dob) return undefined;
      const d = new Date(dob);
      let years = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
      return years;
    };
    // Filter to only active members for both counting and response
    const active = members.filter((m: HouseholdMember) => m.is_active);
    const seniors = active.filter(
      (m: HouseholdMember) => (age(m.date_of_birth) ?? -1) >= 60,
    ).length;
    const children = active.filter(
      (m: HouseholdMember) => (age(m.date_of_birth) ?? 200) < 18,
    ).length;
    const adults = active.length - seniors - children;
    return Object.assign(household, {
      members: active, // Only return active members
      counts: { seniors, adults, children, total: active.length },
    }) as HouseholdWithCounts;
  }

  private assertRequesterOwnsHousehold(household: Household, requesterUserId: number): void {
    if (String(household.added_by) !== String(requesterUserId)) {
      throw new ForbiddenException();
    }
  }

  async findHouseholdIdByUserId(userId: number): Promise<number | undefined> {
    const member = await this.membersRepo.findOne({
      where: { user_id: userId, is_head_of_household: true },
    });
    return member?.household_id ?? undefined;
  }

  async listMembers(householdId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    this.assertRequesterOwnsHousehold(household, requesterUserId);
    const members = await this.membersRepo.find({ where: { household_id: householdId } });
    return members;
  }

  async addMember(householdId: number, requesterUserId: number, dto: UpsertMemberDto) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    this.assertRequesterOwnsHousehold(household, requesterUserId);
    const member = this.membersRepo.create({
      household_id: householdId,
      first_name: dto.first_name,
      middle_name: dto.middle_name,
      last_name: dto.last_name,
      // phone/email not in schema
      date_of_birth: dto.date_of_birth,
      gender_id: dto.gender_id,
      suffix_id: dto.suffix_id,
      is_head_of_household: dto.is_head_of_household ?? false,
      is_active: dto.is_active ?? true,
      added_by: String(requesterUserId),
    } as any);
    const saved = (await this.membersRepo.save(member)) as unknown as HouseholdMember;
    try {
      if (this.pantryTrakClient && saved.user_id) {
        const userRepo = this.dataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: Number(saved.user_id) } });
        if (user) await this.pantryTrakClient.createUser(user as any);
      }
    } catch (e) {
      // swallow
    }
    return saved;
  }

  async updateMember(
    householdId: number,
    memberId: number,
    requesterUserId: number,
    dto: UpsertMemberDto,
  ) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    this.assertRequesterOwnsHousehold(household, requesterUserId);
    const member = await this.membersRepo.findOne({
      where: { id: memberId, household_id: householdId },
    });
    if (!member) throw new NotFoundException('Member not found');
    Object.assign(member, {
      first_name: dto.first_name ?? member.first_name,
      middle_name: dto.middle_name ?? member.middle_name,
      last_name: dto.last_name ?? member.last_name,
      // phone/email not in schema
      date_of_birth: dto.date_of_birth ?? member.date_of_birth,
      gender_id: dto.gender_id ?? member.gender_id,
      suffix_id: dto.suffix_id ?? member.suffix_id,
      is_head_of_household: dto.is_head_of_household ?? member.is_head_of_household,
      is_active: dto.is_active ?? member.is_active,
    });
    const saved = await this.membersRepo.save(member);
    try {
      if (this.pantryTrakClient && saved.user_id) {
        const userRepo = this.dataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: Number(saved.user_id) } });
        if (user) await this.pantryTrakClient.createUser(user as any);
      }
    } catch (e) {
      // swallow
    }
    return saved;
  }

  async deactivateMember(householdId: number, memberId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    this.assertRequesterOwnsHousehold(household, requesterUserId);
    const member = await this.membersRepo.findOne({
      where: { id: memberId, household_id: householdId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.is_active) return member;
    member.is_active = false;
    const saved = await this.membersRepo.save(member);
    try {
      if (this.pantryTrakClient && saved.user_id) {
        const userRepo = this.dataSource.getRepository(User);
        const user = await userRepo.findOne({ where: { id: Number(saved.user_id) } });
        if (user) await this.pantryTrakClient.createUser(user as any);
      }
    } catch (e) {
      // swallow
    }
    return saved;
  }
}
