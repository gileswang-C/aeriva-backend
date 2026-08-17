import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PainRiskService } from '../pain-risk/pain-risk.service';

@Injectable()
export class TrainingFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly painRiskService: PainRiskService,
  ) {}


  async getAdjustmentDetail(
    sessionId: number,
  ) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
        include: {
          sets: {
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

    if (!session) {
      throw new Error(
        'Training session not found',
      );
    }

    const recommendations =
      {};

    for (const set of session.sets) {
      const exerciseId =
        set.planExercise.exerciseId;

      if (!recommendations[exerciseId]) {
        recommendations[exerciseId] = {
          exercise:
            set.planExercise.exercise.name,
          targetSets:
            set.planExercise.sets,
          targetReps:
            set.planExercise.reps,
          completedReps: 0,
          totalSets: 0,
          weights: [],
        };
      }

      recommendations[exerciseId].totalSets += 1;

      recommendations[exerciseId].completedReps +=
        set.reps ?? 0;

      if (set.weightKg !== null) {
        recommendations[exerciseId].weights.push(
          set.weightKg,
        );
      }
    }

    const feedback =
      await this.prisma.trainingPerformanceFeedback.findUnique({
        where: {
          sessionId,
        },
      });

    const bodyState =
      await this.prisma.dailyBodyState.findFirst({
        where: {
          userId: session.userId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    const painAreas =
      bodyState?.painAreasJson
        ? JSON.parse(bodyState.painAreasJson)
        : [];

    return {
      sessionId,
      recommendations:
        Object.values(recommendations).map(
          (item: any) => {
            const currentWeightKg =
              item.weights.length
                ? item.weights[item.weights.length - 1]
                : null;

            const completionRate =
              Math.round(
                (item.completedReps /
                  (item.targetSets *
                    item.targetReps)) *
                  100,
              );

            const painRisk =
              this.painRiskService.checkExercisePainRisk(
                item.exercise,
                painAreas,
              );

            let action = currentWeightKg
              ? 'KEEP'
              : 'NO_WEIGHT_DATA';

            let suggestedWeightKg = currentWeightKg;

            let reason = currentWeightKg
              ? '完成当前训练记录，保持当前重量'
              : '当前动作没有重量记录，无法自动调整';

            if (
              feedback?.painLevel !== null &&
              feedback?.painLevel !== undefined &&
              feedback.painLevel >= 3
            ) {
              action = 'REDUCE_WEIGHT';
              suggestedWeightKg =
                currentWeightKg
                  ? currentWeightKg - 2.5
                  : null;
              reason =
                '检测到疼痛反馈，降低训练重量';
            } else if (
              feedback?.difficultyLevel !== null &&
              feedback?.difficultyLevel !== null &&
              feedback?.difficultyLevel !== undefined &&
              feedback.difficultyLevel <= 2 &&
              completionRate >= 100 &&
              currentWeightKg
            ) {
              action = 'INCREASE_WEIGHT';
              suggestedWeightKg =
                currentWeightKg + 2.5;
              reason =
                '完成目标且训练难度较低，建议增加重量';
            }

            if (painRisk.blocked) {
              action = 'BLOCK';
              suggestedWeightKg = null;
              reason = painRisk.reason;
            }

            return {
              exercise: item.exercise,
              completionRate,
              currentWeightKg,
              suggestedWeightKg,
              risk: painRisk.risk,
              action,
              reason,
            };
          },
        ),
    };
  }


  async getAdjustment(
    sessionId: number,
  ) {
    const feedback =
      await this.prisma.trainingPerformanceFeedback.findUnique({
        where: {
          sessionId,
        },
      });

    if (!feedback) {
      return {
        sessionId,
        action: 'NO_DATA',
        reason: '没有找到训练反馈',
      };
    }

    if (
      feedback.painLevel !== null &&
      feedback.painLevel >= 3
    ) {
      return {
        sessionId,
        action: 'REDUCE_INTENSITY',
        reason: '存在疼痛反馈，下一次训练降低强度',
      };
    }

    if (
      feedback.fatigueLevel !== null &&
      feedback.fatigueLevel >= 4
    ) {
      return {
        sessionId,
        action: 'REDUCE_VOLUME',
        reason: '疲劳较高，减少训练量',
      };
    }

    if (
      feedback.difficultyLevel !== null &&
      feedback.difficultyLevel <= 2
    ) {
      return {
        sessionId,
        action: 'INCREASE_WEIGHT',
        reason: '当前训练难度较低，可以增加重量',
        weightAdjustmentKg: 2.5,
      };
    }

    if (
      feedback.difficultyLevel !== null &&
      feedback.difficultyLevel >= 4
    ) {
      return {
        sessionId,
        action: 'KEEP_OR_REDUCE',
        reason: '训练难度较高，保持或降低重量',
      };
    }

    return {
      sessionId,
      action: 'KEEP',
      reason: '当前训练状态稳定，保持当前计划',
    };
  }


  async updateFeedback(
    sessionId: number,
    data: {
      difficultyLevel?: number;
      fatigueLevel?: number;
      painLevel?: number;
      note?: string;
    },
  ) {
    return this.prisma.trainingPerformanceFeedback.update({
      where: {
        sessionId,
      },
      data,
    });
  }


  async getFeedback(
    sessionId: number,
  ) {
    return this.prisma.trainingPerformanceFeedback.findUnique({
      where: {
        sessionId,
      },
    });
  }


  async createFeedback(
    sessionId: number,
    input: {
      difficultyLevel?: number;
      fatigueLevel?: number;
      painLevel?: number;
      note?: string;
    },
  ) {
    const session =
      await this.prisma.trainingSession.findUnique({
        where: {
          id: sessionId,
        },
      });

    if (!session) {
      throw new Error(
        'Training session not found',
      );
    }

    return this.prisma.trainingPerformanceFeedback.create({
      data: {
        sessionId,
        userId: session.userId,
        difficultyLevel:
          input.difficultyLevel,
        fatigueLevel:
          input.fatigueLevel,
        painLevel:
          input.painLevel,
        note:
          input.note,
      },
    });
  }
}
