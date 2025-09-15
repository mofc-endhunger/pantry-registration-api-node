import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Household } from '../../entities/household.entity';
import { HouseholdMember } from '../../entities/household-member.entity';
import { HouseholdMemberAudit } from '../../entities/household-member-audit.entity';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UpsertMemberDto } from './dto/upsert-member.dto';

@Injectable()
export class HouseholdsService {
  constructor(
    @InjectRepository(Household) private readonly householdsRepo: Repository<Household>,
    @InjectRepository(HouseholdMember) private readonly membersRepo: Repository<HouseholdMember>,
    @InjectRepository(HouseholdMemberAudit) private readonly auditsRepo: Repository<HouseholdMemberAudit>,
  ) {}

  async createHousehold(primaryUserId: number, dto: CreateHouseholdDto) {
    const created = await this.householdsRepo.save(this.householdsRepo.create({
      primary_user_id: primaryUserId,
      address_line_1: dto.address_line_1,
      address_line_2: dto.address_line_2,
      city: dto.city,
      state: dto.state,
      zip_code: dto.zip_code,
      preferred_language: dto.preferred_language,
      notes: dto.notes,
    }));
    const primaryMember = this.membersRepo.create({
      household_id: created.id,
      is_primary: true,
      first_name: dto.primary_first_name,
      last_name: dto.primary_last_name,
      date_of_birth: dto.primary_date_of_birth,
      phone: dto.primary_phone,
      email: dto.primary_email,
      address_line_1: dto.address_line_1,
      address_line_2: dto.address_line_2,
      city: dto.city,
      state: dto.state,
      zip_code: dto.zip_code,
      is_active: true,
    });
    await this.membersRepo.save(primaryMember);
    await this.auditsRepo.save(this.auditsRepo.create({
      household_id: created.id,
      member_id: primaryMember.id,
      change_type: 'created',
      changed_by_user_id: primaryUserId,
      changes: { after: { household: created, primary_member: primaryMember } },
    }));
    return this.getHouseholdById(created.id, primaryUserId);
  }

  async getHouseholdById(householdId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId }, relations: { members: true } });
    if (!household) throw new NotFoundException('Household not found');
    if (household.primary_user_id !== requesterUserId) throw new ForbiddenException();
    return this.withComputedCounts(household);
  }

  async getHouseholdForPrimary(primaryUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { primary_user_id: primaryUserId }, relations: { members: true } });
    if (!household) throw new NotFoundException('Household not found');
    return this.withComputedCounts(household);
  }

  async updateHousehold(householdId: number, requesterUserId: number, dto: UpdateHouseholdDto) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    if (household.primary_user_id !== requesterUserId) throw new ForbiddenException();
    const before = { ...household };
    Object.assign(household, {
      address_line_1: dto.address_line_1 ?? household.address_line_1,
      address_line_2: dto.address_line_2 ?? household.address_line_2,
      city: dto.city ?? household.city,
      state: dto.state ?? household.state,
      zip_code: dto.zip_code ?? household.zip_code,
      preferred_language: dto.preferred_language ?? household.preferred_language,
      notes: dto.notes ?? household.notes,
    });
    await this.householdsRepo.save(household);
    await this.auditsRepo.save(this.auditsRepo.create({
      household_id: household.id,
      change_type: 'updated',
      changed_by_user_id: requesterUserId,
      changes: { before, after: household },
    }));
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
    const seniors = active.filter((m: HouseholdMember) => (age(m.date_of_birth) ?? -1) >= 60).length;
    const children = active.filter((m: HouseholdMember) => (age(m.date_of_birth) ?? 200) < 18).length;
    const adults = active.length - seniors - children;
    return { ...household, members, counts: { seniors, adults, children, total: active.length } } as any;
  }

  async listMembers(householdId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    if (household.primary_user_id !== requesterUserId) throw new ForbiddenException();
    const members = await this.membersRepo.find({ where: { household_id: householdId } });
    return members;
  }

  async addMember(householdId: number, requesterUserId: number, dto: UpsertMemberDto) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    if (household.primary_user_id !== requesterUserId) throw new ForbiddenException();
    const member = this.membersRepo.create({
      household_id: householdId,
      is_primary: false,
      first_name: dto.first_name,
      middle_name: dto.middle_name,
      last_name: dto.last_name,
      suffix: dto.suffix,
      gender: dto.gender,
      phone: dto.phone,
      email: dto.email,
      address_line_1: dto.address_line_1,
      address_line_2: dto.address_line_2,
      city: dto.city,
      state: dto.state,
      zip_code: dto.zip_code,
      date_of_birth: dto.date_of_birth,
      is_active: dto.is_active ?? true,
    });
    const saved = await this.membersRepo.save(member);
    await this.auditsRepo.save(this.auditsRepo.create({
      household_id: householdId,
      member_id: saved.id,
      change_type: 'created',
      changed_by_user_id: requesterUserId,
      changes: { after: saved },
    }));
    return saved;
  }

  async updateMember(householdId: number, memberId: number, requesterUserId: number, dto: UpsertMemberDto) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    if (household.primary_user_id !== requesterUserId) throw new ForbiddenException();
    const member = await this.membersRepo.findOne({ where: { id: memberId, household_id: householdId } });
    if (!member) throw new NotFoundException('Member not found');
    const before = { ...member };
    Object.assign(member, {
      first_name: dto.first_name ?? member.first_name,
      middle_name: dto.middle_name ?? member.middle_name,
      last_name: dto.last_name ?? member.last_name,
      suffix: dto.suffix ?? member.suffix,
      gender: dto.gender ?? member.gender,
      phone: dto.phone ?? member.phone,
      email: dto.email ?? member.email,
      address_line_1: dto.address_line_1 ?? member.address_line_1,
      address_line_2: dto.address_line_2 ?? member.address_line_2,
      city: dto.city ?? member.city,
      state: dto.state ?? member.state,
      zip_code: dto.zip_code ?? member.zip_code,
      date_of_birth: dto.date_of_birth ?? member.date_of_birth,
      is_active: dto.is_active ?? member.is_active,
    });
    const saved = await this.membersRepo.save(member);
    await this.auditsRepo.save(this.auditsRepo.create({
      household_id: householdId,
      member_id: saved.id,
      change_type: 'updated',
      changed_by_user_id: requesterUserId,
      changes: { before, after: saved },
    }));
    return saved;
  }

  async deactivateMember(householdId: number, memberId: number, requesterUserId: number) {
    const household = await this.householdsRepo.findOne({ where: { id: householdId } });
    if (!household) throw new NotFoundException('Household not found');
    if (household.primary_user_id !== requesterUserId) throw new ForbiddenException();
    const member = await this.membersRepo.findOne({ where: { id: memberId, household_id: householdId } });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.is_active) return member;
    member.is_active = false;
    const saved = await this.membersRepo.save(member);
    await this.auditsRepo.save(this.auditsRepo.create({
      household_id: householdId,
      member_id: memberId,
      change_type: 'deactivated',
      changed_by_user_id: requesterUserId,
      changes: { before: { is_active: true }, after: { is_active: false } },
    }));
    return saved;
  }
}

