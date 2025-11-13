import { Test } from '@nestjs/testing';
import { AuthCallbacksController } from '../auth-callbacks.controller';
import { AuthCallbacksService } from '../auth-callbacks.service';

describe('AuthCallbacksController', () => {
	let controller: AuthCallbacksController;
	let svc: { facebookCallback: jest.Mock };

	beforeEach(async () => {
		svc = { facebookCallback: jest.fn().mockResolvedValue({ ok: true }) } as any;
		const moduleRef = await Test.createTestingModule({
			controllers: [AuthCallbacksController],
			providers: [{ provide: AuthCallbacksService, useValue: svc }],
		}).compile();
		controller = moduleRef.get(AuthCallbacksController);
	});

	it('delegates facebookCallback', async () => {
		const dto: any = { userID: 'u', accessToken: 't' };
		const res = await controller.facebookCallback(dto);
		expect(svc.facebookCallback).toHaveBeenCalledWith(dto);
		expect(res).toEqual({ ok: true });
	});
});
