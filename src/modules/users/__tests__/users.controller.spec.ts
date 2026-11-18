import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import type { UpdateUserWithHouseholdDto } from '../dto/update-user-with-household.dto';
import { ROLES_KEY } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
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
    expect(res).toEqual(expect.objectContaining({ id: 99 }));
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

  describe('update only lets a user change their own profile (SUP-1168)', () => {
    const body = { household_id: 9, city: 'Columbus' } as unknown as UpdateUserWithHouseholdDto;
    const asCaller = (sub: string) => ({ user: { userId: sub } }) as unknown as Request;

    it('delegates when the path id is the caller', async () => {
      service.findDbUserIdByCognitoUuid.mockResolvedValueOnce(22);
      service.updateUserWithHousehold.mockResolvedValueOnce({ ok: true });
      const res = await controller.update(22, body, asCaller('sub-22'));
      expect(service.findDbUserIdByCognitoUuid).toHaveBeenCalledWith('sub-22');
      expect(service.updateUserWithHousehold).toHaveBeenCalledWith(22, body);
      expect(res).toEqual({ success: true });
    });

    it("refuses another user's id with 403 and writes nothing", async () => {
      service.findDbUserIdByCognitoUuid.mockResolvedValueOnce(22);
      await expect(controller.update(23, body, asCaller('sub-22'))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(service.updateUserWithHousehold).not.toHaveBeenCalled();
    });

    it('answers 404 when the token has no users row, and writes nothing', async () => {
      service.findDbUserIdByCognitoUuid.mockResolvedValueOnce(null);
      await expect(controller.update(22, body, asCaller('sub-none'))).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(service.updateUserWithHousehold).not.toHaveBeenCalled();
    });
  });

  describe('lookups by id and soft delete are staff-only (SUP-1168)', () => {
    const staffOnly = ['softDelete', 'restore', 'findById', 'findByIdentificationCode'] as const;

    it.each(staffOnly)('%s requires the staff or admin role', (method) => {
      const handler = UsersController.prototype[method];
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(['staff', 'admin']);
      expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
    });

    it.each(['getCurrentUser', 'create', 'update'] as const)(
      '%s stays open to any signed-in user',
      (method) => {
        expect(Reflect.getMetadata(ROLES_KEY, UsersController.prototype[method])).toBeUndefined();
      },
    );
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
