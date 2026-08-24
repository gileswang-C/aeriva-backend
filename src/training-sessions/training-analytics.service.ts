import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

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
          trainingAdjustments: {
            orderBy: {
              id: 'asc',
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
      adjustments: session.trainingAdjustments,
      aiDecision: session.trainingAdjustments.map(
        (adjustment) => ({
          exerciseId: adjustment.exerciseId,
          action: adjustment.action,
          nextWeightKg:
            adjustment.suggestedWeightKg,
          reason: adjustment.reason,
        }),
      ),
    };
  }

  async getUserWeeklyComparison(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const stats14Days =
      await this.getUserDailyStats(
        userId,
        14,
        utcOffsetMinutes,
      );

    const previousDays =
      stats14Days.dailyStats.slice(0, 7);

    const currentDays =
      stats14Days.dailyStats.slice(7, 14);

    const aggregate = (
      days: typeof stats14Days.dailyStats,
    ) => {
      const trainingDays =
        days.filter(
          (day) =>
            day.trainingSessionCount > 0,
        ).length;

      const trainingSessionCount =
        days.reduce(
          (total, day) =>
            total +
            day.trainingSessionCount,
          0,
        );

      const totalDurationMinutes =
        days.reduce(
          (total, day) =>
            total +
            day.totalDurationMinutes,
          0,
        );

      const totalCompletedSets =
        days.reduce(
          (total, day) =>
            total +
            day.totalCompletedSets,
          0,
        );

      const totalReps =
        days.reduce(
          (total, day) =>
            total +
            day.totalReps,
          0,
        );

      return {
        startDate:
          days[0]?.date ?? null,
        endDate:
          days[days.length - 1]
            ?.date ?? null,
        trainingDays,
        trainingSessionCount,
        totalDurationMinutes,
        totalCompletedSets,
        totalReps,
      };
    };

    const previousWeek =
      aggregate(previousDays);

    const currentWeek =
      aggregate(currentDays);

    const changes = {
      trainingDays:
        currentWeek.trainingDays -
        previousWeek.trainingDays,

      trainingSessionCount:
        currentWeek.trainingSessionCount -
        previousWeek.trainingSessionCount,

      totalDurationMinutes:
        currentWeek.totalDurationMinutes -
        previousWeek.totalDurationMinutes,

      totalCompletedSets:
        currentWeek.totalCompletedSets -
        previousWeek.totalCompletedSets,

      totalReps:
        currentWeek.totalReps -
        previousWeek.totalReps,
    };

    let trend:
      | 'NOT_ENOUGH_DATA'
      | 'IMPROVING'
      | 'STABLE'
      | 'DECLINING';

    let trendReason: string;

    if (
      previousWeek.trainingSessionCount === 0
    ) {
      trend = 'NOT_ENOUGH_DATA';

      if (
        currentWeek.trainingSessionCount > 0
      ) {
        trendReason =
          `前 7 天没有已完成训练记录，最近 7 天已完成 ${currentWeek.trainingSessionCount} 次训练，暂时缺少可比较基线。`;
      } else {
        trendReason =
          '前后两个 7 天周期都没有已完成训练记录，暂时无法判断训练趋势。';
      }
    } else {
      const comparisonSignals = [
        changes.trainingDays,
        changes.trainingSessionCount,
        changes.totalCompletedSets,
        changes.totalReps,
      ];

      const improvedSignals =
        comparisonSignals.filter(
          (value) => value > 0,
        ).length;

      const declinedSignals =
        comparisonSignals.filter(
          (value) => value < 0,
        ).length;

      if (
        improvedSignals >= 3 &&
        improvedSignals > declinedSignals
      ) {
        trend = 'IMPROVING';
        trendReason =
          `最近 7 天相比前 7 天，训练天数变化 ${changes.trainingDays >= 0 ? '+' : ''}${changes.trainingDays} 天，训练次数变化 ${changes.trainingSessionCount >= 0 ? '+' : ''}${changes.trainingSessionCount} 次，完成组数变化 ${changes.totalCompletedSets >= 0 ? '+' : ''}${changes.totalCompletedSets} 组，整体训练投入呈上升趋势。`;
      } else if (
        declinedSignals >= 3 &&
        declinedSignals > improvedSignals
      ) {
        trend = 'DECLINING';
        trendReason =
          `最近 7 天相比前 7 天，训练天数变化 ${changes.trainingDays >= 0 ? '+' : ''}${changes.trainingDays} 天，训练次数变化 ${changes.trainingSessionCount >= 0 ? '+' : ''}${changes.trainingSessionCount} 次，完成组数变化 ${changes.totalCompletedSets >= 0 ? '+' : ''}${changes.totalCompletedSets} 组，整体训练投入有所下降。`;
      } else {
        trend = 'STABLE';
        trendReason =
          `最近 7 天与前 7 天相比，各项训练指标有升有降或变化较小，暂时判断为整体稳定。`;
      }
    }

    return {
      userId,
      utcOffsetMinutes,
      previousWeek,
      currentWeek,
      changes,
      trend,
      trendReason,
    };
  }

  async getUserWeeklyReport(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const dailyStats =
      await this.getUserDailyStats(
        userId,
        7,
        utcOffsetMinutes,
      );

    const consistency =
      await this.getUserConsistency(
        userId,
        utcOffsetMinutes,
      );

    const sessions =
      await this.prisma.trainingSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: dailyStats.periodStart,
            lt: dailyStats.periodEndExclusive,
          },
        },
        include: {
          plan: true,
        },
      });

    const trainingDays =
      dailyStats.dailyStats.filter(
        (day) =>
          day.trainingSessionCount > 0,
      ).length;

    const trainingSessionCount =
      dailyStats.dailyStats.reduce(
        (total, day) =>
          total +
          day.trainingSessionCount,
        0,
      );

    const totalDurationMinutes =
      dailyStats.dailyStats.reduce(
        (total, day) =>
          total +
          day.totalDurationMinutes,
        0,
      );

    const totalCompletedSets =
      dailyStats.dailyStats.reduce(
        (total, day) =>
          total +
          day.totalCompletedSets,
        0,
      );

    const totalReps =
      dailyStats.dailyStats.reduce(
        (total, day) =>
          total +
          day.totalReps,
        0,
      );

    const targetMuscleCounts: Record<
      string,
      number
    > = {};

    for (const session of sessions) {
      const targetMuscle =
        session.plan.targetMuscle;

      targetMuscleCounts[targetMuscle] =
        (targetMuscleCounts[targetMuscle] ??
          0) + 1;
    }

    const targetMuscleDistribution =
      Object.entries(targetMuscleCounts)
        .map(
          ([
            targetMuscle,
            sessionCount,
          ]) => ({
            targetMuscle,
            sessionCount,
          }),
        )
        .sort(
          (a, b) =>
            b.sessionCount -
            a.sessionCount,
        );

    const primaryTargetMuscle =
      targetMuscleDistribution[0]
        ?.targetMuscle ?? null;

    let summaryText: string;

    if (trainingSessionCount === 0) {
      summaryText =
        '最近 7 天暂无已完成训练记录，可以从一次轻量训练重新开始积累节奏。';
    } else {
      const muscleText =
        primaryTargetMuscle
          ? `主要训练部位为${primaryTargetMuscle}。`
          : '';

      const streakText =
        consistency.currentStreakDays > 0
          ? `当前连续训练 ${consistency.currentStreakDays} 天。`
          : '';

      summaryText =
        `最近 7 天训练了 ${trainingDays} 天，共完成 ${trainingSessionCount} 次训练、${totalCompletedSets} 组、${totalReps} 次动作。${muscleText}${streakText}`;
    }

    return {
      userId,
      utcOffsetMinutes,
      periodStart:
        dailyStats.periodStart,
      periodEndExclusive:
        dailyStats.periodEndExclusive,
      trainingDays,
      trainingSessionCount,
      totalDurationMinutes,
      totalCompletedSets,
      totalReps,
      targetMuscleDistribution,
      primaryTargetMuscle,
      currentStreakDays:
        consistency.currentStreakDays,
      longestStreakDays:
        consistency.longestStreakDays,
      latestTrainingDate:
        consistency.latestTrainingDate,
      dailyStats:
        dailyStats.dailyStats,
      summaryText,
    };
  }

  async getUserConsistency(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const sessions =
      await this.prisma.trainingSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        orderBy: {
          completedAt: 'asc',
        },
        select: {
          completedAt: true,
        },
      });

    const offsetMs =
      utcOffsetMinutes * 60 * 1000;

    const oneDayMs =
      24 * 60 * 60 * 1000;

    const now = new Date();

    const shiftedNow = new Date(
      now.getTime() + offsetMs,
    );

    const todayLocalStartMs =
      Date.UTC(
        shiftedNow.getUTCFullYear(),
        shiftedNow.getUTCMonth(),
        shiftedNow.getUTCDate(),
      );

    const toLocalDateKey = (
      date: Date,
    ) =>
      new Date(
        date.getTime() + offsetMs,
      )
        .toISOString()
        .slice(0, 10);

    const completedDates = sessions
      .map((session) => session.completedAt)
      .filter(
        (completedAt): completedAt is Date =>
          completedAt !== null,
      );

    const trainingDateSet =
      new Set(
        completedDates.map(
          toLocalDateKey,
        ),
      );

    const trainingDates =
      Array.from(trainingDateSet).sort();

    const getLocalDateKeyByOffset = (
      daysAgo: number,
    ) =>
      new Date(
        todayLocalStartMs -
          daysAgo * oneDayMs,
      )
        .toISOString()
        .slice(0, 10);

    const recent7DateSet =
      new Set(
        Array.from(
          { length: 7 },
          (_, index) =>
            getLocalDateKeyByOffset(index),
        ),
      );

    const recent30DateSet =
      new Set(
        Array.from(
          { length: 30 },
          (_, index) =>
            getLocalDateKeyByOffset(index),
        ),
      );

    const recent7TrainingDays =
      trainingDates.filter(
        (date) =>
          recent7DateSet.has(date),
      ).length;

    const recent30TrainingDays =
      trainingDates.filter(
        (date) =>
          recent30DateSet.has(date),
      ).length;

    const recent7SessionCount =
      completedDates.filter(
        (completedAt) =>
          recent7DateSet.has(
            toLocalDateKey(completedAt),
          ),
      ).length;

    const recent30SessionCount =
      completedDates.filter(
        (completedAt) =>
          recent30DateSet.has(
            toLocalDateKey(completedAt),
          ),
      ).length;

    let currentStreakDays = 0;

    const todayKey =
      getLocalDateKeyByOffset(0);

    const yesterdayKey =
      getLocalDateKeyByOffset(1);

    let currentStreakStartOffset:
      number | null = null;

    if (trainingDateSet.has(todayKey)) {
      currentStreakStartOffset = 0;
    } else if (
      trainingDateSet.has(yesterdayKey)
    ) {
      currentStreakStartOffset = 1;
    }

    if (
      currentStreakStartOffset !== null
    ) {
      let daysAgo =
        currentStreakStartOffset;

      while (
        trainingDateSet.has(
          getLocalDateKeyByOffset(
            daysAgo,
          ),
        )
      ) {
        currentStreakDays += 1;
        daysAgo += 1;
      }
    }

    let longestStreakDays = 0;
    let runningStreakDays = 0;
    let previousDateMs:
      number | null = null;

    for (const date of trainingDates) {
      const currentDateMs =
        Date.parse(
          `${date}T00:00:00.000Z`,
        );

      if (
        previousDateMs !== null &&
        currentDateMs -
          previousDateMs ===
          oneDayMs
      ) {
        runningStreakDays += 1;
      } else {
        runningStreakDays = 1;
      }

      longestStreakDays =
        Math.max(
          longestStreakDays,
          runningStreakDays,
        );

      previousDateMs =
        currentDateMs;
    }

    const latestTrainingDate =
      trainingDates.length > 0
        ? trainingDates[
            trainingDates.length - 1
          ]
        : null;

    const averageSessionsPerWeek30Days =
      Math.round(
        ((recent30SessionCount / 30) *
          7) *
          10,
      ) / 10;

    return {
      userId,
      utcOffsetMinutes,
      recent7Days: {
        trainingDays:
          recent7TrainingDays,
        sessionCount:
          recent7SessionCount,
      },
      recent30Days: {
        trainingDays:
          recent30TrainingDays,
        sessionCount:
          recent30SessionCount,
        averageSessionsPerWeek:
          averageSessionsPerWeek30Days,
      },
      currentStreakDays,
      longestStreakDays,
      latestTrainingDate,
      totalTrainingDays:
        trainingDates.length,
    };
  }

  async getUserDailyStats(
    userId: string,
    days = 7,
    utcOffsetMinutes = 480,
  ) {
    const now = new Date();

    const offsetMs =
      utcOffsetMinutes * 60 * 1000;

    const shiftedNow = new Date(
      now.getTime() + offsetMs,
    );

    const localTodayStartUtcMs =
      Date.UTC(
        shiftedNow.getUTCFullYear(),
        shiftedNow.getUTCMonth(),
        shiftedNow.getUTCDate(),
      ) - offsetMs;

    const oneDayMs =
      24 * 60 * 60 * 1000;

    const periodStart = new Date(
      localTodayStartUtcMs -
        (days - 1) * oneDayMs,
    );

    const periodEndExclusive = new Date(
      localTodayStartUtcMs +
        oneDayMs,
    );

    const sessions =
      await this.prisma.trainingSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: periodStart,
            lt: periodEndExclusive,
          },
        },
        orderBy: {
          completedAt: 'asc',
        },
        include: {
          sets: {
            where: {
              completed: true,
            },
          },
        },
      });

    const dailyMap = new Map<
      string,
      {
        date: string;
        trainingSessionCount: number;
        totalDurationMinutes: number;
        totalCompletedSets: number;
        totalReps: number;
      }
    >();

    for (let index = 0; index < days; index++) {
      const dayStartUtcMs =
        periodStart.getTime() +
        index * oneDayMs;

      const shiftedDay = new Date(
        dayStartUtcMs + offsetMs,
      );

      const date =
        shiftedDay
          .toISOString()
          .slice(0, 10);

      dailyMap.set(date, {
        date,
        trainingSessionCount: 0,
        totalDurationMinutes: 0,
        totalCompletedSets: 0,
        totalReps: 0,
      });
    }

    for (const session of sessions) {
      if (!session.completedAt) {
        continue;
      }

      const shiftedCompletedAt = new Date(
        session.completedAt.getTime() +
          offsetMs,
      );

      const date =
        shiftedCompletedAt
          .toISOString()
          .slice(0, 10);

      const day = dailyMap.get(date);

      if (!day) {
        continue;
      }

      day.trainingSessionCount += 1;

      day.totalDurationMinutes +=
        Math.max(
          0,
          Math.round(
            (session.completedAt.getTime() -
              session.startedAt.getTime()) /
              60000,
          ),
        );

      day.totalCompletedSets +=
        session.sets.length;

      day.totalReps +=
        session.sets.reduce(
          (total, set) =>
            total + (set.reps ?? 0),
          0,
        );
    }

    const dailyStats =
      Array.from(dailyMap.values());

    return {
      userId,
      days,
      utcOffsetMinutes,
      periodStart,
      periodEndExclusive,
      dailyStats,
    };
  }

  async getUserSummary(
    userId: string,
    days = 7,
  ) {
    const periodEnd = new Date();

    const periodStart = new Date(
      periodEnd.getTime() -
        days * 24 * 60 * 60 * 1000,
    );

    const sessions =
      await this.prisma.trainingSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
        include: {
          plan: true,
          sets: {
            where: {
              completed: true,
            },
          },
        },
      });

    let totalDurationMinutes = 0;
    let totalCompletedSets = 0;
    let totalReps = 0;

    const targetMuscleCounts: Record<
      string,
      number
    > = {};

    for (const session of sessions) {
      if (session.completedAt) {
        const durationMinutes = Math.max(
          0,
          Math.round(
            (session.completedAt.getTime() -
              session.startedAt.getTime()) /
              60000,
          ),
        );

        totalDurationMinutes +=
          durationMinutes;
      }

      totalCompletedSets +=
        session.sets.length;

      totalReps += session.sets.reduce(
        (total, set) =>
          total + (set.reps ?? 0),
        0,
      );

      const targetMuscle =
        session.plan.targetMuscle;

      targetMuscleCounts[targetMuscle] =
        (targetMuscleCounts[targetMuscle] ??
          0) + 1;
    }

    const targetMuscleDistribution =
      Object.entries(targetMuscleCounts)
        .map(
          ([
            targetMuscle,
            sessionCount,
          ]) => ({
            targetMuscle,
            sessionCount,
          }),
        )
        .sort(
          (a, b) =>
            b.sessionCount -
            a.sessionCount,
        );

    return {
      userId,
      days,
      periodStart,
      periodEnd,
      trainingSessionCount:
        sessions.length,
      totalDurationMinutes,
      totalCompletedSets,
      totalReps,
      targetMuscleDistribution,
      latestTrainingAt:
        sessions[0]?.completedAt ?? null,
    };
  }

  async findUserHistory(
    userId: string,
    limit = 20,
  ) {
    const safeLimit = Math.min(
      Math.max(limit, 1),
      100,
    );

    const sessions =
      await this.prisma.trainingSession.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        orderBy: {
          completedAt: 'desc',
        },
        take: safeLimit,
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
          },
        },
      });

    const history = sessions.map((session) => {
      const expectedSetCount =
        session.plan.exercises.reduce(
          (total, exercise) =>
            total + exercise.sets,
          0,
        );

      const completedSetCount =
        session.sets.length;

      const actualTotalReps =
        session.sets.reduce(
          (total, set) =>
            total + (set.reps ?? 0),
          0,
        );

      const durationMinutes =
        session.completedAt
          ? Math.max(
              0,
              Math.round(
                (session.completedAt.getTime() -
                  session.startedAt.getTime()) /
                  60000,
              ),
            )
          : null;

      return {
        sessionId: session.id,
        planId: session.planId,
        status: session.status,
        environment:
          session.plan.environment,
        targetMuscle:
          session.plan.targetMuscle,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
        durationMinutes,
        exerciseCount:
          session.plan.exercises.length,
        expectedSetCount,
        completedSetCount,
        actualTotalReps,
        exercises:
          session.plan.exercises.map(
            (planExercise) => ({
              exerciseId:
                planExercise.exerciseId,
              exerciseName:
                planExercise.exercise.name,
              order: planExercise.order,
              sets: planExercise.sets,
              reps: planExercise.reps,
              targetWeightKg:
                planExercise.targetWeightKg,
            }),
          ),
      };
    });

    return {
      userId,
      count: history.length,
      history,
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
