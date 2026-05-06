import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { CompletionsModule } from '../completions/completions.module';
import { DeparturesModule } from '../departures/departures.module';
import { LeadsModule } from '../leads/leads.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { NavigationController } from './navigation.controller';
import { NavigationService } from './navigation.service';

@Module({
  imports: [
    LeadsModule,
    ApplicationsModule,
    ReservationsModule,
    DeparturesModule,
    CompletionsModule,
  ],
  controllers: [NavigationController],
  providers: [NavigationService],
})
export class NavigationModule {}
