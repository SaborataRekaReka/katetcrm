import { Module } from '@nestjs/common';
import { DeparturesService } from './departures.service';
import { DeparturesController } from './departures.controller';
import { CompletionsModule } from '../completions/completions.module';

@Module({
  imports: [CompletionsModule],
  controllers: [DeparturesController],
  providers: [DeparturesService],
  exports: [DeparturesService],
})
export class DeparturesModule {}
