import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Capabilities } from '../../common/capabilities.decorator';
import { CapabilitiesGuard } from '../../common/capabilities.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import type { JwtPayload } from '../auth/jwt.strategy';
import {
  IntegrationEventListQueryDto,
  ReceiveIntegrationEventDto,
  RetryOrReplayIntegrationEventDto,
} from './integrations.dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Post('events/ingest')
  ingest(
    @Body() dto: ReceiveIntegrationEventDto,
    @Headers('x-integration-signature') signature?: string,
    @Headers('x-integration-timestamp') timestamp?: string,
  ) {
    return this.integrations.ingest(dto, { signature, timestamp });
  }

  @Post('events/mango')
  ingestMangoConnectorEvent(
    @Body() payload: Record<string, unknown>,
    @Headers('x-integration-signature') signature?: string,
    @Headers('x-integration-timestamp') timestamp?: string,
    @Headers('x-signature') altSignature?: string,
    @Headers('x-timestamp') altTimestamp?: string,
  ) {
    return this.integrations.ingestMangoConnectorEvent(payload, {
      signature: signature ?? altSignature,
      timestamp: timestamp ?? altTimestamp,
    });
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.integrations')
  list(@Query() query: IntegrationEventListQueryDto) {
    return this.integrations.list(query);
  }

  @Get('events/:id')
  @UseGuards(JwtAuthGuard, RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.integrations')
  getById(@Param('id') id: string) {
    return this.integrations.getById(id);
  }

  @Post('events/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.integrations')
  retry(
    @Param('id') id: string,
    @Body() dto: RetryOrReplayIntegrationEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.integrations.retryFailedEvent(id, user.sub, dto.reason);
  }

  @Post('events/:id/replay')
  @UseGuards(JwtAuthGuard, RolesGuard, CapabilitiesGuard)
  @Roles('admin')
  @Capabilities('admin.integrations')
  replay(
    @Param('id') id: string,
    @Body() dto: RetryOrReplayIntegrationEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.integrations.replayFailedEvent(id, user.sub, dto.reason);
  }
}
