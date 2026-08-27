import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsEventsService } from './leads-events.service';
import { MetrikaModule } from '../metrika/metrika.module';

@Module({
  imports: [MetrikaModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsEventsService],
  exports: [LeadsService, LeadsEventsService],
})
export class LeadsModule {}
