import { Module } from '@nestjs/common';
import { TrainingFeedbackService } from './training-feedback.service';
import { TrainingFeedbackController } from './training-feedback.controller';

@Module({
  controllers: [TrainingFeedbackController],
  providers: [TrainingFeedbackService],
})
export class TrainingFeedbackModule {}
