import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './jwt.strategy';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; fullName: string; role: JwtPayload['role'] };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Неверные учётные данные');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверные учётные данные');
    return this.issueTokens({ sub: user.id, email: user.email, role: user.role }).then((tokens) => ({
      ...tokens,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    }));
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedException('User inactive');
    const tokens = await this.issueTokens({ sub: user.id, email: user.email, role: user.role });
    return {
      ...tokens,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    };
  }

  private async issueTokens(payload: JwtPayload) {
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '1d'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
    });
    return { accessToken, refreshToken };
  }
}
