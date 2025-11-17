import { JwtStrategy } from '../jwt.strategy';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy.validate', () => {
	const OLD_ENV = process.env;
	beforeEach(() => {
		process.env = { ...OLD_ENV };
	});
	afterEach(() => {
		process.env = OLD_ENV;
	});

	it('returns mapped user in local mode (USE_LOCAL_JWT=1)', () => {
		process.env.USE_LOCAL_JWT = '1';
		process.env.JWT_SECRET = 'test-secret';
		const strat = new JwtStrategy();
		const res = strat.validate({ sub: 'u1', email: 'a@b.com', username: 'user' } as any);
		expect(res).toEqual({ id: 'u1', userId: 'u1', email: 'a@b.com', username: 'user', cognito: true });
	});

	it('in Cognito mode: rejects access token with wrong client_id', () => {
		process.env.USE_LOCAL_JWT = '0';
		process.env.COGNITO_CLIENT_ID = 'cid';
		process.env.COGNITO_REGION = 'us-east-1';
		process.env.COGNITO_USER_POOL_ID = 'pool';
		const strat = new JwtStrategy();
		expect(() => strat.validate({ token_use: 'access', client_id: 'wrong' } as any)).toThrow(
			UnauthorizedException,
		);
	});

	it('in Cognito mode: accepts access token with matching client_id', () => {
		process.env.USE_LOCAL_JWT = '0';
		process.env.COGNITO_CLIENT_ID = 'cid';
		process.env.COGNITO_REGION = 'us-east-1';
		process.env.COGNITO_USER_POOL_ID = 'pool';
		const strat = new JwtStrategy();
		const res = strat.validate({ token_use: 'access', client_id: 'cid', sub: 's' } as any);
		expect(res.userId).toBe('s');
	});

	it('in Cognito mode: rejects id token with wrong aud', () => {
		process.env.USE_LOCAL_JWT = '0';
		process.env.COGNITO_CLIENT_ID = 'cid';
		process.env.COGNITO_REGION = 'us-east-1';
		process.env.COGNITO_USER_POOL_ID = 'pool';
		const strat = new JwtStrategy();
		expect(() => strat.validate({ token_use: 'id', aud: 'bad' } as any)).toThrow(UnauthorizedException);
	});

	it('in Cognito mode: accepts id token with matching aud', () => {
		process.env.USE_LOCAL_JWT = '0';
		process.env.COGNITO_CLIENT_ID = 'cid';
		process.env.COGNITO_REGION = 'us-east-1';
		process.env.COGNITO_USER_POOL_ID = 'pool';
		const strat = new JwtStrategy();
		const res = strat.validate({ token_use: 'id', aud: 'cid', sub: 's2' } as any);
		expect(res.userId).toBe('s2');
	});
});
