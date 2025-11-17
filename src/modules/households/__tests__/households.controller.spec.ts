import { Test } from '@nestjs/testing';
import { HouseholdsController } from '../households.controller';
import { HouseholdsService } from '../households.service';
import { UsersService } from '../../users/users.service';

function mockReq(user: any) {
	return { user } as any;
}

describe('HouseholdsController', () => {
	let controller: HouseholdsController;
	let householdsService: { createHousehold: jest.Mock; getHouseholdById: jest.Mock; updateHousehold: jest.Mock };
	let usersService: { findDbUserIdByCognitoUuid: jest.Mock };

	beforeEach(async () => {
		householdsService = {
			createHousehold: jest.fn().mockResolvedValue({ id: 1 }),
			getHouseholdById: jest.fn().mockResolvedValue({ id: 2 }),
			updateHousehold: jest.fn().mockResolvedValue({ id: 3 }),
		} as any;
		usersService = { findDbUserIdByCognitoUuid: jest.fn().mockResolvedValue(99) } as any;

		const moduleRef = await Test.createTestingModule({
			controllers: [HouseholdsController],
			providers: [
				{ provide: HouseholdsService, useValue: householdsService },
				{ provide: UsersService, useValue: usersService },
			],
		}).compile();

		controller = moduleRef.get(HouseholdsController);
	});

	it('create extracts user and delegates to service', async () => {
		const dto: any = { name: 'H' };
		const res = await controller.create(dto, mockReq({ userId: 'uuid' }));
		expect(usersService.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('uuid');
		expect(householdsService.createHousehold).toHaveBeenCalledWith(99, dto);
		expect(res).toEqual({ id: 1 });
	});

	it('findOne uses user.id fallback and delegates', async () => {
		const res = await controller.findOne('10', mockReq({ id: 'uuid2' }));
		expect(usersService.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('uuid2');
		expect(householdsService.getHouseholdById).toHaveBeenCalledWith(10, 99);
		expect(res).toEqual({ id: 2 });
	});

	it('update delegates with parsed id and dto', async () => {
		const dto: any = { name: 'New' };
		const res = await controller.update('15', dto, mockReq({ userId: 'uuid3' }));
		expect(usersService.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('uuid3');
		expect(householdsService.updateHousehold).toHaveBeenCalledWith(15, 99, dto);
		expect(res).toEqual({ id: 3 });
	});
});
