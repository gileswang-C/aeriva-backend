import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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

  async completeGoal(
    goalId: number,
  ) {
    return this.updateGoalStatus(
      goalId,
      'COMPLETED',
    );
  }

  async cancelGoal(
    goalId: number,
  ) {
    return this.updateGoalStatus(
      goalId,
      'CANCELLED',
    );
  }

  private async updateGoalStatus(
    goalId: number,
    status:
      | 'COMPLETED'
      | 'CANCELLED',
  ) {
    if (
      !Number.isInteger(goalId) ||
      goalId <= 0
    ) {
      throw new BadRequestException(
        'goalId must be a positive integer',
      );
    }

    const result =
      await this.prisma.healthGoal.updateMany({
        where: {
          id: goalId,
          status: 'ACTIVE',
        },
        data: {
          status,
        },
      });

    if (result.count === 0) {
      const existingGoal =
        await this.prisma.healthGoal.findUnique({
          where: {
            id: goalId,
          },
        });

      if (!existingGoal) {
        throw new NotFoundException(
          'Health goal not found',
        );
      }

      throw new ConflictException(
        'Health goal is not active',
      );
    }

    return this.prisma.healthGoal.findUnique({
      where: {
        id: goalId,
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
          measuredAt: {
            gte: goal.startDate,
          },
        },
        orderBy: {
          measuredAt: 'desc',
        },
      });

    if (!latestWeight) {
      return {
        status: 'INSUFFICIENT_DATA',
        goal,
      };
    }

    const currentWeightKg =
      latestWeight.weightKg;

    if (goal.goalType === 'MAINTAIN') {
      const referenceWeightKg =
        goal.targetWeightKg ??
        goal.startWeightKg;

      if (referenceWeightKg === null) {
        return {
          status: 'INSUFFICIENT_DATA',
          goal,
        };
      }

      const toleranceKg = 1;

      const deviationKg =
        Math.round(
          Math.abs(
            currentWeightKg -
              referenceWeightKg,
          ) * 10,
        ) / 10;

      return {
        status: 'AVAILABLE',
        goal,
        currentWeightKg,
        maintenanceStatus:
          deviationKg <= toleranceKg
            ? 'WITHIN_RANGE'
            : 'OUTSIDE_RANGE',
        deviationKg,
        maintenanceRangeKg: {
          min:
            Math.round(
              (
                referenceWeightKg -
                toleranceKg
              ) * 10,
            ) / 10,
          max:
            Math.round(
              (
                referenceWeightKg +
                toleranceKg
              ) * 10,
            ) / 10,
        },
      };
    }

    if (
      goal.startWeightKg === null ||
      goal.targetWeightKg === null
    ) {
      return {
        status: 'INSUFFICIENT_DATA',
        goal,
      };
    }

    const isWeightLoss =
      goal.goalType === 'WEIGHT_LOSS';

    const totalChange =
      isWeightLoss
        ? goal.startWeightKg -
          goal.targetWeightKg
        : goal.targetWeightKg -
          goal.startWeightKg;

    if (totalChange <= 0) {
      return {
        status: 'INSUFFICIENT_DATA',
        goal,
      };
    }

    const completedChange =
      isWeightLoss
        ? goal.startWeightKg -
          currentWeightKg
        : currentWeightKg -
          goal.startWeightKg;

    const rawProgressPercent =
      (
        completedChange /
        totalChange
      ) * 100;

    const progressPercent =
      Math.round(
        Math.min(
          100,
          Math.max(
            0,
            rawProgressPercent,
          ),
        ) * 10,
      ) / 10;

    const targetReached =
      isWeightLoss
        ? currentWeightKg <=
          goal.targetWeightKg
        : currentWeightKg >=
          goal.targetWeightKg;

    const remainingKg =
      targetReached
        ? 0
        : Math.round(
            Math.abs(
              goal.targetWeightKg -
                currentWeightKg,
            ) * 10,
          ) / 10;

    let trend:
      | 'AT_TARGET'
      | 'PROGRESSING'
      | 'NO_CHANGE'
      | 'REGRESSING';

    if (targetReached) {
      trend = 'AT_TARGET';
    } else if (completedChange > 0) {
      trend = 'PROGRESSING';
    } else if (completedChange === 0) {
      trend = 'NO_CHANGE';
    } else {
      trend = 'REGRESSING';
    }

    return {
      status: 'AVAILABLE',
      goal,
      currentWeightKg,
      remainingKg,
      progressPercent,
      trend,
    };
  }

  async getRecommendation(
    userId: string,
  ) {
    const summary =
      await this.getSummary(
        userId,
      );

    if (
      summary.status ===
      'NO_GOAL'
    ) {
      return {
        status:
          'NO_GOAL',

        level:
          'CREATE_GOAL',

        title:
          'Create your first health goal',

        actions: [
          'Set a health goal',
          'Start tracking body progress',
        ],
      };
    }

    if (
      summary.status !==
      'AVAILABLE' ||
      !('pace' in summary)
    ) {
      return summary;
    }

    let level:
      | 'AHEAD'
      | 'OPTIMAL'
      | 'NEEDS_ADJUSTMENT';

    let title: string;

    let actions: string[];

    if (
      summary.pace === 'AHEAD'
    ) {
      level =
        'AHEAD';

      title =
        'Progress is ahead of plan';

      actions = [
        'Avoid excessive calorie restriction',
        'Keep strength training consistent',
      ];
    } else if (
      summary.pace === 'BEHIND'
    ) {
      level =
        'NEEDS_ADJUSTMENT';

      title =
        'Goal progress needs adjustment';

      actions = [
        'Review nutrition adherence',
        'Increase daily activity',
      ];
    } else {
      level =
        'OPTIMAL';

      title =
        'Goal execution is on track';

      actions = [
        'Maintain current training plan',
        'Continue tracking nutrition',
      ];
    }

    return {
      status:
        'AVAILABLE',

      level,

      title,

      actions,

      metrics: {
        progressPercent:
          summary.progressPercent,

        pace:
          summary.pace,
      },
    };
  }


  async getSummary(
    userId: string,
  ) {
    const progress =
      await this.getProgress(
        userId,
      );

    if (
      progress.status !==
      'AVAILABLE'
    ) {
      return progress;
    }

    if (
      !progress.goal ||
      progress.progressPercent === undefined
    ) {
      return {
        status:
          'INSUFFICIENT_DATA',
      };
    }

    const goal =
      progress.goal;

    if (
      !goal.targetDate ||
      !goal.startDate
    ) {
      return {
        ...progress,
      };
    }

    const now =
      new Date();

    const startTime =
      goal.startDate.getTime();

    const targetTime =
      goal.targetDate.getTime();

    const totalDays =
      Math.ceil(
        (
          targetTime -
          startTime
        ) /
        (
          24 *
          60 *
          60 *
          1000
        ),
      );

    const elapsedDays =
      Math.max(
        0,
        Math.ceil(
          (
            now.getTime() -
            startTime
          ) /
          (
            24 *
            60 *
            60 *
            1000
          ),
        ),
      );

    const daysElapsed =
      Math.min(
        elapsedDays,
        totalDays,
      );

    const daysRemaining =
      Math.max(
        0,
        totalDays -
        daysElapsed,
      );

    const expectedProgressPercent =
      totalDays > 0
        ? Math.round(
            (
              daysElapsed /
              totalDays
            ) *
            1000,
          ) / 10
        : 0;

    const difference =
      progress.progressPercent -
      expectedProgressPercent;

    let pace:
      | 'AHEAD'
      | 'ON_TRACK'
      | 'BEHIND';

    if (difference >= 10) {
      pace = 'AHEAD';
    } else if (
      difference <= -10
    ) {
      pace = 'BEHIND';
    } else {
      pace = 'ON_TRACK';
    }

    return {
      status:
        'AVAILABLE',
      goalType:
        goal.goalType,
      currentWeightKg:
        progress.currentWeightKg,
      targetWeightKg:
        goal.targetWeightKg,
      progressPercent:
        progress.progressPercent,
      daysElapsed,
      daysRemaining,
      expectedProgressPercent,
      pace,
    };
  }
}
