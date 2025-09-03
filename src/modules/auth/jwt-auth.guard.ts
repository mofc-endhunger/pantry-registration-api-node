import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	constructor() {
		super();
		console.log('JwtAuthGuard instantiated');
	}

		handleRequest(err: any, user: any, info: any, context: any) {
		const req = context.switchToHttp().getRequest();
		console.log('JwtAuthGuard.handleRequest:', {
			err,
			user,
			info,
			headers: req.headers,
			authorization: req.headers['authorization'],
			url: req.url
		});
		return super.handleRequest(err, user, info, context);
	}
}
