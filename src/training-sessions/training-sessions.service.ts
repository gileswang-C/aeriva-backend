import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async start(userId: string, planId: number) {
    const plan = await this.prisma.trainingPlan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!plan) {
      throw new BadRequestException(
        `Training plan not found: ${planId}`,
      );
    }

    if (plan.userId !== userId) {
      throw new BadRequestException(
        'Training plan does not belong to this user',
      );
    }

    const session = await this.prisma.trainingSession.create({
      data: {
        userId,
        planId,
        status: 'IN_PROGRESS',
      },
    });

    return {
      sessionId: session.id,
      userId: session.userId,
      planId: session.planId,
      status: session.status,
      startedAt: session.startedAt,
    };
  }

  async findById(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          plan: true,
          sets: {
            orderBy: [
              {
                planExerciseId: 'asc',
              },
              {
                setNumber: 'asc',
              },
            ],
          },
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    return {
      sessionId: session.id,
      userId: session.userId,
      planId: session.planId,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      plan: {
        environment: session.plan.environment,
        targetMuscle: session.plan.targetMuscle,
      },
      sets: session.sets,
    };
  }

  async logSet(
    sessionId: number,
    exerciseId: number,
    setNumber: number,
    reps: number,
    weightKg?: number,
  ) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Training session is not in progress',
      );
    }

    const planExercise =
      await this.prisma.trainingPlanExercise.findFirst({
        where: {
          planId: session.planId,
          exerciseId,
        },
        include: {
          exercise: true,
        },
      });

    if (!planExercise) {
      throw new BadRequestException(
        `Exercise ${exerciseId} is not part of this training plan`,
      );
    }

    if (
      setNumber < 1 ||
      setNumber > planExercise.sets
    ) {
      throw new BadRequestException(
        `setNumber must be between 1 and ${planExercise.sets}`,
      );
    }

    const setLog =
      await this.prisma.trainingSetLog.upsert({
        where: {
          sessionId_planExerciseId_setNumber: {
            sessionId,
            planExerciseId: planExercise.id,
            setNumber,
          },
        },
        update: {
          reps,
          weightKg: weightKg ?? null,
          completed: true,
        },
        create: {
          sessionId,
          planExerciseId: planExercise.id,
          setNumber,
          reps,
          weightKg: weightKg ?? null,
          completed: true,
        },
      });

    return {
      setLogId: setLog.id,
      sessionId,
      exerciseId,
      exerciseName: planExercise.exercise.name,
      setNumber,
      reps: setLog.reps,
      weightKg: setLog.weightKg,
      completed: setLog.completed,
    };
  }

  async complete(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          plan: {
            include: {
              exercises: true,
            },
          },
          sets: {
            where: {
              completed: true,
            },
          },
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(
        'Training session is not in progress',
      );
    }

    const expectedSetCount = session.plan.exercises.reduce(
      (total, exercise) => total + exercise.sets,
      0,
    );

    const completedSetCount = session.sets.length;

    if (completedSetCount < expectedSetCount) {
      throw new BadRequestException(
        `Training session is incomplete: ${completedSetCount}/${expectedSetCount} sets completed`,
      );
    }

    const completedSession =
      await this.prisma.trainingSession.update({
        where: {
          id: sessionId,
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

    return {
      sessionId: completedSession.id,
      userId: completedSession.userId,
      planId: completedSession.planId,
      status: completedSession.status,
      startedAt: completedSession.startedAt,
      completedAt: completedSession.completedAt,
      completedSetCount,
      expectedSetCount,
    };
  }

  async analyze(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          plan: {
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
          },
          sets: {
            where: {
              completed: true,
            },
            orderBy: {
              setNumber: 'asc',
            },
          },
        },
      });

    if (!session) {
      throw new BadRequestException(
        `Training session not found: ${sessionId}`,
      );
    }

    const exerciseAnalysis =
      session.plan.exercises.map((planExercise) => {
        const setLogs = session.sets.filter(
          (set) =>
            set.planExerciseId === planExercise.id,
        );

        const expectedReps =
          planExercise.sets * planExercise.reps;

        const actualReps = setLogs.reduce(
          (total, set) => total + (set.reps ?? 0),
          0,
        );

        const completionRatePercent =
          expectedReps > 0
            ? Math.round(
                (actualReps / expectedReps) * 100,
              )
            : 0;

        const weightKgBySet = setLogs.map(
          (set) => set.weightKg,
        );

        const recordedWeights = setLogs
          .map((set) => set.weightKg)
          .filter(
            (weight): weight is number =>
              weight !== null,
          );

        const currentWeightKg =
          recordedWeights.length > 0
            ? recordedWeights[
                recordedWeights.length - 1
              ]
            : null;

        let loadAction:
          | 'MAINTAIN'
          | 'REDUCE'
          | 'NO_WEIGHT_DATA';

        if (currentWeightKg === null) {
          loadAction = 'NO_WEIGHT_DATA';
        } else if (completionRatePercent >= 90) {
          loadAction = 'MAINTAIN';
        } else {
          loadAction = 'REDUCE';
        }

        let recommendation: string;

        if (loadAction === 'NO_WEIGHT_DATA') {
          if (completionRatePercent >= 100) {
            recommendation =
              '目标完成良好。当前没有重量数据，暂不进行负荷调整判断。';
          } else if (completionRatePercent >= 90) {
            recommendation =
              '接近计划目标。当前没有重量数据，建议先维持训练目标。';
          } else {
            recommendation =
              '完成度低于计划目标。当前没有重量数据，可考虑降低动作难度或目标次数。';
          }
        } else if (loadAction === 'MAINTAIN') {
          recommendation =
            `当前负荷 ${currentWeightKg}kg 基本匹配训练能力，下次建议维持该重量和目标次数。`;
        } else {
          recommendation =
            `当前负荷 ${currentWeightKg}kg 下完成度偏低，下次可考虑适当降低重量或目标次数。`;
        }

        return {
          exerciseId: planExercise.exerciseId,
          exerciseName: planExercise.exercise.name,
          expectedSets: planExercise.sets,
          completedSets: setLogs.length,
          targetRepsPerSet: planExercise.reps,
          actualRepsBySet: setLogs.map(
            (set) => set.reps ?? 0,
          ),
          weightKgBySet,
          currentWeightKg,
          expectedTotalReps: expectedReps,
          actualTotalReps: actualReps,
          completionRatePercent,
          loadAction,
          recommendation,
        };
      });

    return {
      sessionId: session.id,
      userId: session.userId,
      planId: session.planId,
      status: session.status,
      environment: session.plan.environment,
      targetMuscle: session.plan.targetMuscle,
      exerciseAnalysis,
    };
  }

  async findExerciseHistory(
    userId: string,
    exerciseId: number,
    limit = 5,
  ) {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      20,
    );

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
        take: safeLimit,
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
              planExercise: {
                include: {
                  exercise: true,
                },
              },
            },
          },
        },
      });

    const history = sessions.map((session) => {
      const firstSet = session.sets[0];

      if (!firstSet) {
        return null;
      }

      const planExercise = firstSet.planExercise;

      const expectedTotalReps =
        planExercise.sets * planExercise.reps;

      const actualTotalReps = session.sets.reduce(
        (total, set) => total + (set.reps ?? 0),
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

      const weightKgBySet = session.sets.map(
        (set) => set.weightKg,
      );

      const recordedWeights = weightKgBySet.filter(
        (weight): weight is number =>
          weight !== null,
      );

      const currentWeightKg =
        recordedWeights.length > 0
          ? recordedWeights[
              recordedWeights.length - 1
            ]
          : null;

      return {
        sessionId: session.id,
        completedAt: session.completedAt,
        exerciseId:
          planExercise.exerciseId,
        exerciseName:
          planExercise.exercise.name,
        expectedSets: planExercise.sets,
        completedSets: session.sets.length,
        targetRepsPerSet: planExercise.reps,
        actualRepsBySet: session.sets.map(
          (set) => set.reps ?? 0,
        ),
        weightKgBySet,
        currentWeightKg,
        expectedTotalReps,
        actualTotalReps,
        completionRatePercent,
      };
    });

    return {
      userId,
      exerciseId,
      count: history.length,
      history: history.filter(
        (item) => item !== null,
      ),
    };
  }
}