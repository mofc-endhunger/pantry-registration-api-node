import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral } from 'typeorm';
import { UsersService } from '../users.service';
import { User } from '../../../entities/user.entity';
import { HouseholdsService } from '../../households/households.service';

function createRepoMock<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
	return {
		find: jest.fn(),
		findOne: jest.fn(),
		findBy: jest.fn(),
		findOneBy: jest.fn(),
		count: jest.fn(),
		create: jest.fn(),
		save: jest.fn(),
		remove: jest.fn(),
		update: jest.fn(),
		query: jest.fn(),
	} as any;
}

describe('UsersService', () => {
	let service: UsersService;
	let usersRepo: jest.Mocked<Repository<User>>;
	let householdsService: { createHousehold: jest.Mock; addMember: jest.Mock; getHouseholdById: jest.Mock; findHouseholdIdByUserId: jest.Mock; updateHousehold: jest.Mock };

	beforeEach(async () => {
		householdsService = {
			createHousehold: jest.fn().mockResolvedValue({ id: 77 }),
			addMember: jest.fn().mockResolvedValue(undefined),
			getHouseholdById: jest.fn().mockResolvedValue({ id: 77 }),
			findHouseholdIdByUserId: jest.fn().mockResolvedValue(77),
			updateHousehold: jest.fn().mockResolvedValue({ id: 77 }),
		} as any;
		const moduleRef = await Test.createTestingModule({
			providers: [
				UsersService,
				{ provide: getRepositoryToken(User), useValue: createRepoMock<User>() },
				{ provide: HouseholdsService, useValue: householdsService },
			],
		}).compile();
		service = moduleRef.get(UsersService);
		usersRepo = moduleRef.get(getRepositoryToken(User));
	});

	it('findDbUserIdByCognitoUuid validates and finds user id', async () => {
		await expect(service.findDbUserIdByCognitoUuid('')).rejects.toThrow('Cognito UUID is missing or invalid');
		await expect(service.findDbUserIdByCognitoUuid('not-a-uuid')).rejects.toThrow('Cognito UUID format is invalid');
		const uuid = '123e4567-e89b-12d3-a456-426614174000';
		usersRepo.findOne.mockResolvedValueOnce({ id: 5 } as any);
		const id = await service.findDbUserIdByCognitoUuid(uuid);
		expect(id).toBe(5);
	});

	it('create creates user and household with minimal info', async () => {
		usersRepo.findOne.mockResolvedValueOnce(null as any);
		usersRepo.create.mockImplementation((u: any) => ({ id: 10, ...u }));
		usersRepo.save.mockResolvedValueOnce({ id: 10, email: 'u@example.com' } as any);
		const res = await service.create({
			email: 'u@example.com',
			cognito_uuid: '123e4567e89b12d3a456426614174000',
			user_type: 'customer',
			identification_code: 'code',
		} as any);
		expect(res.user.id).toBe(10);
		expect(res.household_id).toBe(77);
		expect(householdsService.createHousehold).toHaveBeenCalledWith(10, expect.any(Object));
	});

	it('updateUserWithHousehold updates user and household (happy path)', async () => {
		usersRepo.findOneBy.mockResolvedValueOnce({ id: 10 } as any);
		const dto: any = { household_id: 88, city: 'Columbus', address_line_1: '123 A', members: [] };
		(await service .updateUserWithHousehold(10, dto));
		expect(usersRepo.update).toHaveBeenCalledWith(10, expect.any(Object));
		expect(householdsService.updateHousehold).toHaveBeenCalledWith(
			88,
			10,
			expect.objectContaining({ line_1: '123 A' }),
		);
		expect(householdsService.getHouseholdById).toHaveBeenCalledWith(88, 10);
	});

	it('updateUserWithHousehold falls back to dto.id when household_id missing', async () => {
		usersRepo.findOneBy.mockResolvedValueOnce({ id: 10 } as any);
		const dto: any = { id: 99, city: 'Columbus', members: [] };
		(await service.updateUserWithHousehold(10, dto));
		expect(householdsService.updateHousehold).toHaveBeenCalledWith(99, 10, dto);
	});

	it('findById throws NotFound when missing', async () => {
		usersRepo.findOneBy.mockResolvedValueOnce(null as any);
		await expect(service.findById(999)).rejects.toThrow('User not found');
	});

	it('findByIdentificationCode throws NotFound when missing', async () => {
		usersRepo.findOneBy.mockResolvedValueOnce(null as any);
		await expect(service.findByIdentificationCode('missing')).rejects.toThrow('User not found');
	});

	it('getHouseholdTemplateForUser throws when no household found for user', async () => {
		jest.spyOn(service, 'getHouseholdIdForUser').mockResolvedValueOnce(undefined as any);
		await expect(service.getHouseholdTemplateForUser(10)).rejects.toThrow('Household not found for user');
	});

	it('create restores soft-deleted existing user and proceeds', async () => {
		const existing: any = { id: 42, email: 'x@example.com', deleted_on: new Date() };
		usersRepo.findOne
			.mockResolvedValueOnce(existing) // find by cognito_uuid
			.mockResolvedValueOnce(existing); // second check by identification_code not used
		usersRepo.save.mockImplementation(async (u: any) => ({ ...existing, ...u, deleted_on: null }));
		const res = await service.create({
			email: 'x@example.com',
			cognito_uuid: '123e4567e89b12d3a456426614174000',
			user_type: 'customer',
			identification_code: 'code',
		} as any);
		expect(res.user.id).toBe(42);
		expect(householdsService.createHousehold).toHaveBeenCalledWith(42, expect.any(Object));
	});

	it('create updates active existing user fields and proceeds', async () => {
		const existing: any = { id: 43, email: 'y@example.com', deleted_on: null };
		usersRepo.findOne.mockResolvedValueOnce(existing);
		usersRepo.save.mockImplementation(async (u: any) => ({ ...existing, ...u }));
		const res = await service.create({
			email: 'y@example.com',
			cognito_uuid: '123e4567e89b12d3a456426614174000',
			user_type: 'customer',
			identification_code: 'code',
		} as any);
		expect(res.user.id).toBe(43);
		expect(householdsService.createHousehold).toHaveBeenCalledWith(43, expect.any(Object));
	});

	it('updateUserWithHousehold maps member first/last/dob into user update', async () => {
		const dto: any = {
			household_id: 77,
			members: [{ user_id: '10', first_name: 'Jane', last_name: 'Doe', date_of_birth: '1990-01-01' }],
			city: 'Columbus',
		};
		usersRepo.findOneBy.mockResolvedValueOnce({ id: 10 } as any);
		await service.updateUserWithHousehold(10, dto);
		expect(usersRepo.update).toHaveBeenCalledWith(
			10,
			expect.objectContaining({ first_name: 'Jane', last_name: 'Doe', date_of_birth: '1990-01-01', city: 'Columbus' }),
		);
	});

	it('create adds correct number of placeholders and syncs counts when provided as strings', async () => {
		// Arrange: new user creation path
		usersRepo.findOne.mockResolvedValueOnce(null as any);
		usersRepo.create.mockImplementation((u: any) => ({ id: 10, ...u }));
		usersRepo.save.mockResolvedValueOnce({ id: 10, email: 'u@example.com' } as any);
		// Make household recount return 5/5/5 so snapshot sync updates user
		householdsService.getHouseholdById.mockResolvedValueOnce({
			id: 77,
			counts: { seniors: 5, adults: 5, children: 5 },
		} as any);

		// Act
		await service.create({
			email: 'u@example.com',
			cognito_uuid: '123e4567e89b12d3a456426614174000',
			user_type: 'customer',
			identification_code: 'code',
			// Provide counts as strings to verify coercion
			seniors_in_household: '5' as any,
			adults_in_household: '5' as any,
			children_in_household: '5' as any,
		} as any);

		// Assert: placeholders were created 15 times (5+5+5)
		expect(householdsService.addMember).toHaveBeenCalledTimes(15);
		// Assert: snapshot sync updated user with 5/5/5
		expect(usersRepo.update).toHaveBeenCalledWith(
			10,
			expect.objectContaining({
				seniors_in_household: 5,
				adults_in_household: 5,
				children_in_household: 5,
			}),
		);
	});

	it('softDeleteUser and restoreUser call repo.update then return findById', async () => {
		usersRepo.findOneBy.mockResolvedValue({ id: 5 } as any);
		await service.softDeleteUser(5);
		await service.restoreUser(5);
		expect(usersRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({ deleted_on: expect.any(Date) }));
		expect(usersRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({ deleted_on: null }));
	});

	it('getHouseholdTemplateForUser returns household with user address fields', async () => {
		jest.spyOn(service, 'getHouseholdIdForUser').mockResolvedValueOnce(77 as any);
		// findById used internally
		jest.spyOn(service, 'findById').mockResolvedValueOnce({
			address_line_1: '123 Main',
			address_line_2: 'Apt 4',
			city: 'Columbus',
			state: 'OH',
			zip_code: '43085',
			phone: '555-555-5555',
			email: 'u@example.com',
		} as any);
		householdsService.getHouseholdById.mockResolvedValueOnce({ id: 77, title: 'H' } as any);
		const res = await service.getHouseholdTemplateForUser(10);
		expect(res).toEqual(
			expect.objectContaining({ id: 77, address_line_1: '123 Main', city: 'Columbus', email: 'u@example.com' }),
		);
	});
});
