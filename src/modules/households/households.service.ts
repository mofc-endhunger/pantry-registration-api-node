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
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    await this.assertRequesterOwnsHousehold(household, requesterUserId);
    // No household address fields in current schema; update metadata if desired
    household.last_updated_by = requesterUserId;
    await this.householdsRepo.save(household as any);
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

  private async findHouseholdIdByPrimary(_userId: number): Promise<number | undefined> {
    // Placeholder: if/when members link to users, implement lookup here.
    return undefined;
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
