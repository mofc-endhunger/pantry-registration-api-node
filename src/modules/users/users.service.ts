import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserWithHouseholdDto } from './dto/update-user-with-household.dto';
import { HouseholdsService } from '../households/households.service';
import { UpsertMemberDto } from '../households/dto/upsert-member.dto';

// Minimal shape needed from HouseholdsService.getHouseholdById
type HouseholdWithCounts = {
  counts: { seniors: number; adults: number; children: number };
};

@Injectable()
export class UsersService {
  async getHouseholdTemplateForUser(userId: number) {
    // Find household for this user (as head or member)
    const householdId = await this.getHouseholdIdForUser(userId);
    if (!householdId) throw new NotFoundException('Household not found for user');
    // Use householdsService to get full household with members/counts
    const household = await this.householdsService.getHouseholdById(householdId, userId);
    // Get user for address fields
    const user = await this.findById(userId);
    return {
      ...household,
      address_line_1: user.address_line_1,
      address_line_2: user.address_line_2,
      city: user.city,
      state: user.state,
      zip_code: user.zip_code,
      phone: user.phone,
      email: user.email,
      permission_to_email: user.permission_to_email,
      permission_to_text: user.permission_to_text,
    };
  }
  async softDeleteUser(userId: number): Promise<User> {
    await this.userRepository.update(userId, { deleted_on: new Date() } as Partial<User>);
    return this.findById(userId);
  }

