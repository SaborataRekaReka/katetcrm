import {
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { JwtPayload } from '../modules/auth/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { SERVICE_API_SCOPES_KEY } from './service-api-scopes.decorator';
import {
	SERVICE_API_TOKEN_MARKER,
	isServiceApiScope,
	parseServiceApiToken,
	serviceApiTokenHashMatches,
	type ServiceApiScope,
} from './service-api-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	private readonly readOnlyEmails: Set<string>;

	constructor(
		private readonly config: ConfigService,
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {
		super();

		const raw = this.config.get<string>('DEMO_READONLY_EMAILS', 'demo@katet.local');
		this.readOnlyEmails = new Set(
			raw
				.split(',')
				.map((item) => item.trim().toLowerCase())
				.filter((item) => item.length > 0),
		);
	}

	canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<{
			headers?: { authorization?: string | string[] };
		}>();
		const authorization = request.headers?.authorization;
		const rawAuthorization = Array.isArray(authorization) ? authorization[0] : authorization;
		const match = /^Bearer\s+(.+)$/i.exec(rawAuthorization ?? '');
		const bearerToken = match?.[1]?.trim();

		if (bearerToken?.startsWith(SERVICE_API_TOKEN_MARKER)) {
			return this.activateServiceApiToken(context, bearerToken);
		}

		return super.canActivate(context);
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

	private async activateServiceApiToken(
		context: ExecutionContext,
		rawToken: string,
	): Promise<boolean> {
		const parsed = parseServiceApiToken(rawToken);
		if (!parsed) throw new UnauthorizedException('Invalid service API token');

		const stored = await this.prisma.serviceApiToken.findUnique({
			where: { tokenPrefix: parsed.tokenPrefix },
			include: {
				actorUser: {
					select: { id: true, email: true, role: true, isActive: true },
				},
			},
		});

		const isExpired = stored?.expiresAt ? stored.expiresAt.getTime() <= Date.now() : false;
		if (
			!stored
			|| stored.revokedAt
			|| isExpired
			|| !stored.actorUser.isActive
			|| !serviceApiTokenHashMatches(rawToken, stored.tokenHash)
		) {
			throw new UnauthorizedException('Invalid service API token');
		}

		const requiredScopes = this.reflector.getAllAndOverride<
			readonly ServiceApiScope[] | undefined
		>(
			SERVICE_API_SCOPES_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (!requiredScopes || requiredScopes.length === 0) {
			throw new ForbiddenException('Service API token is not allowed for this endpoint');
		}

		const scopes = stored.scopes.filter(isServiceApiScope);
		if (!requiredScopes.every((scope) => scopes.includes(scope))) {
			throw new ForbiddenException('Service API token scope is insufficient');
		}

		const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
		request.user = {
			sub: stored.actorUser.id,
			email: stored.actorUser.email,
			role: stored.actorUser.role,
			authType: 'service',
			serviceTokenId: stored.id,
			serviceTokenName: stored.name,
			scopes,
		};

		return true;
	}
}
