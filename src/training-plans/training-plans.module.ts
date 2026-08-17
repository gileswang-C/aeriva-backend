import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { BodyStateModule } from '../body-state/body-state.module';
import { PainRiskModule } from '../pain-risk/pain-risk.module';
import { TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

@Module({
  imports: [ExercisesModule, BodyStateModule, PainRiskModule],
  controllers: [TrainingPlansController],
  providers: [TrainingPlansService],
})
export class TrainingPlansModule {}