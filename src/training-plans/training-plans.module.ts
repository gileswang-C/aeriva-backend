import { Module } from '@nestjs/common';
import { ExercisesModule } from '../exercises/exercises.module';
import { TrainingPlansController } from './training-plans.controller';
import { TrainingPlansService } from './training-plans.service';

@Module({
  imports: [ExercisesModule],
  controllers: [TrainingPlansController],
  providers: [TrainingPlansService],
})
export class TrainingPlansModule {}