import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NutritionService } from '../nutrition/nutrition.service';

@Injectable()
export class HealthProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nutritionService: NutritionService,
  ) {}

  async getWeeklySummary(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const endDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    const end =
      new Date(
        `${endDate}T23:59:59.999Z`,
      );

    const start =
      new Date(end);

    start.setUTCDate(
      start.getUTCDate() - 6,
    );

    const [
      weightRecords,
      nutrition,
      trainingSessions,
    ] = await Promise.all([
      this.prisma.bodyMetricRecord.findMany({
        where: {
          userId,
          measuredAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          measuredAt: 'asc',
        },
      }),

      this.nutritionService.getWeeklyInsights(
        userId,
        utcOffsetMinutes,
      ),

      this.prisma.trainingSession.findMany({
        where: {
          userId,
          startedAt: {
            gte: start,
            lte: end,
          },
        },
      }),
    ]);

    const weight =
      this.buildWeightSummary(
        weightRecords,
      );

    const trainingDays =
      trainingSessions.length;

    return {
      userId,
      period: {
        startDate:
          start.toISOString()
            .slice(0, 10),
        endDate,
      },

      weight,

      nutrition: {
        status:
          nutrition.dataStatus,
        loggingRatePercent:
          nutrition.loggingRatePercent,
        calorieStatus:
          nutrition.calorieStatus,
        proteinStatus:
          nutrition.proteinStatus,
      },

      training: {
        status:
          trainingDays === 0
            ? 'NO_DATA'
            : 'AVAILABLE',
        trainingDays,
        consistency:
          this.classifyTraining(
            trainingDays,
          ),
      },

      overallStatus:
        this.classifyOverall(
          weight,
          nutrition,
          trainingDays,
        ),
    };
  }

  private buildWeightSummary(
    records: {
      weightKg: number;
    }[],
  ) {
    if (records.length === 0) {
      return {
        status: 'NO_DATA',
        trend: 'UNKNOWN',
      };
    }

    const startWeightKg =
      records[0].weightKg;

    const endWeightKg =
      records[
        records.length - 1
      ].weightKg;

    const changeKg =
      Math.round(
        (
          endWeightKg -
          startWeightKg
        ) * 10,
      ) / 10;

    return {
      status: 'AVAILABLE',
      startWeightKg,
      endWeightKg,
      changeKg,
      trend:
        changeKg < -0.2
          ? 'DOWN'
          : changeKg > 0.2
            ? 'UP'
            : 'STABLE',
    };
  }

  private classifyTraining(
    days: number,
  ) {
    if (days === 0) {
      return 'NO_DATA';
    }

    if (days >= 5) {
      return 'EXCELLENT';
    }

    if (days >= 3) {
      return 'GOOD';
    }

    return 'LOW';
  }

  private classifyOverall(
    weight: {
      status: string;
      trend?: string;
    },
    nutrition: {
      dataStatus: string;
    },
    trainingDays: number,
  ) {
    if (
      weight.status === 'AVAILABLE' &&
      trainingDays >= 3 &&
      nutrition.dataStatus !== 'NO_DATA'
    ) {
      return 'PROGRESSING';
    }

    return 'INSUFFICIENT_DATA';
  }

  private getLocalDate(
    utcOffsetMinutes: number,
  ) {
    const now =
      new Date();

    const shifted =
      new Date(
        now.getTime() +
          utcOffsetMinutes *
            60 *
            1000,
      );

    return shifted
      .toISOString()
      .slice(0, 10);
  }
}
