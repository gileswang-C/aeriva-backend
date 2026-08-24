import { Module } from '@nestjs/common';
import { TrainingAdjustmentsService } from './training-adjustments.service';
import { TrainingAdjustmentsController } from './training-adjustments.controller';

@Module({
  providers: [
    TrainingAdjustmentsService,
  ],
  controllers: [
    TrainingAdjustmentsController,
  ],
})
export class TrainingAdjustmentsModule {}
