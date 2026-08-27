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
  mealType: string;
  source?: string;
  note?: string;
  items: MealItemInput[];
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

  async createMeal(
    input: CreateMealInput,
    utcOffsetMinutes = 480,
  ) {
    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
      );

    const meal =
      await this.prisma.mealLog.create({
        data: {
          userId: input.userId,
          localDate,
          utcOffsetMinutes,
          mealType: input.mealType,
          source:
            input.source ?? 'MANUAL',
          note: input.note,
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

    return this.mapMeal(meal);
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

  async getToday(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException(
        'userId is required',
      );
    }

    const localDate =
      this.getLocalDate(
        utcOffsetMinutes,
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
      utcOffsetMinutes,
      meals:
        meals.map((meal) =>
          this.mapMeal(meal),
        ),
    };
  }

  async getTodaySummary(
    userId: string,
    utcOffsetMinutes = 480,
  ) {
    const today =
      await this.getToday(
        userId,
        utcOffsetMinutes,
      );

    let itemCount = 0;
    let totalCaloriesKcal = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;

    for (const meal of today.meals) {
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
      localDate:
        today.localDate,
      utcOffsetMinutes,
      mealCount:
        today.meals.length,
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
