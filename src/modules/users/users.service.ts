import { Injectable, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserWithHouseholdDto } from './dto/update-user-with-household.dto';
import { HouseholdsService } from '../households/households.service';
import { UpsertMemberDto } from '../households/dto/upsert-member.dto';
import { SafeRandom } from '../../common/utils/safe-random';
import { PantryTrakClient } from '../integrations/pantrytrak.client';

// Minimal shape needed from HouseholdsService.getHouseholdById
type HouseholdWithCounts = {
  counts: { seniors: number; adults: number; children: number };
};

// Type for createUserDto with household counts
interface CreateUserDtoWithCounts {
  seniors_in_household?: number | string;
  adults_in_household?: number | string;
  children_in_household?: number | string;
}

@Injectable()
export class UsersService {
  private async generateUniqueIdentificationCode(): Promise<string> {
    let code: string;
    do {
      code = SafeRandom.generateCode(6);
    } while (await this.userRepository.findOne({ where: { identification_code: code } }));
    return code;
  }
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
    @Optional() private readonly pantryTrakClient?: PantryTrakClient,
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
    // Ensure identification_code is a short internal code if missing or a GUID-like value
    const maybeCode = createUserDto.identification_code;
    const isUuidLike =
      typeof maybeCode === 'string' &&
      ((/^[a-fA-F0-9-]{36}$/.test(maybeCode) && maybeCode.includes('-')) ||
        /^[a-fA-F0-9]{32}$/.test(maybeCode));
    if (!maybeCode || isUuidLike) {
      createUserDto.identification_code = await this.generateUniqueIdentificationCode();
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

    // Create household (HouseholdsService guards against duplicates and will reuse existing)
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
    const dtoWithCounts = createUserDto as CreateUserDtoWithCounts;
    const seniorsCount = toInt(dtoWithCounts.seniors_in_household);
    const adultsCount = toInt(dtoWithCounts.adults_in_household);
    const childrenCount = toInt(dtoWithCounts.children_in_household);
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
    } catch {
      // If counts sync fails, do not block user creation
    }

