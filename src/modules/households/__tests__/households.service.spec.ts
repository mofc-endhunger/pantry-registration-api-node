import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, ObjectLiteral, DataSource } from 'typeorm';
import { HouseholdsService } from '../households.service';
import { Household } from '../../../entities/household.entity';
import { HouseholdMember } from '../../../entities/household-member.entity';
import { HouseholdAddress } from '../../../entities/household-address.entity';

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

describe('HouseholdsService', () => {
	let service: HouseholdsService;
	let householdsRepo: jest.Mocked<Repository<Household>>;
	let membersRepo: jest.Mocked<Repository<HouseholdMember>>;
	let addressesRepo: jest.Mocked<Repository<HouseholdAddress>>;

	beforeEach(async () => {
		const moduleRef = await Test.createTestingModule({
			providers: [
				HouseholdsService,
				{ provide: getRepositoryToken(Household), useValue: createRepoMock<Household>() },
				{ provide: getRepositoryToken(HouseholdMember), useValue: createRepoMock<HouseholdMember>() },
				{ provide: getRepositoryToken(HouseholdAddress), useValue: createRepoMock<HouseholdAddress>() },
				{ provide: DataSource, useValue: {} },
			],
		}).compile();
		service = moduleRef.get(HouseholdsService);
		householdsRepo = moduleRef.get(getRepositoryToken(Household));
		membersRepo = moduleRef.get(getRepositoryToken(HouseholdMember));
		addressesRepo = moduleRef.get(getRepositoryToken(HouseholdAddress));
	});

	it('createHousehold saves household and primary member then returns computed counts', async () => {
		householdsRepo.create.mockImplementation((x: any) => ({ id: 10, ...x }));
		householdsRepo.save.mockResolvedValue({ id: 10 } as any);
		membersRepo.create.mockImplementation((x: any) => ({ id: 20, ...x }));
		membersRepo.save.mockResolvedValue({ id: 20 } as any);
		// getHouseholdById called internally -> mock findOne to return household with members
		householdsRepo.findOne.mockResolvedValue({ id: 10, added_by: 1, members: [{ id: 20, is_active: true, date_of_birth: '1980-01-01' }] } as any);
		const res = await service.createHousehold(1, { primary_first_name: 'A', primary_last_name: 'B' } as any);
		expect(householdsRepo.save).toHaveBeenCalled();
		expect(membersRepo.save).toHaveBeenCalled();
		expect((res as any).counts.total).toBe(1);
	});

	it('getHouseholdById throws NotFound when missing', async () => {
		householdsRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.getHouseholdById(99, 1)).rejects.toThrow('Household not found');
	});

	it('getHouseholdById throws Forbidden when requester not owner', async () => {
		householdsRepo.findOne.mockResolvedValueOnce({ id: 1, added_by: 2 } as any);
		await expect(service.getHouseholdById(1, 1)).rejects.toThrow();
	});

	it('getHouseholdForPrimary returns computed counts', async () => {
		householdsRepo.findOne.mockResolvedValueOnce({ id: 5, added_by: 7, members: [
			{ is_active: true, date_of_birth: '1940-01-01' }, // senior
			{ is_active: true, date_of_birth: '2010-01-01' }, // child
			{ is_active: true, date_of_birth: '1990-01-01' }, // adult
		] } as any);
		const res = await service.getHouseholdForPrimary(7);
		expect((res as any).counts).toEqual(expect.objectContaining({ seniors: expect.any(Number), adults: expect.any(Number), children: expect.any(Number), total: 3 }));
	});

	it('updateHousehold updates fields, writes address history, upserts members, and returns via getHouseholdById', async () => {
		const existing: any = { id: 11, added_by: 1, members: [ { id: 100, number: 1 } ], addresses: [] };
		householdsRepo.findOne.mockResolvedValueOnce(existing);
		householdsRepo.save.mockResolvedValueOnce(existing);
		// prepare members and addresses
		membersRepo.save.mockImplementation(async (m: any) => m);
		addressesRepo.create.mockImplementation((x: any) => x);
		const spyGet = jest.spyOn(service as any, 'getHouseholdById').mockResolvedValue({ id: 11 } as any);
		await service.updateHousehold(11, 1, {
			name: 'New', identification_code: 'ABC', deleted_on: '2025-01-01',
			line_1: '123', city: 'Town', state: 'OH', zip_code: '43085',
			members: [
				{ id: 100, number: 2, first_name: 'J', last_name: 'D', date_of_birth: '2000-01-01', is_active: true }, // update
				{ number: 3, first_name: 'N', last_name: 'M', date_of_birth: '2015-01-01', is_active: true, user_id: '9' }, // create
			],
		} as any);
		expect(householdsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New', identification_code: 'ABC' }));
		expect(addressesRepo.update).toHaveBeenCalled();
		expect(addressesRepo.save).toHaveBeenCalledWith(expect.objectContaining({ household_id: 11, line_1: '123' }));
		expect(membersRepo.remove).toHaveBeenCalledTimes(0); // no removals since incoming contains id 100
		expect(membersRepo.save).toHaveBeenCalled();
		expect(spyGet).toHaveBeenCalledWith(11, 1);
	});

	it('listMembers returns members when requester owns', async () => {
		householdsRepo.findOne.mockResolvedValueOnce({ id: 1, added_by: 1 } as any);
		membersRepo.find.mockResolvedValueOnce([{ id: 1 }, { id: 2 }] as any);
		const res = await service.listMembers(1, 1);
		expect(res.length).toBe(2);
	});

	it('listMembers throws when not found', async () => {
		householdsRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.listMembers(1, 1)).rejects.toThrow('Household not found');
	});

	it('addMember validates ownership and saves', async () => {
		householdsRepo.findOne.mockResolvedValueOnce({ id: 1, added_by: 1 } as any);
		membersRepo.create.mockImplementation((x: any) => x);
		membersRepo.save.mockResolvedValueOnce({ id: 3 } as any);
		const res = await service.addMember(1, 1, { first_name: 'A', last_name: 'B', date_of_birth: '2000-01-01' } as any);
		expect(res).toEqual(expect.objectContaining({ id: 3 }));
	});

	it('updateMember throws when household not found or member not found', async () => {
		householdsRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.updateMember(1, 2, 1, {} as any)).rejects.toThrow('Household not found');
		householdsRepo.findOne.mockResolvedValueOnce({ id: 1, added_by: 1 } as any);
		membersRepo.findOne.mockResolvedValueOnce(null as any);
		await expect(service.updateMember(1, 2, 1, {} as any)).rejects.toThrow('Member not found');
	});

	it('updateMember applies fields and saves', async () => {
		householdsRepo.findOne.mockResolvedValueOnce({ id: 1, added_by: 1 } as any);
		membersRepo.findOne.mockResolvedValueOnce({ id: 2, household_id: 1, first_name: 'X' } as any);
		membersRepo.save.mockImplementation(async (m: any) => m);
		const res = await service.updateMember(1, 2, 1, { first_name: 'Y' } as any);
		expect((res as any).first_name).toBe('Y');
	});

	it('deactivateMember returns existing if already inactive, else deactivates', async () => {
		householdsRepo.findOne.mockResolvedValue({ id: 1, added_by: 1 } as any);
		// already inactive
		membersRepo.findOne.mockResolvedValueOnce({ id: 2, household_id: 1, is_active: false } as any);
		const res1 = await service.deactivateMember(1, 2, 1);
		expect((res1 as any).is_active).toBe(false);
		// active -> deactivate
		membersRepo.findOne.mockResolvedValueOnce({ id: 2, household_id: 1, is_active: true } as any);
		membersRepo.save.mockImplementation(async (m: any) => ({ ...m }));
		const res2 = await service.deactivateMember(1, 2, 1);
		expect((res2 as any).is_active).toBe(false);
	});

	it('findHouseholdIdByUserId returns id when head member exists else undefined', async () => {
		membersRepo.findOne.mockResolvedValueOnce({ household_id: 42 } as any);
		expect(await service.findHouseholdIdByUserId(9)).toBe(42);
		membersRepo.findOne.mockResolvedValueOnce(null as any);
		expect(await service.findHouseholdIdByUserId(9)).toBeUndefined();
	});
});
