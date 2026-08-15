import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { ExercisesService } from '../exercises/exercises.service';
import { PrismaService } from '../prisma/prisma.service';
import { BodyStateService } from '../body-state/body-state.service';

@Injectable()
export class TrainingPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exercisesService: ExercisesService,
    private readonly bodyStateService: BodyStateService,
  ) {}

  async generate(
    userId: string,
    environment: string,
    targetMuscle: string,
  ) {
    return this.createPlan(
      userId,
      environment,
      targetMuscle,
      {
        sets: 3,
        weightMultiplier: 1,
      },
    );
  }

  async generateAdaptive(
    userId: string,
    environment: string,
    targetMuscle: string,
    utcOffsetMinutes = 480,
  ) {
    const readiness =
      await this.bodyStateService.getTodayReadiness(
        userId,
        utcOffsetMinutes,
      );

    if (
      readiness.readinessStatus ===
      'NO_DATA'
    ) {
      return {
        userId,
        environment,
        targetMuscle,
        adaptationType: 'NO_DATA',
        readiness,
        adjustments: [],
        plan: null,
        message:
          '今天还没有身体状态记录，暂不生成自适应训练计划。',
      };
    }

    if (
      readiness.readinessStatus ===
      'RECOVERY'
    ) {
      return {
        userId,
        environment,
        targetMuscle,
        adaptationType: 'RECOVERY',
        readiness,
        adjustments: [
          '暂停正式力量训练',
          '优先恢复或轻量活动',
        ],
        plan: null,
        message:
          readiness.recommendedAction,
      };
    }

    if (
      readiness.readinessStatus ===
      'AVOID_PAIN_AREA'
    ) {
      return {
        userId,
        environment,
        targetMuscle,
        adaptationType:
          'PAIN_PROTECTION',
        readiness,
        adjustments: [
          '暂不自动生成正式力量训练计划',
          '避免训练已记录疼痛部位',
        ],
        plan: null,
        message:
          '检测到疼痛部位。当前版本不会自动推断哪些力量训练动作安全，请先避开疼痛区域。',
      };
    }

    if (
      readiness.readinessStatus ===
      'REDUCE_INTENSITY'
    ) {
      const plan =
        await this.createPlan(
          userId,
          environment,
          targetMuscle,
          {
            sets: 2,
            weightMultiplier: 0.9,
          },
        );

      return {
        userId,
        environment,
        targetMuscle,
        adaptationType:
          'REDUCED_INTENSITY',
        readiness,
        adjustments: [
          '每个动作由 3 组减少为 2 组',
          '有历史重量的动作目标重量降低约 10%',
          '避免力竭训练',
        ],
        plan,
        message:
          readiness.recommendedAction,
      };
    }

    const plan =
      await this.createPlan(
        userId,
        environment,
        targetMuscle,
        {
          sets: 3,
          weightMultiplier: 1,
        },
      );

    return {
      userId,
      environment,
      targetMuscle,
      adaptationType: 'STANDARD',
      readiness,
      adjustments: [],
      plan,
      message:
        readiness.recommendedAction,
    };
  }

  private async createPlan(
    userId: string,
    environment: string,
    targetMuscle: string,
    options: {
      sets: number;
      weightMultiplier: number;
    },
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

    if (
      availableExercises.length === 0
    ) {
      throw new BadRequestException(
        'No available exercises found for this user and environment',
      );
    }

    const exercisePlans =
      await Promise.all(
        availableExercises.map(
          async (
            exercise,
            index,
          ) => {
            const suggestedWeightKg =
              await this.getSuggestedWeight(
                userId,
                exercise.id,
              );

            const targetWeightKg =
              suggestedWeightKg === null
                ? null
                : Math.round(
                    suggestedWeightKg *
                      options.weightMultiplier *
                      10,
                  ) / 10;

            return {
              exerciseId:
                exercise.id,
              order: index + 1,
              sets: options.sets,
              reps: 10,
              restSeconds: 60,
              targetWeightKg,
            };
          },
        ),
      );

    const plan =
      await this.prisma.$transaction(
        async (tx) => {
          const createdPlan =
            await tx.trainingPlan.create(
              {
                data: {
                  userId,
                  environment,
                  targetMuscle,
                  status: 'ACTIVE',
                },
              },
            );

          for (
            const exercisePlan
            of exercisePlans
          ) {
            await tx.trainingPlanExercise.create(
              {
                data: {
                  planId:
                    createdPlan.id,
                  exerciseId:
                    exercisePlan.exerciseId,
                  order:
                    exercisePlan.order,
                  sets:
                    exercisePlan.sets,
                  reps:
                    exercisePlan.reps,
                  restSeconds:
                    exercisePlan.restSeconds,
                  targetWeightKg:
                    exercisePlan.targetWeightKg,
                },
              },
            );
          }

          return createdPlan;
        },
      );

    return this.findById(
      plan.id,
    );
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