  async restoreUser(userId: number): Promise<User> {
    await this.userRepository.update(userId, { deleted_on: null } as Partial<User>);
    return this.findById(userId);
  }
  async getHouseholdIdForUser(userId: number): Promise<number | undefined> {
    return this.householdsService.findHouseholdIdByUserId(userId);
  }
  async findDbUserIdByCognitoUuid(cognitoUuid: string): Promise<number | null> {
    if (!cognitoUuid || typeof cognitoUuid !== 'string' || cognitoUuid.trim() === '') {
      throw new NotFoundException('Cognito UUID is missing or invalid');
    }
    // Remove dashes if present (standard UUID format)
    const normalized = cognitoUuid.replace(/-/g, '');
    if (!/^[a-fA-F0-9]{32}$/.test(normalized)) {
      throw new NotFoundException('Cognito UUID format is invalid');
    }
    const user = await this.userRepository.findOne({
      where: { cognito_uuid: Buffer.from(normalized, 'hex') },
    });
    return user ? user.id : null;
  }
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => HouseholdsService))
    private readonly householdsService: HouseholdsService,
  ) {}

  async create(
    createUserDto: CreateUserDto & { email: string; cognito_uuid: string; user_type: string },
  ): Promise<{ user: User; household_id: number }> {
    // Assign Cognito fields and user_type safely
    // Handle optional cognito_uuid
    let bufferUuid: Buffer | undefined = undefined;
    if (createUserDto.cognito_uuid && typeof createUserDto.cognito_uuid === 'string') {
      const normalizedUuid = createUserDto.cognito_uuid.replace(/-/g, '');
      if (/^[a-fA-F0-9]{32}$/.test(normalizedUuid)) {
        bufferUuid = Buffer.from(normalizedUuid, 'hex');
      }
    }
    // Check for existing user by cognito_uuid or identification_code
    let existingUser: User | undefined = undefined;
    if (bufferUuid) {
      const found = await this.userRepository.findOne({ where: { cognito_uuid: bufferUuid } });
      if (found) existingUser = found;
    }
    if (!existingUser && createUserDto.identification_code) {
      const found = await this.userRepository.findOne({
        where: { identification_code: createUserDto.identification_code },
      });
      if (found) existingUser = found;
    }
    if (existingUser && existingUser.deleted_on) {
      // Restore user and update fields
      Object.assign(existingUser, {
        ...createUserDto,
        cognito_uuid: bufferUuid,
        deleted_on: null,
      });
      await this.userRepository.save(existingUser);
      // Use restored user for downstream
    } else if (existingUser) {
      // User exists and is active, update fields
      Object.assign(existingUser, {
        ...createUserDto,
        cognito_uuid: bufferUuid,
      });
      await this.userRepository.save(existingUser);
    }
    const user =
      existingUser ??
      this.userRepository.create({
        ...createUserDto,
        cognito_uuid: bufferUuid,
      });
    const savedUser = await this.userRepository.save(user);

    // Always use savedUser.id for all downstream calls
    const userId = savedUser.id;

    // Create household and add user as head_of_household
    const household = await this.householdsService.createHousehold(userId, {
      primary_first_name: savedUser.first_name ?? undefined,
      primary_last_name: savedUser.last_name ?? undefined,
      primary_phone: savedUser.phone ?? undefined,
      primary_email: savedUser.email ?? undefined,
      primary_date_of_birth: savedUser.date_of_birth ?? undefined,
    });

    // Type guard for household object
    const householdId: number =
      typeof household === 'object' &&
      household !== null &&
      'id' in household &&
      typeof (household as { id: unknown }).id === 'number'
        ? (household as { id: number }).id
        : 0;

    // Add placeholder members if counts are set
    const dateStringYearsAgo = (years: number): string => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - years);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const addPlaceholders = async (count: number, label: 'Senior' | 'Adult' | 'Child') => {
      const dob =
        label === 'Senior'
          ? dateStringYearsAgo(70)
          : label === 'Adult'
            ? dateStringYearsAgo(30)
            : dateStringYearsAgo(10);
      for (let i = 1; i <= count; i++) {
        const member: UpsertMemberDto = {
          first_name: `${label} ${i}`,
          last_name: label,
          date_of_birth: dob,
          is_head_of_household: false,
          is_active: true,
        };
        await this.householdsService.addMember(householdId, userId, member);
      }
    };
    const toInt = (val: unknown): number => {
      if (val === undefined || val === null) return 0;
      const n = typeof val === 'string' ? Number(val) : (val as number);
      return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    };
    const seniorsCount = toInt((createUserDto as any).seniors_in_household);
    const adultsCount = toInt((createUserDto as any).adults_in_household);
    const childrenCount = toInt((createUserDto as any).children_in_household);
    if (seniorsCount > 0) await addPlaceholders(seniorsCount, 'Senior');
    if (adultsCount > 0) await addPlaceholders(adultsCount, 'Adult');
    if (childrenCount > 0) await addPlaceholders(childrenCount, 'Child');

    // After household creation (and optional placeholder members), ensure the user's snapshot
    // counts reflect the actual household member distribution.
    try {
      const updatedHousehold: HouseholdWithCounts = await this.householdsService.getHouseholdById(
        householdId,
        userId,
      );
      await this.userRepository.update(userId, {
        seniors_in_household: updatedHousehold.counts.seniors ?? 0,
        adults_in_household: updatedHousehold.counts.adults ?? 0,
        children_in_household: updatedHousehold.counts.children ?? 0,
      } as Partial<User>);
    } catch (_) {
      // If counts sync fails, do not block user creation
    }

    // Remove cognito_uuid from the returned user object but preserve class instance
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (savedUser as any).cognito_uuid;
    } catch (_) {
      // ignore if read-only
    }
    return { user: savedUser, household_id: householdId };
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdentificationCode(identification_code: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ identification_code });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserWithHousehold(id: number, dto: UpdateUserWithHouseholdDto): Promise<any> {
    // Update user fields (only those that exist on the user entity)
    const userUpdate: Partial<User> = {
      first_name: dto.members?.find((m) => m.user_id == id?.toString())?.first_name ?? undefined,
      last_name: dto.members?.find((m) => m.user_id == id?.toString())?.last_name ?? undefined,
      date_of_birth:
        dto.members?.find((m) => m.user_id == id?.toString())?.date_of_birth ?? undefined,
      address_line_1: dto.address_line_1,
      address_line_2: dto.address_line_2,
      city: dto.city,
      state: dto.state,
      zip_code: dto.zip_code,
      phone: dto.phone,
      email: dto.email,
      permission_to_email:
        typeof dto.permission_to_email === 'boolean' ? dto.permission_to_email : undefined,
      permission_to_text:
        typeof dto.permission_to_text === 'boolean' ? dto.permission_to_text : undefined,
      // Add more user fields as needed
    };
    await this.userRepository.update(id, userUpdate);
    // Find household for this user
    const householdId = (dto.household_id ?? dto.id) as number;
    // Delegate to household PATCH logic. Map user address fields to household address fields if present.
    const householdPatch: any = { ...dto };
    // Map user-facing address fields to household address fields when needed
    if (householdPatch.address_line_1 !== undefined && (householdPatch.line_1 === undefined || householdPatch.line_1 === '')) {
      householdPatch['line_1'] = householdPatch.address_line_1 ?? '';
    }
    if (householdPatch.address_line_2 !== undefined && householdPatch.line_2 === undefined) {
      householdPatch['line_2'] = householdPatch.address_line_2 ?? null;
    }
    await this.householdsService.updateHousehold(householdId, id, householdPatch);
    // Return updated user and household
    const user = await this.findById(id);
    const household = await this.householdsService.getHouseholdById(householdId, id);
    return { user, household };
  }
}