    // Remove cognito_uuid from the returned user object but preserve class instance
    try {
      const savedUserRecord = savedUser as unknown as Record<string, unknown>;
      delete savedUserRecord['cognito_uuid'];
    } catch {
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

  async updateUserWithHousehold(
    id: number,
    dto: UpdateUserWithHouseholdDto,
  ): Promise<{ user: User; household: HouseholdWithCounts }> {
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
    // Only perform update when at least one field is actually defined to avoid
    // UpdateValuesMissingError from TypeORM when no SET values are provided.
    const cleanUserUpdate = Object.fromEntries(
      Object.entries(userUpdate).filter(([, v]) => v !== undefined),
    ) as Partial<User>;
    if (Object.keys(cleanUserUpdate).length > 0) {
      await this.userRepository.update(id, cleanUserUpdate);
    }
    // Find household for this user
    const householdId = (dto.household_id ?? dto.id) as number;
    // Delegate to household PATCH logic first (handles member deactivation when members array present).
    // Map user address fields to household address fields if present.
    const householdPatch: Record<string, unknown> = { ...dto };
    // Map user-facing address fields to household address fields when needed
    if (
      householdPatch['address_line_1'] !== undefined &&
      (householdPatch['line_1'] === undefined || householdPatch['line_1'] === '')
    ) {
      householdPatch['line_1'] = (householdPatch['address_line_1'] as string) ?? '';
    }
    if (householdPatch['address_line_2'] !== undefined && householdPatch['line_2'] === undefined) {
      householdPatch['line_2'] = (householdPatch['address_line_2'] as string | null) ?? null;
    }
    await this.householdsService.updateHousehold(
      householdId,
      id,
      householdPatch as Parameters<typeof this.householdsService.updateHousehold>[2],
    );

    // Ensure head-of-household has gender_id set from user's gender if available
    try {
      const membersForGender = await this.householdsService.listMembers(householdId, id);
      const hohMember = Array.isArray(membersForGender)
        ? (
            membersForGender as Array<{
              id: number;
              is_head_of_household?: boolean;
              gender_id?: number | null;
            }>
          ).find((m) => !!m.is_head_of_household)
        : undefined;
      if (hohMember && (hohMember.gender_id == null || Number.isNaN(hohMember.gender_id))) {
        // Map user's string gender to a numeric gender_id commonly used downstream
        // 1 = male, 2 = female (fallback: leave unset)
        const headUser = await this.findById(id);
        const g = (headUser.gender || '').toString().trim().toLowerCase();
        const mappedGenderId = g === 'male' ? 1 : g === 'female' ? 2 : undefined;
        if (mappedGenderId !== undefined) {
          await this.householdsService.updateMember(householdId, hohMember.id, id, {
            gender_id: mappedGenderId,
          } as any);
        }
      }
    } catch {
      // best-effort; do not block on gender sync
    }

    // After household update, add placeholder members to reach desired counts (if provided).
    try {
      const wantsCounts =
        !!dto.counts ||
        dto.seniors_in_household != null ||
        dto.adults_in_household != null ||
        dto.children_in_household != null ||
        (dto as { seniors?: number }).seniors != null ||
        (dto as { adults?: number }).adults != null ||
        (dto as { children?: number }).children != null;
      if (householdId && wantsCounts) {
        const toInt = (val: unknown): number => {
          if (val === undefined || val === null) return 0;
          const n = typeof val === 'string' ? Number(val) : (val as number);
          return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
        };
        const desiredSeniors = toInt(
          (dto.counts && dto.counts.seniors) ??
            dto.seniors_in_household ??
            (dto as { seniors?: number }).seniors,
        );
        const desiredAdults = toInt(
          (dto.counts && dto.counts.adults) ??
            dto.adults_in_household ??
            (dto as { adults?: number }).adults,
        );
        const desiredChildren = toInt(
          (dto.counts && dto.counts.children) ??
            dto.children_in_household ??
            (dto as { children?: number }).children,
        );

        // Work with adjustable copies since desired* are constants
        let adjDesiredSeniors = desiredSeniors;
        let adjDesiredAdults = desiredAdults;
        let adjDesiredChildren = desiredChildren;

        // Treat provided counts as EXCLUDING the head-of-household (HOH).
        // Determine HOH age category and add 1 to that category so desired totals include HOH.
        try {
          // Prefer HOH DOB from household members; fallback to user record
          const membersForHohRaw = await this.householdsService.listMembers(householdId, id);
          const membersForHoh: Array<{
            is_head_of_household?: boolean;
            date_of_birth?: string | null;
            is_active?: number | boolean;
          }> = Array.isArray(membersForHohRaw)
            ? (membersForHohRaw as Array<unknown>).map(
                (m) =>
                  m as {
                    is_head_of_household?: boolean;
                    date_of_birth?: string | null;
                    is_active?: number | boolean;
                  },
              )
            : [];
          const hohMember = membersForHoh.find((m) => !!m.is_head_of_household) ?? undefined;

          // Compute HOH age category
          const dobStr =
            (hohMember?.date_of_birth &&
              typeof hohMember.date_of_birth === 'string' &&
              hohMember.date_of_birth) ||
            (await this.findById(id)).date_of_birth ||
            null;
          const computeAge = (dob: string | null): number | null => {
            if (!dob) return null;
            const d = new Date(dob);
            if (Number.isNaN(d.getTime())) return null;
            const now = new Date();
            let age = now.getFullYear() - d.getFullYear();
            const mDiff = now.getMonth() - d.getMonth();
            if (mDiff < 0 || (mDiff === 0 && now.getDate() < d.getDate())) age--;
            return age;
          };
          const hohAge = computeAge(dobStr);
          // Default HOH category to Adult when age unknown
          const addTo: 'seniors' | 'adults' | 'children' =
            hohAge == null
              ? 'adults'
              : hohAge >= 60
                ? 'seniors'
                : hohAge < 18
                  ? 'children'
                  : 'adults';

          if (addTo === 'seniors') {
            adjDesiredSeniors = (adjDesiredSeniors ?? 0) + 1;
          } else if (addTo === 'children') {
            adjDesiredChildren = (adjDesiredChildren ?? 0) + 1;
          } else {
            adjDesiredAdults = (adjDesiredAdults ?? 0) + 1;
          }
        } catch {
          // If HOH detection fails, assume adult and include +1 to adults
          adjDesiredAdults = (adjDesiredAdults ?? 0) + 1;
        }

        // Load current counts and reconcile placeholders: remove excess first, then add deficits
        let current = await this.householdsService.getHouseholdById(householdId, id);
        let currentSeniors = current.counts?.seniors ?? 0;
        let currentAdults = current.counts?.adults ?? 0;
        let currentChildren = current.counts?.children ?? 0;

        // Remove excess placeholders if counts decreased
        const removeExcess = async (label: 'Senior' | 'Adult' | 'Child', excess: number) => {
          if (excess <= 0) return;
          // Get all members to identify placeholders
          const membersRaw = await this.householdsService.listMembers(householdId, id);
          const members: Array<{
            id: number;
            first_name?: string;
            last_name?: string;
            is_head_of_household?: number;
            is_active?: number;
            created_at?: Date | string;
          }> = Array.isArray(membersRaw)
            ? (membersRaw as Array<unknown>).map(
                (m) =>
                  m as {
                    id: number;
                    first_name?: string;
                    last_name?: string;
                    is_head_of_household?: number;
                    is_active?: number;
                    created_at?: Date | string;
                  },
              )
            : [];
          // Find newest placeholders first
          const candidates = members
            .filter((m) => {
              const fn = m.first_name ?? '';
              return (
                (m.is_active ?? 0) === 1 &&
                (m.is_head_of_household ?? 0) !== 1 &&
                (m.last_name ?? '') === label &&
                typeof fn === 'string' &&
                fn.startsWith(`${label} `)
              );
            })
            .sort((a, b) => {
              const at = a.created_at ? new Date(a.created_at as any).getTime() : 0;
              const bt = b.created_at ? new Date(b.created_at as any).getTime() : 0;
              return bt - at;
            })
            .slice(0, excess);
          for (const m of candidates) {
            await this.householdsService.deactivateMember(householdId, Number(m.id), id);
          }
        };

        await removeExcess('Senior', Math.max(0, currentSeniors - adjDesiredSeniors));
        await removeExcess('Adult', Math.max(0, currentAdults - adjDesiredAdults));
        await removeExcess('Child', Math.max(0, currentChildren - adjDesiredChildren));

        // Refresh counts after removals
        current = await this.householdsService.getHouseholdById(householdId, id);
        currentSeniors = current.counts?.seniors ?? 0;
        currentAdults = current.counts?.adults ?? 0;
        currentChildren = current.counts?.children ?? 0;

        const needSeniors = Math.max(0, adjDesiredSeniors - currentSeniors);
        const needAdults = Math.max(0, adjDesiredAdults - currentAdults);
        const needChildren = Math.max(0, adjDesiredChildren - currentChildren);

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
          // Stamp placeholders with HOH gender if available
          const members2Raw = await this.householdsService.listMembers(householdId, id);
          const members2: Array<{ is_head_of_household?: boolean; gender_id?: number | null }> =
            Array.isArray(members2Raw)
              ? (members2Raw as Array<unknown>).map(
                  (m) =>
                    m as {
                      is_head_of_household?: boolean;
                      gender_id?: number | null;
                    },
                )
              : [];
          const hoh = members2.find((m) => !!m.is_head_of_household);
          let hohGenderId = hoh?.gender_id ?? null;
          if (hohGenderId == null) {
            // Fallback: map user's gender string
            const headUser = await this.findById(id);
            const g = (headUser.gender || '').toString().trim().toLowerCase();
            hohGenderId = g === 'male' ? 1 : g === 'female' ? 2 : null;
          }
          for (let i = 1; i <= count; i++) {
            const member: UpsertMemberDto = {
              first_name: `${label} ${i}`,
              last_name: label,
              date_of_birth: dob,
              is_head_of_household: false,
              is_active: true,
              gender_id: hohGenderId ?? undefined,
            };
            await this.householdsService.addMember(householdId, id, member);
          }
        };
        if (needSeniors > 0) await addPlaceholders(needSeniors, 'Senior');
        if (needAdults > 0) await addPlaceholders(needAdults, 'Adult');
        if (needChildren > 0) await addPlaceholders(needChildren, 'Child');
      }
    } catch {
      // best-effort; if placeholder add fails we still proceed
    }
    // Fetch updated household after potential placeholder additions
    const household = await this.householdsService.getHouseholdById(householdId, id);

    // Sync aggregate counts from household back to head-of-household user snapshot
    try {
      await this.userRepository.update({ id }, {
        seniors_in_household: household.counts?.seniors ?? 0,
        adults_in_household: household.counts?.adults ?? 0,
        children_in_household: household.counts?.children ?? 0,
      } as Partial<User>);
    } catch {
      // ignore snapshot sync errors
    }

    const user = await this.findById(id);

    // Best-effort sync to PantryTrak after update
    try {
      if (this.pantryTrakClient) {
        await this.pantryTrakClient.createUser(user);
      }
    } catch {
      // Best-effort: swallow
    }

    return { user, household };
  }
}
