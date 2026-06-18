import {
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload } from '../modules/auth/jwt.strategy';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly readOnlyEmails: Set<string>;

	constructor(private readonly config: ConfigService) {
		super();

		const raw = this.config.get<string>('DEMO_READONLY_EMAILS', 'demo@katet.local');
		this.readOnlyEmails = new Set(
			raw
				.split(',')
				.map((item) => item.trim().toLowerCase())
				.filter((item) => item.length > 0),
		);
	}

	handleRequest<TUser = JwtPayload>(
		err: unknown,
		user: JwtPayload | undefined,
		_info: unknown,
		context: ExecutionContext,
		_status?: unknown,
	): TUser {
		if (err || !user) {
			throw err ?? new UnauthorizedException();
		}

		const request = context.switchToHttp().getRequest<{ method?: string }>();
		const method = (request.method ?? 'GET').toUpperCase();

		if (this.isReadOnlyUser(user) && !SAFE_METHODS.has(method)) {
			throw new ForbiddenException('Демо-доступ имеет только права просмотра.');
		}

		return user as unknown as TUser;
	}

	private isReadOnlyUser(user: JwtPayload): boolean {
		return this.readOnlyEmails.has(user.email.trim().toLowerCase());
	}
}
