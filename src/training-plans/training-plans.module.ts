import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { BodyStateModule } from '../body-state/body-state.module';
import { TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

@Module({
  imports: [ExercisesModule, BodyStateModule],
  controllers: [TrainingPlansController],
  providers: [TrainingPlansService],
})
export class TrainingPlansModule {}