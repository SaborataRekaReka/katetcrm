import { Module } from '@nestjs/common';
import { CompletionsController } from './completions.controller';
import { CompletionsService } from './completions.service';

@Module({
  controllers: [CompletionsController],
  providers: [CompletionsService],
  exports: [CompletionsService],
})
export class CompletionsModule {}
