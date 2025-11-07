import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import type { Request } from 'express';

class UsersServiceMock {
	softDeleteUser = jest.fn();
	restoreUser = jest.fn();
	create = jest.fn();
	findById = jest.fn();
	findByIdentificationCode = jest.fn();
	findDbUserIdByCognitoUuid = jest.fn();
	getHouseholdTemplateForUser = jest.fn();
	updateUserWithHousehold = jest.fn();
}

describe('UsersController', () => {
	let controller: UsersController;
	let service: UsersServiceMock;

	beforeEach(() => {
		service = new UsersServiceMock();
		controller = new UsersController(service as unknown as UsersService);
	});

	it('getCurrentUser returns household for JWT user', async () => {
		(service.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValueOnce(42);
		(service.getHouseholdTemplateForUser as jest.Mock).mockResolvedValueOnce({ id: 99 });
		const req = { user: { userId: 'sub-1' } } as unknown as Request;
		const res = await controller.getCurrentUser(req);
		expect(service.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('sub-1');
		expect(res).toEqual({ id: 99 });
	});

	it('getCurrentUser throws when DB user not found', async () => {
		(service.findDbUserIdByCognitoUuid as jest.Mock).mockResolvedValueOnce(null);
		const req = { user: { userId: 'sub-2' } } as unknown as Request;
		await expect(controller.getCurrentUser(req)).rejects.toThrow('User not found');
	});

	it('softDelete and restore delegate to service', async () => {
		(service.softDeleteUser as jest.Mock).mockResolvedValueOnce({ id: 1, deleted_on: new Date() });
		(service.restoreUser as jest.Mock).mockResolvedValueOnce({ id: 1, deleted_on: null });
		await controller.softDelete(1);
		await controller.restore(1);
		expect(service.softDeleteUser).toHaveBeenCalledWith(1);
		expect(service.restoreUser).toHaveBeenCalledWith(1);
	});

	it('findById delegates to service', async () => {
		(service.findById as jest.Mock).mockResolvedValueOnce({ id: 55 });
		const res = await controller.findById(55);
		expect(service.findById).toHaveBeenCalledWith(55);
		expect(res).toEqual({ id: 55 });
	});

	it('update delegates to service with id and body', async () => {
		(service.updateUserWithHousehold as jest.Mock).mockResolvedValueOnce({ ok: true });
		const body: any = { household_id: 9, city: 'Columbus' };
		const res = await controller.update(22, body, {} as Request);
		expect(service.updateUserWithHousehold).toHaveBeenCalledWith(22, body);
		expect(res).toEqual({ ok: true });
	});
});
