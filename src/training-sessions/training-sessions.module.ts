import { Module } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import { TrainingAnalyticsService } from './training-analytics.service';
import { TrainingSessionsController } from './training-sessions.controller';

@Module({
  providers: [
    TrainingSessionsService,
    TrainingAnalyticsService,
  ],
  controllers: [TrainingSessionsController]
})
export class TrainingSessionsModule {}
