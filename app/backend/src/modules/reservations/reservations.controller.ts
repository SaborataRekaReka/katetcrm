import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  ReleaseReservationDto,
  ReservationListQueryDto,
  UpdateReservationDto,
} from './reservations.dto';
import {
  projectReservation,
  projectReservations,
} from '../../common/projections/reservation.projection';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly svc: ReservationsService) {}

  @Get()
  async list(
    @Query() query: ReservationListQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.svc.list(query, { id: user.sub, role: user.role });
    return { items: projectReservations(result.items as any), total: result.total };
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const r = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectReservation(r as any);
  }

  @Post()
  async create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const created = await this.svc.create(dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(created.id, { id: user.sub, role: user.role });
    return projectReservation(full as any);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.update(id, dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectReservation(full as any);
  }

  @Post(':id/release')
  async release(
    @Param('id') id: string,
    @Body() dto: ReleaseReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.svc.release(id, dto, { id: user.sub, role: user.role });
    const full = await this.svc.get(id, { id: user.sub, role: user.role });
    return projectReservation(full as any);
  }
}
