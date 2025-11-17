import { RegistrationsController } from '../registrations.controller';
import { RegistrationsService } from '../registrations.service';
import type { Request } from 'express';

class RegistrationsServiceMock implements Partial<RegistrationsService> {
  listForEvent = jest.fn();
  listForMe = jest.fn();
  registerForEvent = jest.fn();
  cancelRegistration = jest.fn();
  checkIn = jest.fn();
}

describe('RegistrationsController', () => {
  let controller: RegistrationsController;
  let service: RegistrationsServiceMock;

  beforeEach(() => {
    service = new RegistrationsServiceMock();
    controller = new RegistrationsController(service as unknown as RegistrationsService);
  });

  it('listForEvent delegates to service with parsed eventId', async () => {
    (service.listForEvent as jest.Mock).mockResolvedValueOnce([{ id: 1 }] as any);
    const result = await controller.listForEvent(42);
    expect(service.listForEvent).toHaveBeenCalledWith(42);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('listForMe passes user and guest token from request', async () => {
    (service.listForMe as jest.Mock).mockResolvedValueOnce([{ id: 2 }] as any);
    const req = {
      user: { sub: 'abc' },
      headers: { 'x-guest-token': 'guest-123' },
    } as unknown as Request;
    const result = await controller.listForMe(req);
    expect(service.listForMe).toHaveBeenCalledWith({ sub: 'abc' }, 'guest-123');
    expect(result).toEqual([{ id: 2 }]);
  });

  it('register forwards dto, user, and optional guest token', async () => {
    (service.registerForEvent as jest.Mock).mockResolvedValueOnce({
      id: 10,
      status: 'confirmed',
    } as any);
    const dto = { event_id: 5 } as any;
    const req = {
      user: { sub: 'jwt-user' },
      headers: { 'x-guest-token': 'guest-xyz' },
    } as unknown as Request;
    const result = await controller.register(dto, req);
    expect(service.registerForEvent).toHaveBeenCalledWith({ sub: 'jwt-user' }, dto, 'guest-xyz');
    expect(result).toEqual({ id: 10, status: 'confirmed' });
  });

  it('cancel calls service with user and id', async () => {
    (service.cancelRegistration as jest.Mock).mockResolvedValueOnce({
      id: 11,
      status: 'cancelled',
    } as any);
    const req = { user: { sub: 'user' } } as unknown as Request;
    const result = await controller.cancel(11, req);
    expect(service.cancelRegistration).toHaveBeenCalledWith({ sub: 'user' }, 11);
    expect(result).toEqual({ id: 11, status: 'cancelled' });
  });

  it('checkIn calls service with user and dto', async () => {
    (service.checkIn as jest.Mock).mockResolvedValueOnce({ id: 12, status: 'checked_in' } as any);
    const req = { user: { sub: 'user2' } } as unknown as Request;
    const dto = { registration_id: 12, attendee_ids: [] } as any;
    const result = await controller.checkIn(dto, req);
    expect(service.checkIn).toHaveBeenCalledWith({ sub: 'user2' }, dto);
    expect(result).toEqual({ id: 12, status: 'checked_in' });
  });
});
