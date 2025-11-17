import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

describe('AuthController', () => {
	let controller: AuthController;
	let service: {
		registerGuest: jest.Mock;
		login: jest.Mock;
		register: jest.Mock;
		requestPasswordReset: jest.Mock;
		resetPassword: jest.Mock;
		facebookAuth: jest.Mock;
	};

	beforeEach(() => {
		service = {
			registerGuest: jest.fn().mockResolvedValue({ id: 1 }),
			login: jest.fn().mockResolvedValue({ access_token: 'jwt' }),
			register: jest.fn().mockResolvedValue({ id: 2 }),
			requestPasswordReset: jest.fn().mockResolvedValue({ message: 'ok' }),
			resetPassword: jest.fn().mockResolvedValue({ message: 'ok' }),
			facebookAuth: jest.fn().mockReturnValue({ message: 'fb' }),
		} as any;
		controller = new AuthController(service as unknown as AuthService);
	});

	it('registerGuest delegates to service', async () => {
		const res = await controller.registerGuest();
		expect(service.registerGuest).toHaveBeenCalled();
		expect(res).toEqual({ id: 1 });
	});

	it('login/register delegate to service', async () => {
		await controller.login({ email: 'a', password: 'b' } as any);
		await controller.register({ email: 'a', password: 'b' } as any);
		expect(service.login).toHaveBeenCalled();
		expect(service.register).toHaveBeenCalled();
	});

	it('password reset endpoints delegate to service', async () => {
		await controller.requestPasswordReset({ email: 'a' } as any);
		await controller.resetPassword({ token: 't', newPassword: 'pw' } as any);
		expect(service.requestPasswordReset).toHaveBeenCalled();
		expect(service.resetPassword).toHaveBeenCalled();
	});

	it('facebookAuth delegates to service', () => {
		const res = controller.facebookAuth({} as any);
		expect(service.facebookAuth).toHaveBeenCalled();
		expect(res).toEqual({ message: 'fb' });
	});
});
