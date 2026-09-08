import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateHealthGoalInput {
  userId: string;
  goalType: string;
  startWeightKg?: number;
  targetWeightKg?: number;
  startDate: Date;
  targetDate?: Date;
}

@Injectable()
export class HealthGoalsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    input: CreateHealthGoalInput,
  ) {
    if (!input.userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    return this.prisma.healthGoal.create({
      data: {
        userId: input.userId,
        goalType: input.goalType,
        startWeightKg:
          input.startWeightKg,
        targetWeightKg:
          input.targetWeightKg,
        startDate:
          input.startDate,
        targetDate:
          input.targetDate,
      },
    });
  }

  async getActive(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    return this.prisma.healthGoal.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getProgress(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    const goal =
      await this.prisma.healthGoal.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    if (!goal) {
      return {
        status: 'NO_GOAL',
      };
    }

    const latestWeight =
      await this.prisma.bodyMetricRecord.findFirst({
        where: {
          userId,
        },
        orderBy: {
          measuredAt: 'desc',
        },
      });

    if (
      !latestWeight ||
      goal.startWeightKg === null ||
      goal.targetWeightKg === null
    ) {
      return {
        status: 'INSUFFICIENT_DATA',
        goal,
      };
    }

    const totalChange =
      goal.startWeightKg -
      goal.targetWeightKg;

    const completedChange =
      goal.startWeightKg -
      latestWeight.weightKg;

    const progressPercent =
      totalChange > 0
        ? Math.round(
            (completedChange /
              totalChange) *
              1000,
          ) / 10
        : 0;

    return {
      status: 'AVAILABLE',
      goal,
      currentWeightKg:
        latestWeight.weightKg,
      remainingKg:
        Math.round(
          (
            latestWeight.weightKg -
            goal.targetWeightKg
          ) * 10,
        ) / 10,
      progressPercent,
      trend:
        progressPercent >= 0
          ? 'ON_TRACK'
          : 'OFF_TRACK',
    };
  }
}
