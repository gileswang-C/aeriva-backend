import { Module } from '@nestjs/common';
import { PainRiskModule } from '../pain-risk/pain-risk.module';
import { TrainingFeedbackService } from './training-feedback.service';
import { TrainingFeedbackController } from './training-feedback.controller';

@Module({
  imports: [PainRiskModule],
  controllers: [TrainingFeedbackController],
  providers: [TrainingFeedbackService],
})
export class TrainingFeedbackModule {}
