import { Injectable } from '@nestjs/common';
import {
  ExerciseEnvironment,
  ExercisesService,
} from '../exercises/exercises.service';

@Injectable()
export class TrainingPlansService {
  constructor(
    private readonly exercisesService: ExercisesService,
  ) {}

  async generate(
    userId: string,
    environment: ExerciseEnvironment,
    targetMuscle: string,
  ) {
    const availableExercises =
      await this.exercisesService.findAvailableForUser(
        userId,
        environment,
        targetMuscle,
      );

    const exercises = availableExercises.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      targetMuscle: exercise.targetMuscle,
      difficulty: exercise.difficulty,
      equipment: exercise.equipment,
      sets: 3,
      reps: 10,
      restSeconds: 60,
    }));

    return {
      userId,
      environment,
      targetMuscle,
      exerciseCount: exercises.length,
      exercises,
    };
  }
}