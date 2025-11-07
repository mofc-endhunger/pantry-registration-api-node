import { RolesGuard } from '../roles.guard';
import { Reflector } from '@nestjs/core';

function createContextWithUser(user: any) {
	return {
		switchToHttp: () => ({ getRequest: () => ({ user }) }),
		getHandler: () => ({}),
		getClass: () => ({}),
	} as any;
}

describe('RolesGuard', () => {
	let reflector: Reflector;
	let guard: RolesGuard;

	beforeEach(() => {
		reflector = {
			getAllAndOverride: jest.fn(),
		} as any as Reflector;
		guard = new RolesGuard(reflector);
	});

	it('allows when no roles required', () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce([]);
		const ctx = createContextWithUser({});
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('allows when user has required role via cognito:groups', () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(['admin']);
		const ctx = createContextWithUser({ 'cognito:groups': ['admin'] });
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('allows when user has required role via roles array', () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(['staff']);
		const ctx = createContextWithUser({ roles: ['staff'] });
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('denies when user lacks role', () => {
		(reflector.getAllAndOverride as jest.Mock).mockReturnValueOnce(['admin']);
		const ctx = createContextWithUser({ roles: ['user'] });
		expect(() => guard.canActivate(ctx)).toThrow('Insufficient role');
	});
});
