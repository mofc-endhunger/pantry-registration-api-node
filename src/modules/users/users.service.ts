import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserWithHouseholdDto } from './dto/update-user-with-household.dto';
import { HouseholdsService } from '../households/households.service';
import { UpsertMemberDto } from '../households/dto/upsert-member.dto';

@Injectable()
export class UsersService {
  async getHouseholdTemplateForUser(userId: number) {
    // Find household for this user (as head or member)
    const householdId = await this.getHouseholdIdForUser(userId);
    if (!householdId) throw new NotFoundException('Household not found for user');
    // Use householdsService to get full household with members/counts
    return this.householdsService.getHouseholdById(householdId, userId);
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
    // Log the incoming value for debugging
    console.log('[findDbUserIdByCognitoUuid] Received cognitoUuid:', cognitoUuid);
    if (!cognitoUuid || typeof cognitoUuid !== 'string' || cognitoUuid.trim() === '') {
      console.error(
        '[findDbUserIdByCognitoUuid] ERROR: cognitoUuid is empty or invalid:',
        cognitoUuid,
      );
      throw new NotFoundException('Cognito UUID is missing or invalid');
    }
    // Remove dashes if present (standard UUID format)
    const normalized = cognitoUuid.replace(/-/g, '');
    if (!/^[a-fA-F0-9]{32}$/.test(normalized)) {
      console.error(
        '[findDbUserIdByCognitoUuid] ERROR: Normalized UUID is not 32 hex chars:',
        normalized,
      );
      throw new NotFoundException('Cognito UUID format is invalid');
    }
    const user = await this.userRepository.findOne({
      where: { cognito_uuid: Buffer.from(normalized, 'hex') },
    });
    if (!user) {
      console.error(
        '[findDbUserIdByCognitoUuid] ERROR: No user found for cognito_uuid:',
        normalized,
      );
    }
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
    // Log the incoming Cognito UUID for verification
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
    const savedUser = (await this.userRepository.save(user)) as User;

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
    if (typeof createUserDto.seniors_in_household === 'number') {
      await addPlaceholders(createUserDto.seniors_in_household, 'Senior');
    }
    if (typeof createUserDto.adults_in_household === 'number') {
      await addPlaceholders(createUserDto.adults_in_household, 'Adult');
    }
    if (typeof createUserDto.children_in_household === 'number') {
      await addPlaceholders(createUserDto.children_in_household, 'Child');
    }

    // Remove cognito_uuid from the returned user object
    const { cognito_uuid, ...userWithoutCognito } = savedUser as any;
    return { user: userWithoutCognito, household_id: householdId };
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
      // Add more user fields as needed
    };
    await this.userRepository.update(id, userUpdate);
    // Find household for this user
    const householdId = dto.id;
    // Delegate to household PATCH logic
    await this.householdsService.updateHousehold(householdId, id, dto);
    // Return updated user and household
    const user = await this.findById(id);
    const household = await this.householdsService.getHouseholdById(householdId, id);
    return { user, household };
  }
}
