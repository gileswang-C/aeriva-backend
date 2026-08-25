import { Module } from '@nestjs/common';
import { TrainingSessionsService } from './training-sessions.service';
import { TrainingAnalyticsService } from './training-analytics.service';
import { TrainingSessionsController } from './training-sessions.controller';
import { TrainingFeedbackModule } from '../training-feedback/training-feedback.module';

@Module({
  imports: [TrainingFeedbackModule],
  providers: [
    TrainingSessionsService,
    TrainingAnalyticsService,
  ],
  controllers: [TrainingSessionsController],
})
export class TrainingSessionsModule {}
