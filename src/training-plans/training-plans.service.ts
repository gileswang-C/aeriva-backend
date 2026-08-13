import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
  ) {}

  async generate(
    userId: string,
    environment: string,
    targetMuscle: string,
  ) {
    if (
      environment !== 'HOME' &&
      environment !== 'GYM'
    ) {
      throw new BadRequestException(
        'environment must be HOME or GYM',
      );
    }

    const validatedEnvironment =
      environment as Parameters<
        ExercisesService['findAvailableForUser']
      >[1];

    const availableExercises =
      await this.exercisesService.findAvailableForUser(
        userId,
        validatedEnvironment,
        targetMuscle,
      );

    if (availableExercises.length === 0) {
      throw new BadRequestException(
        'No available exercises found for this user and environment',
      );
    }

    const exercisePlans = await Promise.all(
      availableExercises.map(
        async (exercise, index) => {
          const targetWeightKg =
            await this.getSuggestedWeight(
              userId,
              exercise.id,
            );

          return {
            exerciseId: exercise.id,
            order: index + 1,
            sets: 3,
            reps: 10,
            restSeconds: 60,
            targetWeightKg,
          };
        },
      ),
    );

    const plan = await this.prisma.$transaction(
      async (tx) => {
        const createdPlan =
          await tx.trainingPlan.create({
            data: {
              userId,
              environment,
              targetMuscle,
              status: 'ACTIVE',
            },
          });

        for (const exercisePlan of exercisePlans) {
          await tx.trainingPlanExercise.create({
            data: {
              planId: createdPlan.id,
              exerciseId:
                exercisePlan.exerciseId,
              order: exercisePlan.order,
              sets: exercisePlan.sets,
              reps: exercisePlan.reps,
              restSeconds:
                exercisePlan.restSeconds,
              targetWeightKg:
                exercisePlan.targetWeightKg,
            },
          });
        }

        return createdPlan;
      },
    );

    return this.findById(plan.id);
  }

  async findById(planId: number) {
    const plan =
      await this.prisma.trainingPlan.findUnique({
        where: {
          id: planId,
        },
        include: {
          exercises: {
            include: {
              exercise: true,
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
      exercises: plan.exercises.map(
        (planExercise) => ({
          planExerciseId:
            planExercise.id,
          exerciseId:
            planExercise.exerciseId,
          exerciseName:
            planExercise.exercise.name,
          order: planExercise.order,
          sets: planExercise.sets,
          reps: planExercise.reps,
          restSeconds:
            planExercise.restSeconds,
          targetWeightKg:
            planExercise.targetWeightKg,
        }),
      ),
    };
  }

  private async getSuggestedWeight(
    userId: string,
    exerciseId: number,
  ): Promise<number | null> {
    const sessions =
      await this.prisma.trainingSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          sets: {
            some: {
              completed: true,
              planExercise: {
                exerciseId,
              },
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: 2,
        include: {
          sets: {
            where: {
              completed: true,
              planExercise: {
                exerciseId,
              },
            },
            orderBy: {
              setNumber: 'asc',
            },
            include: {
              planExercise: true,
            },
          },
        },
      });

    if (sessions.length === 0) {
      return null;
    }

    const getSessionPerformance = (
      session: (typeof sessions)[number],
    ) => {
      const firstSet = session.sets[0];

      if (!firstSet) {
        return null;
      }

      const planExercise =
        firstSet.planExercise;

      const expectedTotalReps =
        planExercise.sets *
        planExercise.reps;

      const actualTotalReps =
        session.sets.reduce(
          (total, set) =>
            total + (set.reps ?? 0),
          0,
        );

      const completionRatePercent =
        expectedTotalReps > 0
          ? Math.round(
              (actualTotalReps /
                expectedTotalReps) *
                100,
            )
          : 0;

      const weights = session.sets
        .map((set) => set.weightKg)
        .filter(
          (weight): weight is number =>
            weight !== null,
        );

      const currentWeightKg =
        weights.length > 0
          ? weights[weights.length - 1]
          : null;

      return {
        currentWeightKg,
        completionRatePercent,
      };
    };

    const latest =
      getSessionPerformance(sessions[0]);

    if (
      !latest ||
      latest.currentWeightKg === null
    ) {
      return null;
    }

    if (sessions.length < 2) {
      return latest.currentWeightKg;
    }

    const previous =
      getSessionPerformance(sessions[1]);

    if (
      previous &&
      previous.currentWeightKg ===
        latest.currentWeightKg &&
      previous.completionRatePercent >= 100 &&
      latest.completionRatePercent >= 100
    ) {
      return (
        Math.round(
          (latest.currentWeightKg + 2.5) *
            10,
        ) / 10
      );
    }

    return latest.currentWeightKg;
  }
}