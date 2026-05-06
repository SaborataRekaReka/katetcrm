import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ResolveDeepLinkQueryDto } from './navigation.dto';
import { NavigationService } from './navigation.service';

@Controller('navigation')
@UseGuards(JwtAuthGuard)
export class NavigationController {
  constructor(private readonly navigation: NavigationService) {}

  @Get('deep-link')
  resolveDeepLink(
    @Query() query: ResolveDeepLinkQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.navigation.resolve(query.entityType, query.entityId, {
      id: user.sub,
      role: user.role,
    });
  }
}
