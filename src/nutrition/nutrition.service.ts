import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MealItemInput {
  foodName: string;
  caloriesKcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  quantity?: number;
  unit?: string;
}

export interface CreateMealInput {
  userId: string;
  clientRequestId?: string;
  mealType: string;
  source?: string;
  note?: string;
  items: MealItemInput[];
}

export interface UpsertNutritionTargetInput {
  dailyCaloriesKcal: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  source?: string;
}

export interface UpdateMealInput {
  mealType?: string;
  source?: string;
  note?: string | null;
  items?: MealItemInput[];
}

@Injectable()
export class NutritionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async upsertDailyTarget(
    userId: string,
    input: UpsertNutritionTargetInput,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    const target =
      await this.prisma.nutritionDailyTarget.upsert({
        where: {
          userId,
        },
        create: {
          userId,
          dailyCaloriesKcal:
            input.dailyCaloriesKcal,
          proteinG:
            input.proteinG,
          carbsG:
            input.carbsG,
          fatG:
            input.fatG,
          source:
            input.source ?? 'MANUAL',
        },
        update: {
          dailyCaloriesKcal:
            input.dailyCaloriesKcal,
          proteinG:
            input.proteinG,
          carbsG:
            input.carbsG,
          fatG:
            input.fatG,
          source:
            input.source ?? 'MANUAL',
        },
      });

    return this.mapDailyTarget(
      target,
    );
  }

  async getDailyTarget(
    userId: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    const target =
      await this.prisma.nutritionDailyTarget.findUnique({
        where: {
          userId,
        },
      });

    if (!target) {
      throw new NotFoundException(
        'Nutrition daily target not found',
      );
    }

    return this.mapDailyTarget(
      target,
    );
  }

  async createMeal(
    input: CreateMealInput,
    utcOffsetMinutes = 480,
  ) {
    if (input.clientRequestId) {
      const existing =
        await this.prisma.mealLog.findUnique({
          where: {
            clientRequestId:
              input.clientRequestId,
          },
          include: {
            items: {
              orderBy: {
                id: 'asc',
              },
            },
          },
        });

      if (existing) {
        if (
          existing.userId !==
          input.userId
        ) {
          throw new BadRequestException(
            'clientRequestId is already used by another user',
          );
        }

        return this.mapMeal(
          existing,
        );
      }
    }

    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    try {
      const meal =
        await this.prisma.mealLog.create({
          data: {
            userId:
              input.userId,
            clientRequestId:
              input.clientRequestId,
            localDate,
            utcOffsetMinutes,
            mealType:
              input.mealType,
            source:
              input.source ?? 'MANUAL',
            note:
              input.note,
            items: {
              create:
                input.items.map(
                  (item) => ({
                    foodName:
                      item.foodName,
                    caloriesKcal:
                      item.caloriesKcal,
                    proteinG:
                      item.proteinG,
                    carbsG:
                      item.carbsG,
                    fatG:
                      item.fatG,
                    quantity:
                      item.quantity,
                    unit:
                      item.unit,
                  }),
                ),
            },
          },
          include: {
            items: {
              orderBy: {
                id: 'asc',
              },
            },
          },
        });

      return this.mapMeal(
        meal,
      );
    } catch (error: unknown) {
      const isUniqueConstraintError =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (
          error as {
            code?: string;
          }
        ).code === 'P2002';

      if (
        !isUniqueConstraintError ||
        !input.clientRequestId
      ) {
        throw error;
      }

      const existing =
        await this.prisma.mealLog.findUnique({
          where: {
            clientRequestId:
              input.clientRequestId,
          },
          include: {
            items: {
              orderBy: {
                id: 'asc',
              },
            },
          },
        });

      if (!existing) {
        throw error;
      }

      if (
        existing.userId !==
        input.userId
      ) {
        throw new BadRequestException(
          'clientRequestId is already used by another user',
        );
      }

      return this.mapMeal(
        existing,
      );
    }
  }

  async updateMeal(
    mealLogId: number,
    input: UpdateMealInput,
  ) {
    if (
      input.mealType === undefined &&
      input.source === undefined &&
      input.note === undefined &&
      input.items === undefined
    ) {
      throw new BadRequestException(
        'At least one field is required',
      );
    }

    if (
      input.items !== undefined &&
      input.items.length === 0
    ) {
      throw new BadRequestException(
        'items must contain at least one item',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const existing =
          await tx.mealLog.findUnique({
            where: {
              id: mealLogId,
            },
          });

        if (!existing) {
          throw new NotFoundException(
            'Meal not found',
          );
        }

        if (input.items !== undefined) {
          await tx.mealItem.deleteMany({
            where: {
              mealLogId,
            },
          });

          await tx.mealItem.createMany({
            data:
              input.items.map(
                (item) => ({
                  mealLogId,
                  foodName:
                    item.foodName,
                  caloriesKcal:
                    item.caloriesKcal,
                  proteinG:
                    item.proteinG,
                  carbsG:
                    item.carbsG,
                  fatG:
                    item.fatG,
                  quantity:
                    item.quantity,
                  unit:
                    item.unit,
                }),
              ),
          });
        }

        const updated =
          await tx.mealLog.update({
            where: {
              id: mealLogId,
            },
            data: {
              mealType:
                input.mealType ??
                existing.mealType,
              source:
                input.source ??
                existing.source,
              note:
                input.note === undefined
                  ? existing.note
                  : input.note,
            },
            include: {
              items: {
                orderBy: {
                  id: 'asc',
                },
              },
            },
          });

        return this.mapMeal(
          updated,
        );
      },
    );
  }

  async deleteMeal(
    mealLogId: number,
  ) {
    const existing =
      await this.prisma.mealLog.findUnique({
        where: {
          id: mealLogId,
        },
        select: {
          id: true,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Meal not found',
      );
    }

    await this.prisma.mealLog.delete({
      where: {
        id: mealLogId,
      },
    });

    return {
      mealLogId,
      deleted: true,
    };
  }

  async getByDate(
    userId: string,
    localDate: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    this.validateLocalDate(
      localDate,
    );

    const meals =
      await this.prisma.mealLog.findMany({
        where: {
          userId,
          localDate,
        },
        include: {
          items: {
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    return {
      userId,
      localDate,
      meals:
        meals.map((meal) =>
          this.mapMeal(meal),
        ),
    };
  }

  async getSummaryByDate(
    userId: string,
    localDate: string,
  ) {
    const day =
      await this.getByDate(
        userId,
        localDate,
      );

    let itemCount = 0;
    let totalCaloriesKcal = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;

    for (const meal of day.meals) {
      for (const item of meal.items) {
        itemCount += 1;

        totalCaloriesKcal +=
          item.caloriesKcal;

        totalProteinG +=
          item.proteinG ?? 0;

        totalCarbsG +=
          item.carbsG ?? 0;

        totalFatG +=
          item.fatG ?? 0;
      }
    }

    const round1 = (
      value: number,
    ) =>
      Math.round(value * 10) / 10;

    return {
      userId,
      localDate,
      mealCount:
        day.meals.length,
      itemCount,
      totalCaloriesKcal:
        round1(
          totalCaloriesKcal,
        ),
      totalProteinG:
        round1(
          totalProteinG,
        ),
      totalCarbsG:
        round1(
          totalCarbsG,
        ),
      totalFatG:
        round1(
          totalFatG,
        ),
    };
  }

  async getTodayProgress(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const [
      target,
      consumed,
    ] = await Promise.all([
      this.getDailyTarget(
        userId,
      ),
      this.getTodaySummary(
        userId,
        utcOffsetMinutes,
      ),
    ]);

    const round1 = (
      value: number,
    ) =>
      Math.round(value * 10) / 10;

    const buildProgress = (
      targetValue: number | null,
      consumedValue: number,
    ) => {
      if (targetValue === null) {
        return {
          target: null,
          consumed:
            round1(
              consumedValue,
            ),
          remaining: null,
          completionPercent: null,
        };
      }

      return {
        target:
          round1(
            targetValue,
          ),
        consumed:
          round1(
            consumedValue,
          ),
        remaining:
          round1(
            targetValue -
              consumedValue,
          ),
        completionPercent:
          round1(
            (
              consumedValue /
              targetValue
            ) *
              100,
          ),
      };
    };

    return {
      userId,
      localDate:
        consumed.localDate,
      utcOffsetMinutes,
      calories:
        buildProgress(
          target.dailyCaloriesKcal,
          consumed.totalCaloriesKcal,
        ),
      protein:
        buildProgress(
          target.proteinG,
          consumed.totalProteinG,
        ),
      carbs:
        buildProgress(
          target.carbsG,
          consumed.totalCarbsG,
        ),
      fat:
        buildProgress(
          target.fatG,
          consumed.totalFatG,
        ),
      mealCount:
        consumed.mealCount,
      itemCount:
        consumed.itemCount,
      targetSource:
        target.source,
    };
  }

  async getRangeSummary(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    this.validateLocalDate(
      startDate,
    );

    this.validateLocalDate(
      endDate,
    );

    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must not be after endDate',
      );
    }

    const start =
      new Date(
        `${startDate}T00:00:00.000Z`,
      );

    const end =
      new Date(
        `${endDate}T00:00:00.000Z`,
      );

    const dayCount =
      Math.floor(
        (
          end.getTime() -
          start.getTime()
        ) /
          (
            24 *
            60 *
            60 *
            1000
          ),
      ) + 1;

    if (dayCount > 366) {
      throw new BadRequestException(
        'Date range must not exceed 366 days',
      );
    }

    const meals =
      await this.prisma.mealLog.findMany({
        where: {
          userId,
          localDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          items: {
            orderBy: {
              id: 'asc',
            },
          },
        },
        orderBy: [
          {
            localDate: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
      });

    const dailyMap =
      new Map<
        string,
        {
          mealCount: number;
          itemCount: number;
          totalCaloriesKcal: number;
          totalProteinG: number;
          totalCarbsG: number;
          totalFatG: number;
        }
      >();

    let mealCount = 0;
    let itemCount = 0;
    let totalCaloriesKcal = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;

    for (const meal of meals) {
      mealCount += 1;

      let daily =
        dailyMap.get(
          meal.localDate,
        );

      if (!daily) {
        daily = {
          mealCount: 0,
          itemCount: 0,
          totalCaloriesKcal: 0,
          totalProteinG: 0,
          totalCarbsG: 0,
          totalFatG: 0,
        };

        dailyMap.set(
          meal.localDate,
          daily,
        );
      }

      daily.mealCount += 1;

      for (const item of meal.items) {
        itemCount += 1;
        daily.itemCount += 1;

        totalCaloriesKcal +=
          item.caloriesKcal;

        totalProteinG +=
          item.proteinG ?? 0;

        totalCarbsG +=
          item.carbsG ?? 0;

        totalFatG +=
          item.fatG ?? 0;

        daily.totalCaloriesKcal +=
          item.caloriesKcal;

        daily.totalProteinG +=
          item.proteinG ?? 0;

        daily.totalCarbsG +=
          item.carbsG ?? 0;

        daily.totalFatG +=
          item.fatG ?? 0;
      }
    }

    const round1 = (
      value: number,
    ) =>
      Math.round(value * 10) / 10;

    const dailySummaries =
      Array.from(
        dailyMap.entries(),
      ).map(
        ([
          localDate,
          daily,
        ]) => ({
          localDate,
          mealCount:
            daily.mealCount,
          itemCount:
            daily.itemCount,
          totalCaloriesKcal:
            round1(
              daily.totalCaloriesKcal,
            ),
          totalProteinG:
            round1(
              daily.totalProteinG,
            ),
          totalCarbsG:
            round1(
              daily.totalCarbsG,
            ),
          totalFatG:
            round1(
              daily.totalFatG,
            ),
        }),
      );

    return {
      userId,
      startDate,
      endDate,
      dayCount,
      daysWithMeals:
        dailySummaries.length,
      mealCount,
      itemCount,
      totalCaloriesKcal:
        round1(
          totalCaloriesKcal,
        ),
      totalProteinG:
        round1(
          totalProteinG,
        ),
      totalCarbsG:
        round1(
          totalCarbsG,
        ),
      totalFatG:
        round1(
          totalFatG,
        ),
      averageCaloriesKcalPerDay:
        round1(
          totalCaloriesKcal /
            dayCount,
        ),
      averageProteinGPerDay:
        round1(
          totalProteinG /
            dayCount,
        ),
      averageCarbsGPerDay:
        round1(
          totalCarbsG /
            dayCount,
        ),
      averageFatGPerDay:
        round1(
          totalFatG /
            dayCount,
        ),
      dailySummaries,
    };
  }

  async getToday(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    const day =
      await this.getByDate(
        userId,
        localDate,
      );

    return {
      ...day,
      utcOffsetMinutes,
    };
  }

  async getTodaySummary(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    const summary =
      await this.getSummaryByDate(
        userId,
        localDate,
      );

    return {
      ...summary,
      utcOffsetMinutes,
    };
  }

  private validateLocalDate(
    localDate: string,
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        localDate,
      )
    ) {
      throw new BadRequestException(
        'localDate must use YYYY-MM-DD format',
      );
    }

    const parsed =
      new Date(
        `${localDate}T00:00:00.000Z`,
      );

    if (
      Number.isNaN(
        parsed.getTime(),
      ) ||
      parsed
        .toISOString()
        .slice(0, 10) !== localDate
    ) {
      throw new BadRequestException(
        'localDate is invalid',
      );
    }
  }

  private mapDailyTarget(
    target: {
      id: number;
      userId: string;
      dailyCaloriesKcal: number;
      proteinG: number | null;
      carbsG: number | null;
      fatG: number | null;
      source: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ) {
    return {
      nutritionDailyTargetId:
        target.id,
      userId:
        target.userId,
      dailyCaloriesKcal:
        target.dailyCaloriesKcal,
      proteinG:
        target.proteinG,
      carbsG:
        target.carbsG,
      fatG:
        target.fatG,
      source:
        target.source,
      createdAt:
        target.createdAt,
      updatedAt:
        target.updatedAt,
    };
  }

  private getLocalDate(
    utcOffsetMinutes: number,
  ) {
    const now = new Date();

    const localTime =
      new Date(
        now.getTime() +
          utcOffsetMinutes *
            60 *
            1000,
      );

    return localTime
      .toISOString()
      .slice(0, 10);
  }

  private mapMeal(
    meal: {
      id: number;
      userId: string;
      localDate: string;
      utcOffsetMinutes: number;
      mealType: string;
      source: string;
      note: string | null;
      createdAt: Date;
      updatedAt: Date;
      items: {
        id: number;
        foodName: string;
        caloriesKcal: number;
        proteinG: number | null;
        carbsG: number | null;
        fatG: number | null;
        quantity: number | null;
        unit: string | null;
      }[];
    },
  ) {
    return {
      mealLogId:
        meal.id,
      userId:
        meal.userId,
      localDate:
        meal.localDate,
      utcOffsetMinutes:
        meal.utcOffsetMinutes,
      mealType:
        meal.mealType,
      source:
        meal.source,
      note:
        meal.note,
      items:
        meal.items.map(
          (item) => ({
            mealItemId:
              item.id,
            foodName:
              item.foodName,
            caloriesKcal:
              item.caloriesKcal,
            proteinG:
              item.proteinG,
            carbsG:
              item.carbsG,
            fatG:
              item.fatG,
            quantity:
              item.quantity,
            unit:
              item.unit,
          }),
        ),
      createdAt:
        meal.createdAt,
      updatedAt:
        meal.updatedAt,
    };
  }
}
