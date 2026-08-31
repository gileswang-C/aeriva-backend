import {
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Nutrition (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records a meal and returns the correct daily nutrition summary', async () => {
    const userId =
      'e2e-nutrition-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'LUNCH',
          source: 'MANUAL',
          note: 'E2E nutrition test',
          items: [
            {
              foodName: '米饭',
              caloriesKcal: 260,
              proteinG: 5,
              carbsG: 57,
              fatG: 0.5,
              quantity: 200,
              unit: 'g',
            },
            {
              foodName: '鸡胸肉',
              caloriesKcal: 165,
              proteinG: 31,
              carbsG: 0,
              fatG: 3.6,
              quantity: 100,
              unit: 'g',
            },
            {
              foodName: '鸡蛋',
              caloriesKcal: 70,
              proteinG: 6,
              carbsG: 0.5,
              fatG: 5,
              quantity: 1,
              unit: '个',
            },
          ],
        })
        .expect(201);

    expect(
      createResponse.body.status,
    ).toBe('ok');

    expect(
      createResponse.body.data.items,
    ).toHaveLength(3);

    const todayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      todayResponse.body.data.meals,
    ).toHaveLength(1);

    expect(
      todayResponse.body.data.meals[0].items,
    ).toHaveLength(3);

    const summaryResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      summaryResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      summaryResponse.body.data.itemCount,
    ).toBe(3);

    expect(
      summaryResponse.body.data.totalCaloriesKcal,
    ).toBe(495);

    expect(
      summaryResponse.body.data.totalProteinG,
    ).toBe(42);

    expect(
      summaryResponse.body.data.totalCarbsG,
    ).toBe(57.5);

    expect(
      summaryResponse.body.data.totalFatG,
    ).toBe(9.1);
  });

  it('updates and deletes a meal while keeping the daily summary consistent', async () => {
    const userId =
      'e2e-nutrition-edit-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'LUNCH',
          source: 'MANUAL',
          items: [
            {
              foodName: '米饭',
              caloriesKcal: 260,
              proteinG: 5,
              carbsG: 57,
              fatG: 0.5,
            },
            {
              foodName: '鸡蛋',
              caloriesKcal: 70,
              proteinG: 6,
              carbsG: 0.5,
              fatG: 5,
            },
          ],
        })
        .expect(201);

    const mealLogId =
      createResponse.body.data.mealLogId;

    const updateResponse =
      await request(app.getHttpServer())
        .put(
          `/nutrition/meals/${mealLogId}`,
        )
        .send({
          mealType: 'DINNER',
          note: 'updated meal',
          items: [
            {
              foodName: '米饭',
              caloriesKcal: 300,
              proteinG: 6,
              carbsG: 66,
              fatG: 1,
            },
            {
              foodName: '鸡胸肉',
              caloriesKcal: 200,
              proteinG: 38,
              carbsG: 0,
              fatG: 4,
            },
          ],
        })
        .expect(200);

    expect(
      updateResponse.body.data.mealLogId,
    ).toBe(mealLogId);

    expect(
      updateResponse.body.data.mealType,
    ).toBe('DINNER');

    expect(
      updateResponse.body.data.items,
    ).toHaveLength(2);

    const updatedSummary =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      updatedSummary.body.data.mealCount,
    ).toBe(1);

    expect(
      updatedSummary.body.data.itemCount,
    ).toBe(2);

    expect(
      updatedSummary.body.data.totalCaloriesKcal,
    ).toBe(500);

    expect(
      updatedSummary.body.data.totalProteinG,
    ).toBe(44);

    expect(
      updatedSummary.body.data.totalCarbsG,
    ).toBe(66);

    expect(
      updatedSummary.body.data.totalFatG,
    ).toBe(5);

    const deleteResponse =
      await request(app.getHttpServer())
        .delete(
          `/nutrition/meals/${mealLogId}`,
        )
        .expect(200);

    expect(
      deleteResponse.body.data,
    ).toEqual({
      mealLogId,
      deleted: true,
    });

    const todayAfterDelete =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      todayAfterDelete.body.data.meals,
    ).toHaveLength(0);

    const summaryAfterDelete =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/summary?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      summaryAfterDelete.body.data.mealCount,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.itemCount,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalCaloriesKcal,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalProteinG,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalCarbsG,
    ).toBe(0);

    expect(
      summaryAfterDelete.body.data.totalFatG,
    ).toBe(0);
  });
  it('supports historical date queries and rejects invalid dates', async () => {
    const userId =
      'e2e-nutrition-history-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'BREAKFAST',
          source: 'MANUAL',
          items: [
            {
              foodName: '燕麦',
              caloriesKcal: 228,
              proteinG: 8,
              carbsG: 40,
              fatG: 4,
            },
            {
              foodName: '牛奶',
              caloriesKcal: 150,
              proteinG: 8,
              carbsG: 12,
              fatG: 8,
            },
          ],
        })
        .expect(201);

    const localDate =
      createResponse.body.data.localDate;

    const dayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/date/${localDate}`,
        )
        .expect(200);

    expect(
      dayResponse.body.data.localDate,
    ).toBe(localDate);

    expect(
      dayResponse.body.data.meals,
    ).toHaveLength(1);

    expect(
      dayResponse.body.data.meals[0].items,
    ).toHaveLength(2);

    const summaryResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/date/${localDate}/summary`,
        )
        .expect(200);

    expect(
      summaryResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      summaryResponse.body.data.itemCount,
    ).toBe(2);

    expect(
      summaryResponse.body.data.totalCaloriesKcal,
    ).toBe(378);

    expect(
      summaryResponse.body.data.totalProteinG,
    ).toBe(16);

    expect(
      summaryResponse.body.data.totalCarbsG,
    ).toBe(52);

    expect(
      summaryResponse.body.data.totalFatG,
    ).toBe(12);

    const invalidDateResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/date/2026-02-30`,
        )
        .expect(400);

    expect(
      invalidDateResponse.body.message,
    ).toBe('localDate is invalid');
  });

  it('returns nutrition summaries for a date range and rejects reversed dates', async () => {
    const userId =
      'e2e-nutrition-range-user';

    const createResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId,
          mealType: 'BREAKFAST',
          source: 'MANUAL',
          items: [
            {
              foodName: '燕麦',
              caloriesKcal: 228,
              proteinG: 8,
              carbsG: 40,
              fatG: 4,
            },
            {
              foodName: '牛奶',
              caloriesKcal: 150,
              proteinG: 8,
              carbsG: 12,
              fatG: 8,
            },
          ],
        })
        .expect(201);

    const localDate =
      createResponse.body.data.localDate;

    const currentDate =
      new Date(
        `${localDate}T00:00:00.000Z`,
      );

    const previousDate =
      new Date(
        currentDate.getTime() -
          24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);

    const singleDayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/range/summary?startDate=${localDate}&endDate=${localDate}`,
        )
        .expect(200);

    expect(
      singleDayResponse.body.data.dayCount,
    ).toBe(1);

    expect(
      singleDayResponse.body.data.daysWithMeals,
    ).toBe(1);

    expect(
      singleDayResponse.body.data.totalCaloriesKcal,
    ).toBe(378);

    expect(
      singleDayResponse.body.data.averageCaloriesKcalPerDay,
    ).toBe(378);

    const twoDayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/range/summary?startDate=${previousDate}&endDate=${localDate}`,
        )
        .expect(200);

    expect(
      twoDayResponse.body.data.dayCount,
    ).toBe(2);

    expect(
      twoDayResponse.body.data.daysWithMeals,
    ).toBe(1);

    expect(
      twoDayResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      twoDayResponse.body.data.itemCount,
    ).toBe(2);

    expect(
      twoDayResponse.body.data.totalCaloriesKcal,
    ).toBe(378);

    expect(
      twoDayResponse.body.data.totalProteinG,
    ).toBe(16);

    expect(
      twoDayResponse.body.data.totalCarbsG,
    ).toBe(52);

    expect(
      twoDayResponse.body.data.totalFatG,
    ).toBe(12);

    expect(
      twoDayResponse.body.data.averageCaloriesKcalPerDay,
    ).toBe(189);

    expect(
      twoDayResponse.body.data.averageProteinGPerDay,
    ).toBe(8);

    expect(
      twoDayResponse.body.data.averageCarbsGPerDay,
    ).toBe(26);

    expect(
      twoDayResponse.body.data.averageFatGPerDay,
    ).toBe(6);

    expect(
      twoDayResponse.body.data.dailySummaries,
    ).toHaveLength(1);

    expect(
      twoDayResponse.body.data.dailySummaries[0].localDate,
    ).toBe(localDate);

    const reversedResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/range/summary?startDate=${localDate}&endDate=${previousDate}`,
        )
        .expect(400);

    expect(
      reversedResponse.body.message,
    ).toBe(
      'startDate must not be after endDate',
    );
  });

  it('tracks daily nutrition target progress without creating duplicate targets', async () => {
    const userId =
      'e2e-nutrition-target-user';

    const firstTargetResponse =
      await request(app.getHttpServer())
        .put(
          `/nutrition/${userId}/target`,
        )
        .send({
          dailyCaloriesKcal: 2000,
          proteinG: 150,
          carbsG: 220,
          fatG: 60,
          source: 'MANUAL',
        })
        .expect(200);

    const targetId =
      firstTargetResponse.body.data
        .nutritionDailyTargetId;

    expect(
      firstTargetResponse.body.data.dailyCaloriesKcal,
    ).toBe(2000);

    const getTargetResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/target`,
        )
        .expect(200);

    expect(
      getTargetResponse.body.data
        .nutritionDailyTargetId,
    ).toBe(targetId);

    const updatedTargetResponse =
      await request(app.getHttpServer())
        .put(
          `/nutrition/${userId}/target`,
        )
        .send({
          dailyCaloriesKcal: 1800,
          proteinG: 160,
          carbsG: 180,
          fatG: 55,
          source: 'MANUAL',
        })
        .expect(200);

    expect(
      updatedTargetResponse.body.data
        .nutritionDailyTargetId,
    ).toBe(targetId);

    expect(
      updatedTargetResponse.body.data.dailyCaloriesKcal,
    ).toBe(1800);

    await request(app.getHttpServer())
      .post(
        '/nutrition/meals?utcOffsetMinutes=480',
      )
      .send({
        userId,
        mealType: 'LUNCH',
        source: 'MANUAL',
        items: [
          {
            foodName: '鸡胸肉',
            caloriesKcal: 330,
            proteinG: 62,
            carbsG: 0,
            fatG: 7.2,
          },
          {
            foodName: '米饭',
            caloriesKcal: 260,
            proteinG: 5,
            carbsG: 57,
            fatG: 0.5,
          },
        ],
      })
      .expect(201);

    const progressResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today/progress?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      progressResponse.body.data.calories,
    ).toEqual({
      target: 1800,
      consumed: 590,
      remaining: 1210,
      completionPercent: 32.8,
    });

    expect(
      progressResponse.body.data.protein,
    ).toEqual({
      target: 160,
      consumed: 67,
      remaining: 93,
      completionPercent: 41.9,
    });

    expect(
      progressResponse.body.data.carbs,
    ).toEqual({
      target: 180,
      consumed: 57,
      remaining: 123,
      completionPercent: 31.7,
    });

    expect(
      progressResponse.body.data.fat,
    ).toEqual({
      target: 55,
      consumed: 7.7,
      remaining: 47.3,
      completionPercent: 14,
    });

    expect(
      progressResponse.body.data.mealCount,
    ).toBe(1);

    expect(
      progressResponse.body.data.itemCount,
    ).toBe(2);

    expect(
      progressResponse.body.data.targetSource,
    ).toBe('MANUAL');
  });

  it('handles nutrition target and progress edge cases', async () => {
    const noTargetUserId =
      'e2e-nutrition-no-target-user';

    const noTargetResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${noTargetUserId}/today/progress?utcOffsetMinutes=480`,
        )
        .expect(404);

    expect(
      noTargetResponse.body.message,
    ).toBe(
      'Nutrition daily target not found',
    );

    const invalidTargetUserId =
      'e2e-nutrition-invalid-target-user';

    await request(app.getHttpServer())
      .put(
        `/nutrition/${invalidTargetUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 0,
        proteinG: 100,
        carbsG: 100,
        fatG: 50,
        source: 'MANUAL',
      })
      .expect(400);

    await request(app.getHttpServer())
      .put(
        `/nutrition/${invalidTargetUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 1800,
        proteinG: -1,
        carbsG: 100,
        fatG: 50,
        source: 'MANUAL',
      })
      .expect(400);

    const overTargetUserId =
      'e2e-nutrition-over-target-user';

    await request(app.getHttpServer())
      .put(
        `/nutrition/${overTargetUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 500,
        proteinG: 40,
        carbsG: 50,
        fatG: 20,
        source: 'MANUAL',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(
        '/nutrition/meals?utcOffsetMinutes=480',
      )
      .send({
        userId: overTargetUserId,
        mealType: 'DINNER',
        source: 'MANUAL',
        items: [
          {
            foodName: '测试餐',
            caloriesKcal: 600,
            proteinG: 50,
            carbsG: 60,
            fatG: 25,
          },
        ],
      })
      .expect(201);

    const progressResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${overTargetUserId}/today/progress?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      progressResponse.body.data.calories,
    ).toEqual({
      target: 500,
      consumed: 600,
      remaining: -100,
      completionPercent: 120,
    });

    expect(
      progressResponse.body.data.protein,
    ).toEqual({
      target: 40,
      consumed: 50,
      remaining: -10,
      completionPercent: 125,
    });
  });

  it('prevents duplicate meal creation with clientRequestId', async () => {
    const userId =
      'e2e-nutrition-idempotency-user';

    const clientRequestId =
      'e2e-meal-request-001';

    const payload = {
      userId,
      clientRequestId,
      mealType: 'LUNCH',
      source: 'MANUAL',
      note: 'idempotency test',
      items: [
        {
          foodName: '鸡胸肉',
          caloriesKcal: 330,
          proteinG: 62,
          carbsG: 0,
          fatG: 7.2,
        },
        {
          foodName: '米饭',
          caloriesKcal: 260,
          proteinG: 5,
          carbsG: 57,
          fatG: 0.5,
        },
      ],
    };

    const firstResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send(payload)
        .expect(201);

    const secondResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send(payload)
        .expect(201);

    expect(
      secondResponse.body.data.mealLogId,
    ).toBe(
      firstResponse.body.data.mealLogId,
    );

    expect(
      secondResponse.body.data.items,
    ).toEqual(
      firstResponse.body.data.items,
    );

    expect(
      secondResponse.body.data.createdAt,
    ).toBe(
      firstResponse.body.data.createdAt,
    );

    const todayResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${userId}/today?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      todayResponse.body.data.meals,
    ).toHaveLength(1);

    expect(
      todayResponse.body.data.meals[0].items,
    ).toHaveLength(2);

    const anotherUserResponse =
      await request(app.getHttpServer())
        .post(
          '/nutrition/meals?utcOffsetMinutes=480',
        )
        .send({
          userId:
            'e2e-nutrition-idempotency-another-user',
          clientRequestId,
          mealType: 'LUNCH',
          source: 'MANUAL',
          items: [
            {
              foodName: '测试食物',
              caloriesKcal: 100,
              proteinG: 10,
              carbsG: 10,
              fatG: 2,
            },
          ],
        })
        .expect(400);

    expect(
      anotherUserResponse.body.message,
    ).toBe(
      'clientRequestId is already used by another user',
    );
  });

  it('covers weekly report data coverage states', async () => {
    const noDataUserId =
      'e2e-weekly-no-data-user';

    const noDataResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${noDataUserId}/weekly-report?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      noDataResponse.body.data.logging,
    ).toEqual({
      dayCount: 7,
      daysWithMeals: 0,
      loggingRatePercent: 0,
      coverageStatus: 'NO_DATA',
      mealCount: 0,
      itemCount: 0,
    });

    expect(
      noDataResponse.body.data.target,
    ).toBeNull();

    expect(
      noDataResponse.body.data.intake
        .averageCaloriesKcalPerLoggedDay,
    ).toBe(0);

    const partialUserId =
      'e2e-weekly-partial-user';

    await request(app.getHttpServer())
      .put(
        `/nutrition/${partialUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 1800,
        proteinG: 160,
        carbsG: 180,
        fatG: 55,
        source: 'MANUAL',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(
        '/nutrition/meals?utcOffsetMinutes=480',
      )
      .send({
        userId: partialUserId,
        clientRequestId:
          'e2e-weekly-partial-meal',
        mealType: 'LUNCH',
        source: 'MANUAL',
        items: [
          {
            foodName: '鸡胸肉',
            caloriesKcal: 330,
            proteinG: 62,
            carbsG: 0,
            fatG: 7.2,
          },
          {
            foodName: '米饭',
            caloriesKcal: 260,
            proteinG: 5,
            carbsG: 57,
            fatG: 0.5,
          },
        ],
      })
      .expect(201);

    const partialResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${partialUserId}/weekly-report?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      partialResponse.body.data.logging.coverageStatus,
    ).toBe('PARTIAL');

    expect(
      partialResponse.body.data.logging.daysWithMeals,
    ).toBe(1);

    expect(
      partialResponse.body.data.logging.loggingRatePercent,
    ).toBe(14.3);

    expect(
      partialResponse.body.data.intake
        .averageCaloriesKcalPerDay,
    ).toBe(84.3);

    expect(
      partialResponse.body.data.intake
        .averageCaloriesKcalPerLoggedDay,
    ).toBe(590);

    expect(
      partialResponse.body.data.target.calories,
    ).toEqual({
      dailyTarget: 1800,
      weeklyTarget: 12600,
      loggedDaysTarget: 1800,
      consumed: 590,
      difference: -12010,
      loggedDaysDifference: -1210,
      completionPercent: 4.7,
      loggedDaysCompletionPercent: 32.8,
    });

    const completeUserId =
      'e2e-weekly-complete-user';

    await request(app.getHttpServer())
      .put(
        `/nutrition/${completeUserId}/target`,
      )
      .send({
        dailyCaloriesKcal: 1000,
        proteinG: 100,
        carbsG: 100,
        fatG: 50,
        source: 'MANUAL',
      })
      .expect(200);

    const prisma =
      app.get(PrismaService);

    const endDate =
      new Date(
        Date.now() +
          480 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const end =
      new Date(
        `${endDate}T00:00:00.000Z`,
      );

    for (
      let daysAgo = 6;
      daysAgo >= 0;
      daysAgo -= 1
    ) {
      const localDate =
        new Date(
          end.getTime() -
            daysAgo *
              24 *
              60 *
              60 *
              1000,
        )
          .toISOString()
          .slice(0, 10);

      await prisma.mealLog.create({
        data: {
          userId: completeUserId,
          localDate,
          utcOffsetMinutes: 480,
          mealType: 'DINNER',
          source: 'MANUAL',
          items: {
            create: [
              {
                foodName:
                  `完整记录测试餐-${localDate}`,
                caloriesKcal: 100,
                proteinG: 10,
                carbsG: 20,
                fatG: 5,
              },
            ],
          },
        },
      });
    }

    const completeResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${completeUserId}/weekly-report?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      completeResponse.body.data.logging,
    ).toEqual({
      dayCount: 7,
      daysWithMeals: 7,
      loggingRatePercent: 100,
      coverageStatus: 'COMPLETE',
      mealCount: 7,
      itemCount: 7,
    });

    expect(
      completeResponse.body.data.intake
        .totalCaloriesKcal,
    ).toBe(700);

    expect(
      completeResponse.body.data.intake
        .averageCaloriesKcalPerDay,
    ).toBe(100);

    expect(
      completeResponse.body.data.intake
        .averageCaloriesKcalPerLoggedDay,
    ).toBe(100);

    expect(
      completeResponse.body.data.target.calories,
    ).toEqual({
      dailyTarget: 1000,
      weeklyTarget: 7000,
      loggedDaysTarget: 7000,
      consumed: 700,
      difference: -6300,
      loggedDaysDifference: -6300,
      completionPercent: 10,
      loggedDaysCompletionPercent: 10,
    });

    expect(
      completeResponse.body.data.dailySummaries,
    ).toHaveLength(7);
  });

  it('compares consecutive nutrition weeks safely', async () => {
    const prisma =
      app.get(PrismaService);

    const endDate =
      new Date(
        Date.now() +
          480 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const end =
      new Date(
        `${endDate}T00:00:00.000Z`,
      );

    const previousEndDate =
      new Date(
        end.getTime() -
          7 *
            24 *
            60 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const insufficientUserId =
      'e2e-weekly-comparison-insufficient-user';

    await prisma.mealLog.create({
      data: {
        userId:
          insufficientUserId,
        localDate:
          endDate,
        utcOffsetMinutes: 480,
        mealType: 'DINNER',
        source: 'MANUAL',
        items: {
          create: [
            {
              foodName: '当前周测试餐',
              caloriesKcal: 600,
              proteinG: 50,
              carbsG: 60,
              fatG: 25,
            },
          ],
        },
      },
    });

    const insufficientResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${insufficientUserId}/weekly-comparison?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      insufficientResponse.body.data.comparisonStatus,
    ).toBe(
      'INSUFFICIENT_DATA',
    );

    expect(
      insufficientResponse.body.data.currentPeriod.coverageStatus,
    ).toBe('PARTIAL');

    expect(
      insufficientResponse.body.data.previousPeriod.coverageStatus,
    ).toBe('NO_DATA');

    expect(
      insufficientResponse.body.data.changes,
    ).toBeNull();

    const comparableUserId =
      'e2e-weekly-comparison-comparable-user';

    await prisma.mealLog.create({
      data: {
        userId:
          comparableUserId,
        localDate:
          previousEndDate,
        utcOffsetMinutes: 480,
        mealType: 'DINNER',
        source: 'MANUAL',
        items: {
          create: [
            {
              foodName: '上周测试餐',
              caloriesKcal: 400,
              proteinG: 30,
              carbsG: 40,
              fatG: 15,
            },
          ],
        },
      },
    });

    await prisma.mealLog.create({
      data: {
        userId:
          comparableUserId,
        localDate:
          endDate,
        utcOffsetMinutes: 480,
        mealType: 'DINNER',
        source: 'MANUAL',
        items: {
          create: [
            {
              foodName: '本周测试餐',
              caloriesKcal: 600,
              proteinG: 50,
              carbsG: 60,
              fatG: 25,
            },
          ],
        },
      },
    });

    const comparableResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${comparableUserId}/weekly-comparison?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      comparableResponse.body.data.comparisonStatus,
    ).toBe('COMPARABLE');

    expect(
      comparableResponse.body.data.currentPeriod.daysWithMeals,
    ).toBe(1);

    expect(
      comparableResponse.body.data.previousPeriod.daysWithMeals,
    ).toBe(1);

    expect(
      comparableResponse.body.data.changes,
    ).toEqual({
      daysWithMeals: 0,
      loggingRatePercentagePoints: 0,
      averageCaloriesKcalPerLoggedDay: 200,
      averageProteinGPerLoggedDay: 20,
      averageCarbsGPerLoggedDay: 20,
      averageFatGPerLoggedDay: 10,
    });
  });

  it('classifies weekly nutrition insights deterministically', async () => {
    const prisma =
      app.get(PrismaService);

    const currentDate =
      new Date(
        Date.now() +
          480 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const current =
      new Date(
        `${currentDate}T00:00:00.000Z`,
      );

    const previousDate =
      new Date(
        current.getTime() -
          7 *
            24 *
            60 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const createTarget = async (
      userId: string,
      calories: number,
      protein: number,
    ) => {
      await request(app.getHttpServer())
        .put(
          `/nutrition/${userId}/target`,
        )
        .send({
          dailyCaloriesKcal:
            calories,
          proteinG:
            protein,
          carbsG: 100,
          fatG: 50,
          source: 'MANUAL',
        })
        .expect(200);
    };

    const createMeal = async (
      userId: string,
      localDate: string,
      calories: number,
      protein: number,
    ) => {
      await prisma.mealLog.create({
        data: {
          userId,
          localDate,
          utcOffsetMinutes: 480,
          mealType: 'DINNER',
          source: 'MANUAL',
          items: {
            create: [
              {
                foodName:
                  `insight-test-${localDate}`,
                caloriesKcal:
                  calories,
                proteinG:
                  protein,
                carbsG: 50,
                fatG: 20,
              },
            ],
          },
        },
      });
    };

    const insufficientUserId =
      'e2e-weekly-insight-insufficient';

    await createTarget(
      insufficientUserId,
      600,
      50,
    );

    await createMeal(
      insufficientUserId,
      currentDate,
      600,
      50,
    );

    const insufficientResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${insufficientUserId}/weekly-insights?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      insufficientResponse.body.data.calorieStatus,
    ).toBe('ON_TARGET');

    expect(
      insufficientResponse.body.data.proteinStatus,
    ).toBe('ON_TARGET');

    expect(
      insufficientResponse.body.data.comparisonStatus,
    ).toBe(
      'INSUFFICIENT_DATA',
    );

    expect(
      insufficientResponse.body.data.calorieTrend,
    ).toBe(
      'INSUFFICIENT_DATA',
    );

    expect(
      insufficientResponse.body.data.proteinTrend,
    ).toBe(
      'INSUFFICIENT_DATA',
    );

    const upUserId =
      'e2e-weekly-insight-up';

    await createTarget(
      upUserId,
      500,
      40,
    );

    await createMeal(
      upUserId,
      previousDate,
      400,
      30,
    );

    await createMeal(
      upUserId,
      currentDate,
      650,
      55,
    );

    const upResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${upUserId}/weekly-insights?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      upResponse.body.data.calorieStatus,
    ).toBe('ABOVE_TARGET');

    expect(
      upResponse.body.data.proteinStatus,
    ).toBe('ABOVE_TARGET');

    expect(
      upResponse.body.data.comparisonStatus,
    ).toBe('COMPARABLE');

    expect(
      upResponse.body.data.calorieTrend,
    ).toBe('UP');

    expect(
      upResponse.body.data.proteinTrend,
    ).toBe('UP');

    const downUserId =
      'e2e-weekly-insight-down';

    await createTarget(
      downUserId,
      500,
      40,
    );

    await createMeal(
      downUserId,
      previousDate,
      600,
      50,
    );

    await createMeal(
      downUserId,
      currentDate,
      350,
      25,
    );

    const downResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${downUserId}/weekly-insights?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      downResponse.body.data.calorieStatus,
    ).toBe('BELOW_TARGET');

    expect(
      downResponse.body.data.proteinStatus,
    ).toBe('BELOW_TARGET');

    expect(
      downResponse.body.data.calorieTrend,
    ).toBe('DOWN');

    expect(
      downResponse.body.data.proteinTrend,
    ).toBe('DOWN');

    const stableUserId =
      'e2e-weekly-insight-stable';

    await createTarget(
      stableUserId,
      500,
      40,
    );

    await createMeal(
      stableUserId,
      previousDate,
      450,
      35,
    );

    await createMeal(
      stableUserId,
      currentDate,
      500,
      40,
    );

    const stableResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${stableUserId}/weekly-insights?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      stableResponse.body.data.calorieStatus,
    ).toBe('ON_TARGET');

    expect(
      stableResponse.body.data.proteinStatus,
    ).toBe('ON_TARGET');

    expect(
      stableResponse.body.data.comparisonStatus,
    ).toBe('COMPARABLE');

    expect(
      stableResponse.body.data.calorieTrend,
    ).toBe('STABLE');

    expect(
      stableResponse.body.data.proteinTrend,
    ).toBe('STABLE');
  });

  it('generates deterministic weekly nutrition recommendations', async () => {
    const prisma =
      app.get(PrismaService);

    const currentDate =
      new Date(
        Date.now() +
          480 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const current =
      new Date(
        `${currentDate}T00:00:00.000Z`,
      );

    const previousDate =
      new Date(
        current.getTime() -
          7 *
            24 *
            60 *
            60 *
            1000,
      )
        .toISOString()
        .slice(0, 10);

    const createTarget = async (
      userId: string,
      calories: number,
      protein: number,
    ) => {
      await request(app.getHttpServer())
        .put(
          `/nutrition/${userId}/target`,
        )
        .send({
          dailyCaloriesKcal:
            calories,
          proteinG:
            protein,
          carbsG: 100,
          fatG: 50,
          source: 'MANUAL',
        })
        .expect(200);
    };

    const createMeal = async (
      userId: string,
      localDate: string,
      calories: number,
      protein: number,
    ) => {
      await prisma.mealLog.create({
        data: {
          userId,
          localDate,
          utcOffsetMinutes: 480,
          mealType: 'DINNER',
          source: 'MANUAL',
          items: {
            create: [
              {
                foodName:
                  `recommendation-test-${localDate}`,
                caloriesKcal:
                  calories,
                proteinG:
                  protein,
                carbsG: 50,
                fatG: 20,
              },
            ],
          },
        },
      });
    };

    const noDataUserId =
      'e2e-weekly-recommendation-no-data';

    const noDataResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${noDataUserId}/weekly-recommendations?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      noDataResponse.body.data.recommendations,
    ).toEqual([
      {
        code:
          'START_NUTRITION_LOGGING',
        priority: 'HIGH',
        category: 'DATA',
      },
    ]);

    const upUserId =
      'e2e-weekly-recommendation-up';

    await createTarget(
      upUserId,
      500,
      40,
    );

    await createMeal(
      upUserId,
      previousDate,
      400,
      40,
    );

    await createMeal(
      upUserId,
      currentDate,
      650,
      40,
    );

    const upResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${upUserId}/weekly-recommendations?utcOffsetMinutes=480`,
        )
        .expect(200);

    const upCodes =
      upResponse.body.data.recommendations.map(
        (
          item: {
            code: string;
          },
        ) => item.code,
      );

    expect(
      upCodes,
    ).toEqual([
      'IMPROVE_NUTRITION_LOGGING',
      'REDUCE_CALORIE_INTAKE',
      'WATCH_CALORIE_UPWARD_TREND',
    ]);

    const downUserId =
      'e2e-weekly-recommendation-down';

    await createTarget(
      downUserId,
      500,
      40,
    );

    await createMeal(
      downUserId,
      previousDate,
      600,
      40,
    );

    await createMeal(
      downUserId,
      currentDate,
      350,
      40,
    );

    const downResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${downUserId}/weekly-recommendations?utcOffsetMinutes=480`,
        )
        .expect(200);

    const downCodes =
      downResponse.body.data.recommendations.map(
        (
          item: {
            code: string;
          },
        ) => item.code,
      );

    expect(
      downCodes,
    ).toEqual([
      'IMPROVE_NUTRITION_LOGGING',
      'INCREASE_CALORIE_INTAKE',
      'WATCH_CALORIE_DOWNWARD_TREND',
    ]);

    const maintainUserId =
      'e2e-weekly-recommendation-maintain';

    await createTarget(
      maintainUserId,
      500,
      40,
    );

    for (
      let daysAgo = 6;
      daysAgo >= 0;
      daysAgo -= 1
    ) {
      const localDate =
        new Date(
          current.getTime() -
            daysAgo *
              24 *
              60 *
              60 *
              1000,
        )
          .toISOString()
          .slice(0, 10);

      await createMeal(
        maintainUserId,
        localDate,
        500,
        40,
      );
    }

    const maintainResponse =
      await request(app.getHttpServer())
        .get(
          `/nutrition/${maintainUserId}/weekly-recommendations?utcOffsetMinutes=480`,
        )
        .expect(200);

    expect(
      maintainResponse.body.data.dataStatus,
    ).toBe('COMPLETE');

    expect(
      maintainResponse.body.data.recommendations,
    ).toEqual([
      {
        code:
          'MAINTAIN_CURRENT_NUTRITION_PATTERN',
        priority: 'LOW',
        category: 'MAINTENANCE',
      },
    ]);
  });

});
