import { ReservationsController } from '../reservations.controller';
import { ReservationsService } from '../reservations.service';
import type { Request } from 'express';

class ReservationsServiceMock implements Partial<ReservationsService> {
  listForMe = jest.fn();
  getOne = jest.fn();
}

describe('ReservationsController', () => {
  let controller: ReservationsController;
  let service: ReservationsServiceMock;

  beforeEach(() => {
    service = new ReservationsServiceMock();
    controller = new ReservationsController(service as unknown as ReservationsService);
  });

  it('list forwards user, guest token, and query params (with number parsing)', async () => {
    service.listForMe.mockResolvedValueOnce({
      reservations: [{ id: 1 }],
      total: 1,
      upcoming_count: 1,
      past_count: 0,
    });
    const req = {
      user: { sub: 'abc' },
      headers: { 'x-guest-token': 'guest-123' },
    } as unknown as Request;

    const result = await controller.list(req, 'upcoming', '2026-01-01', '2026-12-31', '25', '5');

    expect(service.listForMe).toHaveBeenCalledWith({
      user: { sub: 'abc' },
      guestToken: 'guest-123',
      type: 'upcoming',
      fromDate: '2026-01-01',
      toDate: '2026-12-31',
      limit: 25,
      offset: 5,
    });
    expect(result).toEqual({
      reservations: [{ id: 1 }],
      total: 1,
      upcoming_count: 1,
      past_count: 0,
    });
  });

  it('getOne passes user, guest token, and id', async () => {
    service.getOne.mockResolvedValueOnce({
      reservation: { id: 42 },
    });
    const req = {
      user: { sub: 'jwt-user' },
      headers: { 'x-guest-token': 'guest-xyz' },
    } as unknown as Request;

    const result = await controller.getOne(req, 42);

    expect(service.getOne).toHaveBeenCalledWith({
      user: { sub: 'jwt-user' },
      guestToken: 'guest-xyz',
      id: 42,
    });
    expect(result).toEqual({ reservation: { id: 42 } });
  });
});
