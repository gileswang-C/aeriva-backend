import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  ExerciseEnvironment,
  ExercisesService,
} from '../exercises/exercises.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingPlansService {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly prisma: PrismaService,
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

    if (availableExercises.length === 0) {
      throw new BadRequestException(
        'No available exercises found for this user, environment, and target muscle',
      );
    }

    const exercises = availableExercises.map(
      (exercise, index) => ({
        exerciseId: exercise.id,
        name: exercise.name,
        targetMuscle: exercise.targetMuscle,
        difficulty: exercise.difficulty,
        equipment: exercise.equipment,
        order: index + 1,
        sets: 3,
        reps: 10,
        restSeconds: 60,
      }),
    );

    const planId = await this.prisma.$transaction(
      async (tx) => {
        const plan = await tx.trainingPlan.create({
          data: {
            userId,
            environment,
            targetMuscle,
            status: 'ACTIVE',
          },
        });

        await tx.trainingPlanExercise.createMany({
          data: exercises.map((exercise) => ({
            planId: plan.id,
            exerciseId: exercise.exerciseId,
            order: exercise.order,
            sets: exercise.sets,
            reps: exercise.reps,
            restSeconds: exercise.restSeconds,
          })),
        });

        return plan.id;
      },
    );

    return {
      planId,
      userId,
      environment,
      targetMuscle,
      status: 'ACTIVE',
      exerciseCount: exercises.length,
      exercises,
    };
  }

  async findById(planId: number) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: {
        id: planId,
      },
      include: {
        exercises: {
          include: {
            exercise: {
              include: {
                equipment: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!plan) {
      throw new BadRequestException(
        `Training plan not found: ${planId}`,
      );
    }

    return {
      planId: plan.id,
      userId: plan.userId,
      environment: plan.environment,
      targetMuscle: plan.targetMuscle,
      status: plan.status,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      exerciseCount: plan.exercises.length,
      exercises: plan.exercises.map((item) => ({
        exerciseId: item.exercise.id,
        name: item.exercise.name,
        targetMuscle: item.exercise.targetMuscle,
        difficulty: item.exercise.difficulty,
        equipment: item.exercise.equipment,
        order: item.order,
        sets: item.sets,
        reps: item.reps,
        restSeconds: item.restSeconds,
      })),
    };
  }
}