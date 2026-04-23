import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../modules/auth/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | JwtPayload[keyof JwtPayload] => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = req.user;
    return data ? user[data] : user;
  },
);
