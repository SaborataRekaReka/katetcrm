import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { LeadsModule } from '../leads/leads.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [LeadsModule, ClientsModule],
  controllers: [ImportsController],
  providers: [ImportsService],
})
export class ImportsModule {}
