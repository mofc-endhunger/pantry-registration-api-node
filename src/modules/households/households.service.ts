import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UpsertMemberDto } from './dto/upsert-member.dto';

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectRepository(Household) private readonly householdsRepo: Repository<Household>,
    @InjectRepository(HouseholdMember) private readonly membersRepo: Repository<HouseholdMember>,
  ) {}

  async createHousehold(primaryUserId: number, dto: CreateHouseholdDto) {
    // Minimal create; number/name/identification_code come from upstream inputs you provide.
    // Placeholder: you’ll likely supply number, name, identification_code elsewhere.
    const created = (await this.householdsRepo.save(
      this.householdsRepo.create({
        number: 0,
        name: dto.primary_last_name ? `${dto.primary_last_name} Household` : 'Household',
        identification_code: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        added_by: primaryUserId,
        last_updated_by: primaryUserId,
      } as any),
    )) as unknown as Household;
    const primaryMember = (await this.membersRepo.save(
      this.membersRepo.create({
        household_id: created.id,
        user_id: primaryUserId, // Always set user_id for the real user
        first_name: dto.primary_first_name || 'Primary',
        last_name: dto.primary_last_name || 'Member',
        date_of_birth: (dto.primary_date_of_birth as any) || '1900-01-01',
        is_head_of_household: true,
        is_active: true,
        added_by: String(primaryUserId),
      } as any),
    )) as unknown as HouseholdMember;
    return this.getHouseholdById(created.id, primaryUserId);
  }

  async getHouseholdById(householdId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({
      where: { id: householdId },
      relations: { members: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    await this.assertRequesterOwnsHousehold(household, requesterUserId);
    return this.withComputedCounts(household);
  }

  async getHouseholdForPrimary(primaryUserId: number) {
    const household = await this.householdsRepo.findOne({
      where: { added_by: primaryUserId },
      relations: { members: true },
    } as any);
    if (!household) throw new NotFoundException('Household not found');
    return this.withComputedCounts(household);
  }

  async updateHousehold(householdId: number, requesterUserId: number, dto: UpdateHouseholdDto) {
    const household = await this.householdsRepo.findOne({
      where: { id: householdId },
      relations: { members: true },
    });
    if (!household) throw new NotFoundException('Household not found');
    await this.assertRequesterOwnsHousehold(household, requesterUserId);

    // Update household fields
    household.number = dto.number;
    household.name = dto.name;
    household.identification_code = dto.identification_code;
    household.last_updated_by = requesterUserId;
    household.deleted_by = dto.deleted_by ?? null;
    household.deleted_on = dto.deleted_on ? new Date(dto.deleted_on) : null;
    await this.householdsRepo.save(household as any);

    // Upsert members
    if (Array.isArray(dto.members)) {
      // Build a map of incoming member IDs
      const incomingIds = dto.members.map((m) => m.id).filter(Boolean);
      // Remove members not present in incoming
      for (const member of household.members) {
        if (!incomingIds.includes(member.id)) {
          await this.membersRepo.remove(member);
        }
      }
      // Upsert each member
      for (const m of dto.members) {
        let member = household.members.find((mem) => mem.id === m.id);
        if (member) {
          Object.assign(member, {
            number: m.number ?? member.number,
            first_name: m.first_name,
            middle_name: m.middle_name,
            last_name: m.last_name,
            date_of_birth: m.date_of_birth,
            is_head_of_household: !!m.is_head_of_household,
            is_active: !!m.is_active,
            added_by: m.added_by,
            gender_id: m.gender_id ?? member.gender_id,
            suffix_id: m.suffix_id ?? member.suffix_id,
          });
          await this.membersRepo.save(member);
        } else {
          // New member
          const newMember = this.membersRepo.create({
            household_id: householdId,
            user_id: typeof m.user_id === 'string' ? parseInt(m.user_id, 10) : m.user_id,
            number: m.number,
            first_name: m.first_name,
            middle_name: m.middle_name,
            last_name: m.last_name,
            date_of_birth: m.date_of_birth,
            is_head_of_household: !!m.is_head_of_household,
            is_active: !!m.is_active,
            added_by: m.added_by,
            gender_id: m.gender_id,
            suffix_id: m.suffix_id,
          });
          await this.membersRepo.save(newMember);
        }
      }
    }

    // Counts are computed, but you could update related user/household fields if needed
    // (No direct counts table in schema)

    return this.getHouseholdById(household.id, requesterUserId);
  }

  private withComputedCounts(household: Household) {
    const members = (household as any).members || [];
    const today = new Date();
    const age = (dob?: string) => {
      if (!dob) return undefined;
      const d = new Date(dob);
      let years = today.getFullYear() - d.getFullYear();
      const m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
      return years;
    };
    const active = members.filter((m: HouseholdMember) => m.is_active);
    const seniors = active.filter(
      (m: HouseholdMember) => (age(m.date_of_birth) ?? -1) >= 60,
    ).length;
    const children = active.filter(
      (m: HouseholdMember) => (age(m.date_of_birth) ?? 200) < 18,
    ).length;
    const adults = active.length - seniors - children;
    return {
      ...household,
      members,
      counts: { seniors, adults, children, total: active.length },
    } as any;
  }

  private async assertRequesterOwnsHousehold(household: Household, requesterUserId: number) {
    if (String((household as any).added_by) !== String(requesterUserId)) {
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
    await this.assertRequesterOwnsHousehold(household, requesterUserId);
    const members = await this.membersRepo.find({ where: { household_id: householdId } });
    return members;
  }

  async addMember(householdId: number, requesterUserId: number, dto: UpsertMemberDto) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    await this.assertRequesterOwnsHousehold(household, requesterUserId);
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
    return (await this.membersRepo.save(member)) as unknown as HouseholdMember;
  }

  async updateMember(
    householdId: number,
    memberId: number,
    requesterUserId: number,
    dto: UpsertMemberDto,
  ) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    await this.assertRequesterOwnsHousehold(household, requesterUserId);
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
    return await this.membersRepo.save(member);
  }

  async deactivateMember(householdId: number, memberId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    await this.assertRequesterOwnsHousehold(household, requesterUserId);
    const member = await this.membersRepo.findOne({
      where: { id: memberId, household_id: householdId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.is_active) return member;
    member.is_active = false;
    return await this.membersRepo.save(member);
  }
}
