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

    const activeSession =
      await this.prisma.trainingSession.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

    if (activeSession) {
      throw new BadRequestException(
        `User already has an active training session: ${activeSession.id}`,
      );
    }

    const session =
      await this.prisma.trainingSession.create({
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

  async findCurrentByUserId(userId: string) {
    const activeSession =
      await this.prisma.trainingSession.findFirst({
        where: {
          userId,
          status: 'IN_PROGRESS',
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

    if (!activeSession) {
      return null;
    }

    return this.findById(activeSession.id);
  }

  async findById(sessionId: number) {
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

    const exercises = session.plan.exercises.map(
      (planExercise) => {
        const recordedSets = session.sets
          .filter(
            (set) =>
              set.planExerciseId === planExercise.id,
          )
          .map((set) => ({
            setLogId: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weightKg: set.weightKg,
            completed: set.completed,
          }));

        return {
          planExerciseId: planExercise.id,
          exerciseId: planExercise.exerciseId,
          exerciseName: planExercise.exercise.name,
          order: planExercise.order,
          sets: planExercise.sets,
          reps: planExercise.reps,
          restSeconds: planExercise.restSeconds,
          targetWeightKg:
            planExercise.targetWeightKg,
          recordedSets,
        };
      },
    );

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
        exercises,
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

  async cancel(sessionId: number) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
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
        'Only an in-progress training session can be cancelled',
      );
    }

    const cancelledSession =
      await this.prisma.trainingSession.update({
        where: {
          id: sessionId,
        },
        data: {
          status: 'CANCELLED',
        },
      });

    return {
      sessionId: cancelledSession.id,
      userId: cancelledSession.userId,
      planId: cancelledSession.planId,
      status: cancelledSession.status,
      startedAt: cancelledSession.startedAt,
      completedAt: cancelledSession.completedAt,
      recordedSetCount: session.sets.length,
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

        const loadAdherence =
          this.getLoadAdherence(
            planExercise.targetWeightKg,
            weightKgBySet,
          );

        let loadAction:
          | 'WAIT_FOR_COMPLETION'
          | 'SESSION_CANCELLED'
          | 'MAINTAIN'
          | 'REDUCE'
          | 'NO_WEIGHT_DATA';

        if (session.status === 'CANCELLED') {
          loadAction = 'SESSION_CANCELLED';
        } else if (session.status !== 'COMPLETED') {
          loadAction = 'WAIT_FOR_COMPLETION';
        } else if (currentWeightKg === null) {
          loadAction = 'NO_WEIGHT_DATA';
        } else if (completionRatePercent >= 90) {
          loadAction = 'MAINTAIN';
        } else {
          loadAction = 'REDUCE';
        }

        let recommendation: string;

        if (loadAction === 'SESSION_CANCELLED') {
          recommendation =
            '本次训练已取消，保留已记录数据，但不使用本次未完成训练生成下一次负荷调整结论。';
        } else if (
          loadAction === 'WAIT_FOR_COMPLETION'
        ) {
          recommendation =
            '训练尚未完成，当前仅展示执行进度与计划重量偏差，暂不进行下一次负荷调整判断。';
        } else if (
          loadAction === 'NO_WEIGHT_DATA'
        ) {
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
            `当前实际负荷 ${currentWeightKg}kg 基本匹配训练能力，下次建议结合计划执行情况继续观察。`;
        } else {
          recommendation =
            `当前实际负荷 ${currentWeightKg}kg 下完成度偏低，下次可考虑适当降低重量或目标次数。`;
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

          targetWeightKg:
            planExercise.targetWeightKg,

          weightKgBySet,
          currentWeightKg,

          loadAdherenceStatus:
            loadAdherence.status,

          loadAdherenceReason:
            loadAdherence.reason,

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
        take: Math.max(safeLimit, 3),
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

      const loadAdherence =
        this.getLoadAdherence(
          planExercise.targetWeightKg,
          weightKgBySet,
        );

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

        targetWeightKg:
          planExercise.targetWeightKg,

        weightKgBySet,
        currentWeightKg,

        loadAdherenceStatus:
          loadAdherence.status,

        loadAdherenceReason:
          loadAdherence.reason,

        expectedTotalReps,
        actualTotalReps,
        completionRatePercent,
      };
    });

    const validHistory = history.filter(
      (
        item,
      ): item is NonNullable<typeof item> =>
        item !== null,
    );

    let trend:
      | 'NOT_ENOUGH_DATA'
      | 'IMPROVING'
      | 'STABLE'
      | 'DECLINING' =
      'NOT_ENOUGH_DATA';

    let trendReason =
      '至少需要 2 次已完成训练才能判断趋势。';

    if (validHistory.length >= 2) {
      const latest = validHistory[0];
      const previous = validHistory[1];

      const completionRateChange =
        latest.completionRatePercent -
        previous.completionRatePercent;

      const hasComparableWeight =
        latest.currentWeightKg !== null &&
        previous.currentWeightKg !== null;

      if (hasComparableWeight) {
        const latestWeight =
          latest.currentWeightKg as number;

        const previousWeight =
          previous.currentWeightKg as number;

        if (latestWeight > previousWeight) {
          if (
            latest.completionRatePercent >= 90
          ) {
            trend = 'IMPROVING';
            trendReason =
              `最近一次实际重量从 ${previousWeight}kg 提高到 ${latestWeight}kg，且完成率仍达到 ${latest.completionRatePercent}%，判断为进步。`;
          } else if (
            completionRateChange <= -5
          ) {
            trend = 'DECLINING';
            trendReason =
              `最近一次虽然提高了实际重量，但完成率下降到 ${latest.completionRatePercent}%，当前负荷可能偏高。`;
          } else {
            trend = 'STABLE';
            trendReason =
              '最近一次提高了实际重量，但完成率尚未稳定达到 90%，暂时判断为稳定并继续观察。';
          }
        } else if (
          latestWeight < previousWeight
        ) {
          if (
            completionRateChange <= -5
          ) {
            trend = 'DECLINING';
            trendReason =
              `最近一次实际重量从 ${previousWeight}kg 降到 ${latestWeight}kg，同时完成率下降，判断为表现下降。`;
          } else {
            trend = 'STABLE';
            trendReason =
              `最近一次实际重量从 ${previousWeight}kg 降到 ${latestWeight}kg，暂不判断为进步，建议结合计划重量继续观察。`;
          }
        } else {
          if (completionRateChange >= 5) {
            trend = 'IMPROVING';
            trendReason =
              `实际重量保持 ${latestWeight}kg，完成率提高了 ${completionRateChange} 个百分点，判断为进步。`;
          } else if (
            completionRateChange <= -5
          ) {
            trend = 'DECLINING';
            trendReason =
              `实际重量保持 ${latestWeight}kg，完成率下降了 ${Math.abs(
                completionRateChange,
              )} 个百分点，判断为表现下降。`;
          } else {
            trend = 'STABLE';
            trendReason =
              `实际重量保持 ${latestWeight}kg，最近两次完成率变化较小，判断为稳定。`;
          }
        }
      } else {
        if (completionRateChange >= 5) {
          trend = 'IMPROVING';
          trendReason =
            `重量数据不足，暂按完成率判断；最近一次完成率提高了 ${completionRateChange} 个百分点。`;
        } else if (
          completionRateChange <= -5
        ) {
          trend = 'DECLINING';
          trendReason =
            `重量数据不足，暂按完成率判断；最近一次完成率下降了 ${Math.abs(
              completionRateChange,
            )} 个百分点。`;
        } else {
          trend = 'STABLE';
          trendReason =
            '重量数据不足，最近两次完成率变化较小，暂时判断为稳定。';
        }
      }
    }

    const recentCompletionRates =
      validHistory
        .slice(0, safeLimit)
        .map(
          (item) =>
            item.completionRatePercent,
        );

    let consecutiveTargetHits = 0;

    if (validHistory.length > 0) {
      const latestWeight =
        validHistory[0].currentWeightKg;

      if (latestWeight !== null) {
        for (const item of validHistory) {
          if (
            item.currentWeightKg === latestWeight &&
            item.completionRatePercent >= 100
          ) {
            consecutiveTargetHits += 1;
          } else {
            break;
          }
        }
      }
    }

    let progressionStatus:
      | 'NOT_ENOUGH_DATA'
      | 'READY_TO_PROGRESS'
      | 'MAINTAIN'
      | 'REVIEW_LOAD' =
      'NOT_ENOUGH_DATA';

    let progressionReason =
      '至少需要 2 次已完成训练才能判断是否具备进阶条件。';

    if (validHistory.length >= 2) {
      const latest = validHistory[0];

      if (latest.currentWeightKg === null) {
        progressionStatus = 'MAINTAIN';
        progressionReason =
          '当前没有可比较的实际重量数据，暂不进行加重量判断。';
      } else if (
        consecutiveTargetHits >= 2
      ) {
        progressionStatus =
          'READY_TO_PROGRESS';

        progressionReason =
          `最近连续 ${consecutiveTargetHits} 次在实际 ${latest.currentWeightKg}kg 下完成 100% 目标，可考虑小幅提高负荷。`;
      } else if (
        latest.completionRatePercent < 90
      ) {
        progressionStatus = 'REVIEW_LOAD';

        progressionReason =
          `最近一次在实际 ${latest.currentWeightKg}kg 下完成率为 ${latest.completionRatePercent}%，建议先检查当前负荷是否偏高。`;
      } else {
        progressionStatus = 'MAINTAIN';

        progressionReason =
          `最近一次在实际 ${latest.currentWeightKg}kg 下完成率为 ${latest.completionRatePercent}%，暂时维持当前负荷，等待更多稳定表现。`;
      }
    }

    let nextTrainingRecommendation: {
      nextLoadAction:
        | 'NOT_ENOUGH_DATA'
        | 'INCREASE'
        | 'MAINTAIN'
        | 'REVIEW_LOAD'
        | 'NO_WEIGHT_DATA';
      currentWeightKg: number | null;
      suggestedWeightKg: number | null;
      suggestedSets: number | null;
      suggestedReps: number | null;
      reason: string;
    };

    if (validHistory.length === 0) {
      nextTrainingRecommendation = {
        nextLoadAction: 'NOT_ENOUGH_DATA',
        currentWeightKg: null,
        suggestedWeightKg: null,
        suggestedSets: null,
        suggestedReps: null,
        reason:
          '当前没有已完成训练记录，暂时无法生成下一次训练建议。',
      };
    } else {
      const latest = validHistory[0];

      if (validHistory.length < 2) {
        nextTrainingRecommendation = {
          nextLoadAction: 'NOT_ENOUGH_DATA',
          currentWeightKg:
            latest.currentWeightKg,
          suggestedWeightKg:
            latest.currentWeightKg,
          suggestedSets:
            latest.expectedSets,
          suggestedReps:
            latest.targetRepsPerSet,
          reason:
            '目前只有 1 次训练记录，建议先保持当前训练方案并继续积累数据。',
        };
      } else if (
        latest.currentWeightKg === null
      ) {
        nextTrainingRecommendation = {
          nextLoadAction: 'NO_WEIGHT_DATA',
          currentWeightKg: null,
          suggestedWeightKg: null,
          suggestedSets:
            latest.expectedSets,
          suggestedReps:
            latest.targetRepsPerSet,
          reason:
            '当前动作没有实际重量数据，暂不生成公斤数调整建议。',
        };
      } else if (
        progressionStatus ===
        'READY_TO_PROGRESS'
      ) {
        const suggestedWeightKg =
          Math.round(
            (latest.currentWeightKg + 2.5) *
              10,
          ) / 10;

        nextTrainingRecommendation = {
          nextLoadAction: 'INCREASE',
          currentWeightKg:
            latest.currentWeightKg,
          suggestedWeightKg,
          suggestedSets:
            latest.expectedSets,
          suggestedReps:
            latest.targetRepsPerSet,
          reason:
            `最近连续 ${consecutiveTargetHits} 次在实际 ${latest.currentWeightKg}kg 下完成全部目标，V1 建议下次小幅提高至 ${suggestedWeightKg}kg。`,
        };
      } else if (
        progressionStatus === 'REVIEW_LOAD'
      ) {
        nextTrainingRecommendation = {
          nextLoadAction: 'REVIEW_LOAD',
          currentWeightKg:
            latest.currentWeightKg,
          suggestedWeightKg:
            latest.currentWeightKg,
          suggestedSets:
            latest.expectedSets,
          suggestedReps:
            latest.targetRepsPerSet,
          reason:
            `最近一次在实际 ${latest.currentWeightKg}kg 下完成率为 ${latest.completionRatePercent}%，暂不加重，建议先检查当前负荷是否合适。`,
        };
      } else {
        nextTrainingRecommendation = {
          nextLoadAction: 'MAINTAIN',
          currentWeightKg:
            latest.currentWeightKg,
          suggestedWeightKg:
            latest.currentWeightKg,
          suggestedSets:
            latest.expectedSets,
          suggestedReps:
            latest.targetRepsPerSet,
          reason:
            `当前建议继续维持实际 ${latest.currentWeightKg}kg、${latest.expectedSets} 组 × ${latest.targetRepsPerSet} 次，等待更多稳定表现。`,
        };
      }
    }

    return {
      userId,
      exerciseId,
      count: validHistory.length,
      trend,
      trendReason,
      progressionStatus,
      consecutiveTargetHits,
      recentCompletionRates,
      progressionReason,
      nextTrainingRecommendation,
      history: validHistory.slice(
        0,
        safeLimit,
      ),
    };
  }

  private getLoadAdherence(
    targetWeightKg: number | null,
    actualWeightKgBySet: Array<number | null>,
  ): {
    status:
      | 'NO_TARGET'
      | 'NO_ACTUAL_WEIGHT'
      | 'ON_TARGET'
      | 'BELOW_TARGET'
      | 'ABOVE_TARGET'
      | 'MIXED';
    reason: string;
  } {
    if (targetWeightKg === null) {
      return {
        status: 'NO_TARGET',
        reason:
          '当前训练计划没有设置目标重量。',
      };
    }

    const recordedWeights =
      actualWeightKgBySet.filter(
        (weight): weight is number =>
          weight !== null,
      );

    if (recordedWeights.length === 0) {
      return {
        status: 'NO_ACTUAL_WEIGHT',
        reason:
          `计划目标为 ${targetWeightKg}kg，但本次没有记录实际重量。`,
      };
    }

    const tolerance = 0.001;

    const hasBelow = recordedWeights.some(
      (weight) =>
        weight < targetWeightKg - tolerance,
    );

    const hasAbove = recordedWeights.some(
      (weight) =>
        weight > targetWeightKg + tolerance,
    );

    const allOnTarget = recordedWeights.every(
      (weight) =>
        Math.abs(weight - targetWeightKg) <=
        tolerance,
    );

    if (allOnTarget) {
      return {
        status: 'ON_TARGET',
        reason:
          `计划目标为 ${targetWeightKg}kg，本次所有已记录组均按目标重量完成。`,
      };
    }

    if (hasBelow && hasAbove) {
      return {
        status: 'MIXED',
        reason:
          `计划目标为 ${targetWeightKg}kg，本次实际重量既有低于目标也有高于目标的组。`,
      };
    }

    if (hasBelow) {
      return {
        status: 'BELOW_TARGET',
        reason:
          `计划目标为 ${targetWeightKg}kg，本次至少一组实际重量低于计划目标。`,
      };
    }

    return {
      status: 'ABOVE_TARGET',
      reason:
        `计划目标为 ${targetWeightKg}kg，本次至少一组实际重量高于计划目标。`,
    };
  }
}