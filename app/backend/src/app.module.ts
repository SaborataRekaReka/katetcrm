import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ActivityModule } from './modules/activity/activity.module';
import { ClientsModule } from './modules/clients/clients.module';
import { LeadsModule } from './modules/leads/leads.module';
import { DirectoriesModule } from './modules/directories/directories.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { DeparturesModule } from './modules/departures/departures.module';
import { CompletionsModule } from './modules/completions/completions.module';
import { StatsModule } from './modules/stats/stats.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ImportsModule } from './modules/imports/imports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NavigationModule } from './modules/navigation/navigation.module';
import { BugReportsModule } from './modules/bug-reports/bug-reports.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    ActivityModule,
    UsersModule,
    AuthModule,
    ClientsModule,
    LeadsModule,
    DirectoriesModule,
    ApplicationsModule,
    ReservationsModule,
    DeparturesModule,
    CompletionsModule,
    IntegrationsModule,
    ImportsModule,
    SettingsModule,
    TasksModule,
    BugReportsModule,
    NavigationModule,
    StatsModule,
    HealthModule,
  ],
})
export class AppModule {}
