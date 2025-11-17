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
    service.findDbUserIdByCognitoUuid.mockResolvedValueOnce(42);
    service.getHouseholdTemplateForUser.mockResolvedValueOnce({ id: 99 });
    const req = { user: { userId: 'sub-1' } } as unknown as Request;
    const res = await controller.getCurrentUser(req);
    expect(service.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('sub-1');
    expect(res).toEqual({ id: 99 });
  });

  it('getCurrentUser throws when DB user not found', async () => {
    service.findDbUserIdByCognitoUuid.mockResolvedValueOnce(null);
    const req = { user: { userId: 'sub-2' } } as unknown as Request;
    await expect(controller.getCurrentUser(req)).rejects.toThrow('User not found');
  });

  it('softDelete and restore delegate to service', async () => {
    service.softDeleteUser.mockResolvedValueOnce({ id: 1, deleted_on: new Date() });
    service.restoreUser.mockResolvedValueOnce({ id: 1, deleted_on: null });
    await controller.softDelete(1);
    await controller.restore(1);
    expect(service.softDeleteUser).toHaveBeenCalledWith(1);
    expect(service.restoreUser).toHaveBeenCalledWith(1);
  });

  it('findById delegates to service', async () => {
    service.findById.mockResolvedValueOnce({ id: 55 });
    const res = await controller.findById(55);
    expect(service.findById).toHaveBeenCalledWith(55);
    expect(res).toEqual({ id: 55 });
  });

  it('update delegates to service with id and body', async () => {
    service.updateUserWithHousehold.mockResolvedValueOnce({ ok: true });
    const body: any = { household_id: 9, city: 'Columbus' };
    const res = await controller.update(22, body, {} as Request);
    expect(service.updateUserWithHousehold).toHaveBeenCalledWith(22, body);
    expect(res).toEqual({ success: true });
  });

  it('create builds dto from JWT and delegates to service', async () => {
    service.create.mockResolvedValueOnce({ id: 7 });
    const req = {
      user: { email: 'u@example.com', userId: 'uuid-1', user_type: 'customer' },
    } as unknown as Request;
    const res = await controller.create({ identification_code: undefined } as any, req);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'u@example.com',
        cognito_uuid: 'uuid-1',
        user_type: 'customer',
        identification_code: 'uuid-1',
      }),
    );
    expect(res).toEqual({ id: 7 });
  });

  it('findByIdentificationCode delegates with query value', async () => {
    service.findByIdentificationCode.mockResolvedValueOnce({ id: 88 });
    const res = await controller.findByIdentificationCode('code-123');
    expect(service.findByIdentificationCode).toHaveBeenCalledWith('code-123');
    expect(res).toEqual({ id: 88 });
  });
});
