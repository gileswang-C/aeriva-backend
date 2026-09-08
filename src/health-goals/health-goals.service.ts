import {
  BadRequestException,
  ConflictException,
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
    const userId =
      input.userId?.trim();

    if (!userId) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    const goalType =
      input.goalType?.trim();

    const allowedGoalTypes =
      new Set([
        'WEIGHT_LOSS',
        'MUSCLE_GAIN',
        'MAINTAIN',
      ]);

    if (
      !goalType ||
      !allowedGoalTypes.has(
        goalType,
      )
    ) {
      throw new BadRequestException(
        'goalType must be WEIGHT_LOSS, MUSCLE_GAIN, or MAINTAIN',
      );
    }

    if (
      input.startWeightKg !== undefined &&
      (
        !Number.isFinite(
          input.startWeightKg,
        ) ||
        input.startWeightKg <= 0
      )
    ) {
      throw new BadRequestException(
        'startWeightKg must be greater than 0',
      );
    }

    if (
      input.targetWeightKg !== undefined &&
      (
        !Number.isFinite(
          input.targetWeightKg,
        ) ||
        input.targetWeightKg <= 0
      )
    ) {
      throw new BadRequestException(
        'targetWeightKg must be greater than 0',
      );
    }

    if (
      !(input.startDate instanceof Date) ||
      Number.isNaN(
        input.startDate.getTime(),
      )
    ) {
      throw new BadRequestException(
        'startDate must be a valid date',
      );
    }

    if (
      input.targetDate !== undefined
    ) {
      if (
        !(input.targetDate instanceof Date) ||
        Number.isNaN(
          input.targetDate.getTime(),
        )
      ) {
        throw new BadRequestException(
          'targetDate must be a valid date',
        );
      }

      if (
        input.targetDate.getTime() <=
        input.startDate.getTime()
      ) {
        throw new BadRequestException(
          'targetDate must be after startDate',
        );
      }
    }

    const existingActiveGoal =
      await this.prisma.healthGoal.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

    if (existingActiveGoal) {
      throw new ConflictException(
        'active health goal already exists',
      );
    }

    return this.prisma.healthGoal.create({
      data: {
        userId,
        goalType,
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
