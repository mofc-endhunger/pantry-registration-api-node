import { GuestAuthenticationsController } from '../guest-authentications.controller';
import { GuestAuthenticationsService } from '../guest-authentications.service';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

describe('GuestAuthenticationsController', () => {
	let controller: GuestAuthenticationsController;
	let service: { createGuest: jest.Mock; updateGuestByToken: jest.Mock };

	beforeEach(() => {
		service = { createGuest: jest.fn().mockResolvedValue({ id: 1 }), updateGuestByToken: jest.fn().mockResolvedValue({ id: 2 }) } as any;
		controller = new GuestAuthenticationsController(service as unknown as GuestAuthenticationsService);
	});

	it('create delegates to service', async () => {
		const res = await controller.create({ phone: '555' } as any);
		expect(service.createGuest).toHaveBeenCalledWith({ phone: '555' });
		expect(res).toEqual({ id: 1 });
	});

	it('update requires X-Guest-Token header', async () => {
		await expect(controller.update({ headers: {} } as unknown as Request, { phone: '555' } as any)).rejects.toThrow(BadRequestException);
	});

	it('update delegates to service with token', async () => {
		const req = { headers: { 'x-guest-token': 'tok' } } as unknown as Request;
		const res = await controller.update(req, { phone: '777' } as any);
		expect(service.updateGuestByToken).toHaveBeenCalledWith('tok', { phone: '777' });
		expect(res).toEqual({ id: 2 });
	});
});
