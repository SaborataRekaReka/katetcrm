import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from '../modules/auth/jwt.strategy';
import {
  PERMISSIONS_MATRIX_KEY,
  normalizePermissionsMatrix,
} from '../modules/users/permissions-matrix.defaults';
import { PrismaService } from '../prisma/prisma.service';
import { CAPABILITIES_KEY } from './capabilities.decorator';

@Injectable()
export class CapabilitiesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(CAPABILITIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!user) return false;

    // Service API tokens are already restricted per endpoint by JwtAuthGuard scopes.
    // Do not make their explicit scopes depend on the mutable UI permissions matrix.
    if (user.authType === 'service') return true;

    const matrix = await this.readPermissionsMatrix();
    const byId = new Map(matrix.capabilities.map((item) => [item.id, item]));

    return required.every((capabilityId) => {
      const capability = byId.get(capabilityId);
      if (!capability) return false;
      return Boolean(capability.matrix[user.role]);
    });
  }

  private async readPermissionsMatrix() {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: PERMISSIONS_MATRIX_KEY },
      select: { payload: true },
    });

    if (!existing) {
      return normalizePermissionsMatrix(null);
    }

    return normalizePermissionsMatrix(existing.payload);
  }
}
