import { Module } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import { TrainingSessionsController } from './training-sessions.controller';

@Module({
  providers: [TrainingSessionsService],
  controllers: [TrainingSessionsController]
})
export class TrainingSessionsModule {}
