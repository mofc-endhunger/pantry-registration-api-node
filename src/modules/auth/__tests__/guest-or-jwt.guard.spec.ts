import { GuestOrJwtAuthGuard } from '../guest-or-jwt.guard';
import { Reflector } from '@nestjs/core';

function createExecutionContext(req: any) {
	return {
		switchToHttp: () => ({ getRequest: () => req }),
	} as any;
}

describe('GuestOrJwtAuthGuard', () => {
	let repo: { findOne: jest.Mock };
	let guard: GuestOrJwtAuthGuard;
	let parentProto: any;

	beforeEach(() => {
		repo = { findOne: jest.fn() } as any;
		guard = new GuestOrJwtAuthGuard(new Reflector() as any, repo as any);
		// Access parent prototype (class returned by AuthGuard('jwt'))
		parentProto = Object.getPrototypeOf(Object.getPrototypeOf(guard));
	});

	it('returns true and sets authType=cognito when JWT succeeds', async () => {
		jest.spyOn(parentProto, 'canActivate').mockResolvedValueOnce(true);
		const req: any = { headers: {}, user: { sub: 'u' } };
		const res = await guard.canActivate(createExecutionContext(req));
		expect(res).toBe(true);
		expect(req.user.authType).toBe('cognito');
	});

	it('falls back to guest token when JWT fails and valid token exists', async () => {
		jest.spyOn(parentProto, 'canActivate').mockResolvedValueOnce(false);
		repo.findOne.mockResolvedValueOnce({ user_id: 10, expires_at: new Date(Date.now() + 10000) });
		const req: any = { headers: { 'x-guest-token': 't1' } };
		const res = await guard.canActivate(createExecutionContext(req));
		expect(res).toBe(true);
		expect(req.user).toEqual({ authType: 'guest', dbUserId: 10 });
	});

	it('returns false when no JWT and no guest token', async () => {
		jest.spyOn(parentProto, 'canActivate').mockRejectedValueOnce(new Error('no'));
		const req: any = { headers: {} };
		const res = await guard.canActivate(createExecutionContext(req));
		expect(res).toBe(false);
	});
});
