import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TrainingFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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
